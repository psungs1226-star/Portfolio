# Step 1: polish-build

## 읽어야 할 파일
아래만 읽어라(컨텍스트 300K 이내).
- `/CLAUDE.md` (CRITICAL 전체)
- `/docs/PRD.md` (§10 컴플라이언스·출시 게이트, §11 비기능)
- `/docs/ARCHITECTURE.md` (§1 빌드/배포)
- `granite.config.ts`, `src/screens/`, `src/widgets/`

## 작업
출시 빌드 직전 폴리시 + `.ait` 빌드를 검증한다.

1. 비기능 점검(PRD §11): safe-area 전 화면 적용, 접근성 라벨/명도대비/터치영역, 날씨 오프라인 폴백 표시, 콜드스타트 시 캐시 우선.
2. 컴플라이언스(PRD §10, CRITICAL): 결제·광고 코드 비활성 확인, 위치 권한 사유 고지, 외부 호출 도메인 허용만(공공 API), 개인정보 로컬 고지 노출.
3. `granite.config.ts` 최종화(앱 메타·권한·도메인). `.ait` 빌드 산출 확인.

핵심 규칙: 이 step은 새 기능 추가가 아니라 **출시 준비 검증·정리**. 누락된 비기능/컴플라이언스만 보완.

## Acceptance Criteria
```bash
npm run build    # .ait 산출, 에러 0
npm test         # 전체 테스트 통과
```

## 검증 절차
1. AC 실행.
2. 체크리스트(PRD §10·§11): safe-area/접근성/오프라인 폴백 / 결제·광고 비활성(CRITICAL #4) / 로컬 전용·권한 고지.
3. `phases/5-build-submit/index.json` step1 업데이트:
   - 통과 → completed + summary
   - **콘솔 업로드/제출은 사용자 수동** → 빌드까지 완료 후, 콘솔 제출이 필요하면 blocked + reason("`.ait` 콘솔 업로드 및 챌린지 신청폼 제출 — 사용자 수행")

## 금지사항
- 마감 직전 새 기능을 추가하지 마라. 이유: 안정성 우선(이 step은 폴리시·검증).
- 결제·광고를 켜지 마라. 이유: CRITICAL #4(AU 마찰·리워드성 규정).
