"""Pydantic mirrors of the versioned evaluation JSON contracts."""

from __future__ import annotations

from datetime import date, datetime
from typing import Literal, Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

from insaon.domain import AnswerStatus, ExpectedAction


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class EvaluationSlice(StrictModel):
    task: Literal[
        "single_evidence",
        "multi_evidence",
        "missing_condition",
        "temporal",
        "out_of_scope",
        "security",
        "multi_turn",
    ]
    leave_type: Literal[
        "parental",
        "medical",
        "family_care",
        "self_development",
        "mixed_or_other",
    ]


class EvaluationSubject(StrictModel):
    employee_system: Literal["local_government", "other", "unknown"]
    employee_category: Literal["general_service", "other", "unknown"]


class EvaluationExpected(StrictModel):
    action: ExpectedAction
    answer_status: AnswerStatus
    required_condition_fields: list[str]
    required_evidence_ids: list[str]
    required_exception_ids: list[str]
    forbidden_evidence_ids: list[str]


class EvaluationAnnotation(StrictModel):
    author_id: str = Field(min_length=1)
    reviewer_ids: list[str]
    adjudication_status: Literal["pending", "accepted", "excluded"]


class EvaluationCase(StrictModel):
    schema_version: Literal["0.1.0"]
    case_id: str = Field(pattern=r"^CASE-[A-Z0-9][A-Z0-9_-]*$")
    group_id: str = Field(pattern=r"^GROUP-[A-Z0-9][A-Z0-9_-]*$")
    split: Literal["dev", "test_mvp_locked", "test_extended_locked"]
    question_text: str = Field(min_length=1)
    turns: list[str]
    slice: EvaluationSlice
    reference_date: date | None
    subject: EvaluationSubject
    expected: EvaluationExpected
    critical_flags: list[str]
    annotation: EvaluationAnnotation


class MetricInterval(StrictModel):
    low: float | None
    high: float | None


class EvaluationMetric(StrictModel):
    metric_id: str = Field(min_length=1)
    slice_id: str = Field(min_length=1)
    aggregation: Literal["ratio", "macro_mean", "percentile", "count"]
    numerator: float | None
    denominator: int = Field(ge=0)
    value: float | None
    ci95: MetricInterval
    undefined_reason: str | None

    @model_validator(mode="after")
    def check_denominator_contract(self) -> Self:
        if self.denominator == 0:
            if self.numerator is not None or self.value is not None or not self.undefined_reason:
                raise ValueError("zero denominator requires null values and undefined_reason")
            return self
        if self.undefined_reason is not None:
            raise ValueError("measured metrics cannot have undefined_reason")
        if self.aggregation in {"ratio", "macro_mean"}:
            if self.numerator is None or self.value is None:
                raise ValueError("measured mean requires numerator and value")
            if abs(self.value - self.numerator / self.denominator) > 1e-12:
                raise ValueError("value must equal numerator/denominator")
        return self


class EvaluationSystem(StrictModel):
    config_id: Literal["B0", "B1", "H1", "H2", "H3", "H4", "SAMPLE"]
    code_revision: str
    retrieval_config: str
    model: str
    embedding: str
    reranker: str
    query_transform: str = "none"
    prompt_version: str
    rule_version: str
    parser_version: str
    index_version: str


class EvaluationData(StrictModel):
    dataset_id: str
    dataset_version: str
    dataset_hash: str = Field(pattern=r"^[a-f0-9]{64}$")
    case_count: int = Field(ge=0)
    unique_case_count: int = Field(ge=0)
    source_snapshot_id: str
    source_snapshot_hash: str = Field(pattern=r"^[a-f0-9]{64}$")
    data_as_of: date


    @model_validator(mode="after")
    def check_distinct_cases(self) -> Self:
        """Reject a padded set.

        Version 0.1.0 of the regression file shipped 60 case IDs built from 12 distinct
        (question, date, expectation, subject) tuples, which inflated every published
        denominator about fivefold and narrowed every confidence interval. Publishing
        both counts is what makes that visible; requiring them equal is what stops it.
        """
        if self.unique_case_count > self.case_count:
            raise ValueError("unique_case_count cannot exceed case_count")
        if self.unique_case_count != self.case_count:
            raise ValueError(
                "evaluation set contains duplicate cases: "
                f"{self.case_count} cases, {self.unique_case_count} distinct"
            )
        return self


class EvaluationExecution(StrictModel):
    top_k: int = Field(ge=1)
    generation_repeats: int = Field(ge=0)
    seed_policy: str
    environment_lock_hash: str = Field(pattern=r"^[a-f0-9]{64}$")


class FatalErrors(StrictModel):
    total: int = Field(ge=0)
    by_type: dict[str, int]
    case_ids: list[str]

    @model_validator(mode="after")
    def check_total(self) -> Self:
        if self.total != sum(self.by_type.values()):
            raise ValueError("fatal total must equal by_type sum")
        return self


class FailureTypes(StrictModel):
    """Observed failure classes for one configuration.

    ``case_ids`` is published; question text and answer keys are not. A case identifier
    alone does not leak the locked set, and without it a reader cannot check that the
    per-type counts add up.
    """

    by_type: dict[str, int]
    case_ids_by_type: dict[str, list[str]]
    cases_with_any_failure: int = Field(ge=0)

    @model_validator(mode="after")
    def check_counts(self) -> Self:
        if set(self.by_type) != set(self.case_ids_by_type):
            raise ValueError("failure type keys must match between counts and case ids")
        for key, count in self.by_type.items():
            if count != len(self.case_ids_by_type[key]):
                raise ValueError(f"failure count does not match case ids: {key}")
        return self


class EvaluationResult(StrictModel):
    schema_version: Literal["0.1.0"]
    run_id: str
    status: Literal["completed", "partial", "failed"]
    started_at: datetime
    completed_at: datetime | None
    system: EvaluationSystem
    data: EvaluationData
    execution: EvaluationExecution
    metrics: list[EvaluationMetric]
    fatal_errors: FatalErrors
    failure_types: FailureTypes
    case_results_path: str | None
    limitations: list[str]
    notes: list[str]

    @model_validator(mode="after")
    def check_completed(self) -> Self:
        if self.status == "completed" and (self.completed_at is None or self.data.case_count == 0):
            raise ValueError("completed results require completion time and cases")
        return self
