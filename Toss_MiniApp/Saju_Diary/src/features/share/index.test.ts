import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FortuneResult } from '../../types';

// ── SDK 모킹: 순수 빌더 테스트가 네이티브 모듈에 묶이지 않도록 web-framework를 가짜로 ──
const mockShare = vi.fn(async () => {});
const mockGetTossShareLink = vi.fn(async (path: string) => `https://toss.im/share/abc?p=${path}`);
const mockContactsViral = vi.fn(() => () => {});

vi.mock('@apps-in-toss/web-framework', () => ({
  share: (msg: { message: string }) => mockShare(msg),
  getTossShareLink: (path: string) => mockGetTossShareLink(path),
  contactsViral: (params: unknown) => mockContactsViral(params),
}));

import {
  APP_NAME,
  SHARE_DEEPLINK,
  FULL_VIEW_CTA,
  starsToEmoji,
  appendShareLink,
  buildFortuneShareText,
  buildReviewShareText,
  createShareLink,
  shareFortune,
  shareReview,
  inviteFriends,
  type MonthlySummary,
} from './index';

// ── 픽스처 ──
function makeFortune(overrides: Partial<FortuneResult> = {}): FortuneResult {
  return {
    date: '2026-06-14',
    overall: 4,
    scores: { wealth: 3, love: 5, health: 2 },
    luckyColor: '초록',
    luckyDirection: '남',
    iljin: '갑자일 — 새 시작에 좋은 날',
    advice: '서두르지 말고 한 걸음씩.',
    tarot: { index: 0, name: 'The Fool', reversed: false, meaning: '새로운 출발' },
    basis: {
      dayGan: '庚',
      dayWuXing: '金',
      monthZhi: '午',
      monthWuXing: '火',
      strength: 'weak',
      todayGroup: '인성',
      todayStance: 'favor',
      todayTenGod: '정인',
      deLing: false,
    },
    detail: {
      segments: [
        { part: 'morning', zhi: '卯', wuXing: '木', group: '재성', stance: 'neutral', dayBranch: 'none' },
        { part: 'day', zhi: '午', wuXing: '火', group: '관성', stance: 'avoid', dayBranch: 'none' },
        { part: 'evening', zhi: '酉', wuXing: '金', group: '비겁', stance: 'favor', dayBranch: 'none' },
        { part: 'night', zhi: '子', wuXing: '水', group: '식상', stance: 'avoid', dayBranch: 'none' },
      ],
      caution: { avoidGroup: '인성', chong: false, cautionPart: 'day' },
    },
    ...overrides,
  };
}

function makeSummary(overrides: Partial<MonthlySummary> = {}): MonthlySummary {
  return {
    yearMonth: '2026-06',
    diaryCount: 12,
    moodAverage: 4,
    topKeyword: '성장',
    ...overrides,
  };
}

beforeEach(() => {
  mockShare.mockClear();
  mockGetTossShareLink.mockClear();
  mockContactsViral.mockClear();
  mockGetTossShareLink.mockResolvedValue('https://toss.im/share/abc');
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─────────────────────────────────────────────────────────────
describe('상수', () => {
  it('딥링크는 appName 기반 intoss 경로다', () => {
    expect(APP_NAME).toBe('evrytimes');
    expect(SHARE_DEEPLINK).toBe('intoss://evrytimes');
  });
});

describe('starsToEmoji — 별점 → 이모지', () => {
  it('4점은 채운 별 4 + 빈 별 1', () => {
    expect(starsToEmoji(4)).toBe('⭐⭐⭐⭐☆');
  });

  it('5점 만점은 모두 채운 별', () => {
    expect(starsToEmoji(5)).toBe('⭐⭐⭐⭐⭐');
  });

  it('1점은 채운 별 1 + 빈 별 4', () => {
    expect(starsToEmoji(1)).toBe('⭐☆☆☆☆');
  });

  it('범위를 벗어난 값은 클램프한다(엣지)', () => {
    expect(starsToEmoji(0)).toBe('☆☆☆☆☆');
    expect(starsToEmoji(-3)).toBe('☆☆☆☆☆');
    expect(starsToEmoji(9)).toBe('⭐⭐⭐⭐⭐');
  });

  it('소수/비정상 값도 안전하게 내림·폴백한다(엣지)', () => {
    expect(starsToEmoji(3.9)).toBe('⭐⭐⭐☆☆');
    expect(starsToEmoji(Number.NaN)).toBe('☆☆☆☆☆');
  });
});

describe('appendShareLink — 전체 보기 링크 자리', () => {
  it('링크가 있으면 CTA + 링크를 줄바꿈으로 덧붙인다', () => {
    expect(appendShareLink('본문', 'L')).toBe(`본문\n${FULL_VIEW_CTA} L`);
  });

  it('링크가 비면 CTA만 붙인다(링크 자리)', () => {
    expect(appendShareLink('본문', '')).toBe(`본문\n${FULL_VIEW_CTA}`);
  });
});

describe('buildFortuneShareText — 운세 공유 텍스트', () => {
  it('별점·행운색·행운방향을 포함한다(미끼 노출)', () => {
    const text = buildFortuneShareText(makeFortune(), 'https://toss.im/share/abc');
    expect(text).toContain('오늘 내 운세');
    expect(text).toContain('⭐⭐⭐⭐☆'); // overall 4
    expect(text).toContain('행운색 초록');
    expect(text).toContain('남'); // 행운 방향
  });

  it('호기심 갭: 세부운/조언/타로/일진 전체를 노출하지 않는다', () => {
    const text = buildFortuneShareText(makeFortune(), 'L');
    // 세부 수치 표기 없음
    expect(text).not.toContain('재물 3');
    expect(text).not.toContain('애정');
    expect(text).not.toContain('건강');
    // 조언·타로·일진 해설 본문이 새어나오지 않음
    expect(text).not.toContain('서두르지 말고');
    expect(text).not.toContain('The Fool');
    expect(text).not.toContain('새 시작에 좋은 날');
    // 전체 보기 CTA로 유도
    expect(text).toContain(FULL_VIEW_CTA);
  });

  it('링크가 있으면 전체 보기 줄에 링크를 포함한다', () => {
    const text = buildFortuneShareText(makeFortune(), 'https://toss.im/share/abc');
    expect(text).toContain(`${FULL_VIEW_CTA} https://toss.im/share/abc`);
  });

  it('결정론: 동일 입력은 동일 출력', () => {
    const r = makeFortune();
    expect(buildFortuneShareText(r, 'L')).toBe(buildFortuneShareText(r, 'L'));
  });

  it('엣지: 링크 인자 없이도 CTA 자리를 남긴다', () => {
    const text = buildFortuneShareText(makeFortune());
    expect(text.endsWith(FULL_VIEW_CTA)).toBe(true);
  });
});

describe('buildReviewShareText — 월간 회고 공유 텍스트', () => {
  it('일기 수·평균 기분 별점·키워드를 포함한다', () => {
    const text = buildReviewShareText(makeSummary(), 'L');
    expect(text).toContain('이번 달 회고');
    expect(text).toContain('일기 12개');
    expect(text).toContain('⭐⭐⭐⭐☆'); // moodAverage 4
    expect(text).toContain("키워드 '성장'");
    expect(text).toContain(FULL_VIEW_CTA);
  });

  it('키워드가 없으면 키워드 절을 생략한다(엣지)', () => {
    const text = buildReviewShareText(makeSummary({ topKeyword: undefined }), 'L');
    expect(text).not.toContain('키워드');
    expect(text).toContain('평균 기분');
  });

  it('기록이 없을 때(0개·기분 0) 안전하게 렌더한다(엣지)', () => {
    const text = buildReviewShareText(
      makeSummary({ diaryCount: 0, moodAverage: 0, topKeyword: undefined }),
      'L',
    );
    expect(text).toContain('일기 0개');
    expect(text).toContain('☆☆☆☆☆');
  });

  it('결정론: 동일 입력은 동일 출력', () => {
    const s = makeSummary();
    expect(buildReviewShareText(s, 'L')).toBe(buildReviewShareText(s, 'L'));
  });
});

// ─────────────────────────────────────────────────────────────
// SDK 래퍼 — 모킹으로 텍스트 전용 공유 규칙 검증
// ─────────────────────────────────────────────────────────────
describe('createShareLink — 미니앱 링크 생성', () => {
  it('getTossShareLink를 딥링크 경로로 호출한다', async () => {
    const link = await createShareLink();
    expect(mockGetTossShareLink).toHaveBeenCalledWith(SHARE_DEEPLINK);
    expect(link).toBe('https://toss.im/share/abc');
  });

  it('SDK 실패 시 빈 문자열로 폴백한다(공유 흐름 보호)', async () => {
    mockGetTossShareLink.mockRejectedValueOnce(new Error('bridge down'));
    const link = await createShareLink();
    expect(link).toBe('');
  });
});

describe('shareFortune / shareReview — 텍스트 전용 공유', () => {
  it('shareFortune은 share({message})만 호출한다(텍스트 전용)', async () => {
    await shareFortune(makeFortune());
    expect(mockShare).toHaveBeenCalledTimes(1);
    const arg = mockShare.mock.calls[0][0] as { message: string };
    expect(Object.keys(arg)).toEqual(['message']); // image/link 객체 없음
    expect(typeof arg.message).toBe('string');
    expect(arg.message).toContain('오늘 내 운세');
    expect(arg.message).toContain('https://toss.im/share/abc'); // 링크가 텍스트에 포함
  });

  it('shareReview도 텍스트 메시지만 전달한다', async () => {
    await shareReview(makeSummary());
    const arg = mockShare.mock.calls[0][0] as { message: string };
    expect(Object.keys(arg)).toEqual(['message']);
    expect(arg.message).toContain('이번 달 회고');
  });
});

describe('inviteFriends — 친구초대(리워드) 래퍼', () => {
  it('contactsViral에 moduleId를 넘기고 cleanup을 반환한다', () => {
    const cleanup = inviteFriends({ moduleId: 'uuid-1234' });
    expect(mockContactsViral).toHaveBeenCalledTimes(1);
    const params = mockContactsViral.mock.calls[0][0] as {
      options: { moduleId: string };
      onEvent: unknown;
      onError: unknown;
    };
    expect(params.options.moduleId).toBe('uuid-1234');
    expect(typeof params.onEvent).toBe('function');
    expect(typeof params.onError).toBe('function');
    expect(typeof cleanup).toBe('function');
  });
});
