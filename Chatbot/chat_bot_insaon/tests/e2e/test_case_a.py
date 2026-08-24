import asyncio

import httpx

from insaon.api.main import create_app
from insaon.settings import Settings


def test_case_a_page_shows_missing_conditions_without_conclusion() -> None:
    async def run() -> str:
        transport = httpx.ASGITransport(app=create_app(Settings(environment="test")))
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            return (await client.get("/demo/CASE-A")).text

    html = asyncio.run(run())
    assert "조금만 더 알려주세요" in html
    assert "leave_type" in html
    assert "reference_date" in html
    assert "휴직 유형" in html
    assert "질문 기준일" in html
