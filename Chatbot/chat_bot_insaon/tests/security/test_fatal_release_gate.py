import copy
import json
from pathlib import Path

import pytest

from insaon.evaluation.release import (
    ReleaseGateError,
    assert_same_evaluation_conditions,
    selected_release_allowed,
)

ROOT = Path(__file__).resolve().parents[2]


def results() -> list[dict]:
    return [
        json.loads(path.read_text(encoding="utf-8"))
        for path in sorted((ROOT / "evals/results").glob("*.json"))
    ]


def test_release_gate_tracks_the_measured_fatal_error_count() -> None:
    """The gate must follow the measurement, not a hoped-for outcome.

    The distractor corpus introduced in phase 16 exposed decisive-exception failures
    that the earlier seven-provision fixture could not produce. Asserting that H3 is
    always releasable would hide them, so this asserts the gate agrees with whatever
    the recorded fatal count is, and that a zero-fatal run would be allowed.
    """
    h3 = next(item for item in results() if item["system"]["config_id"] == "H3")
    measured = h3["fatal_errors"]["total"]
    assert selected_release_allowed(h3) is (measured == 0)

    clean = copy.deepcopy(h3)
    clean["fatal_errors"]["total"] = 0
    clean["fatal_errors"]["by_type"] = dict.fromkeys(clean["fatal_errors"]["by_type"], 0)
    clean["fatal_errors"]["case_ids"] = []
    assert selected_release_allowed(clean)

    failed = copy.deepcopy(clean)
    failed["fatal_errors"]["total"] = 1
    failed["fatal_errors"]["by_type"]["FATAL_HALLUCINATED_CITATION"] = 1
    assert not selected_release_allowed(failed)


def test_release_gate_rejects_condition_drift() -> None:
    values = results()
    assert_same_evaluation_conditions(values)
    drifted = copy.deepcopy(values)
    drifted[0]["execution"]["top_k"] = 99
    with pytest.raises(ReleaseGateError):
        assert_same_evaluation_conditions(drifted)
