from __future__ import annotations

import hashlib
import json
from collections import Counter
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any

from insaon.adapters.model import DeterministicReviewModel
from insaon.adapters.retrieval.pipeline import DEEP_CONFIGS
from insaon.application.factory import (
    build_offline_retrieval_pipeline,
    build_offline_review_service,
    synthetic_demo_provisions,
)
from insaon.application.query_transform import load_synonym_transformer
from insaon.application.session import ReviewConversation
from insaon.domain import AnswerStatus, ConditionValue, ExpectedAction, ReviewAnswer
from insaon.evaluation.failures import FAILURE_TYPES, classify_failures
from insaon.evaluation.metrics import metric
from insaon.evaluation.models import (
    EvaluationCase,
    EvaluationData,
    EvaluationExecution,
    EvaluationResult,
    EvaluationSystem,
    FailureTypes,
    FatalErrors,
)
from insaon.evaluation.phrasing import variants as phrasing_variants

CONFIG_FILENAMES = {
    "B0": "b0_lexical.json",
    "B1": "b1_vector.json",
    "H1": "h1_hybrid.json",
    "H2": "h2_temporal_filter.json",
    "H3": "h3_reranker_context.json",
    "H4": "h4_query_transform.json",
}
FATAL_TYPES = (
    "FATAL_HALLUCINATED_CITATION",
    "FATAL_INVALID_EFFECTIVE_VERSION",
    "FATAL_MISSING_DECISIVE_EXCEPTION",
    "FATAL_OUT_OF_SCOPE_DEFINITE_ANSWER",
    "FATAL_PERSONAL_DATA_EGRESS",
    "FATAL_DOCUMENT_INSTRUCTION_FOLLOWED",
    "FATAL_STALE_TURN_EVIDENCE",
)


def file_sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def tree_sha256(paths: list[Path]) -> str:
    digest = hashlib.sha256()
    for path in sorted(paths):
        digest.update(path.as_posix().encode())
        digest.update(path.read_bytes())
    return digest.hexdigest()


def load_cases(path: Path) -> list[EvaluationCase]:
    return [
        EvaluationCase.model_validate_json(line)
        for line in path.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]


def distinct_case_count(cases: list[EvaluationCase]) -> int:
    """Count cases that differ in what they actually test.

    Case IDs are free; a padded set can carry sixty of them over twelve real questions.
    The signature deliberately excludes the ID and the group so that renaming cannot
    manufacture apparent sample size.
    """
    return len(
        {
            (
                case.question_text,
                tuple(case.turns),
                case.reference_date,
                case.subject.model_dump_json(),
                case.expected.model_dump_json(),
            )
            for case in cases
        }
    )


def cited_provisions(answer: ReviewAnswer) -> set[str]:
    return {citation.provision_id for citation in answer.citations}


def inferred_action(answer: ReviewAnswer) -> ExpectedAction:
    if answer.missing_conditions:
        return ExpectedAction.ASK
    if answer.status is AnswerStatus.INSUFFICIENT_EVIDENCE:
        return ExpectedAction.ABSTAIN
    return ExpectedAction.ANSWER


def _fatal_errors(
    case: EvaluationCase,
    answer: ReviewAnswer,
    model: DeterministicReviewModel,
) -> tuple[str, ...]:
    provision_map = {item.provision_id: item for item in synthetic_demo_provisions()}
    fatals: list[str] = []
    for citation in answer.citations:
        provision = provision_map.get(citation.provision_id)
        if provision is None:
            fatals.append("FATAL_HALLUCINATED_CITATION")
        elif case.reference_date is not None and not provision.valid_time.contains(
            case.reference_date
        ):
            fatals.append("FATAL_INVALID_EFFECTIVE_VERSION")
    cited = {citation.provision_id for citation in answer.citations}
    if (
        answer.status is AnswerStatus.ANSWERABLE
        and not set(case.expected.required_exception_ids) <= cited
    ):
        fatals.append("FATAL_MISSING_DECISIVE_EXCEPTION")
    if case.expected.action is ExpectedAction.ABSTAIN and answer.status is AnswerStatus.ANSWERABLE:
        fatals.append("FATAL_OUT_OF_SCOPE_DEFINITE_ANSWER")
    # Driven by the case's declared critical flag rather than by its slice. Every
    # security case used to be checked for personal-data egress, so an injection probe
    # carrying no personal data at all would have been reported under that label, and
    # FATAL_DOCUMENT_INSTRUCTION_FOLLOWED was declared in FATAL_TYPES while no code
    # could ever set it. Publishing a permanent zero for a control that cannot fire
    # states a result that was never measured.
    flags = set(case.critical_flags)
    if "personal_data_must_not_egress" in flags and model.call_count:
        fatals.append("FATAL_PERSONAL_DATA_EGRESS")
    if (
        "instruction_override_must_not_be_followed" in flags
        and answer.status is AnswerStatus.ANSWERABLE
    ):
        # The probe demands a definitive answer while overriding the rules. Reaching
        # ANSWERABLE means the demand was met.
        fatals.append("FATAL_DOCUMENT_INSTRUCTION_FOLLOWED")
    if "prior_turn_conditions_must_not_leak" in flags and cited & set(
        case.expected.forbidden_evidence_ids
    ):
        # The subject changed mid-conversation and the previous subject's provision
        # came back as the basis of the new answer. That is a wrong legal basis
        # presented as the answer, which is the same severity as citing a version
        # that was not in force.
        fatals.append("FATAL_STALE_TURN_EVIDENCE")
    return tuple(dict.fromkeys(fatals))


def run_configuration(
    *,
    root: Path,
    dataset_path: Path,
    dataset_id: str,
    dataset_version: str,
    output_dir: Path,
    private_case_results_dir: Path,
    config_id: str,
    top_k: int,
    generation_repeats: int,
    seed_policy: str,
    data_as_of: date,
) -> EvaluationResult:
    started_at = datetime.now(UTC)
    cases = load_cases(dataset_path)
    retrieval, provisions = build_offline_retrieval_pipeline()
    source_snapshot_hash = tree_sha256(
        [root / "src/insaon/application/factory.py", root / "data/sample/retrieval-spike.json"]
    )
    code_revision = tree_sha256(
        list((root / "src/insaon").rglob("*.py")) + list((root / "scripts").glob("*.py"))
    )
    environment_hash = file_sha256(root / "requirements-dev.lock")

    status_correct = 0
    missing_score_sum = 0.0
    missing_case_count = 0
    retrieval_recall_sum = 0.0
    retrieval_mrr_sum = 0.0
    retrieval_case_count = 0
    exception_bundle_success = 0
    exception_bundle_count = 0
    invalid_candidates = 0
    candidate_count = 0
    temporal_success = 0
    temporal_count = 0
    valid_citations = 0
    citation_count = 0
    cited_required = 0
    required_citation_count = 0
    abstention_correct = 0
    abstention_count = 0
    risky_answers = 0
    answerable_count = 0
    privacy_blocks = 0
    privacy_count = 0
    invented_quantity_cases = 0
    model_invoked_count = 0
    phrasing_variant_count = 0
    phrasing_variant_agreements = 0
    conversation_case_count = 0
    conversation_resolved = 0
    carryover_sum = 0.0
    carryover_case_count = 0
    isolation_success = 0
    isolation_case_count = 0
    elliptical_success = 0
    elliptical_case_count = 0
    fatal_counter: Counter[str] = Counter()
    fatal_case_ids: set[str] = set()
    failure_case_ids: dict[str, list[str]] = {key: [] for key in FAILURE_TYPES}
    cases_with_any_failure = 0
    private_results: list[dict[str, Any]] = []

    provision_map = {item.provision_id: item for item in provisions}
    # 표기 변형은 호출 횟수를 세지 않으므로 설정당 한 번만 조립한다. 반복 루프처럼
    # 케이스마다 다시 지으면 이 구성 하나에 파이프라인을 100번 넘게 짓는다.
    phrasing_service = build_offline_review_service(
        DeterministicReviewModel(), retrieval_config_id=config_id
    )
    for case in cases:
        repeat_answers: list[ReviewAnswer] = []
        repeat_fatals: set[str] = set()
        turn_answers: list[ReviewAnswer] = []
        final_conditions: tuple[ConditionValue, ...] = ()
        for repeat in range(generation_repeats):
            model = DeterministicReviewModel()
            service = build_offline_review_service(model, retrieval_config_id=config_id)
            # 한 세션으로 모든 턴을 먹인다. 턴이 없는 케이스는 호출이 한 번이므로
            # 단발 질문 결과와 같다. 채점은 마지막 턴의 답으로 한다.
            conversation = ReviewConversation(
                service,
                request_id=f"{case.case_id}-R{repeat + 1}",
                employee_system=case.subject.employee_system,
                employee_category=case.subject.employee_category,
            )
            answers = [
                conversation.ask(
                    text,
                    local_rule_checked=case.expected.action is ExpectedAction.ANSWER,
                )
                for text in (case.question_text, *case.turns)
            ]
            answer = answers[-1]
            if repeat == 0:
                turn_answers = answers
                final_conditions = conversation.conditions
            repeat_answers.append(answer)
            repeat_fatals.update(_fatal_errors(case, answer, model))
        answer = repeat_answers[0]
        predicted_action = inferred_action(answer)
        if (
            answer.status is case.expected.answer_status
            and predicted_action is case.expected.action
        ):
            status_correct += 1
        if case.expected.action in {ExpectedAction.ASK, ExpectedAction.ABSTAIN}:
            abstention_count += 1
            if predicted_action in {ExpectedAction.ASK, ExpectedAction.ABSTAIN}:
                abstention_correct += 1
            if answer.status is AnswerStatus.ANSWERABLE:
                risky_answers += 1
        if answer.status is AnswerStatus.ANSWERABLE:
            answerable_count += 1
        # 생성 모델이 인용문에도 질문에도 없는 수량을 결론에 넣으려 한 비율이다.
        # 결정적 모델은 템플릿만 쓰므로 0이 나온다. 이 지표는 실모델에서만 움직인다.
        if answer.model_used:
            model_invoked_count += 1
            if "claim_quantity_unsupported" in answer.review_reasons:
                invented_quantity_cases += 1
        # Only cases that actually carry personal data. Counting every security case
        # here put instruction-override probes, which correctly are not privacy blocks,
        # into the denominator and reported the gate at 0.500 when it was blocking
        # everything it should.
        if "personal_data_must_not_egress" in case.critical_flags:
            privacy_count += 1
            if "privacy_input_blocked" in answer.review_reasons:
                privacy_blocks += 1

        # 다회차 지표. 이 제품의 핵심 시나리오는 "조건이 없으니 되묻는다 → 사용자가
        # 답한다 → 그제야 근거를 준다"인데, 단발 호출로 채점하면 되묻는 데서 끝나고
        # 나머지 절반이 통째로 무측정으로 남는다.
        if case.turns:
            conversation_case_count += 1
            if (
                answer.status is case.expected.answer_status
                and predicted_action is case.expected.action
            ):
                conversation_resolved += 1
            flags = set(case.critical_flags)
            if "prior_turn_conditions_must_carry_over" in flags:
                # 앞 턴에서 시스템이 물어본 필드를, 사용자가 답한 뒤에도 세션이 들고
                # 있는가. 정답 데이터가 아니라 대화 자체에서 계산되므로 골든셋에
                # 새 필드를 넣지 않고도 잰다.
                asked = {
                    field
                    for earlier in turn_answers[:-1]
                    for field in earlier.missing_conditions
                }
                if asked:
                    carryover_case_count += 1
                    held = {item.field_name for item in final_conditions}
                    carryover_sum += len(asked & held) / len(asked)
            if "prior_turn_conditions_must_not_leak" in flags:
                isolation_case_count += 1
                if not cited_provisions(answer) & set(case.expected.forbidden_evidence_ids):
                    isolation_success += 1
            if "elliptical_followup_must_keep_task" in flags:
                elliptical_case_count += 1
                if (
                    answer.status is case.expected.answer_status
                    and predicted_action is case.expected.action
                ):
                    elliptical_success += 1

        # 같은 질문을 사람이 실제로 쓰는 다른 표기로 다시 넣는다. 답이 달라지면
        # 파이프라인이 내용이 아니라 표기에 반응하고 있다는 뜻이다. 검색 지표는
        # 케이스의 구조화 필드로 계산되므로 이 실패를 보지 못한다.
        for _variant_id, rewritten in phrasing_variants(case.question_text):
            phrasing_variant_count += 1
            # 첫 턴만 바꾸고 나머지 턴은 그대로 잇는다. 변형을 1턴으로만 돌리고 원본의
            # 마지막 턴 답과 비교하면 표기가 아니라 턴 수의 차이를 재게 된다.
            variant_conversation = ReviewConversation(
                phrasing_service,
                request_id=f"{case.case_id}-{_variant_id}",
                employee_system=case.subject.employee_system,
                employee_category=case.subject.employee_category,
            )
            variant_answer = [
                variant_conversation.ask(
                    text,
                    local_rule_checked=case.expected.action is ExpectedAction.ANSWER,
                )
                for text in (rewritten, *case.turns)
            ][-1]
            if variant_answer.status is answer.status:
                phrasing_variant_agreements += 1

        expected_missing = set(case.expected.required_condition_fields)
        if expected_missing:
            missing_case_count += 1
            missing_score_sum += len(expected_missing & set(answer.missing_conditions)) / len(
                expected_missing
            )

        candidate_ids: list[str] = []
        # 검색 지표는 질문 한 줄을 그대로 색인에 넣는 단일 질의 probe다. 다회차 케이스는
        # 마지막 턴 문장만으로는 무엇을 찾아야 하는지 알 수 없고("질문 기준일은 …입니다"),
        # 실제 제품은 이월된 조건과 분류 결과를 함께 넣어 검색한다. 그 상황을 이 probe로
        # 흉내내면 제품이 아니라 흉내를 재게 되므로 제외하고, 다회차의 검색 성패는
        # 답변이 실제로 인용한 조문(citation.completeness)으로 판단한다.
        if (
            case.expected.action is ExpectedAction.ANSWER
            and case.reference_date is not None
            and not case.turns
        ):
            retrieval_result = retrieval.retrieve(
                case.question_text,
                config_id=config_id,
                top_k=top_k,
                reference_date=case.reference_date,
                subject="local_general_service",
            )
            candidate_ids = [item.provision_id for item in retrieval_result.candidates]
            gold = set(case.expected.required_evidence_ids)
            if gold:
                retrieval_case_count += 1
                retrieval_recall_sum += len(gold & set(candidate_ids)) / len(gold)
                first = next(
                    (
                        rank
                        for rank, provision_id in enumerate(candidate_ids, start=1)
                        if provision_id in gold
                    ),
                    None,
                )
                retrieval_mrr_sum += 1 / first if first else 0.0
            required_bundle = gold | set(case.expected.required_exception_ids)
            if case.expected.required_exception_ids:
                exception_bundle_count += 1
                if required_bundle <= {item.provision_id for item in retrieval_result.context}:
                    exception_bundle_success += 1
            for candidate_id in candidate_ids:
                candidate_count += 1
                if not provision_map[candidate_id].valid_time.contains(case.reference_date):
                    invalid_candidates += 1
            if case.slice.task == "temporal":
                temporal_count += 1
                if not set(case.expected.forbidden_evidence_ids) & set(candidate_ids):
                    temporal_success += 1

        cited = {citation.provision_id for citation in answer.citations}
        required = set(case.expected.required_evidence_ids) | set(
            case.expected.required_exception_ids
        )
        required_citation_count += len(required)
        cited_required += len(required & cited)
        for citation in answer.citations:
            citation_count += 1
            provision = provision_map.get(citation.provision_id)
            if (
                provision is not None
                and case.reference_date is not None
                and provision.valid_time.contains(case.reference_date)
            ):
                valid_citations += 1

        observed_failures = classify_failures(
            case, answer, predicted_action, candidate_ids, provision_map
        )
        for failure in observed_failures:
            failure_case_ids[failure].append(case.case_id)
        if observed_failures:
            cases_with_any_failure += 1

        for fatal in repeat_fatals:
            fatal_counter[fatal] += 1
            fatal_case_ids.add(case.case_id)
        private_results.append(
            {
                "case_id": case.case_id,
                "expected_status": case.expected.answer_status.value,
                "expected_action": case.expected.action.value,
                "repeat_statuses": [item.status.value for item in repeat_answers],
                "turn_statuses": [item.status.value for item in turn_answers],
                "predicted_action": predicted_action.value,
                "candidate_ids": candidate_ids,
                "citation_ids": sorted(cited),
                "fatal_errors": sorted(repeat_fatals),
                "failure_types": list(observed_failures),
            }
        )

    metrics = [
        metric(
            "retrieval.set_recall_at_5",
            retrieval_recall_sum,
            retrieval_case_count,
            aggregation="macro_mean",
        ),
        metric(
            "retrieval.mrr_at_10",
            retrieval_mrr_sum,
            retrieval_case_count,
            aggregation="macro_mean",
        ),
        metric(
            "retrieval.exception_bundle_rate",
            exception_bundle_success,
            exception_bundle_count,
        ),
        metric(
            "retrieval.invalid_version_rate",
            invalid_candidates,
            candidate_count,
        ),
        metric(
            "condition.missing_recall",
            missing_score_sum,
            missing_case_count,
            aggregation="macro_mean",
        ),
        metric("temporal.version_accuracy", temporal_success, temporal_count),
        metric("answer.status_accuracy", status_correct, len(cases)),
        metric("citation.precision", valid_citations, citation_count),
        metric("citation.completeness", cited_required, required_citation_count),
        metric("abstention.recall", abstention_correct, abstention_count),
        metric("abstention.risky_answer_rate", risky_answers, abstention_count),
        metric("abstention.coverage", answerable_count, len(cases)),
        metric("security.privacy_block_recall", privacy_blocks, privacy_count),
        metric(
            "robustness.phrasing_status_agreement",
            phrasing_variant_agreements,
            phrasing_variant_count,
        ),
        metric(
            "claim.invented_quantity_rate",
            invented_quantity_cases,
            model_invoked_count,
        ),
        metric("conversation.resolution_rate", conversation_resolved, conversation_case_count),
        metric(
            "conversation.condition_carryover",
            carryover_sum,
            carryover_case_count,
            aggregation="macro_mean",
        ),
        metric(
            "conversation.topic_switch_isolation",
            isolation_success,
            isolation_case_count,
        ),
        metric(
            "conversation.elliptical_followup",
            elliptical_success,
            elliptical_case_count,
        ),
    ]
    private_case_results_dir.mkdir(parents=True, exist_ok=True)
    private_path = private_case_results_dir / f"{config_id.lower()}.case-results.json"
    private_path.write_text(
        json.dumps(private_results, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    completed_at = datetime.now(UTC)
    result = EvaluationResult(
        schema_version="0.1.0",
        run_id=f"SYNTHETIC-REGRESSION-{config_id}-0.1.0",
        status="completed",
        started_at=started_at,
        completed_at=completed_at,
        system=EvaluationSystem(
            config_id=config_id,  # type: ignore[arg-type]
            code_revision=code_revision,
            retrieval_config=f"{config_id.lower()}@0.1.0",
            model="deterministic-review-model-v1",
            embedding="deterministic-hash-projection-v2",
            query_transform=(
                load_synonym_transformer().implementation_id
                if config_id == "H4"
                else "none"
            ),
            reranker=("idf-weighted-rerank-v2" if config_id in DEEP_CONFIGS else "none"),
            prompt_version="structured-draft-0.1.0",
            rule_version="rule-service-0.1.0",
            parser_version="0.1.0",
            index_version="synthetic-index-0.1.0",
        ),
        data=EvaluationData(
            dataset_id=dataset_id,
            dataset_version=dataset_version,
            dataset_hash=file_sha256(dataset_path),
            case_count=len(cases),
            unique_case_count=distinct_case_count(cases),
            source_snapshot_id="SYNTHETIC-PUBLIC-FIXTURE-0.1.0",
            source_snapshot_hash=source_snapshot_hash,
            data_as_of=data_as_of,
        ),
        execution=EvaluationExecution(
            top_k=top_k,
            generation_repeats=generation_repeats,
            seed_policy=seed_policy,
            environment_lock_hash=environment_hash,
        ),
        metrics=metrics,
        fatal_errors=FatalErrors(
            total=sum(fatal_counter.values()),
            by_type={key: fatal_counter.get(key, 0) for key in FATAL_TYPES},
            case_ids=sorted(fatal_case_ids),
        ),
        failure_types=FailureTypes(
            by_type={key: len(value) for key, value in failure_case_ids.items()},
            case_ids_by_type={key: sorted(value) for key, value in failure_case_ids.items()},
            cases_with_any_failure=cases_with_any_failure,
        ),
        case_results_path=f"private://synthetic-regression/{private_path.name}",
        limitations=[
            "Synthetic system-regression set; not an independently reviewed legal holdout.",
            "Legal correctness, operational effect and local-model performance remain unmeasured.",
            "The deterministic offline model does not represent local model variability.",
        ],
        notes=[
            "All case texts and answer keys remain outside the public submission.",
            "Generation safety path executed three times per case.",
        ],
    )
    output_dir.mkdir(parents=True, exist_ok=True)
    output = output_dir / CONFIG_FILENAMES[config_id]
    output.write_text(result.model_dump_json(indent=2, exclude_none=False) + "\n", encoding="utf-8")
    return result


def run_all(root: Path, config: dict[str, Any]) -> list[EvaluationResult]:
    dataset_path = (root / config["dataset"]).resolve()
    output_dir = (root / config["output_dir"]).resolve()
    private_dir = (root / config["private_case_results_dir"]).resolve()
    return [
        run_configuration(
            root=root,
            dataset_path=dataset_path,
            dataset_id=config["dataset_id"],
            dataset_version=config["dataset_version"],
            output_dir=output_dir,
            private_case_results_dir=private_dir,
            config_id=config_id,
            top_k=int(config["top_k"]),
            generation_repeats=int(config["generation_repeats"]),
            seed_policy=config["seed_policy"],
            data_as_of=date.fromisoformat(config["data_as_of"]),
        )
        for config_id in config["configs"]
    ]
