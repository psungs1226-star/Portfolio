import asyncio

import httpx

from insaon.api.main import create_app
from insaon.settings import Settings


def test_health_endpoint_uses_explicit_safe_settings() -> None:
    app = create_app(Settings(environment="test"))

    async def request_health() -> httpx.Response:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(
            transport=transport,
            base_url="http://testserver",
        ) as client:
            return await client.get("/healthz")

    response = asyncio.run(request_health())
    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "인사ON",
        "environment": "test",
        "runtime_profile": "offline",
    }


def test_app_factory_registers_review_routes_without_provider_side_effects() -> None:
    app = create_app(Settings(environment="test"))
    paths = {route.path for route in app.routes}

    assert "/healthz" in paths
    assert "/api/v1/reviews" in paths
    assert "/api/v1/reviews/{session_id}/messages" in paths
