import json
from datetime import date

import pytest
from local_transport import ScriptedOllamaTransport

from insaon.adapters.model import OllamaReviewModel
from insaon.adapters.provider import OllamaClient
from insaon.application.factory import synthetic_demo_provisions
from insaon.application.provider_runtime import ProviderFailureCode, ProviderRuntimeError
from insaon.domain import (
    Citation,
    ConditionState,
    ConditionValue,
    DateRange,
    QuestionContext,
)


def _model(transport: ScriptedOllamaTransport) -> OllamaReviewModel:
    return OllamaReviewModel(
        OllamaClient(transport, timeout_seconds=5, max_retries=0),
        model_id="qwen3:4b-instruct",
        prompt_version="answer-v4-local",
    )


def _citations() -> tuple[Citation, ...]:
    return tuple(
        Citation(
            citation_id=f"CITE-{item.provision_id}",
            source_id=item.source_id,
            provision_id=item.provision_id,
            source_name="합성",
            article_path=item.article_path,
            effective_from=item.valid_time.start,
            effective_to=item.valid_time.end,
            source_url="https://example.invalid/synthetic",
        )
        for item in synthetic_demo_provisions()[:2]
    )


def test_local_generation_uses_schema_and_citation_allowlist() -> None:
    transport = ScriptedOllamaTransport()
    model = _model(transport)
    provisions = synthetic_demo_provisions()[:2]
    draft = model.draft(
        QuestionContext("CASE-B", "합성 질병휴직 근거", reference_date=date(2024, 1, 1)),
        provisions,
        _citations(),
    )
    claims = draft.claims
    assert draft.recommended_status == "ANSWERABLE"
    assert claims[0].kind == "review_position"
    assert claims[0].citation_ids == tuple(f"CITE-{item.provision_id}" for item in provisions)
    path, request = transport.calls[0]
    assert path == "/chat"
    assert request["stream"] is False
    assert request["think"] is False
    assert request["keep_alive"] == "20m"
    assert isinstance(request["format"], dict)
    assert "구체적이고 실용적인 답변" in request["messages"][0]["content"]


def test_local_generation_normalizes_first_claim_as_review_position() -> None:
    transport = ScriptedOllamaTransport()
    transport.first_claim_kind = "exception"
    draft = _model(transport).draft(
        QuestionContext("CASE-B", "합성 질병휴직 근거", reference_date=date(2024, 1, 1)),
        synthetic_demo_provisions()[:2],
        _citations(),
    )
    assert draft.claims[0].kind == "review_position"


def test_non_public_medical_condition_is_sent_as_a_non_overridable_boundary() -> None:
    transport = ScriptedOllamaTransport()
    _model(transport).draft(
        QuestionContext(
            "CASE-MEDICAL",
            "2024-01-01 비공무상 질병휴직 후 복직 가능한가요?",
            reference_date=date(2024, 1, 1),
            conditions=(
                ConditionValue(
                    "medical_leave_basis",
                    "non_public_duty",
                    ConditionState.CONFIRMED,
                    "question_text",
                ),
            ),
        ),
        synthetic_demo_provisions()[:2],
        _citations(),
    )

    request_data = json.loads(transport.calls[0][1]["messages"][1]["content"])
    constraints = " ".join(request_data["DETERMINISTIC_CONSTRAINTS"])
    assert "단서의 3년 및 2년 연장" in constraints
    assert "이 질문에 적용하지 않는다" in constraints


def test_non_public_medical_period_overclaim_is_rejected() -> None:
    transport = ScriptedOllamaTransport()
    transport.generation_claim_text = "비공무상 질병휴직도 3년 뒤 2년을 연장할 수 있습니다."
    context = QuestionContext(
        "CASE-MEDICAL-OVERCLAIM",
        "2024-01-01 비공무상 질병휴직 후 복직 가능한가요?",
        reference_date=date(2024, 1, 1),
        conditions=(
            ConditionValue(
                "medical_leave_basis",
                "non_public_duty",
                ConditionState.CONFIRMED,
                "question_text",
            ),
        ),
    )

    with pytest.raises(ProviderRuntimeError) as captured:
        _model(transport).draft(
            context,
            synthetic_demo_provisions()[:2],
            _citations(),
        )

    assert captured.value.failure.code is ProviderFailureCode.INVALID_SCHEMA


def test_regular_allowance_prompt_forbids_reversing_parental_leave_inclusion() -> None:
    transport = ScriptedOllamaTransport()
    model = _model(transport)
    context = QuestionContext(
        "CASE-REGULAR-ALLOWANCE-PROMPT",
        "2026년 상반기 육아휴직 복직자 정근수당",
        reference_date=date(2026, 7, 1),
        intent="regular_service_allowance_review",
        conditions=(
            ConditionValue(
                "deterministic_rate_percent", 100, ConditionState.CONFIRMED, "rule"
            ),
            ConditionValue(
                "deterministic_service_months", 6, ConditionState.CONFIRMED, "rule"
            ),
        ),
    )

    model.draft(context, synthetic_demo_provisions()[:2], _citations())

    system_prompt = transport.calls[0][1]["messages"][0]["content"]
    assert "휴직처분이 없다고 쓰지 않고" in system_prompt
    assert "산입되는 육아휴직을 지급대상에서 제외" in system_prompt


def test_regular_allowance_constraints_use_the_current_question_dates_only() -> None:
    transport = ScriptedOllamaTransport()
    context = QuestionContext(
        "CASE-REGULAR-ALLOWANCE-DYNAMIC-DATES",
        "2027년 하반기 육아휴직 복직자 정근수당",
        reference_date=date(2028, 1, 1),
        intent="regular_service_allowance_review",
        conditions=(
            ConditionValue(
                "reinstatement_date", date(2027, 10, 1), ConditionState.CONFIRMED, "question"
            ),
            ConditionValue(
                "leave_periods",
                (DateRange(date(2027, 7, 1), date(2027, 10, 1)),),
                ConditionState.CONFIRMED,
                "question",
            ),
            ConditionValue(
                "deterministic_rate_percent", 100, ConditionState.CONFIRMED, "rule"
            ),
            ConditionValue(
                "deterministic_service_months", 6, ConditionState.CONFIRMED, "rule"
            ),
        ),
    )

    _model(transport).draft(context, synthetic_demo_provisions()[:2], _citations())

    request_data = json.loads(transport.calls[0][1]["messages"][1]["content"])
    constraints = " ".join(request_data["DETERMINISTIC_CONSTRAINTS"])
    assert "지급 기준일 2028-01-01" in constraints
    assert "복직일 2027-10-01" in constraints
    assert "2027-07-01부터 2027-09-30까지" in constraints
    assert "2026년 1월 1일" not in constraints


def test_regular_allowance_generation_rejects_irrelevant_fifteen_day_rule() -> None:
    transport = ScriptedOllamaTransport()
    transport.generation_claim_text = "휴직기간은 15일 이상이면 1개월로 계산합니다."
    context = QuestionContext(
        "CASE-REGULAR-ALLOWANCE",
        "2026년 상반기 정근수당은 100%인가 50%인가?",
        reference_date=date(2026, 7, 1),
        intent="regular_service_allowance_review",
        conditions=(
            ConditionValue(
                "deterministic_rate_percent", 100, ConditionState.CONFIRMED, "rule"
            ),
            ConditionValue(
                "deterministic_service_months", 6, ConditionState.CONFIRMED, "rule"
            ),
        ),
    )

    with pytest.raises(ProviderRuntimeError) as captured:
        _model(transport).draft(
            context,
            synthetic_demo_provisions()[:2],
            _citations(),
        )

    assert captured.value.failure.code is ProviderFailureCode.INVALID_SCHEMA


@pytest.mark.parametrize("mode", ["malformed", "unauthorized"])
def test_local_generation_rejects_invalid_output(mode: str) -> None:
    transport = ScriptedOllamaTransport()
    transport.malformed_generation = mode == "malformed"
    transport.unauthorized_citation = mode == "unauthorized"
    with pytest.raises(ProviderRuntimeError) as captured:
        _model(transport).draft(
            QuestionContext("CASE-B", "합성", reference_date=date(2024, 1, 1)),
            synthetic_demo_provisions()[:2],
            _citations(),
        )
    assert captured.value.failure.code is ProviderFailureCode.INVALID_SCHEMA
