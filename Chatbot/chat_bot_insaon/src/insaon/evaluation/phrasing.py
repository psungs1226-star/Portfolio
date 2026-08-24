"""Meaning-preserving rewrites of a question, for measuring query-understanding.

The locked set writes every ISO date with a space after it. All 37 answerable questions
do. That is one notation out of several a Korean writer uses, and the ablation's
downstream columns turned out to depend on it: deleting one space per question took
상태 정확도 from 1.000 to 0.373 and 인용 완전성 from 1.000 to 0.000 while
`retrieval.set_recall_at_5` never moved, because the retrieval metrics are computed from
the case's structured fields rather than from what the pipeline parsed.

Evaluation-only. The runtime must never import this: it exists to perturb inputs, not to
normalise them. Normalising here would hide the defect instead of measuring it.
"""

from __future__ import annotations

import re

_ISO_DATE = re.compile(r"(?<!\d)(\d{4})-(\d{2})-(\d{2})(?!\d)")
_DATE_THEN_HANGUL = re.compile(r"((?<!\d)\d{4}-\d{2}-\d{2}(?!\d)) +(?=[가-힣])")


def attach_particle(question: str) -> str:
    """``2024-01-01 기준으로`` → ``2024-01-01기준으로``.

    The commonest way the notation actually appears when typed quickly, and the exact
    shape that a trailing ``\\b`` in the date pattern could not match.
    """
    return _DATE_THEN_HANGUL.sub(r"\1", question)


def dotted_notation(question: str) -> str:
    """``2024-01-01`` → ``2024.01.01``. Same date, the other common written form."""
    return _ISO_DATE.sub(lambda m: f"{m.group(1)}.{m.group(2)}.{m.group(3)}", question)


VARIANTS: tuple[tuple[str, object], ...] = (
    ("attached_particle", attach_particle),
    ("dotted_notation", dotted_notation),
)


def variants(question: str) -> tuple[tuple[str, str], ...]:
    """Return ``(variant_id, rewritten)`` for every rewrite that changes the question."""
    rewritten: list[tuple[str, str]] = []
    for variant_id, rewrite in VARIANTS:
        candidate = rewrite(question)  # type: ignore[operator]
        if candidate != question:
            rewritten.append((variant_id, candidate))
    return tuple(rewritten)
