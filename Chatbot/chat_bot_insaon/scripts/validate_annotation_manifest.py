#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from insaon.evaluation import (
    AnnotationContractError,
    build_annotation_manifest,
    validate_annotation_records,
)


def _relative(root: Path, value: str) -> Path:
    path = Path(value)
    return path if path.is_absolute() else root / path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--require-reviewed", action="store_true")
    parser.add_argument("--require-adjudicated", action="store_true")
    args = parser.parse_args()
    manifest_path = args.manifest.resolve()
    root = manifest_path.parent
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        records_path = _relative(root, str(manifest["records_path"]))
        index_manifest_path = _relative(root, str(manifest["index_manifest_path"]))
        index_manifest = json.loads(index_manifest_path.read_text(encoding="utf-8"))
        documents_path = index_manifest_path.parent / "documents.jsonl"
        known_provision_ids = {
            str(json.loads(line)["provision_id"])
            for line in documents_path.read_text(encoding="utf-8").splitlines()
            if line.strip()
        }
        records = [
            json.loads(line)
            for line in records_path.read_text(encoding="utf-8").splitlines()
            if line.strip()
        ]
        validate_annotation_records(
            records,
            source_manifest_hash=str(manifest["source_manifest_hash"]),
            index_version=str(manifest["index_version"]),
            known_provision_ids=known_provision_ids,
            require_reviewed=args.require_reviewed,
            require_adjudicated=args.require_adjudicated,
        )
        calculated = build_annotation_manifest(records)
        for key in (
            "dataset_sha256",
            "case_count",
            "group_count",
            "reviewer_count",
            "adjudicated_count",
            "excluded_count",
        ):
            if manifest.get(key) != calculated.get(key):
                raise AnnotationContractError(f"annotation manifest {key} mismatch")
        if manifest["source_manifest_hash"] != index_manifest["source_manifest_hash"]:
            raise AnnotationContractError("annotation source snapshot differs from index")
        if manifest["index_version"] != index_manifest["version_id"]:
            raise AnnotationContractError("annotation index version differs from manifest")
    except (
        AnnotationContractError,
        FileNotFoundError,
        KeyError,
        TypeError,
        ValueError,
        json.JSONDecodeError,
    ) as exc:
        print(f"ANNOTATION MANIFEST HOLD: {exc}", file=sys.stderr)
        return 1
    print(
        f"Annotation manifest valid: {calculated['case_count']} cases, "
        f"{calculated['reviewer_count']} reviewer(s)."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
