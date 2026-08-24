from __future__ import annotations

import re
from calendar import monthrange
from collections.abc import Callable
from dataclasses import dataclass
from datetime import date, timedelta

from insaon.application.classification import QuestionClassification
from insaon.domain import (
    AnswerStatus,
    ConditionState,
    ConditionValue,
    DateRange,
    ExpectedAction,
    LeaveType,
    LocalRuleStatus,
)


class ConditionExtractor:
    # 날짜 경계에 `\b`를 쓰지 않는다. 한글 음절은 파이썬 정규식에서 `\w`라서
    # `2026-03-02입니다`처럼 조사가 공백 없이 붙으면 경계가 성립하지 않고 날짜를
    # 통째로 놓친다. 여기서 필요한 것은 "앞뒤로 숫자가 이어지지 않는다"뿐이므로
    # 숫자 전용 lookaround로 그 의도만 적는다.
    _iso_date = re.compile(r"(?<!\d)(20\d{2})-(\d{2})-(\d{2})(?!\d)")
    _korean_date = re.compile(r"(?<!\d)(20\d{2})년\s*(\d{1,2})월\s*(\d{1,2})일")
    _dotted_date = re.compile(
        r"(?<!\d)(20\d{2})\s*\.\s*(\d{1,2})\s*\.\s*(\d{1,2})(?:\s*\.)?"
    )
    _dated_reinstatement = re.compile(
        r"(?<!\d)(20\d{2})년\s*(\d{1,2})월\s*(\d{1,2})일(?:자)?\s*"
        r"(?:육아휴직(?:한|에서)?\s*)?복직"
    )
    _dotted_reinstatement = re.compile(
        r"(?<!\d)(20\d{2})\s*\.\s*(\d{1,2})\s*\.\s*(\d{1,2})(?:\s*\.)?\s*"
        r"(?:육아휴직(?:한|에서)?\s*)?복직"
    )
    _iso_reinstatement = re.compile(
        r"(?<!\d)(20\d{2})-(\d{2})-(\d{2})(?:자)?\s*"
        r"(?:육아휴직(?:한|에서)?\s*)?복직"
    )
    _half_year = re.compile(r"(?<!\d)(20\d{2})년(?:도)?\s*(상|하)반기")
    _month_end_leave_start = re.compile(
        r"(?<!\d)(20\d{2})년\s*(\d{1,2})월\s*(?:말일|말)(?:부터)?"
    )
    _korean_period = re.compile(
        r"(?<!\d)(20\d{2})년\s*(\d{1,2})월\s*(\d{1,2})일(?:부터|\s*~\s*)\s*"
        r"(?:(20\d{2})년\s*)?(\d{1,2})월\s*(\d{1,2})일(?:까지)?"
    )
    _iso_period = re.compile(
        r"(?<!\d)(20\d{2}-\d{2}-\d{2})(?:부터|\s*~\s*)\s*"
        r"(20\d{2}-\d{2}-\d{2})(?:까지)?"
    )
    _dotted_period = re.compile(
        r"(?<!\d)(20\d{2})\s*\.\s*(\d{1,2})\s*\.\s*(\d{1,2})(?:\s*\.)?\s*"
        r"(?:부터\s*(?:[~～∼–—-]\s*)?|[~～∼–—-]\s*)"
        r"(20\d{2})\s*\.\s*(\d{1,2})\s*\.\s*(\d{1,2})(?:\s*\.)?"
        r"(?:까지)?"
    )
    _prior_same_child_months = re.compile(
        r"(?:같은|동일)\s*자녀[^.]{0,30}?(?:기존|이전)[^.]{0,20}?(\d+)\s*개월"
    )
    _child_birth_patterns = (
        re.compile(
            r"자녀(?:의)?\s*(?:생년월일|출생일)(?:은|는|이|가|:)?\s*"
            r"(20\d{2})-(\d{2})-(\d{2})"
        ),
        re.compile(
            r"자녀(?:의)?\s*(?:생년월일|출생일)(?:은|는|이|가|:)?\s*"
            r"(20\d{2})년\s*(\d{1,2})월\s*(\d{1,2})일"
        ),
        re.compile(
            r"자녀(?:의)?\s*(?:생년월일|출생일)(?:은|는|이|가|:)?\s*"
            r"(20\d{2})\s*\.\s*(\d{1,2})\s*\.\s*(\d{1,2})(?:\s*\.)?"
        ),
        # 라벨 없이 날짜에 출생을 뜻하는 말이 붙는 형태. `2025년 3월 2일생`,
        # `2025. 3. 2. 태어났는데`, `2025-03-02 출생한 아이`처럼 쓴다.
        #
        # 뒤를 `(?![가-힣])`로 막으면 `2일생입니다`가 걸리지 않는다. 막아야 하는 것은
        # `생년월일` 한 가지이므로 그것만 배제한다.
        re.compile(
            r"(20\d{2})년\s*(\d{1,2})월\s*(\d{1,2})일\s*생(?!년)"
        ),
        re.compile(
            r"(20\d{2})[-.\s]\s*(\d{1,2})[-.\s]\s*(\d{1,2})\s*\.?\s*"
            r"(?:에\s*)?(?:태어|출생|출산)"
        ),
    )
    _previous_leave_none = re.compile(
        r"(?:같은|동일)?\s*자녀(?:의)?[^.\n]{0,25}?(?:기존|이전)"
        r"[^.\n]{0,20}?육아휴직[^.\n]{0,15}?(?:없|사용하지\s*않)"
    )
    # 라벨 표기(`돌봄 대상은 …`)와 실제 발화(`어머니를 돌보려고`)를 함께 읽는다. 라벨만
    # 읽으면 사용자가 이미 말한 사실을 되묻게 된다.
    _care_relation = re.compile(
        r"돌봄\s*대상(?:과의\s*관계)?(?:은|는|이|가|:)?\s*"
        r"(부모|부친|모친|배우자|자녀|조부모|손자녀|형제자매)"
    )
    _care_relation_words: tuple[tuple[str, tuple[str, ...]], ...] = (
        ("parent", ("부모", "부친", "모친", "아버지", "어머니", "아빠", "엄마", "장인", "장모", "시부", "시모")),
        ("spouse", ("배우자", "남편", "아내", "처", "와이프")),
        ("child", ("자녀", "아이", "아들", "딸")),
        ("grandparent", ("조부모", "할아버지", "할머니")),
        ("grandchild", ("손자녀", "손자", "손녀")),
        ("sibling", ("형제자매", "형", "누나", "언니", "오빠", "동생")),
    )
    _self_development_purpose = re.compile(
        r"(?:자기개발(?:휴직)?\s*)?(?:신청\s*)?목적(?:은|는|이|가|:)?\s*"
        r"([^.\n,]{2,60})"
    )
    # `목적은 …` 라벨이 없어도 목적을 말하는 표현들.
    _self_development_purpose_phrase = re.compile(
        r"([^.\n,]{2,40}?)\s*(?:을|를)?\s*"
        r"(?:위(?:해|하여)|하려고|하러|하기\s*위(?:해|하여))"
    )
    _medical_public_duty = re.compile(r"공무상|업무상|공상|공무\s*수행\s*중|직무\s*수행\s*중")
    _medical_non_public_duty = re.compile(r"비공무상|개인\s*질병|사적|일반\s*질병")

    def extract(
        self, text: str, classification: QuestionClassification
    ) -> tuple[ConditionValue, ...]:
        values: list[ConditionValue] = []
        # 이 턴이 어떤 과업이었는지를 대화에 남긴다. 사용자가 주장한 사실이 아니라
        # 요청의 종류이므로 화면의 조건 목록(`visibleConditionNames`)에는 넣지 않는다.
        # 남기지 않으면 "질병휴직는요?"가 앞 턴이 근거 검색이었다는 사실을 잃는다.
        if classification.in_scope:
            values.append(
                ConditionValue(
                    "task",
                    classification.intent,
                    ConditionState.CONFIRMED,
                    "question_classifier",
                )
            )
        derived_pay = classification.intent == "regular_service_allowance_review"
        derived_followup = any(
            marker in text
            for marker in (
                "같은 자녀",
                "동일 자녀",
                "연봉제 대상",
                "봉급 지급",
                "제외기간",
            )
        )
        if derived_pay:
            values.extend(
                (
                    ConditionValue(
                        "leave_type",
                        classification.leave_type.value,
                        ConditionState.CONFIRMED,
                        "question_classifier",
                    ),
                    ConditionValue(
                        "allowance_type",
                        "regular_service_allowance",
                        ConditionState.CONFIRMED,
                        "question_classifier",
                    ),
                )
            )
        elif classification.review_tier == "evidence_only":
            values.append(
                ConditionValue(
                    "topic",
                    classification.topic,
                    ConditionState.CONFIRMED,
                    "question_classifier",
                )
            )
        elif classification.leave_type is not LeaveType.UNKNOWN:
            values.append(
                ConditionValue(
                    "leave_type",
                    classification.leave_type.value,
                    ConditionState.CONFIRMED,
                    "question_classifier",
                )
            )
        else:
            values.append(
                ConditionValue(
                    "leave_type", None, ConditionState.UNKNOWN, "question_classifier"
                )
            )
        half_year = self._half_year.search(text) if derived_pay else None
        if half_year:
            year = int(half_year.group(1))
            first_half = half_year.group(2) == "상"
            values.extend(
                (
                    ConditionValue(
                        "allowance_period",
                        "first_half" if first_half else "second_half",
                        ConditionState.CONFIRMED,
                        "question_text",
                    ),
                    ConditionValue(
                        "reference_date",
                        date(year, 7, 1) if first_half else date(year + 1, 1, 1),
                        ConditionState.CONFIRMED,
                        "derived_payment_date",
                    ),
                )
            )
        else:
            self._append_reference_date(values, text)

        period_match_count = (
            self._period_match_count(text) if derived_pay or derived_followup else 0
        )
        leave_period = self._period(text) if period_match_count == 1 else None
        reinstatement = self._reinstatement_match(text)
        if derived_pay and reinstatement:
            try:
                value = date(*(int(part) for part in reinstatement.groups()))
                state = (
                    ConditionState.CONFLICT
                    if leave_period is not None
                    and leave_period.end is not None
                    and leave_period.end != value
                    else ConditionState.CONFIRMED
                )
                values.append(
                    ConditionValue(
                        "reinstatement_date",
                        value,
                        state,
                        "question_text",
                    )
                )
            except ValueError:
                values.append(
                    ConditionValue(
                        "reinstatement_date",
                        None,
                        ConditionState.CONFLICT,
                        "question_text",
                    )
                )
        elif (
            derived_pay
            and leave_period is not None
            and leave_period.end is not None
            and period_match_count == 1
            and self._describes_completed_reinstatement(text)
        ):
            values.append(
                ConditionValue(
                    "reinstatement_date",
                    leave_period.end,
                    ConditionState.CONFIRMED,
                    "derived_leave_period_end",
                )
            )
        elif derived_pay:
            values.append(
                ConditionValue("reinstatement_date", None, ConditionState.UNKNOWN, "question_text")
            )

        if derived_pay or derived_followup:
            values.extend(
                self._extract_regular_allowance_facts(
                    text, leave_period=leave_period
                )
            )
        if classification.leave_type is LeaveType.PARENTAL:
            child_birth = self._child_birth_date(text)
            if child_birth is not None:
                child_birth_value, child_birth_state = child_birth
                values.append(
                    ConditionValue(
                        "child_birth_date",
                        child_birth_value,
                        child_birth_state,
                        "question_text",
                    )
                )
            elif "자녀" in text:
                values.append(
                    ConditionValue(
                        "child_birth_date", None, ConditionState.UNKNOWN, "question_text"
                    )
                )
            previous_periods = self._previous_parental_leave_periods(text)
            if previous_periods is not None:
                values.append(
                    ConditionValue(
                        "previous_leave_periods",
                        previous_periods,
                        ConditionState.CONFIRMED,
                        "question_text",
                    )
                )
        if classification.leave_type is LeaveType.MEDICAL:
            # 비공무상 판정을 먼저 본다. `비공무상`은 `공무상`을 부분 문자열로 품는다.
            basis = None
            if self._medical_non_public_duty.search(text):
                basis = "non_public_duty"
            elif self._medical_public_duty.search(text):
                basis = "public_duty"
            values.append(
                ConditionValue(
                    "medical_leave_basis",
                    basis,
                    ConditionState.CONFIRMED if basis else ConditionState.UNKNOWN,
                    "question_text",
                )
            )
        if classification.leave_type is LeaveType.FAMILY_CARE:
            relation = self._care_relation.search(text)
            resolved = (
                self._canonical_care_relation(relation.group(1))
                if relation
                else self._care_relation_from_wording(text)
            )
            if resolved:
                values.append(
                    ConditionValue(
                        "care_recipient_relation",
                        resolved,
                        ConditionState.CONFIRMED,
                        "question_text",
                    )
                )
        if classification.leave_type is LeaveType.SELF_DEVELOPMENT:
            purpose = self._self_development_purpose.search(
                text
            ) or self._self_development_purpose_phrase.search(text)
            if purpose:
                values.append(
                    ConditionValue(
                        "application_purpose",
                        purpose.group(1).strip(),
                        ConditionState.CONFIRMED,
                        "question_text",
                    )
                )
        return tuple(values)

    def _care_relation_from_wording(self, text: str) -> str | None:
        """`돌봄 대상은 …` 라벨 없이 관계를 말한 경우를 읽는다.

        가장 먼저 등장하는 관계어를 쓴다. 두 관계가 함께 나오면(예: "부모와 배우자")
        어느 쪽이 대상인지 문장만으로 정할 수 없으므로 읽지 않고 되묻는다.

        관계어끼리 서로를 부분 문자열로 품는다. `조부모`는 `부모`를, `손자녀`는 `자녀`를
        포함하므로 단순 포함 검사로는 "조부모 간병"이 조부모·부모 둘 다로 잡혀 모호로
        판정됐다. 더 긴 일치에 삼켜진 짧은 일치는 버린다.
        """
        spans = [
            (match.start(), match.end(), relation)
            for relation, words in self._care_relation_words
            for word in words
            if (match := re.search(re.escape(word), text)) is not None
        ]
        kept = [
            (start, relation)
            for start, end, relation in spans
            if not any(
                other_start <= start and end <= other_end and (other_end - other_start) > (end - start)
                for other_start, other_end, _ in spans
            )
        ]
        if not kept or len({relation for _, relation in kept}) > 1:
            return None
        return min(kept)[1]

    def _append_reference_date(
        self, values: list[ConditionValue], text: str
    ) -> None:
        matches = sorted(
            (
                match
                for pattern in (self._iso_date, self._korean_date, self._dotted_date)
                for match in pattern.finditer(text)
            ),
            key=lambda item: item.start(),
        )
        match = next(
            (
                item
                for item in matches
                if not self._date_is_non_reference_fact(text, item)
            ),
            None,
        )
        if match:
            try:
                value = date(*(int(part) for part in match.groups()))
                values.append(
                    ConditionValue(
                        "reference_date",
                        value,
                        ConditionState.CONFIRMED,
                        "question_text",
                    )
                )
            except ValueError:
                values.append(
                    ConditionValue(
                        "reference_date", None, ConditionState.CONFLICT, "question_text"
                    )
                )
        else:
            values.append(
                ConditionValue(
                    "reference_date", None, ConditionState.UNKNOWN, "question_text"
                )
            )

    def _child_birth_date(
        self, text: str
    ) -> tuple[date | None, ConditionState] | None:
        match = None
        for pattern in self._child_birth_patterns:
            match = pattern.search(text)
            if match is not None:
                break
        if match is None:
            return None
        try:
            return date(*(int(part) for part in match.groups())), ConditionState.CONFIRMED
        except ValueError:
            return None, ConditionState.CONFLICT

    def _previous_parental_leave_periods(
        self, text: str
    ) -> tuple[DateRange, ...] | None:
        if self._previous_leave_none.search(text):
            return ()
        if re.search(r"(?:기존|이전)[^.\n]{0,25}?육아휴직", text):
            period = self._period(text)
            if period is not None:
                return (period,)
        return None

    @classmethod
    def _date_is_non_reference_fact(cls, text: str, match: re.Match[str]) -> bool:
        """Whether this date already belongs to another field.

        자녀 생년월일을 알아보는 정규식이 두 벌 있었다. 필드 추출은 넓은
        `_child_birth_patterns`를 쓰고, 여기서는 `자녀 생년월일:` 형태만 걸러내는 좁은
        접두사 정규식을 따로 갖고 있었다. 두 벌이 어긋나면 그 차이만큼 생년월일이
        **질문 기준일로 샌다** — `자녀가 2025년 3월 2일생인데 육아휴직 얼마나 쓸 수
        있나요?`가 2025-03-02 시점의 법령으로 판단됐고, 화면에는 되묻지도 않고 답이
        떴다. 넓은 쪽이 커질 때마다 이 구멍도 같이 커진다.

        그래서 필드가 실제로 쓰는 패턴의 span을 그대로 본다. 한 벌만 유지한다.
        """
        for pattern in (
            cls._korean_period,
            cls._iso_period,
            cls._dotted_period,
            cls._dated_reinstatement,
            cls._dotted_reinstatement,
            cls._iso_reinstatement,
            *cls._child_birth_patterns,
        ):
            if any(
                candidate.start() <= match.start() < candidate.end()
                for candidate in pattern.finditer(text)
            ):
                return True
        prefix = text[max(0, match.start() - 35) : match.start()]
        return bool(
            re.search(
                r"자녀(?:의)?\s*(?:생년월일|출생일)(?:은|는|이|가|:)?\s*$",
                prefix,
            )
        )

    @staticmethod
    def _canonical_care_relation(value: str) -> str:
        return {
            "부친": "parent",
            "모친": "parent",
            "부모": "parent",
            "배우자": "spouse",
            "자녀": "child",
            "조부모": "grandparent",
            "손자녀": "grandchild",
            "형제자매": "sibling",
        }[value]

    def _extract_regular_allowance_facts(
        self, text: str, *, leave_period: DateRange | None = None
    ) -> tuple[ConditionValue, ...]:
        values: list[ConditionValue] = []
        leave_period = leave_period or (
            self._period(text) if self._period_match_count(text) == 1 else None
        )
        if leave_period is not None:
            values.append(
                ConditionValue(
                    "leave_periods",
                    (leave_period,),
                    ConditionState.CONFIRMED,
                    "question_text",
                )
            )
        prior = self._prior_same_child_months.search(text)
        if prior:
            values.append(
                ConditionValue(
                    "prior_same_child_leave_months",
                    int(prior.group(1)),
                    ConditionState.CONFIRMED,
                    "question_text",
                )
            )
        elif re.search(r"(?:같은|동일)\s*자녀[^.]{0,30}?(?:기존|이전)[^.]{0,20}?없", text):
            values.append(
                ConditionValue(
                    "prior_same_child_leave_months",
                    0,
                    ConditionState.CONFIRMED,
                    "question_text",
                )
            )

        salary_line = self._fact_line(text, "봉급")
        if (
            salary_line is not None
            and "재직" in salary_line
            and not self._has_unanswered_choice(salary_line)
        ):
            salary_paid = not bool(
                re.search(r"봉급[^.\n]{0,15}?(?:미지급|안\s*지급|아니오)", salary_line)
            )
            values.append(
                ConditionValue(
                    "salary_on_payment_date",
                    salary_paid,
                    ConditionState.CONFIRMED,
                    "question_text",
                )
            )
        discipline_line = self._fact_line(text, "징계")
        if discipline_line is not None and not self._has_unanswered_choice(
            discipline_line
        ):
            no_discipline = bool(
                re.search(r"징계[^.\n]{0,35}?(?:없|받지\s*않)", discipline_line)
            )
            values.append(
                ConditionValue(
                    "disciplinary_action_in_period",
                    not no_discipline,
                    ConditionState.CONFIRMED,
                    "question_text",
                )
            )
        other_period_line = self._fact_line(text, "제외기간") or self._fact_line(
            text, "직위해제"
        )
        if other_period_line is not None and not self._has_unanswered_choice(
            other_period_line
        ):
            no_other_period = bool(
                re.search(
                    r"(?:제외기간|직위해제)[^.\n]{0,35}?없",
                    other_period_line,
                )
                or re.search(
                    r"직위해제[^.\n]{0,25}?같은\s*제외기간\s*없",
                    other_period_line,
                )
            )
            if no_other_period:
                values.append(
                    ConditionValue(
                        "other_nonservice_periods",
                        (),
                        ConditionState.CONFIRMED,
                        "question_text",
                    )
                )
        annual_salary_line = self._fact_line(text, "연봉제")
        if annual_salary_line is not None and not self._has_unanswered_choice(
            annual_salary_line
        ):
            not_excluded = bool(
                re.search(
                    r"연봉제[^.\n]{0,45}?(?:아님|아니오|아니|아닙)",
                    annual_salary_line,
                )
            )
            excluded = bool(
                re.search(
                    r"연봉제[^.\n]{0,35}?(?:대상이야|대상임|대상입니다|해당|:\s*예)",
                    annual_salary_line,
                )
            )
            if not_excluded or excluded:
                values.append(
                    ConditionValue(
                        "annual_salary_exclusion_applies",
                        excluded and not not_excluded,
                        ConditionState.CONFIRMED,
                        "question_text",
                    )
                )
        child_order = None
        for marker, order in (("셋째", 3), ("둘째", 2), ("첫째", 1)):
            if marker in text:
                child_order = order
                break
        if child_order is not None:
            values.append(
                ConditionValue(
                    "child_order",
                    child_order,
                    ConditionState.CONFIRMED,
                    "question_text",
                )
            )
        if any(marker in text for marker in ("부모 모두 3개월", "한부모", "장애 자녀")):
            values.append(
                ConditionValue(
                    "expanded_parental_leave_eligibility",
                    True,
                    ConditionState.CONFIRMED,
                    "question_text",
                )
            )
        elif "확대 요건 없음" in text:
            values.append(
                ConditionValue(
                    "expanded_parental_leave_eligibility",
                    False,
                    ConditionState.CONFIRMED,
                    "question_text",
                )
            )
        return tuple(values)

    @staticmethod
    def _fact_line(text: str, marker: str) -> str | None:
        return next((line for line in text.splitlines() if marker in line), None)

    @staticmethod
    def _has_unanswered_choice(text: str) -> bool:
        return bool(
            re.search(r"예\s*/\s*아니오|있음\s*/\s*없음|__", text)
        )

    def _period(self, text: str) -> DateRange | None:
        korean = self._korean_period.search(text)
        try:
            if korean:
                start_year, start_month, start_day, end_year, end_month, end_day = (
                    korean.groups()
                )
                start = date(int(start_year), int(start_month), int(start_day))
                end = date(
                    int(end_year or start_year),
                    int(end_month),
                    int(end_day),
                )
                return DateRange(start, end + timedelta(days=1))
            iso = self._iso_period.search(text)
            if iso:
                return DateRange(
                    date.fromisoformat(iso.group(1)),
                    date.fromisoformat(iso.group(2)) + timedelta(days=1),
                )
            dotted = self._dotted_period.search(text)
            if dotted:
                (
                    start_year,
                    start_month,
                    start_day,
                    end_year,
                    end_month,
                    end_day,
                ) = dotted.groups()
                return DateRange(
                    date(int(start_year), int(start_month), int(start_day)),
                    date(int(end_year), int(end_month), int(end_day))
                    + timedelta(days=1),
                )
            month_end = self._month_end_leave_start.search(text)
            reinstatement = self._reinstatement_match(text)
            if month_end and reinstatement:
                start_year, start_month = (int(part) for part in month_end.groups())
                start = date(
                    start_year,
                    start_month,
                    monthrange(start_year, start_month)[1],
                )
                end = date(*(int(part) for part in reinstatement.groups()))
                if start < end:
                    return DateRange(start, end)
        except ValueError:
            return None
        return None

    def _reinstatement_match(self, text: str) -> re.Match[str] | None:
        return (
            self._dated_reinstatement.search(text)
            or self._dotted_reinstatement.search(text)
            or self._iso_reinstatement.search(text)
        )

    def _period_match_count(self, text: str) -> int:
        count = sum(
            len(tuple(pattern.finditer(text)))
            for pattern in (
                self._korean_period,
                self._iso_period,
                self._dotted_period,
            )
        )
        if self._month_end_leave_start.search(text) and self._reinstatement_match(text):
            count += 1
        return count

    @staticmethod
    def _describes_completed_reinstatement(text: str) -> bool:
        return bool(
            re.search(
                r"(?:복직자|복직한|복직했|복직하여|복직해|휴직\s*후\s*복직)",
                text,
            )
        )


# 기준일을 오늘로 두는 가정이 속한 profile. 다른 통상값이 하나도 없는 lane에도
# 붙는다 — 가정을 하나라도 하면 그것이 어느 승인된 profile의 것인지 말해야 한다.
_REFERENCE_DATE_PROFILE = "reference-date-today-v1"


@dataclass(frozen=True)
class ConditionRequirements:
    """Fields that must be supplied or covered by an approved normal-case profile."""

    core_fields: tuple[str, ...]
    normal_case_defaults: tuple[tuple[str, object], ...] = ()
    assumption_profile_id: str | None = None

    @property
    def required_fields(self) -> tuple[str, ...]:
        return self.core_fields + tuple(
            field_name for field_name, _ in self.normal_case_defaults
        )


class ConditionPolicy:
    version = "condition-policy-0.2.0"

    _regular_allowance_normal_defaults: tuple[tuple[str, object], ...] = (
        ("prior_same_child_leave_months", 0),
        ("salary_on_payment_date", True),
        ("disciplinary_action_in_period", False),
        ("other_nonservice_periods", ()),
        ("annual_salary_exclusion_applies", False),
    )

    # 육아휴직 심층 검토의 통상 상태. 같은 사실을 정근수당 lane에서는 이미
    # `prior_same_child_leave_months = 0`으로 가정하면서 여기서는 매번 물었다. 한쪽에서
    # 통상값으로 두는 사실을 다른 쪽에서 필수로 요구할 이유가 없다.
    #
    # 자녀 생년월일은 넣지 않는다. 통상값이 있는 상태가 아니라 기간 상한을 직접 정하는
    # 값이고, 가정할 수 있는 "정상적인 생년월일"이라는 것이 없다.
    _parental_normal_defaults: tuple[tuple[str, object], ...] = (
        ("previous_leave_periods", ()),
    )

    def requirements(
        self,
        leave_type: LeaveType,
        intent: str,
        review_tier: str = "deep_review",
    ) -> ConditionRequirements:
        """Separate decisive facts from explicitly approved normal assumptions.

        A missing decisive fact is always asked. Normal defaults exist only for a
        reviewed question profile; there is deliberately no global "no exception"
        fallback for unknown topics.
        """

        if review_tier == "evidence_only":
            return ConditionRequirements(
                ("reference_date",),
                assumption_profile_id=_REFERENCE_DATE_PROFILE,
            )
        if (
            intent == "regular_service_allowance_review"
            and leave_type is LeaveType.PARENTAL
        ):
            return ConditionRequirements(
                core_fields=(
                    "leave_type",
                    "allowance_type",
                    "allowance_period",
                    "reference_date",
                    "reinstatement_date",
                    "leave_periods",
                ),
                normal_case_defaults=self._regular_allowance_normal_defaults,
                assumption_profile_id="regular-service-allowance-normal-v1",
            )
        common = ("leave_type", "reference_date")
        if intent == "evidence_lookup":
            return ConditionRequirements(common)
        if leave_type is LeaveType.PARENTAL:
            return ConditionRequirements(
                core_fields=common + ("child_birth_date",),
                normal_case_defaults=self._parental_normal_defaults,
                assumption_profile_id="parental-leave-normal-v1",
            )
        # 나머지 세 유형에는 통상값이 없다. 공무상·비공무상, 돌봄 대상과의 관계,
        # 자기개발 목적은 "정상 상태"가 아니라 어느 조문을 적용할지 자체를 가르는
        # 분류값이다. 기본값을 두면 근거 조문이 통째로 바뀐다.
        detail = {
            LeaveType.MEDICAL: ("medical_leave_basis",),
            LeaveType.FAMILY_CARE: ("care_recipient_relation",),
            LeaveType.SELF_DEVELOPMENT: ("application_purpose",),
        }.get(leave_type, ())
        return ConditionRequirements(common + detail)

    def required_fields(
        self,
        leave_type: LeaveType,
        intent: str,
        review_tier: str = "deep_review",
    ) -> tuple[str, ...]:
        return self.requirements(leave_type, intent, review_tier).required_fields

    def normal_case_defaults(
        self,
        leave_type: LeaveType,
        intent: str,
        review_tier: str = "deep_review",
    ) -> tuple[tuple[str, object], ...]:
        return self.requirements(
            leave_type, intent, review_tier
        ).normal_case_defaults

    def assumption_profile_id(
        self,
        leave_type: LeaveType,
        intent: str,
        review_tier: str = "deep_review",
    ) -> str | None:
        return self.requirements(
            leave_type, intent, review_tier
        ).assumption_profile_id


@dataclass(frozen=True)
class QuestionDecision:
    action: ExpectedAction
    answer_status: AnswerStatus
    missing_fields: tuple[str, ...] = ()
    reason_codes: tuple[str, ...] = ()


class QuestionPolicy:
    def __init__(
        self,
        condition_policy: ConditionPolicy | None = None,
        *,
        today: Callable[[], date] = date.today,
    ) -> None:
        self._condition_policy = condition_policy or ConditionPolicy()
        self._today = today

    def decide(
        self,
        classification: QuestionClassification,
        conditions: tuple[ConditionValue, ...],
        local_rule_status: LocalRuleStatus = LocalRuleStatus.UNCONFIRMED,
    ) -> QuestionDecision:
        if not classification.in_scope:
            return QuestionDecision(
                ExpectedAction.ABSTAIN,
                AnswerStatus.INSUFFICIENT_EVIDENCE,
                reason_codes=(classification.reason_code or "out_of_scope",),
            )
        conditions, _ = self.apply_normal_case_assumptions(
            classification, conditions
        )
        required = self._condition_policy.required_fields(
            classification.leave_type,
            classification.intent,
            classification.review_tier,
        )
        by_name = {condition.field_name: condition for condition in conditions}
        missing = tuple(
            field
            for field in required
            if field not in by_name
            or by_name[field].state in {ConditionState.UNKNOWN, ConditionState.CONFLICT}
        )
        if not missing and classification.intent == "regular_service_allowance_review":
            leave_periods = by_name["leave_periods"].value
            prior_months = by_name["prior_same_child_leave_months"].value
            if (
                isinstance(leave_periods, tuple)
                and isinstance(prior_months, int)
                and prior_months + _period_months(leave_periods) > 12
            ):
                child_order = by_name.get("child_order")
                if child_order is None or child_order.state is not ConditionState.CONFIRMED:
                    missing = ("child_order",)
                elif isinstance(child_order.value, int) and child_order.value < 3:
                    expanded = by_name.get("expanded_parental_leave_eligibility")
                    if expanded is None or expanded.state is not ConditionState.CONFIRMED:
                        missing = ("expanded_parental_leave_eligibility",)
        if missing:
            return QuestionDecision(
                ExpectedAction.ASK,
                AnswerStatus.REVIEW_REQUIRED,
                missing_fields=missing,
                reason_codes=("required_conditions_missing",),
            )
        if classification.review_tier == "evidence_only":
            return QuestionDecision(
                ExpectedAction.ANSWER,
                AnswerStatus.REVIEW_REQUIRED,
                reason_codes=("evidence_only_human_review",),
            )
        if local_rule_status is LocalRuleStatus.UNCONFIRMED:
            return QuestionDecision(
                ExpectedAction.ANSWER,
                AnswerStatus.REVIEW_REQUIRED,
                reason_codes=("local_rule_unconfirmed",),
            )
        return QuestionDecision(ExpectedAction.ANSWER, AnswerStatus.ANSWERABLE)

    def apply_normal_case_assumptions(
        self,
        classification: QuestionClassification,
        conditions: tuple[ConditionValue, ...],
    ) -> tuple[tuple[ConditionValue, ...], tuple[str, ...]]:
        """Apply only the defaults registered for this exact question profile.

        Confirmed facts and conflicts always win. Returned assumption field names
        let the answer and UI disclose the temporary defaults without persisting
        them as user-confirmed session facts.
        """

        if not classification.in_scope:
            return conditions, ()
        defaults = self._condition_policy.normal_case_defaults(
            classification.leave_type,
            classification.intent,
            classification.review_tier,
        )
        merged = {condition.field_name: condition for condition in conditions}
        assumed: list[str] = []
        for field_name, value in defaults:
            current = merged.get(field_name)
            if current is not None and current.state in {
                ConditionState.CONFIRMED,
                ConditionState.CONFLICT,
            }:
                continue
            merged[field_name] = ConditionValue(
                field_name,
                value,
                ConditionState.CONFIRMED,
                "normal_case_assumption",
            )
            assumed.append(field_name)
        # 이 lane이 실제로 요구하는 필드일 때만 채운다. 요구하지 않는 필드에 가정을 붙이면
        # 화면에 쓰이지도 않는 "가정" 줄이 뜬다. 휴직 심층 검토는 복직일을 보지 않는다.
        required = self._condition_policy.required_fields(
            classification.leave_type,
            classification.intent,
            classification.review_tier,
        )
        if "reinstatement_date" in required:
            derived = self._assumed_reinstatement_date(merged)
            if derived is not None:
                merged["reinstatement_date"] = derived
                assumed.append("reinstatement_date")
        # 기준일의 통상값은 오늘이다. FAQ는 "징계 시효 몇 년이에요?"처럼 날짜 없이
        # 오고, 넓은 lane에서는 빠진 것이 기준일 하나뿐이라 그 되묻기가 곧 막다른
        # 길이었다. 과거 기준일 질의는 이미 지원 범위가 아니므로(README 한계) 여기서
        # 통상값이 될 수 있는 유일한 값이 오늘이며, 명시하면 그 값이 이긴다.
        #
        # 심층 검토에는 걸지 않는다. 그쪽은 자녀 생년월일·공무상 구분 같은 결정적
        # 사실을 어차피 함께 묻고, 기준일은 그 한 번의 되묻기에 얹히므로 막다른 길이
        # 아니다. 결론을 만드는 lane에서 날짜를 조용히 채우는 것은 다른 문제다.
        if classification.review_tier == "evidence_only" and "reference_date" in required:
            current = merged.get("reference_date")
            if current is None or current.state not in {
                ConditionState.CONFIRMED,
                ConditionState.CONFLICT,
            }:
                merged["reference_date"] = ConditionValue(
                    "reference_date",
                    self._today(),
                    ConditionState.CONFIRMED,
                    "normal_case_assumption",
                )
                assumed.append("reference_date")
        return tuple(merged[key] for key in sorted(merged)), tuple(assumed)

    @staticmethod
    def _assumed_reinstatement_date(
        merged: dict[str, ConditionValue],
    ) -> ConditionValue | None:
        """휴직 종료일이 확정이면 복직일을 통상값으로 채운다.

        종전에는 문장에 `복직자`·`복직한` 같은 말이 있을 때만 파생했다. 같은 사실을
        "2025. 4. 1 ~ 2026. 3. 31 육아휴직자"라고 쓰면 종료일을 알고 있으면서도 복직일을
        되물었다. 계산되는 값을 어휘 때문에 묻는 것이다.

        확정이 아니라 가정으로 둔다. 휴직이 끝났다고 반드시 복직한 것은 아니다. 연장했거나
        다른 휴직으로 이어졌거나 퇴직했을 수 있다. 가정이므로 화면에 표시되고 상태 상한이
        걸리며 명시값이 들어오면 물러난다(ADR-0016).
        """
        current = merged.get("reinstatement_date")
        if current is not None and current.state in {
            ConditionState.CONFIRMED,
            ConditionState.CONFLICT,
        }:
            return None
        periods = merged.get("leave_periods")
        if periods is None or periods.state is not ConditionState.CONFIRMED:
            return None
        value = periods.value
        if not isinstance(value, tuple) or len(value) != 1:
            return None
        end = getattr(value[0], "end", None)
        if not isinstance(end, date):
            return None
        return ConditionValue(
            "reinstatement_date",
            end,
            ConditionState.CONFIRMED,
            "normal_case_assumption",
        )

    def assumption_profile_id(
        self, classification: QuestionClassification
    ) -> str | None:
        if not classification.in_scope:
            return None
        return self._condition_policy.assumption_profile_id(
            classification.leave_type,
            classification.intent,
            classification.review_tier,
        )


def _period_months(periods: tuple[object, ...]) -> int:
    total = 0
    for period in periods:
        if not isinstance(period, DateRange) or period.end is None:
            continue
        cursor = period.start
        while True:
            year = cursor.year + (cursor.month // 12)
            month = cursor.month % 12 + 1
            try:
                next_month = cursor.replace(year=year, month=month)
            except ValueError:
                next_month = cursor.replace(year=year, month=month, day=28)
            if next_month > period.end:
                break
            cursor = next_month
            total += 1
        if (period.end - cursor).days >= 15:
            total += 1
    return total
