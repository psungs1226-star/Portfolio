/**
 * Card — 위젯/섹션을 감싸는 공통 표면 컨테이너.
 *
 * 웹 React: `<div>` + inline style(토큰 참조). RN 프리미티브 금지.
 * 색·간격·radius는 전부 `theme/tokens`에서 가져온다(하드코딩 금지).
 * 비즈니스 로직 없음 — 표현만.
 */
import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { radius, spacing, warm } from '../theme/tokens';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** 카드 내부 콘텐츠. */
  children?: ReactNode;
  /** 내부 패딩(px). 기본 spacing.lg(16). */
  padding?: number;
  /** 그림자(엘리베이션) 표시 여부. 기본 true. */
  raised?: boolean;
  /** 추가 인라인 스타일 병합. */
  style?: CSSProperties;
}

export function Card({ children, padding = spacing.lg, raised = true, style, ...rest }: CardProps) {
  // 레퍼런스 목업: 밝은 라벤더 캔버스 위에 **순백 라운드 카드**가 그림자로만 둥실 떠 있는 느낌.
  // 크게 둥근 모서리(24) + 거의 안 보이는 헤어라인 + 부드럽게 퍼지는 라벤더 그림자. (불투명이라 블러 불필요.)
  const baseStyle: CSSProperties = {
    backgroundColor: warm.card,
    borderRadius: radius.cute,
    border: `1px solid ${warm.cardLine}`,
    padding,
    boxShadow: raised ? warm.shadowSoft : undefined,
    boxSizing: 'border-box',
  };

  return (
    <div style={{ ...baseStyle, ...style }} {...rest}>
      {children}
    </div>
  );
}
