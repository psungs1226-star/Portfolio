# 🧭 조코딩 AX 인재전쟁 예선 — Codex 플러그인 3건

기업 공개자료에서 검증 가능한 문제를 찾아 Codex 플러그인으로 푼 예선 제출물 3건.
카카오페이증권·메디테라피·삼일PwC를 각각 별도 제출했다. 세 건 모두 **AI가 결론을 단정하지 않고 상태 라벨로 넘기는 구조**를 공통 축으로 삼았다.

**참가 결과: 예선 상위 10%** · [결과 자료](../AI_Proficiency_Report/AX_인재전쟁_예선_상위10퍼센트.pdf)

```
예선 접수·제출   2026-06-23 ~ 2026-07-10
본선자 발표      2026-07-15
오프라인 본선    2026-07-18
```

## 제출 규정

과제는 "선택한 단일 기업·산업·고객이 겪는 **공개·검증 가능한 실제 문제**를 정의하고 이를 해결하는 Codex 플러그인을 제출"하는 것이다.

| 항목 | 요구사항 |
| --- | --- |
| 패키지 | `submission.zip` 안에 `src/` · `README.md` · `logs/` |
| 필수 파일 | `src/.codex-plugin/plugin.json` (플러그인 루트 전체가 `src/` 안에) |
| 동작 요소 | manifest 외 실제 동작 요소 1개 이상 — 보통 `skills/<name>/SKILL.md` |
| 로그 | AI 대화 전체 로그를 **편집·발췌 없이** 원본 그대로 (`md`/`txt`/`json`/`jsonl`) |
| 답변 | 제출 폼 5문항 (무엇을·왜·어떻게 동작·AI 활용·검증) |
| 제약 | 기업 1곳당 플러그인 1개 — 하나의 제출물로 여러 기업을 함께 다룰 수 없다 |

기업마다 폴더를 따로 두고 3건을 각각 패키징한 이유가 이 마지막 줄이다.

## 🚀 세 제출물 한눈에 보기

| | [kakaopay](kakaopay/) | [medi_therapy](medi_therapy/) | [pwc](pwc/) |
| --- | --- | --- | --- |
| 기업 | 카카오페이증권 | 메디테라피 | 삼일회계법인(Samil PwC) |
| 플러그인 | `kakaopaysec-etf-risk-explainer` | `meditherapy-influencer-seeding` | `ax-problem-evidence-plugin` |
| 푼 문제 | 토스보다 직관성이 약한 해외 ETF 모으기 경험을 어떻게 개선할 것인가 | 신제품과 진정성 있게 맞는 인플루언서를 어떻게 찾을 것인가 | 세법 개정으로 해석이 달라질 기존 자료를 어떻게 선제적으로 찾을 것인가 |
| 실제 사용자 | 상품기획 · UX · 고객경험 · 금융소비자보호 | 북미 TikTok/인플루언서 시딩 마케터 | 세무 전문가 · Tax Agent 운영·검수 담당 |
| 스킬 | 1개 (105줄) | 1개 (138줄) | 2개 (356 + 30줄) |
| 실행 코드 | React·TypeScript 웹 MVP (1,034줄) | Python phase 스크립트 8개 (4,822줄) | Phase 0~8 파이프라인 워크트리 + 렌더러 |
| 실행 산출물 | 모바일 웹 MVP | HTML 랭킹 보고서 | HTML 실행 브리프 2종 |
| 상태 라벨 | 통과 / 수정 필요 / 확인 필요 | `ready` / `review_required` / `needs_more_data` / `no_seed` | `confirmed` / `REVIEW_WORTHY` / `hold_확인필요` / `exclude` |
| 공개본 형태 | 압축 해제 제출물 | 압축 해제 제출물 | 플러그인 소스 + 실행 브리프 |
| 제출일 | 2026-07-10 | 2026-07-09 | 2026-07-06 |

---

## 📈 카카오페이증권 — 해외 ETF 모으기 백테스트

**[kakaopay/submission/README.md](kakaopay/submission/README.md)** · brand `#FFCD00`

카카오페이증권은 경쟁 서비스인 토스에 비해 주식 모으기 경험의 직관성이 약하다고 판단했다. 두 서비스 모두 주식 모으기 시장의 주요 사업자인 만큼, 종목을 이미 잘 아는 투자자보다 **해외 ETF를 처음 모으는 사용자도 기간·금액에 따른 결과를 바로 이해할 수 있는 경험**이 필요하다고 봤다.

제품 아이디어는 1·3·5·10년의 기간, 매일·매주·매월의 적립 주기, 투자 금액을 조합해 과거 결과를 비교하는 백테스트다. 이번 제출 MVP에서는 우선 **3·5·10년 × 매일 모으기 × 적립금액 선택**을 구현했다. 모든 과거 일별 시작점을 계산해 최저·평균·최고 결과를 함께 보여주고, 초보 투자자가 모바일 화면에서 조건을 바꾸며 차이를 확인하도록 설계했다. 1년 및 주간·월간 적립 비교는 후속 확장 범위다.

백테스트가 미래 예측이나 상품 추천처럼 읽히지 않게 하는 것도 제품의 필수 조건으로 봤다. 함께 만든 플러그인은 화면 문구·컴포넌트 코드·README·시뮬레이션 결과를 입력받아 다섯 가지를 점검한다.

1. `과거 수익률로 잡아본 범위 · 보장 아님`의 의미가 **결과 근처에** 있는지
2. 과거 최저치·평균·최고치가 **함께** 표시되는지
3. ETF가 분석 대상 또는 검증 데이터로만 표현되는지 (권유가 아닌지)
4. 환율·배당·데이터 출처·기간·한계가 확인 가능한지
5. 주문·매수·계좌·세무로 이어지는 기능이나 표현이 없는지

정보가 없으면 값을 만들어 넣지 않고 `확인 필요`로 남긴다.

### 웹 MVP — 판단 기준을 계산으로 확인한다

`src/web/`의 React·TypeScript MVP는 실행 중 **외부 API를 호출하지 않는다.** 저장된 로컬 fixture만 써서 같은 제출물에서 계산과 화면이 재현된다.

| 대상 | 데이터 성격 | 가격·배당 처리 | 참고 기간 |
| --- | --- | --- | --- |
| SCHD | 로컬 고정 예시 | 예시 가격 + 연 3.2% 배당 재투자 가정 | 3 · 5 · 10년 |
| QQQM | Yahoo Finance 로컬 snapshot | 일별 조정종가, 추가 배당률 0% | 3 · 5년 |
| VOO | Yahoo Finance 로컬 snapshot | 일별 조정종가, 추가 배당률 0% | 3 · 5 · 10년 |

모든 과거 일별 시작점에서 같은 기간의 결과를 계산해 최저치·평균·최고치를 만들고, 이를 앞으로의 적립 조건에 대입한 참고 범위를 보여준다. QQQM은 2020년 상장이라 10년 표본이 없으므로 10년 선택을 **아예 제공하지 않는다.**

### 검증

```bash
cd kakaopay/submission/src/web
npm run fetch:fixtures   # QQQM·VOO·USD/KRW snapshot 갱신
npm test                 # 계산 테스트 7개
npm run build
```

- `validate_plugin.py submission/src`로 manifest·스킬 구조 검증
- 금지 표현(`예상 수익률` `95% 확률` `추천` `안정적` …) 전수 검색 — 화면·CTA·결과 라벨에 없는지 확인
- 코드 리뷰어로 `gpt-5.4-mini`를 별도 투입. **VOO 10년을 본 뒤 QQQM으로 전환하면 기간 문구와 계산이 잠시 어긋난다**는 지적을 받아 유효 기간을 계산과 화면에 동시 적용하고 회귀 테스트를 추가했다.

---

## 💄 메디테라피 — 인플루언서 시딩 의사결정

**[medi_therapy/submission/README.md](medi_therapy/submission/README.md)** · brand `#0F766E`

공개 과제는 "매출로 이어지는 인플루언서 시딩 시스템 설계"였다. 실제 병목은 후보 목록을 많이 모으는 것이 아니라, 메디테라피의 화장품 신제품과 **진정성 있게 맞는 인플루언서를 구분하는 기준**이라고 봤다.

인플루언서의 공개 정보와 콘텐츠를 수집해 건성·지성 등 피부 특성, 선호하는 화장품 기능, 평소 콘텐츠 주제와 표현 방식을 분류했다. 신제품이 출시되면 제품 특성과의 적합성, 기존 사용 맥락, 협찬 표현의 자연스러움, 리스크를 함께 평가해 **실제 사용 경험에 기반한 반응으로 이어질 가능성이 높은 후보를 우선순위화**했다. 단순 팔로워 순위가 아니라 제품–크리에이터–콘텐츠–KPI를 연결하는 랭킹 시스템이다.

신제품 JSON과 공개 인플루언서 DB를 넣으면 다음을 생성한다.

- **제품 온톨로지** — 피부 고민 · 콘텐츠 적합성 · 주의 표현 · 관찰 KPI (MVP 제품 9종 고정)
- **후보 랭킹** — 인플루언서 30명 × 콘텐츠 관찰치 300건
- **선정 사유 보고서** — 내부 태그 나열이 아니라 마케터가 읽고 판단할 수 있는 한국어 해석
- **시딩 브리프** — 콘텐츠 방향 · 금지 표현 · 관찰 KPI · 다음 액션
- **성과 관리 틀** — 공개 반응과 내부 전환 데이터를 분리한 가설 검증 루프

### 판단 기준은 팔로워 수가 아니다

본인 피부·고민 적합, 팔로워/구매 의도, 콘텐츠 적합, 시장/채널 적합, 리스크 감점을 **분리해** 점수화한다. hard exclusion은 점수 계산보다 **먼저** 적용하고, 데이터 부족 후보가 상위 추천처럼 보이지 않도록 표시 우선순위를 `ready → review_required → needs_more_data`로 고정했다.

Phase 0~9(6A·6B·6C 포함) harness로 단계마다 사전 승인과 검증 로그를 남긴다 — `logs/` 49개 파일이 그 기록이다.

### 검증

```bash
cd medi_therapy/submission/src
python3 tools/run_phase6a_new_product_ranking.py
python3 tools/run_phase6b_research_gap.py
python3 tools/run_prepackage_tests.py      # 10개 테스트 → overall_status: pass
```

최신 테스트는 신제품 **포쎄라 리얼 비피다 핑크 블러 크림**으로 돌렸다. 후보 30명을 재랭킹해 추천 6명을 냈고, 각 추천에 피부 고민 매칭·콘텐츠 맥락·리스크 판단·인과 가설·관찰 KPI가 함께 생성되는지 확인했다. 결과는 `logs/new_product_ranking_report.html`에서 바로 볼 수 있다.

의료·시술·과장 표현 리스크가 큰 후보는 점수가 높아도 `no_seed_hard_exclusion`으로 제외했고, 공개 조회수나 댓글 반응만으로 매출·ROAS·주문 증가를 주장하지 않는지 따로 검사했다.

### 제출 패키지를 21KB로 줄인 이유

원래 패키지는 373KB · 141개 파일이었는데 **제출 포털에 업로드가 되지 않았다.** 최상위 문서와 `src/logs` 중복을 걷어내고 필수 구조와 핵심 로그·보고서만 남긴 14개 파일 21KB 판으로 교체했다. 포트폴리오 공개본에서는 중복 ZIP을 제거하고 최종 압축 해제 구조만 남겼다.

---

## ⚖️ 삼일PwC — 세법 개정 영향 선제탐지

**[pwc/README.md](pwc/README.md)** · brand `#2563EB`

> 세법(부가세) 개정이 들어오면, 그 개정이 흔들 수 있는 기존 집행기준·예규·판정을 사람보다 먼저 찾아 **"검토 리스트"로 정직하게 라벨링**해 주는 내부용 Tax Agent 보강 스킬.

세법이 개정되면 법문만 달라지는 것이 아니라 기존 판례, 국세청 FAQ, 해석례, 집행기준의 의미가 모호해지거나 변경될 수 있다. 고객 문의가 들어온 뒤 자료를 찾는 사후 대응보다, 개정 시점에 영향을 받을 기존 해석을 먼저 찾아 전문가가 검토하고 **고객에게 선제적으로 안내할 수 있는 흐름**이 필요하다고 봤다.

자료가 법령·시행령·집행기준·해석례·심판례로 흩어져 있어 사람이 직접 대조하면 누락 위험이 크다. 개정 조문과 기존 자료를 연결해 변경 가능성이 있는 항목을 먼저 추리고, 검토 근거·반대논거·확인 질문을 함께 제공하는 Tax Agent 보강 스킬을 설계했다.

**AI는 결론(면세→과세 등 뒤집힘)을 단정하지 않는다.** 전문가가 검토할 수 있도록 근거·반대논거·검토 질문·선제 대응을 구조화해 넘긴다.

### 스킬 2개

| 스킬 | 역할 |
| --- | --- |
| `tax-enforcement-standard-impact` | 주력. 부가세 개정 1건 → 검토가 필요해진 집행기준·예규 리스트 |
| `company-problem-evidence` | 보조. **사실 / 가정 / 부족한 정보**를 분리해 과장 없는 제출 답변을 준비 |

### 파이프라인 Phase 0~8

| 단계 | 하는 일 |
| --- | --- |
| **0** 이슈 선정 | 직관이 아니라 **골든셋 확보 가능성**으로 첫 이슈를 고른다 |
| **1** 법 개정 정규화 | 개정문을 대상·요건·효과·시점·예외로 분리. LLM 추론 필드는 "추론"으로 표시 |
| **2** 집행기준 정규화 | 집행기준을 1차 문서집합으로 파싱. 해석례는 검증·보강용으로만 |
| **3** 매칭 | `Hard Filter → Direct Link → Logic Match → Keyword Match → Semantic Match → Evidence Check` 순서 — 점수만 믿지 않는다 |
| **4~5** 영향 분류·검토 리스트 | 영향 유형과 신뢰도 부여, "영향 가능 / 보강 해석례 / 신규 주제 / 보류·제외"를 **섞지 않고** 분리 |
| **6** 검증 | 해석 정비사례를 골든셋으로 recall·precision·근거율·사유품질 측정 |
| **7** 판단층 | 집행기준 문구가 안 바뀌어도 결론이 뒤집힐 수 있으므로, 개정 요건을 과거 사실관계에 대입하고 **반대논거를 붙인다**. 적대검증에서 flip이 반박되면 `REVIEW_WORTHY`로 강등 |
| **8** 패키징 | canonical 아티팩트 → `brief_data.json` → HTML 결정론적 렌더. **손으로 문장을 쓰지 않는다** |

### 검증 — 두 층으로 명시

**(A) 런타임 게이트** — 새 개정이 들어올 때마다 필수. 근거 게이트(하드) → 홉 라벨링 → 적대적 검증 → 네거티브 컨트롤 → 블라인드스팟 자기보고 → 정직한 verdict + 재현성.

```bash
python3 pwc/src/skills/tax-enforcement-standard-impact/pipeline/06-validation/runtime_gate_demo.py
```

데모 1건에서 소박한 사전판정 `confirmed`가 홉 라벨링과 적대검증 다수 반증을 거쳐 `REVIEW_WORTHY`로 **강등되는 것**을 보여준다. 적대검증이 flip을 kill하면 그것은 실패가 아니라 성공이다.

**(B) 오프라인 골든셋 검증**

- 실데이터 대조 — 부가가치세법 시행령 제41조는 2024-07-01자로 토지임대부 분양주택 부수토지 임대용역 면세를 신설했는데, 2024년 9월 기준 집행기준 26-41-1에는 반영되지 않은 것을 확인했다
- 로직 검증 — 272개 집행기준 pool · 15개 개정 이벤트 · trivial negative 2건. 자구정비성 negative는 전건 `exclude`되어 키워드·번호 오탐 방어가 작동함을 확인
- 블라인드 백테스트 — code-10 flip 11건 중 testable 7건에서 **HIT@10 = 2**. 실패 원인은 동의어 gap, 항·호 단위 해상도 부족, 프록시 잡음으로 분류해 그대로 공개했다
- 결정론 — `build_brief.py` 2회 실행 시 HTML 해시 동일, doctype·누출·script/iframe 검사 통과

Phase 0~6 룰형 스윕은 검증 완료, Phase 7 판단층은 **파일럿(n=1) 단계로 통계검증 전**임을 문서에 명시했다.

---

## 세 건을 관통하는 원칙

같은 문장이 세 README에 다 있다. **AI가 결론을 확정하지 않는다.**

| | 확정하지 않은 것 | 대신 남긴 것 |
| --- | --- | --- |
| 카카오페이 | 미래 수익률 | 과거 일별 시작점의 최저·평균·최고 참고 범위 + 가정 |
| 메디테라피 | 매출·ROAS·주문 증가 | 검증 가능한 인과 가설 + 관찰 KPI 루프 |
| 삼일PwC | 면세↔과세 뒤집힘 | 전문가용 검토 질문 + 근거 + 반대논거 |

만들지 않은 것도 공통이다.

- **없는 숫자를 만들지 않는다** — 정보가 없으면 `확인 필요` · `needs_more_data` · `hold_확인필요`로 남긴다
- **권유하지 않는다** — 특정 ETF 선택 유도, 성별 기반 제품 추천, 최종 납세자 자문 전부 범위 밖
- **내부 데이터에 연결하지 않는다** — 실시간 시세·실제 주문·계좌·내부 전환 데이터 없이 공개 자료만 쓴다

## 작업 방식

| | 방식 |
| --- | --- |
| 실행 환경 | Codex · Claude Code |
| 모델 배정 | **메인(수행) + 검수자(리뷰·적대검증) 2역할.** Claude Code는 Opus/Sonnet, Codex는 GPT-5.5/GPT-5.4. 배정이 달라지면 README에 변경 내역을 명기하는 규칙을 뒀다 |
| 역할 분리 | `.agents/`에 researcher · analyst · executor · code-reviewer · evaluator 별 `rules.md` |
| 진행 기록 | `answers.md` / `agents.md`에 append-only 로그. 기존 기록은 수정·삭제하지 않는다 |
| 사전 승인 | 메디테라피는 phase마다 `pre_approval.md` + `validation.json`을 남기는 harness로 진행 |
| 로그 수집 | `tools/save_log.py` — 편집 없는 원본 `jsonl`을 `logs/`에 보존 |

로그는 삼일PwC가 Claude Code 8건 + Codex 6건 + 세션 요약, 카카오페이가 Codex 6건, 메디테라피가 phase별 검증 로그 49건이다.

## 폴더 구조

```
kakaopay/
  answers.md                  5문항 답변 + append-only 작업 로그 (v1→v3)
  .agents/*/rules.md          역할별 에이전트 규칙 5개
  submission/                 제출 패키지
    README.md
    src/.codex-plugin/plugin.json
    src/skills/kakaopay-securities/SKILL.md
    src/docs/                 공개 근거 리서치 3건 · MVP phase 계획 · 코드 리뷰 기준
    src/web/                  React·TypeScript 모바일 웹 MVP
    logs/codex/*.jsonl

medi_therapy/
  answers.md                  5문항 초안 → 근거 보강 → 최종 답변
  agents.md                   작업 규칙 + 진행 로그
  submission/
    README.md · PHASE_HARNESS.md · REVIEW_PROTOCOL.md · PRE_APPROVAL_PROTOCOL.md
    src/skills/meditherapy-influencer-seeding/SKILL.md
    src/tools/run_phase*.py   phase 실행 스크립트 8개
    src/data/                 제품 온톨로지 · 인플루언서 30명 · 관찰치 300건
    logs/                     phase별 사전승인·검증 로그 + HTML 보고서

pwc/
  answer.md                   5문항 답변 메모
  README.md                   제출 README (파이프라인·검증·정직성 규칙)
  CLAUDE.md · AGENTS.md       모델 배정과 로그 취급 규칙
  src/skills/
    tax-enforcement-standard-impact/SKILL.md + pipeline/00~08/
    company-problem-evidence/SKILL.md
  tax_agent_proactive_action_brief.html   최종 산출물 — 선제 대응 실행 카드 5개
  tax_agent_acceptance_demo.html          수용검증 데모 (end-to-end 1건)
  logs/claude-code · logs/codex
```

## 기술 스택

Codex 플러그인(`plugin.json` + `SKILL.md`) · Python 3 · React 18 · TypeScript 5 · Vite · Vitest · 결정론적 HTML 렌더러.
외부 런타임 의존은 없다 — 카카오페이 MVP는 로컬 fixture만, 메디테라피·삼일PwC 파이프라인은 Python 표준 라이브러리와 저장된 JSON만 쓴다.
