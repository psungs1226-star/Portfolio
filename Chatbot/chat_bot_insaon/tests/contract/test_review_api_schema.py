import asyncio

import httpx

from insaon.api.main import create_app
from insaon.settings import Settings


def request(payload: dict[str, object], key: str = "KEY-12345678") -> httpx.Response:
    async def call() -> httpx.Response:
        transport = httpx.ASGITransport(app=create_app(Settings(environment="test")))
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.post(
                "/api/v1/reviews",
                json=payload,
                headers={"Idempotency-Key": key},
            )

    return asyncio.run(call())


def test_review_api_returns_prd_contract_and_separate_product_status() -> None:
    response = request(
        {
            "question_text": "2024-01-01 질병휴직 공개 근거를 찾아주세요",
            "local_rule_checked": True,
        }
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ANSWERABLE"
    assert set(body) == {
        "session_id",
        "status",
        "short_answer",
        "confirmed_conditions",
        "assumed_conditions",
        "assumption_profile_id",
        "missing_conditions",
        "citations",
        "claims",
        "model",
        "review_reasons",
        "limitations",
        "data_as_of",
        "local_rule_status",
    }
    assert body["claims"]
    assert body["assumed_conditions"] == []
    assert body["assumption_profile_id"] is None
    assert body["claims"][0]["kind"] == "review_position"
    assert body["short_answer"] == body["claims"][0]["text"]
    assert body["model"] == {
        "status": "completed",
        "model_id": "deterministic-review-model-v1",
        "recommended_status": "ANSWERABLE",
    }


def test_public_api_never_states_a_rate_before_the_decisive_facts() -> None:
    """지급률을 물어도 결정적 사실 없이는 숫자를 만들지 않는다.

    이 테스트는 원래 `INSUFFICIENT_EVIDENCE`를 고정하고 있었는데, 그것은 "이 주제는
    지원하지 않는다"는 답이었지 안전 속성이 아니었다. 범위를 인사 전 영역으로 넓힌
    지금 확인해야 할 것은 주제를 거부하는지가 아니라 **결론 숫자를 만들지 않는지**다.
    """
    response = request(
        {
            "question_text": (
                "2026년 상반기 육아휴직 복직자의 정근수당은 100%인가 50%인가?"
            ),
            "local_rule_checked": False,
        },
        key="PAY-NORMAL-ASSUMPTIONS",
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "REVIEW_REQUIRED"
    # 승인된 정상 가정으로 채울 수 없는 결정적 사실은 그대로 되묻는다.
    assert body["missing_conditions"] == ["reinstatement_date", "leave_periods"]
    assert "required_conditions_missing" in body["review_reasons"]
    assert body["citations"] == []
    # 질문이 제시한 두 후보 중 어느 쪽도 결론으로 말하지 않는다.
    answer = body.get("short_answer") or ""
    assert "100%" not in answer and "50%" not in answer, answer
