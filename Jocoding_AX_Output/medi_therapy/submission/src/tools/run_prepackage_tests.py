#!/usr/bin/env python3
import json
import py_compile
import re
from collections import Counter
from datetime import datetime, timezone
from html import escape
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SUBMISSION = ROOT
DATA_DIR = SUBMISSION / "data"
LOG_DIR = SUBMISSION / "logs"
RESEARCH_DIR = SUBMISSION / "reports"
LOG_DIR.mkdir(parents=True, exist_ok=True)
RESEARCH_DIR.mkdir(parents=True, exist_ok=True)

RESULTS_JSON = LOG_DIR / "prepackage_test_results.json"
REPORT_HTML = RESEARCH_DIR / "prepackage_test_report.html"

PHASE_VALIDATIONS = {
    "Phase 0": LOG_DIR / "phase0_validation.json",
    "Phase 1": LOG_DIR / "phase1_validation_004.json",
    "Phase 2": LOG_DIR / "phase2_validation_003.json",
    "Phase 3": LOG_DIR / "phase3_validation.json",
    "Phase 4": LOG_DIR / "phase4_validation.json",
    "Phase 5": LOG_DIR / "phase5_validation.json",
    "Phase 6": LOG_DIR / "phase6_validation.json",
    "Phase 6A": LOG_DIR / "phase6a_validation.json",
    "Phase 6B": LOG_DIR / "phase6b_validation.json",
    "Phase 7": LOG_DIR / "phase7_validation.json",
    "Phase 8": LOG_DIR / "phase8_validation.json",
}

CORE_DATA_FILES = {
    "products": DATA_DIR / "meditherapy_product_parameters.json",
    "mvp_params": DATA_DIR / "influencer_mvp_parameters.json",
    "profiles": DATA_DIR / "influencer_profiles.jsonl",
    "content": DATA_DIR / "content_observations.jsonl",
    "phase4_recommendations": DATA_DIR / "seed_recommendations.json",
    "phase5_briefs": DATA_DIR / "seeding_briefs.json",
    "phase6_results": DATA_DIR / "experiment_results.json",
    "phase6a_rankings": DATA_DIR / "new_product_rankings.json",
    "phase6b_plan": DATA_DIR / "new_product_research_plan.json",
    "phase8_learning": DATA_DIR / "iteration_learning_plan.json",
    "reviewer": LOG_DIR / "reviewer_report.json",
}

REPORT_ARTIFACTS = {
    "new_product_markdown_report": LOG_DIR / "new_product_ranking_report.md",
    "new_product_html_report": LOG_DIR / "new_product_ranking_report.html",
    "latest_new_product_test_result": LOG_DIR / "latest_new_product_test_result.md",
}

REQUIRED_PACKAGE_FILES = {
    "plugin_manifest": SUBMISSION / ".codex-plugin" / "plugin.json",
    "readme": SUBMISSION / "README.md",
}

SECRET_PATTERNS = [
    re.compile(r"sk-[A-Za-z0-9_-]{20,}"),
    re.compile(r"xox[baprs]-[A-Za-z0-9-]{20,}"),
    re.compile(r"AKIA[0-9A-Z]{16}"),
    re.compile(r"(?i)(api[_-]?key|secret|token|password)\s*[:=]\s*['\"][^'\"]{8,}['\"]"),
]

HARD_CLAIM_PATTERNS = [
    re.compile(r"매출\s*(증가|상승|개선|보장|확정)", re.I),
    re.compile(r"ROAS\s*(증가|상승|개선|보장|확정)", re.I),
    re.compile(r"주문\s*(증가|상승|개선|보장|확정)", re.I),
]

NEGATION_TOKENS = ["않", "없이", "금지", "배제", "분리", "내부 데이터", "가설", "검증", "단정하지", "주장하지", "실패 조건"]


def load_json(path):
    with path.open() as f:
        return json.load(f)


def load_jsonl(path):
    with path.open() as f:
        return [json.loads(line) for line in f if line.strip()]


def add(tests, name, status, detail, evidence=None):
    tests.append(
        {
            "name": name,
            "status": status,
            "detail": detail,
            "evidence": evidence or "",
        }
    )


def test_python_compile(tests):
    scripts = sorted((ROOT / "tools").glob("run_*.py"))
    errors = []
    for script in scripts:
        try:
            py_compile.compile(str(script), doraise=True)
        except Exception as exc:
            errors.append(f"{script.relative_to(ROOT)}: {exc}")
    add(
        tests,
        "Python 실행 스크립트 컴파일",
        "pass" if not errors else "fail",
        f"{len(scripts)}개 run_*.py 스크립트 컴파일 검사",
        "\n".join(errors),
    )


def test_json_syntax(tests):
    json_files = sorted(SUBMISSION.glob("**/*.json"))
    errors = []
    for path in json_files:
        try:
            load_json(path)
        except Exception as exc:
            errors.append(f"{path.relative_to(ROOT)}: {exc}")
    add(
        tests,
        "JSON 문법 검사",
        "pass" if not errors else "fail",
        f"{len(json_files)}개 JSON 파일 검사",
        "\n".join(errors),
    )


def test_jsonl_syntax(tests):
    jsonl_files = sorted(SUBMISSION.glob("**/*.jsonl"))
    errors = []
    counts = {}
    for path in jsonl_files:
        try:
            rows = load_jsonl(path)
            counts[str(path.relative_to(ROOT))] = len(rows)
        except Exception as exc:
            errors.append(f"{path.relative_to(ROOT)}: {exc}")
    add(
        tests,
        "JSONL 문법 및 행 수 검사",
        "pass" if not errors else "fail",
        f"{len(jsonl_files)}개 JSONL 파일 검사",
        json.dumps(counts, ensure_ascii=False),
    )


def test_phase_validations(tests):
    failures = []
    evidence = {}
    for label, path in PHASE_VALIDATIONS.items():
        if not path.exists():
            failures.append(f"{label}: missing {path.relative_to(ROOT)}")
            continue
        data = load_json(path)
        reviewer_status = (data.get("reviewer_result") or {}).get("status")
        issue_counts = data.get("issue_counts") or {}
        can_request = data.get("can_request_user_approval")
        evidence[label] = {
            "phase_id": data.get("phase_id"),
            "reviewer_status": reviewer_status,
            "issue_counts": issue_counts,
            "can_request_user_approval": can_request,
        }
        if can_request is False:
            failures.append(f"{label}: can_request_user_approval=false")
        if issue_counts.get("blocker", 0) or issue_counts.get("must_fix", 0):
            failures.append(f"{label}: {issue_counts}")
        if reviewer_status and reviewer_status != "pass":
            failures.append(f"{label}: reviewer={reviewer_status}")
    add(
        tests,
        "Phase validation 최신본 검사",
        "pass" if not failures else "fail",
        "Phase 0-8 최신 validation 로그 기준",
        json.dumps(evidence, ensure_ascii=False, indent=2),
    )


def test_core_contracts(tests):
    failures = []
    products = load_json(CORE_DATA_FILES["products"])
    params = load_json(CORE_DATA_FILES["mvp_params"])
    profiles = load_jsonl(CORE_DATA_FILES["profiles"])
    content = load_jsonl(CORE_DATA_FILES["content"])
    seed = load_json(CORE_DATA_FILES["phase4_recommendations"])
    briefs = load_json(CORE_DATA_FILES["phase5_briefs"])
    results = load_json(CORE_DATA_FILES["phase6_results"])
    rankings = load_json(CORE_DATA_FILES["phase6a_rankings"])
    plan = load_json(CORE_DATA_FILES["phase6b_plan"])
    learning = load_json(CORE_DATA_FILES["phase8_learning"])
    reviewer = load_json(CORE_DATA_FILES["reviewer"])
    matching_trace = load_jsonl(LOG_DIR / "matching_trace.jsonl")
    new_product_trace = load_jsonl(LOG_DIR / "new_product_matching_trace.jsonl")

    mvp_ids = set(params.get("mvp_products", []))
    found_mvp = []
    for family in products.get("product_families", []):
        for product in family.get("products", []):
            if product.get("product_id") in mvp_ids:
                found_mvp.append(product.get("product_id"))

    checks = {
        "mvp_product_count": len(found_mvp),
        "profile_count": len(profiles),
        "content_observation_count": len(content),
        "phase4_seed_count": len(seed.get("selected_seed_recommendations", [])),
        "phase4_control_count": len(seed.get("control_group", [])),
        "phase4_trace_count": len(matching_trace),
        "phase5_seed_brief_count": briefs.get("summary", {}).get("seed_brief_count"),
        "phase6_seed_result_count": results.get("summary", {}).get("seed_result_count"),
        "phase6_sales_claim_count": results.get("summary", {}).get("sales_claim_count"),
        "phase6a_selected_count": len(rankings.get("selected_new_product_recommendations", [])),
        "phase6a_trace_count": len(new_product_trace),
        "phase6b_decision": plan.get("decision"),
        "phase7_status": reviewer.get("reviewer", {}).get("status"),
        "phase8_actual_rule_updates": len(learning.get("actual_rule_updates", [])),
        "phase8_hypothesis_only_updates": len(learning.get("hypothesis_only_updates", [])),
    }
    expected = {
        "mvp_product_count": 9,
        "profile_count": 30,
        "content_observation_count": 300,
        "phase4_seed_count": 6,
        "phase4_control_count": 3,
        "phase4_trace_count": 270,
        "phase5_seed_brief_count": 6,
        "phase6_seed_result_count": 6,
        "phase6_sales_claim_count": 0,
        "phase6a_selected_count": 6,
        "phase6a_trace_count": 30,
        "phase7_status": "pass",
        "phase8_actual_rule_updates": 0,
    }
    for key, value in expected.items():
        if checks.get(key) != value:
            failures.append(f"{key}: expected {value}, got {checks.get(key)}")
    if plan.get("decision") != "existing_db_sufficient":
        failures.append(f"phase6b_decision: expected existing_db_sufficient, got {plan.get('decision')}")

    add(
        tests,
        "핵심 데이터 계약 검사",
        "pass" if not failures else "fail",
        "MVP 규모, 추천 수, trace 수, reviewer, 반복 학습 계약",
        json.dumps({"checks": checks, "failures": failures}, ensure_ascii=False, indent=2),
    )


def test_report_artifacts(tests):
    failures = []
    evidence = {}
    required_patterns = {
        "new_product_markdown_report": ["선정 사유 상세", "보고자 해석", "검증할 가설", "근거 태그", "관찰 KPI"],
        "new_product_html_report": ["보고자 판단 포인트", "최종 추천 순위", "순위별 선정 사유 상세", "보고자 해석", "검증할 가설", "관찰 KPI"],
        "latest_new_product_test_result": ["순위별 선정 사유 요약", "@milkydew", "매출 기여는 단정하지 않는다"],
    }
    for label, path in REPORT_ARTIFACTS.items():
        if not path.exists():
            failures.append(f"{label}: missing {path.relative_to(ROOT)}")
            continue
        text = path.read_text(errors="ignore")
        missing = [pattern for pattern in required_patterns[label] if pattern not in text]
        evidence[label] = {
            "path": str(path.relative_to(ROOT)),
            "size_bytes": path.stat().st_size,
            "required_patterns_present": not missing,
        }
        if missing:
            failures.append(f"{label}: missing patterns {missing}")

    add(
        tests,
        "보고서 산출물 계약 검사",
        "pass" if not failures else "fail",
        "신제품 HTML/Markdown 보고서와 보고자용 선정 사유 섹션 필수 포함",
        json.dumps({"evidence": evidence, "failures": failures}, ensure_ascii=False, indent=2),
    )


def test_risk_guards(tests):
    failures = []
    seed = load_json(CORE_DATA_FILES["phase4_recommendations"])
    rankings = load_json(CORE_DATA_FILES["phase6a_rankings"])
    results = load_json(CORE_DATA_FILES["phase6_results"])

    for item in seed.get("selected_seed_recommendations", []):
        if item.get("display_group") != "ready_for_matching":
            failures.append(f"Phase4 non-ready selected: {item.get('creator_handle')}")
        risk = item.get("top_products", [{}])[0].get("risk_review", {})
        if risk.get("hard_exclusion_reasons"):
            failures.append(f"Phase4 hard exclusion selected: {item.get('creator_handle')}")

    for item in rankings.get("selected_new_product_recommendations", []):
        if item.get("display_group") != "ready_for_matching":
            failures.append(f"Phase6A non-ready selected: {item.get('creator_handle')}")
        if item.get("recommendation_status") != "eligible_for_seed":
            failures.append(f"Phase6A non-eligible selected: {item.get('creator_handle')}")

    if results.get("summary", {}).get("internal_data_connected") is not False:
        failures.append("Phase6 internal_data_connected is not false")
    if results.get("summary", {}).get("sales_claim_count") != 0:
        failures.append("Phase6 sales_claim_count is not 0")

    add(
        tests,
        "리스크 가드레일 검사",
        "pass" if not failures else "fail",
        "hard exclusion, needs_more_data, 내부 매출 데이터 분리",
        "\n".join(failures),
    )


def test_claims_and_secrets(tests):
    secret_hits = []
    claim_hits = []
    for path in sorted(SUBMISSION.glob("**/*")) + sorted((ROOT / "agents.md",)):
        if not path.exists() or path.is_dir() or path.name == ".DS_Store":
            continue
        try:
            text = path.read_text(errors="ignore")
        except Exception:
            continue
        for line_number, line in enumerate(text.splitlines(), start=1):
            for pattern in SECRET_PATTERNS:
                if pattern.search(line):
                    secret_hits.append(f"{path.relative_to(ROOT)}:{line_number}")
            if "tools" in path.relative_to(ROOT).parts or "__pycache__" in path.parts or path.name in {
                "prepackage_test_results.json",
                "prepackage_test_report.html",
            }:
                continue
            if any(token in line for token in NEGATION_TOKENS):
                continue
            for pattern in HARD_CLAIM_PATTERNS:
                if pattern.search(line):
                    claim_hits.append(f"{path.relative_to(ROOT)}:{line_number}: {line.strip()}")

    add(
        tests,
        "비밀정보 노출 검사",
        "pass" if not secret_hits else "fail",
        "API key/token/password 패턴 검색",
        "\n".join(secret_hits),
    )
    add(
        tests,
        "매출/ROAS/주문 단정 표현 검사",
        "pass" if not claim_hits else "fail",
        "부정/금지 문맥을 제외하고 단정 표현 검색",
        "\n".join(claim_hits),
    )


def test_package_readiness(tests):
    failures = []
    warnings = []
    for label, path in REQUIRED_PACKAGE_FILES.items():
        if not path.exists():
            failures.append(f"{label}: missing {path.relative_to(ROOT)}")
    skill_files = sorted((SUBMISSION / "skills").glob("*/SKILL.md"))
    if not skill_files:
        failures.append("skill_file: missing submission/src/skills/<name>/SKILL.md")
    if (SUBMISSION / ".DS_Store").exists():
        warnings.append(".DS_Store exists and should be excluded from submission.zip")

    status = "fail" if failures else ("warn" if warnings else "pass")
    add(
        tests,
        "제출 패키징 준비도 검사",
        status,
        "plugin.json, SKILL.md, README, 불필요 파일 확인",
        json.dumps({"failures": failures, "warnings": warnings, "skill_files": [str(p.relative_to(ROOT)) for p in skill_files]}, ensure_ascii=False, indent=2),
    )


def status_counts(tests):
    return Counter(test["status"] for test in tests)


def overall_status(tests):
    counts = status_counts(tests)
    if counts.get("fail"):
        return "fail"
    if counts.get("warn"):
        return "warn"
    return "pass"


def badge(status):
    label = {"pass": "통과", "warn": "주의", "fail": "실패"}[status]
    return f'<span class="badge {status}">{label}</span>'


def render_html(payload):
    rows = "\n".join(
        f"""
        <tr>
          <td>{escape(test['name'])}</td>
          <td>{badge(test['status'])}</td>
          <td>{escape(test['detail'])}</td>
          <td><pre>{escape(test['evidence'])}</pre></td>
        </tr>
        """
        for test in payload["tests"]
    )
    counts = payload["summary"]["status_counts"]
    return f"""<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>메디테라피 패키징 전 테스트 리포트</title>
  <style>
    :root {{
      --bg: #f7f8fa;
      --panel: #fff;
      --ink: #171a1f;
      --muted: #5d6875;
      --line: #d9dee5;
      --good: #0f766e;
      --good-soft: #dff5f1;
      --warn: #9a5b00;
      --warn-soft: #fff1d6;
      --bad: #b42318;
      --bad-soft: #fde7e4;
      --neutral-soft: #edf0f3;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font: 14px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }}
    main {{ max-width: 1180px; margin: 0 auto; padding: 28px 20px 48px; }}
    h1 {{ margin: 0 0 8px; font-size: 28px; line-height: 1.2; letter-spacing: 0; }}
    h2 {{ margin: 26px 0 12px; font-size: 18px; letter-spacing: 0; }}
    p {{ margin: 0; color: var(--muted); }}
    .summary {{ display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin: 18px 0; }}
    .metric {{
      border: 1px solid var(--line);
      background: var(--panel);
      border-radius: 8px;
      padding: 14px;
      min-height: 82px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }}
    .metric span {{ color: var(--muted); font-size: 12px; }}
    .metric strong {{ font-size: 24px; line-height: 1; }}
    .panel {{ border: 1px solid var(--line); background: var(--panel); border-radius: 8px; padding: 16px; margin: 12px 0; }}
    .callout {{ border-left: 4px solid var(--warn); background: var(--warn-soft); color: #4d3300; padding: 12px 14px; border-radius: 6px; }}
    table {{ width: 100%; border-collapse: collapse; table-layout: fixed; }}
    th, td {{ border-bottom: 1px solid var(--line); padding: 10px 8px; text-align: left; vertical-align: top; word-break: break-word; }}
    th {{ color: var(--muted); font-size: 12px; background: #fbfcfd; }}
    tr:last-child td {{ border-bottom: 0; }}
    pre {{ margin: 0; white-space: pre-wrap; font: 12px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; color: #29313a; }}
    .badge {{ display: inline-block; padding: 3px 8px; border-radius: 999px; font-size: 12px; font-weight: 650; }}
    .pass {{ color: var(--good); background: var(--good-soft); }}
    .warn {{ color: var(--warn); background: var(--warn-soft); }}
    .fail {{ color: var(--bad); background: var(--bad-soft); }}
    .table-wrap {{ overflow-x: auto; }}
    @media (max-width: 760px) {{
      main {{ padding: 18px 12px 32px; }}
      .summary {{ grid-template-columns: 1fr 1fr; }}
      h1 {{ font-size: 23px; }}
      table {{ table-layout: auto; }}
      th, td {{ min-width: 150px; }}
    }}
  </style>
</head>
<body>
  <main>
    <header>
      <h1>메디테라피 패키징 전 테스트 리포트</h1>
      <p>Phase 0-8 산출물과 제출 패키징 준비 상태를 분리해 검증한 결과입니다. 생성 시각: {escape(payload['generated_at'])}</p>
    </header>

    <section class="summary">
      <div class="metric"><span>전체 상태</span><strong>{escape(payload['summary']['overall_status'])}</strong></div>
      <div class="metric"><span>통과</span><strong>{counts.get('pass', 0)}</strong></div>
      <div class="metric"><span>주의</span><strong>{counts.get('warn', 0)}</strong></div>
      <div class="metric"><span>실패</span><strong>{counts.get('fail', 0)}</strong></div>
    </section>

    <section class="panel">
      <h2>해석</h2>
      <div class="callout">{escape(payload['summary']['interpretation'])}</div>
    </section>

    <section class="panel">
      <h2>테스트 결과</h2>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>테스트</th><th>상태</th><th>설명</th><th>근거</th></tr>
          </thead>
          <tbody>
            {rows}
          </tbody>
        </table>
      </div>
    </section>
  </main>
</body>
</html>
"""


def main():
    generated_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    tests = []
    test_python_compile(tests)
    test_json_syntax(tests)
    test_jsonl_syntax(tests)
    test_phase_validations(tests)
    test_core_contracts(tests)
    test_report_artifacts(tests)
    test_risk_guards(tests)
    test_claims_and_secrets(tests)
    test_package_readiness(tests)

    counts = status_counts(tests)
    overall = overall_status(tests)
    if overall == "fail":
        interpretation = "Phase 산출물 테스트는 대부분 통과했지만, 제출 패키징 필수 구조가 아직 완성되지 않아 패키징 전 보완이 필요합니다."
    elif overall == "warn":
        interpretation = "핵심 테스트는 통과했지만 패키징에서 제외하거나 확인해야 할 주의 항목이 있습니다."
    else:
        interpretation = "패키징 전 핵심 테스트가 모두 통과했습니다."

    payload = {
        "schema_version": "0.1.0",
        "phase_id": "prepackage_test_report",
        "generated_at": generated_at,
        "summary": {
            "overall_status": overall,
            "status_counts": dict(counts),
            "interpretation": interpretation,
        },
        "tests": tests,
        "output_files": [
            str(RESULTS_JSON.relative_to(ROOT)),
            str(REPORT_HTML.relative_to(ROOT)),
        ],
    }
    RESULTS_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")
    REPORT_HTML.write_text(render_html(payload))
    print(json.dumps(payload["summary"], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
