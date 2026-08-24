from __future__ import annotations

import hashlib
import json
import math
from collections.abc import Sequence
from pathlib import Path

from insaon.adapters.retrieval.lexical import CharNgramLexicalRetriever, char_ngrams
from insaon.application.ports import EmbeddingGateway
from insaon.domain import Provision, RetrievalCandidate


class DeterministicEmbeddingGateway:
    """Signed random projection of the char 2-gram space, with no model download.

    This is a dimensionality reduction of the same features
    :class:`~insaon.adapters.retrieval.lexical.CharNgramLexicalRetriever` scores, so it
    cannot represent synonymy and must not be presented as a semantic embedding. Its
    only job in the offline profile is to give the vector arm a signal that tracks
    lexical similarity instead of noise, so that fusing the two arms does not destroy
    the lexical ranking. The semantic claim needs the ``local`` profile and BGE-M3.

    The default width comes from measured fidelity, not from a guess. Using each
    provision's own title as a short pseudo-query against the 93-provision public
    corpus, the fraction of the true 2-gram top-5 that the projection reproduces is
    0.703 at 64 dimensions, 0.817 at 512, 0.858 at 1024, 0.871 at 2048 and 0.897 at
    8192. The default is the smallest power of two whose overlap at both 5 and 10
    exceeds 0.85. Titles from the corpus are used rather than the evaluation queries so
    this choice cannot be fitted to the ablation outcome.

    Note the ceiling: even at 8192 dimensions roughly a tenth of the top-5 is still
    lost, because projecting a sparse gram space into a dense one is lossy by
    construction. The offline vector arm is therefore a degraded copy of the lexical
    arm, which is why fusing them recovers the lexical ranking rather than beating it.
    """

    model_id = "deterministic-hash-projection-v2"

    def __init__(self, dimensions: int = 1024) -> None:
        if dimensions <= 0:
            raise ValueError("dimensions must be positive")
        self._dimensions = dimensions

    @property
    def dimensions(self) -> int:
        return self._dimensions

    def embed(self, texts: Sequence[str]) -> tuple[tuple[float, ...], ...]:
        return tuple(self._embed_one(text) for text in texts)

    def _embed_one(self, text: str) -> tuple[float, ...]:
        vector = [0.0] * self._dimensions
        for gram, count in char_ngrams(text).items():
            digest = hashlib.sha256(gram.encode()).digest()
            index = int.from_bytes(digest[:4], "big") % self._dimensions
            sign = 1.0 if digest[4] % 2 == 0 else -1.0
            # Sublinear term frequency: a gram repeated ten times is not ten times the
            # evidence, and the raw counts the previous version accumulated let long
            # provisions swamp a whole projected dimension.
            vector[index] += sign * (1.0 + math.log(count))
        norm = math.sqrt(sum(value * value for value in vector))
        return tuple(value / norm for value in vector) if norm else tuple(vector)


class InMemoryVectorRetriever:
    implementation_id = "deterministic-vector-v1"

    def __init__(
        self,
        documents: Sequence[Provision],
        gateway: EmbeddingGateway | None = None,
        *,
        cache_path: Path | None = None,
        cache_key: str | None = None,
    ) -> None:
        self._documents = tuple(documents)
        self._gateway = gateway or DeterministicEmbeddingGateway()
        texts = [f"{item.article_path} {item.title} {item.text}" for item in self._documents]
        cached = self._load_cache(cache_path, cache_key)
        if cached is not None:
            self._vectors = cached
            return
        batch_limit = getattr(self._gateway, "batch_limit", len(texts) or 1)
        if not isinstance(batch_limit, int) or batch_limit <= 0:
            batch_limit = len(texts) or 1
        self._vectors = tuple(
            tuple(float(value) for value in vector)
            for start in range(0, len(texts), batch_limit)
            for vector in self._gateway.embed(texts[start : start + batch_limit])
        )
        self._write_cache(cache_path, cache_key, self._vectors)

    @property
    def embedding_gateway(self) -> EmbeddingGateway:
        return self._gateway

    def retrieve(self, query: str, top_k: int) -> tuple[RetrievalCandidate, ...]:
        query_vector = self._gateway.embed([query])[0]
        scored = [
            (sum(left * right for left, right in zip(query_vector, vector, strict=True)), item)
            for item, vector in zip(self._documents, self._vectors, strict=True)
        ]
        ranked = sorted(scored, key=lambda pair: (-pair[0], pair[1].provision_id))[:top_k]
        return tuple(
            RetrievalCandidate(item.provision_id, rank, score, self.implementation_id)
            for rank, (score, item) in enumerate(ranked, start=1)
        )

    def _load_cache(
        self, cache_path: Path | None, cache_key: str | None
    ) -> tuple[tuple[float, ...], ...] | None:
        if cache_path is None or cache_key is None or not cache_path.is_file():
            return None
        try:
            payload = json.loads(cache_path.read_text(encoding="utf-8"))
            if not isinstance(payload, dict):
                return None
            if (
                payload.get("schema_version") != "0.1.0"
                or payload.get("cache_key") != cache_key
                or payload.get("document_ids")
                != [item.provision_id for item in self._documents]
            ):
                return None
            raw_vectors = payload.get("vectors")
            if not isinstance(raw_vectors, list) or len(raw_vectors) != len(self._documents):
                return None
            dimensions = getattr(self._gateway, "dimensions", None)
            vectors = tuple(
                tuple(float(value) for value in vector)
                for vector in raw_vectors
                if isinstance(vector, list)
            )
            if len(vectors) != len(raw_vectors) or any(
                not vector
                or (isinstance(dimensions, int) and len(vector) != dimensions)
                or any(not math.isfinite(value) for value in vector)
                for vector in vectors
            ):
                return None
            return vectors
        except (OSError, ValueError, TypeError, json.JSONDecodeError):
            return None

    def _write_cache(
        self,
        cache_path: Path | None,
        cache_key: str | None,
        vectors: tuple[tuple[float, ...], ...],
    ) -> None:
        if cache_path is None or cache_key is None:
            return
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        temporary = cache_path.with_suffix(cache_path.suffix + ".part")
        temporary.write_text(
            json.dumps(
                {
                    "schema_version": "0.1.0",
                    "cache_key": cache_key,
                    "document_ids": [item.provision_id for item in self._documents],
                    "vectors": vectors,
                },
                ensure_ascii=False,
                separators=(",", ":"),
            ),
            encoding="utf-8",
        )
        temporary.replace(cache_path)


class LocalShortlistVectorRetriever:
    """Embed a lexical shortlist at query time instead of synthetic startup documents."""

    implementation_id = "local-shortlist-vector-v1"

    def __init__(
        self,
        documents: Sequence[Provision],
        gateway: EmbeddingGateway,
        *,
        shortlist_size: int = 48,
    ) -> None:
        if shortlist_size <= 0:
            raise ValueError("shortlist size must be positive")
        batch_limit = getattr(gateway, "batch_limit", None)
        if isinstance(batch_limit, int) and shortlist_size + 1 > batch_limit:
            raise ValueError("shortlist and query must fit in one embedding batch")
        self._documents = {item.provision_id: item for item in documents}
        self._gateway = gateway
        self._lexical = CharNgramLexicalRetriever(documents)
        self._shortlist_size = shortlist_size

    def retrieve(self, query: str, top_k: int) -> tuple[RetrievalCandidate, ...]:
        if top_k <= 0 or not self._documents:
            return ()
        shortlist = self._lexical.retrieve(
            query,
            min(len(self._documents), self._shortlist_size),
        )
        documents = [self._documents[item.provision_id] for item in shortlist]
        texts = [query, *(f"{item.article_path} {item.title} {item.text}" for item in documents)]
        vectors = self._gateway.embed(texts)
        query_vector = vectors[0]
        scored = [
            (
                sum(
                    left * right
                    for left, right in zip(query_vector, vector, strict=True)
                ),
                document,
            )
            for document, vector in zip(documents, vectors[1:], strict=True)
        ]
        ranked = sorted(scored, key=lambda pair: (-pair[0], pair[1].provision_id))[
            :top_k
        ]
        return tuple(
            RetrievalCandidate(item.provision_id, rank, score, self.implementation_id)
            for rank, (score, item) in enumerate(ranked, start=1)
        )
