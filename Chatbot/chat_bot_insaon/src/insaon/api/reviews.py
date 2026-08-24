from __future__ import annotations

from dataclasses import dataclass, field
from uuid import uuid4

from insaon.application.review import ReviewQuestion
from insaon.application.session import ReviewConversation
from insaon.domain import ConditionValue, ReviewAnswer


@dataclass
class ReviewSession:
    session_id: str
    structured_conditions: tuple[ConditionValue, ...] = ()
    answers: list[ReviewAnswer] = field(default_factory=list)


class InMemoryReviewSessionStore:
    """Stores synthetic IDs and structured state; raw question text is never retained."""

    def __init__(self) -> None:
        self._sessions: dict[str, ReviewSession] = {}
        self._idempotency: dict[str, tuple[str, ReviewAnswer]] = {}

    def create(self) -> ReviewSession:
        session = ReviewSession(session_id=f"REV-{uuid4().hex[:16]}")
        self._sessions[session.session_id] = session
        return session

    def get(self, session_id: str) -> ReviewSession:
        try:
            return self._sessions[session_id]
        except KeyError as exc:
            raise KeyError("review_session_not_found") from exc

    def idempotent_result(self, key: str) -> tuple[str, ReviewAnswer] | None:
        return self._idempotency.get(key)

    def record(
        self, key: str, session: ReviewSession, answer: ReviewAnswer
    ) -> None:
        session.answers.append(answer)
        self._idempotency[key] = (session.session_id, answer)


class ReviewApiService:
    def __init__(
        self, review_question: ReviewQuestion, store: InMemoryReviewSessionStore
    ) -> None:
        self._review_question = review_question
        self._store = store

    def create(
        self, *, question_text: str, idempotency_key: str, local_rule_checked: bool
    ) -> tuple[str, ReviewAnswer]:
        previous = self._store.idempotent_result(idempotency_key)
        if previous is not None:
            return previous
        session = self._store.create()
        conversation = ReviewConversation(
            self._review_question, request_id=session.session_id
        )
        answer = conversation.ask(question_text, local_rule_checked=local_rule_checked)
        session.structured_conditions = conversation.conditions
        self._store.record(idempotency_key, session, answer)
        return session.session_id, answer

    def message(
        self,
        session_id: str,
        *,
        question_text: str,
        idempotency_key: str,
        local_rule_checked: bool,
    ) -> tuple[str, ReviewAnswer]:
        previous = self._store.idempotent_result(idempotency_key)
        if previous is not None:
            return previous
        session = self._store.get(session_id)
        conversation = ReviewConversation(
            self._review_question,
            request_id=session_id,
            conditions=session.structured_conditions,
        )
        answer = conversation.ask(question_text, local_rule_checked=local_rule_checked)
        session.structured_conditions = conversation.conditions
        self._store.record(idempotency_key, session, answer)
        return session_id, answer
