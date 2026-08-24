#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

SHA256 = re.compile(r"^[a-f0-9]{64}$")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    args = parser.parse_args()
    path = args.input.resolve()
    root = path.parent
    payload = json.loads(path.read_text(encoding="utf-8"))
    snapshots = payload.get("snapshots", [])
    if payload.get("schema_version") != "0.1.0" or not isinstance(snapshots, list):
        raise ValueError("invalid snapshot manifest contract")
    identities: set[tuple[str, str]] = set()
    for item in snapshots:
        if not isinstance(item, dict):
            raise ValueError("snapshot entry must be an object")
        if {"content", "body", "credential", "api_key"} & set(item):
            raise ValueError("manifest contains forbidden raw or credential field")
        digest = item.get("content_hash")
        if not isinstance(digest, str) or not SHA256.fullmatch(digest):
            raise ValueError("invalid snapshot hash")
        candidate = (root / str(item.get("relative_path"))).resolve()
        if root != candidate and root not in candidate.parents:
            raise ValueError("snapshot path escapes manifest directory")
        body = candidate.read_bytes()
        if len(body) != item.get("byte_count"):
            raise ValueError("snapshot byte count mismatch")
        if hashlib.sha256(body).hexdigest() != digest:
            raise ValueError("snapshot content hash mismatch")
        identity = (str(item.get("source_id")), digest)
        if identity in identities:
            raise ValueError("duplicate snapshot identity")
        identities.add(identity)
    print(f"Snapshot manifest valid: {len(snapshots)} immutable official snapshots.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
