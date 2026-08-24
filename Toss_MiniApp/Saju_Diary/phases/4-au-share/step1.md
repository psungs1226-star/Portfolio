# Step 1: review-tab

## 읽어야 할 파일
아래만 읽어라(컨텍스트 300K 이내).
- `/CLAUDE.md`
- `/docs/PRD.md` (§6.6 돌아보기)
- `src/types/index.ts`, `src/features/storage/index.ts`, `src/features/share/index.ts`, `src/components/`, `src/theme/tokens.ts`, `src/screens/review/`

## 작업
돌아보기(회고) 탭을 구현한다.

1. `src/screens/review/`: 월간 **기분 그래프**(diaries의 mood 시계열), 일기 모아보기, 운세 요약(앱 내 카드 표시).
2. 공유 버튼 → `share-engine`의 `shareReview()` 연결(텍스트+토스링크).
3. 데이터는 storage `diaries`에서 집계. 빈 데이터일 때 친절한 빈 상태.

핵심 규칙: 카드 이미지는 **앱 내 표시용**(외부 공유는 텍스트). 집계는 순수 함수로 분리(테스트 가능).

## Acceptance Criteria
```bash
npm run build
npm test    # 월간 mood 집계 함수 테스트
```

## 검증 절차
1. AC 실행.
2. 체크리스트: 기분 그래프·모아보기 / 공유 연결 / 빈 상태 / share·storage 재사용.
3. `phases/4-au-share/index.json` step1 업데이트(summary).

## 금지사항
- 이미지 카드를 외부로 공유하려 하지 마라. 이유: 미지원(텍스트 공유만).
- 집계 로직을 컴포넌트에 인라인하지 마라. 이유: 테스트 가능하게 순수 함수 분리.
