// Evry Times — 운세 위젯 조립 로직 (UI 비의존, 테스트 가능)
//
// 역할: settings의 saju 입력 + 오늘 날짜를 받아, fortune 모듈(manse·engine·phrases)을
//   재사용해 "오늘의 운세"를 한 번에 산출하고, 위젯이 그릴 표시용 묶음으로 정리한다.
//
// CRITICAL:
//   - 만세력/십신/점수 계산은 절대 여기서 재구현하지 않는다 — computeNatal·computeDayGanZhi·
//     buildFortune·attachPhrases·dayRelation·pickCategoryPhrase를 import해서 조립만 한다.
//   - 순수·결정론적. Storage·UI·네트워크 import 0. 날짜는 인자로 주입(테스트 가능).
//   - 원국(NatalChart)은 무겁지 않지만, 같은 입력이면 항상 같은 결과라 캐시는 호출부(위젯) 책임.

import type {
  DayMasterStrength,
  DayPart,
  FortuneBasis,
  FortuneDetail,
  FortuneResult,
  FortuneStance,
  NatalChart,
  SajuInput,
  TenGod,
  TenGodGroup,
  TimeSegment,
  WuXing,
} from '../types';
import { computeNatal, computeDayGanZhi, todayDateString, GAN_KO } from '../features/fortune/manse';
import { buildFortune, dayRelation, seed } from '../features/fortune/engine';
import type { Gender } from '../features/fortune/engine';
import {
  attachPhrases,
  pickCategoryPhraseByScore,
  pickChartTrait,
  pickSegmentPhrase,
  pickSegmentDayBranch,
  pickDeLing,
  pickXiShen,
  pickTenGodMeaning,
  pickCautionArea,
  pickCautionTenGod,
  pickCautionChong,
  pickReflectSummary,
  pickReflectTenGod,
  pickReflectQuestion,
  phraseProvider,
} from '../features/fortune/phrases';

/** 한 시간대의 표시용 묶음(아침/낮/저녁/밤 한 줄). 위젯은 birthDate/시드를 다루지 않고 이 값만 그린다. */
export interface SegmentDisplay {
  part: DayPart;
  /** 한글 라벨(아침/낮/저녁/밤). */
  label: string;
  /** 喜(favor)/忌(avoid)/中(neutral) — 가벼운 색/뱃지 표시용. */
  stance: FortuneStance;
  /** 서술·예측형 한 줄. */
  text: string;
}

/**
 * 상세 펼침에 그대로 그릴 표시 문자열 묶음(서술·예측형).
 * computeTodayFortune가 step1 빌더(describeChart·buildSegmentLine·buildCautionLine)로 미리 조립한다 →
 * 위젯은 birthDate/dateKey/시드를 다룰 필요 없이 표시만 한다(순수 presenter).
 */
export interface FortuneDetailText {
  /** "내 사주" 한 단락(describeChart). */
  chart: string;
  /** 시간대별 기운 4줄(morning→day→evening→night 순). */
  segments: SegmentDisplay[];
  /** "오늘 조심" 한 줄(없으면 null → 섹션 생략). */
  caution: string | null;
}

/** 위젯 표시용 운세 묶음 — 압축(별점·일진·한 줄)과 상세(세부운·문구·타로)를 모두 담는다. */
export interface TodayFortune {
  /** 대상 날짜 `YYYY-MM-DD`. */
  date: string;
  /** 점수/색/방향/일진/조언/타로가 담긴 엔진 결과. */
  result: FortuneResult;
  /** 세부운 카테고리 문구(상세 표시용). */
  phrases: {
    overall: string;
    wealth: string;
    love: string;
    health: string;
  };
  /** 상세 펼침 표시 문자열(내 사주·시간대별 기운·오늘 조심) — 미리 조립(서술·예측형). */
  detailText: FortuneDetailText;
}

/** computeToday 옵션. */
export interface ComputeTodayOptions {
  /** 애정운 관점 성별(기본 male). */
  gender?: Gender;
  /**
   * 미리 산출해 둔 원국(캐시). 주면 computeNatal을 건너뛴다(콜드스타트 최적화).
   * 없으면 input으로 새로 산출한다.
   */
  natal?: NatalChart;
}

/**
 * 원국을 산출한다 — 위젯이 한 번 계산해 두고 재사용(캐시)하기 위한 얇은 래퍼.
 * manse.computeNatal을 그대로 위임한다(재구현 아님).
 */
export function computeNatalCached(input: SajuInput): NatalChart {
  return computeNatal(input);
}

/**
 * 오늘의 운세를 한 번에 산출한다(위젯 진입점).
 *
 * 파이프라인: (원국) → 오늘 일진 → buildFortune(점수/색/방향) → attachPhrases(일진/조언/타로)
 *   → 카테고리 문구(총운/재물/애정/건강, 별점 밴드 정합).
 * 카테고리 4종은 각 항목의 별점(score)에 맞는 밴드(low/mid/high) 문구를 고른다 →
 *   별점과 문구 톤이 항상 일치(낮은 점수=조심, 높은 점수=적극).
 * 전부 fortune 모듈 재사용. 같은 입력·같은 날짜 → 항상 같은 결과.
 *
 * @param input    사주 입력(생년월일 등).
 * @param dateKey  대상 날짜 `YYYY-MM-DD`. 미지정 시 오늘(로컬).
 * @param opts     성별·캐시된 원국.
 */
export function computeTodayFortune(
  input: SajuInput,
  dateKey: string = todayDateString(),
  opts: ComputeTodayOptions = {},
): TodayFortune {
  const natal = opts.natal ?? computeNatal(input);
  const day = computeDayGanZhi(dateKey);
  const relation = dayRelation(natal, day);

  // 점수/색/방향 + (문구는 provider로 같이 채움). attachPhrases와 동일 결과지만
  // buildFortune의 phraseProvider 경로로 한 번에 조립한다(중복 계산 없음).
  let result = buildFortune(natal, day, input.birthDate, {
    gender: opts.gender,
    phraseProvider,
  });
  // 방어: provider가 비어도 문구가 항상 채워지도록 보강(점수/색/방향 보존).
  if (result.iljin === '' || result.advice === '' || result.tarot == null) {
    result = attachPhrases(result, input.birthDate, relation, natal.dayWuXing);
  }

  // 오늘의 십신 노출(UI 변경 없이) — 기존 일진 한 줄 뒤에 **정확한 십신 + 한 줄 의미**를 덧붙인다.
  //   "{기존 일진} 오늘 일진은 당신에게 {십신} — {의미}." (result.iljin은 FortuneWidget의
  //   '오늘의 일진' 블록 등 기존 렌더 경로로 그대로 흐른다 → 컴포넌트 변경 없음.)
  result = { ...result, iljin: appendTenGodToIljin(result.iljin, result.basis, input.birthDate, dateKey) };

  // 카테고리 문구는 각 항목의 별점에 맞는 밴드 문구로 고른다(별점-문구 톤 정합).
  //   overall ← result.overall, wealth/love/health ← result.scores.*.
  const phrases = {
    overall: pickCategoryPhraseByScore('overall', result.overall, input.birthDate, dateKey),
    wealth: pickCategoryPhraseByScore('wealth', result.scores.wealth, input.birthDate, dateKey),
    love: pickCategoryPhraseByScore('love', result.scores.love, input.birthDate, dateKey),
    health: pickCategoryPhraseByScore('health', result.scores.health, input.birthDate, dateKey),
  };

  // 상세 표시 문자열을 미리 조립한다(서술·예측형) — 위젯은 birthDate/시드를 다루지 않고 그리기만.
  //   내 사주(describeChart) · 시간대별 기운 4줄(buildSegmentLine) · 오늘 조심(buildCautionLine).
  // 전부 step1 빌더 호출 = 표시 문자열 조립. 만세력/점수/시간대 stance는 재계산하지 않는다.
  const detailText: FortuneDetailText = {
    chart: describeChart(result.basis, input.birthDate),
    segments: result.detail.segments.map((seg) => ({
      part: seg.part,
      label: DAY_PART_LABEL[seg.part],
      stance: seg.stance,
      text: buildSegmentLine(seg, input.birthDate, dateKey),
    })),
    caution: buildCautionLine(result.detail, result.basis, input.birthDate, dateKey),
  };

  return { date: result.date, result, phrases, detailText };
}

// ─────────────────────────────────────────────────────────────
// 홈 요약 한 줄(buildSummaryLine) — 별점 옆 키워드형 요약(#2 피드백)
//
// 홈 카드는 긴 문장(phrases.overall)을 나열하지 않고, "재물 좋음 · 낮에 추진력" 같은
// 핵심 키워드만 점(·)으로 잇는다. 단정 예언 없음 — 가장 높은 세부운 + 가장 좋은 시간대만 압축.
// 순수·결정론: result에서만 파생(별도 계산 없음).
// ─────────────────────────────────────────────────────────────

/** 세부운 키 → 한글 키워드. */
const SCORE_KEYWORD: Record<keyof FortuneScores, string> = {
  wealth: '재물',
  love: '애정',
  health: '건강',
};

/** 시간대 → 한글 라벨(요약용, DAY_PART_LABEL과 동일 정합). */
const SUMMARY_PART_LABEL: Record<DayPart, string> = {
  morning: '아침',
  day: '낮',
  evening: '저녁',
  night: '밤',
};

/**
 * 홈 요약 한 줄을 조립한다(키워드형, 순수·결정론). 문장 나열 금지(#2).
 *
 * 형식: "{가장 높은 세부운}운이 {반짝이는/잔잔한/차분한} 하루 · {가장 좋은 시간대} 무렵 기운이 좋아요"
 *  - 세부운 3종(재물/애정/건강) 중 최고 점수 1개만 키워드로(동점이면 재물>애정>건강 우선).
 *    점수 ≥4면 "반짝이는", =3이면 "잔잔한", ≤2면 "차분한"(낮은 점수도 부정 없이 따뜻하게).
 *  - favor 시간대가 있으면 그중 첫 시간대를 "낮 무렵 기운이 좋아요"처럼 덧붙인다(없으면 생략).
 *
 * @example "재물운이 반짝이는 하루 · 낮 무렵 기운이 좋아요"
 * @example "건강운은 잔잔한 하루"  (favor 시간대 없을 때)
 */
export function buildSummaryLine(result: FortuneResult): string {
  const keys: (keyof FortuneScores)[] = ['wealth', 'love', 'health'];
  const best = keys.reduce((a, b) => (result.scores[b] > result.scores[a] ? b : a));
  const score = result.scores[best];
  const kw = SCORE_KEYWORD[best];
  // 점수 밴드 → 따뜻한 형용(낮아도 부정 없이 잔잔/차분으로). 조사도 톤에 맞게(이/은).
  const head =
    score >= 4 ? `${kw}운이 반짝이는 하루` : score === 3 ? `${kw}운은 잔잔한 하루` : `${kw}운은 차분한 하루`;

  const favorSeg = result.detail.segments.find((s) => s.stance === 'favor');
  if (favorSeg != null) {
    return `${head} · ${SUMMARY_PART_LABEL[favorSeg.part]} 무렵 기운이 좋아요`;
  }
  return head;
}

/** 십신 그룹 → 친근한 "기운" 키워드(총운 한 줄용 — 전문용어 대신 쉬운 말). */
const GROUP_ENERGY_WORD: Record<TenGodGroup, string> = {
  비겁: '자기 주관과 추진',
  식상: '표현과 활동',
  재성: '재물과 기회',
  관성: '일과 책임',
  인성: '배움과 안정',
};

/**
 * 오늘의 총운 "기운 한 줄"을 조립한다(순수·결정론, 쉬운 말).
 * "오늘은 {어떤} 기운이 도드라져요. {좋다/무난/조심}." — 점수가 아니라 흐름을 말한다.
 *  - 喜(favor): 필요한 기운이 들어와 좋은 편.
 *  - 忌(avoid): 기운이 과해 조금 조심.
 *  - 中(neutral): 무난.
 * 신강/신약·오행 같은 전문용어는 쓰지 않는다(사용자 요청 — "너무 전문적이지 않게").
 *
 * @example "오늘은 재물과 기회 기운이 도드라져요. 필요한 기운이 들어와 흐름이 좋은 편이에요."
 */
export function buildOverallEnergyLine(result: FortuneResult): string {
  const word = GROUP_ENERGY_WORD[result.basis.todayGroup];
  const stance = result.basis.todayStance;
  const verdict =
    stance === 'favor'
      ? '필요한 기운이 들어와 흐름이 좋은 편이에요'
      : stance === 'avoid'
        ? '기운이 다소 과하게 들어와 조금 조심스러운 날이에요'
        : '기운이 무난하게 흐르는 날이에요';
  return `오늘은 ${word} 기운이 도드라져요. ${verdict}.`;
}

// ─────────────────────────────────────────────────────────────
// 근거 한 줄(buildBasisLine) — "왜 이 운세인지" 상세 노출용
//
// FortuneBasis(엔진 산출)만으로 한국어 한 줄을 결정론적으로 조립한다.
// LLM/서버 0 — 순수 매핑·문자열 조립. 토스 보이스 해요체, 단정적 예언 금지.
// ─────────────────────────────────────────────────────────────

/** 신강/신약/중화 → 한글 라벨. */
const STRENGTH_LABEL: Record<DayMasterStrength, string> = {
  strong: '신강',
  weak: '신약',
  balanced: '중화',
};

/**
 * 신강/신약/중화 → 희신 계열(engine.favorableGroups와 동일 정합).
 *  - 신강: 빼주는 쪽(식상·재성·관성)이 희신.
 *  - 신약: 보태는 쪽(비겁·인성)이 희신.
 *  - 중화: 뚜렷한 희신 없음(중립).
 * describeChart가 "무엇이 들어와야 좋은지"를 정확히 말하는 데 쓴다(재계산 아님, 같은 매핑 사용).
 */
const STRENGTH_FAVOR: Record<DayMasterStrength, TenGodGroup[]> = {
  strong: ['식상', '재성', '관성'],
  weak: ['비겁', '인성'],
  balanced: [],
};

/** 십신(정/편 10종) → 5계열. engine.TEN_GOD_GROUP과 동일 정합(라벨링 보조). */
const TEN_GOD_TO_GROUP: Record<TenGod, TenGodGroup> = {
  비견: '비겁',
  겁재: '비겁',
  식신: '식상',
  상관: '식상',
  편재: '재성',
  정재: '재성',
  편관: '관성',
  정관: '관성',
  편인: '인성',
  정인: '인성',
};

/** 월령 오행 → 계절(木봄·火여름·金가을·水겨울·土환절기). */
const WU_XING_SEASON: Record<WuXing, string> = {
  木: '봄',
  火: '여름',
  金: '가을',
  水: '겨울',
  土: '환절기',
};

/** 오행 → 한글 색/이름(괄호 표기용). */
const WU_XING_NAME: Record<WuXing, string> = {
  木: '나무',
  火: '불',
  土: '흙',
  金: '쇠',
  水: '물',
};

/** 相生: X가 生하는 오행(X→이 오행). 예: 木→火. (engine과 동일 정합, 표기 보조용.) */
const SHENG_NEXT: Record<WuXing, WuXing> = {
  木: '火',
  火: '土',
  土: '金',
  金: '水',
  水: '木',
};

/** 相剋: X가 剋하는 오행(X→이 오행). 예: 木→土. (engine과 동일 정합, 표기 보조용.) */
const KE_NEXT: Record<WuXing, WuXing> = {
  木: '土',
  土: '水',
  水: '火',
  火: '金',
  金: '木',
};

/**
 * 일간 오행(我) 기준, 오늘 계열의 대표 오행을 역산한다(설명용 괄호 표기).
 *  - 비겁: 같은 오행(我)
 *  - 인성: 我를 生하는 오행(生我)
 *  - 식상: 我가 生하는 오행(我生)
 *  - 재성: 我가 剋하는 오행(我剋)
 *  - 관성: 我를 剋하는 오행(剋我)
 * engine.wuXingToGroup의 역방향 — 점수 계산과 무관한 라벨링 보조.
 */
function groupWuXing(me: WuXing, group: TenGodGroup): WuXing {
  switch (group) {
    case '비겁':
      return me;
    case '식상':
      return SHENG_NEXT[me]; // 我生
    case '재성':
      return KE_NEXT[me]; // 我剋
    case '인성':
      // 我를 生하는 오행: SHENG_NEXT[x] === me 인 x.
      return (Object.keys(SHENG_NEXT) as WuXing[]).find((k) => SHENG_NEXT[k] === me) ?? me;
    case '관성':
      // 我를 剋하는 오행: KE_NEXT[x] === me 인 x.
      return (Object.keys(KE_NEXT) as WuXing[]).find((k) => KE_NEXT[k] === me) ?? me;
    default:
      return me;
  }
}

/**
 * 근거 한 줄을 조립한다(결정론·순수). basis만 소비.
 *
 * 형식: "일간 {간}{오행} · {계절} 출생이라 {신강/신약/중화} 사주예요. {오늘 절}"
 *  - favor:   "오늘은 {계열}({오행}) 기운이 들어와 부족함을 채워줘요."
 *  - avoid:   "오늘은 {계열}({오행}) 기운이 더해져 다소 과해요."
 *  - neutral: "오늘은 {계열}({오행}) 기운이 무난하게 흘러요."
 *
 * 중화(balanced)는 喜忌 중립이라 todayStance가 neutral로 오므로 자연스럽게
 * "무난하게 흘러요" 톤으로 마무리한다. 단정적 예언 없음.
 *
 * @example buildBasisLine(신약·favor·인성/土)
 *   "일간 경(쇠) · 여름 출생이라 신약 사주예요. 오늘은 인성(흙) 기운이 들어와 부족함을 채워줘요."
 * @example buildBasisLine(신강·avoid·인성/水)
 *   "일간 갑(나무) · 봄 출생이라 신강 사주예요. 오늘은 인성(물) 기운이 더해져 다소 과해요."
 */
export function buildBasisLine(basis: FortuneBasis): string {
  const dayLabel = `${GAN_KO[basis.dayGan]}(${WU_XING_NAME[basis.dayWuXing]})`;
  const season = WU_XING_SEASON[basis.monthWuXing];
  const strength = STRENGTH_LABEL[basis.strength];
  const intro = `일간 ${dayLabel} · ${season} 출생이라 ${strength} 사주예요.`;

  const wxName = WU_XING_NAME[groupWuXing(basis.dayWuXing, basis.todayGroup)];
  const today = buildTodayClause(basis.todayGroup, basis.todayStance, wxName);
  return `${intro} ${today}`;
}

/** 오늘 계열·입장(喜忌)에 따른 마무리 절을 조립한다(순수). */
function buildTodayClause(group: TenGodGroup, stance: FortuneStance, wxName: string): string {
  if (stance === 'favor') {
    return `오늘은 ${group}(${wxName}) 기운이 들어와 부족함을 채워줘요.`;
  }
  if (stance === 'avoid') {
    return `오늘은 ${group}(${wxName}) 기운이 더해져 다소 과해요.`;
  }
  return `오늘은 ${group}(${wxName}) 기운이 무난하게 흘러요.`;
}

/**
 * 기존 일진 한 줄 뒤에 **오늘의 정확한 십신 + 한 줄 의미**를 덧붙인다(순수·결정론).
 * 형식: "{기존 일진} 오늘 일진은 당신에게 {십신} — {의미}."
 *  - 십신·의미는 모두 우리가 계산한 basis.todayTenGod + tenGodMeaning 풀(정/편 정확).
 *  - basis.todayTenGod이 없으면(이론상) 기존 일진을 그대로 둔다(방어).
 * FortuneWidget은 result.iljin을 기존처럼 렌더 → 컴포넌트 변경 없이 십신이 노출된다.
 */
function appendTenGodToIljin(
  iljin: string,
  basis: FortuneBasis,
  birthDate: string,
  dateKey: string,
): string {
  const tg = basis.todayTenGod;
  if (tg == null) {
    return iljin;
  }
  const meaning = pickTenGodMeaning(tg, seed(birthDate, dateKey, `tenGodMeaning|${tg}`));
  const clause = `오늘 일진은 당신에게 ${tg} — ${meaning}.`;
  return iljin === '' ? clause : `${iljin} ${clause}`;
}

// ─────────────────────────────────────────────────────────────
// 자세한 운세 문구 빌더 — 오늘(서술·예측형) + 일기(회고·질문형)
//
// step0의 구조화 detail(시간대 segments + caution)과 basis를 한국어 문구로 조립한다.
// 톤 분리(핵심):
//   - 오늘(홈 위젯): 서술·예측형. "낮에는 추진력이 붙는 때예요", "저녁에는 한 박자 쉬어가요."
//   - 일기: 회고·질문형. "오늘은 ~한 하루였어요. 어떻게 흘러갔나요?" (명령·약속 톤 금지)
// 모두 순수·결정론: 같은 입력이면 동일 출력. seed/seedIndex(engine) + phrases 선택자 재사용.
// 문구 텍스트는 전부 phrases.ts 선택자를 통해 data/fortune-phrases.json에서 가져온다(자체 작성).
// ─────────────────────────────────────────────────────────────

/** 하루 시간대 → 한글 라벨(아침/낮/저녁/밤). */
const DAY_PART_LABEL: Record<DayPart, string> = {
  morning: '아침',
  day: '낮',
  evening: '저녁',
  night: '밤',
};

/**
 * "이런 사주" 설명을 조립한다(오늘 상세 — 서술형, 순수·결정론). 전문가 수준.
 *
 * buildBasisLine보다 풍부: 일간 오행 성정 + **월령 득령/실령**(basis.deLing) + 계절(월령 오행)
 *   + 신강/신약 + **희신 계열**(무엇이 들어와야 좋은지, 정확히).
 *
 * 형식: "{성정조각} {간}{오행} 일간이 {계절}({월령오행})에 나 {득령/실령조각} {신강/신약/중화} 사주예요. {희신절}"
 *  - 성정·득령·희신 마무리 조각은 모두 phrases 풀에서 birthDate 시드로 고른다(사주 고정 → 날짜 무관).
 *  - 희신 계열은 STRENGTH_FAVOR(=engine.favorableGroups 동일 매핑)에서 정확히 가져와 오행과 함께 표기.
 *  - 단정 예언 없음. "흐름/기운/때" 톤.
 *
 * @example describeChart(경(쇠)·여름·실령·신약·favor[비겁,인성])
 *   "맺고 끊고 싶은데 결단을 받쳐 줄 힘이 모자라 망설임이 길어져요. 경(쇠) 일간이 여름(불)에 나 월령을 잃어
 *    기운이 빠지기 쉬운 신약 사주예요. 일간을 돕는 비겁(쇠)·인성(흙)이 희신이라, 그 기운이 들어올 때 중심이 잡혀요."
 */
export function describeChart(basis: FortuneBasis, birthDate: string): string {
  const dayLabel = `${GAN_KO[basis.dayGan]}(${WU_XING_NAME[basis.dayWuXing]})`;
  const season = WU_XING_SEASON[basis.monthWuXing];
  const seasonWx = WU_XING_NAME[basis.monthWuXing];
  const strength = STRENGTH_LABEL[basis.strength];
  const trait = pickChartTrait(basis.dayWuXing, basis.strength, birthDate);
  const deLingClause = pickDeLing(basis.deLing, birthDate);

  const intro = `${trait} ${dayLabel} 일간이 ${season}(${seasonWx})에 나 ${deLingClause} ${strength} 사주예요.`;
  const xi = buildXiShenClause(basis, birthDate);
  return `${intro} ${xi}`;
}

/**
 * 희신 절을 조립한다 — 신강/신약에 따라 무엇이 들어와야 좋은지 정확히(순수·결정론).
 *  - 신약: "일간을 돕는 {계열}({오행})·… 이 희신이라, {xiShen 마무리}"
 *  - 신강: "기운을 덜어 주는 {계열}({오행})·… 이 희신이라, {xiShen 마무리}"
 *  - 중화: 희신 명시 없이 {xiShen 마무리}만(중립).
 * 계열·오행은 STRENGTH_FAVOR + groupWuXing(=engine 매핑)에서 정확히 가져온다.
 */
function buildXiShenClause(basis: FortuneBasis, birthDate: string): string {
  const tail = pickXiShen(basis.strength, birthDate);
  const favor = STRENGTH_FAVOR[basis.strength];
  if (favor.length === 0) {
    // 중화 — 뚜렷한 희신 없음(중립). 마무리 조각만.
    return tail;
  }
  const labeled = favor
    .map((g) => `${g}(${WU_XING_NAME[groupWuXing(basis.dayWuXing, g)]})`)
    .join('·');
  const verb = basis.strength === 'weak' ? '돕는' : '덜어 주는';
  return `일간을 ${verb} ${labeled}이 희신이라, ${tail}`;
}

/**
 * 한 시간대 한 줄을 조립한다(오늘 상세 — 서술·예측형, 순수·결정론). 전문가 수준.
 *
 * **stance + dayBranch를 함께 반영**해 오늘 왜 그런지를 명시한다:
 *  - 기본 한 줄 = (part×stance) 풀(favor=좋은 흐름·avoid=완급·neutral=담백).
 *  - 근거 한 조각 = `seg.dayBranch`(오늘 일진 지지 관계) 풀에서:
 *     he(합)=어우러지는 때 / same(同·왕)=힘이 실리는 때 / chong(충)=흔들리기 쉬운 때 / none=담백.
 *  → **he-day와 chong-day가 다른 문구로 읽힌다.** 시드는 (birthDate, dateKey, salt별)로 결정론.
 *
 * @example buildSegmentLine({part:'day', stance:'favor', dayBranch:'he', ...}, ...)
 *   "낮에는 추진력이 붙는 때예요. … 오늘 일진과 합을 이뤄 결이 부드럽게 맞물려요."
 * @example buildSegmentLine({part:'day', stance:'avoid', dayBranch:'chong', ...}, ...)
 *   "낮에는 일을 너무 몰아붙이면 지치기 쉬워요. … 오늘 일진과 부딪쳐 살짝 흔들리기 쉬운 때예요."
 */
export function buildSegmentLine(seg: TimeSegment, birthDate: string, dateKey: string): string {
  const base = pickSegmentPhrase(seg.part, seg.stance, seed(birthDate, dateKey, `seg|${seg.part}`));
  const dayClause = pickSegmentDayBranch(
    seg.dayBranch,
    seed(birthDate, dateKey, `segDay|${seg.part}|${seg.dayBranch}`),
  );
  return `${base} ${dayClause}`;
}

/**
 * "오늘 조심" 한 줄을 조립한다(오늘 상세 — 서술형, 순수·결정론). 전문가 수준. 조심거리 없으면 null.
 *
 * 우선순위:
 *  1) caution.avoidGroup이 있으면(=오늘 들어온 계열이 본인 기신) **정확한 십신(basis.todayTenGod)**
 *     으로 정/편 뉘앙스를 살린 조심 한 줄(편재→큰 지출·투자 충동, 정재→인색·융통, 정관→규칙·문서 등).
 *     방어: todayTenGod의 계열이 avoidGroup과 어긋나면 계열 풀(pickCautionArea)로 폴백.
 *  2) caution.chong이면 변동·마찰 주의 한 조각(avoidGroup이 있으면 덧붙이고, 없으면 단독).
 *  3) cautionPart가 있으면 "특히 {시간대}엔 한 번 더 살펴봐요"를 결합.
 *  4) 위 둘 다 없으면 null(조심거리 없음).
 *
 * 톤: "~을 한 번 더 확인해요", "~은 서두르지 않기" — 단정 예언·공포 조성 금지.
 */
export function buildCautionLine(
  detail: FortuneDetail,
  basis: FortuneBasis,
  birthDate: string,
  dateKey: string,
): string | null {
  const { avoidGroup, chong, cautionPart } = detail.caution;
  const parts: string[] = [];

  if (avoidGroup != null) {
    // 정확한 십신으로(정/편 뉘앙스). todayTenGod 계열이 avoidGroup과 일치할 때만 사용, 어긋나면 계열 폴백.
    const tg = basis.todayTenGod;
    if (tg != null && TEN_GOD_TO_GROUP[tg] === avoidGroup) {
      parts.push(pickCautionTenGod(tg, seed(birthDate, dateKey, `cautionTenGod|${tg}`)));
    } else {
      parts.push(pickCautionArea(avoidGroup, seed(birthDate, dateKey, `cautionArea|${avoidGroup}`)));
    }
  }
  if (chong) {
    parts.push(pickCautionChong(seed(birthDate, dateKey, 'cautionChong')));
  }

  if (parts.length === 0) {
    return null;
  }

  let line = parts.join(' ');
  if (cautionPart != null) {
    line = `${line} 특히 ${DAY_PART_LABEL[cautionPart]}엔 한 번 더 살펴봐요.`;
  }
  return line;
}

/**
 * 일기 회고형 두 줄을 조립한다(일기 — 회고·질문형, 순수·결정론). 전문가 수준.
 * summary=그날 사주를 과거형으로 요약, question=돌아보게 하는 질문.
 * 명령·약속 톤("~해줘요"/"~하세요"/"~보세요") 금지 — 지난 일을 돌아보게 한다.
 *
 * summary는 **정확한 십신(basis.todayTenGod)** 을 과거형으로 언급한다(편재 vs 정재 등).
 *   - todayTenGod이 있으면 reflectTenGod[십신] 풀, 없으면(과거 스냅샷 하위호환) 계열 풀(reflectSummary)로 폴백.
 * question은 공용(common) + 오늘 계열(group) 풀 가중. detail은 쓰지 않는다(시그니처 보존).
 *
 * @example buildReflectiveLines(편재·...) →
 *   { summary: "오늘은 재물과 기회가 크게 움직인 하루였어요.",
 *     question: "오늘 돈이나 결실 앞에서 어떤 선택을 하셨나요?" }
 */
export function buildReflectiveLines(
  basis: FortuneBasis,
  detail: FortuneDetail,
  birthDate: string,
  dateKey: string,
): { summary: string; question: string } {
  // 회고 기준 계열 = 오늘 들어온 계열(basis.todayGroup). detail은 향후 시간대 recap 여지.
  const group = basis.todayGroup;
  void detail;
  const tg = basis.todayTenGod;
  const summary =
    tg != null
      ? pickReflectTenGod(tg, seed(birthDate, dateKey, `reflectTenGod|${tg}`))
      : pickReflectSummary(group, seed(birthDate, dateKey, `reflectSummary|${group}`));
  const question = pickReflectQuestion(seed(birthDate, dateKey, 'reflectQuestion'), group);
  return { summary, question };
}
