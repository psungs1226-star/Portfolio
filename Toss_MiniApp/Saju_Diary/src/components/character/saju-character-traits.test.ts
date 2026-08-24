// saju-character-traits 단위 테스트 — 순수·결정론(원국 읽기만).
import { describe, it, expect } from 'vitest';
import { characterTraits } from './saju-character-traits';
import type { NatalChart, TenGod } from '../../types';

function natal(dayWuXing: NatalChart['dayWuXing'], tenGods: (TenGod | null)[]): NatalChart {
  const pillar = (gz: string) => ({ gan: gz[0], zhi: gz[1], ganZhi: gz });
  return {
    year: pillar('甲子'),
    month: pillar('丙寅'),
    day: pillar('庚午'),
    dayGan: '庚',
    dayWuXing,
    tenGods,
  };
}

describe('characterTraits', () => {
  it('element = 일간 오행', () => {
    expect(characterTraits(natal('金', ['정재', null, '편관'])).element).toBe('金');
    expect(characterTraits(natal('水', [null])).element).toBe('水');
  });

  it('secondElement = 일간 오행 제외 최빈 오행(십신→오행 환산)', () => {
    // 일간 金: 재성(木) 2 > 관성(火) 1 → 두 번째 오행 木.
    expect(characterTraits(natal('金', ['편재', '정재', '편관'])).secondElement).toBe('木');
    // 일간 木: 인성(水) 2 > 식상(火) 1 → 두 번째 오행 水.
    expect(characterTraits(natal('木', ['편인', '정인', '식신'])).secondElement).toBe('水');
  });

  it('secondElement는 항상 일간 오행과 다르다', () => {
    for (const me of ['木', '火', '土', '金', '水'] as const) {
      const t = characterTraits(natal(me, ['비견', '겁재'])); // 비겁(=자기 오행)만
      expect(t.secondElement).not.toBe(me);
    }
  });

  it('동점이면 오행 순서(木火土金水)로 tie-break', () => {
    // 일간 金: 재성(木)1 · 관성(火)1 동점 → 木 우선.
    expect(characterTraits(natal('金', ['정재', '정관'])).secondElement).toBe('木');
  });

  it('십신이 빈약하면 일간이 生하는 오행으로 폴백(≠ 일간)', () => {
    // 火가 生하는 오행 = 土.
    expect(characterTraits(natal('火', [null, null])).secondElement).toBe('土');
  });

  it('같은 원국 → 같은 결과(결정론)', () => {
    const n = natal('土', ['정관', '편재', '식신']);
    expect(characterTraits(n)).toEqual(characterTraits(n));
  });
});
