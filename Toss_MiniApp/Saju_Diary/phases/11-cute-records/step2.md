# Step 2: memo-overhaul (삭제 숨김+수정 추가, 완료는 목록서 빠짐, 2단 그리드)

메모를 관리 가능하게 정리한다: 삭제는 기본 숨기고 탭하면 수정/삭제 노출, 완료하면 활성 목록에서 빠진다(완료분은 다음 step의 캘린더로), 많아지면 2단.

## 읽어야 할 파일

- `CLAUDE.md` (CRITICAL — #1 로컬, #5 웹 React+TDS·RN/라이브러리 금지, #7 예산)
- `src/widgets/MemoWidget.tsx` (현재 — 슬림 입력 + MemoRow(완료 체크 + 삭제 휴지통 항상 노출))
- `src/widgets/memo-ops.ts` (`addMemo`, `toggleMemo(memos,id,{completedDate})`, `removeMemo`, `memosForDate`, `completedTodosForDate`)
- `src/widgets/memo-ops.test.ts`
- `src/types/index.ts` (Memo: checked/isTodo/completedDate)
- `src/theme/tokens.ts` (cute 토큰은 step 0에서 추가됨 — 있으면 가볍게 활용 가능)

## 배경 (사용자 피드백)

- **#3:** "삭제를 디폴트에서 보이게 하지마라. 클릭했을 때 보이게하고, 수정버튼도 만들어라." → 평소엔 텍스트+완료만, 행을 탭하면 **수정/삭제** 노출. **수정** 추가.
- **#4:** "완료시 계속 남기게 할거야? 어느세월에 관리해?" → 완료한 메모는 **활성 목록에서 빠진다**(저장은 유지 — 캘린더용). 활성 목록엔 미완료만.
- **#2:** "작게나 특정 수 지나가면 보통에서 2단으로?" → 활성 메모가 **임계(예: 4개) 초과면 2단(2열) 그리드**.

## 작업

### A) `memo-ops.ts` — 순수 함수 보강
- **`editMemo(memos, id, text)`** — 해당 메모 text 교체(trim, 빈 문자열이면 무시/원본). 불변.
- **`activeMemosForDate(memos, date)`** — 그날 메모 중 **미완료**(완료=checked && completedount? 기준: `checked === true`인 건 제외)만. (완료분은 `completedTodosForDate`로 따로.) 순서 보존.
- 기존 add/toggle/remove/completedTodosForDate 유지.

### B) `MemoWidget.tsx` — 행 동작 + 2단
- 표시 목록 = `activeMemosForDate(memos, today)`(완료된 건 안 보임).
- **MemoRow 기본:** 체크(완료) + 텍스트만. **삭제 버튼 기본 숨김.**
  - 행을 탭/클릭(또는 ⋯ 버튼)하면 그 행만 **액션 펼침**: **수정**(연필) + **삭제**(휴지통). 다시 탭하면 닫힘(또는 다른 행 열면 이전 닫힘 — selectedId 상태).
  - **완료**(체크): `toggleMemo(memos, id, { completedDate: today })` → 그 메모가 활성 목록에서 사라짐(완료 처리, 캘린더로). 가벼운 확인/애니메이션은 선택.
  - **수정**: 인라인 편집(input으로 전환) 또는 작은 편집 영역 → `editMemo`. 저장 시 반영.
  - **삭제**: `removeMemo`(영구 제거 — 완료와 구분).
  - 접근성: 각 버튼 aria-label.
- **2단 그리드:** 활성 메모 개수가 임계(예: > 4)면 `gridTemplateColumns: 1fr 1fr`로 2열, 그 이하는 1열. (또는 항상 2단 옵션 — 임계 방식 권장.) 좁은 폭 고려.
- 입력(슬림 한 줄)·"던지기"는 유지. 완료된 메모는 여기 안 보이고 다음 step 캘린더에서 본다는 점 주석.

### C) 테스트/스모크
- memo-ops.test: editMemo(교체·빈값·불변), activeMemosForDate(미완료만·완료 제외·순서).
- 스모크: 기본엔 삭제 안 보임 → 행 탭하면 수정/삭제 노출; 완료 클릭 시 활성 목록에서 사라짐; 메모 5개면 2단(grid) 적용(간단 검증).

## Acceptance Criteria

```bash
npm run build && npm test && npm run lint
```

## 검증 절차

1. AC 실행.
2. 체크리스트: 삭제 기본 숨김·탭하면 수정/삭제, 수정 동작, 완료 시 활성 목록서 제거(저장은 유지), 다수일 때 2단. CRITICAL #1(저장 storage만)·#5(TDS/웹·새 라이브러리 0·RN 0).
3. `phases/11-cute-records/index.json` step 2 갱신(summary에 activeMemosForDate/editMemo 명시 — step 3 캘린더가 completedTodosForDate 사용).

## 금지사항

- 완료된 메모를 **삭제**하지 마라(저장 유지 — 캘린더 자료). 완료=목록서 숨김, 삭제=영구 제거. 둘 구분 유지.
- 삭제를 기본 노출로 두지 마라(#3). 운세·일기·캘린더·헤더는 건드리지 마라(다른 step). 새 의존성·대량 탐색 금지(#7).
