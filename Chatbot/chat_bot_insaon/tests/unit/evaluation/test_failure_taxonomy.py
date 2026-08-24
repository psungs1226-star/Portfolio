import json
from pathlib import Path

from insaon.evaluation.failures import FAILURE_TYPES, FATAL_EQUIVALENTS

ROOT = Path(__file__).resolve().parents[3]


def results() -> list[dict]:
    return [
        json.loads(path.read_text(encoding="utf-8"))
        for path in sorted((ROOT / "evals/results").glob("*.json"))
    ]


def test_published_counts_match_the_listed_case_ids() -> None:
    """A count a reader cannot check against case IDs is not evidence."""
    for result in results():
        failures = result["failure_types"]
        assert set(failures["by_type"]) == set(FAILURE_TYPES)
        for failure, count in failures["by_type"].items():
            assert count == len(failures["case_ids_by_type"][failure])
            assert count <= result["data"]["case_count"]


def test_cases_with_any_failure_is_the_union_not_the_sum() -> None:
    """One case can carry several failure types, so the sum would overcount."""
    for result in results():
        failures = result["failure_types"]
        union = {
            case_id
            for case_ids in failures["case_ids_by_type"].values()
            for case_id in case_ids
        }
        assert failures["cases_with_any_failure"] == len(union)


def test_fatal_case_ids_are_a_subset_of_the_classified_failures() -> None:
    """Every fatal error must also appear in the taxonomy, or one report contradicts the other."""
    for result in results():
        classified = {
            case_id
            for failure, case_ids in result["failure_types"]["case_ids_by_type"].items()
            if failure in FATAL_EQUIVALENTS
            for case_id in case_ids
        }
        assert set(result["fatal_errors"]["case_ids"]) <= classified


def test_the_taxonomy_actually_discriminates() -> None:
    """At least three failure classes must be observed somewhere in the ablation.

    Fewer means the corpus has too few traps for the comparison to explain anything,
    which is the condition the distractor corpus was built to remove.
    """
    observed = {
        failure
        for result in results()
        for failure, count in result["failure_types"]["by_type"].items()
        if count
    }
    assert len(observed) >= 3, observed


def test_public_failure_report_carries_no_question_text_or_answer_key() -> None:
    report = (ROOT / "evals/reports/failure_analysis.md").read_text(encoding="utf-8")
    dataset = ROOT.parent.parent / "private/evals/test_mvp_locked.synthetic.jsonl"
    if not dataset.is_file():
        return
    for line in dataset.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        case = json.loads(line)
        assert case["question_text"] not in report
        for provision_id in case["expected"]["required_evidence_ids"]:
            assert provision_id not in report
