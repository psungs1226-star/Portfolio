# Step 1: memo

## 읽어야 할 파일
아래만 읽어라(컨텍스트 300K 이내).
- `/CLAUDE.md`
- `/docs/PRD.md` (§6.4 메모)
- `src/types/index.ts`, `src/features/storage/index.ts`, `src/components/`, `src/theme/tokens.ts`, `src/screens/today/`

## 작업
메모 위젯을 구현한다.

1. `src/widgets/MemoWidget.tsx`: 빠른 입력("던지기"), 목록 표시, 항목별 체크박스(완료 시 취소선). `isTodo` 항목은 체크 가능, 일반 메모는 텍스트만. 날짜(`date`) 자동 기록.
2. 저장은 storage `memos` 접근자. today 홈 "기록" 섹션에 끼움.

핵심 규칙: 입력 마찰 최소(한 번에 빠르게 추가). 메모=수시 던지기, 일기와 역할 분리(일기는 다음 step).

## Acceptance Criteria
```bash
npm run build
npm test    # 추가/체크 토글/삭제 상태 변경 테스트
```

## 검증 절차
1. AC 실행.
2. 체크리스트: 체크박스 취소선 / 빠른 추가 / storage 접근자.
3. `phases/3-records/index.json` step1 업데이트(summary).

## 금지사항
- 메모에 일기 기능(감정·날씨 헤더)을 넣지 마라. 이유: 역할 분리(PRD §6.4/6.5).
- Storage 직접 호출 금지. 이유: CRITICAL #1.
