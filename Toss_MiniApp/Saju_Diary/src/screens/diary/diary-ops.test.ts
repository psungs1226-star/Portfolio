/**
 * diary-ops 단위 테스트.
 *
 * 검증 축:
 *   1. 스냅샷 빌더: 날씨/운세 산출물 → 요약(복사·독립 객체, 없으면 null로 헤더 생략).
 *   2. upsertDiary: 하루 1개(같은 date 덮어쓰기), 추가는 맨 앞, 스냅샷 복사 저장, 불변.
 *   3. 조회: diaryForDate, 정렬.
 *   4. 불변성: 입력 배열·스냅샷 원본 미변경.
 */
import { describe, it, expect } from 'vitest';
import type { Diary, FortuneResult } from '../../types';
import type { WeatherBundle, Forecast } from '../../features/weather/types';
import {
  buildWeatherSnapshot,
  buildFortuneSnapshot,
  upsertDiary,
  removeDiary,
  diaryForDate,
  sortDiariesDesc,
} from './diary-ops';

// ── 픽스처 ──────────────────────────────────────────────────

function makeForecast(over: Partial<Forecast> = {}): Forecast {
  return {
    regionName: '서울',
    nx: 60,
    ny: 127,
    current: { time: '09:00', date: '2026-06-14', temp: 21.4, precip: 'none', sky: 'clear', iconCode: 'clear' },
    timeline: [],
    todayMin: 16.2,
    todayMax: 27.1,
    fetchedAt: '2026-06-14T00:00:00.000Z',
    ...over,
  };
}

function makeBundle(over: Partial<WeatherBundle> = {}): WeatherBundle {
  return { forecast: makeForecast(), stale: false, fetchedAt: '2026-06-14T00:00:00.000Z', ...over };
}

function makeFortune(over: Partial<FortuneResult> = {}): FortuneResult {
  return {
    date: '2026-06-14',
    overall: 4,
    scores: { wealth: 3, love: 4, health: 5 },
    luckyColor: '초록',
    luckyDirection: '동',
    iljin: '갑자일 — 새 시작에 좋은 날',
    advice: '서두르지 말고 한 걸음씩.',
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
    ...over,
  };
}

// ── 스냅샷 빌더 ─────────────────────────────────────────────

describe('buildWeatherSnapshot', () => {
  it('forecast에서 지역·상태·기온 요약을 만든다', () => {
    const snap = buildWeatherSnapshot(makeBundle());
    expect(snap).not.toBeNull();
    expect(snap!.regionName).toBe('서울');
    expect(snap!.condition).toBe('맑음');
    expect(snap!.temp).toBe('21° · 최저 16° / 최고 27°');
    expect(snap!.iconCode).toBe('clear');
  });

  it('forecast가 없으면 null(헤더 생략)', () => {
    expect(buildWeatherSnapshot(null)).toBeNull();
    expect(buildWeatherSnapshot(undefined)).toBeNull();
    expect(buildWeatherSnapshot({ stale: true, fetchedAt: '' } as WeatherBundle)).toBeNull();
  });

  it('비가 오면 상태가 비로 잡힌다', () => {
    const bundle = makeBundle({
      forecast: makeForecast({
        current: { time: '09:00', date: '2026-06-14', temp: 19, precip: 'rain', sky: 'cloudy', iconCode: 'rain' },
      }),
    });
    expect(buildWeatherSnapshot(bundle)!.condition).toBe('비');
  });

  it('원본 bundle을 변경하지 않고 독립 객체를 만든다(복사 저장 안전)', () => {
    const bundle = makeBundle();
    const before = JSON.stringify(bundle);
    const snap = buildWeatherSnapshot(bundle)!;
    snap.condition = 'mutated';
    snap.regionName = 'mutated';
    expect(JSON.stringify(bundle)).toBe(before);
  });
});

describe('buildFortuneSnapshot', () => {
  it('FortuneResult에서 총운·색·방향·일진·조언을 추린다', () => {
    const snap = buildFortuneSnapshot(makeFortune())!;
    expect(snap.overall).toBe(4);
    expect(snap.luckyColor).toBe('초록');
    expect(snap.luckyDirection).toBe('동');
    expect(snap.iljin).toContain('갑자일');
    expect(snap.advice).toContain('한 걸음');
  });

  it('결과가 없으면 null(헤더 생략)', () => {
    expect(buildFortuneSnapshot(null)).toBeNull();
    expect(buildFortuneSnapshot(undefined)).toBeNull();
  });

  it('basis로 근거 한 줄(basisLine)을 채운다(결정론)', () => {
    const snap = buildFortuneSnapshot(makeFortune())!;
    // 경(쇠) · 여름(火) 출생 · 신약 · 오늘 인성/favor → buildBasisLine 결정론 출력(한자 노출 X)
    expect(snap.basisLine).toBe(
      '일간 경(쇠) · 여름 출생이라 신약 사주예요. 오늘은 인성(흙) 기운이 들어와 부족함을 채워줘요.',
    );
  });

  it('회고형 입력으로 basis(작은 구조)를 복사 저장한다(독립 객체)', () => {
    const result = makeFortune();
    const snap = buildFortuneSnapshot(result)!;
    // 값은 같지만 참조는 독립(복사 저장 안전).
    expect(snap.basis).toEqual(result.basis);
    expect(snap.basis).not.toBe(result.basis);
    // 스냅샷 변형이 원본에 영향 없다.
    snap.basis!.strength = 'strong';
    expect(result.basis.strength).toBe('weak');
  });

  it('원본 result를 변경하지 않는다(복사 저장 안전)', () => {
    const result = makeFortune();
    const before = JSON.stringify(result);
    const snap = buildFortuneSnapshot(result)!;
    snap.overall = 1;
    snap.advice = 'mutated';
    expect(JSON.stringify(result)).toBe(before);
  });
});

// ── upsertDiary (하루 1개) ──────────────────────────────────

describe('upsertDiary', () => {
  it('빈 목록에 새 일기를 추가한다', () => {
    const next = upsertDiary([], { date: '2026-06-14', mood: 4, text: '좋은 하루' });
    expect(next).toHaveLength(1);
    expect(next[0]).toEqual({ date: '2026-06-14', mood: 4, text: '좋은 하루' });
  });

  it('제목/제목크기를 저장한다(trim, 빈 제목은 생략)', () => {
    const withTitle = upsertDiary([], {
      date: '2026-06-14',
      mood: 4,
      text: '본문',
      title: '  좋은 하루  ',
      titleSize: 'large',
    });
    expect(withTitle[0].title).toBe('좋은 하루');
    expect(withTitle[0].titleSize).toBe('large');

    const blankTitle = upsertDiary([], { date: '2026-06-15', mood: 3, text: 'x', title: '   ' });
    expect(blankTitle[0].title).toBeUndefined();
    expect(blankTitle[0].titleSize).toBeUndefined();
  });

  it('스냅샷을 복사 저장한다(빌더 결과를 그대로 박제)', () => {
    const weather = buildWeatherSnapshot(makeBundle());
    const fortune = buildFortuneSnapshot(makeFortune());
    const next = upsertDiary([], {
      date: '2026-06-14',
      mood: 5,
      text: '맑음',
      weatherSnapshot: weather,
      fortuneSnapshot: fortune,
    });
    expect(next[0].weatherSnapshot).toEqual(weather);
    expect(next[0].fortuneSnapshot).toEqual(fortune);
  });

  it('같은 날짜는 덮어쓴다 — 하루 1개 보장(중복 생성 안 함)', () => {
    const first = upsertDiary([], { date: '2026-06-14', mood: 2, text: '처음' });
    const second = upsertDiary(first, { date: '2026-06-14', mood: 5, text: '수정함' });
    const same = second.filter((d) => d.date === '2026-06-14');
    expect(same).toHaveLength(1);
    expect(same[0].mood).toBe(5);
    expect(same[0].text).toBe('수정함');
  });

  it('덮어쓸 때 순서를 보존한다(제자리 교체)', () => {
    const list: Diary[] = [
      { date: '2026-06-15', mood: 3, text: '내일치(앞)' },
      { date: '2026-06-14', mood: 1, text: '오늘 옛버전' },
      { date: '2026-06-13', mood: 2, text: '어제' },
    ];
    const next = upsertDiary(list, { date: '2026-06-14', mood: 4, text: '오늘 새버전' });
    expect(next.map((d) => d.date)).toEqual(['2026-06-15', '2026-06-14', '2026-06-13']);
    expect(next[1].text).toBe('오늘 새버전');
  });

  it('새 날짜는 맨 앞에 추가한다(최신 우선)', () => {
    const list: Diary[] = [{ date: '2026-06-13', mood: 3, text: '어제' }];
    const next = upsertDiary(list, { date: '2026-06-14', mood: 4, text: '오늘' });
    expect(next[0].date).toBe('2026-06-14');
  });

  it('본문 앞뒤 공백을 제거한다', () => {
    const next = upsertDiary([], { date: '2026-06-14', mood: 3, text: '  여백  ' });
    expect(next[0].text).toBe('여백');
  });

  it('null 스냅샷은 필드를 생략한다(헤더 없음)', () => {
    const next = upsertDiary([], {
      date: '2026-06-14',
      mood: 3,
      text: 'x',
      weatherSnapshot: null,
      fortuneSnapshot: null,
    });
    expect('weatherSnapshot' in next[0]).toBe(false);
    expect('fortuneSnapshot' in next[0]).toBe(false);
  });

  it('입력 배열을 변경하지 않는다(불변)', () => {
    const list: Diary[] = [{ date: '2026-06-13', mood: 3, text: '어제' }];
    const before = JSON.stringify(list);
    upsertDiary(list, { date: '2026-06-14', mood: 4, text: '오늘' });
    upsertDiary(list, { date: '2026-06-13', mood: 1, text: '덮어쓰기' });
    expect(JSON.stringify(list)).toBe(before);
  });
});

// ── 조회 / 삭제 / 정렬 ──────────────────────────────────────

describe('diaryForDate', () => {
  const list: Diary[] = [
    { date: '2026-06-14', mood: 4, text: '오늘' },
    { date: '2026-06-13', mood: 2, text: '어제' },
  ];

  it('해당 날짜의 일기를 찾는다', () => {
    expect(diaryForDate(list, '2026-06-13')!.text).toBe('어제');
  });

  it('없으면 null(과거 빈 날짜 열람 가능)', () => {
    expect(diaryForDate(list, '2026-06-01')).toBeNull();
    expect(diaryForDate([], '2026-06-14')).toBeNull();
  });
});

describe('removeDiary', () => {
  it('해당 날짜를 제거한다', () => {
    const list: Diary[] = [
      { date: '2026-06-14', mood: 4, text: '오늘' },
      { date: '2026-06-13', mood: 2, text: '어제' },
    ];
    const next = removeDiary(list, '2026-06-14');
    expect(next).toHaveLength(1);
    expect(next[0].date).toBe('2026-06-13');
  });

  it('없는 날짜면 원본 내용 그대로(새 배열)', () => {
    const list: Diary[] = [{ date: '2026-06-14', mood: 4, text: '오늘' }];
    const next = removeDiary(list, '2099-01-01');
    expect(next).toEqual(list);
    expect(next).not.toBe(list);
  });
});

describe('sortDiariesDesc', () => {
  it('날짜 내림차순(최신 먼저)으로 정렬한다', () => {
    const list: Diary[] = [
      { date: '2026-06-13', mood: 2, text: 'b' },
      { date: '2026-06-15', mood: 3, text: 'a' },
      { date: '2026-06-14', mood: 4, text: 'c' },
    ];
    expect(sortDiariesDesc(list).map((d) => d.date)).toEqual(['2026-06-15', '2026-06-14', '2026-06-13']);
  });

  it('입력 배열을 변경하지 않는다(불변)', () => {
    const list: Diary[] = [
      { date: '2026-06-13', mood: 2, text: 'b' },
      { date: '2026-06-15', mood: 3, text: 'a' },
    ];
    const before = JSON.stringify(list);
    sortDiariesDesc(list);
    expect(JSON.stringify(list)).toBe(before);
  });
});
