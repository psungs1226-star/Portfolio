#!/usr/bin/env python3
"""Run local Ollama smoke checks without persisting prompts or model output."""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any

from pydantic import ValidationError

from insaon.adapters.model import OllamaReviewModel
from insaon.adapters.provider import HttpxOllamaTransport, OllamaClient
from insaon.adapters.retrieval import OllamaEmbeddingGateway, OllamaReranker
from insaon.adapters.source import CandidateEvidenceCorpus
from insaon.application.factory import build_local_runtime, synthetic_demo_provisions
from insaon.application.provider_runtime import ProviderRuntimeError
from insaon.application.review import ReviewCommand
from insaon.domain import Citation, QuestionContext, RetrievalCandidate
from insaon.settings import Settings

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "artifacts/provider/local-smoke.json"
OFFICIAL_CANDIDATE = (ROOT / "../../private/legal-wide/processed/candidate.json").resolve()
OFFICIAL_REGISTRY = ROOT / "configs/sources/official-hr-wide.toml"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--profile", choices=["local"], required=True)
    parser.add_argument(
        "--component",
        choices=["generation", "embedding", "reranker", "all"],
        default="all",
    )
    parser.add_argument("--case", choices=["CASE-B"], default="CASE-B")
    parser.add_argument("--dataset", type=Path)
    return parser.parse_args()


def build_client(settings: Settings) -> OllamaClient:
    return OllamaClient(
        HttpxOllamaTransport(
            base_url=settings.local_model_base_url,
            loopback_allowlist=settings.provider_egress_allowlist,
        ),
        timeout_seconds=settings.provider_timeout_seconds,
        max_retries=settings.provider_max_retries,
    )


def run_generation(settings: Settings) -> dict[str, object]:
    provisions = synthetic_demo_provisions()[:2]
    citations = tuple(
        Citation(
            citation_id=f"CITE-{item.provision_id}",
            source_id=item.source_id,
            provision_id=item.provision_id,
            source_name="합성 공개 근거 fixture",
            article_path=item.article_path,
            effective_from=item.valid_time.start,
            effective_to=item.valid_time.end,
            source_url="https://example.invalid/synthetic",
        )
        for item in provisions
    )
    client = build_client(settings)
    adapter = OllamaReviewModel(
        client,
        model_id=settings.generation_model,
        prompt_version=settings.prompt_version,
    )
    draft = adapter.draft(
        QuestionContext(
            request_id="LOCAL-SMOKE-CASE-B",
            question_text="[합성] 2024-01-01 질병휴직 공개 근거를 설명해 주세요.",
            reference_date=date(2024, 1, 1),
            intent="evidence_lookup",
        ),
        provisions,
        citations,
    )
    if not draft.claims or adapter.last_call is None:
        raise RuntimeError("generation smoke did not return a validated claim")
    if draft.recommended_status.value != "ANSWERABLE":
        raise RuntimeError("generation smoke did not answer the evidence lookup")
    result = call_summary(adapter.last_call)
    result["artifact_digest"] = client.model_digest(settings.generation_model)
    return result


def run_embedding(settings: Settings) -> dict[str, object]:
    client = build_client(settings)
    adapter = OllamaEmbeddingGateway(
        client,
        model_id=settings.embedding_model,
        dimensions=settings.embedding_dimensions,
        version=settings.embedding_version,
    )
    vectors = adapter.embed(
        ["[합성] 질병휴직 공개 근거", "[합성] 기관 규정이 필요한 경우 담당자 검토"]
    )
    if len(vectors) != 2 or adapter.last_call is None:
        raise RuntimeError("embedding smoke did not return a complete batch")
    result = call_summary(adapter.last_call)
    result["artifact_digest"] = client.model_digest(settings.embedding_model)
    result["dimensions"] = settings.embedding_dimensions
    return result


def run_reranker(settings: Settings) -> dict[str, object]:
    provisions = synthetic_demo_provisions()[:3]
    client = build_client(settings)
    adapter = OllamaReranker(
        client,
        {item.provision_id: item for item in provisions},
        model_id=settings.reranker_model,
        version=settings.reranker_version,
    )
    candidates = tuple(
        RetrievalCandidate(item.provision_id, rank, 0.1, "synthetic-smoke")
        for rank, item in enumerate(provisions, start=1)
    )
    ranked = adapter.rerank("[합성] 질병휴직 근거", candidates, top_k=3)
    if len(ranked) != len(candidates) or adapter.last_call is None:
        raise RuntimeError("reranker smoke did not return the complete candidate set")
    result = call_summary(adapter.last_call)
    result["artifact_digest"] = client.model_digest(settings.reranker_model)
    return result


def run_all(
    settings: Settings,
) -> tuple[dict[str, object], dict[str, object], dict[str, str], dict[str, object]]:
    corpus = CandidateEvidenceCorpus.from_files(OFFICIAL_CANDIDATE, OFFICIAL_REGISTRY)
    runtime = build_local_runtime(settings, evidence_corpus=corpus)
    answer = runtime.service.handle(
        ReviewCommand(
            "LOCAL-SMOKE-CASE-B",
            "2024-01-01 질병휴직 공개 근거를 찾아주세요",
            local_rule_checked=True,
        )
    )
    if not answer.citations or not answer.claims:
        raise RuntimeError(f"local CASE-B ended without answer: {answer.review_reasons}")
    if answer.status.value != "REVIEW_REQUIRED" or "candidate_corpus_unapproved" not in answer.review_reasons:
        raise RuntimeError("unapproved official candidate crossed the human-review boundary")
    if any("example.invalid" in citation.source_url for citation in answer.citations):
        raise RuntimeError("official local smoke exposed a synthetic citation")
    reference_date = date(2024, 1, 1)
    if any(
        citation.effective_from > reference_date
        or (
            citation.effective_to is not None
            and citation.effective_to <= reference_date
        )
        for citation in answer.citations
    ):
        raise RuntimeError("official local smoke returned a citation outside the reference date")
    summaries = (
        runtime.embedding.last_call,
        runtime.reranker.last_call,
        runtime.generation.last_call,
    )
    if any(item is None for item in summaries):
        raise RuntimeError("local CASE-B did not traverse all model components")
    return (
        {item.component: call_summary(item) for item in summaries if item is not None},
        runtime.index_manifest.public_dict(),
        runtime.model_artifacts,
        {
            "answer_status": answer.status.value,
            "review_reasons": list(answer.review_reasons),
            "citation_count": len(answer.citations),
            "official_citation_count": sum(
                citation.source_url.startswith("https://www.law.go.kr/")
                for citation in answer.citations
            ),
            "synthetic_citation_count": 0,
            "reference_date": "2024-01-01",
            "human_approval": corpus.candidate_status,
        },
    )


def call_summary(summary: Any) -> dict[str, object]:
    return {
        "component": summary.component,
        "model": summary.model,
        "contract_version": summary.contract_version,
        "latency_ms": round(summary.latency_ms, 3),
        "input_tokens": summary.input_tokens,
        "output_tokens": summary.output_tokens,
        "total_tokens": summary.total_tokens,
        "cost_status": "local_no_api_charge",
    }


def dataset_metadata(path: Path | None) -> dict[str, object] | None:
    if path is None:
        return None
    resolved = path if path.is_absolute() else ROOT / path
    return {
        "path": str(resolved.relative_to(ROOT)),
        "sha256": hashlib.sha256(resolved.read_bytes()).hexdigest(),
        "input_kind": "public_synthetic_fixture",
    }


def main() -> int:
    args = parse_args()
    try:
        settings = Settings(
            runtime_profile="local",
            candidate_corpus_path=str(OFFICIAL_CANDIDATE),
            _env_file=None,
        )
        index_manifest: dict[str, object] | None = None
        artifacts: dict[str, str] = {}
        scenario: dict[str, object] | None = None
        if args.component == "generation":
            results = {"generation": run_generation(settings)}
        elif args.component == "embedding":
            results = {"embedding": run_embedding(settings)}
        elif args.component == "reranker":
            results = {"reranker": run_reranker(settings)}
        else:
            results, index_manifest, artifacts, scenario = run_all(settings)
        full_pipeline = args.component == "all"
        manifest = {
            "schema_version": "0.2.0",
            "profile": "local-model-smoke",
            "status": "passed",
            "created_at": datetime.now(UTC).isoformat(),
            "case_id": args.case,
            "input_kind": (
                "private_official_candidate_pending_human_approval"
                if full_pipeline
                else "public_synthetic_component_fixture"
            ),
            "runtime": settings.public_runtime_metadata(),
            "components": results,
            "model_artifacts": artifacts,
            "index_manifest": index_manifest,
            "scenario": scenario,
            "dataset": dataset_metadata(args.dataset),
            "api_key_required": False,
            "external_inference_egress": False,
            "legal_accuracy_status": "unmeasured",
            "operational_effect_status": "unmeasured",
            "limitations": [
                (
                    "Full pipeline smoke used the private official candidate; component-only "
                    "smokes remain explicitly synthetic adapter checks."
                ),
                "Model installation and pull require separate network access; inference used loopback.",
                (
                    "The official candidate is pending human approval; this smoke checks "
                    "integration and safety boundaries, not legal accuracy."
                ),
            ],
        }
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT.write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
    except (ProviderRuntimeError, RuntimeError, ValidationError, ValueError) as exc:
        print(f"LOCAL MODEL SMOKE FAILED: {type(exc).__name__}: {exc}", file=sys.stderr)
        return 1
    print(f"Local model smoke passed: {args.component}; manifest={OUTPUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
