# Step 0: widget-editor

## 읽어야 할 파일
아래만 읽어라(컨텍스트 300K 이내).
- `/CLAUDE.md`
- `/docs/PRD.md` (§5 위젯 탭, §4 개인화)
- `src/types/index.ts`, `src/features/storage/index.ts`, `src/components/`, `src/screens/widgets/`, `src/widgets/`

## 작업
위젯 편집 탭을 구현한다(개인화 = 이탈 비용).

1. `src/screens/widgets/`: 위젯 on/off, 크기 변경(정책: 날씨·운세 고정 작게/보통, D-day·메모 작게/보통/크게), 순서 변경.
2. 변경은 storage `settings.widgets`에 저장 → today 홈이 이 설정대로 위젯을 렌더(enabled·order·size 반영).
3. today 홈 렌더 로직을 settings 기반으로 연결(아직 하드코딩이면 이 step에서 settings 구동으로 전환).

핵심 규칙: 홈은 settings.widgets의 enabled/order/size를 단일 소스로 렌더. 위젯별 크기 정책을 강제.

## Acceptance Criteria
```bash
npm run build
npm test    # settings 변경→홈 렌더 목록 반영 로직 테스트
```

## 검증 절차
1. AC 실행.
2. 체크리스트: on/off·크기·순서 저장·반영 / 크기 정책 강제 / storage 접근자.
3. `phases/5-build-submit/index.json` step0 업데이트(summary).

## 금지사항
- 날씨·운세에 크게(large)를 허용하지 마라. 이유: 정보량·압축 디폴트 정책(PRD §6).
- 홈 위젯을 하드코딩 목록으로 두지 마라. 이유: 개인화 = settings 구동(PRD §4).
