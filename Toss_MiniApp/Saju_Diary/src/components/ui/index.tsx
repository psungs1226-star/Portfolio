/**
 * components/ui — "Peach Milk" 베이스 UI 프리미티브.
 *
 * 전부 토큰(theme/tokens) 참조 · 웹 React + inline style(emotion 불필요한 단순 표현). RN 프리미티브 금지.
 * 외부 UI 라이브러리 금지(CRITICAL #5) — 캐러셀/벤토/세그먼트 전부 자체 구현(CSS).
 * 헤딩은 className="display-font"(Jua)로 옵트인. 본문은 전역 Pretendard.
 */
import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { peach, accent, spacing, radius, elevation, layout } from '../../theme/tokens';

// ─────────────────────────────────────────────────────────────
// Screen — 화면 셸(크림 캔버스 + 좌우 패딩 + 탭바 하단 여백 + safe-area)
// ─────────────────────────────────────────────────────────────
export const TAB_BAR_SPACE = 104; // 탭바 높이(68) + 여유 — 홈 하단 콘텐츠가 탭바에 안 가리게

export function Screen({
  children,
  padX = true,
  padTop = spacing.sm,
  style,
}: {
  children: ReactNode;
  /** 좌우 기본 패딩 적용. 풀블리드가 필요하면 false. */
  padX?: boolean;
  padTop?: number | string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: peach.surface,
        paddingLeft: padX ? layout.screenPaddingX : 0,
        paddingRight: padX ? layout.screenPaddingX : 0,
        paddingTop: padTop,
        paddingBottom: `calc(${TAB_BAR_SPACE}px + env(safe-area-inset-bottom, 0px))`,
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// AppBar — 상단 바(뒤로/타이틀/우측 액션). 홈은 생략 권장.
// ─────────────────────────────────────────────────────────────
export function AppBar({
  title,
  onBack,
  right,
}: {
  title?: ReactNode;
  onBack?: () => void;
  right?: ReactNode;
}) {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.sm,
        height: 52,
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingLeft: layout.screenPaddingX,
        paddingRight: layout.screenPaddingX,
        background: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <div style={{ width: 40 }}>
        {onBack != null ? (
          <button
            type="button"
            aria-label="뒤로"
            onClick={onBack}
            style={{ ...iconBtn, marginLeft: -8 }}
          >
            <BackIcon />
          </button>
        ) : null}
      </div>
      <h1
        style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#1A1325', letterSpacing: -0.5 }}
      >
        {title}
      </h1>
      <div style={{ width: 40, display: 'flex', justifyContent: 'flex-end' }}>{right}</div>
    </header>
  );
}

const iconBtn: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 40,
  height: 40,
  border: 'none',
  background: 'transparent',
  color: peach.onSurfaceVar,
  cursor: 'pointer',
  padding: 0,
  borderRadius: radius.pill,
};

function BackIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// Card — 화이트 라운드 카드 + 구름 그림자
// ─────────────────────────────────────────────────────────────
export function Card({
  children,
  padding = spacing.lg,
  onClick,
  tint,
  style,
  ...rest
}: {
  children?: ReactNode;
  padding?: number;
  onClick?: () => void;
  /** 배경 틴트(피치/세이지 벤토 타일). 미지정 시 흰 카드. */
  tint?: 'peach' | 'sage' | 'cream' | 'rose';
  style?: CSSProperties;
} & Omit<HTMLAttributes<HTMLDivElement>, 'onClick' | 'style'>) {
  const bg =
    tint === 'peach'
      ? peach.primaryContainer
      : tint === 'sage'
        ? peach.tertiaryContainer
        : tint === 'cream'
          ? peach.surfaceDim
          : tint === 'rose'
            ? '#fbe1e7'
            : peach.card;
  const clickable = onClick != null;
  return (
    <div
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onClick}
      style={{
        background: bg,
        borderRadius: radius.card,
        boxShadow: tint == null ? elevation.card : 'none',
        padding,
        boxSizing: 'border-box',
        cursor: clickable ? 'pointer' : undefined,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Section + SectionHeader
// ─────────────────────────────────────────────────────────────
export function Section({ children, gap = spacing.md, style }: { children: ReactNode; gap?: number; style?: CSSProperties }) {
  return <section style={{ display: 'flex', flexDirection: 'column', gap, ...style }}>{children}</section>;
}

export function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: ReactNode;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.sm }}>
      <h2 className="display-font" style={{ margin: 0, fontSize: 20, fontWeight: 400, color: peach.onSurface, letterSpacing: -0.2 }}>
        {title}
      </h2>
      {action != null ? (
        <button
          type="button"
          onClick={onAction}
          style={{ border: 'none', background: 'transparent', color: peach.primary, fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: 0 }}
        >
          {action}
        </button>
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Chip / PillButton
// ─────────────────────────────────────────────────────────────
export function Chip({ children, tone = 'peach', style }: { children: ReactNode; tone?: 'peach' | 'sage' | 'neutral'; style?: CSSProperties }) {
  const map = {
    peach: { bg: peach.primaryContainer, fg: peach.onPrimaryContainer },
    sage: { bg: peach.tertiaryContainer, fg: peach.onTertiaryContainer },
    neutral: { bg: peach.surfaceDim, fg: peach.onSurfaceVar },
  }[tone];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        background: map.bg,
        color: map.fg,
        fontSize: 12,
        fontWeight: 600,
        padding: '5px 11px',
        borderRadius: radius.pill,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </span>
  );
}

export function PillButton({
  children,
  onClick,
  variant = 'primary',
  full,
  style,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'tonal' | 'coral' | 'ghost';
  full?: boolean;
  style?: CSSProperties;
}) {
  const map = {
    primary: { bg: peach.primary, fg: '#fff', shadow: elevation.cloudSm },
    coral: { bg: accent.coral, fg: '#fff', shadow: '0 6px 16px rgba(129, 85, 207, 0.28)' },
    tonal: { bg: peach.primaryContainer, fg: peach.onPrimaryContainer, shadow: 'none' },
    ghost: { bg: 'transparent', fg: peach.primary, shadow: 'none' },
  }[variant];
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        width: full ? '100%' : undefined,
        border: 'none',
        borderRadius: radius.pill,
        background: map.bg,
        color: map.fg,
        boxShadow: map.shadow,
        fontSize: 15,
        fontWeight: 700,
        padding: '13px 22px',
        cursor: 'pointer',
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Carousel — 가로 스크롤(scroll-snap), 라이브러리 미사용
// ─────────────────────────────────────────────────────────────
export function Carousel({ children, gap = spacing.md, bleed = true }: { children: ReactNode; gap?: number; bleed?: boolean }) {
  return (
    <div
      className="hide-scrollbar"
      style={{
        display: 'flex',
        gap,
        overflowX: 'auto',
        scrollSnapType: 'x mandatory',
        WebkitOverflowScrolling: 'touch',
        marginLeft: bleed ? -layout.screenPaddingX : 0,
        marginRight: bleed ? -layout.screenPaddingX : 0,
        paddingLeft: bleed ? layout.screenPaddingX : 0,
        paddingRight: bleed ? layout.screenPaddingX : 0,
        paddingBottom: 2,
      }}
    >
      {children}
    </div>
  );
}

/** Carousel 안의 한 칸(스냅 정렬 + 고정 폭). */
export function CarouselItem({ children, width = 280, style }: { children: ReactNode; width?: number | string; style?: CSSProperties }) {
  return (
    <div style={{ flex: '0 0 auto', width, scrollSnapAlign: 'start', ...style }}>{children}</div>
  );
}

// ─────────────────────────────────────────────────────────────
// BentoGrid — 2열 CSS grid(비대칭, wide 타일 span 2)
// ─────────────────────────────────────────────────────────────
export function BentoGrid({ children, gap = spacing.md, style }: { children: ReactNode; gap?: number; style?: CSSProperties }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap, ...style }}>{children}</div>
  );
}

/** 벤토 타일 — wide면 2칸 차지. */
export function BentoTile({
  children,
  wide,
  tint,
  onClick,
  style,
}: {
  children: ReactNode;
  wide?: boolean;
  tint?: 'peach' | 'sage' | 'cream' | 'rose';
  onClick?: () => void;
  style?: CSSProperties;
}) {
  return (
    <Card tint={tint} onClick={onClick} style={{ gridColumn: wide ? '1 / -1' : undefined, minHeight: 104, ...style }}>
      {children}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// StatTile — 큰 숫자 + 라벨
// ─────────────────────────────────────────────────────────────
export function StatTile({ value, label, onClick }: { value: ReactNode; label: string; onClick?: () => void }) {
  return (
    <Card onClick={onClick} padding={spacing.md} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, textAlign: 'center' }}>
      <span className="display-font" style={{ fontSize: 24, fontWeight: 400, color: peach.primary, lineHeight: 1.1 }}>{value}</span>
      <span style={{ fontSize: 13, color: peach.onSurfaceVar }}>{label}</span>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// SegTabs — 세그먼트 컨트롤(자체 구현, pill)
// ─────────────────────────────────────────────────────────────
export function SegTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: readonly { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
}) {
  return (
    <div
      role="tablist"
      style={{
        display: 'flex',
        gap: 4,
        padding: 4,
        background: '#A98FDA', // 연한 보라(채도·명도 낮춘 라벤더 — 그라데이션 없이 단색)
        borderRadius: radius.pill,
      }}
    >
      {tabs.map((t) => {
        const on = t.key === value;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(t.key)}
            style={{
              flex: 1,
              border: 'none',
              borderRadius: radius.pill,
              background: on ? '#ffffff' : 'transparent',
              color: on ? '#7E62B8' : 'rgba(255, 255, 255, 0.98)',
              boxShadow: on ? elevation.cloudSm : 'none',
              fontSize: 15,
              fontWeight: 800,
              letterSpacing: -0.2,
              padding: '7px 0',
              cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
