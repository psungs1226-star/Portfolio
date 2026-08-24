// Evry Times — 공공 API 원본 응답 → 앱 모델 파서 (순수 함수, 네트워크 0)
//
// 기상청 단기예보·에어코리아·생활기상지수의 raw JSON을 위젯용 모델로 정규화한다.
// 파서를 client에서 분리해 fixture로 단위 테스트한다(실호출 없이 검증).

import type {
  AirGrade,
  AirQuality,
  Forecast,
  ForecastSlot,
  PrecipType,
  SkyType,
  UVGrade,
  UVIndex,
} from './types';

// ─────────────────────────────────────────────────────────────
// 공통: data.go.kr 응답 봉투
// ─────────────────────────────────────────────────────────────

/**
 * data.go.kr JSON 응답의 공통 봉투.
 * 서비스마다 items 모양이 다르다:
 * - 기상청(단기예보·자외선): `body.items.item[]`
 * - 에어코리아(미세먼지): `body.items[]` (배열 직접)
 * 둘 다 수용한다.
 */
export interface DataGoKrResponse<Item> {
  response?: {
    header?: { resultCode?: string; resultMsg?: string };
    body?: {
      items?: { item?: Item[] | Item } | Item[];
      totalCount?: number;
    };
  };
}

/** 봉투에서 item 배열을 안전하게 추출한다(두 응답 모양 모두 지원, 단일 객체면 배열 승격). */
export function extractItems<Item>(res: DataGoKrResponse<Item>): Item[] {
  const items = res?.response?.body?.items;
  if (items == null) return [];
  // 에어코리아: body.items가 곧 배열.
  if (Array.isArray(items)) return items;
  // 기상청: body.items.item (배열 또는 단일 객체).
  const item = items.item;
  if (item == null) return [];
  return Array.isArray(item) ? item : [item];
}

/** 정상 응답(resultCode '00')인지 확인. 비정상이면 메시지와 함께 throw. */
export function assertOk<Item>(res: DataGoKrResponse<Item>): void {
  const code = res?.response?.header?.resultCode;
  // 일부 서비스는 header 없이 body만 주기도 한다 → header 없으면 통과로 본다.
  if (code != null && code !== '00') {
    const msg = res?.response?.header?.resultMsg ?? 'API_ERROR';
    throw new Error(`API ${code}: ${msg}`);
  }
}

// ─────────────────────────────────────────────────────────────
// 기상청 단기예보(getVilageFcst)
// ─────────────────────────────────────────────────────────────

/** getVilageFcst item: 카테고리·날짜·시각·값. */
export interface VilageFcstItem {
  /** 발표일자 YYYYMMDD. */
  baseDate?: string;
  /** 발표시각 HHmm. */
  baseTime?: string;
  /** 자료구분(TMP/SKY/PTY/POP/TMN/TMX 등). */
  category: string;
  /** 예보일자 YYYYMMDD. */
  fcstDate: string;
  /** 예보시각 HHmm. */
  fcstTime: string;
  /** 예보값(문자열). */
  fcstValue: string;
  nx?: number;
  ny?: number;
}

/** PTY(강수형태) 코드 → 모델. (0없음 1비 2비/눈 3눈 4소나기) */
function mapPty(code: string): PrecipType {
  switch (code) {
    case '1':
      return 'rain';
    case '2':
      return 'rain-snow';
    case '3':
      return 'snow';
    case '4':
      return 'shower';
    default:
      return 'none';
  }
}

/** SKY(하늘상태) 코드 → 모델. (1맑음 3구름많음 4흐림) */
function mapSky(code: string): SkyType | undefined {
  switch (code) {
    case '1':
      return 'clear';
    case '3':
      return 'partly-cloudy';
    case '4':
      return 'cloudy';
    default:
      return undefined;
  }
}

/** YYYYMMDD → YYYY-MM-DD. */
function fmtDate(yyyymmdd: string): string {
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

/** HHmm → HH:mm. */
function fmtTime(hhmm: string): string {
  const h = hhmm.slice(0, 2);
  const m = hhmm.slice(2, 4);
  return `${h}:${m}`;
}

/** sky+precip → 통합 아이콘 코드(위젯 아이콘 매핑 키). */
function iconCodeFor(sky: SkyType | undefined, precip: PrecipType): string {
  if (precip !== 'none') return precip; // 'rain' | 'snow' | 'rain-snow' | 'shower'
  return sky ?? 'clear';
}

/**
 * getVilageFcst 응답을 Forecast로 파싱한다.
 * - fcstDate+fcstTime별로 카테고리(TMP/SKY/PTY/POP)를 모아 슬롯 생성(3시간 단위).
 * - `now` 기준 현재(가장 가까운 미래/현재) 슬롯과 타임라인을 만든다.
 * - 오늘(now의 날짜) TMN/TMX를 최저/최고로 추출.
 *
 * @param raw getVilageFcst JSON
 * @param region 지역명·격자(표시·캐시 키)
 * @param now 기준 시각(테스트 주입; 기본 new Date())
 */
export function parseForecast(
  raw: DataGoKrResponse<VilageFcstItem>,
  region: { name: string; nx: number; ny: number },
  now: Date = new Date(),
): Forecast {
  assertOk(raw);
  const items = extractItems(raw);
  if (items.length === 0) {
    throw new Error('EMPTY_FORECAST');
  }

  // (fcstDate,fcstTime) → 카테고리 맵.
  const slots = new Map<string, Record<string, string>>();
  // TMN/TMX는 일자별 단일 값.
  const tmnByDate = new Map<string, number>();
  const tmxByDate = new Map<string, number>();

  for (const it of items) {
    const key = `${it.fcstDate}T${it.fcstTime}`;
    if (it.category === 'TMN') {
      tmnByDate.set(it.fcstDate, Number(it.fcstValue));
      continue;
    }
    if (it.category === 'TMX') {
      tmxByDate.set(it.fcstDate, Number(it.fcstValue));
      continue;
    }
    let bucket = slots.get(key);
    if (bucket == null) {
      bucket = {};
      slots.set(key, bucket);
    }
    bucket[it.category] = it.fcstValue;
  }

  // 슬롯 키를 시간 오름차순 정렬.
  const orderedKeys = [...slots.keys()].sort();

  const timeline: ForecastSlot[] = orderedKeys.map((key) => {
    const [fcstDate, fcstTime] = key.split('T');
    const cat = slots.get(key)!;
    const precip = mapPty(cat.PTY ?? '0');
    const sky = mapSky(cat.SKY ?? '');
    const tmpRaw = cat.TMP ?? cat.T1H ?? '';
    const temp = tmpRaw === '' ? NaN : Number(tmpRaw);
    const pop = cat.POP != null ? Number(cat.POP) : undefined;
    return {
      date: fmtDate(fcstDate),
      time: fmtTime(fcstTime),
      temp,
      precip,
      precipProb: pop,
      sky,
      iconCode: iconCodeFor(sky, precip),
    };
  });

  // 현재 슬롯 = now 이상의 첫 슬롯(없으면 마지막).
  const nowKey = toFcstKey(now);
  const current =
    timeline.find((s) => slotKey(s) >= nowKey) ?? timeline[timeline.length - 1];

  // 오늘(now 날짜) 최저/최고.
  const todayYmd = `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}`;

  return {
    regionName: region.name,
    nx: region.nx,
    ny: region.ny,
    current,
    timeline,
    todayMin: tmnByDate.get(todayYmd),
    todayMax: tmxByDate.get(todayYmd),
    fetchedAt: now.toISOString(),
  };
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Date → 'YYYYMMDDTHHmm' 정렬 키. */
function toFcstKey(d: Date): string {
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}T${pad2(d.getHours())}${pad2(d.getMinutes())}`;
}

/** ForecastSlot → 'YYYYMMDDTHHmm' 정렬 키(date 'YYYY-MM-DD', time 'HH:mm'). */
function slotKey(s: ForecastSlot): string {
  return `${s.date.replace(/-/g, '')}T${s.time.replace(':', '')}`;
}

// ─────────────────────────────────────────────────────────────
// 에어코리아 미세먼지
// ─────────────────────────────────────────────────────────────

/** 시도별 실시간 측정정보 item(일부 필드만). */
export interface AirItem {
  sidoName?: string;
  stationName?: string;
  pm10Value?: string;
  pm25Value?: string;
  /** 통합대기환경등급(1좋음~4매우나쁨). */
  khaiGrade?: string;
  pm10Grade?: string;
  dataTime?: string;
}

/** 등급코드(1~4) → AirGrade. */
function mapAirGrade(code: string | undefined): AirGrade {
  switch (code) {
    case '1':
      return 'good';
    case '2':
      return 'moderate';
    case '3':
      return 'unhealthy';
    case '4':
      return 'very-unhealthy';
    default:
      return 'unknown';
  }
}

function toNumOrUndef(v: string | undefined): number | undefined {
  if (v == null || v === '' || v === '-') return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}

/**
 * 시도별 측정정보 응답을 AirQuality로 파싱한다.
 * 측정소명이 주어지면 해당 측정소, 아니면 첫 유효 측정소를 사용.
 */
export function parseAirQuality(
  raw: DataGoKrResponse<AirItem>,
  opts: { sido: string; station?: string },
  now: Date = new Date(),
): AirQuality {
  assertOk(raw);
  const items = extractItems(raw);
  if (items.length === 0) {
    throw new Error('EMPTY_AIR');
  }
  const picked =
    (opts.station != null
      ? items.find((i) => i.stationName === opts.station)
      : undefined) ??
    items.find((i) => toNumOrUndef(i.pm10Value) != null) ??
    items[0];

  return {
    sido: picked.sidoName ?? opts.sido,
    station: picked.stationName,
    pm10: toNumOrUndef(picked.pm10Value),
    pm25: toNumOrUndef(picked.pm25Value),
    grade: mapAirGrade(picked.khaiGrade ?? picked.pm10Grade),
    fetchedAt: now.toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────
// 생활기상지수 자외선(getUVIdxV4)
// ─────────────────────────────────────────────────────────────

/** UV item: 시간대별 지수(h0,h3,...)를 가진 단일 레코드. */
export type UVItem = Record<string, string | undefined>;

/** UV 지수 값 → 등급(기상청 구간: 0~2낮음 3~5보통 6~7높음 8~10매우높음 11+위험). */
function mapUVGrade(value: number | undefined): UVGrade {
  if (value == null) return 'unknown';
  if (value <= 2) return 'low';
  if (value <= 5) return 'moderate';
  if (value <= 7) return 'high';
  if (value <= 10) return 'very-high';
  return 'extreme';
}

/**
 * getUVIdxV4 응답을 UVIndex로 파싱한다.
 * 응답은 h0(현재)~h78 형태의 시간대별 컬럼 → 현재(h0) 우선, 없으면 첫 유효 값 사용.
 */
export function parseUV(
  raw: DataGoKrResponse<UVItem>,
  now: Date = new Date(),
): UVIndex {
  assertOk(raw);
  const items = extractItems(raw);
  if (items.length === 0) {
    throw new Error('EMPTY_UV');
  }
  const rec = items[0];
  // h0 = 현재 시각 지수. 빈 값이면 가장 가까운 유효 시간대(h3,h6...)로 폴백.
  const candidates = ['h0', 'h3', 'h6', 'h9', 'h12'];
  let value: number | undefined;
  for (const c of candidates) {
    const v = toNumOrUndef(rec[c]);
    if (v != null) {
      value = v;
      break;
    }
  }
  return {
    value,
    grade: mapUVGrade(value),
    fetchedAt: now.toISOString(),
  };
}
