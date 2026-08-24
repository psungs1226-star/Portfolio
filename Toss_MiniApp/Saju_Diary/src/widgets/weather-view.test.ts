// weather-view 단위 테스트 — 표시 가공 로직(아이콘/등급/타임라인/인디케이터/신선도).
// 순수 함수만 검증. 네트워크·Storage·UI 없음.

import { describe, expect, it } from 'vitest';
import type { Forecast, ForecastSlot } from '../features/weather';
import {
  airBadge,
  airGradeOf,
  buildDailyOutlook,
  buildHalfDay,
  buildTimeline,
  conditionLabel,
  nextDate,
  upcomingHalfDays,
  cycleIndex,
  dotIndicator,
  guessSido,
  hasUpcomingPrecip,
  iconEmoji,
  precipLabel,
  PRESET_CITIES,
  regionFromCity,
  regionFromLatLon,
  skyLabel,
  staleNotice,
  tempSummary,
  uvBadge,
  uvGradeOf,
} from './weather-view';

function slot(over: Partial<ForecastSlot>): ForecastSlot {
  return {
    time: '09:00',
    date: '2026-06-14',
    temp: 24,
    precip: 'none',
    sky: 'clear',
    iconCode: 'clear',
    ...over,
  };
}

function forecast(slots: ForecastSlot[], current: ForecastSlot, over: Partial<Forecast> = {}): Forecast {
  return {
    regionName: '서울',
    nx: 60,
    ny: 127,
    current,
    timeline: slots,
    todayMin: 19,
    todayMax: 29,
    fetchedAt: '2026-06-14T08:30:00.000Z',
    ...over,
  };
}

describe('buildDailyOutlook', () => {
  // 오늘(06-14) 3슬롯 + 내일(06-15) 2슬롯. 현재 = 06-14 12:00.
  const cur = slot({ date: '2026-06-14', time: '12:00', temp: 25, iconCode: 'clear' });
  const fc = forecast(
    [
      slot({ date: '2026-06-14', time: '12:00', temp: 25, iconCode: 'clear' }),
      slot({ date: '2026-06-14', time: '15:00', temp: 27, iconCode: 'partly-cloudy', precipProb: 20 }),
      slot({ date: '2026-06-14', time: '21:00', temp: 21, iconCode: 'cloudy' }),
      slot({ date: '2026-06-15', time: '09:00', temp: 18, iconCode: 'rain', precip: 'rain', precipProb: 80 }),
      slot({ date: '2026-06-15', time: '15:00', temp: 23, iconCode: 'rain', precip: 'rain', precipProb: 60 }),
    ],
    cur,
  );

  it('날짜별로 묶어 오늘/내일 라벨 + 최저/최고를 낸다', () => {
    const days = buildDailyOutlook(fc);
    expect(days.length).toBe(2);
    expect(days[0].label).toBe('오늘');
    expect(days[0].isToday).toBe(true);
    // 오늘은 발표 최저/최고(TMN/TMX=19/29)를 우선.
    expect(days[0].min).toBe(19);
    expect(days[0].max).toBe(29);
    expect(days[1].label).toBe('내일');
    expect(days[1].min).toBe(18);
    expect(days[1].max).toBe(23);
  });

  it('낮(12~15시) 슬롯을 대표 날씨로, 그날 최대 강수확률을 pop으로 낸다', () => {
    const days = buildDailyOutlook(fc);
    // 내일 대표 = 15시 비, pop = max(80,60)=80.
    expect(days[1].emoji).toBe('🌧️');
    expect(days[1].pop).toBe(80);
  });

  it('현재 날짜 이전 슬롯은 버린다', () => {
    const withPast = forecast(
      [slot({ date: '2026-06-13', time: '09:00' }), ...fc.timeline],
      cur,
    );
    const days = buildDailyOutlook(withPast);
    expect(days.every((d) => d.date >= '2026-06-14')).toBe(true);
  });
});

describe('buildHalfDay / nextDate', () => {
  const cur = slot({ date: '2026-06-14', time: '09:00', temp: 22, iconCode: 'clear' });
  const fc = forecast(
    [
      slot({ date: '2026-06-14', time: '09:00', temp: 22, iconCode: 'clear' }),
      slot({ date: '2026-06-14', time: '15:00', temp: 27, iconCode: 'rain', precip: 'rain', precipProb: 60 }),
      slot({ date: '2026-06-15', time: '09:00', temp: 19, iconCode: 'partly-cloudy', precipProb: 10 }),
      slot({ date: '2026-06-15', time: '15:00', temp: 24, iconCode: 'clear' }),
    ],
    cur,
  );

  it('오전(06~11)·오후(12~17) 대표 날씨/기온을 뽑는다', () => {
    const today = buildHalfDay(fc, '2026-06-14');
    expect(today.am?.emoji).toBe('☀️');
    expect(today.am?.temp).toBe(22);
    expect(today.pm?.emoji).toBe('🌧️');
    expect(today.pm?.temp).toBe(27);
    expect(today.pm?.pop).toBe(60);
  });

  it('해당 시간대 슬롯이 없으면 그 반나절은 null', () => {
    const onlyPm = forecast([slot({ date: '2026-06-14', time: '15:00' })], cur);
    const h = buildHalfDay(onlyPm, '2026-06-14');
    expect(h.am).toBeNull();
    expect(h.pm).not.toBeNull();
  });

  it('nextDate는 다음 날짜를 준다(월말 넘김 포함)', () => {
    expect(nextDate('2026-06-14')).toBe('2026-06-15');
    expect(nextDate('2026-06-30')).toBe('2026-07-01');
    expect(nextDate('2026-12-31')).toBe('2027-01-01');
  });

  it('내일 오전/오후도 같은 함수로 만든다', () => {
    const tomorrow = buildHalfDay(fc, nextDate(fc.current.date));
    expect(tomorrow.date).toBe('2026-06-15');
    expect(tomorrow.am?.temp).toBe(19);
    expect(tomorrow.pm?.temp).toBe(24);
  });

  it('upcomingHalfDays: 오전이 지났으면 오늘 오후 → 내일 오전으로 민다(#1)', () => {
    // 오늘은 오후 슬롯만(오전 지남) + 내일 오전/오후.
    const afternoon = forecast(
      [
        slot({ date: '2026-06-14', time: '15:00', temp: 27, iconCode: 'clear' }),
        slot({ date: '2026-06-15', time: '09:00', temp: 19, iconCode: 'rain', precip: 'rain', precipProb: 70 }),
        slot({ date: '2026-06-15', time: '15:00', temp: 24, iconCode: 'clear' }),
      ],
      slot({ date: '2026-06-14', time: '15:00', temp: 27, iconCode: 'clear' }),
    );
    const up = upcomingHalfDays(afternoon, 2);
    expect(up.length).toBe(2);
    expect(up[0]).toMatchObject({ dateLabel: '오늘', part: '오후' });
    expect(up[1]).toMatchObject({ dateLabel: '내일', part: '오전' });
    expect(up[1].half.pop).toBe(70);
  });
});

describe('iconEmoji', () => {
  it('강수/하늘 코드를 이모지로 매핑하고 미지 코드는 맑음 폴백', () => {
    expect(iconEmoji('rain')).toBe('🌧️');
    expect(iconEmoji('snow')).toBe('❄️');
    expect(iconEmoji('cloudy')).toBe('☁️');
    expect(iconEmoji('partly-cloudy')).toBe('⛅');
    expect(iconEmoji('clear')).toBe('☀️');
    expect(iconEmoji('???')).toBe('☀️');
  });
});

describe('precipLabel / skyLabel / conditionLabel', () => {
  it('강수가 있으면 강수 라벨, 없으면 하늘 라벨', () => {
    expect(precipLabel('rain')).toBe('비');
    expect(precipLabel('none')).toBe('');
    expect(skyLabel('cloudy')).toBe('흐림');
    expect(conditionLabel({ precip: 'rain', sky: 'cloudy' })).toBe('비');
    expect(conditionLabel({ precip: 'none', sky: 'cloudy' })).toBe('흐림');
    expect(conditionLabel({ precip: 'none', sky: undefined })).toBe('맑음');
  });
});

describe('airBadge / uvBadge', () => {
  it('등급별 라벨·색을 매핑하고 unknown은 elephant', () => {
    expect(airBadge('good').color).toBe('blue');
    expect(airBadge('very-unhealthy').color).toBe('red');
    expect(airBadge('unknown')).toEqual({ label: '미세먼지 –', color: 'elephant' });
    expect(uvBadge('high').color).toBe('yellow');
    expect(uvBadge('extreme').color).toBe('red');
    expect(uvBadge('unknown').color).toBe('elephant');
  });
});

describe('buildTimeline', () => {
  it('현재 슬롯을 "지금"으로 강조하고 강수/확률을 표시', () => {
    const cur = slot({ time: '09:00', temp: 24.4, iconCode: 'clear' });
    const next = slot({ time: '12:00', temp: 27.6, precip: 'rain', iconCode: 'rain', precipProb: 60 });
    const cells = buildTimeline(forecast([cur, next], cur));
    expect(cells).toHaveLength(2);
    expect(cells[0].isNow).toBe(true);
    expect(cells[0].label).toBe('지금');
    expect(cells[0].temp).toBe(24); // 반올림
    expect(cells[1].isNow).toBe(false);
    expect(cells[1].label).toBe('12시');
    expect(cells[1].temp).toBe(28);
    expect(cells[1].precip).toBe('비');
    expect(cells[1].pop).toBe('60%');
    expect(cells[0].pop).toBe(''); // 확률 없음
  });

  it('maxCells로 칸 수를 제한', () => {
    const cur = slot({ time: '00:00' });
    const many = Array.from({ length: 12 }, (_, i) => slot({ time: `${String(i).padStart(2, '0')}:00` }));
    expect(buildTimeline(forecast(many, cur), 5)).toHaveLength(5);
  });
});

describe('hasUpcomingPrecip', () => {
  it('타임라인에 강수가 있으면 true', () => {
    const cur = slot({});
    expect(hasUpcomingPrecip(forecast([cur, slot({ precip: 'rain' })], cur))).toBe(true);
    expect(hasUpcomingPrecip(forecast([cur, slot({ precip: 'none' })], cur))).toBe(false);
  });
});

describe('tempSummary', () => {
  it('현재 + 최저/최고를 한 줄로', () => {
    const cur = slot({ temp: 24.2 });
    expect(tempSummary(forecast([cur], cur))).toBe('24° · 최저 19° / 최고 29°');
  });
  it('최저최고 없으면 현재만', () => {
    const cur = slot({ temp: 24 });
    expect(tempSummary(forecast([cur], cur, { todayMin: undefined, todayMax: undefined }))).toBe('24°');
  });
});

describe('cycleIndex / dotIndicator', () => {
  it('2지역 순환 인덱스', () => {
    expect(cycleIndex(0, 2, 1)).toBe(1);
    expect(cycleIndex(1, 2, 1)).toBe(0); // 마지막 → 처음
    expect(cycleIndex(0, 2, -1)).toBe(1); // 처음 → 마지막
    expect(cycleIndex(0, 0, 1)).toBe(0); // 빈 배열 안전
  });
  it('점 인디케이터(● 현재 / ○ 나머지)', () => {
    expect(dotIndicator(0, 2)).toBe('●○');
    expect(dotIndicator(1, 2)).toBe('○●');
    expect(dotIndicator(0, 1)).toBe(''); // 1개면 인디케이터 없음
  });
});

describe('staleNotice', () => {
  it('stale=false면 빈 문자열, true면 안내', () => {
    expect(staleNotice({ stale: false, fetchedAt: '2026-06-14T08:30:00.000Z' })).toBe('');
    const n = staleNotice({ stale: true, fetchedAt: '2026-06-14T08:30:00.000Z' });
    expect(n.startsWith('오프라인')).toBe(true);
  });
  it('fetchedAt 파싱 실패 시 일반 문구', () => {
    expect(staleNotice({ stale: true, fetchedAt: 'not-a-date' })).toBe('오프라인 · 저장된 정보예요');
  });
});

describe('guessSido / gradeOf', () => {
  it('지역명에서 시도명 추정', () => {
    expect(guessSido('서울 강남구')).toBe('서울');
    expect(guessSido('경기 성남시 분당구')).toBe('경기');
    expect(guessSido('알 수 없는 동네')).toBeUndefined();
  });
  it('비어도 unknown 폴백', () => {
    expect(airGradeOf(undefined)).toBe('unknown');
    expect(uvGradeOf(undefined)).toBe('unknown');
  });
});

describe('regionFromLatLon / regionFromCity (위치 폴백)', () => {
  it('위경도 → 격자(grid 재사용). 서울 ≈ (60,127)', () => {
    const r = regionFromLatLon('내 위치', 37.5665, 126.978);
    expect(r.name).toBe('내 위치');
    expect(r.nx).toBe(60);
    expect(r.ny).toBe(127);
  });
  it('프리셋 도시명 → Region(격자 포함)', () => {
    const seoul = regionFromCity('서울');
    expect(seoul).toBeDefined();
    expect(seoul?.nx).toBe(60);
    expect(seoul?.ny).toBe(127);
    expect(regionFromCity('없는도시')).toBeUndefined();
  });
  it('PRESET_CITIES는 비어있지 않다(폴백 선택지)', () => {
    expect(PRESET_CITIES.length).toBeGreaterThan(0);
  });
});
