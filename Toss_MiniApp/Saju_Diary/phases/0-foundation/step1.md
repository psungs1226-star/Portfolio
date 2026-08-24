# Step 1: core-types

## 읽어야 할 파일
아래만 읽어라(컨텍스트 300K 이내). 임의 대량 탐색 금지.
- `/CLAUDE.md` (§데이터 모델, CRITICAL)
- `/docs/ARCHITECTURE.md` (§4 데이터 모델, §5 사주 엔진)
- `package.json`, `tsconfig.json`

## 작업
앱 전역 도메인 타입을 한곳에 정의한다. **순수 타입만**(런타임 로직 0).

`src/types/index.ts`에 다음을 정의:

- 열거형/유니온: `WidgetType = 'weather'|'fortune'|'dday'|'memo'|'diary'`, `WidgetSize = 'small'|'medium'|'large'`, `WuXing = '木'|'火'|'土'|'金'|'水'`, `TenGod`(십신 10종: 비견·겁재·식신·상관·편재·정재·편관·정관·편인·정인), `Tier = 'free'|'premium'`.
- `WidgetConfig { type: WidgetType; enabled: boolean; size: WidgetSize; order: number }`
- `Region { name: string; lat: number; lon: number; nx: number; ny: number }`
- `SajuInput { birthDate: string; birthTime?: string; isLunar: boolean }` + `SajuCache`(일간·일간 오행 등 산출 캐시; 필드는 ARCHITECTURE §5 산출물 기준으로 합리적으로 정의)
- `Settings { widgets: WidgetConfig[]; weather: { regions: Region[] }; saju?: SajuInput & { cached?: SajuCache } }`
- `Diary { date: string; mood: number; weatherSnapshot?: unknown; fortuneSnapshot?: unknown; text: string }`
- `Memo { id: string; date: string; text: string; checked: boolean; isTodo: boolean }`
- `Dday { id: string; title: string; targetDate: string; size: WidgetSize }`
- 운세 결과 타입 `FortuneResult`(총운 별점 1~5, 재물/애정/건강, 행운색, 행운방향, 오늘의 일진, 한 줄 조언, 선택적 타로) — 필드명은 ARCHITECTURE §5와 일관되게.

핵심 규칙: 날짜는 전부 `YYYY-MM-DD` 문자열로 통일한다(타임존 버그 방지).

## Acceptance Criteria
```bash
npm run build    # 타입 컴파일 에러 0
npm test
```

## 검증 절차
1. AC 실행.
2. 체크리스트: 필드명이 CLAUDE.md/ARCHITECTURE §4와 1:1 일치 / 런타임 코드 없음 / `Tier` 포함(CRITICAL #4 수익화-레디).
3. `phases/0-foundation/index.json` step1 업데이트(성공 시 summary에 `src/types/index.ts` export 목록 요약).

## 금지사항
- 런타임 함수·클래스를 넣지 마라. 이유: 이 파일은 타입 단일 출처.
- 날짜를 `Date` 객체로 모델링하지 마라. 이유: 직렬화/타임존 버그. `YYYY-MM-DD` 문자열 사용.
