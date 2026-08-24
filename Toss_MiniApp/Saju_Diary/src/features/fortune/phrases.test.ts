import { describe, expect, it } from 'vitest';
import type { FortuneResult } from '../../types';
import { buildFortune, seed } from './engine';
import type { DayGanZhi, NatalChart } from '../../types';
import {
  ALL_STATE_KEYS,
  BANDED_ITEMS,
  SCORE_BANDS,
  attachPhrases,
  makeStateKey,
  phraseProvider,
  pickBandedPhrase,
  pickCategoryPhrase,
  pickCategoryPhraseByScore,
  pickCautionArea,
  pickCautionChong,
  pickCautionTenGod,
  pickChartTrait,
  pickDeLing,
  pickIljin,
  pickPhrase,
  pickReflectQuestion,
  pickReflectSummary,
  pickReflectTenGod,
  pickSegmentDayBranch,
  pickSegmentPhrase,
  pickTarot,
  pickTarotAt,
  pickTenGodMeaning,
  pickXiShen,
  scoreBand,
  validateBank,
} from './phrases';
import type { BandedItem, ScoreBand } from './phrases';
import type {
  BranchRelation,
  DayMasterStrength,
  DayPart,
  FortuneStance,
  TenGod,
  TenGodGroup,
  WuXing,
} from '../../types';
import phraseBank from '../../../data/fortune-phrases.json';
import tarotBank from '../../../data/tarot.json';

// 이 테스트는 문구뱅크 데이터 무결성 + 결정론적 선택(시드)을 검증한다.
// 런타임 외부 호출 0(정적 JSON만), 같은 시드→동일 문구, 날짜 회전 시 변동.

const PHRASES = (phraseBank as { phrases: Record<string, string[]> }).phrases;
const ILJIN = (phraseBank as { iljin: Record<string, string[]> }).iljin;
const BANDED = (phraseBank as {
  banded: Record<string, Record<string, string[]>>;
}).banded;
const TAROT = (tarotBank as { cards: { index: number; name: string; upright: string; reversed: string }[] }).cards;

const CHART_TRAITS = (phraseBank as {
  chartTraits: Record<string, Record<string, string[]>>;
}).chartTraits;
const SEGMENT = (phraseBank as {
  segment: Record<string, Record<string, string[]>>;
}).segment;
const CAUTION_AREA = (phraseBank as { cautionArea: Record<string, string[]> }).cautionArea;
const CAUTION_CHONG = (phraseBank as { cautionChong: string[] }).cautionChong;
const REFLECT_SUMMARY = (phraseBank as { reflectSummary: Record<string, string[]> }).reflectSummary;
const REFLECT_QUESTION = (phraseBank as { reflectQuestion: Record<string, string[]> }).reflectQuestion;

// (v4) 전문가 풀.
const SEGMENT_DAY_BRANCH = (phraseBank as { segmentDayBranch: Record<string, string[]> }).segmentDayBranch;
const DELING = (phraseBank as { deLing: Record<string, string[]> }).deLing;
const XI_SHEN = (phraseBank as { xiShen: Record<string, string[]> }).xiShen;
const TEN_GOD_MEANING = (phraseBank as { tenGodMeaning: Record<string, string[]> }).tenGodMeaning;
const CAUTION_TEN_GOD = (phraseBank as { cautionTenGod: Record<string, string[]> }).cautionTenGod;
const REFLECT_TEN_GOD = (phraseBank as { reflectTenGod: Record<string, string[]> }).reflectTenGod;

const WX: WuXing[] = ['木', '火', '土', '金', '水'];
const STRENGTHS: DayMasterStrength[] = ['strong', 'weak', 'balanced'];
const PARTS: DayPart[] = ['morning', 'day', 'evening', 'night'];
const STANCES: FortuneStance[] = ['favor', 'avoid', 'neutral'];
const GROUPS: TenGodGroup[] = ['비겁', '식상', '재성', '관성', '인성'];
const TEN_GODS: TenGod[] = ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인'];
const BRANCH_RELATIONS: BranchRelation[] = ['he', 'chong', 'same', 'none'];

// 단정 예언/공포/운명확정 금지(CRITICAL #3) — 풀에 등장하면 안 되는 단어들.
const FORBIDDEN_TOKENS = ['반드시', '절대', '죽', '망한', '불행', '저주', '재앙', '운명이 정해'];

// ─────────────────────────────────────────────────────────────
// 데이터 무결성 — 누락 없음 / 후보 ≥4 / 타로 22장
// ─────────────────────────────────────────────────────────────

describe('데이터 무결성', () => {
  it('validateBank가 통과한다(상태키 ≥8, 일진 ≥10, 밴드 ≥6, 타로 22장)', () => {
    const r = validateBank();
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it('모든 상태키(25개)에 후보가 ≥8개 존재', () => {
    expect(ALL_STATE_KEYS).toHaveLength(25);
    for (const key of ALL_STATE_KEYS) {
      expect(PHRASES[key], `상태키 누락: ${key}`).toBeDefined();
      expect(PHRASES[key].length, `후보 부족: ${key}`).toBeGreaterThanOrEqual(8);
    }
  });

  it('상태키 후보에 중복 문구가 없다', () => {
    for (const key of ALL_STATE_KEYS) {
      const arr = PHRASES[key];
      expect(new Set(arr).size, `중복 문구: ${key}`).toBe(arr.length);
    }
  });

  it('모든 상태키 후보 문구는 비어있지 않은 문자열', () => {
    for (const key of ALL_STATE_KEYS) {
      for (const phrase of PHRASES[key]) {
        expect(typeof phrase).toBe('string');
        expect(phrase.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('phrases에는 정의된 상태키 외 잉여 키가 없다', () => {
    const known = new Set<string>(ALL_STATE_KEYS);
    for (const key of Object.keys(PHRASES)) {
      expect(known.has(key), `정의되지 않은 상태키: ${key}`).toBe(true);
    }
    expect(Object.keys(PHRASES)).toHaveLength(25);
  });

  it('5개 오행 모두 일진 후보 ≥10개', () => {
    for (const wx of ['木', '火', '土', '金', '水']) {
      expect(ILJIN[wx], `일진 누락: ${wx}`).toBeDefined();
      expect(ILJIN[wx].length).toBeGreaterThanOrEqual(10);
    }
  });

  it('밴드(overall/wealth/love/health × low/mid/high) 각 ≥6개 + 비어있지 않은 문자열', () => {
    for (const item of BANDED_ITEMS) {
      expect(BANDED[item], `밴드 카테고리 누락: ${item}`).toBeDefined();
      for (const band of SCORE_BANDS) {
        const arr = BANDED[item][band];
        expect(arr, `밴드 누락: ${item}:${band}`).toBeDefined();
        expect(arr.length, `밴드 후보 부족: ${item}:${band}`).toBeGreaterThanOrEqual(6);
        for (const phrase of arr) {
          expect(typeof phrase).toBe('string');
          expect(phrase.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('타로는 정확히 22장이고 index 0~21이 유일하다', () => {
    expect(TAROT).toHaveLength(22);
    const indices = TAROT.map((c) => c.index).sort((a, b) => a - b);
    expect(indices).toEqual(Array.from({ length: 22 }, (_, i) => i));
  });

  it('타로 각 장은 정·역 텍스트와 이름을 모두 갖는다', () => {
    for (const c of TAROT) {
      expect(c.name.trim().length).toBeGreaterThan(0);
      expect(c.upright.trim().length).toBeGreaterThan(0);
      expect(c.reversed.trim().length).toBeGreaterThan(0);
      expect(c.upright).not.toBe(c.reversed);
    }
  });
});

// ─────────────────────────────────────────────────────────────
// pickPhrase — 결정론 / 시드 회전
// ─────────────────────────────────────────────────────────────

describe('pickPhrase 결정론', () => {
  it('같은 (stateKey, seed) → 같은 문구', () => {
    const s = seed('1990-03-15', '2026-06-14', 'phrase');
    const a = pickPhrase(makeStateKey('재성', 'overall'), s);
    const b = pickPhrase(makeStateKey('재성', 'overall'), s);
    expect(a).toBe(b);
    expect(PHRASES['재성:overall']).toContain(a);
  });

  it('시드가 다르면(날짜 회전) 후보 범위가 바뀐다(전체적으로 변동)', () => {
    const key = makeStateKey('관성', 'overall');
    const picks = new Set<string>();
    for (let d = 1; d <= 28; d += 1) {
      const dateKey = `2026-06-${String(d).padStart(2, '0')}`;
      picks.add(pickPhrase(key, seed('1990-03-15', dateKey, 'phrase')));
    }
    // 28일간 회전하면 후보 5개 중 1개만 고정되는 일은 없다(변동 존재).
    expect(picks.size).toBeGreaterThan(1);
  });

  it('없는 상태키는 throw', () => {
    expect(() => pickPhrase('없음:overall' as never, 1)).toThrow();
  });
});

// ─────────────────────────────────────────────────────────────
// pickIljin — 결정론
// ─────────────────────────────────────────────────────────────

describe('pickIljin 결정론', () => {
  it('같은 (오행, seed) → 같은 일진 문구', () => {
    const s = seed('1990-03-15', '2026-06-14', 'iljin');
    expect(pickIljin('火', s)).toBe(pickIljin('火', s));
    expect(ILJIN['火']).toContain(pickIljin('火', s));
  });
});

// ─────────────────────────────────────────────────────────────
// pickTarot — 결정론 / 정역 / 날짜 회전
// ─────────────────────────────────────────────────────────────

describe('pickTarot 결정론', () => {
  it('같은 (birthDate, dateKey) → 같은 카드·정역', () => {
    const a = pickTarot('1990-03-15', '2026-06-14');
    const b = pickTarot('1990-03-15', '2026-06-14');
    expect(a).toEqual(b);
    expect(a.index).toBeGreaterThanOrEqual(0);
    expect(a.index).toBeLessThanOrEqual(21);
    expect(typeof a.reversed).toBe('boolean');
    expect(a.meaning.trim().length).toBeGreaterThan(0);
  });

  it('meaning은 정/역 방향 텍스트와 일치한다', () => {
    const c = pickTarot('1985-12-01', '2026-01-01');
    const src = TAROT.find((t) => t.index === c.index)!;
    expect(c.meaning).toBe(c.reversed ? src.reversed : src.upright);
  });

  it('날짜가 바뀌면 카드 분포가 변동한다', () => {
    const cards = new Set<number>();
    for (let d = 1; d <= 28; d += 1) {
      const dateKey = `2026-06-${String(d).padStart(2, '0')}`;
      cards.add(pickTarot('1990-03-15', dateKey).index);
    }
    expect(cards.size).toBeGreaterThan(1);
  });
});

describe('pickTarotAt (고른 자리 반영)', () => {
  it('같은 (사주·날짜·자리) → 같은 카드(결정론, Math.random 0)', () => {
    const a = pickTarotAt('1990-03-15', '2026-06-17', 2);
    const b = pickTarotAt('1990-03-15', '2026-06-17', 2);
    expect(a).toEqual(b);
    expect(a.index).toBeGreaterThanOrEqual(0);
    expect(a.index).toBeLessThanOrEqual(21);
    expect(a.meaning.trim().length).toBeGreaterThan(0);
  });

  it('고른 자리가 다르면 적어도 한 자리는 다른 카드가 나온다(임의 고정값 아님, #6)', () => {
    const indices = [0, 1, 2, 3, 4].map((i) => pickTarotAt('1990-03-15', '2026-06-17', i).index);
    expect(new Set(indices).size).toBeGreaterThan(1);
  });

  it('meaning은 정/역 방향 텍스트와 일치한다', () => {
    const c = pickTarotAt('1985-12-01', '2026-01-01', 3);
    const src = TAROT.find((t) => t.index === c.index)!;
    expect(c.meaning).toBe(c.reversed ? src.reversed : src.upright);
  });
});

// ─────────────────────────────────────────────────────────────
// pickCategoryPhrase — 카테고리별 회전
// ─────────────────────────────────────────────────────────────

describe('pickCategoryPhrase', () => {
  it('같은 입력 → 동일 / 카테고리는 해당 상태키 후보 내', () => {
    const w = pickCategoryPhrase('재성', 'wealth', '1990-03-15', '2026-06-14');
    expect(w).toBe(pickCategoryPhrase('재성', 'wealth', '1990-03-15', '2026-06-14'));
    expect(PHRASES['재성:wealth']).toContain(w);
  });
});

// ─────────────────────────────────────────────────────────────
// scoreBand — 경계 / clamp
// ─────────────────────────────────────────────────────────────

describe('scoreBand', () => {
  it('1·2 → low, 3 → mid, 4·5 → high', () => {
    expect(scoreBand(1)).toBe('low');
    expect(scoreBand(2)).toBe('low');
    expect(scoreBand(3)).toBe('mid');
    expect(scoreBand(4)).toBe('high');
    expect(scoreBand(5)).toBe('high');
  });

  it('범위 밖은 clamp(≤0→low, ≥6→high)', () => {
    expect(scoreBand(0)).toBe('low');
    expect(scoreBand(-3)).toBe('low');
    expect(scoreBand(6)).toBe('high');
    expect(scoreBand(99)).toBe('high');
  });
});

// ─────────────────────────────────────────────────────────────
// pickBandedPhrase — 결정론 / 모든 item×band 비어있지 않음
// ─────────────────────────────────────────────────────────────

describe('pickBandedPhrase 결정론', () => {
  it('같은 (item, score, seed) → 같은 문구이고 해당 밴드 후보 내', () => {
    const s = seed('1990-03-15', '2026-06-14', 'band|overall');
    const a = pickBandedPhrase('overall', 4, s);
    const b = pickBandedPhrase('overall', 4, s);
    expect(a).toBe(b);
    expect(BANDED.overall.high).toContain(a);
  });

  it('점수에 맞는 밴드 후보에서 고른다(low/mid/high)', () => {
    const s = seed('1985-12-01', '2026-01-01', 'band|wealth');
    expect(BANDED.wealth.low).toContain(pickBandedPhrase('wealth', 1, s));
    expect(BANDED.wealth.mid).toContain(pickBandedPhrase('wealth', 3, s));
    expect(BANDED.wealth.high).toContain(pickBandedPhrase('wealth', 5, s));
  });

  it('모든 (item × band)에서 비어있지 않은 문구를 고른다', () => {
    const scoreByBand: Record<ScoreBand, number> = { low: 1, mid: 3, high: 5 };
    for (const item of BANDED_ITEMS) {
      for (const band of SCORE_BANDS) {
        const picked = pickBandedPhrase(
          item as BandedItem,
          scoreByBand[band as ScoreBand],
          12345,
        );
        expect(picked.trim().length, `${item}:${band}`).toBeGreaterThan(0);
        expect(BANDED[item][band]).toContain(picked);
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────
// pickCategoryPhraseByScore — 사람·날짜·점수 결정론
// ─────────────────────────────────────────────────────────────

describe('pickCategoryPhraseByScore', () => {
  it('같은 (item, score, 사람, 날) → 동일하고 해당 밴드 후보 내', () => {
    const a = pickCategoryPhraseByScore('love', 5, '1990-03-15', '2026-06-14');
    const b = pickCategoryPhraseByScore('love', 5, '1990-03-15', '2026-06-14');
    expect(a).toBe(b);
    expect(BANDED.love.high).toContain(a);
  });

  it('점수가 밴드를 넘으면 다른 밴드에서 고른다', () => {
    const low = pickCategoryPhraseByScore('health', 1, '1990-03-15', '2026-06-14');
    const high = pickCategoryPhraseByScore('health', 5, '1990-03-15', '2026-06-14');
    expect(BANDED.health.low).toContain(low);
    expect(BANDED.health.high).toContain(high);
  });

  it('날짜가 바뀌면 문구 분포가 변동한다', () => {
    const picks = new Set<string>();
    for (let d = 1; d <= 28; d += 1) {
      const dk = `2026-06-${String(d).padStart(2, '0')}`;
      picks.add(pickCategoryPhraseByScore('overall', 4, '1990-03-15', dk));
    }
    expect(picks.size).toBeGreaterThan(1);
  });
});

// ─────────────────────────────────────────────────────────────
// phraseProvider / attachPhrases — engine 연결 결정론
// ─────────────────────────────────────────────────────────────

// 엔진 격리용 만세력 픽스처(manse 출력 형태를 직접 구성).
const NATAL: NatalChart = {
  year: { gan: '庚', zhi: '午', ganZhi: '庚午' },
  month: { gan: '己', zhi: '卯', ganZhi: '己卯' },
  day: { gan: '甲', zhi: '子', ganZhi: '甲子' },
  dayGan: '甲',
  dayWuXing: '木',
  tenGods: ['편관', '정재', null],
};

function dayOf(date: string, gan: string, zhi: string): DayGanZhi {
  return {
    date,
    pillar: { gan, zhi, ganZhi: `${gan}${zhi}` },
    ganWuXing: '火',
    zhiWuXing: '火',
    caiDirection: '동남',
    xiDirection: '동북',
  };
}

describe('phraseProvider + buildFortune 결정론', () => {
  it('phraseProvider 주입 시 iljin/advice/tarot가 채워진다', () => {
    const day = dayOf('2026-06-14', '丙', '午');
    const result = buildFortune(NATAL, day, '1990-03-15', { phraseProvider });
    expect(result.iljin.trim().length).toBeGreaterThan(0);
    expect(result.advice.trim().length).toBeGreaterThan(0);
    expect(result.tarot).toBeDefined();
    expect(result.tarot!.meaning.trim().length).toBeGreaterThan(0);
  });

  it('같은 입력 → 동일 결과(deep equal), 다른 날 → 변동', () => {
    const day1 = dayOf('2026-06-14', '丙', '午');
    const r1a = buildFortune(NATAL, day1, '1990-03-15', { phraseProvider });
    const r1b = buildFortune(NATAL, day1, '1990-03-15', { phraseProvider });
    expect(r1a).toEqual(r1b);

    // 다른 날짜로 여러 번 굴리면 iljin/advice 중 하나라도 변한다.
    const variants = new Set<string>();
    for (let d = 1; d <= 28; d += 1) {
      const dk = `2026-06-${String(d).padStart(2, '0')}`;
      const r = buildFortune(NATAL, dayOf(dk, '丙', '午'), '1990-03-15', { phraseProvider });
      variants.add(`${r.iljin}|${r.advice}|${r.tarot!.index}|${r.tarot!.reversed}`);
    }
    expect(variants.size).toBeGreaterThan(1);
  });
});

describe('attachPhrases', () => {
  it('점수/색/방향은 보존하고 문구만 시드로 채운다', () => {
    const day = dayOf('2026-06-14', '丙', '午');
    const base: FortuneResult = buildFortune(NATAL, day, '1990-03-15'); // phrase 미주입(빈 문구)
    expect(base.iljin).toBe('');

    const filled = attachPhrases(base, '1990-03-15', '재성', '木');
    expect(filled.overall).toBe(base.overall);
    expect(filled.scores).toEqual(base.scores);
    expect(filled.luckyColor).toBe(base.luckyColor);
    expect(filled.luckyDirection).toBe(base.luckyDirection);
    expect(filled.iljin.trim().length).toBeGreaterThan(0);
    expect(filled.advice.trim().length).toBeGreaterThan(0);
    expect(filled.tarot).toBeDefined();

    // 결정론: 동일 호출 동일 결과.
    expect(attachPhrases(base, '1990-03-15', '재성', '木')).toEqual(filled);
  });
});

// ─────────────────────────────────────────────────────────────
// detail 섹션 데이터 무결성 (chartTraits/segment/cautionArea/cautionChong/reflect*)
// ─────────────────────────────────────────────────────────────

describe('detail 섹션 데이터 무결성', () => {
  it('chartTraits: 오행×strength 각 ≥4, 비어있지 않은 문자열, 중복 없음', () => {
    for (const wx of WX) {
      for (const st of STRENGTHS) {
        const arr = CHART_TRAITS[wx]?.[st];
        expect(arr, `chartTraits 누락: ${wx}:${st}`).toBeDefined();
        expect(arr.length, `${wx}:${st}`).toBeGreaterThanOrEqual(4);
        expect(new Set(arr).size, `중복: ${wx}:${st}`).toBe(arr.length);
        for (const p of arr) {
          expect(p.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('segment: part×stance 각 ≥4, 비어있지 않은 문자열, 중복 없음', () => {
    for (const part of PARTS) {
      for (const stance of STANCES) {
        const arr = SEGMENT[part]?.[stance];
        expect(arr, `segment 누락: ${part}:${stance}`).toBeDefined();
        expect(arr.length, `${part}:${stance}`).toBeGreaterThanOrEqual(4);
        expect(new Set(arr).size, `중복: ${part}:${stance}`).toBe(arr.length);
        for (const p of arr) {
          expect(p.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('cautionArea: 계열 각 ≥4 / cautionChong ≥4 / 비어있지 않음', () => {
    for (const g of GROUPS) {
      expect(CAUTION_AREA[g], `cautionArea 누락: ${g}`).toBeDefined();
      expect(CAUTION_AREA[g].length).toBeGreaterThanOrEqual(4);
    }
    expect(CAUTION_CHONG.length).toBeGreaterThanOrEqual(4);
  });

  it('reflectSummary: 계열 각 ≥4 / reflectQuestion.common ≥6 + 각 계열 키 존재', () => {
    for (const g of GROUPS) {
      expect(REFLECT_SUMMARY[g], `reflectSummary 누락: ${g}`).toBeDefined();
      expect(REFLECT_SUMMARY[g].length).toBeGreaterThanOrEqual(4);
      expect(REFLECT_QUESTION[g], `reflectQuestion 계열 누락: ${g}`).toBeDefined();
      expect(REFLECT_QUESTION[g].length).toBeGreaterThan(0);
    }
    expect(REFLECT_QUESTION.common.length).toBeGreaterThanOrEqual(6);
  });

  it('모든 detail 풀에 해요체 한 줄(줄바꿈 없음)과 금지어 없음(단정 예언/공포 금지)', () => {
    const pools: string[][] = [
      ...WX.flatMap((wx) => STRENGTHS.map((st) => CHART_TRAITS[wx][st])),
      ...PARTS.flatMap((p) => STANCES.map((s) => SEGMENT[p][s])),
      ...GROUPS.map((g) => CAUTION_AREA[g]),
      CAUTION_CHONG,
      ...GROUPS.map((g) => REFLECT_SUMMARY[g]),
      ...Object.values(REFLECT_QUESTION),
      // (v4) 전문가 풀
      ...BRANCH_RELATIONS.map((r) => SEGMENT_DAY_BRANCH[r]),
      ...['true', 'false'].map((k) => DELING[k]),
      ...STRENGTHS.map((st) => XI_SHEN[st]),
      ...TEN_GODS.map((g) => TEN_GOD_MEANING[g]),
      ...TEN_GODS.map((g) => CAUTION_TEN_GOD[g]),
      ...TEN_GODS.map((g) => REFLECT_TEN_GOD[g]),
    ];
    for (const pool of pools) {
      for (const phrase of pool) {
        expect(phrase.includes('\n'), `줄바꿈 포함: ${phrase}`).toBe(false);
        for (const bad of FORBIDDEN_TOKENS) {
          expect(phrase.includes(bad), `금지어 "${bad}": ${phrase}`).toBe(false);
        }
      }
    }
  });

  it('일기 회고(reflectSummary/TenGod/Question)에는 명령·약속 톤(~해줘요/~하세요/~보세요)이 없다', () => {
    const diaryPools: string[][] = [
      ...GROUPS.map((g) => REFLECT_SUMMARY[g]),
      ...TEN_GODS.map((g) => REFLECT_TEN_GOD[g]),
      ...Object.values(REFLECT_QUESTION),
    ];
    for (const pool of diaryPools) {
      for (const phrase of pool) {
        expect(phrase.includes('해줘요'), `약속 톤: ${phrase}`).toBe(false);
        expect(phrase.includes('하세요'), `명령 톤: ${phrase}`).toBe(false);
        expect(phrase.includes('보세요'), `명령 톤: ${phrase}`).toBe(false);
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────
// validateBank — 새 섹션(detail)을 검증한다
// ─────────────────────────────────────────────────────────────

describe('validateBank — detail 섹션 검증', () => {
  it('validateBank가 새 섹션(v4 포함)까지 통과한다', () => {
    const r = validateBank();
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it('후보 기준을 과하게 올리면 실패한다(부족 검출이 동작함)', () => {
    // 어떤 풀도 999개를 넘지 못하므로 errors가 쌓이고 ok=false가 된다(검출기 자체 검증).
    const r = validateBank(999, 999, 999);
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────
// detail 선택자 — 결정론 / 범위
// ─────────────────────────────────────────────────────────────

describe('pickChartTrait 결정론', () => {
  it('같은 (오행, strength, birthDate) → 같은 문구이고 해당 풀 내', () => {
    const a = pickChartTrait('金', 'weak', '1990-03-15');
    const b = pickChartTrait('金', 'weak', '1990-03-15');
    expect(a).toBe(b);
    expect(CHART_TRAITS['金'].weak).toContain(a);
  });

  it('모든 (오행×strength)에서 비어있지 않은 문구를 고른다', () => {
    for (const wx of WX) {
      for (const st of STRENGTHS) {
        const picked = pickChartTrait(wx, st, '1985-12-01');
        expect(CHART_TRAITS[wx][st]).toContain(picked);
      }
    }
  });

  it('사주는 고정 → 날짜와 무관하게 동일(birthDate만 시드)', () => {
    // pickChartTrait는 dateKey를 받지 않으므로 호출 자체가 날짜에 의존하지 않는다.
    expect(pickChartTrait('木', 'strong', '2000-01-01')).toBe(
      pickChartTrait('木', 'strong', '2000-01-01'),
    );
  });
});

describe('pickSegmentPhrase 결정론', () => {
  it('같은 (part, stance, seed) → 같은 문구이고 해당 풀 내', () => {
    const s = seed('1990-03-15', '2026-06-14', 'seg|day');
    const a = pickSegmentPhrase('day', 'favor', s);
    const b = pickSegmentPhrase('day', 'favor', s);
    expect(a).toBe(b);
    expect(SEGMENT.day.favor).toContain(a);
  });

  it('모든 (part×stance)에서 비어있지 않은 문구를 고른다', () => {
    for (const part of PARTS) {
      for (const stance of STANCES) {
        expect(SEGMENT[part][stance]).toContain(pickSegmentPhrase(part, stance, 4242));
      }
    }
  });
});

describe('pickCautionArea / pickCautionChong 결정론', () => {
  it('계열 조심 영역: 같은 (group, seed) → 동일하고 풀 내', () => {
    const s = seed('1990-03-15', '2026-06-14', 'cautionArea|재성');
    const a = pickCautionArea('재성', s);
    expect(a).toBe(pickCautionArea('재성', s));
    expect(CAUTION_AREA['재성']).toContain(a);
  });

  it('충 주의: 같은 seed → 동일하고 풀 내', () => {
    const s = seed('1990-03-15', '2026-06-14', 'cautionChong');
    const a = pickCautionChong(s);
    expect(a).toBe(pickCautionChong(s));
    expect(CAUTION_CHONG).toContain(a);
  });
});

describe('pickReflectSummary / pickReflectQuestion 결정론', () => {
  it('회고 요약: 같은 (group, seed) → 동일하고 풀 내', () => {
    const s = seed('1990-03-15', '2026-06-14', 'reflectSummary|인성');
    const a = pickReflectSummary('인성', s);
    expect(a).toBe(pickReflectSummary('인성', s));
    expect(REFLECT_SUMMARY['인성']).toContain(a);
  });

  it('회고 질문: group 주면 common+계열 풀에서, 미지정이면 common에서 고른다', () => {
    const s = seed('1990-03-15', '2026-06-14', 'reflectQuestion');
    const withGroup = pickReflectQuestion(s, '재성');
    const commonOnly = pickReflectQuestion(s);
    expect([...REFLECT_QUESTION.common, ...REFLECT_QUESTION['재성']]).toContain(withGroup);
    expect(REFLECT_QUESTION.common).toContain(commonOnly);
    // 결정론
    expect(pickReflectQuestion(s, '재성')).toBe(withGroup);
  });
});

// ─────────────────────────────────────────────────────────────
// (v4) 전문가 풀 — 데이터 무결성 / 결정론 / 범위
// ─────────────────────────────────────────────────────────────

describe('v4 전문가 풀 데이터 무결성', () => {
  it('segmentDayBranch: 합/충/同/무 각 ≥4, 비어있지 않음, 중복 없음', () => {
    for (const r of BRANCH_RELATIONS) {
      const arr = SEGMENT_DAY_BRANCH[r];
      expect(arr, `segmentDayBranch 누락: ${r}`).toBeDefined();
      expect(arr.length, r).toBeGreaterThanOrEqual(4);
      expect(new Set(arr).size, `중복: ${r}`).toBe(arr.length);
      for (const p of arr) expect(p.trim().length).toBeGreaterThan(0);
    }
  });

  it('deLing(true/false) 각 ≥4, xiShen(strength 3종) 각 ≥4', () => {
    for (const k of ['true', 'false']) {
      expect(DELING[k], `deLing 누락: ${k}`).toBeDefined();
      expect(DELING[k].length, k).toBeGreaterThanOrEqual(4);
    }
    for (const st of STRENGTHS) {
      expect(XI_SHEN[st], `xiShen 누락: ${st}`).toBeDefined();
      expect(XI_SHEN[st].length, st).toBeGreaterThanOrEqual(4);
    }
  });

  it('tenGodMeaning/cautionTenGod/reflectTenGod: 십신 10종 각 ≥4, 중복 없음', () => {
    for (const tg of TEN_GODS) {
      for (const [name, obj] of [
        ['tenGodMeaning', TEN_GOD_MEANING],
        ['cautionTenGod', CAUTION_TEN_GOD],
        ['reflectTenGod', REFLECT_TEN_GOD],
      ] as const) {
        const arr = obj[tg];
        expect(arr, `${name} 누락: ${tg}`).toBeDefined();
        expect(arr.length, `${name}:${tg}`).toBeGreaterThanOrEqual(4);
        expect(new Set(arr).size, `중복: ${name}:${tg}`).toBe(arr.length);
        for (const p of arr) expect(p.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('reflectTenGod는 과거형(하루였어요)으로 끝나는 회고형이다', () => {
    for (const tg of TEN_GODS) {
      for (const p of REFLECT_TEN_GOD[tg]) {
        expect(p.includes('하루였어요'), `회고형 아님: ${p}`).toBe(true);
      }
    }
  });
});

describe('v4 전문가 선택자 결정론', () => {
  it('pickSegmentDayBranch: 같은 (relation, seed) → 동일, 풀 내', () => {
    const s = seed('1990-03-15', '2026-06-14', 'segDay|day|he');
    const a = pickSegmentDayBranch('he', s);
    expect(a).toBe(pickSegmentDayBranch('he', s));
    expect(SEGMENT_DAY_BRANCH.he).toContain(a);
    // 합과 충은 서로 다른 풀
    expect(SEGMENT_DAY_BRANCH.chong).not.toContain(a);
  });

  it('pickDeLing: 득령/실령이 서로 다른 풀에서 결정론적으로 나온다', () => {
    const de = pickDeLing(true, '1990-03-15');
    const shi = pickDeLing(false, '1990-03-15');
    expect(de).toBe(pickDeLing(true, '1990-03-15'));
    expect(DELING['true']).toContain(de);
    expect(DELING['false']).toContain(shi);
    expect(de).not.toBe(shi);
  });

  it('pickXiShen: strength별 결정론, 풀 내', () => {
    for (const st of STRENGTHS) {
      const a = pickXiShen(st, '1985-12-01');
      expect(a).toBe(pickXiShen(st, '1985-12-01'));
      expect(XI_SHEN[st]).toContain(a);
    }
  });

  it('pickTenGodMeaning / pickCautionTenGod / pickReflectTenGod: 십신별 결정론, 풀 내', () => {
    const s = seed('1990-03-15', '2026-06-14', 'tg');
    for (const tg of TEN_GODS) {
      expect(pickTenGodMeaning(tg, s)).toBe(pickTenGodMeaning(tg, s));
      expect(TEN_GOD_MEANING[tg]).toContain(pickTenGodMeaning(tg, s));
      expect(CAUTION_TEN_GOD[tg]).toContain(pickCautionTenGod(tg, s));
      expect(REFLECT_TEN_GOD[tg]).toContain(pickReflectTenGod(tg, s));
    }
  });

  it('없는 키/십신은 throw', () => {
    expect(() => pickSegmentDayBranch('없음' as never, 1)).toThrow();
    expect(() => pickTenGodMeaning('없음' as never, 1)).toThrow();
    expect(() => pickCautionTenGod('없음' as never, 1)).toThrow();
  });
});
