# 챗봇 검토 대시보드 3회 개선 리포트

## 1. 평가 범위

- 대상: FastAPI·Jinja2 기반 `/` 챗봇 검토 대시보드
- 사용자: 지방자치단체 인사담당자 역할 가설
- 핵심 과업: 질문 → 조건 확인 → 기준일 근거 확인 → 사람 검토 전환
- 평가 경계: 코드·합성 CASE-A/B/C·공개 artifact 기반 제품 계약
- 제외: 실제 실무자 사용성, 공식 법령 정확도, 실제 배포 성능

## 2. 개선 루프

### Loop 1 — 검토 흐름과 후속 질문

**발견**

- 답변 상태는 보이지만 질문 분류·조건·근거·사람 확인 중 현재 위치가 명확하지 않았다.
- 누락 조건을 확인한 뒤 사용자가 같은 세션에서 무엇을 입력해야 하는지 연결이 약했다.
- 현재 다중 turn 세션을 화면에서 식별하기 어려웠다.

**수정**

- 질문 분류 → 조건 확인 → 근거 검증 → 사람 확인의 4단계 진행도를 추가했다.
- 누락 조건을 composer에 바로 옮기는 후속 입력 chip을 추가했다.
- 원문을 저장하지 않는 합성 session ID를 workspace에 표시했다.

**자동 검증**

- template contract
- review API 다중 turn integration
- CASE-A/B/C E2E

### Loop 2 — 모바일·접근성·오류 상태

**발견**

- 940px 이하에서 sidebar가 사라져 새 검토와 CASE-A/B/C 탐색 경로가 없어졌다.
- 모바일 대화 화면에서 근거 패널까지 바로 이동할 수 없었다.
- 입력 길이와 오류 상태가 보조기기에 충분히 전달되지 않았다.
- 비선택 tab의 초기 keyboard focus 상태가 명시되지 않았다.

**수정**

- 모바일 전용 새 검토·CASE 탐색 bar를 추가했다.
- workspace header에 검토 정보 바로가기를 추가했다.
- 2,000자 입력 counter와 `aria-invalid` 상태를 연결했다.
- tablist의 roving tabindex 초기 상태를 고정했다.

**자동 검증**

- dashboard shell E2E
- template accessibility contract
- HTTP security boundary
- JavaScript syntax

### Loop 3 — 운영 상태와 검토 산출물

**발견**

- artifact 기반 모델·corpus 상태와 현재 앱 프로세스 상태가 분리되어 있지 않았다.
- 검토 결과를 다음 업무로 옮길 수 있는 비저장 handoff가 없었다.

**수정**

- `/healthz`를 조회해 앱 서버 상태를 sidebar와 품질 탭에 표시했다.
- 현재 DOM의 구조화 답변만 조합하는 `검토 요약 복사`를 추가했다.
- 복사 결과를 저장소·cookie·Web Storage에 보존하지 않는다.

**자동 검증**

- health endpoint bootstrap contract
- dashboard template·asset contract
- 전체 pytest·Ruff·mypy·Harness·public boundary·offline release

## 3. 검증 명령

```bash
.venv/bin/python -m pytest -q
.venv/bin/ruff check src tests scripts
.venv/bin/mypy src
node --check src/insaon/web/static/dashboard.js
.venv/bin/python scripts/validate_harness.py
.venv/bin/python scripts/check_public_boundary.py
.venv/bin/python scripts/release_check.py --profile offline
```

## 4. 잔여 위험

- 2026-07-30 Headless Chrome으로 1440×1000 desktop과 390×844 mobile 실제
  렌더링을 검수했다. 다만 실제 기기·브라우저 조합의 사람 검수는 남아 있다.
- 세션 저장소는 MVP의 in-memory 구현이므로 프로세스 재시작 뒤 복원되지 않는다.
- 기본 오프라인 데모는 합성 corpus이며 공식 법령 candidate는 독립 사람 승인 전이다.
- 실제 인사담당자 사용성, 법률 정확도와 운영 효과는 미측정이다.

이 리포트는 구현·합성 회귀 품질 검토이며 실제 사용자 효과나 법률적 정확성의 증거가 아니다.

## 5. 2026-07-30 추가 3회 개선

### Loop 4 — 가독성과 업무 화면 밀도

**발견**

- 상태·근거·사례 설명에 8~10px 글자가 반복되어 확대 없이 읽기 어려웠다.
- 둥근 모서리와 hover 그림자가 반복되어 검토 정보보다 카드 장식이 먼저 보였다.

**수정**

- 본문 15px, 사례 14/12px, 근거 14/12px, 상태·메타데이터 10~12px로
  정보 위계별 최소 크기를 재설정했다.
- prompt·조건·근거·품질 card의 반경과 그림자를 줄여 중앙 질문과 대화를
  첫 시선 대상으로 유지했다.
- 사용자 텍스트에 쓰이던 8px·9px 선언을 제거하고 E2E 계약으로 고정했다.

### Loop 5 — 검토자가 따라가는 3분 경로

**발견**

- Jinja2 template을 standalone HTML처럼 열면 실제 제품 화면을 확인할 수 없었다.
- CASE-A/B/C가 무엇을 증명해야 하는지 화면만 보고 즉시 알기 어려웠다.

**수정**

- `scripts/preview_dashboard.py` 한 명령으로 서버 실행·브라우저 열기·CASE URL
  안내를 제공했다.
- sidebar에 A 재질문 → B 근거 연결 → C 답변 보류와 기대 상태를 상시 표시했다.
- `docs/DEMO_CHECKLIST.md`에 화면·직접 할 일·합격·실패 기준을 같은 표로 연결했다.
- 모바일 사례명을 재질문·근거·보류로 바꿔 축소 화면에서도 목적을 유지했다.

### Loop 6 — 회귀·문서·릴리스 계약

**검증 결과**

- dashboard·CASE-A/B/C·다중 turn·preview 표적 테스트: 7/7 통과
- 전체 pytest: 171/171 통과
- Ruff: 통과
- mypy: 55개 source file 통과
- 당시 Harness: 10 phase·35 step 유효 (현재 12 phase·43 step은 12절 참조)
- 공개 경계: private path·명백한 secret·미표시 identifier 없음
- offline release gate: H3 합성 회귀 candidate 통과

**추적성**

- FR-10에 3분 검증 경로와 최소 가독성 계약을 추가했다.
- release manifest 입력에 `docs/DEMO_CHECKLIST.md`를 포함했다.

위 결과는 DOM·CSS·HTTP·제품 상태 계약의 자동 검증이다. 이어진 실제 렌더링
검수와 수정 결과는 다음 절에 기록한다.

## 6. 실제 렌더링 검수와 보정

### 검수 화면

- 1440×1000: 기본 화면, CASE-A, CASE-B, CASE-C, 품질 탭
- 390×844 device emulation: 기본 화면, CASE-B
- Chrome DevTools Protocol로 `innerWidth=390`, `scrollWidth=390`을 확인해
  수평 overflow가 없음을 검증했다.

### 발견과 수정

- chat column의 실제 자식은 header·notice·progress·conversation·composer 5개인데
  grid row가 4개여서 desktop 메시지 위치와 mobile 공백이 왜곡됐다.
  5개 row 계약으로 수정했다.
- mobile sticky composer가 대화와 겹치고 첫 화면에서 입력 행동이 불명확했다.
  mobile에서는 일반 문서 흐름으로 바꾸고, 예시 질문을 2×2 compact grid로 줄여
  390×844 첫 화면에 composer까지 노출했다.
- mobile header의 상태 pill과 개인정보 안내가 좁은 화면에서 잘렸다.
  중복 상태 도구를 숨기고 안내문의 줄바꿈·축소 규칙을 추가했다.
- `leave_type`, `reference_date`, `required_conditions_missing` 같은 내부 code가
  사용자 화면에 노출됐다. 휴직 유형·질문 기준일·필수 조건 확인 필요 등
  사용자용 label을 server render와 동적 JavaScript render에 동일하게 적용했다.
- 동일 source name이 반복되는 citation card는 조문 경로를 제목으로 바꿔
  제1조·단서·부칙·관련 조문을 먼저 구분할 수 있게 했다.
- skip link의 존재하지 않는 `#chat-composer` 대상은 실제 입력 `#question`으로
  교정했다.
- Jinja template을 `file://`로 직접 열면 원시 코드가 노출되던 확인 경로 오류를
  재현했다. 직접 열기 전용 불투명 안내 화면과 macOS 더블클릭 launcher
  `OPEN_DASHBOARD.command`를 추가하고, 실제 제품은 서버 URL에서만 확인하도록
  문서와 release artifact를 갱신했다.

실제 기기 Safari·Chrome과 인사담당자 사용성 검증은 아직 수행하지 않았으며,
그 결과를 현재 품질의 증거로 주장하지 않는다.

## 7. 챗봇 중심 정보 위계 보정

**판정**

- 기존 첫 화면은 좌측 시스템 상태, 열린 데모 가이드, 빈 진행도와 우측 빈 검토
  rail이 동시에 노출되어 채팅보다 운영 dashboard 인상이 강했다.

**수정**

- `is-empty` 상태에서는 채팅 column을 1040px 중심 작업대로 확장하고 빈 검토
  rail과 진행도를 숨겼다.
- 첫 API 응답 뒤 `has-result`로 전환해 조건·근거·사람 검토 rail과 진행도를
  표시한다.
- 중복 시스템 상태 card를 제거하고 품질 정보는 기존 품질 tab에 유지했다.
- 대표 CASE는 보조 탐색으로 남기고 데모 검증 가이드는 기본 접힘으로 바꿨다.
- 사용자 용어를 `새 대화`, `휴직·복직 검토 대화`로 조정했다.

**실제 동적 검증**

- 기본 화면: `app-shell is-empty`, 검토 rail `display:none`
- 예시 질문 제출 후: session ID 생성, assistant message 1건,
  `app-shell has-result`, 검토 rail `display:block`
- 전환 결과: `REVIEW_REQUIRED`와 누락 조건 3건이 같은 화면에 표시됨

## 8. 레퍼런스 기반 챗봇 시각 시스템

**참고 원칙**

- ChatGPT의 새 대화가 prompt 입력에서 시작하는 구조를 참고해 입력창을 첫 화면의
  주 행동으로 고정했다.
  - <https://openai.com/academy/getting-started/>
- ChatGPT Canvas처럼 보조 정보는 필요한 맥락에서만 여는 원칙을 적용해,
  초기 화면에서는 근거 rail을 숨기고 첫 답변 뒤에만 표시한다.
  - <https://help.openai.com/en/articles/9930697-what-is-the-canvas-feature-in-chatgpt-and-how-do-i-use-it>
- Perplexity의 답변·출처 연결 원칙을 참고해 답변 상태에서는 인용과 원문 링크를
  같은 화면의 오른쪽 검토 rail에 유지한다.
  - <https://www.perplexity.ai/help-center/en/articles/10352155-what-is-perplexity>
- 위 제품의 브랜드 표현을 복제하지 않고 `대화 우선`, `맥락형 보조 패널`,
  `검증 가능한 출처`라는 상호작용 원칙만 사용했다.

**주요 변경**

- 이전의 짙은 sidebar·종이색 workspace를 밝은 neutral sidebar와 흰색
  conversation canvas로 교체했다.
- 첫 화면의 workspace header를 제거해 질문 headline, 예시 질문, composer가 한
  시선 축에 놓이도록 했다.
- sidebar의 CASE-A/B/C는 dashboard card가 아니라 대화 기록처럼 평평한 탐색
  항목으로 바꿨다.
- 사용자 질문은 낮은 대비의 bubble, assistant 답변은 border와 shadow가 없는
  본문 흐름으로 구분했다.
- 조건·근거·품질 정보는 첫 화면에서 숨기고 답변 이후에만 오른쪽 rail로
  드러낸다.
- decorative gradient·glass·반복 animation·추가 UI dependency는 사용하지 않았다.

**2차 구조 보정**

- 첫 레퍼런스 적용본도 hero와 composer가 서로 떨어지고 개인정보 notice가
  첫 시선을 차지해, 정돈된 dashboard 이상의 chat product 인상을 만들지 못했다.
- 초기 개인정보 notice는 숨기고 composer 하단의 상시 경고 문구로 이동했다.
- `조건 확인 → 기준일 검증 → 원문 연결`을 hero 아래 한 줄로 표시해 제품의
  차이를 첫 5초 안에 이해할 수 있게 했다.
- composer를 hero 바로 아래로 이동하고 예시 질문은 그 아래의 보조 시작점으로
  재배치했다.
- 예시 질문을 선택하거나 직접 질문을 제출하면 해당 시작점 영역을 제거하고
  같은 위치를 다중 turn 대화가 이어받는다.
- mobile에서는 hero·composer·예시 질문 순서를 유지하고 개인정보 경고와 글자
  수를 composer 바로 아래에 표시했다.

**렌더링 검증**

- 1440×1000: 새 대화 화면에서 prompt·composer 중심축과 sidebar 대비 확인
- 1440×1000 CASE-B: 대화·진행 상태·근거 rail의 3열 밀도 확인
- 500×844: mobile navigation, 예시 2×2 grid, composer와 개인정보 안내 확인

## 9. AI 앱 문법 제거와 casework 편집 디자인

**문제**

- 중앙 인사말, 영어 eyebrow, 둥근 대형 composer, 기능 pill과 추천 card 조합이
  인사담당자 도구보다 범용 생성형 AI 제품처럼 보였다.
- 제품 도메인인 공공 인사 검토의 기록성·근거성·업무 맥락이 시각 언어에
  충분히 반영되지 않았다.

**참고 원칙**

- KRDS의 공공서비스 일관성·명확성 원칙을 기본 접근성 기준으로 사용했다.
  - <https://www.krds.go.kr/>
- Home Office와 DWP가 내부 caseworking 시스템에 별도 내부업무 스타일과
  패턴을 사용하는 방식을 참고했다.
  - <https://design.homeoffice.gov.uk/design-system/get-started>
  - <https://design-system.dwp.gov.uk/get-started/how-to-use/what-are-design-systems>
- 담당자 경고는 상시 장식이 아니라 필요한 위치의 단일 guidance로 사용한다는
  HMRC caseworker pattern을 참고했다.
  - <https://design.tax.service.gov.uk/hmrc-design-patterns/caseworker-guidance-banner/>

**구현**

- 명조 계열 제목과 산세리프 본문, 미색 문서면, 남색 잉크, 적갈색 교정 표시로
  casework editorial system을 구성했다.
- `인사담당자 검토 작업대`를 시작점으로 하고 질문 조건·적용 시점·근거 원문을
  문서 목차처럼 표시했다.
- composer를 둥근 AI prompt box가 아닌 `검토 질문` 서식으로 바꾸고, 새 대화는
  `새 검토`, 예시 대화는 `검토 사례`로 변경했다.
- 예시 질문은 card가 아니라 번호가 있는 문서 목록으로 바꿨다.
- 결과 화면의 사용자 질문은 적갈색 교정선이 있는 요청서, assistant 답변은
  남색 상단선이 있는 검토 메모, 인용은 근거 기록 card로 구분했다.
- mobile navigation은 pill을 제거하고 적갈색 underline tab으로 바꿨다.

**렌더링 검증**

- 1440×1000 기본: 문서형 hero·검토 원칙·질문 서식·검토 예시
- 1440×1000 CASE-B: 요청서·검토 메모·근거 기록 3열
- 500×844: 명조 제목, 3개 검토 원칙, 질문 서식, 2×2 사례 목록

## 10. Front Inbox 실제 제품 레퍼런스 적용

**기준 레퍼런스**

- Front가 2026년 7월 공개한 최신 Inbox 화면을 단일 시각 기준으로 선택했다.
  공식 화면은 연보라 navigation, 중립 active row, violet primary action,
  compact conversation header와 넓은 reading pane을 사용한다.
  - <https://help.front.com/en/articles/3889728>
- Intercom Inbox의 `conversation + right Details/Copilot panel` 구조는 인사ON
  우측 조건·근거 panel의 구조 적합성을 교차 확인하는 용도로만 사용했다.
  - <https://www.intercom.com/help/en/articles/8838656-inbox-faqs>

**컴포넌트 대응**

| Front Inbox | 인사ON |
|---|---|
| Inbox navigation | CASE-A/B/C 검토 사례 |
| New message | 새 검토 |
| Conversation header | 검토 제목·세션·상태 |
| Message thread | 질문·재질문·근거 기반 답변 |
| Reply composer | 검토 질문 입력 |
| Context/apps panel | 조건·근거·품질 panel |

**시각 적용**

- sidebar `#f0eff5`, active row `#dedde5`, primary violet `#635bff`,
  canvas `#f8f8fb`를 Front 화면과 같은 계열로 고정했다.
- system sans typography, 10–14px radius, 얕은 border와 shadow, compact header,
  넓은 흰색 thread card를 적용했다.
- 기본 화면의 과도한 hero를 34px 이하 제목과 compact onboarding row로 줄였다.
- mobile은 Front의 compact navigation을 따라 8px active tab, 단일 column 검토
  사례와 full-width composer로 전환했다.
- 공식 Front 이미지나 로고 asset은 저장소에 복사하지 않고 UI 문법만 CSS와
  기존 Jinja 구조로 재구현했다.

**렌더링 검증**

- 1440×1000 기본: Inbox sidebar·새 검토·composer·검토 사례
- 1440×1000 CASE-B: compact header·message cards·right context panel
- 500×844: compact navigation·3개 조건 row·composer·단일 column 사례

**재검수 보정**

- 반복 노출되던 홈 심볼은 제거해 첫 시선이 검토 제목과 질문 입력으로 바로 이동하게 했다.
- 영어 대문자 보조 라벨을 한국어로 통일해 포트폴리오 템플릿 느낌을 줄였다.
- 의미가 모호했던 `API` 표기를 `문서`로 바꿔 기능을 바로 이해할 수 있게 했다.

## 11. 포트폴리오 제출 전 3단계 개선 루프

### Loop 1 — 스타일 유지보수성

- 여러 시안의 override가 누적된 `dashboard.css`를 단일 token·component·state 체계로 재작성했다.
- CSS는 3,513줄에서 1,978줄로 줄었으며 과거 theme marker와 중복 media query를 제거했다.
- Jinja2 구조, same-origin 정적 자산과 CSP 계약은 유지했다.

### Loop 2 — 합성 데모 정직성

- 사용자 화면의 `fixture` 표현을 `합성 시나리오`로 바꿨다.
- `example.invalid` 링크를 동작하는 원문 링크처럼 표시하지 않고
  `합성 원문 · 외부 링크 없음` 상태로 렌더링한다.
- 답변 계약의 `limitations`를 우측 최종 판단 경계에 표시하고 검토 요약 복사에도 포함했다.

### Loop 3 — 실제 반응형 렌더

- 1440×1000 기본·CASE-A·CASE-B와 390×844 기본·CASE-B를 렌더링했다.
- 390px device metrics에서 `documentElement.scrollWidth = 390`,
  `body.scrollWidth = 390`을 확인했다.
- 전송 버튼의 실제 우측 좌표는 368px이고 composer는 0~390px 안에 있어
  가로 잘림이 없다.
- 모바일 결과 화면은 대화와 composer 뒤에 390px 너비의 검토 rail이
  문서 흐름으로 이어진다.

### 포트폴리오 설명 자료

- 기존 `report/planning-report.html`은 초기 계획 자료로 보존했다.
- `report/portfolio-case-study.html`은 계획, 구현 중 변경된 결정, 아키텍처,
  제품 결과, 합성 평가, Harness blocked 경계와 다음 단계를 하나의 스크롤 문서로 연결한다.

## 12. Case Workbench 선택안 production 통합

2026-08-03 포트폴리오 소유자가 B Case Workbench를 선택하고, 동글동글한 형태,
기존 미색·차콜·포레스트 tone 유지와 조금 더 둥글고 굵은 한글을 요청했다.

**통합**

- 챗봇·launcher·planning report·portfolio case study에 같은 색과 LINE Seed Sans KR
  Regular·Bold를 자체 호스팅으로 적용했다.
- panel 22~26px, row·input 16px와 action pill의 radius 역할을 고정했다.
- 1024px 3열 과밀을 발견해 1180px 이하에서는 탐색을 상단, 검토 rail을 대화 뒤에 둔다.
- launcher 정적 검수를 위해 `?preview` 경로와 cache version을 추가했고 실제 `file:`
  원클릭 동작은 그대로 유지했다.

**최종 브라우저 검수**

- 챗봇: 390·768·1024·1280·1440·1680px
- 안전 상태: CASE-C desktop·mobile
- launcher: 1280×900·390×844
- 제출 HTML: case study desktop·mobile, planning report desktop
- 모든 viewport에서 가로 overflow 0건
- 모바일 근거 anchor와 품질 tab 전환 통과

렌더와 12개 광학 점검은 `design/production/REVIEW_PACKET.md`, promotion fingerprint는
`design/production/promotion.json`에 기록했다. 참여자 0명이므로 과업 완료율·시간·선호는
계속 미측정이다.
