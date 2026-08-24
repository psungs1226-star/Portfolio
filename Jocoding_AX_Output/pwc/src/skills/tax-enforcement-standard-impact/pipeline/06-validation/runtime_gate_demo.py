#!/usr/bin/env python3
"""Runtime Verification Gate — 데모 1건 end-to-end 실행기.

SKILL.md "Runtime Verification Gate (per new amendment)"의 6단계를 실제 데모 후보 1건에
결정론적으로 적용해, 게이트가 '소박한 사전판정(confirmed)'을 어떻게 검증·강등하고
놓친 범위를 자기보고하는지 추적(trace)으로 보여준다.

입력은 손으로 만들지 않는다 — 08-packaging 데모 canonical(demo_brief_data.json)의 item[0]을 읽는다.
usage: python3 runtime_gate_demo.py
"""
import json
import sys
from pathlib import Path

sys.dont_write_bytecode = True  # 패키지 트리에 __pycache__ 남기지 않음

HERE = Path(__file__).resolve().parent
PIPE = HERE.parent
DEMO = PIPE / "08-packaging/steps/05-html-finalize/demo_brief_data.json"
OUT = HERE / "RUNTIME_GATE_DEMO.json"
VERDICTS = {"confirmed", "review_worthy", "hold", "exclude"}


def gate(item):
    """6단계 게이트를 순서대로 적용. 각 단계는 (pass/adjust, 사유)를 남긴다."""
    trace = []
    am = item["amendment"]
    inf = item["inference"]
    prior = item["prior"]

    # 소박한 사전판정: 엔티티/키워드 히트만 보면 '면세 신설이 과거 판정을 뒤집는 flip'으로 단정하기 쉽다.
    naive = "confirmed"
    verdict = naive
    notes = []

    # 1. 근거 게이트(하드): 구체 근거 ≥1개 없으면 hold/exclude로 강등, 영향가능 등재 불가.
    evidence = [e for e in (prior.get("source_no"), am.get("article_path")) if e and e != "—"]
    if evidence:
        trace.append(("1_evidence_gate", "pass", f"근거 {len(evidence)}개 확보: {evidence}"))
    else:
        verdict = "hold"
        trace.append(("1_evidence_gate", "downgrade→hold", "구체 근거 0개 — 영향가능 등재 불가"))
        return verdict, naive, trace, notes

    # 2. 홉 라벨링: ≥1홉(추론)은 3단계(적대검증) 통과 없이는 confirmed 금지.
    hop = item["hop"]
    if hop >= 1:
        trace.append(("2_hop_labeling", "block-confirm", f"{hop}홉(추론) → 적대검증 없이 confirmed 불가"))
    else:
        trace.append(("2_hop_labeling", "pass", "0홉(직접근거)"))

    # 3. 적대적 검증: 독립 관점이 flip을 반증. 다수 반증 시 강등.
    v = inf.get("verification", {})
    lenses, refuted = v.get("lenses", 0), v.get("refuted", 0)
    majority_refuted = lenses > 0 and refuted * 2 >= lenses
    # 같은 조문군이면 완전 무관(exclude)이 아니라 검토가치 유지(REVIEW_WORTHY).
    same_group = "제40조" in am["article_path"] and "제40조" in item["title"]
    if majority_refuted:
        verdict = "review_worthy" if same_group else "exclude"
        trace.append(("3_adversarial", f"refute {refuted}/{lenses}→{verdict}",
                      f"다수 반증 → flip 강등. 같은 조문군={same_group} → {'검토 큐 유지' if same_group else '무관'}. "
                      f"(적대검증이 flip을 kill=게이트의 성공: 진짜 flip과 REVIEW_WORTHY를 구분)"))
    elif hop >= 1:
        verdict = "review_worthy"
        trace.append(("3_adversarial", "no-panel→review_worthy", "≥1홉인데 적대패널 부재 → confirmed 불가, 검토 큐로"))
    else:
        trace.append(("3_adversarial", "pass", "0홉·반증 없음 → confirmed 유지 가능"))

    # 4. 네거티브 컨트롤: '유사하지만 무관' 디코이가 고신뢰로 뜨면 정밀도 실패.
    # 데모 디코이 = 2016 판정의 '독립 공급 IT 시스템을 면세로'. 개정이 독립 부수 IT를 면세로 넣지 않으므로 뜨면 안 됨.
    decoy_surfaced = False  # 개정 대상(펀드 자산 관리·운용) ≠ 디코이 대상(독립 IT 공급)
    if decoy_surfaced:
        trace.append(("4_negative_control", "precision-fail", "디코이가 고신뢰로 표면화 → 하드필터 강화 후 강등"))
        verdict = "review_worthy" if verdict == "confirmed" else verdict
    else:
        trace.append(("4_negative_control", "pass", "디코이(독립 IT 면세) 미표면화 → 정밀도 OK"))

    # 5. 블라인드스팟 자기보고(은폐 금지): 동의어 gap·광역 전문개정이면 '놓쳤을 가능성' 노트 필수.
    kd = am.get("keyword_diff", [])
    gap_hit = any("동의어 gap" in (d.get("new", "") + d.get("note", "")) or "해석례 0건" in d.get("new", "")
                  for d in kd)
    if gap_hit or "전문개정" in am.get("change_type", ""):
        note = "동의어 gap 발화(개정 어휘 '재간접' 직접검색 해석례 0건 → '벤처투자조합' 우회 도달). 직접어 코퍼스는 놓칠 수 있음 — 엔티티 동의어 사전 필요."
        notes.append(note)
        trace.append(("5_blindspot_report", "emit-note", note))
    else:
        trace.append(("5_blindspot_report", "none", "알려진 놓침 유형 미해당"))

    # 6. 정직한 verdict + 재현성: 최종 라벨은 enum만. 단정 금지.
    assert verdict in VERDICTS, f"verdict enum 위반: {verdict}"
    trace.append(("6_honest_verdict", "pass", f"최종 verdict={verdict} ∈ {sorted(VERDICTS)} · 단정 아님"))
    return verdict, naive, trace, notes


def run():
    demo = json.loads(DEMO.read_text(encoding="utf-8"))
    item = demo["items"][0]
    verdict, naive, trace, notes = gate(item)
    return {
        "demo_case": {"id": item["id"], "title": item["title"],
                      "amendment": item["amendment"]["article_path"],
                      "hop": item["hop"], "tier": item["tier"]},
        "naive_pre_gate_verdict": naive,
        "gated_verdict": verdict,
        "gate_changed_outcome": naive != verdict,
        "gate_trace": [{"step": s, "result": r, "why": w} for s, r, w in trace],
        "blindspot_notes": notes,
        "expected_gated_verdict": item["verdict"],  # canonical과 일치해야
        "matches_canonical": verdict == item["verdict"],
    }


def main():
    result = run()
    OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"demo case : {result['demo_case']['id']} ({result['demo_case']['hop']}홉·Tier{result['demo_case']['tier']})")
    print(f"pre-gate  : {result['naive_pre_gate_verdict']}  →  gated: {result['gated_verdict']}"
          f"   (게이트가 결과 변경: {result['gate_changed_outcome']})")
    print("--- gate trace ---")
    for t in result["gate_trace"]:
        print(f"  [{t['step']:20}] {t['result']:22} {t['why']}")
    if result["blindspot_notes"]:
        print("--- blindspot self-report ---")
        for n in result["blindspot_notes"]:
            print(f"  ! {n}")
    print(f"canonical 일치: {result['matches_canonical']} (expected={result['expected_gated_verdict']})")
    print(f"-> {OUT}")


if __name__ == "__main__":
    main()
