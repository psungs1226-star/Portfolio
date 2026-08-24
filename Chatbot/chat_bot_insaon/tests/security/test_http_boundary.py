import asyncio

import httpx

from insaon.api.main import create_app
from insaon.settings import Settings


def test_security_headers_and_request_size_boundary() -> None:
    async def run() -> None:
        app = create_app(Settings(environment="test", request_max_bytes=256))
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            health = await client.get("/healthz")
            assert health.headers["x-content-type-options"] == "nosniff"
            assert health.headers["x-frame-options"] == "DENY"
            assert health.headers["cache-control"] == "no-store"
            oversized = await client.post(
                "/api/v1/reviews",
                content=b"x" * 257,
                headers={
                    "Content-Type": "application/json",
                    "Idempotency-Key": "OVERSIZED-001",
                },
            )
            assert oversized.status_code == 413
            assert oversized.json() == {"detail": "request_too_large"}
            readiness = await client.get("/readyz")
            assert readiness.json()["status"] == "not_ready"

    asyncio.run(run())


def test_post_rate_limit_is_enforced_without_logging_payload() -> None:
    async def run() -> None:
        app = create_app(Settings(environment="test", rate_limit_per_minute=1))
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            first = await client.post(
                "/api/v1/reviews",
                json={"question_text": "휴직 조건을 확인해 주세요."},
                headers={"Idempotency-Key": "RATE-FIRST-001"},
            )
            second = await client.post(
                "/api/v1/reviews",
                json={"question_text": "다른 질문입니다."},
                headers={"Idempotency-Key": "RATE-SECOND-002"},
            )
            assert first.status_code == 200
            assert second.status_code == 429
            assert second.json() == {"detail": "rate_limit_exceeded"}

    asyncio.run(run())
