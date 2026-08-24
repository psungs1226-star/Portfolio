# Step 5: onboarding-preset

## 읽어야 할 파일
아래만 읽어라(컨텍스트 300K 이내).
- `/CLAUDE.md`
- `/docs/PRD.md` (§5 온보딩, §9 Activation — 빈 홈 금지·기본 프리셋)
- `/docs/ARCHITECTURE.md` (§4 데이터 모델)
- `src/types/index.ts`, `src/features/storage/index.ts`, `src/screens/`, `src/components/` (이전 step)

## 작업
첫 실행 온보딩 + 기본 프리셋을 구현한다. **AU의 Activation 단계 — 절대 빈 홈으로 시작시키지 마라.**

1. 온보딩 2단계: STEP1 위젯 선택(복수), STEP2 크기 선택(날씨·운세=고정, D-day·메모=선택). 운세 선택 시 생년월일(+선택 시간, 양/음력 토글, "시간 모름" 허용) 입력.
2. "나중에 언제든 바꿀 수 있어요" 안내로 이탈 완화.
3. **기본 프리셋**: 온보딩을 건너뛰거나 운세 생일을 미입력해도 날씨·D-day·메모가 즉시 동작하는 기본 `Settings`를 storage에 기록. 운세는 "생일 넣고 오늘 운세 보기" 단일 CTA로 유도.
4. 온보딩 완료 여부 플래그를 storage에 저장하고, 완료 시 today 홈으로 진입.
5. 개인정보 1줄 고지: 생일·일기는 기기에만 저장(외부 전송 0), 앱 삭제 시 소실(PRD §12).

핵심 규칙: 저장은 step2 storage 접근자만 사용(직접 Storage 호출 금지). 생일은 `YYYY-MM-DD` 문자열.

## Acceptance Criteria
```bash
npm run build
npm test
```
- 테스트: 온보딩 산출 → `loadSettings()`가 유효한 기본 프리셋을 반환(빈 홈이 되지 않음)하는지 검증.

## 검증 절차
1. AC 실행.
2. 체크리스트: 빈 홈 방지 프리셋 동작(PRD §9) / storage 접근자만 사용(CRITICAL #1) / 개인정보 고지 노출(PRD §12).
3. `phases/0-foundation/index.json` step5 업데이트(summary에 온보딩 플로우·프리셋 정책).

## 금지사항
- 운세 생일 입력을 필수 게이트로 만들지 마라. 이유: 온보딩 이탈 → AU 손실(PRD §9).
- Storage를 직접 호출하지 마라. 이유: 단일 영속 계층(CRITICAL #1).
