#!/usr/bin/env python3
"""
design-fieldbook 완료 전 정적 검증 스크립트.

용법: python3 verify.py <생성한 HTML 파일 경로> [--static-only]

이 스크립트는 gate.py를 거치지 않고 직접 호출해도 SKILL.md "완료 전 — 게이트 루프"
1단계(미적 독립 검토)가 먼저 통과했는지 스스로 확인한다 — `<html>.feel-review.json`이
없거나 해시가 안 맞거나 findings가 비어있지 않으면 실행을 거부한다. gate.py 안에만 이
검사가 있으면 verify.py를 직접 불러서 우회할 수 있기 때문이다. 토큰·`/* plan */`만 잡는
초기 반복 단계라 1단계를 아직 안 거쳤다면 `--static-only`로 이 검사를 건너뛴다(SKILL.md
"루프를 앞으로 당긴다").

이 스크립트는 SKILL.md "완료 전 — 구별성 게이트"의 항목 중 소스 코드만으로
기계적으로 판정 가능한 것들을 체크한다. FAIL이 하나라도 있으면 exit code 1을
반환한다 — 이 상태로는 작업을 완료로 보고하지 않는다. WARN은 코드만으로는
확신할 수 없는 신호라 사람/에이전트가 직접 렌더링해서 눈으로 재확인해야 한다.

이 스크립트가 잡을 수 없는 것(반드시 실제 렌더링+스크린샷으로 확인):
- 실제로 스타일이 구별되어 "보이는가" (색맹 시뮬레이션, 실제 대비 인상)
- 레이아웃이 콘텐츠 우선순위를 반영하는가
- 카드 장식 조합(check_card_decoration_budget)은 클래스명 관례(box-shadow+border-radius
  동시 선언 = 카드, class명에 stat 포함 = 스탯 타일)에 의존하는 휴리스틱이다 — 관례를 벗어난
  마크업이면 못 잡는다. 이 경우와, 장식 장치를 2개 이하로만 써서 게이트를 통과했어도 여전히
  진부한 조합인 경우는 육안으로 재확인한다

e라운드 회고로 추가된 검사들 — 그 라운드 산출물은 16 PASS / 0 FAIL을 받고도 화면이 망가져
있었다. 통과한 이유는 전부 "규범은 SKILL.md에 있는데 그걸 재는 검사가 없거나, 있는 검사가
가드에 걸려 스킵됐다"였다:
- 텍스트 대비: SKILL.md가 4.5:1/3:1을 '항상 적용'으로 못박아 뒀는데 재는 검사가 0개였다
  (amber #F59E0B on #FDECC8 = 1.84:1인 지표 타일이 그대로 통과) → check_text_contrast
- 섹션 밴드 배경이 페이지 배경과 1.05:1 → check_section_band_contrast
- 구분선 검사가 --line* 이름 토큰만 찾아서, --accent-100으로 그은 6px 보더(1.11:1)를 놓침
  → check_line_contrast를 실제 border 선언 기준으로 변경
- 2컬럼 균형 검사가 min(단어수) < 15에서 continue — 불균형이 가장 심할 때 꺼졌다
- 인용 박스 판정이 italic/blockquote만 봐서 monospace 로그 박스를 놓침(카드 장식 2/4로 통과)
- 타입 스케일·액센트 색 수·스타일 커밋 강도·반응형은 재는 검사 자체가 없었다
"""

import hashlib
import json
import re
import sys
from pathlib import Path

FEEL_REVIEW_SUFFIX = ".feel-review.json"


def feel_review_path(html):
    return html.parent / f"{html.stem}{FEEL_REVIEW_SUFFIX}"


def check_feel_review(html):
    """(ok, message) — gate.py의 동명 함수와 동일한 규칙. verify.py 단독 호출로
    SKILL.md 1단계(미적 독립 검토)를 건너뛰는 걸 막으려고 여기에도 둔다."""
    path = feel_review_path(html)
    digest = hashlib.sha256(html.read_bytes()).hexdigest()
    if not path.exists():
        return False, (
            f"`{path.name}`이 없다. SKILL.md \"완료 전 — 게이트 루프\" 1단계대로 별도 fresh\n"
            "    에이전트를 띄워 코드 정합성은 무시하고 순수 미적 판단만 적대적으로 검토받은 뒤,\n"
            f"    결과를 {{\"html_sha256\": \"...\", \"findings\": [...]}} 형태로 {path.name}에 저장한다."
        )
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (ValueError, OSError):
        return False, f"`{path.name}`을 읽을 수 없다 — 형식이 깨졌다. 다시 작성한다."
    if data.get("html_sha256") != digest:
        return False, (
            f"`{path.name}`이 지금 파일 내용과 안 맞다(해시 불일치) — html을 고친 뒤\n"
            "    1단계 재검토 없이 예전 통과 기록을 재사용하는 중이다. 다시 검토받는다."
        )
    findings = data.get("findings", [])
    if findings:
        lines = "\n".join(f"     · {f}" for f in findings)
        return False, f"미적 결함 {len(findings)}건 — FAIL과 동급이다. 고치고 재검토한다:\n{lines}"
    return True, ""

PLACEHOLDER_NAMES = ["Jane Doe", "John Smith", "Acme", "홍길동", "김철수", "OOO"]
GENERIC_CTA_TEXTS = {"더 알아보기", "자세히 보기", "더보기", "learn more", "see more", "read more"}
FILLER_COPY_WORDS = [
    "혁신적인", "완벽한", "차별화된", "궁극의", "최고의 선택",
    "elevate", "seamless", "unleash", "revolutionize", "empower", "unlock",
]

SYSTEM_FONT_NAMES = {
    "-apple-system", "blinkmacsystemfont", "apple sd gothic neo", "malgun gothic",
    "noto sans kr", "segoe ui", "system-ui", "sans-serif", "serif", "monospace",
    "ui-monospace", "ui-sans-serif", "ui-serif", "sf mono", "sfmono-regular",
    "menlo", "consolas", "cascadia mono", "d2coding", "helvetica neue",
    "helvetica", "arial", "georgia", "iowan old style", "times new roman",
    "times", "-apple-system-ui", "tahoma", "verdana", "roboto", "droid sans",
}

# references/styles/*.md 레시피에 실려 있던(또는 과거 라운드에서 반복 재현된) 예시 배경색.
# "복사하지 마라"는 산문 경고만으로는 구체적 숫자의 앵커링 효과를 못 이긴다는 게
# c/d/e 라운드에서 반복 확인됐다 — 그래서 기계적으로 근접도를 잡는다.
KNOWN_ANCHOR_BG_HEXES = ["EFE6DD"]
ANCHOR_BAND = 15

FAILS = []
WARNS = []
PASSES = []


def fail(msg):
    FAILS.append(msg)


def warn(msg):
    WARNS.append(msg)


def ok(msg):
    PASSES.append(msg)


def check_skeleton(src):
    if not re.search(r"<!doctype\s+html", src, re.I):
        fail("<!DOCTYPE html> 없음")
    else:
        ok("DOCTYPE 있음")

    for tag in ("<html", "<head", "<body"):
        if not re.search(re.escape(tag), src, re.I):
            fail(f"{tag}> 태그 없음 — 문서 구조가 불완전하면 브라우저가 인코딩을 잘못 추측해 렌더링이 깨질 수 있다")
        else:
            ok(f"{tag}> 있음")

    if not re.search(r'<meta[^>]+charset\s*=', src, re.I):
        fail('<meta charset="UTF-8"> 없음 — 한글이 mojibake로 깨질 수 있다')
    else:
        ok("meta charset 있음")

    if not re.search(r'<html[^>]+lang\s*=', src, re.I):
        warn("<html lang=\"...\"> 속성 없음")
    else:
        ok("html lang 속성 있음")


def check_word_break(src):
    body_block = re.search(r'body\s*\{([^}]*)\}', src, re.I | re.S)
    if body_block and re.search(r'word-break\s*:\s*keep-all', body_block.group(1), re.I):
        ok("body에 word-break: keep-all 전역 선언됨")
    elif re.search(r'word-break\s*:\s*keep-all', src, re.I):
        warn("word-break: keep-all이 있긴 한데 body 선택자 안에서 전역으로 걸린 게 아닐 수 있다 — 개별 요소에만 걸었는지 확인")
    else:
        fail("word-break: keep-all 이 어디에도 없음 — 한글 헤드라인이 음절 단위로 끊길 수 있다")


def extract_root_vars(src):
    root_blocks = re.findall(r':root\s*\{([^}]*)\}', src, re.S)
    vars_ = {}
    for block in root_blocks:
        for m in re.finditer(r'(--[\w-]+)\s*:\s*([^;]+);', block):
            vars_[m.group(1)] = m.group(2).strip()
    return vars_


def resolve_var(value, vars_, depth=0):
    if depth > 5:
        return value
    m = re.match(r'var\((--[\w-]+)\)', value.strip())
    if m and m.group(1) in vars_:
        return resolve_var(vars_[m.group(1)], vars_, depth + 1)
    return value.strip()


def hex_to_rgb(value):
    value = value.strip()
    m = re.match(r'#([0-9a-fA-F]{6})$', value)
    if m:
        h = m.group(1)
        return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))
    m = re.match(r'#([0-9a-fA-F]{3})$', value)
    if m:
        h = m.group(1)
        return tuple(int(c * 2, 16) for c in h)
    return None


# ---------------------------------------------------------------------------
# CSS 파싱 층 — 아래 신규 검사들이 공통으로 쓴다.
# 완전한 CSS 파서가 아니라 <style> 블록 하나짜리 산출물을 전제한 근사치다.
# ---------------------------------------------------------------------------

NAMED_COLORS = {"white": (255, 255, 255, 1.0), "black": (0, 0, 0, 1.0)}


def parse_rules(src):
    """[(selector, decl_block, media)] — @media 안의 규칙은 media 조건 문자열과 함께 담는다."""
    css = "\n".join(m.group(1) for m in re.finditer(r'<style[^>]*>(.*?)</style>', src, re.S | re.I))
    css = re.sub(r'/\*.*?\*/', ' ', css or src, flags=re.S)
    rules = []

    def scan(text, media):
        pos = 0
        while True:
            brace = text.find('{', pos)
            if brace == -1:
                return
            sel = text[pos:brace].strip()
            depth, j = 1, brace + 1
            while j < len(text) and depth:
                if text[j] == '{':
                    depth += 1
                elif text[j] == '}':
                    depth -= 1
                j += 1
            body = text[brace + 1:j - 1]
            if sel.startswith('@'):
                if sel.lower().startswith('@media'):
                    scan(body, sel)
            elif sel:
                for part in sel.split(','):
                    part = part.strip()
                    if part:
                        rules.append((part, body, media))
            pos = j

    scan(css, None)
    return rules


def decls(block):
    """선언 블록 → {property: value}. 같은 property가 여러 번이면 마지막이 이긴다."""
    out = {}
    for m in re.finditer(r'([-\w]+)\s*:\s*([^;{}]+)', block):
        out[m.group(1).strip().lower()] = m.group(2).strip()
    return out


def parse_color(value, vars_):
    """색 문자열 → (r, g, b, alpha) 또는 None."""
    if value is None:
        return None
    v = resolve_var(str(value).strip(), vars_).strip().rstrip(';').strip()
    if v.lower() in NAMED_COLORS:
        return NAMED_COLORS[v.lower()]
    m = re.match(r'#([0-9a-fA-F]{8})$', v)
    if m:
        h = m.group(1)
        return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), int(h[6:8], 16) / 255)
    rgb = hex_to_rgb(v)
    if rgb:
        return (rgb[0], rgb[1], rgb[2], 1.0)
    m = re.match(r'rgba?\(([^)]+)\)$', v, re.I)
    if m:
        parts = [p for p in re.split(r'[,\s/]+', m.group(1)) if p]
        try:
            chan = []
            for p in parts[:3]:
                chan.append(int(round(float(p.rstrip('%')) * 2.55)) if p.endswith('%') else int(float(p)))
            alpha = 1.0
            if len(parts) >= 4:
                alpha = float(parts[3].rstrip('%')) / (100 if parts[3].endswith('%') else 1)
            return (chan[0], chan[1], chan[2], alpha)
        except (ValueError, IndexError):
            return None
    return None


def color_in_value(value, vars_):
    """background/border 같은 축약 선언값에서 첫 번째로 해석되는 색을 뽑는다. 그라데이션은 None."""
    if value is None or re.search(r'gradient\(', value, re.I):
        return None
    direct = parse_color(value, vars_)
    if direct:
        return direct
    for tok in re.findall(r'var\(--[\w-]+\)|#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|\bwhite\b|\bblack\b', value, re.I):
        c = parse_color(tok, vars_)
        if c:
            return c
    return None


def composite(fg, bg_rgb):
    """알파가 있는 전경색을 불투명 배경 위에 합성한 실제 표시색."""
    a = fg[3]
    if a >= 1:
        return fg[:3]
    return tuple(int(round(fg[i] * a + bg_rgb[i] * (1 - a))) for i in range(3))


def is_ancestor_sel(anc, sel):
    """anc가 sel의 조상(또는 자기 자신) 선택자인가. 토큰 경계를 지켜서 .hero가 .hero-grid를 먹지 않게 한다."""
    if anc == sel:
        return True
    return any(sel.startswith(anc + sep) for sep in (' ', '::', ':', ' > ', '>'))


# `--r:26px` 같은 토큰을 거쳐 들어온 값을 검사가 못 읽는 사고가 세 번 났다(간격 스케일·
# 타입 스케일·radius 커밋). 매번 호출부에서 vars_를 넘기게 하면 네 번째가 난다 — 파서가
# 파일을 읽을 때 채워두고 px_of가 알아서 푼다.
VARS = {}


def px_of(value):
    v = value or ''
    if 'var(' in v and VARS:
        v = re.sub(r'var\((--[\w-]+)\)', lambda m: resolve_var(m.group(0), VARS), v)
    m = re.search(r'(\d+(?:\.\d+)?)px', v)
    return float(m.group(1)) if m else None


def weight_of(value):
    if not value:
        return None
    if re.search(r'\bbold\b', value, re.I):
        return 700
    m = re.search(r'(\d{3})', value)
    return int(m.group(1)) if m else None


def needed_ratio(size, weight):
    """WCAG: large text(24px+, 또는 18.66px+ bold)는 3:1, 나머지는 4.5:1."""
    if size is None:
        return 4.5
    if size >= 24:
        return 3.0
    if size >= 18.66 and (weight or 400) >= 700:
        return 3.0
    return 4.5


def page_bg(src, vars_):
    """body(또는 :root --bg)의 불투명 배경색."""
    for sel, block, _media in parse_rules(src):
        if sel.strip().lower() == 'body':
            c = color_in_value(decls(block).get('background') or decls(block).get('background-color'), vars_)
            if c and c[3] >= 1:
                return c[:3]
    for key in vars_:
        if re.search(r'^--(bg|page|paper)$', key, re.I):
            rgb = hex_to_rgb(resolve_var(vars_[key], vars_))
            if rgb:
                return rgb
    return None


def check_bg_surface_contrast(src, vars_):
    bg_keys = [k for k in vars_ if re.search(r'^--(bg|page|paper)(\b|-)', k, re.I) and 'bg-2' not in k]
    surface_keys = [k for k in vars_ if re.search(r'^--(surface|card|panel|sheet)(\b|-)', k, re.I)]

    if not bg_keys or not surface_keys:
        warn("배경(--bg 계열)/표면(--surface·--card 계열) 토큰 이름을 자동으로 못 찾음 — 직접 육안 확인 필요")
        return

    bg_rgb = hex_to_rgb(resolve_var(vars_[bg_keys[0]], vars_))
    if not bg_rgb:
        warn(f"{bg_keys[0]} 값이 hex가 아니라 자동 계산 불가 — 직접 육안 확인 필요")
        return

    # 델타 10은 "중간톤 배경 + 흰 카드"를 전제한다. 배경이 명도의 양 극단(순백 문서 사이트,
    # 순흑 대시보드)이면 표면을 그만큼 벌릴 여지가 없어서 6~8에 보더를 병행하는 것이 관용이다
    # — GitHub 문서(#F6F8FA on #FFF, 델타 7)와 GitHub 다크가 둘 다 이 패턴이다.
    # 대신 그 경우 보더가 실제로 있어야 한다. 둘 다 약하면 경계를 만드는 장치가 없는 것이다.
    lumv = page_luminance(src, vars_)
    extreme_bg = lumv > 0.85 or lumv < 0.2
    dark = lumv < 0.2
    floor = 6 if extreme_bg else 10
    has_surface_border = any(
        re.match(r'^\.[\w-]+$', sel.strip())
        and any(re.match(r'^border(-(top|right|bottom|left))?$', k) and 'none' not in v.lower()
                for k, v in decls(block).items())
        for sel, block, _m in parse_rules(src)
    )

    # e라운드 회고: 예전엔 surface_keys[0]만 봤다. --surface(#FFF)가 델타 13으로 PASS를 찍고
    # 끝나서, 정작 섹션 밴드에 쓰인 --surface-2(델타 5.7)는 검사 대상에 들어오지도 않았다.
    # 이제 전부 훑는다 — 주 표면은 FAIL, 보조 표면은 WARN(카드 안쪽 틴트일 수도 있어서).
    for idx, key in enumerate(surface_keys):
        surf_rgb = hex_to_rgb(resolve_var(vars_[key], vars_))
        if not surf_rgb:
            warn(f"{key} 값이 hex가 아니라 자동 계산 불가 — 직접 육안 확인 필요")
            continue
        delta = sum(abs(a - b) for a, b in zip(bg_rgb, surf_rgb)) / 3
        if delta >= 10 or (extreme_bg and delta >= floor and has_surface_border):
            note = " (극단 배경 — 보더가 경계를 함께 만든다)" if extreme_bg and delta < 10 else f" (기준 {floor} 이상)"
            ok(f"배경 vs {key} 톤차 델타 {delta:.1f}{note}")
        elif idx == 0:
            extra = " 배경이 명도 극단이라 델타 6까지 허용되지만 그 경우 표면에 보더가 있어야 한다 — 지금은 둘 다 없다." if extreme_bg else ""
            fail(f"배경({bg_keys[0]}={vars_[bg_keys[0]]}) vs 표면({key}={vars_[key]}) 델타 {delta:.1f} — {floor} 미만이면 육안으로 사실상 안 보인다.{extra}")
        else:
            warn(f"보조 표면({key}={vars_[key]})이 배경과 델타 {delta:.1f}뿐 — 카드 안쪽 틴트로 쓰는 거면 괜찮지만, 섹션 밴드나 카드 표면으로 쓰면 화면에서 구별이 안 된다")


def _srgb_channel_to_linear(c):
    c = c / 255
    return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4


def _relative_luminance(rgb):
    r, g, b = rgb
    return 0.2126 * _srgb_channel_to_linear(r) + 0.7152 * _srgb_channel_to_linear(g) + 0.0722 * _srgb_channel_to_linear(b)


def _contrast_ratio(rgb1, rgb2):
    l1, l2 = _relative_luminance(rgb1), _relative_luminance(rgb2)
    lighter, darker = max(l1, l2), min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)


def check_line_contrast(src, vars_):
    # SKILL.md "구조적 구분"이 오래전부터 있던 규칙인데("헤어라인 1px만 쓰지 않는다")
    # 실제로는 구분선 색상 자체가 배경과 거의 구별 안 되는 경우를 아무도 안 잡고 있었다.
    # WCAG 1.4.11(비텍스트 대비) 최소 3:1을 구분선 색상에도 그대로 적용한다.
    #
    # e라운드 회고: 예전엔 --line* 이라는 '토큰 이름'만 찾았다. 그 라운드 산출물은 구분선을
    # --accent-100으로 그어서 검사가 아예 안 돌고 WARN만 남았다(6px 보더가 1.11:1로 무지).
    # 이제 이름이 아니라 실제 border 선언을 훑는다.
    base = page_bg(src, vars_)
    if not base:
        warn("페이지 배경색을 자동으로 못 찾음 — 구분선 대비는 직접 육안 확인 필요")
        return

    # 대비식은 명도 양 극단에서 체감과 어긋난다 — 순백 위 #D6DAE0(1.31:1)도, 순흑 위
    # #2C353D(1.40:1)도 실제로는 또렷이 보인다. 두 프로브에서 같은 오탐이 나왔다.
    # 그래서 "대비 3:1 **또는** RGB 델타 18" 중 하나만 만족하면 통과로 본다.
    RATIO_MIN, DELTA_MIN = 3.0, 18
    seen, offenders, checked = set(), [], 0
    for sel, block, _media in parse_rules(src):
        d = decls(block)
        # 같은 블록에 배경이 있으면 그 위에 그어진 선이므로 비교 대상은 그 배경이다
        own_bg = color_in_value(d.get('background') or d.get('background-color'), vars_)
        against = composite(own_bg, base) if own_bg else base
        # 면(fill)이 이미 페이지 배경과 확실히 구별되면 경계를 만드는 건 보더가 아니라 면이다
        # (틴트 배경 콜아웃의 같은 색조 보더 등) — 이 경우 보더 대비는 요구하지 않는다.
        if own_bg and sum(abs(a - b) for a, b in zip(against, base)) / 3 >= 10:
            continue
        for prop, value in d.items():
            if not re.match(r'^border(-(top|right|bottom|left))?$', prop):
                continue
            width = px_of(value)
            if not width or width <= 0 or 'none' in value.lower():
                continue
            line = color_in_value(value, vars_)
            if not line:
                continue
            line_rgb = composite(line, against)
            key = (line_rgb, against)
            if key in seen:
                continue
            seen.add(key)
            checked += 1
            ratio = _contrast_ratio(line_rgb, against)
            d = sum(abs(a - b) for a, b in zip(line_rgb, against)) / 3
            if ratio < RATIO_MIN and d < DELTA_MIN:
                offenders.append(f"{sel} {{{prop}: {value}}} — 대비 {ratio:.2f}:1 · RGB 델타 {d:.1f}")

    if not checked:
        ok("색이 명시된 border 구분선 없음 — 구분선 대비 요구사항 해당 없음")
        return
    if offenders:
        fail(f"구분선이 대비 {RATIO_MIN}:1도 RGB 델타 {DELTA_MIN}도 못 넘는다 — 코드에는 선이 있어도 화면에서는 안 보인다: "
             + " / ".join(offenders[:6]))
    else:
        ok(f"border 구분선 {checked}종 전부 대비 {RATIO_MIN}:1 또는 RGB 델타 {DELTA_MIN} 이상")


def check_accent_fill(src, vars_):
    accent_keys = [k for k in vars_ if re.search(r'^--acc(ent)?(\b|-)', k, re.I)]
    if not accent_keys:
        warn("액센트(--accent·--acc 계열) 토큰을 자동으로 못 찾음 — 직접 확인 필요")
        return

    used_as_bg = False
    for key in accent_keys:
        pattern = re.compile(r'background(?:-color)?\s*:\s*[^;]*' + re.escape(key), re.I)
        if pattern.search(src):
            used_as_bg = True
            break
    # tint/100 계열 변형도 채워진 면으로 인정 (예: --accent-100, --acc-tint)
    tint_keys = [k for k in vars_ if re.search(r'^--acc(ent)?-?(100|tint|soft|fill)', k, re.I)]
    for key in tint_keys:
        pattern = re.compile(r'background(?:-color)?\s*:\s*[^;]*' + re.escape(key), re.I)
        if pattern.search(src):
            used_as_bg = True
            break

    if used_as_bg:
        ok("액센트(또는 액센트 틴트)가 background로 최소 1곳 이상 쓰임")
    else:
        fail("액센트 토큰이 background/background-color로 쓰인 곳이 없음 — 텍스트·보더로만 쓰이면 스타일 정체성이 안 산다")


def check_bg_anchoring(vars_):
    # 단순 RGB 유클리드 거리는 "밝은 무채색"을 전부 서로 가깝게 보고 오탐을 낸다
    # (예: F5F5F5 같은 흔한 쿨그레이도 EFE6DD와 거리가 가까움). 밝기(avg)와
    # 웜/쿨 색감(warmth = R-B)을 따로 봐서 "그 베이지와 같은 밝기 + 같은 웜톤"일
    # 때만 잡는다 — 쿨그레이·블루그레이·순백은 걸리지 않는다.
    bg_keys = [k for k in vars_ if re.search(r'^--(bg|page|paper)(\b|-)', k, re.I) and 'bg-2' not in k]
    if not bg_keys:
        return
    bg_rgb = hex_to_rgb(resolve_var(vars_[bg_keys[0]], vars_))
    if not bg_rgb:
        return
    bg_avg = sum(bg_rgb) / 3
    bg_warmth = bg_rgb[0] - bg_rgb[2]
    for anchor_hex in KNOWN_ANCHOR_BG_HEXES:
        anchor_rgb = hex_to_rgb('#' + anchor_hex)
        anchor_avg = sum(anchor_rgb) / 3
        anchor_warmth = anchor_rgb[0] - anchor_rgb[2]
        if abs(bg_avg - anchor_avg) <= ANCHOR_BAND and abs(bg_warmth - anchor_warmth) <= ANCHOR_BAND:
            fail(f"배경({bg_keys[0]}={vars_[bg_keys[0]]})이 레시피 예시색(#{anchor_hex})과 밝기·웜톤이 거의 같음 — 과거 라운드에서 반복된 베이지 앵커링이다. 브랜드에 맞는 다른 배경색을 새로 정한다")
            return
    ok("배경색이 알려진 레시피 예시색과 밝기·웜톤이 충분히 다름")


def check_text_wrap_pretty(src):
    measured = False
    for m in re.finditer(r'\{([^{}]*)\}', src):
        block = m.group(1)
        # ch 단위는 그 자체로 "텍스트 측정값" 선언이라 font-size 동반 여부를 안 따진다
        # (typography.md가 권장하는 단위라 f라운드처럼 font-size가 다른 규칙에 분리돼도 잡아야 한다).
        if re.search(r'max-width\s*:\s*\d+ch\b', block):
            measured = True
            break
        mw = re.search(r'max-width\s*:\s*(\d+)px', block)
        if mw and int(mw.group(1)) <= 900 and re.search(r'font-size', block):
            measured = True
            break
    if not measured:
        ok("measure 제한된 본문 텍스트 블록 없음 — text-wrap 요구사항 해당 없음")
        return
    if re.search(r'text-wrap\s*:\s*(pretty|balance)', src, re.I):
        ok("text-wrap: pretty/balance 있음 — 고아줄 방지")
    else:
        fail("max-width로 폭을 제한한 본문 텍스트 블록이 있는데 text-wrap: pretty(또는 balance)가 없음 — 마지막 줄에 단어 하나만 남는 고아줄 위험(typography.md 'keep-all의 부작용')")


def check_measure_consistency(src):
    values = set()
    for m in re.finditer(r'\{([^{}]*)\}', src):
        block = m.group(1)
        mw = re.search(r'max-width\s*:\s*(\d+)px', block)
        if mw and re.search(r'font-size', block):
            values.add(int(mw.group(1)))
    if len(values) >= 2:
        warn(f"본문 텍스트 블록마다 다른 max-width 값 {sorted(values)}px이 즉흥적으로 쓰임 — 하나의 measure 토큰(예: ch 단위)으로 통일을 고려한다(typography.md 참고)")


def _extract_div_block(src, open_tag_end):
    """open_tag_end: 여는 <div ...> 태그의 '>' 바로 다음 인덱스.
    중첩 depth를 세어 정확히 매칭되는 </div>까지의 내부 HTML을 반환한다."""
    depth = 1
    for m in re.finditer(r'<(/?)div\b', src[open_tag_end:], re.I):
        depth += -1 if m.group(1) else 1
        if depth == 0:
            return src[open_tag_end: open_tag_end + m.start()]
    return src[open_tag_end:]


def _top_level_div_children(html):
    """html 안의 최상위(depth 0→1) <div>들의 내부 콘텐츠 리스트. 중첩된 자손 div는
    부모의 콘텐츠에 포함될 뿐 별도 항목으로 세지 않는다."""
    children = []
    depth = 0
    start = None
    for m in re.finditer(r'<(/?)div\b[^>]*>', html, re.I):
        if not m.group(1):
            if depth == 0:
                start = m.end()
            depth += 1
        else:
            depth -= 1
            if depth == 0 and start is not None:
                children.append(html[start:m.start()])
                start = None
    return children


def check_grid_column_balance(src):
    # 2컬럼 grid(fr/px 값 2개)에서 한쪽 컬럼이 다른 쪽보다 훨씬 짧으면, 짧은 쪽
    # 카드가 긴 텍스트 컬럼 옆에서 붕 뜬 것처럼 보인다(f라운드 about-grid에서 실제로
    # 발생 — 본문 4문단 옆에 표 2행짜리 카드가 초반에 끝나고 아래는 텅 빔).
    #
    # e라운드 회고: 예전엔 `if min(lens) < 15: continue` 가드가 있었다. 히어로가 단어 수
    # [23, 10]이라 — 즉 불균형이 가장 심한 바로 그 상태에서 — 검사가 꺼졌다. 짧은 쪽이
    # 15단어 미만인 것은 면제 사유가 아니라 더 강한 신호다. sticky를 쓴 경우만 면제한다
    # (layout.md "2컬럼 분량 균형" 해결 2).
    # 이 규칙이 겨냥하는 건 "긴 본문 옆 짧은 사이드카드가 허공에 뜨는" 섹션 레이아웃이다.
    # 고정 px 트랙(예: `200px 1fr`)은 라벨 레일이라 짧은 게 정상이고, 같은 클래스가 3번 이상
    # 나오면 페이지 레이아웃이 아니라 반복 카드 컴포넌트다 — 둘 다 제외한다.
    two_col_classes = set()
    sticky_classes = set()
    for sel, block in re.findall(r'\.([\w-]+)\s*\{([^{}]*)\}', src):
        m = re.search(r'grid-template-columns\s*:\s*([^;]+);', block)
        if m:
            tracks = m.group(1).split()
            if len(tracks) == 2 and all(re.search(r'(fr|%|auto|minmax)', t) for t in tracks):
                two_col_classes.add(sel)
        if re.search(r'position\s*:\s*sticky', block, re.I):
            sticky_classes.add(sel)

    for cls in sorted(two_col_classes):
        if len(re.findall(r'class="[^"]*\b' + re.escape(cls) + r'\b', src)) >= 3:
            continue
        for om in re.finditer(r'<div[^>]*class="[^"]*\b' + re.escape(cls) + r'\b[^"]*"[^>]*>', src):
            inner = _extract_div_block(src, om.end())
            children = _top_level_div_children(inner)
            if len(children) != 2:
                continue
            lens = [len(re.sub(r'<[^>]+>', ' ', c).split()) for c in children]
            ratio = max(lens) / max(min(lens), 1)
            if ratio < 2.5:
                continue
            short = children[lens.index(min(lens))]
            if any(re.search(r'class="[^"]*\b' + re.escape(sc) + r'\b', short) for sc in sticky_classes):
                continue
            fail(f".{cls} 2컬럼 레이아웃의 두 컬럼 콘텐츠 분량 비율이 {ratio:.1f}배(단어 수 {lens}) — 짧은 쪽이 허공에 뜬 것처럼 보인다. 짧은 컬럼에 sticky를 걸거나, 스캔 요소를 짧은 쪽으로 옮겨 분량을 맞춘다(layout.md '2컬럼 분량 균형')")


def check_card_decoration_budget(src):
    # 카드(box-shadow + border-radius를 동시에 가진 클래스)의 내부에서
    # 좌/상단 컬러 보더 · 배지 칩(pill radius) · 인용(이탤릭/blockquote) · 스탯 타일(2개+)
    # 중 3개 이상이 동시에 쌓이면 스타일과 무관하게 반복되는 범용 AI 카드 조합으로 본다
    # (ui-patterns.md "카드 장식 예산" — 실제로 e라운드에서 이 조합 그대로 나왔던 문제).
    css_blocks = {}
    for sel, block in re.findall(r'\.([\w-]+)\s*\{([^{}]*)\}', src):
        css_blocks.setdefault(sel, []).append(block)

    def block_text(cls):
        return ' '.join(css_blocks.get(cls, []))

    surface_classes = [c for c, blocks in css_blocks.items()
                        if any('box-shadow' in b and 'border-radius' in b for b in blocks)]
    pill_classes = set()
    for c, blocks in css_blocks.items():
        for b in blocks:
            m = re.search(r'border-radius\s*:\s*(\d+)px', b)
            if m and int(m.group(1)) >= 100:
                pill_classes.add(c)

    # e라운드 회고: has_quote가 italic/blockquote만 봐서, monospace로 짠
    # <div class="flagship-quote">(실행 로그 인용 박스)를 못 잡고 점수 2/4로 통과했다.
    # 인용 박스는 마크업이 아니라 '역할'로 판정해야 한다 — 클래스명과 monospace 지정까지 본다.
    quote_classes = {c for c in css_blocks
                     if re.search(r'(^|-)(quote|log|snippet|testimonial|cite|terminal|console)(-|$)', c, re.I)
                     or re.search(r'font-family\s*:[^;]*mono', block_text(c), re.I)}

    flagged = []
    for card_cls in surface_classes:
        has_border = bool(re.search(r'border-(left|top)\s*:\s*[1-9]\d*px', block_text(card_cls)))
        for om in re.finditer(r'<div[^>]*class="[^"]*\b' + re.escape(card_cls) + r'\b[^"]*"[^>]*>', src):
            inner = _extract_div_block(src, om.end())
            has_pill = any(re.search(r'class="[^"]*\b' + re.escape(pc) + r'\b', inner) for pc in pill_classes)
            has_quote = (
                bool(re.search(r'font-style\s*:\s*italic', inner, re.I))
                or '<blockquote' in inner.lower()
                or any(re.search(r'class="[^"]*\b' + re.escape(qc) + r'\b', inner) for qc in quote_classes)
            )
            has_stats = len(re.findall(r'class="[^"]*\bstat\b', inner, re.I)) >= 2
            score = sum([has_border, has_pill, has_quote, has_stats])
            if score >= 3:
                devices = ', '.join(n for n, v in [('좌/상단 보더', has_border), ('배지 칩', has_pill), ('인용', has_quote), ('스탯 타일', has_stats)] if v)
                flagged.append(f".{card_cls} 카드에 장식 장치 {score}개({devices})가 동시에 쌓임 — 범용 AI 카드 조합일 위험(ui-patterns.md 카드 장식 예산 최대 2개)")

    if flagged:
        for msg in flagged:
            fail(msg)
    else:
        ok("카드형 요소의 장식 장치 과다 조합 없음")


def check_repeated_item_emphasis(src):
    # li 자체가 아니라 부모(ul/ol/div)가 class를 갖고 그 안에 li 3개 이상이 반복되는
    # 경우(예: <ul class="result-list"><li>...</li>...)까지 잡기 위해 부모 블록 단위로 훑는다.
    groups = {}
    for _tag, cls, block in re.findall(r'<(ul|ol)[^>]*class="([\w -]+)"[^>]*>(.*?)</\1>', src, re.S | re.I):
        lis = re.findall(r'<li[^>]*>(.*?)</li>', block, re.S | re.I)
        if lis:
            groups.setdefault(cls, []).extend(lis)
    numeric_pattern = re.compile(r'\d[\d,.]*\s*[%개건명원배단계년월시간]')
    for cls, bodies in groups.items():
        if len(bodies) < 3:
            continue

        def is_emphasized(b):
            return bool(re.search(r'<(strong|b|em)\b', b, re.I) or re.search(r'font-weight\s*:\s*(7|8|9)\d\d', b, re.I))

        emphasized = [b for b in bodies if is_emphasized(b)]
        if not emphasized:
            warn(f"\"{cls}\" 안에 반복되는 li {len(bodies)}개 중 굵기/강조 마크업이 하나도 없음 — 전부 같은 배경으로 '착색'만 됐을 수 있다(color.md '콘텐츠 내부 강조' 확인)")
            continue

        # 일부 항목만 강조되고, 강조 안 된 다른 항목에도 똑같이 수치가 있으면
        # "의도된 위계"가 아니라 "적용을 빼먹은 것"으로 보인다(f라운드에서 실제로 나온 패턴:
        # 5개 중 1개(636개)만 굵게, 나머지 4개의 10%/2건/3건은 그대로 방치됨).
        unemphasized_with_number = [
            b for b in bodies if not is_emphasized(b) and numeric_pattern.search(re.sub(r'<[^>]+>', '', b))
        ]
        if unemphasized_with_number:
            fail(
                f"\"{cls}\" 안에서 {len(emphasized)}/{len(bodies)}개만 강조되고, 나머지 {len(unemphasized_with_number)}개는 수치가 있는데도 강조 안 됨 "
                f"— 일부만 강조하면 의도된 위계가 아니라 빼먹은 것처럼 보인다. 수치 있는 항목은 전부 강조하거나, 정말 하나만 강조할 거면 나머지는 수치를 빼거나 다른 방식으로 격차를 준다(color.md '콘텐츠 내부 강조')"
            )


def check_positional_emphasis(src, vars_):
    """형제 중 하나를 **위치로 골라** 색을 다르게 준 것을 잡는다.

    i라운드 산출물에서 매대 카드 3장 중 `:nth-child(2)`만 틴트로 칠했다. 콘텐츠에 그
    카드가 특별할 이유가 없었고, 시각 리듬 때문에 칠한 것이었다 — 육안 항목 "화면을
    채우려고 만든 요소"가 잡은 것을 여기로 내린다.

    정당한 강조와 가르는 신호는 **선택자**다. 캠페인 프로브의 `.course.pick`은 의미를
    담은 클래스이고 본문이 "가장 인기"라고 말한다. `:nth-child(2)`는 순서 말고 아무
    근거가 없다. 얼룩말 줄무늬(`odd`/`even`)와 구조 선택자(`first`/`last`)는 제외한다.
    """
    hits = []
    for sel, block, _media in parse_rules(src):
        for part in sel.split(","):
            part = part.strip()
            m = re.search(r':nth-(?:child|of-type)\(\s*(\d+)\s*\)', part)
            if not m:
                continue
            props = decls(block)
            painted = [p for p in ("background", "background-color", "color", "border-color")
                       if p in props and color_in_value(props[p], vars_)]
            if painted:
                hits.append((part, ", ".join(painted)))
    if not hits:
        ok("위치(`:nth-child(n)`)로 형제 하나만 칠한 곳 없음")
        return
    for sel, props in hits:
        fail(f"`{sel}`가 {props}를 바꾼다 — 형제 중 하나를 **순서로** 골라 칠한 것이라 "
             f"콘텐츠에 근거가 없다. 그 항목이 정말 특별하면 의미를 담은 클래스(`.pick` 등)로 "
             f"바꾸고 본문에 이유를 쓴다. 아니면 강조를 지운다")


# ─────────────────────────────────────────────────────────────────────────────
# 모션 — motion.md §3.4 금지 패턴 · §5.1 슬롭 7종 · §5.2 예산 · §6.1 reduced-motion
#
# 이 챕터는 스킬이 *신설하려고 만든* 도메인인데, 강제 사슬 어디에도 없었다. 생성기가
# duration/easing을 안 내놓고, plan 블록에 모션 칸이 없고, 게이트에 검사가 0건이었다.
# 그 결과 산출물 6개에 @keyframes 0개, i라운드 baseline은 이름 붙은 슬롭 3종을 저지르고도
# 모션 지적을 하나도 못 받았다. §6.5에 "grep 가능"이라고 적힌 규칙들을 여기로 옮긴다.
# ─────────────────────────────────────────────────────────────────────────────

def _has_motion(src):
    return bool(re.search(r'transition\s*:|@keyframes|animation\s*:', src, re.I))


def check_motion_forbidden(src):
    """motion.md §3.4 + §6.5 — 코드 레벨에서 바로 잡히는 금지 패턴."""
    found = []
    if re.search(r'transition\s*:\s*all\b', src, re.I):
        found.append("`transition: all` — 의도 없는 전면 전환. 속성을 명시한다(`transition: opacity 150ms, transform 150ms`)")
    if re.search(r'animation\s*:[^;]*\binfinite\b', src, re.I):
        found.append("`animation: * infinite` — 장식용 무한 루프(SLOP-AMBIENT-LOOP). 정적 배경으로 바꾸거나 opacity 변화폭 0.05 이하·주기 20s 이상으로 인지 임계 아래에 둔다")
    if re.search(r'scale\(\s*0\s*\)', src):
        found.append("`scale(0)` 시작값 — 부피가 0에서 생겨나는 인상. `scale(0.9)` 이상에서 시작한다")
    for prop in ("width", "height", "top", "left", "margin"):
        if re.search(r'transition\s*:[^;]*\b' + prop + r'\b', src, re.I):
            found.append(f"레이아웃 속성 `{prop}`을 transition — 매 프레임 리플로우가 난다. `transform`/`opacity`로 바꾼다")
    if not found:
        ok("모션 금지 패턴 없음 (transition:all · infinite · scale(0) · 레이아웃 속성)")
        return
    for f in found:
        fail(f)


def check_motion_entrance_easing(src):
    """§3.4 — `ease-in`으로 등장시키면 '빨려 나오는' 인상이 된다."""
    bad = []
    for sel, block, _media in parse_rules(src):
        d = decls(block)
        blob = " ".join(v for k, v in d.items() if k in ("transition", "animation", "animation-timing-function", "transition-timing-function"))
        if not blob:
            continue
        # `ease-in-out` / `ease-in-out`을 포함한 cubic 이름은 제외하고 단독 ease-in만
        if re.search(r'\bease-in\b(?!-out)', blob):
            entrance = ('opacity' in blob or 'transform' in blob
                        or re.search(r'(fade|enter|appear|reveal|in)\b', sel, re.I))
            if entrance:
                bad.append(sel.strip())
    for kf, body in re.findall(r'@keyframes\s+([\w-]+)\s*\{(.*?)\n\s*\}', src, re.S):
        if re.search(r'\bease-in\b(?!-out)', body):
            bad.append(f"@keyframes {kf}")
    if bad:
        fail(f"등장에 `ease-in`을 씀 — {', '.join(bad[:4])}. 등장은 decelerate(`cubic-bezier(0, 0, 0, 1)`), 퇴장이 accelerate다(motion.md §1.4)")
    else:
        ok("등장/퇴장 이징 방향 정상 (등장=decelerate)")


def check_motion_budget(src):
    """§5.2 모션 예산 — entrance 5개 / stagger 6개·80ms·400ms / LCP opacity:0 금지."""
    problems = []

    # entrance 클래스가 붙은 요소 수. `SLOP-FADE-UP-ALL`의 직접 지표다.
    entrance_classes = set()
    for sel, block, _media in parse_rules(src):
        d = decls(block)
        if 'animation' in d and re.search(r'(fade|reveal|enter|appear|slide-?up|rise)', sel, re.I):
            m = re.match(r'^\.([\w-]+)', sel.strip())
            if m:
                entrance_classes.add(m.group(1))
    for cls in entrance_classes:
        n = len(re.findall(r'class="[^"]*\b' + re.escape(cls) + r'\b', src))
        if n > 5:
            problems.append(f"entrance 클래스 `.{cls}`가 {n}개 요소에 붙음 — 초기 뷰포트 entrance 상한은 5개다(§5.2). "
                            f"이 이상이면 SLOP-FADE-UP-ALL과 구분되지 않는다. 섹션은 즉시 노출하고 signature motion 1개만 남긴다")

    # stagger 예산 — nth-child로 만든 delay 계단
    delays = []
    for sel, block, _media in parse_rules(src):
        if not re.search(r':nth-child', sel):
            continue
        d = decls(block)
        v = d.get('animation-delay') or ''
        m = re.search(r'([\d.]+)(ms|s)\b', v)
        if m:
            delays.append(float(m.group(1)) * (1000 if m.group(2) == 's' else 1))
    if delays:
        delays.sort()
        gaps = [round(b - a) for a, b in zip(delays, delays[1:])]
        if len(delays) > 6:
            problems.append(f"stagger 단계가 {len(delays)}개 — 상한 6개(§5.2)")
        if gaps and max(gaps) > 80:
            problems.append(f"stagger 간격 {max(gaps):.0f}ms — 상한 80ms(§5.2)")
        if max(delays) > 400:
            problems.append(f"stagger 총 delay {max(delays):.0f}ms — 상한 400ms(§5.2). "
                            f"entrance 연출 전체가 600ms 안에 끝나야 마지막 항목도 자기 duration을 갖는다")

    # LCP 후보에 opacity:0 — 등장 애니메이션이 LCP 점수를 그대로 악화시킨다
    for sel, block, _media in parse_rules(src):
        d = decls(block)
        if (d.get('opacity') or '').strip().rstrip(';') == '0':
            if re.search(r'\b(hero|h1|banner|jumbotron)\b', sel, re.I):
                problems.append(f"`{sel.strip()}`에 `opacity:0` — 초기 뷰포트/LCP 후보를 감췄다가 띄우면 LCP가 그만큼 밀린다(§5.2)")

    if problems:
        for p in problems:
            fail(p)
    else:
        ok("모션 예산 준수 (entrance ≤5 · stagger ≤6/80ms/400ms · LCP opacity:0 없음)")


def check_motion_hover_lift(src):
    """§5.1 SLOP-HOVER-LIFT-ALL — 카드마다 붙는 hover lift, 그리고 hover 가능 여부 미확인(§6.2)."""
    lifts = []
    for sel, block, _media in parse_rules(src):
        if ':hover' not in sel:
            continue
        t = decls(block).get('transform') or ''
        if re.search(r'translateY\(\s*-', t) or re.search(r'translate\(\s*[^,]+,\s*-', t):
            lifts.append((sel.strip(), _media))
    if not lifts:
        ok("hover lift 남용 없음")
        return
    unguarded = [s for s, media in lifts if 'hover' not in (media or '')]
    if len(lifts) >= 2 and unguarded:
        fail(f"hover lift가 {len(lifts)}곳에 붙었고 `@media (hover:hover) and (pointer:fine)` 밖이다 — "
             f"{', '.join(s for s, _ in lifts[:3])}. SLOP-HOVER-LIFT-ALL(§5.1): 실제로 클릭 가능한 요소에만, "
             f"hover 가능한 입력기에서만 건다(§6.2). 터치에서는 hover가 탭 후 눌어붙는다")
    elif unguarded:
        warn(f"hover lift `{unguarded[0]}`가 `@media (hover:hover)` 밖 — 터치 기기에서 상태가 눌어붙는지 확인한다(§6.2)")
    else:
        ok("hover lift가 hover 가능 입력기 안에만 걸림")


def check_reduced_motion(src):
    """§6.1 — 모션이 있으면 `prefers-reduced-motion`은 선택이 아니다(전정 장애)."""
    if not _has_motion(src):
        ok("모션 선언 없음 — reduced-motion 해당 없음")
        return
    if re.search(r'prefers-reduced-motion', src, re.I):
        ok("`prefers-reduced-motion` 대응 있음")
    else:
        fail("`transition`/`@keyframes`를 쓰면서 `@media (prefers-reduced-motion: reduce)`가 없다 — "
             "이동·패럴랙스·회전은 전정 장애를 유발할 수 있다. 이동/스케일은 끄고 opacity·color 피드백은 남긴다(motion.md §6.1)")


def check_motion_declared(src):
    """plan 블록의 `모션:` 칸 — 넣을지 말지를 **묻는 단계**를 만든다.

    이게 없으면 "애니메이션을 넣을 때 → motion.md"라는 조건부 포인터만 남아, 넣기로
    결정한 뒤에만 챕터가 열린다. 결정 자체를 아무도 묻지 않으니 기본값이 '안 넣음'이 된다.
    """
    m = re.search(r'/\*\s*plan(.*?)\*/', src, re.S)
    if not m:
        return   # plan 블록 자체가 없는 건 check_plan_declaration이 이미 잡는다
    plan = m.group(1)
    dm = re.search(r'모션\s*:\s*([^\n|]+)', plan)
    if not dm:
        fail("`/* plan */`에 `모션:` 칸이 없다 — signature motion 1개를 정하거나 `없음`이라고 적는다. "
             "적지 않으면 모션은 매번 조용히 빠진다(motion.md §5.3)")
        return
    declared = dm.group(1).strip()
    # 이 칸이 선언하는 것은 **signature motion**이다(§5.3). 상태 전이(hover/press/포커스)는
    # 언제나 허용이므로 `transition` 하나만으로 "모션이 있다"고 보면 안 된다 — signature급
    # 모션의 지표는 `@keyframes`/`animation`이다.
    has_signature = bool(re.search(r'@keyframes|animation\s*:', src, re.I))
    if declared.startswith("없음"):
        if has_signature:
            fail(f"`모션: {declared}`라고 선언했는데 `@keyframes`/`animation`이 실제로 있다 — "
                 f"선언과 구현이 어긋난다. signature motion을 쓸 거면 칸에 적고, 아니면 지운다")
        else:
            ok(f"`모션: {declared}` — signature 없음, 선언과 일치")
        return
    if not has_signature:
        fail(f"`모션: {declared}`를 선언했는데 `@keyframes`/`animation`이 하나도 없다 — 선언만 있고 구현이 없다")
    else:
        ok(f"모션 선언 `{declared}` — 구현 있음")


def _visible_text(src):
    # <script>/<style> 내용과 태그를 제거한 대략적인 본문 텍스트. 완벽한 HTML 파서가
    # 아니라 카피 슬롭 탐지용 근사치다 — class/속성값까지 섞여 들어올 수 있다.
    text = re.sub(r'<(script|style)\b.*?</\1>', ' ', src, flags=re.S | re.I)
    text = re.sub(r'<[^>]+>', ' ', text)
    return text


def check_placeholder_names(src):
    text = _visible_text(src)
    found = [name for name in PLACEHOLDER_NAMES if re.search(re.escape(name), text, re.I)]
    if found:
        fail(f"플레이스홀더 이름이 화면 텍스트에 남아있음: {found} — 프로덕션에 배포하면 안 된다(copy.md '플레이스홀더 이름')")
    else:
        ok("플레이스홀더 이름(Jane Doe/Acme/홍길동 등) 없음")


def check_duplicate_cta(src):
    texts = re.findall(r'<a\b[^>]*>([^<]{1,20})</a>', src, re.I)
    counts = {}
    for t in texts:
        norm = t.strip().lower()
        if norm in GENERIC_CTA_TEXTS:
            counts[norm] = counts.get(norm, 0) + 1
    for norm, n in counts.items():
        if n >= 3:
            warn(f"'{norm}' 같은 범용 CTA 문구가 {n}번 반복됨 — 목적어 없는 링크 텍스트는 스크린리더로 훑을 때 구별이 안 된다(copy.md 'CTA 반복')")


def check_filler_copy(src):
    text = _visible_text(src)
    found = sorted({w for w in FILLER_COPY_WORDS if re.search(re.escape(w), text, re.I)})
    if found:
        warn(f"필러 수식어 후보 발견: {found} — 소스 콘텐츠(README 등)에서 그대로 가져온 표현이면 무시해도 되지만, 새로 지어낸 카피라면 구체적 사실로 바꾼다(copy.md '필러 동사·수식어')")


def check_font_loading(src):
    font_family_values = re.findall(r'font-family\s*:\s*([^;{}]+)', src, re.I)
    root_font_vars = re.findall(r'--(?:sans|disp|serif|mono|font-\w+)\s*:\s*([^;]+);', src, re.I)
    all_values = font_family_values + root_font_vars

    named_fonts = set()
    for value in all_values:
        for name in re.findall(r"['\"]([^'\"]+)['\"]", value):
            if name.strip().lower() not in SYSTEM_FONT_NAMES:
                named_fonts.add(name.strip())

    if not named_fonts:
        ok("커스텀 웹폰트 이름 없음 (시스템 폰트만 사용) — 로드 문제 해당 없음")
        return

    head_match = re.search(r'<head.*?</head>', src, re.I | re.S)
    head = head_match.group(0) if head_match else src

    for name in sorted(named_fonts):
        loaded = (
            re.search(re.escape(name).replace(r'\ ', r'[\s+]'), head, re.I)
            and re.search(r'<link[^>]+(fonts\.googleapis|fonts\.gstatic|cdn\.jsdelivr|@font-face)', head, re.I)
        ) or re.search(
            r'@font-face\s*\{[^}]*' + re.escape(name), src, re.I | re.S
        )
        if loaded:
            ok(f"폰트 '{name}' — <head>에 로드 코드 있음")
        else:
            fail(f"폰트 '{name}'이 font-family에 적혀 있지만 <head>에 로드하는 <link>/@font-face가 안 보임 — 시스템 폰트로 폴백될 것")


def check_spacing_variety(src, vars_):
    # spacing을 토큰(var(--sp-3))으로 쓰면 리터럴 px가 안 보여서 이 검사가 통째로
    # 무력해진다 — 토큰을 쓰는 쪽이 더 좋은 설계인데 게이트가 그걸 벌주면 안 되므로
    # var()를 값으로 치환한 뒤 센다.
    values = set()
    for m in re.finditer(r'(?:margin|padding|gap|padding-block|padding-inline)(?:-\w+)?\s*:\s*([^;]+);', src, re.I):
        value = m.group(1)
        for name in re.findall(r'var\((--[\w-]+)\)', value):
            if name in vars_:
                value += " " + resolve_var(vars_[name], vars_)
        for px in re.findall(r'(\d+)px', value):
            values.add(int(px))
    odd = sorted(v for v in values if v % 2 != 0)
    if odd:
        fail(f"2px 배수가 아닌 spacing 값 존재: {odd}px")
    else:
        ok("모든 spacing 값이 2px 배수")

    if values:
        span = max(values) / max(min(values), 1)
        if len(values) < 3 or span < 3:
            warn(f"spacing 값 종류가 {len(values)}개, 최대/최소 비율 {span:.1f}배 — 티어가 부족해 여백이 다 고만고만해 보일 수 있다(`layout.md` 여백 스케일 참고)")
        else:
            ok(f"spacing 값 {len(values)}종, 최대/최소 비율 {span:.1f}배 — 티어 다양성 양호")


def check_table_header(src, vars_):
    """`references/ui-patterns.md` 표 헤더 규칙 — 서로 다른 두 산출물에서 독립적으로
    헤더가 본문보다 작고 왼쪽 정렬로 나온 적이 있어서 정적으로도 잡는다."""
    if not re.search(r'<table\b', src, re.I):
        return

    def last_simple(sel):
        return re.split(r'[\s>+~]+', sel.strip())[-1].split(':')[0]

    th_size = th_align = th_weight = td_size = None
    for sel, block, media in parse_rules(src):
        if media:
            continue
        tag = last_simple(sel)
        d = decls(block)
        if tag == 'th':
            if 'font-size' in d:
                th_size = px_of(d['font-size'])
            if 'text-align' in d:
                th_align = d['text-align'].strip().lower()
            if 'font-weight' in d:
                th_weight = weight_of(d['font-weight'])
        elif tag == 'td' and 'font-size' in d:
            td_size = px_of(d['font-size'])

    if td_size is None:
        m = re.search(r'\bbody\s*\{[^}]*font-size\s*:\s*([^;]+);', src, re.I)
        td_size = px_of(m.group(1)) if m else None

    problems = []
    eff_th_size = th_size if th_size is not None else td_size
    if eff_th_size is not None and td_size is not None and eff_th_size <= td_size:
        problems.append(
            f"헤더 폰트 {eff_th_size:g}px가 본문 {td_size:g}px 이하"
            + ("(명시적으로 키우지 않아 상속됨)" if th_size is None else "")
        )
    if th_align not in (None, "center"):
        problems.append(f"text-align이 `{th_align}` — center 아님")
    if th_weight is not None and th_weight < 700:
        problems.append(f"font-weight {th_weight} — 700 이상 필요")

    if problems:
        fail("표 헤더가 본문과 구별 안 됨(`references/ui-patterns.md` 표 헤더 규칙): " + " · ".join(problems))
    else:
        ok("표 헤더가 본문 대비 크고 굵고 가운데 정렬됨")


def check_text_contrast(src, vars_):
    """SKILL.md '전 챕터 공통 수치'의 대비 기준(본문 4.5:1 / large 3:1)을 실제로 잰다.

    e라운드까지 이 검사가 없었다 — 규범은 '항상 적용'으로 적혀 있는데 재는 코드가 0개라,
    지표 타일의 amber-on-amber 1.84:1이 16 PASS 안에서 그대로 통과했다.

    페어링은 오탐을 줄이려고 두 경로만 쓴다:
      (a) 같은 블록이 color와 background를 함께 선언 → 확정 페어(FAIL)
      (b) 조상 선택자 블록이 background를 선언 → 확정 페어(FAIL). font-size도 조상에서 상속받는다
    배경을 못 찾은 텍스트는 페이지 배경 위에 있다고 가정하고 WARN까지만 낸다 — 카드 위에
    얹혀 있으면 실제 배경이 다르기 때문이다.
    """
    base = page_bg(src, vars_)
    rules = parse_rules(src)

    bg_rules = []
    for sel, block, media in rules:
        d = decls(block)
        c = color_in_value(d.get('background') or d.get('background-color'), vars_)
        if c:
            bg_rules.append((sel, c, d))

    fails, warns, checked = [], [], 0
    for sel, block, media in rules:
        d = decls(block)
        fg = color_in_value(d.get('color'), vars_)
        if not fg:
            continue

        own_bg = color_in_value(d.get('background') or d.get('background-color'), vars_)
        anc_sel, anc_bg, anc_d = None, None, None
        for bsel, bcolor, bd in bg_rules:
            if bsel != sel and is_ancestor_sel(bsel, sel):
                if anc_sel is None or len(bsel) > len(anc_sel):
                    anc_sel, anc_bg, anc_d = bsel, bcolor, bd

        bg = own_bg or anc_bg
        certain = bg is not None
        if bg is None:
            bg = (base + (1.0,)) if base else None
        if bg is None:
            continue
        if base is None and bg[3] < 1:
            continue

        # 반투명 배경은 그 아래 면 위에 합성해야 실제 표시색이 나온다. .contact .btn-ghost의
        # rgba(255,255,255,.14)를 페이지 배경 위에 얹으면 흰 면이 되지만, 실제로는 .contact의
        # 파란 면 위라 연한 파랑이다 — 아래 면을 조상에서 먼저 찾는다.
        under = base
        if own_bg and own_bg[3] < 1 and anc_bg:
            under = composite(anc_bg, base) if base else anc_bg[:3]
        bg_rgb = composite(bg, under) if under else bg[:3]
        fg_rgb = composite(fg, bg_rgb)

        size = px_of(d.get('font-size') or '')
        if size is None and anc_d:
            size = px_of(anc_d.get('font-size') or '')
        weight = weight_of(d.get('font-weight') or '') or (weight_of(anc_d.get('font-weight') or '') if anc_d else None)

        need = needed_ratio(size, weight)
        ratio = _contrast_ratio(fg_rgb, bg_rgb)
        checked += 1
        if ratio >= need:
            continue
        on = '자체 배경' if own_bg and own_bg[3] >= 1 else (anc_sel or '페이지 배경')
        label = f"{sel} {{color:{d.get('color')}}} on {on} — {ratio:.2f}:1 (기준 {need}:1{f', {size:g}px' if size else ''})"
        (fails if certain else warns).append(label)

    if not checked:
        warn("텍스트 색/배경 페어를 하나도 못 찾음 — 대비는 직접 육안 확인 필요")
        return
    if fails:
        fail("텍스트 대비 미달 — 배경이 확정된 조합이다: " + " / ".join(fails[:8]))
    for w in warns[:5]:
        warn("텍스트 대비 미달 의심(배경을 페이지 배경으로 가정) — 이 요소가 카드 위에 얹혀 있으면 실제 배경으로 다시 잰다: " + w)
    if not fails and not warns:
        ok(f"텍스트/배경 페어 {checked}종 전부 대비 기준 통과")


def check_section_band_contrast(src, vars_):
    """섹션 배경 밴드가 페이지 배경과 구별되는지. 섹션 리듬이 실제로 보이는가의 문제다."""
    base = page_bg(src, vars_)
    if not base:
        warn("페이지 배경색을 자동으로 못 찾음 — 섹션 밴드 대비는 직접 육안 확인 필요")
        return

    bg_by_class = {}
    for sel, block, _media in parse_rules(src):
        m = re.match(r'^\.([\w-]+)$', sel.strip())
        if not m:
            continue
        d = decls(block)
        c = color_in_value(d.get('background') or d.get('background-color'), vars_)
        if c:
            bg_by_class[m.group(1)] = (c, d.get('background') or d.get('background-color'))

    bands, offenders = 0, []
    for m in re.finditer(r'<section[^>]*class="([^"]+)"', src, re.I):
        for cls in m.group(1).split():
            if cls not in bg_by_class:
                continue
            color, raw = bg_by_class[cls]
            rgb = composite(color, base)
            delta = sum(abs(a - b) for a, b in zip(rgb, base)) / 3
            bands += 1
            if delta < 10:
                offenders.append(f".{cls}(background:{raw}) 델타 {delta:.1f}")

    if not bands:
        ok("배경 밴드를 쓴 섹션 없음 — 섹션 밴드 대비 요구사항 해당 없음")
        return
    if offenders:
        fail("섹션 배경 밴드가 페이지 배경과 델타 10 미만 — 섹션 전환이 화면에서 안 보인다(색만 바꾼 시늉이 된다): "
             + " / ".join(offenders) + ". 톤을 더 벌리거나 액센트 면·표면 그림자 같은 다른 구분 장치로 바꾼다(color.md '행·구분선도 색의 자원이다')")
    else:
        ok(f"섹션 배경 밴드 {bands}개 전부 페이지 배경과 델타 10 이상")


def check_type_scale(src, vars_):
    """typography.md '역할 기반 타입 스케일' — 토큰 밖 크기 금지를 기계적으로 잰다.

    font-size를 var(--fs-*)로 쓰면 리터럴 px가 안 보여서 이 검사가 통째로 무력화됐다
    (다크 대시보드 프로브에서 12종을 쓰는데 검사가 본 건 0개였다). spacing에서 같은
    구멍을 메웠으면서 여기는 빠뜨렸다 — 토큰을 쓰는 더 좋은 코드가 검사를 빠져나가면 안 된다.
    """
    # 인라인이라도 var(--fs-*) 역할 토큰을 쓴 건 스케일 안에 있다 — 문제는 하드코딩된 px다.
    inline = [s.strip() for s in re.findall(r'style="[^"]*font-size\s*:\s*([^;"]+)', src, re.I)]
    hardcoded = [s for s in inline if not re.match(r'var\(--', s.strip(), re.I)]
    if hardcoded:
        fail(f"인라인 style로 하드코딩한 font-size {len(hardcoded)}곳({', '.join(sorted(set(hardcoded))[:6])}) — 타입 스케일 밖에서 크기를 즉흥으로 고른 것이다. 역할 토큰으로 옮긴다(typography.md '역할 기반 타입 스케일 10토큰')")

    sizes = set()
    for _sel, block, _media in parse_rules(src):
        v = decls(block).get('font-size')
        if not v:
            continue
        p = px_of(resolve_var(v, vars_))
        if p:
            sizes.add(p)
    if len(sizes) < 2:
        return

    genre = genre_of(src)
    cap = GENRE_RULES.get(genre, {}).get("type_max", 10)
    ordered = sorted(sizes)
    if len(ordered) > cap:
        fail(f"font-size 종류 {len(ordered)}개({', '.join(f'{s:g}' for s in ordered)}px) — '{genre or '마케팅'}' 장르 상한 {cap}개를 넘었다. 크기를 역할로 묶는다(typography.md)")

    crowded = [(a, b) for a, b in zip(ordered, ordered[1:]) if b / a < 1.125]
    if len(crowded) >= 3:
        fail("인접 크기 단계가 1.125배 미만으로 붙은 구간 "
             + f"{len(crowded)}곳({', '.join(f'{a:g}→{b:g}' for a, b in crowded[:6])}px) — 비율이 아니라 감으로 고른 값이다. 화면에서 두 단계가 구별되지 않으면 스케일이 아니다(typography.md)")
    elif not crowded and len(ordered) <= cap:
        ok(f"font-size {len(ordered)}종, 인접 단계 간격 양호 — 타입 스케일 성립")


def _rgb_to_hsl(rgb):
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


def check_accent_hue_count(src, vars_):
    """color.md '액센트 컬러 — 중립 팔레트 위 단 하나의 강조색'을 색상환 거리로 잰다.

    memphis/neobrutal은 다색이 스타일 정의라 예외다(styles.md '예외는 색의 개수다').
    그 경우 소스에 `/* style: memphis */` 처럼 스타일을 명시하면 통과시킨다.
    """
    if re.search(r'/\*\s*style\s*:\s*(memphis|neobrutal|acid|y2k|vaporwave)', src, re.I):
        ok("다색이 정의인 스타일로 선언됨 — 액센트 개수 검사 면제")
        return

    hues = []
    for key, raw in vars_.items():
        if not re.search(r'^--acc(ent)?(\b|-)', key, re.I):
            continue
        rgb = hex_to_rgb(resolve_var(raw, vars_))
        if not rgb:
            continue
        hue, _sat, light = _rgb_to_hsl(rgb)
        if chroma_of(rgb) < 0.10 or light > 0.97 or light < 0.06:
            continue
        hues.append((hue, key))

    clusters = []
    for hue, key in sorted(hues):
        placed = False
        for c in clusters:
            if min(abs(hue - h) for h, _k in c) <= 40 or min(360 - abs(hue - h) for h, _k in c) <= 40:
                c.append((hue, key))
                placed = True
                break
        if not placed:
            clusters.append([(hue, key)])

    if len(clusters) >= 3:
        names = ["+".join(k for _h, k in c) for c in clusters]
        fail(f"채도 있는 액센트 계열이 색상환에서 {len(clusters)}갈래({' / '.join(names)}) — 액센트 1개 원칙 위반이다. 계열 하나를 브랜드 액센트로 남기고 나머지는 시맨틱 역할(--ok/--warn/--err/--info)을 부여하거나 중립 명도 차로 대체한다(color.md '액센트 컬러', '콘텐츠 내부 강조')")
    elif clusters:
        ok(f"액센트 색상 계열 {len(clusters)}갈래 — 액센트 1개 원칙 범위")


# 장르마다 "좋은 설계"의 정의가 다르다. 다크 대시보드에 걸어보고 알았다 —
# radius 10 · 하드섀도 없음 · 그라데이션 없음은 마케팅 페이지에선 커밋 부족이지만
# 밀도 높은 앱 UI에선 올바른 선택이다. 장르 없이 한 잣대를 강요하면 오탐이 된다.
GENRE_RULES = {
    "마케팅": {"type_max": 10, "commit": True},   # 랜딩·포트폴리오·브랜드
    "앱":     {"type_max": 14, "commit": False},  # 대시보드·어드민·툴
    "문서":   {"type_max": 12, "commit": False},  # 레퍼런스·아티클
}

# 밴드 지표는 HSL 채도가 아니라 **크로마 (max-min)/255**다.
# HSL S는 최대 채널이 255이기만 하면 아무리 밝아도 1.00이 된다 — 산성 라임(#C4F000)과
# 평범한 다크 UI 액센트 블루(#4C9AFF)가 둘 다 S=1.00으로 나와 구별이 안 됐다.
# 크로마로 재면 0.94 vs 0.70으로 갈린다.
TONE_BANDS = {
    # 톤: (크로마 하한, 크로마 상한, 면적 하한%, 면적 상한%)
    "절제": (0.0, 0.78, 5, 10),
    "중립": (0.20, 0.90, 6, 12),
    "임팩트": (0.45, 1.01, 8, 18),
}


def chroma_of(rgb):
    return (max(rgb) - min(rgb)) / 255


def parse_plan(src):
    """<style> 안의 /* plan ... */ 블록 → {키: 값}."""
    m = re.search(r'/\*\s*plan\b(.*?)\*/', src, re.S | re.I)
    if not m:
        return None
    plan = {}
    for line in m.group(1).splitlines():
        for part in line.split('|'):
            kv = re.match(r'\s*([가-힣A-Za-z_-]+)\s*:\s*(.+?)\s*$', part)
            if kv:
                plan[kv.group(1).strip()] = kv.group(2).strip()
    return plan


def check_plan_declaration(src, vars_):
    """SKILL.md TPO 판정에서 확정한 톤을 실제 액센트 채도와 대조한다.

    g라운드 회고: 계획에 "색상 조합: 절제"라고 적어놓고 채도 100%의 형광 라임(#C4F000,
    S=1.00 L=0.47)을 칠했다. 계획과 구현이 어긋나도 재는 것이 없어서 21 PASS로 통과했다.
    산문 규칙("상황에 맞게")은 실행자가 자기 계획과 반대로 가는 것을 막지 못한다.
    """
    plan = parse_plan(src)
    if not plan:
        fail("`/* plan ... */` 블록이 <style> 안에 없다 — TPO 판정 결과(판돈·어조·톤·스타일)를 산출물에 심어야 계획과 구현을 대조할 수 있다(SKILL.md '계획을 산출물 안에 심는다')")
        return
    tone = plan.get("톤")
    if tone not in TONE_BANDS:
        fail(f"plan 블록의 `톤:` 값이 '{tone}'이다 — {'/'.join(TONE_BANDS)} 중 하나여야 한다(SKILL.md 'TPO 판정')")
        return
    ok(f"plan 블록 있음 — 톤 '{tone}' 선언")

    s_min, s_max, _a_min, _a_max = TONE_BANDS[tone]
    # 고밀도 크로마 차감은 폐지했다 — "밀도가 높으면 색이 먼저 보인다"는 우려는 채도가 아니라
    # **면적**의 문제이고, 면적은 render_audit이 실측한다. 크로마까지 깎으면 이중 계산이라
    # 문서 사이트의 표준 링크 블루(#0A5FB4, 크로마 0.67)마저 FAIL이 났다.
    offenders = []
    for key, raw in vars_.items():
        if not re.search(r'^--acc(ent)?(\b|-)', key, re.I):
            continue
        rgb = hex_to_rgb(resolve_var(raw, vars_))
        if not rgb:
            continue
        _hue, _sat, light = _rgb_to_hsl(rgb)
        c = chroma_of(rgb)
        if light > 0.95 or light < 0.06:
            continue
        neon = c > 0.85 and 0.35 <= light <= 0.75
        if c > s_max or (tone == "절제" and neon):
            offenders.append(f"{key}={raw} (크로마={c:.2f}, L={light:.2f}{', 형광' if neon else ''})")
        elif c < s_min and re.match(r'^--acc(ent)?(-(500|base|fill))?$', key, re.I):
            # 하한은 주 액센트에만 적용한다 — 컨테이너·틴트·on-color는 크로마가 낮은 게 정상이다
            offenders.append(f"{key}={raw} (크로마={c:.2f} — 주 액센트 하한 {s_min} 미달)")

    if offenders:
        fail(f"선언한 톤 '{tone}'의 크로마 밴드({s_min}–{s_max})를 액센트가 벗어난다: {', '.join(offenders[:4])} "
             f"— 계획과 구현이 어긋났다. 톤 판정을 바꾸든 색을 바꾸든 둘을 일치시킨다(SKILL.md 'TPO 판정')")
    else:
        ok(f"액센트 크로마가 선언한 톤 '{tone}'의 밴드({s_min}–{s_max}) 안")


def page_luminance(src, vars_):
    rgb = page_bg(src, vars_)
    return _relative_luminance(rgb) if rgb else 1.0


def is_dark(src, vars_):
    """다크 테마인가. 임계값이 라이트 전제로 잡혀 있어서 테마를 먼저 알아야 한다."""
    return page_luminance(src, vars_) < 0.2


def genre_of(src):
    plan = parse_plan(src) or {}
    return plan.get("장르")


def check_style_commitment(src, vars_):
    """styles.md 필수 'DNA 8축 중 최소 2–3개 축에서 뚜렷한 값(0 또는 4–5)'을 잰다.

    금지 7종(minimal/flat/corporate)의 정의는 'DNA 8축이 전부 중간값'이다 — 산문 규칙과
    "이름을 가려도 구별되는가"라는 자문자답만 있었고, 자문자답은 늘 통과했다.
    아래는 커밋 신호를 세는 휴리스틱이라 통과해도 스크린샷으로 재확인한다.
    """
    # 선택자 '전체'가 단일 클래스일 때만 카드로 센다. 앞부분만 매칭하면
    # `.timeline li::before { border-radius:50%; box-shadow:... }`(타임라인 점) 때문에
    # .timeline이 카드로 잡히고, 그 border-left 3px가 "카드 보더"로 오인된다.
    card_classes = set()
    for sel, block, _media in parse_rules(src):
        d = decls(block)
        if 'box-shadow' in d and 'border-radius' in d:
            m = re.match(r'^\.([\w-]+)$', sel.strip())
            if m:
                card_classes.add(m.group(1))

    signals = []

    radii = []
    for _sel, block, _media in parse_rules(src):
        p = px_of(decls(block).get('border-radius') or '')
        if p is not None and p < 100:
            radii.append(p)
    if radii and (max(radii) >= 24 or max(radii) <= 2):
        signals.append(f"radius 극단({max(radii):g}px)")

    card_border = 0.0
    for sel, block, _media in parse_rules(src):
        m = re.match(r'^\.([\w-]+)$', sel.strip())
        if not m or m.group(1) not in card_classes:
            continue
        for prop, value in decls(block).items():
            if re.match(r'^border(-(top|right|bottom|left))?$', prop) and 'none' not in value.lower():
                card_border = max(card_border, px_of(value) or 0)
    if card_border >= 3:
        signals.append(f"카드 보더 {card_border:g}px")

    shadows = " ".join(v for k, v in vars_.items() if 'shadow' in k.lower())
    for _sel, block, _media in parse_rules(src):
        s = decls(block).get('box-shadow')
        if s:
            shadows += " " + s
    resolved = shadows
    for key, raw in vars_.items():
        resolved = resolved.replace(f"var({key})", raw)

    alphas = [float(a) for a in re.findall(r'rgba?\([^)]*?,\s*(\.\d+|0?\.\d+|1)\s*\)', resolved)]
    if alphas and max(alphas) >= 0.18:
        signals.append(f"그림자 최대 alpha {max(alphas):.2f}")
    if re.search(r'\b\d+px\s+\d+px\s+0(px)?\b', resolved) or re.search(r'\b[1-9]\d*px\s+[1-9]\d*px\s+0\b', resolved):
        signals.append("하드 오프셋 섀도(blur 0)")
    # backdrop-filter는 sticky 헤더에 관용적으로 붙는다 — 그것만으로 glass를 채택했다고
    # 볼 수 없다. 카드/표면 요소에 걸렸을 때만 커밋 신호로 센다.
    for sel, block, _media in parse_rules(src):
        if not re.search(r'backdrop-filter\s*:\s*blur', block, re.I):
            continue
        if re.match(r'^\s*(nav|header|footer)\b', sel, re.I):
            continue
        signals.append("backdrop-filter blur (glass 계열)")
        break
    if re.search(r'background(-image)?\s*:[^;]*gradient\(', src, re.I):
        signals.append("배경 그라데이션")

    genre = genre_of(src)
    if genre in GENRE_RULES and not GENRE_RULES[genre]["commit"]:
        # 앱·문서 장르에서 커밋 신호를 요구하면 오탐이다 — 이 장르의 슬롭은
        # "커밋이 없는 것"이 아니라 "값이 제각각인 것"이다. 일관성을 대신 잰다.
        radii, shadows = set(), set()
        for _sel, block, _m in parse_rules(src):
            d = decls(block)
            r = d.get('border-radius')
            if r:
                radii.add(resolve_var(r, vars_).strip())
            sh = d.get('box-shadow')
            if sh and sh.strip().lower() != 'none':
                shadows.add(resolve_var(sh, vars_).strip())
        if len(radii) > 4:
            fail(f"radius 값이 {len(radii)}종({', '.join(sorted(radii)[:6])}) — '{genre}' 장르의 슬롭은 커밋 부족이 아니라 값이 제각각인 것이다. 역할별로 3~4종 이하로 묶는다(design-system.md)")
        elif len(shadows) > 4:
            fail(f"box-shadow 정의가 {len(shadows)}종 — elevation 단계를 3~4개로 정하고 그 안에서만 쓴다(design-system.md)")
        else:
            ok(f"'{genre}' 장르 — radius {len(radii)}종 · shadow {len(shadows)}종으로 일관성 유지 (커밋 신호는 이 장르에 요구하지 않음)")
        return

    if not signals:
        fail("스타일 커밋 신호가 하나도 없다 — radius는 중간값, 카드 보더 없음, 그림자는 alpha "
             f"{max(alphas) if alphas else 0:.2f}로 사실상 안 보이고, 하드 섀도·backdrop-filter·그라데이션도 없다. "
             "이게 styles.md가 금지 7종으로 지정한 minimal/flat/corporate의 정의(DNA 8축 전부 중간값) 그 자체다. "
             "메인 레퍼런스 8종 중 하나를 골라 최소 2–3개 축을 0 또는 4–5로 민다(styles.md '메인 레퍼런스 8종', 금지/필수)")
    elif len(signals) == 1:
        warn(f"스타일 커밋 신호가 1개뿐({signals[0]}) — styles.md 필수는 2–3개 축이다. 축을 하나 더 극단으로 민다")
    else:
        ok(f"스타일 커밋 신호 {len(signals)}종: {', '.join(signals)}")


def check_headline_wrap(src):
    """헤드라인이 뷰포트 폭에 따라 깨지지 않는지 — <br>과 balance의 충돌, 반응형 부재."""
    balanced_keys = set()
    for sel, block, _media in parse_rules(src):
        if re.search(r'text-wrap\s*:\s*balance', block, re.I):
            last = sel.strip().split()[-1]
            m = re.search(r'([\w-]+)$', re.sub(r'::?[\w-]+$', '', last))
            if m:
                balanced_keys.add(m.group(1))

    for key in sorted(balanced_keys):
        for om in re.finditer(r'<' + re.escape(key) + r'\b[^>]*>(.*?)</' + re.escape(key) + r'>', src, re.S | re.I):
            if re.search(r'<br\b', om.group(1), re.I):
                fail(f"<{key}>에 text-wrap: balance와 수동 <br>이 함께 걸려 있다 — balance가 계산한 줄 나눔과 <br>이 겹쳐, 폭이 좁아지면 의도한 줄 수보다 늘고 마지막 줄에 단어 하나만 남는다. 둘 중 하나만 쓴다(typography.md)")
                break

    big = []
    for _sel, block, media in parse_rules(src):
        p = px_of(decls(block).get('font-size') or '')
        if p and p >= 40 and media is None:
            big.append(p)
    if not big:
        return
    responsive = any(media and 'font-size' in decls(block) for _sel, block, media in parse_rules(src))
    if not responsive:
        fail(f"{max(big):g}px 대형 헤드라인이 있는데 @media 안에 font-size 오버라이드가 하나도 없다 — 좁은 화면에서 그대로 {max(big):g}px로 그려져 화면을 잡아먹는다. 브레이크포인트마다 disp 토큰을 다시 정한다(typography.md)")
    else:
        ok("대형 헤드라인에 반응형 font-size 오버라이드 있음")


def check_grid_span_arithmetic(src):
    """그리드 자동 배치를 흉내내 '중간 행에 생기는 구멍'을 잡는다.

    g2라운드에서 실제로 나온 결함: 6열 bento에 span 4 / 2 / 2 / 2 / 6을 넣었더니
    3번째 행에서 span 6이 들어갈 자리가 모자라 줄바꿈되고, 그 앞 행의 오른쪽 2칸이
    통째로 비었다. layout.md "카드 그리드 열 수 정합성"이 산문으로 있었지만 span이
    섞이면 사람이 암산으로 못 잡는다 — 산술이라 기계가 세는 게 맞다.

    마지막 행이 덜 찬 것은 정상(아이템이 열 수의 배수가 아닐 뿐)이라 잡지 않는다.
    미디어 쿼리 밖(기본 레이아웃) 규칙만 본다.
    """
    cols, spans = {}, {}
    for sel, block, media in parse_rules(src):
        if media is not None:
            continue
        m = re.match(r'^\.([\w-]+)$', sel.strip())
        if not m:
            continue
        d = decls(block)
        tpl = d.get('grid-template-columns')
        if tpl:
            rm = re.match(r'repeat\(\s*(\d+)\s*,', tpl.strip())
            if rm:
                cols[m.group(1)] = int(rm.group(1))
            else:
                toks = tpl.split()
                if len(toks) >= 2 and all(re.search(r'(fr|px|%|auto|minmax)', t) for t in toks):
                    cols[m.group(1)] = len(toks)
        gc = d.get('grid-column')
        if gc:
            sm = re.search(r'span\s+(\d+)', gc)
            if sm:
                spans[m.group(1)] = int(sm.group(1))
            elif re.search(r'1\s*/\s*-1', gc):
                spans[m.group(1)] = 0        # 0 = 한 행 전체

    holes = []
    for cls, n in cols.items():
        if n < 2:
            continue
        for om in re.finditer(r'<[a-z]+[^>]*class="[^"]*\b' + re.escape(cls) + r'\b[^"]*"[^>]*>', src, re.I):
            inner = _extract_div_block(src, om.end())
            children = re.findall(r'<[a-z]+[^>]*class="([^"]*)"[^>]*>', inner, re.I)
            items = []
            depth = 0
            for m2 in re.finditer(r'<(/?)([a-z]+)\b([^>]*)>', inner, re.I):
                closing, _tag, attrs = m2.group(1), m2.group(2), m2.group(3)
                if closing:
                    depth -= 1
                    continue
                if depth == 0:
                    cm = re.search(r'class="([^"]*)"', attrs)
                    names = cm.group(1).split() if cm else []
                    span = 1
                    for nm in names:
                        if nm in spans:
                            span = n if spans[nm] == 0 else spans[nm]
                    items.append(min(span, n))
                if not attrs.rstrip().endswith('/'):
                    depth += 1
            if len(items) < 2:
                continue
            cursor, gap_rows = 0, []
            for span in items:
                if cursor and cursor + span > n:
                    gap_rows.append(n - cursor)
                    cursor = 0
                cursor += span
                if cursor >= n:
                    cursor = 0
            if gap_rows:
                holes.append(f".{cls}({n}열, span {items}) — 중간 행에 빈 칸 {gap_rows}개 발생")
            break   # 같은 클래스는 한 인스턴스만 본다

    if holes:
        fail("그리드 중간 행에 구멍이 생긴다 — span 합이 열 수에 맞지 않아 줄바꿈되면서 앞 행 오른쪽이 통째로 빈다: "
             + " / ".join(holes[:4])
             + ". span을 조정해 각 행의 합이 열 수와 맞게 하거나 열 수를 바꾼다(layout.md '카드 그리드 열 수 정합성')")
    elif cols:
        ok(f"그리드 {len(cols)}종의 span 배치에 중간 행 구멍 없음")


def check_single_child_space_between(src):
    """자식이 1개인데 space-between — 카드 오른쪽 절반이 통째로 빈다."""
    sb_classes = set()
    for sel, block, _media in parse_rules(src):
        if re.search(r'justify-content\s*:\s*space-between', block, re.I):
            m = re.match(r'^\.([\w-]+)$', sel.strip())
            if m:
                sb_classes.add(m.group(1))

    for cls in sorted(sb_classes):
        for om in re.finditer(r'<div[^>]*class="[^"]*\b' + re.escape(cls) + r'\b[^"]*"[^>]*>', src):
            inner = _extract_div_block(src, om.end())
            if len(_top_level_div_children(inner)) == 1:
                fail(f".{cls}에 justify-content: space-between이 걸려 있는데 자식이 1개다 — 벌릴 상대가 없어 콘텐츠가 왼쪽에 붙고 나머지 폭이 통째로 빈다. 자식을 하나 더 넣거나 space-between을 뺀다")
                return
    if sb_classes:
        ok("space-between 컨테이너에 자식 1개짜리 없음")


# ─────────────────────────────────────────────────────────────────────────────
# 레이아웃 구성 — layout.md "섹션 레이아웃 패밀리 반복 상한" · "동급 항목 비중 차등"
#
# 프로필 라운드 회고: 규범이 "토큰 값을 통일하라"까지만 있어서 통일이 구성 층위로
# 번졌다. stat-tile·flow-step·timeline-card 세 블록이 연속으로 같은 흰 카드 그리드였고,
# Featured Work 4개가 전부 같은 템플릿이라 636개 테스트짜리 대형 프로젝트와 단일 기능
# 프로젝트가 같은 무게로 읽혔다 — 정보위계 12.0 vs 14.0 · 설득력 16.5 vs 18.5로 졌다.
#
# 정적 소스만으로 "이 섹션이 무슨 패밀리인가"를 확정할 수는 없다(시그니처 휴리스틱이다).
# 그래서 기본 판정은 WARN이고, 정규화한 그리드 시그니처가 연속 4섹션 이상 같을 때만
# FAIL로 올린다 — 그 경우는 값 자체가 같아서 오탐 여지가 없다.
# 장르가 앱·문서면 통째로 스킵한다: 사이드바+콘텐츠와 표 반복이 그 장르의 정상 구조다.
# ─────────────────────────────────────────────────────────────────────────────

COMPOSITION_SKIP_GENRES = {"앱", "문서"}
VOID_TAGS = {"br", "img", "input", "hr", "meta", "link", "source", "area",
             "base", "col", "embed", "param", "track", "wbr"}


def _split_tracks(value):
    """grid-template-columns 값 → 트랙 리스트. `minmax(300px, 1fr)`는 한 트랙으로 센다."""
    tracks, depth, buf = [], 0, ''
    for ch in value.strip().rstrip(';'):
        if ch == '(':
            depth += 1
        elif ch == ')':
            depth -= 1
        if ch.isspace() and depth == 0:
            if buf:
                tracks.append(buf)
                buf = ''
            continue
        buf += ch
    if buf:
        tracks.append(buf)
    return tracks


def _class_rule_index(src):
    """[(필요 클래스 집합, 선언 dict)] — 클래스 토큰만으로 이뤄진 비-미디어 규칙.

    `.hero .wrap`은 {hero, wrap}이 그 섹션 안에 다 있을 때만 적용된 것으로 본다.
    태그·id·의사 선택자가 섞인 규칙은 오탐 여지가 커서 제외한다.
    """
    index = []
    for sel, block, media in parse_rules(src):
        if media is not None:
            continue
        parts = re.split(r'[\s>+~]+', sel.strip())
        if not parts or not all(re.fullmatch(r'(\.[\w-]+)+', p) for p in parts if p):
            continue
        need = set(re.findall(r'\.([\w-]+)', sel))
        if need:
            index.append((need, decls(block)))
    return index


def _classes_in(html):
    names = set()
    for m in re.finditer(r'class="([^"]*)"', html):
        names.update(m.group(1).split())
    return names


def _top_level_children(html):
    """html의 최상위 엘리먼트 자식 [(tag, attrs, inner)]."""
    out, depth, start, cur = [], 0, None, None
    for m in re.finditer(r'<(/?)([a-zA-Z][\w-]*)\b([^>]*)>', html):
        closing, tag, attrs = m.group(1), m.group(2).lower(), m.group(3)
        if closing:
            depth = max(depth - 1, 0)
            if depth == 0 and cur is not None:
                out.append((cur[0], cur[1], html[start:m.start()]))
                cur = None
            continue
        if tag in VOID_TAGS or attrs.rstrip().endswith('/'):
            if depth == 0:
                out.append((tag, attrs, ''))
            continue
        if depth == 0:
            cur, start = (tag, attrs), m.end()
        depth += 1
    return out


def _extract_tag_block(src, tag, open_tag_end):
    """같은 태그의 중첩 depth를 세어 매칭되는 닫는 태그까지의 내부 HTML."""
    depth = 1
    for m in re.finditer(r'<(/?)' + tag + r'\b', src[open_tag_end:], re.I):
        depth += -1 if m.group(1) else 1
        if depth == 0:
            return src[open_tag_end: open_tag_end + m.start()]
    return src[open_tag_end:]


def _content_sections(src):
    """콘텐츠 섹션 [(attrs, inner)] — header/footer/nav는 세지 않는다.

    `<section>`이 4개 미만이면 div로 섹션을 짠 페이지일 수 있어, body/main의 최상위
    자식 중 제목(h1/h2)을 가진 div·article을 섹션으로 본다.
    """
    body = re.search(r'<body[^>]*>(.*)</body>', src, re.S | re.I)
    html = body.group(1) if body else src
    out, depth, start, attrs = [], 0, None, None
    for m in re.finditer(r'<(/?)section\b([^>]*)>', html, re.I):
        if m.group(1):
            depth = max(depth - 1, 0)
            if depth == 0 and start is not None:
                out.append((attrs, html[start:m.start()]))
                start = None
        else:
            if depth == 0:
                start, attrs = m.end(), m.group(2)
            depth += 1
    if len(out) >= 4:
        return out
    main = re.search(r'<main[^>]*>(.*)</main>', html, re.S | re.I)
    scope = main.group(1) if main else html
    div_sections = [(a, inner) for tag, a, inner in _top_level_children(scope)
                    if tag in ('div', 'article', 'section') and re.search(r'<h[12]\b', inner, re.I)]
    return div_sections if len(div_sections) > len(out) else out


def _section_family(attrs, inner, index):
    """섹션 → (패밀리, 정규화 시그니처). layout.md '섹션 레이아웃 패밀리 반복 상한' 표."""
    classes = _classes_in(attrs) | _classes_in(inner)
    if re.search(r'<table\b', inner, re.I):
        return ('표·지표', 'table')
    if any(re.search(r'(^|-)(timeline|chrono|history)(-|$)', c, re.I) for c in classes):
        return ('축 시퀀스', 'timeline')

    applied = [d for need, d in index if need <= classes]
    best, best_n = None, 0
    for d in applied:
        tpl = d.get('grid-template-columns')
        if not tpl:
            continue
        rm = re.match(r'repeat\(\s*(\d+)\s*,', tpl.strip())
        n = int(rm.group(1)) if rm else len(_split_tracks(tpl))
        if n > best_n:
            best, best_n = tpl.strip(), n

    spans = {d['grid-column'] for d in applied
             if 'grid-column' in d and re.search(r'span\s+\d+', d['grid-column'])}
    if len(spans) >= 2:
        return ('비균등 셀', f'bento-{best_n or len(spans)}')

    if not best:
        return ('풀폭 흐름', 'flow')
    if re.search(r'auto-fit|auto-fill', best, re.I):
        return ('카드 그리드', 'autofit')
    rm = re.match(r'repeat\(\s*(\d+)\s*,', best)
    if rm:
        n = int(rm.group(1))
        return ('카드 그리드' if n >= 3 else '분할', f'repeat-{n}')
    toks = _split_tracks(best)
    if len(toks) == 2:
        return ('분할', 'split-2')
    if len(toks) >= 3:
        if len(set(toks)) == 1:
            return ('카드 그리드', f'equal-{len(toks)}')
        return ('비균등 셀', f'asym-{len(toks)}')
    return ('풀폭 흐름', 'flow')


def _max_run(seq):
    """[(값, 최대 연속 길이)] 중 가장 긴 연속 구간 → (값, 길이)."""
    best_val, best_len = (seq[0] if seq else None), 1 if seq else 0
    cur_len = 1
    for i in range(1, len(seq)):
        cur_len = cur_len + 1 if seq[i] == seq[i - 1] else 1
        if cur_len > best_len:
            best_val, best_len = seq[i], cur_len
    return best_val, best_len


def check_section_layout_variety(src):
    genre = genre_of(src)
    if genre in COMPOSITION_SKIP_GENRES:
        ok(f"'{genre}' 장르 — 섹션 패밀리 반복 상한 미적용(사이드바+콘텐츠·표 반복이 이 장르의 정상 구조)")
        return

    sections = _content_sections(src)
    if len(sections) < 4:
        ok(f"콘텐츠 섹션 {len(sections)}개 — 패밀리 반복 상한 판정 대상 아님(4섹션 이상부터)")
        return

    index = _class_rule_index(src)
    pairs = [_section_family(a, inner, index) for a, inner in sections]
    fams = [f for f, _s in pairs]
    sigs = [s for _f, s in pairs]
    n = len(pairs)

    sig_val, sig_run = _max_run(sigs)
    fam_val, fam_run = _max_run(fams)
    distinct = sorted(set(fams))

    reported = False
    if sig_run >= 4:
        fail(f"섹션 {n}개 중 {sig_run}개가 연속으로 같은 레이아웃 시그니처(`{sig_val}`)다 "
             f"— 섹션이 바뀌어도 같은 화면이 이어진다. 최소 한 섹션을 다른 패밀리(분할·풀폭 흐름·비균등 셀)로 "
             f"바꾼다(layout.md '섹션 레이아웃 패밀리 반복 상한': 동일 시그니처 연속 3섹션까지)")
        reported = True
    elif fam_run >= 3:
        warn(f"'{fam_val}' 패밀리가 연속 {fam_run}섹션 반복된다(전체 {n}섹션, 시그니처 {sigs}) "
             f"— 동일 패밀리는 연속 2섹션까지다. 렌더링해서 세 섹션이 서로 다른 화면으로 읽히는지 확인하고, "
             f"같아 보이면 가운데 섹션을 다른 패밀리로 바꾼다(layout.md '섹션 레이아웃 패밀리 반복 상한')")
        reported = True

    if n >= 8 and len(distinct) < 4:
        warn(f"콘텐츠 섹션 {n}개에 레이아웃 패밀리가 {len(distinct)}종({', '.join(distinct)})뿐 — 8섹션 이상은 4종 이상 쓴다(layout.md)")
        reported = True
    elif n >= 6 and len(distinct) < 3:
        warn(f"콘텐츠 섹션 {n}개에 레이아웃 패밀리가 {len(distinct)}종({', '.join(distinct)})뿐 — 6섹션 이상은 3종 이상 쓴다(layout.md)")
        reported = True
    elif n >= 5:
        top = max(distinct, key=fams.count)
        share = fams.count(top) / n
        if share > 0.6:
            warn(f"'{top}' 패밀리가 콘텐츠 섹션 {fams.count(top)}/{n}개({share * 100:.0f}%)를 차지한다 — 한 패밀리 점유율 상한 60%(layout.md)")
            reported = True

    if not reported:
        ok(f"섹션 {n}개 · 레이아웃 패밀리 {len(distinct)}종({', '.join(distinct)}) — 동일 패밀리 최대 연속 {fam_run}섹션")


def check_item_weight_differentiation(src):
    """동종 항목 4개 이상이 전부 같은 클래스·같은 구조인지 본다(비중 차등 부재).

    확신이 낮은 검사다 — 가격표·비교표처럼 정말 동급인 항목도 같은 모양이 정답이라
    전부 WARN으로 낸다. 항목이 짧으면(칩·스텝·KPI 타일) 애초에 차등 대상이 아니라
    항목당 평균 12단어 이상일 때만 본다 — 한국어는 조사가 붙어 영어보다 단어 수가
    적게 세지므로 영어 기준(20단어대)을 그대로 쓰면 실제 프로젝트 카드가 빠져나간다.
    """
    genre = genre_of(src)
    if genre in COMPOSITION_SKIP_GENRES:
        ok(f"'{genre}' 장르 — 동급 항목 비중 차등 미적용(균일한 목록·표가 이 장르의 정상 구조)")
        return

    grid_classes = set()
    for sel, block, media in parse_rules(src):
        if media is not None:
            continue
        if 'grid-template-columns' not in decls(block):
            continue
        last = re.split(r'[\s>+~]+', sel.strip())[-1]
        m = re.fullmatch(r'\.([\w-]+)', last)
        if m:
            grid_classes.add(m.group(1))

    flagged = []
    for cls in sorted(grid_classes):
        for om in re.finditer(r'<([a-z]+)[^>]*class="[^"]*\b' + re.escape(cls) + r'\b[^"]*"[^>]*>', src, re.I):
            inner = _extract_tag_block(src, om.group(1), om.end())
            children = _top_level_children(inner)
            if len(children) < 4:
                continue
            class_keys, struct_keys, words = set(), set(), []
            differentiated = False
            for tag, attrs, body in children:
                cm = re.search(r'class="([^"]*)"', attrs)
                class_keys.add((tag, ' '.join(sorted(cm.group(1).split())) if cm else ''))
                struct_keys.add(tuple(t.lower() for t in re.findall(r'<([a-zA-Z][\w-]*)\b', body)))
                words.append(len(re.sub(r'<[^>]+>', ' ', body).split()))
                if re.search(r'style="[^"]*grid-(column|row)', attrs, re.I):
                    differentiated = True
            if differentiated or len(class_keys) > 1 or len(struct_keys) > 1:
                continue
            if sum(words) / len(words) < 12:
                continue
            flagged.append(f".{cls} 안의 항목 {len(children)}개(평균 {sum(words) // len(words)}단어)가 전부 같은 클래스·같은 구조")
            break

    if not flagged:
        ok("동종 항목 4개 이상을 한 템플릿으로 찍어낸 그리드 없음")
        return
    for msg in flagged[:3]:
        warn(f"{msg} — 성과·비중이 다른 항목이 섞여 있으면 상대적 무게가 안 읽힌다. "
             f"콘텐츠 근거(가장 큰 성과 수치·가장 최근·지정 대표작)로 고른 1개를 전폭(`grid-column: 1 / -1`)이나 "
             f"다른 패밀리로 빼고 나머지는 압축한다(layout.md '동급 항목 비중 차등'). 항목들이 정말 동급이면(가격표·비교표) 그대로 둔다")


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    flags = {a for a in sys.argv[1:] if a.startswith("--")}
    if len(args) != 1:
        print("용법: python3 verify.py <html 파일 경로> [--static-only]")
        sys.exit(2)

    path = Path(args[0]).resolve()
    if not path.exists():
        print(f"파일 없음: {path}")
        sys.exit(2)

    if "--static-only" not in flags:
        feel_ok, feel_msg = check_feel_review(path)
        if not feel_ok:
            print("\n=== verify.py: 1단계(미적 독립 검토) 미통과로 실행 차단 ===\n")
            print(f"    {feel_msg}\n")
            print("verify.py를 직접 불러서 1단계를 우회할 수 없다 — gate.py로 전체 순서를 돈다.")
            print("토큰·plan만 잡는 초기 반복이면 --static-only로 이 검사를 건너뛴다.\n")
            sys.exit(2)

    src = path.read_text(encoding="utf-8")
    vars_ = extract_root_vars(src)
    VARS.clear(); VARS.update(vars_)   # px_of가 토큰을 자동으로 풀도록 한 곳에서 채운다

    check_skeleton(src)
    check_word_break(src)
    check_bg_surface_contrast(src, vars_)
    check_bg_anchoring(vars_)
    check_line_contrast(src, vars_)
    check_text_contrast(src, vars_)
    check_section_band_contrast(src, vars_)
    check_accent_fill(src, vars_)
    check_accent_hue_count(src, vars_)
    check_plan_declaration(src, vars_)
    check_style_commitment(src, vars_)
    check_font_loading(src)
    check_spacing_variety(src, vars_)
    check_type_scale(src, vars_)
    check_table_header(src, vars_)
    check_text_wrap_pretty(src)
    check_measure_consistency(src)
    check_headline_wrap(src)
    check_repeated_item_emphasis(src)
    check_positional_emphasis(src, vars_)
    check_grid_column_balance(src)
    check_grid_span_arithmetic(src)
    check_single_child_space_between(src)
    check_section_layout_variety(src)
    check_item_weight_differentiation(src)
    check_card_decoration_budget(src)
    check_placeholder_names(src)
    check_duplicate_cta(src)
    check_motion_declared(src)
    check_motion_forbidden(src)
    check_motion_entrance_easing(src)
    check_motion_budget(src)
    check_motion_hover_lift(src)
    check_reduced_motion(src)
    check_filler_copy(src)

    print(f"\n=== {path.name} 정적 검증 결과 ===\n")
    for m in PASSES:
        print(f"  PASS  {m}")
    for m in WARNS:
        print(f"  WARN  {m}")
    for m in FAILS:
        print(f"  FAIL  {m}")

    print(f"\n{len(PASSES)} pass · {len(WARNS)} warn · {len(FAILS)} fail\n")

    if FAILS:
        print("FAIL이 있는 상태로는 완료 보고하지 않는다. 위 항목을 고치고 재실행한다.")
        sys.exit(1)
    if WARNS:
        print("WARN은 코드만으로 확신 못하는 신호다 — 렌더링해서 직접 눈으로 확인한다.")
    sys.exit(0)


if __name__ == "__main__":
    main()
