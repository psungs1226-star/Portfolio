/**
 * streak — 연속 출석(재방문) 상태 전이(순수 함수).
 *
 * 목적(PRD §9 Retention · §10): 재방문 동기부여 UX("연속 N일")만 강화한다.
 * **리워드/포인트/현금성 보상 없음(CRITICAL #4 단순 리워드성 규정).** 표시 전용.
 * **외부 전송 없음(CRITICAL #1).** 상태는 로컬 Storage에만 저장한다.
 *
 * 날짜 규칙(dday-calc와 동일): `YYYY-MM-DD` 문자열을 UTC 자정으로 고정해
 * 정수 일수 차로만 비교한다(시/분·타임존·DST 오차 0). Date 차 ms 나눗셈 금지.
 *
 * 전이 규칙(오늘 방문을 반영):
 * - 최초 방문(lastOpenDate 없음/형식 오류)        → streak 1, lastOpenDate=today
 * - 오늘 이미 방문(lastOpenDate == today)         → 변화 없음(멱등)
 * - 어제 방문(diff == 1)                          → streak + 1
 * - 그 이전(diff >= 2) / 미래 기록(diff < 0, 시계 역행 방어) → streak 1로 리셋
 *
 * 결정론·불변: 입력을 변형하지 않고 새 객체를 반환한다. 날짜는 주입한다.
 */
import type { DateString } from '../types';

/** 연속 출석 상태(로컬 영속). */
export interface StreakState {
  /** 마지막으로 앱을 연 날짜 `YYYY-MM-DD`. 최초 미방문이면 null. */
  lastOpenDate: DateString | null;
  /** 연속 출석 일수(>= 0). 방문 반영 후 최소 1. */
  streakCount: number;
}

/** 아직 한 번도 방문하지 않은 빈 상태. */
export const EMPTY_STREAK: StreakState = { lastOpenDate: null, streakCount: 0 };

/** `YYYY-MM-DD` → UTC 자정 epoch(ms). 형식이 아니면 NaN. 시/분은 항상 0. */
function utcMidnight(date: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (m == null) {
    return Number.NaN;
  }
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * 오늘 방문을 반영한 새 연속 출석 상태를 계산한다(순수·불변).
 *
 * @param prev  직전 상태(없으면 EMPTY_STREAK).
 * @param today 오늘 날짜 `YYYY-MM-DD`(테스트 주입; 호출부가 오늘을 넘긴다).
 * @returns 새 StreakState. 입력은 변형하지 않는다.
 */
export function applyVisit(prev: StreakState, today: DateString): StreakState {
  const todayMs = utcMidnight(today);
  // 오늘 날짜 형식이 잘못되면 안전하게 직전 상태를 보존(크래시 없음).
  if (Number.isNaN(todayMs)) {
    return prev;
  }

  const last = prev.lastOpenDate;
  const lastMs = last == null ? Number.NaN : utcMidnight(last);

  // 최초 방문(또는 깨진 기록): 1일차로 시작.
  if (Number.isNaN(lastMs)) {
    return { lastOpenDate: today, streakCount: 1 };
  }

  // 오늘 - 마지막 방문 = 경과 일수.
  const diff = Math.round((todayMs - lastMs) / MS_PER_DAY);

  // 오늘 이미 방문: 멱등(변화 없음). 같은 날 여러 번 진입해도 안전.
  if (diff === 0) {
    return prev;
  }

  // 어제 방문: 연속 +1.
  if (diff === 1) {
    return { lastOpenDate: today, streakCount: prev.streakCount + 1 };
  }

  // 하루 이상 건너뜀(diff >= 2) 또는 미래 기록(시계 역행 등 diff < 0): 1로 리셋.
  return { lastOpenDate: today, streakCount: 1 };
}
