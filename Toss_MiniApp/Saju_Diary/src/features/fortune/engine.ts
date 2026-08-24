// Evry Times — 사주 해석 엔진 (결정론적 순수 함수)
//
// 역할: manse.ts가 산출한 만세력(NatalChart, DayGanZhi)을 받아
//   **결정론적 운세 결과**(십신·총운 별점·세부운·행운색/방향·시드)를 계산한다.
//   문구뱅크/타로 데이터·문구 선택은 다음 step(phrase-bank). 이 step은 점수·등급·seed까지.
//
// CRITICAL 규칙:
//   - 모든 함수는 순수·결정론적. Math.random()·Date.now() 직접 의존 금지.
//     날짜는 항상 인자로 주입(manse가 산출한 DayGanZhi.date 사용).
//   - 만세력(간지/오행/십신/방위) 재계산 금지 — manse.ts 산출값만 소비.
//   - UI/Storage import 금지(엔진은 순수 로직).
//   - 오행 생극(ARCHITECTURE §5 파이프라인 3~5):
//       생(相生): 木→火→土→金→水→木
//       극(相剋): 木→土→水→火→金→木

import type {
  BranchRelation,
  DailyCaution,
  DayGanZhi,
  DayMasterStrength,
  DayPart,
  Direction,
  FortuneBasis,
  FortuneDetail,
  FortuneResult,
  FortuneScores,
  FortuneStance,
  LuckyColor,
  NatalChart,
  TenGod,
  TenGodGroup,
  TimeSegment,
  WuXing,
} from '../../types';

// ─────────────────────────────────────────────────────────────
// 오행 관계 (相生·相剋) — manse의 GAN_ZHI_WU_XING과 동일 정합
// ─────────────────────────────────────────────────────────────

/** 相生: X가 生하는 오행(X→이 오행). 예: 木→火. */
const SHENG_NEXT: Record<WuXing, WuXing> = {
  木: '火',
  火: '土',
  土: '金',
  金: '水',
  水: '木',
};

/** 相剋: X가 剋하는 오행(X→이 오행). 예: 木→土. */
const KE_NEXT: Record<WuXing, WuXing> = {
  木: '土',
  土: '水',
  水: '火',
  火: '金',
  金: '木',
};

/** a가 b를 生하는가(a→b). */
function sheng(a: WuXing, b: WuXing): boolean {
  return SHENG_NEXT[a] === b;
}

/** a가 b를 剋하는가(a→b). */
function ke(a: WuXing, b: WuXing): boolean {
  return KE_NEXT[a] === b;
}

// ─────────────────────────────────────────────────────────────
// 천간 음양(陰陽) — 십신 정/편 판정
// ─────────────────────────────────────────────────────────────

/** 양간(陽干): 甲丙戊庚壬. 나머지(乙丁己辛癸)는 음간(陰干). */
const YANG_STEMS = new Set(['甲', '丙', '戊', '庚', '壬']);

/** 천간이 양(陽)인가. 미매핑 글자는 방어적으로 양으로 본다. */
function isYang(stem: string): boolean {
  return YANG_STEMS.has(stem);
}

/** 두 천간의 음양이 같은가(同陰陽). */
function sameYinYang(a: string, b: string): boolean {
  return isYang(a) === isYang(b);
}

// ─────────────────────────────────────────────────────────────
// 천간 오행 (manse와 동일한 한자 글자 기준)
// ─────────────────────────────────────────────────────────────

const STEM_WU_XING: Record<string, WuXing> = {
  甲: '木', 乙: '木',
  丙: '火', 丁: '火',
  戊: '土', 己: '土',
  庚: '金', 辛: '金',
  壬: '水', 癸: '水',
};

/** 천간 글자의 오행. 미매핑 시 방어적으로 '土'. */
function stemWuXing(stem: string): WuXing {
  return STEM_WU_XING[stem] ?? '土';
}

// ─────────────────────────────────────────────────────────────
// 십신(十神) 판정
// ─────────────────────────────────────────────────────────────

/**
 * 일간(dayStem)과 상대 천간(otherStem)을 오행 생극 + 음양으로 비교해 십신 10종을 판정한다.
 *
 * 규칙(일간 = 我):
 *  - 같은 오행: 同음양 → 비견, 異음양 → 겁재
 *  - 일간이 生하는 오행(我→生): 同음양 → 식신, 異음양 → 상관
 *  - 일간이 剋하는 오행(我→剋, 재물): 同음양 → 편재, 異음양 → 정재
 *  - 일간을 剋하는 오행(剋→我, 관성): 同음양 → 편관, 異음양 → 정관
 *  - 일간을 生하는 오행(生→我, 인성): 同음양 → 편인, 異음양 → 정인
 *
 * 결정론적·순수. 같은 (dayStem, otherStem)은 항상 같은 결과.
 */
export function tenGod(dayStem: string, otherStem: string): TenGod {
  const me = stemWuXing(dayStem);
  const other = stemWuXing(otherStem);
  const same = sameYinYang(dayStem, otherStem);

  if (me === other) {
    return same ? '비견' : '겁재';
  }
  if (sheng(me, other)) {
    // 我가 生 → 식상
    return same ? '식신' : '상관';
  }
  if (ke(me, other)) {
    // 我가 剋 → 재성
    return same ? '편재' : '정재';
  }
  if (ke(other, me)) {
    // 相手가 我를 剋 → 관성
    return same ? '편관' : '정관';
  }
  // 남은 경우: 相手가 我를 生 → 인성
  return same ? '편인' : '정인';
}

/**
 * 십신 → 십신 분류(5계열). 점수·세부운·부억 가중에 사용.
 *  - 비겁(比劫): 비견·겁재
 *  - 식상(食傷): 식신·상관
 *  - 재성(財星): 편재·정재
 *  - 관성(官星): 편관·정관
 *  - 인성(印星): 편인·정인
 * (TenGodGroup 타입은 src/types에서 단일 출처. 호환을 위해 여기서 재노출.)
 */
export type { TenGodGroup } from '../../types';

const TEN_GOD_GROUP: Record<TenGod, TenGodGroup> = {
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

/** 십신의 5계열 분류. */
export function tenGodGroup(g: TenGod): TenGodGroup {
  return TEN_GOD_GROUP[g];
}

/** 일간×오늘 천간의 십신 계열(총운 핵심 관계). */
export function dayRelation(natal: NatalChart, day: DayGanZhi): TenGodGroup {
  return tenGodGroup(tenGod(natal.dayGan, day.pillar.gan));
}

/**
 * 어떤 오행이 일간(我)에 대해 어느 계열인지(음양 무시, 오행 생극만).
 *  - 같은 오행 → 비겁
 *  - 일간을 生하는 오행(生我) → 인성
 *  - 일간이 生하는 오행(我生) → 식상
 *  - 일간이 剋하는 오행(我剋) → 재성
 *  - 일간을 剋하는 오행(剋我) → 관성
 * 세력(부억) 합산용으로 음양을 구분하지 않는다(계열만 필요).
 */
export function wuXingToGroup(me: WuXing, other: WuXing): TenGodGroup {
  if (me === other) {
    return '비겁';
  }
  if (sheng(other, me)) {
    return '인성'; // 生我
  }
  if (sheng(me, other)) {
    return '식상'; // 我生
  }
  if (ke(me, other)) {
    return '재성'; // 我剋
  }
  // 남은 경우: 剋我 → 관성
  return '관성';
}

// ─────────────────────────────────────────────────────────────
// 부억(扶抑) — 오행 세력 / 신강·신약 / 희신·기신(喜忌)
//
// 방법(ARCHITECTURE §5): 월령(月令) 중심 + 부억.
//   - 일간(我)을 제외한 8자(시주 없으면 7자) 각 글자를 오행으로 환산해 가중 합산한다.
//   - 扶(我편)=비겁+인성, 抑(異편)=식상+재성+관성.
//   - 월령(월지 계열)이 我편이면 得令(강 쪽), 아니면 失令(약 쪽).
//   - ratio = 扶/(扶+抑)로 신강/신약/중화 판정(임계값 캘리브레이션 대상 상수).
//   - 희신/기신: 신강 → 抑이 喜·扶가 忌, 신약 → 扶가 喜·抑이 忌, 중화 → 중립.
// 한계(v1 단순화): 지지 오행은 본기(本氣)만 사용(지장간 여기/중기 미반영).
//   회합·형충파해의 세력 변동, 통근(通根) 정밀화는 후속(캘리브레이션) 여지로 남긴다.
// ─────────────────────────────────────────────────────────────

/** 세력 가중치 — 우리 디폴트(주류 부억론의 월령 최우선·일지 비중을 단순화). */
const POWER_WEIGHT = {
  /** 월지(月支) — 월령. 가장 큰 비중. */
  monthZhi: 3,
  /** 일지(日支) — 일간의 뿌리. */
  dayZhi: 2,
  /** 년지·시지. */
  yearZhi: 1.5,
  hourZhi: 1.5,
  /** 천간(년·월·시) — 일간 자신은 제외. */
  stem: 1.0,
} as const;

/** 천간/지지 글자(한자) → 오행. manse의 GAN_ZHI_WU_XING과 동일 정합(엔진 자립 사본). */
const GAN_ZHI_WU_XING: Record<string, WuXing> = {
  // 천간
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
  // 지지(본기)
  寅: '木', 卯: '木', 巳: '火', 午: '火',
  辰: '土', 丑: '土', 戌: '土', 未: '土',
  申: '金', 酉: '金', 亥: '水', 子: '水',
};

/** 간지 1글자 → 오행. 미매핑 시 방어적으로 '土'. */
function charWuXing(char: string): WuXing {
  return GAN_ZHI_WU_XING[char] ?? '土';
}

/**
 * 오행 세력 — 일간(我)을 제외한 원국 8자(시주 없으면 7자)를 오행별로 가중 합산한다.
 * 결정론·순수. 가중치는 POWER_WEIGHT(월지>일지>년·시지>천간) — 캘리브레이션 대상.
 *
 * 비고: 일간(我) 자신은 세력 합산에서 제외한다(강약은 我를 돕는/빼는 세력의 비율로 본다).
 *       일주 천간은 곧 일간이므로 천간 합산에서 제외(년·월·시 천간만).
 */
export function elementPower(natal: NatalChart): Record<WuXing, number> {
  const power: Record<WuXing, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };

  const add = (char: string, weight: number): void => {
    power[charWuXing(char)] += weight;
  };

  // 천간(일간 제외): 년·월·시.
  add(natal.year.gan, POWER_WEIGHT.stem);
  add(natal.month.gan, POWER_WEIGHT.stem);
  if (natal.hour != null) {
    add(natal.hour.gan, POWER_WEIGHT.stem);
  }

  // 지지: 월지>일지>년·시지.
  add(natal.month.zhi, POWER_WEIGHT.monthZhi);
  add(natal.day.zhi, POWER_WEIGHT.dayZhi);
  add(natal.year.zhi, POWER_WEIGHT.yearZhi);
  if (natal.hour != null) {
    add(natal.hour.zhi, POWER_WEIGHT.hourZhi);
  }

  return power;
}

/** 오행 세력을 일간 기준 5계열 세력으로 환산. */
export function groupPower(natal: NatalChart): Record<TenGodGroup, number> {
  const me = natal.dayWuXing;
  const power = elementPower(natal);
  const groups: Record<TenGodGroup, number> = {
    비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0,
  };
  for (const wx of Object.keys(power) as WuXing[]) {
    groups[wuXingToGroup(me, wx)] += power[wx];
  }
  return groups;
}

/**
 * 월령 득실(得令/失令) — 월지(月支) 본기 오행을 일간 기준 계열로 환산해
 * 我편(비겁/인성)이면 得令(true), 아니면 失令(false).
 * dayMasterStrength·fortuneBasis가 공유(동작 동일).
 * 결정론·순수.
 */
export function deLing(natal: NatalChart): boolean {
  const monthGroup = wuXingToGroup(natal.dayWuXing, charWuXing(natal.month.zhi));
  return monthGroup === '비겁' || monthGroup === '인성';
}

/** 신강/신약 판정 임계값(캘리브레이션 대상). */
const STRENGTH_THRESHOLD = {
  /** 기본 신강 하한 ratio. */
  strong: 0.55,
  /** 기본 신약 상한 ratio. */
  weak: 0.45,
  /** 得令/失令 보정 시 적용하는 중립 임계값. */
  令: 0.5,
} as const;

/**
 * 신강/신약/중화 — 부억 + 월령.
 *   扶 = 비겁 + 인성 세력, 抑 = 식상 + 재성 + 관성 세력.
 *   ratio = 扶 / (扶 + 抑) (분모 0 방어 → balanced).
 *   월령(월지 계열)이 扶(비겁/인성)이면 得令(강 임계 완화 0.50), 아니면 失令(약 임계 완화 0.50).
 *   strong if ratio ≥ 임계, weak if ratio ≤ 임계, 그 외 balanced.
 * 결정론·순수.
 */
export function dayMasterStrength(natal: NatalChart): DayMasterStrength {
  const gp = groupPower(natal);
  const fu = gp.비겁 + gp.인성; // 扶(我편)
  const yi = gp.식상 + gp.재성 + gp.관성; // 抑(異편)
  const total = fu + yi;
  if (total <= 0) {
    return 'balanced';
  }
  const ratio = fu / total;

  // 월령 계열(월지 본기 → 일간 기준 계열)이 我편(비겁/인성)이면 得令.
  const isDeLing = deLing(natal);

  // 得令이면 신강 판정 임계를 0.50까지 낮춰 강 쪽으로, 失令이면 신약 임계를 0.50까지 높여 약 쪽으로.
  const strongCut = isDeLing ? STRENGTH_THRESHOLD.令 : STRENGTH_THRESHOLD.strong;
  const weakCut = isDeLing ? STRENGTH_THRESHOLD.weak : STRENGTH_THRESHOLD.令;

  if (ratio >= strongCut) {
    return 'strong';
  }
  if (ratio <= weakCut) {
    return 'weak';
  }
  return 'balanced';
}

/**
 * 희신/기신(喜忌) 계열 — 부억 결과로 정한다.
 *   신강 → favor {식상,재성,관성}(빼주는 쪽), avoid {비겁,인성}(더하는 쪽)
 *   신약 → favor {비겁,인성}(보태는 쪽), avoid {식상,재성,관성}(빼는 쪽)
 *   중화 → favor [], avoid [](중립; 충합 위주로 판단)
 * 결정론·순수.
 */
export function favorableGroups(natal: NatalChart): {
  favor: TenGodGroup[];
  avoid: TenGodGroup[];
} {
  const strength = dayMasterStrength(natal);
  if (strength === 'strong') {
    return { favor: ['식상', '재성', '관성'], avoid: ['비겁', '인성'] };
  }
  if (strength === 'weak') {
    return { favor: ['비겁', '인성'], avoid: ['식상', '재성', '관성'] };
  }
  return { favor: [], avoid: [] };
}

/** 오늘 계열이 그 사람에게 喜(favor)/忌(avoid)/中(neutral)인지. */
function stanceOf(
  group: TenGodGroup,
  favor: TenGodGroup[],
  avoid: TenGodGroup[],
): FortuneStance {
  if (favor.includes(group)) {
    return 'favor';
  }
  if (avoid.includes(group)) {
    return 'avoid';
  }
  return 'neutral';
}

// ─────────────────────────────────────────────────────────────
// 지지(地支) 충(沖)·합(合) — 일지(日支)와 오늘 지지의 가감
// ─────────────────────────────────────────────────────────────

/** 지지 충(沖): 6쌍. 충이면 점수 -1(주의). */
const ZHI_CHONG: Record<string, string> = {
  子: '午', 午: '子',
  丑: '未', 未: '丑',
  寅: '申', 申: '寅',
  卯: '酉', 酉: '卯',
  辰: '戌', 戌: '辰',
  巳: '亥', 亥: '巳',
};

/** 지지 육합(六合): 6쌍. 합이면 점수 +1(원만). */
const ZHI_HE: Record<string, string> = {
  子: '丑', 丑: '子',
  寅: '亥', 亥: '寅',
  卯: '戌', 戌: '卯',
  辰: '酉', 酉: '辰',
  巳: '申', 申: '巳',
  午: '未', 未: '午',
};

/**
 * 두 지지의 관계(六合/六沖/同/무) — 기존 ZHI_HE/ZHI_CHONG 재사용(새 표 0).
 *   a===b → 'same', ZHI_HE[a]===b → 'he', ZHI_CHONG[a]===b → 'chong', 그 외 'none'.
 * 결정론·순수.
 */
export function branchRelation(a: string, b: string): BranchRelation {
  if (a === b) {
    return 'same';
  }
  if (ZHI_HE[a] === b) {
    return 'he';
  }
  if (ZHI_CHONG[a] === b) {
    return 'chong';
  }
  return 'none';
}

/** 일지 vs 오늘 지지: 충 -1, 합 +1, 그 외 0. */
function branchAdjust(natalZhi: string, dayZhi: string): number {
  if (ZHI_CHONG[natalZhi] === dayZhi) {
    return -1;
  }
  if (ZHI_HE[natalZhi] === dayZhi) {
    return 1;
  }
  return 0;
}

/**
 * 시주(時支) vs 오늘 지지의 합충 가감 — **시간(시주)을 입력한 경우에만** 적용한다(충 -1·합 +1·그 외 0).
 * 시주가 없으면 0이라 시간 미입력 사주의 점수는 종전과 완전히 동일하다(회귀 없음).
 * 같은 사주라도 태어난 시(時)에 따라 오늘 일진과 맺는 합충이 달라지므로 **시간에 따라 운세가 갈린다.**
 * 일지 합충(branchAdjust)과 같은 어휘(六合/六沖 표)만 쓴다 — 새 길흉표 도입 0.
 */
function hourBranchAdjust(natal: NatalChart, day: DayGanZhi): number {
  if (natal.hour == null) {
    return 0;
  }
  return branchAdjust(natal.hour.zhi, day.pillar.zhi);
}

// ─────────────────────────────────────────────────────────────
// 총운 별점 (1~5, 결정론적)
// ─────────────────────────────────────────────────────────────

/** 점수를 1~5로 고정(clamp). */
function clamp1to5(n: number): number {
  if (n < 1) {
    return 1;
  }
  if (n > 5) {
    return 5;
  }
  return n;
}

/** 喜忌 입장 → 총운 기본점수. 喜=4(길)·忌=2(흉)·中=3(평). 같은 일진도 사람마다 갈린다. */
function stanceBase(stance: FortuneStance): number {
  if (stance === 'favor') {
    return 4;
  }
  if (stance === 'avoid') {
    return 2;
  }
  return 3;
}

/**
 * 총운 별점(1~5, 결정론적) — **그 사람 사주의 喜忌 기준**.
 * = 오늘 천간 계열이 그 사람에게 喜(4)/忌(2)/中(3) + 일지×오늘 지지 충(-1)/합(+1).
 * 신강·신약에 따라 喜忌가 뒤집히므로 같은 오늘 일진도 사람마다 점수가 달라진다.
 */
export function totalScore(natal: NatalChart, day: DayGanZhi): number {
  const group = dayRelation(natal, day);
  const { favor, avoid } = favorableGroups(natal);
  const base = stanceBase(stanceOf(group, favor, avoid));
  const adj = branchAdjust(natal.day.zhi, day.pillar.zhi);
  // 시주가 있으면(시간 입력) 시지×오늘 지지 합충을 더해 시간에 따라 점수가 갈리게 한다.
  return clamp1to5(base + adj + hourBranchAdjust(natal, day));
}

// ─────────────────────────────────────────────────────────────
// 세부운 (재물·애정·건강)
// ─────────────────────────────────────────────────────────────

/** 성별(애정운 관점). 남=재성, 여=관성 기준. */
export type Gender = 'male' | 'female';

/**
 * 해당 계열이 오늘 들어왔을 때, 그 계열이 그 사람에게 喜/忌인지로 +1/−1을 정한다.
 *  - 오늘 계열이 항목 핵심 계열과 일치하지 않으면 가감 0(기본 3).
 *  - 일치하면: 喜(favor)→+1, 忌(avoid)→−1, 中(neutral)→0.
 * 신강·신약에 따라 같은 계열이 반대 부호가 되도록 한다(개인화 핵심).
 */
function subAdjustByStance(
  todayGroup: TenGodGroup,
  itemGroups: TenGodGroup[],
  favor: TenGodGroup[],
  avoid: TenGodGroup[],
): number {
  if (!itemGroups.includes(todayGroup)) {
    return 0;
  }
  if (favor.includes(todayGroup)) {
    return 1;
  }
  if (avoid.includes(todayGroup)) {
    return -1;
  }
  return 0;
}

/**
 * 세부운(재물·애정·건강) — 모두 1~5, 결정론적. **그 사람 사주의 喜忌 기준**.
 * 각 base 3 위에:
 *  - **공통 stanceTilt**: 오늘이 그 사람에게 喜(+1)/忌(−1)/中(0)면 모든 세부운이 함께
 *    오르내린다(오늘이 나쁜 날이면 재물·애정·건강도 전반적으로 역풍). 이 덕분에 총운
 *    (= 3 + stanceTilt + adj)이 항상 세부운들의 범위 안에 들어와 "총운만 혼자 낮다"가 사라진다.
 *  - 도메인 가감(stanceTilt 위에 추가 강조): 재물=오늘이 재성, 애정=target(female 관성/male 재성),
 *    건강=오늘이 인성/비겁일 때 (∈favor?+1 : ∈avoid?−1) — 그 운이 오늘 기운을 가장 강하게 받는다.
 *  - 공통: 일지×오늘 지지 충(−1)/합(+1) 가산.
 */
export function subFortunes(
  natal: NatalChart,
  day: DayGanZhi,
  gender: Gender = 'male',
): FortuneScores {
  const group = dayRelation(natal, day);
  // 일지 합충 + (시주 입력 시) 시지 합충 — 시간에 따라 세부운도 갈린다.
  const adj = branchAdjust(natal.day.zhi, day.pillar.zhi) + hourBranchAdjust(natal, day);
  const { favor, avoid } = favorableGroups(natal);
  // 오늘의 전반 喜忌 = 총운 base 와 동일(stanceBase−3 ∈ {+1,0,−1}). 모든 세부운의 공통 바닥.
  const stanceTilt = stanceBase(stanceOf(group, favor, avoid)) - 3;
  const base = 3 + stanceTilt + adj;

  const wealth = clamp1to5(
    base + subAdjustByStance(group, ['재성'], favor, avoid),
  );

  const loveTargetGroup: TenGodGroup = gender === 'female' ? '관성' : '재성';
  const love = clamp1to5(
    base + subAdjustByStance(group, [loveTargetGroup], favor, avoid),
  );

  const health = clamp1to5(
    base + subAdjustByStance(group, ['인성', '비겁'], favor, avoid),
  );

  return { wealth, love, health };
}

// ─────────────────────────────────────────────────────────────
// 행운색 / 행운방향
// ─────────────────────────────────────────────────────────────

/** 오행 → 행운색표(木초록·火빨강·土노랑·金흰색·水검정). */
const WU_XING_COLOR: Record<WuXing, LuckyColor> = {
  木: '초록',
  火: '빨강',
  土: '노랑',
  金: '흰색',
  水: '검정',
};

/** me를 生하는 오행(印星 오행) — SHENG_NEXT[x]===me 인 x. */
function supporterWuXing(me: WuXing): WuXing {
  const x = (Object.keys(SHENG_NEXT) as WuXing[]).find(
    (k) => SHENG_NEXT[k] === me,
  );
  return x ?? me;
}

/** me를 剋하는 오행(官星 오행) — KE_NEXT[x]===me 인 x. */
function controllerWuXing(me: WuXing): WuXing {
  const x = (Object.keys(KE_NEXT) as WuXing[]).find((k) => KE_NEXT[k] === me);
  return x ?? me;
}

/** 십신 계열 → 일간(me) 기준 대표 오행(wuXingToGroup의 역). */
function groupToWuXing(me: WuXing, group: TenGodGroup): WuXing {
  switch (group) {
    case '비겁':
      return me;
    case '식상':
      return SHENG_NEXT[me];
    case '재성':
      return KE_NEXT[me];
    case '인성':
      return supporterWuXing(me);
    case '관성':
      return controllerWuXing(me);
    default:
      return me;
  }
}

/** 체질 기본 행운색의 오행(일자 무관) — 신강=財星(我剋), 그 외=印星(生我). */
function constitutionWuXing(natal: NatalChart): WuXing {
  const me = natal.dayWuXing;
  return dayMasterStrength(natal) === 'strong' ? KE_NEXT[me] : supporterWuXing(me);
}

/**
 * 그 사람에게 이로운 오행 집합(희신 계열의 대표 오행), **체질 기본색을 맨 앞**에 둔다.
 * 중화면 보강(印)+설기(財) 둘 다. 일진 회전의 기준점이 체질색이 되도록 정렬.
 */
function favorableWuXings(natal: NatalChart): WuXing[] {
  const me = natal.dayWuXing;
  const { favor } = favorableGroups(natal);
  const els = favor.length > 0
    ? favor.map((g) => groupToWuXing(me, g))
    : [supporterWuXing(me), KE_NEXT[me]];
  const constitution = constitutionWuXing(natal);
  const uniq = Array.from(new Set(els));
  return [constitution, ...uniq.filter((e) => e !== constitution)];
}

/** 천간 10개 순서(일진 회전 인덱스용). */
const HEAVENLY_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;

/**
 * 행운색 — **사주에 맞되 그날 일진에 따라 매일 바뀌는** 오늘의 색.
 *  - day 없으면(원국만): 체질 기본색(신약/중화=印星 / 신강=財星) — 사람 고유색.
 *  - day 있으면: **내게 이로운 오행(희신) 집합 안에서** 오늘 일진 천간 순서로 하나를 골라 회전한다.
 *    → 항상 내 희신 색(사주 정합)이면서, 일진이 매일 달라지므로 색도 매일 바뀐다.
 *    희신이 한 가지뿐인 사주는 그 색으로 안정(억지 변동 없음).
 */
export function luckyColor(natal: NatalChart, day?: DayGanZhi): LuckyColor {
  if (day == null) {
    return WU_XING_COLOR[constitutionWuXing(natal)];
  }
  const favorEls = favorableWuXings(natal);
  if (favorEls.length === 0) {
    return WU_XING_COLOR[constitutionWuXing(natal)];
  }
  const ord = HEAVENLY_STEMS.indexOf(day.pillar.gan as (typeof HEAVENLY_STEMS)[number]);
  const idx = ord < 0 ? 0 : ord % favorEls.length;
  return WU_XING_COLOR[favorEls[idx]];
}

/**
 * 행운방향 = 그날 재신(財神)/희신(喜神) 방위를 직접 사용(manse 산출값).
 * 기본은 재신 방위(재물 길방); 중앙이면 희신으로 폴백해 방향성을 준다.
 */
export function luckyDirection(day: DayGanZhi): Direction {
  if (day.caiDirection === '중앙' && day.xiDirection !== '중앙') {
    return day.xiDirection;
  }
  return day.caiDirection;
}

// ─────────────────────────────────────────────────────────────
// 시드(seed) — 문구/타로 일일 선택용 결정론적 해시
// ─────────────────────────────────────────────────────────────

/**
 * 결정론적 해시 시드 — 생년월일 + 오늘 날짜 + (선택 salt)로 32비트 부호없는 정수를 만든다.
 * 같은 날·같은 사람은 동일 시드(재현성), 날짜가 바뀌면 신선(반복 회피).
 * FNV-1a(32bit) 변형 — Math.random 미사용, 순수.
 *
 * @param birthDate 생년월일 `YYYY-MM-DD`(사람 식별).
 * @param dateKey   오늘 날짜 `YYYY-MM-DD`(일일 회전).
 * @param salt      용도 구분(예: 'phrase' / 'tarot' / 항목명) — 같은 날 충돌 회피.
 */
export function seed(birthDate: string, dateKey: string, salt = ''): number {
  const str = `${birthDate}|${dateKey}|${salt}`;
  let h = 0x811c9dc5; // FNV offset basis (32bit)
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    // FNV prime 16777619, 32비트 곱셈을 안전하게(Math.imul).
    h = Math.imul(h, 0x01000193);
  }
  // 부호없는 32비트로 정규화.
  return h >>> 0;
}

/**
 * 시드를 [0, n) 범위 인덱스로 결정론적 매핑(문구뱅크에서 한 항목 선택용).
 * @throws n이 양의 정수가 아니면.
 */
export function seedIndex(seedValue: number, n: number): number {
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`engine.seedIndex: n은 양의 정수여야 합니다. 받은 값: ${n}`);
  }
  return (seedValue >>> 0) % n;
}

// ─────────────────────────────────────────────────────────────
// 점수 근거(FortuneBasis) — 위젯 한 줄 근거 노출용
// ─────────────────────────────────────────────────────────────

/**
 * 운세 점수의 근거(부억扶抑·喜忌)를 구조화해 반환한다(결정론·순수).
 * 위젯이 "신약 사주라 오늘 인성이 喜" 같은 한 줄 근거를 조립할 수 있게 한다.
 */
export function fortuneBasis(natal: NatalChart, day: DayGanZhi): FortuneBasis {
  const strength = dayMasterStrength(natal);
  const { favor, avoid } = favorableGroups(natal);
  const todayGroup = dayRelation(natal, day);
  const monthZhi = natal.month.zhi;
  return {
    dayGan: natal.dayGan,
    dayWuXing: natal.dayWuXing,
    monthZhi,
    monthWuXing: charWuXing(monthZhi),
    strength,
    todayGroup,
    todayStance: stanceOf(todayGroup, favor, avoid),
    todayTenGod: tenGod(natal.dayGan, day.pillar.gan),
    deLing: deLing(natal),
  };
}

// ─────────────────────────────────────────────────────────────
// 오늘의 상세 — 시간대별 기운(四正 왕지) + 조심 포인트
//
// 해석 레이어(만세력 정밀 산출 아님): 하루를 4블록으로 나누고 각 블록의 대표
// 기운을 사정(四正) 왕지(子卯午酉)의 오행으로 고정한다(子水·卯木·午火·酉金).
// 각 블록 입장(stance) = 체질 희기(본인 favorableGroups) ± 오늘 일진 지지 합충.
//   체질 base: 블록 오행 계열(wuXingToGroup)이 favor면 +1, avoid면 −1, 그 외 0.
//   일진 보정: 블록 왕지 vs 오늘 일진 지지의 branchRelation → he/same +1, chong −1, none 0.
//   score>0 favor / score<0 avoid / 0 neutral. → **오늘 일진 지지에 따라 매일 변동**.
// 근거는 기존 六合/六沖 표 × 희기에서만 파생 — 새 유파·임의 길흉표·삼합/방합 도입 0.
// 土는 사정 시간대에 없으므로 시간 흐름에 미표현(의도된 단순화).
// 결정론·순수: 같은 (natal, day)는 항상 같은 결과.
// ─────────────────────────────────────────────────────────────

/** 하루 4블록 — 고정 순서(morning→day→evening→night)·사정 왕지·오행. */
const DAY_PARTS: ReadonlyArray<{ part: DayPart; zhi: string; wuXing: WuXing }> = [
  { part: 'morning', zhi: '卯', wuXing: '木' },
  { part: 'day', zhi: '午', wuXing: '火' },
  { part: 'evening', zhi: '酉', wuXing: '金' },
  { part: 'night', zhi: '子', wuXing: '水' },
];

/**
 * 시간대별 기운 — 사정 왕지 4블록(morning→day→evening→night 순, 길이 4).
 *
 * 각 블록의 계열 = `wuXingToGroup(일간 오행, 블록 오행)`.
 * 입장(stance) = **체질 희기 ± 오늘 일진 지지 합충** → 날마다 변동:
 *  - 체질 base: 블록 계열이 본인 favor면 +1, avoid면 −1, 그 외 0(중화면 0).
 *  - 일진 보정: `branchRelation(블록 왕지, 오늘 일진 지지)` → 'he'/'same' +1, 'chong' −1, 'none' 0.
 *  - score>0 → favor / score<0 → avoid / 0 → neutral.
 *  - `dayBranch` = branchRelation 결과 그대로(문구·근거용).
 *
 * 오늘 일진 지지에 충(沖)이 들어온 블록(예: 일진 午 → 밤 子)은 그날 반응이 뒤집힐 수 있다 →
 * **같은 사람도 일진에 따라 시간대 stance가 매일 바뀐다.** 근거는 六合/六沖 × 희기에서만.
 * 결정론·순수: 같은 (natal, day)는 항상 같은 결과.
 */
export function timeSegments(natal: NatalChart, day: DayGanZhi): TimeSegment[] {
  const me = natal.dayWuXing;
  const { favor, avoid } = favorableGroups(natal);
  const todayZhi = day.pillar.zhi;
  return DAY_PARTS.map(({ part, zhi, wuXing }) => {
    const group = wuXingToGroup(me, wuXing);

    // 체질 base: 본인 희기로만(+1/−1/0).
    const base = favor.includes(group) ? 1 : avoid.includes(group) ? -1 : 0;

    // 일진 보정: 블록 왕지 vs 오늘 일진 지지(六合/同 +1, 六沖 −1, 무 0).
    const rel = branchRelation(zhi, todayZhi);
    const dayAdj = rel === 'he' || rel === 'same' ? 1 : rel === 'chong' ? -1 : 0;

    const score = base + dayAdj;
    const stance: FortuneStance =
      score > 0 ? 'favor' : score < 0 ? 'avoid' : 'neutral';

    return {
      part,
      zhi,
      wuXing,
      group,
      stance,
      dayBranch: rel,
    };
  });
}

/**
 * 오늘 조심 포인트 — 근거는 **기신(忌) + 일지×오늘 지지 충(沖)** 으로 고정.
 *   - avoidGroup: 오늘 천간 계열(dayRelation)이 본인 avoid면 그 계열, 아니면 null.
 *   - chong: 일지(natal.day.zhi) vs 오늘 지지(day.pillar.zhi)가 충이면 true.
 *   - cautionPart: timeSegments 중 stance==='avoid'인 첫 블록의 part, 없으면 null.
 * 결정론·순수.
 */
export function dailyCaution(natal: NatalChart, day: DayGanZhi): DailyCaution {
  const { avoid } = favorableGroups(natal);
  const todayGroup = dayRelation(natal, day);
  const avoidGroup = avoid.includes(todayGroup) ? todayGroup : null;

  const chong = ZHI_CHONG[natal.day.zhi] === day.pillar.zhi;

  const cautionSeg = timeSegments(natal, day).find((s) => s.stance === 'avoid');
  const cautionPart = cautionSeg != null ? cautionSeg.part : null;

  return { avoidGroup, chong, cautionPart };
}

/** 오늘의 상세(시간대 흐름 + 조심) — buildFortune에 배선. 결정론·순수. */
export function fortuneDetail(natal: NatalChart, day: DayGanZhi): FortuneDetail {
  return {
    segments: timeSegments(natal, day),
    caution: dailyCaution(natal, day),
  };
}

// ─────────────────────────────────────────────────────────────
// FortuneResult 조립
// ─────────────────────────────────────────────────────────────

/** buildFortune 옵션. */
export interface BuildFortuneOptions {
  /** 애정운 관점 성별(기본 male). */
  gender?: Gender;
  /**
   * 문구 주입 콜백(선택). 다음 step(phrase-bank)에서 시드·상태키로 문구를 골라 주입한다.
   * 미주입 시 iljin/advice는 빈 문자열로 둔다(구조만 완성).
   */
  phraseProvider?: (ctx: FortunePhraseContext) => {
    iljin?: string;
    advice?: string;
    tarot?: FortuneResult['tarot'];
  };
}

/** 문구 선택에 필요한 결정론적 컨텍스트(phraseProvider 입력). */
export interface FortunePhraseContext {
  /** 결과 날짜 `YYYY-MM-DD`. */
  date: string;
  /** 일간×오늘 천간 십신 계열(상태키). */
  relation: TenGodGroup;
  /** 일간 오행(상태키). */
  dayWuXing: WuXing;
  /** 총운 별점. */
  overall: number;
  /** 세부운. */
  scores: FortuneScores;
  /** 일일 시드(생년월일+날짜 기반). */
  seed: number;
}

/**
 * FortuneResult 조립 — 점수/등급/색/방향/시드까지 모은다.
 * 문구(iljin/advice/tarot)는 phraseProvider가 있으면 주입, 없으면 비워둔다(다음 step에서 채움).
 *
 * 순수·결정론적: 같은 (natal, day, birthDate, opts) → 같은 결과.
 *
 * @param natal     원국(manse.computeNatal).
 * @param day       오늘 일진(manse.computeDayGanZhi) — 날짜는 day.date에서 가져온다.
 * @param birthDate 생년월일 `YYYY-MM-DD`(시드용 사람 식별).
 */
export function buildFortune(
  natal: NatalChart,
  day: DayGanZhi,
  birthDate: string,
  opts: BuildFortuneOptions = {},
): FortuneResult {
  const overall = totalScore(natal, day);
  const scores = subFortunes(natal, day, opts.gender);
  const relation = dayRelation(natal, day);
  const dailySeed = seed(birthDate, day.date, 'phrase');

  const ctx: FortunePhraseContext = {
    date: day.date,
    relation,
    dayWuXing: natal.dayWuXing,
    overall,
    scores,
    seed: dailySeed,
  };

  const phrase = opts.phraseProvider?.(ctx);

  const result: FortuneResult = {
    date: day.date,
    overall,
    scores,
    luckyColor: luckyColor(natal, day),
    luckyDirection: luckyDirection(day),
    iljin: phrase?.iljin ?? '',
    advice: phrase?.advice ?? '',
    basis: fortuneBasis(natal, day),
    detail: fortuneDetail(natal, day),
  };

  if (phrase?.tarot != null) {
    result.tarot = phrase.tarot;
  }

  return result;
}
