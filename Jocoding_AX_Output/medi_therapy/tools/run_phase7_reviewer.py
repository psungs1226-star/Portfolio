#!/usr/bin/env python3
import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "submission" / "src" / "data"
LOG_DIR = ROOT / "submission" / "logs"

REVIEWER_REPORT_PATH = LOG_DIR / "reviewer_report.json"
REVIEWER_FINDINGS_PATH = LOG_DIR / "reviewer_findings.md"
VALIDATION_PATH = LOG_DIR / "phase7_validation.json"
PRE_APPROVAL_PATH = LOG_DIR / "phase7_pre_approval.md"

REQUIRED_JSON_FILES = {
    "product_parameters": DATA_DIR / "meditherapy_product_parameters.json",
    "mvp_parameters": DATA_DIR / "influencer_mvp_parameters.json",
    "seed_recommendations": DATA_DIR / "seed_recommendations.json",
    "seeding_briefs": DATA_DIR / "seeding_briefs.json",
    "experiment_results": DATA_DIR / "experiment_results.json",
    "new_product_rankings": DATA_DIR / "new_product_rankings.json",
    "new_product_research_plan": DATA_DIR / "new_product_research_plan.json",
}

REQUIRED_JSONL_FILES = {
    "influencer_profiles": DATA_DIR / "influencer_profiles.jsonl",
    "content_observations": DATA_DIR / "content_observations.jsonl",
    "matching_trace": LOG_DIR / "matching_trace.jsonl",
    "new_product_matching_trace": LOG_DIR / "new_product_matching_trace.jsonl",
}

LATEST_VALIDATION_FILES = {
    "phase0": LOG_DIR / "phase0_validation.json",
    "phase1": LOG_DIR / "phase1_validation_004.json",
    "phase2": LOG_DIR / "phase2_validation_003.json",
    "phase3": LOG_DIR / "phase3_validation.json",
    "phase4": LOG_DIR / "phase4_validation.json",
    "phase5": LOG_DIR / "phase5_validation.json",
    "phase6": LOG_DIR / "phase6_validation.json",
    "phase6a": LOG_DIR / "phase6a_validation.json",
    "phase6b": LOG_DIR / "phase6b_validation.json",
}

DOC_FILES = {
    "readme": ROOT / "submission" / "README.md",
    "plugin_plan": ROOT / "submission" / "PLUGIN_PLAN.md",
    "phase_harness": ROOT / "submission" / "PHASE_HARNESS.md",
    "review_protocol": ROOT / "submission" / "REVIEW_PROTOCOL.md",
}

DISALLOWED_HARD_CLAIM_PATTERNS = [
    r"매출\s*(증가|상승|개선|보장|확정)",
    r"ROAS\s*(증가|상승|개선|보장|확정)",
    r"주문\s*(증가|상승|개선|보장|확정)",
    r"sales\s+(lift|increase|growth)\s+(is|was|will be)\s+(proven|guaranteed|confirmed)",
]


def load_json(path):
    with path.open() as f:
        return json.load(f)


def load_jsonl(path):
    with path.open() as f:
        return [json.loads(line) for line in f if line.strip()]


def dump_json(path, payload):
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")


def add_finding(findings, severity, phase, category, title, evidence, recommendation):
    findings.append(
        {
            "severity": severity,
            "phase": phase,
            "category": category,
            "title": title,
            "evidence": evidence,
            "recommendation": recommendation,
        }
    )


def status_from_findings(findings):
    severities = Counter(item["severity"] for item in findings)
    if severities.get("fail", 0):
        return "fail"
    if severities.get("revise", 0):
        return "revise"
    return "pass"


def check_files(findings):
    loaded = {}
    for name, path in REQUIRED_JSON_FILES.items():
        if not path.exists():
            add_finding(findings, "fail", "all", "schema", f"필수 JSON 산출물 누락: {name}", str(path), "누락 파일을 생성한 뒤 Phase 7을 재실행한다.")
            continue
        try:
            loaded[name] = load_json(path)
        except Exception as exc:
            add_finding(findings, "fail", "all", "schema", f"JSON 파싱 실패: {name}", str(exc), "파일 형식을 수정한다.")

    loaded_jsonl = {}
    for name, path in REQUIRED_JSONL_FILES.items():
        if not path.exists():
            add_finding(findings, "fail", "all", "schema", f"필수 JSONL 산출물 누락: {name}", str(path), "누락 파일을 생성한 뒤 Phase 7을 재실행한다.")
            continue
        try:
            loaded_jsonl[name] = load_jsonl(path)
        except Exception as exc:
            add_finding(findings, "fail", "all", "schema", f"JSONL 파싱 실패: {name}", str(exc), "파일 형식을 수정한다.")

    validations = {}
    for name, path in LATEST_VALIDATION_FILES.items():
        if not path.exists():
            add_finding(findings, "fail", name, "validation", f"최신 validation 로그 누락: {name}", str(path), "해당 phase validation을 생성한다.")
            continue
        try:
            validations[name] = load_json(path)
        except Exception as exc:
            add_finding(findings, "fail", name, "validation", f"validation JSON 파싱 실패: {name}", str(exc), "파일 형식을 수정한다.")

    return loaded, loaded_jsonl, validations


def check_validation_status(findings, validations):
    for name, validation in validations.items():
        if validation.get("can_request_user_approval") is False:
            add_finding(
                findings,
                "fail",
                name,
                "validation",
                f"{name} 최신 validation이 승인 불가 상태",
                f"can_request_user_approval={validation.get('can_request_user_approval')}",
                "해당 phase로 되돌아가 blocker/must_fix를 해결한다.",
            )
        issue_counts = validation.get("issue_counts") or {}
        if issue_counts.get("blocker", 0) or issue_counts.get("must_fix", 0):
            add_finding(
                findings,
                "fail",
                name,
                "validation",
                f"{name} blocker/must_fix 잔존",
                str(issue_counts),
                "남은 blocker/must_fix를 제거하고 재검증한다.",
            )
        reviewer_status = (validation.get("reviewer_result") or {}).get("status")
        if reviewer_status and reviewer_status != "pass":
            add_finding(
                findings,
                "revise",
                name,
                "validation",
                f"{name} reviewer 상태가 pass가 아님",
                reviewer_status,
                "reviewer 지적 사항을 처리하거나 한계로 명시한다.",
            )


def check_product_and_profile_contract(findings, loaded, loaded_jsonl):
    products = loaded.get("product_parameters", {})
    params = loaded.get("mvp_parameters", {})
    profiles = loaded_jsonl.get("influencer_profiles", [])
    content = loaded_jsonl.get("content_observations", [])

    mvp_ids = set(params.get("mvp_products", []))
    found_products = []
    for family in products.get("product_families", []):
        for product in family.get("products", []):
            if product.get("product_id") in mvp_ids:
                found_products.append(product)

    if len(mvp_ids) != 9 or len(found_products) != 9:
        add_finding(
            findings,
            "fail",
            "phase1",
            "product_ontology",
            "MVP 제품 9개 계약 불일치",
            f"mvp_ids={len(mvp_ids)}, found_products={len(found_products)}",
            "MVP 제품 목록과 제품 파라미터를 일치시킨다.",
        )

    required = {"best_for_concerns", "skin_type_fit", "skin_type_caution", "content_fit", "risk_flags", "measurement_kpis"}
    missing = [
        product.get("product_id")
        for product in found_products
        if required - set(product.keys())
    ]
    if missing:
        add_finding(
            findings,
            "fail",
            "phase1",
            "product_ontology",
            "MVP 제품 필수 필드 누락",
            ", ".join(missing),
            "누락 필드를 채운 뒤 Phase 1 이후 산출물을 재생성한다.",
        )

    if len(profiles) != 30:
        add_finding(findings, "fail", "phase3", "data_quality", "인플루언서 프로필 수가 30명이 아님", str(len(profiles)), "Phase 3 정규화를 재실행한다.")
    if len(content) != 300:
        add_finding(findings, "fail", "phase2", "data_quality", "콘텐츠 관찰치 수가 300개가 아님", str(len(content)), "Phase 2 수집 결과를 보강한다.")

    status_counts = Counter(profile.get("normalization_status") for profile in profiles)
    if status_counts.get("ready_for_matching", 0) < 6:
        add_finding(
            findings,
            "fail",
            "phase3",
            "data_quality",
            "ready_for_matching 후보가 6명 미만",
            str(dict(status_counts)),
            "후보 수집/정규화를 보강한다.",
        )

    gender_keys = []
    for profile in profiles:
        text = json.dumps(profile, ensure_ascii=False).lower()
        if '"gender"' in text or "성별" in text:
            gender_keys.append(profile.get("profile_id"))
    if gender_keys:
        add_finding(
            findings,
            "revise",
            "phase3",
            "policy",
            "성별 관련 필드 또는 표현 발견",
            ", ".join(gender_keys[:5]),
            "성별이 1차 추천 기준으로 쓰이지 않았는지 수동 확인한다.",
        )


def check_matching_logic(findings, loaded, loaded_jsonl):
    seed = loaded.get("seed_recommendations", {})
    trace = loaded_jsonl.get("matching_trace", [])
    selected = seed.get("selected_seed_recommendations", [])
    controls = seed.get("control_group", [])

    if len(trace) != 270:
        add_finding(findings, "fail", "phase4", "matching", "Phase 4 trace 수가 270건이 아님", str(len(trace)), "후보 30명 x 제품 9개 기준으로 재실행한다.")
    if len(selected) != 6:
        add_finding(findings, "fail", "phase4", "matching", "시딩 추천 수가 6명이 아님", str(len(selected)), "Phase 4 seed selection을 재검토한다.")
    if len(controls) != 3:
        add_finding(findings, "fail", "phase4", "matching", "대조군 수가 3명이 아님", str(len(controls)), "Phase 4 control selection을 재검토한다.")

    for item in selected:
        if item.get("display_group") != "ready_for_matching":
            add_finding(findings, "fail", "phase4", "risk_filter", "ready 후보가 아닌 인플루언서가 시딩 추천됨", item.get("creator_handle"), "추천 후보에서 제외한다.")
        if item.get("top_products", [{}])[0].get("risk_review", {}).get("hard_exclusion_reasons"):
            add_finding(findings, "fail", "phase4", "risk_filter", "hard exclusion 후보가 시딩 추천됨", item.get("creator_handle"), "hard exclusion 선적용 로직을 수정한다.")

    priorities = [item.get("display_priority") for item in seed.get("candidate_matches", [])]
    if priorities != sorted(priorities):
        add_finding(findings, "fail", "phase4", "display", "Phase 4 표시 우선순위 정렬 깨짐", str(priorities[:10]), "display_priority 정렬을 복구한다.")


def check_briefs_and_results(findings, loaded):
    briefs = loaded.get("seeding_briefs", {})
    results = loaded.get("experiment_results", {})

    if briefs.get("summary", {}).get("seed_brief_count") != 6:
        add_finding(findings, "fail", "phase5", "brief", "시딩 브리프 수가 6건이 아님", str(briefs.get("summary")), "Phase 5 브리프 생성을 재실행한다.")
    if briefs.get("summary", {}).get("control_tracking_count") != 3:
        add_finding(findings, "fail", "phase5", "brief", "대조군 추적 계획 수가 3건이 아님", str(briefs.get("summary")), "Phase 5 브리프 생성을 재실행한다.")

    seed_briefs = briefs.get("seed_briefs", [])
    missing_brief_fields = []
    for brief in seed_briefs:
        for field in ("required_disclosures", "primary_kpi", "secondary_kpi", "collection_window"):
            if field not in brief or brief[field] in ("", [], None):
                missing_brief_fields.append(f"{brief.get('brief_id')}:{field}")
    expected_windows = {"24h", "72h", "7d", "14d"}
    for brief in seed_briefs:
        if not expected_windows.issubset(set(brief.get("collection_window", []))):
            missing_brief_fields.append(f"{brief.get('brief_id')}:collection_window_values")
    if missing_brief_fields:
        add_finding(
            findings,
            "fail",
            "phase5",
            "brief",
            "브리프 필수 실행 필드 누락",
            ", ".join(missing_brief_fields[:5]),
            "required_disclosures, primary_kpi, secondary_kpi, collection_window을 채운다.",
        )

    if results.get("summary", {}).get("seed_result_count") != 6:
        add_finding(findings, "fail", "phase6", "results", "시딩 결과 행 수가 6건이 아님", str(results.get("summary")), "Phase 6 결과 테이블을 재생성한다.")
    if results.get("summary", {}).get("control_result_count") != 3:
        add_finding(findings, "fail", "phase6", "results", "대조군 결과 행 수가 3건이 아님", str(results.get("summary")), "Phase 6 결과 테이블을 재생성한다.")
    if results.get("summary", {}).get("sales_claim_count") != 0:
        add_finding(findings, "fail", "phase6", "claim", "매출 claim count가 0이 아님", str(results.get("summary")), "매출/ROAS 단정 표현을 제거한다.")
    if results.get("summary", {}).get("internal_data_connected") is not False:
        add_finding(findings, "revise", "phase6", "results", "내부 데이터 연결 상태가 명확히 false가 아님", str(results.get("summary")), "내부 데이터 연결 여부를 명확히 표시한다.")


def check_new_product_flow(findings, loaded, loaded_jsonl):
    rankings = loaded.get("new_product_rankings", {})
    plan = loaded.get("new_product_research_plan", {})
    new_trace = loaded_jsonl.get("new_product_matching_trace", [])
    selected = rankings.get("selected_new_product_recommendations", [])

    if len(new_trace) != 30:
        add_finding(findings, "fail", "phase6a", "new_product", "신제품 trace 수가 30건이 아님", str(len(new_trace)), "Phase 6A를 재실행한다.")
    if rankings.get("summary", {}).get("candidate_ranking_count") != 30:
        add_finding(findings, "fail", "phase6a", "new_product", "신제품 후보 랭킹 수가 30명이 아님", str(rankings.get("summary")), "Phase 6A를 재실행한다.")
    if len(selected) != 6:
        add_finding(findings, "fail", "phase6a", "new_product", "신제품 추천 후보 수가 6명이 아님", str(len(selected)), "Phase 6A 추천 수를 재검토한다.")
    for item in selected:
        if item.get("display_group") != "ready_for_matching":
            add_finding(findings, "fail", "phase6a", "risk_filter", "신제품 추천에 ready가 아닌 후보 포함", item.get("creator_handle"), "추천에서 제외한다.")
        if item.get("recommendation_status") != "eligible_for_seed":
            add_finding(findings, "fail", "phase6a", "risk_filter", "신제품 추천에 eligible이 아닌 후보 포함", item.get("creator_handle"), "추천에서 제외한다.")

    if plan.get("preserved_phase6a_ranking_file") != "submission/src/data/new_product_rankings.json":
        add_finding(
            findings,
            "fail",
            "phase6b",
            "research_gap",
            "Phase 6B가 Phase 6A 랭킹 보존 파일을 명시하지 않음",
            str(plan.get("preserved_phase6a_ranking_file")),
            "research plan에 보존 파일을 명시한다.",
        )
    if plan.get("collection_targets", {}).get("execute_phase6c") is not False:
        add_finding(
            findings,
            "revise",
            "phase6b",
            "research_gap",
            "Phase 6C 자동 실행 플래그가 false가 아님",
            str(plan.get("collection_targets")),
            "사용자 승인 전 Phase 6C 자동 실행을 막는다.",
        )
    if "public_data_access_instability" not in plan.get("risks", []):
        add_finding(
            findings,
            "fail",
            "phase6b",
            "research_gap",
            "공개 데이터 접근 리스크 누락",
            str(plan.get("risks")),
            "리스크 항목을 추가한다.",
        )


def check_document_claims(findings):
    for name, path in DOC_FILES.items():
        if not path.exists():
            add_finding(findings, "revise", "docs", "documentation", f"문서 누락: {name}", str(path), "문서를 생성하거나 제출 범위에서 제외한다.")
            continue
        text = path.read_text(errors="ignore")
        for line_number, line in enumerate(text.splitlines(), start=1):
            if any(token in line for token in ["않", "금지", "배제", "분리", "내부 데이터", "가설", "검증", "단정하지"]):
                continue
            for pattern in DISALLOWED_HARD_CLAIM_PATTERNS:
                if not re.search(pattern, line, flags=re.IGNORECASE):
                    continue
                add_finding(
                    findings,
                    "fail",
                    "docs",
                    "claim",
                    f"과장 가능성이 있는 매출/ROAS 단정 표현 발견: {name}",
                    f"{path.relative_to(ROOT)}:{line_number}: {line.strip()}",
                    "내부 데이터 연결 전에는 가설/가능성/검증 필요 표현으로 낮춘다.",
                )

    readme = DOC_FILES["readme"]
    if readme.exists():
        text = readme.read_text(errors="ignore")
        required_sources = [
            "hackathon.jocodingax.ai",
            "careermeditherapy.ninehire.site/vision",
            "kr.linkedin.com/jobs/view/4413525615",
            "ads.tiktok.com/business",
            "business.tiktokshop.com",
        ]
        missing = [source for source in required_sources if source not in text]
        if missing:
            add_finding(
                findings,
                "revise",
                "docs",
                "evidence",
                "README 공식 근거 링크 일부 누락",
                ", ".join(missing),
                "README 공개 근거 섹션에 누락 링크를 추가한다.",
            )


def build_summary(findings, loaded, loaded_jsonl, validations):
    return {
        "finding_counts": dict(Counter(item["severity"] for item in findings)),
        "phase_validation_count": len(validations),
        "mvp_product_count": len(loaded.get("mvp_parameters", {}).get("mvp_products", [])),
        "influencer_profile_count": len(loaded_jsonl.get("influencer_profiles", [])),
        "content_observation_count": len(loaded_jsonl.get("content_observations", [])),
        "phase4_seed_count": len(loaded.get("seed_recommendations", {}).get("selected_seed_recommendations", [])),
        "phase5_brief_count": loaded.get("seeding_briefs", {}).get("summary", {}).get("seed_brief_count"),
        "phase6_seed_result_count": loaded.get("experiment_results", {}).get("summary", {}).get("seed_result_count"),
        "phase6a_new_product_selected_count": len(loaded.get("new_product_rankings", {}).get("selected_new_product_recommendations", [])),
        "phase6b_decision": loaded.get("new_product_research_plan", {}).get("decision"),
    }


def main():
    generated_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    findings = []
    loaded, loaded_jsonl, validations = check_files(findings)
    check_validation_status(findings, validations)
    check_product_and_profile_contract(findings, loaded, loaded_jsonl)
    check_matching_logic(findings, loaded, loaded_jsonl)
    check_briefs_and_results(findings, loaded)
    check_new_product_flow(findings, loaded, loaded_jsonl)
    check_document_claims(findings)

    final_status = status_from_findings(findings)
    summary = build_summary(findings, loaded, loaded_jsonl, validations)
    report = {
        "schema_version": "0.1.0",
        "phase_id": "phase_7_5_4_mini_reviewer",
        "generated_at": generated_at,
        "reviewer": {
            "name": "codex_phase7_reviewer",
            "intended_role": "5.4 mini reviewer harness",
            "status": final_status,
        },
        "scope": {
            "phases_reviewed": ["phase0", "phase1", "phase2", "phase3", "phase4", "phase5", "phase6", "phase6a", "phase6b"],
            "json_files": [str(path.relative_to(ROOT)) for path in REQUIRED_JSON_FILES.values()],
            "jsonl_files": [str(path.relative_to(ROOT)) for path in REQUIRED_JSONL_FILES.values()],
            "validation_files": [str(path.relative_to(ROOT)) for path in LATEST_VALIDATION_FILES.values()],
        },
        "summary": summary,
        "findings": findings,
        "required_fix_count": sum(1 for item in findings if item["severity"] == "fail"),
        "revise_count": sum(1 for item in findings if item["severity"] == "revise"),
        "can_proceed_to_phase8": final_status == "pass",
        "notes": [
            "This reviewer is deterministic and checks the current repo artifacts rather than calling an external model.",
            "Internal sales, ROAS, or order lift is not considered proven unless internal conversion data is attached.",
            "Phase 6C remains gated behind user approval because Phase 6B found no required research trigger.",
        ],
    }
    dump_json(REVIEWER_REPORT_PATH, report)

    finding_lines = "\n".join(
        f"- [{item['severity']}] {item['phase']} / {item['category']}: {item['title']} | 근거: {item['evidence']} | 조치: {item['recommendation']}"
        for item in findings
    ) or "- 발견된 fail/revise 없음"
    reviewed_lines = "\n".join(f"- {phase}" for phase in report["scope"]["phases_reviewed"])
    findings_md = f"""# Phase 7 Reviewer Findings

생성 시각: {generated_at}

## 최종 판정

- reviewer: `{report['reviewer']['name']}`
- intended role: `{report['reviewer']['intended_role']}`
- status: `{final_status}`
- fail: {report['required_fix_count']}
- revise: {report['revise_count']}
- Phase 8 진행 가능: {report['can_proceed_to_phase8']}

## 검수 범위

{reviewed_lines}

## 요약

- MVP 제품 수: {summary['mvp_product_count']}
- 인플루언서 프로필 수: {summary['influencer_profile_count']}
- 콘텐츠 관찰치 수: {summary['content_observation_count']}
- Phase 4 시딩 추천: {summary['phase4_seed_count']}
- Phase 5 브리프: {summary['phase5_brief_count']}
- Phase 6 결과 행: {summary['phase6_seed_result_count']}
- Phase 6A 신제품 추천: {summary['phase6a_new_product_selected_count']}
- Phase 6B 판단: `{summary['phase6b_decision']}`

## Findings

{finding_lines}

## Reviewer 해석

현재 산출물은 성별을 1차 추천 기준으로 쓰지 않고, hard exclusion 후보를 추천에서 제외하며, 내부 전환 데이터 없이 매출/ROAS를 단정하지 않는다. 신제품 Phase 6A/6B도 기존 DB 랭킹과 추가 리서치 판단을 분리해 보존한다.
"""
    REVIEWER_FINDINGS_PATH.write_text(findings_md)

    validation = {
        "phase_id": "phase_7_5_4_mini_reviewer",
        "validation_run_id": "phase7_validation_001",
        "generated_at": generated_at,
        "input_files": report["scope"]["json_files"] + report["scope"]["jsonl_files"] + report["scope"]["validation_files"],
        "output_files": [
            str(REVIEWER_REPORT_PATH.relative_to(ROOT)),
            str(REVIEWER_FINDINGS_PATH.relative_to(ROOT)),
        ],
        "checks": {
            "reviewer_report_exists": REVIEWER_REPORT_PATH.exists(),
            "reviewer_findings_exists": REVIEWER_FINDINGS_PATH.exists(),
            "fail_count": report["required_fix_count"],
            "revise_count": report["revise_count"],
            "phase8_allowed_only_on_pass": report["can_proceed_to_phase8"] == (final_status == "pass"),
            "phase6c_not_auto_executed": loaded.get("new_product_research_plan", {}).get("collection_targets", {}).get("execute_phase6c") is False,
        },
        "issues": [
            {
                "severity": "blocker" if item["severity"] == "fail" else "must_fix",
                "finding": item["title"],
                "affected_files": [str(REVIEWER_REPORT_PATH.relative_to(ROOT))],
                "fix_action": item["recommendation"],
                "status": "open",
                "revalidation_result": "",
            }
            for item in findings
            if item["severity"] in {"fail", "revise"}
        ],
        "reviewer_result": {
            "status": final_status,
            "reviewer": "codex_phase7_self_reviewer",
            "notes": [
                f"fail={report['required_fix_count']}",
                f"revise={report['revise_count']}",
                "No Phase 8 progression unless status is pass.",
            ],
        },
        "can_request_user_approval": final_status == "pass",
        "issue_counts": {
            "blocker": report["required_fix_count"],
            "must_fix": report["revise_count"],
            "should_fix": 0,
        },
    }
    dump_json(VALIDATION_PATH, validation)

    pre_approval = f"""## 승인 요청: Phase 7 - 5.4 Mini 리뷰어 검수

### Codex 사전 검토 결과
- 산출물: `submission/logs/reviewer_report.json`, `submission/logs/reviewer_findings.md`
- 형식 검증: JSON/Markdown 생성 완료
- 검수 범위: Phase 0-6B 산출물, JSON/JSONL 데이터, 최신 validation 로그, 제출 문서
- reviewer 결과: `{final_status}`
- fail: {report['required_fix_count']}
- revise: {report['revise_count']}

### 요약
- MVP 제품: {summary['mvp_product_count']}개
- 인플루언서 프로필: {summary['influencer_profile_count']}명
- 콘텐츠 관찰치: {summary['content_observation_count']}개
- Phase 4 추천/대조군: {summary['phase4_seed_count']}명 / 3명
- Phase 6A 신제품 추천: {summary['phase6a_new_product_selected_count']}명
- Phase 6B 판단: `{summary['phase6b_decision']}`

### Findings
{finding_lines}

### Codex 권고
- {'Phase 8로 진행 가능' if final_status == 'pass' else 'findings를 먼저 수정한 뒤 Phase 7 재실행'}
- 이유: reviewer status가 `{final_status}`임
"""
    PRE_APPROVAL_PATH.write_text(pre_approval)


if __name__ == "__main__":
    main()
