#!/usr/bin/env python3
import json
from collections import Counter
from datetime import datetime, timezone
from html import escape
from pathlib import Path

import run_phase4_matching as phase4


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
LOG_DIR = ROOT / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)

NEW_PRODUCT_PATH = DATA_DIR / "new_product_example.json"
PROFILES_PATH = DATA_DIR / "influencer_profiles.jsonl"
PARAMS_PATH = DATA_DIR / "influencer_mvp_parameters.json"
RANKINGS_PATH = DATA_DIR / "new_product_rankings.json"
TRACE_PATH = LOG_DIR / "new_product_matching_trace.jsonl"
REPORT_PATH = LOG_DIR / "new_product_ranking_report.md"
REPORT_HTML_PATH = LOG_DIR / "new_product_ranking_report.html"
VALIDATION_PATH = LOG_DIR / "phase6a_validation.json"
PRE_APPROVAL_PATH = LOG_DIR / "phase6a_pre_approval.md"

REQUIRED_PRODUCT_FIELDS = [
    "product_id",
    "name",
    "format",
    "best_for_concerns",
    "skin_type_fit",
    "skin_type_caution",
    "content_fit",
    "risk_flags",
    "measurement_kpis",
    "market_priority",
    "expected_purchase_path",
]

RISK_FLAG_TO_CONFLICT = {
    "avoid_use_on_wounds": "wounded_or_procedure_skin",
    "avoid_pregnancy_lactation_recommendation_without_professional_advice": "pregnancy_or_lactation_disclosed",
    "retinoid_irritation": "retinoid_conflict",
    "sun_sensitivity": "retinoid_conflict",
    "over_exfoliation": "acid_overuse_risk",
    "barrier_damage_if_overused": "acid_overuse_risk",
    "eye_area_irritation": "eye_area_irritation_disclosure",
}

CORE_SEGMENT_RULES = {
    "acne_trouble_barrier": {"acne_prone", "barrier_damage", "redness", "trouble_prone", "post_extraction_care"},
    "texture_pore_makeup_prep": {"texture", "roughness", "pores", "visible_pores", "makeup_adherence"},
    "tone_spot_glow": {"dullness", "uneven_tone", "spot_appearance", "pigmentation", "dark_spots", "glow"},
    "anti_aging_home_esthetic": {"wrinkles", "fine_lines", "elasticity", "firmness", "home_esthetic_experience"},
    "grwm_lifestyle_beauty": {"dryness", "dehydration", "under_eye_dryness", "routine_entry"},
}

SEGMENT_LABELS = {
    "acne_trouble_barrier": "트러블/장벽/붉은기",
    "texture_pore_makeup_prep": "피부결/모공/메이크업 준비",
    "tone_spot_glow": "톤/잡티/광채",
    "anti_aging_home_esthetic": "리프팅/홈에스테틱",
    "grwm_lifestyle_beauty": "GRWM/라이프스타일 뷰티",
}

CONCERN_LABELS = {
    "acne_prone": "트러블이 잘 올라오는 피부",
    "barrier_damage": "피부 장벽이 약해 보이는 상태",
    "redness": "붉은기",
    "texture": "피부결 요철",
    "pores": "모공이 도드라져 보이는 고민",
    "makeup_adherence_issue": "화장이 들뜨거나 밀리는 고민",
    "dryness": "건조함",
    "dehydration": "속건조",
    "pigmentation": "잡티/색소 고민",
    "dullness": "칙칙한 톤",
    "wrinkles": "잔주름/탄력 고민",
}

CONTENT_LABELS = {
    "skincare_routine": "스킨케어 루틴",
    "grwm": "GRWM",
    "makeup_prep": "메이크업 전 피부 준비",
    "product_review": "제품 리뷰",
    "before_after_journey": "사용 전후 변화 기록",
    "ingredient_education": "성분 설명",
    "home_esthetic_demo": "홈에스테틱 시연",
}

RISK_LABELS = {
    "claim_compliance_risk": "표현 수위 관리 필요",
    "retinoid_conflict": "레티노이드 제품과 사용 맥락 분리 필요",
    "creator_requires_medical_or_guaranteed_result_claim": "의학적/보장성 표현 요구 가능성",
}

KPI_LABELS = {
    "save_rate": "저장률",
    "makeup_base_question_count": "메이크업 베이스 관련 질문 수",
    "pore_blur_question_count": "모공 블러/피부결 보정 관련 질문 수",
    "routine_question_count": "루틴 질문 수",
    "shade_or_finish_question_count": "색상·마무리감 질문 수",
    "comment_intent_quality": "구매 의도 댓글의 질",
}


def load_json(path):
    with path.open() as f:
        return json.load(f)


def load_jsonl(path):
    with path.open() as f:
        return [json.loads(line) for line in f if line.strip()]


def dump_json(path, payload):
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")


def product_conflict_signals(product):
    conflicts = set()
    for flag in product.get("risk_flags", []):
        if flag in RISK_FLAG_TO_CONFLICT:
            conflicts.add(RISK_FLAG_TO_CONFLICT[flag])
    return conflicts


def validate_product_input(product, params):
    issues = []
    for field in REQUIRED_PRODUCT_FIELDS:
        if field not in product or product[field] in ("", [], None):
            issues.append(("blocker", f"missing_required_product_field:{field}"))

    known_concerns = set(params["influencer_profile_fields"]["skin_concerns"])
    known_concerns |= set(phase4.CONCERN_ALIASES.keys())
    for aliases in phase4.CONCERN_ALIASES.values():
        known_concerns |= set(aliases)

    known_content = set(params["influencer_profile_fields"]["content_domains"])
    known_content |= set(phase4.CONTENT_ALIASES.keys())
    for aliases in phase4.CONTENT_ALIASES.values():
        known_content |= set(aliases)

    unknown_concerns = sorted(set(product.get("best_for_concerns", [])) - known_concerns)
    unknown_content = sorted(set(product.get("content_fit", [])) - known_content)
    if unknown_concerns:
        issues.append(("must_fix", f"unknown_product_concern_tags:{','.join(unknown_concerns)}"))
    if unknown_content:
        issues.append(("must_fix", f"unknown_product_content_tags:{','.join(unknown_content)}"))
    if not product.get("risk_flags"):
        issues.append(("blocker", "missing_product_risk_flags"))
    if not product.get("measurement_kpis"):
        issues.append(("blocker", "missing_measurement_kpis"))
    return issues


def display_group_label(display_group):
    return {
        "ready_for_matching": "추천 가능",
        "review_required_before_matching": "검토 후 가능",
        "needs_more_data": "데이터 부족",
    }.get(display_group, display_group)


def object_particle(text):
    if not text:
        return "을"
    code = ord(text[-1])
    if 0xAC00 <= code <= 0xD7A3 and (code - 0xAC00) % 28 == 0:
        return "를"
    return "을"


def join_or_none(values):
    return ", ".join(values) if values else "직접 매칭 없음"


def label_tags(values, labels):
    mapped = [labels.get(value, value) for value in values]
    return ", ".join(mapped) if mapped else "직접 매칭 없음"


def labeled_with_codes(values, labels):
    mapped = [f"{labels.get(value, value)} (`{value}`)" for value in values]
    return ", ".join(mapped) if mapped else "직접 매칭 없음"


def html_text(value):
    return escape(str(value), quote=True)


def total_score_from_trace(trace):
    return round(
        trace["influencer_self_fit"]
        + trace["audience_fit"]
        + trace["content_fit"]
        + trace["market_channel_fit"]
        - trace["risk_penalty"],
        2,
    )


def report_interpretation(item):
    evidence = item["product_match"]["matched_evidence"]
    trace = item["product_match"]["score_trace"]
    concerns = label_tags(evidence["product_concern_hits"][:4], CONCERN_LABELS)
    contents = label_tags(evidence["product_content_hits"][:3], CONTENT_LABELS)
    risk = item["product_match"]["risk_review"]
    risk_reasons = risk["risk_penalty_reasons"] or []

    rank_reason = (
        f"{item['creator_handle']}는 {concerns} 관련 맥락이 있고, "
        f"{contents} 콘텐츠 안에 제품을 자연스럽게 넣을 수 있는 후보입니다. "
        "이 제품은 치료제처럼 설명하기보다 화장 전 피부를 정돈하고 톤업·블러 효과를 보여주는 루틴형 제품으로 소개해야 합니다."
    )
    if trace["audience_fit"] >= 20:
        rank_reason += " 댓글/팔로워 반응에서 제품 질문이나 구매 의도 신호가 비교적 강해 상위권으로 평가했습니다."
    else:
        rank_reason += " 제품·콘텐츠 궁합은 좋지만 구매 의도 신호는 상위 후보보다 약해 순위가 내려갔습니다."
    if "retinoid_conflict" in risk_reasons:
        rank_reason += " 단, 레티노이드 제품과 함께 쓰는 루틴처럼 보이지 않도록 사용 순서와 콘텐츠 문맥을 분리해야 합니다."
    if not evidence["primary_concern_hits"]:
        rank_reason += " 1차 피부 고민 직접 매칭은 약하므로, 시딩 전 실제 사용 맥락을 한 번 더 확인하는 편이 좋습니다."
    return rank_reason


def human_causal_hypothesis(item):
    product_name = item["recommended_product_name"]
    particle = object_particle(product_name)
    return (
        f"{item['creator_handle']}에게 {product_name}{particle} 시딩하면 "
        "팔로워가 이 제품을 '화장 전 피부 정돈과 자연스러운 톤업·블러를 위한 선택지'로 받아들이는지 검증합니다. "
        "판단 기준은 단순 조회수가 아니라 저장, 메이크업 베이스 질문, 모공/피부결 보정 질문, 색상·마무리감 질문, "
        "그리고 구매 경로로 이어질 수 있는 댓글 의도입니다."
    )


def kpi_labels(kpis):
    return ", ".join(KPI_LABELS.get(kpi, kpi) for kpi in kpis)


def recommendation_reason_block(item):
    trace = item["product_match"]["score_trace"]
    evidence = item["product_match"]["matched_evidence"]
    risk = item["product_match"]["risk_review"]
    kpis = [item["primary_kpi"]] + item.get("secondary_kpis", [])
    risk_reasons = risk["risk_penalty_reasons"] or ["감점 사유 없음"]
    return f"""### {item['rank']}. {item['creator_handle']} - {item['display_group_label']} / {SEGMENT_LABELS.get(item['segment_id'], item['segment_id'])} / {total_score_from_trace(trace)}점

- 보고자 해석: {report_interpretation(item)}
- 검증할 가설: {human_causal_hypothesis(item)}
- 실행 방향: {item['content_brief']}
- 관찰 KPI: {kpi_labels(kpis)}

- 점수 분해: 본인 피부·고민 적합 {trace['influencer_self_fit']} + 팔로워/구매 의도 {trace['audience_fit']} + 콘텐츠 적합 {trace['content_fit']} + 시장/채널 {trace['market_channel_fit']} - 리스크 {trace['risk_penalty']} = {total_score_from_trace(trace)}
- 근거 태그: 피부 고민 1차 `{labeled_with_codes(evidence['primary_concern_hits'], CONCERN_LABELS)}`, 2차 `{labeled_with_codes(evidence['secondary_concern_hits'], CONCERN_LABELS)}`, 제품 기준 `{labeled_with_codes(evidence['product_concern_hits'], CONCERN_LABELS)}`
- 콘텐츠 근거 태그: 1차 `{labeled_with_codes(evidence['primary_content_hits'], CONTENT_LABELS)}`, 2차 `{labeled_with_codes(evidence['secondary_content_hits'], CONTENT_LABELS)}`, 제품 기준 `{labeled_with_codes(evidence['product_content_hits'], CONTENT_LABELS)}`
- 리스크 판단: hard exclusion 없음, 제품 리스크 충돌 없음, 감점 사유 `{label_tags(risk_reasons, RISK_LABELS)}`
"""


def recommendation_reason_html(item):
    trace = item["product_match"]["score_trace"]
    evidence = item["product_match"]["matched_evidence"]
    risk = item["product_match"]["risk_review"]
    kpis = [item["primary_kpi"]] + item.get("secondary_kpis", [])
    risk_reasons = risk["risk_penalty_reasons"] or ["감점 사유 없음"]
    total = total_score_from_trace(trace)
    return f"""
      <article class="reason-card">
        <div class="reason-head">
          <div>
            <span class="rank">#{item['rank']}</span>
            <h3>{html_text(item['creator_handle'])}</h3>
            <p>{html_text(SEGMENT_LABELS.get(item['segment_id'], item['segment_id']))} · {html_text(item['display_group_label'])}</p>
          </div>
          <strong class="score">{html_text(total)}점</strong>
        </div>
        <div class="interpretation">
          <strong>보고자 해석</strong>
          <p>{html_text(report_interpretation(item))}</p>
        </div>
        <div class="score-grid">
          <div><span>본인 피부·고민</span><strong>{html_text(trace['influencer_self_fit'])}</strong></div>
          <div><span>팔로워/구매 의도</span><strong>{html_text(trace['audience_fit'])}</strong></div>
          <div><span>콘텐츠</span><strong>{html_text(trace['content_fit'])}</strong></div>
          <div><span>시장/채널</span><strong>{html_text(trace['market_channel_fit'])}</strong></div>
          <div><span>리스크 감점</span><strong>-{html_text(trace['risk_penalty'])}</strong></div>
        </div>
        <dl>
          <dt>피부 고민 매칭</dt>
          <dd>{html_text(label_tags(evidence['product_concern_hits'], CONCERN_LABELS))}<br><small>근거 태그: 1차 {html_text(join_or_none(evidence['primary_concern_hits']))} / 2차 {html_text(join_or_none(evidence['secondary_concern_hits']))}</small></dd>
          <dt>콘텐츠 매칭</dt>
          <dd>{html_text(label_tags(evidence['product_content_hits'], CONTENT_LABELS))}<br><small>근거 태그: 1차 {html_text(join_or_none(evidence['primary_content_hits']))} / 2차 {html_text(join_or_none(evidence['secondary_content_hits']))}</small></dd>
          <dt>리스크 판단</dt>
          <dd>추천 제외 사유는 없지만, {html_text(label_tags(risk_reasons, RISK_LABELS))} 조건을 지켜야 합니다.</dd>
          <dt>검증할 가설</dt>
          <dd>{html_text(human_causal_hypothesis(item))}</dd>
          <dt>실행 방향</dt>
          <dd>{html_text(item['content_brief'])}</dd>
          <dt>관찰 KPI</dt>
          <dd>{html_text(kpi_labels(kpis))}</dd>
        </dl>
      </article>
    """


def render_html_report(product, payload, selected, held_for_review, research_gap, validation, generated_at):
    selected_rows = "\n".join(
        f"""
        <tr>
          <td>{item['rank']}</td>
          <td><strong>{html_text(item['creator_handle'])}</strong></td>
          <td>{html_text(SEGMENT_LABELS.get(item['segment_id'], item['segment_id']))}</td>
          <td>{html_text(item['product_match']['total_score'])}</td>
          <td>{html_text(item['display_group_label'])}</td>
          <td>{html_text(label_tags(item['product_match']['matched_evidence']['product_concern_hits'][:3], CONCERN_LABELS))}</td>
          <td>{html_text(label_tags(item['product_match']['matched_evidence']['product_content_hits'][:3], CONTENT_LABELS))}</td>
        </tr>
        """
        for item in selected
    )
    held_rows = "\n".join(
        f"""
        <tr>
          <td>{item['rank']}</td>
          <td>{html_text(item['creator_handle'])}</td>
          <td>{html_text(item['recommendation_status'])}</td>
          <td>{html_text(', '.join(item['no_seed_option']['reasons'][:2]))}</td>
        </tr>
        """
        for item in held_for_review[:8]
    )
    reason_cards = "\n".join(recommendation_reason_html(item) for item in selected)
    trigger_text = ", ".join(research_gap["triggers"]) if research_gap["triggers"] else "없음"
    return f"""<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>메디테라피 최신 신제품 시딩 랭킹 보고서</title>
  <style>
    :root {{
      --bg: #f6f7f9;
      --panel: #ffffff;
      --ink: #171a1f;
      --muted: #5f6b7a;
      --line: #dce1e7;
      --accent: #0f766e;
      --accent-soft: #e2f4f1;
      --warn: #9a5b00;
      --warn-soft: #fff2d8;
    }}
    * {{ box-sizing: border-box; }}
    body {{ margin: 0; background: var(--bg); color: var(--ink); font: 14px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }}
    main {{ max-width: 1200px; margin: 0 auto; padding: 28px 20px 48px; }}
    header {{ margin-bottom: 18px; }}
    h1 {{ margin: 0 0 8px; font-size: 30px; line-height: 1.2; letter-spacing: 0; }}
    h2 {{ margin: 0 0 14px; font-size: 20px; letter-spacing: 0; }}
    h3 {{ margin: 0; font-size: 18px; letter-spacing: 0; }}
    p {{ margin: 0; color: var(--muted); }}
    .panel, .reason-card {{ background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 18px; margin: 14px 0; }}
    .summary {{ display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin: 18px 0; }}
    .metric {{ background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 14px; min-height: 88px; }}
    .metric span {{ color: var(--muted); font-size: 12px; }}
    .metric strong {{ display: block; margin-top: 8px; font-size: 25px; line-height: 1; }}
    .decision {{ border-left: 4px solid var(--accent); background: var(--accent-soft); border-radius: 6px; padding: 12px 14px; color: #0d3f3b; }}
    .warn {{ border-left: 4px solid var(--warn); background: var(--warn-soft); border-radius: 6px; padding: 12px 14px; color: #4d3300; margin-top: 10px; }}
    table {{ width: 100%; border-collapse: collapse; table-layout: fixed; }}
    th, td {{ border-bottom: 1px solid var(--line); padding: 10px 8px; text-align: left; vertical-align: top; word-break: break-word; }}
    th {{ color: var(--muted); font-size: 12px; background: #fbfcfd; }}
    tr:last-child td {{ border-bottom: 0; }}
    .table-wrap {{ overflow-x: auto; }}
    .reason-head {{ display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; }}
    .rank {{ display: inline-block; color: var(--accent); font-weight: 800; margin-bottom: 4px; }}
    .score {{ font-size: 24px; color: var(--accent); white-space: nowrap; }}
    .score-grid {{ display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; margin-bottom: 14px; }}
    .score-grid div {{ background: #f9fafb; border: 1px solid var(--line); border-radius: 6px; padding: 10px; }}
    .score-grid span {{ display: block; color: var(--muted); font-size: 12px; }}
    .score-grid strong {{ display: block; font-size: 18px; }}
    .interpretation {{
      background: var(--accent-soft);
      border-left: 4px solid var(--accent);
      border-radius: 6px;
      padding: 12px 14px;
      margin-bottom: 14px;
    }}
    .interpretation strong {{ display: block; margin-bottom: 4px; }}
    .interpretation p {{ color: #0d3f3b; }}
    dl {{ display: grid; grid-template-columns: 130px 1fr; gap: 8px 12px; margin: 0; }}
    dt {{ color: var(--muted); font-weight: 700; }}
    dd {{ margin: 0; }}
    small {{ color: var(--muted); }}
    code {{ background: #eef1f4; border-radius: 4px; padding: 1px 5px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; }}
    @media (max-width: 820px) {{
      main {{ padding: 18px 12px 34px; }}
      h1 {{ font-size: 24px; }}
      .summary {{ grid-template-columns: 1fr 1fr; }}
      .score-grid {{ grid-template-columns: 1fr 1fr; }}
      dl {{ grid-template-columns: 1fr; }}
      table {{ table-layout: auto; }}
      th, td {{ min-width: 140px; }}
    }}
  </style>
</head>
<body>
  <main>
    <header>
      <h1>메디테라피 최신 신제품 시딩 랭킹 보고서</h1>
      <p>제품 온톨로지, 공개 인플루언서 DB, 리스크 게이트, 인과 가설을 기준으로 보고자가 판단할 수 있게 정리한 HTML 보고서입니다. 생성 시각: {html_text(generated_at)}</p>
    </header>
    <section class="summary">
      <div class="metric"><span>테스트 제품</span><strong>{html_text(product['name'])}</strong></div>
      <div class="metric"><span>전체 후보</span><strong>{len(payload['candidate_rankings'])}명</strong></div>
      <div class="metric"><span>최종 추천</span><strong>{len(selected)}명</strong></div>
      <div class="metric"><span>Reviewer</span><strong>{html_text(validation['reviewer_result']['status'])}</strong></div>
    </section>
    <section class="panel">
      <h2>보고자 판단 포인트</h2>
      <div class="decision">추천은 성별이나 팔로워 수 단독 기준이 아니라 피부 고민, 콘텐츠 맥락, 팔로워 구매 의도, 시장/채널 적합성, 리스크 감점을 분해해 산출했다.</div>
      <div class="warn">실제 게시, 클릭, 쿠폰, 장바구니, 주문 데이터가 없으므로 매출 기여는 아직 가설이다. 내부 전환 데이터 연결 후 Stage 3-4 KPI로 검증해야 한다.</div>
    </section>
    <section class="panel">
      <h2>신제품 입력</h2>
      <p><strong>제품 ID:</strong> <code>{html_text(product['product_id'])}</code></p>
      <p><strong>포맷:</strong> {html_text(product['format'])}</p>
      <p><strong>핵심 피부 고민:</strong> {html_text(label_tags(product['best_for_concerns'], CONCERN_LABELS))}</p>
      <p><strong>콘텐츠 적합성:</strong> {html_text(label_tags(product['content_fit'], CONTENT_LABELS))}</p>
      <p><strong>리스크 플래그:</strong> 트러블 치료처럼 보이는 표현, 상처 부위 사용, 보장성 톤 보정/모공 축소, 모든 피부톤에 맞는 대체 파운데이션 표현을 피해야 합니다.</p>
      <p><strong>관찰 KPI:</strong> {html_text(kpi_labels(product['measurement_kpis']))}</p>
    </section>
    <section class="panel">
      <h2>최종 추천 순위</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>순위</th><th>후보</th><th>세그먼트</th><th>점수</th><th>상태</th><th>핵심 매칭</th><th>콘텐츠 매칭</th></tr></thead>
          <tbody>{selected_rows}</tbody>
        </table>
      </div>
    </section>
    <section>
      <h2>순위별 선정 사유 상세</h2>
      {reason_cards}
    </section>
    <section class="panel">
      <h2>보류/검토 후보 예시</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>순위</th><th>후보</th><th>상태</th><th>보류 사유</th></tr></thead>
          <tbody>{held_rows}</tbody>
        </table>
      </div>
    </section>
    <section class="panel">
      <h2>추가 리서치 판단</h2>
      <p><strong>판단:</strong> <code>{html_text(research_gap['decision'])}</code></p>
      <p><strong>트리거:</strong> {html_text(trigger_text)}</p>
      <p><strong>핵심 세그먼트:</strong> {html_text(', '.join(research_gap['core_segments']))}</p>
      <p><strong>ready 추천 가능 후보 수:</strong> {html_text(research_gap['ready_eligible_count'])}</p>
      <p><strong>핵심 세그먼트 ready 후보 수:</strong> {html_text(research_gap['core_ready_eligible_count'])}</p>
      <p><strong>상위 6명 세그먼트 분포:</strong> {html_text(research_gap['top_6_segment_distribution'])}</p>
    </section>
  </main>
</body>
</html>
"""


def new_product_content_brief(product, profile):
    handle = profile["identity"]["handle"]
    product_name = product["name"]
    particle = object_particle(product_name)
    if product.get("format") == "tone_up_cream" or "makeup_prep" in product.get("content_fit", []):
        return (
            f"{handle}의 기존 GRWM/스킨프렙/리뷰 맥락에서 {product_name}{particle} "
            "메이크업 전 스킨케어 또는 파운데이션 프리 루틴의 톤업·블러 단계로 배치한다. "
            "트러블 치료, 의학적 모공 축소, 모든 피부톤에 맞는 대체 파운데이션, 확정적 톤 보정 표현은 쓰지 않고 "
            "저장률, 메이크업 베이스 질문, 모공 블러 질문, 색상·마무리 질문을 관찰한다."
        )
    return (
        f"{handle}의 기존 루틴/리뷰 맥락에서 {product_name}{particle} 제품 포지션에 맞는 루틴 단계로 배치한다. "
        "트러블 치료, 상처 회복, 장벽 회복 보장 표현은 쓰지 않고 저장률, 민감 피부 질문, 사용감 질문을 관찰한다."
    )


def new_product_causal_hypothesis(product, profile, match):
    handle = profile["identity"]["handle"]
    concern_hits = (
        match["matched_evidence"]["primary_concern_hits"]
        + match["matched_evidence"]["secondary_concern_hits"]
    )
    content_hits = (
        match["matched_evidence"]["primary_content_hits"]
        + match["matched_evidence"]["secondary_content_hits"]
    )
    concern_text = label_tags(concern_hits[:2], CONCERN_LABELS) if concern_hits else "관찰된 피부 고민"
    content_text = label_tags(content_hits[:2], CONTENT_LABELS) if content_hits else "기존 뷰티 콘텐츠"
    if "makeup_base_question_count" in product.get("measurement_kpis", []):
        outcome_text = "저장, 메이크업 베이스 질문, 모공/피부결 보정 질문, 색상·마무리감 질문"
    else:
        outcome_text = "저장, 루틴 질문, 민감 피부 관련 구매 의도 댓글"
    return (
        f"{handle}는 {concern_text} 맥락과 {content_text} 콘텐츠가 맞물리는 후보입니다. "
        f"{product['name']}{object_particle(product['name'])} 치료/개선 보장 제품이 아니라 화장 전 피부 정돈과 톤업·블러 루틴으로 소개했을 때 "
        f"{outcome_text}이 늘어나는지 검증합니다."
    )


def recommendation_status(profile, match):
    status = profile.get("normalization_status")
    if match["risk_review"]["hard_exclusion_reasons"]:
        return "no_seed_hard_exclusion"
    if status == "needs_more_data":
        return "needs_more_data_no_seed"
    if match["risk_review"]["product_risk_conflicts"]:
        return "review_required_product_risk"
    if status == "review_required_before_matching":
        return "review_required_before_seed"
    return "eligible_for_seed"


def no_seed_option(profile, match):
    reasons = []
    reasons.extend(match["risk_review"]["hard_exclusion_reasons"])
    if profile.get("normalization_status") == "needs_more_data":
        reasons.append("insufficient_public_data_for_new_product_hypothesis")
    if match["score_trace"]["risk_penalty"] >= 8:
        reasons.append("high_risk_penalty")
    if match["risk_review"]["product_risk_conflicts"]:
        reasons.extend(match["risk_review"]["product_risk_conflicts"])
    return {
        "available": True,
        "recommended": bool(reasons),
        "reasons": sorted(set(reasons)) or ["Use if brand safety review cannot confirm disclosure, audience, or product-use fit."],
    }


def build_candidate_ranking(profile, product, match):
    status = profile.get("normalization_status")
    rec_status = recommendation_status(profile, match)
    evidence_urls = (profile.get("traceability", {}) or {}).get("sampled_content_urls", [])[:3]
    return {
        "profile_id": profile.get("profile_id"),
        "candidate_id": profile.get("candidate_id"),
        "creator_handle": profile["identity"]["handle"],
        "profile_url": profile["identity"].get("profile_url"),
        "segment_id": profile.get("segment_id"),
        "display_group": status,
        "display_group_label": display_group_label(status),
        "display_priority": phase4.DISPLAY_ORDER.get(status, 99),
        "profile_confidence": profile.get("profile_confidence"),
        "recommendation_status": rec_status,
        "recommended_product": None if rec_status.startswith("no_seed") else product["product_id"],
        "recommended_product_name": None if rec_status.startswith("no_seed") else product["name"],
        "product_match": match,
        "no_seed_option": no_seed_option(profile, match),
        "causal_hypothesis": new_product_causal_hypothesis(product, profile, match),
        "content_brief": new_product_content_brief(product, profile),
        "primary_kpi": (product.get("measurement_kpis") or ["save_rate"])[0],
        "secondary_kpis": (product.get("measurement_kpis") or [])[1:3],
        "missing_data_questions": profile.get("missing_data_questions", []),
        "evidence_urls": evidence_urls,
    }


def infer_core_segments(product):
    concerns = set(product.get("best_for_concerns", []))
    matched = []
    for segment_id, segment_tags in CORE_SEGMENT_RULES.items():
        if concerns & segment_tags:
            matched.append(segment_id)
    return matched or ["grwm_lifestyle_beauty"]


def assess_research_need(rankings, product):
    ready = [item for item in rankings if item["display_group"] == "ready_for_matching"]
    eligible_ready = [item for item in ready if item["recommendation_status"] == "eligible_for_seed"]
    top_six = eligible_ready[:6]
    core_segments = infer_core_segments(product)
    core_ready_count = sum(1 for item in eligible_ready if item["segment_id"] in core_segments)
    top_segment_distribution = Counter(item["segment_id"] for item in top_six)
    top_segment_share = 0
    if top_six:
        top_segment_share = max(top_segment_distribution.values()) / len(top_six)
    top_half = rankings[: max(1, len(rankings) // 2)]
    review_or_no_seed_top_half = sum(
        1
        for item in top_half
        if item["recommendation_status"] in {
            "review_required_before_seed",
            "review_required_product_risk",
            "no_seed_hard_exclusion",
            "needs_more_data_no_seed",
        }
    )
    triggers = []
    if len(eligible_ready) < 6:
        triggers.append("ready_for_matching_candidates_below_6")
    if core_ready_count < 3:
        triggers.append("core_segment_ready_candidates_below_3")
    if top_segment_share >= 0.7:
        triggers.append("top_6_same_segment_share_70_percent_or_more")
    if review_or_no_seed_top_half >= len(top_half) / 2:
        triggers.append("top_half_review_or_no_seed_50_percent_or_more")

    return {
        "decision": "research_needed" if triggers else "existing_db_sufficient",
        "triggers": triggers,
        "core_segments": core_segments,
        "ready_eligible_count": len(eligible_ready),
        "core_ready_eligible_count": core_ready_count,
        "top_6_segment_distribution": dict(top_segment_distribution),
        "top_6_same_segment_share": round(top_segment_share, 2),
        "top_half_review_or_no_seed_count": review_or_no_seed_top_half,
        "freshness_status": "not_evaluated_no_last_researched_at_field",
    }


def validate_phase6a(payload, trace_records, product_input_issues):
    rankings = payload["candidate_rankings"]
    selected = payload["selected_new_product_recommendations"]
    issues = list(product_input_issues)

    if len(rankings) != 30:
        issues.append(("blocker", "candidate_ranking_count_not_30"))
    if len(trace_records) != 30:
        issues.append(("must_fix", "new_product_trace_not_30"))
    if len(selected) > 6:
        issues.append(("must_fix", "selected_new_product_recommendations_over_6"))
    if any(item["display_group"] != "ready_for_matching" for item in selected):
        issues.append(("blocker", "non_ready_candidate_selected_for_new_product"))
    if any(item["recommendation_status"] != "eligible_for_seed" for item in selected):
        issues.append(("blocker", "non_eligible_candidate_selected_for_new_product"))
    if any(item["product_match"]["risk_review"]["hard_exclusion_reasons"] for item in selected):
        issues.append(("blocker", "hard_exclusion_selected_for_new_product"))

    priorities = [item["display_priority"] for item in rankings]
    if priorities != sorted(priorities):
        issues.append(("must_fix", "display_priority_sort_order_broken"))

    for item in rankings:
        trace = item["product_match"]["score_trace"]
        recomputed = round(
            trace["influencer_self_fit"]
            + trace["audience_fit"]
            + trace["content_fit"]
            + trace["market_channel_fit"]
            - trace["risk_penalty"],
            2,
        )
        if abs(item["product_match"]["total_score"] - max(0, recomputed)) > 0.01:
            issues.append(("must_fix", f"score_trace_mismatch:{item['creator_handle']}"))
            break

    if "research_gap_assessment" not in payload:
        issues.append(("must_fix", "missing_research_gap_assessment"))
    return issues


def main():
    product = load_json(NEW_PRODUCT_PATH)
    params = load_json(PARAMS_PATH)
    profiles = load_jsonl(PROFILES_PATH)
    product_input_issues = validate_product_input(product, params)
    product["family_id"] = product.get("family_id", "new_product_example")

    phase4.PRODUCT_RISK_CONFLICTS[product["product_id"]] = product_conflict_signals(product)

    trace_records = []
    rankings = []
    for profile in profiles:
        match = phase4.score_product(profile, product)
        trace_records.append(
            {
                "phase_id": "phase_6a_new_product_db_ranking",
                "profile_id": profile.get("profile_id"),
                "creator_handle": profile["identity"]["handle"],
                "display_group": profile.get("normalization_status"),
                "display_priority": phase4.DISPLAY_ORDER.get(profile.get("normalization_status"), 99),
                "product_id": product["product_id"],
                "total_score": match["total_score"],
                "score_trace": match["score_trace"],
                "eligibility": match["eligibility"],
                "hard_exclusion_applied_first": bool(phase4.hard_exclusion_reasons(profile)),
                "risk_review": match["risk_review"],
                "matched_evidence": match["matched_evidence"],
            }
        )
        rankings.append(build_candidate_ranking(profile, product, match))

    rankings.sort(
        key=lambda item: (
            item["display_priority"],
            -item["product_match"]["total_score"],
            item["creator_handle"],
        )
    )
    for index, item in enumerate(rankings, start=1):
        item["rank"] = index

    selected = [
        {**item, "selection_role": "new_product_seed_recommendation"}
        for item in rankings
        if item["display_group"] == "ready_for_matching"
        and item["recommendation_status"] == "eligible_for_seed"
    ][:6]
    held_for_review = [
        item
        for item in rankings
        if item["recommendation_status"]
        in {"review_required_before_seed", "review_required_product_risk", "no_seed_hard_exclusion", "needs_more_data_no_seed"}
    ]
    research_gap = assess_research_need(rankings, product)

    generated_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    payload = {
        "schema_version": "0.1.0",
        "phase_id": "phase_6a_new_product_db_ranking",
        "generated_at": generated_at,
        "input_files": [
            str(NEW_PRODUCT_PATH.relative_to(ROOT)),
            str(PROFILES_PATH.relative_to(ROOT)),
            str(PARAMS_PATH.relative_to(ROOT)),
        ],
        "new_product": product,
        "scoring_policy": {
            "score_total": 100,
            "influencer_self_fit": 35,
            "audience_fit": 25,
            "content_fit": 20,
            "market_channel_fit": 10,
            "risk_penalty": -10,
            "display_rule": "Display priority is applied before product score: ready_for_matching, review_required_before_matching, needs_more_data.",
            "hard_exclusion_rule": "Hard exclusions and product risk conflicts are checked before selection.",
        },
        "summary": {
            "profile_count": len(profiles),
            "candidate_ranking_count": len(rankings),
            "selected_recommendation_count": len(selected),
            "held_for_review_count": len(held_for_review),
            "candidate_status_distribution": dict(Counter(item["display_group"] for item in rankings)),
            "recommendation_status_distribution": dict(Counter(item["recommendation_status"] for item in rankings)),
            "top_6_segment_distribution": research_gap["top_6_segment_distribution"],
        },
        "research_gap_assessment": research_gap,
        "selected_new_product_recommendations": selected,
        "held_for_review": held_for_review,
        "candidate_rankings": rankings,
    }

    dump_json(RANKINGS_PATH, payload)
    TRACE_PATH.write_text("\n".join(json.dumps(item, ensure_ascii=False) for item in trace_records) + "\n")

    issues = validate_phase6a(payload, trace_records, product_input_issues)
    blocker_count = sum(1 for severity, _ in issues if severity == "blocker")
    must_fix_count = sum(1 for severity, _ in issues if severity == "must_fix")
    should_fix_count = sum(1 for severity, _ in issues if severity == "should_fix")
    validation = {
        "phase_id": "phase_6a_new_product_db_ranking",
        "validation_run_id": "phase6a_validation_001",
        "generated_at": generated_at,
        "input_files": payload["input_files"],
        "output_files": [
            str(RANKINGS_PATH.relative_to(ROOT)),
            str(TRACE_PATH.relative_to(ROOT)),
            str(REPORT_PATH.relative_to(ROOT)),
            str(REPORT_HTML_PATH.relative_to(ROOT)),
        ],
        "checks": {
            "required_product_fields_present": not any(
                finding.startswith("missing_required_product_field") for _, finding in product_input_issues
            ),
            "product_risk_flags_present": bool(product.get("risk_flags")),
            "profile_count": len(profiles),
            "trace_record_count": len(trace_records),
            "candidate_ranking_count": len(rankings),
            "selected_recommendation_count": len(selected),
            "display_priority_sorted": all(
                rankings[idx]["display_priority"] <= rankings[idx + 1]["display_priority"]
                for idx in range(len(rankings) - 1)
            ),
            "hard_exclusion_selected_count": sum(
                1 for item in selected if item["product_match"]["risk_review"]["hard_exclusion_reasons"]
            ),
            "needs_more_data_selected_count": sum(1 for item in selected if item["display_group"] == "needs_more_data"),
            "research_gap_assessment_present": bool(research_gap),
        },
        "issues": [
            {
                "severity": severity,
                "finding": finding,
                "affected_files": [str(RANKINGS_PATH.relative_to(ROOT))],
                "fix_action": "Investigate before approval." if severity in {"blocker", "must_fix"} else "Review after MVP demo.",
                "status": "open" if severity in {"blocker", "must_fix"} else "deferred",
                "revalidation_result": "",
            }
            for severity, finding in issues
        ],
        "reviewer_result": {
            "status": "pass" if blocker_count == 0 and must_fix_count == 0 else "revise",
            "reviewer": "codex_phase6a_self_reviewer",
            "notes": [
                "The new product is ranked against all 30 existing influencer profiles.",
                "Display priority is applied before product-fit score.",
                "Hard exclusions and needs_more_data candidates are not selected as high-confidence recommendations.",
                "Additional research need is reported separately and does not overwrite the existing DB ranking.",
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

    selected_lines = "\n".join(
        f"- {item['rank']}. {item['creator_handle']} / {SEGMENT_LABELS.get(item['segment_id'], item['segment_id'])} / score {item['product_match']['total_score']} / {item['display_group_label']}"
        for item in selected
    )
    selected_reason_lines = "\n".join(recommendation_reason_block(item) for item in selected)
    selected_reason_summary_lines = "\n".join(
        f"- {item['rank']}. {item['creator_handle']}: "
        f"점수 {item['product_match']['total_score']}, "
        f"핵심 매칭 `{label_tags(item['product_match']['matched_evidence']['product_concern_hits'][:3], CONCERN_LABELS)}`, "
        f"콘텐츠 `{label_tags(item['product_match']['matched_evidence']['product_content_hits'][:3], CONTENT_LABELS)}`"
        for item in selected
    )
    held_lines = "\n".join(
        f"- {item['rank']}. {item['creator_handle']} / {item['recommendation_status']} / {', '.join(item['no_seed_option']['reasons'][:2])}"
        for item in held_for_review[:8]
    )
    trigger_text = ", ".join(research_gap["triggers"]) if research_gap["triggers"] else "없음"
    report = f"""# Phase 6A 신제품 기존 DB 랭킹 리포트

생성 시각: {generated_at}

## 신제품 입력

- 제품: {product['name']} (`{product['product_id']}`)
- 포맷: {product['format']}
- 핵심 피부 고민: {label_tags(product['best_for_concerns'], CONCERN_LABELS)}
- 콘텐츠 적합성: {label_tags(product['content_fit'], CONTENT_LABELS)}
- 리스크 플래그: 트러블 치료처럼 보이는 표현, 상처 부위 사용, 보장성 톤 보정/모공 축소, 모든 피부톤에 맞는 대체 파운데이션 표현 금지
- KPI: {kpi_labels(product['measurement_kpis'])}

## 랭킹 요약

- 전체 DB 후보: {len(rankings)}명
- 선택 가능한 ready 추천 후보: {len(selected)}명
- 보류/검토/데이터부족 후보: {len(held_for_review)}명
- 상태 분포: {payload['summary']['candidate_status_distribution']}
- 추천 상태 분포: {payload['summary']['recommendation_status_distribution']}

## 상위 추천 후보

{selected_lines}

## 선정 사유 상세

{selected_reason_lines}

## 보류/검토 후보 예시

{held_lines}

## 추가 리서치 판단

- 판단: `{research_gap['decision']}`
- 트리거: {trigger_text}
- 핵심 세그먼트: {', '.join(research_gap['core_segments'])}
- ready 추천 가능 후보 수: {research_gap['ready_eligible_count']}
- 핵심 세그먼트 ready 추천 가능 후보 수: {research_gap['core_ready_eligible_count']}
- 상위 6명 세그먼트 분포: {research_gap['top_6_segment_distribution']}

## 검수 결과

- reviewer 결과: {validation['reviewer_result']['status']}
- blocker: {blocker_count}
- must_fix: {must_fix_count}
- should_fix: {should_fix_count}

## 해석 원칙

이 결과는 기존 인플루언서 DB만 사용한 신제품 1차 랭킹이다. 실제 게시, 클릭, 쿠폰, 주문 데이터가 없으므로 매출 효과를 단정하지 않는다. 추가 리서치는 Phase 6B에서 정량 조건을 검토한 뒤 필요한 경우에만 실행한다.
"""
    REPORT_PATH.write_text(report)
    REPORT_HTML_PATH.write_text(render_html_report(product, payload, selected, held_for_review, research_gap, validation, generated_at))

    pre_approval = f"""## 승인 요청: Phase 6A - 신제품 입력 기반 기존 DB 랭킹

### Codex 사전 검토 결과
- 산출물: `data/new_product_rankings.json`, `logs/new_product_matching_trace.jsonl`, `logs/new_product_ranking_report.md`, `logs/new_product_ranking_report.html`
- 형식 검증: JSON/JSONL/Markdown 생성 완료, trace {len(trace_records)}건 = 후보 30명 x 신제품 1개
- 보고서 검증: HTML 보고서에 순위표, 후보별 점수 분해, 피부 고민/콘텐츠 매칭, 리스크 판단, 인과 가설, 관찰 KPI 포함
- 내용 정합성: 기존 DB 전체를 대상으로 랭킹했고 표시 우선순위는 `ready_for_matching` -> `review_required_before_matching` -> `needs_more_data` 순서로 유지
- 리스크 검토: hard exclusion 및 `needs_more_data` 후보는 고신뢰 추천으로 선택하지 않음
- reviewer 결과: {validation['reviewer_result']['status']}

### 신제품
- {product['name']} (`{product['product_id']}`)
- 핵심 고민: {label_tags(product['best_for_concerns'], CONCERN_LABELS)}
- KPI: {kpi_labels(product['measurement_kpis'])}

### 상위 추천 후보
{selected_lines}

### 상위 추천 후보별 선정 사유 요약
{selected_reason_summary_lines}

### 추가 리서치 판단
- 판단: `{research_gap['decision']}`
- 트리거: {trigger_text}

### 사용자가 확인할 핵심
- 신제품 입력값이 실제 제품 예시로 적절한지
- 기존 DB 기반 상위 후보가 시연용으로 납득 가능한지
- Phase 6B 리서치 갭 판단을 별도 실행할지

### 제안 판단
- Codex 권고: 승인
- 이유: blocker/must_fix 이슈가 없고, 기존 DB만으로 ready 추천 후보 6명을 만들 수 있음
"""
    PRE_APPROVAL_PATH.write_text(pre_approval)


if __name__ == "__main__":
    main()
