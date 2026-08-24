# 공개 선별 목록

이 트리는 `scripts/build_public_release.py`가 작업 저장소에서 복사한 것이다.
손으로 고치지 말고 원본을 고친 뒤 다시 생성한다.

## 포함

| 경로 | 파일 수 |
|---|---:|
| `.env.example` | 1 |
| `.gitignore` | 1 |
| `CLAUDE.md` | 1 |
| `LICENSE` | 1 |
| `README.md` | 1 |
| `artifacts` | 21 |
| `configs` | 7 |
| `data` | 7 |
| `docs` | 40 |
| `evals` | 33 |
| `phases/*/index.json` | 18 |
| `phases/index.json` | 1 |
| `pyproject.toml` | 1 |
| `report/assets` | 4 |
| `report/planning-report.html` | 1 |
| `report/portfolio-case-study.html` | 1 |
| `requirements-dev.lock` | 1 |
| `scripts` | 31 |
| `src/insaon` | 73 |
| `tests` | 103 |
| **합계** | **347** |

## 공개 트리에서 대시보드 띄우기

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements-dev.lock
.venv/bin/python -m pip install -e . --no-deps
.venv/bin/python scripts/preview_dashboard.py
```

기본 프로필이 `offline`이라 Ollama도 모델 다운로드도 필요 없다.

`OPEN_DASHBOARD.html`의 원클릭 버튼은 **이 트리에서 동작하지 않는다.** 그 경로는
`--profile local`을 쓰고 local은 비공개 공식 candidate corpus를 요구하는데, 그 자료는
공개하지 않는다(합성 자료로 대체하지 않는 것이 제품 규칙이다). macOS 원클릭 실행은
작업 저장소에서만 재현된다.

## 제외와 그 이유

빠졌다는 사실만으로는 의도적으로 뺀 것인지 잊은 것인지 구분되지 않는다.

| 경로 | 이유 |
|---|---|
| `.coverage` | 실행 산출물이다. |
| `AGENTS.md` | 작업공간 운영 규칙이며 공개·비공개 경계 자체를 적은 내부 문서다. |
| `InsaON Launcher.app/` | local 프로필을 하드코딩해 공개 트리에서 CandidateCorpusError로 끝난다. |
| `OPEN_DASHBOARD.command` | 런처와 같은 이유. |
| `OPEN_DASHBOARD.html` | 런처와 같은 이유. 공개 진입점은 scripts/preview_dashboard.py다. |
| `alembic.ini` | DB 마이그레이션은 데모에서 사용하지 않는다. |
| `design/` | 렌더 PNG 30여 장 4.3MB. 읽는 사람이 없고 저장소만 무거워진다. |
| `insaon_launcher.applescript` | 런처 소스. 런처 자체를 제외했으므로 함께 뺀다. |
| `migrations/` | DB 마이그레이션은 데모에서 사용하지 않는다. |
| `phases/*/step*.md` | 70개 step 본문. 진행 과정의 증거이지만 30분 리뷰가 읽을 분량이 아니다. phase 구조는 phases/index.json으로 남긴다. |
| `portfolio-site/` | 별도로 배포되는 웹 케이스 스터디다. node_modules 포함 771MB. |
| `private/` | 골든셋 정답과 검토 기록. 공개하면 평가 누수이며 되돌릴 수 없다. |
| `report/planning-report.pdf` | 같은 내용의 HTML을 포함한다. 223KB 중복이다. |
| `tmp/` | 작업 중 임시 디렉터리다. |

### 함께 뺀 테스트

위에서 제외한 자산을 검증하는 테스트다. 남겨두면 클론한 사람이 처음 보는 것이
실패한 테스트가 된다. 작업 저장소에서는 그대로 실행된다.

| 테스트 | 이유 |
|---|---|
| `tests/contract/test_design_ab_evaluation.py` | design/ A·B 렌더 비교 기록을 검증한다 |
| `tests/contract/test_design_variants.py` | design/ 렌더를 검증한다 |
| `tests/contract/test_preview_dashboard.py` | 런처 파일(Launcher.app, OPEN_DASHBOARD)을 제외했으므로 검증 대상이 없다 |
| `tests/e2e/test_case_b.py` | 비공개 candidate corpus의 데이터 기준일을 단언한다. 공개 트리에서 CASE-B는 합성 근거로 정상 렌더되지만 그 날짜는 나오지 않는다. |
| `tests/integration/test_ablation_runner.py` | 비공개 잠금 골든셋으로 ablation을 재실행한다 |
| `tests/test_harness_executor.py` | phases/*/step*.md 본문을 실행한다 |
| `tests/visual/test_design_variant_contract.py` | design/ 렌더를 검증한다 |

