# Step 0: lunar-integration

## 읽어야 할 파일
아래만 읽어라(컨텍스트 300K 이내).
- `/CLAUDE.md` (CRITICAL #3 사주 주류 정합)
- `/docs/ARCHITECTURE.md` (§5 사주 엔진 — 의존성·파이프라인·표준 정합)
- `src/types/index.ts`

## 작업
`lunar-javascript`를 감싸 **만세력 계산만** 담당하는 어댑터를 만든다(해석/문구는 다음 step). 직접 절기·간지 계산 재구현 금지(CRITICAL #3).

`src/features/fortune/manse.ts`:
- `computeNatal(input: SajuInput): NatalChart` — 생년월일(+선택 시간, 양/음력)에서 `Solar.fromYmdHms(...).getLunar().getEightChar()`로 년·월·일·시주 간지, **일간(day stem)**, 일간 오행, (가능하면) 십신을 산출. 시간 미입력 시 시주 생략.
- `computeDayGanZhi(date: string): DayGanZhi` — 오늘(또는 주어진 날짜)의 일진 간지, 천간/지지 오행, 그날 재신/희신 방위.
- 반환 타입 `NatalChart`/`DayGanZhi`는 `src/types`에 추가(또는 fortune 로컬 타입으로 export).

표준 정합(CRITICAL #3, ARCHITECTURE §5 "표준 정합"):
- 야자시(23~24시) 처리는 라이브러리 유파(sect) 옵션을 **명시적으로 설정**하고, 그 선택을 코드 주석에 근거와 함께 남긴다(기본=주류 디폴트).
- 경도보정(진태양시) 기본 OFF. 역사적 서머타임 기간 입력 보정은 TODO 주석으로 표시(실제 적용은 calibration step에서 검증과 함께).
- 정확한 메서드 시그니처는 lunar-javascript 실제 API에 맞춘다(설치된 패키지의 export를 확인).

## Acceptance Criteria
```bash
npm run build
npm test    # manse 어댑터 기본 동작 테스트
```
- 테스트: 알려진 양력 날짜 1~2개의 일진 간지가 기대값과 일치(예시값은 패키지 출력으로 확정).

## 검증 절차
1. AC 실행.
2. 체크리스트: 직접 달력 계산 재구현 없음(CRITICAL #3) / sect·경도보정 결정이 주석에 명시 / 타입은 src/types 사용.
3. `phases/1-fortune/index.json` step0 업데이트(summary에 export 함수·반환 타입·sect 설정값).

## 금지사항
- 60갑자/절기/음양력 변환을 손으로 구현하지 마라. 이유: 정확도·주류 정합은 라이브러리 위임이 원칙(CRITICAL #3).
- 운세 점수·문구를 여기서 만들지 마라. 이유: 이 step은 만세력 산출까지만.
