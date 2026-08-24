#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from insaon.adapters.source import ApprovalValidationError, validate_candidate_approval


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--candidate", type=Path, required=True)
    parser.add_argument("--audit", type=Path, required=True)
    parser.add_argument("--approval", type=Path, required=True)
    args = parser.parse_args()
    try:
        approval = validate_candidate_approval(
            json.loads(args.candidate.read_text(encoding="utf-8")),
            json.loads(args.audit.read_text(encoding="utf-8")),
            json.loads(args.approval.read_text(encoding="utf-8")),
        )
    except (ApprovalValidationError, FileNotFoundError, json.JSONDecodeError) as exc:
        print(f"LEGAL APPROVAL HOLD: {exc}", file=sys.stderr)
        return 1
    print(
        "Legal candidate approval valid: "
        f"reviewer={approval['reviewer_id']}, approved_at={approval['approved_at']}."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
