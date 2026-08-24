import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from insaon.evaluation import EvaluationCase, EvaluationMetric, EvaluationResult

ROOT = Path(__file__).resolve().parents[2]


def test_pydantic_case_and_result_match_versioned_samples() -> None:
    cases = [
        EvaluationCase.model_validate_json(line)
        for line in (ROOT / "evals/samples/dev.sample.jsonl").read_text(encoding="utf-8").splitlines()
    ]
    assert [case.case_id for case in cases] == ["CASE-A", "CASE-B", "CASE-C"]
    result = EvaluationResult.model_validate_json(
        (ROOT / "evals/samples/result.sample.json").read_text(encoding="utf-8")
    )
    assert result.schema_version == "0.1.0"


def test_metric_rejects_ratio_mismatch_and_requires_undefined_reason() -> None:
    with pytest.raises(ValidationError):
        EvaluationMetric(
            metric_id="x",
            slice_id="all",
            aggregation="ratio",
            numerator=1,
            denominator=2,
            value=0.75,
            ci95={"low": 0.0, "high": 1.0},
            undefined_reason=None,
        )
    with pytest.raises(ValidationError):
        EvaluationMetric(
            metric_id="x",
            slice_id="all",
            aggregation="ratio",
            numerator=None,
            denominator=0,
            value=None,
            ci95={"low": None, "high": None},
            undefined_reason=None,
        )


def test_schema_enums_match_pydantic_contract() -> None:
    schema = json.loads(
        (ROOT / "evals/schemas/evaluation-case.schema.json").read_text(encoding="utf-8")
    )
    assert schema["properties"]["schema_version"]["const"] == "0.1.0"
    assert set(schema["properties"]["expected"]["properties"]["action"]["enum"]) == {
        "answer",
        "ask",
        "abstain",
    }
