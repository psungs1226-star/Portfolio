from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from insaon.domain import DateRange, Provision


@dataclass(frozen=True)
class RuleCheck:
    passed: bool
    review_reasons: tuple[str, ...] = ()
    calculated_days: int | None = None


@dataclass(frozen=True)
class RegularServiceAllowanceCheck:
    eligible: bool
    actual_service_months: int
    rate_percent: float | None
    review_reasons: tuple[str, ...] = ()


class RuleService:
    version = "rule-service-0.1.0"

    def total_unique_days(self, periods: tuple[DateRange, ...]) -> int:
        if not periods:
            return 0
        ordered = sorted(periods, key=lambda period: period.start)
        merged: list[tuple[date, date]] = []
        for period in ordered:
            if period.end is None:
                raise ValueError("leave periods require an exclusive end date")
            if not merged or period.start > merged[-1][1]:
                merged.append((period.start, period.end))
            else:
                merged[-1] = (merged[-1][0], max(merged[-1][1], period.end))
        return sum((end - start).days for start, end in merged)

    def regular_service_allowance_rate(
        self,
        *,
        payment_date: date,
        reinstatement_date: date,
        leave_periods: tuple[DateRange, ...],
        prior_same_child_leave_months: int,
        salary_on_payment_date: bool,
        disciplinary_action_in_period: bool,
        other_nonservice_periods: tuple[DateRange, ...],
        annual_salary_exclusion_applies: bool,
        expanded_parental_leave_months: int = 12,
    ) -> RegularServiceAllowanceCheck:
        if payment_date.month not in {1, 7} or payment_date.day != 1:
            return RegularServiceAllowanceCheck(
                False, 0, None, ("invalid_regular_allowance_payment_date",)
            )
        if annual_salary_exclusion_applies:
            return RegularServiceAllowanceCheck(
                False, 0, None, ("annual_salary_separate_payment_excluded",)
            )
        if disciplinary_action_in_period:
            return RegularServiceAllowanceCheck(
                False, 0, None, ("disciplinary_action_payment_excluded",)
            )
        if not salary_on_payment_date:
            return RegularServiceAllowanceCheck(
                False, 0, None, ("salary_on_payment_date_required",)
            )
        window = (
            DateRange(date(payment_date.year, 1, 1), payment_date)
            if payment_date.month == 7
            else DateRange(date(payment_date.year - 1, 7, 1), payment_date)
        )
        window_end = window.end
        if window_end is None:
            raise ValueError("regular allowance window requires an exclusive end date")
        countable: list[DateRange] = []
        remaining_parental_months = max(
            0, expanded_parental_leave_months - prior_same_child_leave_months
        )
        for period in sorted(leave_periods, key=lambda item: item.start):
            clipped = _intersection(period, window)
            if clipped is None or remaining_parental_months <= 0:
                continue
            countable_end = min(
                clipped.end or window_end,
                _add_months(clipped.start, remaining_parental_months),
            )
            if countable_end > clipped.start:
                countable.append(DateRange(clipped.start, countable_end))
                remaining_parental_months -= _whole_or_rounded_months(
                    clipped.start, countable_end
                )
        if reinstatement_date < window_end:
            countable.append(
                DateRange(max(reinstatement_date, window.start), window_end)
            )
        countable = _subtract_periods(countable, other_nonservice_periods)
        months = min(6, _count_merged_months(countable))
        return RegularServiceAllowanceCheck(
            True,
            months,
            round(months * 100 / 6, 2),
        )

    def validate_temporal_and_citations(
        self,
        reference_date: date | None,
        provisions: tuple[Provision, ...],
        citation_ids: tuple[str, ...],
        *,
        unresolved_supplementary: bool = False,
        local_rule_conflict: bool = False,
    ) -> RuleCheck:
        reasons: list[str] = []
        if reference_date is None:
            reasons.append("reference_date_required")
        elif any(not provision.valid_time.contains(reference_date) for provision in provisions):
            reasons.append("invalid_effective_version")
        provision_ids = {provision.provision_id for provision in provisions}
        if not set(citation_ids) <= provision_ids:
            reasons.append("citation_id_not_found")
        if unresolved_supplementary:
            reasons.append("supplementary_interpretation_required")
        if local_rule_conflict:
            reasons.append("local_rule_conflict")
        return RuleCheck(not reasons, tuple(reasons))


def _intersection(left: DateRange, right: DateRange) -> DateRange | None:
    start = max(left.start, right.start)
    end = min(left.end or date.max, right.end or date.max)
    return DateRange(start, end) if start < end else None


def _add_months(value: date, months: int) -> date:
    year = value.year + (value.month - 1 + months) // 12
    month = (value.month - 1 + months) % 12 + 1
    month_ends = (31, 29 if _leap(year) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31)
    return date(year, month, min(value.day, month_ends[month - 1]))


def _leap(year: int) -> bool:
    return year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)


def _whole_or_rounded_months(start: date, end: date) -> int:
    months = 0
    cursor = start
    while _add_months(cursor, 1) <= end:
        cursor = _add_months(cursor, 1)
        months += 1
    if (end - cursor).days >= 15:
        months += 1
    return months


def _count_merged_months(periods: list[DateRange]) -> int:
    if not periods:
        return 0
    merged: list[DateRange] = []
    for period in sorted(periods, key=lambda item: item.start):
        if period.end is None:
            raise ValueError("allowance periods require an exclusive end date")
        if not merged or merged[-1].end is None or period.start > merged[-1].end:
            merged.append(period)
            continue
        previous = merged[-1]
        previous_end = previous.end
        period_end = period.end
        if previous_end is None or period_end is None:
            raise ValueError("allowance periods require an exclusive end date")
        merged[-1] = DateRange(previous.start, max(previous_end, period_end))
    return sum(
        _whole_or_rounded_months(period.start, period.end)
        for period in merged
        if period.end is not None
    )


def _subtract_periods(
    periods: list[DateRange], exclusions: tuple[DateRange, ...]
) -> list[DateRange]:
    remaining = periods
    for exclusion in exclusions:
        next_remaining: list[DateRange] = []
        for period in remaining:
            overlap = _intersection(period, exclusion)
            if overlap is None:
                next_remaining.append(period)
                continue
            if period.start < overlap.start:
                next_remaining.append(DateRange(period.start, overlap.start))
            if period.end is not None and overlap.end is not None and overlap.end < period.end:
                next_remaining.append(DateRange(overlap.end, period.end))
        remaining = next_remaining
    return remaining
