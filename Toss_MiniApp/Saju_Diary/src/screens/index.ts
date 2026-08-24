/**
 * 화면 배럴 — 탭별 화면 + 탭 식별자.
 */
export { TodayScreen } from './today/TodayScreen';
export { DiaryScreen } from './diary/DiaryScreen';
export { DiaryTab } from './diary/DiaryTab';
export { ReviewScreen } from './review/ReviewScreen';
export { MyTab } from './my/MyTab';
export type { MyTabProps } from './my/MyTab';
export { FortuneScreen } from './fortune/FortuneScreen';
export type { FortuneScreenProps } from './fortune/FortuneScreen';
export { FortuneTab } from './fortune/FortuneTab';
export type { FortuneTabProps } from './fortune/FortuneTab';
export { TarotScreen } from './tarot/TarotScreen';
export type { TarotScreenProps } from './tarot/TarotScreen';
export { WeatherScreen } from './weather/WeatherScreen';
export type { WeatherScreenProps } from './weather/WeatherScreen';
export { OnboardingScreen } from './onboarding/OnboardingScreen';
export type { OnboardingScreenProps } from './onboarding/OnboardingScreen';

/** 하단 탭 식별자 — Peach Milk 4탭: 오늘 · 운세 · 기록 · MY. */
export type TabKey = 'today' | 'fortune' | 'diary' | 'my';
