from insaon.evaluation.metrics import metric, wilson_interval


def test_wilson_interval_and_zero_denominator_contract() -> None:
    interval = wilson_interval(8, 10)
    assert interval.low is not None and interval.high is not None
    assert interval.low < 0.8 < interval.high
    undefined = metric("x", 0, 0)
    assert undefined.value is None
    assert undefined.undefined_reason == "not_measured_zero_denominator"


def test_macro_metric_preserves_sum_and_denominator() -> None:
    result = metric("macro", 2.5, 3, aggregation="macro_mean")
    assert result.numerator == 2.5
    assert result.denominator == 3
    assert result.value == 2.5 / 3
