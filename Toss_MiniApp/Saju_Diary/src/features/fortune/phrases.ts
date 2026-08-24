// Evry Times — 문구뱅크 + 결정론적 선택기 (phrase-bank)
//
// 역할: 정적 JSON 문구뱅크(data/fortune-phrases.json)·타로(data/tarot.json)에서
//   engine의 시드(seed)·seedIndex로 **결정론적**으로 문구/타로를 골라
//   buildFortune의 phraseProvider에 연결한다.
//
// CRITICAL:
//   - 런타임 LLM/서버/네트워크 호출 0 — 전부 번들된 정적 JSON + 결정론적 선택.
//   - 문구 텍스트는 전부 자체 작성(외부 운세/타로 라이선스 텍스트 복붙 금지, CRITICAL #2).
//   - 선택은 시드 해시로만(Math.random 금지) → 같은 날 동일, 날 바뀌면 신선(반복 회피).
//   - 문구는 코드에 분산 하드코딩하지 않는다. data/*.json 단일 출처.

import type {
  BranchRelation,
  DayMasterStrength,
  DayPart,
  FortuneResult,
  FortuneStance,
  TarotCard,
  TenGod,
  WuXing,
} from '../../types';
import { seed, seedIndex } from './engine';
import type { FortunePhraseContext, TenGodGroup } from './engine';
import phraseBank from '../../../data/fortune-phrases.json';
import tarotBank from '../../../data/tarot.json';

// ─────────────────────────────────────────────────────────────
// JSON 스키마 (data/fortune-phrases.json · data/tarot.json)
// ─────────────────────────────────────────────────────────────

/** 문구뱅크 항목(운세 카테고리). 상태키 `${relation}:${item}`의 item 부분. */
export type PhraseItem = 'overall' | 'wealth' | 'love' | 'health' | 'advice';

/** 십신 계열(engine.dayRelation 결과)과 동일. 상태키의 relation 부분. */
export type PhraseRelation = TenGodGroup;

/** 상태키 — `${relation}:${item}` (예: '재성:wealth'). */
export type StateKey = `${PhraseRelation}:${PhraseItem}`;

/** 별점 정합 밴드 — low(1~2★)·mid(3★)·high(4~5★). */
export type ScoreBand = 'low' | 'mid' | 'high';

/** 밴드 문구가 있는 카테고리(총운/재물/애정/건강). advice는 계열-키 기반이라 제외. */
export type BandedItem = 'overall' | 'wealth' | 'love' | 'health';

/** banded 블록: item × band → 문구 후보. */
type BandedBlock = Record<BandedItem, Record<ScoreBand, string[]>>;

/** chartTraits 블록: 일간 오행 × 신강/신약/중화 → 성정/필요 조각 후보. */
type ChartTraitsBlock = Record<WuXing, Record<DayMasterStrength, string[]>>;

/** segment 블록: 시간대(part) × 입장(stance) → 한 줄 후보. */
type SegmentBlock = Record<DayPart, Record<FortuneStance, string[]>>;

/** reflectQuestion 블록: 공용(common) + 계열별 회고 질문 후보. */
type ReflectQuestionBlock = Record<string, string[]>;

/** segmentDayBranch 블록(v4): 오늘 일진 지지 관계(합/충/同/무)별 근거 조각. */
type SegmentDayBranchBlock = Record<BranchRelation, string[]>;

/** deLing 블록(v4): 월령 득령(true)/실령(false) 한 조각(describeChart). */
type DeLingBlock = Record<'true' | 'false', string[]>;

/** xiShen 블록(v4): 신강/신약/중화별 희신 마무리 조각(describeChart). */
type XiShenBlock = Record<DayMasterStrength, string[]>;

/** data/fortune-phrases.json 구조(런타임 검증 대상은 iljin·phrases·banded + detail 섹션). */
interface PhraseBankShape {
  /** 오행별 "오늘의 일진" 교육 한 줄 후보. */
  iljin: Record<WuXing, string[]>;
  /** 상태키별 문구 후보. */
  phrases: Record<string, string[]>;
  /** 별점 밴드별 문구 후보(additive). */
  banded: BandedBlock;
  /** 일간 오행×신강신약별 성정/필요 조각(오늘 상세 — describeChart). */
  chartTraits: ChartTraitsBlock;
  /** 시간대×입장별 한 줄(오늘 상세 — buildSegmentLine). */
  segment: SegmentBlock;
  /** (v4) 오늘 일진 지지 관계(합/충/同/무)별 근거 조각(오늘 상세 — buildSegmentLine). */
  segmentDayBranch: SegmentDayBranchBlock;
  /** 계열별 "조심 영역" 한 줄(오늘 상세 — buildCautionLine 계열 폴백). */
  cautionArea: Record<TenGodGroup, string[]>;
  /** (v4) 정확한 십신(정/편)별 조심 한 줄(오늘 상세 — buildCautionLine). */
  cautionTenGod: Record<TenGod, string[]>;
  /** 충(沖) 주의 한 줄(오늘 상세 — buildCautionLine). */
  cautionChong: string[];
  /** 계열별 회고 요약(일기 — buildReflectiveLines summary 폴백). */
  reflectSummary: Record<TenGodGroup, string[]>;
  /** (v4) 정확한 십신별 회고 요약(과거형, 일기 — buildReflectiveLines summary). */
  reflectTenGod: Record<TenGod, string[]>;
  /** 회고 질문(일기 — buildReflectiveLines question). common + 계열별. */
  reflectQuestion: ReflectQuestionBlock;
  /** (v4) 월령 득령/실령 한 조각(오늘 상세 — describeChart). */
  deLing: DeLingBlock;
  /** (v4) 신강/신약/중화별 희신 마무리 조각(오늘 상세 — describeChart). */
  xiShen: XiShenBlock;
  /** (v4) 정확한 십신 한 줄 의미(오늘의 일진 노출·근거). */
  tenGodMeaning: Record<TenGod, string[]>;
}

/** data/tarot.json의 카드 1장. */
interface TarotEntry {
  index: number;
  name: string;
  upright: string;
  reversed: string;
}

// 정적 import를 우리 타입으로 좁힌다(JSON은 구조 검증 후 신뢰).
const BANK = phraseBank as unknown as PhraseBankShape;
const TAROT = (tarotBank as { cards: TarotEntry[] }).cards;

/** 상태키 구성 요소. */
const RELATIONS: PhraseRelation[] = ['비겁', '식상', '재성', '관성', '인성'];
const ITEMS: PhraseItem[] = ['overall', 'wealth', 'love', 'health', 'advice'];
const WU_XINGS: WuXing[] = ['木', '火', '土', '金', '水'];

/** detail 섹션 구성 요소(검증·선택용). */
const STRENGTHS: DayMasterStrength[] = ['strong', 'weak', 'balanced'];
const DAY_PARTS: DayPart[] = ['morning', 'day', 'evening', 'night'];
const STANCES: FortuneStance[] = ['favor', 'avoid', 'neutral'];
/** (v4) 십신 10종 — 정확한 십신 풀 검증·선택용. */
const TEN_GODS: TenGod[] = [
  '비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인',
];
/** (v4) 지지 관계 4종 — segmentDayBranch 검증용. */
const BRANCH_RELATIONS: BranchRelation[] = ['he', 'chong', 'same', 'none'];

/** 밴드 문구 카테고리·밴드 목록(테스트·검증용). */
export const BANDED_ITEMS: BandedItem[] = ['overall', 'wealth', 'love', 'health'];
export const SCORE_BANDS: ScoreBand[] = ['low', 'mid', 'high'];

/** 모든 (relation × item) 상태키 목록(테스트·검증용). */
export const ALL_STATE_KEYS: StateKey[] = RELATIONS.flatMap((r) =>
  ITEMS.map((i): StateKey => `${r}:${i}`),
);

/** 상태키 조립 헬퍼. */
export function makeStateKey(relation: PhraseRelation, item: PhraseItem): StateKey {
  return `${relation}:${item}`;
}

// ─────────────────────────────────────────────────────────────
// 결정론적 선택
// ─────────────────────────────────────────────────────────────

/**
 * 상태키에 해당하는 후보 배열에서 시드로 1개를 결정론적으로 고른다.
 * 같은 (stateKey, seed) → 항상 같은 문구.
 *
 * @param stateKey `${relation}:${item}` 상태키.
 * @param seedValue engine.seed(birthDate, dateKey, salt)로 만든 32비트 시드.
 * @throws 상태키가 뱅크에 없거나 후보가 비어 있으면(데이터 무결성 위반).
 */
export function pickPhrase(stateKey: StateKey, seedValue: number): string {
  const candidates = BANK.phrases[stateKey];
  if (candidates == null || candidates.length === 0) {
    throw new Error(`phrases.pickPhrase: 상태키 후보 없음: "${stateKey}"`);
  }
  return candidates[seedIndex(seedValue, candidates.length)];
}

/**
 * 별점(1~5)을 밴드(low/mid/high)로 매핑한다. 범위 밖은 1~5로 clamp 후 판정.
 *  - 1~2 → low(조심·무리 금물)
 *  - 3   → mid(무난·균형)
 *  - 4~5 → high(흐름 좋음·적극)
 */
export function scoreBand(score: number): ScoreBand {
  const s = score < 1 ? 1 : score > 5 ? 5 : score;
  if (s <= 2) {
    return 'low';
  }
  if (s === 3) {
    return 'mid';
  }
  return 'high';
}

/**
 * 카테고리(총운/재물/애정/건강)의 별점 밴드 문구를 시드로 1개 결정론적으로 고른다.
 * 같은 (item, score, seed) → 항상 같은 문구.
 *
 * @param item      밴드 카테고리.
 * @param score     해당 항목 별점(1~5, 범위 밖은 clamp).
 * @param seedValue engine.seed(...)로 만든 32비트 시드.
 * @throws 해당 (item, band) 후보가 없거나 비어 있으면(데이터 무결성 위반).
 */
export function pickBandedPhrase(item: BandedItem, score: number, seedValue: number): string {
  const band = scoreBand(score);
  const candidates = BANK.banded?.[item]?.[band];
  if (candidates == null || candidates.length === 0) {
    throw new Error(`phrases.pickBandedPhrase: 밴드 후보 없음: "${item}:${band}"`);
  }
  return candidates[seedIndex(seedValue, candidates.length)];
}

/**
 * 카테고리 별점 밴드 문구를 사람·날짜·점수로 결정론적으로 고르는 편의 함수.
 * 같은 사람·같은 날·같은 점수 → 동일. 위젯 표시용.
 *
 * @param item      밴드 카테고리.
 * @param score     해당 항목 별점(1~5).
 * @param birthDate 생년월일 `YYYY-MM-DD`(시드용 사람 식별).
 * @param dateKey   오늘 날짜 `YYYY-MM-DD`(일일 회전).
 */
export function pickCategoryPhraseByScore(
  item: BandedItem,
  score: number,
  birthDate: string,
  dateKey: string,
): string {
  // item별로 salt를 달리해 같은 날에도 카테고리끼리 문구가 겹치지 않게 회전.
  const s = seed(birthDate, dateKey, `band|${item}`);
  return pickBandedPhrase(item, score, s);
}

/**
 * 오행별 "오늘의 일진" 교육 한 줄을 시드로 1개 고른다.
 * @throws 해당 오행 후보가 없으면.
 */
export function pickIljin(dayWuXing: WuXing, seedValue: number): string {
  const candidates = BANK.iljin[dayWuXing];
  if (candidates == null || candidates.length === 0) {
    throw new Error(`phrases.pickIljin: 오행 후보 없음: "${dayWuXing}"`);
  }
  return candidates[seedIndex(seedValue, candidates.length)];
}

// ─────────────────────────────────────────────────────────────
// 오늘 상세(서술·예측형) + 일기 회고(질문형) 선택자
//
// 오늘(홈 위젯) 문구는 서술·예측형, 일기 문구는 회고·질문형으로 풀을 분리한다.
// 빌더(fortune-today)는 직접 JSON을 읽지 않고 이 선택자를 통해 접근한다(기존 구조 일관).
// ─────────────────────────────────────────────────────────────

/**
 * 일간 오행×신강신약 성정/필요 조각을 시드로 1개 고른다(오늘 상세 — describeChart).
 * 사주는 고정이라 birthDate만 시드로 쓴다(날짜 무관, salt 'chart').
 *
 * @throws 해당 (오행, strength) 후보가 없거나 비어 있으면.
 */
export function pickChartTrait(
  dayWuXing: WuXing,
  strength: DayMasterStrength,
  birthDate: string,
): string {
  const candidates = BANK.chartTraits?.[dayWuXing]?.[strength];
  if (candidates == null || candidates.length === 0) {
    throw new Error(`phrases.pickChartTrait: 후보 없음: "${dayWuXing}:${strength}"`);
  }
  const s = seed(birthDate, '', `chart|${dayWuXing}|${strength}`);
  return candidates[seedIndex(s, candidates.length)];
}

/**
 * 시간대(part)×입장(stance) 한 줄을 시드로 1개 고른다(오늘 상세 — buildSegmentLine).
 * @throws 해당 (part, stance) 후보가 없거나 비어 있으면.
 */
export function pickSegmentPhrase(part: DayPart, stance: FortuneStance, seedValue: number): string {
  const candidates = BANK.segment?.[part]?.[stance];
  if (candidates == null || candidates.length === 0) {
    throw new Error(`phrases.pickSegmentPhrase: 후보 없음: "${part}:${stance}"`);
  }
  return candidates[seedIndex(seedValue, candidates.length)];
}

/**
 * (v4) 오늘 일진 지지 관계(합/충/同/무) 근거 조각을 시드로 1개 고른다(오늘 상세 — buildSegmentLine).
 * 'none'은 합/충/同 작용이 없는 담백한 날을 뜻한다.
 * @throws 해당 관계 후보가 없거나 비어 있으면.
 */
export function pickSegmentDayBranch(relation: BranchRelation, seedValue: number): string {
  const candidates = BANK.segmentDayBranch?.[relation];
  if (candidates == null || candidates.length === 0) {
    throw new Error(`phrases.pickSegmentDayBranch: 후보 없음: "${relation}"`);
  }
  return candidates[seedIndex(seedValue, candidates.length)];
}

/**
 * (v4) 월령 득령(true)/실령(false) 한 조각을 시드로 1개 고른다(오늘 상세 — describeChart).
 * 사주는 고정이라 birthDate만 시드로 쓴다.
 * @throws 후보가 없거나 비어 있으면.
 */
export function pickDeLing(deLing: boolean, birthDate: string): string {
  const key = deLing ? 'true' : 'false';
  const candidates = BANK.deLing?.[key];
  if (candidates == null || candidates.length === 0) {
    throw new Error(`phrases.pickDeLing: 후보 없음: "${key}"`);
  }
  const s = seed(birthDate, '', `deLing|${key}`);
  return candidates[seedIndex(s, candidates.length)];
}

/**
 * (v4) 신강/신약/중화별 희신 마무리 조각을 시드로 1개 고른다(오늘 상세 — describeChart).
 * 사주는 고정이라 birthDate만 시드로 쓴다.
 * @throws 후보가 없거나 비어 있으면.
 */
export function pickXiShen(strength: DayMasterStrength, birthDate: string): string {
  const candidates = BANK.xiShen?.[strength];
  if (candidates == null || candidates.length === 0) {
    throw new Error(`phrases.pickXiShen: 후보 없음: "${strength}"`);
  }
  const s = seed(birthDate, '', `xiShen|${strength}`);
  return candidates[seedIndex(s, candidates.length)];
}

/**
 * (v4) 정확한 십신(정/편) 한 줄 의미를 시드로 1개 고른다(오늘의 일진 노출·근거).
 * @throws 해당 십신 후보가 없거나 비어 있으면.
 */
export function pickTenGodMeaning(tenGod: TenGod, seedValue: number): string {
  const candidates = BANK.tenGodMeaning?.[tenGod];
  if (candidates == null || candidates.length === 0) {
    throw new Error(`phrases.pickTenGodMeaning: 후보 없음: "${tenGod}"`);
  }
  return candidates[seedIndex(seedValue, candidates.length)];
}

/**
 * 계열(group)별 "조심 영역" 한 줄을 시드로 1개 고른다(오늘 상세 — buildCautionLine).
 * @throws 해당 계열 후보가 없거나 비어 있으면.
 */
export function pickCautionArea(group: TenGodGroup, seedValue: number): string {
  const candidates = BANK.cautionArea?.[group];
  if (candidates == null || candidates.length === 0) {
    throw new Error(`phrases.pickCautionArea: 후보 없음: "${group}"`);
  }
  return candidates[seedIndex(seedValue, candidates.length)];
}

/**
 * (v4) 정확한 십신(정/편)별 조심 한 줄을 시드로 1개 고른다(오늘 상세 — buildCautionLine).
 * 계열뿐 아니라 정/편 뉘앙스(편재 vs 정재 등)를 살린다.
 * @throws 해당 십신 후보가 없거나 비어 있으면.
 */
export function pickCautionTenGod(tenGod: TenGod, seedValue: number): string {
  const candidates = BANK.cautionTenGod?.[tenGod];
  if (candidates == null || candidates.length === 0) {
    throw new Error(`phrases.pickCautionTenGod: 후보 없음: "${tenGod}"`);
  }
  return candidates[seedIndex(seedValue, candidates.length)];
}

/**
 * 충(沖) 주의 한 줄을 시드로 1개 고른다(오늘 상세 — buildCautionLine).
 * @throws 후보가 없거나 비어 있으면.
 */
export function pickCautionChong(seedValue: number): string {
  const candidates = BANK.cautionChong;
  if (candidates == null || candidates.length === 0) {
    throw new Error('phrases.pickCautionChong: 후보 없음');
  }
  return candidates[seedIndex(seedValue, candidates.length)];
}

/**
 * 계열(group)별 회고 요약(과거형)을 시드로 1개 고른다(일기 — buildReflectiveLines).
 * @throws 해당 계열 후보가 없거나 비어 있으면.
 */
export function pickReflectSummary(group: TenGodGroup, seedValue: number): string {
  const candidates = BANK.reflectSummary?.[group];
  if (candidates == null || candidates.length === 0) {
    throw new Error(`phrases.pickReflectSummary: 후보 없음: "${group}"`);
  }
  return candidates[seedIndex(seedValue, candidates.length)];
}

/**
 * (v4) 정확한 십신(정/편)별 회고 요약(과거형)을 시드로 1개 고른다(일기 — buildReflectiveLines).
 * 명령·약속 톤 없음 — 지난 일을 돌아보게 한다.
 * @throws 해당 십신 후보가 없거나 비어 있으면.
 */
export function pickReflectTenGod(tenGod: TenGod, seedValue: number): string {
  const candidates = BANK.reflectTenGod?.[tenGod];
  if (candidates == null || candidates.length === 0) {
    throw new Error(`phrases.pickReflectTenGod: 후보 없음: "${tenGod}"`);
  }
  return candidates[seedIndex(seedValue, candidates.length)];
}

/**
 * 회고 질문을 시드로 1개 고른다(일기 — buildReflectiveLines).
 * 계열 키(group)가 있으면 공용(common) + 그 계열 풀을 합쳐 고르고, 없으면 공용만.
 * @throws 합친 후보가 비어 있으면.
 */
export function pickReflectQuestion(seedValue: number, group?: TenGodGroup): string {
  const common = BANK.reflectQuestion?.common ?? [];
  const groupPool = group != null ? BANK.reflectQuestion?.[group] ?? [] : [];
  const candidates = [...common, ...groupPool];
  if (candidates.length === 0) {
    throw new Error('phrases.pickReflectQuestion: 후보 없음');
  }
  return candidates[seedIndex(seedValue, candidates.length)];
}

/**
 * 메이저 아르카나 22장에서 시드로 1장 + 정/역을 결정론적으로 고른다.
 * 카드 선택과 정/역 판정은 서로 다른 salt 시드를 써서 독립적으로 회전한다.
 *
 * @param birthDate 생년월일 `YYYY-MM-DD`.
 * @param dateKey   오늘 날짜 `YYYY-MM-DD`.
 */
export function pickTarot(birthDate: string, dateKey: string): TarotCard {
  const cardSeed = seed(birthDate, dateKey, 'tarot');
  const card = TAROT[seedIndex(cardSeed, TAROT.length)];

  const orientSeed = seed(birthDate, dateKey, 'tarot-orient');
  const reversed = orientSeed % 2 === 1;

  return {
    index: card.index,
    name: card.name,
    reversed,
    meaning: reversed ? card.reversed : card.upright,
  };
}

/**
 * 사용자가 펼친 카드 중 **고른 위치(pickedIndex)** 를 반영해 1장 + 정/역을 결정론적으로 고른다.
 * pickTarot과 달리 시드에 pickedIndex를 섞어, 어떤 자리를 고르냐에 따라 카드가 달라진다
 * (요청 #6 — "임의의 고정값"이 아니라 내 사주 + 내가 고른 자리로 결정). 같은 (사주·날짜·자리)면
 * 항상 같은 카드 → 그날 한 번 뽑으면 잠긴다(저장으로 유지).
 *
 * @param birthDate   생년월일 `YYYY-MM-DD`(사주 식별).
 * @param dateKey     오늘 날짜 `YYYY-MM-DD`(일일 회전, 새벽 5시 경계).
 * @param pickedIndex 사용자가 고른 카드 자리(0-based).
 */
export function pickTarotAt(birthDate: string, dateKey: string, pickedIndex: number): TarotCard {
  const salt = `tarot|pick${pickedIndex}`;
  const card = TAROT[seedIndex(seed(birthDate, dateKey, salt), TAROT.length)];
  const reversed = seed(birthDate, dateKey, `${salt}|orient`) % 2 === 1;
  return {
    index: card.index,
    name: card.name,
    reversed,
    meaning: reversed ? card.reversed : card.upright,
  };
}

// ─────────────────────────────────────────────────────────────
// engine 연결 (phraseProvider)
// ─────────────────────────────────────────────────────────────

/**
 * engine.buildFortune의 phraseProvider 콜백.
 * ctx(relation·dayWuXing·seed·date)를 받아 iljin·advice·tarot 문구를 결정론적으로 주입한다.
 *
 * @example
 *   const result = buildFortune(natal, day, birthDate, { phraseProvider });
 */
export function phraseProvider(ctx: FortunePhraseContext): {
  iljin: string;
  advice: string;
  tarot: TarotCard;
} {
  const iljin = pickIljin(ctx.dayWuXing, seed(`iljin|${ctx.dayWuXing}`, ctx.date, String(ctx.seed)));
  const advice = pickPhrase(makeStateKey(ctx.relation, 'advice'), ctx.seed);
  // 타로는 ctx.seed가 'phrase' salt 기준이라, date만 알면 birthDate를 역추론할 수 없으므로
  // ctx.seed 자체를 birthDate 자리에 넣어 결정론적 회전을 만든다(같은 사람·같은 날 동일).
  const tarot = pickTarot(String(ctx.seed), ctx.date);
  return { iljin, advice, tarot };
}

/**
 * engine 결과(FortuneResult)에 문구·타로를 직접 주입한다(phraseProvider를 못 쓴 결과 보강용).
 * buildFortune이 채워 둔 점수/색/방향은 보존하고, iljin/advice/tarot만 시드로 채운다.
 *
 * @param result    engine.buildFortune 결과(문구가 비어 있을 수 있음).
 * @param birthDate 생년월일 `YYYY-MM-DD`(시드용).
 * @param relation  십신 계열(상태키 relation).
 * @param dayWuXing 일간 오행.
 */
export function attachPhrases(
  result: FortuneResult,
  birthDate: string,
  relation: PhraseRelation,
  dayWuXing: WuXing,
): FortuneResult {
  const phraseSeed = seed(birthDate, result.date, 'phrase');
  const iljinSeed = seed(`iljin|${dayWuXing}`, result.date, String(phraseSeed));
  return {
    ...result,
    iljin: pickIljin(dayWuXing, iljinSeed),
    advice: pickPhrase(makeStateKey(relation, 'advice'), phraseSeed),
    tarot: pickTarot(birthDate, result.date),
  };
}

/**
 * 한 카테고리(총운/재물/애정/건강) 문구를 시드로 고르는 편의 함수.
 * 위젯 표시용 — 같은 사람·같은 날 동일.
 */
export function pickCategoryPhrase(
  relation: PhraseRelation,
  item: PhraseItem,
  birthDate: string,
  dateKey: string,
): string {
  // item별로 salt를 달리해 같은 날에도 항목끼리 문구가 겹치지 않게 회전.
  const s = seed(birthDate, dateKey, `phrase|${item}`);
  return pickPhrase(makeStateKey(relation, item), s);
}

// ─────────────────────────────────────────────────────────────
// 데이터 무결성 (테스트·런타임 점검용)
// ─────────────────────────────────────────────────────────────

/** validateBank 최소 후보 기준(깊이 확장 후 상향). */
export const MIN_PHRASE_CANDIDATES = 8;
export const MIN_ILJIN_CANDIDATES = 10;
export const MIN_BANDED_CANDIDATES = 6;
/** detail 섹션(오늘 상세 + 일기 회고) 최소 후보 기준. */
export const MIN_CHART_TRAIT_CANDIDATES = 4;
export const MIN_SEGMENT_CANDIDATES = 4;
export const MIN_CAUTION_AREA_CANDIDATES = 4;
export const MIN_CAUTION_CHONG_CANDIDATES = 4;
export const MIN_REFLECT_SUMMARY_CANDIDATES = 4;
export const MIN_REFLECT_QUESTION_CANDIDATES = 6;
/** (v4) 전문가 풀 최소 후보 기준. */
export const MIN_SEGMENT_DAY_BRANCH_CANDIDATES = 4;
export const MIN_DELING_CANDIDATES = 4;
export const MIN_XI_SHEN_CANDIDATES = 4;
export const MIN_TEN_GOD_MEANING_CANDIDATES = 4;
export const MIN_CAUTION_TEN_GOD_CANDIDATES = 4;
export const MIN_REFLECT_TEN_GOD_CANDIDATES = 4;

/**
 * 문구뱅크가 스키마를 만족하는지 검증.
 *  - 상태키 ≥8, 일진 ≥10, banded 각 밴드 ≥6, 타로 22장
 *  - chartTraits 각 (오행×strength) ≥4, segment 각 (part×stance) ≥4,
 *    cautionArea 각 계열 ≥4, cautionChong ≥4, reflectSummary 각 계열 ≥4,
 *    reflectQuestion.common ≥6 + 각 계열 키 존재.
 *  - (v4) segmentDayBranch 각 ≥4, deLing 각 ≥4, xiShen 각 ≥4,
 *    tenGodMeaning·cautionTenGod·reflectTenGod 각 십신 ≥4.
 *
 * @param minPhrases 상태키 후보 최소(기본 8, 하위호환 위해 인자로 낮출 수 있음).
 * @param minIljin   일진 후보 최소(기본 10).
 * @param minBanded  밴드 후보 최소(기본 6).
 */
export function validateBank(
  minPhrases = MIN_PHRASE_CANDIDATES,
  minIljin = MIN_ILJIN_CANDIDATES,
  minBanded = MIN_BANDED_CANDIDATES,
): {
  ok: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  for (const key of ALL_STATE_KEYS) {
    const arr = BANK.phrases[key];
    if (arr == null) {
      errors.push(`누락된 상태키: ${key}`);
    } else if (arr.length < minPhrases) {
      errors.push(`후보 부족(${arr.length}<${minPhrases}): ${key}`);
    }
  }

  for (const wx of WU_XINGS) {
    const arr = BANK.iljin[wx];
    if (arr == null) {
      errors.push(`누락된 일진 오행: ${wx}`);
    } else if (arr.length < minIljin) {
      errors.push(`일진 후보 부족(${arr.length}<${minIljin}): ${wx}`);
    }
  }

  for (const item of BANDED_ITEMS) {
    for (const band of SCORE_BANDS) {
      const arr = BANK.banded?.[item]?.[band];
      if (arr == null) {
        errors.push(`누락된 밴드: ${item}:${band}`);
      } else if (arr.length < minBanded) {
        errors.push(`밴드 후보 부족(${arr.length}<${minBanded}): ${item}:${band}`);
      }
    }
  }

  // chartTraits — 오행 × strength
  for (const wx of WU_XINGS) {
    for (const strength of STRENGTHS) {
      const arr = BANK.chartTraits?.[wx]?.[strength];
      if (arr == null) {
        errors.push(`누락된 chartTraits: ${wx}:${strength}`);
      } else if (arr.length < MIN_CHART_TRAIT_CANDIDATES) {
        errors.push(`chartTraits 후보 부족(${arr.length}<${MIN_CHART_TRAIT_CANDIDATES}): ${wx}:${strength}`);
      }
    }
  }

  // segment — part × stance
  for (const part of DAY_PARTS) {
    for (const stance of STANCES) {
      const arr = BANK.segment?.[part]?.[stance];
      if (arr == null) {
        errors.push(`누락된 segment: ${part}:${stance}`);
      } else if (arr.length < MIN_SEGMENT_CANDIDATES) {
        errors.push(`segment 후보 부족(${arr.length}<${MIN_SEGMENT_CANDIDATES}): ${part}:${stance}`);
      }
    }
  }

  // cautionArea — 계열별
  for (const group of RELATIONS) {
    const arr = BANK.cautionArea?.[group];
    if (arr == null) {
      errors.push(`누락된 cautionArea: ${group}`);
    } else if (arr.length < MIN_CAUTION_AREA_CANDIDATES) {
      errors.push(`cautionArea 후보 부족(${arr.length}<${MIN_CAUTION_AREA_CANDIDATES}): ${group}`);
    }
  }

  // cautionChong
  const chong = BANK.cautionChong;
  if (chong == null) {
    errors.push('누락된 cautionChong');
  } else if (chong.length < MIN_CAUTION_CHONG_CANDIDATES) {
    errors.push(`cautionChong 후보 부족(${chong.length}<${MIN_CAUTION_CHONG_CANDIDATES})`);
  }

  // reflectSummary — 계열별
  for (const group of RELATIONS) {
    const arr = BANK.reflectSummary?.[group];
    if (arr == null) {
      errors.push(`누락된 reflectSummary: ${group}`);
    } else if (arr.length < MIN_REFLECT_SUMMARY_CANDIDATES) {
      errors.push(`reflectSummary 후보 부족(${arr.length}<${MIN_REFLECT_SUMMARY_CANDIDATES}): ${group}`);
    }
  }

  // reflectQuestion — common ≥6 + 각 계열 키 존재(비어있지 않음)
  const rqCommon = BANK.reflectQuestion?.common;
  if (rqCommon == null) {
    errors.push('누락된 reflectQuestion.common');
  } else if (rqCommon.length < MIN_REFLECT_QUESTION_CANDIDATES) {
    errors.push(`reflectQuestion.common 후보 부족(${rqCommon.length}<${MIN_REFLECT_QUESTION_CANDIDATES})`);
  }
  for (const group of RELATIONS) {
    const arr = BANK.reflectQuestion?.[group];
    if (arr == null || arr.length === 0) {
      errors.push(`누락된 reflectQuestion 계열: ${group}`);
    }
  }

  // (v4) segmentDayBranch — 합/충/同/무 각 ≥4
  for (const rel of BRANCH_RELATIONS) {
    const arr = BANK.segmentDayBranch?.[rel];
    if (arr == null) {
      errors.push(`누락된 segmentDayBranch: ${rel}`);
    } else if (arr.length < MIN_SEGMENT_DAY_BRANCH_CANDIDATES) {
      errors.push(`segmentDayBranch 후보 부족(${arr.length}<${MIN_SEGMENT_DAY_BRANCH_CANDIDATES}): ${rel}`);
    }
  }

  // (v4) deLing — true/false 각 ≥4
  for (const key of ['true', 'false'] as const) {
    const arr = BANK.deLing?.[key];
    if (arr == null) {
      errors.push(`누락된 deLing: ${key}`);
    } else if (arr.length < MIN_DELING_CANDIDATES) {
      errors.push(`deLing 후보 부족(${arr.length}<${MIN_DELING_CANDIDATES}): ${key}`);
    }
  }

  // (v4) xiShen — strength 3종 각 ≥4
  for (const strength of STRENGTHS) {
    const arr = BANK.xiShen?.[strength];
    if (arr == null) {
      errors.push(`누락된 xiShen: ${strength}`);
    } else if (arr.length < MIN_XI_SHEN_CANDIDATES) {
      errors.push(`xiShen 후보 부족(${arr.length}<${MIN_XI_SHEN_CANDIDATES}): ${strength}`);
    }
  }

  // (v4) tenGodMeaning / cautionTenGod / reflectTenGod — 십신 10종 각 ≥4
  for (const tg of TEN_GODS) {
    const meaning = BANK.tenGodMeaning?.[tg];
    if (meaning == null) {
      errors.push(`누락된 tenGodMeaning: ${tg}`);
    } else if (meaning.length < MIN_TEN_GOD_MEANING_CANDIDATES) {
      errors.push(`tenGodMeaning 후보 부족(${meaning.length}<${MIN_TEN_GOD_MEANING_CANDIDATES}): ${tg}`);
    }
    const caution = BANK.cautionTenGod?.[tg];
    if (caution == null) {
      errors.push(`누락된 cautionTenGod: ${tg}`);
    } else if (caution.length < MIN_CAUTION_TEN_GOD_CANDIDATES) {
      errors.push(`cautionTenGod 후보 부족(${caution.length}<${MIN_CAUTION_TEN_GOD_CANDIDATES}): ${tg}`);
    }
    const reflect = BANK.reflectTenGod?.[tg];
    if (reflect == null) {
      errors.push(`누락된 reflectTenGod: ${tg}`);
    } else if (reflect.length < MIN_REFLECT_TEN_GOD_CANDIDATES) {
      errors.push(`reflectTenGod 후보 부족(${reflect.length}<${MIN_REFLECT_TEN_GOD_CANDIDATES}): ${tg}`);
    }
  }

  if (TAROT.length !== 22) {
    errors.push(`타로 장수 오류: ${TAROT.length} (22 기대)`);
  }

  return { ok: errors.length === 0, errors };
}
