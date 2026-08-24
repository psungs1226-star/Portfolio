/**
 * diary-ops — 일기 목록 변형 + 헤더 스냅샷 빌더(순수 함수).
 *
 * 차별점(PRD §6.5): 일기 헤더에 그날 날씨·운세·기분(별점)을 자동 박제한다.
 * 핵심 규칙(step2):
 *   - 스냅샷은 작성 시점 값을 **복사 저장**한다(참조/재계산 금지). 나중에 운세·날씨가
 *     바뀌어도 그날 일기는 불변이어야 신뢰가 유지된다.
 *   - 비결정/외부 입력(작성 날짜 등)은 *주입*해 테스트를 결정론적으로 만든다.
 *   - 모든 목록 함수는 입력 배열을 변경하지 않고(불변) 새 Diary[]를 반환한다.
 *
 * 출처 재사용: 날씨 요약은 weather-view(conditionLabel·tempSummary), 운세 요약은
 *   fortune 엔진 결과(FortuneResult)에서 가져온다 — 여기서 만세력/점수를 재구현하지 않는다.
 * 런타임 0 의존(Storage·UI·네트워크 import 없음). 저장은 storage 접근자 책임(CRITICAL #1 경계).
 */
import type {
  Diary,
  DiaryTitleSize,
  DateString,
  Direction,
  FortuneBasis,
  FortuneResult,
  FortuneScores,
  LuckyColor,
} from '../../types';
import type { WeatherBundle } from '../../features/weather/types';
import { conditionLabel, tempSummary } from '../../widgets/weather-view';
import { buildBasisLine } from '../../widgets/fortune-today';

// ─────────────────────────────────────────────────────────────
// 스냅샷 모양(일기 헤더에 복사 저장되는 요약 — 작고 자기완결적)
// ─────────────────────────────────────────────────────────────

/** 작성 시점 날씨 요약(Diary.weatherSnapshot에 복사 저장). */
export interface WeatherSnapshot {
  /** 지역명(예: '서울'). */
  regionName: string;
  /** 한 줄 상태(예: '맑음', '비'). */
  condition: string;
  /** 기온 요약(예: '21° · 최저 16° / 최고 27°'). */
  temp: string;
  /** 대표 아이콘 코드(있으면). */
  iconCode?: string;
}

/** 작성 시점 운세 요약(Diary.fortuneSnapshot에 복사 저장). */
export interface FortuneSnapshot {
  /** 총운 별점 1~5. */
  overall: number;
  /** 분류별 점수(연애/금전/직장 — 각 1~5). 일기 이미지의 운세 세부 점수에 쓴다. */
  scores?: FortuneScores;
  /** 행운색. */
  luckyColor: LuckyColor;
  /** 행운방향. */
  luckyDirection: Direction;
  /** 오늘의 일진 한 줄. */
  iljin: string;
  /** 한 줄 조언. */
  advice: string;
  /** 신강/신약 근거 한 줄(있으면). "왜 이 운세인지" — 일기에 사주를 분명히. */
  basisLine?: string;
  /**
   * 점수 근거(부억扶抑·喜忌) 복사본 — 일기 회고형 문구의 입력.
   * detail까지 저장하면 스냅샷이 커지므로 회고에 필요한 작은 basis만 박제한다.
   * 표시 시점에 buildReflectiveLines(basis, ...)로 회고 요약·질문을 만든다(step2 UI).
   */
  basis?: FortuneBasis;
}

// ─────────────────────────────────────────────────────────────
// 스냅샷 빌더 (산출물 → 요약. 작성 시점 1회 호출, 결과를 그대로 복사 저장)
// ─────────────────────────────────────────────────────────────

/**
 * 날씨 묶음(WeatherBundle)에서 일기 헤더용 요약을 만든다.
 * forecast가 없으면(캐시 미스/네트워크 실패) null을 반환한다 — 헤더 생략(강제 호출 금지).
 * 반환값은 입력과 독립된 새 객체(복사 저장 안전).
 */
export function buildWeatherSnapshot(bundle: WeatherBundle | null | undefined): WeatherSnapshot | null {
  const forecast = bundle?.forecast;
  if (forecast == null) {
    return null;
  }
  const snap: WeatherSnapshot = {
    regionName: forecast.regionName,
    condition: conditionLabel(forecast.current),
    temp: tempSummary(forecast),
  };
  if (forecast.current.iconCode !== '') {
    snap.iconCode = forecast.current.iconCode;
  }
  return snap;
}

/**
 * 운세 결과(FortuneResult)에서 일기 헤더용 요약을 만든다.
 * 결과가 없으면(사주 미입력 등) null을 반환한다 — 헤더 생략.
 * 반환값은 입력과 독립된 새 객체(원본 변경 없음 — 복사 저장 안전).
 */
export function buildFortuneSnapshot(result: FortuneResult | null | undefined): FortuneSnapshot | null {
  if (result == null) {
    return null;
  }
  const snap: FortuneSnapshot = {
    overall: result.overall,
    scores: { ...result.scores },
    luckyColor: result.luckyColor,
    luckyDirection: result.luckyDirection,
    iljin: result.iljin,
    advice: result.advice,
  };
  const basisLine = buildBasisLine(result.basis).trim();
  if (basisLine !== '') {
    snap.basisLine = basisLine;
  }
  // 회고형 문구의 입력으로 basis를 복사 저장한다(원본과 독립된 새 객체 — 복사 저장 안전).
  if (result.basis != null) {
    snap.basis = { ...result.basis };
  }
  return snap;
}

// ─────────────────────────────────────────────────────────────
// 목록 변형 (하루 1개 = date가 키)
// ─────────────────────────────────────────────────────────────

/** upsertDiary에 주입하는 일기 입력값(스냅샷은 이미 빌더로 만든 복사본). */
export interface DiaryInput {
  /** 기록 날짜 `YYYY-MM-DD`(키). */
  date: DateString;
  /** 기분 별점 1~5. */
  mood: number;
  /** 본문. */
  text: string;
  /** 제목(선택, trim). 빈 문자열이면 저장 생략. */
  title?: string;
  /** 제목 글자 크기(선택). */
  titleSize?: DiaryTitleSize;
  /** 작성 시점 날씨 스냅샷(복사 저장). 없으면 헤더 생략. */
  weatherSnapshot?: WeatherSnapshot | null;
  /** 작성 시점 운세 스냅샷(복사 저장). 없으면 헤더 생략. */
  fortuneSnapshot?: FortuneSnapshot | null;
  /** 첨부 사진 1장(다운스케일 JPEG dataURL). 없으면 생략. */
  photo?: string | null;
}

/**
 * 같은 날짜의 일기를 새로 쓰거나(추가) 덮어쓴다(수정) — 하루 1개 보장.
 * 같은 date가 이미 있으면 제자리에서 교체(순서 보존), 없으면 맨 앞에 추가(최신 우선).
 * 스냅샷은 호출부가 빌더로 만든 값을 그대로 복사 저장한다(참조/재계산 아님).
 *
 * - text는 trim해 저장한다(앞뒤 공백 제거). 빈 본문도 허용(별점만 기록 가능).
 * - null/undefined 스냅샷은 필드 생략(헤더 없음).
 * - 입력 배열은 변경하지 않는다(불변).
 */
export function upsertDiary(diaries: Diary[], input: DiaryInput): Diary[] {
  const entry: Diary = {
    date: input.date,
    mood: input.mood,
    text: input.text.trim(),
  };
  const trimmedTitle = input.title?.trim();
  if (trimmedTitle != null && trimmedTitle !== '') {
    entry.title = trimmedTitle;
    if (input.titleSize != null) {
      entry.titleSize = input.titleSize;
    }
  }
  if (input.weatherSnapshot != null) {
    entry.weatherSnapshot = input.weatherSnapshot;
  }
  if (input.fortuneSnapshot != null) {
    entry.fortuneSnapshot = input.fortuneSnapshot;
  }
  if (input.photo != null && input.photo !== '') {
    entry.photo = input.photo;
  }

  const idx = diaries.findIndex((d) => d.date === input.date);
  if (idx === -1) {
    return [entry, ...diaries];
  }
  const next = diaries.slice();
  next[idx] = entry;
  return next;
}

/** id에 해당하는(=같은 date) 일기를 제거한다. 없으면 동일 내용의 새 배열을 반환한다. */
export function removeDiary(diaries: Diary[], date: DateString): Diary[] {
  return diaries.filter((d) => d.date !== date);
}

/** 주어진 날짜의 일기를 찾는다. 없으면 null(하루 1개라 항상 0 또는 1건). */
export function diaryForDate(diaries: Diary[], date: DateString): Diary | null {
  return diaries.find((d) => d.date === date) ?? null;
}

/** 일기를 날짜 내림차순(최신 먼저)으로 정렬한 새 배열을 반환한다(과거 열람용 목록). */
export function sortDiariesDesc(diaries: Diary[]): Diary[] {
  return diaries.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}
