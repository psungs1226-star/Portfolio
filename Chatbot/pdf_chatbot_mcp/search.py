"""Character 2-gram lexical search (adapted from insaon char-ngram-v1)."""

from __future__ import annotations

import math
import re
from collections import Counter
from dataclasses import dataclass

from ingest import Chunk


@dataclass(frozen=True, slots=True)
class SearchResult:
    chunk: Chunk
    score: float
    rank: int


def _normalize(text: str) -> str:
    return "".join(re.findall(r"[0-9A-Za-z가-힣]+", text.lower()))


def _char_ngrams(text: str, n: int = 2) -> Counter[str]:
    normalized = _normalize(text)
    if len(normalized) < n:
        return Counter([normalized]) if normalized else Counter()
    return Counter(normalized[i : i + n] for i in range(len(normalized) - n + 1))


class ChunkIndex:
    def __init__(self, chunks: list[Chunk], ngram_size: int = 2) -> None:
        self._chunks = chunks
        self._size = ngram_size
        self._vectors = {
            c.chunk_id: _char_ngrams(c.text, ngram_size) for c in chunks
        }

    def search(self, query: str, top_k: int = 5) -> list[SearchResult]:
        qvec = _char_ngrams(query, self._size)
        scored = [
            (self._cosine(qvec, self._vectors[c.chunk_id]), c)
            for c in self._chunks
        ]
        scored.sort(key=lambda x: (-x[0], x[1].chunk_id))
        return [
            SearchResult(chunk=chunk, score=score, rank=rank)
            for rank, (score, chunk) in enumerate(scored[:top_k], 1)
        ]

    @staticmethod
    def _cosine(a: Counter[str], b: Counter[str]) -> float:
        if not a or not b:
            return 0.0
        dot = sum(v * b.get(k, 0) for k, v in a.items())
        na = math.sqrt(sum(v * v for v in a.values()))
        nb = math.sqrt(sum(v * v for v in b.values()))
        return dot / (na * nb) if na and nb else 0.0

    @property
    def count(self) -> int:
        return len(self._chunks)
