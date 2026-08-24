# Step 3: size-preview-cells (크기 미리보기 = 몇 칸 + 컴포넌트 예시 옆에 + 미선택)

크기 미리보기를 개선한다: 그 크기가 **홈에서 몇 칸을 차지하는지**와 **실제 컴포넌트 예시**를 선택지 옆에 보여주고, 표시 안 함(미선택) 상태도 다룬다.

## 읽어야 할 파일

- `CLAUDE.md` (CRITICAL — #5 스택, #7 예산)
- `src/components/SizePreview.tsx` (현재 — 추상 막대 목업, footprint 정보 없음)
- `src/screens/onboarding/OnboardingScreen.tsx` (STEP2 크기 카드 — SegmentedControl + SizePreview)
- `src/screens/widgets/WidgetsScreen.tsx` (WidgetEditRow — 크기 SegmentedControl, on/off Switch, SizePreview는 step? 확인)
- `src/features/widgets/widget-config.ts` (`ALLOWED_SIZES`, `WIDGET_META`)
- `src/widgets/DdayWidget.tsx`, `src/widgets/MemoWidget.tsx` (실제 컴포넌트 모양 — 예시 충실도)
- `src/theme/tokens.ts`

## 배경 (사용자 피드백)

"총 몇칸인지를 알려줘야지 사람들이 크게할지 작게할지 알지. 컴포넌트 예시를 옆에 보여줘야하는거 아니야? 미선택할수도 있고."
→ ① 크기별 **홈 차지 칸수(footprint)** 를 알려준다. ② **실제 컴포넌트 같은 예시**를 (가능하면) 선택지 **옆**에 둔다. ③ **미선택(표시 안 함)** 상태를 표현.

## 작업

### A) `SizePreview.tsx` 개선
- 크기별 **footprint(몇 칸)** 라벨을 분명히 노출. 우리 홈은 세로 카드 리스트이고 D-day만 작게=2열(PRD §6.3). 표기 권장:
  - D-day: 작게 = "반 칸(둘이 나란히)", 보통 = "한 칸", 크게 = "한 칸(크게)".
  - 메모: 작게 = "한 칸(짧게)", 보통 = "한 칸", 크게 = "한 칸(길게)".
  - "약 N줄"/"화면 폭의 절반" 같이 사람이 가늠되게. (실제 그리드 변경은 다음 step 아님 — 표기로 footprint 전달.)
- 예시 충실도 ↑: 추상 회색 막대 대신 **실제 위젯에 가까운 미니 예시**(제목/D-수치/체크 줄 등 실제 텍스트 한두 개)로 "이렇게 보여요" 감을 준다(컴포넌트 예시). 과조립 금지(작은 카드 1개).
- `size`가 없을 때(미선택) 또는 새 prop `enabled?: boolean`가 false면 **"홈에 표시 안 함"** 흐린 상태를 보여줄 수 있게 한다.

### B) 레이아웃: 선택지 "옆에" 예시 (onboarding + settings)
- **OnboardingScreen STEP2 크기 카드**: SegmentedControl과 SizePreview를 **가로로 나란히**(좁으면 자동 줄바꿈) 배치 — 선택지 옆에 예시가 보이게. 현재 위/아래라면 옆 배치로.
- **WidgetsScreen WidgetEditRow**: 크기 SegmentedControl 옆/아래에 SizePreview를 두고, 위젯이 off면 미표시 상태 전달(enabled=false). 기존 토글/순서/정책 보존.

### C) 스모크/테스트
- SizePreview: footprint 라벨 존재, size 변경 반영, enabled=false 시 "표시 안 함" 표기. (기존 BirthInputs.test 류 패턴.)
- 온보딩/위젯편집 스모크 깨지지 않게.

## Acceptance Criteria

```bash
npm run build && npm test && npm run lint
```

## 검증 절차

1. AC 실행.
2. 체크리스트: 미리보기에 몇 칸(footprint) + 컴포넌트 같은 예시, 선택지 옆 배치, 미선택/off 상태 표현. CRITICAL #5(웹/TDS·새 라이브러리 0·RN 0·inline+토큰).
3. `phases/10-home-ux/index.json` step 3 갱신(summary).

## 금지사항

- 추상 막대만 남기지 마라(실제 같은 예시 + 몇 칸). 미선택/off 상태를 빼먹지 마라.
- 홈 그리드 레이아웃(TodayScreen) 자체를 바꾸지 마라(이번엔 미리보기 표기까지 — 실제 2열 그리드는 범위 밖). 메모·운세·일기·드래그는 건드리지 마라(다른 step). 새 의존성 금지(#7).
