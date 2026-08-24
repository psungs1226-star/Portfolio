#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from insaon.adapters.source import LegalIndexBuildError, validate_legal_index_manifest


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, required=True)
    args = parser.parse_args()
    root = args.manifest.resolve().parent
    try:
        manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
        documents = [
            json.loads(line)
            for line in (root / "documents.jsonl").read_text(encoding="utf-8").splitlines()
            if line.strip()
        ]
        embedding_payload = json.loads(
            (root / "embeddings.json").read_text(encoding="utf-8")
        )
        validate_legal_index_manifest(
            manifest,
            documents,
            embedding_payload["vectors"],
        )
    except (
        FileNotFoundError,
        KeyError,
        TypeError,
        ValueError,
        json.JSONDecodeError,
        LegalIndexBuildError,
    ) as exc:
        print(f"LEGAL INDEX INVALID: {exc}", file=sys.stderr)
        return 1
    print(
        f"Legal index manifest valid: {manifest['version_id']}, "
        f"{manifest['provision_count']} provisions."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
