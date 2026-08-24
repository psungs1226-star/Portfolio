# QQQM/VOO 검증 코드 리뷰 기준

## 리뷰 목적

코드 검토자는 실행자가 추가한 QQQM/VOO 검증 데이터 연동과 다중 ETF 화면이 기존 플러그인 목적을 해치지 않고 동작하는지 확인한다. 최종 제출 적합 여부를 단정하지 않고, 발견 사항을 심각도와 파일 위치 기준으로 남긴다.

## 반드시 확인할 파일

- `submission/src/web/scripts/fetch-yahoo-fixtures.mjs`
- `submission/src/web/src/data/marketFixtures.generated.ts`
- `submission/src/web/src/data/marketFixtureTypes.ts`
- `submission/src/web/src/data/etfFixtures.ts`
- `submission/src/web/src/data/schdFixture.ts`
- `submission/src/web/src/lib/simulation.ts`
- `submission/src/web/src/lib/simulation.test.ts`
- `submission/src/web/src/app/App.tsx`
- `submission/README.md`
- `submission/src/skills/kakaopay-securities/SKILL.md`

## 핵심 검토 항목

1. 데이터 출처와 재현성
   - QQQM, VOO, USD/KRW 데이터가 공개 URL에서 받아온 로컬 스냅샷으로 남는지 확인한다.
   - `generatedAt`, `sourceUrls`, `periodStart`, `periodEnd`가 generated fixture에 남는지 확인한다.
   - API 키, 토큰, 개인 계좌정보, 비밀정보가 없는지 확인한다.

2. 기간 처리
   - QQQM은 `2020-10-13`부터 시작하므로 10년 참고 범위를 표시하지 않는지 확인한다.
   - VOO는 10년 참고 범위까지 계산되는지 확인한다.
   - 표본이 없는 기간이 0% 수익률처럼 보이지 않는지 확인한다.

3. 계산 정합성
   - SCHD synthetic stress가 QQQM/VOO 실제 조정종가에 더해지지 않는지 확인한다.
   - QQQM/VOO는 조정종가를 사용하므로 추가 배당률이 0인지 확인한다.
   - 최저치, 평균, 최고치, 원금, 그래프 값이 같은 summary에서 나오는지 확인한다.
   - 실제 일별 anchor가 많아져도 테스트가 과도하게 느려지지 않는지 확인한다.

4. 화면 문구와 UX
   - ETF 선택이 상품 권유처럼 읽히지 않는지 확인한다.
   - `과거 수익률로 잡아본 범위 · 보장 아님` 의미가 결과 근처에 보이는지 확인한다.
   - 환율, 배당, 데이터 출처, 데이터 기간, 데이터 한계가 확인 가능한지 확인한다.
   - `예상 수익률`, `95% 확률`, `추천`, `안정적`, `초보자에게 적합`, `장기적으로 유리`가 제품 주장이나 CTA로 쓰이지 않는지 확인한다.

5. 제출 구조와 문서 정합성
   - `src/.codex-plugin/plugin.json`과 `src/skills/kakaopay-securities/SKILL.md`가 유지되는지 확인한다.
   - README의 실행 명령과 실제 `package.json` scripts가 일치하는지 확인한다.
   - 웹 MVP가 런타임에 외부 API를 호출하지 않고, 검증 스크립트에서만 데이터를 받는지 확인한다.

## 실행 명령

```bash
cd submission/src/web
npm run fetch:fixtures
npm test
npm run build
```

```bash
python3 -m venv /tmp/codex-plugin-validate-kakaopay
/tmp/codex-plugin-validate-kakaopay/bin/pip install PyYAML
/tmp/codex-plugin-validate-kakaopay/bin/python /Users/psh/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py submission/src
```

```bash
rg -n "예상 수익률|95% 확률|추천|안정적|초보자에게 적합|장기적으로 유리" submission/src submission/README.md
```

## 리뷰 결과 형식

```markdown
## 코드 리뷰 결과

- 치명:
- 높음:
- 보통:
- 낮음:

## 실행 결과

- `npm run fetch:fixtures`:
- `npm test`:
- `npm run build`:
- `validate_plugin.py`:
- 금지 표현 검색:

## 실행자에게 넘길 수정 요청

- 
```
