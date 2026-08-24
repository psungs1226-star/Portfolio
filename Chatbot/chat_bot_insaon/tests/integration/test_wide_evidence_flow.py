from datetime import date

from insaon.adapters.source import CandidateEvidenceCorpus
from insaon.api.reviews import InMemoryReviewSessionStore, ReviewApiService
from insaon.application.factory import build_offline_review_service
from insaon.application.review import ReviewCommand
from insaon.domain import AnswerStatus, Claim, DateRange, Provision, ReviewDraft


def test_wide_evidence_question_returns_candidate_citations_without_a_final_decision() -> None:
    source_id = "RULE-LOCAL-PERFORMANCE-OFFICIAL"
    corpus = CandidateEvidenceCorpus(
        provisions=(
            Provision(
                provision_id=f"{source_id}:article:8",
                source_id=source_id,
                article_path="제8조 제1항",
                title="[지방공무원 평정규칙] 근무성적평정",
                text="근무성적평정은 평정대상기간의 근무실적과 직무수행능력을 대상으로 한다.",
                valid_time=DateRange(date(2026, 6, 30)),
                applies_to=frozenset({"local_general_service"}),
                topic_tags=frozenset({"performance_and_promotion"}),
                source_hash="a" * 64,
            ),
        ),
        source_names={source_id: "지방공무원 평정규칙"},
        source_urls={source_id: "https://www.law.go.kr/LSW/lsInfoR.do?lsiSeq=287747"},
        source_review_tiers={source_id: "evidence_only"},
        topic_source_ids={"performance_and_promotion": frozenset({source_id})},
        candidate_status="pending_human_approval",
        data_as_of=date(2026, 8, 3),
    )
    service = build_offline_review_service(evidence_corpus=corpus)

    answer = service.handle(
        ReviewCommand(
            request_id="WIDE-EVIDENCE",
            question_text="2026-08-01 승진 평정 기준 근거를 찾아주세요",
        )
    )

    assert answer.status is AnswerStatus.REVIEW_REQUIRED
    assert answer.citations
    assert answer.citations[0].source_name == "지방공무원 평정규칙"
    assert answer.citations[0].source_url.startswith("https://www.law.go.kr/")
    assert "topic" in answer.confirmed_conditions
    assert "candidate_corpus_unapproved" in answer.review_reasons
    assert "최종" not in answer.short_answer


def test_wide_evidence_question_assumes_today_instead_of_asking_for_the_date() -> None:
    """FAQ는 날짜 없이 온다. 여기서 되묻는 것은 곧 막다른 길이었다.

    넓은 lane은 빠진 것이 기준일 하나뿐이라, 그 되묻기가 사용자에게는 "아무것도
    답하지 못한다"로 보였다. 과거 기준일 질의는 지원 범위가 아니므로 통상값이 될 수
    있는 값은 오늘뿐이다(ADR-0026). 가정한 사실은 답변에 실어 숨기지 않는다.
    """
    service = build_offline_review_service()

    for index, question in enumerate(
        ("승진 평정 기준 근거", "징계 소청 절차 조문"), start=1
    ):
        answer = service.handle(
            ReviewCommand(
                request_id=f"WIDE-MISSING-DATE-{index}",
                question_text=question,
            )
        )

        assert answer.missing_conditions == ()
        assert answer.citations, "기준일을 가정했으면 근거까지 가야 한다"
        assert answer.assumed_conditions == ("reference_date",)
        assert answer.assumption_profile_id == "reference-date-today-v1"
        assert "normal_case_assumptions_applied" in answer.review_reasons
        # 가정은 상태를 올리지 못한다(ADR-0016).
        assert answer.status is AnswerStatus.REVIEW_REQUIRED


def test_wide_evidence_followup_date_keeps_topic_and_does_not_ask_leave_type() -> None:
    source_id = "RULE-LOCAL-PERFORMANCE-FOLLOWUP"
    corpus = CandidateEvidenceCorpus(
        provisions=(
            Provision(
                provision_id=f"{source_id}:article:8",
                source_id=source_id,
                article_path="제8조 제1항",
                title="[지방공무원 평정규칙] 근무성적평정",
                text="근무성적평정은 근무실적과 직무수행능력을 대상으로 한다.",
                valid_time=DateRange(date(2026, 6, 30)),
                applies_to=frozenset({"local_general_service"}),
                topic_tags=frozenset({"performance_and_promotion"}),
                source_hash="d" * 64,
            ),
        ),
        source_names={source_id: "지방공무원 평정규칙"},
        source_urls={source_id: "https://www.law.go.kr/LSW/lsInfoR.do?lsiSeq=287747"},
        source_review_tiers={source_id: "evidence_only"},
        topic_source_ids={"performance_and_promotion": frozenset({source_id})},
        candidate_status="pending_human_approval",
        data_as_of=date(2026, 8, 4),
    )
    service = ReviewApiService(
        build_offline_review_service(evidence_corpus=corpus),
        InMemoryReviewSessionStore(),
    )
    session_id, first = service.create(
        question_text="승진 평정 기준 근거를 찾아주세요",
        idempotency_key="WIDE-FOLLOWUP-FIRST",
        local_rule_checked=False,
    )
    _, second = service.message(
        session_id,
        question_text="질문 기준일은 2026년 8월 4일입니다.",
        idempotency_key="WIDE-FOLLOWUP-SECOND",
        local_rule_checked=False,
    )

    # 1턴은 기준일을 가정해 이미 답한다. 2턴의 명시 기준일이 그 가정을 덮는다.
    assert first.assumed_conditions == ("reference_date",)
    assert second.missing_conditions == ()
    assert second.assumed_conditions == ()
    assert set(second.confirmed_conditions) == {"topic", "reference_date"}
    assert "leave_type" not in second.confirmed_conditions
    assert second.citations
    assert second.citations[0].source_name == "지방공무원 평정규칙"


def test_generic_personnel_regulation_query_searches_all_evidence_topics() -> None:
    source_id = "RULE-LOCAL-DISCIPLINE-ALL"
    corpus = CandidateEvidenceCorpus(
        provisions=(
            Provision(
                provision_id=f"{source_id}:article:1",
                source_id=source_id,
                article_path="제1조",
                title="[지방공무원 징계규칙] 목적",
                text="이 규칙은 지방공무원 징계 기준을 정함을 목적으로 한다.",
                valid_time=DateRange(date(2026, 1, 1)),
                applies_to=frozenset({"local_general_service"}),
                topic_tags=frozenset({"discipline_and_appeal"}),
                source_hash="e" * 64,
            ),
        ),
        source_names={source_id: "지방공무원 징계규칙"},
        source_urls={source_id: "https://www.law.go.kr/법령/지방공무원징계규칙"},
        source_review_tiers={source_id: "evidence_only"},
        topic_source_ids={"discipline_and_appeal": frozenset({source_id})},
        candidate_status="pending_human_approval",
        data_as_of=date(2026, 8, 4),
    )

    answer = build_offline_review_service(evidence_corpus=corpus).handle(
        ReviewCommand(
            request_id="ALL-PERSONNEL-EVIDENCE",
            question_text="2026년 8월 4일 지방공무원 전체 인사규정 근거를 찾아주세요",
        )
    )

    assert answer.missing_conditions == ()
    assert set(answer.confirmed_conditions) == {"topic", "reference_date"}
    assert "leave_type" not in answer.confirmed_conditions
    assert answer.citations
    assert answer.citations[0].source_name == "지방공무원 징계규칙"


def _regular_allowance_corpus() -> CandidateEvidenceCorpus:
    allowance_source = "DECREE-LOCAL-ALLOWANCE-OFFICIAL"
    pay_source = "DECREE-LOCAL-PAY-20260701-OFFICIAL"
    shared = {
        "valid_time": DateRange(date(2026, 7, 1)),
        "applies_to": frozenset({"local_general_service"}),
        "topic_tags": frozenset({"pay_and_allowance"}),
        "source_hash": "b" * 64,
    }
    return CandidateEvidenceCorpus(
        provisions=(
            Provision(
                provision_id=f"{allowance_source}:article:6:paragraph:1:item:1",
                source_id=allowance_source,
                article_path="제6조 제1항 제1호",
                title="[지방공무원 수당 등에 관한 규정] 정근수당",
                text=(
                    "1월에 지급되는 정근수당은 1월 1일 현재 공무원의 신분을 "
                    "보유하고 봉급이 지급되는 자 중 전년도 7월 1일부터 "
                    "12월 31일까지 1월 이상 봉급이 지급된 공무원에게 지급한다."
                ),
                **shared,
            ),
            Provision(
                provision_id=f"{allowance_source}:article:6:paragraph:1:item:2",
                source_id=allowance_source,
                article_path="제6조 제1항 제2호",
                title="[지방공무원 수당 등에 관한 규정] 정근수당",
                text=(
                    "7월에 지급되는 정근수당은 7월 1일 현재 공무원의 신분을 "
                    "보유하고 봉급이 지급되는 자 중 당해연도 1월 1일부터 "
                    "6월 30일까지 1월 이상 봉급이 지급된 공무원에게 지급한다."
                ),
                **shared,
            ),
            Provision(
                provision_id=f"{allowance_source}:article:6:paragraph:2",
                source_id=allowance_source,
                article_path="제6조 제2항",
                title="[지방공무원 수당 등에 관한 규정] 정근수당",
                text=(
                    "징계처분을 받은 공무원에게는 지급하지 아니하며, 휴직처분을 "
                    "받은 공무원은 실제 근무한 기간에 따라 지급한다. 지방공무원 "
                    "보수규정 제14조제3호의2의 육아휴직기간은 실제 근무한 기간으로 "
                    "보고 15일 이상은 1월로 계산한다."
                ),
                **shared,
            ),
            Provision(
                provision_id=f"{allowance_source}:article:19:paragraph:10",
                source_id=allowance_source,
                article_path="제19조 제10항",
                title="[지방공무원 수당 등에 관한 규정] 수당등의 지급방법",
                text=(
                    "고정급적연봉제와 성과급적연봉제 적용대상에게는 정근수당을 "
                    "별도로 지급하지 않는다."
                ),
                **shared,
            ),
            Provision(
                provision_id=f"{pay_source}:article:14:item:3의2",
                source_id=pay_source,
                article_path="제14조 제3호의2",
                title="[지방공무원 보수규정] 승급기간의 특례",
                text=(
                    "지방공무원법 제63조제2항제4호에 따른 육아휴직기간은 산입한다. "
                    "다만 자녀 1명에 대한 총 휴직기간이 1년을 넘는 경우에는 최초의 "
                    "1년만 산입하되 확대 요건은 1년 6개월, 셋째 이후 자녀는 전 기간을 산입한다."
                ),
                **shared,
            ),
        ),
        source_names={
            allowance_source: "지방공무원 수당 등에 관한 규정",
            pay_source: "지방공무원 보수규정",
        },
        source_urls={
            allowance_source: "https://www.law.go.kr/LSW/lsInfoR.do?lsiSeq=287339",
            pay_source: "https://www.law.go.kr/LSW/lsInfoR.do?lsiSeq=287049",
        },
        source_review_tiers={
            allowance_source: "evidence_only",
            pay_source: "evidence_only",
        },
        topic_source_ids={
            "pay_and_allowance": frozenset({allowance_source, pay_source})
        },
        candidate_status="pending_human_approval",
        data_as_of=date(2026, 8, 4),
    )


def test_mixed_parental_leave_and_allowance_question_asks_for_decisive_facts() -> None:
    answer = build_offline_review_service(evidence_corpus=_regular_allowance_corpus()).handle(
        ReviewCommand(
            request_id="MIXED-PAY-QUESTION",
            question_text=(
                "2026년 4월 1일 육아휴직 복직자의 2026년 상반기 "
                "정근수당은 100%인가 50%인가?"
            ),
        )
    )

    assert answer.status is AnswerStatus.REVIEW_REQUIRED
    assert answer.missing_conditions == ("leave_periods",)
    assert answer.assumed_conditions == (
        "prior_same_child_leave_months",
        "salary_on_payment_date",
        "disciplinary_action_in_period",
        "other_nonservice_periods",
        "annual_salary_exclusion_applies",
    )
    assert answer.short_answer == (
        "정상 조건은 가정했어요. 확인할 이번 육아휴직 기간만 알려주세요."
    )
    assert set(answer.confirmed_conditions) == {
        "allowance_period",
        "allowance_type",
        "leave_type",
        "reference_date",
        "reinstatement_date",
    }
    assert answer.citations == ()
    assert "normal_case_assumptions_applied" in answer.review_reasons


def test_incomplete_allowance_question_keeps_explicit_exception_over_normal_default() -> None:
    answer = build_offline_review_service(evidence_corpus=_regular_allowance_corpus()).handle(
        ReviewCommand(
            request_id="INCOMPLETE-PAYMENT-EXCEPTION",
            question_text=(
                "2026년 상반기 육아휴직 복직자의 정근수당을 확인해줘. "
                "7월 1일에는 재직 중이지만 봉급 미지급이야."
            ),
        )
    )

    assert answer.status is AnswerStatus.REVIEW_REQUIRED
    assert answer.missing_conditions == ("reinstatement_date", "leave_periods")
    assert "salary_on_payment_date" in answer.confirmed_conditions
    assert "salary_on_payment_date" not in answer.assumed_conditions
    assert answer.assumed_conditions == (
        "prior_same_child_leave_months",
        "disciplinary_action_in_period",
        "other_nonservice_periods",
        "annual_salary_exclusion_applies",
    )
    assert answer.short_answer == (
        "정상 조건은 가정했어요. 확인할 복직일·이번 육아휴직 기간만 알려주세요."
    )


def test_natural_korean_allowance_question_returns_normal_case_preview() -> None:
    answer = build_offline_review_service(evidence_corpus=_regular_allowance_corpus()).handle(
        ReviewCommand(
            request_id="NATURAL-KOREAN-PAY-QUESTION",
            question_text=(
                "2025년 5월 말부터 2026년 4월 1일자 육아휴직한 복직자의 "
                "2026년도 상반기 정근수당은 100%야 50%야?"
            ),
        )
    )

    assert answer.status is AnswerStatus.REVIEW_REQUIRED
    assert answer.missing_conditions == ()
    assert answer.assumed_conditions == (
        "prior_same_child_leave_months",
        "salary_on_payment_date",
        "disciplinary_action_in_period",
        "other_nonservice_periods",
        "annual_salary_exclusion_applies",
    )
    assert set(answer.confirmed_conditions) == {
        "allowance_period",
        "allowance_type",
        "leave_periods",
        "leave_type",
        "reference_date",
        "reinstatement_date",
    }
    assert answer.short_answer.startswith("2026년 상반기 정근수당은")
    assert "아래 가정을 기준으로" not in answer.short_answer
    assert "판단됩니다" in answer.short_answer
    assert "100%" in answer.short_answer
    assert answer.model_used
    assert answer.citations
    assert "normal_case_assumptions_applied" in answer.review_reasons
    assert any("다르면" in limitation for limitation in answer.limitations)
    assert all("휴직처분이 없음" not in claim.text for claim in answer.claims)
    assert all("지급대상이 되지 않는다" not in claim.text for claim in answer.claims)


def test_dotted_full_year_leave_question_reaches_grounded_rate_without_reasking() -> None:
    answer = build_offline_review_service(
        evidence_corpus=_regular_allowance_corpus()
    ).handle(
        ReviewCommand(
            request_id="DOTTED-FULL-YEAR-PAY-QUESTION",
            question_text=(
                "2025. 4. 1 ~ 2026. 3. 31까지 육아휴직한 복직자의 "
                "2026년 상반기 정근수당은 얼마야?"
            ),
        )
    )

    assert answer.status is AnswerStatus.REVIEW_REQUIRED
    assert answer.missing_conditions == ()
    assert {"leave_periods", "reinstatement_date"} <= set(
        answer.confirmed_conditions
    )
    assert answer.short_answer.startswith("2026년 상반기 정근수당은")
    assert "100%" in answer.short_answer
    assert "6개월" in answer.short_answer
    assert answer.citations
    assert answer.model_used


def test_second_half_uses_january_boundary_without_first_half_hardcoding() -> None:
    answer = build_offline_review_service(
        evidence_corpus=_regular_allowance_corpus()
    ).handle(
        ReviewCommand(
            request_id="SECOND-HALF-NORMAL-CASE",
            question_text=(
                "2026. 7. 1 ~ 2026. 12. 31까지 육아휴직한 복직자가 "
                "2026년 하반기 정근수당은 얼마야?"
            ),
        )
    )

    assert answer.missing_conditions == ()
    assert answer.short_answer.startswith("2026년 하반기 정근수당은")
    assert "100%" in answer.short_answer
    assert "6개월" in answer.short_answer
    article_paths = {citation.article_path for citation in answer.citations}
    assert "제6조 제1항 제1호" in article_paths
    assert "제6조 제1항 제2호" not in article_paths


def test_natural_korean_allowance_question_does_not_stop_at_api_session_prompt() -> None:
    store = InMemoryReviewSessionStore()
    service = ReviewApiService(
        build_offline_review_service(evidence_corpus=_regular_allowance_corpus()),
        store,
    )

    session_id, answer = service.create(
        question_text=(
            "2025년 5월 말부터 2026년 4월 1일자 육아휴직한 복직자의 "
            "2026년도 상반기 정근수당은 100%야 50%야?"
        ),
        idempotency_key="NATURAL-KOREAN-NORMAL-CASE-SESSION",
        local_rule_checked=False,
    )

    assert answer.missing_conditions == ()
    assert answer.assumed_conditions == (
        "prior_same_child_leave_months",
        "salary_on_payment_date",
        "disciplinary_action_in_period",
        "other_nonservice_periods",
        "annual_salary_exclusion_applies",
    )
    assert "100%" in answer.short_answer
    assert "한 번에 알려주세요" not in answer.short_answer
    assert "결론보다 먼저" not in answer.short_answer
    session_conditions = store.get(session_id).structured_conditions
    session_fields = {item.field_name for item in session_conditions}
    assert not session_fields.intersection(answer.assumed_conditions)
    assert all(
        item.provenance != "normal_case_assumption" for item in session_conditions
    )


def test_explicit_payment_exception_is_not_replaced_by_normal_case_assumption() -> None:
    answer = build_offline_review_service(evidence_corpus=_regular_allowance_corpus()).handle(
        ReviewCommand(
            request_id="EXPLICIT-PAYMENT-EXCEPTION",
            question_text=(
                "2025년 5월 말부터 2026년 4월 1일자 육아휴직한 복직자의 "
                "2026년도 상반기 정근수당을 확인해줘. "
                "7월 1일 재직 중이지만 봉급 미지급이고 징계 처분을 받았고 "
                "연봉제 대상이야."
            ),
        )
    )

    assert answer.status is AnswerStatus.REVIEW_REQUIRED
    assert answer.missing_conditions == ()
    assert "salary_on_payment_date" not in answer.assumed_conditions
    assert "disciplinary_action_in_period" not in answer.assumed_conditions
    assert "annual_salary_exclusion_applies" not in answer.assumed_conditions
    assert answer.assumed_conditions == (
        "prior_same_child_leave_months",
        "other_nonservice_periods",
    )
    assert {
        "salary_on_payment_date",
        "disciplinary_action_in_period",
        "annual_salary_exclusion_applies",
    }.issubset(answer.confirmed_conditions)
    assert "지급 제외조건" in answer.short_answer
    assert "다시 문의해 주세요" in answer.short_answer
    assert "100%" not in answer.short_answer
    assert "50%" not in answer.short_answer


def test_regular_allowance_followup_reaches_grounded_100_percent_review() -> None:
    service = ReviewApiService(
        build_offline_review_service(evidence_corpus=_regular_allowance_corpus()),
        InMemoryReviewSessionStore(),
    )
    session_id, first = service.create(
        question_text=(
            "2026년 4월 1일 육아휴직 복직자의 2026년 상반기 "
            "정근수당은 100%인가 50%인가?"
        ),
        idempotency_key="REGULAR-ALLOWANCE-FIRST",
        local_rule_checked=False,
    )
    _, answer = service.message(
        session_id,
        question_text=(
            "육아휴직은 2026년 1월 1일부터 2026년 3월 31일까지고, "
            "같은 자녀 기존 육아휴직은 0개월이야. 7월 1일 재직 중이고 봉급 지급돼. "
            "징계와 직위해제 같은 제외기간 없고 연봉제 대상 아니야."
        ),
        idempotency_key="REGULAR-ALLOWANCE-SECOND",
        local_rule_checked=True,
    )

    assert first.missing_conditions
    assert answer.status is AnswerStatus.REVIEW_REQUIRED
    assert answer.missing_conditions == ()
    assert answer.model_used
    assert "100%" in answer.short_answer
    assert "6개월" in answer.short_answer
    assert "candidate_corpus_unapproved" in answer.review_reasons
    assert {citation.source_name for citation in answer.citations} == {
        "지방공무원 수당 등에 관한 규정",
        "지방공무원 보수규정",
    }
    assert all(citation.source_url.startswith("https://www.law.go.kr/") for citation in answer.citations)


def test_switching_from_leave_review_to_derived_pay_clears_stale_leave_conditions() -> None:
    service = ReviewApiService(
        build_offline_review_service(), InMemoryReviewSessionStore()
    )
    session_id, first = service.create(
        question_text="2026년 4월 1일 육아휴직 연장 조건",
        idempotency_key="MIXED-FIRST-KEY",
        local_rule_checked=False,
    )
    _, second = service.message(
        session_id,
        question_text="2026년 4월 1일 육아휴직 복직자의 정근수당 지급률 근거",
        idempotency_key="MIXED-SECOND-KEY",
        local_rule_checked=False,
    )

    assert first.missing_conditions == ("child_birth_date",)
    # 휴직 lane의 가정(`previous_leave_periods`)이 정근수당 lane으로 넘어오지 않는다.
    assert first.assumed_conditions == ("previous_leave_periods",)
    assert "previous_leave_periods" not in second.assumed_conditions
    assert set(second.confirmed_conditions) == {
        "allowance_type",
        "leave_type",
        "reference_date",
        "reinstatement_date",
    }
    assert second.missing_conditions == ("allowance_period", "leave_periods")
    assert second.assumed_conditions == (
        "prior_same_child_leave_months",
        "salary_on_payment_date",
        "disciplinary_action_in_period",
        "other_nonservice_periods",
        "annual_salary_exclusion_applies",
    )
    assert second.short_answer == (
        "정상 조건은 가정했어요. 확인할 산정 반기·이번 육아휴직 기간만 알려주세요."
    )
    assert "required_conditions_missing" in second.review_reasons


def test_switching_from_pay_topic_to_deep_leave_review_clears_stale_topic() -> None:
    service = ReviewApiService(
        build_offline_review_service(), InMemoryReviewSessionStore()
    )
    session_id, first = service.create(
        question_text="2026년 4월 1일 정근수당 지급률 근거",
        idempotency_key="PAY-FIRST-KEY",
        local_rule_checked=False,
    )
    _, second = service.message(
        session_id,
        question_text="2026년 4월 1일 질병휴직 조건",
        idempotency_key="LEAVE-SECOND-KEY",
        local_rule_checked=False,
    )

    assert set(first.confirmed_conditions) == {"topic", "reference_date"}
    assert "topic" not in second.confirmed_conditions
    assert set(second.confirmed_conditions) == {"leave_type", "reference_date"}
    assert second.missing_conditions == ("medical_leave_basis",)


def test_regular_allowance_abstains_when_required_cross_rule_evidence_is_missing() -> None:
    source_id = "RULE-LOCAL-ALLOWANCE-CURRENT-ONLY"
    corpus = CandidateEvidenceCorpus(
        provisions=(
            Provision(
                provision_id=f"{source_id}:article:6",
                source_id=source_id,
                article_path="제6조",
                title="정근수당",
                text="정근수당은 기준일의 지급대상기간과 실제 근무기간을 함께 검토한다.",
                valid_time=DateRange(date(2026, 7, 1)),
                applies_to=frozenset({"local_general_service"}),
                topic_tags=frozenset({"pay_and_allowance"}),
                source_hash="c" * 64,
            ),
        ),
        source_names={source_id: "지방공무원 수당 등에 관한 규정"},
        source_urls={source_id: "https://www.law.go.kr/법령/지방공무원수당등에관한규정"},
        source_review_tiers={source_id: "evidence_only"},
        topic_source_ids={"pay_and_allowance": frozenset({source_id})},
        candidate_status="pending_human_approval",
        data_as_of=date(2026, 8, 3),
    )
    service = ReviewApiService(
        build_offline_review_service(evidence_corpus=corpus),
        InMemoryReviewSessionStore(),
    )
    session_id, _ = service.create(
        question_text=(
            "2026년 4월 1일 육아휴직 복직자의 2026년 상반기 "
            "정근수당은 100%인가 50%인가?"
        ),
        idempotency_key="MISSING-CROSS-RULE-FIRST",
        local_rule_checked=False,
    )
    _, answer = service.message(
        session_id,
        question_text=(
            "육아휴직은 2026년 1월 1일부터 2026년 3월 31일까지고, "
            "같은 자녀 기존 육아휴직은 0개월이야. 7월 1일 재직 중이고 봉급 지급돼. "
            "징계와 직위해제 같은 제외기간 없고 연봉제 대상 아니야."
        ),
        idempotency_key="MISSING-CROSS-RULE-SECOND",
        local_rule_checked=True,
    )

    assert answer.status is AnswerStatus.INSUFFICIENT_EVIDENCE
    assert answer.missing_conditions == ()
    assert answer.citations == ()
    assert answer.review_reasons == ("required_regular_allowance_evidence_missing",)


class _UngroundedQuantityModel:
    """A model that cites correctly and still writes a number no provision contains.

    Qwen3 4B did exactly this on `local` for a 승진 question: it cited five in-force
    provisions and asserted a 개정일 the citations only implied. The quantity gate is
    right to reject that sentence. What follows the rejection is the bug under test.
    """

    model_id = "ungrounded-quantity-model"

    def draft(self, context, provisions, allowed_citations):  # type: ignore[no-untyped-def]
        return ReviewDraft(
            AnswerStatus.REVIEW_REQUIRED,
            (
                Claim(
                    claim_id="CLAIM-INVENTED",
                    text="최소 승진연수는 7년입니다.",
                    citation_ids=tuple(item.citation_id for item in allowed_citations),
                ),
            ),
        )


def test_a_rejected_draft_does_not_throw_away_the_evidence_that_was_found() -> None:
    """근거를 찾아놓고 "근거가 부족하다"고 답하지 않는다.

    넓은 lane이 약속하는 것은 결론이 아니라 근거 조문이다. 모델 문장이 검증에 걸리면
    버려야 할 것은 그 문장이지 이미 시점·인용 검증을 통과한 조문 5건이 아니다.

    이전 동작은 `_safe_failure`로 빠져 `INSUFFICIENT_EVIDENCE` + 인용 0건을 냈다.
    화면에는 "근거 또는 검증 조건이 충분하지 않아 답변을 보류합니다"만 남았고, 사용자는
    검색이 실패했다고 읽는다. 실제로는 성공했고 모델만 실패했다.
    """
    source_id = "RULE-LOCAL-PROMOTION-DISCARD"
    corpus = CandidateEvidenceCorpus(
        provisions=(
            Provision(
                provision_id=f"{source_id}:article:33",
                source_id=source_id,
                article_path="제33조 제1항",
                title="[지방공무원 임용령] 승진소요최저연수",
                text="7급 공무원이 6급으로 승진하려면 해당 계급에서 3년 이상 재직하여야 한다.",
                valid_time=DateRange(date(2024, 1, 1)),
                applies_to=frozenset({"local_general_service"}),
                topic_tags=frozenset({"performance_and_promotion"}),
                source_hash="f" * 64,
            ),
        ),
        source_names={source_id: "지방공무원 임용령"},
        source_urls={source_id: "https://www.law.go.kr/법령/지방공무원임용령"},
        source_review_tiers={source_id: "evidence_only"},
        topic_source_ids={"performance_and_promotion": frozenset({source_id})},
        candidate_status="pending_human_approval",
        data_as_of=date(2026, 8, 10),
    )
    service = build_offline_review_service(
        _UngroundedQuantityModel(),  # type: ignore[arg-type]
        evidence_corpus=corpus,
        wide_evidence="auto",
    )

    answer = service.handle(
        ReviewCommand(
            request_id="WIDE-DRAFT-REJECTED",
            question_text="2026-08-10 기준 7급 승진소요최저연수 근거를 찾아주세요",
        )
    )

    assert answer.status is AnswerStatus.REVIEW_REQUIRED
    assert answer.citations
    assert answer.citations[0].article_path == "제33조 제1항"
    # 버려진 것은 모델 문장이다. 지어낸 수량이 화면에 남으면 안 된다.
    assert answer.claims == ()
    assert "7년" not in answer.short_answer
    # 실패를 숨기지 않는다. 초안이 폐기됐다는 사실이 사유와 한계 양쪽에 남는다.
    assert "claim_quantity_unsupported" in answer.review_reasons
    assert "model_draft_discarded" in answer.review_reasons
    assert any("초안" in item for item in answer.limitations)


def test_a_negated_mention_of_another_topic_does_not_hijack_the_lane() -> None:
    """후속 턴이 조건값으로 다른 주제의 단어를 말해도 lane이 바뀌면 안 된다.

    "징계와 직위해제 같은 제외기간 없고"는 정근수당 규칙이 요구하는 조건을 채운 문장이지
    징계를 묻는 문장이 아니다. 분류기는 부분 문자열로 주제를 정하므로 이 차이를 모른다.

    분류기 어휘에 `직위해제`를 추가했을 때 이 케이스가 실제로 깨졌다. 조문을 늘리려고
    어휘를 넓히면 다시 깨질 수 있는 자리라 원인을 직접 고정한다.
    """
    service = ReviewApiService(
        build_offline_review_service(evidence_corpus=_regular_allowance_corpus()),
        InMemoryReviewSessionStore(),
    )
    session_id, _ = service.create(
        question_text=(
            "2026년 4월 1일 육아휴직 복직자의 2026년 상반기 정근수당은 100%인가 50%인가?"
        ),
        idempotency_key="NEGATED-TOPIC-FIRST",
        local_rule_checked=False,
    )
    _, answer = service.message(
        session_id,
        question_text=(
            "육아휴직은 2026년 1월 1일부터 2026년 3월 31일까지고, "
            "같은 자녀 기존 육아휴직은 0개월이야. 7월 1일 재직 중이고 봉급 지급돼. "
            "징계와 직위해제 같은 제외기간 없고 연봉제 대상 아니야."
        ),
        idempotency_key="NEGATED-TOPIC-SECOND",
        local_rule_checked=True,
    )

    assert answer.status is AnswerStatus.REVIEW_REQUIRED
    assert answer.model_used
    # 징계·소청 lane으로 새면 정근수당 조문 대신 징계 조문이 인용된다.
    assert any("정근수당" in citation.title for citation in answer.citations)


def test_a_date_the_governing_source_has_no_version_for_is_stated_not_hidden() -> None:
    """근거가 나왔다고 그 날짜를 다룰 수 있다는 뜻은 아니다.

    임용령은 2024-06-27에 끝난 버전과 2026-06-30에 시작하는 버전 두 개뿐이라
    2024-07-01은 빈 구간이다. 그 날짜로 승진을 물으면 임용령은 한 건도 남지 않고
    다른 법령 조문만 살아남는다. 결과가 비어 있지 않으니 기존 abstain 경로는 울리지
    않고, 사용자는 엉뚱한 근거를 답으로 읽는다.

    빠진 법령을 이름으로 말한다. 목록에서 빠졌다는 사실만으로는 사용자가 알 수 없다.
    """
    appointment_now = "DECREE-LOCAL-APPOINTMENT-GAP"
    appointment_old = "DECREE-LOCAL-APPOINTMENT-GAP-20230613"
    law = "LAW-LOCAL-GAP"

    def provision(pid, source, start, end, text):  # type: ignore[no-untyped-def]
        return Provision(
            provision_id=pid,
            source_id=source,
            article_path="제33조 제1항",
            title="승진소요 최저연수",
            text=text,
            valid_time=DateRange(start, end),
            applies_to=frozenset({"local_general_service"}),
            topic_tags=frozenset({"performance_and_promotion"}),
            source_hash="9" * 64,
        )

    corpus = CandidateEvidenceCorpus(
        provisions=(
            provision(f"{appointment_old}:a", appointment_old, date(2023, 6, 13),
                      date(2024, 6, 27), "7급 승진소요최저연수는 2년 이상으로 한다."),
            provision(f"{appointment_now}:a", appointment_now, date(2026, 6, 30), None,
                      "7급 승진소요최저연수는 1년 이상으로 한다."),
            provision(f"{law}:a", law, date(2022, 12, 27), None,
                      "승진임용은 승진후보자명부의 순위에 따라 심사한다."),
        ),
        source_names={
            appointment_now: "지방공무원 임용령",
            # 같은 법령의 과거 스냅샷은 매니페스트에서 같은 이름을 쓴다.
            appointment_old: "지방공무원 임용령",
            law: "지방공무원법",
        },
        source_urls={
            appointment_now: "https://www.law.go.kr/법령/지방공무원임용령",
            appointment_old: "https://www.law.go.kr/법령/지방공무원임용령",
            law: "https://www.law.go.kr/법령/지방공무원법",
        },
        source_review_tiers={
            appointment_now: "evidence_only",
            appointment_old: "evidence_only",
            law: "evidence_only",
        },
        topic_source_ids={
            "performance_and_promotion": frozenset(
                {appointment_now, appointment_old, law}
            )
        },
        candidate_status="pending_human_approval",
        data_as_of=date(2026, 8, 10),
    )
    service = build_offline_review_service(evidence_corpus=corpus, wide_evidence="auto")

    gap = service.handle(
        ReviewCommand(
            request_id="VERSION-GAP",
            question_text="2024년 7월 1일 7급 승진소요 최저연수 근거를 찾아주세요",
        )
    )
    covered = service.handle(
        ReviewCommand(
            request_id="VERSION-COVERED",
            question_text="2026년 8월 10일 7급 승진소요 최저연수 근거를 찾아주세요",
        )
    )

    assert gap.citations, "다른 법령은 살아남으므로 결과 자체는 비지 않는다"
    assert "source_version_gap" in gap.review_reasons
    assert any("지방공무원 임용령" in item for item in gap.limitations)

    # 현재 시점에는 그 경고가 붙지 않는다. 항상 붙으면 아무 뜻도 없다.
    assert "source_version_gap" not in covered.review_reasons
