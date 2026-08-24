// Evry Times — 날씨 응답 캐시 (PRD §11: 캐시 우선 페인트 + 오프라인 폴백)
//
// 마지막 성공 응답(WeatherBundle)을 로컬 storage에 지역별로 캐시한다.
// 홈 첫 페인트는 캐시로 즉시 표시 → 백그라운드 갱신, 실패/오프라인 시 캐시로 폴백.
// 저장은 storage 계층(getJSON/setJSON)을 재사용한다(직렬화/버전 봉투 일원화).

import { getJSON, setJSON, remove } from '../storage';
import type { WeatherBundle } from './types';

/** 지역별 날씨 캐시 키. region.nx/ny로 구분(같은 격자는 같은 캐시). */
export function weatherCacheKey(nx: number, ny: number): string {
  return `evrytimes:weather:${nx}:${ny}`;
}

/** 캐시된 날씨 묶음을 읽는다(없으면 null). */
export async function loadWeatherCache(
  nx: number,
  ny: number,
): Promise<WeatherBundle | null> {
  return getJSON<WeatherBundle | null>(weatherCacheKey(nx, ny), null);
}

/** 날씨 묶음을 캐시에 저장한다. */
export async function saveWeatherCache(
  nx: number,
  ny: number,
  bundle: WeatherBundle,
): Promise<void> {
  await setJSON(weatherCacheKey(nx, ny), bundle);
}

/** 지역 캐시를 삭제한다(테스트/리셋용). */
export async function clearWeatherCache(nx: number, ny: number): Promise<void> {
  await remove(weatherCacheKey(nx, ny));
}
