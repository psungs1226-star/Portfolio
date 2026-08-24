# Step 4: calibration-fixture

## 읽어야 할 파일
아래만 읽어라(컨텍스트 300K 이내).
- `/CLAUDE.md` (CRITICAL #3)
- `/docs/ARCHITECTURE.md` (§5 표준 정합 — 캘리브레이션)
- `/docs/PRD.md` (§14 사주 정확도 검증)
- `src/features/fortune/{manse,engine}.ts`

## 작업
"우리만 사주가 다르게 나온다"를 막는 **캘리브레이션 테스트 픽스처**를 만든다.

1. `src/features/fortune/calibration.fixture.ts`: 검증용 케이스 배열. 각 케이스 = `{ birth, date, expected: { yearGanZhi, monthGanZhi, dayGanZhi(natal), todayIljin } }`.
   - 엣지 케이스 필수 포함: **입춘 전후**(2월 초 출생), **절기 경계**(월주 바뀌는 날), **23시대 출생**(야자시), **음력 윤달 출생**, **윤년**.
   - `expected` 값은 주류 공개 만세력(플러스만세력/포스텔러)에서 조회해 채운다.
2. `src/features/fortune/calibration.test.ts`: 위 케이스를 `manse`로 계산해 expected와 **글자 단위 일치** 검증.
3. 불일치 시: 먼저 `manse`의 sect/경도보정/서머타임 설정을 주류 다수파에 맞춰 조정한다. 그래도 주류끼리 갈리면 다수파 채택 + 근거를 코드 주석에 기록.

핵심 규칙: 픽스처 expected는 추측 금지 — 실제 만세력 조회값. (조회 불가한 환경이면 blocked 처리.)

## Acceptance Criteria
```bash
npm run build
npm test    # calibration 케이스 전부 통과
```

## 검증 절차
1. AC 실행.
2. 체크리스트: 5종 엣지 케이스 포함 / expected가 주류 만세력 출처 / 통과.
3. `phases/1-fortune/index.json` step4 업데이트:
   - 통과 → `completed` + summary
   - **expected 값을 확정할 외부 만세력 조회가 불가** → `blocked` + reason("주류 만세력 대조값 입력 필요")

## 금지사항
- expected 값을 우리 계산 결과로 채우지 마라. 이유: 자기참조 검증은 무의미(주류 정합 목적 상실, CRITICAL #3).
- 실패를 통과로 우회(테스트 skip)하지 마라. 이유: 정확도 게이트가 핵심.
