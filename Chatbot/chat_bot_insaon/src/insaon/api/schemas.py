"""HTTP request and response schemas."""

from __future__ import annotations

from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from insaon.domain import AnswerStatus, ClaimKind, LocalRuleStatus, ReviewAnswer


class HealthResponse(BaseModel):
    """Non-sensitive process health response."""

    model_config = ConfigDict(frozen=True)

    status: Literal["ok"] = "ok"
    service: str
    environment: str
    runtime_profile: Literal["offline", "local"]


class ReadinessResponse(BaseModel):
    model_config = ConfigDict(frozen=True)

    status: Literal["ready", "not_ready"]
    checks: dict[str, bool]


class ReviewRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    question_text: str = Field(min_length=1, max_length=2000)
    local_rule_checked: bool = False


class CitationResponse(BaseModel):
    citation_id: str
    source_id: str
    provision_id: str
    source_name: str
    article_path: str
    effective_from: date
    effective_to: date | None
    source_url: str
    title: str
    excerpt: str


class ClaimResponse(BaseModel):
    claim_id: str
    text: str
    citation_ids: list[str]
    kind: ClaimKind


class ModelExecutionResponse(BaseModel):
    status: Literal["completed", "not_run", "failed"]
    model_id: str | None
    recommended_status: AnswerStatus | None


class ReviewResponse(BaseModel):
    session_id: str
    status: AnswerStatus
    short_answer: str
    confirmed_conditions: list[str]
    assumed_conditions: list[str]
    assumption_profile_id: str | None
    missing_conditions: list[str]
    citations: list[CitationResponse]
    claims: list[ClaimResponse]
    model: ModelExecutionResponse
    review_reasons: list[str]
    limitations: list[str]
    data_as_of: date | None
    local_rule_status: LocalRuleStatus

    @classmethod
    def from_domain(cls, session_id: str, answer: ReviewAnswer) -> ReviewResponse:
        return cls(
            session_id=session_id,
            status=answer.status,
            short_answer=answer.short_answer,
            confirmed_conditions=list(answer.confirmed_conditions),
            assumed_conditions=list(answer.assumed_conditions),
            assumption_profile_id=answer.assumption_profile_id,
            missing_conditions=list(answer.missing_conditions),
            citations=[
                CitationResponse(
                    citation_id=item.citation_id,
                    source_id=item.source_id,
                    provision_id=item.provision_id,
                    source_name=item.source_name,
                    article_path=item.article_path,
                    effective_from=item.effective_from,
                    effective_to=item.effective_to,
                    source_url=item.source_url,
                    title=item.title,
                    excerpt=item.excerpt,
                )
                for item in answer.citations
            ],
            claims=[
                ClaimResponse(
                    claim_id=item.claim_id,
                    text=item.text,
                    citation_ids=list(item.citation_ids),
                    kind=item.kind,
                )
                for item in answer.claims
            ],
            model=ModelExecutionResponse(
                status=(
                    "completed"
                    if answer.model_used
                    else "failed"
                    if any(
                        reason.startswith("provider_")
                        or reason in {"draft_invalid", "unsupported_claim"}
                        for reason in answer.review_reasons
                    )
                    else "not_run"
                ),
                model_id=answer.model_id,
                recommended_status=answer.model_recommended_status,
            ),
            review_reasons=list(answer.review_reasons),
            limitations=list(answer.limitations),
            data_as_of=answer.data_as_of,
            local_rule_status=answer.local_rule_status,
        )
