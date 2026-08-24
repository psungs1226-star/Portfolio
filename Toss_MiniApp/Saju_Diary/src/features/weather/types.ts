// Evry Times — 날씨 도메인 모델 (앱 표시용으로 정규화된 형태)
//
// 기상청/에어코리아 원본 응답을 위젯이 바로 쓸 수 있는 모델로 변환한 결과.
// (types/index.ts의 Diary.weatherSnapshot: unknown 자리를 채우는 모듈 타입.)

import type { DateString, TimeString } from '../../types';

/** 강수 형태(기상청 PTY 코드 매핑). */
export type PrecipType = 'none' | 'rain' | 'rain-snow' | 'snow' | 'shower';

/** 하늘 상태(기상청 SKY 코드 매핑). */
export type SkyType = 'clear' | 'partly-cloudy' | 'cloudy';

/** 미세먼지 등급(에어코리아 khaiGrade/pm10Grade: 1~4). */
export type AirGrade = 'good' | 'moderate' | 'unhealthy' | 'very-unhealthy' | 'unknown';

/** 자외선 등급(생활기상지수 UV 지수 구간). */
export type UVGrade = 'low' | 'moderate' | 'high' | 'very-high' | 'extreme' | 'unknown';

/** 예보 타임라인 한 슬롯(3시간 단위). */
export interface ForecastSlot {
  /** 예보 시각 `HH:mm`. */
  time: TimeString;
  /** 예보 날짜 `YYYY-MM-DD`. */
  date: DateString;
  /** 기온(℃). */
  temp: number;
  /** 강수 형태. */
  precip: PrecipType;
  /** 강수 확률(%). 없으면 undefined. */
  precipProb?: number;
  /** 하늘 상태. 없으면 undefined. */
  sky?: SkyType;
  /** 통합 날씨 아이콘 코드(sky+precip 조합). 위젯이 아이콘 매핑에 사용. */
  iconCode: string;
}

/** 기상청 단기예보 정규화 결과. */
export interface Forecast {
  /** 기준 지역명. */
  regionName: string;
  /** 격자 좌표. */
  nx: number;
  ny: number;
  /** 현재(또는 가장 가까운 미래) 슬롯. */
  current: ForecastSlot;
  /** 3시간 단위 타임라인(현재 포함, 시간 오름차순). */
  timeline: ForecastSlot[];
  /** 오늘 최저기온(TMN, ℃). 없으면 undefined. */
  todayMin?: number;
  /** 오늘 최고기온(TMX, ℃). 없으면 undefined. */
  todayMax?: number;
  /** 응답 산출(파싱) 시각 ISO 문자열 — 캐시 신선도 판단용. */
  fetchedAt: string;
}

/** 에어코리아 미세먼지 정규화 결과. */
export interface AirQuality {
  /** 시도명(에어코리아 sidoName). */
  sido: string;
  /** 측정소명. */
  station?: string;
  /** PM10 농도(㎍/㎥). */
  pm10?: number;
  /** PM2.5 농도(㎍/㎥). */
  pm25?: number;
  /** 통합대기 등급. */
  grade: AirGrade;
  fetchedAt: string;
}

/** 생활기상지수 자외선 정규화 결과. */
export interface UVIndex {
  /** 자외선 지수 값(현재 시각 기준). */
  value?: number;
  /** 자외선 등급. */
  grade: UVGrade;
  fetchedAt: string;
}

/** 위젯 한 화면에 필요한 날씨 묶음(부분 실패 허용). */
export interface WeatherBundle {
  forecast?: Forecast;
  air?: AirQuality;
  uv?: UVIndex;
  /** 캐시 폴백으로 표시 중인지(오프라인/실패). true면 위젯이 "오프라인" 표시. */
  stale: boolean;
  /** 묶음 캐시 시각 ISO. */
  fetchedAt: string;
}
