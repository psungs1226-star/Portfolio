import asyncio

import httpx

from insaon.api.main import create_app
from insaon.settings import Settings


def test_api_blocks_synthetic_identifier_and_session_does_not_store_raw_question() -> None:
    async def run() -> None:
        app = create_app(Settings(environment="test"))
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/reviews",
                json={"question_text": "[합성 공격값] 000000-1000000"},
                headers={"Idempotency-Key": "PRIVACY-KEY-123"},
            )
        assert response.json()["status"] == "INSUFFICIENT_EVIDENCE"
        service = app.state.review_api
        assert "question_text" not in repr(service._store._sessions)
        assert "000000" not in repr(service._store._sessions)

    asyncio.run(run())


def test_oversized_question_is_rejected_without_echoing_the_question_back() -> None:
    """Pydantic 검증은 개인정보 차단기보다 먼저 돈다.

    FastAPI 기본 `RequestValidationError` 핸들러는 위반한 값을 `input`에 담아 그대로
    응답에 싣는다. 2000자를 넘긴 질문 하나면 이름·사번·주민등록번호가 응답 본문으로
    되돌아왔다. 모델 호출은 없었지만 원문이 경계 밖으로 나가는 것은 같다.
    """

    async def run() -> None:
        app = create_app(Settings(environment="test"))
        transport = httpx.ASGITransport(app=app)
        secret = "[합성 공격값] 000000-1000000 사번 20180417"
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/reviews",
                json={"question_text": f"{secret} " + "가족돌봄휴직 문의드립니다 " * 200},
                headers={"Idempotency-Key": "OVERSIZE-KEY-123"},
            )

        assert response.status_code == 422
        body = response.text
        assert secret not in body
        assert secret.split()[1] not in body  # [합성 공격값] 주민등록번호 형태
        assert "20180417" not in body
        assert "가족돌봄휴직" not in body
        # 어느 필드가 왜 틀렸는지는 계속 알려준다.
        assert response.json()["detail"][0]["loc"] == ["body", "question_text"]
        assert response.json()["detail"][0]["type"] == "string_too_long"

    asyncio.run(run())


def test_validation_errors_keep_reporting_non_body_fields() -> None:
    """헤더처럼 개인정보가 아닌 위반은 진단 가능해야 한다."""

    async def run() -> None:
        app = create_app(Settings(environment="test"))
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/reviews",
                json={"question_text": "육아휴직 문의"},
                headers={"Idempotency-Key": "short"},
            )

        assert response.status_code == 422
        detail = response.json()["detail"][0]
        assert detail["loc"] == ["header", "Idempotency-Key"]
        assert detail["type"] == "string_too_short"

    asyncio.run(run())
