// Evry Times — 온보딩 프리셋 (순수 로직, 런타임 부수효과 0)
//
// 역할:
// - 빈 홈 금지(PRD §9 Activation): 온보딩을 건너뛰거나 생일을 미입력해도
//   날씨·D-day·메모가 즉시 동작하는 안전한 기본 `Settings`를 만든다.
// - 온보딩 결과(선택 위젯·크기·생일)를 `Settings`로 매핑한다.
//
// 부수효과 없음(저장은 storage 접근자가 담당). 날짜는 `YYYY-MM-DD` 문자열.

import type { Settings, WidgetConfig, WidgetType, WidgetSize, SajuInput, CharacterKind } from '../../types';

/**
 * 홈 표시 순서(위→아래): 날씨·운세 → 메모 → D-day → 일기.
 * 메모를 D-day보다 위로 둔다(사용자 피드백 #9 — 자주 쓰는 메모를 더 위에).
 */
export const WIDGET_ORDER: readonly WidgetType[] = [
  'weather',
  'fortune',
  'memo',
  'dday',
  'diary',
  'tarot',
] as const;

/**
 * 위젯별 기본 크기 — 전부 작게(사용자 피드백 #6: 작게가 디폴트).
 * 온보딩/설정에서 사용자가 키울 수 있다.
 */
export const DEFAULT_WIDGET_SIZE: Record<WidgetType, WidgetSize> = {
  weather: 'small',
  fortune: 'small',
  dday: 'small',
  memo: 'small',
  diary: 'small',
  tarot: 'small',
};

/**
 * 빈 홈 방지를 위해 즉시 켜는 기본 위젯들.
 * 일기도 홈에 노출(사용자 피드백 "일기도 홈 화면에") — 그날 일기 요약/유도 카드.
 * 운세도 기본 ON(사용자 피드백) — 생일 미입력이어도 홈에서 샘플 별점 + "내 생일 넣기"로 동작한다.
 */
const ACTIVATION_DEFAULT_TYPES: readonly WidgetType[] = [
  'weather',
  'fortune',
  'dday',
  'memo',
  'diary',
  'tarot',
] as const;

/**
 * 위젯 타입 집합으로부터 `WidgetConfig[]`를 만든다.
 * - `enabled`는 선택 여부, 그 외 위젯도 끈 상태(enabled:false)로 포함시켜 순서/크기를 보존한다.
 * - `order`는 `WIDGET_ORDER` 기준 고정(홈 레이아웃 일관성).
 */
export function buildWidgetConfigs(enabledTypes: readonly WidgetType[]): WidgetConfig[] {
  const enabledSet = new Set(enabledTypes);
  return WIDGET_ORDER.map((type, index) => ({
    type,
    enabled: enabledSet.has(type),
    size: DEFAULT_WIDGET_SIZE[type],
    order: index,
  }));
}

/**
 * 빈 홈 방지 기본 프리셋.
 * 생일 없이도 날씨·D-day·메모가 켜진 안전한 Settings를 반환한다.
 * (운세는 생일 입력 전까지 off — 홈에서 "생일 넣고 오늘 운세 보기" CTA로 유도.)
 */
export function defaultPresetSettings(): Settings {
  return {
    widgets: buildWidgetConfigs(ACTIVATION_DEFAULT_TYPES),
    weather: { regions: [] },
  };
}

/** 온보딩 STEP 결과(화면 → 매핑 입력). */
export interface OnboardingResult {
  /** STEP1에서 사용자가 켠 위젯 종류(복수). */
  selectedWidgets: readonly WidgetType[];
  /** STEP2에서 사용자가 고른 위젯별 크기(D-day·메모만 의미, 미지정 시 기본값). */
  sizes?: Partial<Record<WidgetType, WidgetSize>>;
  /** 운세 선택 시 입력한 생일 정보(미입력 가능 — 필수 게이트 금지). */
  saju?: SajuInput;
  /** 사주 캐릭터 종류(고양이/강아지/수달). */
  characterKind?: CharacterKind;
}

/**
 * 온보딩 결과 → `Settings` 매핑.
 *
 * 핵심(PRD §9): **절대 빈 홈을 만들지 않는다.**
 * - 사용자가 아무 위젯도 안 골랐어도 활성화 기본(날씨·운세·메모·D-day·일기)을 켠다.
 * - 일기는 온보딩에 토글이 없으므로 **항상 켠다**(사용자 피드백 #11 — 멋대로 끄지 않는다).
 * - 생일을 넣으면 운세를 **자동으로 켠다**(사용자 피드백 #10 — 생일=운세 자동 연동).
 * - 생일이 있으면 saju를 저장한다(cached는 다음 phase에서 계산).
 */
export function settingsFromOnboarding(result: OnboardingResult): Settings {
  const hasAnySelection = result.selectedWidgets.length > 0;
  // 생일을 유효하게 넣었으면 운세를 자동 연동(켠다) — #10.
  const autoFortune = !!(result.saju?.birthDate && isValidBirthDate(result.saju.birthDate));
  const enabledTypes = hasAnySelection
    ? // 사용자 선택 + 일기 항상 켜기(#11) + 생일 입력 시 운세 자동 연동(#10).
      dedupe([
        ...result.selectedWidgets,
        'diary',
        ...(autoFortune ? (['fortune'] as WidgetType[]) : []),
      ])
    : ACTIVATION_DEFAULT_TYPES;

  const widgets = buildWidgetConfigs(enabledTypes).map((cfg) => {
    const override = result.sizes?.[cfg.type];
    return override != null ? { ...cfg, size: override } : cfg;
  });

  const settings: Settings = {
    widgets,
    weather: { regions: [] },
    characterKind: result.characterKind ?? 'rabbit',
  };

  // 생일을 유효하게 입력한 경우에만 saju 저장(미입력은 빈 홈 방지를 위해 통과).
  if (result.saju?.birthDate && isValidBirthDate(result.saju.birthDate)) {
    settings.saju = {
      birthDate: result.saju.birthDate,
      isLunar: result.saju.isLunar,
      ...(result.saju.birthTime ? { birthTime: result.saju.birthTime } : {}),
      // 야자시 유파(23시 출생) / 직접 입력 교정본 — 있으면 보존(원국 산출에 영향).
      ...(result.saju.sect != null ? { sect: result.saju.sect } : {}),
      ...(result.saju.manual != null ? { manual: result.saju.manual } : {}),
    };
  }

  return settings;
}

/** 위젯 타입 중복 제거(순서 보존). */
function dedupe(types: readonly WidgetType[]): WidgetType[] {
  return Array.from(new Set(types));
}

/** 생일 문자열이 `YYYY-MM-DD` 형식이고 실제 달력상 유효한지 검사한다. */
export function isValidBirthDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [y, m, d] = value.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) {
    return false;
  }
  // 월별 일수 검증(윤년 포함).
  const daysInMonth = new Date(y, m, 0).getDate();
  return d <= daysInMonth;
}
