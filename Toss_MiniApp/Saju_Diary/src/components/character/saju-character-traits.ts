/**
 * saju-character-traits — 원국(NatalChart)에서 캐릭터 속성 2개를 뽑는다(순수·결정론).
 *
 * 1차 = 일간 오행(element) → 베이스 마스코트(머리 장식). 2차 = 원국에서 두 번째로 강한 오행
 *   (secondElement) → 착용 부적(charm). 둘 다 "오행"이라 일반 사용자가 색/모양으로 알아본다.
 * 사주 점수/만세력은 재계산하지 않고 NatalChart를 읽기만 한다(CRITICAL #1·#3). 오행 상생/상극은
 *   라벨용 매핑(engine과 동일 정합).
 */
import type { NatalChart, TenGod, TenGodGroup, WuXing } from '../../types';

/** 십신(정/편 10종) → 5계열. fortune-today.ts / engine과 동일 정합. */
const TEN_GOD_TO_GROUP: Record<TenGod, TenGodGroup> = {
  비견: '비겁',
  겁재: '비겁',
  식신: '식상',
  상관: '식상',
  편재: '재성',
  정재: '재성',
  편관: '관성',
  정관: '관성',
  편인: '인성',
  정인: '인성',
};

/** 相生: X가 生하는 오행. 라벨용(engine과 동일). */
const SHENG_NEXT: Record<WuXing, WuXing> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
/** 相剋: X가 剋하는 오행. 라벨용(engine과 동일). */
const KE_NEXT: Record<WuXing, WuXing> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };

/** 일간 오행(me) 기준 십신 그룹이 대표하는 오행. fortune-today.groupWuXing과 동일. */
function groupWuXing(me: WuXing, group: TenGodGroup): WuXing {
  switch (group) {
    case '비겁':
      return me;
    case '식상':
      return SHENG_NEXT[me];
    case '재성':
      return KE_NEXT[me];
    case '인성':
      return (Object.keys(SHENG_NEXT) as WuXing[]).find((k) => SHENG_NEXT[k] === me) ?? me;
    case '관성':
      return (Object.keys(KE_NEXT) as WuXing[]).find((k) => KE_NEXT[k] === me) ?? me;
    default:
      return me;
  }
}

/** 오행 tie-break 고정 순서(결정론). */
const WUXING_ORDER: WuXing[] = ['木', '火', '土', '金', '水'];

export interface CharacterTraits {
  /** 1차: 일간 오행 → 베이스 마스코트. */
  element: WuXing;
  /** 2차: 두 번째로 강한 오행(일간 오행과 다름) → 착용 부적. */
  secondElement: WuXing;
}

/**
 * 원국에서 캐릭터 속성을 뽑는다(순수·결정론). 같은 원국이면 항상 같은 캐릭터.
 *  - element: natal.dayWuXing(일간 오행).
 *  - secondElement: tenGods를 오행으로 환산(groupWuXing)해 **일간 오행을 뺀** 최빈 오행.
 *    동점이면 WUXING_ORDER 순. 십신 정보가 빈약하면 일간이 生하는 오행(식상)으로 폴백 → 항상 ≠ element.
 */
export function characterTraits(natal: NatalChart): CharacterTraits {
  const me = natal.dayWuXing;
  const counts: Record<WuXing, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  for (const tg of natal.tenGods) {
    if (tg != null) counts[groupWuXing(me, TEN_GOD_TO_GROUP[tg])] += 1;
  }
  let second: WuXing = SHENG_NEXT[me];
  let best = -1;
  for (const w of WUXING_ORDER) {
    if (w === me) continue;
    if (counts[w] > best) {
      best = counts[w];
      second = w;
    }
  }
  if (best <= 0) second = SHENG_NEXT[me]; // 비겁만/빈약 → 일간이 生하는 오행으로
  return { element: me, secondElement: second };
}
