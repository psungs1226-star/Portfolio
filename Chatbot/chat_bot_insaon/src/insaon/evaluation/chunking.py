"""Compare chunking strategies on the public synthetic corpus.

The product path splits documents on the legal hierarchy (법령 → 조 → 항 → 호 → 목) and
never on character count; ``ProvisionParser`` says so in its own docstring. That decision
has never been compared against the alternatives everyone reaches for first, so this
module reconstructs a flat source document from the structured corpus and re-splits it
three ways.

The two alternatives here exist only to be measured. They are deliberately placed in
``insaon.evaluation`` rather than ``insaon.adapters`` so that no runtime code can import
them: a chunker the product does not use must not become a runtime dependency.

The measurement that matters is not only retrieval score. This product's contract is to
cite a specific ``article_path`` valid on the question date, so a chunk straddling a
provision boundary is a citation failure even when it ranks first.
"""

from __future__ import annotations

import hashlib
import json
import platform
import re
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any

from insaon.adapters.retrieval import CharNgramLexicalRetriever
from insaon.domain import DateRange, Provision


@dataclass(frozen=True)
class SourceSpan:
    """Where one provision's block sits inside the reconstructed source document."""

    provision_id: str
    article_path: str
    start: int
    end: int


@dataclass(frozen=True)
class Chunk:
    chunk_id: str
    text: str
    start: int
    end: int
    covered_provision_ids: tuple[str, ...]
    covered_article_paths: tuple[str, ...]

    @property
    def is_citable(self) -> bool:
        """True when the chunk maps to exactly one provision.

        A chunk covering two provisions cannot be cited as an ``article_path`` without
        the answer naming a boundary the source never drew.
        """
        return len(self.covered_provision_ids) == 1


def load_corpus(path: Path) -> list[dict[str, Any]]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    provisions = payload["provisions"]
    if not isinstance(provisions, list):
        raise ValueError("corpus must carry a provisions array")
    return provisions


def load_queries(path: Path) -> tuple[list[dict[str, Any]], str]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    return payload["queries"], payload["dataset_id"]


def build_source_document(provisions: Sequence[dict[str, Any]]) -> tuple[str, list[SourceSpan]]:
    """Flatten the structured corpus back into one document with recorded offsets.

    Every strategy is then splitting exactly the same characters, which is what makes
    the comparison fair. The offsets are what let a character-count chunk be mapped
    back to the provisions it swallowed.
    """
    parts: list[str] = []
    spans: list[SourceSpan] = []
    cursor = 0
    for item in provisions:
        block = f"{item['article_path']} {item['title']}\n{item['text']}\n\n"
        spans.append(
            SourceSpan(
                provision_id=item["provision_id"],
                article_path=item["article_path"],
                start=cursor,
                end=cursor + len(block),
            )
        )
        parts.append(block)
        cursor += len(block)
    return "".join(parts), spans


def _cover(spans: Sequence[SourceSpan], start: int, end: int) -> tuple[tuple[str, ...], tuple[str, ...]]:
    covered = [
        span
        for span in spans
        if span.start < end and start < span.end and _overlap_is_substantive(span, start, end)
    ]
    return (
        tuple(span.provision_id for span in covered),
        tuple(dict.fromkeys(span.article_path for span in covered)),
    )


def _overlap_is_substantive(span: SourceSpan, start: int, end: int) -> bool:
    """Ignore a few trailing characters of the previous block bleeding into a chunk.

    Without this, every fixed-length chunk would report a spurious extra provision from
    the blank line before it and the citation counts would be meaningless.
    """
    overlap = min(span.end, end) - max(span.start, start)
    return overlap >= min(16, span.end - span.start)


def chunk_structure(source: str, spans: Sequence[SourceSpan]) -> list[Chunk]:
    """Current product behaviour: one chunk per structural unit."""
    return [
        Chunk(
            chunk_id=f"structure::{span.provision_id}",
            text=source[span.start : span.end].strip(),
            start=span.start,
            end=span.end,
            covered_provision_ids=(span.provision_id,),
            covered_article_paths=(span.article_path,),
        )
        for span in spans
    ]


def chunk_fixed(source: str, spans: Sequence[SourceSpan], size: int = 512) -> list[Chunk]:
    """Cut every ``size`` characters with no overlap and no regard for structure."""
    chunks: list[Chunk] = []
    for index, start in enumerate(range(0, len(source), size)):
        end = min(start + size, len(source))
        provision_ids, article_paths = _cover(spans, start, end)
        chunks.append(
            Chunk(
                chunk_id=f"fixed::{index:04d}",
                text=source[start:end].strip(),
                start=start,
                end=end,
                covered_provision_ids=provision_ids,
                covered_article_paths=article_paths,
            )
        )
    return chunks


_SENTENCE = re.compile(r"(?<=[.。!?])\s+")


def chunk_recursive(
    source: str, spans: Sequence[SourceSpan], size: int = 512, overlap: int = 64
) -> list[Chunk]:
    """Split on paragraphs, then sentences, packing greedily toward ``size``.

    This is the strategy most RAG tutorials reach for. It respects blank lines and
    sentence ends but knows nothing about 조·항·호·목, so it still merges neighbouring
    provisions whenever they are short — which, in legal text, they usually are.
    """
    units: list[tuple[int, int]] = []
    cursor = 0
    for paragraph in source.split("\n\n"):
        block = paragraph + "\n\n"
        offset = cursor
        for sentence in _SENTENCE.split(paragraph):
            if not sentence:
                continue
            position = source.find(sentence, offset)
            if position < 0:
                continue
            units.append((position, position + len(sentence)))
            offset = position + len(sentence)
        cursor += len(block)

    chunks: list[Chunk] = []
    index = 0
    position = 0
    while position < len(units):
        start = units[position][0]
        end = start
        cursor_unit = position
        while cursor_unit < len(units) and units[cursor_unit][1] - start <= size:
            end = units[cursor_unit][1]
            cursor_unit += 1
        if cursor_unit == position:
            end = min(units[position][1], start + size)
            cursor_unit = position + 1
        provision_ids, article_paths = _cover(spans, start, end)
        chunks.append(
            Chunk(
                chunk_id=f"recursive::{index:04d}",
                text=source[start:end].strip(),
                start=start,
                end=end,
                covered_provision_ids=provision_ids,
                covered_article_paths=article_paths,
            )
        )
        index += 1
        if cursor_unit >= len(units):
            break
        # Step back far enough to carry ``overlap`` characters into the next chunk.
        next_position = cursor_unit
        while next_position > position + 1 and end - units[next_position - 1][0] < overlap:
            next_position -= 1
        position = next_position
    return chunks


def _as_documents(chunks: Sequence[Chunk]) -> list[Provision]:
    """Wrap chunks so every strategy is scored by the same product retriever.

    ``article_path`` and ``title`` are left empty on purpose: the retriever indexes
    ``article_path + title + text``, and the reconstructed source already carries the
    heading inside the chunk text. Filling them would hand the structural strategy a
    second copy of its own headings and make the comparison unfair.
    """
    return [
        Provision(
            provision_id=chunk.chunk_id,
            source_id="SYNTHETIC-CHUNKING-SPIKE",
            article_path="",
            title="",
            text=chunk.text,
            valid_time=DateRange(date(2024, 1, 1)),
            applies_to=frozenset({"local_general_service"}),
            topic_tags=frozenset({"synthetic"}),
            source_hash="0" * 64,
        )
        for chunk in chunks
    ]


def evaluate_strategy(
    chunks: Sequence[Chunk], queries: Sequence[dict[str, Any]], top_k: int
) -> dict[str, Any]:
    retriever = CharNgramLexicalRetriever(_as_documents(chunks))
    by_id = {chunk.chunk_id: chunk for chunk in chunks}

    recall_numerator = 0.0
    reciprocal_sum = 0.0
    slice_hits: dict[str, list[float]] = {}
    ambiguous_retrievals = 0
    retrieval_events = 0
    gold_only_via_ambiguous = 0
    gold_hit_events = 0
    retrieved_characters = 0
    corpus_characters = sum(len(chunk.text) for chunk in chunks)

    for query in queries:
        candidates = retriever.retrieve(query["query"], top_k)
        gold = set(query["gold"])
        covered: set[str] = set()
        first_hit_rank: int | None = None
        citable_hit = False
        for candidate in candidates:
            chunk = by_id[candidate.provision_id]
            retrieval_events += 1
            retrieved_characters += len(chunk.text)
            if not chunk.is_citable:
                ambiguous_retrievals += 1
            hit = set(chunk.covered_provision_ids) & gold
            covered |= hit
            if hit:
                if first_hit_rank is None:
                    first_hit_rank = candidate.rank
                if chunk.is_citable:
                    citable_hit = True
        recall = len(covered & gold) / len(gold)
        recall_numerator += recall
        reciprocal_sum += 1 / first_hit_rank if first_hit_rank else 0.0
        slice_hits.setdefault(query["slice"], []).append(recall)
        if covered & gold:
            gold_hit_events += 1
            if not citable_hit:
                gold_only_via_ambiguous += 1

    total_queries = len(queries)
    multi_provision_chunks = sum(1 for chunk in chunks if not chunk.is_citable)
    empty_chunks = sum(1 for chunk in chunks if not chunk.covered_provision_ids)
    return {
        "chunk_count": len(chunks),
        "indexed_characters": sum(len(chunk.text) for chunk in chunks),
        "mean_chunk_characters": round(
            sum(len(chunk.text) for chunk in chunks) / len(chunks), 1
        )
        if chunks
        else 0.0,
        "set_recall_at_5": {
            "numerator": round(recall_numerator, 4),
            "denominator": total_queries,
            "value": round(recall_numerator / total_queries, 4) if total_queries else 0.0,
        },
        # Recall@k is not comparable across chunk sizes without this. Coarser chunks
        # hand the reader a larger share of the corpus for the same k, so their recall
        # rises for a reason that has nothing to do with retrieval quality.
        "retrieved_corpus_share_at_k": {
            "numerator": retrieved_characters,
            "denominator": corpus_characters * total_queries,
            "value": round(retrieved_characters / (corpus_characters * total_queries), 4)
            if corpus_characters and total_queries
            else 0.0,
        },
        "mrr_at_10": {
            "numerator": round(reciprocal_sum, 4),
            "denominator": total_queries,
            "value": round(reciprocal_sum / total_queries, 4) if total_queries else 0.0,
        },
        "slice_recall": {
            key: {
                "numerator": round(sum(values), 4),
                "denominator": len(values),
                "value": round(sum(values) / len(values), 4),
            }
            for key, values in sorted(slice_hits.items())
        },
        "citation": {
            "multi_provision_chunks": {
                "numerator": multi_provision_chunks,
                "denominator": len(chunks),
                "value": round(multi_provision_chunks / len(chunks), 4) if chunks else 0.0,
            },
            "ambiguous_retrievals": {
                "numerator": ambiguous_retrievals,
                "denominator": retrieval_events,
                "value": round(ambiguous_retrievals / retrieval_events, 4)
                if retrieval_events
                else 0.0,
            },
            "gold_reachable_only_through_ambiguous_chunk": {
                "numerator": gold_only_via_ambiguous,
                "denominator": gold_hit_events,
                "value": round(gold_only_via_ambiguous / gold_hit_events, 4)
                if gold_hit_events
                else 0.0,
            },
            "chunks_covering_no_provision": empty_chunks,
        },
        "structure_preserved": {
            "article_path_recoverable": all(
                len(chunk.covered_article_paths) == 1 for chunk in chunks
            ),
            "parent_and_relation_ids_traversable": all(
                len(chunk.covered_provision_ids) == 1 for chunk in chunks
            ),
        },
    }


def run_chunking_spike(
    corpus: Path, queries_path: Path, output: Path, top_k: int = 5
) -> dict[str, Any]:
    provisions = load_corpus(corpus)
    queries, dataset_id = load_queries(queries_path)
    source, spans = build_source_document(provisions)

    strategies: list[tuple[str, Callable[[], list[Chunk]], dict[str, Any]]] = [
        ("structure-v1", lambda: chunk_structure(source, spans), {"split_on": "조·항·호·목"}),
        (
            "fixed-512",
            lambda: chunk_fixed(source, spans, 512),
            {"size": 512, "overlap": 0},
        ),
        (
            "recursive-512-64",
            lambda: chunk_recursive(source, spans, 512, 64),
            {"size": 512, "overlap": 64, "split_on": "문단 → 문장"},
        ),
    ]
    results: dict[str, Any] = {}
    for name, factory, configuration in strategies:
        chunks = factory()
        result = evaluate_strategy(chunks, queries, top_k)
        result["configuration"] = configuration
        results[name] = result

    manifest = {
        "schema_version": "0.1.0",
        "purpose": "development chunking strategy spike; not holdout performance",
        "dataset_id": dataset_id,
        "corpus_id": json.loads(corpus.read_text(encoding="utf-8"))["dataset_id"],
        "top_k": top_k,
        "query_count": len(queries),
        "inputs": {
            "corpus_path": corpus.name,
            "corpus_sha256": hashlib.sha256(corpus.read_bytes()).hexdigest(),
            "queries_path": queries_path.name,
            "queries_sha256": hashlib.sha256(queries_path.read_bytes()).hexdigest(),
            "source_document_characters": len(source),
            "retriever": CharNgramLexicalRetriever.implementation_id,
        },
        "candidates": results,
        "selection_rule": (
            "citation feasibility first, then Set Recall@5, then MRR@10; a chunk that "
            "cannot be cited as one article_path cannot satisfy the product contract"
        ),
        "environment": {
            "python": platform.python_version(),
            "platform": platform.platform(),
        },
        "limitations": [
            "Synthetic development corpus; no legal correctness claim.",
            "Lexical retriever only; no temporal filter, fusion or reranking.",
            "The source document is reconstructed from already-structured provisions, "
            "so it understates how badly fixed-length splitting behaves on real "
            "documents with tables, 별표 and multi-line 항·호.",
        ],
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return manifest
