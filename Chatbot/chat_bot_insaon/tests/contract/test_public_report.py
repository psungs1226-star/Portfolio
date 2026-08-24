import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def load_result(name: str) -> dict:
    return json.loads((ROOT / "evals/results" / name).read_text(encoding="utf-8"))


def metric(result: dict, metric_id: str) -> dict:
    return next(item for item in result["metrics"] if item["metric_id"] == metric_id)


def test_readme_and_html_are_synced_from_h3_result() -> None:
    h2 = load_result("h2_temporal_filter.json")
    h3 = load_result("h3_reranker_context.json")
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    html = (ROOT / "report/planning-report.html").read_text(encoding="utf-8")

    recall = metric(h3, "retrieval.set_recall_at_5")
    status = metric(h3, "answer.status_accuracy")
    citations = metric(h3, "citation.completeness")
    risky = metric(h3, "abstention.risky_answer_rate")

    for expected in (
        f"{int(recall['numerator'])}/{recall['denominator']}",
        f"{int(status['numerator'])}/{status['denominator']}",
        f"{int(citations['numerator'])}/{citations['denominator']}",
        f"{int(risky['numerator'])}/{risky['denominator']}",
        f"H2 {h2['fatal_errors']['total']}건 → H3 {h3['fatal_errors']['total']}건",
        h3["data"]["dataset_id"],
        h3["data"]["data_as_of"],
    ):
        assert expected in readme
        assert expected in html

    assert "독립 검토 법령 holdout" in readme
    assert "법률 정확도" in html and "미측정" in html
    assert all(case_id in html for case_id in ("CASE-A", "CASE-B", "CASE-C"))
    assert "word-break: keep-all" in html
    assert "line-break: strict" in html


def test_public_reports_preserve_comparison_and_ten_failures() -> None:
    comparison = (ROOT / "evals/reports/comparison.md").read_text(encoding="utf-8")
    failures = (ROOT / "evals/reports/failure_analysis.md").read_text(encoding="utf-8")

    assert all(f"| {config_id} |" in comparison for config_id in ("B0", "B1", "H1", "H2", "H3"))
    assert "법률 정확도 결과가 아니다" in comparison
    failure_rows = [
        line for line in failures.splitlines() if line.startswith("| ") and "CASE-LOCKED-" in line
    ]
    assert len(failure_rows) >= 10
    assert "FATAL_MISSING_DECISIVE_EXCEPTION" in failures


def test_official_corpus_candidate_is_reported_as_unapproved_hold() -> None:
    artifact = json.loads(
        (ROOT / "artifacts/legal/candidate-review.json").read_text(encoding="utf-8")
    )
    report = (ROOT / "evals/reports/official-corpus-readiness.md").read_text(
        encoding="utf-8"
    )
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    html = (ROOT / "report/planning-report.html").read_text(encoding="utf-8")

    assert artifact["candidate_status"] == "pending_human_approval"
    assert artifact["approval"]["reviewer_count"] == 0
    assert artifact["release_status"] == "hold"
    for value in (
        artifact["provision_count"],
        artifact["supplementary_count"],
        artifact["quality"]["warning_count"],
    ):
        assert str(value) in report
        assert f"{value:,}" in readme
        assert f"{value:,}" in html
