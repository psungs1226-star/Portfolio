# Step 1: weather-client

## 읽어야 할 파일
아래만 읽어라(컨텍스트 300K 이내).
- `/CLAUDE.md` (CRITICAL #1 — 공공 API 읽기만 허용)
- `/docs/ARCHITECTURE.md` (§2 SDK 매핑, §6 날씨 파이프라인)
- `/docs/TECH_STACK.md` (공공 API)
- `src/features/weather/grid.ts`, `src/features/storage/index.ts`, `src/types/index.ts`

## 작업
기상청·에어코리아 공공 API 클라이언트를 만든다. 호출은 **앱인토스 `http` 모듈 경유**(CRITICAL #5/#1).

`src/features/weather/client.ts`:
- `fetchShortForecast(region: Region): Promise<Forecast>` — 기상청 단기예보(getVilageFcst, 3시간 단위) 호출·파싱. 현재 시각 기준 타임라인 슬롯(시각·아이콘코드·기온·강수) 생성.
- `fetchAirQuality(region)` — 에어코리아 미세먼지 등급. `fetchUV(region)` — 생활기상지수 자외선.
- **캐시 우선**: 마지막 성공 응답을 storage에 캐시하고, 홈 첫 페인트는 캐시로 즉시 표시 후 백그라운드 갱신(PRD §11). 오프라인이면 캐시 + 오프라인 표시.
- 인증키는 `granite.config.ts`/환경에서 주입(코드에 하드코딩 금지). 호출 도메인을 `granite.config.ts` 허용 목록에 등록.

핵심 규칙: 외부 호출은 읽기 전용 공공 API만(CRITICAL #1·#2). fetch는 Bedrock http 사용.

## Acceptance Criteria
```bash
npm run build
npm test    # 응답 파서·캐시 폴백 단위 테스트(샘플 응답 fixture로)
```

## 검증 절차
1. AC 실행.
2. 체크리스트: http 모듈 경유 / 키 하드코딩 없음 / 캐시·오프라인 폴백 동작 / 격자 변환 재사용.
3. `phases/2-weather/index.json` step1 업데이트:
   - 통과 → completed + summary
   - **data.go.kr 인증키 미발급으로 실호출 검증 불가** → blocked + reason("기상청/에어코리아 API 키 발급·등록 필요"). 단, 파서/캐시 단위테스트는 fixture로 가능하면 완료 처리.

## 금지사항
- API 키를 소스에 하드코딩하지 마라. 이유: 보안·유출.
- 공공 API 외 외부 서버로 데이터를 전송하지 마라. 이유: CRITICAL #1.
