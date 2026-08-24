# Step 2: streak

## 읽어야 할 파일
아래만 읽어라(컨텍스트 300K 이내).
- `/CLAUDE.md` (CRITICAL #4 단순 리워드성 금지)
- `/docs/PRD.md` (§9 Retention·측정)
- `src/features/storage/index.ts`, `src/components/`, `src/screens/today/`

## 작업
연속 출석(streak) 재방문 UX를 구현한다. **리워드 지급 아님 — 표시·동기부여만.**

1. storage에 `lastOpenDate`·`streakCount` 기록. 앱 진입 시 갱신(어제 열었으면 +1, 건너뛰면 1로 리셋, 같은 날 재진입은 유지).
2. today 홈 상단에 "연속 N일" 가벼운 표시 + "어제와 달라진 오늘"(운세 일진 변화) 강조 카피.

핵심 규칙(CRITICAL #4): 출석에 포인트/현금성 보상을 주지 마라(단순 리워드성 규정 위반). 순수 동기부여 UX.

## Acceptance Criteria
```bash
npm run build
npm test    # streak 전이(연속/리셋/동일일) 테스트
```

## 검증 절차
1. AC 실행.
2. 체크리스트: 연속/리셋/동일일 전이 정확 / 외부 전송 없음(로컬만) / 보상성 없음(CRITICAL #4).
3. `phases/4-au-share/index.json` step2 업데이트(summary).

## 금지사항
- 출석 보상(리워드)을 넣지 마라. 이유: 단순 리워드성 앱 심사 제외(CRITICAL #4).
- streak를 외부로 전송하지 마라. 이유: 로컬 전용(CRITICAL #1).
