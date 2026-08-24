# Step 2: phrase-bank

## 읽어야 할 파일
아래만 읽어라(컨텍스트 300K 이내).
- `/CLAUDE.md`
- `/docs/ARCHITECTURE.md` (§5 파이프라인 6 — 문구 반복 회피)
- `src/types/index.ts`, `src/features/fortune/engine.ts` (이전 step)

## 작업
정적 문구 뱅크와 결정론적 선택기를 만든다(런타임 LLM/서버 0 — CRITICAL).

1. `data/fortune-phrases.json`: 상태키 `(십신 또는 관계유형 × 항목)`별로 문구 배열(항목당 4~6개). 항목 = 총운/재물/애정/건강/한줄조언. 우선 총운·재물·애정을 충실히, 나머지는 시드 채움.
2. `src/features/fortune/phrases.ts`:
   - `pickPhrase(stateKey, seed): string` — `seed = hash(birthDate + 'YYYY-MM-DD')`로 배열에서 결정론적 1개 선택(같은 날 동일, 날 바뀌면 신선).
   - `attachPhrases(result: FortuneResult, seed): FortuneResult` — engine 결과에 문구를 주입.
   - "오늘의 일진" 교육 한 줄(예: "병오일 — 불 기운이 강한 날") 생성 헬퍼.

핵심 규칙: 선택은 시드 해시로만(랜덤 금지). JSON 스키마는 명확히 문서화(주석/별도 타입).

## Acceptance Criteria
```bash
npm run build
npm test    # 동일 seed→동일 문구, 다른 날짜→문구 변화 테스트
```

## 검증 절차
1. AC 실행.
2. 체크리스트: 런타임 외부 호출 0 / 시드 결정론 / 항목별 문구 4개 이상.
3. `phases/1-fortune/index.json` step2 업데이트(summary에 JSON 경로·선택기 시그니처).

## 금지사항
- LLM/네트워크로 문구를 생성하지 마라. 이유: CRITICAL(무서버·무비용·오프라인).
- 문구를 코드에 하드코딩 분산하지 마라. 이유: data JSON 단일 출처(확장·검수 용이).
