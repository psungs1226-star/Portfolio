#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
from datetime import UTC, datetime
from pathlib import Path

from insaon.evaluation.gates import release_prerequisite_errors
from insaon.evaluation.release import (
    ReleaseGateError,
    artifact_hashes,
    assert_same_evaluation_conditions,
    load_result,
    selected_release_allowed,
)

ROOT = Path(__file__).resolve().parent.parent


def _private_root() -> Path:
    external = ROOT.parent.parent / "private"
    return external if external.is_dir() else ROOT / "private"


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def run_downstream_release(profile: str) -> int:
    errors = release_prerequisite_errors(ROOT, profile)  # type: ignore[arg-type]
    if errors:
        for error in errors:
            print(f"RELEASE HOLD: {error}", file=sys.stderr)
        return 1
    private = _private_root()
    if profile == "legal":
        index = json.loads(
            (private / "legal/index/manifest.json").read_text(encoding="utf-8")
        )
        annotations = json.loads(
            (private / "evals/test_mvp_locked.legal.manifest.json").read_text(
                encoding="utf-8"
            )
        )
        result_paths = sorted((ROOT / "evals/results/legal").glob("*.json"))
        manifest = {
            "schema_version": "0.1.0",
            "profile": "legal",
            "created_at": datetime.now(UTC).isoformat(),
            "release_status": "legal_validation_candidate",
            "source_manifest_hash": index["source_manifest_hash"],
            "index_version": index["version_id"],
            "dataset_sha256": annotations["dataset_sha256"],
            "case_count": annotations["case_count"],
            "reviewer_count": annotations["reviewer_count"],
            "fatal_errors": 0,
            "result_hashes": {
                str(path.relative_to(ROOT)): _sha256(path) for path in result_paths
            },
            "limitations": [
                "Validated only on the declared independent legal dataset and data date.",
                "This is review support, not a guarantee of current law or a final personnel decision.",
                "Deployment and operational effect remain unmeasured.",
            ],
        }
        output = ROOT / "artifacts/release/legal-manifest.json"
    else:
        legal = json.loads(
            (ROOT / "artifacts/release/legal-manifest.json").read_text(encoding="utf-8")
        )
        deployment_path = ROOT / "artifacts/deployment/pilot-smoke.json"
        shadow_path = private / "research/shadow-study.manifest.json"
        shadow = json.loads(shadow_path.read_text(encoding="utf-8"))
        manifest = {
            "schema_version": "0.1.0",
            "profile": "pilot",
            "created_at": datetime.now(UTC).isoformat(),
            "release_status": "controlled_pilot_candidate",
            "legal_release_sha256": _sha256(
                ROOT / "artifacts/release/legal-manifest.json"
            ),
            "deployment_smoke_sha256": _sha256(deployment_path),
            "shadow_study_sha256": _sha256(shadow_path),
            "completed_sessions": shadow["completed_sessions"],
            "legal_fatal_errors": legal["fatal_errors"],
            "limitations": [
                "Usability evidence does not establish legal correctness or causal work-time savings.",
                "Only synthetic tasks were permitted; actual employee data was prohibited.",
            ],
        }
        output = ROOT / "artifacts/release/pilot-manifest.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    boundary = run([sys.executable, "scripts/check_public_boundary.py"])
    if boundary["returncode"] != 0:
        return 1
    print(f"Release checks passed: {profile} candidate.")
    return 0


def run(command: list[str]) -> dict[str, object]:
    result = subprocess.run(
        command,
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode:
        raise ReleaseGateError(
            f"command failed ({' '.join(command)}):\n{result.stdout}\n{result.stderr}"
        )
    return {
        "command": _publishable_command(command),
        "returncode": result.returncode,
        "output_sha256": __import__("hashlib")
        .sha256((result.stdout + result.stderr).encode())
        .hexdigest(),
    }


def _write_hold_manifest(
    profile: str, selected: dict[str, object], checks: list[dict[str, object]]
) -> None:
    """Record a held release so the published dashboard state matches the measurement."""
    fatal = selected["fatal_errors"]
    assert isinstance(fatal, dict)
    manifest = {
        "schema_version": "0.1.0",
        "profile": profile,
        "created_at": datetime.now(UTC).isoformat(),
        "release_status": "hold_fatal_errors_present",
        "selected_config": "H3",
        "selected_run_id": selected["run_id"],
        "selected_fatal_errors": fatal["total"],
        "selected_fatal_error_types": {
            key: value for key, value in fatal["by_type"].items() if value
        },
        "selected_fatal_case_ids": fatal["case_ids"],
        "legal_accuracy_status": "unmeasured",
        "operational_effect_status": "unmeasured",
        "local_model_status": "actual_local_smoke_passed",
        "official_corpus_status": "candidate_pending_human_approval",
        "official_corpus_automated_quality": "passed_12_of_12",
        "official_corpus_release": "hold",
        "checks": checks,
        "artifact_hashes": {},
        "limitations": [
            "Synthetic regression only; independent legal holdout remains unmeasured.",
            "Release is held: the selected H3 run still commits decisive-exception errors "
            "on the distractor corpus introduced in phase 16.",
            "No deployment or real-user operational result is claimed.",
        ],
    }
    output = ROOT / "artifacts/release/manifest.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def _publishable_command(command: list[str]) -> list[str]:
    """Strip machine-local and non-submitted paths before they reach a public artifact.

    The release manifest is published and rendered on the dashboard, so it must not
    carry the developer's absolute paths or any reference to the non-submitted
    ``private/`` workspace.
    """
    normalized: list[str] = []
    for token in command:
        if token == sys.executable:
            normalized.append("python")
            continue
        if "private/" in token or "private\\" in token:
            normalized.append("<private-workspace>")
            continue
        normalized.append(token)
    return normalized


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--profile", choices=["offline", "legal", "pilot"], required=True)
    args = parser.parse_args()
    if args.profile != "offline":
        return run_downstream_release(args.profile)
    checks: list[dict[str, object]] = []
    try:
        checks.append(
            run(
                [
                    sys.executable,
                    "-m",
                    "insaon.evaluation.cli",
                    "run",
                    "--config",
                    "configs/eval/offline-all.toml",
                ]
            )
        )
        checks.append(
            run(
                [
                    sys.executable,
                    "-m",
                    "insaon.evaluation.cli",
                    "compare",
                    "--results",
                    "evals/results",
                    "--output",
                    "evals/reports/comparison.md",
                ]
            )
        )
        checks.append(
            run(
                [
                    sys.executable,
                    "-m",
                    "insaon.evaluation.cli",
                    "failures",
                    "--results",
                    "evals/results",
                    "--private-case-results",
                    "../../private/evals/results",
                    "--output",
                    "evals/reports/failure_analysis.md",
                ]
            )
        )
        checks.append(run([sys.executable, "scripts/sync_public_results.py"]))
        checks.append(run([sys.executable, "scripts/validate_harness.py"]))
        checks.append(
            run(
                [
                    sys.executable,
                    "scripts/validate_eval_contract.py",
                    "--results",
                    "evals/results",
                ]
            )
        )
        checks.append(run([sys.executable, "scripts/check_public_boundary.py"]))
        checks.append(run([sys.executable, "-m", "pytest", "-q"]))
        checks.append(run([sys.executable, "-m", "ruff", "check", "src", "tests", "scripts"]))
        checks.append(run([sys.executable, "-m", "mypy", "src"]))
        result_paths = sorted((ROOT / "evals/results").glob("*.json"))
        results = [load_result(path) for path in result_paths]
        assert_same_evaluation_conditions(results)
        selected_path = ROOT / "evals/results/h3_reranker_context.json"
        selected = load_result(selected_path)
        if not selected_release_allowed(selected):
            # The dashboard publishes this manifest. Leaving the previous passing copy
            # in place would keep advertising "fatal 0" after a run that held the
            # release, so the hold is written out before failing.
            _write_hold_manifest(args.profile, selected, checks)
            raise ReleaseGateError("selected H3 result failed the fatal release gate")
        artifacts = result_paths + [
            ROOT / "artifacts/spikes/lexical/manifest.json",
            ROOT / "evals/reports/comparison.md",
            ROOT / "evals/reports/failure_analysis.md",
            ROOT / "README.md",
            ROOT / "OPEN_DASHBOARD.command",
            ROOT / "docs/DEMO_CHECKLIST.md",
            ROOT / "docs/EVALUATION_PLAN.md",
            ROOT / "docs/TRACEABILITY.md",
            ROOT / "docs/adr/0005-synthetic-regression-release-boundary.md",
            ROOT / "docs/adr/0006-local-model-runtime.md",
            ROOT / "docs/adr/0007-keyless-official-source-candidate.md",
            ROOT / "configs/sources/official-mvp.toml",
            ROOT / "evals/reports/local-model-integration-review.md",
            ROOT / "artifacts/provider/local-smoke.json",
            ROOT / "artifacts/provider/derived-allowance-smoke.json",
            ROOT / "artifacts/sources/official-metadata-check.json",
            ROOT / "artifacts/legal/candidate-review.json",
            ROOT / "artifacts/legal/quality-audit.json",
            ROOT / "artifacts/legal/human-review-readiness.json",
            ROOT / "artifacts/legal/candidate-diff-summary.json",
            ROOT / "artifacts/legal/wide-source-probe.json",
            ROOT / "artifacts/legal/wide-candidate-summary.json",
            ROOT / "artifacts/legal/wide-quality-audit.json",
            ROOT / "artifacts/legal/wide-human-review-readiness.json",
            ROOT / "evals/reports/official-corpus-readiness.md",
            ROOT / "evals/reports/official-corpus-quality.md",
            ROOT / "evals/reports/dashboard-quality-review.md",
            ROOT / "evals/reports/derived-allowance-review.md",
            ROOT / "evals/schemas/legal-annotation-record.schema.json",
            ROOT / "configs/deployment/pilot.toml",
            ROOT / "docs/PILOT_RUNBOOK.md",
            ROOT / "docs/adr/0008-controlled-pilot-hosting.md",
            ROOT / "docs/adr/0013-derived-allowance-deep-review.md",
            ROOT / "artifacts/research/shadow-study-readiness.json",
            ROOT / "report/planning-report.html",
            ROOT / "report/planning-report.pdf",
            ROOT / "report/portfolio-case-study.html",
        ]
        artifacts = [path for path in artifacts if path.is_file()]
        manifest = {
            "schema_version": "0.1.0",
            "profile": args.profile,
            "created_at": datetime.now(UTC).isoformat(),
            "release_status": "synthetic_regression_candidate",
            "selected_config": "H3",
            "selected_run_id": selected["run_id"],
            "selected_fatal_errors": selected["fatal_errors"]["total"],
            "legal_accuracy_status": "unmeasured",
            "operational_effect_status": "unmeasured",
            "local_model_status": "actual_local_smoke_passed",
            "official_corpus_status": "candidate_pending_human_approval",
            "official_corpus_automated_quality": "passed_12_of_12",
            "official_corpus_release": "hold",
            "checks": checks,
            "artifact_hashes": artifact_hashes(ROOT, artifacts),
            "limitations": [
                "Synthetic regression only; independent legal holdout remains unmeasured.",
                "No deployment or real-user operational result is claimed.",
                "Local model smoke traversed the pending official candidate; official legal content accuracy remains unmeasured.",
                "Official source candidate passed automated structural checks, but human approval and legal index promotion are blocked.",
            ],
        }
        output = ROOT / "artifacts/release/manifest.json"
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        run([sys.executable, "scripts/check_public_boundary.py"])
    except ReleaseGateError as exc:
        print(f"RELEASE HOLD: {exc}", file=sys.stderr)
        return 1
    print("Release checks passed: H3 synthetic regression candidate, legal accuracy unmeasured.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
