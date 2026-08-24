import asyncio

import httpx

from insaon.api.main import create_app
from insaon.settings import Settings


def test_case_c_page_visibly_abstains_for_out_of_scope() -> None:
    async def run() -> str:
        transport = httpx.ASGITransport(app=create_app(Settings(environment="test")))
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            return (await client.get("/demo/CASE-C")).text

    html = asyncio.run(run())
    assert "지원 범위 밖" in html
    assert "지원 범위" in html
    assert "지원 대상·업무 범위를 벗어난 질문" in html
    assert "최종 인사처분 또는 법률해석을 대신하지" in html
    assert "INSUFFICIENT_EVIDENCE" not in html
