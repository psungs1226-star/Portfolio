#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument(
        "--artifact",
        type=Path,
        default=Path("artifacts/research/shadow-study-readiness.json"),
    )
    args = parser.parse_args()
    output = args.output.resolve()
    if ROOT == output or ROOT in output.parents:
        raise ValueError("shadow-study participant workspace must stay private")
    manifest = {
        "schema_version": "0.1.0",
        "status": "planned",
        "protocol_version": "shadow-synthetic-v0.1.0",
        "input_policy": "public_law_and_synthetic_tasks_only",
        "actual_employee_data_allowed": False,
        "tasks": [
            {"task_id": "CASE-A", "kind": "missing_condition"},
            {"task_id": "CASE-B", "kind": "evidence_review"},
            {"task_id": "CASE-C", "kind": "out_of_scope"},
        ],
        "participants": [],
        "sessions": [],
        "completed_sessions": 0,
        "stopped_sessions": 0,
        "private_fields": [
            "facilitator_notes",
            "short_approved_quote",
        ],
        "public_aggregation_only": True,
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    artifact = {
        "schema_version": "0.1.0",
        "profile": "shadow-study-readiness",
        "status": "protocol_ready_sessions_missing",
        "protocol_version": manifest["protocol_version"],
        "task_count": 3,
        "completed_sessions": 0,
        "participant_count": 0,
        "actual_employee_data_allowed": False,
        "release_status": "hold",
    }
    artifact_path = args.artifact if args.artifact.is_absolute() else ROOT / args.artifact
    artifact_path.parent.mkdir(parents=True, exist_ok=True)
    artifact_path.write_text(
        json.dumps(artifact, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print("Shadow-study protocol prepared: CASE-A/B/C, 0 completed sessions.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
