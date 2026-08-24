// Evry Times — 사주 캘리브레이션 픽스처 (회귀 게이트)
//
// 목적(CRITICAL #3): "우리 앱만 사주가 다르게 나온다"를 막는다.
//   만세력 산출(computeNatal·computeDayGanZhi)이 **주류 디폴트 구성**과 정합함을
//   고정 golden 값으로 박아, 향후 설정(sect/경도보정/서머타임)이 바뀌어 정합이
//   깨지면 calibration.test.ts가 즉시 잡도록 한다.
//
// ── 표준 정합 구성(manse.ts와 동일) ──────────────────────────────
//   ① 야자시 = 晩子時(sect 2): 23시 출생 시 일주(日柱)를 당일로 유지(다음 날 X).
//   ② 진태양시(경도) 보정 = OFF(표준시 KST 그대로).
//   ③ 역사적 서머타임 = 미적용(현재 manse.ts 구현 상태).
//
// ── golden 값의 출처와 교차검증 한계(정직 고지) ───────────────────
//   golden 간지는 lunar-javascript(6tail, MIT)를 위 구성(sect2·경도보정 OFF)으로
//   실행해 고정했다. 이는 ARCHITECTURE §5가 지정한 "주류 소비자 만세력(포스텔러·
//   플러스만세력) 디폴트" 그 자체의 라이브러리 산출이다.
//   - 입춘 년주·절기 월주·60갑자 일주·음력/윤달은 유파 무관 = 어느 만세력과도 동일.
//   - 야자시·경도보정만 유파가 갈리며, 우리는 위 ①②로 다수파를 명시 채택했다.
//   외부 만세력 사이트와의 자동 대조는 이 격리 실행 환경에서 불가하므로,
//   본 픽스처는 1차적으로 **회귀(regression) 게이트**다. 출시 전 사람이 아래
//   날짜 몇 개를 포스텔러/플러스만세력에 넣어 글자 단위로 한 번 눈대조하면
//   "다수파 정합"까지 보증된다(PRD §14). golden을 함부로 바꾸지 말 것 —
//   바꾸려면 그 변경이 어느 외부 만세력과 일치하는지 근거를 같은 줄에 남긴다.

import type { DateString, SajuInput, TimeString } from '../../types';

/** 원국(natal) 기대값 — 글자 단위 대조용. */
export interface NatalExpected {
  /** 음/양력 변환 결과 양력 날짜 `YYYY-MM-DD`(입력이 양력이면 동일). */
  solar: DateString;
  /** 년주(年柱) 간지 — 입춘 기준. */
  yearGanZhi: string;
  /** 월주(月柱) 간지 — 절기 기준. */
  monthGanZhi: string;
  /** 일주(日柱) 간지 — 60갑자. */
  dayGanZhi: string;
  /** 일간(日干) 1글자. */
  dayGan: string;
  /** 일지(日支) 1글자. */
  dayZhi: string;
  /** 시주(時柱) 간지 — 출생 시각이 있을 때만. */
  hourGanZhi?: string;
}

/** 원국 캘리브레이션 케이스. */
export interface NatalCase {
  /** 사람이 읽는 라벨(어떤 경계를 검증하는지). */
  label: string;
  /** computeNatal에 넣는 입력. */
  input: SajuInput;
  /** 글자 단위로 일치해야 하는 기대값. */
  expected: NatalExpected;
}

/** 일진(today iljin) 기대값. */
export interface IljinExpected {
  /** 일진 간지 2글자. */
  dayGanZhi: string;
}

/** 일진 캘리브레이션 케이스. */
export interface IljinCase {
  label: string;
  date: DateString;
  expected: IljinExpected;
}

const h = (t: string): TimeString => t as TimeString;

// ─────────────────────────────────────────────────────────────
// 원국 케이스 (엣지 케이스 전수 포함)
//   ① 입춘 전후  ② 절기 월 경계  ③ 자시(야자시/조자시)  ④ 윤년  ⑤ 음력 평달
//   (음력 윤달은 SajuInput에 윤달 플래그가 없어 라이브러리 불변식으로 별도 검증
//    → calibration.test.ts의 "음력 윤달" 블록 참조)
// ─────────────────────────────────────────────────────────────

export const NATAL_CASES: NatalCase[] = [
  // ── ① 입춘 전후: 년주는 1/1이 아니라 입춘(立春)에 바뀐다 ──
  // 1985 입춘 = 2/4. 2/3 출생은 아직 전년(甲子년), 2/4 출생부터 乙丑년.
  {
    label: '입춘 전날 출생 → 년주 전년(甲子) 유지 (1985-02-03)',
    input: { birthDate: '1985-02-03', birthTime: h('10:00'), isLunar: false },
    expected: {
      solar: '1985-02-03',
      yearGanZhi: '甲子',
      monthGanZhi: '丁丑',
      dayGanZhi: '癸酉',
      dayGan: '癸',
      dayZhi: '酉',
      hourGanZhi: '丁巳',
    },
  },
  {
    label: '입춘 당일 출생 → 년주 신년(乙丑) 전환 (1985-02-04)',
    input: { birthDate: '1985-02-04', birthTime: h('10:00'), isLunar: false },
    expected: {
      solar: '1985-02-04',
      yearGanZhi: '乙丑',
      monthGanZhi: '戊寅',
      dayGanZhi: '甲戌',
      dayGan: '甲',
      dayZhi: '戌',
      hourGanZhi: '己巳',
    },
  },

  // ── ② 절기 월 경계: 월주는 절기(節氣)에 바뀐다 ──
  // 2000 경칩(驚蟄) = 3/5. 3/4 출생은 月 戊寅, 3/6 출생부터 月 己卯.
  {
    label: '절기(경칩) 전 출생 → 월주 戊寅 (2000-03-04)',
    input: { birthDate: '2000-03-04', birthTime: h('12:00'), isLunar: false },
    expected: {
      solar: '2000-03-04',
      yearGanZhi: '庚辰',
      monthGanZhi: '戊寅',
      dayGanZhi: '辛酉',
      dayGan: '辛',
      dayZhi: '酉',
      hourGanZhi: '甲午',
    },
  },
  {
    label: '절기(경칩) 후 출생 → 월주 己卯 전환 (2000-03-06)',
    input: { birthDate: '2000-03-06', birthTime: h('12:00'), isLunar: false },
    expected: {
      solar: '2000-03-06',
      yearGanZhi: '庚辰',
      monthGanZhi: '己卯',
      dayGanZhi: '癸亥',
      dayGan: '癸',
      dayZhi: '亥',
      hourGanZhi: '戊午',
    },
  },

  // ── ③ 자시(子時) 처리: 晩子時(sect2) ──
  // 같은 날 23:30(야자시)·00:30(조자시) → 일주는 둘 다 辛亥(당일 유지).
  // 시주 천간만 갈린다: 23:30=庚子(다음 일주 천간 기준), 00:30=戊子(당일 천간 기준).
  {
    label: '야자시 23:30 → 일주 당일(辛亥) 유지, 시주 庚子 (1990-06-15)',
    input: { birthDate: '1990-06-15', birthTime: h('23:30'), isLunar: false },
    expected: {
      solar: '1990-06-15',
      yearGanZhi: '庚午',
      monthGanZhi: '壬午',
      dayGanZhi: '辛亥',
      dayGan: '辛',
      dayZhi: '亥',
      hourGanZhi: '庚子',
    },
  },
  {
    label: '조자시 00:30 → 일주 辛亥, 시주 戊子 (1990-06-15)',
    input: { birthDate: '1990-06-15', birthTime: h('00:30'), isLunar: false },
    expected: {
      solar: '1990-06-15',
      yearGanZhi: '庚午',
      monthGanZhi: '壬午',
      dayGanZhi: '辛亥',
      dayGan: '辛',
      dayZhi: '亥',
      hourGanZhi: '戊子',
    },
  },

  // ── ④ 윤년 2/29 ──
  {
    label: '윤년 2월 29일 출생 (2016-02-29)',
    input: { birthDate: '2016-02-29', birthTime: h('09:00'), isLunar: false },
    expected: {
      solar: '2016-02-29',
      yearGanZhi: '丙申',
      monthGanZhi: '庚寅',
      dayGanZhi: '辛巳',
      dayGan: '辛',
      dayZhi: '巳',
      hourGanZhi: '癸巳',
    },
  },

  // ── ⑤ 음력 평달 → 양력 변환(라이브러리 위임) ──
  // 음력 1995-08-20 → 양력 1995-09-14.
  {
    label: '음력 평달 입력 → 양력 변환 (음 1995-08-20 → 양 1995-09-14)',
    input: { birthDate: '1995-08-20', birthTime: h('14:00'), isLunar: true },
    expected: {
      solar: '1995-09-14',
      yearGanZhi: '乙亥',
      monthGanZhi: '乙酉',
      dayGanZhi: '戊申',
      dayGan: '戊',
      dayZhi: '申',
      hourGanZhi: '己未',
    },
  },

  // ── 시간 미입력 → 시주 생략(hourGanZhi undefined) ──
  {
    label: '출생 시각 미입력 → 시주 생략 (1988-11-11)',
    input: { birthDate: '1988-11-11', isLunar: false },
    expected: {
      solar: '1988-11-11',
      yearGanZhi: '戊辰',
      monthGanZhi: '癸亥',
      dayGanZhi: '庚午',
      dayGan: '庚',
      dayZhi: '午',
      // hourGanZhi 없음
    },
  },

  // ── 평범한 일반 케이스(앵커) ──
  {
    label: '일반 양력 (1992-07-23 16:20)',
    input: { birthDate: '1992-07-23', birthTime: h('16:20'), isLunar: false },
    expected: {
      solar: '1992-07-23',
      yearGanZhi: '壬申',
      monthGanZhi: '丁未',
      dayGanZhi: '庚子',
      dayGan: '庚',
      dayZhi: '子',
      hourGanZhi: '甲申',
    },
  },
  {
    label: '밀레니엄 자정 (2000-01-01 00:00)',
    input: { birthDate: '2000-01-01', birthTime: h('00:00'), isLunar: false },
    expected: {
      solar: '2000-01-01',
      yearGanZhi: '己卯', // 1/1은 아직 입춘 전 → 전년 己卯
      monthGanZhi: '丙子',
      dayGanZhi: '戊午',
      dayGan: '戊',
      dayZhi: '午',
      hourGanZhi: '壬子',
    },
  },
];

// ─────────────────────────────────────────────────────────────
// 일진(日辰) 케이스 — computeDayGanZhi(date). 시간 무관, 60갑자 연속.
//   입춘 경계 날짜·윤달 양력일·윤년 2/29 등 다양한 날짜로 일주 연속성 검증.
// ─────────────────────────────────────────────────────────────

export const ILJIN_CASES: IljinCase[] = [
  { label: '일반 일진 (2024-06-14)', date: '2024-06-14', expected: { dayGanZhi: '己酉' } },
  { label: '밀레니엄 일진 (2000-01-01)', date: '2000-01-01', expected: { dayGanZhi: '戊午' } },
  { label: '입춘 당일 일진 (1985-02-04)', date: '1985-02-04', expected: { dayGanZhi: '甲戌' } },
  { label: '음력 윤4월 양력일 일진 (2020-06-06)', date: '2020-06-06', expected: { dayGanZhi: '庚辰' } },
  { label: '윤년 2/29 일진 (2016-02-29)', date: '2016-02-29', expected: { dayGanZhi: '辛巳' } },
  { label: '연말 일진 (2025-12-31)', date: '2025-12-31', expected: { dayGanZhi: '甲戌' } },
  { label: '자시 케이스 날짜 일진 (1990-06-15)', date: '1990-06-15', expected: { dayGanZhi: '辛亥' } },
];

// ─────────────────────────────────────────────────────────────
// ④ 음력 윤달(閏月) — 라이브러리 불변식 (별도 검증)
//   SajuInput에는 윤달 플래그가 없어(현재 스펙) computeNatal 경로로는 윤달을
//   지정할 수 없다. lunar-javascript 규약은 "음수 월 = 윤달". 향후 윤달 입력을
//   지원할 때 양력 변환·간지가 어긋나지 않도록 라이브러리 산출을 golden으로 고정.
//   2020 윤4월(闰四月) 15일 → 양력 2020-06-06, 년주 庚子.
//   (참고: 같은 표기의 '평달' 음 4/15는 양력 2020-05-07로 완전히 다른 날 → 윤달
//    구분이 깨지면 이 값이 틀어진다.)
// ─────────────────────────────────────────────────────────────

export interface LeapMonthExpected {
  /** lunar-javascript 음수 월(윤달) 입력. */
  lunarYear: number;
  /** 음수 = 윤달. */
  lunarMonth: number;
  lunarDay: number;
  /** 변환된 양력. */
  solar: DateString;
  yearGanZhi: string;
  monthGanZhi: string;
  dayGanZhi: string;
  hourGanZhi: string;
  hour: number;
  minute: number;
}

export const LEAP_MONTH_CASE: { label: string; expected: LeapMonthExpected } = {
  label: '음력 윤4월(闰四月) 15일 → 양력 2020-06-06 (2020 윤달)',
  expected: {
    lunarYear: 2020,
    lunarMonth: -4, // 윤4월
    lunarDay: 15,
    hour: 8,
    minute: 0,
    solar: '2020-06-06',
    yearGanZhi: '庚子',
    monthGanZhi: '壬午',
    dayGanZhi: '庚辰',
    hourGanZhi: '庚辰',
  },
};
