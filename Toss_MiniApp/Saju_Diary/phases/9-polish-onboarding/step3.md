# Step 3: settings-saju-editor (설정에서 생일 추가/수정 + 크기 미리보기 재사용)

온보딩을 건너뛰거나 나중에 운세를 켜려는 사용자가 **설정(위젯 편집 탭)에서 생일을 넣고 운세를 볼 수 있게** 한다(현재 `onRequestBirth`는 TODO no-op = 막다른 길). 크기 미리보기도 설정 화면에 재사용.

## 읽어야 할 파일

- `CLAUDE.md` (CRITICAL — #1 로컬, #5 스택, #7 예산)
- `src/screens/widgets/WidgetsScreen.tsx` (수정 — 설정 탭. 크기 SegmentedControl·saju 편집 부재)
- `src/screens/today/TodayScreen.tsx` (수정 — `onRequestBirth` TODO no-op(line ~188), saju 상태 로드)
- `src/components/` (step 2의 `BirthInputs`·`SizePreview` 재사용 — index 확인)
- `src/features/storage/index.ts` (loadSettings/saveSettings)
- `src/features/onboarding/preset.ts` (isValidBirthDate, settings 매핑 참고)
- `src/types/index.ts` (Settings, SajuInput)
- `src/widgets/FortuneWidget.tsx` (onRequestBirth prop — CTA가 설정으로 가게)

## 배경 (사용자 #5 "설정에서부터")

생일 입력 경로가 온보딩 1회뿐 → 건너뛰면 운세를 **켤 방법이 없다**(FortuneWidget의 "생일 넣고 운세 보기" 버튼은 no-op). 설정 탭에 생일 편집기를 두고, 홈 CTA가 그리로 연결되게 한다.

## 작업

### A) `WidgetsScreen.tsx` — 사주(생일) 편집 카드 추가

- settings.saju를 로드해 표시. **`BirthInputs`(step 2)** 로 생일/시간/음력 편집 + "저장" → `saveSettings({ ...settings, saju })`(storage 접근자만, 로컬 전용).
  - 생일 유효(isValidBirthDate)할 때만 saju 저장. 비우면 saju 제거(운세 off)도 허용.
  - 저장 성공 피드백(간단). 기존 위젯 편집/순서/토글/개인정보 고지 보존.
- 크기 SegmentedControl 아래(또는 옆)에 **`SizePreview`(step 2)** 로 현재 size 미리보기 추가(D-day·메모 등 크기 조절 위젯)(#2). 기존 정책(날씨·운세 large 금지) 유지.

### B) `TodayScreen.tsx` — CTA 연결

- `FortuneWidget`의 `onRequestBirth` no-op을 실제 동작으로: **설정(위젯 편집) 탭으로 이동**하거나, 간단하면 인라인 생일 입력 바텀시트/카드로 연결. 가장 단순·확실한 방법 = 탭 전환(App의 탭 상태로 'widgets' 이동). TodayScreen이 탭 전환 콜백을 받도록 props 추가가 필요하면 App.tsx에서 `onNavigate('widgets')`를 내려준다(최소 변경). 
  - 만약 App 라우팅 변경이 과하면, FortuneWidget CTA가 설정으로 안내하는 텍스트+동작(탭 이동)만이라도 연결. 막다른 길(no-op)만은 반드시 제거.

### C) 테스트/스모크

- WidgetsScreen 스모크: saju 편집 카드(BirthInputs)·SizePreview 렌더 크래시 0, 생일 저장 경로(storage mock) 동작.
- TodayScreen 스모크: onRequestBirth가 no-op이 아니라 콜백 호출(또는 탭 이동) 검증(간단).
- 기존 테스트 유지.

## Acceptance Criteria

```bash
npm run build && npm test && npm run lint
```

## 검증 절차

1. AC 실행.
2. 체크리스트:
   - 설정에서 생일 입력→저장→운세 동작 경로 존재(막다른 길 제거). 홈 CTA가 설정으로 연결.
   - #2 크기 미리보기 설정 화면에도 노출.
   - CRITICAL #1: 저장은 storage 접근자만·로컬 전용. #5: TDS/웹 `<input>`만·새 라이브러리 0·RN 0.
3. `phases/9-polish-onboarding/index.json` step 3 갱신 + 모든 step 일관 확인.

## 금지사항

- `onRequestBirth`를 no-op으로 남기지 마라(이 step의 핵심). 
- 라우팅 라이브러리 도입 금지(App의 탭 상태 재사용, #5). step 2가 만든 컴포넌트를 중복 재구현하지 마라(재사용).
- 스토리지 내부·브랜딩·온보딩 입력 컴포넌트 구현은 건드리지 마라(step 0/1/2 영역 — 여기선 재사용·배선만). 새 의존성·대량 탐색 금지(#7).
