#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import date
from pathlib import Path

SHA256 = re.compile(r"^[a-f0-9]{64}$")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--snapshot", type=Path, required=True)
    args = parser.parse_args()
    payload = json.loads(args.snapshot.read_text(encoding="utf-8"))
    provisions = payload.get("provisions")
    if payload.get("schema_version") != "0.1.0" or not isinstance(provisions, list):
        raise ValueError("invalid legal tree contract")
    if not provisions or payload.get("provision_count") != len(provisions):
        raise ValueError("legal tree provision count mismatch")
    ids = [str(item.get("provision_id")) for item in provisions]
    if len(ids) != len(set(ids)):
        raise ValueError("duplicate provision ID")
    known = set(ids)
    source_hashes = {
        str(source["source_id"]): str(source["content_hash"])
        for source in payload.get("sources", [])
    }
    supplements = 0
    for item in provisions:
        parent = item.get("parent_provision_id")
        if parent is not None and parent not in known:
            raise ValueError(f"orphan provision: {item.get('provision_id')}")
        start = date.fromisoformat(str(item["effective_from"]))
        end_value = item.get("effective_to")
        if end_value is not None and date.fromisoformat(str(end_value)) <= start:
            raise ValueError("reversed provision validity")
        source_hash = str(item.get("source_hash"))
        if not SHA256.fullmatch(source_hash):
            raise ValueError("invalid provision source hash")
        if source_hashes.get(str(item.get("source_id"))) != source_hash:
            raise ValueError("provision does not trace to selected source snapshot")
        if "supplementary" in item.get("topic_tags", []):
            supplements += 1
    if supplements != payload.get("supplementary_count"):
        raise ValueError("supplementary provision count mismatch")
    quality = payload.get("quality", {})
    if quality.get("fatal_count") != 0:
        raise ValueError("fatal parser issue prevents approval")
    if quality.get("warning_count") != 0:
        raise ValueError("unresolved parser warning prevents approval")
    issue_counts = quality.get("issue_counts", {})
    if quality.get("informational_count") != issue_counts.get(
        "DELETED_ARTICLE_TOMBSTONE", 0
    ):
        raise ValueError("informational parser issue count mismatch")
    if payload.get("approval", {}).get("status") != "pending":
        raise ValueError("dry-run candidate must remain pending human approval")
    print(
        f"Legal tree candidate valid: {len(provisions)} provisions, "
        f"{supplements} supplementary nodes, approval pending."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
