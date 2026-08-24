from __future__ import annotations

import json
from collections.abc import Mapping
from typing import Any

from insaon.adapters.provider import ProviderHttpResponse


class ScriptedOllamaTransport:
    """Protocol-faithful loopback transport that never performs I/O."""

    def __init__(self) -> None:
        self.calls: list[tuple[str, dict[str, Any]]] = []
        self.next_status: int | None = None
        self.malformed_generation = False
        self.unauthorized_citation = False
        self.partial_embedding_batch = False
        self.embedding_dimension_delta = 0
        self.reranker_adds_candidate = False
        self.reranker_omits_candidate = False
        self.first_claim_kind = "review_position"
        self.generation_claim_text: str | None = None

    def get_json(self, path: str, *, timeout_seconds: float) -> ProviderHttpResponse:
        del timeout_seconds
        self.calls.append((path, {}))
        return ProviderHttpResponse(
            200,
            {
                "models": [
                    {"name": "qwen3:4b-instruct", "digest": "2" * 64},
                    {"name": "bge-m3:latest", "digest": "3" * 64},
                ]
            },
        )

    def post_json(
        self,
        path: str,
        payload: Mapping[str, Any],
        *,
        timeout_seconds: float,
    ) -> ProviderHttpResponse:
        del timeout_seconds
        copied = dict(payload)
        self.calls.append((path, copied))
        if self.next_status is not None:
            status = self.next_status
            self.next_status = None
            return ProviderHttpResponse(status, {"error": "synthetic"})
        if path == "/embed":
            inputs = copied["input"]
            dimensions = 1024 + self.embedding_dimension_delta
            vectors = []
            for index, _ in enumerate(inputs):
                vector = [0.0] * dimensions
                vector[index % dimensions] = 1.0
                vectors.append(vector)
            if self.partial_embedding_batch:
                vectors = vectors[:-1]
            return ProviderHttpResponse(
                200,
                {
                    "model": copied["model"],
                    "embeddings": vectors,
                    "prompt_eval_count": len(inputs),
                },
            )
        if path == "/chat":
            parsed = json.loads(copied["messages"][1]["content"])
            if "CANDIDATE_DATA" in parsed:
                rankings = [
                    {
                        "provision_id": item["provision_id"],
                        "score": max(0.0, 1.0 - index / 20),
                    }
                    for index, item in enumerate(parsed["CANDIDATE_DATA"])
                ]
                if self.reranker_adds_candidate:
                    rankings.append({"provision_id": "NOT-IN-CANDIDATES", "score": 1.0})
                if self.reranker_omits_candidate:
                    rankings = rankings[:-1]
                output: dict[str, Any] = {"rankings": rankings}
            else:
                citations = [
                    item["allowed_citation_id"] for item in parsed["EVIDENCE_DATA"]
                ]
                asks_for_decision = any(
                    token in parsed["QUESTION_DATA"]
                    for token in ("가능", "해당", "여부", "인가")
                )
                if self.unauthorized_citation:
                    citations.append("CITE-NOT-ALLOWED")
                output = {
                    "recommended_status": (
                        "REVIEW_REQUIRED" if asks_for_decision else "ANSWERABLE"
                    ),
                    "claims": [
                        {
                            "claim_id": "CLAIM-SYNTHETIC-POSITION",
                            "text": (
                                self.generation_claim_text
                                or (
                                    "현재 근거만으로 복직 가능 여부를 확정할 수 없습니다."
                                    if asks_for_decision
                                    else "질문 기준일에 유효한 공개 근거를 확인했습니다."
                                )
                            ),
                            "citation_ids": citations,
                            "kind": self.first_claim_kind,
                        },
                        {
                            "claim_id": "CLAIM-SYNTHETIC-BASIS",
                            "text": "기준일에 유효한 본문과 단서를 함께 확인해야 합니다.",
                            "citation_ids": citations,
                            "kind": "basis",
                        },
                    ]
                }
                if self.malformed_generation:
                    output = {"claims": [{"unexpected": True}]}
            return ProviderHttpResponse(
                200,
                {
                    "model": copied["model"],
                    "message": {
                        "role": "assistant",
                        "content": json.dumps(output, ensure_ascii=False),
                    },
                    "done": True,
                    "prompt_eval_count": 10,
                    "eval_count": 5,
                },
            )
        return ProviderHttpResponse(404, {"error": "synthetic"})
