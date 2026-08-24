// Evry Times — 도메인 타입 단일 출처 (순수 타입만, 런타임 로직 0)
//
// 규칙:
// - 모든 날짜는 `YYYY-MM-DD` 문자열로 통일한다. Date 객체 금지(직렬화/타임존 버그 방지).
// - 권위 출처: CLAUDE.md §데이터 모델 · docs/ARCHITECTURE.md §4(데이터 모델) · §5(사주 엔진).

// ─────────────────────────────────────────────────────────────
// 공통 별칭
// ─────────────────────────────────────────────────────────────

/** `YYYY-MM-DD` 형식의 날짜 문자열. (예: '2026-06-14') */
export type DateString = string;

/** `HH:mm` 형식의 시각 문자열. (예: '23:30') */
export type TimeString = string;

// ─────────────────────────────────────────────────────────────
// 열거형 / 유니온
// ─────────────────────────────────────────────────────────────

/** 위젯 종류. */
export type WidgetType = 'weather' | 'fortune' | 'dday' | 'memo' | 'diary' | 'tarot';

/** 위젯/디데이 크기. */
export type WidgetSize = 'small' | 'medium' | 'large';

/** 오행(五行). */
export type WuXing = '木' | '火' | '土' | '金' | '水';

/** 십신(十神) 10종. */
export type TenGod =
  | '비견'
  | '겁재'
  | '식신'
  | '상관'
  | '편재'
  | '정재'
  | '편관'
  | '정관'
  | '편인'
  | '정인';

/** 콘텐츠 등급. 수익화는 7/26 이후 — 컨테스트 빌드에서는 'free'만 사용(CRITICAL #4). */
export type Tier = 'free' | 'premium';

// ─────────────────────────────────────────────────────────────
// 설정 (settings)
// ─────────────────────────────────────────────────────────────

/** 홈 위젯 배치 설정. */
export interface WidgetConfig {
  type: WidgetType;
  enabled: boolean;
  size: WidgetSize;
  /** 홈 화면 정렬 순서(오름차순). */
  order: number;
}

/** 날씨 지역. nx/ny는 기상청 격자 좌표(캐시). */
export interface Region {
  name: string;
  lat: number;
  lon: number;
  nx: number;
  ny: number;
}

/** 사주 입력값(온보딩 1회 수집). */
export interface SajuInput {
  /** 생년월일 `YYYY-MM-DD`. */
  birthDate: DateString;
  /** 출생 시각 `HH:mm`(선택). 미입력 시 시주(時柱) 생략. */
  birthTime?: TimeString;
  /** 음력 입력 여부. */
  isLunar: boolean;
  /**
   * 야자시(밤 23:00~23:59 출생) 일주 유파. 만세력마다 갈리는 지점이라 사용자가 고를 수 있다.
   * `2`=晩子時(당일 일주 유지·주류 디폴트), `1`=早子時(다음 날 일주로 넘김). 미지정 시 2.
   * 23시 출생이 아니면 결과에 영향 없음.
   */
  sect?: 1 | 2;
  /**
   * 직접 입력한 사주팔자(원국 덮어쓰기). 만세력 산출이 본인이 아는 사주와 다를 때(유파·경도·자료차)
   * 사용자가 네 기둥을 직접 골라 교정한다 — 같은 생일을 다시 넣어도 결정론이라 결과가 안 바뀌기 때문.
   * 각 값은 간지 2글자(예: `'甲子'`). 시주(hour)는 모르면 생략. year/month/day가 모두 유효하면
   * `computeNatal`이 만세력 대신 이 값으로 원국을 만든다(birthDate는 일진 변동 시드로 계속 사용).
   * 십신은 직접 재계산하지 않고 engine.tenGod(보편 매핑)로만 환산한다(CRITICAL #3).
   */
  manual?: {
    /** 년주 간지 2글자. */
    year: string;
    /** 월주 간지 2글자. */
    month: string;
    /** 일주 간지 2글자(일간=본질). */
    day: string;
    /** 시주 간지 2글자(선택). */
    hour?: string;
  };
}

/**
 * 사주 산출 캐시(ARCHITECTURE §5 산출물 기준).
 * 온보딩 1회 계산 후 저장, 매번 재계산하지 않는다.
 */
export interface SajuCache {
  /** 일간(日干) — 본질. 예: '甲'. */
  dayGan: string;
  /** 일간 오행. */
  dayWuXing: WuXing;
  /** 사주 사주(四柱) 간지 — 시주는 시간 미입력 시 생략. */
  pillars?: {
    year: string;
    month: string;
    day: string;
    hour?: string;
  };
  /** 십신 분포(선택, 해석 보조). */
  tenGods?: TenGod[];
  /** 캐시를 산출한 날짜 `YYYY-MM-DD`(무결성 확인용). */
  computedAt?: DateString;
}

/** 사주 캐릭터 종류(사용자 선택). 간판=토끼(레퍼런스). 색/오행 변형 없음 — 종류만 고른다. */
export type CharacterKind = 'rabbit' | 'cat' | 'dog' | 'otter';

/** 앱 전역 설정. weather.regions는 최대 2개. */
export interface Settings {
  widgets: WidgetConfig[];
  weather: {
    regions: Region[];
  };
  saju?: SajuInput & { cached?: SajuCache };
  /** 사주 캐릭터 종류(토끼/고양이/강아지/수달). 미설정 시 'rabbit'. */
  characterKind?: CharacterKind;
  /** 사용자를 부를 이름(온보딩 입력). 홈 인사 문구 "{userName}님 ...". 미설정 시 이름 없이 인사. */
  userName?: string;
  /** 캐릭터(사주 친구)의 별명(온보딩 입력). 미설정 시 종류 라벨(예: 강아지) 표시. */
  characterName?: string;
  /** 사용자가 직접 올린 캐릭터 사진(data URL, 로컬 전용 CRITICAL #1). 있으면 종류 PNG 대신 원형으로 표시. */
  characterPhoto?: string;
  /** 일기 관련 설정. */
  diary?: {
    /**
     * 일기 화면·이미지 저장에 그날 "한 일"(완료한 메모/할 일)을 함께 보여줄지.
     * 미설정(undefined)이면 표시(기본 ON). false면 숨김.
     */
    showDoneList?: boolean;
    /** 일기 손글씨 글씨체(사용자 선택). 미설정 시 기본 'poorstory'. */
    font?: DiaryFont;
  };
}

// ─────────────────────────────────────────────────────────────
// 일기 / 메모 / 디데이
// ─────────────────────────────────────────────────────────────

/** 일기. 하루 1건(date가 키). */
/** 일기 제목 글자 크기(사용자 선택, 제목칸 기능). */
export type DiaryTitleSize = 'small' | 'medium' | 'large';

/** 일기 손글씨 글씨체(사용자 선택). 전부 자체 호스팅 OFL 무료 폰트. */
export type DiaryFont = 'poorstory' | 'himelody' | 'gaegu' | 'dongle' | 'nanumpen';

export interface Diary {
  date: DateString;
  /** 기분 점수. */
  mood: number;
  /** 일기 제목(선택). */
  title?: string;
  /** 제목 글자 크기(선택, 기본 medium). */
  titleSize?: DiaryTitleSize;
  /** 작성 시점 날씨 스냅샷(구조는 weather 모듈에서 확정). */
  weatherSnapshot?: unknown;
  /** 작성 시점 운세 스냅샷(구조는 fortune 모듈에서 확정). */
  fortuneSnapshot?: unknown;
  /** 첨부 사진 1장(다운스케일 JPEG dataURL, 로컬 전용). 앱 기록 삭제 시 사라짐 — 이미지 저장 권장. */
  photo?: string;
  text: string;
}

/** 메모 꾸미기 색(선택). 'none'이면 기본 톤. */
export type MemoColor = 'none' | 'rose' | 'honey' | 'sage' | 'blue' | 'lavender';

/** 메모/할 일. */
export interface Memo {
  id: string;
  date: DateString;
  text: string;
  checked: boolean;
  isTodo: boolean;
  /** 할 일 완료일 `YYYY-MM-DD`. 완료(checked=true) 시 부여, 해제 시 제거.
   *  이 날짜의 일기에 "그날 완료한 일"로 노출된다(기본=완료한 날, 과거분은 재지정 가능). */
  completedDate?: DateString;
  /** 꾸미기 색(선택). 메모 박스 틴트/포인트. */
  color?: MemoColor;
}

/** 디데이. */
export interface Dday {
  id: string;
  title: string;
  targetDate: DateString;
  size: WidgetSize;
}

// ─────────────────────────────────────────────────────────────
// 운세 결과 (ARCHITECTURE §5)
// ─────────────────────────────────────────────────────────────

/** 행운색(오행→색 매핑 결과). */
export type LuckyColor = '초록' | '빨강' | '노랑' | '흰색' | '검정';

/** 방위(그날 재신/희신 방위). */
export type Direction = '동' | '서' | '남' | '북' | '동남' | '동북' | '서남' | '서북' | '중앙';

/** 세부운 항목(별점 1~5). */
export interface FortuneScores {
  /** 재물운. */
  wealth: number;
  /** 애정운. */
  love: number;
  /** 건강운. */
  health: number;
}

/** 타로 한 장(메이저 22장 + 정/역). */
export interface TarotCard {
  /** 카드 번호 0~21. */
  index: number;
  name: string;
  /** 정/역 — true면 역방향. */
  reversed: boolean;
  /** 카드 한 줄 해석. */
  meaning: string;
}

/** 십신 5계열(부억扶抑·喜忌 판정 단위). 비겁=동일, 인성=나를 生, 식상=내가 生, 재성=내가 剋, 관성=나를 剋. */
export type TenGodGroup = '비겁' | '식상' | '재성' | '관성' | '인성';

/** 신강/신약 판정. strong=신강, weak=신약, balanced=중화. */
export type DayMasterStrength = 'strong' | 'weak' | 'balanced';

/** 오늘 일진 계열이 그 사람에게 喜(favor)/忌(avoid)/中(neutral)인지. */
export type FortuneStance = 'favor' | 'avoid' | 'neutral';

/**
 * 운세 점수 근거(부억扶抑 기반) — 위젯이 한 줄 근거 문구를 만들 수 있게 구조화.
 * 같은 (natal, day)는 항상 같은 basis(결정론).
 */
export interface FortuneBasis {
  /** 일간(日干) 글자. */
  dayGan: string;
  /** 일간 오행. */
  dayWuXing: WuXing;
  /** 월지(月支) 글자 — 월령(月令). */
  monthZhi: string;
  /** 월지 오행(본기). */
  monthWuXing: WuXing;
  /** 신강/신약/중화. */
  strength: DayMasterStrength;
  /** 일간×오늘 천간 십신 계열. */
  todayGroup: TenGodGroup;
  /** 오늘 계열이 喜(favor)/忌(avoid)/中(neutral)인지. */
  todayStance: FortuneStance;
  /** 일간×오늘 천간의 정확한 십신(정/편 구분). 예: '편재'. */
  todayTenGod: TenGod;
  /** 월령 득실 — true=得令(월지 계열이 비겁/인성, 뿌리 든든), false=失令. */
  deLing: boolean;
}

// ─────────────────────────────────────────────────────────────
// 만세력 산출 (features/fortune/manse.ts — lunar-javascript 통합 결과)
// ─────────────────────────────────────────────────────────────

/** 사주 한 기둥(柱)의 간지. gan=천간, zhi=지지, ganZhi=합친 2글자(예: '甲子'). */
export interface Pillar {
  /** 천간(天干) 1글자. 예: '甲'. */
  gan: string;
  /** 지지(地支) 1글자. 예: '子'. */
  zhi: string;
  /** 간지(干支) 2글자. 예: '甲子'. */
  ganZhi: string;
}

/**
 * 원국(原局) 사주 — 생년월일(+선택 시간)에서 산출한 만세력.
 * lunar-javascript `EightChar`(八字)를 우리 도메인 타입으로 정규화한 것.
 * 해석(별점/문구)은 포함하지 않는다(다음 step).
 */
export interface NatalChart {
  /** 년주(年柱) — 입춘 기준. */
  year: Pillar;
  /** 월주(月柱) — 절기 기준. */
  month: Pillar;
  /** 일주(日柱) — 60갑자 연속. 일간이 본질. */
  day: Pillar;
  /** 시주(時柱) — 출생 시각 미입력 시 생략. */
  hour?: Pillar;
  /** 일간(日干) — 본질. day.gan과 동일(편의 접근). */
  dayGan: string;
  /** 일간 오행. */
  dayWuXing: WuXing;
  /**
   * 각 주의 십신(十神) — 일간 기준. 순서: [년, 월, 일, 시].
   * 일주는 항상 '日主'(=일간 자신)이라 십신이 아니므로 null.
   * 시주가 없으면 길이 3.
   */
  tenGods: (TenGod | null)[];
}

/**
 * 오늘(또는 주어진 날짜)의 일진(日辰) — 시간 무관, 60갑자 일주.
 * 운세 핵심 입력: 내 일간 × 오늘 일진 천간.
 */
export interface DayGanZhi {
  /** 대상 날짜 `YYYY-MM-DD`. */
  date: DateString;
  /** 일진 간지. */
  pillar: Pillar;
  /** 일진 천간 오행. */
  ganWuXing: WuXing;
  /** 일진 지지 오행. */
  zhiWuXing: WuXing;
  /** 그날 재신(財神) 방위 — 재물 길방. */
  caiDirection: Direction;
  /** 그날 희신(喜神) 방위 — 길방. */
  xiDirection: Direction;
}

// ─────────────────────────────────────────────────────────────
// 오늘의 상세 — 시간대별 기운 + 조심 (四正 왕지 해석 레이어)
// ─────────────────────────────────────────────────────────────

/** 하루 시간대(四正 왕지 기준). */
export type DayPart = 'morning' | 'day' | 'evening' | 'night';

/** 그 시간대 왕지와 오늘 일진 지지의 관계 — 합/충/같음/무. 문구·근거용. */
export type BranchRelation = 'he' | 'chong' | 'same' | 'none';

/** 한 시간대의 기운(구조 — 한국어 문구는 위젯 레이어에서). */
export interface TimeSegment {
  part: DayPart;
  /** 대표 왕지 한자(卯/午/酉/子). */
  zhi: string;
  /** 그 시간대 오행(木/火/金/水). */
  wuXing: WuXing;
  /** 일간 기준 그 오행의 십신 계열. */
  group: TenGodGroup;
  /** 그 사람에게 喜(favor)/忌(avoid)/中(neutral). 체질 희기 ± 오늘 일진 지지 합충. */
  stance: FortuneStance;
  /** 그 시간대 왕지와 오늘 일진 지지의 관계 — 六合/六沖/同/무. 문구·근거용. */
  dayBranch: BranchRelation;
}

/** 오늘 조심 포인트(구조). */
export interface DailyCaution {
  /** 오늘 들어온 기운이 본인 기신(忌)이면 그 계열, 아니면 null(영역 조심). */
  avoidGroup: TenGodGroup | null;
  /** 일지×오늘 지지 충(沖) 여부 — true면 변동·마찰 조심. */
  chong: boolean;
  /** 가장 조심할 시간대(忌 블록 중 첫째), 없으면 null. */
  cautionPart: DayPart | null;
}

/** 오늘의 상세(시간대 흐름 + 조심). */
export interface FortuneDetail {
  /** 시간대 흐름 — 길이 4(morning→day→evening→night 순). */
  segments: TimeSegment[];
  caution: DailyCaution;
}

/** 오늘의 운세 결과. */
export interface FortuneResult {
  /** 결과 날짜 `YYYY-MM-DD`. */
  date: DateString;
  /** 총운 별점 1~5. */
  overall: number;
  /** 세부운(재물·애정·건강). */
  scores: FortuneScores;
  /** 행운색. */
  luckyColor: LuckyColor;
  /** 행운방향. */
  luckyDirection: Direction;
  /** 오늘의 일진(교육 한 줄) — 일진 간지 등. */
  iljin: string;
  /** 한 줄 조언. */
  advice: string;
  /** 타로 보조(선택). */
  tarot?: TarotCard;
  /** 점수 근거(부억扶抑·喜忌) — 위젯이 근거 한 줄을 노출할 수 있게. */
  basis: FortuneBasis;
  /** 시간대별 기운 + 조심(자세한 운세) — 四正 왕지 해석 레이어. */
  detail: FortuneDetail;
}
