"""Tests for the state that makes this a chatbot rather than a question form.

Every published number before these existed came from a single ``handle`` call, so the
follow-up path — carrying a confirmed condition forward, dropping a stale one when the
subject changes — was covered by two tests in the whole repository. The defects that
live here are invisible to single-turn testing by construction.
"""

from __future__ import annotations

from datetime import date

import pytest

from insaon.application.factory import build_offline_review_service
from insaon.application.review import ReviewQuestion
from insaon.application.session import ReviewConversation, merge_conditions
from insaon.domain import AnswerStatus, ConditionState, ConditionValue


def _confirmed(field_name: str, value: object) -> ConditionValue:
    return ConditionValue(field_name, value, ConditionState.CONFIRMED, "question_text")


def _conversation() -> ReviewConversation:
    return ReviewConversation(build_offline_review_service(), request_id="TEST-CONV")


def test_merge_keeps_confirmed_facts_across_an_ordinary_follow_up() -> None:
    previous = (_confirmed("leave_type", "parental"), _confirmed("reference_date", date(2026, 3, 2)))
    merged = merge_conditions(previous, (_confirmed("child_birth_date", date(2024, 3, 1)),))
    assert {item.field_name for item in merged} == {
        "leave_type",
        "reference_date",
        "child_birth_date",
    }


def test_merge_drops_everything_but_the_date_when_the_topic_changes() -> None:
    """A new subject must not inherit the previous subject's facts.

    The question date is the one fact a subject change does not invalidate, so it is
    deliberately the only survivor.
    """
    previous = (
        _confirmed("leave_type", "parental"),
        _confirmed("child_birth_date", date(2024, 3, 1)),
        _confirmed("reference_date", date(2026, 3, 2)),
    )
    merged = merge_conditions(previous, (_confirmed("topic", "performance_and_promotion"),))
    assert {item.field_name for item in merged} == {"topic", "reference_date"}


def test_a_supplied_condition_resolves_the_question_it_was_asked_for() -> None:
    """The product's core loop: ask, get told, then answer. One turn cannot test it."""
    conversation = _conversation()
    asked = conversation.ask("[합성] 질병휴직을 검토해 주세요.", local_rule_checked=True)
    assert asked.status is AnswerStatus.REVIEW_REQUIRED
    assert set(asked.missing_conditions) == {"reference_date", "medical_leave_basis"}

    resolved = conversation.ask(
        "질문 기준일은 2026-03-02입니다. 비공무상 사유입니다.", local_rule_checked=True
    )
    assert resolved.status is AnswerStatus.ANSWERABLE
    assert not resolved.missing_conditions
    # 두 번째 턴에는 "질병휴직"이라는 말이 없다. 유형이 이월되지 않으면 답할 수 없다.
    assert "SYNTHETIC-EVIDENCE-B-001" in {item.provision_id for item in resolved.citations}


def test_changing_the_leave_type_mid_conversation_does_not_reuse_the_old_basis() -> None:
    conversation = _conversation()
    first = conversation.ask(
        "[합성] 2026-03-02 기준으로 육아휴직 공개 근거 조문을 찾아주세요.",
        local_rule_checked=True,
    )
    assert "SYNTH-PARENTAL-001" in {item.provision_id for item in first.citations}

    second = conversation.ask(
        "[합성] 그럼 질병휴직 공개 근거 조문은요?", local_rule_checked=True
    )
    cited = {item.provision_id for item in second.citations}
    assert "SYNTHETIC-EVIDENCE-B-001" in cited
    assert "SYNTH-PARENTAL-001" not in cited
    # 기준일은 두 번째 턴에 없다. 이월되지 않으면 다시 물어야 한다.
    assert second.status is AnswerStatus.ANSWERABLE


@pytest.mark.parametrize(
    "follow_up",
    ["2026-03-02", "2026-03-02입니다", "2026년 3월 2일입니다"],
)
def test_a_date_only_follow_up_stays_in_the_task_whatever_particle_is_attached(
    follow_up: str,
) -> None:
    """`\\b` 뒤에 조사가 붙으면 경계가 성립하지 않는다.

    한글 음절은 파이썬 정규식에서 `\\w`다. 후속 턴은 날짜만 던지고 조사를 붙이는 형태가
    가장 흔하므로 이 경로에서 특히 잘 깨진다. 깨지면 대화가 앞 턴의 과업에서 떨어져 나가
    조건을 처음부터 다시 묻는다.
    """
    conversation = _conversation()
    conversation.ask("[합성] 승진 관련 공개 근거 조문을 알려주세요.", local_rule_checked=True)
    answer = conversation.ask(follow_up, local_rule_checked=True)
    assert "evidence_only_human_review" in answer.review_reasons
    assert "required_conditions_missing" not in answer.review_reasons


def test_the_follow_up_pattern_itself_rejects_only_adjacent_digits() -> None:
    pattern = ReviewQuestion._reference_date_followup
    assert pattern.search("2026-03-02입니다")
    assert not pattern.search("12026-03-02")
    assert not pattern.search("2026-03-021")
