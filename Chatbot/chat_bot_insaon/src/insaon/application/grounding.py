"""Check that the quantities a claim asserts came from somewhere we can point at.

The citation validator answers "does this provision exist and was it in force?". It
never answered "does the cited text actually say this?". A model can cite four real,
in-force provisions and still invent the number that decides the case.

Full entailment is out of scope. What is checked here is quantities — 기간, 횟수, 비율 —
because in this domain those are the values that change the outcome, and because an
unsupported quantity is decidable without a second model.
"""

from __future__ import annotations

import re
from collections.abc import Sequence
from datetime import date

_UNITS = ("개월", "년", "개년", "월", "일", "주", "회", "차", "배", "세", "명", "퍼센트", "%")
_QUANTITY = re.compile(rf"(\d+(?:\.\d+)?)\s*({'|'.join(_UNITS)})")

# 한 날짜를 쓰는 세 가지 표기. 법령 원문은 `2012. 3. 21.`을 쓰고, 모델이 옮겨 적은 문장은
# `2012년 3월 21일`을 쓰고, 조건값은 ISO로 렌더된다. 셋을 같은 값으로 보지 않으면 인용문을
# 정확히 옮긴 문장이 환각으로 잡힌다. local 프로필의 승진 질문이 실제로 그렇게 막혔다.
_DATE_FORMS = (
    re.compile(r"(?<!\d)(\d{4})-(\d{1,2})-(\d{1,2})(?!\d)"),
    re.compile(r"(?<!\d)(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일"),
    re.compile(r"(?<!\d)(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\."),
)


def _canonical(value: str) -> str:
    return re.sub(r"\s+", "", value).replace("퍼센트", "%")


def dates(text: str) -> tuple[str, ...]:
    """Return every date in ``text`` as ``YYYY-MM-DD``, whatever notation it was written in."""
    found: list[str] = []
    for pattern in _DATE_FORMS:
        for year, month, day in pattern.findall(text):
            try:
                found.append(date(int(year), int(month), int(day)).isoformat())
            except ValueError:
                continue
    return tuple(dict.fromkeys(found))


def _without_dates(text: str) -> str:
    for pattern in _DATE_FORMS:
        text = pattern.sub(" ", text)
    return text


def quantities(text: str) -> tuple[str, ...]:
    """Return the quantity tokens in ``text``, whitespace-normalised and de-duplicated.

    Dates are removed first so that `2012년 3월 21일` does not decompose into the three
    period-looking tokens `2012년`, `3월`, `21일`. A date is checked as a date by
    :func:`dates`; what remains here is 기간·횟수·비율, which is what this gate is for.
    """
    found = [f"{number}{unit}" for number, unit in _QUANTITY.findall(_without_dates(text))]
    return tuple(dict.fromkeys(_canonical(item) for item in found))


def ungrounded_quantities(
    *,
    claim_text: str,
    cited_texts: tuple[str, ...],
    allowed_values: tuple[str, ...],
) -> tuple[str, ...]:
    """Quantities asserted by ``claim_text`` that no permitted source accounts for.

    A quantity is grounded when it appears in one of the provisions the claim cites, or
    among ``allowed_values`` — the conditions the asker supplied and the values the rule
    engine computed. Those two are the only places a number may legitimately come from
    that the statute text does not already contain.

    Dates are held to the same rule but compared as dates, so notation never decides the
    outcome: a 시행일 the model invented is still reported, and one it copied out of the
    cited text is not.
    """
    supported: set[str] = set()
    supported_dates: set[str] = set()
    for text in (*cited_texts, *allowed_values):
        supported.update(quantities(text))
        supported_dates.update(dates(text))
    return (
        *(item for item in quantities(claim_text) if item not in supported),
        *(item for item in dates(claim_text) if item not in supported_dates),
    )


def condition_quantities(conditions: Sequence[object]) -> tuple[str, ...]:
    """Render extracted condition values so a claim may repeat what the asker supplied.

    Dates, periods and counts the user typed are legitimate content for an answer even
    though no provision contains them.
    """
    rendered: list[str] = []
    for condition in conditions:
        value = getattr(condition, "value", None)
        if value is None:
            continue
        rendered.extend(_render(value))
    return tuple(dict.fromkeys(rendered))


def _render(value: object) -> list[str]:
    if isinstance(value, str | int | float):
        return [str(value)]
    if isinstance(value, date):
        return [value.isoformat()]
    if isinstance(value, Sequence):
        return [item for element in value for item in _render(element)]
    start, end = getattr(value, "start", None), getattr(value, "end", None)
    if isinstance(start, date):
        months = _whole_months(start, end) if isinstance(end, date) else None
        return [
            start.isoformat(),
            *([end.isoformat()] if isinstance(end, date) else []),
            *([f"{months}개월"] if months else []),
        ]
    return []


def _whole_months(start: date, end: date) -> int:
    """Length of a half-open [start, end) range in whole months."""
    return (end.year - start.year) * 12 + end.month - start.month


