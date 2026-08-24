from __future__ import annotations

import re
from collections import Counter
from collections.abc import Iterable, Mapping
from dataclasses import dataclass

from insaon.application.ports import QueryTransformer
from insaon.domain import LeaveType

# 세 글자 이상만 뽑는다. 조문 제목에는 `절차`·`요건`·`방법`·`시기`처럼 주제를 가리키지
# 않는 두 글자 일반 명사가 흔하고, 그것을 어휘에 넣으면 `계약직 재계약 절차`가 퇴직으로
# 샌다. 뜻이 있는 두 글자(`시효`, `정년`, `병가`)는 손으로 적은 씨앗 쪽에 있다.
_TERM = re.compile(r"[가-힣]{3,}")
# 조문 제목에 붙는 편집 어휘. 주제를 가리키지 않는다.
_NON_TOPIC_TERMS = frozenset(
    {"합성", "부칙", "단서", "개정", "구버전", "미시행", "예정", "구분", "다른", "관련"}
)
# 이만큼의 주제에 걸쳐 나타나면 그 말은 주제를 가르지 못한다. 상호참조 조문과
# 인접 혼동 distractor가 다른 주제의 이름을 제목에 달고 있기 때문이다.
_MAX_TOPIC_SPREAD = 2


def topic_terms_from_titles(
    titles_by_topic: Mapping[str, Iterable[str]],
) -> dict[str, frozenset[str]]:
    """Derive per-topic vocabulary from the provision titles actually indexed.

    The hand-written ``_wide_topics`` table can only route questions whose wording
    someone thought to type into it. A question about 가점 died as "unsupported"
    whether or not the corpus held the provision, and adding the word only moved the
    failure to the next word. Reading the corpus makes reach a property of what is
    stored rather than of what was typed.

    Terms appearing across more than ``_MAX_TOPIC_SPREAD`` topics are dropped: the
    corpus deliberately contains cross-reference and near-miss distractor provisions
    whose titles name other topics, and keeping those would route by noise.
    """
    per_topic = {
        topic: {
            term
            for title in titles
            for term in _TERM.findall(title)
            if term not in _NON_TOPIC_TERMS
        }
        for topic, titles in titles_by_topic.items()
    }
    spread = Counter(term for terms in per_topic.values() for term in terms)
    return {
        topic: frozenset(
            term for term in terms if spread[term] <= _MAX_TOPIC_SPREAD
        )
        for topic, terms in per_topic.items()
    }


@dataclass(frozen=True)
class QuestionClassification:
    leave_type: LeaveType
    is_reinstatement: bool
    in_scope: bool
    intent: str
    reason_code: str | None = None
    topic: str = "service_and_leave"
    review_tier: str = "deep_review"


class QuestionClassifier:
    _unsupported_subject = (
        "국가공무원",
        "교육공무원",
        "경찰",
        "소방",
    )
    _final_decision = (
        "최종 처분",
        "최종 판단",
        "확정해",
        "결정해",
    )
    _leave_terms = {
        LeaveType.PARENTAL: ("육아휴직", "육아 휴직"),
        LeaveType.MEDICAL: ("질병휴직", "질병 휴직"),
        LeaveType.FAMILY_CARE: ("가족돌봄휴직", "가족 돌봄 휴직"),
        LeaveType.SELF_DEVELOPMENT: ("자기개발휴직", "자기 개발 휴직"),
    }
    # 조문을 넣는 것과 그 조문에 닿는 말을 넣는 것은 별개다. corpus에 `직위해제`와 `공가`
    # 조문을 넣고도 두 질문이 근거 0건으로 끝난 적이 있다. 여기에 단어가 없으면 주제가
    # 정해지지 않고, 주제가 없으면 검색이 시작되지 않는다.
    #
    # 부분 문자열로 맞추므로 짧은 단어를 넣을 때는 다른 주제의 용어를 품는지 본다.
    # `연수`를 교육훈련에 넣으면 `승진소요최저연수`가 교육훈련으로 샌다. 넣지 않았다.
    _wide_topics = {
        "appointment": ("신규임용", "임용", "채용", "전보", "경력경쟁", "시보", "결격"),
        "personnel_records": ("인사기록", "인사통계", "발령대장", "인사사무"),
        "performance_and_promotion": ("평정", "근무성적", "승진"),
        "service_and_leave": ("복무", "연가", "병가", "휴가", "출장", "공가", "경조사"),
        "pay_and_allowance": ("보수", "봉급", "호봉", "수당", "성과상여금"),
        "discipline_and_appeal": (
            "징계",
            "소청",
            "직위해제",
            "파면",
            "해임",
            "강등",
            "정직",
            "감봉",
            "견책",
        ),
        "training": ("교육훈련", "위탁교육", "의무복무", "교육경비"),
        "retirement": ("명예퇴직", "퇴직", "당연퇴직", "정년"),
    }
    _leave_signal = ("휴직", "복직")
    # 한 턴이 "어떤 도움을 원하는지"를 스스로 말했는지 판단하는 표지.
    # "질병휴직는요?"처럼 대상만 바꿔 잇는 발화에는 둘 다 없다. 그런 턴은 앞 턴의
    # 과업을 이어받아야 하며, 여기에 표지가 하나라도 있으면 그 턴이 스스로 과업을
    # 말한 것이므로 이어받지 않는다.
    _evidence_task_markers = ("근거", "규정", "조문", "찾아")
    _eligibility_task_markers = (
        "되나",
        "되는지",
        "가능",
        "신청",
        "쓸 수",
        "쓸수",
        "사용할 수",
        "할 수 있",
        "얼마나",
        "며칠",
        "언제",
        "요건",
        "자격",
    )
    _all_personnel_evidence_terms = (
        "전체 인사규정",
        "전체 인사 규정",
        "인사규정",
        "인사 규정",
        "인사 관련",
        "인사관련",
    )

    def __init__(
        self,
        *,
        enable_extended_topics: bool = True,
        transformer: QueryTransformer | None = None,
        corpus_topic_terms: Mapping[str, frozenset[str]] | None = None,
    ) -> None:
        self._enable_extended_topics = enable_extended_topics
        self._transformer = transformer
        # 손으로 적은 씨앗 + corpus가 실제로 담고 있는 말. 씨앗은 저장소에 그 글자
        # 그대로는 없지만 담당자가 쓰는 말(`휴가`, `승진`)이라 남긴다. corpus 쪽은
        # 조문이 늘면 같이 늘어난다 — 내가 단어를 추가하지 않아도 도달 가능해진다.
        derived = corpus_topic_terms or {}
        self._topic_terms: dict[str, tuple[str, ...]] = {
            topic: tuple(sorted({*terms, *derived.get(topic, frozenset())}))
            for topic, terms in self._wide_topics.items()
        }

    def classify(
        self, text: str, *, has_established_scope: bool = False
    ) -> QuestionClassification:
        """Classify one turn.

        ``has_established_scope`` is set when an earlier turn of the same session
        already fixed a supported lane. Follow-up turns often carry only a date or a
        single fact, so the no-signal denial must not apply to them.
        """
        if any(term in text for term in self._unsupported_subject) or any(
            term in text for term in self._final_decision
        ):
            return QuestionClassification(
                leave_type=LeaveType.OUT_OF_SCOPE,
                is_reinstatement="복직" in text,
                in_scope=False,
                intent="out_of_scope",
                reason_code="unsupported_subject_or_topic",
            )
        matches = [
            leave_type
            for leave_type, terms in self._leave_terms.items()
            if any(term in text for term in terms)
        ]
        leave_type = matches[0] if len(matches) == 1 else LeaveType.UNKNOWN
        if (
            "정근수당" in text
            and leave_type is LeaveType.PARENTAL
            and any(term in text for term in ("휴직", "복직"))
        ):
            if not self._enable_extended_topics:
                return QuestionClassification(
                    leave_type=LeaveType.OUT_OF_SCOPE,
                    is_reinstatement="복직" in text,
                    in_scope=False,
                    intent="out_of_scope",
                    reason_code="unsupported_subject_or_topic",
                    topic="pay_and_allowance",
                    review_tier="evidence_only",
                )
            return QuestionClassification(
                leave_type=leave_type,
                is_reinstatement="복직" in text,
                in_scope=True,
                intent="regular_service_allowance_review",
                topic="pay_and_allowance",
                review_tier="deep_review",
            )
        topic_matches = [
            (
                sum(term in text for term in terms),
                sum(len(term) for term in terms if term in text),
                topic,
            )
            for topic, terms in self._topic_terms.items()
            if any(term in text for term in terms)
        ]
        if topic_matches:
            topic = max(topic_matches)[2]
            if not matches or topic != "service_and_leave":
                if not self._enable_extended_topics:
                    return QuestionClassification(
                        leave_type=LeaveType.OUT_OF_SCOPE,
                        is_reinstatement="복직" in text,
                        in_scope=False,
                        intent="out_of_scope",
                        reason_code="unsupported_subject_or_topic",
                        topic=topic,
                        review_tier="evidence_only",
                    )
                return QuestionClassification(
                    leave_type=leave_type,
                    is_reinstatement="복직" in text,
                    in_scope=True,
                    intent="evidence_lookup",
                    topic=topic,
                    review_tier="evidence_only",
                )
        if not matches and any(
            term in text for term in self._all_personnel_evidence_terms
        ):
            if not self._enable_extended_topics:
                return QuestionClassification(
                    leave_type=LeaveType.OUT_OF_SCOPE,
                    is_reinstatement="복직" in text,
                    in_scope=False,
                    intent="out_of_scope",
                    reason_code="unsupported_subject_or_topic",
                    topic="all_personnel",
                    review_tier="evidence_only",
                )
            return QuestionClassification(
                leave_type=LeaveType.UNKNOWN,
                is_reinstatement="복직" in text,
                in_scope=True,
                intent="evidence_lookup",
                topic="all_personnel",
                review_tier="evidence_only",
            )
        if (
            not has_established_scope
            and not matches
            and not any(term in text for term in self._leave_signal)
            and not self._expands_to_leave_vocabulary(text)
        ):
            return QuestionClassification(
                leave_type=LeaveType.OUT_OF_SCOPE,
                is_reinstatement=False,
                in_scope=False,
                intent="out_of_scope",
                reason_code="no_supported_topic_signal",
            )
        intent = (
            "evidence_lookup"
            if any(term in text for term in self._evidence_task_markers)
            else "eligibility_review"
        )
        return QuestionClassification(
            leave_type=leave_type,
            is_reinstatement="복직" in text,
            in_scope=True,
            intent=intent,
            reason_code="ambiguous_leave_type" if len(matches) > 1 else None,
            topic="service_and_leave",
            review_tier="deep_review",
        )

    # 후속 턴은 유형 이름을 줄여 부른다. "가족돌봄은요?"에는 `휴직`이 없어 위의
    # `_leave_terms`가 잡지 못하고, 그러면 앞 턴의 유형이 그대로 남아 **묻지 않은
    # 유형의 조문으로 답한다.** 줄임말은 이미 lane이 정해진 뒤에만 해석한다
    # (`_classification_for`). 단발 질문에서 `질병`만으로 유형을 단정하지 않기 위해서다.
    _leave_aliases = {
        LeaveType.PARENTAL: ("육아",),
        LeaveType.MEDICAL: ("질병",),
        LeaveType.FAMILY_CARE: ("가족돌봄", "가족 돌봄"),
        LeaveType.SELF_DEVELOPMENT: ("자기개발", "자기 개발"),
    }

    def named_leave_types(self, text: str) -> tuple[LeaveType, ...]:
        """Leave types this turn names, counting the bare forms without 휴직.

        Returns every match. Two matches means the turn is ambiguous and the caller
        must not pick one; carrying the previous turn's type forward there would
        answer a question the user did not ask.
        """
        return tuple(
            leave_type
            for leave_type, terms in self._leave_aliases.items()
            if any(term in text for term in terms)
        )

    # "질병휴직는요?" "가족돌봄은요?" "그럼 자기개발은?" — 주어만 갈아끼운 발화의 어미.
    # 서술어가 없다는 것이 표지다. "되나요?" "며칠인가요?"는 앞 글자가 은/는/도가
    # 아니라 걸리지 않는다.
    _elliptical_tail = re.compile(r"[은는도]\s*요?\s*\?\s*$")

    def is_elliptical_followup(self, text: str) -> bool:
        """Whether this turn only swaps the subject of the question before it.

        Such a turn says nothing about the task, so the classifier reads it as a fresh
        eligibility review and starts asking conditions the user already got past.
        Reporting it here lets the caller carry the established task forward.

        A turn that names its own task ("…조문 찾아주세요", "…되나요?") is excluded even
        when the ending matches: it said what it wanted, so it is answered on its own
        terms rather than the previous turn's.
        """
        if not self._elliptical_tail.search(text):
            return False
        return not any(
            marker in text
            for marker in (*self._evidence_task_markers, *self._eligibility_task_markers)
        )

    def _expands_to_leave_vocabulary(self, text: str) -> bool:
        """Whether practitioner wording implies a 휴직 topic without naming one.

        This opens the scope gate only. ``leave_type`` deliberately stays UNKNOWN so the
        question is asked back: "애 키우느라 쉬겠다" makes it a leave question, but
        deciding it is 육아휴직 rather than 가족돌봄휴직 is the questioner's to state, and
        guessing wrong changes the whole conclusion rather than degrading it.
        """
        if self._transformer is None:
            return False
        return any(
            any(signal in term for signal in self._leave_signal)
            for term in self._transformer.expand(text)
        )
