# Step 3: theme-tokens

## 읽어야 할 파일
아래만 읽어라(컨텍스트 300K 이내).
- `/CLAUDE.md` (CRITICAL #5 스택·TDS 우선)
- `/docs/TECH_STACK.md` (UI 섹션 — 색·타이포 토큰)
- `/docs/PRD.md` (§11 비기능 — 접근성·safe-area)

## 작업
디자인 토큰과 공통 컴포넌트를 만든다. **웹 React + `@toss/tds-mobile` + `@toss/tds-colors`** 기반(React Native 아님).

1. `src/theme/tokens.ts`: `@toss/tds-colors`의 `colors`/`adaptive`를 매핑해 의미색 토큰 정의(포인트 보라 `#534AB7`, 틴트 `#EEEDFE`, 상태색 성공 초록·경고 노랑/주황·정보 파랑). 간격(카드 간 9~10), radius(12~20). 타이포는 TDS 토큰(t1~t7) 사용 권장.
2. `src/components/`에 TDS를 래핑한 공통 컴포넌트: `Card`(div+emotion/inline), `SectionTitle`. **별점은 새로 만들지 말고 TDS `Rating` 사용**(`src/components`에서 re-export 또는 직접 사용). 뱃지는 TDS `Badge` 사용.
3. 접근성: TDS 컴포넌트 기본 a11y 활용 + 필요한 `aria-label` 보강.

핵심 규칙: 색·간격 하드코딩 금지 — `tokens`/tds-colors 참조. RN 프리미티브(View/Text) 금지 — `<div>`+TDS.

## Acceptance Criteria
```bash
npm run build
npm test
```

## 검증 절차
1. AC 실행.
2. 체크리스트: 웹 React + TDS 사용(CRITICAL #5, RN 프리미티브 없음) / 별점=TDS `Rating` 재사용 / 토큰 외 색 하드코딩 없음 / 접근성 라벨 존재(PRD §11).
3. `phases/0-foundation/index.json` step3 업데이트(summary에 토큰·컴포넌트 목록).

## 금지사항
- 새 UI 프레임워크/아이콘 외 무거운 라이브러리를 추가하지 마라. 이유: CRITICAL #5 스택 고정.
- 컴포넌트에 비즈니스 로직(저장·계산)을 넣지 마라. 이유: 프리미티브는 표현만.
