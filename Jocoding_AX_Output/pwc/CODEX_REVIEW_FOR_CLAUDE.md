# Codex 검토 메모 — action-brief HTML 파이프라인

목적: `CODEX_VERIFICATION_BRIEF.md` 기준으로 Codex가 재검증한 결과를 Claude에게 전달한다. 로그 디렉터리는 열람하지 않았다.

## 결론

- 큰 흐름은 구현되어 있음.
- `build_brief.py`는 canonical JSON에서 5개 카드용 `brief_data.json`을 재생성하고, `render_brief.py`는 HTML을 결정론적으로 렌더한다.
- 기본 검증은 통과했다: 재현성, 스키마 허용값, HTML 누출 검사, 데모 렌더, 플러그인 validator.
- 보완 필요 포인트는 2개다.

## 검증 통과 항목

- `build_brief.py` 2회 실행 결과 `tax_agent_proactive_action_brief.html` 해시 동일.
- `brief_data.json`, `demo_brief_data.json`의 `tier/verdict/hop` 허용값 검사 통과.
- `tax_agent_proactive_action_brief.html`, `tax_agent_acceptance_demo.html` 무결성 검사 통과:
  - `<!DOCTYPE html>` 시작
  - `</html>` 종료
  - `undefined`, `{{`, `}}`, 리스트 repr leak, `<script`, `<iframe` 없음
- 데모 HTML은 `demo-minganjaeganjeop` 1건이 `1순위 × 검토 대상` 칸에 배치됨.
- 플러그인 validator 통과:
  - `/tmp/vp/bin/python ~/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py ./src`
  - 결과: `Plugin validation passed`
- `05-html-finalize` 바로 아래 새 `__pycache__`는 생성되지 않음.

## 보완 필요 1 — render_brief.py 단독 실행 기본 경로

파일:

- `src/skills/tax-enforcement-standard-impact/pipeline/08-packaging/steps/05-html-finalize/render_brief.py`

문제:

- `OUT` 기본값이 현재 사용자 repo 절대경로로 하드코딩되어 있다.
- 현재 코드:
  - `OUT = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("/Users/psh/JO_AX/pwc/tax_agent_proactive_action_brief.html")`
- `build_brief.py` 경유 실행은 정상이나, `render_brief.py`를 단독 실행하면 다른 checkout/user 환경에서 이식성이 깨진다.
- `CODEX_VERIFICATION_BRIEF.md`의 “재현성·이식성” 주장과 약하게 충돌한다.

권장 수정:

- `build_brief.py`처럼 repo root를 계산하거나, 최소한 `HERE` 기준 상대경로를 사용한다.
- 예:
  - `PIPE = HERE.parents[2]`
  - `REPO = PIPE.parents[3]`
  - `OUT = Path(sys.argv[2]) if len(sys.argv) > 2 else REPO / "tax_agent_proactive_action_brief.html"`

수정 후 확인:

```bash
D=src/skills/tax-enforcement-standard-impact/pipeline/08-packaging/steps/05-html-finalize
python3 $D/render_brief.py
python3 $D/render_brief.py $D/demo_brief_data.json /tmp/demo.html
```

## 보완 필요 2 — build 단계의 계약 검증 부재

파일:

- `src/skills/tax-enforcement-standard-impact/pipeline/08-packaging/steps/05-html-finalize/build_brief.py`
- `src/skills/tax-enforcement-standard-impact/pipeline/08-packaging/steps/05-html-finalize/HTML_SCHEMA.json`

문제:

- `HTML_SCHEMA.json`은 계약 문서로 존재하지만, `build_brief.py` 실행 중 생성 데이터 검증은 없다.
- 지금 생성물은 별도 검사에서 통과했지만, canonical JSON이 drift되면 잘못된 라벨이나 필드 누락이 렌더 단계까지 넘어갈 수 있다.
- 특히 `verdict`, `tier`, `confidence`, `hop`, `action_kind`, `keyword_diff.op`는 build 단계에서 최소 검증하는 편이 안전하다.

권장 수정:

- `build()` 후 `validate_data(data)` 같은 작은 함수 추가.
- 최소 검증값:
  - `schema == "action-brief/v1"`
  - `verdict in {"confirmed","review_worthy","hold","exclude"}`
  - `tier in {1,2,3}`
  - `confidence in {"high","med","low"}`
  - `hop in {0,1}`
  - `action_kind in {"position_recheck","counterparty_notify"}`
  - `keyword_diff[].op in {"신설","삭제","불변","치환"}`
- 실패 시 `AssertionError` 또는 `ValueError`로 카드 `id`를 포함해 중단.

수정 후 확인:

```bash
D=src/skills/tax-enforcement-standard-impact/pipeline/08-packaging/steps/05-html-finalize
python3 $D/build_brief.py
python3 - <<'PY'
import json
from pathlib import Path
D=Path('src/skills/tax-enforcement-standard-impact/pipeline/08-packaging/steps/05-html-finalize')
for f in [D/'brief_data.json', D/'demo_brief_data.json']:
    d=json.loads(f.read_text(encoding='utf-8'))
    print(f.name, len(d['items']))
PY
```

## 재검증에 사용한 주요 명령

```bash
D=src/skills/tax-enforcement-standard-impact/pipeline/08-packaging/steps/05-html-finalize
python3 $D/build_brief.py
python3 $D/render_brief.py $D/demo_brief_data.json /tmp/demo.html
```

```bash
python3 - <<'PY'
import hashlib, subprocess
from pathlib import Path
D='src/skills/tax-enforcement-standard-impact/pipeline/08-packaging/steps/05-html-finalize/build_brief.py'
out=Path('tax_agent_proactive_action_brief.html')
subprocess.run(['python3', D], check=True, stdout=subprocess.DEVNULL)
h1=hashlib.sha256(out.read_bytes()).hexdigest()
subprocess.run(['python3', D], check=True, stdout=subprocess.DEVNULL)
h2=hashlib.sha256(out.read_bytes()).hexdigest()
print('deterministic', h1==h2)
PY
```

```bash
python3 - <<'PY'
from pathlib import Path
for f in ['tax_agent_proactive_action_brief.html','tax_agent_acceptance_demo.html']:
    h=Path(f).read_text(encoding='utf-8')
    bad=[b for b in ['undefined','{{','}}',"['","']",'<script','<iframe'] if b in h]
    print(f, h.startswith('<!DOCTYPE html>') and h.rstrip().endswith('</html>'), bad or 'none')
PY
```

## Claude 작업 우선순위

1. `render_brief.py`의 기본 출력 경로 하드코딩 제거.
2. `build_brief.py`에 최소 계약 검증 함수 추가.
3. 위 검증 명령 재실행.
4. 필요하면 `answer.md`에 짧게 append.
