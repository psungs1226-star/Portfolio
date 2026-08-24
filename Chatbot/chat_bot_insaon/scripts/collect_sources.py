#!/usr/bin/env python3
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from insaon.adapters.source import OfficialSourceCollector, OfficialSourceRegistry

ROOT = Path(__file__).resolve().parent.parent


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", type=Path, required=True)
    parser.add_argument("--output-private", type=Path, required=True)
    args = parser.parse_args()
    config = args.config if args.config.is_absolute() else ROOT / args.config
    output = (
        args.output_private
        if args.output_private.is_absolute()
        else (ROOT / args.output_private).resolve()
    )
    if ROOT == output or ROOT in output.parents:
        raise ValueError("raw official snapshots must stay outside the public submission")
    registry = OfficialSourceRegistry.from_toml(config)
    collector = OfficialSourceCollector(registry)
    for source in registry.sources:
        snapshot = collector.collect(source.source_id, output)
        print(
            f"{snapshot.source_id}: {snapshot.byte_count} bytes "
            f"sha256={snapshot.content_hash}"
        )
    print(f"Immutable collection complete: {output / 'manifest.json'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
