from __future__ import annotations

import math
from collections import Counter
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from datetime import date

from insaon.adapters.retrieval.lexical import char_ngrams
from insaon.adapters.retrieval.searchable import is_searchable
from insaon.application.ports import (
    LexicalRetriever,
    QueryTransformer,
    Reranker,
    VectorRetriever,
)
from insaon.domain import Provision, RetrievalCandidate

# Configurations that run the deterministic 기준일·적용대상 filter before generation.
TEMPORAL_FILTER_CONFIGS = frozenset({"H2", "H3", "H4"})
# Configurations that add reranking and 관계 기반 문맥 확장 on top of that filter.
DEEP_CONFIGS = frozenset({"H3", "H4"})


def reciprocal_rank_fusion(
    result_sets: Sequence[Sequence[RetrievalCandidate]],
    top_k: int,
    constant: int = 60,
) -> tuple[RetrievalCandidate, ...]:
    scores: dict[str, float] = {}
    for result_set in result_sets:
        for candidate in result_set:
            scores[candidate.provision_id] = scores.get(candidate.provision_id, 0.0) + 1 / (
                constant + candidate.rank
            )
    ranked = sorted(scores.items(), key=lambda item: (-item[1], item[0]))[:top_k]
    return tuple(
        RetrievalCandidate(provision_id, rank, score, "rrf-v1")
        for rank, (provision_id, score) in enumerate(ranked, start=1)
    )


class IdfWeightedReranker:
    """Rescore a fused shortlist with corpus inverse document frequency.

    The first-stage retrievers score plain 2-gram cosine, so a reranker that also
    counted raw overlap would only restate their ranking. What this stage adds is the
    corpus statistic they do not use: a gram shared with most of the corpus, such as
    the lane word every distractor repeats, carries far less evidence than a rare one.

    Scores are cosine over idf-weighted vectors and therefore length normalised. The
    previous version summed unnormalised set intersections, which ranked provisions by
    how much text they contained: a long adjacent-topic provision outscored the short
    provision that actually answered the question.
    """

    implementation_id = "idf-weighted-rerank-v2"

    def __init__(self, provisions: Mapping[str, Provision]) -> None:
        self._provisions = provisions
        self._vectors = {
            provision_id: char_ngrams(_indexed_text(provision))
            for provision_id, provision in provisions.items()
        }
        total = len(self._vectors) or 1
        document_frequency: Counter[str] = Counter()
        for vector in self._vectors.values():
            document_frequency.update(vector.keys())
        self._idf = {
            gram: math.log((total + 1) / (count + 1)) + 1.0
            for gram, count in document_frequency.items()
        }

    def rerank(
        self,
        query: str,
        candidates: Sequence[RetrievalCandidate],
        top_k: int,
    ) -> tuple[RetrievalCandidate, ...]:
        query_vector = self._weighted(char_ngrams(query))
        rescored = []
        for candidate in candidates:
            document_vector = self._weighted(self._vectors[candidate.provision_id])
            score = _cosine(query_vector, document_vector)
            # The fused rank stays as a tie-break so that first-stage evidence is not
            # discarded when two provisions carry identical discriminative grams.
            rescored.append((score + candidate.raw_score / 1000, candidate))
        ranked = sorted(rescored, key=lambda item: (-item[0], item[1].provision_id))[:top_k]
        return tuple(
            RetrievalCandidate(
                candidate.provision_id,
                rank,
                score,
                self.implementation_id,
                dict(candidate.metadata),
            )
            for rank, (score, candidate) in enumerate(ranked, start=1)
        )

    def _weighted(self, grams: Counter[str]) -> dict[str, float]:
        return {
            gram: (1.0 + math.log(count)) * self._idf.get(gram, self._unseen_idf)
            for gram, count in grams.items()
        }

    @property
    def _unseen_idf(self) -> float:
        """Weight for a query gram absent from the corpus: maximally discriminative."""
        return math.log(len(self._vectors) + 1) + 1.0


def _indexed_text(provision: Provision) -> str:
    return f"{provision.article_path} {provision.title} {provision.text}"


def _cosine(left: Mapping[str, float], right: Mapping[str, float]) -> float:
    dot = sum(value * right.get(gram, 0.0) for gram, value in left.items())
    left_norm = math.sqrt(sum(value * value for value in left.values()))
    right_norm = math.sqrt(sum(value * value for value in right.values()))
    return dot / (left_norm * right_norm) if left_norm and right_norm else 0.0


@dataclass(frozen=True)
class RetrievalResult:
    candidates: tuple[RetrievalCandidate, ...]
    context: tuple[Provision, ...]
    context_incomplete: bool = False
    reason: str | None = None


class RetrievalPipeline:
    def __init__(
        self,
        provisions: Sequence[Provision],
        lexical: LexicalRetriever,
        vector: VectorRetriever,
        reranker: Reranker | None = None,
        transformer: QueryTransformer | None = None,
    ) -> None:
        self._provisions = {item.provision_id: item for item in provisions}
        self._lexical = lexical
        self._vector = vector
        self._reranker = reranker
        self._transformer = transformer

    def retrieve(
        self,
        query: str,
        *,
        config_id: str,
        top_k: int,
        reference_date: date | None = None,
        subject: str | None = None,
        source_ids: frozenset[str] | None = None,
        topic_tags: frozenset[str] | None = None,
        rerank: bool = True,
        expand_context: bool = True,
    ) -> RetrievalResult:
        candidate_pool = (
            len(self._provisions)
            if config_id in TEMPORAL_FILTER_CONFIGS
            else (
                min(len(self._provisions), max(top_k, top_k * 20))
                if source_ids is not None or topic_tags is not None
                else top_k
            )
        )
        rerank_query = query
        if config_id == "B0":
            candidates = tuple(self._lexical.retrieve(query, candidate_pool))
        elif config_id == "B1":
            candidates = tuple(self._vector.retrieve(query, candidate_pool))
        else:
            queries = [query]
            if config_id == "H4" and self._transformer is not None:
                terms = tuple(self._transformer.expand(query))
                if terms:
                    # A standalone term query is what actually reaches the provision:
                    # appending 질병휴직 to a long practitioner sentence leaves the
                    # length-normalised score dominated by words the statute never uses.
                    # The combined query is kept so the fusion still sees the question.
                    queries.extend(terms)
                    rerank_query = f"{query} {' '.join(terms)}"
                    queries.append(rerank_query)
            candidates = reciprocal_rank_fusion(
                [
                    result
                    for item in queries
                    for result in (
                        self._lexical.retrieve(item, candidate_pool),
                        self._vector.retrieve(item, candidate_pool),
                    )
                ],
                candidate_pool,
            )
        if source_ids is not None:
            candidates = tuple(
                candidate
                for candidate in candidates
                if self._provisions[candidate.provision_id].source_id in source_ids
            )
        if topic_tags is not None:
            candidates = tuple(
                candidate
                for candidate in candidates
                if self._provisions[candidate.provision_id].topic_tags & topic_tags
            )
        if config_id in TEMPORAL_FILTER_CONFIGS:
            if reference_date is None or subject is None:
                return RetrievalResult((), (), True, "reference_date_and_subject_required")
            candidates_before_temporal_filter = candidates
            candidates = tuple(
                candidate
                for candidate in candidates
                if self._provisions[candidate.provision_id].is_effective_on(
                    reference_date, subject
                )
            )
            if candidates_before_temporal_filter and not candidates:
                return RetrievalResult((), (), True, "invalid_effective_version")
        if config_id in DEEP_CONFIGS and rerank and self._reranker is not None:
            reranker_limit = getattr(self._reranker, "max_candidates", len(candidates))
            rerank_pool = candidates[: max(top_k, min(len(candidates), reranker_limit))]
            # The reranker must see the same vocabulary the first stage searched.
            # Scoring the expanded pool against the practitioner wording alone would
            # discard exactly the provisions the expansion was there to reach.
            candidates = tuple(
                self._reranker.rerank(rerank_query or query, rerank_pool, top_k)
            )
        else:
            candidates = candidates[:top_k]
        context = (
            self._expand(candidates)
            if config_id in DEEP_CONFIGS and expand_context
            else tuple(self._provisions[candidate.provision_id] for candidate in candidates)
        )
        unresolved = any(
            relation_id not in self._provisions
            for provision in context
            for relation_id in provision.relation_ids
        )
        return RetrievalResult(candidates, context, unresolved, "unresolved_relation" if unresolved else None)

    def sources_without_effective_version(
        self,
        reference_date: date,
        subject: str,
        source_ids: frozenset[str],
    ) -> tuple[str, ...]:
        """Sources that hold no version in force on ``reference_date``.

        The temporal filter drops individual provisions, so a question whose governing
        규정 has no version for that date does not come back empty — it comes back with
        whatever unrelated source happened to survive. That reads as an answer.

        This is not the same as `invalid_effective_version`, which only fires when the
        filter empties the result entirely.
        """
        covered = {
            provision.source_id
            for provision in self._provisions.values()
            if provision.source_id in source_ids
            and provision.is_effective_on(reference_date, subject)
        }
        return tuple(sorted(source_ids - covered))

    def _expand(self, candidates: Sequence[RetrievalCandidate]) -> tuple[Provision, ...]:
        # 확장이 데려오는 것은 부칙·단서처럼 결론을 바꾸는 관계 조문이다. 조 헤더와
        # 삭제 tombstone은 관계로 이어져 있어도 인용 목록에서 빈 자리가 될 뿐이다.
        # 색인에서 빼도 부모 링크를 타고 다시 들어오므로 여기서도 걸러야 한다.
        ids: list[str] = []
        for candidate in candidates:
            provision = self._provisions[candidate.provision_id]
            for value in (
                provision.provision_id,
                provision.parent_provision_id,
                *provision.relation_ids,
            ):
                if not value or value in ids:
                    continue
                related = self._provisions.get(value)
                if related is not None and is_searchable(related):
                    ids.append(value)
        return tuple(self._provisions[value] for value in ids)
