"""Measure the practitioner/statutory vocabulary gap that H4 exists to close.

The locked regression set cannot measure query transformation. Its questions are machine
generated and already written in statutory vocabulary, so the gap H4 addresses does not
appear in them at all, and H3 is already at ceiling recall there.

This probe asks for the same gold provisions in the words a 담당자 would actually use,
with a statutory-phrasing control group carried alongside. The control group is the point:
without it, a low practitioner score could mean the retriever is bad rather than that the
vocabulary differs.
"""

from __future__ import annotations

import hashlib
import json
import platform
from collections import defaultdict
from datetime import date
from pathlib import Path
from typing import Any

from insaon.application.factory import build_offline_retrieval_pipeline
from insaon.application.query_transform import load_synonym_transformer


def load_probe(path: Path) -> dict[str, Any]:
    payload: dict[str, Any] = json.loads(path.read_text(encoding="utf-8"))
    if not payload.get("queries"):
        raise ValueError("probe carries no queries")
    return payload


def evaluate_configuration(
    config_id: str,
    probe: dict[str, Any],
    top_k: int,
) -> dict[str, Any]:
    retrieval, _ = build_offline_retrieval_pipeline()
    reference_date = date.fromisoformat(probe["reference_date"])
    subject = probe["subject"]

    hits = 0
    reciprocal_sum = 0.0
    by_style: dict[str, list[float]] = defaultdict(list)
    misses: list[str] = []
    for query in probe["queries"]:
        result = retrieval.retrieve(
            query["query"],
            config_id=config_id,
            top_k=top_k,
            reference_date=reference_date,
            subject=subject,
        )
        ranked = [candidate.provision_id for candidate in result.candidates]
        gold = set(query["gold"])
        found = bool(gold & set(ranked))
        rank = next(
            (index for index, value in enumerate(ranked, start=1) if value in gold), None
        )
        hits += int(found)
        reciprocal_sum += 1 / rank if rank else 0.0
        by_style[query["surface_style"]].append(float(found))
        if not found:
            misses.append(query["query_id"])

    total = len(probe["queries"])
    return {
        "hit_rate_at_k": {
            "numerator": hits,
            "denominator": total,
            "value": round(hits / total, 4) if total else 0.0,
        },
        "mrr_at_k": {
            "numerator": round(reciprocal_sum, 4),
            "denominator": total,
            "value": round(reciprocal_sum / total, 4) if total else 0.0,
        },
        "hit_rate_by_surface_style": {
            style: {
                "numerator": int(sum(values)),
                "denominator": len(values),
                "value": round(sum(values) / len(values), 4),
            }
            for style, values in sorted(by_style.items())
        },
        "missed_query_ids": misses,
    }


def run_query_transform_probe(
    probe_path: Path, output: Path, top_k: int = 5
) -> dict[str, Any]:
    probe = load_probe(probe_path)
    results = {
        config_id: evaluate_configuration(config_id, probe, top_k)
        for config_id in ("H3", "H4")
    }
    transformer = load_synonym_transformer()
    fired = sum(1 for query in probe["queries"] if transformer.expand(query["query"]))

    manifest = {
        "schema_version": "0.1.0",
        "purpose": (
            "vocabulary gap probe for query transformation; not holdout performance and "
            "not a substitute for the locked regression set"
        ),
        "dataset_id": probe["dataset_id"],
        "top_k": top_k,
        "query_count": len(probe["queries"]),
        "inputs": {
            "probe_path": probe_path.name,
            "probe_sha256": hashlib.sha256(probe_path.read_bytes()).hexdigest(),
            "reference_date": probe["reference_date"],
            "subject": probe["subject"],
            "query_transform": transformer.implementation_id,
            "transformer_fired_on": {
                "numerator": fired,
                "denominator": len(probe["queries"]),
            },
        },
        "candidates": results,
        "comparison_rule": (
            "H4 differs from H3 only by synonym query expansion; every other stage is "
            "identical, so any difference is attributable to that stage alone"
        ),
        "environment": {
            "python": platform.python_version(),
            "platform": platform.platform(),
        },
        "limitations": [
            "Synthetic development corpus and hand-written probe queries; no legal "
            "correctness claim and no real practitioner phrasing sample.",
            "Fifteen queries is too few for a confidence interval to be informative.",
            "The dictionary was written before the probe was measured, but both were "
            "written by the same author, so this is a design probe rather than a "
            "blind evaluation.",
        ],
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return manifest
