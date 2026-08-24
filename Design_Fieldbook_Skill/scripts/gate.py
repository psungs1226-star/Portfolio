#!/usr/bin/env python3
"""design-fieldbook 게이트 루프 드라이버.

용법:
    python3 gate.py <html>                  # 정적 + 렌더 전체 (수렴 판정)
    python3 gate.py <html> --static-only    # 정적만 (토큰·구조 잡을 때 빠르게 반복)
    python3 gate.py <html> --reset          # 이 파일의 루프 이력 초기화

`verify.py`와 `render_audit.py`를 한 번에 돌리고, **회차 간 상태를 기억한다.**

왜 필요한가 — SKILL.md에는 원래 "FAIL이 있으면 고치고 재실행한다"는 문장이 있었다.
그런데 문장은 루프를 돌리지 못한다. 실제로 g라운드에서 고친 "900px에서 카드 우측이
비는" 결함이 g2에서 그대로 재발했고, 아무도 그걸 재발로 인지하지 못했다 — 매 실행이
직전 실행을 모르기 때문이다. 이 드라이버는 회차별 findings를 저장해서 다음을 구분한다:

    신규 — 이번에 처음 나온 것
    잔존 — 지난 회차에도 있었고 아직 안 고친 것
    해결 — 지난 회차에 있었고 이번에 사라진 것
    재발 — 예전에 해결했는데 다시 나온 것  ← 이건 개별 수정 대상이 아니다

**재발과 3회 이상 잔존은 국소 수정으로 대응하지 않는다.** 같은 결함이 라운드를 넘어
돌아온다는 건 산출물이 아니라 스킬(토큰 층·규칙·레퍼런스)에 원인이 있다는 뜻이다.

이력은 `<html이 있는 디렉터리>/.gate-history.json`에 저장된다.
"""

import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
LINE = re.compile(r'^\s{2}(PASS|WARN|FAIL)\s{2}(.*)$')
STUCK_LIMIT = 3          # 같은 항목이 이 횟수 이상 잔존하면 설계를 바꾸라고 요구한다
HISTORY_NAME = ".gate-history.json"

EYE_CHECKS = [
    "레이아웃이 계획한 콘텐츠 우선순위를 반영하는가 (표준 템플릿으로 수렴하지 않았는가)",
    "스타일 이름을 가려도 기본값과 구별되는가 (극단이 화면에서 그 스타일로 읽히는가)",
    "화면을 채우려고 만든 요소가 있는가 (빈 컬럼 메우는 카드·문구 반복 배지)",
]

# SKILL.md "완료 전 — 게이트 루프" 4단계. 텍스트로만 적어두면 건너뛰어진다는 게
# 이 프로젝트에서 이미 두 번(d라운드 레시피, e라운드 게이트 홀) 확인됐다 — 그래서
# 파일 존재·해시 일치·findings 빈 배열까지 기계적으로 강제한다. 이 세 조건 중
# 하나라도 안 맞으면 코드 게이트가 0 FAIL이어도 exit 0을 주지 않는다.
FEEL_REVIEW_SUFFIX = ".feel-review.json"


def feel_review_path(html):
    return html.parent / f"{html.stem}{FEEL_REVIEW_SUFFIX}"


def check_feel_review(html):
    """(ok, message) — ok=True면 4단계(독립 미적 검토) 통과."""
    path = feel_review_path(html)
    digest = hashlib.sha256(html.read_bytes()).hexdigest()
    if not path.exists():
        return False, (
            f"4단계(미적 응집력 — 독립 검토) 미실시. `{path.name}`이 없다.\n"
            "    SKILL.md \"완료 전 — 게이트 루프\" 4단계대로 별도 fresh 에이전트를 띄워\n"
            "    코드 정합성은 무시하고 순수 미적 판단만 적대적으로 검토받은 뒤,\n"
            f"    결과를 {{\"html_sha256\": \"...\", \"findings\": [...]}} 형태로 {path.name}에 저장한다.\n"
            "    findings가 비어 있어야(=결함 없음) 통과다."
        )
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (ValueError, OSError):
        return False, f"`{path.name}`을 읽을 수 없다 — 형식이 깨졌다. 다시 작성한다."
    if data.get("html_sha256") != digest:
        return False, (
            f"`{path.name}`이 지금 파일 내용과 안 맞다(해시 불일치) — html을 고친 뒤\n"
            "    4단계 재검토 없이 예전 통과 기록을 재사용하는 중이다. 다시 검토받는다."
        )
    findings = data.get("findings", [])
    if findings:
        lines = "\n".join(f"     · {f}" for f in findings)
        return False, f"4단계 미적 결함 {len(findings)}건 — FAIL과 동급이다. 고치고 재검토한다:\n{lines}"
    return True, ""


def run(script, html):
    """검사 스크립트 하나를 돌려 (findings, pass_n, fail_n) 반환."""
    proc = subprocess.run(
        [sys.executable, str(HERE / script), str(html)],
        capture_output=True, text=True, timeout=600,
    )
    out = proc.stdout + proc.stderr
    findings = []
    for line in out.splitlines():
        m = LINE.match(line)
        if m and m.group(1) != "PASS":
            findings.append((m.group(1), m.group(2).strip()))
    tally = re.search(r'(\d+) pass · (\d+) warn · (\d+) fail', out)
    passes = int(tally.group(1)) if tally else 0
    fails = int(tally.group(3)) if tally else (1 if proc.returncode else 0)
    return findings, passes, fails, out


def key_of(source, message):
    """회차를 넘어 같은 결함을 같은 것으로 보기 위한 안정 키.

    메시지에는 매번 달라지는 수치(대비 4.13:1 → 4.51:1, 면적 13% → 11.5%)가 섞여 있어서
    원문을 그대로 키로 쓰면 고칠 때마다 '신규'로 잡힌다 — 숫자를 지우고 앞부분만 쓴다.
    """
    head = re.split(r'—|:', message, maxsplit=1)[0]
    head = re.sub(r'[\d.]+', '#', head)
    head = re.sub(r'\s+', ' ', head).strip()
    return f"{source}|{head[:70]}"


def load(path, reset):
    if reset or not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (ValueError, OSError):
        return {}


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    flags = {a for a in sys.argv[1:] if a.startswith("--")}
    if len(args) != 1:
        print(__doc__)
        sys.exit(2)

    html = Path(args[0]).resolve()
    if not html.exists():
        print(f"파일 없음: {html}")
        sys.exit(2)

    static_only = "--static-only" in flags

    # 순서: 미적 검토가 먼저, 코드 게이트는 그다음이다. 구도(여백 우선순위·밀도·
    # 이미지 관련성·그리드 응집력)가 틀린 화면은 대비·spacing 값을 아무리 맞춰봤자
    # 버려질 작업이다 — 싼 판단(전체적으로 이게 맞는 방향인가)을 비싼 폴리싱
    # (숫자 단위 미세조정)보다 먼저 끝낸다. --static-only는 토큰·구조 잡는 초기
    # 반복용이라 예외로 둔다.
    if not static_only:
        ok, msg = check_feel_review(html)
        if not ok:
            print("=== 순서: 1) 미적 독립 검토 → 2) 코드 게이트 ===\n")
            print(f"1단계 — 미완료:\n    {msg}\n")
            print("코드 게이트(대비·spacing·터치 타겟 등)는 이 검토를 통과한 뒤에 돌린다.")
            print("구도가 틀린 채로 코드만 다듬는 건 나중에 다시 버려질 작업이다.")
            sys.exit(1)
        print("1단계 통과 — 미적 독립 검토 완료. 코드 게이트로 넘어간다.\n")

    hist_path = html.parent / HISTORY_NAME
    history = load(hist_path, "--reset" in flags)
    record = history.get(html.name, {"round": 0, "open": {}, "resolved": []})

    scripts = [("정적", "verify.py")]
    if not static_only:
        scripts.append(("렌더", "render_audit.py"))

    current, summary, total_fail = {}, [], 0
    for label, script in scripts:
        findings, passes, fails, out = run(script, html)
        total_fail += fails
        summary.append((label, passes, fails))
        for level, msg in findings:
            if level == "FAIL":
                current[key_of(label, msg)] = msg

    prev_open = record["open"]
    resolved_before = set(record["resolved"])

    new_keys = [k for k in current if k not in prev_open and k not in resolved_before]
    regressed = [k for k in current if k in resolved_before]
    lingering = {k: prev_open[k] + 1 for k in current if k in prev_open}
    for k in current:
        lingering.setdefault(k, 1)
    healed = [k for k in prev_open if k not in current]

    record["round"] += 1
    record["open"] = lingering
    record["resolved"] = sorted(resolved_before.union(healed) - set(current))
    history[html.name] = record
    hist_path.write_text(json.dumps(history, ensure_ascii=False, indent=1), encoding="utf-8")

    scope = "정적만" if static_only else "정적 + 렌더"
    print(f"\n=== 게이트 루프 · {html.name} · {record['round']}회차 ({scope}) ===\n")
    for label, passes, fails in summary:
        print(f"  {label}  {passes} pass · {fails} fail")
    print()

    def show(title, keys, note=""):
        if not keys:
            return
        print(f"  {title} {len(keys)}건{note}")
        for k in keys:
            reps = lingering.get(k)
            tag = f" (연속 {reps}회차)" if reps and reps >= 2 else ""
            print(f"     · {current[k]}{tag}")
        print()

    if regressed:
        print("  ⚠ 재발 — 개별 수정으로 넘기지 않는다. 예전에 고쳤다가 돌아왔다는 건")
        print("    산출물이 아니라 스킬(토큰 층·규칙·레퍼런스)에 원인이 있다는 신호다.")
        show("재발", regressed)
    show("신규", new_keys)
    show("잔존", [k for k in current if k not in new_keys and k not in regressed])

    stuck = [k for k, n in lingering.items() if n >= STUCK_LIMIT]
    if stuck:
        print(f"  ⚠ {STUCK_LIMIT}회차 이상 안 잡히는 항목이 있다 — 같은 자리를 계속 덧대는 중이다.")
        print("    국소 수정을 반복하지 말고 그 부분의 설계(레이아웃 패턴·토큰·구조)를 바꾼다:")
        for k in stuck:
            print(f"     · {current[k]}")
        print()

    if healed:
        print(f"  해결 {len(healed)}건")
        print()

    if total_fail:
        print(f"미수렴 — FAIL {total_fail}건. 고치고 다시 실행한다:")
        print(f"  python3 {Path(__file__).name} {html}")
        sys.exit(1)

    if static_only:
        print("정적 게이트 통과. 렌더 게이트까지 돌려야 수렴이다:")
        print(f"  python3 {Path(__file__).name} {html}")
        sys.exit(0)

    print("2~3단계(코드 게이트) 통과 — 두 스크립트 모두 0 FAIL.")
    print("남은 건 기계가 원리적으로 못 재는 항목뿐이다. 신호가 있을 때만 육안으로 확인:")
    for i, c in enumerate(EYE_CHECKS, 1):
        print(f"  □ {i}. {c}")
    print()
    print("수렴 — 1단계(미적 독립 검토) + 2~3단계(코드 게이트) 모두 통과. 완료다.")
    sys.exit(0)


if __name__ == "__main__":
    main()
