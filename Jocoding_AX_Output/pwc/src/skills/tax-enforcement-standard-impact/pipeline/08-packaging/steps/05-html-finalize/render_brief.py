#!/usr/bin/env python3
"""action-brief/v1 : brief_data.json -> 선제 대응 실행 브리프 HTML.

계약(HTML_SCHEMA.json)의 필드를 채워 결정론적으로 렌더한다. 손으로 문장을 쓰지 않는다.
content 필드는 authored·trusted 데이터라 의도된 인라인 <b> 등을 그대로 삽입한다.

usage: python render_brief.py [data.json] [out.html]
"""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
PIPE = HERE.parents[2]                         # .../pipeline
REPO = PIPE.parents[3]                          # .../pwc (repo root: pipeline→skill→skills→src→repo)
DATA = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / "brief_data.json"
OUT = Path(sys.argv[2]) if len(sys.argv) > 2 else REPO / "tax_agent_proactive_action_brief.html"

VERDICT = {
    "confirmed":     ("검증 완료",       "v-confirmed", 0, 0),
    "review_worthy": ("검토 대상",       "v-rw",        1, 1),
    "hold":          ("보류·확인필요",   "v-hold",      2, 2),
    "exclude":       ("영향 없음",       "v-exclude",   3, 2),
}  # (label, css, sort_rank, matrix_col)
TIER = {
    1: ("1순위 · 분류 변동(면세↔과세)", "b-t1"),
    2: ("2순위 · 효과·과표 변동",       "b-t2"),
    3: ("3순위 · 단순 정리",            "b-t3"),
}
CONF = {"high": ("신뢰도 높음", "c-hi", 0), "med": ("신뢰도 보통", "c-md", 1), "low": ("신뢰도 낮음", "c-lo", 2)}
HOP = {0: "직접근거 · 0단계", 1: "추론근거 · ≥1단계"}
KIND = {"position_recheck": "포지션 재점검", "counterparty_notify": "거래상대방 알림"}
KWOP = {"신설": "kw-new", "삭제": "kw-del", "불변": "kw-keep", "치환": "kw-sub"}
KWARROW = {"신설": "→", "삭제": "→", "불변": "=", "치환": "→"}

CSS = """
  :root{--navy:#1a2b4a;--navy2:#243a5e;--orange:#eb6f00;--ink:#20242b;--muted:#6b7482;
    --line:#e3e7ee;--bg:#f5f7fa;--green:#1e9e6a;--red:#c8492e;--gray:#8a94a3;}
  *{box-sizing:border-box;}
  body{margin:0;font-family:"Apple SD Gothic Neo","Malgun Gothic","Segoe UI",sans-serif;
    background:var(--bg);color:var(--ink);line-height:1.62;font-size:15px;}
  .wrap{max-width:1000px;margin:0 auto;padding:0 20px 60px;}
  header{background:linear-gradient(135deg,var(--navy),var(--navy2));color:#fff;padding:34px 0 30px;margin-bottom:24px;}
  header .wrap{padding:0 20px;}
  header .tag{display:inline-block;background:var(--orange);color:#fff;font-size:12px;font-weight:700;padding:4px 11px;border-radius:20px;margin-bottom:12px;}
  header h1{margin:0 0 10px;font-size:25px;line-height:1.35;}
  header p{margin:0;color:#c7d2e4;font-size:14px;max-width:900px;}
  h2{font-size:18px;color:var(--navy);margin:32px 0 6px;padding-bottom:7px;border-bottom:2px solid var(--line);}
  h2 .n{color:var(--orange);font-weight:800;margin-right:7px;}
  .lead{font-size:14px;color:#3a4453;margin:2px 0 14px;}
  .value{display:flex;gap:12px;flex-wrap:wrap;margin:4px 0 6px;}
  .value .v{flex:1;min-width:210px;background:#fff;border:1px solid var(--line);border-left:4px solid var(--orange);border-radius:10px;padding:14px 16px;box-shadow:0 1px 3px rgba(20,30,50,.04);}
  .value .v .h{font-weight:800;color:var(--navy);font-size:14px;margin-bottom:4px;}
  .value .v .d{font-size:12.5px;color:#4b5563;}
  .callout{background:linear-gradient(135deg,#fbe9e2,#fdf1ec);border:1px solid #e8a48f;border-radius:12px;padding:16px 18px;margin:16px 0;font-size:14px;color:#5a3527;}
  .callout b{color:var(--red);}
  /* 2축 개요 매트릭스 */
  .matrix{width:100%;border-collapse:separate;border-spacing:6px;margin:8px 0 6px;}
  .matrix th{font-size:11.5px;color:var(--muted);font-weight:700;padding:3px 6px;text-align:center;}
  .matrix th.rh{text-align:right;white-space:nowrap;color:var(--navy2);}
  .matrix td{background:#fff;border:1px solid var(--line);border-radius:9px;padding:7px;vertical-align:top;min-width:150px;}
  .matrix td.act{background:#fff8f0;border-color:#f0d2ac;}
  .mchip{display:block;font-size:11.5px;font-weight:700;text-decoration:none;border-radius:6px;padding:4px 8px;margin:3px 0;line-height:1.35;}
  .mchip.t1{background:#fdecea;color:#a63a24;border:1px solid #f0c3b8;}
  .mchip.t2{background:#fdf0e0;color:#a35f0a;border:1px solid #f0d6ac;}
  .mchip.t3{background:#eef1f5;color:#5b6472;border:1px solid #d9dfe8;}
  .mchip .tinylabel{font-weight:500;color:inherit;opacity:.75;font-size:10.5px;}
  .mempty{color:#c2c9d4;font-size:11px;text-align:center;padding:6px 0;}
  .legend{display:flex;flex-wrap:wrap;gap:14px;background:#eef2f8;border:1px solid var(--line);border-radius:10px;padding:11px 14px;margin:6px 0 18px;font-size:12px;color:#3a4453;}
  .legend .g{display:flex;gap:6px;align-items:center;flex-wrap:wrap;}
  .legend b{color:var(--navy2);}
  /* 카드 */
  .action{background:#fff;border:1px solid var(--line);border-radius:12px;margin-bottom:14px;box-shadow:0 1px 3px rgba(20,30,50,.04);overflow:hidden;scroll-margin-top:12px;}
  .action .top{display:flex;align-items:center;gap:8px;padding:12px 16px;background:#f0f3f8;border-bottom:1px solid var(--line);flex-wrap:wrap;}
  .action .top .ttl{font-weight:800;color:var(--navy);font-size:14.5px;flex:1;min-width:200px;}
  .action .body{padding:13px 16px;}
  .row{display:flex;gap:10px;margin:7px 0;font-size:13px;align-items:flex-start;}
  .row .k{flex-shrink:0;width:104px;font-weight:700;color:var(--navy2);font-size:12px;padding-top:1px;}
  .row .val{flex:1;color:#374151;}
  .step-tag{display:inline-block;font-size:10.5px;font-weight:800;color:#fff;border-radius:5px;padding:1px 6px;margin-right:5px;vertical-align:1px;}
  .st1{background:#5a6b86;} .st2{background:var(--orange);} .st3{background:#2f6db0;} .st4{background:var(--green);}
  .gist{font-size:12.5px;color:#4b5563;background:#f7f9fc;border-left:3px solid var(--line);border-radius:0 5px 5px 0;padding:6px 10px;margin-top:3px;}
  .kwc{margin-top:8px;background:#fbf6ee;border:1px solid #f0d9b8;border-radius:8px;padding:8px 11px;font-size:12px;}
  .kwc .lbl{display:block;font-weight:800;color:var(--orange);font-size:11px;margin-bottom:5px;}
  .kwc .pair{display:flex;flex-wrap:wrap;align-items:center;gap:7px;margin:3px 0;}
  .kwc .kw-new{background:#e2f0e6;color:#1f7a4d;border-radius:5px;padding:2px 8px;font-weight:700;}
  .kwc .kw-del{background:#f4e3e0;color:#9a4a38;border-radius:5px;padding:2px 8px;text-decoration:line-through;text-decoration-color:#c8492e99;}
  .kwc .kw-keep{background:#eef1f5;color:#5b6472;border-radius:5px;padding:2px 8px;}
  .kwc .kw-sub{background:#f4e3e0;color:#9a4a38;border-radius:5px;padding:2px 8px;}
  .kwc .arw{color:var(--muted);font-weight:800;}
  .kwc .note{color:var(--muted);font-size:11px;}
  .ca{margin-top:4px;}
  .ca .ci{font-size:12.5px;color:#5a3527;background:#fdf3ee;border-left:3px solid #e8a48f;border-radius:0 5px 5px 0;padding:5px 10px;margin-top:3px;}
  .verif{font-size:12px;color:#334155;background:#eef4fb;border:1px solid #cfe0f2;border-radius:8px;padding:7px 11px;margin-top:5px;}
  .verif b{color:#2f6db0;}
  .verif .miss{color:var(--red);}
  .act{font-size:13px;color:#1f3d2e;background:#eef8f2;border-left:3px solid var(--green);border-radius:0 5px 5px 0;padding:8px 11px;margin-top:3px;}
  .act .who{font-weight:700;color:#155a3a;}
  .badge{display:inline-block;font-size:11px;font-weight:700;padding:3px 9px;border-radius:20px;white-space:nowrap;}
  .b-t1{background:var(--red);color:#fff;} .b-t2{background:var(--orange);color:#fff;} .b-t3{background:#8a94a3;color:#fff;}
  .v-confirmed{background:#e2f5ec;color:var(--green);border:1px solid #b6e2cc;}
  .v-rw{background:#eaf0fb;color:#2b5fb0;border:1px solid #b9cdec;}
  .v-hold{background:#fff1e0;color:#b06a00;border:1px solid #f0d6ac;}
  .v-exclude{background:#eef1f5;color:var(--gray);border:1px solid #d9dfe8;}
  .conf{font-size:11px;font-weight:700;padding:3px 9px;border-radius:20px;white-space:nowrap;}
  .c-hi{background:#e2f5ec;color:var(--green);} .c-md{background:#fff1e0;color:var(--orange);} .c-lo{background:#eef1f5;color:var(--gray);}
  .hop{font-size:10.5px;font-weight:700;color:var(--muted);background:#f1f4f8;border:1px solid var(--line);border-radius:20px;padding:2px 8px;}
  .kind{font-size:10.5px;font-weight:700;color:#2f6db0;background:#eef4fb;border:1px solid #cfe0f2;border-radius:20px;padding:2px 8px;}
  .risk{font-size:12px;font-weight:700;color:var(--red);}
  footer{margin-top:34px;padding-top:16px;border-top:1px solid var(--line);font-size:12px;color:var(--muted);}
  code{background:#eef1f5;border-radius:4px;padding:1px 5px;font-size:12px;color:var(--navy2);}
  .disc{font-size:12.5px;color:#4b5563;background:#f4f7fb;border:1px dashed #b9c8e0;border-radius:8px;padding:12px 14px;margin-top:8px;}
  .disc ul{margin:6px 0 0;padding-left:18px;} .disc li{margin:2px 0;}
""".strip("\n")


def sort_key(it):
    return (it["tier"], VERDICT[it["verdict"]][2], CONF[it["confidence"]][2])


def matrix(items):
    cols = ["확정 · 지금 조치", "검토 대상 · 검토 큐", "보류/영향없음"]
    grid = {(t, c): [] for t in (1, 2, 3) for c in range(3)}
    for it in items:
        col = VERDICT[it["verdict"]][3]
        grid[(it["tier"], col)].append(it)
    out = ['<table class="matrix"><thead><tr><th class="rh"></th>']
    for c in cols:
        out.append(f'<th>{c}</th>')
    out.append('</tr></thead><tbody>')
    for t in (1, 2, 3):
        out.append(f'<tr><th class="rh">{TIER[t][0]}</th>')
        for c in range(3):
            cell = grid[(t, c)]
            cls = "act" if (t == 1 and c == 0) else ""
            out.append(f'<td class="{cls}">')
            if cell:
                for it in cell:
                    out.append(
                        f'<a class="mchip t{t}" href="#{it["id"]}">{it["title"]}'
                        f'<span class="tinylabel"> · {CONF[it["confidence"]][0]}</span></a>')
            else:
                out.append('<div class="mempty">—</div>')
            out.append('</td>')
        out.append('</tr>')
    out.append('</tbody></table>')
    return "".join(out)


def kwdiff(diffs):
    rows = ['<div class="kwc"><span class="lbl">키워드 변경 요약</span>']
    for d in diffs:
        op = d["op"]
        note = f'<span class="note">— {d["note"]}</span>' if d.get("note") else ""
        rows.append(
            f'<div class="pair"><span class="{KWOP[op]}">{d["old"]}</span>'
            f'<span class="arw">{KWARROW[op]}</span>'
            f'<span class="kw-new">{d["new"]}</span>{note}</div>')
    rows.append('</div>')
    return "".join(rows)


def card(it):
    tlab, tcss = TIER[it["tier"]]
    vlab, vcss, _, _ = VERDICT[it["verdict"]]
    clab, ccss, _ = CONF[it["confidence"]]
    p, a, inf, act = it["prior"], it["amendment"], it["inference"], it["action"]
    h = [f'<div class="action" id="{it["id"]}">']
    h.append('<div class="top">')
    h.append(f'<span class="ttl">{it["title"]}</span>')
    h.append(f'<span class="badge {tcss}">{tlab} · {it["tier_label"]}</span>')
    h.append(f'<span class="badge {vcss}">{vlab}</span>')
    h.append(f'<span class="conf {ccss}">{clab}</span>')
    h.append(f'<span class="hop">{HOP[it["hop"]]}</span>')
    h.append(f'<span class="kind">{KIND[it["action_kind"]]}</span>')
    h.append('</div><div class="body">')

    # ① 기존 해석
    h.append('<div class="row"><div class="k"><span class="step-tag st1">① 기존</span>기존 해석</div><div class="val">')
    h.append(f'{p["source_no"]}' + (f' — {p["source_title"]}' if p.get("source_title") else ''))
    h.append(f'<div class="gist">{p["gist"]}</div></div></div>')

    # ② 개정 + 키워드 변경
    h.append('<div class="row"><div class="k"><span class="step-tag st2">② 개정</span>개정</div><div class="val">')
    h.append(f'{a["article_path"]} — {a["text"]}')
    meta = []
    if a.get("effective_date"):
        meta.append(f'적용 {a["effective_date"]}')
    if a.get("change_type"):
        meta.append(a["change_type"])
    if meta:
        h.append(f'<div class="gist">{" · ".join(meta)}</div>')
    if a.get("keyword_diff"):
        h.append(kwdiff(a["keyword_diff"]))
    h.append('</div></div>')

    # ③ 변경 해석 유추
    h.append('<div class="row"><div class="k"><span class="step-tag st3">③ 유추</span>변경 해석 유추</div><div class="val">')
    h.append(inf["delta"])
    if inf.get("counter_args"):
        h.append('<div class="ca">')
        for ca in inf["counter_args"]:
            h.append(f'<div class="ci"><b>반대논거:</b> {ca}</div>')
        h.append('</div>')
    if inf.get("direct_check"):
        dc = inf["direct_check"]
        h.append(f'<div class="verif"><b>직접 확인:</b> {dc["source_no"]} — {dc["gist"]}</div>')
    if inf.get("verification"):
        v = inf["verification"]
        vtxt = f'<b>적대 검증:</b> {v["lenses"]}개 독립 관점 중 {v["refuted"]}개가 flip(뒤집힘) 반증 → {v.get("note","")}'
        if v.get("miss_scope"):
            vtxt += f' <span class="miss">(놓치는 범위: {v["miss_scope"]})</span>'
        h.append(f'<div class="verif">{vtxt}</div>')
    h.append('</div></div>')

    # 리스크
    if inf.get("risk"):
        r = inf["risk"]
        h.append('<div class="row"><div class="k">리스크</div><div class="val">')
        h.append(f'<span class="risk">{r["label"]}</span> — {r["detail"]}</div></div>')

    # ④ 선제 대응
    h.append('<div class="row"><div class="k"><span class="step-tag st4">④ 대응</span>선제 대응</div><div class="val">')
    h.append(f'<div class="act"><span class="who">대상: {act["who"]}</span><br>{act["do"]}')
    if act.get("review_question"):
        h.append(f'<br><b>확인 질문:</b> {act["review_question"]}')
    h.append('</div></div></div>')

    h.append('</div></div>')
    return "".join(h)


def render(d):
    m = d["meta"]
    items = sorted(d["items"], key=sort_key)
    H = ['<!DOCTYPE html>', '<html lang="ko"><head>',
         '<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">',
         f'<title>{m["title"]}</title>', f'<style>{CSS}</style></head><body>']
    # header
    H.append('<header><div class="wrap">')
    H.append(f'<span class="tag">{m["tag"]}</span>')
    H.append(f'<h1>{m["h1_line1"]}<br>{m["h1_line2"]}</h1>')
    H.append(f'<p>{m["intro"]}</p>')
    H.append('</div></header><div class="wrap">')
    # value props
    H.append('<div class="value">')
    for v in d["value_props"]:
        H.append(f'<div class="v"><div class="h">{v["h"]}</div><div class="d">{v["d"]}</div></div>')
    H.append('</div>')
    # why now
    H.append(f'<div class="callout">{d["why_now"]}</div>')
    # 2축 매트릭스 + legend
    H.append('<h2><span class="n">◆</span>우선순위 개요 — 심각도(행) × 확신도(열)</h2>')
    H.append('<p class="lead">왼쪽 위(1순위 × 확정)일수록 먼저 조치. 칩을 누르면 해당 항목으로 이동한다.</p>')
    H.append(matrix(items))
    H.append(
        '<div class="legend">'
        '<span class="g"><b>심각도</b> 1순위=분류 변동(면세↔과세) · 2순위=효과·과표 변동 · 3순위=단순 정리</span>'
        '<span class="g"><b>확신도</b> 검증 완료 · 검토 대상(확정 아님) · 보류 · 영향 없음</span>'
        '<span class="g"><b>단계</b> 0단계=직접근거(자명) · ≥1단계=추론근거(비자명)</span>'
        '</div>')
    # cards
    H.append('<h2><span class="n">▸</span>항목별 실행 카드 <span style="font-size:13px;font-weight:500;color:#6b7482">— 기존 해석 → 개정(키워드 변경) → 변경 해석 유추 → 선제 대응</span></h2>')
    for it in items:
        H.append(card(it))
    # monitoring
    mo = d["monitoring"]
    H.append(f'<h2><span class="n">◇</span>{mo["title"]}</h2>')
    H.append('<div class="disc">')
    H.append('<b>자동으로 잘 잡히는 유형</b><ul>')
    for w in mo["works_on"]:
        H.append(f'<li>{w}</li>')
    H.append('</ul><b>아직 놓치는 범위(은폐 없음)</b><ul>')
    for w in mo["misses"]:
        H.append(f'<li>{w}</li>')
    H.append('</ul>')
    H.append(f'<div style="margin-top:8px"><b>개선 레버:</b> {" · ".join(mo["fix_levers"])}</div>')
    H.append(f'<div style="margin-top:4px"><b>측정:</b> {mo["metric"]}</div>')
    H.append('</div>')
    # footer
    H.append(f'<footer>{m["footer"]}</footer>')
    H.append('</div></body></html>')
    return "\n".join(H)


def main():
    d = json.loads(DATA.read_text(encoding="utf-8"))
    html = render(d)
    OUT.write_text(html, encoding="utf-8")
    n = len(d["items"])
    print(f"rendered {n} items -> {OUT}")


if __name__ == "__main__":
    main()
