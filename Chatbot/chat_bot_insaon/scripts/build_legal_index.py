#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from insaon.adapters.source import LegalIndexBuildError, build_versioned_legal_index

ROOT = Path(__file__).resolve().parent.parent


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--candidate", type=Path, required=True)
    parser.add_argument("--audit", type=Path, required=True)
    parser.add_argument("--approval", type=Path, required=True)
    parser.add_argument("--embeddings", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    output_dir = args.output_dir.resolve()
    if ROOT == output_dir or ROOT in output_dir.parents:
        raise ValueError("approved legal index must stay outside public submission")
    try:
        embedding_payload = json.loads(args.embeddings.read_text(encoding="utf-8"))
        manifest, documents = build_versioned_legal_index(
            json.loads(args.candidate.read_text(encoding="utf-8")),
            json.loads(args.audit.read_text(encoding="utf-8")),
            json.loads(args.approval.read_text(encoding="utf-8")),
            embedding_payload["vectors"],
            embedding_dimensions=int(embedding_payload["dimensions"]),
        )
    except (
        FileNotFoundError,
        KeyError,
        TypeError,
        ValueError,
        json.JSONDecodeError,
        LegalIndexBuildError,
    ) as exc:
        print(f"LEGAL INDEX HOLD: {exc}", file=sys.stderr)
        return 1
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    (output_dir / "documents.jsonl").write_text(
        "\n".join(
            json.dumps(item, ensure_ascii=False, sort_keys=True)
            for item in documents
        )
        + "\n",
        encoding="utf-8",
    )
    (output_dir / "embeddings.json").write_text(
        json.dumps(embedding_payload, ensure_ascii=False, separators=(",", ":"))
        + "\n",
        encoding="utf-8",
    )
    print(
        f"Approved legal index built: {manifest['version_id']}, "
        f"{manifest['provision_count']} provisions."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
