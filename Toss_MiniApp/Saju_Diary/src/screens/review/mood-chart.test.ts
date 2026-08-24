import { describe, it, expect } from 'vitest';
import {
  makeScales,
  moodChartPoints,
  smoothLinePath,
  areaUnderPath,
  xAxisTicks,
  yAxisTicks,
  type ChartDims,
} from './mood-chart';

const DIMS: ChartDims = {
  width: 340,
  height: 210,
  padLeft: 34,
  padRight: 14,
  padTop: 16,
  padBottom: 26,
};

describe('makeScales', () => {
  const s = makeScales(30, DIMS);

  it('x: 1일은 좌측 끝(padLeft), 말일은 우측 끝(width-padRight)', () => {
    expect(s.x(1)).toBe(DIMS.padLeft);
    expect(s.x(30)).toBeCloseTo(DIMS.width - DIMS.padRight, 5);
  });

  it('y: 기분 5점은 위(padTop), 1점은 baseline', () => {
    expect(s.y(5)).toBe(DIMS.padTop);
    expect(s.y(1)).toBeCloseTo(s.baselineY, 5);
  });

  it('y는 단조 감소(점수 높을수록 위=작은 y)', () => {
    expect(s.y(5)).toBeLessThan(s.y(3));
    expect(s.y(3)).toBeLessThan(s.y(1));
  });

  it('하루짜리 달(daySpan 0)도 0 나눗셈 없이 안전', () => {
    const one = makeScales(1, DIMS);
    expect(Number.isFinite(one.x(1))).toBe(true);
    expect(one.x(1)).toBe(DIMS.padLeft);
  });
});

describe('moodChartPoints', () => {
  it('mood=null인 날은 제외하고 좌표로 변환', () => {
    const series = [
      { day: 1, mood: 2 },
      { day: 2, mood: null },
      { day: 3, mood: 5 },
    ];
    const pts = moodChartPoints(series, 30, DIMS);
    expect(pts.map((p) => p.day)).toEqual([1, 3]);
    expect(pts[0].mood).toBe(2);
    expect(pts[1].y).toBe(DIMS.padTop); // 5점=위 끝
  });

  it('빈 시계열 → 빈 배열', () => {
    expect(moodChartPoints([], 30, DIMS)).toEqual([]);
  });
});

describe('smoothLinePath', () => {
  it('0개=빈 문자열, 1개=단일 M', () => {
    expect(smoothLinePath([])).toBe('');
    expect(smoothLinePath([{ x: 10, y: 20 }])).toBe('M10,20');
  });

  it('2개 이상이면 M으로 시작하고 C(베지어)를 포함', () => {
    const d = smoothLinePath([
      { x: 0, y: 0 },
      { x: 10, y: 5 },
      { x: 20, y: 0 },
    ]);
    expect(d.startsWith('M0,0')).toBe(true);
    expect(d).toContain('C');
  });
});

describe('areaUnderPath', () => {
  it('점<2면 빈 문자열', () => {
    expect(areaUnderPath([{ x: 1, y: 1 }], 100)).toBe('');
  });

  it('라인 패스 + baseline까지 닫고 Z로 종료', () => {
    const d = areaUnderPath(
      [
        { x: 0, y: 10 },
        { x: 20, y: 5 },
      ],
      100,
    );
    expect(d).toContain('L20,100');
    expect(d).toContain('L0,100');
    expect(d.endsWith('Z')).toBe(true);
  });
});

describe('축 눈금', () => {
  it('xAxisTicks(30) = [1,5,10,15,20,25,30]', () => {
    expect(xAxisTicks(30)).toEqual([1, 5, 10, 15, 20, 25, 30]);
  });

  it('xAxisTicks(28) = [1,5,10,15,20,25] (말일 초과 눈금 제외)', () => {
    expect(xAxisTicks(28)).toEqual([1, 5, 10, 15, 20, 25]);
  });

  it('yAxisTicks = [5,4,3,2,1]', () => {
    expect(yAxisTicks()).toEqual([5, 4, 3, 2, 1]);
  });
});
