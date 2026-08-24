// Evry Times — 사주 캘리브레이션 테스트 (출시 전 정확도 게이트 / 회귀 방지)
//
// CRITICAL #3: "우리 앱만 사주가 다르다"를 막는 글자 단위 대조.
//   calibration.fixture.ts의 golden 값(주류 디폴트 구성 = sect2·경도보정 OFF)과
//   computeNatal·computeDayGanZhi 출력을 **글자 단위(char-by-char)**로 비교한다.
//   manse.ts의 sect/경도보정/서머타임 설정이 바뀌어 정합이 깨지면 여기서 잡힌다.
//
//   엣지 케이스 전수: ① 입춘 전후(년주) ② 절기 월 경계(월주) ③ 자시(晩子時 sect2)
//   ④ 음력 윤달 ⑤ 윤년. (golden 출처·교차검증 한계는 calibration.fixture.ts 상단 주석.)

import { describe, expect, it } from 'vitest';
import { Lunar } from 'lunar-javascript';
import { computeDayGanZhi, computeNatal } from './manse';
import {
  ILJIN_CASES,
  LEAP_MONTH_CASE,
  NATAL_CASES,
} from './calibration.fixture';

const SECT_LATE_ZI = 2; // 晩子時 — fixture/manse와 동일 구성 확인용.

describe('캘리브레이션 — 원국(computeNatal) 글자 단위 대조', () => {
  it.each(NATAL_CASES)('$label', ({ input, expected }) => {
    const chart = computeNatal(input);

    // 년/월/일주 간지 — 글자 단위.
    expect(chart.year.ganZhi).toBe(expected.yearGanZhi);
    expect(chart.month.ganZhi).toBe(expected.monthGanZhi);
    expect(chart.day.ganZhi).toBe(expected.dayGanZhi);

    // 일간·일지 단일 글자.
    expect(chart.day.gan).toBe(expected.dayGan);
    expect(chart.day.zhi).toBe(expected.dayZhi);
    expect(chart.dayGan).toBe(expected.dayGan); // 편의 접근 == day.gan

    // 시주: 기대값이 있으면 일치, 없으면(시간 미입력) 생략돼야 함.
    if (expected.hourGanZhi != null) {
      expect(chart.hour?.ganZhi).toBe(expected.hourGanZhi);
    } else {
      expect(chart.hour).toBeUndefined();
    }
  });
});

describe('캘리브레이션 — 일진(computeDayGanZhi) 글자 단위 대조', () => {
  it.each(ILJIN_CASES)('$label', ({ date, expected }) => {
    const day = computeDayGanZhi(date);
    // 일진은 시간 무관 60갑자 → 간지가 정확히 일치해야 한다.
    expect(day.pillar.ganZhi).toBe(expected.dayGanZhi);
    // date 반향(주입한 날짜를 그대로 보존).
    expect(day.date).toBe(date);
  });
});

// ── 엣지 케이스 명시 검증(라벨이 아니라 동작으로 다시 한 번 못박음) ──

describe('엣지: ① 입춘(立春) 년주 경계', () => {
  // 1985 立春 = 2/4 05:11:47 → 시(時) 단위로 년주가 갈린다(라이브러리가 절기 시각까지 본다).
  it('입춘 전날(2/3 10:00)과 입춘 후(2/4 10:00) 사이에 년주가 한 칸 전진한다(1/1이 아님)', () => {
    const before = computeNatal({ birthDate: '1985-02-03', birthTime: '10:00', isLunar: false });
    const after = computeNatal({ birthDate: '1985-02-04', birthTime: '10:00', isLunar: false });
    expect(before.year.ganZhi).toBe('甲子');
    expect(after.year.ganZhi).toBe('乙丑');
    expect(before.year.ganZhi).not.toBe(after.year.ganZhi);
  });

  it('입춘은 날짜가 아니라 절기 시각 기준이다(1985-02-04 00:00=甲子, 06:00=乙丑)', () => {
    const beforeMoment = computeNatal({ birthDate: '1985-02-04', birthTime: '00:00', isLunar: false });
    const afterMoment = computeNatal({ birthDate: '1985-02-04', birthTime: '06:00', isLunar: false });
    expect(beforeMoment.year.ganZhi).toBe('甲子'); // 立春(05:11) 전
    expect(afterMoment.year.ganZhi).toBe('乙丑'); // 立春 후
  });

  it('양력 1/1은 아직 입춘 전이라 전년 년주를 쓴다(2000-01-01 → 己卯, 庚辰 아님)', () => {
    const chart = computeNatal({ birthDate: '2000-01-01', isLunar: false });
    expect(chart.year.ganZhi).toBe('己卯');
  });
});

describe('엣지: ② 절기(節氣) 월주 경계', () => {
  it('경칩 전후로 월주가 戊寅 → 己卯로 전환된다(2000-03)', () => {
    const before = computeNatal({ birthDate: '2000-03-04', isLunar: false });
    const after = computeNatal({ birthDate: '2000-03-06', isLunar: false });
    expect(before.month.ganZhi).toBe('戊寅');
    expect(after.month.ganZhi).toBe('己卯');
    expect(before.month.ganZhi).not.toBe(after.month.ganZhi);
  });
});

describe('엣지: ③ 자시(子時) — 晩子時(sect 2) 처리', () => {
  it('같은 날 23:30·00:30 출생은 일주가 동일하다(당일 유지, 다음 날로 안 넘김)', () => {
    const late = computeNatal({ birthDate: '1990-06-15', birthTime: '23:30', isLunar: false });
    const early = computeNatal({ birthDate: '1990-06-15', birthTime: '00:30', isLunar: false });
    expect(late.day.ganZhi).toBe('辛亥');
    expect(early.day.ganZhi).toBe('辛亥');
    expect(late.day.ganZhi).toBe(early.day.ganZhi);
  });

  it('야자시(23:30)와 조자시(00:30)는 시주 천간이 다르다(子時 분기)', () => {
    const late = computeNatal({ birthDate: '1990-06-15', birthTime: '23:30', isLunar: false });
    const early = computeNatal({ birthDate: '1990-06-15', birthTime: '00:30', isLunar: false });
    expect(late.hour?.ganZhi).toBe('庚子');
    expect(early.hour?.ganZhi).toBe('戊子');
    expect(late.hour?.zhi).toBe('子'); // 둘 다 子時
    expect(early.hour?.zhi).toBe('子');
  });
});

describe('엣지: ④ 음력 윤달(閏月)', () => {
  // SajuInput에 윤달 플래그가 없어 computeNatal 경로로는 윤달을 지정할 수 없다.
  // lunar-javascript 규약(음수 월 = 윤달)을 직접 호출해 양력 변환·간지 정합을 고정.
  // 정합이 깨지면(예: 라이브러리 윤달 규약 변경) 이 테스트가 잡는다.
  it('2020 윤4월 15일 → 양력 2020-06-06, 년주 庚子 (평달 4/15와 다른 날)', () => {
    const { expected } = LEAP_MONTH_CASE;
    const lunar = Lunar.fromYmdHms(
      expected.lunarYear,
      expected.lunarMonth, // 음수 = 윤달
      expected.lunarDay,
      expected.hour,
      expected.minute,
      0,
    );
    const solar = lunar.getSolar();
    const ec = solar.getLunar().getEightChar();
    ec.setSect(SECT_LATE_ZI);

    expect(solar.toYmd()).toBe(expected.solar);
    expect(ec.getYear()).toBe(expected.yearGanZhi);
    expect(ec.getMonth()).toBe(expected.monthGanZhi);
    expect(ec.getDay()).toBe(expected.dayGanZhi);
    expect(ec.getTime()).toBe(expected.hourGanZhi);
  });

  it('윤달(음수 월)과 평달(양수 월)은 서로 다른 양력일로 변환된다', () => {
    const leap = Lunar.fromYmd(2020, -4, 15).getSolar().toYmd();
    const regular = Lunar.fromYmd(2020, 4, 15).getSolar().toYmd();
    expect(leap).toBe('2020-06-06');
    expect(regular).toBe('2020-05-07');
    expect(leap).not.toBe(regular);
  });
});

describe('엣지: ⑤ 윤년(閏年) 2/29', () => {
  it('2016-02-29 출생을 정상 산출한다(일주 辛巳)', () => {
    const chart = computeNatal({ birthDate: '2016-02-29', birthTime: '09:00', isLunar: false });
    expect(chart.day.ganZhi).toBe('辛巳');
    expect(chart.year.ganZhi).toBe('丙申');
  });
});

describe('캘리브레이션 — 음력 평달 변환 정합', () => {
  it('음력 1995-08-20 입력이 양력 1995-09-14로 변환된다(라이브러리 위임)', () => {
    // computeNatal은 양력 변환 자체를 반환하지 않으므로, 동일 입력의 간지가
    // 양력 1995-09-14 직접 입력과 일치하는지로 변환 정합을 확인한다.
    const fromLunar = computeNatal({ birthDate: '1995-08-20', birthTime: '14:00', isLunar: true });
    const fromSolar = computeNatal({ birthDate: '1995-09-14', birthTime: '14:00', isLunar: false });
    expect(fromLunar.year.ganZhi).toBe(fromSolar.year.ganZhi);
    expect(fromLunar.month.ganZhi).toBe(fromSolar.month.ganZhi);
    expect(fromLunar.day.ganZhi).toBe(fromSolar.day.ganZhi);
    expect(fromLunar.hour?.ganZhi).toBe(fromSolar.hour?.ganZhi);
    expect(fromLunar.day.ganZhi).toBe('戊申');
  });
});
