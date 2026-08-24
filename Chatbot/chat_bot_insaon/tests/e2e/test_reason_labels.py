"""화면에 영문 코드가 그대로 뜨지 않게 한다.

`reasonLabel`은 사전에 없는 값을 받으면 그 값을 그대로 돌려준다. 그래서 백엔드에
사유 코드를 하나 추가하면 화면에는 `source_version_gap` 같은 문자열이 사용자에게
그대로 보인다. 서버는 200을 반환하고 테스트도 통과하므로 화면을 직접 보지 않으면
알 수 없다.

실제로 이 검사를 처음 돌렸을 때 라벨 없는 코드가 여섯 개 더 있었다.
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REVIEW = ROOT / "src/insaon/application/review.py"
DASHBOARD = ROOT / "src/insaon/web/static/dashboard.js"


def _balanced_block(source: str, start: int) -> str:
    """`review_reasons=(` 다음의 짝이 맞는 닫는 괄호까지를 돌려준다.

    비탐욕 정규식으로는 `*(("source_version_gap",) if gap else ())`처럼 안에 괄호가
    중첩된 형태를 놓친다. 실제로 그렇게 놓쳐서 새 코드가 검사망을 빠져나갔다.
    """
    depth = 0
    for index in range(start, len(source)):
        if source[index] == "(":
            depth += 1
        elif source[index] == ")":
            depth -= 1
            if depth == 0:
                return source[start : index + 1]
    return ""


def emitted_reason_codes() -> set[str]:
    source = REVIEW.read_text(encoding="utf-8")
    codes = set(re.findall(r'_safe_failure\(\s*"([a-z0-9_]+)"', source))
    for match in re.finditer(r"review_reasons=", source):
        opening = source.find("(", match.end())
        if opening != -1:
            block = _balanced_block(source, opening)
            codes |= set(re.findall(r'"([a-z_][a-z0-9_]+)"', block))
    codes |= set(re.findall(r'reasons\.append\("([a-z0-9_]+)"\)', source))
    return codes


def labelled_reason_codes() -> set[str]:
    body = re.search(
        r"const reasonLabels\s*=\s*\{(.*?)\n\s*\};",
        DASHBOARD.read_text(encoding="utf-8"),
        re.S,
    )
    assert body, "dashboard.js에서 reasonLabels를 찾지 못했다"
    return set(re.findall(r'\n\s{4}([a-z0-9_]+):\s*"', body.group(1)))


def test_every_reason_code_the_backend_emits_has_a_korean_label() -> None:
    missing = sorted(emitted_reason_codes() - labelled_reason_codes())

    assert not missing, (
        "다음 사유 코드가 화면에 영문 그대로 표시된다: "
        + ", ".join(missing)
        + " — src/insaon/web/static/dashboard.js의 reasonLabels에 추가한다."
    )


def test_the_check_actually_finds_the_codes() -> None:
    """정규식이 아무것도 못 잡으면 위 테스트는 항상 통과한다."""
    codes = emitted_reason_codes()

    assert len(codes) >= 10
    assert "evidence_only_human_review" in codes
    assert "source_version_gap" in codes
