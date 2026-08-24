"""Application ports. Provider and persistence details stay behind these protocols."""

from __future__ import annotations

from collections.abc import Sequence
from datetime import date, datetime
from typing import Protocol

from insaon.domain import (
    Citation,
    ParsedDocument,
    Provision,
    QuestionContext,
    RawSnapshot,
    RetrievalCandidate,
    ReviewDraft,
    SourceDocument,
)


class Clock(Protocol):
    def now(self) -> datetime: ...


class LawSourceClient(Protocol):
    def fetch_document(self, official_source_id: str, effective_date: date) -> RawSnapshot: ...


class SourceRepository(Protocol):
    def add_snapshot(self, snapshot: RawSnapshot) -> None: ...

    def get_source(self, source_id: str) -> SourceDocument | None: ...

    def get_provision(self, provision_id: str) -> Provision | None: ...

    def effective_provisions(self, reference_date: date, subject: str) -> Sequence[Provision]: ...

    def relations_for(self, provision_id: str) -> Sequence[str]: ...


class ParsedDocumentRepository(Protocol):
    def save_parsed(self, parsed: ParsedDocument) -> None: ...


class LexicalRetriever(Protocol):
    def retrieve(self, query: str, top_k: int) -> Sequence[RetrievalCandidate]: ...


class VectorRetriever(Protocol):
    def retrieve(self, query: str, top_k: int) -> Sequence[RetrievalCandidate]: ...


class Reranker(Protocol):
    def rerank(
        self,
        query: str,
        candidates: Sequence[RetrievalCandidate],
        top_k: int,
    ) -> Sequence[RetrievalCandidate]: ...


class QueryTransformer(Protocol):
    """Widen retrieval candidates only.

    ``expand`` returns extra retrieval queries. It never returns conditions, a
    ``leave_type`` or a reference date: a guessed leave type changes the whole
    conclusion, and unconfirmed facts must stay in ``missing_conditions``.
    """

    @property
    def implementation_id(self) -> str: ...

    def expand(self, query: str) -> Sequence[str]: ...


class EmbeddingGateway(Protocol):
    @property
    def model_id(self) -> str: ...

    @property
    def dimensions(self) -> int: ...

    def embed(self, texts: Sequence[str]) -> Sequence[Sequence[float]]: ...


class ModelGateway(Protocol):
    def draft(
        self,
        context: QuestionContext,
        provisions: Sequence[Provision],
        allowed_citations: Sequence[Citation],
    ) -> ReviewDraft: ...
