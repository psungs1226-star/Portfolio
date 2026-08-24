// Evry Times — 공유 (AU 엔진)
//
// AU(활성 유저)가 1차 심사 직결(PRD §9) → 공유는 제품 1순위 엔진.
// 운세 결과·월간 회고를 토스 보이스 텍스트로 빚어 공유 유입을 만든다.
//
// CRITICAL 규칙(위반 금지):
//  #1 외부 자체 서버 전송 0. 공유는 앱인토스 SDK(share/getTossShareLink/contactsViral)만 경유한다.
//  - share는 **텍스트 전용**. 이미지 카드/링크 객체를 넣지 않는다(SDK 미지원, ARCHITECTURE §7).
//    미니앱 링크는 getTossShareLink로 만들어 텍스트 안에 포함한다.
//  #5 웹 React + TDS 스택 고정. RN 프리미티브·새 라이브러리 금지.
//
// 설계:
//  - 순수 텍스트 빌더(결정론): FortuneResult/MonthlySummary → string. 테스트 대상.
//  - 호기심 갭(PRD §9 Referral): 결과 일부만 노출 + "전체 보기" 링크 자리.
//  - SDK 호출부는 얇은 래퍼. 빌더와 분리해 테스트에서 모킹 가능.

import {
  share as aitShare,
  getTossShareLink as aitGetTossShareLink,
  contactsViral as aitContactsViral,
  type ContactsViralEvent,
} from '@apps-in-toss/web-framework';
import type { FortuneResult } from '../../types';

// ─────────────────────────────────────────────────────────────
// 상수
// ─────────────────────────────────────────────────────────────

/** 미니앱 appName(granite.config.ts) — 딥링크 베이스. */
export const APP_NAME = 'evrytimes';

/** 공유 링크 딥링크 경로(`intoss://<appName>`). 토스앱이 이 경로로 미니앱을 연다. */
export const SHARE_DEEPLINK = `intoss://${APP_NAME}` as const;

/** 호기심 갭 CTA — 결과 일부만 노출하고 전체는 링크로 유도. */
export const FULL_VIEW_CTA = '전체 보기 👉';

/** 별점 만점(운세 별점 1~5). */
const MAX_STARS = 5;

// ─────────────────────────────────────────────────────────────
// 순수 헬퍼
// ─────────────────────────────────────────────────────────────

/**
 * 별점(1~5)을 채운 별 + 빈 별 이모지로 변환한다(결정론).
 * 범위를 벗어난 값은 0~MAX_STARS로 클램프하고 정수로 내림한다.
 *
 * @example starsToEmoji(4) // '⭐⭐⭐⭐☆'
 */
export function starsToEmoji(score: number, max: number = MAX_STARS): string {
  const safeMax = Math.max(0, Math.floor(max));
  const filled = Math.min(safeMax, Math.max(0, Math.floor(Number.isFinite(score) ? score : 0)));
  return '⭐'.repeat(filled) + '☆'.repeat(safeMax - filled);
}

/**
 * 공유 텍스트에 미니앱 링크(전체 보기) 한 줄을 덧붙인다(순수).
 * 링크 생성(getTossShareLink, async/SDK)과 분리해 빌더를 결정론적으로 유지한다.
 * link가 비면 CTA만(자리), 있으면 `전체 보기 👉 <link>`.
 */
export function appendShareLink(text: string, link: string): string {
  const cta = link.length > 0 ? `${FULL_VIEW_CTA} ${link}` : FULL_VIEW_CTA;
  return `${text}\n${cta}`;
}

// ─────────────────────────────────────────────────────────────
// 월간 회고 요약 입력 타입
// ─────────────────────────────────────────────────────────────
// review 탭(다음 step)이 산출할 회고 요약의 최소 계약.
// 공유 모듈은 표시 로직에 의존하지 않도록 자체 입력 타입을 둔다.

/** 월간 회고 요약(공유 입력). */
export interface MonthlySummary {
  /** 대상 연-월 `YYYY-MM`. */
  yearMonth: string;
  /** 그달 기록한 일기 수. */
  diaryCount: number;
  /** 그달 평균 기분(별점 1~5). 기록이 없으면 0/미정. */
  moodAverage: number;
  /** 그달 가장 자주 나온 운세 키워드(선택, 한 단어). */
  topKeyword?: string;
}

// ─────────────────────────────────────────────────────────────
// 순수 텍스트 빌더 (테스트 대상)
// ─────────────────────────────────────────────────────────────

/**
 * 오늘의 운세 결과 → 공유 텍스트(호기심 갭, 링크 자리 포함).
 *
 * 노출(미끼): 총운 별점 · 행운색 · 행운 방향.
 * 숨김(전체 보기 유도): 세부운(재물/애정/건강) 수치 · 일진 해설 · 한 줄 조언 · 타로.
 * → 결과를 다 노출하면 클릭 유입이 약해진다(PRD §9 Referral).
 *
 * 결정론: 동일 FortuneResult면 항상 동일 문자열(link 제외).
 *
 * @example
 * // 오늘 내 운세 ⭐⭐⭐⭐☆
 * // 행운색 초록 · 재물 방향 南
 * // 전체 보기 👉 <link>
 */
export function buildFortuneShareText(result: FortuneResult, link = ''): string {
  const stars = starsToEmoji(result.overall);
  const headline = `오늘 내 운세 ${stars}`;
  const teaser = `행운색 ${result.luckyColor} · 재물 방향 ${result.luckyDirection}`;
  return appendShareLink(`${headline}\n${teaser}`, link);
}

/**
 * 월간 회고 요약 → 공유 텍스트(호기심 갭, 링크 자리 포함).
 *
 * 노출(미끼): 이번 달 일기 수 · 평균 기분 별점 (+ 키워드 있으면 한 단어).
 * 숨김: 일별 그래프·일기 내용·운세 상세 → "전체 보기"로 유도.
 *
 * 결정론: 동일 MonthlySummary면 항상 동일 문자열(link 제외).
 *
 * @example
 * // 이번 달 회고 📔 일기 12개
 * // 평균 기분 ⭐⭐⭐⭐☆ · 키워드 '성장'
 * // 전체 보기 👉 <link>
 */
export function buildReviewShareText(summary: MonthlySummary, link = ''): string {
  const stars = starsToEmoji(summary.moodAverage);
  const safeCount = Math.max(0, Math.floor(Number.isFinite(summary.diaryCount) ? summary.diaryCount : 0));
  const headline = `이번 달 회고 📔 일기 ${safeCount}개`;
  const keyword = summary.topKeyword != null && summary.topKeyword.length > 0
    ? ` · 키워드 '${summary.topKeyword}'`
    : '';
  const teaser = `평균 기분 ${stars}${keyword}`;
  return appendShareLink(`${headline}\n${teaser}`, link);
}

// ─────────────────────────────────────────────────────────────
// SDK 얇은 래퍼 (테스트에서 모킹)
// ─────────────────────────────────────────────────────────────

/**
 * 미니앱 공유 링크(`intoss://evrytimes` 딥링크)를 생성한다.
 * 실패해도 공유 흐름이 깨지지 않도록 빈 문자열로 폴백한다(텍스트만 공유).
 */
export async function createShareLink(): Promise<string> {
  try {
    return await aitGetTossShareLink(SHARE_DEEPLINK);
  } catch {
    return '';
  }
}

/**
 * 오늘의 운세를 텍스트 전용으로 공유한다.
 * getTossShareLink로 미니앱 링크를 만들어 텍스트에 포함한 뒤 share({message})만 호출한다.
 * (이미지/링크 객체 전달 금지 — share는 텍스트 전용.)
 */
export async function shareFortune(result: FortuneResult): Promise<void> {
  const link = await createShareLink();
  const message = buildFortuneShareText(result, link);
  await aitShare({ message });
}

/** 월간 회고를 텍스트 전용으로 공유한다(운세 공유와 동일 규칙). */
export async function shareReview(summary: MonthlySummary): Promise<void> {
  const link = await createShareLink();
  const message = buildReviewShareText(summary, link);
  await aitShare({ message });
}

/** 친구초대(리워드) 진입점 콜백. contactsViral 옵션의 일부. */
export interface InviteFriendsCallbacks {
  /** 콘솔 공유 리워드 모듈 UUID(앱인토스 콘솔 > 공유 리워드). */
  moduleId: string;
  /** 리워드 지급/모듈 종료 등 이벤트 콜백(선택). */
  onEvent?: (event: ContactsViralEvent) => void;
  /** 에러 콜백(선택). */
  onError?: (error: unknown) => void;
}

/**
 * 친구초대(연락처 공유 + 리워드) 모듈을 연다.
 * contactsViral을 감싸 cleanup 함수를 그대로 반환한다(호출부에서 해제 필수).
 */
export function inviteFriends(params: InviteFriendsCallbacks): () => void {
  return aitContactsViral({
    options: { moduleId: params.moduleId },
    onEvent: params.onEvent ?? (() => {}),
    onError: params.onError ?? (() => {}),
  });
}
