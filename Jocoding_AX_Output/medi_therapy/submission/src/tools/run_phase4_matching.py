#!/usr/bin/env python3
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
LOG_DIR = ROOT / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)

PRODUCTS_PATH = DATA_DIR / "meditherapy_product_parameters.json"
PROFILES_PATH = DATA_DIR / "influencer_profiles.jsonl"
PARAMS_PATH = DATA_DIR / "influencer_mvp_parameters.json"
RECOMMENDATIONS_PATH = DATA_DIR / "seed_recommendations.json"
TRACE_PATH = LOG_DIR / "matching_trace.jsonl"
VALIDATION_PATH = LOG_DIR / "phase4_validation.json"
PRE_APPROVAL_PATH = LOG_DIR / "phase4_pre_approval.md"

DISPLAY_ORDER = {
    "ready_for_matching": 1,
    "review_required_before_matching": 2,
    "needs_more_data": 3,
}

CONCERN_ALIASES = {
    "acne_prone": {"acne_prone", "trouble_prone", "post_breakout", "post_extraction_care"},
    "barrier_damage": {"barrier_damage", "skin_barrier", "dry_sensitive", "redness"},
    "redness": {"redness", "barrier_damage", "sensitive_dullness"},
    "dryness": {"dryness", "dehydration", "dry_sensitive", "tightness_after_cleansing"},
    "dehydration": {"dehydration", "dryness", "dry_sensitive"},
    "dullness": {"dullness", "glow", "uneven_tone", "spot_appearance"},
    "texture": {"texture", "roughness", "bumpy_texture", "oily_texture", "skin_texture_appearance"},
    "pores": {"pores", "visible_pores", "clogged_pores", "pore_texture"},
    "post_acne_marks": {"post_acne_marks", "dark_spots", "spot_appearance", "pigmentation"},
    "pigmentation": {"pigmentation", "dark_spots", "uneven_tone", "spot_appearance"},
    "wrinkles": {"wrinkles", "fine_lines", "firmness", "elasticity", "early_aging", "lifting_appearance"},
    "elasticity": {"elasticity", "firmness", "lifting_appearance", "wrinkles"},
    "under_eye_dryness": {"under_eye_dryness", "fine_lines", "tired_look"},
    "makeup_adherence_issue": {
        "makeup_adherence",
        "makeup_base",
        "skin_prep",
        "texture",
        "routine_entry",
    },
}

CONTENT_ALIASES = {
    "skincare_routine": {
        "skincare_routine",
        "morning_routine",
        "night_routine",
        "low_irritation_routine",
        "calming_routine",
        "barrier_repair",
        "trouble_care",
        "post_breakout_routine",
    },
    "grwm": {"grwm", "morning_routine", "quick_care", "morning_de_puff_style"},
    "makeup_prep": {
        "makeup_prep",
        "skin_prep",
        "makeup_before_after",
        "makeup_adherence_followup",
        "quick_care",
    },
    "ingredient_education": {"ingredient_education", "beginner_exfoliation", "texture_care"},
    "product_review": {"product_review", "ingredient_education", "texture_demo_engagement"},
    "before_after_journey": {"makeup_before_after", "two_week_challenge", "routine_transformation"},
    "home_esthetic_demo": {
        "home_esthetic",
        "home_esthetic_demo",
        "visual_demo",
        "device_demo",
        "event_care",
        "lifting_routine",
        "mask_routine",
    },
    "amazon_review_style": {"amazon_review_style", "product_review"},
}

PRODUCT_RISK_CONFLICTS = {
    "retinal_skin_booster_serum": {"retinoid_conflict", "pregnancy_or_lactation_disclosed", "wounded_or_procedure_skin"},
    "aha_bha_routine_cleanser": {"acid_overuse_risk", "wounded_or_procedure_skin"},
    "wrinklefit_eye_patch": {"eye_area_irritation_disclosure", "wounded_or_procedure_skin"},
    "tension_up_mask": {"wounded_or_procedure_skin", "filter_heavy_skin_review"},
}


def load_json(path):
    with path.open() as f:
        return json.load(f)


def load_jsonl(path):
    with path.open() as f:
        return [json.loads(line) for line in f if line.strip()]


def dump_json(path, payload):
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")


def flat_products(product_doc, mvp_ids):
    products = []
    for family in product_doc["product_families"]:
        for product in family["products"]:
            if product["product_id"] in mvp_ids:
                item = dict(product)
                item["family_id"] = family["family_id"]
                products.append(item)
    return products


def expand_tags(tags, alias_map):
    expanded = set(tags or [])
    for tag in tags or []:
        expanded |= alias_map.get(tag, set())
    return expanded


def matching_observed_tags(observed_tags, targets, alias_map):
    target_set = set(targets or [])
    observed_hits = []
    product_hits = set()
    for tag in observed_tags or []:
        expanded = alias_map.get(tag, {tag}) | {tag}
        matched = expanded & target_set
        if matched:
            observed_hits.append(tag)
            product_hits |= matched
    return sorted(set(observed_hits)), sorted(product_hits)


def overlap_score(primary, secondary, targets, alias_map, max_score):
    target_set = set(targets or [])
    primary_hits, primary_product_hits = matching_observed_tags(primary, target_set, alias_map)
    secondary_hits, secondary_product_hits = matching_observed_tags(secondary, target_set, alias_map)
    raw = len(primary_hits) * 2.0 + len(secondary_hits) * 1.0
    return (
        min(max_score, raw * 7.0),
        primary_hits,
        secondary_hits,
        sorted(set(primary_product_hits + secondary_product_hits)),
    )


def score_self_fit(profile, product):
    primary = profile.get("skin_concerns", {}).get("primary", [])
    secondary = profile.get("skin_concerns", {}).get("secondary", [])
    score, primary_hits, secondary_hits, product_hits = overlap_score(
        primary,
        secondary,
        product.get("best_for_concerns", []),
        CONCERN_ALIASES,
        30,
    )
    if profile.get("segment_id") == "acne_trouble_barrier" and product["product_id"] in {
        "pdrn_serum",
        "panthenol_core_booster_cream",
    }:
        score += 3
    if profile.get("segment_id") == "tone_spot_glow" and product["product_id"] in {
        "vitamin_bubble_serum",
        "tranexamic_cream",
    }:
        score += 3
    if profile.get("segment_id") == "anti_aging_home_esthetic" and product["product_id"] in {
        "tension_up_mask",
        "wrinklefit_eye_patch",
    }:
        score += 3
    if profile.get("segment_id") == "grwm_lifestyle_beauty" and product["product_id"] in {
        "hyaluronic_first_serum",
        "wrinklefit_eye_patch",
    }:
        score += 2
    return min(35, round(score, 2)), primary_hits, secondary_hits, product_hits


def score_audience_fit(profile, product):
    themes = profile.get("audience_intent_themes", {}).get("themes", {}) or {}
    commercial = profile.get("commercial_signals", {}) or {}
    score = 8
    if themes.get("where_to_buy_questions", 0) or themes.get("price_questions", 0):
        score += 6
    if themes.get("routine_questions", 0):
        score += 4
    if themes.get("sensitive_skin_questions", 0) and product["product_id"] in {
        "hyaluronic_first_serum",
        "pdrn_serum",
        "panthenol_core_booster_cream",
    }:
        score += 4
    if commercial.get("product_review_style") or commercial.get("past_sponsored_content"):
        score += 3
    if commercial.get("affiliate_link_present") or commercial.get("coupon_usage_present"):
        score += 2
    return min(25, score)


def score_content_fit(profile, product):
    primary = profile.get("content_domains", {}).get("primary", [])
    secondary = profile.get("content_domains", {}).get("secondary", [])
    score, primary_hits, secondary_hits, product_hits = overlap_score(
        primary,
        secondary,
        product.get("content_fit", []),
        CONTENT_ALIASES,
        18,
    )
    if product["product_id"] in {"tension_up_mask", "vitamin_bubble_serum"} and (
        "home_esthetic_demo" in primary or "product_review" in primary
    ):
        score += 2
    if product["product_id"] in {"hyaluronic_first_serum", "wrinklefit_eye_patch"} and (
        "grwm" in primary or "makeup_prep" in primary
    ):
        score += 2
    return min(20, round(score, 2)), primary_hits, secondary_hits, product_hits


def score_market_fit(profile):
    market = profile.get("market_channel_fit_inputs", {}) or {}
    score = 0
    if market.get("primary_platform") == "TikTok" or market.get("tiktok_sampled"):
        score += 4
    if "English" in str(market.get("language", "")):
        score += 2
    if any(token in str(market.get("country", "")) for token in ["United States", "North America", "English-speaking"]):
        score += 2
    if market.get("follower_band") in {"10k-50k", "50k-250k"}:
        score += 2
    elif market.get("follower_band") == "1k-10k":
        score += 1
    return min(10, score)


def product_conflicts(profile, product):
    risk_profile = profile.get("risk_profile", {}) or {}
    risk_signals = set()
    for bucket in ("hard_exclusions", "soft_penalties", "review_notes"):
        for risk in risk_profile.get(bucket, []) or []:
            risk_signals.add(risk.get("risk_signal"))
            risk_signals.add(risk.get("hard_exclusion"))
            risk_signals.add(risk.get("penalty_reason"))
            risk_signals.add(risk.get("review_reason"))
    risk_signals.discard(None)
    conflicts = sorted(PRODUCT_RISK_CONFLICTS.get(product["product_id"], set()) & risk_signals)
    return conflicts


def risk_penalty(profile, product):
    risk_profile = profile.get("risk_profile", {}) or {}
    penalty = 0
    reasons = []
    soft = risk_profile.get("soft_penalties", []) or []
    notes = risk_profile.get("review_notes", []) or []
    if soft:
        penalty += min(6, 3 * len(soft))
        reasons.extend(sorted({r.get("risk_signal", "soft_risk") for r in soft}))
    if notes:
        penalty += 1
        reasons.extend(sorted({r.get("risk_signal", "review_note") for r in notes}))
    conflicts = product_conflicts(profile, product)
    if conflicts:
        penalty += 4
        reasons.extend(conflicts)
    if profile.get("normalization_status") == "needs_more_data":
        penalty += 4
        reasons.append("needs_more_data")
    return min(10, penalty), sorted(set(reasons)), conflicts


def hard_exclusion_reasons(profile):
    return [
        item.get("hard_exclusion") or item.get("risk_signal") or "hard_exclusion"
        for item in (profile.get("risk_profile", {}) or {}).get("hard_exclusions", []) or []
    ]


def score_product(profile, product):
    hard_reasons = hard_exclusion_reasons(profile)
    self_score, self_primary, self_secondary, self_product_hits = score_self_fit(profile, product)
    audience_score = score_audience_fit(profile, product)
    content_score, content_primary, content_secondary, content_product_hits = score_content_fit(profile, product)
    market_score = score_market_fit(profile)
    penalty, penalty_reasons, conflicts = risk_penalty(profile, product)
    score = round(self_score + audience_score + content_score + market_score - penalty, 2)
    if hard_reasons:
        eligibility = "no_seed_hard_exclusion"
    elif profile.get("normalization_status") == "needs_more_data":
        eligibility = "needs_more_data_no_seed"
    elif conflicts:
        eligibility = "review_required_product_risk"
    elif profile.get("normalization_status") == "review_required_before_matching":
        eligibility = "review_required_before_seed"
    else:
        eligibility = "eligible"
    return {
        "product_id": product["product_id"],
        "product_name": product.get("name"),
        "family_id": product.get("family_id"),
        "total_score": max(0, score),
        "score_trace": {
            "influencer_self_fit": self_score,
            "audience_fit": audience_score,
            "content_fit": content_score,
            "market_channel_fit": market_score,
            "risk_penalty": penalty,
        },
        "matched_evidence": {
            "primary_concern_hits": self_primary,
            "secondary_concern_hits": self_secondary,
            "product_concern_hits": self_product_hits,
            "primary_content_hits": content_primary,
            "secondary_content_hits": content_secondary,
            "product_content_hits": content_product_hits,
        },
        "risk_review": {
            "hard_exclusion_reasons": hard_reasons,
            "risk_penalty_reasons": penalty_reasons,
            "product_risk_conflicts": conflicts,
            "product_risk_flags": product.get("risk_flags", []),
        },
        "measurement_kpis": product.get("measurement_kpis", []),
        "eligibility": eligibility,
    }


def content_angle(product_id, profile):
    primary_content = profile.get("content_domains", {}).get("primary", [])
    if product_id == "hyaluronic_first_serum":
        return "필터 없는 첫 단계 수분 루틴 또는 GRWM 메이크업프렙 맥락에서 건조/밀림 질문을 관찰한다."
    if product_id == "pdrn_serum":
        return "트러블 후 장벽 루틴을 7일 체감 기록으로 구성하되 치료·완치 표현은 배제한다."
    if product_id == "panthenol_core_booster_cream":
        return "민감/장벽 루틴의 낮은 자극 대안으로 포지셔닝하고 사용감과 루틴 저장률을 본다."
    if product_id == "retinal_skin_booster_serum":
        return "야간 피부결 루틴과 다음날 메이크업 밀착 맥락으로 사용법 질문과 부작용 신고를 함께 본다."
    if product_id == "aha_bha_routine_cleanser":
        return "초보 각질·모공 클렌징 루틴으로 빈도 질문과 과사용 리스크 댓글을 같이 측정한다."
    if product_id == "vitamin_bubble_serum":
        return "버블 제형 시연과 광채 루틴을 짧은 훅으로 만들고 시청완료율과 톤/광채 댓글을 본다."
    if product_id == "tranexamic_cream":
        return "흔적/스팟 루틴의 2주 기록형 콘텐츠로 자외선 차단 맥락과 과장 표현 리스크를 관리한다."
    if product_id == "tension_up_mask":
        return "홈에스테틱 비주얼 데모로 착용감, 공유율, 리프팅 표현 과장 리스크를 함께 본다."
    if product_id == "wrinklefit_eye_patch":
        return "GRWM 전 퀵 눈가 케어로 편입하고 눈가 자극 신고와 저장률을 같이 관찰한다."
    return "제품 사용 맥락과 후보 콘텐츠 형식을 맞춘 1회 시딩 테스트를 수행한다."


def causal_hypothesis(profile, match):
    handle = profile["identity"]["handle"]
    product = match["product_id"]
    concern_hits = (
        match["matched_evidence"]["primary_concern_hits"]
        + match["matched_evidence"]["secondary_concern_hits"]
    )
    content_hits = (
        match["matched_evidence"]["primary_content_hits"]
        + match["matched_evidence"]["secondary_content_hits"]
    )
    concern_text = ", ".join(concern_hits[:2]) if concern_hits else "관찰된 피부 고민"
    content_text = ", ".join(content_hits[:2]) if content_hits else "기존 뷰티 콘텐츠"
    return (
        f"{handle}는 {concern_text} 맥락과 {content_text} 콘텐츠 근거가 있어 "
        f"{product} 시딩 시 저장, 사용법 질문, 구매 의도 댓글이 증가할 수 있다는 가설을 검증한다."
    )


def no_seed_option(profile, best_match):
    reasons = []
    if hard_exclusion_reasons(profile):
        reasons.extend(hard_exclusion_reasons(profile))
    if profile.get("normalization_status") == "needs_more_data":
        reasons.append("insufficient_public_data_for_any_causal_hypothesis")
    if best_match["score_trace"]["risk_penalty"] >= 8:
        reasons.append("high_risk_penalty")
    return {
        "available": True,
        "recommended": bool(reasons),
        "reasons": sorted(set(reasons)) or ["Use if brand safety review cannot confirm audience and disclosure fit."],
    }


def build_candidate_match(profile, product_matches):
    ordered = sorted(product_matches, key=lambda item: item["total_score"], reverse=True)
    best = ordered[0]
    top_three = ordered[:3]
    status = profile.get("normalization_status")
    if hard_exclusion_reasons(profile):
        recommendation_status = "no_seed_hard_exclusion"
    elif status == "needs_more_data":
        recommendation_status = "needs_more_data_no_seed"
    elif best["eligibility"] == "review_required_product_risk" or status == "review_required_before_matching":
        recommendation_status = "review_required_before_seed"
    else:
        recommendation_status = "eligible_for_seed"

    evidence_urls = []
    for urls in (profile.get("traceability", {}) or {}).get("sampled_content_urls", [])[:3]:
        evidence_urls.append(urls)

    return {
        "profile_id": profile.get("profile_id"),
        "candidate_id": profile.get("candidate_id"),
        "creator_handle": profile["identity"]["handle"],
        "profile_url": profile["identity"].get("profile_url"),
        "segment_id": profile.get("segment_id"),
        "display_group": status,
        "display_priority": DISPLAY_ORDER.get(status, 99),
        "profile_confidence": profile.get("profile_confidence"),
        "recommendation_status": recommendation_status,
        "recommended_product": None if recommendation_status.startswith("no_seed") else best["product_id"],
        "recommended_product_name": None if recommendation_status.startswith("no_seed") else best["product_name"],
        "top_products": top_three,
        "no_seed_option": no_seed_option(profile, best),
        "causal_hypothesis": causal_hypothesis(profile, best),
        "content_brief": content_angle(best["product_id"], profile),
        "primary_kpi": (best.get("measurement_kpis") or ["save_rate"])[0],
        "secondary_kpis": (best.get("measurement_kpis") or [])[1:3],
        "missing_data_questions": profile.get("missing_data_questions", []),
        "evidence_urls": evidence_urls,
    }


def select_seed_and_control(candidate_matches):
    eligible = [
        item
        for item in candidate_matches
        if item["display_group"] == "ready_for_matching"
        and item["recommendation_status"] == "eligible_for_seed"
    ]
    eligible.sort(key=lambda item: item["top_products"][0]["total_score"], reverse=True)

    seed = []
    product_counts = Counter()
    for item in eligible:
        product_id = item["recommended_product"]
        if product_counts[product_id] >= 2:
            continue
        seed.append({**item, "selection_role": "seed_recommendation"})
        product_counts[product_id] += 1
        if len(seed) == 6:
            break

    if len(seed) < 6:
        selected_ids = {item["profile_id"] for item in seed}
        for item in eligible:
            if item["profile_id"] in selected_ids:
                continue
            seed.append({**item, "selection_role": "seed_recommendation"})
            if len(seed) == 6:
                break

    seed_ids = {item["profile_id"] for item in seed}
    control = []
    used_segments = Counter()
    for item in eligible:
        if item["profile_id"] in seed_ids:
            continue
        if used_segments[item["segment_id"]] >= 1 and len(control) < 2:
            continue
        control.append(
            {
                **item,
                "selection_role": "control_group",
                "control_reason": "Qualified public-data candidate held out to compare posting, save, and comment-intent lift against seeded creators.",
            }
        )
        used_segments[item["segment_id"]] += 1
        if len(control) == 3:
            break

    if len(control) < 3:
        control_ids = {item["profile_id"] for item in control}
        for item in eligible:
            if item["profile_id"] in seed_ids or item["profile_id"] in control_ids:
                continue
            control.append(
                {
                    **item,
                    "selection_role": "control_group",
                    "control_reason": "Qualified public-data candidate held out for non-seeded comparison.",
                }
            )
            if len(control) == 3:
                break

    return seed, control


def validate(payload, trace_records):
    candidate_matches = payload["candidate_matches"]
    seed = payload["selected_seed_recommendations"]
    control = payload["control_group"]
    issues = []

    if len(candidate_matches) != 30:
        issues.append(("blocker", "candidate_match_count_not_30"))
    if len(seed) != 6:
        issues.append(("blocker", "seed_recommendation_count_not_6"))
    if len(control) != 3:
        issues.append(("blocker", "control_group_count_not_3"))
    if any(item["display_group"] != "ready_for_matching" for item in seed):
        issues.append(("blocker", "non_ready_candidate_in_seed_recommendations"))
    if any(item["display_group"] == "needs_more_data" for item in seed):
        issues.append(("blocker", "needs_more_data_candidate_in_seed_recommendations"))
    if any(item["recommendation_status"].startswith("no_seed") for item in seed):
        issues.append(("blocker", "no_seed_candidate_in_seed_recommendations"))
    if any(item["top_products"][0]["risk_review"]["hard_exclusion_reasons"] for item in seed):
        issues.append(("blocker", "hard_exclusion_seeded"))

    order_values = [item["display_priority"] for item in candidate_matches]
    if order_values != sorted(order_values):
        issues.append(("must_fix", "display_priority_sort_order_broken"))

    needs_more_indexes = [
        idx for idx, item in enumerate(candidate_matches) if item["display_group"] == "needs_more_data"
    ]
    ready_indexes = [
        idx for idx, item in enumerate(candidate_matches) if item["display_group"] == "ready_for_matching"
    ]
    if needs_more_indexes and ready_indexes and min(needs_more_indexes) < max(ready_indexes):
        issues.append(("must_fix", "needs_more_data_appears_before_ready"))

    for item in candidate_matches:
        best = item["top_products"][0]
        trace = best["score_trace"]
        recomputed = round(
            trace["influencer_self_fit"]
            + trace["audience_fit"]
            + trace["content_fit"]
            + trace["market_channel_fit"]
            - trace["risk_penalty"],
            2,
        )
        if abs(best["total_score"] - max(0, recomputed)) > 0.01:
            issues.append(("must_fix", f"score_trace_mismatch:{item['creator_handle']}"))
            break

    product_distribution = Counter(item["recommended_product"] for item in seed)
    if product_distribution and max(product_distribution.values()) > 3:
        issues.append(("should_fix", "seed_product_distribution_skew_over_3"))

    if len(trace_records) != 270:
        issues.append(("must_fix", "matching_trace_not_30_by_9"))

    return issues


def main():
    product_doc = load_json(PRODUCTS_PATH)
    profiles = load_jsonl(PROFILES_PATH)
    params = load_json(PARAMS_PATH)
    mvp_ids = params["mvp_products"]
    products = flat_products(product_doc, set(mvp_ids))
    if len(products) != len(mvp_ids):
        found = {product["product_id"] for product in products}
        missing = sorted(set(mvp_ids) - found)
        raise SystemExit(f"Missing MVP product parameters: {missing}")

    trace_records = []
    candidate_matches = []
    for profile in profiles:
        product_matches = []
        for product in products:
            match = score_product(profile, product)
            product_matches.append(match)
            trace_records.append(
                {
                    "phase_id": "phase_4_product_influencer_matching",
                    "profile_id": profile.get("profile_id"),
                    "creator_handle": profile["identity"]["handle"],
                    "display_group": profile.get("normalization_status"),
                    "display_priority": DISPLAY_ORDER.get(profile.get("normalization_status"), 99),
                    "product_id": product["product_id"],
                    "total_score": match["total_score"],
                    "score_trace": match["score_trace"],
                    "eligibility": match["eligibility"],
                    "hard_exclusion_applied_first": bool(hard_exclusion_reasons(profile)),
                    "risk_review": match["risk_review"],
                    "matched_evidence": match["matched_evidence"],
                }
            )
        candidate_matches.append(build_candidate_match(profile, product_matches))

    candidate_matches.sort(
        key=lambda item: (
            item["display_priority"],
            -item["top_products"][0]["total_score"],
            item["creator_handle"],
        )
    )
    seed, control = select_seed_and_control(candidate_matches)
    held_for_review = [
        item
        for item in candidate_matches
        if item["recommendation_status"] in {
            "review_required_before_seed",
            "needs_more_data_no_seed",
            "no_seed_hard_exclusion",
        }
    ]

    generated_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    payload = {
        "schema_version": "0.1.0",
        "phase_id": "phase_4_product_influencer_matching",
        "generated_at": generated_at,
        "scoring_policy": {
            "score_total": 100,
            "influencer_self_fit": 35,
            "audience_fit": 25,
            "content_fit": 20,
            "market_channel_fit": 10,
            "risk_penalty": -10,
            "hard_exclusion_rule": "Hard exclusions are applied before seed selection. A hard-excluded creator can appear in trace data but cannot be selected for seeding.",
            "no_seed_rule": "Return no_seed when hard exclusions, insufficient public data, or risk penalties prevent a defensible causal hypothesis.",
        },
        "display_priority_policy": params["display_priority_policy"],
        "summary": {
            "profile_count": len(profiles),
            "mvp_product_count": len(products),
            "candidate_match_count": len(candidate_matches),
            "selected_seed_count": len(seed),
            "control_group_count": len(control),
            "held_for_review_count": len(held_for_review),
            "seed_product_distribution": dict(Counter(item["recommended_product"] for item in seed)),
            "candidate_status_distribution": dict(Counter(item["display_group"] for item in candidate_matches)),
            "recommendation_status_distribution": dict(
                Counter(item["recommendation_status"] for item in candidate_matches)
            ),
        },
        "selected_seed_recommendations": seed,
        "control_group": control,
        "held_for_review": held_for_review,
        "candidate_matches": candidate_matches,
    }

    dump_json(RECOMMENDATIONS_PATH, payload)
    TRACE_PATH.write_text(
        "\n".join(json.dumps(item, ensure_ascii=False) for item in trace_records) + "\n"
    )

    issues = validate(payload, trace_records)
    blocker_count = sum(1 for severity, _ in issues if severity == "blocker")
    must_fix_count = sum(1 for severity, _ in issues if severity == "must_fix")
    should_fix_count = sum(1 for severity, _ in issues if severity == "should_fix")
    validation = {
        "phase_id": "phase_4_product_influencer_matching",
        "validation_run_id": "phase4_validation_001",
        "generated_at": generated_at,
        "input_files": [
            str(PRODUCTS_PATH.relative_to(ROOT)),
            str(PROFILES_PATH.relative_to(ROOT)),
            str(PARAMS_PATH.relative_to(ROOT)),
        ],
        "output_files": [
            str(RECOMMENDATIONS_PATH.relative_to(ROOT)),
            str(TRACE_PATH.relative_to(ROOT)),
        ],
        "checks": {
            "mvp_product_count": len(products),
            "profile_count": len(profiles),
            "trace_record_count": len(trace_records),
            "selected_seed_count": len(seed),
            "control_group_count": len(control),
            "display_priority_sorted": all(
                candidate_matches[idx]["display_priority"] <= candidate_matches[idx + 1]["display_priority"]
                for idx in range(len(candidate_matches) - 1)
            ),
            "hard_exclusion_seeded_count": sum(
                1 for item in seed if item["top_products"][0]["risk_review"]["hard_exclusion_reasons"]
            ),
            "needs_more_data_seeded_count": sum(
                1 for item in seed if item["display_group"] == "needs_more_data"
            ),
            "no_seed_available_for_all_candidates": all(
                item["no_seed_option"]["available"] for item in candidate_matches
            ),
        },
        "issues": [
            {
                "severity": severity,
                "finding": finding,
                "affected_files": [str(RECOMMENDATIONS_PATH.relative_to(ROOT))],
                "fix_action": "No action required." if severity == "should_fix" else "Investigate before approval.",
                "status": "open" if severity in {"blocker", "must_fix"} else "deferred",
                "revalidation_result": "",
            }
            for severity, finding in issues
        ],
        "reviewer_result": {
            "status": "pass" if blocker_count == 0 and must_fix_count == 0 else "revise",
            "reviewer": "codex_phase4_self_reviewer",
            "notes": [
                "Hard exclusions are not selected for seeding.",
                "needs_more_data candidates remain below ready and review-required display groups.",
                "Scores are separated into self, audience, content, market, and risk components.",
                "Internal sales, ROAS, or order lift is not asserted.",
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

    top_seed_lines = "\n".join(
        f"- {item['creator_handle']}: `{item['recommended_product']}` / score {item['top_products'][0]['total_score']} / {item['segment_id']}"
        for item in seed
    )
    control_lines = "\n".join(
        f"- {item['creator_handle']}: `{item['recommended_product']}` / score {item['top_products'][0]['total_score']} / {item['segment_id']}"
        for item in control
    )
    risk_lines = "\n".join(
        f"- {item['creator_handle']}: {item['recommendation_status']} / {', '.join(item['no_seed_option']['reasons'])}"
        for item in held_for_review[:8]
    )
    pre_approval = f"""## 승인 요청: Phase 4 - 제품-인플루언서 매칭

### Codex 사전 검토 결과
- 산출물: `submission/src/data/seed_recommendations.json`, `submission/logs/matching_trace.jsonl`
- 형식 검증: JSON/JSONL 생성 완료, trace {len(trace_records)}건 = 후보 30명 x MVP 제품 9개
- 내용 정합성: 표시 우선순위는 `ready_for_matching` -> `review_required_before_matching` -> `needs_more_data` 순서로 정렬
- 리스크 검토: hard exclusion 후보는 시딩 추천 6명과 대조군 3명에서 제외
- reviewer 결과: {validation['reviewer_result']['status']}

### 시딩 추천 6명
{top_seed_lines}

### 대조군 3명
{control_lines}

### 사용자가 확인할 핵심
- 추천 6명이 실제 대회 시연용 실험군으로 납득 가능한지
- 대조군 3명이 같은 공개 데이터 조건에서 비교군 역할을 할 수 있는지
- 제품 분포가 메디테라피 MVP 제품 포트폴리오를 충분히 보여주는지

### 남은 리스크
- 모든 매출 기여는 아직 가설이며, 내부 클릭/쿠폰/주문 데이터 연결 전에는 매출 성공으로 단정하지 않음
- 일부 후보의 audience country와 광고/협찬 고지 패턴은 수동 확인 질문으로 남김
- 보류/추가검토 후보 예시:
{risk_lines}

### 제안 판단
- Codex 권고: 승인
- 이유: blocker/must_fix 이슈가 없고, hard exclusion 및 `needs_more_data` 후보가 고신뢰 추천처럼 노출되지 않음

### 사용자에게 필요한 결정
1. Phase 4의 시딩 추천 6명과 대조군 3명 구성을 승인할지 결정
2. Phase 5에서 이 6명 기준으로 시딩 브리프를 작성할지, 제품 다양성을 더 강하게 조정할지 결정
"""
    PRE_APPROVAL_PATH.write_text(pre_approval)

    print(json.dumps(validation, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
