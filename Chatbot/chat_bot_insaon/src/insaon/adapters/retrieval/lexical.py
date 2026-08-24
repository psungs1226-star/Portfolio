from __future__ import annotations

import math
import re
import sqlite3
from collections import Counter
from collections.abc import Sequence

from insaon.domain import Provision, RetrievalCandidate


def normalize_text(value: str) -> str:
    return "".join(re.findall(r"[0-9A-Za-z가-힣]+", value.lower()))


def char_ngrams(value: str, size: int = 2) -> Counter[str]:
    normalized = normalize_text(value)
    if len(normalized) < size:
        return Counter([normalized]) if normalized else Counter()
    return Counter(normalized[index : index + size] for index in range(len(normalized) - size + 1))


class CharNgramLexicalRetriever:
    implementation_id = "char-ngram-v1"

    def __init__(self, documents: Sequence[Provision], ngram_size: int = 2) -> None:
        self._documents = tuple(documents)
        self._size = ngram_size
        self._vectors = {
            document.provision_id: char_ngrams(
                f"{document.article_path} {document.title} {document.text}", ngram_size
            )
            for document in self._documents
        }

    def retrieve(self, query: str, top_k: int) -> tuple[RetrievalCandidate, ...]:
        query_vector = char_ngrams(query, self._size)
        scored = [
            (
                self._cosine(query_vector, self._vectors[document.provision_id]),
                document.provision_id,
            )
            for document in self._documents
        ]
        ranked = sorted(scored, key=lambda item: (-item[0], item[1]))[:top_k]
        return tuple(
            RetrievalCandidate(provision_id, rank, score, self.implementation_id)
            for rank, (score, provision_id) in enumerate(ranked, start=1)
        )

    @staticmethod
    def _cosine(left: Counter[str], right: Counter[str]) -> float:
        if not left or not right:
            return 0.0
        dot = sum(value * right.get(key, 0) for key, value in left.items())
        left_norm = math.sqrt(sum(value * value for value in left.values()))
        right_norm = math.sqrt(sum(value * value for value in right.values()))
        return dot / (left_norm * right_norm) if left_norm and right_norm else 0.0


class SQLiteFts5Retriever:
    implementation_id = "sqlite-fts5-unicode61-v1"

    def __init__(self, documents: Sequence[Provision]) -> None:
        self._connection = sqlite3.connect(":memory:")
        self._connection.execute(
            "CREATE VIRTUAL TABLE provisions USING fts5(provision_id UNINDEXED, text)"
        )
        self._connection.executemany(
            "INSERT INTO provisions(provision_id, text) VALUES (?, ?)",
            [
                (
                    document.provision_id,
                    f"{document.article_path} {document.title} {document.text}",
                )
                for document in documents
            ],
        )

    def retrieve(self, query: str, top_k: int) -> tuple[RetrievalCandidate, ...]:
        tokens = re.findall(r"[0-9A-Za-z가-힣]+", query)
        if not tokens:
            return ()
        match_query = " OR ".join(f'"{token}"' for token in tokens)
        rows = self._connection.execute(
            "SELECT provision_id, bm25(provisions) FROM provisions "
            "WHERE provisions MATCH ? ORDER BY bm25(provisions), provision_id LIMIT ?",
            (match_query, top_k),
        ).fetchall()
        return tuple(
            RetrievalCandidate(str(provision_id), rank, float(-score), self.implementation_id)
            for rank, (provision_id, score) in enumerate(rows, start=1)
        )
