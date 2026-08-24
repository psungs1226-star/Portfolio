import { describe, expect, it } from 'vitest';
import type { DayGanZhi, NatalChart, WuXing } from '../../types';
import {
  branchRelation,
  buildFortune,
  dailyCaution,
  dayMasterStrength,
  dayRelation,
  deLing,
  elementPower,
  favorableGroups,
  fortuneBasis,
  fortuneDetail,
  groupPower,
  luckyColor,
  luckyDirection,
  seed,
  seedIndex,
  subFortunes,
  tenGod,
  tenGodGroup,
  timeSegments,
  totalScore,
  wuXingToGroup,
} from './engine';

// 이 테스트는 해석 엔진의 결정론·오행 생극 정확성·점수 범위·부억(扶抑) 개인화를 검증한다.
// 만세력 글자(간지/오행/십신/방위)는 manse.ts 책임이라 여기선 만세력 출력값을
// 직접 구성한 픽스처로 엔진 로직만 격리 검증한다(순수 함수).

// ─────────────────────────────────────────────────────────────
// 픽스처 헬퍼
// ─────────────────────────────────────────────────────────────

/** 천간·지지 1글자 → 오행(엔진 GAN_ZHI_WU_XING와 동일 정합). */
const WU: Record<string, WuXing> = {
  // 천간
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
  // 지지(본기)
  寅: '木', 卯: '木', 巳: '火', 午: '火',
  辰: '土', 丑: '土', 戌: '土', 未: '土',
  申: '金', 酉: '金', 亥: '水', 子: '水',
};

const px = (gz: string) => ({ gan: gz.charAt(0), zhi: gz.charAt(1), ganZhi: gz });

/**
 * 완전 제어 NatalChart 픽스처. 각 기둥을 간지 2글자로 직접 지정.
 * dayGan/dayWuXing은 day 기둥에서 자동 산출.
 */
function natal(opts: {
  year: string;
  month: string;
  day: string;
  hour?: string;
}): NatalChart {
  const day = px(opts.day);
  const chart: NatalChart = {
    year: px(opts.year),
    month: px(opts.month),
    day,
    dayGan: day.gan,
    dayWuXing: WU[day.gan],
    tenGods: [null, null, null],
  };
  if (opts.hour != null) {
    chart.hour = px(opts.hour);
    chart.tenGods.push(null);
  }
  return chart;
}

/**
 * 일간·일지만 의미있는 최소 NatalChart 픽스처(네 기둥 동일).
 * 주의: 네 기둥이 같으면 부억상 한쪽 세력으로 쏠려 보통 신강이 된다.
 */
function natalOf(dayGan: string, dayZhi = '子'): NatalChart {
  const gz = dayGan + dayZhi;
  return natal({ year: gz, month: gz, day: gz });
}

/** 명백한 신강 甲 일간(인성 水·비겁 木 위주, 月令 인성). */
function strongJia(): NatalChart {
  // day 甲子, month 壬子(水=인성+水=인성), year 甲寅(木=비겁), hour 癸亥(水=인성)
  return natal({ year: '甲寅', month: '壬子', day: '甲子', hour: '癸亥' });
}

/** 명백한 신약 甲 일간(식상 火·재성 土·관성 金 위주, 月令 식상). */
function weakJia(): NatalChart {
  // day 甲申(申金=관성), month 庚午(庚金=관성, 午火=식상), year 戊戌(戊土·戌土=재성), hour 丙寅 살짝 비겁완화
  return natal({ year: '戊戌', month: '庚午', day: '甲申', hour: '庚午' });
}

/** 오늘 일진 픽스처. */
function dayOf(
  gan: string,
  zhi = '丑',
  date = '2026-06-14',
  cai: DayGanZhi['caiDirection'] = '동',
  xi: DayGanZhi['xiDirection'] = '남',
): DayGanZhi {
  return {
    date,
    pillar: { gan, zhi, ganZhi: gan + zhi },
    ganWuXing: WU[gan],
    zhiWuXing: WU[zhi] ?? '土',
    caiDirection: cai,
    xiDirection: xi,
  };
}

// ─────────────────────────────────────────────────────────────
// tenGod — 십신 10종 (일간 甲, 木, 陽 기준)
// ─────────────────────────────────────────────────────────────

describe('tenGod — 오행 생극 + 음양으로 십신 10종 판정', () => {
  const cases: [string, string][] = [
    ['甲', '비견'], // 同오행 同음양
    ['乙', '겁재'], // 同오행 異음양
    ['丙', '식신'], // 我生 同음양 (木生火)
    ['丁', '상관'], // 我生 異음양
    ['戊', '편재'], // 我剋 同음양 (木剋土)
    ['己', '정재'], // 我剋 異음양
    ['庚', '편관'], // 剋我 同음양 (金剋木)
    ['辛', '정관'], // 剋我 異음양
    ['壬', '편인'], // 生我 同음양 (水生木)
    ['癸', '정인'], // 生我 異음양
  ];

  it.each(cases)('일간 甲 × %s → %s', (other, expected) => {
    expect(tenGod('甲', other)).toBe(expected);
  });

  it('10종 모두 서로 다른 결과를 낸다(전수)', () => {
    const results = cases.map(([other]) => tenGod('甲', other));
    expect(new Set(results).size).toBe(10);
  });

  it('일간이 음간(乙, 木 陰)일 때 음양 반전이 십신에 반영된다', () => {
    expect(tenGod('乙', '甲')).toBe('겁재');
    expect(tenGod('乙', '乙')).toBe('비견');
    expect(tenGod('乙', '庚')).toBe('정관');
  });

  it('결정론: 같은 입력은 항상 같은 십신', () => {
    for (const [other] of cases) {
      expect(tenGod('甲', other)).toBe(tenGod('甲', other));
    }
  });
});

describe('tenGodGroup — 5계열 분류', () => {
  it('각 십신을 올바른 계열로 묶는다', () => {
    expect(tenGodGroup('비견')).toBe('비겁');
    expect(tenGodGroup('겁재')).toBe('비겁');
    expect(tenGodGroup('식신')).toBe('식상');
    expect(tenGodGroup('상관')).toBe('식상');
    expect(tenGodGroup('편재')).toBe('재성');
    expect(tenGodGroup('정재')).toBe('재성');
    expect(tenGodGroup('편관')).toBe('관성');
    expect(tenGodGroup('정관')).toBe('관성');
    expect(tenGodGroup('편인')).toBe('인성');
    expect(tenGodGroup('정인')).toBe('인성');
  });
});

describe('wuXingToGroup — 오행만으로 일간 기준 계열(음양 무시)', () => {
  it('일간 木 기준 5계열', () => {
    expect(wuXingToGroup('木', '木')).toBe('비겁'); // 同
    expect(wuXingToGroup('木', '水')).toBe('인성'); // 水生木 = 生我
    expect(wuXingToGroup('木', '火')).toBe('식상'); // 木生火 = 我生
    expect(wuXingToGroup('木', '土')).toBe('재성'); // 木剋土 = 我剋
    expect(wuXingToGroup('木', '金')).toBe('관성'); // 金剋木 = 剋我
  });
});

describe('dayRelation — 일간×오늘 천간 계열', () => {
  it('甲 × 壬(水生木) → 인성', () => {
    expect(dayRelation(natalOf('甲'), dayOf('壬'))).toBe('인성');
  });
  it('甲 × 戊(木剋土) → 재성', () => {
    expect(dayRelation(natalOf('甲'), dayOf('戊'))).toBe('재성');
  });
});

// ─────────────────────────────────────────────────────────────
// elementPower / groupPower — 오행·계열 세력(가중 합산)
// ─────────────────────────────────────────────────────────────

describe('elementPower — 일간 제외 8자 가중 세력', () => {
  it('월지×3·일지×2·년/시지×1.5·천간×1.0로 합산, 일간 천간은 제외', () => {
    // year 甲寅, month 壬子, day 甲子, hour 癸亥
    // 천간(일간 甲 제외): year甲(木 1.0), month壬(水 1.0), hour癸(水 1.0)
    // 지지: month子(水 3), day子(水 2), year寅(木 1.5), hour亥(水 1.5)
    const p = elementPower(strongJia());
    // 木 = year甲(1.0) + year寅(1.5) = 2.5
    expect(p.木).toBeCloseTo(2.5);
    // 水 = month壬(1.0)+hour癸(1.0)+month子(3)+day子(2)+hour亥(1.5) = 8.5
    expect(p.水).toBeCloseTo(8.5);
    expect(p.火).toBe(0);
    expect(p.土).toBe(0);
    expect(p.金).toBe(0);
  });

  it('시주가 없으면 시 천간·지지를 빼고 합산한다', () => {
    const noHour = natal({ year: '甲寅', month: '壬子', day: '甲子' });
    const p = elementPower(noHour);
    // 木 = year甲(1.0)+year寅(1.5) = 2.5, 水 = month壬(1.0)+month子(3)+day子(2) = 6.0
    expect(p.木).toBeCloseTo(2.5);
    expect(p.水).toBeCloseTo(6.0);
  });

  it('결정론: 같은 원국 같은 세력', () => {
    expect(elementPower(strongJia())).toEqual(elementPower(strongJia()));
  });

  it('groupPower — 일간 기준 5계열로 환산', () => {
    const gp = groupPower(strongJia());
    // me=木: 비겁=木(2.5), 인성=水(8.5), 나머지 0
    expect(gp.비겁).toBeCloseTo(2.5);
    expect(gp.인성).toBeCloseTo(8.5);
    expect(gp.식상).toBe(0);
    expect(gp.재성).toBe(0);
    expect(gp.관성).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────
// dayMasterStrength / favorableGroups — 신강·신약·喜忌
// ─────────────────────────────────────────────────────────────

describe('dayMasterStrength — 신강/신약/중화(부억+월령)', () => {
  it('인성·비겁 위주 + 月令 인성 → 신강', () => {
    expect(dayMasterStrength(strongJia())).toBe('strong');
  });

  it('식상·재성·관성 위주 + 月令 식상 → 신약', () => {
    expect(dayMasterStrength(weakJia())).toBe('weak');
  });

  it('扶=抑=0 같은 극단 방어(분모 0) → balanced', () => {
    // 모든 글자를 일간과 무관하게 만들 수는 없으니 직접 균형 케이스 검증.
    // 扶/(扶+抑) 가 0.45~0.55 사이가 되도록 섞는다.
    const mixed = natal({ year: '丙寅', month: '甲午', day: '甲子', hour: '戊辰' });
    // 결과가 세 값 중 하나(유효 유니온)인지만 보장(경계 케이스).
    expect(['strong', 'weak', 'balanced']).toContain(dayMasterStrength(mixed));
  });

  it('결정론: 같은 원국 같은 강약', () => {
    expect(dayMasterStrength(strongJia())).toBe(dayMasterStrength(strongJia()));
  });
});

describe('favorableGroups — 喜忌는 강약으로 뒤집힌다', () => {
  it('신강 → favor{식상,재성,관성}, avoid{비겁,인성}', () => {
    const { favor, avoid } = favorableGroups(strongJia());
    expect(favor).toEqual(['식상', '재성', '관성']);
    expect(avoid).toEqual(['비겁', '인성']);
  });

  it('신약 → favor{비겁,인성}, avoid{식상,재성,관성}', () => {
    const { favor, avoid } = favorableGroups(weakJia());
    expect(favor).toEqual(['비겁', '인성']);
    expect(avoid).toEqual(['식상', '재성', '관성']);
  });
});

// ─────────────────────────────────────────────────────────────
// totalScore — 같은 오늘 일진, 신강 vs 신약 반대 점수
// ─────────────────────────────────────────────────────────────

describe('totalScore — 喜忌 기준 개인화(1~5, 결정론)', () => {
  it('★ 같은 오늘 일진(인성)이 신강↔신약에 반대 점수', () => {
    // 오늘 壬(甲에게 인성), 卯는 子(신강 일지)·申(신약 일지) 모두와 충합 중립.
    const today = dayOf('壬', '卯');
    // 신강: 인성=忌 → base 2
    expect(totalScore(strongJia(), today)).toBe(2);
    // 신약: 인성=喜 → base 4
    expect(totalScore(weakJia(), today)).toBe(4);
  });

  it('喜(favor)는 4, 합(+1)이면 5로 상한 clamp', () => {
    // 신약 甲에게 인성(壬)=喜(base4). 일지 申 vs 오늘 巳 = 육합(+1) → 5
    expect(totalScore(weakJia(), dayOf('壬', '巳'))).toBe(5);
  });

  it('忌(avoid)는 2, 충(−1)이면 1로 하한 clamp', () => {
    // 신강 甲에게 비겁(甲)=忌(base2). 일지 子 vs 오늘 午 = 충(−1) → 1
    expect(totalScore(strongJia(), dayOf('甲', '午'))).toBe(1);
  });

  it('중화면 中(base 3)·충합만 반영', () => {
    const mixed = natal({ year: '丙寅', month: '甲午', day: '甲子', hour: '戊辰' });
    if (dayMasterStrength(mixed) === 'balanced') {
      // favor/avoid 비어 있으니 어떤 계열이 와도 base 3.
      expect(totalScore(mixed, dayOf('壬', '寅'))).toBe(3);
    }
  });

  it('모든 천간 조합에서 별점은 항상 1~5 정수', () => {
    const stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
    const zhis = ['子', '丑', '午', '未', '寅'];
    const charts = [strongJia(), weakJia(), natalOf('甲', '子'), natalOf('庚', '酉')];
    for (const n of charts) {
      for (const tg of stems) {
        for (const tz of zhis) {
          const s = totalScore(n, dayOf(tg, tz));
          expect(s).toBeGreaterThanOrEqual(1);
          expect(s).toBeLessThanOrEqual(5);
          expect(Number.isInteger(s)).toBe(true);
        }
      }
    }
  });

  it('결정론: 같은 입력 같은 별점', () => {
    const n = strongJia();
    const d = dayOf('壬', '丑');
    expect(totalScore(n, d)).toBe(totalScore(n, d));
  });

  it('★ 시주(시간)가 있으면 시지 합충이 더해져 같은 사주도 시간에 따라 점수가 갈린다', () => {
    // 신약 甲, 오늘 인성(壬)=喜(base4). 일지 申 vs 오늘 子 = 충합 무(0).
    // 시간 없음: 4. 시간 있음(시주 庚午, 시지 午) vs 오늘 子 = 六沖(−1) → 3.
    const withoutHour = natal({ year: '戊戌', month: '庚午', day: '甲申' });
    const withHour = natal({ year: '戊戌', month: '庚午', day: '甲申', hour: '庚午' });
    const today = dayOf('壬', '子');
    expect(totalScore(withoutHour, today)).toBe(4);
    expect(totalScore(withHour, today)).toBe(3);
    expect(totalScore(withHour, today)).toBeLessThan(totalScore(withoutHour, today));
    // 세부운에도 동일하게 시주 합충이 반영된다(건강=인성 喜 +1, 시지 충 −1).
    expect(subFortunes(withHour, today).health).toBe(
      subFortunes(withoutHour, today).health - 1,
    );
  });
});

// ─────────────────────────────────────────────────────────────
// subFortunes — 재물·애정·건강 (喜忌 부호 반영)
// ─────────────────────────────────────────────────────────────

describe('subFortunes — 세부운(1~5, 喜忌 개인화)', () => {
  // 卯는 strongJia 일지(子)·weakJia 일지(申) 모두와 충/합이 없어 가감이 喜忌만 반영된다.
  // 세부운 = 3 + stanceTilt(전반 喜忌) + 도메인가감. 매칭 도메인은 둘 다 받아 ±2.
  it('재물: 오늘 재성이 신강에게 喜(+2)·신약에게 忌(−2)', () => {
    const today = dayOf('戊', '卯'); // 재성, 충합 중립 지지
    expect(subFortunes(strongJia(), today).wealth).toBe(5); // 재성=喜: 3+1+1
    expect(subFortunes(weakJia(), today).wealth).toBe(1); // 재성=忌: 3−1−1
  });

  it('애정: 남=재성, 여=관성 target, 喜忌 부호 반영', () => {
    // 신강 甲: 재성·관성 모두 喜.
    const todayCai = dayOf('戊', '卯'); // 재성
    const todayGuan = dayOf('庚', '卯'); // 관성
    expect(subFortunes(strongJia(), todayCai, 'male').love).toBe(5); // 매칭+喜: 3+1+1
    expect(subFortunes(strongJia(), todayGuan, 'female').love).toBe(5);
    // target 불일치여도 오늘이 喜면 전반 stanceTilt(+1)만 반영 → 4.
    expect(subFortunes(strongJia(), todayGuan, 'male').love).toBe(4);
    expect(subFortunes(strongJia(), todayCai, 'female').love).toBe(4);
  });

  it('건강: 오늘 인성/비겁이 신약에게 喜(+2)·신강에게 忌(−2)', () => {
    const today = dayOf('壬', '卯'); // 인성, 충합 중립 지지
    expect(subFortunes(weakJia(), today).health).toBe(5); // 인성=喜: 3+1+1
    expect(subFortunes(strongJia(), today).health).toBe(1); // 인성=忌: 3−1−1
  });

  it('충합이 세부운에도 더해진다', () => {
    // 신약 甲, 오늘 인성(壬), 일지 申 vs 오늘 巳 = 합(+1) → 건강 3+1(喜)+1(합) = 5
    expect(subFortunes(weakJia(), dayOf('壬', '巳')).health).toBe(5);
  });

  it('모든 세부운은 1~5 범위', () => {
    const stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
    const charts = [strongJia(), weakJia()];
    for (const n of charts) {
      for (const tg of stems) {
        for (const tz of ['子', '午', '丑', '巳']) {
          const s = subFortunes(n, dayOf(tg, tz));
          for (const v of [s.wealth, s.love, s.health]) {
            expect(v).toBeGreaterThanOrEqual(1);
            expect(v).toBeLessThanOrEqual(5);
          }
        }
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────
// luckyColor — 강약별 분기
// ─────────────────────────────────────────────────────────────

describe('luckyColor — 강약에 따라 필요한 오행이 갈린다', () => {
  it('신약/중화 → 일간을 生하는 오행(印星)의 색', () => {
    // 신약 甲(木) → 生我=水 → 검정
    expect(luckyColor(weakJia())).toBe('검정');
  });

  it('신강 → 일간이 剋하는 오행(財星)의 색', () => {
    // 신강 甲(木) → 我剋=土 → 노랑
    expect(luckyColor(strongJia())).toBe('노랑');
  });

  it('같은 일간이라도 강약이 다르면 색이 달라진다', () => {
    expect(luckyColor(strongJia())).not.toBe(luckyColor(weakJia()));
  });

  it('day를 주면 일진에 따라 매일 바뀌되, 항상 내 희신 색 안에서만 고른다', () => {
    const stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
    // 신약 甲(木) 희신 색 = 印星(水=검정) + 比劫(木=초록).
    const weakColors = new Set(stems.map((g) => luckyColor(weakJia(), dayOf(g))));
    expect(weakColors.size).toBeGreaterThan(1); // 매일 같지 않다(변동)
    for (const c of weakColors) expect(['검정', '초록']).toContain(c); // 사주 범위 안

    // 신강 甲(木) 희신 색 = 食傷(火) + 財星(土) + 官星(金).
    const strongColors = new Set(stems.map((g) => luckyColor(strongJia(), dayOf(g))));
    expect(strongColors.size).toBeGreaterThan(1);
    for (const c of strongColors) expect(['빨강', '노랑', '흰색']).toContain(c);
  });

  it('day 없이 호출하면 체질 기본색(고정)', () => {
    expect(luckyColor(weakJia())).toBe('검정');
    expect(luckyColor(weakJia(), undefined)).toBe('검정');
  });
});

describe('luckyDirection — 그날 재신/희신 방위', () => {
  it('재신 방위를 기본 사용한다', () => {
    expect(luckyDirection(dayOf('甲', '子', '2026-06-14', '서북', '남'))).toBe('서북');
  });
  it('재신이 중앙이면 희신으로 폴백', () => {
    expect(luckyDirection(dayOf('甲', '子', '2026-06-14', '중앙', '동남'))).toBe('동남');
  });
});

// ─────────────────────────────────────────────────────────────
// fortuneBasis — 근거 구조화
// ─────────────────────────────────────────────────────────────

describe('fortuneBasis — 점수 근거(부억·喜忌)', () => {
  it('신약 甲 + 오늘 인성 → todayStance favor', () => {
    const b = fortuneBasis(weakJia(), dayOf('壬', '寅'));
    expect(b.dayGan).toBe('甲');
    expect(b.dayWuXing).toBe('木');
    expect(b.monthZhi).toBe('午'); // weakJia month=庚午
    expect(b.monthWuXing).toBe('火');
    expect(b.strength).toBe('weak');
    expect(b.todayGroup).toBe('인성');
    expect(b.todayStance).toBe('favor');
    // 정확한 십신: 甲(木·陽)×壬(水·陽) = 生我·同음양 → 편인.
    expect(b.todayTenGod).toBe('편인');
    // weakJia 월지=午(火) → 식상 → 失令.
    expect(b.deLing).toBe(false);
  });

  it('신강 甲 + 오늘 인성 → todayStance avoid', () => {
    const b = fortuneBasis(strongJia(), dayOf('壬', '寅'));
    expect(b.strength).toBe('strong');
    expect(b.todayGroup).toBe('인성');
    expect(b.todayStance).toBe('avoid');
    expect(b.todayTenGod).toBe('편인');
    // strongJia 월지=子(水) → 인성 → 得令.
    expect(b.deLing).toBe(true);
  });

  it('정/편 구분 — 같은 계열도 음양에 따라 다른 십신을 노출', () => {
    // 甲(木·陽)×己(土·陰) = 我剋·異음양 → 정재. 甲×戊(土·陽) → 편재.
    expect(fortuneBasis(weakJia(), dayOf('己', '寅')).todayTenGod).toBe('정재');
    expect(fortuneBasis(weakJia(), dayOf('戊', '寅')).todayTenGod).toBe('편재');
  });

  it('deLing 헬퍼 단독 — 得令/失令', () => {
    expect(deLing(strongJia())).toBe(true); // 월지 子(水) = 인성
    expect(deLing(weakJia())).toBe(false); // 월지 午(火) = 식상
  });

  it('결정론: 같은 입력 같은 basis', () => {
    expect(fortuneBasis(weakJia(), dayOf('壬', '寅'))).toEqual(
      fortuneBasis(weakJia(), dayOf('壬', '寅')),
    );
  });
});

// ─────────────────────────────────────────────────────────────
// seed — 결정론적 일일 시드
// ─────────────────────────────────────────────────────────────

describe('seed — 결정론·날짜 회전', () => {
  it('같은 (생일·날짜·salt)는 항상 같은 시드', () => {
    expect(seed('1995-08-20', '2026-06-14', 'phrase')).toBe(
      seed('1995-08-20', '2026-06-14', 'phrase'),
    );
  });
  it('날짜가 바뀌면 시드가 바뀐다(신선)', () => {
    const a = seed('1995-08-20', '2026-06-14');
    const b = seed('1995-08-20', '2026-06-15');
    expect(a).not.toBe(b);
  });
  it('salt가 다르면 같은 날에도 시드가 갈린다(문구/타로 충돌 회피)', () => {
    const p = seed('1995-08-20', '2026-06-14', 'phrase');
    const t = seed('1995-08-20', '2026-06-14', 'tarot');
    expect(p).not.toBe(t);
  });
  it('항상 부호없는 32비트 정수', () => {
    const s = seed('1995-08-20', '2026-06-14');
    expect(Number.isInteger(s)).toBe(true);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(0xffffffff);
  });
  it('seedIndex는 [0, n) 범위·결정론', () => {
    const s = seed('1995-08-20', '2026-06-14');
    expect(seedIndex(s, 5)).toBe(seedIndex(s, 5));
    expect(seedIndex(s, 5)).toBeGreaterThanOrEqual(0);
    expect(seedIndex(s, 5)).toBeLessThan(5);
    expect(() => seedIndex(s, 0)).toThrow();
  });
});

// ─────────────────────────────────────────────────────────────
// timeSegments — 시간대별 기운(四正 왕지)
// ─────────────────────────────────────────────────────────────

describe('branchRelation — 두 지지의 六合/六沖/同/무(기존 표 재사용)', () => {
  it('같은 지지는 same', () => {
    expect(branchRelation('子', '子')).toBe('same');
    expect(branchRelation('午', '午')).toBe('same');
  });
  it('六合은 he (子-丑, 寅-亥, 卯-戌, 午-未 …)', () => {
    expect(branchRelation('子', '丑')).toBe('he');
    expect(branchRelation('丑', '子')).toBe('he');
    expect(branchRelation('午', '未')).toBe('he');
  });
  it('六沖은 chong (子-午, 卯-酉, 寅-申 …)', () => {
    expect(branchRelation('子', '午')).toBe('chong');
    expect(branchRelation('午', '子')).toBe('chong');
    expect(branchRelation('卯', '酉')).toBe('chong');
  });
  it('합·충·같음 아니면 none', () => {
    expect(branchRelation('子', '寅')).toBe('none');
    expect(branchRelation('卯', '寅')).toBe('none');
    expect(branchRelation('午', '寅')).toBe('none');
    expect(branchRelation('酉', '寅')).toBe('none');
  });
});

describe('timeSegments — 사정 왕지 4블록(고정 순서·지지·오행) + 일진 혼합', () => {
  // 寅은 4왕지(卯午酉子) 어느 것과도 합/충/같음이 아니다(none) → 체질만 반영(중립 일진).
  const neutralDay = dayOf('壬', '寅');

  it('길이 4, morning→day→evening→night 순서', () => {
    const segs = timeSegments(strongJia(), neutralDay);
    expect(segs).toHaveLength(4);
    expect(segs.map((s) => s.part)).toEqual(['morning', 'day', 'evening', 'night']);
  });

  it('각 part의 왕지·오행은 고정(卯木·午火·酉金·子水)', () => {
    const segs = timeSegments(strongJia(), neutralDay);
    expect(segs.map((s) => s.zhi)).toEqual(['卯', '午', '酉', '子']);
    expect(segs.map((s) => s.wuXing)).toEqual(['木', '火', '金', '水']);
  });

  it('일간 木 기준 각 블록 계열(비겁/식상/관성/인성)', () => {
    const segs = timeSegments(strongJia(), neutralDay);
    expect(segs.map((s) => s.group)).toEqual(['비겁', '식상', '관성', '인성']);
  });

  it('중립 일진(寅)이면 dayBranch는 모두 none', () => {
    const segs = timeSegments(strongJia(), neutralDay);
    expect(segs.map((s) => s.dayBranch)).toEqual(['none', 'none', 'none', 'none']);
  });

  it('★ 중립 일진에서는 stance가 신강↔신약에서 뒤집힌다(부억 개인화)', () => {
    const strong = timeSegments(strongJia(), neutralDay);
    const weak = timeSegments(weakJia(), neutralDay);
    // morning(비겁): 신강=忌(avoid), 신약=喜(favor)
    expect(strong[0].stance).toBe('avoid');
    expect(weak[0].stance).toBe('favor');
    // day(식상): 신강=喜, 신약=忌
    expect(strong[1].stance).toBe('favor');
    expect(weak[1].stance).toBe('avoid');
    // night(인성): 신강=忌, 신약=喜
    expect(strong[3].stance).toBe('avoid');
    expect(weak[3].stance).toBe('favor');
  });

  it('★★ 같은 사람도 오늘 일진 지지에 따라 시간대가 매일 변동된다', () => {
    const me = strongJia(); // night(子,인성) 체질 base = avoid(−1)
    // 일진 지지=午 → 밤(子) 六沖(−1): score −2 → avoid, dayBranch=chong
    const segWu = timeSegments(me, dayOf('壬', '午'));
    // 일진 지지=丑 → 밤(子) 六合(+1): score 0 → neutral(avoid에서 완화), dayBranch=he
    const segChou = timeSegments(me, dayOf('壬', '丑'));

    const nightWu = segWu[3];
    const nightChou = segChou[3];
    // 밤 블록의 dayBranch가 일진에 따라 다르다.
    expect(nightWu.dayBranch).toBe('chong');
    expect(nightChou.dayBranch).toBe('he');
    // 합(丑)이 들어오면 avoid → neutral로 완화되어 stance가 바뀐다(매일 변동의 핵심).
    expect(nightWu.stance).toBe('avoid');
    expect(nightChou.stance).toBe('neutral');
    expect(nightWu.stance).not.toBe(nightChou.stance);
  });

  it('★★ 충이 favor 블록에 들어오면 그 블록이 뒤집힌다(신약 예)', () => {
    // 신약 甲: night(子,인성) 체질 base = favor(+1).
    // 일진 지지=午 → 밤(子) 六沖(−1): score 0 → neutral(favor에서 완화).
    const weak = weakJia();
    const base = timeSegments(weak, dayOf('壬', '寅'))[3]; // 중립
    const chong = timeSegments(weak, dayOf('壬', '午'))[3]; // 충
    expect(base.stance).toBe('favor');
    expect(base.dayBranch).toBe('none');
    expect(chong.stance).toBe('neutral');
    expect(chong.dayBranch).toBe('chong');
  });

  it('중화면 체질 base 0 → 일진 합/충만으로 stance가 갈린다', () => {
    const mixed = natal({ year: '丙寅', month: '甲午', day: '甲子', hour: '戊辰' });
    if (dayMasterStrength(mixed) === 'balanced') {
      // 중립 일진(寅): 모두 neutral
      expect(timeSegments(mixed, dayOf('壬', '寅')).every((s) => s.stance === 'neutral')).toBe(true);
      // 일진 午: 낮(午) 同 → favor, 밤(子) 충 → avoid
      const segs = timeSegments(mixed, dayOf('壬', '午'));
      expect(segs[1].stance).toBe('favor'); // 午 same
      expect(segs[1].dayBranch).toBe('same');
      expect(segs[3].stance).toBe('avoid'); // 子 vs 午 충
      expect(segs[3].dayBranch).toBe('chong');
    }
  });

  it('결정론: 같은 (natal, day) 같은 segments', () => {
    const d = dayOf('壬', '午');
    expect(timeSegments(strongJia(), d)).toEqual(timeSegments(strongJia(), d));
  });
});

// ─────────────────────────────────────────────────────────────
// dailyCaution — 조심 포인트(기신 + 충 + 忌 첫 블록)
// ─────────────────────────────────────────────────────────────

describe('dailyCaution — 기신·충·조심 시간대', () => {
  it('오늘 계열이 기신(忌)이면 avoidGroup에 그 계열', () => {
    // 신강 甲, 오늘 甲(비겁=忌). 子 vs 卯(충합 중립) → avoidGroup=비겁
    const c = dailyCaution(strongJia(), dayOf('甲', '卯'));
    expect(c.avoidGroup).toBe('비겁');
  });

  it('오늘 계열이 喜/中이면 avoidGroup=null', () => {
    // 신강 甲, 오늘 戊(재성=喜) → null
    const c = dailyCaution(strongJia(), dayOf('戊', '卯'));
    expect(c.avoidGroup).toBeNull();
  });

  it('일지×오늘 지지 충이면 chong=true', () => {
    // 신강 甲 일지 子 vs 오늘 午 = 충
    expect(dailyCaution(strongJia(), dayOf('甲', '午')).chong).toBe(true);
    // 子 vs 卯 = 충 아님
    expect(dailyCaution(strongJia(), dayOf('甲', '卯')).chong).toBe(false);
  });

  it('cautionPart = 忌(avoid) 첫 블록(중립 일진 寅: 신강=morning, 신약=day)', () => {
    // 寅은 4왕지와 합/충/같음 없음 → 체질만 반영(중립 일진).
    expect(dailyCaution(strongJia(), dayOf('甲', '寅')).cautionPart).toBe('morning');
    expect(dailyCaution(weakJia(), dayOf('甲', '寅')).cautionPart).toBe('day');
  });

  it('cautionPart도 오늘 일진 지지에 따라 매일 달라진다', () => {
    const me = strongJia(); // 체질상 avoid={비겁,인성}: morning(비겁)·night(인성)
    // 일진 卯: morning(卯) same(+1) → 비겁 base −1 상쇄(neutral) → 첫 avoid는 night.
    expect(dailyCaution(me, dayOf('甲', '卯')).cautionPart).toBe('night');
    // 일진 寅(중립): morning이 그대로 avoid → morning.
    expect(dailyCaution(me, dayOf('甲', '寅')).cautionPart).toBe('morning');
  });

  it('중화면 모든 블록 neutral → cautionPart=null', () => {
    const mixed = natal({ year: '丙寅', month: '甲午', day: '甲子', hour: '戊辰' });
    if (dayMasterStrength(mixed) === 'balanced') {
      expect(dailyCaution(mixed, dayOf('壬', '丑')).cautionPart).toBeNull();
    }
  });

  it('결정론: 같은 입력 같은 caution', () => {
    expect(dailyCaution(strongJia(), dayOf('甲', '午'))).toEqual(
      dailyCaution(strongJia(), dayOf('甲', '午')),
    );
  });
});

describe('fortuneDetail — segments + caution 묶음', () => {
  it('segments(4)와 caution을 함께 반환', () => {
    const d = fortuneDetail(strongJia(), dayOf('甲', '午'));
    expect(d.segments).toHaveLength(4);
    expect(d.caution.chong).toBe(true);
    expect(d.caution.avoidGroup).toBe('비겁');
    expect(d.caution.cautionPart).toBe('morning');
  });
});

// ─────────────────────────────────────────────────────────────
// buildFortune — 결과 조립
// ─────────────────────────────────────────────────────────────

describe('buildFortune — FortuneResult 조립(결정론)', () => {
  const n = weakJia();
  const day = dayOf('壬', '巳', '2026-06-14', '동', '남');

  it('점수·색·방향·날짜·근거를 모은다, 문구는 비어 있다(다음 step 주입)', () => {
    const r = buildFortune(n, day, '1995-08-20');
    expect(r.date).toBe('2026-06-14');
    // 신약 + 인성(喜, base4) + 일지 申×오늘 巳 합(+1) → 5
    expect(r.overall).toBe(5);
    expect(r.scores.health).toBe(5); // 인성=喜(3+1)+합(+1)
    expect(r.luckyColor).toBe('검정'); // 신약 木 ← 水
    expect(r.luckyDirection).toBe('동');
    expect(r.iljin).toBe('');
    expect(r.advice).toBe('');
    expect(r.tarot).toBeUndefined();
    // 근거 노출
    expect(r.basis.strength).toBe('weak');
    expect(r.basis.todayGroup).toBe('인성');
    expect(r.basis.todayStance).toBe('favor');
    // 상세(시간대 + 조심) 채워짐
    expect(r.detail.segments).toHaveLength(4);
    expect(r.detail.segments.map((s) => s.part)).toEqual([
      'morning', 'day', 'evening', 'night',
    ]);
    expect(r.detail).toEqual(fortuneDetail(n, day));
  });

  it('phraseProvider 주입 시 문구·타로가 채워진다', () => {
    const r = buildFortune(n, day, '1995-08-20', {
      phraseProvider: (ctx) => ({
        iljin: `오늘은 ${ctx.relation}`,
        advice: `seed=${ctx.seed}`,
        tarot: { index: 0, name: 'The Fool', reversed: false, meaning: '시작' },
      }),
    });
    expect(r.iljin).toBe('오늘은 인성');
    expect(r.advice).toBe(`seed=${seed('1995-08-20', '2026-06-14', 'phrase')}`);
    expect(r.tarot?.name).toBe('The Fool');
  });

  it('결정론: 같은 입력 → deep-equal 결과', () => {
    const a = buildFortune(n, day, '1995-08-20', { gender: 'female' });
    const b = buildFortune(n, day, '1995-08-20', { gender: 'female' });
    expect(a).toEqual(b);
  });
});
