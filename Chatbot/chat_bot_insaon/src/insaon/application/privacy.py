from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass(frozen=True)
class PrivacyInspection:
    allowed: bool
    categories: tuple[str, ...]


class PrivacyGate:
    """Conservative pattern gate that returns categories, never matched text."""

    _patterns = {
        "resident_registration_number": re.compile(r"(?<!\d)\d{6}-?[1-8]\d{6}(?!\d)"),
        "phone_number": re.compile(r"(?<!\d)01[016789]-?\d{3,4}-?\d{4}(?!\d)"),
        "employee_number": re.compile(r"(?:사번|직원번호)\s*[:：]?\s*[A-Za-z0-9-]{4,}"),
        "email": re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"),
    }

    def inspect(self, text: str) -> PrivacyInspection:
        categories = tuple(
            name for name, pattern in self._patterns.items() if pattern.search(text)
        )
        return PrivacyInspection(not categories, categories)
