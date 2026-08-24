// 직접 입력(사주팔자 교정) — natalFromPillars / computeNatal manual 우회 단위 테스트.
//   십신은 engine.tenGod(보편 매핑)로만 환산하며 만세력을 재구현하지 않는다(CRITICAL #3).
import { describe, it, expect } from 'vitest';
import { computeNatal, natalFromPillars, isCompleteManual } from './manse';

// 일간 甲(木·양) 기준 표준 십신:
//   庚(金·양): 金剋木 → 관성·同 → 편관
//   戊(土·양): 木剋土 → 재성·同 → 편재
//   丙(火·양): 木生火 → 식상·同 → 식신
const PILLARS = { year: '庚午', month: '戊寅', day: '甲子', hour: '丙寅' } as const;

describe('natalFromPillars', () => {
  it('일간/일간오행을 일주에서 뽑는다', () => {
    const n = natalFromPillars(PILLARS);
    expect(n.day.ganZhi).toBe('甲子');
    expect(n.dayGan).toBe('甲');
    expect(n.dayWuXing).toBe('木');
    expect(n.year.ganZhi).toBe('庚午');
    expect(n.month.ganZhi).toBe('戊寅');
  });

  it('십신을 engine.tenGod로 환산한다(년/월/시; 일주는 null)', () => {
    const n = natalFromPillars(PILLARS);
    expect(n.tenGods).toEqual(['편관', '편재', null, '식신']);
    expect(n.hour?.ganZhi).toBe('丙寅');
  });

  it('시주를 비우면(미지정) 시주·시주 십신을 생략한다', () => {
    const n = natalFromPillars({ year: '庚午', month: '戊寅', day: '甲子' });
    expect(n.hour).toBeUndefined();
    expect(n.tenGods).toHaveLength(3);
  });
});

describe('computeNatal — 직접 입력 우회', () => {
  it('manual이 완전하면 만세력 대신 그 값으로 원국을 만든다', () => {
    const fromManual = computeNatal({
      birthDate: '1990-05-05',
      isLunar: false,
      manual: { ...PILLARS },
    });
    expect(fromManual).toEqual(natalFromPillars(PILLARS));
  });

  it('manual이 불완전하면 생일(만세력)로 산출한다', () => {
    const partial = computeNatal({
      birthDate: '1990-05-05',
      isLunar: false,
      manual: { year: '庚午', month: '', day: '' },
    });
    const auto = computeNatal({ birthDate: '1990-05-05', isLunar: false });
    expect(partial).toEqual(auto);
  });
});

describe('isCompleteManual', () => {
  it('year/month/day가 유효한 간지면 true(hour 선택)', () => {
    expect(isCompleteManual({ year: '庚午', month: '戊寅', day: '甲子' })).toBe(true);
    expect(isCompleteManual({ ...PILLARS })).toBe(true);
  });

  it('미지정·누락·잘못된 글자는 false', () => {
    expect(isCompleteManual(undefined)).toBe(false);
    expect(isCompleteManual({ year: '庚午', month: '戊寅', day: '' })).toBe(false);
    expect(isCompleteManual({ year: 'XX', month: '戊寅', day: '甲子' })).toBe(false);
    expect(isCompleteManual({ year: '庚', month: '戊寅', day: '甲子' })).toBe(false);
  });
});
