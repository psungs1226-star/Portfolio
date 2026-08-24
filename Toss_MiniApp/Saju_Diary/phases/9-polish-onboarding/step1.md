# Step 1: branding-assets (로고 적용 + 최적화 + 앱 메타)

`Logos/`의 로고를 앱에 제대로 넣고 최적화한다. 콘솔 리스팅·앱 내 헤더·파비콘/타이틀을 Evry Times로 정돈한다.

## 읽어야 할 파일

- `CLAUDE.md` (CRITICAL — #5 스택, #7 예산)
- `index.html` (현재 title "AIT App")
- `granite.config.ts` (brand.icon "" — TODO)
- `public/` (현재 appsintoss-logo.png 존재)
- `src/screens/onboarding/OnboardingScreen.tsx` (헤더에 로고 노출 지점)
- `src/theme/tokens.ts` (BRAND.primary 등)
- `Logos/로고.png`(600×600, 255KB), `Logos/썸네일.png`(854KB — 스토어 썸네일용, 앱 내 미사용)

## 배경 (왜)

사용자: "Logos 로고들 있으니까 앱에도 잘 넣어야지. 그리고 앱에 대해서 최적화 된거야?"
→ 로고를 앱에 적용(헤더/파비콘/콘솔 아이콘) + 에셋 **최적화**(원본 255KB/854KB는 앱 번들·로딩에 과함).

## 작업

### 1) 로고 최적화 → `public/`

`sips`(macOS 기본, 설치 불필요)로 `Logos/로고.png`(600×600)를 앱용 크기로 리사이즈/생성해 `public/`에 둔다. 한글 파일명은 피하고 ASCII로:
- `public/logo-512.png` (512×512, 콘솔/공유 대비 고해상)
- `public/logo-192.png` (192×192, 앱 내 헤더/홈)
- `public/logo-32.png` (32×32, 파비콘) 또는 `public/favicon.png`
예: `sips -Z 512 Logos/로고.png --out public/logo-512.png` (`-Z`는 비율 유지 최대변 리사이즈). 각 결과 용량을 확인(수십 KB 수준이어야 — 원본 255KB보다 작게).
- `Logos/썸네일.png`는 앱 번들에 넣지 마라(스토어 리스팅용, 콘솔 업로드 대상). 단 최적화본이 필요하면 `public/`이 아닌 곳에 두거나 그대로 둔다.

### 2) `index.html` 메타 정돈

- `<html lang="ko">`
- `<title>Evry Times</title>`
- 파비콘: `<link rel="icon" href="/logo-32.png" />`(또는 favicon.png)
- 테마/뷰포트: `<meta name="theme-color" content="#534AB7" />`(BRAND.primary), 기존 viewport 유지.

### 3) `granite.config.ts` brand.icon

`brand.icon`에 리스팅 아이콘 경로를 넣는다(예: `"/logo-512.png"` — public 자산은 빌드 시 루트로 복사). 주석의 TODO 제거. displayName "Evry Times"·primaryColor 유지. (콘솔 업로드용 별도 아이콘이 필요하면 주석으로 안내.)

### 4) 앱 내 로고 노출(최소·자연스럽게)

온보딩 STEP1 상단(Top 위 또는 타이틀 옆)에 로고를 작게 노출해 브랜드를 보여준다. `<img src="/logo-192.png" width=.. height=.. alt="Evry Times" />`를 inline style로(새 라이브러리 0, RN `Image` 금지 — 웹 `<img>`). 과하지 않게(예: 48~64px, 중앙 또는 좌상단). 기존 레이아웃/CTA 깨지 않게.

## Acceptance Criteria

```bash
npm run build && npm test && npm run lint
```
추가: 생성된 `public/logo-*.png`가 존재하고 각 용량이 원본(255KB)보다 작은지 확인(`ls -la public/`).

## 검증 절차

1. AC 실행 + public 자산/용량 확인.
2. 체크리스트:
   - 최적화: 앱에 쓰는 로고가 적정 크기(≤ 수십 KB), 한글 파일명 미사용.
   - index.html 타이틀=Evry Times, 파비콘·테마컬러 적용.
   - granite.config brand.icon 채움.
   - CRITICAL #5: 웹 `<img>`만(RN Image 금지), 새 라이브러리 0.
3. `phases/9-polish-onboarding/index.json` step 1 갱신(summary에 생성 파일 명시).

## 금지사항

- 원본 `Logos/*.png`(특히 854KB 썸네일)를 앱 번들/`public/`에 그대로 복사하지 마라(최적화본만). 이유: 번들·로딩 최적화(#7 정신).
- 한글 파일명을 자산 경로로 쓰지 마라(빌드/URL 인코딩 이슈).
- 스토리지/온보딩 입력/미리보기 로직은 건드리지 마라(step 0/2/3). 새 의존성 금지(#5).
