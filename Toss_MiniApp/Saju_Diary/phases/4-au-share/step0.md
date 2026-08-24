# Step 0: share-engine

## 읽어야 할 파일
아래만 읽어라(컨텍스트 300K 이내).
- `/CLAUDE.md`
- `/docs/ARCHITECTURE.md` (§7 AU/공유 엔진)
- `/docs/PRD.md` (§9 AU 성장 모델 — Referral)
- `src/types/index.ts`, `src/features/fortune/`, `src/features/storage/index.ts`

## 작업
공유(AU 엔진)를 구현한다. **share는 텍스트 전용** — 이미지 카드 공유 시도 금지.

`src/features/share/index.ts`:
- `buildFortuneShareText(result: FortuneResult): string` — 호기심 갭 설계(결과 일부만 노출 + "전체 보기"). 예: "오늘 내 운세 ⭐⭐⭐⭐·행운색 초록·재물 방향 南".
- `buildReviewShareText(monthly): string` — 월간 회고 요약 텍스트.
- `shareFortune()/shareReview()` — 위 텍스트 + `getTossShareLink`(미니앱 링크 부착) 후 앱인토스 `share({message})` 호출. 친구초대는 `contactsViral`(리워드) 연동 진입점 제공.

핵심 규칙: `share`에 이미지/링크 객체를 넣지 마라(텍스트만 지원). 미니앱 링크는 `getTossShareLink`로 생성해 텍스트에 포함.

## Acceptance Criteria
```bash
npm run build
npm test    # 텍스트 빌더 출력 포맷 테스트(별점·필드 포함, 링크 자리)
```

## 검증 절차
1. AC 실행.
2. 체크리스트: 텍스트 전용 공유 / getTossShareLink 포함 / 호기심 갭 카피 / fortune 재사용.
3. `phases/4-au-share/index.json` step0 업데이트(summary).

## 금지사항
- 이미지 카드 캡처·공유를 구현하지 마라. 이유: share 미지원, 검증 시간 낭비(ARCHITECTURE §7).
- 결과 전체를 공유 텍스트에 다 노출하지 마라. 이유: 호기심 갭(클릭 유입) 약화(PRD §9).
