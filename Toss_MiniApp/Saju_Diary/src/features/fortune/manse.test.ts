import { describe, expect, it } from 'vitest';
import { Solar } from 'lunar-javascript';
import type { SajuInput } from '../../types';
import { computeDayGanZhi, computeNatal, todayDateString } from './manse';

// 기대값은 모두 lunar-javascript 출력으로 확정(추측 금지). 이 테스트는 우리 어댑터가
// 라이브러리 결과를 그대로(글자 단위) 전달하고 도메인 타입으로 정규화하는지 검증한다.
// CRITICAL #3: 우리가 간지를 직접 계산하지 않고 라이브러리 위임이 유지되는지 회귀 방지.

describe('computeNatal — 원국 산출(양력)', () => {
  it('알려진 양력 날짜+시간의 사주 사주 간지가 라이브러리와 일치한다', () => {
    const input: SajuInput = { birthDate: '2026-06-14', birthTime: '12:00', isLunar: false };
    const chart = computeNatal(input);

    expect(chart.year.ganZhi).toBe('丙午');
    expect(chart.month.ganZhi).toBe('甲午');
    expect(chart.day.ganZhi).toBe('己未');
    expect(chart.hour?.ganZhi).toBe('庚午');

    // 일간 = 본질, day.gan과 동일
    expect(chart.dayGan).toBe('己');
    expect(chart.day.gan).toBe('己');
    expect(chart.day.zhi).toBe('未');
    expect(chart.dayWuXing).toBe('土'); // 己 = 土
  });

  it('십신은 일간 기준이며 일주는 null(=日主)이다', () => {
    const input: SajuInput = { birthDate: '2026-06-14', birthTime: '12:00', isLunar: false };
    const chart = computeNatal(input);
    // [년, 월, 일, 시] — 라이브러리: 正印, 正官, 日主, 伤官
    expect(chart.tenGods).toEqual(['정인', '정관', null, '상관']);
  });

  it('시간 미입력 시 시주와 시주 십신을 생략한다', () => {
    const input: SajuInput = { birthDate: '1995-08-20', isLunar: false };
    const chart = computeNatal(input);
    expect(chart.hour).toBeUndefined();
    expect(chart.day.ganZhi).toBe('癸未'); // 라이브러리 확인값
    expect(chart.tenGods).toHaveLength(3); // 시주 십신 없음
  });
});

describe('computeNatal — 음력 변환(라이브러리 위임)', () => {
  it('음력 입력이 라이브러리로 양력 변환되어 동일 일주를 낸다', () => {
    // 음력 2026-04-29 == 양력 2026-06-14 (라이브러리 확인)
    const lunarInput: SajuInput = { birthDate: '2026-04-29', birthTime: '12:00', isLunar: true };
    const solarInput: SajuInput = { birthDate: '2026-06-14', birthTime: '12:00', isLunar: false };
    const fromLunar = computeNatal(lunarInput);
    const fromSolar = computeNatal(solarInput);
    expect(fromLunar.day.ganZhi).toBe(fromSolar.day.ganZhi);
    expect(fromLunar.year.ganZhi).toBe(fromSolar.year.ganZhi);
  });
});

describe('computeNatal — 야자시(sect 2 / 晩子時) 표준 정합', () => {
  it('23시 출생 시 일주를 다음 날로 넘기지 않는다(晩子時)', () => {
    // 1990-05-15 23:30 — 晩子時(sect 2)에서 일주는 당일 庚辰 유지.
    const input: SajuInput = { birthDate: '1990-05-15', birthTime: '23:30', isLunar: false };
    const chart = computeNatal(input);
    expect(chart.day.ganZhi).toBe('庚辰');

    // 정합 검증: 같은 날 정오의 일주와 동일(일주가 23시에 넘어가지 않음)
    const noon = computeNatal({ birthDate: '1990-05-15', birthTime: '12:00', isLunar: false });
    expect(chart.day.ganZhi).toBe(noon.day.ganZhi);
  });
});

describe('computeDayGanZhi — 오늘 일진', () => {
  it('주어진 양력 날짜의 일진 간지·오행이 라이브러리와 일치한다', () => {
    const dj = computeDayGanZhi('2026-06-14');
    expect(dj.date).toBe('2026-06-14');
    expect(dj.pillar.ganZhi).toBe('己未');
    expect(dj.ganWuXing).toBe('土'); // 己 = 土
    expect(dj.zhiWuXing).toBe('土'); // 未 = 土
  });

  it('재신/희신 방위를 한국어 Direction으로 매핑한다', () => {
    // 2026-06-14: 재신 正北→북, 희신 东北→동북 (라이브러리 확인)
    const dj = computeDayGanZhi('2026-06-14');
    expect(dj.caiDirection).toBe('북');
    expect(dj.xiDirection).toBe('동북');
  });

  it('일진은 시간 무관(60갑자 일주)이다', () => {
    const a = computeDayGanZhi('2000-01-01');
    expect(a.pillar.ganZhi).toBe('戊午'); // 라이브러리 확인값
  });

  it('새벽 5시 경계로 날짜가 바뀐다(05시 이전은 전날)', () => {
    // 같은 달력일이라도 04:59는 전날, 05:00은 당일(로컬 기준).
    expect(todayDateString(new Date(2026, 5, 17, 4, 59))).toBe('2026-06-16');
    expect(todayDateString(new Date(2026, 5, 17, 5, 0))).toBe('2026-06-17');
    expect(todayDateString(new Date(2026, 5, 17, 23, 0))).toBe('2026-06-17');
    // 자정 직후도 전날.
    expect(todayDateString(new Date(2026, 5, 17, 0, 30))).toBe('2026-06-16');
  });

  it('인자 없이 호출하면 오늘 날짜를 사용한다', () => {
    const dj = computeDayGanZhi();
    expect(dj.date).toBe(todayDateString());
    // 라이브러리가 실제로 그날 일진을 냈는지 교차 확인
    const [y, m, d] = todayDateString().split('-').map(Number);
    const expected = Solar.fromYmd(y, m, d).getLunar().getDayInGanZhi();
    expect(dj.pillar.ganZhi).toBe(expected);
  });
});

describe('입력 검증', () => {
  it('잘못된 날짜 형식이면 throw 한다', () => {
    expect(() => computeNatal({ birthDate: '2026/06/14', isLunar: false })).toThrow();
  });
  it('잘못된 시각 형식이면 throw 한다', () => {
    expect(() => computeNatal({ birthDate: '2026-06-14', birthTime: '12시', isLunar: false })).toThrow();
  });
});
