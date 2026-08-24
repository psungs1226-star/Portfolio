import asyncio

import httpx

from insaon.api.main import create_app
from insaon.settings import Settings


def test_api_idempotency_and_multi_turn_endpoint() -> None:
    async def run() -> None:
        app = create_app(Settings(environment="test"))
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            headers = {"Idempotency-Key": "FIRST-KEY-123"}
            first = await client.post(
                "/api/v1/reviews",
                json={"question_text": "휴직할 수 있나요?"},
                headers=headers,
            )
            repeated = await client.post(
                "/api/v1/reviews",
                json={"question_text": "이 내용은 저장되면 안 됩니다."},
                headers=headers,
            )
            assert repeated.json() == first.json()
            session_id = first.json()["session_id"]
            second = await client.post(
                f"/api/v1/reviews/{session_id}/messages",
                json={
                    "question_text": "2024-01-01 질병휴직 공개 근거를 찾아주세요",
                    "local_rule_checked": True,
                },
                headers={"Idempotency-Key": "SECOND-KEY-123"},
            )
            assert second.status_code == 200
            assert second.json()["status"] == "ANSWERABLE"

    asyncio.run(run())


def test_public_api_answers_wide_personnel_topics_with_evidence_only() -> None:
    """휴직 외 인사 영역은 근거 조문을 찾아 사람 검토로 넘긴다.

    이 테스트는 원래 `INSUFFICIENT_EVIDENCE`를 고정하고 있었다. 분류기는 여덟 주제를
    알고 있었지만 corpus에 조문이 하나도 없어서 켤 수 없었고, 그래서 "지원 범위 밖"이
    제품의 답이었다. 합성 corpus에 주제별 조문을 채운 뒤로는 근거를 제시하고 결론은
    사람에게 넘기는 것이 맞는 답이다. 조건을 되묻고 결론까지 가는 심층 검토는
    휴직·복직만 유지한다.
    """
    async def run() -> None:
        app = create_app(Settings(environment="test"))
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(
            transport=transport, base_url="http://test"
        ) as client:
            first = await client.post(
                "/api/v1/reviews",
                json={
                    "question_text": "승진과 근무성적평정 공개 규정 찾아줘",
                },
                headers={"Idempotency-Key": "WIDE-TURN-ONE-KEY"},
            )

            assert first.status_code == 200
            first_body = first.json()
            # 기준일이 없으면 오늘로 가정하고 근거까지 간다(ADR-0026). 되묻고 멈추면
            # 날짜를 쓰지 않는 FAQ 질문이 전부 막다른 길이 된다. 조문마다 시행일이
            # 다른 문제는 사라지지 않으므로 가정 사실을 답변에 실어 알린다.
            assert first_body["status"] == "REVIEW_REQUIRED"
            assert first_body["missing_conditions"] == []
            assert first_body["assumed_conditions"] == ["reference_date"]
            assert first_body["citations"]

            second = await client.post(
                f"/api/v1/reviews/{first_body['session_id']}/messages",
                json={"question_text": "질문 기준일은 2026-08-01입니다."},
                headers={"Idempotency-Key": "WIDE-TURN-TWO-KEY"},
            )
            assert second.status_code == 200
            body = second.json()
            assert body["status"] == "REVIEW_REQUIRED"
            assert body["citations"], "근거 조문 없이 넘기면 검색 lane이 아니다"
            assert "evidence_only_human_review" in body["review_reasons"]
            cited = [item["provision_id"] for item in body["citations"]]
            assert all(
                item.startswith(("SYNTH-W-PERFORMANCE-AND-PROMOTION", "REAL-W-PERFORMANCE-AND-PROMOTION")) for item in cited
            ), cited
            # 폐지된 옛 버전은 오늘 기준 질문에서 인용할 이유가 없다.
            assert not any(item.endswith("-OLD") for item in cited), cited

    asyncio.run(run())
