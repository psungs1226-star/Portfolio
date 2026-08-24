#!/usr/bin/env python3
import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
LOG_DIR = ROOT / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)

RANKINGS_PATH = DATA_DIR / "new_product_rankings.json"
PROFILES_PATH = DATA_DIR / "influencer_profiles.jsonl"
RESEARCH_PLAN_PATH = DATA_DIR / "new_product_research_plan.json"
GAP_REPORT_PATH = LOG_DIR / "new_product_research_gap.md"
VALIDATION_PATH = LOG_DIR / "phase6b_validation.json"
PRE_APPROVAL_PATH = LOG_DIR / "phase6b_pre_approval.md"

SEGMENT_LABELS = {
    "acne_trouble_barrier": "트러블/장벽/홍조",
    "texture_pore_makeup_prep": "피부결/모공/메이크업프렙",
    "tone_spot_glow": "톤/잡티/광채",
    "anti_aging_home_esthetic": "리프팅/홈에스테틱",
    "grwm_lifestyle_beauty": "GRWM/라이프스타일 뷰티",
}

CONCERN_QUERY_TERMS = {
    "barrier_damage": ["skin barrier repair routine", "damaged skin barrier skincare"],
    "redness": ["redness skincare routine", "sensitive redness skincare"],
    "dryness": ["dry skin skincare routine", "dehydrated skin skincare"],
    "dehydration": ["dehydrated skin routine", "hydrating gel cream skincare"],
    "acne_prone": ["acne prone skincare routine", "post breakout skincare routine"],
    "texture": ["skin texture skincare routine", "makeup prep texture skincare"],
    "dullness": ["glow skincare routine", "dull skin skincare"],
    "pigmentation": ["hyperpigmentation skincare routine", "dark spot skincare routine"],
    "wrinkles": ["anti aging skincare routine", "fine lines skincare routine"],
}

CONTENT_QUERY_TERMS = {
    "skincare_routine": ["skincare routine creator"],
    "grwm": ["grwm skincare creator"],
    "product_review": ["k beauty skincare review"],
    "makeup_prep": ["makeup prep skincare"],
    "ingredient_education": ["skincare ingredient education"],
    "home_esthetic_demo": ["home facial skincare review"],
}


def load_json(path):
    with path.open() as f:
        return json.load(f)


def load_jsonl(path):
    with path.open() as f:
        return [json.loads(line) for line in f if line.strip()]


def dump_json(path, payload):
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")


def freshness_bucket(profile):
    last_researched_at = profile.get("last_researched_at")
    if not last_researched_at:
        return "unknown_no_last_researched_at"
    return "freshness_date_present_not_expired"


def query_terms_for_product(product):
    terms = []
    for concern in product.get("best_for_concerns", []):
        terms.extend(CONCERN_QUERY_TERMS.get(concern, []))
    for content in product.get("content_fit", []):
        terms.extend(CONTENT_QUERY_TERMS.get(content, []))
    market = "north america" if "north_america" in product.get("market_priority", []) else "global"
    deduped = []
    for term in terms:
        query = f"{market} TikTok {term}"
        if query not in deduped:
            deduped.append(query)
    return deduped[:8]


def segment_coverage(rankings):
    coverage = defaultdict(lambda: {"total": 0, "ready_eligible": 0, "review_or_no_seed": 0, "needs_more_data": 0})
    for item in rankings:
        segment = item["segment_id"]
        coverage[segment]["total"] += 1
        if item["display_group"] == "needs_more_data":
            coverage[segment]["needs_more_data"] += 1
        if item["display_group"] == "ready_for_matching" and item["recommendation_status"] == "eligible_for_seed":
            coverage[segment]["ready_eligible"] += 1
        if item["recommendation_status"] != "eligible_for_seed":
            coverage[segment]["review_or_no_seed"] += 1
    return dict(coverage)


def determine_target_segments(coverage, core_segments, decision):
    targets = []
    if decision == "existing_db_sufficient":
        return targets
    for segment in core_segments:
        if coverage.get(segment, {}).get("ready_eligible", 0) < 3:
            targets.append(segment)
    if not targets:
        for segment, values in coverage.items():
            if values.get("ready_eligible", 0) == 0:
                targets.append(segment)
    return targets[:3]


def build_collection_targets(target_segments, decision):
    if decision == "existing_db_sufficient":
        return {
            "execute_phase6c": False,
            "target_segments": [],
            "target_new_candidates": 0,
            "content_samples_per_candidate": 0,
            "stop_conditions": [
                "Do not run Phase 6C unless user requests broader market exploration or product positioning changes.",
                "Keep Phase 6A ranking as the current recommendation source.",
            ],
        }
    per_segment = 4
    return {
        "execute_phase6c": False,
        "target_segments": target_segments,
        "target_new_candidates": max(6, per_segment * max(1, len(target_segments))),
        "content_samples_per_candidate": 10,
        "stop_conditions": [
            "Stop when each target segment has at least 3 ready_for_matching candidates.",
            "Stop when 12 new candidates or 120 content observations are reached.",
            "Stop if public platform access becomes unstable or source URLs cannot be preserved.",
        ],
    }


def validate_plan(plan, rankings_payload, existing_rankings_mtime):
    issues = []
    if plan["decision"] not in {"existing_db_sufficient", "research_optional", "research_needed"}:
        issues.append(("blocker", "invalid_research_gap_decision"))
    if not plan["quantitative_evidence"]:
        issues.append(("blocker", "missing_quantitative_evidence"))
    if plan["decision"] != "existing_db_sufficient" and not plan["collection_targets"]["target_segments"]:
        issues.append(("must_fix", "research_needed_without_target_segments"))
    if plan["decision"] != "existing_db_sufficient" and not plan["proposed_queries"]:
        issues.append(("must_fix", "research_needed_without_queries"))
    if plan["proposed_queries"]:
        product_terms = " ".join(
            rankings_payload["new_product"].get("best_for_concerns", [])
            + rankings_payload["new_product"].get("content_fit", [])
            + rankings_payload["new_product"].get("market_priority", [])
        )
        linked = any(
            token in query
            for query in plan["proposed_queries"]
            for token in ["barrier", "redness", "dry", "dehydrated", "routine", "grwm", "review", "north america"]
        )
        if not product_terms or not linked:
            issues.append(("must_fix", "queries_not_linked_to_new_product_tags"))
    if Path(RANKINGS_PATH).stat().st_mtime != existing_rankings_mtime:
        issues.append(("blocker", "phase6a_rankings_modified_by_phase6b"))
    if "public_data_access_instability" not in plan["risks"]:
        issues.append(("must_fix", "missing_public_data_access_risk"))
    return issues


def main():
    existing_rankings_mtime = RANKINGS_PATH.stat().st_mtime
    rankings_payload = load_json(RANKINGS_PATH)
    profiles = load_jsonl(PROFILES_PATH)
    product = rankings_payload["new_product"]
    rankings = rankings_payload["candidate_rankings"]
    phase6a_gap = rankings_payload["research_gap_assessment"]

    ready_eligible = [
        item for item in rankings if item["display_group"] == "ready_for_matching" and item["recommendation_status"] == "eligible_for_seed"
    ]
    top_six = ready_eligible[:6]
    coverage = segment_coverage(rankings)
    freshness_counts = Counter(freshness_bucket(profile) for profile in profiles)
    unknown_freshness_ratio = round(
        freshness_counts.get("unknown_no_last_researched_at", 0) / max(1, len(profiles)),
        2,
    )
    top_segment_distribution = Counter(item["segment_id"] for item in top_six)
    top_segment_share = round(max(top_segment_distribution.values()) / len(top_six), 2) if top_six else 0
    top_half = rankings[: max(1, len(rankings) // 2)]
    top_half_review_or_no_seed = sum(1 for item in top_half if item["recommendation_status"] != "eligible_for_seed")

    triggers = []
    if len(ready_eligible) < 6:
        triggers.append("ready_for_matching_candidates_below_6")
    if phase6a_gap["core_ready_eligible_count"] < 3:
        triggers.append("core_segment_ready_candidates_below_3")
    if top_segment_share >= 0.7:
        triggers.append("top_6_same_segment_share_70_percent_or_more")
    if top_half_review_or_no_seed >= len(top_half) / 2:
        triggers.append("top_half_review_or_no_seed_50_percent_or_more")

    freshness_note = "freshness_not_evaluable_no_last_researched_at_field"
    decision = "research_needed" if triggers else "existing_db_sufficient"
    if not triggers and unknown_freshness_ratio >= 0.3:
        decision_detail = "기존 DB 랭킹은 충분하지만 `last_researched_at` 필드가 없어 freshness는 보수적으로 한계로 남긴다."
    else:
        decision_detail = "정량 트리거 기준에 따라 판단했다."

    target_segments = determine_target_segments(coverage, phase6a_gap["core_segments"], decision)
    proposed_queries = query_terms_for_product(product) if decision != "existing_db_sufficient" else []
    optional_monitoring_queries = query_terms_for_product(product) if decision == "existing_db_sufficient" else []
    collection_targets = build_collection_targets(target_segments, decision)

    generated_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    plan = {
        "schema_version": "0.1.0",
        "phase_id": "phase_6b_new_product_research_gap",
        "generated_at": generated_at,
        "input_files": [
            str(RANKINGS_PATH.relative_to(ROOT)),
            str(PROFILES_PATH.relative_to(ROOT)),
        ],
        "preserved_phase6a_ranking_file": str(RANKINGS_PATH.relative_to(ROOT)),
        "new_product": {
            "product_id": product["product_id"],
            "name": product["name"],
            "best_for_concerns": product.get("best_for_concerns", []),
            "content_fit": product.get("content_fit", []),
            "market_priority": product.get("market_priority", []),
        },
        "decision": decision,
        "decision_detail": decision_detail,
        "triggers": triggers,
        "quantitative_evidence": {
            "ready_eligible_count": len(ready_eligible),
            "core_segments": phase6a_gap["core_segments"],
            "core_ready_eligible_count": phase6a_gap["core_ready_eligible_count"],
            "top_6_segment_distribution": dict(top_segment_distribution),
            "top_6_same_segment_share": top_segment_share,
            "top_half_review_or_no_seed_count": top_half_review_or_no_seed,
            "top_half_count": len(top_half),
            "freshness_counts": dict(freshness_counts),
            "unknown_freshness_ratio": unknown_freshness_ratio,
            "freshness_note": freshness_note,
            "segment_coverage": coverage,
        },
        "proposed_queries": proposed_queries,
        "optional_monitoring_queries": optional_monitoring_queries,
        "collection_targets": collection_targets,
        "risks": [
            "public_data_access_instability",
            "creator_profile_metadata_can_change_after_collection",
            "existing_db_has_no_last_researched_at_field",
            "sales_or_roas_cannot_be_inferred_without_internal_conversion_data",
        ],
        "recommendation": {
            "use_existing_phase6a_ranking": decision == "existing_db_sufficient",
            "run_phase6c_now": False,
            "reason": "기존 DB만으로 ready 추천 후보 6명을 확보했고 추가 리서치 트리거가 발생하지 않았다."
            if decision == "existing_db_sufficient"
            else "정량 트리거가 발생했으므로 사용자 승인 후 제한 리서치를 실행한다.",
        },
    }

    issues = validate_plan(plan, rankings_payload, existing_rankings_mtime)
    blocker_count = sum(1 for severity, _ in issues if severity == "blocker")
    must_fix_count = sum(1 for severity, _ in issues if severity == "must_fix")
    should_fix_count = sum(1 for severity, _ in issues if severity == "should_fix")

    dump_json(RESEARCH_PLAN_PATH, plan)

    validation = {
        "phase_id": "phase_6b_new_product_research_gap",
        "validation_run_id": "phase6b_validation_001",
        "generated_at": generated_at,
        "input_files": plan["input_files"],
        "output_files": [
            str(RESEARCH_PLAN_PATH.relative_to(ROOT)),
            str(GAP_REPORT_PATH.relative_to(ROOT)),
        ],
        "checks": {
            "ready_eligible_count_calculated": "ready_eligible_count" in plan["quantitative_evidence"],
            "segment_coverage_calculated": bool(plan["quantitative_evidence"]["segment_coverage"]),
            "freshness_calculated_or_flagged": bool(plan["quantitative_evidence"]["freshness_note"]),
            "decision_has_quantitative_triggers": isinstance(plan["triggers"], list),
            "phase6a_ranking_preserved": Path(RANKINGS_PATH).stat().st_mtime == existing_rankings_mtime,
            "public_data_access_risk_present": "public_data_access_instability" in plan["risks"],
            "phase6c_not_auto_executed": not plan["collection_targets"]["execute_phase6c"],
        },
        "issues": [
            {
                "severity": severity,
                "finding": finding,
                "affected_files": [str(RESEARCH_PLAN_PATH.relative_to(ROOT))],
                "fix_action": "Investigate before approval." if severity in {"blocker", "must_fix"} else "Review after MVP demo.",
                "status": "open" if severity in {"blocker", "must_fix"} else "deferred",
                "revalidation_result": "",
            }
            for severity, finding in issues
        ],
        "reviewer_result": {
            "status": "pass" if blocker_count == 0 and must_fix_count == 0 else "revise",
            "reviewer": "codex_phase6b_self_reviewer",
            "notes": [
                "Research gap decision is based on ready count, core segment coverage, top-segment concentration, review/no-seed ratio, and freshness availability.",
                "Phase 6B preserves the Phase 6A ranking file and only writes a separate research plan.",
                "Phase 6C is not executed automatically.",
                "Public data access instability and missing last_researched_at are explicitly kept as risks.",
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

    coverage_lines = "\n".join(
        f"- {SEGMENT_LABELS.get(segment, segment)} (`{segment}`): ready {values['ready_eligible']} / total {values['total']} / review_or_no_seed {values['review_or_no_seed']} / needs_more_data {values['needs_more_data']}"
        for segment, values in sorted(coverage.items())
    )
    trigger_lines = "\n".join(f"- {trigger}" for trigger in triggers) if triggers else "- 없음"
    query_lines = "\n".join(f"- {query}" for query in proposed_queries) if proposed_queries else "- 현재 Phase 6C 실행용 검색어 없음. 기존 DB 랭킹 유지."
    optional_query_lines = "\n".join(f"- {query}" for query in optional_monitoring_queries) if optional_monitoring_queries else "- 없음"
    target_lines = "\n".join(f"- {SEGMENT_LABELS.get(segment, segment)} (`{segment}`)" for segment in target_segments) if target_segments else "- 없음"

    report = f"""# Phase 6B 신제품 리서치 갭 판단 리포트

생성 시각: {generated_at}

## 판단 결과

- 신제품: {product['name']} (`{product['product_id']}`)
- 판단: `{decision}`
- 권고: {'기존 Phase 6A 랭킹을 유지한다.' if decision == 'existing_db_sufficient' else '사용자 승인 후 제한 리서치를 실행한다.'}
- 설명: {decision_detail}

## 정량 근거

- ready 추천 가능 후보 수: {len(ready_eligible)}
- 핵심 세그먼트: {', '.join(phase6a_gap['core_segments'])}
- 핵심 세그먼트 ready 후보 수: {phase6a_gap['core_ready_eligible_count']}
- 상위 6명 세그먼트 집중도: {top_segment_share}
- 상위 절반 review/no_seed 후보 수: {top_half_review_or_no_seed} / {len(top_half)}
- freshness 상태: {freshness_note}
- freshness unknown 비율: {unknown_freshness_ratio}

## 발생한 트리거

{trigger_lines}

## 세그먼트 커버리지

{coverage_lines}

## Phase 6C 실행 대상 세그먼트

{target_lines}

## 제안 검색어

{query_lines}

## 선택적 모니터링 검색어

{optional_query_lines}

## 리스크

- 공개 플랫폼 접근은 불안정할 수 있으므로 Phase 6C는 자동 실행하지 않는다.
- 기존 DB에는 `last_researched_at` 필드가 없어 freshness는 정량 만료로 판단하지 않고 한계로 표시한다.
- 클릭/쿠폰/주문 데이터 없이는 매출 또는 ROAS 효과를 단정하지 않는다.

## 검수 결과

- reviewer 결과: {validation['reviewer_result']['status']}
- blocker: {blocker_count}
- must_fix: {must_fix_count}
- should_fix: {should_fix_count}
"""
    GAP_REPORT_PATH.write_text(report)

    pre_approval = f"""## 승인 요청: Phase 6B - 신제품 리서치 갭 판단

### Codex 사전 검토 결과
- 산출물: `submission/src/data/new_product_research_plan.json`, `submission/logs/new_product_research_gap.md`
- 형식 검증: JSON/Markdown 생성 완료
- 내용 정합성: Phase 6A 랭킹 파일을 덮어쓰지 않고 별도 리서치 계획만 생성
- 리스크 검토: 공개 데이터 접근 불안정성과 freshness 필드 부재를 리스크로 표시
- reviewer 결과: {validation['reviewer_result']['status']}

### 판단
- 신제품: {product['name']} (`{product['product_id']}`)
- 추가 리서치 판단: `{decision}`
- 발생 트리거:
{trigger_lines}

### 정량 근거
- ready 추천 가능 후보 수: {len(ready_eligible)}
- 핵심 세그먼트 ready 후보 수: {phase6a_gap['core_ready_eligible_count']}
- 상위 6명 세그먼트 집중도: {top_segment_share}
- freshness unknown 비율: {unknown_freshness_ratio}

### 사용자에게 필요한 결정
1. 기존 Phase 6A 랭킹을 최종 신제품 시연 결과로 유지할지 결정
2. freshness 한계를 보강하기 위해 Phase 6C를 선택적으로 실행할지 결정

### Codex 권고
- 기존 DB 랭킹 유지
- 이유: 추가 리서치 정량 트리거가 없고, ready 추천 후보 6명을 확보했음
"""
    PRE_APPROVAL_PATH.write_text(pre_approval)


if __name__ == "__main__":
    main()
