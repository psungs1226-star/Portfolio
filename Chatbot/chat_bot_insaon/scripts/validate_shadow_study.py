#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from insaon.evaluation import (
    ShadowStudyContractError,
    validate_shadow_study_manifest,
)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--require-completed-sessions", action="store_true")
    args = parser.parse_args()
    try:
        summary = validate_shadow_study_manifest(
            json.loads(args.manifest.read_text(encoding="utf-8")),
            require_completed_sessions=args.require_completed_sessions,
        )
    except (
        FileNotFoundError,
        json.JSONDecodeError,
        ShadowStudyContractError,
    ) as exc:
        print(f"SHADOW STUDY HOLD: {exc}", file=sys.stderr)
        return 1
    print(
        f"Shadow-study manifest valid: {summary['completed_sessions']} completed, "
        f"{summary['stopped_sessions']} stopped."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
