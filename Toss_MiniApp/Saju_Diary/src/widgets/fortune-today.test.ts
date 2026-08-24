// fortune-today 조립 로직 단위 테스트 — fortune 모듈 재사용 결과의 정합·결정론·완결성 검증.
//
// UI(FortuneWidget)는 빌드 통과로 검증한다. 여기서는 비-UI 조립만 본다.

import { describe, it, expect } from 'vitest';
import type {
  DayMasterStrength,
  FortuneBasis,
  FortuneDetail,
  FortuneResult,
  FortuneStance,
  SajuInput,
  TenGodGroup,
  TimeSegment,
} from '../types';
import {
  computeTodayFortune,
  computeNatalCached,
  buildBasisLine,
  describeChart,
  buildSegmentLine,
  buildCautionLine,
  buildReflectiveLines,
  buildSummaryLine,
  buildOverallEnergyLine,
} from './fortune-today';
import { computeNatal, computeDayGanZhi, GAN_KO } from '../features/fortune/manse';
import { buildFortune, dayRelation } from '../features/fortune/engine';
import {
  pickCategoryPhraseByScore,
  scoreBand,
  BANDED_ITEMS,
} from '../features/fortune/phrases';
import phraseBank from '../../data/fortune-phrases.json';

// 득령/실령 풀(disjoint) — describeChart가 정확히 반영하는지 데이터 기반으로 검증.
const DELING_TRUE = (phraseBank as { deLing: Record<string, string[]> }).deLing['true'];
const DELING_FALSE = (phraseBank as { deLing: Record<string, string[]> }).deLing['false'];

const INPUT: SajuInput = { birthDate: '1990-05-15', birthTime: '12:00', isLunar: false };
const DATE = '2026-06-14';

describe('computeTodayFortune — 조립 정합', () => {
  it('점수/색/방향이 engine.buildFortune과 동일하다(재구현 없음)', () => {
    const natal = computeNatal(INPUT);
    const day = computeDayGanZhi(DATE);
    const expected = buildFortune(natal, day, INPUT.birthDate);

    const out = computeTodayFortune(INPUT, DATE);
    expect(out.date).toBe(DATE);
    expect(out.result.overall).toBe(expected.overall);
    expect(out.result.scores).toEqual(expected.scores);
    expect(out.result.luckyColor).toBe(expected.luckyColor);
    expect(out.result.luckyDirection).toBe(expected.luckyDirection);
  });

  it('압축 표시 요소가 모두 채워진다(별점·일진·총운 한 줄)', () => {
    const out = computeTodayFortune(INPUT, DATE);
    expect(out.result.overall).toBeGreaterThanOrEqual(1);
    expect(out.result.overall).toBeLessThanOrEqual(5);
    expect(out.result.iljin.length).toBeGreaterThan(0);
    expect(out.phrases.overall.length).toBeGreaterThan(0);
  });

  it('result.iljin에 오늘의 정확한 십신과 한 줄 의미가 노출된다(UI 변경 없이)', () => {
    const out = computeTodayFortune(INPUT, DATE);
    const tg = out.result.basis.todayTenGod;
    // 오늘 일진 한 줄 뒤에 정확한 십신(정/편)이 명시된다 — 기존 '오늘의 일진' 렌더 경로로 흐른다.
    expect(out.result.iljin).toContain('오늘 일진은 당신에게');
    expect(out.result.iljin).toContain(tg);
  });

  it('상세 표시 요소가 모두 채워진다(세부운 문구·조언·타로)', () => {
    const out = computeTodayFortune(INPUT, DATE);
    expect(out.phrases.wealth.length).toBeGreaterThan(0);
    expect(out.phrases.love.length).toBeGreaterThan(0);
    expect(out.phrases.health.length).toBeGreaterThan(0);
    expect(out.result.advice.length).toBeGreaterThan(0);
    expect(out.result.tarot).toBeDefined();
    expect(out.result.tarot?.meaning.length).toBeGreaterThan(0);
  });

  it('세부운 별점은 모두 1~5 범위다', () => {
    const { scores } = computeTodayFortune(INPUT, DATE).result;
    for (const v of [scores.wealth, scores.love, scores.health]) {
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(5);
    }
  });

  it('결정론적: 같은 입력·같은 날짜 → 동일 결과(당일 캐시 안전)', () => {
    const a = computeTodayFortune(INPUT, DATE);
    const b = computeTodayFortune(INPUT, DATE);
    expect(a).toEqual(b);
  });

  it('날짜가 바뀌면 결과가 신선해진다(매일 갱신)', () => {
    const today = computeTodayFortune(INPUT, '2026-06-14');
    const tomorrow = computeTodayFortune(INPUT, '2026-06-15');
    // 일진은 매일 다른 60갑자 → iljin 또는 점수/문구 중 무언가는 달라야 한다.
    const changed =
      today.result.iljin !== tomorrow.result.iljin ||
      today.result.overall !== tomorrow.result.overall ||
      today.phrases.overall !== tomorrow.phrases.overall ||
      today.result.tarot?.name !== tomorrow.result.tarot?.name;
    expect(changed).toBe(true);
  });

  it('성별에 따라 애정운이 분기될 수 있다(engine subFortunes 위임 확인)', () => {
    const male = computeTodayFortune(INPUT, DATE, { gender: 'male' });
    const female = computeTodayFortune(INPUT, DATE, { gender: 'female' });
    // 둘 다 유효 범위. 분기 로직은 engine 소유 — 여기선 호출만 위임됨을 확인.
    expect(male.result.scores.love).toBeGreaterThanOrEqual(1);
    expect(female.result.scores.love).toBeGreaterThanOrEqual(1);
  });

  it('캐시된 원국을 주면 동일 결과를 낸다(computeNatal 생략 경로)', () => {
    const natal = computeNatalCached(INPUT);
    const withCache = computeTodayFortune(INPUT, DATE, { natal });
    const noCache = computeTodayFortune(INPUT, DATE);
    expect(withCache).toEqual(noCache);
  });

  it('relation이 dayRelation과 일관되고 카테고리 문구가 채워진다', () => {
    const natal = computeNatal(INPUT);
    const day = computeDayGanZhi(DATE);
    const relation = dayRelation(natal, day);
    expect(relation).toBeTruthy();
    expect(computeTodayFortune(INPUT, DATE).phrases.overall.length).toBeGreaterThan(0);
  });
});

describe('computeTodayFortune — 별점 밴드 정합', () => {
  it('카테고리 문구는 해당 항목 별점의 밴드 문구와 일치한다(점수↔톤 정합)', () => {
    const out = computeTodayFortune(INPUT, DATE);
    const { result, phrases } = out;

    // overall ← result.overall, wealth/love/health ← result.scores.*.
    const scoreOf: Record<(typeof BANDED_ITEMS)[number], number> = {
      overall: result.overall,
      wealth: result.scores.wealth,
      love: result.scores.love,
      health: result.scores.health,
    };

    for (const item of BANDED_ITEMS) {
      const expected = pickCategoryPhraseByScore(item, scoreOf[item], INPUT.birthDate, DATE);
      expect(phrases[item]).toBe(expected);
    }
  });

  it('낮은 점수는 low 밴드, 높은 점수는 high 밴드 문구를 고른다', () => {
    // 같은 사람·날짜라도 점수만 바꾸면 밴드 문구 풀이 달라진다(결정론적 선택기 직접 확인).
    const low = pickCategoryPhraseByScore('wealth', 1, INPUT.birthDate, DATE);
    const high = pickCategoryPhraseByScore('wealth', 5, INPUT.birthDate, DATE);
    expect(scoreBand(1)).toBe('low');
    expect(scoreBand(5)).toBe('high');
    // 밴드가 다르면 후보 풀이 다르므로 문구도 달라져야 한다.
    expect(low).not.toBe(high);
  });

  it('밴드 정합 문구도 결정론적이다(같은 항목·점수·사람·날짜 → 동일)', () => {
    const a = pickCategoryPhraseByScore('overall', 4, INPUT.birthDate, DATE);
    const b = pickCategoryPhraseByScore('overall', 4, INPUT.birthDate, DATE);
    expect(a).toBe(b);
  });
});

describe('buildBasisLine — 근거 한 줄', () => {
  const STRENGTHS: DayMasterStrength[] = ['strong', 'weak', 'balanced'];
  const STANCES: FortuneStance[] = ['favor', 'avoid', 'neutral'];
  const GROUPS: TenGodGroup[] = ['비겁', '식상', '재성', '관성', '인성'];

  function makeBasis(over: Partial<FortuneBasis> = {}): FortuneBasis {
    return {
      dayGan: '庚',
      dayWuXing: '金',
      monthZhi: '午',
      monthWuXing: '火',
      strength: 'weak',
      todayGroup: '인성',
      todayStance: 'favor',
      todayTenGod: '정인',
      deLing: false,
      ...over,
    };
  }

  it('strength 3종 × stance 3종 조합이 throw 없이 문장을 만든다', () => {
    for (const strength of STRENGTHS) {
      for (const todayStance of STANCES) {
        const line = buildBasisLine(makeBasis({ strength, todayStance }));
        expect(typeof line).toBe('string');
        expect(line.length).toBeGreaterThan(0);
        expect(line.endsWith('.') || line.endsWith('요.')).toBe(true);
      }
    }
  });

  it('strength 라벨(신강/신약/중화)이 문장에 포함된다', () => {
    const expected: Record<DayMasterStrength, string> = {
      strong: '신강',
      weak: '신약',
      balanced: '중화',
    };
    for (const strength of STRENGTHS) {
      const line = buildBasisLine(makeBasis({ strength }));
      expect(line).toContain(expected[strength]);
    }
  });

  it('일간 라벨(간+오행)과 오늘 계열명이 문장에 포함된다', () => {
    for (const todayGroup of GROUPS) {
      const line = buildBasisLine(makeBasis({ todayGroup }));
      expect(line).toContain('경(쇠)'); // 일간 라벨(한글)
      expect(line).toContain(todayGroup); // 계열명
    }
  });

  it('계절은 월령 오행에서 결정된다(여름·봄·가을·겨울·환절기)', () => {
    const cases: Array<[FortuneBasis['monthWuXing'], string]> = [
      ['木', '봄'],
      ['火', '여름'],
      ['金', '가을'],
      ['水', '겨울'],
      ['土', '환절기'],
    ];
    for (const [monthWuXing, season] of cases) {
      const line = buildBasisLine(makeBasis({ monthWuXing }));
      expect(line).toContain(`${season} 출생`);
    }
  });

  it('stance에 따라 마무리 톤이 달라진다(채워줘요/과해요/무난)', () => {
    expect(buildBasisLine(makeBasis({ todayStance: 'favor' }))).toContain('채워줘요');
    expect(buildBasisLine(makeBasis({ todayStance: 'avoid' }))).toContain('과해요');
    expect(buildBasisLine(makeBasis({ todayStance: 'neutral' }))).toContain('무난');
  });

  it('결정론적: 같은 basis → 항상 같은 문장', () => {
    const basis = makeBasis({ strength: 'strong', todayGroup: '재성', todayStance: 'avoid' });
    expect(buildBasisLine(basis)).toBe(buildBasisLine(basis));
  });

  it('실제 엔진 basis로도 throw 없이 핵심 토큰을 포함한다', () => {
    const out = computeTodayFortune(INPUT, DATE);
    const line = buildBasisLine(out.result.basis);
    // 한자 노출 금지 — 일간은 한글 음(예: 경)으로 표기된다.
    expect(line).toContain(GAN_KO[out.result.basis.dayGan]);
    expect(line).not.toContain(out.result.basis.dayGan);
    expect(line).toContain('사주예요');
    expect(line).toContain('오늘은');
  });
});

// ─────────────────────────────────────────────────────────────
// 자세한 운세 문구 빌더 — 오늘(서술·예측형) + 일기(회고·질문형)
// ─────────────────────────────────────────────────────────────

const BIRTH = '1990-03-15';

function makeBasis(over: Partial<FortuneBasis> = {}): FortuneBasis {
  return {
    dayGan: '庚',
    dayWuXing: '金',
    monthZhi: '午',
    monthWuXing: '火',
    strength: 'weak',
    todayGroup: '인성',
    todayStance: 'favor',
    todayTenGod: '정인',
    deLing: false,
    ...over,
  };
}

function makeSeg(over: Partial<TimeSegment> = {}): TimeSegment {
  return { part: 'day', zhi: '午', wuXing: '火', group: '관성', stance: 'favor', dayBranch: 'none', ...over };
}

function makeDetail(over: Partial<FortuneDetail> = {}): FortuneDetail {
  return {
    segments: [
      makeSeg({ part: 'morning', zhi: '卯', wuXing: '木', group: '재성', stance: 'neutral' }),
      makeSeg({ part: 'day', zhi: '午', wuXing: '火', group: '관성', stance: 'avoid' }),
      makeSeg({ part: 'evening', zhi: '酉', wuXing: '金', group: '비겁', stance: 'favor' }),
      makeSeg({ part: 'night', zhi: '子', wuXing: '水', group: '식상', stance: 'avoid' }),
    ],
    caution: { avoidGroup: '재성', chong: false, cautionPart: 'day' },
    ...over,
  };
}

describe('describeChart — 사주 설명(오늘 상세, 서술형, 전문가)', () => {
  const STRENGTHS: DayMasterStrength[] = ['strong', 'weak', 'balanced'];

  it('일간 라벨·계절·신강신약을 포함하고 "사주예요"가 들어간다', () => {
    const line = describeChart(makeBasis(), BIRTH);
    expect(line).toContain('경(쇠)');
    expect(line).toContain('여름');
    expect(line).toContain('신약');
    expect(line).toContain('사주예요.');
  });

  it('strength 3종이 throw 없이 라벨을 반영한다', () => {
    const labels: Record<DayMasterStrength, string> = { strong: '신강', weak: '신약', balanced: '중화' };
    for (const strength of STRENGTHS) {
      const line = describeChart(makeBasis({ strength }), BIRTH);
      expect(line).toContain(labels[strength]);
    }
  });

  it('득령/실령(월령)을 정확히 반영한다(서로 다른 풀 조각)', () => {
    const deLingLine = describeChart(makeBasis({ deLing: true }), BIRTH);
    const shiLingLine = describeChart(makeBasis({ deLing: false }), BIRTH);
    // 득령 줄은 득령 풀의 한 조각을, 실령 줄은 실령 풀의 한 조각을 포함한다(disjoint).
    expect(DELING_TRUE.some((frag) => deLingLine.includes(frag))).toBe(true);
    expect(DELING_FALSE.some((frag) => shiLingLine.includes(frag))).toBe(true);
    // 득령/실령에 따라 문장이 달라진다.
    expect(deLingLine).not.toBe(shiLingLine);
  });

  it('신약/신강은 희신 계열을 명시한다(무엇이 들어와야 좋은지)', () => {
    // 신약 → 보태는 쪽(비겁·인성)이 희신.
    const weak = describeChart(makeBasis({ strength: 'weak' }), BIRTH);
    expect(weak).toContain('희신');
    expect(weak).toContain('비겁');
    expect(weak).toContain('인성');
    // 신강 → 덜어 주는 쪽(식상·재성·관성)이 희신.
    const strong = describeChart(makeBasis({ strength: 'strong' }), BIRTH);
    expect(strong).toContain('희신');
    expect(strong).toContain('재성');
  });

  it('중화는 희신을 단정하지 않는다(중립 마무리)', () => {
    const bal = describeChart(makeBasis({ strength: 'balanced' }), BIRTH);
    // 중화는 favor 계열이 없어 "희신이라" 절 없이 중립 마무리만.
    expect(bal).not.toContain('희신이라');
  });

  it('결정론적: 같은 입력 → 동일(사주 고정, 날짜 무관)', () => {
    expect(describeChart(makeBasis(), BIRTH)).toBe(describeChart(makeBasis(), BIRTH));
  });
});

describe('buildSegmentLine — 시간대 한 줄(오늘 상세, 서술·예측형)', () => {
  const PARTS = ['morning', 'day', 'evening', 'night'] as const;
  const STANCES: FortuneStance[] = ['favor', 'avoid', 'neutral'];

  it('part 한글 라벨로 시작한다(아침/낮/저녁/밤)', () => {
    const labels: Record<(typeof PARTS)[number], string> = {
      morning: '아침',
      day: '낮',
      evening: '저녁',
      night: '밤',
    };
    for (const part of PARTS) {
      const line = buildSegmentLine(makeSeg({ part }), BIRTH, DATE);
      expect(line.startsWith(labels[part])).toBe(true);
    }
  });

  it('모든 (part×stance)가 throw 없이 비어있지 않은 문장을 만든다', () => {
    for (const part of PARTS) {
      for (const stance of STANCES) {
        const line = buildSegmentLine(makeSeg({ part, stance }), BIRTH, DATE);
        expect(line.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('avoid 시간대 문구에 공포·단정 예언 단어가 없다(부드럽게)', () => {
    const forbidden = ['반드시', '절대', '망', '불행', '재앙'];
    for (const part of PARTS) {
      const line = buildSegmentLine(makeSeg({ part, stance: 'avoid' }), BIRTH, DATE);
      for (const bad of forbidden) {
        expect(line.includes(bad), `${part} avoid에 "${bad}"`).toBe(false);
      }
    }
  });

  it('dayBranch에 따라 오늘 일진 근거가 달라진다(he ≠ chong ≠ same ≠ none)', () => {
    // 같은 part·stance라도 오늘 일진 지지 관계(합/충/同/무)에 따라 다른 문구로 읽힌다.
    const he = buildSegmentLine(makeSeg({ stance: 'favor', dayBranch: 'he' }), BIRTH, DATE);
    const chong = buildSegmentLine(makeSeg({ stance: 'favor', dayBranch: 'chong' }), BIRTH, DATE);
    const same = buildSegmentLine(makeSeg({ stance: 'favor', dayBranch: 'same' }), BIRTH, DATE);
    const none = buildSegmentLine(makeSeg({ stance: 'favor', dayBranch: 'none' }), BIRTH, DATE);
    // 합/충/同/무 근거 조각이 서로 다른 문장을 만든다(he-day ≠ chong-day).
    expect(new Set([he, chong, same, none]).size).toBe(4);
    expect(he).not.toBe(chong);
  });

  it('결정론적: 같은 입력 → 동일', () => {
    const seg = makeSeg({ part: 'evening', stance: 'favor', dayBranch: 'he' });
    expect(buildSegmentLine(seg, BIRTH, DATE)).toBe(buildSegmentLine(seg, BIRTH, DATE));
  });
});

describe('buildCautionLine — 오늘 조심(오늘 상세, 서술형)', () => {
  it('avoidGroup이 있으면 그 계열 조심 한 줄을 만든다', () => {
    const line = buildCautionLine(makeDetail(), makeBasis(), BIRTH, DATE);
    expect(line).not.toBeNull();
    expect(line!.trim().length).toBeGreaterThan(0);
  });

  it('cautionPart가 있으면 "특히 {시간대}엔"을 결합한다', () => {
    const line = buildCautionLine(makeDetail({ caution: { avoidGroup: '재성', chong: false, cautionPart: 'day' } }), makeBasis(), BIRTH, DATE);
    expect(line).toContain('특히 낮엔');
  });

  it('chong이 있으면 변동·마찰 주의를 덧붙인다(avoidGroup과 결합)', () => {
    const both = buildCautionLine(makeDetail({ caution: { avoidGroup: '재성', chong: true, cautionPart: null } }), makeBasis(), BIRTH, DATE);
    expect(both).not.toBeNull();
    // 두 조각(영역 + 충)이 공백으로 결합되어 단독보다 길다.
    const onlyArea = buildCautionLine(makeDetail({ caution: { avoidGroup: '재성', chong: false, cautionPart: null } }), makeBasis(), BIRTH, DATE);
    expect(both!.length).toBeGreaterThan(onlyArea!.length);
  });

  it('chong만 있어도 단독으로 조심 한 줄을 만든다', () => {
    const line = buildCautionLine(makeDetail({ caution: { avoidGroup: null, chong: true, cautionPart: null } }), makeBasis(), BIRTH, DATE);
    expect(line).not.toBeNull();
    expect(line!.trim().length).toBeGreaterThan(0);
  });

  it('조심거리(avoidGroup·chong) 없으면 null', () => {
    const line = buildCautionLine(makeDetail({ caution: { avoidGroup: null, chong: false, cautionPart: 'day' } }), makeBasis(), BIRTH, DATE);
    expect(line).toBeNull();
  });

  it('정확한 십신(정/편)을 반영한다 — 편재 vs 정재가 다른 조심 문구', () => {
    // avoidGroup=재성이고 todayTenGod이 그 계열이면 정확한 십신 풀(cautionTenGod)에서 고른다.
    const detail = makeDetail({ caution: { avoidGroup: '재성', chong: false, cautionPart: null } });
    const pyeonjae = buildCautionLine(detail, makeBasis({ todayGroup: '재성', todayTenGod: '편재' }), BIRTH, DATE);
    const jeongjae = buildCautionLine(detail, makeBasis({ todayGroup: '재성', todayTenGod: '정재' }), BIRTH, DATE);
    expect(pyeonjae).not.toBeNull();
    expect(jeongjae).not.toBeNull();
    // 편재(큰 지출·투자)와 정재(인색·융통)는 다른 뉘앙스의 문구로 갈린다.
    expect(pyeonjae).not.toBe(jeongjae);
  });

  it('todayTenGod 계열이 avoidGroup과 어긋나면 계열 풀로 폴백(throw 없음)', () => {
    // avoidGroup=재성이지만 todayTenGod=정인(인성) → 계열 cautionArea(재성) 폴백.
    const line = buildCautionLine(
      makeDetail({ caution: { avoidGroup: '재성', chong: false, cautionPart: null } }),
      makeBasis({ todayGroup: '인성', todayTenGod: '정인' }),
      BIRTH,
      DATE,
    );
    expect(line).not.toBeNull();
    expect(line!.trim().length).toBeGreaterThan(0);
  });

  it('결정론적: 같은 입력 → 동일', () => {
    const d = makeDetail();
    expect(buildCautionLine(d, makeBasis(), BIRTH, DATE)).toBe(buildCautionLine(d, makeBasis(), BIRTH, DATE));
  });
});

describe('buildReflectiveLines — 일기 회고(회고·질문형)', () => {
  const GROUPS: TenGodGroup[] = ['비겁', '식상', '재성', '관성', '인성'];

  it('summary는 과거형 요약, question은 의문문(?)으로 끝난다', () => {
    const { summary, question } = buildReflectiveLines(makeBasis({ todayGroup: '재성' }), makeDetail(), BIRTH, DATE);
    expect(summary).toContain('하루였어요');
    expect(question.endsWith('?')).toBe(true);
  });

  it('명령·약속 톤(~해줘요/~하세요/~보세요)이 없다(돌아보게 한다)', () => {
    for (const group of GROUPS) {
      const { summary, question } = buildReflectiveLines(makeBasis({ todayGroup: group }), makeDetail(), BIRTH, DATE);
      for (const text of [summary, question]) {
        expect(text.includes('해줘요'), `약속 톤: ${text}`).toBe(false);
        expect(text.includes('하세요'), `명령 톤: ${text}`).toBe(false);
        expect(text.includes('보세요'), `명령 톤: ${text}`).toBe(false);
      }
    }
  });

  it('5개 계열 모두 throw 없이 두 줄을 만든다', () => {
    for (const group of GROUPS) {
      const r = buildReflectiveLines(makeBasis({ todayGroup: group }), makeDetail(), BIRTH, DATE);
      expect(r.summary.trim().length).toBeGreaterThan(0);
      expect(r.question.trim().length).toBeGreaterThan(0);
    }
  });

  it('정확한 십신(todayTenGod)이 회고 요약을 가른다(편재 ≠ 정재, 과거형)', () => {
    const pyeonjae = buildReflectiveLines(makeBasis({ todayGroup: '재성', todayTenGod: '편재' }), makeDetail(), BIRTH, DATE);
    const jeongjae = buildReflectiveLines(makeBasis({ todayGroup: '재성', todayTenGod: '정재' }), makeDetail(), BIRTH, DATE);
    expect(pyeonjae.summary).toContain('하루였어요');
    expect(jeongjae.summary).toContain('하루였어요');
    // 같은 계열이라도 정/편이 다르면 회고 요약이 갈린다.
    expect(pyeonjae.summary).not.toBe(jeongjae.summary);
  });

  it('todayTenGod 없는 과거 스냅샷 basis도 계열 폴백으로 회고를 만든다', () => {
    // 하위호환: todayTenGod 없이 todayGroup만 있는 옛 basis(타입 우회).
    const legacy = { ...makeBasis({ todayGroup: '식상' }), todayTenGod: undefined } as unknown as FortuneBasis;
    const r = buildReflectiveLines(legacy, makeDetail(), BIRTH, DATE);
    expect(r.summary).toContain('하루였어요');
    expect(r.question.endsWith('?')).toBe(true);
  });

  it('결정론적: 같은 입력 → 동일', () => {
    const b = makeBasis({ todayGroup: '인성' });
    const d = makeDetail();
    expect(buildReflectiveLines(b, d, BIRTH, DATE)).toEqual(buildReflectiveLines(b, d, BIRTH, DATE));
  });

  it('실제 엔진 basis/detail로도 회고 두 줄을 만든다', () => {
    const out = computeTodayFortune(INPUT, DATE);
    const r = buildReflectiveLines(out.result.basis, out.result.detail, INPUT.birthDate, DATE);
    expect(r.summary).toContain('하루였어요');
    expect(r.question.endsWith('?')).toBe(true);
  });
});

describe('buildSummaryLine — 홈 요약(키워드형, #2)', () => {
  // 최소 FortuneResult — buildSummaryLine은 scores + detail.segments만 소비한다.
  function makeResult(
    scores: { wealth: number; love: number; health: number },
    segStances: FortuneStance[],
  ): FortuneResult {
    const parts: TimeSegment['part'][] = ['morning', 'day', 'evening', 'night'];
    return {
      date: DATE,
      overall: 3,
      scores,
      luckyColor: '초록',
      luckyDirection: '동',
      iljin: '',
      advice: '',
      basis: makeBasis(),
      detail: {
        segments: parts.map((part, i) => makeSeg({ part, stance: segStances[i] ?? 'neutral' })),
        caution: { avoidGroup: null, chong: false, cautionPart: null },
      },
    };
  }

  it('가장 높은 세부운 키워드 + favor 시간대를 점(·)으로 잇는다(문장 나열 아님)', () => {
    const line = buildSummaryLine(
      makeResult({ wealth: 5, love: 2, health: 3 }, ['neutral', 'favor', 'avoid', 'neutral']),
    );
    expect(line).toContain('재물');
    expect(line).toContain('반짝'); // ≥4 → "반짝이는 하루"
    expect(line).toContain('·');
    expect(line).toContain('낮'); // 첫 favor 시간대(day).
    // 키워드형 — 마침표로 끝나는 서술 문장이 아니다.
    expect(line.endsWith('.')).toBe(false);
  });

  it('favor 시간대가 없으면 키워드만(시간대 절 생략)', () => {
    const line = buildSummaryLine(
      makeResult({ wealth: 2, love: 2, health: 3 }, ['neutral', 'avoid', 'neutral', 'avoid']),
    );
    // 최고는 health(3) → 잔잔, 시간대 절 없음.
    expect(line).toBe('건강운은 잔잔한 하루');
    expect(line).not.toContain('·');
  });

  it('점수 밴드에 따라 톤이 갈린다(≥4 반짝 / =3 잔잔 / ≤2 차분)', () => {
    expect(buildSummaryLine(makeResult({ wealth: 4, love: 1, health: 1 }, []))).toContain('반짝');
    expect(buildSummaryLine(makeResult({ wealth: 3, love: 1, health: 1 }, []))).toContain('잔잔');
    expect(buildSummaryLine(makeResult({ wealth: 2, love: 1, health: 1 }, []))).toContain('차분');
  });

  it('결정론적: 같은 입력 → 동일', () => {
    const r = makeResult({ wealth: 4, love: 3, health: 2 }, ['favor', 'neutral', 'neutral', 'neutral']);
    expect(buildSummaryLine(r)).toBe(buildSummaryLine(r));
  });
});

describe('buildOverallEnergyLine — 총운 기운 한 줄(쉬운 말 + 좋다/조심)', () => {
  function makeResult(over: Partial<FortuneBasis>): FortuneResult {
    return {
      date: DATE,
      overall: 3,
      scores: { wealth: 3, love: 3, health: 3 },
      luckyColor: '초록',
      luckyDirection: '동',
      iljin: '',
      advice: '',
      basis: makeBasis(over),
      detail: { segments: [], caution: { avoidGroup: null, chong: false, cautionPart: null } },
    };
  }

  it('십신 그룹을 쉬운 "기운" 키워드로 풀고, stance로 좋다/조심/무난을 가른다', () => {
    const favor = buildOverallEnergyLine(makeResult({ todayGroup: '재성', todayStance: 'favor' }));
    expect(favor).toContain('재물과 기회');
    expect(favor).toContain('좋은 편');

    const avoid = buildOverallEnergyLine(makeResult({ todayGroup: '관성', todayStance: 'avoid' }));
    expect(avoid).toContain('일과 책임');
    expect(avoid).toContain('조심');

    const neutral = buildOverallEnergyLine(makeResult({ todayGroup: '인성', todayStance: 'neutral' }));
    expect(neutral).toContain('배움과 안정');
    expect(neutral).toContain('무난');
  });

  it('전문용어(신강/신약/오행 한자)를 노출하지 않는다', () => {
    const line = buildOverallEnergyLine(makeResult({ todayGroup: '식상', todayStance: 'favor' }));
    expect(line).not.toMatch(/[木火土金水]/);
    expect(line).not.toContain('신강');
    expect(line).not.toContain('신약');
  });
});
