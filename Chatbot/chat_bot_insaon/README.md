<h1 align="center">
  인사ON
</h1>

<p align="center">
  사내 규정과 업무 데이터를 활용한 챗봇을 만들기 전에,<br>
  공개된 <strong>지방공무원 인사 법령</strong>으로 검색·근거·안전 구조를 먼저 검증했습니다.
</p>

<p align="center">
  <a href="#quickstart"><img src="https://img.shields.io/badge/Python-3.12+-3776AB?logo=python&logoColor=white" alt="Python 3.12+"></a>
  <a href="#quickstart"><img src="https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white" alt="FastAPI"></a>
  <a href="#모델-교체"><img src="https://img.shields.io/badge/Ollama-model_swappable-000000?logo=ollama" alt="Ollama"></a>
  <img src="https://img.shields.io/badge/tests-636_passed-brightgreen" alt="636 tests passed">
</p>

<p align="center">
  <a href="https://insaon-local-rag.psungs1226.chatgpt.site">Case Study</a>&ensp;|&ensp;<a href="report/portfolio-case-study.html">Design Report</a>&ensp;|&ensp;<a href="evals/reports/comparison.md">Evaluation</a>&ensp;|&ensp;<a href="docs/adr/README.md">ADRs</a>
</p>

<br>

<p align="center">
  <img src="report/assets/screenshot-leave-allowance.jpg" width="720" alt="육아휴직 복직자의 정근수당 지급률 — 공개 데모 corpus 기반 실제 답변">
</p>
<p align="center">
  <sub>"2025년 5월 말부터 육아휴직을 사용하고 2026년 4월 1일 복직했습니다. 2026년 상반기 정근수당은 100% 지급되나요, 50% 지급되나요?" — 공개 재현용 corpus에서 휴직기간·복직일·지급 반기를 함께 판단해 "100%·실제 근무 6개월"과 관련 근거 4건을 반환한 실제 실행 화면</sub>
</p>

---

## 이 프로젝트가 보여주는 것

기업들이 사내 규정과 업무 데이터를 활용한 챗봇을 만들고 있지만, 실제 내부자료는 기밀성과 접근 제약 때문에 개인 프로젝트에서 곧바로 사용할 수 없습니다. 그래서 **"조직의 규정과 데이터를 기반으로 검토를 돕는 AI 챗봇"**의 핵심 구조를 먼저 시험하기 위해 공개된 공무원 인사 법령을 대체 corpus로 선택했습니다.

공무원 인사 법령은 개정 전후 버전, 시행일, 직급·재직기간·휴직 사유 같은 조건 분기, 예외 조항과 수량 규정이 함께 존재합니다. 이는 사내 취업규칙·복무규정·급여규정 챗봇이 실제로 마주칠 검색 오류와 근거 검증 문제를 재현하기에 적합했습니다.

공무원 인사규정을 사례로 선택한 이유는 단순합니다.

- "비공무상 질병휴직 중 봉급은?"이라는 질문 하나에 **휴직 유형, 공무상 여부, 기준일에 유효한 조문 버전**이 모두 맞아야 정확한 답이 나옵니다.
- 같은 임용령 제33조도 **2024년판과 2026년판의 승진소요연수가 다릅니다.** 기준일 없이 검색하면 틀린 버전을 인용합니다.
- 잘못 답하면 안 되는 영역이라 **"모르면 멈추는" 설계**를 검증하기에 적합합니다.

회사의 취업규칙, 복무규정, 급여규정도 동일한 구조를 갖고 있습니다.

### 같은 구조로 적용 가능한 곳

| 이 프로젝트에서 | 회사에서 |
|---|---|
| 지방공무원법, 임용령 | 취업규칙, 인사규정, 급여규정 |
| 조문 시행일/폐지일로 시점 필터링 | 규정 개정 이력으로 시점 필터링 |
| 휴직 유형/기준일/공무상 여부로 조건 분기 | 직급/재직기간/부서 등으로 조건 분기 |
| "근거가 부족하면 답변을 멈춘다" | "확인되지 않은 사항은 담당자에게 전달한다" |
| Ollama 로컬 모델 | 사내 보안 요건에 맞는 모델로 교체 |

**모델, corpus, 조건 스키마를 교체하면** 어떤 조직의 규정이든 같은 파이프라인 위에서 동작합니다.

### 검증에서 확장으로

인사ON으로 도메인 특화 파이프라인과 안전장치를 검증한 뒤, PDF 추출·청킹·검색·출처 반환 계층을 분리해 [PDF-to-Bot MCP](../pdf_chatbot_mcp/)로 확장했습니다. 사용자가 PDF를 넣으면 Claude Code가 `search_documents` 도구로 근거를 검색하는 구조이며, 인사ON을 다른 사내 문서로 확장하기 위한 초기 범용 인터페이스입니다.

---

## Quickstart

```bash
git clone <repo> && cd insaon
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements-dev.lock
.venv/bin/python -m pip install -e . --no-deps
.venv/bin/python scripts/preview_dashboard.py
```

Ollama 없이 바로 뜹니다. Ollama가 설치되어 있으면 **자동 감지**해서 LLM 답변이 활성화됩니다.

```bash
brew install ollama && ollama serve
ollama pull qwen3:4b-instruct && ollama pull bge-m3
.venv/bin/python scripts/preview_dashboard.py   # LLM 자동 감지
```

| | Ollama 없음 | Ollama 있음 |
|---|---|---|
| 답변 | 고정 템플릿 | LLM이 조문을 읽고 자연어 답변 |
| 검색 | char 2-gram lexical | + BGE-M3 vector + Qwen3 reranker |
| 속도 | 즉시 | ~60초 (M3 16GB) |

### 모델 교체

`.env` 또는 환경변수로 모델을 교체할 수 있습니다.

```bash
INSAON_GENERATION_MODEL=gemma3:4b .venv/bin/python scripts/preview_dashboard.py
```

Ollama가 지원하는 모든 모델을 사용할 수 있으며, 임베딩 모델과 재랭커도 개별 교체 가능합니다.

```env
INSAON_GENERATION_MODEL=gemma3:4b
INSAON_EMBEDDING_MODEL=bge-m3:latest
INSAON_EMBEDDING_DIMENSIONS=1024
INSAON_RERANKER_MODEL=gemma3:4b
```

---

## 파이프라인

LLM은 **검색 전**(쿼리 플래닝)과 **검색 후**(답변 생성) 두 번 호출되며, 그 사이의 검증은 결정적 코드가 수행합니다.

```
질문 입력
 |
 [개인정보 차단]        결정적 필터 — LLM 호출 전
 |
 [분류 + 조건 추출]     부족하면 분기 안내와 함께 되묻기
 |
 [LLM 쿼리 플래닝]      질문을 법령 용어 검색 쿼리로 변환
 |
 [검색]                 Lexical + Vector, RRF 합성
 |
 [시점 필터]            기준일에 유효한 조문만 통과
 |
 [Reranker]             단서/부칙 보강
 |
 [LLM 답변 생성]        검색된 조문 안에서만 작성
 |
 [인용 검증]            인용 존재 + 기준일 유효 + 수량 근거 검사
 |
 ANSWERABLE / REVIEW_REQUIRED / INSUFFICIENT_EVIDENCE
```

LLM은 두 번 호출됩니다. **검색 전에 한 번**(쿼리 플래닝 — 질문을 법령 용어로 변환), **검색 후에 한 번**(답변 생성 — 조문을 읽고 정리). 분류, 조건 게이트, 시점 필터, 인용 검증은 결정적 코드가 수행하며 모델 권고는 더 보수적으로만 바꿀 수 있습니다.

---

## 핵심 설계

**Temporal RAG** — 지방공무원 임용령 제33조(승진소요최저연수)는 2024년과 2026년에 개정됐습니다. "2025년 1월 기준 7급 승진 요건"을 물으면 2024년판을 써야 하고 2026년판은 걸러내야 합니다. 이 시점 필터 하나로 검색 품질이 0.250에서 1.000으로 올라갑니다.

**Safety-first** — LLM이 "육아휴직 기간은 최대 2년"이라고 답했는데 검색된 조문 어디에도 "2년"이 없으면, 수량 근거 검사가 해당 문장을 폐기하고 조문만 전달합니다. 모델이 학습한 지식이 아니라 검색된 근거에서만 답하도록 강제합니다.

**분기 조건 안내** — "비공무상 질병으로 휴직하면 봉급이 얼마나 지급되나요?"에 대해 제27조 제1항을 근거로 "공무상은 전액, 비공무상은 미지급"이라는 조건별 결론을 정리합니다. 조문에 없는 숫자를 만들면 수량 검증이 폐기합니다.

**실제 법령 corpus** — 지방공무원법, 임용령, 복무규정, 보수규정, 수당규정, 징계령, 교육훈련법 등 실제 법령 조문 97건을 사용합니다. "금품 수수 시 징계부가금"을 물으면 제69조의2를 인용해 "5배 이내"라는 구체 수치로 답합니다.

---

## 실제 질문-답변 예시

아래는 실제 대시보드에서 Ollama(Qwen3 4B)가 생성한 답변입니다.

> **Q. 금품 및 향응 수수로 징계를 받으면 징계부가금이 얼마나 부과되나요?**
>
> 금품 및 향응 수수로 징계를 받는 경우, 해당 금전 또는 재산상 이득의 **5배 내의 징계부가금**을 부과할 수 있습니다. 금전이 아닌 재산상 이득도 금전으로 환산한 금액을 기준으로 합니다.
>
> *근거: 제69조의2 제1항* · 상태: `REVIEW_REQUIRED` · 관련 근거 6건

> **Q. 공무상 부상으로 휴직할 때와 개인 질병으로 휴직할 때 봉급 지급이 어떻게 다른가요?**
>
> 공무상 부상으로 휴직한 경우 봉급 **전액**을 지급합니다. 개인 질병으로 휴직한 경우는 제27조 제1항에 따라 봉급의 **일부만** 지급하며, 제1항·제2항에 규정되지 않은 휴직은 봉급을 지급하지 않습니다.
>
> *근거: 보수규정 제27조 제1항, 제4항* · 상태: `REVIEW_REQUIRED` · 관련 근거 7건

> **Q. 재직기간 5년 미만인 공무원의 연가일수 산정 기준을 알려주세요**
>
> 재직기간별 연가일수는 제7조 제1항에 따라 정해지며, 경력직·특수경력직 공무원이 재직기간 5년 미만이고 지방자치단체 조례에서 인정하는 유사경력이 있는 경우에는 해당 연가일수에 **3일을 추가**합니다.
>
> *근거: 복무규정 제7조 제1항* · 상태: `REVIEW_REQUIRED` · 관련 근거 6건

---

## 평가

<!-- GENERATED:SYNTHETIC-RESULTS:START -->
### 합성 시스템 회귀 결과

> 아래 값은 기계 생성 합성 회귀셋에서 파이프라인·안전 동작을 확인한 결과다. 독립 검토 법령 holdout이나 법률 정확도 결과가 아니다.

| 항목 | H3 성공/전체 | 값 |
|---|---:|---:|
| 근거 조문 Set Recall@5 | 33/36 | 0.917 |
| 답변 상태 정확도 | 70/70 | 1.000 |
| 인용 완전성 | 58/58 | 1.000 |
| 위험 답변률 | 0/22 | 0.000 |
| 다회차 대화 해결률 | 12/12 | 1.000 |
| 생략형 후속 유지 | 4/4 | 1.000 |
| 치명적 오류 | 0/70 | H2 8건 → H3 0건 |

- 평가셋: `insaon-synthetic-system-regression@0.4.0` · 70건 · 기준일 2026-07-29
- 결과: [`H3 JSON`](evals/results/h3_reranker_context.json) · [`B0~H3 비교`](evals/reports/comparison.md) · [`실패 분석`](evals/reports/failure_analysis.md)
- 법률 정답성, 실제 사용자 효과와 로컬 모델 반복 성능은 미측정이다.
<!-- GENERATED:SYNTHETIC-RESULTS:END -->

<details>
<summary><strong>Ablation: B0 → H4</strong></summary>

| Config | Recall@5 | Temporal | Fatal |
|---|---:|---:|---:|
| B0 lexical | 0.333 | 0/12 | 0 |
| H1 hybrid | 0.250 | 0/12 | 0 |
| **H2 +temporal filter** | **1.000** | **12/12** | 8 |
| **H3 +reranker** | **0.944** | **12/12** | **0** |

시점 필터가 0.250 → 1.000을 만들고, 재랭킹이 치명적 오류를 8 → 0으로 만듭니다. → [상세](evals/reports/comparison.md)

</details>

---

## 한계

- **공식 corpus 사람 미승인** — 4,106개 provision + 1,510개 부칙, 자동 감사 통과, 승인자 0명
- **실모델 4종 중 2종 결론 미도달** — LLM이 조문에 없는 기간을 생성해 수량 검증에 걸림
- **응답 p50 62.9초** — M3 16GB 기준, 최적화 미실시

---

<p align="center">
  <sub>인사ON은 공개 규정 기반 검토 보조 프로토타입입니다.<br>최종 판단은 담당자가 원문과 기관 규정을 확인한 뒤 내려야 합니다.</sub>
</p>
