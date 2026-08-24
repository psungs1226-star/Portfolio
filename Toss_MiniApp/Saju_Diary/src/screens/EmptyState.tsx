/**
 * EmptyState — placeholder 화면 공통 빈 상태 문구.
 *
 * 각 탭 화면이 아직 기능 전(셸 단계)임을 알리는 안내만 표시한다.
 * 표현만 — 비즈니스 로직 없음. 색·간격은 theme/tokens 참조.
 */
import type { CSSProperties, ReactNode } from 'react';
import { palette, spacing } from '../theme/tokens';

export interface EmptyStateProps {
  /** 안내 문구. */
  children: ReactNode;
}

export function EmptyState({ children }: EmptyStateProps) {
  const style: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
    padding: spacing.xl,
    color: palette.textTertiary,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 1.5,
  };
  return <div style={style}>{children}</div>;
}
