# Step 0: storage-web-fallback (시작하기 안 됨 버그 수정 — 최우선)

브라우저(앱인토스 네이티브 브리지 없음)에서 **저장이 실패해 "시작하기"가 먹통**이다. Storage 어댑터를 견고하게 만들어 브리지가 없으면 자동으로 기기 로컬 폴백(localStorage→메모리)을 쓰게 한다. 저장은 여전히 **기기 안에만**(외부 전송 0, CRITICAL #1) 유지.

## 읽어야 할 파일

- `CLAUDE.md` (CRITICAL — **#1 로컬 저장 전용·외부 전송 금지**, #5 스택, #7 예산)
- `docs/ARCHITECTURE.md` §1·§2(런타임/Storage 매핑)
- `src/features/storage/index.ts` (전부 — `StorageAdapter`, `defaultAdapter = AitStorage`, `setStorageAdapter`, getJSON/setJSON)
- `src/features/storage/index.test.ts` (어댑터 주입 테스트 패턴)
- `src/screens/onboarding/OnboardingScreen.tsx` (finish()/skip() — 저장 실패 시 onDone 미호출로 먹통)

## 배경 (근본 원인)

`finish()`는 `await saveSettings(...)` → `setJSON` → `adapter.setItem`. 기본 어댑터는 `@apps-in-toss/web-framework`의 `Storage`다. **브라우저(토스 앱 밖)에선 네이티브 브리지가 없어 `setItem`이 throw/hang** → `finish()`의 catch가 돌아 `onDone()`이 호출되지 않음 → 화면 전환 안 됨(= "시작하기 눌러도 시작 안 됨"). `getJSON`은 이미 에러를 삼켜 기본값을 주므로 읽기는 되지만 **쓰기가 깨진다**.

## 작업

### 1) `src/features/storage/index.ts` — 견고한 기본 어댑터

`defaultAdapter`를 AitStorage 직결에서 **자동 폴백 어댑터**로 교체한다(주입 API `setStorageAdapter`는 그대로 — 테스트는 계속 메모리 mock 주입).

설계(권장 — split-brain·hang 방지):
- **1회 능력 프로브 + 캐시:** 첫 스토리지 op에서 AitStorage가 실제로 동작하는지 한 번만 확인하고 결정을 캐시한다.
  - 프로브: 센티넬 키에 `setItem`+`getItem`을 **타임아웃(예: 600ms) 레이스**로 시도. 성공(왕복 일치)하면 이후 **AitStorage 전용**, 실패/타임아웃/메서드 없음이면 폴백.
  - 폴백 우선순위: `localStorage`(있으면) → 인메모리 `Map`(SSR/비가용 환경 최후).
  - 결정 캐시로 매 op마다 재프로브하지 않는다(쓰기 분산 방지).
- 모든 경로는 `StorageAdapter` 시그니처(get/set/remove)를 만족. 예외를 밖으로 던지지 않게 방어(쓰기 실패가 UI를 멈추지 않게) — 단, getJSON/setJSON의 기존 계약은 유지.
- `localStorage` 폴백 키는 기존 네임스페이스(`evrytimes:*`) 그대로.

구현 형태(예시 — 시그니처 수준, 내부는 재량):
```ts
function makeFallbackAdapter(): StorageAdapter { /* 프로브+캐시+localStorage/memory 라우팅 */ }
const defaultAdapter: StorageAdapter = makeFallbackAdapter();
```

### 2) 온보딩 견고화(작게)

`OnboardingScreen.tsx`의 `finish()`/`skip()`: 폴백 어댑터로 저장이 성공하므로 정상 전환된다. 추가로 **저장이 실패해도 사용자가 갇히지 않게**, 실패 시에도 `onDone()`을 호출(빈 홈 방지 프리셋은 메모리에라도 반영)하도록 보강한다. (저장 성공이 정상 경로, 실패는 graceful 통과.) UI/문구 변경은 최소.

### 3) 테스트

- `storage/index.test.ts`:
  - AitStorage 프로브 실패(throw) 시 localStorage(mock)로 저장/조회되는지.
  - localStorage도 없을 때 메모리로 동작하는지.
  - 프로브 성공 시 AitStorage 전용 경로인지(쓰기가 localStorage로 새지 않음).
  - 기존 `setStorageAdapter` 주입 테스트가 그대로 통과(주입 시 폴백 미개입).
  - `jsdom` 환경에서 localStorage 사용(필요 시 해당 테스트 파일 상단 `// @vitest-environment jsdom`).

## Acceptance Criteria

```bash
npm run build && npm test && npm run lint
```

## 검증 절차

1. AC 실행.
2. 체크리스트:
   - **CRITICAL #1**: 폴백은 전부 기기 로컬(localStorage/메모리) — 네트워크/서버 전송 0. 코드 주석 + ARCHITECTURE §2에 "AIT 브리지 부재 시 기기 로컬 폴백" 1줄.
   - 브라우저 시나리오(AitStorage throw)에서 setItem이 throw하지 않고 저장됨 → 온보딩 "시작하기"가 전환됨(테스트로 간접 검증).
   - 새 의존성 0, RN 0(#5).
3. `phases/9-polish-onboarding/index.json` step 0 갱신(summary).

## 금지사항

- 외부 서버/네트워크로 데이터를 보내는 폴백 금지(절대 — CRITICAL #1). 폴백은 기기 로컬뿐.
- `setStorageAdapter` 주입 계약을 깨지 마라(테스트가 메모리 mock 주입). 주입이 있으면 폴백 로직이 개입하면 안 된다.
- 브랜딩/온보딩 입력/미리보기는 건드리지 마라(각 step 1/2/3). 새 의존성·대량 탐색 금지(#7).
