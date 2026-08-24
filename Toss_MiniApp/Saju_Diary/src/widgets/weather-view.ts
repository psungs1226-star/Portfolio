// Evry Times — 날씨 위젯 표시 조립 로직 (UI 비의존, 테스트 가능)
//
// 역할: weather feature(client/types)가 만든 모델(WeatherBundle/Forecast/등급)을
//   위젯이 그대로 그릴 표시용 형태로 가공한다. 격자 변환·HTTP 파싱은 여기서 하지 않는다
//   (CRITICAL #5 단일 출처 — client/parse/grid 재사용). 여기는 "보여주기"만 담당.
//
// 순수·결정론적. Storage·UI·네트워크 import 0. 기준 시각은 인자 주입(테스트 가능).

import {
  latLonToGrid,
  type AirGrade,
  type AirQuality,
  type Forecast,
  type ForecastSlot,
  type PrecipType,
  type SkyType,
  type UVGrade,
  type UVIndex,
  type WeatherBundle,
} from '../features/weather';
import type { Region } from '../types';

// ─────────────────────────────────────────────────────────────
// 아이콘 / 라벨 매핑 (iconCode = sky | precip 통합 코드)
// ─────────────────────────────────────────────────────────────

/**
 * 통합 아이콘 코드 → 이모지. parse.iconCodeFor 결과(=precip 또는 sky)를 받는다.
 * 새 그래픽 라이브러리 금지(CRITICAL #5) → 시스템 이모지로 표시.
 */
export function iconEmoji(iconCode: string): string {
  switch (iconCode) {
    case 'rain':
      return '🌧️';
    case 'shower':
      return '🌦️';
    case 'snow':
      return '❄️';
    case 'rain-snow':
      return '🌨️';
    case 'cloudy':
      return '☁️';
    case 'partly-cloudy':
      return '⛅';
    case 'clear':
    default:
      return '☀️';
  }
}

/** 강수 형태 → 한 줄 라벨(타임라인 강수 사전 표시용). 'none'이면 빈 문자열. */
export function precipLabel(precip: PrecipType): string {
  switch (precip) {
    case 'rain':
      return '비';
    case 'shower':
      return '소나기';
    case 'snow':
      return '눈';
    case 'rain-snow':
      return '비/눈';
    case 'none':
    default:
      return '';
  }
}

/** 하늘 상태 → 한 줄 라벨. */
export function skyLabel(sky: SkyType | undefined): string {
  switch (sky) {
    case 'clear':
      return '맑음';
    case 'partly-cloudy':
      return '구름많음';
    case 'cloudy':
      return '흐림';
    default:
      return '';
  }
}

/** iconCode 한 줄 요약 라벨(현재 날씨 표시용). */
export function conditionLabel(slot: Pick<ForecastSlot, 'precip' | 'sky'>): string {
  const p = precipLabel(slot.precip);
  if (p !== '') return p;
  const s = skyLabel(slot.sky);
  return s !== '' ? s : '맑음';
}

// ─────────────────────────────────────────────────────────────
// 등급 → 라벨 / 의미색 키
// ─────────────────────────────────────────────────────────────

/** TDS Badge color 키(우리가 쓰는 부분집합). */
export type BadgeColor = 'blue' | 'green' | 'yellow' | 'red' | 'elephant';

/** 미세먼지 등급 → 라벨 + Badge 색. */
export function airBadge(grade: AirGrade): { label: string; color: BadgeColor } {
  switch (grade) {
    case 'good':
      return { label: '미세먼지 좋음', color: 'blue' };
    case 'moderate':
      return { label: '미세먼지 보통', color: 'green' };
    case 'unhealthy':
      return { label: '미세먼지 나쁨', color: 'yellow' };
    case 'very-unhealthy':
      return { label: '미세먼지 매우나쁨', color: 'red' };
    case 'unknown':
    default:
      return { label: '미세먼지 –', color: 'elephant' };
  }
}

/** 자외선 등급 → 라벨 + Badge 색. */
export function uvBadge(grade: UVGrade): { label: string; color: BadgeColor } {
  switch (grade) {
    case 'low':
      return { label: '자외선 낮음', color: 'blue' };
    case 'moderate':
      return { label: '자외선 보통', color: 'green' };
    case 'high':
      return { label: '자외선 높음', color: 'yellow' };
    case 'very-high':
      return { label: '자외선 매우높음', color: 'red' };
    case 'extreme':
      return { label: '자외선 위험', color: 'red' };
    case 'unknown':
    default:
      return { label: '자외선 –', color: 'elephant' };
  }
}

// ─────────────────────────────────────────────────────────────
// 타임라인 가공
// ─────────────────────────────────────────────────────────────

/** 위젯 타임라인 한 칸(표시 전용). */
export interface TimelineCell {
  /** 표시용 시각 라벨(`지금` 또는 `HH시`). */
  label: string;
  /** 원본 `HH:mm`. */
  time: string;
  /** 날씨 이모지. */
  emoji: string;
  /** 기온(℃, 정수 반올림). */
  temp: number;
  /** 강수 사전 표시 라벨(없으면 ''). */
  precip: string;
  /** 강수 확률(%) 표시 문자열(없으면 ''). */
  pop: string;
  /** "지금" 칸인지(강조). */
  isNow: boolean;
}

/**
 * Forecast.timeline을 위젯 타임라인 셀 배열로 가공한다.
 * - 현재 슬롯(forecast.current)과 같은 시각 칸을 "지금"으로 강조.
 * - 강수 시간대는 precip 라벨을 사전 표시.
 *
 * @param forecast 정규화된 단기예보
 * @param maxCells 표시 최대 칸 수(3시간 단위 → 9칸이면 약 24시간 이후까지)
 */
export function buildTimeline(forecast: Forecast, maxCells = 9): TimelineCell[] {
  const nowKey = `${forecast.current.date} ${forecast.current.time}`;
  // "지금"부터 잘라 앞으로의 시간대를 보여준다(발표 기준점부터 자르면 지난 시간이 자리를 먹어
  // 실제로는 ~12시간만 보이던 문제 #2 수정). 현재 슬롯을 못 찾으면 처음부터.
  const startIdx = Math.max(
    0,
    forecast.timeline.findIndex((s) => `${s.date} ${s.time}` === nowKey),
  );
  return forecast.timeline.slice(startIdx, startIdx + maxCells).map((slot) => {
    const key = `${slot.date} ${slot.time}`;
    const isNow = key === nowKey;
    const hour = slot.time.slice(0, 2);
    return {
      label: isNow ? '지금' : `${Number(hour)}시`,
      time: slot.time,
      emoji: iconEmoji(slot.iconCode),
      temp: Math.round(slot.temp),
      precip: precipLabel(slot.precip),
      pop: slot.precipProb != null ? `${slot.precipProb}%` : '',
      isNow,
    };
  });
}

/** 타임라인에 강수(비/눈/소나기) 시간대가 하나라도 있는지(사전 안내 문구용). */
export function hasUpcomingPrecip(forecast: Forecast): boolean {
  return forecast.timeline.some((s) => s.precip !== 'none');
}

// ─────────────────────────────────────────────────────────────
// 오전/오후 요약(작게=오늘 / 보통 헤더=내일) — 3시간 슬롯을 반나절로 압축
//
// 작게는 시간 띠를 길게 늘이지 않고 **오전/오후 한 줄**로 요약한다(#1). 보통은 헤더 빈 칸에
// **내일 오전/오후**를 보여준다(#2). 둘 다 같은 buildHalfDay로 만든다. 순수·UI 비의존.
// ─────────────────────────────────────────────────────────────

/** 반나절(오전 또는 오후) 요약. */
export interface HalfDay {
  emoji: string;
  /** 대표 기온(℃, 정수). */
  temp: number;
  /** 그 반나절 최대 강수확률(%) — 없으면 undefined. */
  pop?: number;
}

/** 하루의 오전/오후 요약(둘 중 데이터 없는 쪽은 null). */
export interface HalfDayOutlook {
  date: string;
  am: HalfDay | null;
  pm: HalfDay | null;
}

/** 슬롯 묶음을 대표 시각(target에 가장 가까운 시각) 기준 HalfDay로 압축. */
function summarizeHalf(slots: ForecastSlot[], targetHour: number): HalfDay | null {
  if (slots.length === 0) return null;
  const rep = slots.reduce((best, s) => {
    const h = Number(s.time.slice(0, 2));
    const bh = Number(best.time.slice(0, 2));
    return Math.abs(h - targetHour) < Math.abs(bh - targetHour) ? s : best;
  }, slots[0]);
  const pops = slots.map((s) => s.precipProb).filter((p): p is number => p != null);
  return {
    emoji: iconEmoji(rep.iconCode),
    temp: Math.round(rep.temp),
    pop: pops.length > 0 ? Math.max(...pops) : undefined,
  };
}

/**
 * 특정 날짜의 오전(06~11시, 대표 09시)·오후(12~17시, 대표 15시) 요약을 만든다.
 * 해당 시간대 슬롯이 없으면 그 반나절은 null(과거 시간 등).
 */
export function buildHalfDay(forecast: Forecast, date: string): HalfDayOutlook {
  const onDate = forecast.timeline.filter((s) => s.date === date);
  const am = onDate.filter((s) => {
    const h = Number(s.time.slice(0, 2));
    return h >= 6 && h <= 11;
  });
  const pm = onDate.filter((s) => {
    const h = Number(s.time.slice(0, 2));
    return h >= 12 && h <= 17;
  });
  return { date, am: summarizeHalf(am, 9), pm: summarizeHalf(pm, 15) };
}

/** `YYYY-MM-DD`의 다음 날짜 문자열(타임존 안전, UTC 자정 기준). */
export function nextDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d) + 86400000).toISOString().slice(0, 10);
}

/** 라벨이 붙은 반나절(작게 위젯의 "오후"/"내일 오전" 칩). */
export interface LabeledHalf {
  /** 상대 날짜 라벨(오늘/내일/모레). */
  dateLabel: string;
  /** 오전/오후. */
  part: '오전' | '오후';
  half: HalfDay;
}

const REL_DAY_LABEL = ['오늘', '내일', '모레'] as const;

/**
 * **앞으로 다가오는** 반나절을 시간순으로 count개 모은다(작게 위젯용).
 * 오늘 오전이 이미 지났으면(슬롯 없음) 자연히 오늘 오후 → 내일 오전… 으로 밀린다(#1).
 * 데이터가 있는 반나절만 담는다.
 */
export function upcomingHalfDays(forecast: Forecast, count = 2): LabeledHalf[] {
  const out: LabeledHalf[] = [];
  let date = forecast.current.date;
  for (let i = 0; i < REL_DAY_LABEL.length && out.length < count; i += 1) {
    const o = buildHalfDay(forecast, date);
    if (o.am != null) out.push({ dateLabel: REL_DAY_LABEL[i], part: '오전', half: o.am });
    if (out.length < count && o.pm != null) out.push({ dateLabel: REL_DAY_LABEL[i], part: '오후', half: o.pm });
    date = nextDate(date);
  }
  return out.slice(0, count);
}

// ─────────────────────────────────────────────────────────────
// 일별 예보(보통 모드 "주간날씨") — 단기예보 타임라인을 날짜별로 묶어 요약
//
// 단기예보(getVilageFcst)는 오늘 포함 약 3일치 3시간 슬롯을 준다. 별도 중기예보 API 없이
// 가진 타임라인을 **날짜별로 그룹**해 일 최저/최고·대표 날씨·강수확률로 요약한다(#2 보통 모드).
// 순수·결정론. UI 비의존.
// ─────────────────────────────────────────────────────────────

/** 일별 예보 한 칸(표시 전용). */
export interface DailyCell {
  /** 원본 날짜 `YYYY-MM-DD`. */
  date: string;
  /** 표시 라벨(오늘/내일/모레 또는 `월`~`일` 요일). */
  label: string;
  /** 대표 날씨 이모지(낮 시간대 우선). */
  emoji: string;
  /** 일 최저기온(℃, 정수). */
  min: number;
  /** 일 최고기온(℃, 정수). */
  max: number;
  /** 그날 최대 강수확률(%) — 없으면 undefined. */
  pop?: number;
  /** "오늘" 칸인지(강조). */
  isToday: boolean;
}

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'] as const;

/** `YYYY-MM-DD` → 요일 한 글자(로컬 캘린더). */
function weekdayLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  if (y == null || m == null || d == null) return '';
  return WEEKDAY_KO[new Date(y, m - 1, d).getDay()] ?? '';
}

/**
 * 단기예보 타임라인을 **날짜별 요약**으로 묶는다(보통 모드 일별 예보용).
 * - 각 날짜: 최저/최고기온, 대표 날씨(낮 12~15시 우선, 없으면 첫 슬롯), 최대 강수확률.
 * - 라벨: 오늘/내일/모레는 상대어, 그 이후는 요일 한 글자.
 * - 오늘(forecast.current.date) 이전 날짜는 버린다(지난 날 제외).
 *
 * @param maxDays 표시 최대 일수(기본 3 — 단기예보 커버 범위).
 */
export function buildDailyOutlook(forecast: Forecast, maxDays = 3): DailyCell[] {
  const todayKey = forecast.current.date;
  const byDate = new Map<string, ForecastSlot[]>();
  for (const slot of forecast.timeline) {
    if (slot.date < todayKey) continue; // 지난 날 제외
    const arr = byDate.get(slot.date);
    if (arr != null) arr.push(slot);
    else byDate.set(slot.date, [slot]);
  }

  const dates = Array.from(byDate.keys()).sort().slice(0, maxDays);
  return dates.map((date, i) => {
    const slots = byDate.get(date) ?? [];
    const temps = slots.map((s) => s.temp);
    let min = Math.round(Math.min(...temps));
    let max = Math.round(Math.max(...temps));
    // 오늘은 발표 최저/최고(TMN/TMX)가 있으면 그것을 우선(타임라인이 지금 이후만 남아 편향 방지).
    if (date === todayKey) {
      if (forecast.todayMin != null) min = Math.round(forecast.todayMin);
      if (forecast.todayMax != null) max = Math.round(forecast.todayMax);
    }
    // 대표 날씨: 낮 12~15시 슬롯 우선(없으면 중앙 슬롯).
    const noon = slots.find((s) => {
      const h = Number(s.time.slice(0, 2));
      return h >= 12 && h <= 15;
    });
    const rep = noon ?? slots[Math.floor(slots.length / 2)] ?? slots[0];
    const pops = slots.map((s) => s.precipProb).filter((p): p is number => p != null);
    return {
      date,
      label: i === 0 ? '오늘' : i === 1 ? '내일' : i === 2 ? '모레' : weekdayLabel(date),
      emoji: rep != null ? iconEmoji(rep.iconCode) : '☀️',
      min,
      max,
      pop: pops.length > 0 ? Math.max(...pops) : undefined,
      isToday: date === todayKey,
    };
  });
}

/** 현재/최저최고 한 줄 요약 텍스트. */
export function tempSummary(forecast: Forecast): string {
  const cur = Math.round(forecast.current.temp);
  const min = forecast.todayMin != null ? Math.round(forecast.todayMin) : undefined;
  const max = forecast.todayMax != null ? Math.round(forecast.todayMax) : undefined;
  if (min != null && max != null) {
    return `${cur}° · 최저 ${min}° / 최고 ${max}°`;
  }
  return `${cur}°`;
}

// ─────────────────────────────────────────────────────────────
// 지역 스와이프(인덱스) — 2지역 순환
// ─────────────────────────────────────────────────────────────

/** 인덱스를 길이로 감싼 안전한 다음/이전 인덱스를 구한다(순환). */
export function cycleIndex(current: number, length: number, dir: 1 | -1): number {
  if (length <= 0) return 0;
  return (current + dir + length) % length;
}

/** 점 인디케이터 문자열(● 현재 / ○ 나머지). length<=1이면 빈 문자열. */
export function dotIndicator(current: number, length: number): string {
  if (length <= 1) return '';
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += i === current ? '●' : '○';
  }
  return out;
}

// ─────────────────────────────────────────────────────────────
// 신선도(오프라인/캐시) 표시
// ─────────────────────────────────────────────────────────────

/**
 * 캐시 stale 표시 문구. stale=true면 마지막 갱신 시각을 안내(PRD §11).
 * fetchedAt 파싱 실패/없으면 일반 문구.
 */
export function staleNotice(bundle: Pick<WeatherBundle, 'stale' | 'fetchedAt'>): string {
  if (!bundle.stale) return '';
  const t = parseHourMinute(bundle.fetchedAt);
  return t != null ? `오프라인 · ${t} 기준` : '오프라인 · 저장된 정보예요';
}

function parseHourMinute(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

// ─────────────────────────────────────────────────────────────
// loadWeather 보조 코드 매핑 (지역명 → 시도/행정구역 추정)
// ─────────────────────────────────────────────────────────────

/** 광역시·도 시도명 목록(에어코리아 sidoName 매칭용). */
const SIDO_NAMES = [
  '서울',
  '부산',
  '대구',
  '인천',
  '광주',
  '대전',
  '울산',
  '세종',
  '경기',
  '강원',
  '충북',
  '충남',
  '전북',
  '전남',
  '경북',
  '경남',
  '제주',
] as const;

/**
 * 지역명에서 에어코리아 시도명을 추정한다(없으면 미세먼지 생략 → undefined).
 * 정밀 매핑이 아니라 위젯 보조용. region.name에 시도명이 포함되면 그것을 쓴다.
 */
export function guessSido(regionName: string): string | undefined {
  return SIDO_NAMES.find((s) => regionName.includes(s));
}

/**
 * 시도 대표 좌표 — "현재 위치"처럼 이름에 시도가 없는 지역의 미세먼지 시도명을 추정한다.
 * (에어코리아 sidoName은 광역시·도 단위라 좌표→최근접 시도로 충분.)
 */
const SIDO_CENTROIDS: ReadonlyArray<{ sido: string; lat: number; lon: number }> = [
  { sido: '서울', lat: 37.5665, lon: 126.978 },
  { sido: '부산', lat: 35.1796, lon: 129.0756 },
  { sido: '대구', lat: 35.8714, lon: 128.6014 },
  { sido: '인천', lat: 37.4563, lon: 126.7052 },
  { sido: '광주', lat: 35.1595, lon: 126.8526 },
  { sido: '대전', lat: 36.3504, lon: 127.3845 },
  { sido: '울산', lat: 35.5384, lon: 129.3114 },
  { sido: '세종', lat: 36.4801, lon: 127.289 },
  { sido: '경기', lat: 37.4138, lon: 127.5183 },
  { sido: '강원', lat: 37.8228, lon: 128.1555 },
  { sido: '충북', lat: 36.6357, lon: 127.4914 },
  { sido: '충남', lat: 36.5184, lon: 126.8 },
  { sido: '전북', lat: 35.7175, lon: 127.153 },
  { sido: '전남', lat: 34.8161, lon: 126.463 },
  { sido: '경북', lat: 36.4919, lon: 128.8889 },
  { sido: '경남', lat: 35.4606, lon: 128.2132 },
  { sido: '제주', lat: 33.4996, lon: 126.5312 },
];

/** 좌표에서 가장 가까운 시도명. 국내 한정이라 위경도 제곱거리 근사로 충분. */
export function nearestSido(lat: number, lon: number): string {
  let best = SIDO_CENTROIDS[0];
  let bestDist = Infinity;
  for (const c of SIDO_CENTROIDS) {
    const dist = (c.lat - lat) ** 2 + (c.lon - lon) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = c;
    }
  }
  return best.sido;
}

/**
 * 지역 → 에어코리아 시도명(미세먼지 조회용). 이름에 시도가 들어있으면 그것을,
 * 없으면(예: "내 위치") 좌표 최근접 시도로 폴백한다 — 현재 위치도 미세먼지가 붙는다.
 */
export function sidoForRegion(region: Region): string {
  return guessSido(region.name) ?? nearestSido(region.lat, region.lon);
}

/** AirQuality가 부분 비어도 안전하게 등급만 뽑는다. */
export function airGradeOf(air: AirQuality | undefined): AirGrade {
  return air?.grade ?? 'unknown';
}

/** UVIndex가 비어도 안전하게 등급만 뽑는다. */
export function uvGradeOf(uv: UVIndex | undefined): UVGrade {
  return uv?.grade ?? 'unknown';
}

/** 위젯이 한 지역을 그릴 때 필요한 표시 묶음으로 정리한다. */
export interface RegionView {
  region: Region;
  bundle: WeatherBundle | null;
}

// ─────────────────────────────────────────────────────────────
// 위치 폴백: 현재 위치 좌표 / 프리셋 도시 → Region
// ─────────────────────────────────────────────────────────────

/** 위치 권한 거부/실패 시 사용자가 직접 고르는 프리셋 도시(위경도만, 격자는 변환). */
export const PRESET_CITIES: ReadonlyArray<{ name: string; lat: number; lon: number }> = [
  { name: '서울', lat: 37.5665, lon: 126.978 },
  { name: '부산', lat: 35.1796, lon: 129.0756 },
  { name: '인천', lat: 37.4563, lon: 126.7052 },
  { name: '대구', lat: 35.8714, lon: 128.6014 },
  { name: '대전', lat: 36.3504, lon: 127.3845 },
  { name: '광주', lat: 35.1595, lon: 126.8526 },
  { name: '울산', lat: 35.5384, lon: 129.3114 },
  { name: '제주', lat: 33.4996, lon: 126.5312 },
];

/**
 * 위경도를 Region으로 만든다 — grid.latLonToGrid 재사용(격자 변환 재구현 금지).
 * @param name 지역명(현재 위치면 '내 위치' 등)
 */
export function regionFromLatLon(name: string, lat: number, lon: number): Region {
  const { nx, ny } = latLonToGrid(lat, lon);
  return { name, lat, lon, nx, ny };
}

/** 프리셋 도시명 → Region(격자 포함). 없으면 undefined. */
export function regionFromCity(cityName: string): Region | undefined {
  const c = PRESET_CITIES.find((x) => x.name === cityName);
  return c != null ? regionFromLatLon(c.name, c.lat, c.lon) : undefined;
}
