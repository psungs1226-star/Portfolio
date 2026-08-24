// Evry Times — 위경도 ↔ 기상청 단기예보 격자(nx, ny) 변환 (순수 함수, 네트워크 0)
//
// 기상청 단기예보(getVilageFcst)는 위경도가 아닌 격자(nx, ny)를 입력으로 받는다.
// 변환식은 기상청이 배포한 표준 Lambert Conformal Conic(LCC) 공식이며,
// 아래 상수는 기상청 공식 문서(격자 정의서)의 값 그대로다. 임의 근사·변경 금지(CLAUDE.md CRITICAL #2/#3).
//
// 권위 출처: docs/ARCHITECTURE.md §6 — "Lambert Conformal Conic 고정 상수 공식 1함수".

/** 기상청 단기예보 격자 LCC 상수(공식 문서 값 — 변경 금지). */
const GRID = {
  /** 지구 반경(km). */
  RE: 6371.00877,
  /** 격자 간격(km). */
  GRID: 5.0,
  /** 표준 위도 1(deg). */
  SLAT1: 30.0,
  /** 표준 위도 2(deg). */
  SLAT2: 60.0,
  /** 기준점 경도(deg). */
  OLON: 126.0,
  /** 기준점 위도(deg). */
  OLAT: 38.0,
  /** 기준점 X 좌표(GRID). */
  XO: 43,
  /** 기준점 Y 좌표(GRID). */
  YO: 136,
} as const;

const DEGRAD = Math.PI / 180.0;
const RADDEG = 180.0 / Math.PI;

// LCC 투영 파생 상수(상수에서 유도 — 한 번만 계산).
const re = GRID.RE / GRID.GRID;
const slat1 = GRID.SLAT1 * DEGRAD;
const slat2 = GRID.SLAT2 * DEGRAD;
const olon = GRID.OLON * DEGRAD;
const olat = GRID.OLAT * DEGRAD;

let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);

let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn;

let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
ro = (re * sf) / Math.pow(ro, sn);

/**
 * 위경도 → 기상청 단기예보 격자(nx, ny).
 *
 * @param lat 위도(deg, 예: 서울시청 37.5665)
 * @param lon 경도(deg, 예: 서울시청 126.9780)
 * @returns 1-base 정수 격자 좌표 `{ nx, ny }` (예: 서울시청 → { nx: 60, ny: 127 })
 */
export function latLonToGrid(lat: number, lon: number): { nx: number; ny: number } {
  let ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5);
  ra = (re * sf) / Math.pow(ra, sn);

  let theta = lon * DEGRAD - olon;
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;

  const nx = Math.floor(ra * Math.sin(theta) + GRID.XO + 0.5);
  const ny = Math.floor(ro - ra * Math.cos(theta) + GRID.YO + 0.5);

  return { nx, ny };
}

/**
 * 기상청 격자(nx, ny) → 위경도(역변환, 선택).
 *
 * @param nx 격자 X(1-base 정수)
 * @param ny 격자 Y(1-base 정수)
 * @returns 격자 셀 중심에 해당하는 `{ lat, lon }`(deg)
 */
export function gridToLatLon(nx: number, ny: number): { lat: number; lon: number } {
  const xn = nx - GRID.XO;
  const yn = ro - ny + GRID.YO;
  let ra = Math.sqrt(xn * xn + yn * yn);
  if (sn < 0.0) ra = -ra;

  let alat = Math.pow((re * sf) / ra, 1.0 / sn);
  alat = 2.0 * Math.atan(alat) - Math.PI * 0.5;

  let theta: number;
  if (Math.abs(xn) <= 0.0) {
    theta = 0.0;
  } else if (Math.abs(yn) <= 0.0) {
    theta = Math.PI * 0.5;
    if (xn < 0.0) theta = -theta;
  } else {
    theta = Math.atan2(xn, yn);
  }
  const alon = theta / sn + olon;

  return { lat: alat * RADDEG, lon: alon * RADDEG };
}
