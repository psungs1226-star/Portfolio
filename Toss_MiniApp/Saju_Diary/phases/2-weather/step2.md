# Step 2: weather-widget

## 읽어야 할 파일
아래만 읽어라(컨텍스트 300K 이내).
- `/CLAUDE.md`
- `/docs/PRD.md` (§6.1 날씨)
- `src/features/weather/{grid,client}.ts`, `src/features/storage/index.ts`, `src/components/`, `src/theme/tokens.ts`, `src/screens/today/`

## 작업
홈 날씨 위젯을 구현한다.

1. `src/widgets/WeatherWidget.tsx`:
   - **3시간 타임라인**(가로 스크롤, "지금" 강조, 강수 시간대 아이콘 사전 표시).
   - **2지역**(집/회사) 한 카드 좌우 스와이프 + 점 인디케이터(● ○), 카드 높이 고정·내용만 전환.
   - 미세먼지 등급·자외선 뱃지. **압축 디폴트**: 아이콘·지역·현재/최저최고·뱃지 1줄.
   - 위치는 `getCurrentLocation`(실패 시 도시 직접 선택 폴백) → `latLonToGrid` → client 호출. region은 storage settings에서.
2. today 홈 "확인" 섹션 최상단에 끼운다(아침 즉시 보상, PRD §9 Retention).

핵심 규칙: 데이터는 client 재사용. 첫 페인트는 캐시 우선(네트워크로 블로킹 금지, PRD §11).

## Acceptance Criteria
```bash
npm run build
npm test
```

## 검증 절차
1. AC 실행.
2. 체크리스트: 타임라인·2지역 스와이프·뱃지·압축 1줄 / 위치 실패 폴백 / 캐시 우선 렌더 / client·grid 재사용.
3. `phases/2-weather/index.json` step2 업데이트(summary).

## 금지사항
- 위젯에서 격자 변환/HTTP 파싱을 다시 구현하지 마라. 이유: grid/client 단일 출처.
- 위치 권한 거부를 치명 에러로 처리하지 마라. 이유: 도시 직접 선택 폴백(PRD §6.1).
