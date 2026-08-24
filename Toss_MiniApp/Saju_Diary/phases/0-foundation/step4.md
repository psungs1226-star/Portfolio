# Step 4: nav-shell

## 읽어야 할 파일
아래만 읽어라(컨텍스트 300K 이내).
- `/CLAUDE.md`
- `/docs/PRD.md` (§5 정보구조 — 하단 탭 4개, 홈 레이아웃)
- `/docs/ARCHITECTURE.md` (§1 런타임, §3 구조)
- `src/theme/tokens.ts`, `src/components/` (이전 step)

## 작업
앱 셸(하단 탭 네비게이션 + 빈 화면)을 만든다. 위젯/기능 로직은 placeholder. **웹 React + TDS**(RN 아님).

1. 하단 탭 4개: **오늘(홈) · 일기 · 돌아보기 · 위젯(편집)** — **TDS `Tabbar`** 사용, 탭 전환은 React 상태/라우팅으로(`@apps-in-toss/web-framework` 라우팅 규약 확인, 단순하면 상태 기반 화면 전환도 가능).
2. `src/screens/`에 화면 placeholder: `today/`, `diary/`, `review/`, `widgets/` — 각 화면은 `Top` 제목 + 빈 상태 문구만.
3. `today` 홈은 위→아래 **확인(날씨·운세·D-day) → 기록(메모·일기)** 순서 섹션 레이아웃 골격만(위젯은 다음 phase에서 끼움).
4. safe-area 적용(PRD §11). 아이콘은 TDS 아이콘 시스템(예: `IconButton`/`Asset.Icon`의 icon name) 사용.

핵심 규칙: 탭은 TDS `Tabbar`. 임의 라우터/UI 라이브러리 추가 금지(CRITICAL #5). RN 프리미티브 금지.

## Acceptance Criteria
```bash
npm run build
npm test
```
- 빌드 후 4개 탭이 정의되고 각 화면이 렌더 가능한 구조여야 한다(타입/컴파일 레벨 확인).

## 검증 절차
1. AC 실행.
2. 체크리스트: 탭 4개 명칭·순서가 PRD §5와 일치 / safe-area 적용 / 토큰·컴포넌트 재사용.
3. `phases/0-foundation/index.json` step4 업데이트(summary에 라우트·화면 파일 경로).

## 금지사항
- 위젯 실제 기능(날씨/운세 계산·저장)을 구현하지 마라. 이유: 이 step은 셸까지만.
- 새 네비게이션/UI 라이브러리를 설치하지 마라. 이유: TDS `Tabbar` + 프레임워크 기본 사용(CRITICAL #5).
