"""Framework-independent contracts for the InsaON review-support domain."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import date, datetime
from enum import StrEnum
from typing import Any


class AnswerStatus(StrEnum):
    ANSWERABLE = "ANSWERABLE"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"
    INSUFFICIENT_EVIDENCE = "INSUFFICIENT_EVIDENCE"


class ExpectedAction(StrEnum):
    ANSWER = "answer"
    ASK = "ask"
    ABSTAIN = "abstain"


class LeaveType(StrEnum):
    PARENTAL = "parental"
    MEDICAL = "medical"
    FAMILY_CARE = "family_care"
    SELF_DEVELOPMENT = "self_development"
    UNKNOWN = "unknown"
    OUT_OF_SCOPE = "out_of_scope"


class LocalRuleStatus(StrEnum):
    UNCONFIRMED = "unconfirmed"
    CHECKED = "checked"


class ConditionState(StrEnum):
    CONFIRMED = "confirmed"
    UNKNOWN = "unknown"
    CONFLICT = "conflict"


class ClaimKind(StrEnum):
    REVIEW_POSITION = "review_position"
    BASIS = "basis"
    EXCEPTION = "exception"
    NEXT_CHECK = "next_check"


@dataclass(frozen=True)
class DateRange:
    """Half-open validity interval: ``[start, end)``."""

    start: date
    end: date | None = None

    def __post_init__(self) -> None:
        if self.end is not None and self.end <= self.start:
            raise ValueError("end must be after start for a half-open interval")

    def contains(self, value: date) -> bool:
        return self.start <= value and (self.end is None or value < self.end)

    def overlaps(self, other: DateRange) -> bool:
        left_end = self.end or date.max
        right_end = other.end or date.max
        return self.start < right_end and other.start < left_end


@dataclass(frozen=True)
class ConditionValue:
    field_name: str
    value: Any
    state: ConditionState
    provenance: str


@dataclass(frozen=True)
class QuestionContext:
    request_id: str
    question_text: str
    employee_system: str = "local_government"
    employee_category: str = "general_service"
    leave_type: LeaveType = LeaveType.UNKNOWN
    reference_date: date | None = None
    conditions: tuple[ConditionValue, ...] = ()
    local_rule_status: LocalRuleStatus = LocalRuleStatus.UNCONFIRMED
    intent: str = "unknown"


@dataclass(frozen=True)
class SourceDocument:
    source_id: str
    source_name: str
    source_type: str
    issuer: str
    official_source_id: str
    promulgation_date: date
    valid_time: DateRange
    retrieved_at: datetime
    source_url: str
    content_hash: str
    parser_version: str
    system_time: DateRange

    def __post_init__(self) -> None:
        if not re.fullmatch(r"[a-f0-9]{64}", self.content_hash):
            raise ValueError("content_hash must be a lowercase SHA-256")
        if not self.source_url.startswith(("https://", "http://")):
            raise ValueError("source_url must be an HTTP(S) URL")


@dataclass(frozen=True)
class Provision:
    provision_id: str
    source_id: str
    article_path: str
    title: str
    text: str
    valid_time: DateRange
    applies_to: frozenset[str]
    topic_tags: frozenset[str]
    parent_provision_id: str | None = None
    proviso_text: str | None = None
    relation_ids: tuple[str, ...] = ()
    source_hash: str = ""

    def is_effective_on(self, reference_date: date, subject: str) -> bool:
        return self.valid_time.contains(reference_date) and subject in self.applies_to


@dataclass(frozen=True)
class Citation:
    citation_id: str
    source_id: str
    provision_id: str
    source_name: str
    article_path: str
    effective_from: date
    effective_to: date | None
    source_url: str
    title: str = ""
    excerpt: str = ""
    claim_ids: tuple[str, ...] = ()

    def __post_init__(self) -> None:
        if not self.source_id or not self.provision_id or not self.article_path:
            raise ValueError("citation must reference a source and provision")


@dataclass(frozen=True)
class Claim:
    claim_id: str
    text: str
    citation_ids: tuple[str, ...]
    kind: ClaimKind = ClaimKind.BASIS


@dataclass(frozen=True)
class ReviewDraft:
    recommended_status: AnswerStatus
    claims: tuple[Claim, ...]


@dataclass(frozen=True)
class ReviewAnswer:
    status: AnswerStatus
    short_answer: str
    confirmed_conditions: tuple[str, ...] = ()
    assumed_conditions: tuple[str, ...] = ()
    assumption_profile_id: str | None = None
    missing_conditions: tuple[str, ...] = ()
    citations: tuple[Citation, ...] = ()
    claims: tuple[Claim, ...] = ()
    review_reasons: tuple[str, ...] = ()
    limitations: tuple[str, ...] = ()
    data_as_of: date | None = None
    local_rule_status: LocalRuleStatus = LocalRuleStatus.UNCONFIRMED
    model_id: str | None = None
    model_used: bool = False
    model_recommended_status: AnswerStatus | None = None

    def __post_init__(self) -> None:
        if bool(self.assumed_conditions) != bool(self.assumption_profile_id):
            raise ValueError(
                "assumed conditions and assumption profile id must be returned together"
            )
        confirmed = set(self.confirmed_conditions)
        assumed = set(self.assumed_conditions)
        missing = set(self.missing_conditions)
        if confirmed & missing or assumed & confirmed or assumed & missing:
            raise ValueError(
                "confirmed, assumed, and missing conditions must be disjoint"
            )
        if self.status is AnswerStatus.ANSWERABLE:
            if self.missing_conditions:
                raise ValueError("ANSWERABLE cannot have missing conditions")
            if not self.citations:
                raise ValueError("ANSWERABLE requires at least one verified citation")
        citation_ids = {citation.citation_id for citation in self.citations}
        for claim in self.claims:
            if not claim.citation_ids or not set(claim.citation_ids) <= citation_ids:
                raise ValueError("each claim must use citations present in the answer")


@dataclass(frozen=True)
class RetrievalCandidate:
    provision_id: str
    rank: int
    raw_score: float
    source: str
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class RawSnapshot:
    snapshot_id: str
    source_id: str
    official_source_id: str
    source_url: str
    content: str
    content_type: str
    content_hash: str
    retrieved_at: datetime
    promulgation_date: date
    effective_from: date
    parser_version: str
    effective_to: date | None = None


@dataclass(frozen=True)
class QualityIssue:
    code: str
    message: str
    fatal: bool = True


@dataclass(frozen=True)
class ParsedDocument:
    snapshot: RawSnapshot
    provisions: tuple[Provision, ...]
    quality_issues: tuple[QualityIssue, ...] = ()
    supplementary_ids: tuple[str, ...] = ()

    @property
    def quality_passed(self) -> bool:
        return not any(issue.fatal for issue in self.quality_issues)
