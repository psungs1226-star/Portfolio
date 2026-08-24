/**
 * Evry Times — 디자인 토큰 (theme-tokens) · "Peach Milk" 시스템
 *
 * 톤앤매너: docs/DESIGN.md "Peach Milk" — 크림 캔버스 위에 순백 라운드 카드가
 * 부드러운 "구름 그림자"로 둥실 뜨는 따뜻한 K-aesthetic. 모카브라운 강조 + 피치 틴트 +
 * 세이지 보조. 넉넉한 여백.
 *
 * 정본 팔레트는 `peach`(시맨틱) + `accent`(시인성 강조)다. 기존 화면이 참조하던
 * `warm/serene/cute/BRAND` export는 호환을 위해 남기되 **값을 peach로 재매핑**한다
 * (미마이그레이션 화면도 자동으로 새 톤 → 단계별 컴파일 그린).
 *
 * 런타임 0 의존(순수 객체) — 비즈니스 로직 없음.
 */
import { adaptive, colors } from '@toss/tds-colors';

/** TDS 타이포 토큰 타입(t1~t7 / st1~st13). */
export type TdsTypography =
  | 't1' | 't2' | 't3' | 't4' | 't5' | 't6' | 't7'
  | 'st1' | 'st2' | 'st3' | 'st4' | 'st5' | 'st6'
  | 'st7' | 'st8' | 'st9' | 'st10' | 'st11' | 'st12' | 'st13';

// ─────────────────────────────────────────────────────────────
// Peach Milk — 정본 시맨틱 팔레트 (단일 출처)
// ─────────────────────────────────────────────────────────────

/**
 * Peach Milk 시맨틱 색. 화면/컴포넌트는 이 토큰을 우선 참조한다.
 * (DESIGN.md 정합 — surface/primary/tertiary/outline 계열.)
 */
export const peach = {
  /** 앱 캔버스 — 순백(배경은 무조건 흰색). */
  surface: '#ffffff',
  /** 카드 위 인셋(세그먼트 트랙·입력 채움) — 카드보다 한 단계 진한 라벤더(칸 구분). */
  surfaceDim: '#EFEAF9',
  /** 라운드 카드 표면 — 아주 연한 라벤더(흰 배경 위에서 또렷이 보이게). 배경=흰, 카드=연라벤더. */
  card: '#FAF7FD',
  /** 강조/액션/활성 = 라벤더 보라(레퍼런스 정합). */
  primary: '#9A77D6',
  /** 진한 보라(강조 텍스트). */
  primaryDeep: '#5E4E8F',
  /** 라벤더 컨테이너(틴트 배경·선택 칩·뱃지). */
  primaryContainer: '#E7DEF6',
  /** 라벤더 컨테이너 위 텍스트. */
  onPrimaryContainer: '#5E4E8F',
  /** primary 위 텍스트(흰). */
  onPrimary: '#ffffff',
  /** 세이지(긍정·완료·성공·organic accent). */
  tertiary: '#3d6751',
  /** 세이지 컨테이너. */
  tertiaryContainer: '#bceace',
  /** 세이지 컨테이너 위 텍스트. */
  onTertiaryContainer: '#426b55',
  /** 본문 강조(제목) — 거의 검정 보라빛 잉크. */
  onSurface: '#2C2438',
  /** 본문 보조. */
  onSurfaceVar: '#6E6680',
  /** 캡션/약한 보조. */
  outline: '#9A92AC',
  /** 옅은 헤어라인 구분선/테두리. */
  outlineVariant: '#E7E0F2',
} as const;

/**
 * 강조색(accent) — CRITICAL #8(시인성). 별점·CTA·하트·점수는 반투명/파스텔로 깔지 않고
 * 채도·대비 큰 단색으로 또렷하게.
 */
export const accent = {
  /** 진보라 — 고강조 하이라이트(핫 CTA·선택). primary보다 진한 채도(고대비). */
  coral: '#8155CF',
  /** 별점 채움 = 라벤더 보라(흰 위 고대비, 레퍼런스 정합). */
  gold: '#9A77D6',
  /** 옅은 라벤더 트랙/빈 별. */
  goldDim: '#DCD2EF',
  /** 오키드 핑크 — 일기/하트(라벤더 계열 톤 정합). */
  rose: '#D16BC0',
  /** 세이지 — 긍정. */
  sage: '#3d6751',
} as const;

/** 부드러운 그림자(ambient) — 라벤더 카드가 흰 배경 위로 은은히 떠 보이게(레퍼런스 정합, 보라빛 그림자). */
const CLOUD = '0 8px 24px rgba(120, 95, 175, 0.12), 0 2px 6px rgba(120, 95, 175, 0.07)';
const CLOUD_SM = '0 3px 12px rgba(120, 95, 175, 0.10)';
const CLOUD_CARD = '0 4px 14px rgba(120, 95, 175, 0.09), 0 1px 4px rgba(120, 95, 175, 0.06)';

const SURFACE = peach.surface;

// ─────────────────────────────────────────────────────────────
// 의미색(palette) — 텍스트/상태는 그대로, 포인트만 Peach Milk로.
// ─────────────────────────────────────────────────────────────
export const palette = {
  /** 포인트 = 모카브라운. */
  point: peach.primary,
  pointTint: peach.primaryContainer,

  /** 화면 기본 배경(크림). */
  background: SURFACE,
  /** 카드/시트 표면(흰). */
  surface: peach.card,
  /** 한 단계 더 떠 있는 표면. */
  surfaceRaised: peach.card,

  /** 본문 강조(제목). */
  textPrimary: peach.onSurface,
  /** 본문 기본. */
  textSecondary: peach.onSurfaceVar,
  /** 보조/캡션. */
  textTertiary: peach.outline,
  /** 비활성 텍스트. */
  textDisabled: '#b6a89f',

  /** 구분선·테두리. */
  border: peach.outlineVariant,
  /** 옅은 채움(입력 배경 등). */
  fill: peach.surfaceDim,

  // 상태색(의미 단위) — adaptive 유지.
  success: adaptive.green500,
  warning: adaptive.yellow500,
  caution: adaptive.orange500,
  danger: adaptive.red500,
  info: adaptive.blue500,
} as const;

// ─────────────────────────────────────────────────────────────
// 하위호환 별칭 — 기존 화면이 참조하던 warm/serene/cute/BRAND.
// 값은 전부 Peach Milk로 재매핑(키만 유지).
// ─────────────────────────────────────────────────────────────

export const BRAND = {
  /** 포인트 = 모카브라운. */
  primary: peach.primary,
  /** 피치 틴트. */
  primaryTint: peach.primaryContainer,
} as const;

const TWILIGHT_CANVAS = SURFACE;
const HOME_CANVAS = SURFACE;

/** 파스텔 소프트(cute) — Peach Milk 재매핑(온보딩/선택 칩 등). */
export const cute = {
  /** 메인 포인트 = 모카브라운. */
  lavender: peach.primary,
  /** 피치 연한 배경(선택 칸). */
  lavenderBg: peach.primaryContainer,
  /** 보조 = 세이지. */
  peach: peach.tertiary,
  /** 세이지 연한 배경. */
  peachBg: peach.tertiaryContainer,
  /** 로즈 포인트. */
  pink: accent.rose,
  /** 로즈 연한 배경(라벤더-핑크 틴트). */
  pinkBg: '#F7E4F2',
  /** 크림 베이스. */
  cream: peach.surfaceDim,
  /** 부드러운 그림자. */
  softShadow: CLOUD_SM,
} as const;

/** warm — Peach Milk 재매핑(운세·메모·일기·홈 기존 화면). */
export const warm = {
  /** 베이스 배경 — 크림. */
  paper: SURFACE,
  /** 카드(흰). */
  cream: peach.card,
  /** 로즈 포인트(하트/일기). */
  rose: accent.rose,
  /** 로즈 연한 배경(라벤더-핑크 틴트). */
  roseBg: '#F7E4F2',
  /** 별점 포인트(라벤더 보라). */
  honey: accent.gold,
  /** 별점 연한 배경(라벤더 틴트). */
  honeyBg: '#EFEAF9',
  /** 강조 텍스트/버튼 = 라벤더 보라(액션·링크·활성). */
  terracotta: peach.primary,
  /** 세이지(긍정). */
  sage: peach.tertiary,
  /** 본문 강조 텍스트 — 거의 검정. */
  ink: peach.onSurface,
  /** 헤어라인 구분선/테두리. */
  line: peach.outlineVariant,
  /** 구름 그림자. */
  shadow: CLOUD_SM,

  /** 별점/메모 강조(라벤더 보라). */
  gold: accent.gold,
  /** 옅은 라벤더 배경(틴트). */
  goldBg: '#EFEAF9',
  /** 라벤더 테두리. */
  goldLine: '#E7E0F2',
  /** 순백 라운드 카드 표면. */
  card: peach.card,
  /** 카드 엣지 — 거의 안 보이는 라벤더 헤어라인. */
  cardLine: 'rgba(120, 95, 175, 0.12)',
  /** 부드럽게 퍼지는 구름 그림자. */
  shadowSoft: CLOUD,
  /** 앱 캔버스(홈) — 크림. */
  appBg: HOME_CANVAS,
  /** 프로스티드 헤더 배경(흰 위 반투명). */
  headerGlass: 'rgba(255, 255, 255, 0.86)',
  /** 주요 CTA = 모카브라운 + 흰 글씨. */
  cta: peach.primary,
} as const;

/** serene — Peach Milk 재매핑(운세 상세). */
export const serene = {
  /** primary = 모카브라운. */
  primary: peach.primary,
  /** 진한 모카(강조). */
  primaryDeep: peach.primaryDeep,
  /** 피치 컨테이너(칩 배경). */
  primaryContainer: peach.primaryContainer,
  /** 컨테이너 위 텍스트. */
  onPrimaryContainer: peach.onPrimaryContainer,
  /** 골드 액센트. */
  gold: accent.gold,
  /** 본문 강조 — 거의 검정. */
  ink: peach.onSurface,
  /** 본문 보조. */
  inkVariant: peach.onSurfaceVar,
  /** 카드 표면 — 순백. */
  glassBg: '#FFFFFF',
  /** 카드 내부 통일 표면 — 순백. */
  glassGrad: '#FFFFFF',
  /** 카드 엣지 — 라벤더 테두리(흰 위 또렷이). */
  glassBorder: '#D9CCF0',
  /** 구름 그림자. */
  glassShadow: CLOUD,
  /** 보조 칩 배경(세이지 틴트). */
  chipTertiaryBg: 'rgba(61, 103, 81, 0.12)',
  /** serif 패밀리 — 시스템 명조 폴백(운세 인용구). */
  serif: '"Apple SD Gothic Neo", "Nanum Myeongjo", serif',
  /** 배경 — 크림. */
  appBg: TWILIGHT_CANVAS,
  /** 조심 카드 — 옅은 오키드 틴트. */
  cautionBg: 'rgba(209, 107, 192, 0.10)',
} as const;

// ─────────────────────────────────────────────────────────────
// 간격 / 모서리 / 레이아웃 / 그림자 / 타이포
// ─────────────────────────────────────────────────────────────

/** 간격 토큰(px) — Peach Milk는 넉넉한 여백이 원칙. */
export const spacing = {
  xxs: 4,
  xs: 8,
  /** 카드 사이 기본 간격. */
  gapCard: 16,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  /** 섹션 사이 큰 간격(숨 쉬는 여백). */
  section: 32,
  xxl: 40,
} as const;

/** 모서리 둥글기 토큰(px) — bubbly 라운드. */
export const radius = {
  sm: 12,
  /** 카드 기본 radius. */
  card: 20,
  md: 16,
  lg: 28,
  /** 큰 라운드(히어로·벤토). */
  cute: 24,
  /** 알약/뱃지/칩. */
  pill: 999,
} as const;

/** 레이아웃 토큰. */
export const layout = {
  /** 모바일 콘텐츠 최대 폭. */
  maxContentWidth: 480,
  /** 화면 좌우 기본 패딩(margin-mobile). */
  screenPaddingX: spacing.lg,
} as const;

/** 그림자/엘리베이션 — 구름 그림자(인라인 boxShadow). */
export const elevation = {
  /** 기본 카드. */
  card: CLOUD_CARD,
  /** 떠 있는 카드(히어로·CTA). */
  cloud: CLOUD,
  /** 작은 카드/칩. */
  cloudSm: CLOUD_SM,
  // 레거시 키.
  _legacy: `0 1px 4px ${colors.greyOpacity100}`,
} as const;

/**
 * 타이포 — Peach Milk.
 * 헤딩은 친근한 둥근 무드(Jua), 본문/UI는 깔끔한 한글 산세리프(Pretendard, 자체 호스팅).
 * (App.css의 @font-face와 정합. 라틴 전용 폰트/CDN 금지 → 한글 커버하는 자체호스팅만.)
 */
export const typography = {
  /** 히어로·큰 헤딩 패밀리. */
  fontDisplay: "'Jua', 'Pretendard', sans-serif",
  /** 본문·UI 패밀리. */
  fontBody: "'Pretendard', 'Apple SD Gothic Neo', system-ui, -apple-system, sans-serif",
  /** 화면 큰 제목. */
  pageTitle: 't3' as TdsTypography,
  /** 섹션 제목. */
  sectionTitle: 't5' as TdsTypography,
  /** 본문. */
  body: 't6' as TdsTypography,
  /** 캡션/보조. */
  caption: 't7' as TdsTypography,
} as const;

/** 전체 토큰 묶음(편의용 단일 import). */
export const tokens = {
  peach,
  accent,
  brand: BRAND,
  palette,
  cute,
  warm,
  serene,
  spacing,
  radius,
  layout,
  elevation,
  typography,
} as const;

export type Tokens = typeof tokens;
