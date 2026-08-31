#!/usr/bin/env python3
"""1단계(미적 독립 검토)용 스크린샷 생성기.

용법: python3 shots.py <html 경로> [--widths 1440,500] [--slice 2200]

**왜 있는가.** 예전에는 검토 에이전트가 직접 브라우저를 열어 위에서 아래로 스크롤하며
스크린샷을 찍었다. 그 왕복(내비게이트 → 스크롤 → 캡처 → 스크롤 → …)이 루프에서 제일
비싼 구간이었고, 게다가 섹션을 건너뛰어도 아무도 몰랐다. 여기서 미리 **페이지 전체를
빠짐없이** 찍어두면 검토자는 Read만 하면 된다 — 빠르고, 커버리지가 보장된다.

**시간의 거의 전부가 Chrome 콜드 스타트(실측 3~4초/회)다.** 그래서 호출 수를 페이지에
맞춰 고른다 — 페이지를 두 종류로 갈라 본다:

  · **뷰포트 단위(`vh`)도 `position:fixed`·`sticky`도 없는 페이지** → 창 높이를 문서 전체
    높이로 키워 **한 번에** 찍는다(폭당 2회). 이 경우 두 방식의 결과가 같다
  · **그 둘 중 하나라도 있는 페이지** → 뷰포트를 900px로 고정하고 900px씩 스크롤하며 찍어
    문서 좌표에 이어붙인다(폭당 1+N회). 창을 문서 높이로 키우면 `100vh` 히어로가 그만큼
    늘어나 화면을 통째로 먹는다 — 실측으로 히어로가 스크린샷의 100%를 차지하고 나머지
    섹션이 사라졌다. 검토자가 보는 화면이 사용자가 보는 화면과 달라지면 이 단계 자체가
    무의미하므로 그런 페이지에서는 느려도 실제 뷰포트 기준으로 찍는다.
    이어붙일 때 고정 헤더가 조각마다 겹쳐 줄무늬가 되므로 두 번째 조각부터는
    `fixed`·`sticky` 요소를 숨긴다.

두 경로 모두 마지막에 읽을 수 있는 크기(기본 2200px)로 잘라 `<stem>.shot-<폭>-<n>.png`로
저장하고, 검토 시점의 html 사본과 `feel-review.json` 골격을 만들어준다.

폭은 두 개가 기본이다: 1440px(데스크톱)과 500px(좁은 폭, CLI 헤드리스의 뷰포트 하한).
390px 같은 그 아래 폭의 **기계 측정**은 `render_audit.py`가 iframe으로 따로 한다.
"""

import concurrent.futures
import json
import os
import re
import subprocess
import sys
from pathlib import Path

import feel_review
from render_audit import find_chrome, serve

DEFAULT_WIDTHS = [1440, 500]
VIEWPORT_H = 900          # 실제 데스크톱 뷰포트 — vh 단위가 이 값을 기준으로 잡힌다
SLICE_H = 2200            # 조각 하나의 높이 — 이보다 길면 클라이언트가 축소해 글자가 뭉갠다
MAX_CAPTURES = 14         # 폭당 캡처 상한(=12,600px). 초과분은 알리고 자른다
VIEWPORT_FLOOR = 500
SHOT_BUDGET = 2500        # 캡처용 virtual-time budget. 이 스킬의 entrance 상한이 600ms라 충분하다
WORKERS = max(2, min(8, (os.cpu_count() or 4) - 2))

# 해시(#y=…)로 스크롤 위치를 받는다 — 조각마다 임시 파일을 새로 쓰지 않으려고 URL만 바꾼다.
SHOT_JS = """
<script>addEventListener('load',function(){setTimeout(function(){
  var m=/y=(\\d+)/.exec(location.hash), y=m?+m[1]:0;
  if(y>0){[].forEach.call(document.querySelectorAll('body *'),function(el){
    var p=getComputedStyle(el).position;
    if(p==='fixed'||p==='sticky') el.style.visibility='hidden';});}
  window.scrollTo(0,y);
  var d=document.createElement('div'); d.id='__h__';
  d.textContent=document.documentElement.scrollHeight;
  document.body.appendChild(d);},300);});</script>
"""


def _chrome_args(chrome, width, height, budget=SHOT_BUDGET):
    return [chrome, "--headless", "--disable-gpu", "--hide-scrollbars", "--no-sandbox",
            f"--window-size={width},{height}", f"--virtual-time-budget={budget}"]


def measure(chrome, url, width):
    proc = subprocess.run(_chrome_args(chrome, width, VIEWPORT_H) + ["--dump-dom", url],
                          capture_output=True, text=True, timeout=180)
    m = re.search(r'id="__h__">(\d+)<', proc.stdout)
    return int(m.group(1)) if m else VIEWPORT_H


def capture(chrome, url, width, out, window_h=VIEWPORT_H):
    subprocess.run(_chrome_args(chrome, width, window_h) + [f"--screenshot={out}", url],
                   capture_output=True, text=True, timeout=300)
    return out.exists()


VIEWPORT_DEPENDENT = re.compile(
    r'\b\d*\.?\d+(?:vh|dvh|svh|lvh)\b|position\s*:\s*(?:fixed|sticky)', re.I)


def needs_scroll_capture(src):
    """스크롤 조각내기가 필요한 페이지인가.

    창 높이를 문서 전체로 키워 한 장에 담는 쪽이 Chrome 호출이 절반이라 훨씬 빠른데,
    `100vh` 히어로나 `position:fixed` 헤더가 있으면 그 방식이 화면을 왜곡한다(실측: vh
    히어로가 스크린샷의 100%를 먹고 나머지 섹션이 통째로 사라졌다). 그런 요소가 **없는**
    페이지에서는 두 방식의 결과가 같으므로 빠른 쪽을 쓴다."""
    return bool(VIEWPORT_DEPENDENT.search(src))


def offsets_for(height):
    """스크롤 위치 목록. 마지막은 문서 끝에 붙도록 클램프한다(겹치는 건 이어붙일 때 덮인다)."""
    if height <= VIEWPORT_H:
        return [0], False
    steps = []
    y = 0
    while y < height - VIEWPORT_H and len(steps) < MAX_CAPTURES:
        steps.append(y)
        y += VIEWPORT_H
    truncated = len(steps) >= MAX_CAPTURES
    last = min(height - VIEWPORT_H, MAX_CAPTURES * VIEWPORT_H)
    if not truncated and last not in steps:
        steps.append(last)
    return steps, truncated


def stitch_and_slice(parts, width, height, out_fmt, slice_h):
    """조각들을 문서 좌표에 붙여 전체 페이지를 만든 뒤 읽을 수 있는 크기로 자른다.

    Pillow가 없으면 붙이지 않고 뷰포트 조각을 그대로 쓴다 — 느리게 읽힐 뿐 내용은 같다.
    """
    try:
        from PIL import Image
    except ImportError:
        return [p for _y, p in parts], "Pillow 없음 — 뷰포트 조각(900px)을 그대로 뒀다"

    full = Image.new("RGB", (width, height), (255, 255, 255))
    for y, path in parts:
        with Image.open(path) as im:
            box = im.convert("RGB")
            paste_h = min(box.height, height - y)
            full.paste(box.crop((0, 0, width, paste_h)), (0, y))
    for _y, path in parts:
        path.unlink(missing_ok=True)

    cuts = []
    if height <= slice_h * 1.3:
        out = Path(out_fmt.format(1))
        full.save(out)
        return [out], ""
    for i in range(-(-height // slice_h)):
        top, bottom = i * slice_h, min(height, (i + 1) * slice_h)
        out = Path(out_fmt.format(i + 1))
        full.crop((0, top, width, bottom)).save(out)
        cuts.append(out)
    return cuts, ""


def shoot(pool, chrome, base_url, width, out_dir, stem, slice_h, scroll_mode):
    """높이를 재고(1회) 조각을 **동시에** 캡처한다.

    높이를 모르는 채로 조각을 넘겨짚어 미리 걸어보기도 했는데, 8코어에서 폭 2종 × 넘겨짚기
    4조각이면 Chrome이 10개가 동시에 뜨면서 서로를 느리게 만들어 오히려 손해였다(실측
    13.7초 → 22.8초). 필요한 조각만 찍는다."""
    part = lambda y: out_dir / f".{stem}-part-{width}-{y}.png"
    height = measure(chrome, base_url, width)
    if not scroll_mode:
        # 빠른 경로 — 창을 문서 높이만큼 키워 한 번에 찍는다(Chrome 호출 2회/폭)
        capped = min(height, MAX_CAPTURES * VIEWPORT_H)
        full = part(0)
        if not capture(chrome, base_url, width, full, window_h=capped):
            return width, [], "캡처 실패"
        cuts, note = stitch_and_slice([(0, full)], width, capped,
                                      str(out_dir / f"{stem}.shot-{width}-{{}}.png"), slice_h)
        if height > capped:
            note = (note + " · " if note else "") + f"세로 {height}px 중 {capped}px까지만 찍었다"
        return width, cuts, note
    steps, truncated = offsets_for(height)
    futures = {y: pool.submit(capture, chrome, f"{base_url}#y={y}", width, part(y)) for y in steps}
    parts = [(y, part(y)) for y in steps if futures[y].result()]
    if not parts:
        return width, [], "캡처 실패"
    parts.sort()
    captured_h = min(height, max(y for y, _p in parts) + VIEWPORT_H)
    cuts, note = stitch_and_slice(parts, width, captured_h, str(out_dir / f"{stem}.shot-{width}-{{}}.png"), slice_h)
    if truncated:
        note = (note + " · " if note else "") + f"세로 {height}px 중 {captured_h}px까지만 찍었다 — 그 아래는 직접 확인한다"
    return width, cuts, note


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    flags = sys.argv[1:]
    widths = DEFAULT_WIDTHS
    slice_h = SLICE_H
    if "--widths" in flags:
        widths = [int(x) for x in flags[flags.index("--widths") + 1].split(",")]
    if "--slice" in flags:
        slice_h = int(flags[flags.index("--slice") + 1])
    if len(args) != 1:
        print(__doc__)
        sys.exit(2)

    html = Path(args[0]).resolve()
    if not html.exists():
        print(f"파일 없음: {html}")
        sys.exit(2)

    chrome = find_chrome()
    if not chrome:
        print("Chrome/Chromium 실행 파일을 못 찾았다 — 스크린샷 없이 검토받으려면 html을 직접 열어 보여준다.")
        sys.exit(2)

    clamped = [w for w in widths if w < VIEWPORT_FLOOR]
    widths = sorted({max(w, VIEWPORT_FLOOR) for w in widths}, reverse=True)

    src_bytes = html.read_bytes()
    src = src_bytes.decode("utf-8", "replace")
    injected = src.replace("</body>", SHOT_JS + "</body>") if "</body>" in src else src + SHOT_JS

    # 이전 회차 조각이 남아 있으면 검토자가 옛 화면을 본다 — 먼저 지운다
    for old in html.parent.glob(f"{html.stem}.shot-*.png"):
        old.unlink(missing_ok=True)

    scroll_mode = needs_scroll_capture(src)

    shot_src = html.parent / f".{html.stem}.shot-src.html"
    shot_src.write_text(injected, encoding="utf-8")
    httpd, port = serve(html.parent)
    made, notes = {}, []
    try:
        base_url = f"http://127.0.0.1:{port}/{shot_src.name}"
        with concurrent.futures.ThreadPoolExecutor(max_workers=WORKERS + len(widths)) as pool:
            futures = [pool.submit(shoot, pool, chrome, base_url, w, html.parent, html.stem, slice_h, scroll_mode)
                       for w in widths]
            for fut in concurrent.futures.as_completed(futures):
                w, cuts, note = fut.result()
                made[w] = cuts
                if note:
                    notes.append(f"{w}px: {note}")
    finally:
        httpd.shutdown()
        shot_src.unlink(missing_ok=True)

    if not any(made.values()):
        print("스크린샷을 하나도 만들지 못했다. html이 열리는지, Chrome이 실행되는지 확인한다.")
        sys.exit(2)

    # 검토 시점 사본 — 나중에 "색값만 바뀌었나"를 기계로 판정하는 기준이 된다
    feel_review.snapshot_path(html).write_bytes(src_bytes)

    mode = (f"뷰포트 {VIEWPORT_H}px로 스크롤하며 캡처 — vh 단위/고정 요소가 있어 전체 캡처는 화면을 왜곡한다"
            if scroll_mode else "전체 페이지 1회 캡처 — vh 단위·고정 요소가 없어 왜곡 위험이 없다")
    print(f"\n=== {html.name} — 1단계용 스크린샷 ({mode}) ===\n")
    for w in sorted(made, reverse=True):
        for p in made[w]:
            print(f"  {w}px  {p}")
    for n in notes:
        print(f"  참고 — {n}")
    if clamped:
        print(f"  참고 — {', '.join(str(w) for w in clamped)}px는 CLI 헤드리스 하한 때문에 {VIEWPORT_FLOOR}px로 올려 찍었다"
              f"(그 아래 폭의 기계 측정은 render_audit.py가 iframe으로 한다)")

    skeleton = {"html_sha256": feel_review.sha256(src_bytes), "findings": ["<검토자가 찾은 결함 — 없으면 빈 배열>"]}
    print(f"\n검토가 끝나면 아래 골격에 findings만 채워 `{feel_review.path_for(html).name}`으로 저장한다:\n")
    print(json.dumps(skeleton, ensure_ascii=False, indent=1))
    print("\n  · 위 스크린샷 경로를 그대로 검토 에이전트에게 주고 Read로 보게 한다(브라우저를 다시 열 필요 없다)")
    print("  · findings가 비어 있어야 코드 게이트로 넘어간다")
    print("  · 이후 코드 게이트에서 **색값만** 고친 경우엔 재검토 없이 이 기록이 유효하다"
          f"(구조 지문 일치 + 색 선언 {feel_review.COLOR_DIFF_LIMIT}곳 이하). 구조·문구·수치를 고쳤으면 다시 이 스크립트부터 돈다\n")


if __name__ == "__main__":
    main()
