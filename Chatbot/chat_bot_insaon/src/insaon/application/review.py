from __future__ import annotations

import re
from collections.abc import Callable
from dataclasses import dataclass, replace
from datetime import date

from insaon.adapters.retrieval import RetrievalPipeline
from insaon.application.classification import QuestionClassification, QuestionClassifier
from insaon.application.conditions import ConditionExtractor, QuestionPolicy
from insaon.application.grounding import condition_quantities, ungrounded_quantities
from insaon.application.ports import ModelGateway
from insaon.application.privacy import PrivacyGate
from insaon.application.provider_runtime import ProviderRuntimeError
from insaon.application.rules import RuleService
from insaon.domain import (
    AnswerStatus,
    Citation,
    Claim,
    ClaimKind,
    ConditionState,
    ConditionValue,
    DateRange,
    ExpectedAction,
    LeaveType,
    LocalRuleStatus,
    Provision,
    QuestionContext,
    ReviewAnswer,
)


@dataclass(frozen=True)
class ReviewCommand:
    request_id: str
    question_text: str
    employee_system: str = "local_government"
    employee_category: str = "general_service"
    local_rule_checked: bool = False
    known_conditions: tuple[ConditionValue, ...] = ()


@dataclass(frozen=True)
class CitationValidation:
    valid: bool
    reason_codes: tuple[str, ...] = ()


class CitationValidator:
    def __init__(self, provisions: dict[str, Provision]) -> None:
        self._provisions = provisions

    def validate(
        self,
        *,
        reference_date: date,
        subject: str,
        citations: tuple[Citation, ...],
        claims: tuple[Claim, ...],
        required_exception_ids: tuple[str, ...] = (),
        grounded_values: tuple[str, ...] = (),
    ) -> CitationValidation:
        reasons: list[str] = []
        cited_provisions: set[str] = set()
        citation_ids = {citation.citation_id for citation in citations}
        for citation in citations:
            provision = self._provisions.get(citation.provision_id)
            if provision is None:
                reasons.append("citation_provision_not_found")
                continue
            if citation.source_id != provision.source_id:
                reasons.append("citation_source_mismatch")
            if not provision.is_effective_on(reference_date, subject):
                reasons.append("citation_not_effective")
            cited_provisions.add(provision.provision_id)
        if not set(required_exception_ids) <= cited_provisions:
            reasons.append("decisive_exception_missing")
        if any(
            not claim.citation_ids or not set(claim.citation_ids) <= citation_ids
            for claim in claims
        ):
            reasons.append("unsupported_claim")
        if self._ungrounded_claim_quantities(citations, claims, grounded_values):
            reasons.append("claim_quantity_unsupported")
        return CitationValidation(not reasons, tuple(dict.fromkeys(reasons)))

    def _ungrounded_claim_quantities(
        self,
        citations: tuple[Citation, ...],
        claims: tuple[Claim, ...],
        grounded_values: tuple[str, ...],
    ) -> tuple[str, ...]:
        """Quantities a claim asserts that its own citations do not contain.

        Existence and validity of a citation say nothing about whether the cited text
        supports the sentence. A model can cite four in-force provisions correctly and
        still invent the 기간 that decides the answer.
        """
        by_citation_id = {citation.citation_id: citation for citation in citations}
        unsupported: list[str] = []
        for claim in claims:
            cited_texts: list[str] = []
            for citation_id in claim.citation_ids:
                citation = by_citation_id.get(citation_id)
                provision = self._provisions.get(citation.provision_id) if citation else None
                if provision is None:
                    continue
                cited_texts.extend((provision.text, provision.proviso_text or "", provision.title))
            unsupported.extend(
                ungrounded_quantities(
                    claim_text=claim.text,
                    cited_texts=tuple(cited_texts),
                    allowed_values=grounded_values,
                )
            )
        return tuple(dict.fromkeys(unsupported))


class ReviewQuestion:
    """Single safe path for privacy, policy, retrieval, rules, drafting and validation."""

    # `\b`를 쓰지 않는 이유는 `ConditionExtractor`와 같다. 한글 음절이 파이썬
    # 정규식에서 `\w`라서 `2026-03-02입니다`처럼 조사가 붙으면 뒤쪽 경계가 성립하지
    # 않는다. 후속 턴은 날짜만 던지고 조사를 붙이는 형태가 가장 흔하므로 이 경로에서
    # 특히 잘 깨진다.
    _reference_date_followup = re.compile(
        r"(?:(?<!\d)20\d{2}-\d{2}-\d{2}(?!\d)|(?<!\d)20\d{2}년\s*\d{1,2}월\s*\d{1,2}일)"
    )

    _deep_topic_tags = {
        LeaveType.PARENTAL: frozenset({"parental_leave"}),
        LeaveType.MEDICAL: frozenset({"medical_leave"}),
        LeaveType.FAMILY_CARE: frozenset({"family_care_leave"}),
        LeaveType.SELF_DEVELOPMENT: frozenset({"self_development_leave"}),
    }
    _condition_prompt_labels = {
        "leave_type": "휴직 유형",
        "reference_date": "질문 기준일",
        "child_birth_date": "자녀 생년월일",
        "previous_leave_periods": "같은 자녀의 이전 육아휴직 기간",
        "medical_leave_basis": "질병휴직의 공무상·비공무상 구분",
        "care_recipient_relation": "돌봄 대상과의 관계",
        "application_purpose": "자기개발휴직 신청 목적",
    }

    # 값이 정해진 분류 조건은 되묻기만 하지 않고 어느 경우로 갈리는지 함께 짚어 준다.
    # 결론을 만드는 것이 아니라 경우를 나눠 보여주는 것이므로 통상 가정 규칙과 무관하다.
    # 구체 기간·지급률 같은 grounded 값은 넣지 않는다 — 어느 조문으로 갈리는지까지만 말한다.
    _condition_branch_hints = {
        "medical_leave_basis": (
            "질병휴직은 공무상(공무 수행 중 생긴 부상·질병)과 비공무상(개인 질병)에 "
            "따라 적용 조문이 달라져요."
        ),
        "care_recipient_relation": (
            "가족돌봄휴직은 돌봄 대상과의 관계(배우자·부모·자녀 등)에 따라 요건이 "
            "달라져요."
        ),
        "application_purpose": (
            "자기개발휴직은 신청 목적(학위·연구·직무 관련 교육 등)에 따라 인정 요건이 "
            "달라져요."
        ),
    }

    def __init__(
        self,
        *,
        privacy_gate: PrivacyGate,
        classifier: QuestionClassifier,
        extractor: ConditionExtractor,
        question_policy: QuestionPolicy,
        retrieval: RetrievalPipeline,
        rule_service: RuleService,
        model: ModelGateway,
        provisions: tuple[Provision, ...],
        data_as_of: date,
        retrieval_config_id: str = "H3",
        evidence_retrieval: RetrievalPipeline | None = None,
        evidence_provisions: tuple[Provision, ...] = (),
        evidence_source_names: dict[str, str] | None = None,
        evidence_source_urls: dict[str, str] | None = None,
        evidence_topic_source_ids: dict[str, frozenset[str]] | None = None,
        evidence_corpus_status: str = "unavailable",
        deep_source_names: dict[str, str] | None = None,
        deep_source_urls: dict[str, str] | None = None,
        deep_corpus_status: str = "synthetic_regression",
        derived_pay_retrieval: RetrievalPipeline | None = None,
        derived_pay_provisions: tuple[Provision, ...] = (),
        derived_pay_source_names: dict[str, str] | None = None,
        derived_pay_source_urls: dict[str, str] | None = None,
        derived_pay_corpus_status: str = "unavailable",
    ) -> None:
        self._privacy = privacy_gate
        self._classifier = classifier
        self._extractor = extractor
        self._policy = question_policy
        self._retrieval = retrieval
        self._rules = rule_service
        self._model = model
        self._model_id = str(getattr(model, "model_id", "unknown-local-model"))
        self._provisions = {item.provision_id: item for item in provisions}
        self._data_as_of = data_as_of
        self._retrieval_config_id = retrieval_config_id
        self._validator = CitationValidator(self._provisions)
        self._evidence_retrieval = evidence_retrieval
        self._evidence_provisions = {item.provision_id: item for item in evidence_provisions}
        self._evidence_validator = CitationValidator(self._evidence_provisions)
        self._evidence_source_names = evidence_source_names or {}
        self._evidence_source_urls = evidence_source_urls or {}
        self._evidence_topic_source_ids = evidence_topic_source_ids or {}
        self._evidence_corpus_status = evidence_corpus_status
        self._deep_source_names = deep_source_names or {}
        self._deep_source_urls = deep_source_urls or {}
        self._deep_corpus_status = deep_corpus_status
        self._derived_pay_retrieval = derived_pay_retrieval
        self._derived_pay_provisions = {item.provision_id: item for item in derived_pay_provisions}
        self._derived_pay_validator = CitationValidator(self._derived_pay_provisions)
        self._derived_pay_source_names = derived_pay_source_names or {}
        self._derived_pay_source_urls = derived_pay_source_urls or {}
        self._derived_pay_corpus_status = derived_pay_corpus_status

    def extract_structured_conditions(
        self,
        question_text: str,
        known_conditions: tuple[ConditionValue, ...] = (),
    ) -> tuple[ConditionValue, ...]:
        if not self._privacy.inspect(question_text).allowed:
            return ()
        classification = self._classification_for(question_text, known_conditions)
        return tuple(
            condition
            for condition in self._extractor.extract(question_text, classification)
            if condition.state is ConditionState.CONFIRMED
        )

    def handle(self, command: ReviewCommand) -> ReviewAnswer:
        inspection = self._privacy.inspect(command.question_text)
        if not inspection.allowed:
            return ReviewAnswer(
                status=AnswerStatus.INSUFFICIENT_EVIDENCE,
                short_answer="개인정보로 의심되는 입력이 있어 처리를 중단했습니다.",
                review_reasons=("privacy_input_blocked", *inspection.categories),
                limitations=("실제 개인정보 대신 명시적인 합성 사례를 사용해 주세요.",),
                data_as_of=self._data_as_of,
                model_id=self._model_id,
            )

        classification = self._classification_for(command.question_text, command.known_conditions)
        extracted = self._merge_conditions(
            command.known_conditions,
            self._extractor.extract(command.question_text, classification),
            # 한 턴이 휴직 유형을 둘 이상 부르면 앞 턴이 확정한 유형은 더 이상 이
            # 질문의 답이 아니다. 무효화하지 않으면 확정값이 남아 "질병이랑
            # 가족돌봄은요?"에 육아휴직 조문으로 답한다.
            invalidated=(
                ("leave_type",) if classification.reason_code == "ambiguous_leave_type" else ()
            ),
        )
        extracted, assumed = self._policy.apply_normal_case_assumptions(
            classification,
            extracted,
        )
        assumption_profile_id = (
            self._policy.assumption_profile_id(classification) if assumed else None
        )
        local_status = (
            LocalRuleStatus.CHECKED if command.local_rule_checked else LocalRuleStatus.UNCONFIRMED
        )
        decision = self._policy.decide(classification, extracted, local_status)
        confirmed = tuple(
            condition.field_name
            for condition in extracted
            if condition.state is ConditionState.CONFIRMED
            and condition.provenance != "normal_case_assumption"
            # `task`는 질문자가 확정한 사실이 아니라 이 턴이 무엇을 하는 턴인지의
            # 기록이다. 확인된 조건으로 되읽으면 묻지도 않은 것을 확인했다고 말한다.
            and condition.field_name != "task"
        )
        if decision.action is ExpectedAction.ASK:
            return ReviewAnswer(
                status=decision.answer_status,
                short_answer=self._missing_condition_prompt(
                    classification,
                    confirmed,
                    decision.missing_fields,
                ),
                confirmed_conditions=confirmed,
                assumed_conditions=assumed,
                assumption_profile_id=assumption_profile_id,
                missing_conditions=decision.missing_fields,
                review_reasons=tuple(
                    dict.fromkeys(
                        (
                            *decision.reason_codes,
                            *(("normal_case_assumptions_applied",) if assumed else ()),
                        )
                    )
                ),
                limitations=("최종 인사처분이나 법률해석을 대신하지 않습니다.",),
                data_as_of=self._data_as_of,
                local_rule_status=local_status,
                model_id=self._model_id,
            )
        if decision.action is ExpectedAction.ABSTAIN:
            # 두 거절은 다른 일이다. `no_supported_topic_signal`은 "저장소에 이 말에
            # 닿는 조문이 없다"이고, `unsupported_subject_or_topic`은 "이 대상·판단은
            # 하지 않는다"이다. 전자에 후자의 문장을 쓰면 화면이 거짓말을 한다 —
            # 승진·징계·수당은 지원하지 않는다고 말하면서 실제로는 그 조문을 색인해
            # 두고 근거를 찾아 준다.
            if "no_supported_topic_signal" in decision.reason_codes:
                return self._out_of_corpus_scope(confirmed, local_status)
            return ReviewAnswer(
                status=decision.answer_status,
                short_answer=(
                    "인사ON은 지방자치단체 일반직만 다루고, 최종 인사처분 판단은 지원하지 않아요."
                ),
                confirmed_conditions=confirmed,
                review_reasons=decision.reason_codes,
                limitations=(
                    "육아·질병·가족돌봄·자기개발 휴직과 복직은 필요한 조건까지 "
                    "확인해 결론을 정리해요.",
                    "임용·인사기록·평정·승진·복무·휴가·보수·수당·징계·소청·교육훈련·"
                    "퇴직은 근거 조문을 찾아 드려요.",
                    "국가공무원·특정직과 최종 인사처분 판단은 지원하지 않아요.",
                    "결과는 최종 인사처분 또는 법률해석을 대신하지 않습니다.",
                ),
                data_as_of=self._data_as_of,
                local_rule_status=local_status,
                model_id=self._model_id,
            )

        reference_date = self._reference_date(extracted)
        if reference_date is None:
            return self._safe_failure("reference_date_required", confirmed, local_status)
        if classification.intent == "regular_service_allowance_review":
            decision_status = (
                self._more_conservative_status(
                    decision.answer_status,
                    AnswerStatus.REVIEW_REQUIRED,
                )
                if assumed
                else decision.answer_status
            )
            decision_reasons = (
                (*decision.reason_codes, "normal_case_assumptions_applied")
                if assumed
                else decision.reason_codes
            )
            return self._handle_regular_service_allowance(
                command=command,
                classification=classification,
                conditions=extracted,
                confirmed=confirmed,
                local_status=local_status,
                reference_date=reference_date,
                decision_status=decision_status,
                decision_reasons=decision_reasons,
                assumed=assumed,
            )
        if classification.review_tier == "evidence_only":
            return self._handle_evidence_lookup(
                command=command,
                classification=classification,
                conditions=extracted,
                confirmed=confirmed,
                local_status=local_status,
                reference_date=reference_date,
                decision_reasons=(
                    (*decision.reason_codes, "normal_case_assumptions_applied")
                    if assumed
                    else decision.reason_codes
                ),
                assumed=assumed,
                assumption_profile_id=assumption_profile_id,
            )
        try:
            result = self._retrieval.retrieve(
                command.question_text,
                config_id=self._retrieval_config_id,
                top_k=5,
                reference_date=reference_date,
                subject="local_general_service",
                topic_tags=self._deep_topic_tags.get(classification.leave_type),
            )
            retrieved_by_id = {provision.provision_id: provision for provision in result.context}
            if self._deep_corpus_status != "synthetic_regression":
                for query in self._deep_evidence_queries(
                    classification.leave_type,
                    classification.is_reinstatement,
                    extracted,
                ):
                    targeted = self._retrieval.retrieve(
                        query,
                        config_id=self._retrieval_config_id,
                        top_k=12,
                        reference_date=reference_date,
                        subject="local_general_service",
                        topic_tags=self._deep_topic_tags.get(classification.leave_type),
                        rerank=False,
                    )
                    for provision in targeted.context:
                        retrieved_by_id[provision.provision_id] = provision
        except ProviderRuntimeError as exc:
            return self._safe_failure(
                f"provider_{exc.failure.code.value}",
                confirmed,
                local_status,
            )
        if not result.context or result.context_incomplete:
            return self._safe_failure(
                result.reason or "insufficient_retrieval_context", confirmed, local_status
            )
        review_context = self._deep_review_context(
            tuple(retrieved_by_id.values()),
            classification.leave_type,
            reference_date,
            extracted,
            is_reinstatement=classification.is_reinstatement,
        )
        if not review_context:
            return self._safe_failure(
                f"required_{classification.leave_type.value}_evidence_missing",
                confirmed,
                local_status,
            )
        citations = tuple(
            self._citation_for(
                provision,
                source_names=self._deep_source_names,
                source_urls=self._deep_source_urls,
            )
            for provision in review_context
        )
        rule_check = self._rules.validate_temporal_and_citations(
            reference_date,
            review_context,
            tuple(citation.provision_id for citation in citations),
        )
        if not rule_check.passed:
            return self._safe_failure(rule_check.review_reasons[0], confirmed, local_status)
        context = QuestionContext(
            request_id=command.request_id,
            question_text=command.question_text,
            employee_system=command.employee_system,
            employee_category=command.employee_category,
            leave_type=classification.leave_type,
            reference_date=reference_date,
            conditions=extracted,
            local_rule_status=local_status,
            intent=classification.intent,
        )
        try:
            draft = self._model.draft(context, review_context, citations)
            claims = tuple(draft.claims)
        except ProviderRuntimeError as exc:
            return self._safe_failure(
                f"provider_{exc.failure.code.value}",
                confirmed,
                local_status,
            )
        required_exceptions = tuple(
            provision.provision_id
            for provision in review_context
            if {"proviso", "supplementary"} & provision.topic_tags
        )
        validation = self._validator.validate(
            reference_date=reference_date,
            subject="local_general_service",
            citations=citations,
            claims=claims,
            required_exception_ids=required_exceptions,
            grounded_values=condition_quantities(extracted),
        )
        if not claims or not validation.valid:
            # 모델 문장이 걸린 것과 근거 자체가 걸린 것은 다르다. 앞의 것은 조문을
            # 넘기고, 뒤의 것은 넘길 조문이 없으니 보류한다.
            evidence_failed = {
                "citation_provision_not_found",
                "citation_source_mismatch",
                "citation_not_effective",
                "decisive_exception_missing",
            } & set(validation.reason_codes)
            if evidence_failed:
                return self._safe_failure(sorted(evidence_failed)[0], confirmed, local_status)
            # 결론은 만들지 않는다. 대신 무엇을 확인했고 어느 조문을 봐야 하는지 짚어
            # 준다. 종전에는 인용 0건에 "근거가 부족합니다"로 끝나 검색이 실패한 것처럼
            # 보였다. 결론을 못 내는 것과 근거를 못 찾는 것은 다른 일이다.
            return self._evidence_handover(
                citations=citations,
                confirmed=confirmed,
                assumed=assumed,
                assumption_profile_id=assumption_profile_id,
                local_status=local_status,
                reasons=(
                    *decision.reason_codes,
                    *validation.reason_codes,
                    *(() if claims else ("draft_empty",)),
                    "model_draft_discarded",
                ),
            )
        deterministic_status = decision.answer_status
        deep_reasons = decision.reason_codes
        if assumed:
            # ADR-0016: 가정에 의존한 결과는 `REVIEW_REQUIRED`보다 낙관적으로 승격하지
            # 않는다. 정근수당 lane에는 이 상한이 있었고 휴직 lane에는 없었다. 통상
            # 가정을 이 lane에 처음 넣으면서 함께 건다. 상한이 없으면 "기존 육아휴직은
            # 없다고 본다"는 가정 하나로 아무도 확인하지 않은 사실 위에서 "가능합니다"가
            # 나간다. 실제로는 이미 한도를 다 쓴 사람일 수 있다.
            deterministic_status = self._more_conservative_status(
                deterministic_status, AnswerStatus.REVIEW_REQUIRED
            )
            deep_reasons = (*deep_reasons, "normal_case_assumptions_applied")
        corpus_reason: str | None = None
        if self._deep_corpus_status == "pending_human_approval":
            deterministic_status = self._more_conservative_status(
                deterministic_status, AnswerStatus.REVIEW_REQUIRED
            )
            corpus_reason = "candidate_corpus_unapproved"
        final_status = self._more_conservative_status(
            deterministic_status, draft.recommended_status
        )
        model_reason = self._model_status_reason(deterministic_status, final_status)
        limitations = (
            (
                "검색 자료는 검토용 후보예요. 답변에 연결된 원문 발췌를 확인해 주세요.",
                "질문 기준일의 원문과 기관 규정을 함께 확인해 주세요.",
            )
            if self._deep_corpus_status == "pending_human_approval"
            else (
                "예시 자료를 사용한 데모 결과예요. 실제 법률 판단으로 사용하지 마세요.",
                "질문 기준일 원문과 기관 규정을 함께 확인해 주세요.",
            )
        )
        # 근거·조건이 다 갖춰졌고 기관 규정 확인만 안 된 경우, 결론 문장이 ANSWERABLE과
        # 똑같이 나가 사용자는 왜 안 끝났는지 알 수 없었다. 체크만 하면 결론까지 간다는
        # 것을 문장으로 말한다. 가정·미승인 corpus가 함께 걸린 경우엔 체크해도 결론이 안
        # 나므로 이 안내를 붙이지 않는다.
        checkbox_is_only_blocker = (
            final_status is AnswerStatus.REVIEW_REQUIRED
            and local_status is LocalRuleStatus.UNCONFIRMED
            and not assumed
            and corpus_reason is None
            and draft.recommended_status is AnswerStatus.ANSWERABLE
            and "local_rule_unconfirmed" in deep_reasons
        )
        short_answer = (
            f"{claims[0].text} 결론까지 정리하려면 ‘기관 규정 확인’만 체크해 주세요."
            if checkbox_is_only_blocker
            else claims[0].text
        )
        return ReviewAnswer(
            status=final_status,
            short_answer=short_answer,
            confirmed_conditions=confirmed,
            assumed_conditions=assumed,
            assumption_profile_id=assumption_profile_id,
            citations=citations,
            claims=claims,
            review_reasons=tuple(
                dict.fromkeys(
                    (
                        *deep_reasons,
                        *((corpus_reason,) if corpus_reason else ()),
                        *((model_reason,) if model_reason else ()),
                    )
                )
            ),
            limitations=(
                *(
                    ("표시한 가정과 실제 상태가 다르면 실제 조건으로 다시 질문해 주세요.",)
                    if assumed
                    else ()
                ),
                *limitations,
            ),
            data_as_of=self._data_as_of,
            local_rule_status=local_status,
            model_id=self._model_id,
            model_used=True,
            model_recommended_status=draft.recommended_status,
        )

    @staticmethod
    def _missing_condition_prompt(
        classification: QuestionClassification,
        confirmed: tuple[str, ...],
        missing: tuple[str, ...],
    ) -> str:
        confirmed_set = set(confirmed)
        if classification.intent == "regular_service_allowance_review":
            missing_set = set(missing)
            core_labels: list[str] = []
            if "allowance_period" in missing_set:
                core_labels.append("산정 반기")
            elif "reference_date" in missing_set:
                core_labels.append("질문 기준일")
            if "reinstatement_date" in missing_set:
                core_labels.append("복직일")
            if "leave_periods" in missing_set:
                core_labels.append("이번 육아휴직 기간")
            if core_labels:
                return f"정상 조건은 가정했어요. 확인할 {'·'.join(core_labels)}만 알려주세요."
        if (
            classification.intent == "regular_service_allowance_review"
            and {"allowance_period", "reinstatement_date", "leave_periods"} <= confirmed_set
        ):
            remaining_groups: list[str] = []
            if "prior_same_child_leave_months" in missing:
                remaining_groups.append("같은 자녀의 이전 육아휴직 기간")
            if "salary_on_payment_date" in missing:
                remaining_groups.append("지급기준일 재직·봉급 여부")
            if {
                "disciplinary_action_in_period",
                "other_nonservice_periods",
                "annual_salary_exclusion_applies",
            } & set(missing):
                remaining_groups.append("지급 제외조건")
            if remaining_groups:
                joined = ", ".join(remaining_groups)
                return (
                    "질문에 적힌 산정 반기·복직일·육아휴직 기간은 확인했어요. "
                    f"{joined}만 한 번에 알려주세요."
                )
        labels = tuple(
            ReviewQuestion._condition_prompt_labels.get(field, "추가 확인 내용")
            for field in missing
        )
        labels = tuple(dict.fromkeys(labels))
        if labels:
            prefix = (
                "적용할 규정을 찾으려면"
                if classification.review_tier == "evidence_only"
                else "검토하려면"
            )
            ask = f"{prefix} {'·'.join(labels)}만 알려주세요."
            hints = tuple(
                dict.fromkeys(
                    ReviewQuestion._condition_branch_hints[field]
                    for field in missing
                    if field in ReviewQuestion._condition_branch_hints
                )
            )
            if hints:
                return f"{' '.join(hints)} {ask}"
            return ask
        return "질문에서 확인할 내용을 조금 더 알려주세요."

    def _handle_regular_service_allowance(
        self,
        *,
        command: ReviewCommand,
        classification: QuestionClassification,
        conditions: tuple[ConditionValue, ...],
        confirmed: tuple[str, ...],
        local_status: LocalRuleStatus,
        reference_date: date,
        decision_status: AnswerStatus,
        decision_reasons: tuple[str, ...],
        assumed: tuple[str, ...],
    ) -> ReviewAnswer:
        assumption_profile_id = (
            self._policy.assumption_profile_id(classification) if assumed else None
        )
        if self._derived_pay_retrieval is None or not self._derived_pay_provisions:
            return self._safe_failure(
                "derived_pay_corpus_unavailable",
                confirmed,
                local_status,
                assumed_conditions=assumed,
                assumption_profile_id=assumption_profile_id,
            )
        if reference_date.month == 7:
            payment_boundary_query = "7월 1일 정근수당 지급대상기간 1월 1일부터 6월 30일"
        else:
            payment_boundary_query = "1월 1일 정근수당 지급대상기간 전년도 7월 1일부터 12월 31일"
        queries = (
            (f"{command.question_text} {payment_boundary_query}"),
            ("정근수당 휴직 실제 근무한 기간 지방공무원 보수규정 제14조제3호의2 육아휴직"),
            ("육아휴직 승급기간 산입 최초의 1년 확대 요건 셋째 이후 자녀"),
            "고정급적연봉제 성과급적연봉제 정근수당 별도 지급하지 않는다",
        )
        retrieved: dict[str, Provision] = {}
        try:
            for query in queries:
                result = self._derived_pay_retrieval.retrieve(
                    query,
                    config_id=self._retrieval_config_id,
                    top_k=8,
                    reference_date=reference_date,
                    subject="local_general_service",
                    topic_tags=frozenset({"pay_and_allowance"}),
                    rerank=False,
                )
                for provision in result.context:
                    if provision.provision_id in self._derived_pay_provisions:
                        retrieved[provision.provision_id] = provision
        except ProviderRuntimeError as exc:
            return self._safe_failure(
                f"provider_{exc.failure.code.value}",
                confirmed,
                local_status,
                assumed_conditions=assumed,
                assumption_profile_id=assumption_profile_id,
            )
        review_context = self._required_regular_allowance_evidence(
            tuple(retrieved.values()),
            reference_date=reference_date,
        )
        if review_context is None:
            return self._safe_failure(
                "required_regular_allowance_evidence_missing",
                confirmed,
                local_status,
                assumed_conditions=assumed,
                assumption_profile_id=assumption_profile_id,
            )
        values = {condition.field_name: condition.value for condition in conditions}
        leave_periods = values.get("leave_periods")
        other_periods = values.get("other_nonservice_periods")
        if not (
            isinstance(values.get("reinstatement_date"), date)
            and isinstance(leave_periods, tuple)
            and all(isinstance(item, DateRange) for item in leave_periods)
            and isinstance(values.get("prior_same_child_leave_months"), int)
            and isinstance(values.get("salary_on_payment_date"), bool)
            and isinstance(values.get("disciplinary_action_in_period"), bool)
            and isinstance(other_periods, tuple)
            and all(isinstance(item, DateRange) for item in other_periods)
            and isinstance(values.get("annual_salary_exclusion_applies"), bool)
        ):
            return self._safe_failure(
                "invalid_regular_allowance_conditions",
                confirmed,
                local_status,
                assumed_conditions=assumed,
                assumption_profile_id=assumption_profile_id,
            )
        child_order = values.get("child_order")
        expanded = values.get("expanded_parental_leave_eligibility")
        expanded_months = (
            1_200
            if isinstance(child_order, int) and child_order >= 3
            else 18
            if expanded is True
            else 12
        )
        allowance = self._rules.regular_service_allowance_rate(
            payment_date=reference_date,
            reinstatement_date=values["reinstatement_date"],
            leave_periods=leave_periods,
            prior_same_child_leave_months=values["prior_same_child_leave_months"],
            salary_on_payment_date=values["salary_on_payment_date"],
            disciplinary_action_in_period=values["disciplinary_action_in_period"],
            other_nonservice_periods=other_periods,
            annual_salary_exclusion_applies=values["annual_salary_exclusion_applies"],
            expanded_parental_leave_months=expanded_months,
        )
        if not allowance.eligible or allowance.rate_percent is None:
            return ReviewAnswer(
                status=AnswerStatus.REVIEW_REQUIRED,
                short_answer=(
                    "정근수당 지급 제외조건이 확인돼 비율을 계산하지 않았습니다. "
                    "실제 기록과 질문 기준일의 원문을 확인한 뒤 다시 문의해 주세요."
                ),
                confirmed_conditions=confirmed,
                assumed_conditions=assumed,
                assumption_profile_id=assumption_profile_id,
                review_reasons=allowance.review_reasons,
                limitations=("최종 지급 여부나 금액은 실제 기록과 원문을 함께 확인해 주세요.",),
                data_as_of=self._data_as_of,
                local_rule_status=local_status,
                model_id=self._model_id,
            )
        citations = tuple(
            self._citation_for(
                provision,
                source_names=self._derived_pay_source_names,
                source_urls=self._derived_pay_source_urls,
            )
            for provision in review_context
        )
        rate_text = (
            str(int(allowance.rate_percent))
            if allowance.rate_percent.is_integer()
            else str(allowance.rate_percent)
        )
        period_label = (
            f"{reference_date.year}년 상반기"
            if reference_date.month == 7
            else f"{reference_date.year - 1}년 하반기"
        )
        deterministic_claim = Claim(
            claim_id="CLAIM-REGULAR-ALLOWANCE-RATE",
            text=(
                f"{period_label} 정근수당은 제6조제1항의 "
                f"정근수당액 대비 {rate_text}%로 판단됩니다. 육아휴직 산입기간과 "
                f"복직 후 근무기간을 합한 실제 근무기간은 "
                f"{allowance.actual_service_months}개월입니다."
            ),
            citation_ids=tuple(citation.citation_id for citation in citations[:3]),
            kind=ClaimKind.REVIEW_POSITION,
        )
        computed_conditions = (
            *conditions,
            ConditionValue(
                "deterministic_rate_percent",
                allowance.rate_percent,
                ConditionState.CONFIRMED,
                self._rules.version,
            ),
            ConditionValue(
                "deterministic_service_months",
                allowance.actual_service_months,
                ConditionState.CONFIRMED,
                self._rules.version,
            ),
        )
        context = QuestionContext(
            request_id=command.request_id,
            question_text=command.question_text,
            employee_system=command.employee_system,
            employee_category=command.employee_category,
            leave_type=classification.leave_type,
            reference_date=reference_date,
            conditions=computed_conditions,
            local_rule_status=local_status,
            intent=classification.intent,
        )
        try:
            draft = self._model.draft(context, review_context, citations)
        except ProviderRuntimeError as exc:
            return self._safe_failure(
                f"provider_{exc.failure.code.value}",
                confirmed,
                local_status,
                assumed_conditions=assumed,
                assumption_profile_id=assumption_profile_id,
            )
        model_explanation = tuple(draft.claims[1:3])
        if not model_explanation or not all(
            self._regular_allowance_model_claim_is_safe(claim) for claim in model_explanation
        ):
            model_explanation = self._regular_allowance_fallback_claims(
                citations,
                reference_date=reference_date,
            )
        claims = (deterministic_claim, *model_explanation)
        validation = self._derived_pay_validator.validate(
            reference_date=reference_date,
            subject="local_general_service",
            citations=citations,
            claims=claims,
            # 지급률과 실근무기간은 규칙엔진이 계산한 값이라 조문 본문에 없다.
            # 결정적 claim을 근거로 선언해야 모델 설명이 같은 수치를 되풀이할 수 있다.
            grounded_values=(
                *condition_quantities(computed_conditions),
                deterministic_claim.text,
            ),
        )
        if not validation.valid:
            return self._safe_failure(
                validation.reason_codes[0],
                confirmed,
                local_status,
                assumed_conditions=assumed,
                assumption_profile_id=assumption_profile_id,
            )
        deterministic_status = decision_status
        corpus_reason = None
        if self._derived_pay_corpus_status == "pending_human_approval":
            deterministic_status = self._more_conservative_status(
                deterministic_status, AnswerStatus.REVIEW_REQUIRED
            )
            corpus_reason = "candidate_corpus_unapproved"
        final_status = self._more_conservative_status(
            deterministic_status, draft.recommended_status
        )
        model_reason = self._model_status_reason(deterministic_status, final_status)
        return ReviewAnswer(
            status=final_status,
            short_answer=deterministic_claim.text,
            confirmed_conditions=confirmed,
            assumed_conditions=assumed,
            assumption_profile_id=assumption_profile_id,
            citations=citations,
            claims=claims,
            review_reasons=tuple(
                dict.fromkeys(
                    (
                        *decision_reasons,
                        *((corpus_reason,) if corpus_reason else ()),
                        *((model_reason,) if model_reason else ()),
                    )
                )
            ),
            limitations=tuple(
                dict.fromkeys(
                    (
                        *(
                            ("표시한 가정과 실제 상태가 다르면 실제 조건으로 다시 질문해 주세요.",)
                            if assumed
                            else ()
                        ),
                        "표시된 비율은 제6조제1항의 근무연수별 정근수당액에 적용되는 산정 비율이며 원화 금액이 아닙니다.",
                        "현재 법령 원문은 사람 승인 전 후보 자료입니다. 질문 기준일의 원문과 실제 기록을 함께 확인해 주세요.",
                    )
                )
            ),
            data_as_of=self._data_as_of,
            local_rule_status=local_status,
            model_id=self._model_id,
            model_used=True,
            model_recommended_status=draft.recommended_status,
        )

    @staticmethod
    def _required_regular_allowance_evidence(
        provisions: tuple[Provision, ...],
        *,
        reference_date: date,
    ) -> tuple[Provision, ...] | None:
        boundary_path = "제6조 제1항 제2호" if reference_date.month == 7 else "제6조 제1항 제1호"
        boundary_terms = (
            ("7월 1일", "6월 30일") if reference_date.month == 7 else ("1월 1일", "12월 31일")
        )
        checks: tuple[Callable[[Provision], bool], ...] = (
            lambda item: (
                item.article_path == boundary_path
                and all(term in item.text for term in boundary_terms)
            ),
            lambda item: "실제 근무한 기간" in item.text and "제3호의2" in item.text,
            lambda item: "제63조제2항제4호" in item.text and "최초의 1년" in item.text,
            lambda item: "연봉제" in item.text and "정근수당" in item.text,
        )
        selected: list[Provision] = []
        for check in checks:
            match = next((item for item in provisions if check(item)), None)
            if match is None:
                return None
            if match.provision_id not in {item.provision_id for item in selected}:
                selected.append(match)
        return tuple(selected)

    @staticmethod
    def _regular_allowance_model_claim_is_safe(claim: Claim) -> bool:
        normalized = re.sub(r"\s+", "", claim.text)
        if "휴직처분이없" in normalized or "휴직처분없" in normalized:
            return False
        if "육아휴직" in normalized and re.search(
            r"(?:지급대상|실제근무|산입)[^.]{0,35}?(?:아니|않|제외)",
            normalized,
        ):
            return False
        return True

    @staticmethod
    def _regular_allowance_fallback_claims(
        citations: tuple[Citation, ...],
        *,
        reference_date: date,
    ) -> tuple[Claim, ...]:
        by_path = {citation.article_path: citation.citation_id for citation in citations}
        boundary_path = "제6조 제1항 제2호" if reference_date.month == 7 else "제6조 제1항 제1호"
        payment_date_label = f"{reference_date.month}월 {reference_date.day}일"
        service_ids = tuple(
            citation_id
            for citation_id in (
                by_path.get("제6조 제2항"),
                by_path.get("제14조 제3호의2"),
            )
            if citation_id is not None
        )
        boundary_ids = tuple(
            citation_id
            for citation_id in (
                by_path.get(boundary_path),
                by_path.get("제6조 제2항"),
                by_path.get("제19조 제10항"),
            )
            if citation_id is not None
        )
        return (
            Claim(
                claim_id="CLAIM-REGULAR-ALLOWANCE-BASIS",
                text=(
                    "「지방공무원 수당 등에 관한 규정」 제6조제2항과 "
                    "「지방공무원 보수규정」 제14조제3호의2에 따라, 같은 자녀의 "
                    "기본 산입 한도 내 육아휴직 기간은 실제 근무기간으로 봅니다."
                ),
                citation_ids=service_ids,
                kind=ClaimKind.BASIS,
            ),
            Claim(
                claim_id="CLAIM-REGULAR-ALLOWANCE-BOUNDARY",
                text=(
                    f"{payment_date_label} 재직 여부나 지급제외조건이 가정과 다르면 실제 조건으로 "
                    "다시 질문해 주세요."
                ),
                citation_ids=boundary_ids,
                kind=ClaimKind.NEXT_CHECK,
            ),
        )

    @staticmethod
    def _has_established_scope(known: dict[str, object]) -> bool:
        """Return True when an earlier turn already fixed a supported review lane."""
        supported_leave_values = {
            LeaveType.PARENTAL.value,
            LeaveType.MEDICAL.value,
            LeaveType.FAMILY_CARE.value,
            LeaveType.SELF_DEVELOPMENT.value,
        }
        return bool(
            isinstance(known.get("topic"), str)
            or known.get("leave_type") in supported_leave_values
            or known.get("allowance_type") == "regular_service_allowance"
        )

    def _classification_for(
        self,
        question_text: str,
        known_conditions: tuple[ConditionValue, ...],
    ) -> QuestionClassification:
        known = {item.field_name: item.value for item in known_conditions}
        current = self._classifier.classify(
            question_text,
            has_established_scope=self._has_established_scope(known),
        )
        elliptical = self._classifier.is_elliptical_followup(question_text)
        # 줄여 부른 유형은 생략형 후속에서만 해석한다. 하지 않으면 "가족돌봄은요?"가
        # 유형 미상으로 남고, 아래 이월 규칙들이 앞 턴의 유형을 되살려 육아휴직 조문으로
        # 답한다. 두 개 이상을 부르면 고르지 않는다 — 되묻는 쪽이 옳다.
        #
        # 생략형으로 한정하는 이유: "자녀 질병 간호입니다"는 가족돌봄 대화의 조건
        # 답변이지 질병휴직으로 갈아타겠다는 말이 아니다. 어디서나 줄임말을 읽으면
        # 그런 문장이 lane을 바꾼다.
        named_leave_types = (
            self._classifier.named_leave_types(question_text)
            if elliptical and current.leave_type is LeaveType.UNKNOWN and current.in_scope
            else ()
        )
        if len(named_leave_types) == 1:
            current = replace(current, leave_type=named_leave_types[0])
        elif len(named_leave_types) > 1:
            current = replace(current, reason_code="ambiguous_leave_type")
        known_topic = known.get("topic")
        if (
            isinstance(known_topic, str)
            and current.review_tier == "deep_review"
            and current.leave_type is LeaveType.UNKNOWN
            and self._reference_date_followup.search(question_text)
        ):
            return QuestionClassification(
                leave_type=LeaveType.UNKNOWN,
                is_reinstatement=False,
                in_scope=True,
                intent="evidence_lookup",
                topic=known_topic,
                review_tier="evidence_only",
            )
        established_leave_type = LeaveType(str(known.get("leave_type", "parental")))
        # 후속 턴은 조건값을 나열하는 문장이라 다른 주제의 단어가 부정형으로 섞인다.
        # "징계와 직위해제 같은 제외기간 없고"는 정근수당 규칙이 요구하는 조건을 채운
        # 것이지 징계를 묻는 것이 아닌데, 주제 점수는 그 차이를 모른다. 앞 턴이 정한
        # 휴직 유형을 그대로 말하고 있으면 lane을 유지한다. 실제 주제 전환은 아래
        # 전환 표지로 판단한다.
        stays_in_the_established_lane = current.leave_type is established_leave_type or (
            current.leave_type is LeaveType.UNKNOWN
            and current.topic in {"service_and_leave", "pay_and_allowance"}
        )
        if (
            known.get("allowance_type") == "regular_service_allowance"
            and stays_in_the_established_lane
            and not any(
                marker in question_text for marker in ("초과근무수당", "성과상여금", "명예퇴직수당")
            )
        ):
            return QuestionClassification(
                leave_type=LeaveType(str(known.get("leave_type", "parental"))),
                is_reinstatement=True,
                in_scope=True,
                intent="regular_service_allowance_review",
                topic="pay_and_allowance",
                review_tier="deep_review",
            )
        known_leave_type = known.get("leave_type")
        supported_leave_values = {
            LeaveType.PARENTAL.value,
            LeaveType.MEDICAL.value,
            LeaveType.FAMILY_CARE.value,
            LeaveType.SELF_DEVELOPMENT.value,
        }
        known_task = known.get("task")
        # 생략형 후속. "육아휴직 근거 조문 찾아주세요" 다음의 "질병휴직는요?"는 대상만
        # 바꿔 같은 과업을 잇는 발화인데, 분류기는 대상어만 보고 새 자격 검토로 읽어
        # 조건을 처음부터 다시 물었다. 앞 턴의 과업을 이어받는다.
        #
        # 게이트는 풀지 않는다. 이어받는 것은 과업뿐이고 필수 조건 판정은 그대로
        # `ConditionPolicy`가 한다 — 근거 검색 과업의 필수값(휴직 유형·기준일)이
        # 비어 있으면 이 경로로도 되묻는다. 이 턴이 스스로 과업을 말했으면(`되나요`,
        # `조문`) 그 말을 따르고 이어받지 않는다.
        if (
            isinstance(known_task, str)
            and current.in_scope
            and current.review_tier == "deep_review"
            and current.intent != known_task
            and elliptical
        ):
            carried_leave_type = current.leave_type
            if (
                carried_leave_type is LeaveType.UNKNOWN
                and not named_leave_types
                and isinstance(known_leave_type, str)
                and known_leave_type in supported_leave_values
            ):
                carried_leave_type = LeaveType(known_leave_type)
            return QuestionClassification(
                leave_type=carried_leave_type,
                is_reinstatement=current.is_reinstatement,
                in_scope=True,
                intent=known_task,
                # 이월하는 것은 과업뿐이다. 이 턴이 모호하다는 판정까지 지우면
                # 유형을 못 정한 채로 앞 턴의 유형이 되살아난다.
                reason_code=current.reason_code,
                topic=current.topic,
                review_tier="deep_review",
            )
        if (
            isinstance(known_leave_type, str)
            and known_leave_type in supported_leave_values
            and current.leave_type is LeaveType.UNKNOWN
            and not named_leave_types
            and current.review_tier == "deep_review"
        ):
            return QuestionClassification(
                leave_type=LeaveType(known_leave_type),
                is_reinstatement=current.is_reinstatement,
                in_scope=True,
                intent=current.intent,
                reason_code=current.reason_code,
                topic="service_and_leave",
                review_tier="deep_review",
            )
        # 모든 이월·alias 해석이 끝났는데도 유형이 UNKNOWN이고 deep_review이면,
        # 심층 검토는 leave_type 필수라 되묻기만 반복한다. evidence_only로 전환해
        # 기준일만으로 근거를 찾아준다.
        #
        # 두 가지는 제외한다:
        # (1) 진짜 결정 표지("가능", "신청", "할 수 있")가 있으면 유형 없이 결론을
        #     내릴 수 없으므로 되묻는 게 맞다.
        # (2) synonym 확장으로 scope에 들어온 경우("애 키우느라" → 휴직). 이 경로는
        #     leave_type을 UNKNOWN으로 두고 되묻도록 의도적으로 설계됐다 — 육아인지
        #     가족돌봄인지 모호하므로 조문을 먼저 주면 틀린 근거를 줄 수 있다.
        has_eligibility_signal = any(
            term in question_text
            for term in self._classifier._eligibility_task_markers
        )
        expanded_into_scope = self._classifier._expands_to_leave_vocabulary(
            question_text
        )
        if (
            current.leave_type is LeaveType.UNKNOWN
            and current.review_tier == "deep_review"
            and current.in_scope
            and not has_eligibility_signal
            and not expanded_into_scope
        ):
            return replace(
                current,
                intent="evidence_lookup",
                review_tier="evidence_only",
            )
        return current

    def _handle_evidence_lookup(
        self,
        *,
        command: ReviewCommand,
        classification: object,
        conditions: tuple[ConditionValue, ...],
        confirmed: tuple[str, ...],
        local_status: LocalRuleStatus,
        reference_date: date,
        decision_reasons: tuple[str, ...],
        assumed: tuple[str, ...] = (),
        assumption_profile_id: str | None = None,
    ) -> ReviewAnswer:
        topic = str(getattr(classification, "topic", ""))
        source_ids = (
            frozenset().union(*self._evidence_topic_source_ids.values())
            if topic == "all_personnel"
            else self._evidence_topic_source_ids.get(topic, frozenset())
        )
        if self._evidence_retrieval is None or not source_ids:
            return ReviewAnswer(
                status=AnswerStatus.REVIEW_REQUIRED,
                short_answer=(
                    "이 주제는 공개 규정 근거 검색 대상이지만 로컬 공식 corpus가 "
                    "연결되지 않아 원문 검색을 시작하지 못했습니다."
                ),
                confirmed_conditions=confirmed,
                assumed_conditions=assumed,
                assumption_profile_id=assumption_profile_id,
                review_reasons=(*decision_reasons, "wide_corpus_unavailable"),
                limitations=("휴직·복직 심층 검토와 넓은 인사규정 근거 검색은 별도로 제공됩니다.",),
                data_as_of=self._data_as_of,
                local_rule_status=local_status,
                model_id=self._model_id,
            )
        try:
            result = self._evidence_retrieval.retrieve(
                command.question_text,
                config_id=self._retrieval_config_id,
                top_k=5,
                reference_date=reference_date,
                subject="local_general_service",
                source_ids=source_ids,
            )
        except ProviderRuntimeError as exc:
            return self._safe_failure(f"provider_{exc.failure.code.value}", confirmed, local_status)
        temporal_fallback = False
        if not result.context or result.context_incomplete:
            if result.reason == "invalid_effective_version":
                # 시점 필터에서 전부 걸렸지만 필터 전 후보는 있었다. 시점 제약 없이
                # 재검색해서 관련 조문을 참고용으로 LLM에 넘긴다. "이 기준일에 유효성이
                # 확인되지 않았다"는 경고를 limitations에 강하게 붙인다.
                fallback = self._evidence_retrieval.retrieve(
                    command.question_text,
                    config_id="B0",
                    top_k=5,
                    source_ids=source_ids,
                )
                if fallback.context:
                    result = fallback
                    temporal_fallback = True
                else:
                    return ReviewAnswer(
                        status=AnswerStatus.INSUFFICIENT_EVIDENCE,
                        short_answer=(
                            f"질문 기준일({reference_date.isoformat()})에 유효한 공식 규정 "
                            "버전을 연결된 자료에서 확인하지 못했습니다. 금액이나 지급률 "
                            "결론을 만들지 않고 답변을 보류합니다."
                        ),
                        confirmed_conditions=confirmed,
                        assumed_conditions=assumed,
                        assumption_profile_id=assumption_profile_id,
                        review_reasons=(
                            "invalid_effective_version",
                            "evidence_only_human_review",
                        ),
                        limitations=(
                            "현재 연결된 공식 원문 후보는 과거 시점 전체를 보장하지 않습니다.",
                            "질문 기준일 당시의 원문과 기관 규정을 직접 확인해 주세요.",
                        ),
                        data_as_of=self._data_as_of,
                        local_rule_status=local_status,
                        model_id=self._model_id,
                    )
            else:
                return ReviewAnswer(
                    status=AnswerStatus.INSUFFICIENT_EVIDENCE,
                    short_answer="질문 기준일에 연결할 수 있는 검증 가능한 공식 근거를 찾지 못했습니다.",
                    confirmed_conditions=confirmed,
                    assumed_conditions=assumed,
                    assumption_profile_id=assumption_profile_id,
                    review_reasons=(
                        result.reason or "insufficient_retrieval_context",
                        "evidence_only_human_review",
                    ),
                    limitations=("검증 가능한 근거가 없어 결론을 제공하지 않습니다.",),
                    data_as_of=self._data_as_of,
                    local_rule_status=local_status,
                    model_id=self._model_id,
                )
        citations = tuple(
            self._citation_for(
                provision,
                source_names=self._evidence_source_names,
                source_urls=self._evidence_source_urls,
            )
            for provision in result.context
        )
        rule_check = self._rules.validate_temporal_and_citations(
            reference_date,
            result.context,
            tuple(citation.provision_id for citation in citations),
        )
        if not rule_check.passed:
            return self._safe_failure(rule_check.review_reasons[0], confirmed, local_status)
        context = QuestionContext(
            request_id=command.request_id,
            question_text=command.question_text,
            employee_system=command.employee_system,
            employee_category=command.employee_category,
            reference_date=reference_date,
            conditions=conditions,
            local_rule_status=local_status,
            intent=str(getattr(classification, "intent", "unknown")),
        )
        try:
            draft = self._model.draft(context, result.context, citations)
            claims = tuple(draft.claims)
        except ProviderRuntimeError as exc:
            return self._safe_failure(f"provider_{exc.failure.code.value}", confirmed, local_status)
        # evidence_only에서 LLM은 검색된 전체 조문을 보고 답하지만, claim마다 citation을
        # 하나만 단다. 다른 조문에서 본 날짜를 citation이 다른 claim에 쓰면 grounding이
        # "인용한 조문에 없다"고 잡는다. 검색된 전체 조문 텍스트를 grounded_values에 넣어
        # cross-citation 참조를 허용한다.
        all_evidence_texts = tuple(
            text
            for provision in result.context
            for text in (provision.text, provision.proviso_text or "", provision.title)
            if text
        )
        validation = self._evidence_validator.validate(
            reference_date=reference_date,
            subject="local_general_service",
            citations=citations,
            claims=claims,
            grounded_values=condition_quantities(conditions) + all_evidence_texts,
        )
        status_reason = (
            "candidate_corpus_unapproved"
            if self._evidence_corpus_status == "pending_human_approval"
            else "evidence_only_human_review"
        )
        if not claims or not validation.valid:
            # 이 lane이 약속하는 것은 결론이 아니라 근거 조문이다. 모델 문장이 검증에
            # 걸렸을 때 버려야 할 것은 그 문장이지, 시점·인용 검증을 이미 통과한 조문이
            # 아니다. 종전에는 `_safe_failure`로 빠져 인용 0건에 "근거가 부족하다"고
            # 답했고, 검색이 성공한 질문에 사용자는 실패를 봤다. local 프로필의 승진
            # 질문이 실제로 그렇게 끝났다.
            return ReviewAnswer(
                status=AnswerStatus.REVIEW_REQUIRED,
                short_answer=(
                    "질문 기준일에 유효한 근거 조문을 찾았어요. 생성한 설명 문장은 "
                    "인용문으로 뒷받침되지 않아 폐기했으니 아래 조문을 직접 확인해 주세요."
                ),
                confirmed_conditions=confirmed,
                assumed_conditions=assumed,
                assumption_profile_id=assumption_profile_id,
                citations=citations,
                review_reasons=tuple(
                    dict.fromkeys(
                        (
                            *decision_reasons,
                            status_reason,
                            *validation.reason_codes,
                            *(() if claims else ("draft_empty",)),
                            "model_draft_discarded",
                        )
                    )
                ),
                limitations=(
                    *(
                        (
                            f"⚠ 질문 기준일({reference_date.isoformat()})에 유효한 조문 버전이 "
                            "확인되지 않아 시점 검증 없이 참고용 조문을 검색했습니다.",
                        )
                        if temporal_fallback
                        else ()
                    ),
                    "모델 초안이 인용문에 없는 값을 포함해 폐기했습니다. 조문만 제공합니다.",
                    "이 주제는 근거 검색만 지원하며 자격·금액·처분 결과는 판단하지 않습니다.",
                ),
                data_as_of=self._data_as_of,
                local_rule_status=local_status,
                model_id=self._model_id,
                model_used=True,
            )
        short_answer = claims[0].text
        final_status = self._more_conservative_status(
            AnswerStatus.REVIEW_REQUIRED, draft.recommended_status
        )
        model_reason = self._model_status_reason(AnswerStatus.REVIEW_REQUIRED, final_status)
        # 근거가 나왔다고 그 기준일을 다룰 수 있다는 뜻은 아니다. 시점 필터는 조문 단위로
        # 걸러내므로, 정작 그 주제를 정하는 법령에 해당 날짜의 버전이 없어도 다른 법령이
        # 살아남아 결과는 비지 않는다. 사용자는 그것을 답으로 읽는다. 빠진 법령을 이름으로
        # 말한다. 목록에서 빠졌다는 사실만으로는 알 수 없다.
        #
        # 판정 단위는 source_id가 아니라 법령이다. 같은 법령의 과거 스냅샷은 별도
        # source_id로 들어와 있고, 폐기됐으니 현재 시점에 유효한 조문이 없는 것이
        # 정상이다. source_id로 세면 오늘 날짜 질문에도 경고가 붙어 아무 뜻이 없어진다.
        # 매니페스트가 같은 법령의 스냅샷에 같은 `source_name`을 주므로 그것으로 묶는다.
        version_gap = set(
            self._evidence_retrieval.sources_without_effective_version(
                reference_date, "local_general_service", source_ids
            )
        )
        families: dict[str, set[str]] = {}
        for source_id in source_ids:
            name = self._evidence_source_names.get(source_id, source_id)
            families.setdefault(name, set()).add(source_id)
        gap_names = tuple(sorted(name for name, ids in families.items() if ids <= version_gap))
        if temporal_fallback:
            final_status = AnswerStatus.REVIEW_REQUIRED
        return ReviewAnswer(
            status=final_status,
            short_answer=short_answer,
            confirmed_conditions=confirmed,
            assumed_conditions=assumed,
            assumption_profile_id=assumption_profile_id,
            citations=citations,
            claims=claims,
            review_reasons=tuple(
                dict.fromkeys(
                    (
                        *decision_reasons,
                        status_reason,
                        *((model_reason,) if model_reason else ()),
                        *(("source_version_gap",) if gap_names else ()),
                        *(("temporal_fallback",) if temporal_fallback else ()),
                    )
                )
            ),
            limitations=(
                *(
                    (
                        f"⚠ 질문 기준일({reference_date.isoformat()})에 유효한 조문 버전이 "
                        "확인되지 않아 시점 검증 없이 참고용 조문을 검색했습니다. "
                        "아래 근거가 해당 기준일에 적용되는지 원문으로 직접 확인해 주세요.",
                    )
                    if temporal_fallback
                    else ()
                ),
                *(
                    (
                        f"질문 기준일({reference_date.isoformat()})에 유효한 버전이 없는 "
                        f"법령이 있습니다: {', '.join(gap_names)}. 이 법령의 조문은 "
                        "아래 근거에 포함되지 않았습니다.",
                    )
                    if gap_names
                    else ()
                ),
                "이 주제는 근거 검색만 지원하며 자격·금액·처분 결과는 판단하지 않습니다.",
                "공식 원문 후보는 자동 구조 감사를 통과했지만 사람 승인은 아직 받지 않았습니다.",
            ),
            data_as_of=self._data_as_of,
            local_rule_status=local_status,
            model_id=self._model_id,
            model_used=True,
            model_recommended_status=draft.recommended_status,
        )

    @staticmethod
    def _more_conservative_status(deterministic: AnswerStatus, model: AnswerStatus) -> AnswerStatus:
        rank = {
            AnswerStatus.ANSWERABLE: 0,
            AnswerStatus.REVIEW_REQUIRED: 1,
            AnswerStatus.INSUFFICIENT_EVIDENCE: 2,
        }
        return deterministic if rank[deterministic] >= rank[model] else model

    @staticmethod
    def _model_status_reason(deterministic: AnswerStatus, final: AnswerStatus) -> str | None:
        if deterministic is final:
            return None
        if final is AnswerStatus.INSUFFICIENT_EVIDENCE:
            return "model_recommends_insufficient_evidence"
        return "model_recommends_human_review"

    @staticmethod
    def _merge_conditions(
        known: tuple[ConditionValue, ...],
        current: tuple[ConditionValue, ...],
        *,
        invalidated: tuple[str, ...] = (),
    ) -> tuple[ConditionValue, ...]:
        merged = {
            condition.field_name: condition
            for condition in known
            if condition.field_name not in invalidated
        }
        for condition in current:
            existing = merged.get(condition.field_name)
            if existing is None or condition.state is ConditionState.CONFIRMED:
                merged[condition.field_name] = condition
        return tuple(merged[key] for key in sorted(merged))

    @staticmethod
    def _reference_date(conditions: tuple[ConditionValue, ...]) -> date | None:
        return next(
            (
                condition.value
                for condition in conditions
                if condition.field_name == "reference_date"
                and condition.state is ConditionState.CONFIRMED
                and isinstance(condition.value, date)
            ),
            None,
        )

    def _deep_review_context(
        self,
        retrieved: tuple[Provision, ...],
        leave_type: LeaveType,
        reference_date: date,
        conditions: tuple[ConditionValue, ...],
        *,
        is_reinstatement: bool,
    ) -> tuple[Provision, ...]:
        if self._deep_corpus_status == "synthetic_regression":
            return retrieved[:10]

        by_path: dict[str, list[Provision]] = {}
        for provision in retrieved:
            by_path.setdefault(provision.article_path, []).append(provision)

        def pick(path: str, *terms: str) -> Provision | None:
            return next(
                (
                    provision
                    for provision in by_path.get(path, ())
                    if all(term in provision.text for term in terms)
                    and provision.is_effective_on(reference_date, "local_general_service")
                ),
                None,
            )

        selected: list[Provision] = []
        required: tuple[Provision | None, ...]
        if leave_type is LeaveType.PARENTAL:
            required = (
                pick("제63조 제2항 제4호", "자녀"),
                pick("제64조 제8호", "자녀 1명", "3년"),
            )
            if is_reinstatement:
                required = (*required, self._pick_reinstatement_evidence(retrieved, reference_date))
        elif leave_type is LeaveType.MEDICAL:
            required = (
                pick("제63조 제1항 제1호", "장기요양"),
                pick("제64조 제1호", "1년"),
            )
            basis = next(
                (
                    condition.value
                    for condition in conditions
                    if condition.field_name == "medical_leave_basis"
                    and condition.state is ConditionState.CONFIRMED
                ),
                None,
            )
            if basis == "public_duty":
                public_basis = pick("제64조 제1호 가목", "요양급여") or pick(
                    "제64조 제1호 나목", "요양급여"
                )
                required = (*required, public_basis)
            if is_reinstatement:
                required = (
                    *required,
                    self._pick_reinstatement_evidence(retrieved, reference_date),
                )
        else:
            return retrieved[:10]

        if any(provision is None for provision in required):
            return ()
        resolved_required = tuple(item for item in required if item is not None)
        for item in resolved_required:
            if item.provision_id not in {existing.provision_id for existing in selected}:
                selected.append(item)

        for provision in tuple(selected):
            for relation_id in provision.relation_ids:
                related = self._provisions.get(relation_id)
                if (
                    related is not None
                    and {"proviso", "supplementary"} & related.topic_tags
                    and related.is_effective_on(reference_date, "local_general_service")
                    and related.provision_id not in {item.provision_id for item in selected}
                ):
                    selected.append(related)
        return tuple(selected)

    @staticmethod
    def _deep_evidence_queries(
        leave_type: LeaveType,
        is_reinstatement: bool,
        conditions: tuple[ConditionValue, ...],
    ) -> tuple[str, ...]:
        if leave_type is LeaveType.PARENTAL:
            queries = [
                "지방공무원법 제63조제2항제4호 육아휴직 자녀 양육",
                "지방공무원법 제64조제8호 육아휴직 자녀 1명 3년",
            ]
        elif leave_type is LeaveType.MEDICAL:
            queries = [
                "지방공무원법 제63조제1항제1호 질병휴직 장기요양",
                "지방공무원법 제64조제1호 질병휴직 기간 1년 연장",
            ]
            basis = next(
                (
                    condition.value
                    for condition in conditions
                    if condition.field_name == "medical_leave_basis"
                    and condition.state is ConditionState.CONFIRMED
                ),
                None,
            )
            if basis == "public_duty":
                queries.append("지방공무원법 제64조제1호 가목 나목 공무상 요양급여")
        else:
            return ()
        if is_reinstatement:
            queries.append(
                "지방공무원법 제65조 휴직 사유 소멸 복직 복귀신고 "
                "인사제도 운영지침 정상근무 가능 진단서"
            )
        return tuple(queries)

    @staticmethod
    def _pick_reinstatement_evidence(
        retrieved: tuple[Provision, ...], reference_date: date
    ) -> Provision | None:
        candidates = tuple(
            provision
            for provision in retrieved
            if provision.is_effective_on(reference_date, "local_general_service")
        )
        return next(
            (
                provision
                for provision in candidates
                if provision.article_path == "제70조 제3항"
                and "정상적인 근무" in provision.text
                and "복직" in provision.text
            ),
            None,
        ) or next(
            (
                provision
                for provision in candidates
                if provision.article_path in {"제65조 제2항", "제65조 제3항"}
                and "복직" in provision.text
            ),
            None,
        )

    def _citation_for(
        self,
        provision: Provision,
        *,
        source_names: dict[str, str] | None = None,
        source_urls: dict[str, str] | None = None,
    ) -> Citation:
        names = source_names or {}
        urls = source_urls or {}
        return Citation(
            citation_id=f"CITE-{provision.provision_id}",
            source_id=provision.source_id,
            provision_id=provision.provision_id,
            source_name=names.get(provision.source_id, "합성 법령 시나리오"),
            article_path=provision.article_path,
            effective_from=provision.valid_time.start,
            effective_to=provision.valid_time.end,
            source_url=urls.get(
                provision.source_id,
                f"https://example.invalid/synthetic/{provision.provision_id}",
            ),
            title=provision.title,
            excerpt=provision.text.strip()[:360],
        )

    _condition_readback = {
        "leave_type": "휴직 유형",
        "reference_date": "질문 기준일",
        "child_birth_date": "자녀 생년월일",
        "previous_leave_periods": "같은 자녀의 이전 육아휴직 기간",
        "medical_leave_basis": "질병휴직의 공무상·비공무상 구분",
        "care_recipient_relation": "돌봄 대상과의 관계",
        "application_purpose": "자기개발휴직 신청 목적",
    }

    def _evidence_handover(
        self,
        *,
        citations: tuple[Citation, ...],
        confirmed: tuple[str, ...],
        assumed: tuple[str, ...],
        assumption_profile_id: str | None,
        local_status: LocalRuleStatus,
        reasons: tuple[str, ...],
    ) -> ReviewAnswer:
        """Hand the reviewer the provisions when no conclusion may be written.

        "판단은 담당자가" 한 줄로 끝내면 도구가 아니다. 확인한 조건을 되읽어 주고 어느
        조문을 봐야 하는지 조 번호로 짚는다. 문장은 전부 결정적으로 만들며 조문에 없는
        수치는 넣지 않는다 — 그것이 이 경로로 오게 된 이유이기 때문이다.
        """
        read = [
            self._condition_readback[field]
            for field in confirmed
            if field in self._condition_readback
        ]
        articles = " · ".join(dict.fromkeys(citation.article_path for citation in citations))
        checked = f"{'·'.join(read)}까지 확인했어요. " if read else ""
        return ReviewAnswer(
            status=AnswerStatus.REVIEW_REQUIRED,
            short_answer=(
                f"{checked}다만 이 조건만으로 결론 문장을 만들지 않았어요. "
                f"판단에 필요한 근거는 {articles}이니 이 조문을 직접 확인해 주세요."
            ),
            confirmed_conditions=confirmed,
            assumed_conditions=assumed,
            assumption_profile_id=assumption_profile_id,
            citations=citations,
            review_reasons=tuple(dict.fromkeys(reasons)),
            limitations=(
                "생성한 초안이 인용문에 없는 값을 포함해 폐기했습니다. 조문만 제공합니다.",
                "질문 기준일의 원문과 기관 규정을 함께 확인해 주세요.",
            ),
            data_as_of=self._data_as_of,
            local_rule_status=local_status,
            model_id=self._model_id,
            model_used=True,
        )

    def _out_of_corpus_scope(
        self, confirmed: tuple[str, ...], local_status: LocalRuleStatus
    ) -> ReviewAnswer:
        """End a question the corpus cannot support — and say what it does hold.

        The old message claimed the product only supports 휴직·복직. That is false:
        eight wide personnel topics are indexed. Telling a 가점 question that the
        product does not do 인사 questions is both wrong and a dead end.
        """
        return ReviewAnswer(
            status=AnswerStatus.INSUFFICIENT_EVIDENCE,
            short_answer=(
                "이 질문에 연결할 공개 조문을 저장소에서 찾지 못했어요. "
                "지원 범위 밖이거나, 해당 주제의 원문을 아직 수집하지 않은 경우예요."
            ),
            confirmed_conditions=confirmed,
            review_reasons=("no_supported_topic_signal",),
            limitations=(
                "육아·질병·가족돌봄·자기개발 휴직과 복직은 필요한 조건까지 확인해 결론을 정리해요.",
                "임용·인사기록·평정·승진·복무·휴가·보수·수당·징계·소청·교육훈련·"
                "퇴직은 근거 조문을 찾아 드려요.",
                "국가공무원·특정직과 최종 인사처분 판단은 지원하지 않아요.",
            ),
            data_as_of=self._data_as_of,
            local_rule_status=local_status,
            model_id=self._model_id,
        )

    def _safe_failure(
        self,
        reason: str,
        confirmed: tuple[str, ...],
        local_status: LocalRuleStatus,
        *,
        assumed_conditions: tuple[str, ...] = (),
        assumption_profile_id: str | None = None,
    ) -> ReviewAnswer:
        return ReviewAnswer(
            status=AnswerStatus.INSUFFICIENT_EVIDENCE,
            short_answer="근거 또는 검증 조건이 충분하지 않아 답변을 보류합니다.",
            confirmed_conditions=confirmed,
            assumed_conditions=assumed_conditions,
            assumption_profile_id=assumption_profile_id,
            review_reasons=(reason,),
            limitations=("검증되지 않은 답변 초안은 노출하지 않습니다.",),
            data_as_of=self._data_as_of,
            local_rule_status=local_status,
            model_id=self._model_id,
        )
