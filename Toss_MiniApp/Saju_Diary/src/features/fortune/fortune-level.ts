/**
 * fortune-level — 운세 시각 토큰(공용, Peach Milk 톤).
 *
 * 색 계열 통일(난잡함 제거): 신호등색·핫핑크·라벤더·초록을 쓰지 않고 **따뜻한 한 가족**
 * (골드 → 탠 → 테라코타) 안에서 명도/채도로만 좋음→무난→조심을 구분한다.
 * 칸은 옅은 배경(bg)+또렷한 테두리(line)로 배경과 분리하고, 강조(하트/별점/링)는 진한 단색으로.
 *
 * 위젯(FortuneWidget)과 상세화면(FortuneScreen)이 같은 색을 쓰도록 한 곳에 모은다.
 * 런타임 0 의존(순수 상수).
 */
import type { FortuneStance } from '../../types';

/** 시간대 stance 시각색 — favor=골드 / neutral=탠 / avoid=테라코타. 따뜻한 한 가족. */
export const STANCE_VIS: Record<FortuneStance, { dot: string; bg: string; line: string }> = {
  favor: { dot: '#d99a2e', bg: 'rgba(217, 154, 46, 0.14)', line: 'rgba(217, 154, 46, 0.40)' },
  neutral: { dot: '#a98c6f', bg: 'rgba(169, 140, 111, 0.14)', line: 'rgba(169, 140, 111, 0.38)' },
  avoid: { dot: '#cf5b3d', bg: 'rgba(207, 91, 61, 0.12)', line: 'rgba(207, 91, 61, 0.36)' },
};

/** stance → 기운 하트 채움(최대 3). favor=3·neutral=2·avoid=1. */
export const STANCE_HEARTS: Record<FortuneStance, number> = { favor: 3, neutral: 2, avoid: 1 };

/** 별점 채움(라벤더 보라 — 흰 위 고가독성, 레퍼런스 정합) / 빈 별(옅은 라벤더 트랙). */
export const STAR_GOLD = '#9A77D6';
export const STAR_EMPTY = '#DCD2EF';

/** 기운 하트(오키드 핑크 — 라벤더 가족) / 빈 하트(옅은 라벤더). */
export const HEART_FILL = '#D16BC0';
export const HEART_EMPTY = '#DCD2EF';

/** 스코어 링 게이지 색(라벤더 보라 — 별점과 통일) / 트랙(옅은 라벤더). */
export const RING_GOLD = '#9A77D6';
export const RING_TRACK = 'rgba(120, 95, 175, 0.14)';
