/**
 * SectionTitle — 홈/탭 섹션 머리글.
 *
 * TDS `Paragraph`를 래핑해 의미 단위(섹션 제목)로 노출한다.
 * 타이포는 TDS 토큰(t1~t7), 색은 theme/tokens 의미색을 사용한다(하드코딩 금지).
 * 우측 보조 영역(`right`)에는 TDS `TextButton`/`Badge` 등을 넣는다.
 * 표현만 — 비즈니스 로직 없음.
 */
import type { CSSProperties, ReactNode } from 'react';
import { Paragraph } from '@toss/tds-mobile';
import { palette, spacing, typography, type TdsTypography } from '../theme/tokens';

export interface SectionTitleProps {
  /** 제목 텍스트. */
  children: ReactNode;
  /** 타이포 토큰. 기본 typography.sectionTitle(t5). */
  size?: TdsTypography;
  /** 제목 색상. 기본 palette.textPrimary. */
  color?: string;
  /** 우측 보조 영역(더보기 버튼/뱃지 등). */
  right?: ReactNode;
  /** 시맨틱 헤딩 태그(접근성). 기본 'h2'. */
  as?: 'h1' | 'h2' | 'h3';
  /** 추가 인라인 스타일 병합. */
  style?: CSSProperties;
}

export function SectionTitle({
  children,
  size = typography.sectionTitle,
  color = palette.textPrimary,
  right,
  as = 'h2',
  style,
}: SectionTitleProps) {
  const rowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    ...style,
  };

  return (
    <div style={rowStyle}>
      <Paragraph as={as} typography={size} fontWeight="bold" color={color}>
        {children}
      </Paragraph>
      {right != null ? <div style={{ flexShrink: 0 }}>{right}</div> : null}
    </div>
  );
}
