import json
from pathlib import Path

from insaon.evaluation.chunking import (
    build_source_document,
    chunk_fixed,
    chunk_recursive,
    chunk_structure,
    evaluate_strategy,
    load_corpus,
    load_queries,
)

ROOT = Path(__file__).resolve().parents[3]
CORPUS = ROOT / "data/sample/distractor-corpus.json"
QUERIES = ROOT / "data/sample/chunking-spike.json"


def test_source_document_spans_cover_every_provision_exactly_once() -> None:
    """A gap or an overlap here would silently corrupt every citation count."""
    provisions = load_corpus(CORPUS)
    source, spans = build_source_document(provisions)
    assert len(spans) == len(provisions)
    assert spans[0].start == 0
    assert spans[-1].end == len(source)
    for previous, current in zip(spans[:-1], spans[1:], strict=True):
        assert previous.end == current.start


def test_structure_chunks_are_citable_and_character_chunks_are_not() -> None:
    """This is the finding the spike exists to record, so it is pinned by a test.

    A chunk covering more than one provision cannot be cited as a single
    ``article_path``, which is the product contract regardless of retrieval score.

    이 테스트는 한때 문자 청킹의 인용 가능 청크가 **0건**이라고 단언했다. corpus가
    198건으로 늘자 재귀 분할에서 한 청크가 우연히 한 조문 안에 떨어져 그 단언이 깨졌다.
    0건은 성질이 아니라 그때 corpus 길이의 우연이었다. 성질은 "구조 청킹은 전부 인용
    가능하고 문자 청킹은 그렇지 않다"이므로 그것을 재도록 고쳤다.
    """
    provisions = load_corpus(CORPUS)
    source, spans = build_source_document(provisions)

    structure = chunk_structure(source, spans)
    assert len(structure) == len(provisions)
    assert all(chunk.is_citable for chunk in structure)

    for chunks in (chunk_fixed(source, spans, 512), chunk_recursive(source, spans, 512, 64)):
        assert chunks
        citable_share = sum(chunk.is_citable for chunk in chunks) / len(chunks)
        assert citable_share < 0.1


def test_recall_is_reported_next_to_the_corpus_share_it_depends_on() -> None:
    """Recall@k is not comparable across chunk sizes without the share of corpus read.

    Coarser chunks hand back more text for the same k, so their recall rises for a
    reason unrelated to retrieval quality. The manifest must always carry both.
    """
    provisions = load_corpus(CORPUS)
    queries, _ = load_queries(QUERIES)
    source, spans = build_source_document(provisions)

    structure = evaluate_strategy(chunk_structure(source, spans), queries, 5)
    coarse = evaluate_strategy(chunk_recursive(source, spans, 512, 64), queries, 5)

    assert coarse["set_recall_at_5"]["value"] >= structure["set_recall_at_5"]["value"]
    assert (
        coarse["retrieved_corpus_share_at_k"]["value"]
        > structure["retrieved_corpus_share_at_k"]["value"] * 3
    )
    assert coarse["mrr_at_10"]["value"] < structure["mrr_at_10"]["value"]


def test_published_manifest_matches_a_fresh_run() -> None:
    """The committed artifact must not drift from the code that produced it."""
    manifest = json.loads(
        (ROOT / "artifacts/spikes/chunking/manifest.json").read_text(encoding="utf-8")
    )
    provisions = load_corpus(CORPUS)
    queries, _ = load_queries(QUERIES)
    source, spans = build_source_document(provisions)
    fresh = evaluate_strategy(chunk_structure(source, spans), queries, manifest["top_k"])
    published = manifest["candidates"]["structure-v1"]
    assert fresh["set_recall_at_5"] == published["set_recall_at_5"]
    assert fresh["mrr_at_10"] == published["mrr_at_10"]
    assert fresh["citation"] == published["citation"]
