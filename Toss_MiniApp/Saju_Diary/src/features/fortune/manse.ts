// Evry Times — 만세력 어댑터 (lunar-javascript 통합)
//
// 역할: 생년월일(원국)과 오늘 일진을 lunar-javascript로부터 **추출만** 한다.
// 운세 점수/문구/타로 등 해석은 다음 step. 이 모듈은 만세력 산출까지.
//
// CRITICAL #1: 순수 계산. 외부 네트워크/서버 호출 0. 로컬 번들만.
// CRITICAL #3: 입춘 년주·절기 월주·60갑자 일주·음력/윤달 변환은 전부
//   lunar-javascript(6tail, MIT)에 위임한다. 절기·간지를 손으로 재구현하지 않는다.
//   주류 소비자 만세력(포스텔러·플러스만세력) 디폴트에 정합시킨다.
//
// 표준 정합(유파 갈리는 지점):
//   1) 야자시(23:00~24:00 출생) — 晩子時(sect 2)로 명시 고정. lunar-javascript의
//      EightChar 기본값도 sect 2(晩子時)이며, 이는 23시 출생 시 일주(日柱)를 다음 날로
//      넘기지 않고 당일로 유지하는 방식이다. 한국 주류 소비자 만세력 디폴트와 일치하므로
//      이 선택을 명시적으로 setSect(2)로 못박는다(라이브러리 기본 변경 대비).
//   2) 진태양시(경도) 보정 — 기본 OFF. 소비자 "오늘의 운세" 다수가 표준시(KST) 그대로
//      쓰므로 입력 시각을 보정하지 않는다.
//   3) 역사적 서머타임(1948~51·55~60·87~88) — TODO: 해당 기간 출생만 입력 시각 보정.
//      실제 적용·검증은 calibration step(step4)에서 픽스처와 함께 처리한다.

import { Lunar, Solar } from 'lunar-javascript';
import { tenGod } from './engine';
import type {
  DateString,
  DayGanZhi,
  Direction,
  NatalChart,
  Pillar,
  SajuInput,
  TenGod,
  TimeString,
  WuXing,
} from '../../types';

// ─────────────────────────────────────────────────────────────
// 유파(sect) 상수 — 야자시 처리
// ─────────────────────────────────────────────────────────────

/** 晩子時(만자시). 23시 출생 시 일주를 당일로 유지(다음 날로 안 넘김). 주류 디폴트. */
const SECT_LATE_ZI = 2;

// ─────────────────────────────────────────────────────────────
// 매핑: lunar-javascript(중국어) → 우리 도메인 타입(한국어 표기)
// ─────────────────────────────────────────────────────────────

/** 천간/지지 1글자 → 오행(五行). lunar-javascript와 동일한 한자 오행 글자 사용. */
const GAN_ZHI_WU_XING: Record<string, WuXing> = {
  // 천간(天干)
  甲: '木', 乙: '木',
  丙: '火', 丁: '火',
  戊: '土', 己: '土',
  庚: '金', 辛: '金',
  壬: '水', 癸: '水',
  // 지지(地支)
  寅: '木', 卯: '木',
  巳: '火', 午: '火',
  辰: '土', 丑: '土', 戌: '土', 未: '土',
  申: '金', 酉: '金',
  亥: '水', 子: '水',
};

/** 천간(天干) 10 — 직접 입력 UI·검증용(순서 고정). */
export const TIAN_GAN: readonly string[] = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
/** 지지(地支) 12 — 직접 입력 UI·검증용(순서 고정). */
export const DI_ZHI: readonly string[] = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

/** 천간 한자 → 한글 음(사용자 표기 — 한자 노출 금지). */
export const GAN_KO: Record<string, string> = {
  甲: '갑', 乙: '을', 丙: '병', 丁: '정', 戊: '무',
  己: '기', 庚: '경', 辛: '신', 壬: '임', 癸: '계',
};
/** 지지 한자 → 한글 음(사용자 표기 — 한자 노출 금지). */
export const ZHI_KO: Record<string, string> = {
  子: '자', 丑: '축', 寅: '인', 卯: '묘', 辰: '진', 巳: '사',
  午: '오', 未: '미', 申: '신', 酉: '유', 戌: '술', 亥: '해',
};

/** 간지 2글자(한자) → 한글 음 2글자(예: '己未' → '기미'). 미매핑 글자는 그대로 둔다. */
export function ganZhiKo(ganZhi: string): string {
  const g = GAN_KO[ganZhi.charAt(0)] ?? ganZhi.charAt(0);
  const z = ZHI_KO[ganZhi.charAt(1)] ?? ganZhi.charAt(1);
  return `${g}${z}`;
}

/**
 * 60갑자(六十甲子) — 甲子부터 천간(10)·지지(12)를 함께 한 칸씩 돌려 60개(같은 음양끼리만 조합).
 * 직접 고치기에서 '기미' 같은 한 단위(일주)로 고르게 하는 옵션 목록.
 */
export const SIXTY_JIAZI: readonly string[] = Array.from({ length: 60 }, (_, i) =>
  `${TIAN_GAN[i % 10]}${DI_ZHI[i % 12]}`,
);

/** 천간/지지 글자의 오행을 조회한다(공개 — 직접 입력 UI 라벨용). 미매핑 시 '土'. */
export function wuXingOfChar(char: string): WuXing {
  return GAN_ZHI_WU_XING[char] ?? '土';
}

/** lunar-javascript 십신(중국어) → 우리 TenGod 타입(한국어). '日主'는 일간 자신 → null. */
const SHI_SHEN_TO_TEN_GOD: Record<string, TenGod> = {
  比肩: '비견',
  劫财: '겁재',
  食神: '식신',
  伤官: '상관',
  偏财: '편재',
  正财: '정재',
  偏官: '편관', // 칠살(七殺)
  正官: '정관',
  偏印: '편인',
  正印: '정인',
};

/**
 * lunar-javascript 방위 설명(중국어, `getDayPosition*Desc`) → 우리 Direction(한국어).
 * 8괘 방위 + 중궁(中宮).
 */
const POSITION_DESC_TO_DIRECTION: Record<string, Direction> = {
  正北: '북',
  正南: '남',
  正东: '동',
  正西: '서',
  东北: '동북',
  东南: '동남',
  西北: '서북',
  西南: '서남',
  中宫: '중앙',
};

// ─────────────────────────────────────────────────────────────
// 내부 헬퍼
// ─────────────────────────────────────────────────────────────

/** 간지 2글자 문자열(예: '甲子')을 Pillar로 분해한다. */
function toPillar(ganZhi: string): Pillar {
  // lunar-javascript의 간지는 항상 [천간][지지] 2글자.
  const gan = ganZhi.charAt(0);
  const zhi = ganZhi.charAt(1);
  return { gan, zhi, ganZhi };
}

/** 천간/지지 글자의 오행을 조회한다. 미매핑 시(이론상 없음) 방어적으로 '土'. */
function wuXingOf(char: string): WuXing {
  return GAN_ZHI_WU_XING[char] ?? '土';
}

/** lunar-javascript 십신 문자열 → TenGod(또는 일주 자신 시 null). */
function tenGodOf(shiShen: string): TenGod | null {
  return SHI_SHEN_TO_TEN_GOD[shiShen] ?? null;
}

/** 방위 설명 → Direction. 미매핑 시 '중앙'으로 폴백. */
function directionOf(desc: string): Direction {
  return POSITION_DESC_TO_DIRECTION[desc] ?? '중앙';
}

/** `YYYY-MM-DD` → [year, month, day] 숫자. 형식 위반 시 throw. */
function parseDate(date: DateString): [number, number, number] {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (m == null) {
    throw new Error(`manse: 날짜 형식은 YYYY-MM-DD 여야 합니다. 받은 값: ${date}`);
  }
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/** `HH:mm` → [hour, minute] 숫자. 형식 위반 시 throw. */
function parseTime(time: TimeString): [number, number] {
  const m = /^(\d{2}):(\d{2})$/.exec(time);
  if (m == null) {
    throw new Error(`manse: 시각 형식은 HH:mm 여야 합니다. 받은 값: ${time}`);
  }
  return [Number(m[1]), Number(m[2])];
}

// ─────────────────────────────────────────────────────────────
// 공개 API
// ─────────────────────────────────────────────────────────────

/** 간지 2글자(천간+지지)가 유효한지 — 직접 입력 검증용. */
function isValidGanZhi(gz: string | undefined): gz is string {
  return (
    typeof gz === 'string' &&
    gz.length === 2 &&
    TIAN_GAN.includes(gz.charAt(0)) &&
    DI_ZHI.includes(gz.charAt(1))
  );
}

/** 직접 입력한 사주(year/month/day)가 모두 유효한 간지면 true(hour는 선택). */
export function isCompleteManual(m: SajuInput['manual']): m is NonNullable<SajuInput['manual']> {
  return m != null && isValidGanZhi(m.year) && isValidGanZhi(m.month) && isValidGanZhi(m.day);
}

/**
 * 직접 입력한 네 기둥(간지)으로 원국을 만든다 — 만세력 결과를 사용자가 교정한 경우.
 * 십신은 재구현하지 않고 engine.tenGod(일간 vs 각 기둥 천간, 보편 매핑)로만 환산한다(CRITICAL #3).
 * 시주(hour)는 유효한 간지일 때만 포함한다.
 */
export function natalFromPillars(p: NonNullable<SajuInput['manual']>): NatalChart {
  const year = toPillar(p.year);
  const month = toPillar(p.month);
  const day = toPillar(p.day);
  const tenGods: (TenGod | null)[] = [
    tenGod(day.gan, year.gan),
    tenGod(day.gan, month.gan),
    null, // 일주는 일간 자신 → 십신 아님
  ];
  const chart: NatalChart = {
    year,
    month,
    day,
    dayGan: day.gan,
    dayWuXing: wuXingOf(day.gan),
    tenGods,
  };
  if (isValidGanZhi(p.hour)) {
    const hour = toPillar(p.hour);
    chart.hour = hour;
    tenGods.push(tenGod(day.gan, hour.gan));
  }
  return chart;
}

/**
 * 원국(原局) 사주를 산출한다 — 온보딩 1회 호출 후 캐시 권장.
 *
 * - **직접 입력(manual)**: year/month/day 간지가 모두 유효하면 만세력을 건너뛰고 그 값으로 원국을 만든다
 *   (사용자가 만세력 결과를 교정한 경우). birthDate는 그대로 두어 일진 변동 시드로 쓴다.
 * - 양력 입력: 그대로 `Solar.fromYmd(Hms)`.
 * - 음력 입력: lunar-javascript가 양력으로 변환(윤달 포함, 직접 변환 금지).
 * - 시간 미입력: 시주(時柱)·시주 십신을 생략한다.
 * - 야자시: 晩子時(sect 2) 명시 고정(표준 정합).
 *
 * @throws 날짜/시각 형식이 어긋나거나(음력 변환 불가 포함) 라이브러리가 실패할 때.
 */
export function computeNatal(input: SajuInput): NatalChart {
  // 직접 입력 교정본이 완전하면 만세력 대신 그걸로(같은 생일 재입력은 결정론이라 안 바뀜).
  if (isCompleteManual(input.manual)) {
    return natalFromPillars(input.manual);
  }

  const [y, mo, d] = parseDate(input.birthDate);
  const hasTime = input.birthTime != null && input.birthTime !== '';
  const [h, mi] = hasTime ? parseTime(input.birthTime as TimeString) : [0, 0];

  // 음력 → 양력 변환은 라이브러리에 위임(CRITICAL #3). 윤달 처리는 라이브러리 규약(LunarMonth).
  let solar;
  if (input.isLunar) {
    const lunar = hasTime
      ? Lunar.fromYmdHms(y, mo, d, h, mi, 0)
      : Lunar.fromYmd(y, mo, d);
    solar = lunar.getSolar();
  } else {
    solar = hasTime ? Solar.fromYmdHms(y, mo, d, h, mi, 0) : Solar.fromYmd(y, mo, d);
  }

  const ec = solar.getLunar().getEightChar();
  // 야자시 유파: 기본 晩子時(2, 주류 디폴트). 사용자가 早子時(1)를 고르면 23시 출생 일주가 다음 날로 넘어간다.
  ec.setSect(input.sect === 1 ? 1 : SECT_LATE_ZI);

  const yearPillar = toPillar(ec.getYear());
  const monthPillar = toPillar(ec.getMonth());
  const dayPillar = toPillar(ec.getDay());

  const tenGods: (TenGod | null)[] = [
    tenGodOf(ec.getYearShiShenGan()),
    tenGodOf(ec.getMonthShiShenGan()),
    tenGodOf(ec.getDayShiShenGan()), // '日主' → null
  ];

  const chart: NatalChart = {
    year: yearPillar,
    month: monthPillar,
    day: dayPillar,
    dayGan: dayPillar.gan,
    dayWuXing: wuXingOf(dayPillar.gan),
    tenGods,
  };

  if (hasTime) {
    chart.hour = toPillar(ec.getTime());
    tenGods.push(tenGodOf(ec.getTimeShiShenGan()));
  }

  return chart;
}

/**
 * 오늘(또는 주어진 양력 날짜)의 일진(日辰)을 산출한다 — 매일 호출.
 * 일진은 시간 무관(60갑자 일주). 그날 재신/희신 방위도 함께 추출한다.
 *
 * @param date 양력 `YYYY-MM-DD`. 기본값 = 오늘(로컬).
 * @throws 날짜 형식 위반 시.
 */
export function computeDayGanZhi(date?: DateString): DayGanZhi {
  const target = date ?? todayDateString();
  const [y, mo, d] = parseDate(target);
  const lunar = Solar.fromYmd(y, mo, d).getLunar();

  const pillar = toPillar(lunar.getDayInGanZhi());

  return {
    date: target,
    pillar,
    ganWuXing: wuXingOf(pillar.gan),
    zhiWuXing: wuXingOf(pillar.zhi),
    caiDirection: directionOf(lunar.getDayPositionCaiDesc()),
    xiDirection: directionOf(lunar.getDayPositionXiDesc()),
  };
}

/**
 * 하루가 바뀌는 기준 시각(로컬). 새벽 5시 이전은 "어제"로 본다.
 * 아침에 여는 대시보드라 운세·타로·일기·메모의 "오늘" 축을 자정이 아니라 **새벽 5시**에
 * 굴린다(요청 #6 — 타로 초기화 05시). 한 곳에서만 정의해 모든 일일 산출이 같은 경계를 쓴다.
 */
export const DAY_RESET_HOUR = 5;

/**
 * 로컬 기준 "오늘"을 `YYYY-MM-DD`로. (타임존 버그 방지: Date→문자열 변환 한 곳에서만)
 * 새벽 5시 이전이면 직전 날짜를 돌려준다(DAY_RESET_HOUR) — 02시에 보는 운세/타로는 전날 것.
 */
export function todayDateString(now: Date = new Date()): DateString {
  // 자정~05시는 전날로 간주: 시각에서 5시간을 빼면 날짜 경계가 05:00로 이동한다.
  const shifted = new Date(now.getTime() - DAY_RESET_HOUR * 60 * 60 * 1000);
  const y = shifted.getFullYear();
  const mo = String(shifted.getMonth() + 1).padStart(2, '0');
  const d = String(shifted.getDate()).padStart(2, '0');
  return `${y}-${mo}-${d}`;
}
