# Step 0: project-setup

## 읽어야 할 파일
아래 목록만 읽어라(컨텍스트 예산: 이 step 입출력 300K 토큰 이내). 임의 대량 탐색 금지.
- `/CLAUDE.md`
- `/docs/TECH_STACK.md`
- `/docs/ARCHITECTURE.md` (§1 런타임, §3 프로젝트 구조)

## 작업
앱인토스 미니앱 프로젝트를 스캐폴드하고 빌드 가능한 상태로 만든다.

1. 앱인토스 스캐폴더를 비대화형으로 실행한다(결제/광고 예제 제외 — CRITICAL #4):
   ```bash
   npx create-ait-app evrytimes --inline --tds --skills --ai claude --pm npm
   ```
   - 별도 하위 폴더에 생성되면 산출물을 **프로젝트 루트로 병합**한다(기존 `docs/`, `phases/`, `scripts/`, `CLAUDE.md` 보존). 스캐폴드의 `docs/skills/`는 `docs/skills/`로 둔다(가드레일은 `docs/*.md` 최상위만 주입하므로 폭증 안 함).
   - 결과는 **웹 React**(`@apps-in-toss/web-framework` + React DOM + Vite). granite.config.ts의 appName=`evrytimes`, brand.displayName="Evry Times".
2. 의존성 설치 후 **`lunar-javascript`** 추가: `npm i lunar-javascript`. 타입 선언이 없으면 `src/types/lunar-javascript.d.ts`에 `declare module 'lunar-javascript';` 최소 선언을 추가한다.
3. 단위 테스트 러너로 **vitest**를 추가하고 `package.json`에 `"test": "vitest run"` 스크립트를 등록한다(이후 step들이 `npm test`에 의존).
4. `docs/ARCHITECTURE.md §3` 구조에 맞춰 **빈 디렉토리 골격**만 만든다(파일 구현은 이후 step): `src/screens/`, `src/widgets/`, `src/features/{storage,weather,fortune,share}/`, `src/components/`, `src/theme/`, `data/`. 각 폴더에 `.gitkeep` 또는 placeholder 1개.
5. `granite.config.ts`에 위치 권한과 외부 호출 도메인 허용 자리(기상청/에어코리아)를 **주석으로** 표시해 둔다(실제 도메인·키는 Phase 2에서 채움).

## Acceptance Criteria
```bash
npm install
npm run build    # 컴파일·번들 에러 0
npm test         # 테스트 0개라도 러너가 정상 종료
```

## 검증 절차
1. 위 AC 실행.
2. 체크리스트: `docs/ARCHITECTURE.md §3` 디렉토리 구조 생성됨 / 스택이 Granite+TS(=TECH_STACK)인가 / 결제·광고 예제 미포함(CLAUDE.md #4).
3. `phases/0-foundation/index.json` step0 업데이트:
   - 성공 → `completed` + summary(생성된 주요 파일·스크립트 명시)
   - **콘솔 앱 등록/실제 appId·키가 없어 scaffold나 build가 막히면** → `blocked` + `blocked_reason`("앱인토스 콘솔에서 todaymorning 앱 등록 및 자격증명 필요") 후 즉시 중단
   - 3회 수정에도 실패 → `error` + error_message

## 금지사항
- 결제/광고 예제 코드를 포함하지 마라. 이유: CLAUDE.md CRITICAL #4(AU 마찰·리워드성 규정).
- 기존 `docs/`, `phases/`, `scripts/`, `CLAUDE.md`를 덮어쓰지 마라. 이유: 기획·하네스 자산 손실.
- 위젯/화면 로직을 구현하지 마라. 이유: 이 step은 골격까지만. 기능은 이후 step.
