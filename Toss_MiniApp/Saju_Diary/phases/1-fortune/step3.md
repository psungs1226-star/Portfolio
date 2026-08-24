# Step 3: fortune-widget

## 읽어야 할 파일
아래만 읽어라(컨텍스트 300K 이내).
- `/CLAUDE.md`
- `/docs/PRD.md` (§6.2 사주 운세)
- `/docs/ARCHITECTURE.md` (§5)
- `src/features/fortune/{manse,engine,phrases}.ts`, `src/features/storage/index.ts`, `src/components/`, `src/theme/tokens.ts`, `src/screens/today/`

## 작업
홈에 들어갈 운세 위젯(간판)을 구현한다.

1. `src/widgets/FortuneWidget.tsx`:
   - storage에서 `saju` 입력을 읽어 `computeNatal` → `computeDayGanZhi(today)` → `buildFortune` → `attachPhrases`로 오늘 운세 산출.
   - **압축 디폴트(1행)**: 별점 뱃지 + 일진 + 한 줄 요약 + 화살표. 탭하면 상세(총운·재물·애정·건강·행운색·행운방향·오늘의 일진·한 줄 조언) 펼침.
   - 생일 미입력 시: "생일 넣고 오늘 운세 보기" CTA(온보딩/입력으로 연결).
   - 산출 결과는 당일 캐시(같은 날 재계산 최소화).
2. 보조: 타로 1장 뽑기 버튼(데이터·로직은 가벼운 placeholder 가능, 메인 아님).
3. today 홈의 "확인" 섹션에 끼운다.

핵심 규칙: 계산은 fortune 모듈 재사용(위젯에서 만세력/십신 로직 재구현 금지). 저장은 storage 접근자만.

## Acceptance Criteria
```bash
npm run build
npm test
```

## 검증 절차
1. AC 실행.
2. 체크리스트: 압축 1행→상세 펼침 동작 / 생일 미입력 CTA / fortune·storage 모듈 재사용(중복 로직 없음).
3. `phases/1-fortune/index.json` step3 업데이트(summary에 위젯 경로·홈 연결).

## 금지사항
- 위젯 안에서 만세력/십신 계산을 다시 구현하지 마라. 이유: engine/manse 단일 출처.
- 생일 미입력을 에러로 처리하지 마라. 이유: 운세는 선택 위젯, 빈 홈 금지(PRD §9).
