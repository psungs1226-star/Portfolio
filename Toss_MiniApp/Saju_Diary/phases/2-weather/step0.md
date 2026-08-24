# Step 0: grid-convert

## 읽어야 할 파일
아래만 읽어라(컨텍스트 300K 이내).
- `/CLAUDE.md`
- `/docs/ARCHITECTURE.md` (§6 날씨 파이프라인 — 격자 변환)
- `src/types/index.ts` (Region 타입)

## 작업
위경도 → 기상청 단기예보 격자(nx, ny) 변환 순수 함수를 구현한다.

`src/features/weather/grid.ts`:
- `latLonToGrid(lat: number, lon: number): { nx: number; ny: number }` — 기상청 표준 Lambert Conformal Conic 공식(고정 상수: 격자 간격 5km, 기준점 등 공개 상수)으로 변환.
- 필요 시 역변환 `gridToLatLon` 도 포함(선택).

핵심 규칙: 상수는 기상청 공식 문서 값 그대로. 직접 근사/추정 금지.

## Acceptance Criteria
```bash
npm run build
npm test    # 알려진 좌표 변환 검증
```
- 테스트: 서울시청(lat 37.5665, lon 126.9780) → nx=60, ny=127 등 알려진 매핑 검증.

## 검증 절차
1. AC 실행.
2. 체크리스트: 순수 함수 / 표준 상수 사용 / 알려진 좌표 정확.
3. `phases/2-weather/index.json` step0 업데이트(summary에 함수 시그니처).

## 금지사항
- 네트워크 호출을 넣지 마라. 이유: 순수 좌표 변환 모듈.
- 상수를 임의로 바꾸지 마라. 이유: 기상청 격자 정합 깨짐.
