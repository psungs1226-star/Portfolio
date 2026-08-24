from __future__ import annotations

import json
import platform
import sqlite3
import time
from collections.abc import Callable
from datetime import date
from pathlib import Path
from typing import Any

from insaon.adapters.retrieval import CharNgramLexicalRetriever, SQLiteFts5Retriever
from insaon.domain import DateRange, Provision


def load_spike_dataset(path: Path) -> tuple[list[Provision], list[dict[str, Any]], str]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    provisions = [
        Provision(
            provision_id=item["provision_id"],
            source_id="SYNTHETIC-SPIKE",
            article_path=item["provision_id"],
            title="합성 검색 fixture",
            text=item["text"],
            valid_time=DateRange(date(2024, 1, 1)),
            applies_to=frozenset({"local_general_service"}),
            topic_tags=frozenset({"synthetic"}),
            source_hash="0" * 64,
        )
        for item in payload["documents"]
    ]
    return provisions, payload["queries"], payload["dataset_id"]


def evaluate_retriever(retriever: Any, queries: list[dict[str, Any]], top_k: int) -> dict[str, Any]:
    recalls: list[float] = []
    reciprocal_ranks: list[float] = []
    slices: dict[str, list[float]] = {}
    rankings: dict[str, list[str]] = {}
    for query in queries:
        candidates = retriever.retrieve(query["query"], top_k)
        ids = [candidate.provision_id for candidate in candidates]
        gold = set(query["gold"])
        recall = len(gold & set(ids)) / len(gold)
        first = next((index for index, value in enumerate(ids, start=1) if value in gold), None)
        reciprocal = 1 / first if first else 0.0
        recalls.append(recall)
        reciprocal_ranks.append(reciprocal)
        slices.setdefault(query["slice"], []).append(recall)
        rankings[query["query_id"]] = ids
    return {
        "set_recall_at_5": sum(recalls) / len(recalls),
        "mrr_at_10": sum(reciprocal_ranks) / len(reciprocal_ranks),
        "slice_recall": {key: sum(values) / len(values) for key, values in sorted(slices.items())},
        "rankings": rankings,
    }


def run_lexical_spike(dataset: Path, output: Path, top_k: int, ngram_size: int) -> dict[str, Any]:
    provisions, queries, dataset_id = load_spike_dataset(dataset)
    candidates: list[tuple[str, Callable[[], Any]]] = [
        ("sqlite_fts5", lambda: SQLiteFts5Retriever(provisions)),
        ("char_ngram", lambda: CharNgramLexicalRetriever(provisions, ngram_size)),
    ]
    results: dict[str, Any] = {}
    for name, factory in candidates:
        started = time.perf_counter()
        retriever = factory()
        index_time_ms = (time.perf_counter() - started) * 1000
        result = evaluate_retriever(retriever, queries, top_k)
        result["index_time_ms"] = round(index_time_ms, 3)
        results[name] = result
    selected = sorted(
        results,
        key=lambda name: (
            -results[name]["set_recall_at_5"],
            -results[name]["mrr_at_10"],
            name,
        ),
    )[0]
    manifest = {
        "schema_version": "0.1.0",
        "purpose": "development lexical implementation spike; not holdout performance",
        "dataset_id": dataset_id,
        "top_k": top_k,
        "candidates": results,
        "selected": selected,
        "selection_rule": "Set Recall@5, then MRR@10, then stable implementation id",
        "environment": {
            "python": platform.python_version(),
            "sqlite": sqlite3.sqlite_version,
            "platform": platform.platform(),
        },
        "limitations": [
            "Synthetic development corpus; no legal correctness claim.",
            "Index timing is local-machine diagnostic only.",
        ],
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return manifest
