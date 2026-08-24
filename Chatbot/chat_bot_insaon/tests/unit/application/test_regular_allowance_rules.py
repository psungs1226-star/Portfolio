from datetime import date

from insaon.application.rules import RuleService
from insaon.domain import DateRange


def _check(*, prior_months: int):
    return RuleService().regular_service_allowance_rate(
        payment_date=date(2026, 7, 1),
        reinstatement_date=date(2026, 4, 1),
        leave_periods=(DateRange(date(2026, 1, 1), date(2026, 4, 1)),),
        prior_same_child_leave_months=prior_months,
        salary_on_payment_date=True,
        disciplinary_action_in_period=False,
        other_nonservice_periods=(),
        annual_salary_exclusion_applies=False,
    )


def test_countable_parental_leave_and_post_reinstatement_work_make_six_months() -> None:
    result = _check(prior_months=0)

    assert result.eligible
    assert result.actual_service_months == 6
    assert result.rate_percent == 100


def test_parental_leave_beyond_basic_counting_limit_leaves_three_work_months() -> None:
    result = _check(prior_months=12)

    assert result.eligible
    assert result.actual_service_months == 3
    assert result.rate_percent == 50


def test_disciplinary_action_blocks_rate_calculation_before_percentage() -> None:
    result = RuleService().regular_service_allowance_rate(
        payment_date=date(2026, 7, 1),
        reinstatement_date=date(2026, 4, 1),
        leave_periods=(DateRange(date(2026, 1, 1), date(2026, 4, 1)),),
        prior_same_child_leave_months=0,
        salary_on_payment_date=True,
        disciplinary_action_in_period=True,
        other_nonservice_periods=(),
        annual_salary_exclusion_applies=False,
    )

    assert not result.eligible
    assert result.rate_percent is None
    assert result.review_reasons == ("disciplinary_action_payment_excluded",)
