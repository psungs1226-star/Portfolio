#!/usr/bin/env python3
"""1단계(미적 독립 검토) 기록의 공용 판정 모듈.

`gate.py`·`verify.py`·`render_audit.py`가 각자 복사해 갖고 있던 검사를 한 군데로 모았다.
규칙 자체는 그대로다 — 파일이 있어야 하고, 지금 html과 맞아야 하고, findings가 비어야 한다.

**바뀐 것은 하나**: "지금 html과 맞는가"를 sha256 완전 일치로만 보지 않는다.

왜 — 예전 규칙에서는 코드 게이트가 잡은 대비 미달 하나를 고치려고 hex 한 글자를 바꾸면
해시가 달라져서 **미적 검토 전체를 처음부터 다시** 받아야 했다. 미적 검토는 이 루프에서
가장 비싼 단계(별도 에이전트 + 전체 화면 판독)인데, 구도가 1픽셀도 안 바뀐 상태에서 그걸
다시 도는 건 회차만 늘린다. 그래서 **구조 지문**을 함께 본다:

    구조 지문 = html에서 <style>/style="" 안의 **색 리터럴만** 지운 뒤의 해시

색값을 뺀 나머지(DOM·텍스트·선택자·레이아웃/타이포 값·모션)가 전부 같으면 검토받은 그
화면과 **구도가 동일한 화면**이다. 이때만 직전 검토를 유효한 것으로 인정하고, 바뀐 색
선언을 전부 출력해서 사람이 감사할 수 있게 남긴다. 색 선언이 12곳을 넘게 바뀌면 그건
값 보정이 아니라 팔레트 갈아엎기이므로 면제하지 않는다.

구조가 조금이라도 달라지면(섹션 추가·클래스 변경·spacing/타입 값 변경·문구 수정) 예전과
똑같이 재검토를 요구한다.
"""

import hashlib
import json
import re

SUFFIX = ".feel-review.json"
SNAPSHOT_PREFIX = ".feel-review-snapshot-"
COLOR_DIFF_LIMIT = 12          # 이 수를 넘게 색이 바뀌면 팔레트 변경 — 재검토 대상

_COLOR_LITERAL = re.compile(
    r'#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\([^()]*\)', re.I)
_STYLE_BLOCK = re.compile(r'(<style[^>]*>)(.*?)(</style>)', re.S | re.I)
_STYLE_ATTR = re.compile(r'(style\s*=\s*")([^"]*)(")', re.I)


def path_for(html):
    return html.parent / f"{html.stem}{SUFFIX}"


def snapshot_path(html):
    """검토받은 시점의 html 사본 — 색 변경 면제를 판정할 때 비교 대상이 된다."""
    return html.parent / f"{SNAPSHOT_PREFIX}{html.stem}.html"


def sha256(data):
    return hashlib.sha256(data if isinstance(data, bytes) else data.encode("utf-8")).hexdigest()


def _strip_colors(css):
    return _COLOR_LITERAL.sub("·", css)


def structure_text(src):
    """색 리터럴만 지운 문서 — 구도가 같은지 비교하는 기준."""
    out = _STYLE_BLOCK.sub(lambda m: m.group(1) + _strip_colors(m.group(2)) + m.group(3), src)
    out = _STYLE_ATTR.sub(lambda m: m.group(1) + _strip_colors(m.group(2)) + m.group(3), out)
    return out


def structure_digest(src):
    return sha256(structure_text(src))


def color_declarations(src):
    """<style>/style= 안에서 색 리터럴을 품은 선언들 — [(prop, value)] 순서대로."""
    css = "".join(m.group(2) for m in _STYLE_BLOCK.finditer(src))
    css += "".join(";" + m.group(2) for m in _STYLE_ATTR.finditer(src))
    out = []
    for m in re.finditer(r'([-\w]+)\s*:\s*([^;{}]+)', css):
        value = m.group(2).strip()
        if _COLOR_LITERAL.search(value):
            out.append((m.group(1).strip().lower(), re.sub(r'\s+', ' ', value)))
    return out


def color_only_diff(old_src, new_src):
    """구조가 같고 색만 달라졌으면 [(prop, 이전, 이후)], 아니면 None."""
    if structure_digest(old_src) != structure_digest(new_src):
        return None
    before, after = color_declarations(old_src), color_declarations(new_src)
    if len(before) != len(after):        # 구조 지문이 같으면 선언 수도 같아야 정상이다
        return None
    return [(p, a, b) for (p, a), (_q, b) in zip(before, after) if a != b]


def check(html, stage="1단계(미적 독립 검토)"):
    """(ok, 실패 메시지, 통과 노트). 규칙은 세 가지 그대로 — 존재·일치·findings 빈 배열."""
    path = path_for(html)
    src_bytes = html.read_bytes()
    digest = sha256(src_bytes)
    if not path.exists():
        return False, (
            f"{stage} 미실시. `{path.name}`이 없다.\n"
            "    SKILL.md \"완료 전 — 게이트 루프\" 1단계대로 `scripts/shots.py`로 스크린샷을 뽑고,\n"
            "    별도 fresh 에이전트에 그 스크린샷만 줘서 미적 결함을 적대적으로 받아낸 뒤,\n"
            f"    shots.py가 찍어준 json 골격에 findings만 채워 {path.name}으로 저장한다.\n"
            "    findings가 비어 있어야(=결함 없음) 통과다."
        ), ""
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (ValueError, OSError):
        return False, f"`{path.name}`을 읽을 수 없다 — 형식이 깨졌다. 다시 작성한다.", ""

    findings = data.get("findings", [])
    if findings:
        lines = "\n".join(f"     · {f}" for f in findings)
        return False, f"{stage} 미적 결함 {len(findings)}건 — FAIL과 동급이다. 고치고 재검토한다:\n{lines}", ""

    if data.get("html_sha256") == digest:
        return True, "", ""

    # 해시 불일치 — 색값만 바뀐 경우에 한해 직전 검토를 인정한다(위 모듈 주석 참고)
    snap = snapshot_path(html)
    if snap.exists():
        try:
            old = snap.read_text(encoding="utf-8")
        except OSError:
            old = None
        if old is not None and sha256(old) == data.get("html_sha256"):
            diff = color_only_diff(old, src_bytes.decode("utf-8", "replace"))
            if diff is not None and len(diff) <= COLOR_DIFF_LIMIT:
                shown = " · ".join(f"{p}: {a} → {b}" for p, a, b in diff[:6])
                more = f" 외 {len(diff) - 6}곳" if len(diff) > 6 else ""
                return True, "", (
                    f"{stage} 재사용 — 검토 후 바뀐 것이 색값 {len(diff)}곳뿐이고 구조 지문이 같다"
                    f"({shown}{more}). 구도가 동일한 화면이라 재검토를 요구하지 않는다."
                    if diff else
                    f"{stage} 재사용 — 검토 후 색·공백 변경만 있었고 구조 지문이 같다."
                )
            if diff is not None:
                return False, (
                    f"{stage} 재검토 필요 — 색 선언이 {len(diff)}곳 바뀌었다(면제 상한 {COLOR_DIFF_LIMIT}곳).\n"
                    "    값 보정이 아니라 팔레트를 갈아엎은 것이므로 미적 판단이 달라진다. 다시 검토받는다."
                ), ""

    return False, (
        f"`{path.name}`이 지금 파일 내용과 안 맞다(구조가 바뀌었다) — html을 고친 뒤\n"
        f"    {stage} 재검토 없이 예전 통과 기록을 재사용하는 중이다.\n"
        "    `scripts/shots.py`를 다시 돌려 스크린샷과 json 골격을 새로 받고 재검토한다.\n"
        "    (색값만 바꾼 수정이라면 면제되는데 그렇게 판정되지 않았다 = 구조·문구·수치도 함께 바뀌었다는 뜻이다)"
    ), ""
