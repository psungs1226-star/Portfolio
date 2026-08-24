# Step 2: storage-layer

## 읽어야 할 파일
아래만 읽어라(컨텍스트 300K 이내).
- `/CLAUDE.md` (CRITICAL #1 로컬 저장 전용)
- `/docs/ARCHITECTURE.md` (§2 SDK 매핑, §4 데이터 모델)
- `src/types/index.ts` (이전 step 산출물)

## 작업
앱인토스 `Storage`를 감싼 단일 영속 계층을 만든다. **모든 저장/조회는 이 모듈을 통해서만** 일어난다.

`src/features/storage/index.ts`:
- 저수준 래퍼: 앱인토스 Bedrock `Storage`(setItem/getItem/removeItem) 위에 `getJSON<T>(key, fallback): Promise<T>` / `setJSON<T>(key, value): Promise<void>` / `remove(key)`.
- 도메인 접근자(타입 안전): `loadSettings()/saveSettings(s: Settings)`, `loadDiaries()/saveDiaries(...)`, `loadMemos()/...`, `loadDdays()/...`. 키 네임스페이스는 상수로(`'todaymorning:settings'` 등).
- **스키마 버전 + 마이그레이션**: 저장 데이터에 `schemaVersion` 포함, 로드 시 버전 불일치면 마이그레이션 훅을 거치는 구조(현재 v1, 훅은 항등이라도 자리 마련).
- 기본값(빈 상태) 제공: settings 없을 때 안전한 기본 Settings 반환.

핵심 규칙(CRITICAL #1): 외부 서버/네트워크 호출을 여기서 하지 마라. 오직 로컬 Storage.

## Acceptance Criteria
```bash
npm run build
npm test    # storage round-trip 단위 테스트 통과
```
- 테스트: Bedrock Storage를 메모리 mock으로 주입해 set→get 라운드트립, 기본값, 버전 마이그레이션 경로를 검증(`src/features/storage/index.test.ts`).

## 검증 절차
1. AC 실행.
2. 체크리스트: 네트워크 호출 없음(CRITICAL #1) / 모든 도메인 엔티티 접근자 존재 / 타입은 step1 재사용(중복 정의 금지).
3. `phases/0-foundation/index.json` step2 업데이트(summary에 export된 접근자 목록).

## 금지사항
- 컴포넌트에서 Storage를 직접 부르게 두지 마라. 이유: 단일 영속 계층 원칙(테스트·마이그레이션 일원화).
- 타입을 재정의하지 마라. 이유: `src/types`가 단일 출처.
