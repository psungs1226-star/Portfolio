// Evry Times — 기상청·에어코리아·생활기상지수 공공 API 클라이언트
//
// 책임: 엔드포인트 URL 조립 → http 시임 호출 → parse로 모델화 → 캐시 저장.
// CRITICAL #1/#2/#5: 읽기 전용 공공 API(data.go.kr)만, http 단일 시임 경유,
// 인증키는 config 주입(하드코딩 0). 네트워크/실패 시 캐시 폴백.
//
// 공개 API:
//   fetchShortForecast(region)  — 단기예보 Forecast
//   fetchAirQuality(region, sido) — 미세먼지 AirQuality
//   fetchUV(region, areaNo)     — 자외선 UVIndex
//   loadWeather(region, ...)    — 캐시 우선 묶음(WeatherBundle) + 백그라운드 갱신용 refresh

import type { Region } from '../../types';
import { getWeatherApiKey, hasWeatherApiKey, WEATHER_ENDPOINTS } from './config';
import { buildQuery, getJson } from './http';
import {
  parseAirQuality,
  parseForecast,
  parseUV,
  type AirItem,
  type DataGoKrResponse,
  type UVItem,
  type VilageFcstItem,
} from './parse';
import { loadWeatherCache, saveWeatherCache } from './cache';
import type { AirQuality, Forecast, UVIndex, WeatherBundle } from './types';

/** 인증키 미설정 시 던지는 식별 가능한 에러. */
export class MissingApiKeyError extends Error {
  constructor() {
    super('MISSING_API_KEY');
    this.name = 'MissingApiKeyError';
  }
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * getVilageFcst 발표 시각 계산. 단기예보는 02·05·08·11·14·17·20·23시(10분 발표).
 * 주어진 시각(now)에서 직전 발표 회차를 고른다. 02시 이전이면 전날 23시 회차.
 */
export function computeBaseDateTime(now: Date = new Date()): {
  baseDate: string;
  baseTime: string;
} {
  const slots = [2, 5, 8, 11, 14, 17, 20, 23];
  const d = new Date(now.getTime());
  // 발표 후 약 10분 뒤 제공 → 안전하게 현재시각이 슬롯+10분 이후라야 그 회차 사용.
  const hour = d.getHours();
  const minute = d.getMinutes();
  const effectiveHour = minute < 10 ? hour - 1 : hour;

  let chosen = -1;
  for (const s of slots) {
    if (effectiveHour >= s) chosen = s;
  }
  if (chosen === -1) {
    // 02시 이전 → 전날 23시.
    d.setDate(d.getDate() - 1);
    chosen = 23;
  }
  const baseDate = `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`;
  const baseTime = `${pad2(chosen)}00`;
  return { baseDate, baseTime };
}

/** 기상청 단기예보(getVilageFcst)를 호출·파싱한다. */
export async function fetchShortForecast(
  region: Region,
  now: Date = new Date(),
): Promise<Forecast> {
  if (!hasWeatherApiKey()) throw new MissingApiKeyError();
  const { baseDate, baseTime } = computeBaseDateTime(now);
  const query = buildQuery({
    serviceKey: getWeatherApiKey(),
    dataType: 'JSON',
    numOfRows: 1000,
    pageNo: 1,
    base_date: baseDate,
    base_time: baseTime,
    nx: region.nx,
    ny: region.ny,
  });
  const url = `${WEATHER_ENDPOINTS.shortForecast}?${query}`;
  const raw = await getJson<DataGoKrResponse<VilageFcstItem>>(url);
  return parseForecast(raw, { name: region.name, nx: region.nx, ny: region.ny }, now);
}

/**
 * 에어코리아 시도별 미세먼지를 호출·파싱한다.
 * @param sido 시도명(예: '서울'). region.name에서 추출하거나 호출부가 매핑.
 */
export async function fetchAirQuality(
  region: Region,
  sido: string,
  now: Date = new Date(),
): Promise<AirQuality> {
  if (!hasWeatherApiKey()) throw new MissingApiKeyError();
  const query = buildQuery({
    serviceKey: getWeatherApiKey(),
    returnType: 'json',
    numOfRows: 100,
    pageNo: 1,
    sidoName: sido,
    ver: '1.3',
  });
  const url = `${WEATHER_ENDPOINTS.airQuality}?${query}`;
  const raw = await getJson<DataGoKrResponse<AirItem>>(url);
  return parseAirQuality(raw, { sido }, now);
}

/**
 * 생활기상지수 자외선(getUVIdxV4)을 호출·파싱한다.
 * @param areaNo 행정구역코드(법정동 앞 5자리 등). 호출부가 region에서 매핑.
 */
export async function fetchUV(
  areaNo: string,
  now: Date = new Date(),
): Promise<UVIndex> {
  if (!hasWeatherApiKey()) throw new MissingApiKeyError();
  // time = 발표시각 YYYYMMDDHH(짝수 시각 발표). 직전 짝수 시각으로 보정.
  const t = new Date(now.getTime());
  const hour = t.getHours();
  const evenHour = hour % 2 === 0 ? hour : hour - 1;
  const time = `${t.getFullYear()}${pad2(t.getMonth() + 1)}${pad2(t.getDate())}${pad2(evenHour)}`;
  const query = buildQuery({
    serviceKey: getWeatherApiKey(),
    dataType: 'JSON',
    numOfRows: 10,
    pageNo: 1,
    areaNo,
    time,
  });
  const url = `${WEATHER_ENDPOINTS.uv}?${query}`;
  const raw = await getJson<DataGoKrResponse<UVItem>>(url);
  return parseUV(raw, now);
}

/** loadWeather 옵션. 미세먼지·자외선용 보조 코드(없으면 해당 항목 생략). */
export interface LoadWeatherOptions {
  /** 에어코리아 시도명(예: '서울'). 없으면 미세먼지 생략. */
  sido?: string;
  /** 생활기상지수 행정구역코드. 없으면 자외선 생략. */
  areaNo?: string;
  /** 기준 시각(테스트 주입). */
  now?: Date;
}

/**
 * 캐시 우선 날씨 묶음을 가져온다(PRD §11).
 * 1) 캐시가 있으면 먼저 반환할 수 있도록 `cached`로 제공.
 * 2) `refresh()`는 네트워크에서 새로 받아 캐시를 갱신하고 묶음을 반환.
 *    실패(오프라인·키 없음 등) 시 캐시가 있으면 stale=true로 폴백, 없으면 throw.
 *
 * 위젯은 `cached`로 첫 페인트 후 `refresh()`를 백그라운드 실행한다.
 */
export async function loadWeather(
  region: Region,
  options: LoadWeatherOptions = {},
): Promise<{
  cached: WeatherBundle | null;
  refresh: () => Promise<WeatherBundle>;
}> {
  const cached = await loadWeatherCache(region.nx, region.ny);
  const now = options.now ?? new Date();

  const refresh = async (): Promise<WeatherBundle> => {
    try {
      // 부분 실패 허용: 각 호출을 독립적으로(실패해도 나머지 표시).
      const [forecast, air, uv] = await Promise.all([
        fetchShortForecast(region, now).catch(() => undefined),
        options.sido
          ? fetchAirQuality(region, options.sido, now).catch(() => undefined)
          : Promise.resolve(undefined),
        options.areaNo
          ? fetchUV(options.areaNo, now).catch(() => undefined)
          : Promise.resolve(undefined),
      ]);

      // 핵심(예보)이 모두 실패하고 캐시가 있으면 폴백.
      if (forecast == null && air == null && uv == null) {
        if (cached != null) return { ...cached, stale: true };
        throw new Error('WEATHER_FETCH_FAILED');
      }

      const bundle: WeatherBundle = {
        forecast,
        air,
        uv,
        stale: false,
        fetchedAt: now.toISOString(),
      };
      await saveWeatherCache(region.nx, region.ny, bundle);
      return bundle;
    } catch (err) {
      if (cached != null) return { ...cached, stale: true };
      throw err;
    }
  };

  return { cached, refresh };
}
