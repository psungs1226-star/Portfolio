from datetime import date

from insaon.application.rules import RuleService
from insaon.domain import DateRange


def test_unique_days_merges_overlap_and_uses_exclusive_end() -> None:
    periods = (
        DateRange(date(2024, 2, 28), date(2024, 3, 2)),
        DateRange(date(2024, 3, 1), date(2024, 3, 4)),
    )
    assert RuleService().total_unique_days(periods) == 5


def test_adjacent_half_open_periods_sum_without_overlap() -> None:
    periods = (
        DateRange(date(2024, 1, 1), date(2024, 1, 2)),
        DateRange(date(2024, 1, 2), date(2024, 1, 3)),
    )
    assert RuleService().total_unique_days(periods) == 2
