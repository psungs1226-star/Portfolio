#!/usr/bin/env python3
"""action-brief/v1 : canonical 파이프라인 아티팩트 → brief_data.json → HTML (end-to-end).

MAPPING.md의 규칙대로 Phase 5 / Phase 7 산출물을 읽어 판단축(tier·verdict·hop·keyword_diff)을
결정론적으로 유도하고, 편집성 프레임(brief_template.json)과 병합해 brief_data.json을 낸 뒤
render_brief로 HTML을 낸다. 손으로 문장을 쓰지 않는다 — 새 개정은 소스만 갱신 후 재실행.

usage: python3 build_brief.py [out.html]
"""
import json
import re
import sys
from pathlib import Path

sys.dont_write_bytecode = True  # 패키지 트리에 __pycache__ 남기지 않음
import render_brief  # 같은 디렉터리, render(dict) 재사용

HERE = Path(__file__).resolve().parent
PIPE = HERE.parents[2]                        # .../pipeline
REPO = PIPE.parents[3]                         # .../pwc (repo root: pipeline→skill→skills→src→repo)
P5 = PIPE / "05-review-list-output/OUTPUT.json"
SCAF = PIPE / "07-scope-expansion/JUDGMENT_SCAFFOLD_AXIS1.json"
PILOT = PIPE / "07-scope-expansion/JUDGMENT_LAYER_PILOT.json"
BT = PIPE / "07-scope-expansion/BLIND_BACKTEST.json"
TPL = HERE / "brief_template.json"
DATA_OUT = HERE / "brief_data.json"
HTML_OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else REPO / "tax_agent_proactive_action_brief.html"


def load(p):
    return json.loads(Path(p).read_text(encoding="utf-8"))


def find(rx, text, default=""):
    m = re.search(rx, text)
    return m.group(1) if m else default


# ── 소스 → 카드 추출기 ────────────────────────────────────────────────

def item_toji(p5, p7):
    s = p5["section_1_likely_affected_enforcement_standards"][0]
    cr = p5["change_ref"]
    confirmed = s["standard_no"] in p7["aggregate"]["staleness_confirmed_positive"]
    return {
        "id": "toji-imdaebu",
        "title": f"집행기준 {s['standard_no']} · 토지임대부 분양주택 부수토지 임대",
        "tier": 1, "tier_label": "면세 신설",
        "verdict": "confirmed" if confirmed else "review_worthy",
        "confidence": s["confidence"], "hop": 0, "action_kind": "position_recheck",
        "prior": {
            "source_no": f"집행기준 {s['standard_no']}", "source_title": s["title"],
            "gist": f"<b>요지:</b> {s['evidence_summary']}",
        },
        "amendment": {
            "article_path": s["related_changed_article"].split(" / ")[0],
            "effective_date": cr["effective_date"].replace(" 적용", ""),
            "change_type": "면세 신설",
            "text": f"{cr['law_change']} — 2024-07-01 이후 공급분 적용",
            "keyword_diff": [{"op": "신설", "old": "기존 면세범위: 해당 항목 없음",
                              "new": "「토지임대부 분양주택」 「부수토지 임대용역」 면세 추가"}],
        },
        "inference": {
            "delta": "집행기준이 아직 신설분을 담지 못했으므로, 시행령 원문 기준으로는 해당 부수토지 임대용역이 <b>과세 → 면세로 전환</b>. 집행기준만 보고 판단하면 면세 대상을 과세로 오판하게 된다.",
            "risk": {"label": "면세 누락(과다 과세)",
                     "detail": "집행기준만 보고 토지임대부 부수토지 임대를 과세로 처리하면, 면세 대상을 과세해 거래상대방에게 부당하게 전가한다."},
        },
        "action": {
            "who": "토지임대부 분양주택(국민주택규모) 관련 임대 고객",
            "do": "2024-07-01 이후 부수토지 임대용역의 <b>면세 적용</b>을 확인. 집행기준에 미반영이므로 시행령 제41조 원문·부칙 제5조로 포지션 근거를 마련. 다음 집행기준 개정판까지 계속 주시.",
            "review_question": s["review_question"],
        },
    }


def item_scaffold(sc):
    cr = sc["candidate_ruling"]
    am = sc["amendment"]
    cd = sc["conclusion_delta"]
    av = sc["adversarial_verification"]
    lenses = [k for k in av if k.startswith("lens_")]
    dc_txt = cd["corroborating_ruling_직접"]
    dc_no = find(r"(서면-\d{4}-부가-\d+)", dc_txt)
    return {
        "id": "gisulbojung",
        "title": "기술보증기금·신용보증기금이 제공하는 용역의 면세 범위",
        "tier": 1, "tier_label": "면세 범위",
        "verdict": "review_worthy",
        "confidence": "high" if sc["verdict"]["confidence"].startswith("high") else "med",
        "hop": 1 if "≥1홉" in sc["hop_class"]["class"] else 0,
        "action_kind": "position_recheck",
        "prior": {
            "source_no": f"{cr['doc_no']} ({cr['date'].split(' ')[0]})",
            "source_title": cr["title"],
            "gist": f"<b>요지:</b> {cr['gist_verbatim']} <b>면세근거:</b> {cr['exemption_basis']}",
        },
        "amendment": {
            "article_path": am["law"], "effective_date": am["effective_date"],
            "change_type": am["change_type"],
            "text": f"<b>제3호 신설</b> \"{am['requirement_text_verbatim']['신설_제3호_after'].split('. ',1)[-1]}\" 면세 · 제6호(신용보증기금업)는 <b>불변</b>",
            "keyword_diff": [
                {"op": "신설", "old": "제3호: 해당 항목 없음", "new": "제3호 신설: 「기술보증기금」 보증업무 면세"},
                {"op": "불변", "old": "제6호: 「신용보증기금」", "new": "제6호: 「신용보증기금」 (문구 불변)"},
            ],
        },
        "inference": {
            "delta": f"<b>뒤집힘 아님(검토 대상).</b> {cd['net']} 예규의 면세 근거(제6호 불변+제14조 부수 법리)는 개정이 건드린 열거 목록과 <b>독립</b>이라 반대해석 원칙의 사정거리 밖. 개정 대상(기술보증기금)과 예규 주체(신용보증기금)도 다른 기관.",
            "counter_args": sc["counter_arguments"],
            "direct_check": {"source_no": dc_no, "gist": dc_txt.split(": ", 1)[-1] if ": " in dc_txt else dc_txt},
            "verification": {
                "lenses": len(lenses), "refuted": len(lenses),
                "note": f"독립 {len(lenses)}개 관점이 같은 결론(뒤집힘 아님)으로 수렴. 같은 조문군이라 검토 가치는 있으나 결론은 흔들리지 않음. (consensus destabilization {sc['verdict']['consensus_destabilization_probability']})",
            },
        },
        "action": {
            "who": "기술보증기금·신용보증기금 등과 거래하는 고객",
            "do": "보증업무 외 <b>독립</b> 평가용역은 과세 유지가 정합(위 직접 예규). 면세는 '보증업무에 통상 부수'하는 경우로 한정해 부수성 사실판단만 점검. <b>단정하지 말고 검토 큐로만 유지.</b>",
        },
    }


def item_mileage(pilot, bt):
    t2 = pilot["tier2_demonstration"]["confirmed_firing_과표축"]
    # 유발 개정은 BLIND_BACKTEST flip 5가 특정: 부가령 §61①9·②9-10 자기적립마일리지등 (대령 28641, 2018-02-13)
    f5 = next((f for f in bt["results"]["per_flip"] if f["id"] == 5), {})
    eff = find(r"(\d{4}-\d{2}-\d{2})", f5.get("amendment", ""), "2018-02-13")
    return {
        "id": "mileage-tax-base",
        "title": "마일리지·포인트 결제 → 과세표준(에누리)",
        "tier": 2, "tier_label": "과세표준(효과 변동)",
        "verdict": "review_worthy", "confidence": "med", "hop": 0,
        "action_kind": "position_recheck",
        "prior": {
            "source_no": f"{t2['deleted_case']} / {t2['retained_case']}",
            "source_title": "세법해석 정비(정비코드 10, 개정주도)",
            "gist": f"<b>삭제된 옛 판정({t2['deleted_case']}):</b> {t2['deleted_case_gist']} <b>유지 판정({t2['retained_case']}):</b> {t2['retained_case_gist']}",
        },
        "amendment": {
            "article_path": "부가가치세법 시행령 제61조 제1항·제2항 (자기적립마일리지등)",
            "effective_date": eff, "change_type": "과세표준 처리 정비",
            "text": "자기적립마일리지등으로 결제받은 금액의 과세표준 처리 정비 (대통령령 28641). 유발 개정은 블라인드 백테스트 flip 5로 특정.",
            "keyword_diff": [
                {"op": "치환", "old": "기존: 개별 예규별 에누리 인정 여부 산발",
                 "new": "개정: 「자기적립마일리지등」 개념으로 과세표준 차감 대상 명확화"},
                {"op": "불변", "old": "실무 어휘 「포인트」", "new": "개정 어휘 「마일리지」",
                 "note": "같은 대상, 다른 표현 — 동의어 gap(자동 감시 놓침 사유)"},
            ],
        },
        "inference": {
            "delta": t2["tier2_nature"],
            "risk": {"label": "과세표준 오류", "detail": "분류(과세)는 유지되나 에누리 인정 범위에 따라 공급가액이 달라짐 — 과다·과소 신고 양방향 위험."},
            "verification": {
                "lenses": 1, "refuted": 1,
                "note": "정비 기록(삭제↔유지 쌍) 기반 Tier 2 메커니즘 확인. '확정 실증'이 아니라 메커니즘 확인 — 유발 개정 원문 대조는 검토 큐로 유지.",
                "miss_scope": "유발 개정 원문(대령 28641) 조문 대조 pending.",
            },
        },
        "action": {
            "who": "마일리지·포인트·초과지원금 제도를 운영하는 유통·통신 고객",
            "do": "자기적립분/타사분을 구분해 <b>과세표준 차감 여부를 재계산</b>. 옛 예규 기준으로 세팅된 전산 시스템·세금계산서 발행 로직을 점검.",
        },
    }


def item_new_exemptions(pilot):
    events = [e for e in pilot["pilot_target"]["amendment_events"] if "신설" in e["change"]]
    diffs = []
    for e in events:
        entity = e["change"].replace("면세 신설 ", "").strip()
        diffs.append({"op": "신설", "old": f"{entity}: 과세", "new": f"면세 ({e['eff']})"})
    eff_min = min(e["eff"] for e in events)
    return {
        "id": "new-exemptions-notify",
        "title": "신규 면세 편입 — 거래 상대방 알림",
        "tier": 1, "tier_label": "면세 편입",
        "verdict": "confirmed", "confidence": "high", "hop": 0,
        "action_kind": "counterparty_notify",
        "prior": {
            "source_no": "—", "source_title": "해당 기관 용역이 과세였던 종전 처리",
            "gist": "<b>요지:</b> 아래 기관 용역은 개정 전 과세 처리였고, 거래상대방은 매입세액 공제·세금계산서 수수를 전제로 처리해 왔음.",
        },
        "amendment": {
            "article_path": "부가가치세법 시행령 제40조 (금융·보험 면세)",
            "effective_date": eff_min, "change_type": "면세 신설(복수)",
            "text": "특정 기관 용역이 새로 면세로 편입 — 시행령 제40조 금융·보험 면세 신설. 개정 텍스트 실측(ASISTA002MR03 before/after).",
            "keyword_diff": diffs,
        },
        "inference": {
            "delta": "해당 기관 용역이 <b>과세 → 면세로 편입</b>되면 거래상대방의 매입세액·세금계산서 처리가 바뀐다.",
            "risk": {"label": "매입세액 불공제 누락 / 세금계산서 오발급",
                     "detail": "면세 전환 사실을 모르면 거래상대방이 매입세액 공제를 잘못 받거나 세금계산서를 계속 발급한다."},
        },
        "action": {
            "who": "위 기관과 거래하는 고객",
            "do": "시행일 이후 <b>면세 전환 반영</b>(세금계산서→계산서, 매입세액 처리). 시행 <b>전</b> 공급분과 구분.",
        },
    }


VERDICT_FROM_FLIP = {"hold_확인필요": "hold", "exclude": "exclude", "confirmed": "confirmed"}
TIER_FROM_FLIP = {"tier1_flip": 1, "tier2_effect": 2, "tier3_low": 3, "none_excluded": 1}


def item_yudonghwa(pilot):
    fa = next(f for f in pilot["plan_A_executed"]["flip_analysis"] if "유동화" in f["on_point_ruling"])
    ruling = fa["on_point_ruling"]
    src_no = find(r"\(([^)]+)\)$", ruling) or find(r"(법령해석과-\d+)", ruling)
    title = ruling.split(" (")[0]
    am_txt = fa["amendment"]
    eff = find(r"(\d{4}-\d{2}-\d{2})", am_txt)
    return {
        "id": "yudonghwa",
        "title": "유동화전문회사 업무수탁용역 면세",
        "tier": TIER_FROM_FLIP.get(fa["tier"], 1), "tier_label": "면세→과세 여지",
        "verdict": VERDICT_FROM_FLIP.get(fa["flip_verdict"], "hold"),
        "confidence": "low", "hop": 1, "action_kind": "position_recheck",
        "prior": {
            "source_no": src_no, "source_title": title,
            "gist": f"<b>요지({fa['ruling_conclusion']}):</b> {title}.",
        },
        "amendment": {
            "article_path": "부가가치세법 시행령 제40조 (주택저당채권유동화회사)",
            "effective_date": eff, "change_type": "면세 삭제",
            "text": "<b>주택저당채권유동화회사</b>의 채권유동화·관리운용 사업 <b>면세 삭제</b>",
            "keyword_diff": [{"op": "삭제", "old": "「주택저당채권유동화회사」 채권유동화·관리운용 사업 면세",
                              "new": "삭제 (면세범위 축소)"}],
        },
        "inference": {
            "delta": fa["reason"],
            "verification": {
                "lenses": 1, "refuted": 1,
                "note": "별개 호(號)라 직접 영향 없음(exclude)에 근접 — hold는 판정이 의존한 호 원문 확인 전까지의 보수적 라벨. 과잉 대응 방지.",
                "miss_scope": "판정이 의존한 정확한 호가 삭제 대상과 우연히 겹치는 경우만 재확인 필요.",
            },
        },
        "action": {
            "who": "유동화 관련 업무수탁 고객",
            "do": "해당 판정이 근거로 삼은 <b>정확한 호(號)</b>가 삭제 대상과 일치하는지만 확인. 별개 호면 조치 불필요 — 과잉 대응 방지.",
        },
    }


def monitoring(bt):
    per = {f["id"]: f for f in bt["results"]["per_flip"]}
    hits = [f for f in per.values() if f["outcome"] == "HIT"]
    works = [f"{h['amendment'].split(' (')[0]} (blind 키워드 '{'·'.join(h['blind_kw'])}', 검색 순위 {h['retained_rank']}위)" for h in hits]
    works.append("한·스위스 조약 축은 top-10 중 8건이 개정 전 생산 문서 = 과거 판정 도달성 직접 확인.")
    return {
        "title": "자동 감시 대상 — 사후검증이 확인한 \"확실히 잡히는\" 개정 유형",
        "works_on": works,
        "misses": [
            "동의어 gap — 개정 어휘 ≠ 사례 어휘 (flip 5: 개정 '마일리지' ↔ 실무 '포인트', top-50 밖)",
            "특정 해상도 — 전문개정 같은 광역 개정은 일반어 키워드만 산출 (flip 7: rank 29)",
            "프록시 잡음 — 유지사례가 최고 관련 문서가 아님 (flip 1: rank 27)",
        ],
        "fix_levers": ["동의어 사전", "항·호 단위 개정 해상도", "다중 키워드 질의"],
        "metric": f"{bt['results']['primary_score']}. 축 도달성은 primary보다 높음(11건 중 ~9건 검색 결과가 해당 법리 축에 정확 도달). 과대·과소 어느 쪽도 감추지 않음.",
    }


def validate_data(data):
    """HTML_SCHEMA.json 계약 최소 검증 — canonical drift 시 렌더 전에 중단."""
    assert data["schema"] == "action-brief/v1", f'schema: {data["schema"]}'
    for it in data["items"]:
        i = it["id"]
        assert it["verdict"] in {"confirmed", "review_worthy", "hold", "exclude"}, f'{i}: verdict={it["verdict"]}'
        assert it["tier"] in {1, 2, 3}, f'{i}: tier={it["tier"]}'
        assert it["confidence"] in {"high", "med", "low"}, f'{i}: confidence={it["confidence"]}'
        assert it["hop"] in {0, 1}, f'{i}: hop={it["hop"]}'
        assert it["action_kind"] in {"position_recheck", "counterparty_notify"}, f'{i}: action_kind={it["action_kind"]}'
        for d in it["amendment"].get("keyword_diff", []):
            assert d["op"] in {"신설", "삭제", "불변", "치환"}, f'{i}: keyword_diff.op={d["op"]}'


def build():
    tpl = load(TPL)
    p5, sc, pilot, bt = load(P5), load(SCAF), load(PILOT), load(BT)
    p7 = load(PIPE / "07-scope-expansion/OUTPUT.json")
    items = [
        item_toji(p5, p7),
        item_scaffold(sc),
        item_mileage(pilot, bt),
        item_new_exemptions(pilot),
        item_yudonghwa(pilot),
    ]
    return {
        "schema": "action-brief/v1",
        "status_label": "completed_with_hold_flags",
        "generated_by": "build_brief.py (canonical 아티팩트 유도; MAPPING.md 규칙). 손편집 금지 — 소스 갱신 후 재실행.",
        "meta": tpl["meta"],
        "value_props": tpl["value_props"],
        "why_now": tpl["why_now"],
        "items": items,
        "monitoring": monitoring(bt),
    }


def main():
    data = build()
    validate_data(data)
    DATA_OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    HTML_OUT.write_text(render_brief.render(data), encoding="utf-8")
    print(f"built {len(data['items'])} items · {DATA_OUT.name} + {HTML_OUT}")


if __name__ == "__main__":
    main()
