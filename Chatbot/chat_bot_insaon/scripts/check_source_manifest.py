#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from dataclasses import asdict
from pathlib import Path

from insaon.adapters.source import OfficialSourceCollector, OfficialSourceRegistry

ROOT = Path(__file__).resolve().parent.parent


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--probe", action="store_true")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    manifest_path = args.manifest if args.manifest.is_absolute() else ROOT / args.manifest
    registry = OfficialSourceRegistry.from_toml(manifest_path)
    print(
        f"Official source contract valid: {len(registry.sources)} exact, keyless HTTPS sources."
    )
    if not args.probe:
        return 0
    snapshots = [
        asdict(OfficialSourceCollector(registry).probe(source.source_id))
        for source in registry.sources
    ]
    for snapshot in snapshots:
        snapshot.pop("relative_path", None)
    payload = {
        "schema_version": "0.1.0",
        "check_type": "official_metadata_probe",
        "source_count": len(snapshots),
        "sources": snapshots,
        "limitations": [
            "Public metadata/body pages only; semantic provision parsing and approval are separate gates.",
            "No API key was used or required.",
        ],
    }
    if args.output is None:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        return 0
    output = args.output if args.output.is_absolute() else ROOT / args.output
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Official metadata probe written: {output}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
