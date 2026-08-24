"""Multi-turn review state, shared by the HTTP API and the evaluation runner.

The rule that decides what a follow-up turn remembers used to live in
``api/reviews.py``. That put the only logic governing conversation state inside the
HTTP layer, where the evaluation runner could not reach it, and the runner answered
every case with a single ``handle`` call. So the published numbers described a
one-shot question answerer while the product served a conversation, and the whole
follow-up path — carrying a confirmed condition forward, dropping a stale one when
the subject changes — was measured by nothing.

Both drivers now go through this module. What is measured is what is served.
"""

from __future__ import annotations

from insaon.application.review import ReviewCommand, ReviewQuestion
from insaon.domain import ConditionValue, ReviewAnswer


def merge_conditions(
    previous: tuple[ConditionValue, ...], current: tuple[ConditionValue, ...]
) -> tuple[ConditionValue, ...]:
    """Carry confirmed facts forward, except where the subject itself changed.

    A follow-up usually adds to what is already established, so the default is to
    keep everything and let the new turn overwrite by field name. The exceptions are
    the moments where keeping state would answer a new question with the previous
    question's facts: a different topic, a lane that just moved from a wide evidence
    lookup into a deep review, and either edge of the derived-allowance path. In
    those cases only the reference date survives, because the question date is the
    one fact a subject change does not invalidate.
    """
    current_names = {item.field_name for item in current}
    previous_names = {item.field_name for item in previous}
    topic_changed = "topic" in current_names
    deep_review_started = "leave_type" in current_names and "topic" in previous_names
    derived_pay_started = (
        "allowance_type" in current_names and "allowance_type" not in previous_names
    )
    derived_pay_ended = (
        "allowance_type" in previous_names
        and "leave_type" in current_names
        and "allowance_type" not in current_names
        and "reference_date" in current_names
    )
    if topic_changed or deep_review_started or derived_pay_started or derived_pay_ended:
        merged = {
            item.field_name: item
            for item in previous
            if item.field_name == "reference_date"
        }
    else:
        merged = {item.field_name: item for item in previous}
    merged.update({item.field_name: item for item in current})
    return tuple(merged[key] for key in sorted(merged))


class ReviewConversation:
    """One review exchange over one or more turns.

    Holds structured conditions only. The question text of an earlier turn is never
    retained, so a conversation cannot become a store of what the user typed.
    """

    def __init__(
        self,
        review_question: ReviewQuestion,
        *,
        request_id: str,
        employee_system: str = "local_government",
        employee_category: str = "general_service",
        conditions: tuple[ConditionValue, ...] = (),
    ) -> None:
        self._review_question = review_question
        self._request_id = request_id
        self._employee_system = employee_system
        self._employee_category = employee_category
        self._conditions = conditions

    @property
    def conditions(self) -> tuple[ConditionValue, ...]:
        return self._conditions

    def ask(self, question_text: str, *, local_rule_checked: bool = False) -> ReviewAnswer:
        current = self._review_question.extract_structured_conditions(
            question_text, self._conditions
        )
        self._conditions = merge_conditions(self._conditions, current)
        return self._review_question.handle(
            ReviewCommand(
                request_id=self._request_id,
                question_text=question_text,
                employee_system=self._employee_system,
                employee_category=self._employee_category,
                local_rule_checked=local_rule_checked,
                known_conditions=self._conditions,
            )
        )
