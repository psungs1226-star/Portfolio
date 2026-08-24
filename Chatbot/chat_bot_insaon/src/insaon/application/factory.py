from __future__ import annotations

import hashlib
import json
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any, Literal

from insaon.adapters.model import DeterministicReviewModel, OllamaReviewModel
from insaon.adapters.provider import (
    HttpxOllamaTransport,
    OllamaClient,
    ProviderTransport,
)
from insaon.adapters.retrieval import (
    CharNgramLexicalRetriever,
    IdfWeightedReranker,
    InMemoryVectorRetriever,
    LocalVectorIndexManifest,
    OllamaEmbeddingGateway,
    OllamaQueryPlanner,
    OllamaReranker,
    RetrievalPipeline,
    build_local_vector_index_manifest,
    searchable_provisions,
)
from insaon.adapters.source import CandidateCorpusError, CandidateEvidenceCorpus
from insaon.application.classification import QuestionClassifier, topic_terms_from_titles
from insaon.application.conditions import ConditionExtractor, QuestionPolicy
from insaon.application.privacy import PrivacyGate
from insaon.application.query_transform import load_synonym_transformer
from insaon.application.review import ReviewQuestion
from insaon.application.rules import RuleService
from insaon.domain import DateRange, Provision
from insaon.settings import Settings


@dataclass(frozen=True, slots=True)
class LocalRuntime:
    service: ReviewQuestion
    generation: OllamaReviewModel
    embedding: OllamaEmbeddingGateway
    reranker: OllamaReranker
    index_manifest: LocalVectorIndexManifest
    model_artifacts: dict[str, str]


SYNTHETIC_CORPUS_PATH = (
    Path(__file__).resolve().parents[3] / "data/sample/distractor-corpus.json"
)


def _string_tuple(value: Any) -> tuple[str, ...]:
    if not isinstance(value, list):
        return ()
    return tuple(str(item) for item in value)


def _parse_synthetic_provision(payload: Any) -> Provision:
    valid_time = payload["valid_time"]
    end = valid_time.get("end")
    parent = payload.get("parent_provision_id")
    return Provision(
        provision_id=str(payload["provision_id"]),
        source_id=str(payload["source_id"]),
        article_path=str(payload["article_path"]),
        title=str(payload["title"]),
        text=str(payload["text"]),
        valid_time=DateRange(
            date.fromisoformat(str(valid_time["start"])),
            date.fromisoformat(str(end)) if end else None,
        ),
        applies_to=frozenset(_string_tuple(payload["applies_to"])),
        topic_tags=frozenset(_string_tuple(payload["topic_tags"])),
        parent_provision_id=str(parent) if parent else None,
        relation_ids=_string_tuple(payload.get("relation_ids")),
        source_hash=str(payload.get("source_hash") or ""),
    )


def synthetic_demo_provisions() -> tuple[Provision, ...]:
    """Load the public synthetic corpus used by the offline profile and the ablation.

    The corpus lives in ``data/sample/distractor-corpus.json`` so the distractor design
    stays reviewable. Failing loudly matters here: a silent fall back to a tiny
    in-code fixture would restore the saturated Set Recall@5 the corpus exists to fix.
    """
    if not SYNTHETIC_CORPUS_PATH.is_file():
        raise FileNotFoundError(
            f"synthetic corpus missing: {SYNTHETIC_CORPUS_PATH}. "
            "Run python scripts/build_distractor_corpus.py"
        )
    payload = json.loads(SYNTHETIC_CORPUS_PATH.read_text(encoding="utf-8"))
    provisions = payload.get("provisions")
    if not isinstance(provisions, list) or not provisions:
        raise ValueError(f"synthetic corpus has no provisions: {SYNTHETIC_CORPUS_PATH}")
    return tuple(_parse_synthetic_provision(item) for item in provisions)


@dataclass(frozen=True)
class SyntheticWideTopics:
    """넓은 인사규정 lane이 offline 프로필에서 쓸 주제별 근거 자료.

    휴직·복직은 조건을 되묻고 결론까지 가는 심층 검토 lane이고, 여기는 근거 조문을
    찾아 사람에게 넘기는 evidence_only lane이다. 분류기는 이 주제들을 원래부터 알고
    있었지만 corpus에 조문이 없어서 켜도 `wide_corpus_unavailable`로 끝났다.
    """

    topic_source_ids: dict[str, frozenset[str]]
    source_names: dict[str, str]
    source_urls: dict[str, str]
    labels: dict[str, str]


def synthetic_wide_topics() -> SyntheticWideTopics:
    payload = json.loads(SYNTHETIC_CORPUS_PATH.read_text(encoding="utf-8"))
    topics = payload.get("wide_topics")
    if not isinstance(topics, dict) or not topics:
        raise ValueError(
            f"synthetic corpus has no wide_topics: {SYNTHETIC_CORPUS_PATH}. "
            "Run python scripts/build_distractor_corpus.py"
        )
    return SyntheticWideTopics(
        topic_source_ids={
            topic: frozenset({str(meta["source_id"])}) for topic, meta in topics.items()
        },
        source_names={
            str(meta["source_id"]): str(meta["source_name"]) for meta in topics.values()
        },
        source_urls={
            str(meta["source_id"]): str(meta["source_url"]) for meta in topics.values()
        },
        labels={topic: str(meta["label"]) for topic, meta in topics.items()},
    )


def _corpus_topic_terms(
    provisions: Sequence[Provision],
    topic_source_ids: Mapping[str, frozenset[str]] | None,
) -> dict[str, frozenset[str]]:
    """Read the routing vocabulary off the corpus that is actually indexed.

    Without this the classifier can only route wording someone typed into
    `_wide_topics`. `가점` was rejected as an unsupported topic while the promotion
    provisions sat indexed and reachable, and adding the word would have left the
    same failure waiting on `겸직` and `유연근무` (ADR-0025).
    """
    if not topic_source_ids:
        return {}
    source_to_topic = {
        source_id: topic
        for topic, source_ids in topic_source_ids.items()
        for source_id in source_ids
    }
    titles: dict[str, list[str]] = {topic: [] for topic in topic_source_ids}
    for provision in provisions:
        topic = source_to_topic.get(provision.source_id)
        if topic is not None:
            titles[topic].append(f"{provision.title} {provision.article_path}")
    return topic_terms_from_titles(titles)


def build_offline_retrieval_pipeline() -> tuple[RetrievalPipeline, tuple[Provision, ...]]:
    provisions = synthetic_demo_provisions()
    mapping = {item.provision_id: item for item in provisions}
    indexed = searchable_provisions(provisions)
    retrieval = RetrievalPipeline(
        provisions,
        CharNgramLexicalRetriever(indexed),
        InMemoryVectorRetriever(indexed),
        IdfWeightedReranker(mapping),
        load_synonym_transformer(),
    )
    return retrieval, provisions


def build_candidate_evidence_pipeline(corpus: CandidateEvidenceCorpus) -> RetrievalPipeline:
    mapping = {item.provision_id: item for item in corpus.provisions}
    indexed = searchable_provisions(corpus.provisions)
    return RetrievalPipeline(
        corpus.provisions,
        CharNgramLexicalRetriever(indexed),
        InMemoryVectorRetriever(indexed),
        IdfWeightedReranker(mapping),
        load_synonym_transformer(),
    )


def build_offline_review_service(
    model: DeterministicReviewModel | OllamaReviewModel | None = None,
    retrieval_config_id: str = "H3",
    evidence_corpus: CandidateEvidenceCorpus | None = None,
    *,
    enable_extended_topics: bool = True,
    wide_evidence: Literal["auto", "synthetic"] = "auto",
) -> ReviewQuestion:
    retrieval, provisions = build_offline_retrieval_pipeline()
    candidate_retrieval = (
        build_candidate_evidence_pipeline(evidence_corpus) if evidence_corpus else None
    )
    # `wide_evidence="synthetic"`은 공개 데모가 쓰는 설정이다.
    #
    # 실제 candidate corpus에도 여덟 주제가 매핑돼 있지만 그 매핑은 source 단위라
    # 지방공무원법 전체가 모든 주제에 붙는다. "징계 종류" 질문에 상위 5건이 전부
    # 부칙 조문으로 나왔고, `topic_tags`를 걸어도 12,640건 중 8,000건 이상이 대부분의
    # 주제 태그를 함께 달고 있어 달라지지 않았다. 승인 전이고 회수 품질을 측정하지도
    # 않은 자료를 공개 데모의 근거로 쓰지 않는다. candidate corpus를 명시적으로
    # 넘기는 호출자(ADR-0010 계약 테스트, local 프로필)는 종전 동작을 유지한다.
    use_synthetic_wide = wide_evidence == "synthetic" or evidence_corpus is None
    wide = synthetic_wide_topics() if use_synthetic_wide else None
    evidence_provisions = (
        provisions if wide else (evidence_corpus.provisions if evidence_corpus else ())
    )
    evidence_topic_source_ids = (
        wide.topic_source_ids
        if wide
        else (evidence_corpus.topic_source_ids if evidence_corpus else None)
    )
    return ReviewQuestion(
        privacy_gate=PrivacyGate(),
        classifier=QuestionClassifier(
            enable_extended_topics=enable_extended_topics,
            transformer=load_synonym_transformer(),
            corpus_topic_terms=_corpus_topic_terms(
                evidence_provisions, evidence_topic_source_ids
            ),
        ),
        extractor=ConditionExtractor(),
        question_policy=QuestionPolicy(),
        retrieval=retrieval,
        rule_service=RuleService(),
        model=model or DeterministicReviewModel(),
        provisions=provisions,
        data_as_of=evidence_corpus.data_as_of if evidence_corpus else date(2026, 7, 29),
        retrieval_config_id=retrieval_config_id,
        evidence_retrieval=retrieval if wide else candidate_retrieval,
        evidence_provisions=evidence_provisions,
        evidence_source_names=(
            wide.source_names
            if wide
            else (evidence_corpus.source_names if evidence_corpus else None)
        ),
        evidence_source_urls=(
            wide.source_urls
            if wide
            else (evidence_corpus.source_urls if evidence_corpus else None)
        ),
        evidence_topic_source_ids=evidence_topic_source_ids,
        evidence_corpus_status=(
            "synthetic_fixture"
            if wide
            else (evidence_corpus.candidate_status if evidence_corpus else "unavailable")
        ),
        derived_pay_retrieval=candidate_retrieval,
        derived_pay_provisions=(
            evidence_corpus.derived_leave_pay_provisions if evidence_corpus else ()
        ),
        derived_pay_source_names=(
            evidence_corpus.source_names if evidence_corpus else None
        ),
        derived_pay_source_urls=(
            evidence_corpus.source_urls if evidence_corpus else None
        ),
        derived_pay_corpus_status=(
            evidence_corpus.candidate_status if evidence_corpus else "unavailable"
        ),
    )


def build_local_runtime(
    settings: Settings,
    *,
    transport: ProviderTransport | None = None,
    created_at: datetime | None = None,
    evidence_corpus: CandidateEvidenceCorpus | None = None,
) -> LocalRuntime:
    if settings.runtime_profile != "local":
        raise ValueError("local runtime requires explicit local settings")
    resolved_transport = transport or HttpxOllamaTransport(
        base_url=settings.local_model_base_url,
        loopback_allowlist=settings.provider_egress_allowlist,
    )
    client = OllamaClient(
        resolved_transport,
        timeout_seconds=settings.provider_timeout_seconds,
        max_retries=settings.provider_max_retries,
    )
    generation_digest = client.model_digest(settings.generation_model)
    embedding_digest = client.model_digest(settings.embedding_model)
    if evidence_corpus is None:
        provisions = synthetic_demo_provisions()
        deep_provisions = provisions
        deep_source_names: dict[str, str] = {}
        deep_source_urls: dict[str, str] = {}
        deep_corpus_status = "synthetic_regression"
    else:
        provisions = evidence_corpus.provisions
        deep_provisions = evidence_corpus.deep_review_provisions
        if not deep_provisions:
            raise CandidateCorpusError(
                "official candidate has no deep-review leave provisions"
            )
        deep_source_names = evidence_corpus.source_names
        deep_source_urls = evidence_corpus.source_urls
        deep_corpus_status = evidence_corpus.candidate_status
    mapping = {item.provision_id: item for item in provisions}
    embedding = OllamaEmbeddingGateway(
        client,
        model_id=settings.embedding_model,
        dimensions=settings.embedding_dimensions,
        version=settings.embedding_version,
        keep_alive=settings.local_model_keep_alive,
    )
    source_hashes = sorted({item.source_hash for item in deep_provisions})
    source_snapshot_hash = (
        source_hashes[0]
        if len(source_hashes) == 1
        else hashlib.sha256(":".join(source_hashes).encode()).hexdigest()
    )
    vector_cache_key = hashlib.sha256(
        (
            f"{settings.embedding_model}:{settings.embedding_version}:"
            f"{embedding_digest}:{source_snapshot_hash}:"
            + ":".join(item.provision_id for item in deep_provisions)
        ).encode()
    ).hexdigest()
    vector_cache_path = (
        _local_vector_cache_path(settings, vector_cache_key)
        if evidence_corpus is not None and settings.candidate_corpus_path
        else None
    )
    # 색인에 넣는 것은 실제로 답이 될 수 있는 조문뿐이다. 조 헤더와 삭제 tombstone은
    # corpus에는 남지만 검색 후보 자격은 없다.
    indexed = searchable_provisions(deep_provisions)
    vector = InMemoryVectorRetriever(
        indexed,
        gateway=embedding,
        cache_path=vector_cache_path,
        cache_key=vector_cache_key if vector_cache_path else None,
    )
    reranker = OllamaReranker(
        client,
        mapping,
        model_id=settings.reranker_model,
        version=settings.reranker_version,
        max_candidates=10,
        keep_alive=settings.local_model_keep_alive,
    )
    query_planner = OllamaQueryPlanner(
        client,
        model_id=settings.generation_model,
        keep_alive=settings.local_model_keep_alive,
    )
    retrieval = RetrievalPipeline(
        provisions,
        CharNgramLexicalRetriever(indexed),
        vector,
        reranker,
        transformer=query_planner,
    )
    generation = OllamaReviewModel(
        client,
        model_id=settings.generation_model,
        prompt_version=settings.prompt_version,
        keep_alive=settings.local_model_keep_alive,
    )
    index_manifest = build_local_vector_index_manifest(
        gateway=embedding,
        embedding_artifact_digest=embedding_digest,
        source_snapshot_hash=source_snapshot_hash,
        document_count=len(indexed),
        created_at=created_at or datetime.now(UTC),
    )
    service = ReviewQuestion(
        privacy_gate=PrivacyGate(),
        classifier=QuestionClassifier(
            enable_extended_topics=settings.enable_extended_evidence_topics,
            transformer=load_synonym_transformer(),
        ),
        extractor=ConditionExtractor(),
        question_policy=QuestionPolicy(),
        retrieval=retrieval,
        rule_service=RuleService(),
        model=generation,
        provisions=provisions,
        data_as_of=evidence_corpus.data_as_of if evidence_corpus else date(2026, 7, 29),
        retrieval_config_id="H3",
        evidence_retrieval=(
            build_candidate_evidence_pipeline(evidence_corpus) if evidence_corpus else None
        ),
        evidence_provisions=evidence_corpus.provisions if evidence_corpus else (),
        evidence_source_names=evidence_corpus.source_names if evidence_corpus else None,
        evidence_source_urls=evidence_corpus.source_urls if evidence_corpus else None,
        evidence_topic_source_ids=(
            evidence_corpus.topic_source_ids if evidence_corpus else None
        ),
        evidence_corpus_status=(
            evidence_corpus.candidate_status if evidence_corpus else "unavailable"
        ),
        deep_source_names=deep_source_names,
        deep_source_urls=deep_source_urls,
        deep_corpus_status=deep_corpus_status,
        derived_pay_retrieval=retrieval if evidence_corpus else None,
        derived_pay_provisions=(
            evidence_corpus.derived_leave_pay_provisions if evidence_corpus else ()
        ),
        derived_pay_source_names=(
            evidence_corpus.source_names if evidence_corpus else None
        ),
        derived_pay_source_urls=(
            evidence_corpus.source_urls if evidence_corpus else None
        ),
        derived_pay_corpus_status=(
            evidence_corpus.candidate_status if evidence_corpus else "unavailable"
        ),
    )
    return LocalRuntime(
        service,
        generation,
        embedding,
        reranker,
        index_manifest,
        {
            "generation": generation_digest,
            "embedding": embedding_digest,
            "reranker": generation_digest,
        },
    )


def _try_ollama_model(settings: Settings) -> OllamaReviewModel | None:
    """Ollama가 떠 있으면 LLM 모델을 반환, 아니면 None."""
    try:
        transport = HttpxOllamaTransport(
            base_url=settings.local_model_base_url,
            loopback_allowlist=settings.provider_egress_allowlist,
        )
        client = OllamaClient(
            transport,
            timeout_seconds=2.0,
            max_retries=0,
        )
        client.model_digest(settings.generation_model)
        return OllamaReviewModel(
            OllamaClient(
                transport,
                timeout_seconds=settings.provider_timeout_seconds,
                max_retries=settings.provider_max_retries,
            ),
            model_id=settings.generation_model,
            prompt_version=settings.prompt_version,
            keep_alive=settings.local_model_keep_alive,
        )
    except Exception:
        return None


def build_review_service(settings: Settings) -> ReviewQuestion:
    evidence_corpus = _load_candidate_evidence(settings)
    if settings.runtime_profile == "local":
        if evidence_corpus is None:
            raise CandidateCorpusError(
                "local product runtime requires an official candidate corpus; "
                "synthetic fallback is forbidden"
            )
        return build_local_runtime(settings, evidence_corpus=evidence_corpus).service
    return build_offline_review_service(
        evidence_corpus=evidence_corpus,
        enable_extended_topics=settings.enable_extended_evidence_topics,
        wide_evidence="synthetic",
    )


def _load_candidate_evidence(settings: Settings) -> CandidateEvidenceCorpus | None:
    candidate_path = (
        Path(settings.candidate_corpus_path).expanduser()
        if settings.candidate_corpus_path
        else Path(__file__).resolve().parents[5]
        / "private/legal-wide/processed/candidate.json"
    )
    if not candidate_path.is_absolute():
        candidate_path = Path.cwd() / candidate_path
    if not candidate_path.is_file():
        return None
    manifest_path = Path(__file__).resolve().parents[3] / "configs/sources/official-hr-wide.toml"
    try:
        return CandidateEvidenceCorpus.from_files(candidate_path, manifest_path)
    except CandidateCorpusError:
        return None


def _local_vector_cache_path(settings: Settings, cache_key: str) -> Path:
    if not settings.candidate_corpus_path:
        raise ValueError("candidate path is required for a private vector cache")
    candidate_path = Path(settings.candidate_corpus_path).expanduser()
    if not candidate_path.is_absolute():
        candidate_path = Path.cwd() / candidate_path
    return candidate_path.resolve().parent.parent / "indexes" / f"{cache_key}.json"
