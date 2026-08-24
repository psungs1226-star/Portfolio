from __future__ import annotations

import math
from typing import Literal

from insaon.evaluation.models import EvaluationMetric, MetricInterval


def wilson_interval(successes: float, total: int, z: float = 1.959963984540054) -> MetricInterval:
    if total == 0:
        return MetricInterval(low=None, high=None)
    proportion = successes / total
    denominator = 1 + z * z / total
    centre = proportion + z * z / (2 * total)
    spread = z * math.sqrt((proportion * (1 - proportion) + z * z / (4 * total)) / total)
    return MetricInterval(
        low=max(0.0, (centre - spread) / denominator),
        high=min(1.0, (centre + spread) / denominator),
    )


def metric(
    metric_id: str,
    numerator: float,
    denominator: int,
    *,
    aggregation: Literal["ratio", "macro_mean", "percentile", "count"] = "ratio",
    slice_id: str = "all",
) -> EvaluationMetric:
    if denominator == 0:
        return EvaluationMetric(
            metric_id=metric_id,
            slice_id=slice_id,
            aggregation=aggregation,
            numerator=None,
            denominator=0,
            value=None,
            ci95=MetricInterval(low=None, high=None),
            undefined_reason="not_measured_zero_denominator",
        )
    interval = (
        wilson_interval(numerator, denominator)
        if aggregation == "ratio"
        else MetricInterval(low=None, high=None)
    )
    return EvaluationMetric(
        metric_id=metric_id,
        slice_id=slice_id,
        aggregation=aggregation,
        numerator=numerator,
        denominator=denominator,
        value=numerator / denominator,
        ci95=interval,
        undefined_reason=None,
    )
