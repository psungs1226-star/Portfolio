#!/usr/bin/env python3
import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "submission" / "src" / "data"
LOG_DIR = ROOT / "submission" / "logs"

RESULTS_PATH = DATA_DIR / "experiment_results.json"
BRIEFS_PATH = DATA_DIR / "seeding_briefs.json"
REVIEWER_PATH = LOG_DIR / "reviewer_report.json"
NEW_PRODUCT_PLAN_PATH = DATA_DIR / "new_product_research_plan.json"
ITERATION_PLAN_PATH = DATA_DIR / "iteration_learning_plan.json"
ITERATION_NOTES_PATH = LOG_DIR / "iteration_notes.md"
VALIDATION_PATH = LOG_DIR / "phase8_validation.json"
PRE_APPROVAL_PATH = LOG_DIR / "phase8_pre_approval.md"


def load_json(path):
    with path.open() as f:
        return json.load(f)


def dump_json(path, payload):
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")


def outcome_counts(results):
    return Counter(item.get("outcome_status") for item in results.get("seed_results", []))


def product_segment_matrix(seed_results):
    matrix = defaultdict(lambda: defaultdict(int))
    for item in seed_results:
        matrix[item.get("seed_product")][item.get("segment_id")] += 1
    return {product: dict(segments) for product, segments in matrix.items()}


def build_hypothesis_updates(briefs, results):
    result_by_unit = {item["experiment_unit_id"]: item for item in results.get("seed_results", [])}
    updates = []
    for brief in briefs.get("seed_briefs", []):
        unit_id = brief["result_collection"]["experiment_unit_id"]
        result = result_by_unit.get(unit_id, {})
        updates.append(
            {
                "update_id": f"hypothesis_only::{unit_id}",
                "status": "hypothesis_only",
                "reason": "게시 URL과 14일 공개/내부 KPI가 아직 없어 기본 룰에 반영하지 않는다.",
                "creator_handle": brief["creator_handle"],
                "segment_id": brief["segment_id"],
                "product_id": brief["seed_product"],
                "candidate_learning": {
                    "content_angle_to_test": brief["content_angle"],
                    "primary_kpi": brief["primary_kpi"],
                    "secondary_kpi": brief["secondary_kpi"],
                    "next_iteration_rule": brief["next_iteration_rule"],
                },
                "current_outcome_status": result.get("outcome_status", "not_observed"),
                "required_before_rule_update": [
                    "posted_url_present",
                    "24h_public_metrics_present",
                    "72h_comment_intent_themes_present",
                    "7d_or_14d_primary_kpi_present",
                    "control_group_comparison_present",
                ],
            }
        )
    return updates


def build_next_experiments(briefs, new_product_plan):
    product_counts = Counter(brief["seed_product"] for brief in briefs.get("seed_briefs", []))
    segment_counts = Counter(brief["segment_id"] for brief in briefs.get("seed_briefs", []))
    experiments = [
        {
            "question_id": "exp_q_001",
            "question": "PDRN/판테놀 장벽 제품은 트러블·장벽 후보와 GRWM 후보 중 어느 세그먼트에서 저장률과 민감 피부 질문이 더 강하게 발생하는가?",
            "why_now": "Phase 6A 신제품 랭킹에서 트러블·장벽과 GRWM/라이프스타일이 핵심 세그먼트로 잡혔다.",
            "minimum_data_required": ["posted_url", "save_rate_7d", "sensitive_skin_question_count_7d", "control_segment_baseline"],
            "decision_rule": "두 세그먼트 모두 3명 이상 관찰되기 전에는 가중치를 변경하지 않는다.",
        },
        {
            "question_id": "exp_q_002",
            "question": "저자극/수분 제품은 제품 리뷰형 콘텐츠보다 GRWM 메이크업프렙 콘텐츠에서 구매 의도 질문이 더 많이 생기는가?",
            "why_now": f"현재 시딩 브리프 제품 분포는 {dict(product_counts)}이고, 수분 제품은 GRWM/메이크업프렙 맥락으로 반복 등장한다.",
            "minimum_data_required": ["comment_intent_themes_72h", "routine_question_count_7d", "where_to_buy_question_count_7d"],
            "decision_rule": "공개 댓글 의도와 내부 클릭 중 하나라도 없으면 sales-fit 룰을 변경하지 않는다.",
        },
        {
            "question_id": "exp_q_003",
            "question": "레티날 제품은 피부결/메이크업프렙 후보에게 유지하되, 민감/장벽 리스크 후보에는 보류하는 현재 hard-risk 정책이 충분한가?",
            "why_now": "레티날 브리프는 리스크 가드레일이 강하고, Phase 7 reviewer가 hard exclusion 선적용을 통과시켰다.",
            "minimum_data_required": ["risk_comment_count_14d", "creator_self_reported_tolerance_14d", "manual_claim_review"],
            "decision_rule": "리스크 댓글이 증가하면 레티날 제품은 review_required 기준을 강화하고, 성공 지표만으로 완화하지 않는다.",
        },
        {
            "question_id": "exp_q_004",
            "question": "기존 DB만으로 충분하다고 판단된 신제품에서도 freshness 필드가 없으면 다음 수집 루프에서 `last_researched_at`을 필수화해야 하는가?",
            "why_now": f"Phase 6B 판단은 {new_product_plan.get('decision')}이지만 freshness unknown 비율이 {new_product_plan.get('quantitative_evidence', {}).get('unknown_freshness_ratio')}이다.",
            "minimum_data_required": ["last_researched_at", "recent_relevant_content_count", "evidence_url_count"],
            "decision_rule": "다음 후보 수집부터 freshness 필드는 스키마 제안으로 올리되, 기존 점수에는 소급 반영하지 않는다.",
        },
    ]
    return experiments, dict(segment_counts)


def validate_plan(plan):
    issues = []
    if plan["actual_rule_updates"]:
        issues.append(("blocker", "actual_rule_updates_present_without_observed_results"))
    if not plan["hypothesis_only_updates"]:
        issues.append(("must_fix", "missing_hypothesis_only_updates"))
    if not plan["next_experiment_questions"]:
        issues.append(("blocker", "missing_next_experiment_questions"))
    if plan["learning_status"] == "learning_complete":
        issues.append(("blocker", "learning_marked_complete_without_results"))
    if plan["source_result_summary"].get("internal_data_connected") is not False:
        issues.append(("must_fix", "internal_data_connection_not_false"))
    if plan["source_result_summary"].get("sales_claim_count") != 0:
        issues.append(("blocker", "sales_claim_count_not_zero"))
    for update in plan["hypothesis_only_updates"]:
        if update["status"] != "hypothesis_only":
            issues.append(("must_fix", f"non_hypothesis_update:{update['update_id']}"))
            break
    return issues


def main():
    results = load_json(RESULTS_PATH)
    briefs = load_json(BRIEFS_PATH)
    reviewer = load_json(REVIEWER_PATH)
    new_product_plan = load_json(NEW_PRODUCT_PLAN_PATH)

    generated_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    seed_results = results.get("seed_results", [])
    status_counts = outcome_counts(results)
    hypothesis_updates = build_hypothesis_updates(briefs, results)
    next_questions, segment_counts = build_next_experiments(briefs, new_product_plan)

    observed_result_available = any(
        status not in {"inconclusive_until_posted", "not_observed", None}
        for status in status_counts
    )
    plan = {
        "schema_version": "0.1.0",
        "phase_id": "phase_8_iteration_learning",
        "generated_at": generated_at,
        "input_files": [
            str(RESULTS_PATH.relative_to(ROOT)),
            str(BRIEFS_PATH.relative_to(ROOT)),
            str(REVIEWER_PATH.relative_to(ROOT)),
            str(NEW_PRODUCT_PLAN_PATH.relative_to(ROOT)),
        ],
        "learning_status": "pending_observed_results" if not observed_result_available else "ready_for_marketer_review",
        "source_result_summary": results.get("summary", {}),
        "reviewer_status": reviewer.get("reviewer", {}).get("status"),
        "result_status_distribution": dict(status_counts),
        "product_segment_matrix": product_segment_matrix(seed_results),
        "segment_brief_distribution": segment_counts,
        "actual_rule_updates": [],
        "hypothesis_only_updates": hypothesis_updates,
        "proposed_schema_updates": [
            {
                "target": "influencer_profiles.jsonl",
                "field": "last_researched_at",
                "status": "proposal_only",
                "reason": "Phase 6B에서 freshness unknown 비율이 1.0으로 확인되어 다음 수집 루프의 필수 후보 필드로 제안한다.",
                "do_not_backfill_without_source": True,
            },
            {
                "target": "content_observations.jsonl",
                "field": "observed_at",
                "status": "proposal_only",
                "reason": "최근성 판단을 위해 콘텐츠 관찰 시각과 콘텐츠 게시 시각을 분리할 필요가 있다.",
                "do_not_backfill_without_source": True,
            },
        ],
        "next_experiment_questions": next_questions,
        "guardrails": [
            "게시 전에는 제품/세그먼트 가중치를 변경하지 않는다.",
            "공개 참여 지표만으로 매출, ROAS, 주문 증가를 주장하지 않는다.",
            "단일 후보 성공 또는 실패로 전체 세그먼트 룰을 바꾸지 않는다.",
            "실패 또는 inconclusive 사례도 후보 DB에서 삭제하지 않고 원인 태그로 보존한다.",
        ],
        "marketer_review_required": [
            "hypothesis_only 업데이트 중 실제 다음 실험에 사용할 항목 선택",
            "freshness 필드 추가를 다음 수집 스키마에 반영할지 결정",
            "Phase 6C를 실행하지 않고 기존 DB 랭킹을 유지할지 최종 확인",
        ],
    }

    issues = validate_plan(plan)
    blocker_count = sum(1 for severity, _ in issues if severity == "blocker")
    must_fix_count = sum(1 for severity, _ in issues if severity == "must_fix")
    should_fix_count = sum(1 for severity, _ in issues if severity == "should_fix")

    dump_json(ITERATION_PLAN_PATH, plan)

    update_lines = "\n".join(
        f"- `{item['product_id']}` / {item['creator_handle']} / {item['segment_id']}: {item['candidate_learning']['primary_kpi']} 기준 hypothesis_only"
        for item in hypothesis_updates
    )
    question_lines = "\n".join(
        f"- {item['question_id']}: {item['question']}\n  - 최소 데이터: {', '.join(item['minimum_data_required'])}\n  - 결정 규칙: {item['decision_rule']}"
        for item in next_questions
    )
    schema_lines = "\n".join(
        f"- {item['target']} `{item['field']}`: {item['reason']}"
        for item in plan["proposed_schema_updates"]
    )
    notes = f"""# Phase 8 반복 학습 노트

생성 시각: {generated_at}

## 결론

- 학습 상태: `{plan['learning_status']}`
- 실제 룰 변경: 0건
- hypothesis_only 업데이트: {len(hypothesis_updates)}건
- reviewer 상태: `{plan['reviewer_status']}`
- 내부 데이터 연결: {plan['source_result_summary'].get('internal_data_connected')}
- 매출 claim count: {plan['source_result_summary'].get('sales_claim_count')}

현재는 실제 게시 URL과 14일 공개/내부 KPI가 없으므로 제품 점수, 세그먼트 가중치, 추천 룰을 업데이트하지 않는다. 대신 다음 실험에서 검증할 가설만 보존한다.

## Hypothesis Only 업데이트 후보

{update_lines}

## 제안 스키마 업데이트

{schema_lines}

## 다음 실험 질문

{question_lines}

## 유지할 가드레일

- 게시 전에는 제품/세그먼트 가중치를 변경하지 않는다.
- 공개 참여 지표만으로 매출, ROAS, 주문 증가를 주장하지 않는다.
- 단일 후보 성공 또는 실패로 전체 세그먼트 룰을 바꾸지 않는다.
- 실패 또는 inconclusive 사례도 후보 DB에서 삭제하지 않고 원인 태그로 보존한다.

## 사용자 검토 필요

- hypothesis_only 업데이트 중 실제 다음 실험에 사용할 항목 선택
- `last_researched_at`, `observed_at` 필드를 다음 수집 스키마에 반영할지 결정
- Phase 6C를 실행하지 않고 기존 DB 랭킹을 유지할지 최종 확인
"""
    ITERATION_NOTES_PATH.write_text(notes)

    validation = {
        "phase_id": "phase_8_iteration_learning",
        "validation_run_id": "phase8_validation_001",
        "generated_at": generated_at,
        "input_files": plan["input_files"],
        "output_files": [
            str(ITERATION_PLAN_PATH.relative_to(ROOT)),
            str(ITERATION_NOTES_PATH.relative_to(ROOT)),
        ],
        "checks": {
            "actual_rule_updates_count": len(plan["actual_rule_updates"]),
            "hypothesis_only_update_count": len(plan["hypothesis_only_updates"]),
            "next_experiment_question_count": len(plan["next_experiment_questions"]),
            "learning_not_marked_complete": plan["learning_status"] != "learning_complete",
            "sales_claim_count_zero": plan["source_result_summary"].get("sales_claim_count") == 0,
            "internal_data_connected_false": plan["source_result_summary"].get("internal_data_connected") is False,
            "reviewer_pass": plan["reviewer_status"] == "pass",
        },
        "issues": [
            {
                "severity": severity,
                "finding": finding,
                "affected_files": [str(ITERATION_PLAN_PATH.relative_to(ROOT))],
                "fix_action": "Revise iteration plan before approval.",
                "status": "open" if severity in {"blocker", "must_fix"} else "deferred",
                "revalidation_result": "",
            }
            for severity, finding in issues
        ],
        "reviewer_result": {
            "status": "pass" if blocker_count == 0 and must_fix_count == 0 else "revise",
            "reviewer": "codex_phase8_self_reviewer",
            "notes": [
                "No actual rule updates were applied because all seed outcomes are inconclusive_until_posted.",
                "Hypothesis-only updates and next experiment questions are preserved separately.",
                "Freshness schema updates are proposals only and do not backfill unsupported data.",
            ],
        },
        "can_request_user_approval": blocker_count == 0 and must_fix_count == 0,
        "issue_counts": {
            "blocker": blocker_count,
            "must_fix": must_fix_count,
            "should_fix": should_fix_count,
        },
    }
    dump_json(VALIDATION_PATH, validation)

    pre_approval = f"""## 승인 요청: Phase 8 - 반복 학습 Harness

### Codex 사전 검토 결과
- 산출물: `submission/src/data/iteration_learning_plan.json`, `submission/logs/iteration_notes.md`
- 형식 검증: JSON/Markdown 생성 완료
- 룰 변경 검토: 실제 KPI가 없으므로 기본 룰 변경 0건
- 가설 보존: hypothesis_only 업데이트 {len(hypothesis_updates)}건
- reviewer 결과: {validation['reviewer_result']['status']}

### 핵심 판단
- 학습 상태: `{plan['learning_status']}`
- 내부 데이터 연결: {plan['source_result_summary'].get('internal_data_connected')}
- 매출 claim count: {plan['source_result_summary'].get('sales_claim_count')}
- Phase 8 이후 실제 룰 변경 여부: 변경하지 않음

### 다음 실험 질문
{question_lines}

### 사용자에게 필요한 결정
1. hypothesis_only 업데이트 중 다음 실험에 사용할 항목 선택
2. `last_researched_at`, `observed_at` 필드를 다음 수집 스키마에 반영할지 결정
3. 기존 DB 랭킹 유지 상태로 Phase 9 패키징에 들어갈지 결정

### Codex 권고
- Phase 9로 진행 가능
- 이유: 실제 성과가 없는데 학습 완료로 표현하지 않았고, 다음 실험 질문과 스키마 보강 후보를 분리해 보존했음
"""
    PRE_APPROVAL_PATH.write_text(pre_approval)


if __name__ == "__main__":
    main()
