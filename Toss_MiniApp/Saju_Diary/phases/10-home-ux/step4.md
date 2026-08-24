# Step 4: drag-reorder (위젯 순서 = 9점 드래그 핸들)

위젯 편집의 순서 변경을 위/아래 버튼 대신(또는 함께) **9점(⠿) 드래그 핸들로 끌어서** 바꾼다. 라이브러리 없이 네이티브 이벤트로 구현(CRITICAL #5).

## 읽어야 할 파일

- `CLAUDE.md` (CRITICAL — **#5 임의 UI/DnD 라이브러리 금지**, #1 로컬, #7 예산)
- `src/screens/widgets/WidgetsScreen.tsx` (수정 — 현재 위/아래 IconButton로 순서 변경, `apply(moveUp/moveDown)`)
- `src/features/widgets/widget-config.ts` (`moveUp`, `moveDown`, `normalizeWidgets`, `homeWidgets`, `setSize` 등 순수 변형)
- `src/features/widgets/widget-config.test.ts` (있으면)
- `src/theme/tokens.ts`

## 배경 (사용자 피드백)

"위젯 순서정할수있게 점 9개인가 그거로 당겨쓰도록 만들어." → 3×3 점(grip, ⠿) 핸들을 잡고 **드래그**해서 순서 변경.

## 작업

### A) 순수 변형 보강(필요 시) — `widget-config.ts`
- 임의 위치 이동이 필요하면 `moveTo(widgets, type, toIndex)` 또는 `reorder(widgets, fromIndex, toIndex)` 순수 함수를 추가(불변, order 재정규화). 기존 moveUp/moveDown은 유지(접근성 폴백/테스트). 드래그 결과를 이 순수 함수로 반영.

### B) 드래그 UI — `WidgetsScreen.tsx`
- 각 `WidgetEditRow`에 **드래그 핸들**(⠿ 9점, 예: `⠿`/SVG 점 3×3 또는 텍스트 그리드)을 둔다. `aria-label="순서 변경 손잡이"`.
- **라이브러리 없이** 구현(택1):
  - HTML5 native DnD: 행에 `draggable`, `onDragStart/onDragOver/onDrop`로 인덱스 교환 → `reorder` 적용 후 `saveSettings`.
  - 또는 Pointer 이벤트(onPointerDown/Move/Up)로 드래그 위치 추적.
  - 새 npm 패키지 0(CRITICAL #5). 모바일 터치도 고려(native DnD는 데스크톱 위주 → 가능하면 pointer 기반 권장).
- 드래그 중 시각 피드백(들린 행/드롭 위치 표시) 가볍게(inline style). 드롭 시 순수 `reorder`로 settings.widgets 갱신 → `saveSettings`(로컬 전용).
- **접근성/폴백:** 위/아래 버튼은 남겨두거나(키보드/스크린리더용) 핸들에 키보드 이동을 부여한다(완전 제거 시 a11y 저하 주의). 최소 하나의 비드래그 경로 유지 권장.
- 크기 정책(날씨·운세 large 금지)·토글·개인정보 고지·SizePreview(step 3) 보존.

### C) 테스트
- widget-config.test: `reorder`/`moveTo` 순수·불변·order 재정규화.
- 스모크: WidgetsScreen에 드래그 핸들 렌더, 순서 변경 함수 호출 경로(드래그 시뮬은 어려우니 핸들 존재 + reorder 단위 테스트로 커버). 기존 테스트 유지.

## Acceptance Criteria

```bash
npm run build && npm test && npm run lint
```

## 검증 절차

1. AC 실행.
2. 체크리스트:
   - 9점 핸들로 드래그 순서 변경(라이브러리 0), 결과 saveSettings 반영. 터치 동작 고려. a11y 폴백 유지.
   - CRITICAL #5(새 DnD/UI 라이브러리 0·RN 0), #1(저장 storage만).
3. `phases/10-home-ux/index.json` step 4 갱신 + 모든 step 일관.

## 금지사항

- DnD 라이브러리(react-dnd, dnd-kit, sortablejs 등) 설치 금지(#5 — 네이티브 이벤트로). 
- 접근성 경로를 모두 없애지 마라(키보드/버튼 폴백 최소 1개). 다른 step 영역(메모·운세·일기·미리보기 내부 로직) 건드리지 마라. 새 의존성·대량 탐색 금지(#7).
