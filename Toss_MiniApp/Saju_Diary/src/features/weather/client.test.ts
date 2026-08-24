// client 단위 테스트 — http 시임 mock + storage mock으로 호출·캐시·폴백·키주입 검증.
// 실제 네트워크 호출 0. 키 없이도 통과.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setStorageAdapter, type StorageAdapter } from '../storage';
import {
  computeBaseDateTime,
  fetchAirQuality,
  fetchShortForecast,
  fetchUV,
  loadWeather,
  MissingApiKeyError,
} from './client';
import { setWeatherApiKey, WEATHER_ENDPOINTS } from './config';
import { setHttpAdapter, type HttpAdapter, type HttpResponse } from './http';
import { clearWeatherCache } from './cache';
import type { Region } from '../../types';

const NOW = new Date('2026-06-14T08:30:00');
const REGION: Region = { name: '서울', lat: 37.5665, lon: 126.978, nx: 60, ny: 127 };

// ── fixtures (parse.test.ts와 동일 형태, 최소) ──
const forecastJson = JSON.stringify({
  response: {
    header: { resultCode: '00', resultMsg: 'OK' },
    body: { items: { item: [
      { category: 'TMP', fcstDate: '20260614', fcstTime: '0900', fcstValue: '24' },
      { category: 'SKY', fcstDate: '20260614', fcstTime: '0900', fcstValue: '1' },
      { category: 'PTY', fcstDate: '20260614', fcstTime: '0900', fcstValue: '0' },
      { category: 'TMN', fcstDate: '20260614', fcstTime: '0600', fcstValue: '19' },
      { category: 'TMX', fcstDate: '20260614', fcstTime: '1500', fcstValue: '29' },
    ] } },
  },
});
const airJson = JSON.stringify({
  response: { header: { resultCode: '00' }, body: { items: { item: [
    { sidoName: '서울', stationName: '중구', pm10Value: '45', pm25Value: '22', khaiGrade: '2' },
  ] } } },
});
const uvJson = JSON.stringify({
  response: { header: { resultCode: '00' }, body: { items: { item: [{ h0: '7' }] } } },
});

/** URL 라우팅 mock 어댑터 — 엔드포인트별 고정 응답. */
function routingAdapter(overrides?: Partial<Record<'forecast' | 'air' | 'uv', HttpResponse>>): HttpAdapter & { calls: string[] } {
  const calls: string[] = [];
  const ok = (text: string): HttpResponse => ({ ok: true, status: 200, text });
  return {
    calls,
    async get(url: string): Promise<HttpResponse> {
      calls.push(url);
      if (url.startsWith(WEATHER_ENDPOINTS.shortForecast)) return overrides?.forecast ?? ok(forecastJson);
      if (url.startsWith(WEATHER_ENDPOINTS.airQuality)) return overrides?.air ?? ok(airJson);
      if (url.startsWith(WEATHER_ENDPOINTS.uv)) return overrides?.uv ?? ok(uvJson);
      return { ok: false, status: 404, text: '' };
    },
  };
}

/** 메모리 storage mock. */
function memoryStorage(): StorageAdapter & { store: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    store,
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => { store.set(k, v); },
    removeItem: (k) => { store.delete(k); },
  };
}

beforeEach(() => {
  setWeatherApiKey('TEST_KEY');
  setStorageAdapter(memoryStorage());
});
afterEach(() => {
  setHttpAdapter();
  setStorageAdapter();
  setWeatherApiKey('');
  vi.restoreAllMocks();
});

describe('computeBaseDateTime', () => {
  it('08:30 → 직전 08시 발표', () => {
    expect(computeBaseDateTime(NOW)).toEqual({ baseDate: '20260614', baseTime: '0800' });
  });
  it('발표 후 10분 미만(08:05) → 직전 회차(05시)', () => {
    expect(computeBaseDateTime(new Date('2026-06-14T08:05:00'))).toEqual({ baseDate: '20260614', baseTime: '0500' });
  });
  it('02시 이전(01:00) → 전날 23시', () => {
    expect(computeBaseDateTime(new Date('2026-06-14T01:00:00'))).toEqual({ baseDate: '20260613', baseTime: '2300' });
  });
});

describe('키 주입(인증키)', () => {
  it('키 없으면 MissingApiKeyError throw', async () => {
    setWeatherApiKey('');
    setHttpAdapter(routingAdapter());
    await expect(fetchShortForecast(REGION, NOW)).rejects.toBeInstanceOf(MissingApiKeyError);
  });

  it('호출 URL에 주입된 serviceKey가 포함된다', async () => {
    const ad = routingAdapter();
    setHttpAdapter(ad);
    await fetchShortForecast(REGION, NOW);
    expect(ad.calls[0]).toContain('serviceKey=TEST_KEY');
    expect(ad.calls[0]).toContain('nx=60');
    expect(ad.calls[0]).toContain('ny=127');
  });
});

describe('fetch* (http 시임 경유 호출·파싱)', () => {
  it('fetchShortForecast: 슬롯·최저최고를 파싱한다', async () => {
    setHttpAdapter(routingAdapter());
    const fc = await fetchShortForecast(REGION, NOW);
    expect(fc.current).toMatchObject({ time: '09:00', temp: 24 });
    expect(fc.todayMin).toBe(19);
    expect(fc.todayMax).toBe(29);
  });

  it('fetchAirQuality: 미세먼지 등급을 파싱한다', async () => {
    setHttpAdapter(routingAdapter());
    const air = await fetchAirQuality(REGION, '서울', NOW);
    expect(air).toMatchObject({ pm10: 45, grade: 'moderate' });
  });

  it('fetchUV: 자외선 등급을 파싱한다', async () => {
    setHttpAdapter(routingAdapter());
    const uv = await fetchUV('1100000000', NOW);
    expect(uv).toMatchObject({ value: 7, grade: 'high' });
  });

  it('HTTP 에러는 throw', async () => {
    setHttpAdapter(routingAdapter({ forecast: { ok: false, status: 500, text: '' } }));
    await expect(fetchShortForecast(REGION, NOW)).rejects.toThrow(/HTTP 500/);
  });
});

describe('loadWeather — 캐시 우선 + 백그라운드 갱신', () => {
  it('첫 호출: 캐시 없음 → refresh가 묶음을 받고 캐시에 저장한다', async () => {
    setHttpAdapter(routingAdapter());
    const { cached, refresh } = await loadWeather(REGION, { sido: '서울', areaNo: '1100000000', now: NOW });
    expect(cached).toBeNull();

    const bundle = await refresh();
    expect(bundle.stale).toBe(false);
    expect(bundle.forecast?.current.temp).toBe(24);
    expect(bundle.air?.pm10).toBe(45);
    expect(bundle.uv?.value).toBe(7);

    // 두 번째 loadWeather는 캐시를 즉시 반환.
    const again = await loadWeather(REGION, { now: NOW });
    expect(again.cached?.forecast?.current.temp).toBe(24);
  });

  it('sido/areaNo 미지정 시 해당 항목은 호출하지 않고 생략', async () => {
    const ad = routingAdapter();
    setHttpAdapter(ad);
    const { refresh } = await loadWeather(REGION, { now: NOW });
    const bundle = await refresh();
    expect(bundle.forecast).toBeDefined();
    expect(bundle.air).toBeUndefined();
    expect(bundle.uv).toBeUndefined();
    expect(ad.calls.some((u) => u.startsWith(WEATHER_ENDPOINTS.airQuality))).toBe(false);
    expect(ad.calls.some((u) => u.startsWith(WEATHER_ENDPOINTS.uv))).toBe(false);
  });
});

describe('오프라인/실패 폴백', () => {
  it('네트워크 실패 + 캐시 있음 → stale=true 폴백', async () => {
    // 1) 성공 1회로 캐시 채움.
    setHttpAdapter(routingAdapter());
    await (await loadWeather(REGION, { sido: '서울', now: NOW })).refresh();

    // 2) 이후 모든 호출 실패(throw) → 캐시 폴백.
    setHttpAdapter({ get: async () => { throw new Error('OFFLINE'); } });
    const { refresh } = await loadWeather(REGION, { sido: '서울', now: NOW });
    const bundle = await refresh();
    expect(bundle.stale).toBe(true);
    expect(bundle.forecast?.current.temp).toBe(24); // 캐시값 유지
  });

  it('네트워크 실패 + 캐시 없음 → throw', async () => {
    await clearWeatherCache(REGION.nx, REGION.ny);
    setHttpAdapter({ get: async () => { throw new Error('OFFLINE'); } });
    const { refresh } = await loadWeather(REGION, { sido: '서울', now: NOW });
    await expect(refresh()).rejects.toThrow(/WEATHER_FETCH_FAILED|OFFLINE/);
  });

  it('부분 실패: 예보 성공·미세먼지 실패 → 예보만 표시(stale=false)', async () => {
    setHttpAdapter(routingAdapter({ air: { ok: false, status: 500, text: '' } }));
    const { refresh } = await loadWeather(REGION, { sido: '서울', now: NOW });
    const bundle = await refresh();
    expect(bundle.stale).toBe(false);
    expect(bundle.forecast).toBeDefined();
    expect(bundle.air).toBeUndefined();
  });
});
