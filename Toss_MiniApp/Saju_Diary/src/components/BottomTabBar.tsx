/**
 * BottomTabBar — 하단 탭 네비게이션 (오늘 · 운세 · 기록 · MY). "Peach Milk".
 *
 * @toss/tds-mobile에 하단 탭바(Tabbar)가 없어 웹 React로 직접 구성한다(CRITICAL #5).
 * 아이콘은 **인라인 SVG**(외부 CDN 0). 활성=모카브라운 + 피치 알약 배경, 비활성=아웃라인 그레이.
 * safe-area: `env(safe-area-inset-bottom)` 패딩. 탭 전환은 상위(App) 상태로 제어(라우터 미사용).
 */
import type { CSSProperties } from 'react';
import type { TabKey } from '../screens';
import { peach, radius } from '../theme/tokens';

export interface TabItem {
  key: TabKey;
  label: string;
}

export const TABS: readonly TabItem[] = [
  { key: 'today', label: '오늘' },
  { key: 'fortune', label: '운세' },
  { key: 'diary', label: '기록' },
  { key: 'my', label: 'MY' },
] as const;

/**
 * 탭 아이콘 — Codex image_gen으로 생성한 라벤더 라인 아이콘(`/public/tabicons/{key}.png`)을
 * CSS mask로 칠한다. backgroundColor='currentColor'라서 활성=보라/비활성=그레이가 부모 색으로 결정.
 * (PNG 자체는 알파 마스크 — 흰 배경 투명, 라인만 불투명.)
 */
function TabIcon({ tab }: { tab: TabKey }) {
  const src = `/tabicons/${tab}.png`;
  return (
    <span
      aria-hidden
      style={{
        display: 'block',
        width: 27,
        height: 27,
        backgroundColor: 'currentColor',
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
      }}
    />
  );
}

export interface BottomTabBarProps {
  active: TabKey;
  onChange: (key: TabKey) => void;
}

/** 하단 탭바 높이(px, safe-area 제외). */
export const TAB_BAR_HEIGHT = 68;

export function BottomTabBar({ active, onChange }: BottomTabBarProps) {
  // 시인성 우선(CLAUDE.md #8): 활성=진보라, 비활성도 또렷한 슬레이트(흐린 회색 금지).
  const ACTIVE = '#7C4DD6';
  const INACTIVE = '#736C82';
  const PILL = '#E2D5F7';
  const barStyle: CSSProperties = {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    margin: '0 auto',
    maxWidth: 480,
    display: 'flex',
    height: TAB_BAR_HEIGHT,
    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    backgroundColor: 'rgba(243, 239, 251, 0.96)', // 연한 라벤더 톤(탭바 배경)
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderTop: `1px solid ${peach.outlineVariant}`,
    boxSizing: 'content-box',
    zIndex: 100,
  };

  return (
    <nav style={barStyle} aria-label="하단 탭">
      {TABS.map((tab) => {
        const selected = tab.key === active;
        const itemStyle: CSSProperties = {
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          padding: 0,
          color: selected ? ACTIVE : INACTIVE,
          fontSize: 12,
          fontWeight: selected ? 800 : 700,
          letterSpacing: -0.2,
        };
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-label={tab.label}
            onClick={() => onChange(tab.key)}
            style={itemStyle}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 54,
                height: 34,
                borderRadius: radius.pill,
                background: selected ? PILL : 'transparent',
                transition: 'background 0.15s',
              }}
            >
              <TabIcon tab={tab.key} />
            </span>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
