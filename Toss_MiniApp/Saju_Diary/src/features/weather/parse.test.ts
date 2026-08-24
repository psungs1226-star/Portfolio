// parse 단위 테스트 — 공공 API fixture(JSON) → 앱 모델 정규화 검증. 네트워크 0.

import { describe, expect, it } from 'vitest';
import {
  extractItems,
  parseAirQuality,
  parseForecast,
  parseUV,
  type AirItem,
  type DataGoKrResponse,
  type UVItem,
  type VilageFcstItem,
} from './parse';

const NOW = new Date('2026-06-14T08:30:00');

// ── getVilageFcst fixture: 08:00 발표, 09/12시 슬롯 + 오늘 TMN/TMX ──
const forecastFixture: DataGoKrResponse<VilageFcstItem> = {
  response: {
    header: { resultCode: '00', resultMsg: 'NORMAL_SERVICE' },
    body: {
      items: {
        item: [
          { category: 'TMP', fcstDate: '20260614', fcstTime: '0900', fcstValue: '24', baseDate: '20260614', baseTime: '0800' },
          { category: 'SKY', fcstDate: '20260614', fcstTime: '0900', fcstValue: '3', baseDate: '20260614', baseTime: '0800' },
          { category: 'PTY', fcstDate: '20260614', fcstTime: '0900', fcstValue: '0', baseDate: '20260614', baseTime: '0800' },
          { category: 'POP', fcstDate: '20260614', fcstTime: '0900', fcstValue: '20', baseDate: '20260614', baseTime: '0800' },
          { category: 'TMP', fcstDate: '20260614', fcstTime: '1200', fcstValue: '27', baseDate: '20260614', baseTime: '0800' },
          { category: 'SKY', fcstDate: '20260614', fcstTime: '1200', fcstValue: '1', baseDate: '20260614', baseTime: '0800' },
          { category: 'PTY', fcstDate: '20260614', fcstTime: '1200', fcstValue: '1', baseDate: '20260614', baseTime: '0800' },
          { category: 'POP', fcstDate: '20260614', fcstTime: '1200', fcstValue: '60', baseDate: '20260614', baseTime: '0800' },
          { category: 'TMN', fcstDate: '20260614', fcstTime: '0600', fcstValue: '19', baseDate: '20260614', baseTime: '0800' },
          { category: 'TMX', fcstDate: '20260614', fcstTime: '1500', fcstValue: '29', baseDate: '20260614', baseTime: '0800' },
        ],
      },
      totalCount: 10,
    },
  },
};

describe('extractItems', () => {
  it('item 배열을 추출한다', () => {
    expect(extractItems(forecastFixture)).toHaveLength(10);
  });
  it('단일 item 객체를 배열로 승격한다', () => {
    const single: DataGoKrResponse<{ x: number }> = {
      response: { body: { items: { item: { x: 1 } } } },
    };
    expect(extractItems(single)).toEqual([{ x: 1 }]);
  });
  it('item 없으면 빈 배열', () => {
    expect(extractItems({})).toEqual([]);
  });
});

describe('parseForecast', () => {
  const region = { name: '서울', nx: 60, ny: 127 };

  it('슬롯·아이콘·기온·강수확률을 정규화한다', () => {
    const fc = parseForecast(forecastFixture, region, NOW);
    expect(fc.timeline).toHaveLength(2);
    const [s9, s12] = fc.timeline;
    expect(s9).toMatchObject({ date: '2026-06-14', time: '09:00', temp: 24, precip: 'none', precipProb: 20, sky: 'partly-cloudy', iconCode: 'partly-cloudy' });
    expect(s12).toMatchObject({ time: '12:00', temp: 27, precip: 'rain', precipProb: 60, sky: 'clear', iconCode: 'rain' });
  });

  it('현재 슬롯 = now(08:30) 이상의 첫 슬롯(09:00)', () => {
    const fc = parseForecast(forecastFixture, region, NOW);
    expect(fc.current.time).toBe('09:00');
  });

  it('오늘 최저/최고 기온(TMN/TMX)을 뽑는다', () => {
    const fc = parseForecast(forecastFixture, region, NOW);
    expect(fc.todayMin).toBe(19);
    expect(fc.todayMax).toBe(29);
  });

  it('지역명·격자를 보존한다', () => {
    const fc = parseForecast(forecastFixture, region, NOW);
    expect(fc).toMatchObject({ regionName: '서울', nx: 60, ny: 127 });
  });

  it('resultCode가 00이 아니면 throw', () => {
    const bad: DataGoKrResponse<VilageFcstItem> = {
      response: { header: { resultCode: '03', resultMsg: 'NODATA_ERROR' }, body: {} },
    };
    expect(() => parseForecast(bad, region, NOW)).toThrow(/API 03/);
  });

  it('빈 예보면 throw', () => {
    expect(() => parseForecast({ response: { header: { resultCode: '00' }, body: { items: { item: [] } } } }, region, NOW)).toThrow(/EMPTY_FORECAST/);
  });
});

// ── 에어코리아 fixture ──
const airFixture: DataGoKrResponse<AirItem> = {
  response: {
    header: { resultCode: '00', resultMsg: 'NORMAL_SERVICE' },
    body: {
      items: {
        item: [
          { sidoName: '서울', stationName: '중구', pm10Value: '45', pm25Value: '22', khaiGrade: '2', pm10Grade: '2', dataTime: '2026-06-14 08:00' },
          { sidoName: '서울', stationName: '강남구', pm10Value: '80', pm25Value: '40', khaiGrade: '3', pm10Grade: '3', dataTime: '2026-06-14 08:00' },
        ],
      },
    },
  },
};

describe('parseAirQuality', () => {
  it('첫 유효 측정소의 PM·등급을 정규화한다', () => {
    const air = parseAirQuality(airFixture, { sido: '서울' }, NOW);
    expect(air).toMatchObject({ sido: '서울', station: '중구', pm10: 45, pm25: 22, grade: 'moderate' });
  });

  it('지정 측정소를 우선 선택한다', () => {
    const air = parseAirQuality(airFixture, { sido: '서울', station: '강남구' }, NOW);
    expect(air).toMatchObject({ station: '강남구', pm10: 80, grade: 'unhealthy' });
  });

  it("결측치('-')는 undefined로 처리한다", () => {
    const fx: DataGoKrResponse<AirItem> = {
      response: { header: { resultCode: '00' }, body: { items: { item: [{ sidoName: '서울', pm10Value: '-', khaiGrade: '1' }] } } },
    };
    const air = parseAirQuality(fx, { sido: '서울' }, NOW);
    expect(air.pm10).toBeUndefined();
    expect(air.grade).toBe('good');
  });
});

// ── 생활기상지수 자외선 fixture ──
const uvFixture: DataGoKrResponse<UVItem> = {
  response: {
    header: { resultCode: '00', resultMsg: 'NORMAL_SERVICE' },
    body: { items: { item: [{ date: '2026061408', h0: '7', h3: '5', h6: '2' }] } },
  },
};

describe('parseUV', () => {
  it('h0(현재) 지수와 등급을 정규화한다', () => {
    const uv = parseUV(uvFixture, NOW);
    expect(uv.value).toBe(7);
    expect(uv.grade).toBe('high');
  });

  it('h0 결측 시 다음 유효 시간대로 폴백한다', () => {
    const fx: DataGoKrResponse<UVItem> = {
      response: { header: { resultCode: '00' }, body: { items: { item: [{ h0: '', h3: '9' }] } } },
    };
    const uv = parseUV(fx, NOW);
    expect(uv.value).toBe(9);
    expect(uv.grade).toBe('very-high');
  });

  it('등급 구간 경계: 11+ = extreme', () => {
    const fx: DataGoKrResponse<UVItem> = {
      response: { header: { resultCode: '00' }, body: { items: { item: [{ h0: '11' }] } } },
    };
    expect(parseUV(fx, NOW).grade).toBe('extreme');
  });
});
