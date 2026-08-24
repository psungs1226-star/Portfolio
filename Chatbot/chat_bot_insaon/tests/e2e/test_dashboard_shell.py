import asyncio

import httpx

from insaon.api.main import create_app
from insaon.settings import Settings


def test_home_renders_chat_dashboard_and_serves_csp_safe_assets() -> None:
    async def run() -> tuple[
        httpx.Response,
        httpx.Response,
        httpx.Response,
        httpx.Response,
        httpx.Response,
    ]:
        transport = httpx.ASGITransport(app=create_app(Settings(environment="test")))
        async with httpx.AsyncClient(
            transport=transport, base_url="http://test"
        ) as client:
            return (
                await client.get("/"),
                await client.get("/static/dashboard.css"),
                await client.get("/static/dashboard.js"),
                await client.get("/static/fonts/LINESeedKR-Rg.woff2"),
                await client.get("/static/fonts/LINESeedKR-Bd.woff2"),
            )

    page, css, script, regular_font, bold_font = asyncio.run(run())

    assert page.status_code == 200
    assert "지방공무원 인사규정 챗봇" in page.text
    assert "지방공무원 인사규정" in page.text
    assert "인사규정 근거 질문" in page.text
    assert 'id="quick-prompts"' in page.text
    assert "무엇을 확인할까요?" in page.text
    assert "보내기" in page.text
    assert "질문 내용" in page.text
    assert "관련 조문" in page.text
    assert "검토 질문" in page.text
    assert "육아휴직·복직" in page.text
    assert "질병휴직·복직" in page.text
    # 휴직 외 인사 영역도 첫 화면에서 물어볼 수 있어야 한다. 예시 카드가 휴직만
    # 보여주면 리뷰어는 범위를 휴직으로 읽는다.
    assert "근무성적평정·승진" in page.text
    assert "징계·소청" in page.text
    assert "보수·수당" in page.text
    assert "가족돌봄휴직" in page.text
    assert "예: 2026년 8월 1일 기준 승진임용 관련 공개 근거 조문을 찾아주세요." in page.text
    assert "육아휴직 복직자의 상반기 정근수당" not in page.text
    assert 'class="review-principles"' not in page.text
    assert "필요한 사실관계를 확인해요" not in page.text
    assert "app-shell is-empty" in page.text
    assert "데모 검증 가이드" not in page.text
    assert "확인한 조건" in page.text
    assert "유의사항" in page.text
    assert "품질 상태" not in page.text
    assert 'id="source-dialog"' in page.text
    assert css.status_code == 200
    assert script.status_code == 200
    assert regular_font.status_code == 200
    assert bold_font.status_code == 200
    assert "text/css" in css.headers["content-type"]
    assert "javascript" in script.headers["content-type"]
    assert "font-size: 8px" not in css.text
    assert "font-size: 9px" not in css.text
    assert ".app-shell.is-empty .conversation-panel" in css.text
    assert ".app-shell.is-empty .evidence-rail" in css.text
    assert "--canvas: #e3e9f0" in css.text
    assert "--accent-800: #204d7d" in css.text
    assert 'font-family: "LINE Seed Sans KR"' in css.text
    assert "font-synthesis: none" in css.text
    assert "user-first local RAG chat" in css.text
    assert "@media (max-width: 1200px)" in css.text
    assert 'document.getElementById("quick-prompts")?.remove()' in script.text
    assert "result.claims" in script.text
    assert "원문 확인이 필요해요" in script.text
    assert 'createElement("p", "answer-copy", result.short_answer)' in script.text
    assert 'fields: ["allowance_period", "reference_date"]' in script.text
    assert "정근수당 산정 반기: ____년 상반기 / 하반기" in script.text
    assert "이번 육아휴직 기간: ____-__-__ ~ ____-__-__" in script.text
    assert "assumedConditionLabels" in script.text
    assert "regularAllowanceAssumptionGroups" not in script.text
    assert "model-run-state" not in script.text
