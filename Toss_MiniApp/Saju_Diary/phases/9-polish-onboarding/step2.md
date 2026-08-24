# Step 2: onboarding-inputs-preview (생일/시간 입력 개선 + 크기 미리보기)

온보딩의 생년월일·시간 입력을 고치고(타이핑 마찰 제거), 크기 선택에 미리보기를 더한다. 다음 step(설정 화면)에서도 재사용하도록 **재사용 컴포넌트**로 만든다.

## 읽어야 할 파일

- `CLAUDE.md` (CRITICAL — #1 로컬, #5 웹 React+TDS·RN/임의 라이브러리 금지, #7 예산)
- `src/screens/onboarding/OnboardingScreen.tsx` (수정 — birthDate/birthTime/timeUnknown 상태, SIZE_OPTIONS, finish())
- `src/features/onboarding/preset.ts` (isValidBirthDate 등 — 검증 재사용)
- `src/types/index.ts` (WidgetType, WidgetSize, SajuInput)
- `src/components/` (Card 등 공용 컴포넌트 위치·index) — 새 공용 컴포넌트를 여기에 둔다
- `src/theme/tokens.ts` (palette/spacing/radius)
- `src/widgets/DdayWidget.tsx`, `src/widgets/MemoWidget.tsx` (크기별 모양 참고 — 미리보기 디자인 근거)

## 배경 (사용자 피드백)

- **#3 생년월일:** "- 빼게 시켜라. 언제 치냐?" → `YYYY-MM-DD`를 직접 타이핑(하이픈 포함)하게 하지 마라. **네이티브 날짜 선택** 사용.
- **#4 태어난 시간:** "입력을 디폴트로 넣어놔라. 모름을 디폴트로 하지말고." → 기본은 **시간 입력 모드**(timeUnknown 기본 false). "모름"은 부차 옵션(기본 off).
- **#2 크기:** "D-day랑 메모 크기에 대해서 미리보기 정도는 해줘야." → 크기(작게/보통/크게) 선택 시 그 크기가 어떻게 보이는지 **미리보기**.

## 작업

### A) 재사용 컴포넌트 신설 (`src/components/`에 추가 + index export)

1. **`BirthInputs`** — 생일/시간/음력 입력 묶음(제어 컴포넌트):
   - props: `{ birthDate, birthTime, timeUnknown, isLunar, onChange: (patch)=>void }` (모양은 재량, 제어형).
   - **생년월일:** 네이티브 `<input type="date">`(HTML 기본 요소 — 새 라이브러리 아님), `max`=오늘(미래 생일 방지), value=birthDate(`YYYY-MM-DD`). 하이픈 타이핑 불필요. TDS 톤에 맞춰 inline style로 감싸고 라벨/`aria-label` 부여. (음력 토글이 켜져도 값은 그대로 `YYYY-MM-DD` 문자열 — 해석만 음력. 기존 SajuInput 계약 유지.)
   - **태어난 시간:** 기본은 입력 모드. `<input type="time">`(네이티브) value=birthTime(`HH:mm`). 아래에 "시간을 몰라요" 옵션(Switch/Checkbox) — **기본 off**(timeUnknown=false). 켜면 시간 입력 숨김/무시.
   - **음력:** 기존 Switch 유지.
   - 검증: birthDate가 비었거나 유효(isValidBirthDate)하면 ok, 아니면 에러 표시.
   - RN 프리미티브 금지, 웹 `<input>`/TDS만. 순수 표시·제어(저장은 호출부).

2. **`SizePreview`** — 위젯 크기 미리보기:
   - props: `{ type: WidgetType; size: WidgetSize }` → 그 크기일 때의 대략적 모양을 **작은 목업**으로 그린다(실제 위젯 렌더가 아니라 비율/높이를 보여주는 스케치 카드면 충분). D-day는 작게=2열 칩 느낌/보통/크게, 메모는 높이/줄 수 차이를 시각화.
   - 과조립 금지 — 박스 비율·라벨로 "이 정도 크기" 감을 주면 됨. inline style/토큰.

### B) `OnboardingScreen.tsx` 수정

- STEP2 생일 카드: 기존 TextField(YYYY-MM-DD 수기) → **`BirthInputs`** 로 교체. 상태(birthDate/birthTime/timeUnknown/isLunar)를 BirthInputs에 연결. `timeUnknown` 초기값을 **false로** 바꾼다(#4). finish()의 saju 매핑은 그대로(미입력/모름 처리 유지).
- STEP2 크기 카드: SegmentedControl 아래에 현재 선택 size의 **`SizePreview`** 를 노출(선택 바꾸면 미리보기도 바뀜)(#2).
- 기존 "건너뛰기/다음/이전/시작하기" 흐름·검증·접근성 보존.

### C) 테스트

- `BirthInputs`/`SizePreview` 렌더 스모크(jsdom): date/time input 존재, 크기 바꾸면 preview 반영(간단), timeUnknown 기본 false.
- 기존 온보딩 관련 테스트가 있으면 갱신해 통과. 스모크(`src/__smoke__`)에서 온보딩이 마운트되면 깨지지 않게.

## Acceptance Criteria

```bash
npm run build && npm test && npm run lint
```

## 검증 절차

1. AC 실행.
2. 체크리스트:
   - #3 생일=네이티브 date(하이픈 타이핑 0, max=오늘). #4 시간 입력이 기본 노출(모름 기본 off). #2 크기 미리보기 노출·반응.
   - CRITICAL #5: 웹 `<input>`/TDS만, RN 0, 새 라이브러리 0, inline style+토큰.
   - CRITICAL #1: 저장은 기존 storage 접근자만(이 컴포넌트는 입력만, 저장 안 함).
3. `phases/9-polish-onboarding/index.json` step 2 갱신(summary에 신설 컴포넌트 명시 — step 3가 재사용).

## 금지사항

- 생일을 하이픈 수기 타이핑으로 받지 마라(#3). 캘린더/데이트픽커 라이브러리 설치 금지 — 네이티브 `<input type="date">`로 충분(#5).
- 태어난 시간 "모름"을 기본값으로 두지 마라(#4 — 입력 모드가 기본).
- 설정 화면(WidgetsScreen)·스토리지·브랜딩은 건드리지 마라(step 3/0/1). 새 의존성·대량 탐색 금지(#7).
