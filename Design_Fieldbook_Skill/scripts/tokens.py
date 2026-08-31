#!/usr/bin/env python3
"""design-fieldbook 토큰 스타터 — 시드 색 + 톤 → 검증된 토큰 블록.

용법:
    python3 tokens.py <시드 hex> <톤> [--density 고밀도] [--dark] [--semantic] [--앱|--문서]

    python3 tokens.py '#1F4D3D' 절제 --density 고밀도
    python3 tokens.py '#4C9AFF' 절제 --dark --semantic
    python3 tokens.py '#C6B9A8' 절제 --no-accent    # 채도 있는 액센트 없이 중립 4단으로

왜 필요한가 — 지금까지 게이트에 걸린 것들 중 상당수는 "판단"이 아니라 **토큰 값 하나를
손으로 잘못 고른 것**이었다. `--outline`을 배경색과 같은 계열로 잡아 구분선이 1.00:1이
되거나, 절제를 선언하고 채도 100% 시드를 쓰거나, 배경과 표면 델타가 10 미만이거나.
전부 계산으로 결정되는 값인데 사람이 감으로 고르고 나중에 게이트가 잡는 구조였다.

이 스크립트는 그 값들을 **계산해서 내놓고, 내놓기 전에 스스로 검증한다.** 작성자는
시드 색조와 톤만 정하면 되고, 대비·델타·채도 밴드를 손으로 맞출 일이 없어진다.

내놓는 것:
  - 액센트 램프 6단 (fill / hi / container / container-2 / on-container / on-acc-2)
  - 중립 잉크 3단 + 배경 + 섹션 밴드 + 표면 + 구분선(outline) + 다크 밴드용 2단
  - 타입 스케일 8토큰 (인접 최소 1.13배)
  - 여백 6단 (2px 배수, 인접 최소 1.5배)
  - 모션 토큰 (MD3 duration 4단 + easing 4종 + 변위 2종) — 장르로 productive/expressive 결정
  - `/* plan */` 블록 뼈대

보장하는 것(전부 emit 전에 실측 확인):
  - 시드 채도가 톤 밴드를 넘으면 밴드 안으로 내려서 쓴다(넘긴 채로 내보내지 않는다)
  - fill 위 흰 글씨 ≥ 4.5:1 · container 위 on-container ≥ 4.5:1
  - ink-2 ≥ 7:1, ink-3 ≥ 4.5:1 (배경·표면 양쪽)
  - outline ≥ 3:1 (배경·표면 양쪽, WCAG 1.4.11)
  - 배경 vs 표면 RGB 델타 ≥ 10, 밴드 vs 배경 델타 ≥ 12, 배경이 레시피 예시 베이지와 충분히 다름
"""

import re
import sys

# 밴드 지표는 HSL 채도가 아니라 크로마 (max-min)/255다 — HSL S는 최대 채널이 255이기만
# 하면 아무리 밝아도 1.00이라, 산성 라임과 평범한 다크 UI 블루가 구별되지 않는다.
# 밴드 경계는 수상작 팔레트 37종 실측에서 다시 잡았다. 예전 절제 상한 0.78은 사실상
# 아무것도 막지 못했다 — 그 기준이면 게이밍 라임(#DAFF47, 크로마 0.72)도 '절제'로
# 통과한다. 실측에서 절제로 읽히는 팔레트(Ceragres·Measured·Zorge 9·Duyu Care)는 전부
# 크로마 0.17 이하였다. 임팩트대(0.45~0.82)는 실측과 이미 맞아 그대로 둔다.
# 실측 표본은 전부 **마케팅/포트폴리오** 사이트다 — 그 밴드를 앱·문서에 그대로 씌우면
# 안 된다. 그 장르의 액센트는 장식이 아니라 기능색(링크·포커스·주요 액션)이라 채도가
# 높아야 눈에 띈다. 이 스킬의 문서 프로브(#0A5FB4)와 대시보드 프로브(#4C9AFF)가 둘 다
# 크로마 0.67~0.70인데 그게 그 장르에서는 올바른 선택이다. 그래서 장르로 나눈다.
TONE_CHROMA_MAX = {
    "마케팅": {"절제": 0.30, "중립": 0.65, "임팩트": 1.01},
    "앱":     {"절제": 0.78, "중립": 0.90, "임팩트": 1.01},
    "문서":   {"절제": 0.78, "중립": 0.90, "임팩트": 1.01},
}
TONE_CHROMA_MIN = {"절제": 0.00, "중립": 0.20, "임팩트": 0.45}

# 라이트 테마 중립의 색조 농도(HSL 채도). 예전에는 톤과 무관하게 배경 0.05였는데,
# 수상작 라이트 배경 34종의 채도 중앙값은 **0.28**(사분위 0.19~0.40)이었다 — 34종 중
# 33종이 우리보다 따뜻했다. "시드 색조를 옅게 섞는다"고 적어놓고 실제로는 회색을 냈던
# 것이고, 원인은 베이지 앵커링 FAIL을 피하려던 것이었다(그 검사는 WARN으로 낮췄다).
# 다크 테마는 손대지 않는다 — 수상작 다크 배경 33종의 채도 중앙값은 0.00이었다.
# 실측 사분위에 그대로 대응시킨다: 절제=하위 사분위(0.19) · 중립=중앙값(0.28) ·
# 임팩트=상위 사분위(0.40). L 0.93에서 이 채도들은 RGB 웜값 7·10·14로 나오는데,
# 수상작 라이트 배경의 웜값 분포(6~31, 중앙 ~11)와 겹친다.
TONE_NEUTRAL_S = {"절제": 0.19, "중립": 0.28, "임팩트": 0.40}
# 앱·문서는 밝은 면 위에 표·폼·코드가 얹히므로 색조를 마케팅만큼 태우지 않는다 —
# 실측 하위 사분위(0.19)로 고정한다.
NEUTRAL_S_UTILITY = 0.19

# 시맨틱 4색의 색조 — 관용적 의미(성공=초록, 경고=황, 오류=적, 정보=청)는 브랜드보다
# 우선한다. 색조만 고정하고 명도·크로마는 테마에 맞춰 계산한다.
SEMANTIC_HUES = {"ok": 140, "warn": 42, "err": 8, "info": 210}
ANCHOR_RGB = (0xEF, 0xE6, 0xDD)   # references 레시피의 베이지 — 이 색 '그대로'만 막는다(계열은 허용)


def hex_to_rgb(h):
    h = h.strip().lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def rgb_to_hex(rgb):
    return "#" + "".join(f"{max(0, min(255, int(round(c)))):02X}" for c in rgb)


def rgb_to_hsl(rgb):
    r, g, b = (c / 255 for c in rgb)
    mx, mn = max(r, g, b), min(r, g, b)
    light = (mx + mn) / 2
    if mx == mn:
        return 0.0, 0.0, light
    d = mx - mn
    sat = d / (2 - mx - mn) if light > 0.5 else d / (mx + mn)
    if mx == r:
        hue = ((g - b) / d) % 6
    elif mx == g:
        hue = (b - r) / d + 2
    else:
        hue = (r - g) / d + 4
    return hue * 60, sat, light


def hsl_to_rgb(h, s, light):
    h = (h % 360) / 360
    if s == 0:
        v = light * 255
        return (v, v, v)
    q = light * (1 + s) if light < 0.5 else light + s - light * s
    p = 2 * light - q

    def ch(t):
        t %= 1
        if t < 1 / 6:
            return p + (q - p) * 6 * t
        if t < 1 / 2:
            return q
        if t < 2 / 3:
            return p + (q - p) * (2 / 3 - t) * 6
        return p

    return tuple(c * 255 for c in (ch(h + 1 / 3), ch(h), ch(h - 1 / 3)))


def _lin(c):
    c /= 255
    return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4


def lum(rgb):
    return 0.2126 * _lin(rgb[0]) + 0.7152 * _lin(rgb[1]) + 0.0722 * _lin(rgb[2])


def contrast(a, b):
    la, lb = lum(a), lum(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)


def delta(a, b):
    return sum(abs(x - y) for x, y in zip(a, b)) / 3


def chroma(rgb):
    return (max(rgb) - min(rgb)) / 255


def fit_chroma(hue, sat, light, ceiling):
    """크로마가 상한을 넘지 않을 때까지 HSL 채도를 낮춘다 — 색조는 유지한다."""
    while sat > 0.01 and chroma(hsl_to_rgb(hue, sat, light)) > ceiling:
        sat -= 0.01
    return sat


def fit_fill(hue, sat, refs, ratio, ceiling, prefer_light):
    """대비 기준과 크로마 상한을 **동시에** 만족하는 fill을 찾는다.

    채도를 먼저 고정하고 명도를 고르면, 고른 명도에서 크로마가 다시 상한을 넘을 수 있다
    (다크 경로에서 실제로 그랬다). 채도를 낮춰가며 재-선택하는 루프가 필요하다.
    """
    # 무채 시드(S=0, 예: `#8A8A8A`)도 유효한 입력이다 — 무채 4단 체계의 자연스러운 시드다.
    # 예전 루프는 `while sat > 0.02`라 S=0을 한 번도 시도하지 못하고 "fill이 안 나온다"로
    # 종료했다. 0을 마지막에 반드시 한 번 시도한다.
    while True:
        got = pick_l(hue, sat, refs, ratio, prefer_light)
        if got and chroma(got[1]) <= ceiling:
            return sat, got[1]
        if sat <= 0.0:
            return None, None
        sat = max(0.0, sat - 0.02)


def fit_fill_dark(hue, sat, bg, ratio, ceiling, floor, seed_l, seed_c):
    """다크 테마의 액센트 fill — **시드에 가장 가까운 밝은 칩**을 찾는다.

    두 번 헛짚고 얻은 규칙이다. ① `prefer_light=True`만 주면 흰색(L=1.0, 크로마 0)이 나온다 —
    명도가 1에 가까울수록 크로마가 0으로 수렴하는데 대비 조건은 통과하기 때문이다.
    ② 크로마를 최대화하면 이번엔 시드보다 진해진다(라임 시드 0.72 → 0.95).
    수상작 다크 팔레트의 액센트는 **디자이너가 고른 그 색 그대로**다(#DAFF47 L 0.64 C 0.72 ·
    #CFEC5B 0.64/0.57 · #FE5B42 0.63/0.74 · #665BFF 0.68/0.64). 그러니 목표는 시드를 지키는
    것이고, 기준(대비·크로마 상한)에 걸릴 때만 **최소한으로** 옮긴다.
    """
    best, best_score = (None, None), None
    for light in [x / 200 for x in range(170, 50, -1)]:      # L 0.85 → 0.25
        s = fit_chroma(hue, sat, light, ceiling)
        rgb = tuple(round(c) for c in hsl_to_rgb(hue, s, light))
        c = chroma(rgb)
        if c < floor or c > ceiling:
            continue
        if contrast(rgb, tuple(round(x) for x in bg)) < ratio * 1.02:
            continue
        score = abs(light - seed_l) + abs(c - seed_c)
        if best_score is None or score < best_score:
            best, best_score = (s, rgb), score
    return best


def pick_l(hue, sat, refs, ratio, prefer_light):
    """주어진 hue/sat에서 refs 전부와 `ratio` 이상 대비를 내는 명도를 찾는다.

    prefer_light=True면 조건을 만족하는 가장 밝은 값, False면 가장 어두운 값을 고른다 —
    조건을 겨우 넘기는 값이 아니라 그 방향의 극단을 골라야 색이 탁해지지 않는다.
    """
    # 검증은 반드시 **emit되는 값**(hex로 반올림된 정수 RGB)으로 해야 한다.
    # float로 재고 hex로 내보내면 반올림에서 기준 아래로 떨어진다 — h라운드에서
    # 4.51:1로 통과시킨 시맨틱 색이 실제로는 4.48:1이었다.
    margin = 1.02
    candidates = []
    steps = 500
    for i in range(steps + 1):
        light = i / steps
        rgb = tuple(round(c) for c in hsl_to_rgb(hue, sat, light))
        if all(contrast(rgb, tuple(round(x) for x in ref)) >= ratio * margin for ref in refs):
            candidates.append((light, rgb))
    if not candidates:
        return None
    return candidates[-1] if prefer_light else candidates[0]


def dim_on_fill(hue, fill, toward_light):
    """액센트 면 위 **보조** 텍스트 — 주 on-color(흰/잉크)보다 한 단 죽이되 4.5:1을 지키는 값.

    이게 없으면 히어로·CTA처럼 액센트로 칠한 면에 위계를 주려 할 때마다 손으로 틴트를
    고르게 된다. i라운드에서 `--acc-cont-2`(표면용 틴트)를 그 자리에 썼다가 3.85:1이 났다.
    """
    fl = rgb_to_hsl(fill)[2]
    rng = range(501) if toward_light else range(500, -1, -1)
    for i in rng:
        light = i / 500
        if (toward_light and light <= fl) or (not toward_light and light >= fl):
            continue
        rgb = tuple(round(c) for c in hsl_to_rgb(hue, 0.26, light))
        if contrast(rgb, tuple(round(x) for x in fill)) >= 4.5 * 1.02:
            return rgb
    return None


def find_band(hue, bg, ink2, toward_light):
    """섹션 배경 밴드 — 페이지 배경과 RGB 델타 12 이상이면서 본문이 읽히는 면.

    가장 옅은 틴트(`--acc-cont-2`)를 밴드로 쓰면 배경과 델타 6이 나온다 — 코드에는
    섹션 전환이 있고 화면에는 없다. 밴드는 그 용도로 따로 계산해서 받는다.

    읽힘 기준은 `--ink-2`(배경 대비 7:1)로 잰다. `--ink-3`은 배경에서 이미 4.5:1을
    겨우 넘기는 값이라, 배경에서 델타 12만큼 떨어진 면 위에서는 원리적으로 못 지킨다 —
    밴드 위에 보조 텍스트를 얹으려면 `--ink-2`까지만 쓴다.
    """
    base_l = rgb_to_hsl(bg)[2]
    for i in range(500):
        light = base_l + (i / 700 if toward_light else -i / 700)
        if not 0.0 <= light <= 1.0:
            break
        cand = tuple(round(c) for c in hsl_to_rgb(hue, 0.14, light))
        if delta(cand, bg) >= 12 and contrast(cand, tuple(round(x) for x in ink2)) >= 4.5:
            return cand
    return None


def type_scale(base=16, steps_down=2, total=8, density="저밀도"):
    """인접 배율이 1.13 이상인 정수 px 스케일. 아래쪽은 촘촘, 위쪽은 성글게."""
    ratios = [1.15, 1.17, 1.19, 1.22, 1.27, 1.38, 1.42]
    if density == "고밀도":
        ratios = [1.15, 1.16, 1.18, 1.21, 1.26, 1.36, 1.40]
    sizes = [base]
    for _ in range(steps_down):
        sizes.insert(0, max(10, round(sizes[0] / ratios[0])))
    while len(sizes) < total:
        nxt = round(sizes[-1] * ratios[min(len(sizes) - 1, len(ratios) - 1)])
        if nxt / sizes[-1] < 1.13:
            nxt = int(sizes[-1] * 1.14) + 1
        sizes.append(nxt)
    return sizes[:total]


def space_scale(density="저밀도"):
    tiers = [4, 8, 16, 28, 56, 112]
    if density == "고밀도":
        tiers = [4, 8, 14, 24, 48, 96]
    return tiers


def main():
    raw = sys.argv[1:]
    flags = raw
    # `--density 고밀도`처럼 값이 따라오는 플래그의 값이 위치 인자로 새어들지 않게 뺀다
    args = [a for a in raw if not a.startswith("--") and a not in ("고밀도", "저밀도")]
    if len(args) != 2:
        print(__doc__)
        sys.exit(2)

    seed_hex, tone = args[0], args[1]
    if tone not in TONE_CHROMA_MIN:
        print(f"톤은 {'/'.join(TONE_CHROMA_MIN)} 중 하나여야 한다.")
        sys.exit(2)
    joined = " ".join(flags)
    density = "고밀도" if "고밀도" in joined else "저밀도"
    dark = "--dark" in flags
    want_semantic = "--semantic" in flags
    # 수상작 팔레트 중 절제로 읽히는 것들(Ceragres·Measured·Zorge 9·Duyu Care)은 채도 있는
    # 액센트가 **아예 없고** 중립 4단으로 위계를 만든다. 그동안 이 스킬은 항상 액센트를
    # 하나 만들어냈다 — 그것도 정당한 선택지로 연다.
    no_accent = "--no-accent" in flags
    # 모션 성격은 톤이 아니라 장르에서 나온다(motion.md §2.1 Productive vs Expressive) —
    # 작업 흐름 안이면 productive(빠르고 미묘), 감정적 순간이면 expressive(느리고 뚜렷).
    genre = "앱" if "--앱" in flags else ("문서" if "--문서" in flags else "마케팅")

    try:
        seed = hex_to_rgb(seed_hex)
    except (ValueError, IndexError):
        print(f"시드 색을 hex로 주세요 (예: '#1F4D3D'). 받은 값: {seed_hex}")
        sys.exit(2)

    hue, sat, _l = rgb_to_hsl(seed)
    c_max = TONE_CHROMA_MAX[genre][tone]
    if no_accent:
        c_max = 0.10          # 액센트를 '진한 중립'으로 만든다(실측 절제 팔레트 0.04~0.17대)
        if tone != "절제":
            notes.append("--no-accent는 절제 톤의 선택지다 — 다른 톤으로 선언했다면 톤 판정을 다시 본다.")
    # 고밀도 차감은 라이트에만 — 다크에서 액센트를 더 죽이면 어두운 면 위에서 안 보인다
    if density == "고밀도" and not dark:
        c_max = max(0.15, c_max - 0.15)
    c_min = 0.0 if no_accent else TONE_CHROMA_MIN[tone]

    notes = []
    if dark:
        notes.append("다크 테마 — 배경/표면 델타는 6 이상 + 보더 병행, 구분선은 RGB 델타 12 기준으로 잡습니다.")

    white = (255, 255, 255)

    # 액센트 램프. 라이트는 fill 위 흰 글씨, 다크는 어두운 면 위에서 읽히는 밝은 액센트가 기본이다.
    if dark:
        bg = hsl_to_rgb(hue, 0.10, 0.07)
        surface = hsl_to_rgb(hue, 0.09, 0.115)
        if delta(bg, surface) < 6:
            surface = hsl_to_rgb(hue, 0.09, 0.14)
        # 다크에서는 조건을 만족하는 **가장 밝은** 값을 고른다. 예전에는 가장 어두운 값을
        # 골랐는데, 그러면 라임·민트·옐로처럼 본래 밝은 색조가 전부 올리브로 내려앉았다
        # (실측: 시드 #DAFF47 L=0.64 → 우리 #6E8904 L=0.28). 수상작 다크 팔레트의 액센트는
        # 전부 밝은 칩이고(Razed #DAFF47 · Orgnzm #CFEC5B · Motiondeep #FE5B42) 그 위에
        # 어두운 글자를 얹는다 — `--on-acc-2`도 이미 어두운 쪽으로 계산하고 있었다.
        seed_l, seed_c = _l, chroma(seed)
        acc_s, fill = fit_fill_dark(hue, min(sat, 0.95), bg, 4.5, c_max, c_min, seed_l, seed_c)
        if fill is None:      # 크로마 하한을 못 지키면 하한 없이 다시 — 색조는 지킨다
            acc_s, fill = fit_fill_dark(hue, min(sat, 0.95), bg, 4.5, c_max, 0.0, seed_l, seed_c)
        if fill is None:
            print(f"\n  이 시드(H={hue:.0f}°)로는 다크 배경에서 대비 4.5:1과 크로마 상한 {c_max:.2f}를 "
                  f"동시에 만족하는 액센트가 안 나온다 — 톤을 다시 판정하거나 시드 색조를 바꾼다.\n")
            sys.exit(1)
        # fill이 이제 가장 밝은 값이므로 hover 단계는 위가 아니라 **아래로** 한 단 내린다
        hi = hsl_to_rgb(hue, acc_s, max(rgb_to_hsl(fill)[2] - 0.08, 0.22))
        if contrast(hi, bg) < 4.5:
            hi = hsl_to_rgb(hue, acc_s, min(rgb_to_hsl(fill)[2] + 0.06, 0.92))
        cont = hsl_to_rgb(hue, min(acc_s, 0.55), 0.20)
        cont2 = hsl_to_rgb(hue, min(acc_s, 0.50), 0.16)
        _, on_cont = pick_l(hue, min(acc_s, 0.60), [cont], 7.0, prefer_light=False)
        ink = hsl_to_rgb(hue, 0.06, 0.92)
        _, ink2 = pick_l(hue, 0.06, [bg, surface], 7.0, prefer_light=False)
        _, ink3 = pick_l(hue, 0.05, [bg, surface], 4.5, prefer_light=False)
        # 탐색은 float, 검증은 **반올림된 emit 값**으로 재고 있었다 — 경계에서 12.0이
        # 11.98로 떨어져 near-neutral 시드가 NG로 튕겼다. 같은 정수값으로 재고 여유 0.5를 둔다.
        outline = None
        for i in range(500):
            cand = tuple(round(c) for c in hsl_to_rgb(hue, 0.08, 0.10 + i / 800))
            if delta(cand, tuple(round(x) for x in bg)) >= 12.5 and \
               delta(cand, tuple(round(x) for x in surface)) >= 12.5:
                outline = cand
                break
        on_dark, on_dark3 = ink, ink3
        on_acc2 = dim_on_fill(hue, fill, toward_light=False)
        band = find_band(hue, bg, ink2, toward_light=True)
    else:
        acc_s, fill = fit_fill(hue, sat, [white], 4.5, c_max, prefer_light=True)
        if fill is None:
            print(f"\n  이 시드(H={hue:.0f}°)로는 흰 글씨 4.5:1과 크로마 상한 {c_max:.2f}를 "
                  f"동시에 만족하는 fill이 안 나온다 — 톤을 다시 판정하거나 시드 색조를 바꾼다.\n")
            sys.exit(1)
        hi = hsl_to_rgb(hue, acc_s, min(rgb_to_hsl(fill)[2] + 0.07, 0.62))
        if contrast(hi, white) < 4.5:
            hi = hsl_to_rgb(hue, acc_s, rgb_to_hsl(fill)[2] + 0.03)
        cont = hsl_to_rgb(hue, min(acc_s, 0.35), 0.86)
        cont2 = hsl_to_rgb(hue, min(acc_s, 0.35), 0.92)
        _, on_cont = pick_l(hue, min(acc_s, 0.40), [cont], 7.0, prefer_light=True)
        n_s = TONE_NEUTRAL_S[tone] if genre == "마케팅" else NEUTRAL_S_UTILITY
        if chroma(seed) < 0.02:
            n_s = 0.0      # 무채 시드(#8A8A8A 등)는 색조가 없다 — 회색을 회색으로 낸다
        bg = hsl_to_rgb(hue, n_s, 0.93)
        surface = white
        if delta(bg, surface) < 10:
            bg = hsl_to_rgb(hue, n_s, 0.91)
        ink = hsl_to_rgb(hue, 0.08, 0.11)       # 잉크는 실측과 이미 일치(S 0.07 · L 0.10)
        # 중간 중립은 실측에서 배경보다 더 진한 색조를 갖는다(수상작 중간 중립 S 중앙값 0.36).
        # 대비를 못 맞추면 채도를 단계적으로 낮춰 받는다 — 색조보다 가독성이 먼저다.
        def neutral(target_s, ratio):
            for factor in (1.0, 0.7, 0.45, 0.25):
                got = pick_l(hue, target_s * factor, [bg, surface], ratio, prefer_light=True)[1]
                if got is not None:
                    return got
            return None
        ink2 = neutral(n_s * 0.5, 7.0)
        ink3 = neutral(n_s * 0.7, 4.5)
        outline = neutral(n_s * 1.1, 3.0)
        _, on_dark = pick_l(hue, 0.04, [ink], 12.0, prefer_light=False)
        _, on_dark3 = pick_l(hue, 0.04, [ink], 4.5, prefer_light=False)
        on_acc2 = dim_on_fill(hue, fill, toward_light=True)
        band = find_band(hue, bg, ink2, toward_light=False)

    if on_acc2 is None or band is None:
        missing = "액센트 면 위 보조 텍스트" if on_acc2 is None else "섹션 밴드"
        print(f"  이 시드로는 {missing} 단계를 못 만든다 — 시드 색조를 바꾼다.\n")
        sys.exit(1)

    if outline is None:
        print("  이 시드로는 구분선 단계를 못 만든다 — 시드 색조를 바꾼다.\n")
        sys.exit(1)

    # 시맨틱 4색 — 상태가 있는 콘텐츠(대시보드·폼·알림)에는 color.md가 요구한다
    sem = {}
    if want_semantic:
        for name, sh in SEMANTIC_HUES.items():
            if dark:
                s_bg = hsl_to_rgb(sh, 0.45, 0.13)
                _, s_tx = pick_l(sh, 0.55, [s_bg], 4.5, prefer_light=False)
            else:
                s_bg = hsl_to_rgb(sh, 0.55, 0.92)
                _, s_tx = pick_l(sh, 0.60, [s_bg], 4.5, prefer_light=True)
            sem[name] = (s_tx, s_bg)

    fs = type_scale(density=density)
    sp = space_scale(density)

    q = lambda c: tuple(round(x) for x in c)
    fill, hi, cont, cont2, on_cont = map(q, (fill, hi, cont, cont2, on_cont))
    bg, surface, ink, ink2, ink3, outline = map(q, (bg, surface, ink, ink2, ink3, outline))
    on_dark, on_dark3 = q(on_dark), q(on_dark3)
    on_acc2, band = q(on_acc2), q(band)

    # fill 위 흰 글씨가 4.5:1을 겨우 넘기면 그 면에는 텍스트 **위계**를 만들 여지가 없다.
    # 그런데도 보조 색을 내놓으면 작성자가 있지도 않은 한 단을 찾아 틴트를 뒤진다.
    primary_on = ink if dark else (255, 255, 255)
    if delta(on_acc2, primary_on) < 10:
        notes.append("이 액센트는 fill 위 텍스트 한 단(--on-acc-2)이 주 on-color와 거의 같습니다 — "
                     "액센트 면 안의 위계는 색이 아니라 크기·weight·여백으로 만드세요.")
    sem = {k: (q(a), q(b)) for k, (a, b) in sem.items()}

    checks = [
        ("fill 위 대비", contrast(fill, bg if dark else white), 4.5),
        ("container 위 on-container", contrast(on_cont, cont), 7.0),
        ("ink-2 vs 배경", contrast(ink2, bg), 7.0),
        ("ink-3 vs 배경", contrast(ink3, bg), 4.5),
        ("ink-3 vs 표면", contrast(ink3, surface), 4.5),
        ("액센트 면 위 보조 텍스트", contrast(on_acc2, fill), 4.5),
        ("밴드 위 ink-2", contrast(ink2, band), 4.5),
    ]
    for name, (tx, sbg) in sem.items():
        checks.append((f"{name} 텍스트 vs {name} 면", contrast(tx, sbg), 4.5))

    bad = [(n, v, t) for n, v, t in checks if v < t]
    d_bs = delta(bg, surface)
    d_bs_floor = 6 if dark else 10
    if dark:
        line_ok = delta(outline, bg) >= 12 and delta(outline, surface) >= 12
        line_desc = f"구분선 RGB 델타 (배경 {delta(outline, bg):.0f} / 표면 {delta(outline, surface):.0f}, 기준 12)"
    else:
        line_ok = contrast(outline, bg) >= 3.0 and contrast(outline, surface) >= 3.0
        line_desc = f"구분선 대비 (배경 {contrast(outline, bg):.2f}:1 / 표면 {contrast(outline, surface):.2f}:1, 기준 3)"
    anchor_ok = dark or any(abs(a - b) > 4 for a, b in zip(bg, ANCHOR_RGB))
    acc_c = chroma(fill)

    print(f"\n=== 토큰 스타터 · 시드 {rgb_to_hex(seed)} · 톤 '{tone}' · {density} · {'다크' if dark else '라이트'} ===\n")
    for n in notes:
        print(f"  ※ {n}")
    if notes:
        print()

    print("  검증 (emit 전 실측):")
    for n, v, t in checks:
        print(f"    {'OK ' if v >= t else 'NG '} {n:<26} {v:5.2f}:1  (기준 {t})")
    d_band = delta(band, bg)
    print(f"    {'OK ' if d_bs >= d_bs_floor else 'NG '} {'배경 vs 표면 델타':<26} {d_bs:5.1f}    (기준 {d_bs_floor})")
    print(f"    {'OK ' if d_band >= 12 else 'NG '} {'밴드 vs 배경 델타':<26} {d_band:5.1f}    (기준 12)")
    print(f"    {'OK ' if line_ok else 'NG '} {line_desc}")
    print(f"    {'OK ' if anchor_ok else 'NG '} {'배경이 레시피 예시색 자체는 아님':<24} ")
    print(f"    {'OK ' if acc_c <= c_max + .01 else 'NG '} {'액센트 크로마 밴드':<26} {acc_c:5.2f}    (상한 {c_max:.2f}{' · 무채색 체계' if no_accent else ''})")
    print()

    if bad or d_bs < d_bs_floor or d_band < 12 or not anchor_ok or not line_ok or acc_c > c_max + .01:
        print("  검증 실패 — 이 시드로는 밴드를 만족하는 램프가 안 나온다. 시드 색조를 바꾼다.\n")
        sys.exit(1)

    semantic_block = ""
    if sem:
        lines = ["", "    /* 시맨틱 4색 — 상태가 있는 콘텐츠에는 액센트 대신 이쪽을 쓴다 */"]
        for name, (tx, sbg) in sem.items():
            lines.append(f"    --{name}:{rgb_to_hex(tx)}; --{name}-bg:{rgb_to_hex(sbg)};")
        semantic_block = "\n".join(lines) + "\n"

    # 모션 토큰 — MD3 16단계 duration + easing 매트릭스에서 이 페이지가 실제로 쓸 단만
    # 뽑는다(motion.md §3.1–3.2, m3.material.io 원문 확정치). 값을 계산하지 않고 그대로
    # 내놓는 이유는, 여기서의 실패가 "계산을 틀리는 것"이 아니라 `0.3s ease`처럼 **감으로
    # 고르는 것**이기 때문이다. 고를 여지를 없애는 것으로 충분하다.
    if genre == "마케팅":
        # expressive — 간헐적·감정적 순간. 느리고 뚜렷하게
        dur = [("short3", 150), ("short4", 200), ("medium2", 300), ("long1", 450)]
        entrance_ease = "--ease-emphasized-decel"
    else:
        # productive — 작업 흐름 안. 빠르고 미묘하게
        dur = [("short2", 100), ("short3", 150), ("short4", 200), ("medium2", 300)]
        entrance_ease = "--ease-decel"
    motion_block = "\n".join(
        ["", f"    /* 모션 — MD3 (motion.md §3.1–3.2) · {genre} = "
              f"{'expressive' if genre == '마케팅' else 'productive'} */"]
        + [f"    --dur-{n}:{v}ms;" for n, v in dur]
        + ["    --ease-standard:cubic-bezier(0.2, 0, 0, 1);      /* 이동 */",
           "    --ease-decel:cubic-bezier(0, 0, 0, 1);           /* 등장 */",
           "    --ease-accel:cubic-bezier(0.3, 0, 1, 1);         /* 퇴장 */",
           "    --ease-emphasized-decel:cubic-bezier(0.05, 0.7, 0.1, 1);   /* 강조 등장 */",
           "    --lift:-4px; --nudge:-2px;"]) + "\n"

    ratios = [f"{fs[i+1]/fs[i]:.2f}" for i in range(len(fs) - 1)]
    print(f"  타입 스케일 인접 배율: {' · '.join(ratios)}  (최소 1.13)")
    print(f"  여백 인접 배율: {' · '.join(f'{sp[i+1]/sp[i]:.2f}' for i in range(len(sp)-1))}  (최소 1.5)\n")

    print("  ── 아래를 <style> 맨 위에 붙여넣는다 ──\n")
    print(f"""/* plan
   판돈: ? | 어조: ? | 밀도: {density}
   톤: {tone}
   액센트: {"없음(중립 4단)" if no_accent else "있음"}
   스타일: ?
   레이아웃: ?
   모션: ?          (signature motion 1개 또는 `없음` — 비워 두지 않는다)
*/
  :root{{
    /* 액센트 — 시드 H={hue:.0f}° 크로마 {acc_c:.2f}. fill은 칠하는 면 전용 */
    --acc:{rgb_to_hex(fill)};
    --acc-hi:{rgb_to_hex(hi)};
    --acc-cont:{rgb_to_hex(cont)};
    --acc-cont-2:{rgb_to_hex(cont2)};
    --acc-on:{rgb_to_hex(on_cont)};
    --on-acc-2:{rgb_to_hex(on_acc2)};   /* 액센트 면 위 보조 텍스트. 틴트를 여기 쓰지 않는다 */

    /* 중립 — 시드 색조를 옅게 섞어 tonal 일관성 */
    --ink:{rgb_to_hex(ink)};
    --ink-2:{rgb_to_hex(ink2)};
    --ink-3:{rgb_to_hex(ink3)};
    --bg:{rgb_to_hex(bg)};
    --band:{rgb_to_hex(band)};          /* 섹션 밴드 전용. 배경과 델타 {d_band:.0f} · 이 위엔 ink-2까지만 */
    --surface:{rgb_to_hex(surface)};
    --outline:{rgb_to_hex(outline)};
    --on-dark:{rgb_to_hex(on_dark)};
    --on-dark-3:{rgb_to_hex(on_dark3)};
{semantic_block}
    /* 타입 스케일 8토큰 */
    --fs-cap:{fs[0]}px; --fs-ctl:{fs[1]}px; --fs-body:{fs[2]}px; --fs-lead:{fs[3]}px;
    --fs-h3:{fs[4]}px; --fs-h2:{fs[5]}px; --fs-h1:{fs[6]}px; --fs-disp:{fs[7]}px;

{motion_block}
    /* 여백 6단 */
    --sp-1:{sp[0]}px; --sp-2:{sp[1]}px; --sp-3:{sp[2]}px;
    --sp-4:{sp[3]}px; --sp-5:{sp[4]}px; --sp-6:{sp[5]}px;
  }}""")
    print("\n  radius·그림자는 선택한 스타일의 정의를 따른다 — 여기서 정하지 않는다.")
    print("  붙여넣은 뒤 바로: python3 gate.py <html> --static-only\n")


if __name__ == "__main__":
    main()
