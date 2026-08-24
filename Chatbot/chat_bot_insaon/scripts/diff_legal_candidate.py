#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from insaon.adapters.source import diff_legal_candidates

ROOT = Path(__file__).resolve().parent.parent


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--current", type=Path, required=True)
    parser.add_argument("--previous", type=Path)
    parser.add_argument("--private-output", type=Path, required=True)
    parser.add_argument(
        "--artifact",
        type=Path,
        default=Path("artifacts/legal/candidate-diff-summary.json"),
    )
    args = parser.parse_args()
    current = json.loads(args.current.read_text(encoding="utf-8"))
    previous = (
        json.loads(args.previous.read_text(encoding="utf-8"))
        if args.previous is not None
        else None
    )
    result = diff_legal_candidates(previous, current)
    private_output = args.private_output.resolve()
    if ROOT == private_output or ROOT in private_output.parents:
        raise ValueError("full legal diff must stay outside public submission")
    private_output.parent.mkdir(parents=True, exist_ok=True)
    private_output.write_text(
        json.dumps(result, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    artifact = {
        key: result[key]
        for key in (
            "schema_version",
            "baseline_status",
            "previous_source_manifest_hash",
            "current_source_manifest_hash",
            "summary",
        )
    }
    artifact["human_review_required"] = True
    artifact_path = args.artifact if args.artifact.is_absolute() else ROOT / args.artifact
    artifact_path.parent.mkdir(parents=True, exist_ok=True)
    artifact_path.write_text(
        json.dumps(artifact, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(
        f"Legal candidate diff: baseline={result['baseline_status']}, "
        f"added={result['summary']['added']}, "
        f"removed={result['summary']['removed']}, "
        f"changed={result['summary']['changed']}."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
