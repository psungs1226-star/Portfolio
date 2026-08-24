from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REPORT = ROOT / "report" / "portfolio-case-study.html"


def test_portfolio_case_study_connects_plan_build_evidence_and_limits() -> None:
    html = REPORT.read_text(encoding="utf-8")

    assert "처음 세운 계획" in html
    assert "구현 중 바뀐 결정" in html
    assert "어떻게 구현했는가" in html
    assert "어떻게 검증했는가" in html
    assert "한계와 다음 단계" in html
    assert "7 / 7" in html
    assert "60 / 60" in html
    assert "<dd>171</dd>" in html
    assert "H3 합성 회귀" in html
    assert "Harness 15개 phase 상태" in html
    assert "PHASE 14" in html
    assert "필수 사실·승인 가정·명시 예외 분리" in html
    assert "PAY-01 · 정근수당" in html
    assert "12,640개 조문" in html
    assert "PHASE 11" in html
    assert "PHASE 13" in html
    assert "법률 정확도 아님" in html
    assert "planning-report.html" in html
    assert "word-break: keep-all" in html
    assert "line-break: strict" in html

    for asset_name in (
        "app-home.png",
        "app-evidence.png",
        "app-mobile.png",
    ):
        assert (ROOT / "report" / "assets" / asset_name).stat().st_size > 10_000
