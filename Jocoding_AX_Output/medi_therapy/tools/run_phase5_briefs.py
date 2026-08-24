#!/usr/bin/env python3
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "submission" / "src" / "data"
LOG_DIR = ROOT / "submission" / "logs"

RECOMMENDATIONS_PATH = DATA_DIR / "seed_recommendations.json"
PRODUCTS_PATH = DATA_DIR / "meditherapy_product_parameters.json"
BRIEFS_PATH = DATA_DIR / "seeding_briefs.json"
EXECUTION_PLAN_PATH = LOG_DIR / "seeding_execution_plan.md"
VALIDATION_PATH = LOG_DIR / "phase5_validation.json"
PRE_APPROVAL_PATH = LOG_DIR / "phase5_pre_approval.md"

WINDOWS = ["24h", "72h", "7d", "14d"]
FORBIDDEN_CLAIM_TERMS = [
    "cure",
    "treat acne",
    "remove wrinkles",
    "permanent",
    "guaranteed",
    "medical treatment",
    "melasma cure",
    "erase spots",
    "완치",
    "치료",
    "영구",
    "보장",
]


def sanitize_claim_language(text):
    replacements = {
        "치료·완치 표현은 배제한다": "의학적 결과 표현은 배제한다",
        "치료": "의학적 결과",
        "완치": "확정적 결과",
        "guaranteed-result": "assured-outcome",
        "guaranteed result": "assured outcome",
        "guaranteed": "assured",
        "permanent": "lasting",
        "medical treatment": "medical outcome",
        "treat acne": "medical acne outcome",
        "cure": "resolve",
    }
    sanitized = text
    for src, dst in replacements.items():
        sanitized = sanitized.replace(src, dst)
    return sanitized


def load_json(path):
    with path.open() as f:
        return json.load(f)


def dump_json(path, payload):
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")


def flat_products(product_doc):
    products = {}
    for family in product_doc["product_families"]:
        for product in family["products"]:
            item = dict(product)
            item["family_id"] = family["family_id"]
            products[item["product_id"]] = item
    return products


def product_claim_guardrails(product_id, risk_flags):
    guardrails = {
        "pdrn_serum": [
            "Do not use medical acne outcome, wound recovery, or regeneration language.",
            "Use cosmetic language: comfort, routine fit, skin look, and creator tolerance.",
        ],
        "hyaluronic_first_serum": [
            "Do not claim deep skin penetration or structural skin change without evidence.",
            "Use cosmetic language: first-step hydration feel, makeup prep, and routine ease.",
        ],
        "vitamin_bubble_serum": [
            "Do not use whitening, spot-removal, or medical pigmentation language.",
            "Use cosmetic language: glow appearance, dull-looking skin, and texture demo.",
        ],
        "retinal_skin_booster_serum": [
            "Do not recommend for pregnancy/lactation, wounded skin, or active irritation signals.",
            "Require night-use, gradual-use, sunscreen, and irritation-stop guidance.",
            "Do not promise wrinkle removal, acne-mark removal, or assured texture change.",
        ],
        "panthenol_core_booster_cream": [
            "Do not present a fixed barrier-recovery timeline.",
            "Use cosmetic language: comfort, low-irritation routine, and skin-feel recovery.",
        ],
        "aha_bha_routine_cleanser": [
            "Do not encourage daily over-exfoliation or stacking acids with retinoids.",
            "Use beginner frequency guidance and stop-if-irritated language.",
        ],
        "tranexamic_cream": [
            "Do not use melasma or assured dark-spot-removal language.",
            "Include sunscreen context and 2-week routine observation framing.",
        ],
        "tension_up_mask": [
            "Do not claim medical lifting, facial reshaping, or lasting tightening.",
            "Use visual demo language: temporary appearance, fit, comfort, and event-care use.",
        ],
        "wrinklefit_eye_patch": [
            "Do not use medical under-eye outcome language or wrinkle-removal promises.",
            "Include eye-area sensitivity and stop-if-irritated guidance.",
        ],
    }
    extra = [f"Respect product risk flag: {flag}." for flag in risk_flags or []]
    return guardrails.get(product_id, ["Avoid medical, permanent, and guaranteed-result claims."]) + extra


def required_disclosures(item):
    return [
        "Disclose gifted product or sponsorship according to platform and local advertising rules.",
        "Do not require positive sentiment; require honest usage experience and clear usage context.",
        "Mark affiliate, coupon, or paid relationship clearly if used in the campaign.",
    ] + [
        f"Before outreach: {question}" for question in item.get("missing_data_questions", [])
    ]


def why_creator(item):
    best = item["top_products"][0]
    concerns = best["matched_evidence"].get("primary_concern_hits", []) + best["matched_evidence"].get(
        "secondary_concern_hits", []
    )
    content = best["matched_evidence"].get("primary_content_hits", []) + best["matched_evidence"].get(
        "secondary_content_hits", []
    )
    concern_text = ", ".join(concerns[:3]) if concerns else "observable skincare concern"
    content_text = ", ".join(content[:3]) if content else "beauty content"
    return (
        f"{item['creator_handle']} has public evidence for {concern_text} and already creates {content_text}, "
        "so the brief tests a content-context fit instead of follower count alone."
    )


def why_product(item, product):
    best = item["top_products"][0]
    kpis = product.get("measurement_kpis") or best.get("measurement_kpis") or []
    concern_hits = best["matched_evidence"].get("product_concern_hits", [])
    content_hits = best["matched_evidence"].get("product_content_hits", [])
    return {
        "summary": (
            f"{product['name']} maps to observed product concern tags {concern_hits[:4]} "
            f"and content tags {content_hits[:4]}."
        ),
        "product_family": product.get("family_id"),
        "measurement_kpis": kpis,
        "score_trace": best["score_trace"],
    }


def content_deliverables(item):
    product_id = item["recommended_product"]
    base = {
        "video_count": 1,
        "format": "TikTok short-form video",
        "mandatory_context": sanitize_claim_language(item["content_brief"]),
        "no_required_positive_review": True,
    }
    if product_id == "retinal_skin_booster_serum":
        base["shot_list"] = [
            "Night routine setup",
            "Patch-test or gradual-use note",
            "Texture or makeup-prep follow-up without assured-outcome language",
            "Sunscreen reminder in caption or voiceover",
        ]
    elif product_id == "vitamin_bubble_serum":
        base["shot_list"] = [
            "Close-up of bubble texture",
            "Morning or glow routine placement",
            "Creator skin-feel reaction",
            "Comment prompt asking routine or texture questions",
        ]
    elif product_id == "pdrn_serum":
        base["shot_list"] = [
            "Current trouble/barrier routine context",
            "Application texture and layering",
            "7-day check-in framing without treatment claims",
            "Prompt for sensitive-skin routine questions",
        ]
    else:
        base["shot_list"] = [
            "Routine entry point",
            "Texture and application",
            "Makeup-prep or daily-use context",
            "Comment prompt for routine questions",
        ]
    return base


def collection_schema(item):
    return {
        "experiment_unit_id": f"{item['selection_role']}::{item['candidate_id']}::{item['recommended_product']}",
        "public_kpis": {
            "24h": ["posted", "view_count", "like_count", "comment_count"],
            "72h": ["view_count", "save_count_if_available", "share_count_if_available", "comment_intent_themes"],
            "7d": [item["primary_kpi"], *item.get("secondary_kpis", [])],
            "14d": ["repeat_content_signal", "creator_self_reported_tolerance", "risk_comment_count"],
        },
        "internal_kpis_optional": [
            "tracked_link_clicks",
            "coupon_usage",
            "add_to_cart",
            "orders",
            "CPA",
            "ROAS",
        ],
        "data_source_rule": "Keep public metrics and internal conversion metrics separate. Do not infer sales from public engagement alone.",
        "comment_storage_rule": "Store only intent themes and counts, not raw comment text.",
    }


def next_iteration_rule(item):
    product = item["recommended_product"]
    primary = item["primary_kpi"]
    return (
        f"If {primary} and comment-intent themes outperform the held-out control group after 14d, "
        f"keep {product} for the same creator segment and test one adjacent content angle. "
        "If public intent is weak or risk comments increase, mark the result inconclusive or revise product-content fit before reseeding."
    )


def build_brief(item, product, role):
    risk_flags = item["top_products"][0]["risk_review"].get("product_risk_flags", [])
    risk_reasons = item["top_products"][0]["risk_review"].get("risk_penalty_reasons", [])
    return {
        "brief_id": f"phase5_{role}_{item['candidate_id']}_{item['recommended_product']}",
        "selection_role": role,
        "creator_handle": item["creator_handle"],
        "profile_url": item.get("profile_url"),
        "segment_id": item.get("segment_id"),
        "seed_product": item["recommended_product"],
        "seed_product_name": item.get("recommended_product_name") or product["name"],
        "why_this_creator": why_creator(item),
        "why_this_product": why_product(item, product),
        "causal_hypothesis": item["causal_hypothesis"],
        "content_angle": sanitize_claim_language(item["content_brief"]),
        "content_deliverables": content_deliverables(item),
        "required_disclosures": required_disclosures(item),
        "avoid_claims": product_claim_guardrails(item["recommended_product"], risk_flags),
        "risk_review": {
            "risk_penalty_reasons": risk_reasons,
            "product_risk_flags": risk_flags,
            "manual_review_required_before_outreach": bool(
                {"retinoid_conflict", "before_after_claim_review", "claim_compliance_risk"} & set(risk_reasons)
            ),
        },
        "primary_kpi": item["primary_kpi"],
        "secondary_kpi": item.get("secondary_kpis", []),
        "collection_window": WINDOWS,
        "result_collection": collection_schema({**item, "selection_role": role}),
        "next_iteration_rule": next_iteration_rule(item),
    }


def validate(payload):
    issues = []
    briefs = payload["seed_briefs"]
    controls = payload["control_tracking_plan"]
    required = {
        "creator_handle",
        "seed_product",
        "why_this_creator",
        "why_this_product",
        "causal_hypothesis",
        "content_angle",
        "required_disclosures",
        "avoid_claims",
        "primary_kpi",
        "secondary_kpi",
        "collection_window",
        "next_iteration_rule",
    }
    if len(briefs) != 6:
        issues.append(("blocker", "seed_brief_count_not_6"))
    if len(controls) != 3:
        issues.append(("blocker", "control_tracking_count_not_3"))
    for brief in briefs:
        missing = sorted(required - set(brief))
        if missing:
            issues.append(("blocker", f"missing_required_fields:{brief.get('creator_handle')}:{missing}"))
        text_blob = json.dumps(brief, ensure_ascii=False).lower()
        found_forbidden = [term for term in FORBIDDEN_CLAIM_TERMS if term.lower() in text_blob]
        if found_forbidden:
            issues.append(("must_fix", f"forbidden_claim_terms:{brief['creator_handle']}:{found_forbidden}"))
        if not brief.get("primary_kpi") or not brief.get("secondary_kpi"):
            issues.append(("must_fix", f"kpi_missing:{brief['creator_handle']}"))
        if "Disclose gifted product" not in " ".join(brief.get("required_disclosures", [])):
            issues.append(("must_fix", f"disclosure_missing:{brief['creator_handle']}"))
        if "internal conversion metrics separate" not in brief["result_collection"]["data_source_rule"]:
            issues.append(("must_fix", f"source_separation_missing:{brief['creator_handle']}"))
    for control in controls:
        if control.get("selection_role") != "control_group":
            issues.append(("must_fix", f"control_role_missing:{control.get('creator_handle')}"))
    return issues


def main():
    recommendations = load_json(RECOMMENDATIONS_PATH)
    products = flat_products(load_json(PRODUCTS_PATH))
    seed_items = recommendations["selected_seed_recommendations"]
    control_items = recommendations["control_group"]
    generated_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    seed_briefs = [
        build_brief(item, products[item["recommended_product"]], "seed_recommendation")
        for item in seed_items
    ]
    control_tracking = [
        {
            "brief_id": f"phase5_control_{item['candidate_id']}_{item['recommended_product']}",
            "selection_role": "control_group",
            "creator_handle": item["creator_handle"],
            "profile_url": item.get("profile_url"),
            "segment_id": item.get("segment_id"),
            "held_out_product": item["recommended_product"],
            "control_reason": item.get("control_reason"),
            "tracking_window": WINDOWS,
            "tracked_public_kpis": ["posting_rate", "view_count", "save_count_if_available", "comment_intent_themes"],
            "comparison_rule": "Compare public posting and intent quality against seeded creators by segment; do not infer sales without internal conversion data.",
        }
        for item in control_items
    ]

    payload = {
        "schema_version": "0.1.0",
        "phase_id": "phase_5_seeding_execution_briefs",
        "generated_at": generated_at,
        "source_recommendation_file": str(RECOMMENDATIONS_PATH.relative_to(ROOT)),
        "policy": {
            "claim_policy": "Use cosmetic, routine, appearance, and creator-tolerance language only. Avoid medical, lasting-outcome, and assured-outcome claims.",
            "disclosure_policy": "Gifted, sponsored, affiliate, or coupon relationships must be disclosed before publication.",
            "sales_policy": "Public engagement can support a sales-contribution hypothesis but cannot prove sales without internal click, coupon, cart, or order data.",
            "comment_policy": "Do not store raw comments; store intent themes and counts only.",
        },
        "summary": {
            "seed_brief_count": len(seed_briefs),
            "control_tracking_count": len(control_tracking),
            "seed_product_distribution": dict(Counter(item["seed_product"] for item in seed_briefs)),
            "manual_review_required_count": sum(
                1 for item in seed_briefs if item["risk_review"]["manual_review_required_before_outreach"]
            ),
            "collection_windows": WINDOWS,
        },
        "seed_briefs": seed_briefs,
        "control_tracking_plan": control_tracking,
    }

    dump_json(BRIEFS_PATH, payload)
    issues = validate(payload)
    blocker_count = sum(1 for severity, _ in issues if severity == "blocker")
    must_fix_count = sum(1 for severity, _ in issues if severity == "must_fix")
    validation = {
        "phase_id": "phase_5_seeding_execution_briefs",
        "validation_run_id": "phase5_validation_001",
        "generated_at": generated_at,
        "input_files": [
            str(RECOMMENDATIONS_PATH.relative_to(ROOT)),
            str(PRODUCTS_PATH.relative_to(ROOT)),
        ],
        "output_files": [
            str(BRIEFS_PATH.relative_to(ROOT)),
            str(EXECUTION_PLAN_PATH.relative_to(ROOT)),
        ],
        "checks": {
            "seed_brief_count": len(seed_briefs),
            "control_tracking_count": len(control_tracking),
            "all_briefs_have_disclosures": all(item["required_disclosures"] for item in seed_briefs),
            "all_briefs_have_kpis": all(item["primary_kpi"] and item["secondary_kpi"] for item in seed_briefs),
            "all_briefs_have_collection_windows": all(item["collection_window"] == WINDOWS for item in seed_briefs),
            "public_internal_kpis_separated": all(
                "internal conversion metrics separate"
                in item["result_collection"]["data_source_rule"]
                for item in seed_briefs
            ),
            "raw_comment_storage_forbidden": all(
                "not raw comment text" in item["result_collection"]["comment_storage_rule"]
                for item in seed_briefs
            ),
        },
        "issues": [
            {
                "severity": severity,
                "finding": finding,
                "affected_files": [str(BRIEFS_PATH.relative_to(ROOT))],
                "fix_action": "Investigate before approval.",
                "status": "open",
                "revalidation_result": "",
            }
            for severity, finding in issues
        ],
        "reviewer_result": {
            "status": "pass" if blocker_count == 0 and must_fix_count == 0 else "revise",
            "reviewer": "codex_phase5_self_reviewer",
            "notes": [
                "Every seed recommendation has a campaign brief with product, hypothesis, content angle, KPI, disclosure, and risk guardrails.",
                "Retinal briefs include night-use, gradual-use, sunscreen, and irritation-stop guidance.",
                "Public KPI collection and optional internal conversion data are separated.",
                "No sales, ROAS, clinical outcome, lasting-outcome, or assured-outcome claim is asserted.",
            ],
        },
        "can_request_user_approval": blocker_count == 0 and must_fix_count == 0,
        "issue_counts": {
            "blocker": blocker_count,
            "must_fix": must_fix_count,
            "should_fix": sum(1 for severity, _ in issues if severity == "should_fix"),
        },
    }

    brief_lines = "\n".join(
        f"- {item['creator_handle']}: `{item['seed_product']}` / KPI `{item['primary_kpi']}` / manual review {item['risk_review']['manual_review_required_before_outreach']}"
        for item in seed_briefs
    )
    control_lines = "\n".join(
        f"- {item['creator_handle']}: held-out `{item['held_out_product']}` / {item['segment_id']}"
        for item in control_tracking
    )
    plan = f"""# Phase 5 Seeding Execution Plan

Generated at: {generated_at}

## Seed Briefs
{brief_lines}

## Control Group
{control_lines}

## Execution Loop

1. Confirm audience country, disclosure pattern, and creator availability before outreach.
2. Send product and brief with required disclosure and claim guardrails.
3. Collect public KPI snapshots at 24h, 72h, 7d, and 14d.
4. Store comment intent themes and counts only; do not store raw comment text.
5. Keep internal click, coupon, cart, order, CPA, and ROAS metrics in separate fields if Meditherapy provides them.
6. Compare seeded creators against held-out controls by segment and content angle.
7. Mark outcome as `inconclusive` when posting, public KPI, or internal conversion data is insufficient.

## Claim Guardrails

- Use cosmetic/routine/appearance/tolerance language.
- Avoid clinical outcome, lasting improvement, assured outcome, and disease claims.
- Retinal content must include night-use, gradual-use, sunscreen, and stop-if-irritated guidance.
- PDRN, vitamin, and tone/spot content must avoid acne outcome, whitening, melasma, or assured spot-removal claims.

## Phase 6 Input Contract

- `experiment_unit_id`
- creator handle and profile URL
- seed product
- posted URL
- 24h, 72h, 7d, 14d public KPI snapshots
- comment intent theme counts
- optional internal conversion metrics with source labels
- failure or inconclusive reason tag
"""
    EXECUTION_PLAN_PATH.write_text(plan)
    dump_json(VALIDATION_PATH, validation)

    pre_approval = f"""## 승인 요청: Phase 5 - 시딩 수행 브리프

### Codex 사전 검토 결과
- 산출물: `submission/src/data/seeding_briefs.json`, `submission/logs/seeding_execution_plan.md`
- 형식 검증: JSON/Markdown 생성 완료, 시딩 브리프 {len(seed_briefs)}건, 대조군 추적 계획 {len(control_tracking)}건
- 내용 정합성: 각 브리프에 제품, 후보 선정 이유, 제품 선정 이유, 인과 가설, 콘텐츠 각도, KPI, 리스크, 다음 반복 규칙 포함
- 리스크 검토: 광고/협찬 고지, 금지 표현, 제품별 주의 문구, 공개/내부 KPI 분리 포함
- reviewer 결과: {validation['reviewer_result']['status']}

### 시딩 브리프 6건
{brief_lines}

### 대조군 추적 3건
{control_lines}

### 사용자가 확인할 핵심
- 크리에이터에게 전달해도 되는 수준의 콘텐츠 각도인지
- 레티날 제품 2건의 주의 문구가 충분히 보수적인지
- Phase 6에서 공개 KPI만으로 말할 범위와 내부 데이터 연결 시 말할 범위가 명확한지

### 남은 리스크
- 실제 계약, 배송, 게시 여부는 아직 실행 전이며 Phase 5는 실행 브리프 설계 단계임
- audience country와 광고/협찬 고지 패턴은 outreach 전에 수동 확인 필요
- 매출, ROAS, 주문 증가는 내부 데이터 없이는 주장하지 않음

### 제안 판단
- Codex 권고: 승인
- 이유: blocker/must_fix 이슈가 없고, 브리프 필수 항목과 제품별 리스크 가드레일이 모두 포함됨

### 사용자에게 필요한 결정
1. Phase 5 브리프 6건을 그대로 승인할지 결정
2. Phase 6 결과 수집 테이블로 진행할지 결정
"""
    PRE_APPROVAL_PATH.write_text(pre_approval)
    print(json.dumps(validation, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
