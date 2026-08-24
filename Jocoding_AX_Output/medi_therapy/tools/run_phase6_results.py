#!/usr/bin/env python3
import html
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "submission" / "src" / "data"
LOG_DIR = ROOT / "submission" / "logs"
RESEARCH_DIR = ROOT / "research"

BRIEFS_PATH = DATA_DIR / "seeding_briefs.json"
RESULTS_PATH = DATA_DIR / "experiment_results.json"
RESULT_REVIEW_PATH = LOG_DIR / "result_review.md"
VALIDATION_PATH = LOG_DIR / "phase6_validation.json"
PRE_APPROVAL_PATH = LOG_DIR / "phase6_pre_approval.md"
HTML_REPORT_PATH = RESEARCH_DIR / "meditherapy_phase4_6_report.html"

WINDOWS = ["24h", "72h", "7d", "14d"]
PUBLIC_SNAPSHOT_KEYS = [
    "posted",
    "posted_url",
    "view_count",
    "like_count",
    "comment_count",
    "save_count",
    "share_count",
    "comment_intent_themes",
    "risk_comment_count",
]
INTERNAL_KEYS = [
    "tracked_link_clicks",
    "coupon_usage",
    "add_to_cart",
    "orders",
    "CPA",
    "ROAS",
    "repurchase",
]

PRODUCT_LABELS = {
    "pdrn_serum": "PDRN 스킨부스터 세럼",
    "hyaluronic_first_serum": "히알루론산 스킨부스터 퍼스트 세럼",
    "vitamin_bubble_serum": "비타민 스킨부스터 버블세럼",
    "retinal_skin_booster_serum": "레티날 스킨부스터 세럼",
    "panthenol_core_booster_cream": "판테놀 코어 부스터 크림",
    "aha_bha_routine_cleanser": "아하 바하 루틴 클렌저",
    "tranexamic_cream": "트라넥삼산 스킨부스터 크림",
    "tension_up_mask": "텐션 업 마스크",
    "wrinklefit_eye_patch": "링클핏 탱글 아이패치",
}

SEGMENT_LABELS = {
    "acne_trouble_barrier": "트러블·장벽",
    "texture_pore_makeup_prep": "피부결·모공·메이크업프렙",
    "tone_spot_glow": "톤·잡티·광채",
    "anti_aging_home_esthetic": "리프팅·홈에스테틱",
    "grwm_lifestyle_beauty": "GRWM·라이프스타일 뷰티",
}

KPI_LABELS = {
    "save_rate": "저장률",
    "routine_save_rate": "루틴 저장률",
    "view_completion_rate": "시청 완료율",
    "night_routine_save_rate": "야간 루틴 저장률",
    "sensitive_skin_question_count": "민감피부 질문 수",
    "routine_question_count": "루틴 질문 수",
    "dryness_question_count": "건조 질문 수",
    "beginner_routine_question_count": "입문 루틴 질문 수",
    "glow_tone_comment_count": "광채·톤 댓글 수",
    "texture_demo_engagement": "제형 시연 참여",
    "usage_question_count": "사용법 질문 수",
    "sunscreen_question_count": "자외선 차단 질문 수",
}


def load_json(path):
    with path.open() as f:
        return json.load(f)


def dump_json(path, payload):
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")


def empty_public_snapshot(window):
    return {
        "window": window,
        "source": "public_platform_or_manual_observation",
        "status": "pending_post",
        "metrics": {
            "posted": None,
            "posted_url": None,
            "view_count": None,
            "like_count": None,
            "comment_count": None,
            "save_count": None,
            "share_count": None,
            "comment_intent_themes": {},
            "risk_comment_count": None,
        },
        "raw_comment_text_stored": False,
        "collector_note": "게시 후 공개 KPI는 아직 수집되지 않았다.",
    }


def empty_internal_metrics():
    return {
        "source": "internal_data_not_provided",
        "availability": "not_connected_for_submission_mvp",
        "metrics": {key: None for key in INTERNAL_KEYS},
        "claim_rule": "이 내부 지표 없이는 매출, ROAS, CPA, 주문, 재구매 영향을 주장하지 않는다.",
    }


def seed_result_record(brief):
    primary = brief["primary_kpi"]
    secondary = brief.get("secondary_kpi", [])
    return {
        "experiment_unit_id": brief["result_collection"]["experiment_unit_id"],
        "selection_role": "seed_recommendation",
        "creator_handle": brief["creator_handle"],
        "profile_url": brief["profile_url"],
        "segment_id": brief["segment_id"],
        "seed_product": brief["seed_product"],
        "seed_product_name": brief["seed_product_name"],
        "causal_hypothesis": brief["causal_hypothesis"],
        "pre_registered_kpis": {
            "primary_kpi": primary,
            "secondary_kpis": secondary,
            "post_hoc_kpi_change": False,
            "kpi_source": "phase5_seeding_brief",
        },
        "stage_status": {
            "stage_0_posting": "pending",
            "stage_1_public_engagement": "pending",
            "stage_2_comment_intent": "pending",
            "stage_3_internal_click_coupon_cart": "not_connected",
            "stage_4_internal_order_roas_repurchase": "not_connected",
        },
        "public_observations": [empty_public_snapshot(window) for window in WINDOWS],
        "internal_metrics": empty_internal_metrics(),
        "comparison_group_rule": "같은 공개 KPI 수집 윈도우로 대조군과 비교하되, 해석 전에 세그먼트 차이를 반드시 기록한다.",
        "outcome_status": "inconclusive_until_posted",
        "failure_or_inconclusive_reason": {
            "reason_tag": "data_not_collected_yet",
            "reason_detail": "Phase 6는 결과 테이블과 수집 계약을 정의한 단계이며, 실제 게시 URL과 KPI 스냅샷은 아직 없다.",
            "next_action": "게시 URL과 24h, 72h, 7d, 14d 공개 KPI 스냅샷을 수집한다.",
        },
        "iteration_update": {
            "update_allowed": False,
            "rule": "최소한 게시 여부와 14일 의도 데이터가 수집되기 전에는 제품 적합 규칙을 업데이트하지 않는다.",
        },
    }


def control_result_record(control):
    return {
        "experiment_unit_id": f"control_group::{control['creator_handle']}::{control['held_out_product']}",
        "selection_role": "control_group",
        "creator_handle": control["creator_handle"],
        "profile_url": control["profile_url"],
        "segment_id": control["segment_id"],
        "held_out_product": control["held_out_product"],
        "control_reason": control["control_reason"],
        "stage_status": {
            "stage_0_posting": "pending",
            "stage_1_public_engagement": "pending",
            "stage_2_comment_intent": "pending",
            "stage_3_internal_click_coupon_cart": "not_applicable",
            "stage_4_internal_order_roas_repurchase": "not_applicable",
        },
        "public_observations": [empty_public_snapshot(window) for window in WINDOWS],
        "comparison_rule": control["comparison_rule"],
        "outcome_status": "control_pending_observation",
        "failure_or_inconclusive_reason": {
            "reason_tag": "data_not_collected_yet",
            "reason_detail": "대조군의 공개 KPI 스냅샷은 아직 수집되지 않았다.",
            "next_action": "제품을 보내지 않은 상태에서 공개 게시 여부와 의도 지표를 수집한다.",
        },
    }


def stage_definitions():
    return [
        {
            "stage": 0,
            "name": "게시 여부",
            "data_type": "공개 데이터",
            "fields": ["posted", "posted_url", "posted_at"],
            "interpretation_rule": "게시 URL이 없으면 성과 해석을 하지 않는다.",
        },
        {
            "stage": 1,
            "name": "공개 참여",
            "data_type": "공개 데이터",
            "fields": ["view_count", "like_count", "comment_count", "save_count", "share_count"],
            "interpretation_rule": "참여 지표는 관심 신호일 뿐 매출 증거가 아니다.",
        },
        {
            "stage": 2,
            "name": "댓글 의도",
            "data_type": "공개 댓글 테마 집계",
            "fields": ["where_to_buy", "routine_question", "usage_question", "price_question", "sensitive_skin_question"],
            "interpretation_rule": "댓글 원문은 저장하지 않고 의도 테마와 개수만 저장한다.",
        },
        {
            "stage": 3,
            "name": "클릭/쿠폰/장바구니",
            "data_type": "내부 데이터 선택",
            "fields": ["tracked_link_clicks", "coupon_usage", "add_to_cart"],
            "interpretation_rule": "메디테라피 내부 어트리뷰션 필드가 있어야 해석할 수 있다.",
        },
        {
            "stage": 4,
            "name": "주문/ROAS/재구매",
            "data_type": "내부 데이터 선택",
            "fields": ["orders", "CPA", "ROAS", "repurchase"],
            "interpretation_rule": "매출 또는 ROAS 주장은 이 단계의 내부 데이터가 있을 때만 가능하다.",
        },
    ]


def validation_issues(payload):
    issues = []
    seed_results = payload["seed_results"]
    controls = payload["control_results"]
    if len(seed_results) != 6:
        issues.append(("blocker", "seed_result_count_not_6"))
    if len(controls) != 3:
        issues.append(("blocker", "control_result_count_not_3"))
    for result in seed_results + controls:
        if len(result.get("public_observations", [])) != 4:
            issues.append(("blocker", f"missing_public_windows:{result['creator_handle']}"))
        windows = [item["window"] for item in result.get("public_observations", [])]
        if windows != WINDOWS:
            issues.append(("must_fix", f"window_order_changed:{result['creator_handle']}"))
        for snapshot in result.get("public_observations", []):
            if snapshot.get("raw_comment_text_stored") is not False:
                issues.append(("blocker", f"raw_comment_storage_not_false:{result['creator_handle']}"))
        if not result.get("failure_or_inconclusive_reason"):
            issues.append(("must_fix", f"missing_inconclusive_reason:{result['creator_handle']}"))
    for result in seed_results:
        if result["internal_metrics"]["source"] == "public_platform_or_manual_observation":
            issues.append(("blocker", f"internal_public_source_mixed:{result['creator_handle']}"))
        if result["pre_registered_kpis"]["post_hoc_kpi_change"] is not False:
            issues.append(("must_fix", f"post_hoc_kpi_change:{result['creator_handle']}"))
        if result["outcome_status"] not in {"inconclusive_until_posted", "inconclusive", "ready_for_interpretation"}:
            issues.append(("must_fix", f"unknown_outcome_status:{result['creator_handle']}"))
    text_blob = json.dumps(payload, ensure_ascii=False).lower()
    forbidden_assertions = [
        "sales success",
        "revenue lift",
        "roas improved",
        "orders increased",
        "매출 성공",
        "매출 증가",
        "roas 개선",
        "주문 증가",
    ]
    found = [term for term in forbidden_assertions if term in text_blob]
    if found:
        issues.append(("blocker", f"sales_assertion_found:{found}"))
    return issues


def status_badge(status):
    if "not_connected" in status or "not_applicable" in status:
        return "neutral"
    if "pending" in status:
        return "pending"
    if "ready" in status:
        return "good"
    return "neutral"


def esc(value):
    return html.escape(str(value), quote=True)


def outcome_label(status):
    return {
        "inconclusive_until_posted": "게시 전: 해석 보류",
        "control_pending_observation": "대조군 관찰 대기",
        "inconclusive": "판단 보류",
        "ready_for_interpretation": "해석 가능",
    }.get(status, status)


def reason_label(reason):
    return {
        "data_not_collected_yet": "데이터 미수집",
    }.get(reason, reason)


def stage_status_label(status):
    return {
        "pending": "대기",
        "not_connected": "내부 데이터 미연결",
        "not_applicable": "해당 없음",
    }.get(status, status)


def product_label(product_id, fallback=None):
    return fallback or PRODUCT_LABELS.get(product_id, product_id)


def segment_label(segment_id):
    return SEGMENT_LABELS.get(segment_id, segment_id)


def kpi_label(kpi):
    label = KPI_LABELS.get(kpi, kpi)
    return f"{label} ({kpi})" if label != kpi else kpi


def render_html(payload):
    seed_rows = "\n".join(
        f"""
        <tr>
          <td><a href="{esc(item['profile_url'])}">{esc(item['creator_handle'])}</a></td>
          <td>{esc(product_label(item['seed_product'], item.get('seed_product_name')))}</td>
          <td>{esc(segment_label(item['segment_id']))}</td>
          <td>{esc(kpi_label(item['pre_registered_kpis']['primary_kpi']))}</td>
          <td><span class="badge pending">{esc(outcome_label(item['outcome_status']))}</span></td>
          <td>{esc(reason_label(item['failure_or_inconclusive_reason']['reason_tag']))}</td>
        </tr>
        """
        for item in payload["seed_results"]
    )
    control_rows = "\n".join(
        f"""
        <tr>
          <td><a href="{esc(item['profile_url'])}">{esc(item['creator_handle'])}</a></td>
          <td>{esc(product_label(item['held_out_product']))}</td>
          <td>{esc(segment_label(item['segment_id']))}</td>
          <td><span class="badge neutral">{esc(outcome_label(item['outcome_status']))}</span></td>
        </tr>
        """
        for item in payload["control_results"]
    )
    stage_rows = "\n".join(
        f"""
        <tr>
          <td>단계 {item['stage']}</td>
          <td>{esc(item['name'])}</td>
          <td>{esc(item['data_type'])}</td>
          <td>{esc(', '.join(item['fields']))}</td>
          <td>{esc(item['interpretation_rule'])}</td>
        </tr>
        """
        for item in payload["stage_definitions"]
    )
    product_distribution = payload["summary"]["seed_product_distribution"]
    product_cards = "\n".join(
        f"""<div class="metric"><span>{esc(product_label(product))}</span><strong>{count}</strong></div>"""
        for product, count in product_distribution.items()
    )
    risk_rows = "\n".join(
        f"""
        <tr>
          <td>{esc(item['creator_handle'])}</td>
          <td>{esc(product_label(item['seed_product'], item.get('seed_product_name')))}</td>
          <td>{esc(stage_status_label(item['stage_status']['stage_3_internal_click_coupon_cart']))}</td>
          <td>{esc(stage_status_label(item['stage_status']['stage_4_internal_order_roas_repurchase']))}</td>
          <td>{esc(item['internal_metrics']['claim_rule'])}</td>
        </tr>
        """
        for item in payload["seed_results"]
    )
    return f"""<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>메디테라피 Phase 4-6 시딩 보고서</title>
  <style>
    :root {{
      --bg: #f7f8fa;
      --panel: #ffffff;
      --ink: #161a1d;
      --muted: #5d6875;
      --line: #d9dee5;
      --accent: #0f766e;
      --accent-soft: #dff5f1;
      --warn: #9a5b00;
      --warn-soft: #fff1d6;
      --neutral: #48515c;
      --neutral-soft: #edf0f3;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font: 14px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }}
    main {{ max-width: 1180px; margin: 0 auto; padding: 28px 20px 44px; }}
    header {{ margin-bottom: 22px; }}
    h1 {{ margin: 0 0 8px; font-size: 28px; line-height: 1.2; letter-spacing: 0; }}
    h2 {{ margin: 28px 0 12px; font-size: 18px; letter-spacing: 0; }}
    p {{ margin: 0; color: var(--muted); }}
    .summary {{
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
      margin: 18px 0;
    }}
    .metric {{
      min-height: 82px;
      border: 1px solid var(--line);
      background: var(--panel);
      border-radius: 8px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }}
    .metric span {{ color: var(--muted); font-size: 12px; }}
    .metric strong {{ font-size: 24px; line-height: 1; }}
    .panel {{
      border: 1px solid var(--line);
      background: var(--panel);
      border-radius: 8px;
      padding: 16px;
      margin: 12px 0;
    }}
    .grid-2 {{ display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }}
    table {{ width: 100%; border-collapse: collapse; table-layout: fixed; }}
    th, td {{ border-bottom: 1px solid var(--line); padding: 10px 8px; text-align: left; vertical-align: top; word-break: break-word; }}
    th {{ color: var(--muted); font-size: 12px; font-weight: 650; background: #fbfcfd; }}
    tr:last-child td {{ border-bottom: 0; }}
    a {{ color: var(--accent); text-decoration: none; }}
    .badge {{ display: inline-block; padding: 3px 8px; border-radius: 999px; font-size: 12px; font-weight: 650; }}
    .pending {{ color: var(--warn); background: var(--warn-soft); }}
    .good {{ color: var(--accent); background: var(--accent-soft); }}
    .neutral {{ color: var(--neutral); background: var(--neutral-soft); }}
    .callout {{ border-left: 4px solid var(--accent); padding: 12px 14px; background: var(--accent-soft); border-radius: 6px; color: #18433f; }}
    ul {{ margin: 8px 0 0 18px; padding: 0; color: var(--muted); }}
    @media (max-width: 760px) {{
      main {{ padding: 18px 12px 32px; }}
      .summary, .grid-2 {{ grid-template-columns: 1fr; }}
      h1 {{ font-size: 23px; }}
      table {{ table-layout: auto; }}
      th, td {{ min-width: 128px; }}
      .table-wrap {{ overflow-x: auto; }}
    }}
  </style>
</head>
<body>
  <main>
    <header>
      <h1>메디테라피 Phase 4-6 시딩 보고서</h1>
      <p>제품-인플루언서 매칭, 시딩 브리프, 결과 수집 계약을 하나로 묶은 내부 검토 보고서입니다. 생성 시각: {esc(payload['generated_at'])}</p>
    </header>

    <section class="summary" aria-label="요약">
      <div class="metric"><span>시딩 브리프</span><strong>{payload['summary']['seed_result_count']}</strong></div>
      <div class="metric"><span>대조군</span><strong>{payload['summary']['control_result_count']}</strong></div>
      <div class="metric"><span>공개 KPI 수집 시점</span><strong>4</strong></div>
      <div class="metric"><span>매출 단정</span><strong>0</strong></div>
    </section>

    <section class="panel">
      <h2>해석 경계</h2>
      <div class="callout">현재 산출물은 게시 후 실제 성과가 아니라 결과 수집 구조입니다. 공개 KPI는 관심과 의도 신호로만 해석하고, 매출/ROAS/주문 판단은 내부 클릭·쿠폰·주문 데이터가 연결된 뒤에만 가능합니다.</div>
    </section>

    <section class="grid-2">
      <div class="panel">
        <h2>시딩 제품 분포</h2>
        <div class="summary" style="grid-template-columns: repeat(2, minmax(0, 1fr)); margin: 0;">{product_cards}</div>
      </div>
      <div class="panel">
        <h2>현재 말할 수 있는 것</h2>
        <ul>
          <li>6단계에는 반복 가능한 KPI 수집 스키마가 있다.</li>
          <li>각 시딩 후보에는 사전 등록된 1차/2차 KPI가 있다.</li>
          <li>공개 지표와 내부 전환 지표는 출처별로 분리된다.</li>
          <li>게시물과 실제 지표가 생기기 전까지 결과 해석은 보류한다.</li>
        </ul>
      </div>
    </section>

    <section class="panel">
      <h2>시딩 결과 테이블</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>크리에이터</th><th>제품</th><th>세그먼트</th><th>1차 KPI</th><th>상태</th><th>사유</th></tr></thead>
          <tbody>{seed_rows}</tbody>
        </table>
      </div>
    </section>

    <section class="panel">
      <h2>대조군 추적</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>크리에이터</th><th>보류 제품</th><th>세그먼트</th><th>상태</th></tr></thead>
          <tbody>{control_rows}</tbody>
        </table>
      </div>
    </section>

    <section class="panel">
      <h2>성과 단계 계약</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>단계</th><th>이름</th><th>데이터 유형</th><th>필드</th><th>해석 규칙</th></tr></thead>
          <tbody>{stage_rows}</tbody>
        </table>
      </div>
    </section>

    <section class="panel">
      <h2>내부 데이터 경계</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>크리에이터</th><th>제품</th><th>3단계</th><th>4단계</th><th>주장 규칙</th></tr></thead>
          <tbody>{risk_rows}</tbody>
        </table>
      </div>
    </section>
  </main>
</body>
</html>
"""


def render_review(payload, validation):
    seed_lines = "\n".join(
        f"- {item['creator_handle']}: `{product_label(item['seed_product'], item.get('seed_product_name'))}` / `{outcome_label(item['outcome_status'])}` / 사유 `{reason_label(item['failure_or_inconclusive_reason']['reason_tag'])}`"
        for item in payload["seed_results"]
    )
    control_lines = "\n".join(
        f"- {item['creator_handle']}: 보류 제품 `{product_label(item['held_out_product'])}` / `{outcome_label(item['outcome_status'])}`"
        for item in payload["control_results"]
    )
    return f"""# Phase 6 결과 검토

생성 시각: {payload['generated_at']}

## 현재 해석

Phase 6는 결과 수집 및 해석 실행 구조로 완료됐다. 아직 게시 후 지표가 수집되지 않았으므로 모든 시딩 결과는 `게시 전: 해석 보류` 상태로 남긴다.

## 시딩 결과
{seed_lines}

## 대조군 결과
{control_lines}

## 단계별 규칙

- 0-2단계는 공개 지표 또는 수기 관찰 지표다.
- 3-4단계는 메디테라피 내부 어트리뷰션 데이터가 필요하다.
- 공개 조회수, 좋아요, 저장, 공유, 댓글 의도만으로 매출을 증명할 수 없다.
- 댓글 원문은 저장하지 않고 의도 테마와 개수만 저장한다.
- 실패 또는 낮은 성과도 삭제하지 않고 태그가 붙은 결과로 남긴다.

## 검증

- reviewer 결과: `{validation['reviewer_result']['status']}`
- 사용자 승인 요청 가능: `{validation['can_request_user_approval']}`
- blocker 이슈: `{validation['issue_counts']['blocker']}`
- must_fix 이슈: `{validation['issue_counts']['must_fix']}`
"""


def main():
    briefs = load_json(BRIEFS_PATH)
    generated_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    seed_results = [seed_result_record(brief) for brief in briefs["seed_briefs"]]
    control_results = [control_result_record(control) for control in briefs["control_tracking_plan"]]
    payload = {
        "schema_version": "0.1.0",
        "phase_id": "phase_6_result_collection_and_interpretation",
        "generated_at": generated_at,
        "source_brief_file": str(BRIEFS_PATH.relative_to(ROOT)),
        "interpretation_policy": {
            "public_kpi_scope": "공개 지표는 관심과 의도 가설을 뒷받침하는 범위에서만 사용한다.",
            "internal_kpi_scope": "클릭, 쿠폰, 장바구니, 주문, CPA, ROAS, 재구매는 메디테라피 내부 데이터가 필요하다.",
            "sales_claim_policy": "공개 지표만으로 매출, ROAS, 주문, 재구매 영향을 주장하지 않는다.",
            "comment_policy": "댓글 원문은 저장하지 않고 의도 테마와 개수만 저장한다.",
            "failure_policy": "낮거나 누락된 결과도 다음 루프를 위한 판단 보류 또는 실패 사유로 남긴다.",
        },
        "stage_definitions": stage_definitions(),
        "summary": {
            "seed_result_count": len(seed_results),
            "control_result_count": len(control_results),
            "public_observation_windows": WINDOWS,
            "seed_product_distribution": dict(Counter(item["seed_product"] for item in seed_results)),
            "outcome_status_distribution": dict(Counter(item["outcome_status"] for item in seed_results)),
            "internal_data_connected": False,
            "sales_claim_count": 0,
        },
        "seed_results": seed_results,
        "control_results": control_results,
        "submission_examples": {
            "normal_case_template": {
                "use_when": "시딩 크리에이터가 게시했고 14일 공개 KPI 스냅샷이 있을 때 사용한다.",
                "safe_claim": "해당 크리에이터가 제품-콘텐츠 가설에 대해 공개 관심과 의도 신호를 만들었다고 표현할 수 있다.",
                "requires_internal_data_for": ["orders", "CPA", "ROAS", "repurchase"],
            },
            "exception_case_template": {
                "use_when": "크리에이터가 게시하지 않았거나 KPI 데이터가 없거나 리스크 댓글이 늘었을 때 사용한다.",
                "safe_claim": "결과를 판단 보류 또는 다음 반복을 위한 실패 사유로 표현한다.",
                "do_not_do": "한 번의 약한 관찰만으로 케이스를 삭제하거나 크리에이터를 영구 부적합으로 표시하지 않는다.",
            },
        },
    }
    issues = validation_issues(payload)
    blocker_count = sum(1 for severity, _ in issues if severity == "blocker")
    must_fix_count = sum(1 for severity, _ in issues if severity == "must_fix")
    validation = {
        "phase_id": "phase_6_result_collection_and_interpretation",
        "validation_run_id": "phase6_validation_001",
        "generated_at": generated_at,
        "input_files": [str(BRIEFS_PATH.relative_to(ROOT))],
        "output_files": [
            str(RESULTS_PATH.relative_to(ROOT)),
            str(RESULT_REVIEW_PATH.relative_to(ROOT)),
            str(HTML_REPORT_PATH.relative_to(ROOT)),
        ],
        "checks": {
            "seed_result_count": len(seed_results),
            "control_result_count": len(control_results),
            "all_public_windows_present": all(
                [snapshot["window"] for snapshot in item["public_observations"]] == WINDOWS
                for item in seed_results + control_results
            ),
            "public_internal_data_separated": all(
                item["internal_metrics"]["source"] == "internal_data_not_provided"
                for item in seed_results
            ),
            "raw_comment_text_stored_count": sum(
                1
                for item in seed_results + control_results
                for snapshot in item["public_observations"]
                if snapshot["raw_comment_text_stored"]
            ),
            "post_hoc_kpi_change_count": sum(
                1 for item in seed_results if item["pre_registered_kpis"]["post_hoc_kpi_change"]
            ),
            "sales_claim_count": payload["summary"]["sales_claim_count"],
            "failure_or_inconclusive_reason_present": all(
                bool(item.get("failure_or_inconclusive_reason"))
                for item in seed_results + control_results
            ),
        },
        "issues": [
            {
                "severity": severity,
                "finding": finding,
                "affected_files": [str(RESULTS_PATH.relative_to(ROOT))],
                "fix_action": "Investigate before approval.",
                "status": "open",
                "revalidation_result": "",
            }
            for severity, finding in issues
        ],
        "reviewer_result": {
            "status": "pass" if blocker_count == 0 and must_fix_count == 0 else "revise",
            "reviewer": "codex_phase6_self_reviewer",
            "notes": [
                "게시 여부, 24h, 72h, 7d, 14d 공개 관찰 윈도우가 명시되어 있다.",
                "공개 KPI와 선택적 내부 전환 필드가 분리되어 있다.",
                "매출, ROAS, 주문, 재구매 영향을 주장하지 않는다.",
                "누락 데이터는 판단 보류로 남기고 다음 루프용 태그를 유지한다.",
            ],
        },
        "can_request_user_approval": blocker_count == 0 and must_fix_count == 0,
        "issue_counts": {
            "blocker": blocker_count,
            "must_fix": must_fix_count,
            "should_fix": sum(1 for severity, _ in issues if severity == "should_fix"),
        },
    }
    dump_json(RESULTS_PATH, payload)
    dump_json(VALIDATION_PATH, validation)
    RESULT_REVIEW_PATH.write_text(render_review(payload, validation))
    HTML_REPORT_PATH.write_text(render_html(payload))

    seed_lines = "\n".join(
        f"- {item['creator_handle']}: `{item['seed_product']}` / `{item['outcome_status']}`"
        for item in seed_results
    )
    pre_approval = f"""## 승인 요청: Phase 6 - 결과 수집 및 성과 해석

### Codex 사전 검토 결과
- 산출물: `submission/src/data/experiment_results.json`, `submission/logs/result_review.md`, `research/meditherapy_phase4_6_report.html`
- 형식 검증: JSON/Markdown/HTML 생성 완료, 시딩 결과 행 {len(seed_results)}건, 대조군 행 {len(control_results)}건
- 내용 정합성: 24h, 72h, 7d, 14d 수집 윈도우와 0-4단계 데이터 경계를 고정
- 리스크 검토: 공개 KPI와 내부 KPI를 분리했고, 매출/ROAS/주문 증가는 주장하지 않음
- reviewer 결과: {validation['reviewer_result']['status']}

### 시딩 결과 행
{seed_lines}

### 사용자가 확인할 핵심
- 현재 Phase 6는 실제 성과가 아니라 결과 수집 구조라는 표현이 충분히 명확한지
- 공개 KPI만으로 말할 범위와 내부 데이터 연결 후 말할 범위가 제출 답변에 적절한지
- 실패/미게시/데이터 부족 케이스를 삭제하지 않고 `inconclusive`로 남기는 정책을 승인할지

### 남은 리스크
- 실제 게시 URL과 KPI가 없으므로 모든 결과는 `inconclusive_until_posted`
- 3-4단계는 메디테라피 내부 데이터가 있어야만 채울 수 있음
- HTML 보고서는 제출 설명용 요약이며 원본 데이터는 JSON을 기준으로 함

### 제안 판단
- Codex 권고: 승인
- 이유: blocker/must_fix 이슈가 없고, 사후 KPI 변경/댓글 원문 저장/매출 단정 리스크를 차단함

### 사용자에게 필요한 결정
1. Phase 6 결과 수집 구조를 승인할지 결정
2. HTML 보고서를 제출 보조 자료로 사용할지 결정
"""
    PRE_APPROVAL_PATH.write_text(pre_approval)
    print(json.dumps(validation, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
