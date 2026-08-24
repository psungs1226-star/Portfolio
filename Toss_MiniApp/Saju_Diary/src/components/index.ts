/**
 * 공통 컴포넌트 배럴.
 *
 * 자체 래퍼(Card·SectionTitle)와, TDS에서 그대로 쓰는 컴포넌트(Rating·Badge)를
 * 한곳에서 재노출한다. 별점은 새로 만들지 않고 TDS `Rating`을 재사용한다(PRD 6.2).
 */
export { AppHeader, APP_HEADER_HEIGHT } from './AppHeader';
export type { AppHeaderProps } from './AppHeader';
export { Card } from './Card';
export type { CardProps } from './Card';
export { SectionTitle } from './SectionTitle';
export type { SectionTitleProps } from './SectionTitle';
export { BottomTabBar, TABS, TAB_BAR_HEIGHT } from './BottomTabBar';
export type { BottomTabBarProps, TabItem } from './BottomTabBar';
export { BirthInputs } from './BirthInputs';
export type { BirthInputsProps, BirthInputsValue } from './BirthInputs';

// 별점 = TDS Rating 재사용, 뱃지 = TDS Badge 재사용 (재구현 금지).
export { Rating, Badge } from '@toss/tds-mobile';
export type { RatingProps, BadgeProps } from '@toss/tds-mobile';
