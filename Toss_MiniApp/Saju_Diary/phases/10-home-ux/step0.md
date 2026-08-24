# Step 0: memo-complete-delete (메모 입력 축소 + 완료/삭제 분리 → 일기 연동)

메모 "한 줄 던지기" 입력칸을 작게 줄이고, 메모마다 **완료**와 **삭제**를 분명한 두 동작으로 제공한다. 완료는 그날 일기로 흘러들어야 한다(이미 phase 6에 completedDate 연동 있음).

## 읽어야 할 파일

- `CLAUDE.md` (CRITICAL — #1 로컬, #5 웹 React+TDS·RN/임의 라이브러리 금지, #7 예산)
- `src/widgets/MemoWidget.tsx` (수정 — MemoInput 너무 큼, MemoRow에 ✕ 삭제만 두드러짐)
- `src/widgets/memo-ops.ts` (`addMemo`, `toggleMemo(memos,id,opts?)`, `setMemoCompletedDate`, `completedTodosForDate`, `removeMemo`)
- `src/widgets/memo-ops.test.ts`
- `src/types/index.ts` (Memo: id/date/text/checked/isTodo/completedDate)
- `src/theme/tokens.ts`
- `src/screens/diary/DiaryScreen.tsx`(참고만 — "그날 완료한 일" 섹션이 completedTodosForDate로 그날 일기에 표시됨)

## 배경 (사용자 피드백)

- **#5:** "메모 한줄던지기 과하게 칸이 크다." → 입력 영역을 한 줄로 콤팩트하게.
- **#6:** "왜 완료 or 삭제를 안해놓고 그냥 삭제야? 일기연동 어떻게 시키려고?" → 메모는 **완료(→그날 일기로 연동)** 와 **삭제(제거)** 두 동작이 분명해야 한다. 지금은 일반 메모에 삭제(✕)만 보인다.

## 작업

### A) 입력 콤팩트화 (`MemoWidget.tsx` MemoInput)
- 큰 `TextField.Clearable`(label appear로 높이 큼) + 별도 "할 일로" 토글 행을 **한 줄 인라인**으로: 슬림한 입력 + "던지기" 버튼이 같은 행. 라벨은 placeholder로 충분(label 영역 제거/축소).
- "할 일로" 사전 토글은 **제거**한다(아래 B에서 모든 메모를 완료 가능하게 하므로 불필요). 입력은 한 줄 던지기에 집중.
- 높이를 눈에 띄게 줄인다(과한 패딩/이중 행 제거). TDS 컴포넌트 유지(TextField 또는 슬림 input — 단 새 라이브러리 0).

### B) 완료/삭제 분리 (`MemoWidget.tsx` MemoRow)
- 던진 메모는 기본적으로 **완료 가능한 항목**으로 둔다. `addMemo` 호출 시 `isTodo: true`로(모든 메모가 체크 가능). (types/ops 시그니처 변경 없이 호출부에서 isTodo:true 지정.)
- 각 행에 **두 동작을 분명히**:
  - **완료** = 체크(예: 왼쪽 `Checkbox.Circle` 또는 "완료" 버튼). 체크 시 `toggleMemo(memos, id, { completedDate: today })` → 취소선 + 그날 일기 "완료한 일"에 연동. 해제 시 completedDate 제거(기존 로직).
  - **삭제** = 별도 아이콘/버튼(휴지통 등), `removeMemo`. 완료와 시각적으로 구분(삭제만 있는 것처럼 보이지 않게).
- 완료된 항목은 취소선 + (선택) "완료" 표시. 삭제는 항상 가능.
- 접근성: 체크박스 `aria-label="{text} 완료"`, 삭제 `aria-label="{text} 삭제"`.

### C) 일기 연동 확인
- 완료 시 completedDate=today가 붙어 DiaryScreen의 "그날 완료한 일"(completedTodosForDate)에 그날 일기로 보이는지(로직은 이미 있음 — 호출 경로만 정확히 연결). 별도 화면 작업 없음(여기선 메모 쪽만).

### D) 테스트/스모크
- memo-ops.test: 새 메모 isTodo:true 경로·완료 시 completedDate·삭제 동작(기존 유지, 필요 시 보강).
- `src/__smoke__/widgets.smoke.test.tsx`: MemoWidget이 콤팩트 입력 + 완료/삭제 버튼을 크래시 없이 렌더, 완료 클릭 시 취소선/상태 반영(간단).

## Acceptance Criteria

```bash
npm run build && npm test && npm run lint
```

## 검증 절차

1. AC 실행.
2. 체크리스트:
   - 입력칸 높이가 줄었는가(콤팩트 한 줄). 완료/삭제가 분명히 구분되는가. 완료→그날 일기 연동 경로 유지.
   - CRITICAL #1(저장 storage 접근자만), #5(TDS/웹만·새 라이브러리 0·RN 0·inline+토큰).
3. `phases/10-home-ux/index.json` step 0 갱신(summary).

## 금지사항

- 완료를 없애고 삭제만 남기지 마라(#6 핵심). 완료는 일기 연동의 출발점.
- DiaryScreen·홈 레이아웃·운세·위젯편집은 건드리지 마라(다른 step). 새 의존성·대량 탐색 금지(#7). 기존 테스트 깨지 마라.
