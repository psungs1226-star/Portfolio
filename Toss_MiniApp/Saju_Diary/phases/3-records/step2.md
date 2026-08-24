# Step 2: diary

## 읽어야 할 파일
아래만 읽어라(컨텍스트 300K 이내).
- `/CLAUDE.md`
- `/docs/PRD.md` (§6.5 일기)
- `src/types/index.ts`, `src/features/storage/index.ts`, `src/features/fortune/`, `src/features/weather/`, `src/components/`, `src/screens/diary/`

## 작업
일기 탭을 구현한다. **차별점 = 그날 날씨·운세·기분이 헤더에 자동 박제.**

1. `src/screens/diary/` 작성·조회: 하루 1개(`date` 키), 기분 별점(mood), 본문 텍스트.
2. **자동 헤더**: 작성 시 그날 `weatherSnapshot`(weather client/캐시)과 `fortuneSnapshot`(fortune engine 결과)을 함께 저장해 박제. 이후 조회 시 그날의 날씨·운세가 함께 보인다.
3. 저장은 storage `diaries` 접근자. 월간 회고(Phase 4)의 재료가 되도록 date·mood를 일관 저장.

핵심 규칙: 스냅샷은 작성 시점 값을 **복사 저장**(나중에 운세/날씨가 바뀌어도 그날 기록은 불변). 스냅샷 출처는 fortune/weather 모듈 재사용.

## Acceptance Criteria
```bash
npm run build
npm test    # 일기 저장→조회 시 스냅샷 동반 검증
```

## 검증 절차
1. AC 실행.
2. 체크리스트: 하루 1개 / 자동 헤더 스냅샷 복사 저장(불변) / storage 접근자 / fortune·weather 재사용.
3. `phases/3-records/index.json` step2 업데이트(summary).

## 금지사항
- 스냅샷을 참조(재계산)로 두지 마라. 이유: 과거 일기가 바뀌면 기록 신뢰 붕괴(복사 저장).
- Storage 직접 호출 금지. 이유: CRITICAL #1.
