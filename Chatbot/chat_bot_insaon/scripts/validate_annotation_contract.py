#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--schema", type=Path, required=True)
    args = parser.parse_args()
    try:
        schema = json.loads(args.schema.read_text(encoding="utf-8"))
        required = set(schema["required"])
        expected = {
            "schema_version",
            "case_id",
            "group_id",
            "split",
            "source_manifest_hash",
            "index_version",
            "referenced_provision_ids",
            "author_judgment",
            "review_judgment",
            "disagreement_fields",
            "adjudication",
        }
        if schema.get("additionalProperties") is not False or required != expected:
            raise ValueError("legal annotation top-level contract mismatch")
        definitions = schema.get("$defs", {})
        if set(definitions) != {"judgment", "expected"}:
            raise ValueError("legal annotation judgment definitions are incomplete")
        expected_required = set(definitions["expected"]["required"])
        if {
            "action",
            "answer_status",
            "required_condition_fields",
            "required_evidence_ids",
            "required_exception_ids",
            "forbidden_evidence_ids",
        } != expected_required:
            raise ValueError("legal expected judgment contract mismatch")
    except (FileNotFoundError, KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
        print(f"ANNOTATION CONTRACT INVALID: {exc}", file=sys.stderr)
        return 1
    print("Legal annotation contract valid: role-separated raw review and adjudication.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
