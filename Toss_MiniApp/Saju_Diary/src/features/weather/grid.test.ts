// grid-convert 단위 테스트 — 기상청 LCC 변환의 알려진 좌표 정합 검증.
//
// 골든 값: 기상청 단기예보 격자 정의서의 주요 도시 (위경도 → nx, ny) 매핑.
// 변환 상수(grid.ts GRID)나 공식이 바뀌면 여기서 깨진다.

import { describe, expect, it } from 'vitest';
import { gridToLatLon, latLonToGrid } from './grid';

// 도/시청 대표 좌표 → 기상청 격자(공식 격자표 값).
const CITY_CASES = [
  { name: '서울시청', lat: 37.5665, lon: 126.978, nx: 60, ny: 127 },
  { name: '부산시청', lat: 35.1796, lon: 129.0756, nx: 98, ny: 76 },
  { name: '인천시청', lat: 37.4563, lon: 126.7052, nx: 55, ny: 124 },
  { name: '광주시청', lat: 35.1595, lon: 126.8526, nx: 58, ny: 74 },
  { name: '대전시청', lat: 36.3504, lon: 127.3845, nx: 67, ny: 100 },
  { name: '제주시청', lat: 33.4996, lon: 126.5312, nx: 53, ny: 38 },
] as const;

describe('latLonToGrid — 알려진 도시 좌표 → 격자 정합', () => {
  it.each(CITY_CASES)('$name → ($nx, $ny)', ({ lat, lon, nx, ny }) => {
    expect(latLonToGrid(lat, lon)).toEqual({ nx, ny });
  });

  it('서울시청은 (60, 127)이다 (AC 핵심 케이스)', () => {
    expect(latLonToGrid(37.5665, 126.978)).toEqual({ nx: 60, ny: 127 });
  });

  it('정수 격자를 반환한다', () => {
    const { nx, ny } = latLonToGrid(37.5665, 126.978);
    expect(Number.isInteger(nx)).toBe(true);
    expect(Number.isInteger(ny)).toBe(true);
  });

  it('순수 함수 — 같은 입력은 항상 같은 출력(결정론)', () => {
    expect(latLonToGrid(35.1796, 129.0756)).toEqual(latLonToGrid(35.1796, 129.0756));
  });
});

describe('gridToLatLon — 역변환 라운드트립', () => {
  it.each(CITY_CASES)('$name 격자를 위경도로 되돌리면 같은 셀로 재변환된다', ({ nx, ny }) => {
    const { lat, lon } = gridToLatLon(nx, ny);
    expect(latLonToGrid(lat, lon)).toEqual({ nx, ny });
  });

  it('역변환 위경도는 원래 좌표와 격자 셀(±0.05°) 이내로 근접한다', () => {
    const seoul = CITY_CASES[0];
    const { lat, lon } = gridToLatLon(seoul.nx, seoul.ny);
    expect(Math.abs(lat - seoul.lat)).toBeLessThan(0.05);
    expect(Math.abs(lon - seoul.lon)).toBeLessThan(0.05);
  });
});
