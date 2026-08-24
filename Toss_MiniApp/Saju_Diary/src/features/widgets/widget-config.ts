// Evry Times — 위젯 편집 순수 변환 (widget-config)
//
// 역할(PRD §4 개인화 = 이탈 비용, §5 위젯 탭):
// - 홈 위젯 설정 `WidgetConfig[]`을 편집하는 순수 함수 모음.
//   토글(on/off) · 순서 변경(위/아래) · 크기 변경 — 전부 불변·결정론.
// - 위젯별 크기 정책을 강제한다(날씨·운세는 large 금지, PRD §6 압축 디폴트).
// - 홈 렌더용 셀렉터(enabled + order 정렬)를 제공한다 → today 홈의 단일 소스.
//
// 부수효과 없음(저장은 storage 접근자가 담당). DnD/상태관리 라이브러리 미사용(CRITICAL #5).

import type { WidgetConfig, WidgetType, WidgetSize } from '../../types';

// ─────────────────────────────────────────────────────────────
// 위젯 메타(라벨 · 설명)
// ─────────────────────────────────────────────────────────────

/** 위젯 편집 UI에 보일 메타 정보. */
export interface WidgetMeta {
  type: WidgetType;
  /** 사용자 노출 라벨. */
  label: string;
  /** 한 줄 설명(보조). */
  description: string;
  /** 위젯 상징 이모지(아이콘 대체, 라이브러리 미사용). */
  emoji: string;
}

export const WIDGET_META: Record<WidgetType, WidgetMeta> = {
  weather: { type: 'weather', label: '날씨', description: '아침 날씨와 미세먼지', emoji: '🌤️' },
  fortune: { type: 'fortune', label: '오늘의 운세', description: '사주 기반 오늘의 일진', emoji: '🔮' },
  dday: { type: 'dday', label: 'D-day', description: '기념일·목표일 카운트다운', emoji: '📅' },
  memo: { type: 'memo', label: '메모', description: '수시로 적는 한 줄 메모', emoji: '📝' },
  diary: { type: 'diary', label: '일기', description: '하루 한 번 기록', emoji: '📔' },
  tarot: { type: 'tarot', label: '타로', description: '오늘의 타로 한 장', emoji: '🃏' },
};

// ─────────────────────────────────────────────────────────────
// 크기 정책 (PRD §6: 날씨·운세는 압축 고정 — large 금지)
// ─────────────────────────────────────────────────────────────

/**
 * 위젯별 허용 크기.
 * - 날씨·운세: small/medium만(정보 압축 디폴트, large 금지).
 * - 메모: small(2단)/medium(1단)만 — 크게 없음(#5). 줄 수는 제한 없이 다 보여준다.
 * - D-day·일기: small/medium/large 모두 허용.
 */
export const ALLOWED_SIZES: Record<WidgetType, readonly WidgetSize[]> = {
  weather: ['small', 'medium'],
  fortune: ['small', 'medium'],
  dday: ['small', 'medium', 'large'],
  memo: ['small', 'medium'],
  diary: ['small', 'medium', 'large'],
  tarot: ['small'],
};

/** 해당 위젯 타입이 주어진 크기를 허용하는지. */
export function isSizeAllowed(type: WidgetType, size: WidgetSize): boolean {
  return ALLOWED_SIZES[type].includes(size);
}

/**
 * 정책에 맞게 크기를 보정한다.
 * 허용 크기면 그대로, 아니면 가장 가까운 허용 크기(보통 정책 상한 medium)로 낮춘다.
 */
export function clampSize(type: WidgetType, size: WidgetSize): WidgetSize {
  const allowed = ALLOWED_SIZES[type];
  if (allowed.includes(size)) {
    return size;
  }
  // large가 금지된 경우 medium으로 강등(허용 목록의 마지막 = 정책 상한).
  return allowed[allowed.length - 1];
}

// ─────────────────────────────────────────────────────────────
// 정규화
// ─────────────────────────────────────────────────────────────

/**
 * 설정 배열을 정규화한다(편집/렌더 전 항상 통과).
 * - order 오름차순으로 정렬한 뒤, order를 배열 인덱스로 재부여(연속·결정론).
 * - 각 위젯 크기를 정책에 맞게 보정(날씨·운세 large → medium).
 * 원본을 변형하지 않고 새 배열을 반환한다.
 */
export function normalizeWidgets(widgets: readonly WidgetConfig[]): WidgetConfig[] {
  return [...widgets]
    .sort((a, b) => a.order - b.order)
    .map((w, index) => ({
      ...w,
      order: index,
      size: clampSize(w.type, w.size),
    }));
}

// ─────────────────────────────────────────────────────────────
// 편집 변환 (불변)
// ─────────────────────────────────────────────────────────────

/** order 기준으로 type의 현재 위치(index)를 찾는다. 없으면 -1. */
function indexOfType(sorted: readonly WidgetConfig[], type: WidgetType): number {
  return sorted.findIndex((w) => w.type === type);
}

/**
 * 두 인덱스의 항목을 맞바꾼 새 배열.
 * 배열 위치 자체를 바꾼 뒤 order를 인덱스로 재부여한다(여기서 re-sort하면 안 됨 —
 * 기존 order로 되돌아간다). 크기 정책도 함께 보정.
 */
function swap(sorted: readonly WidgetConfig[], i: number, j: number): WidgetConfig[] {
  const next = [...sorted];
  const tmp = next[i];
  next[i] = next[j];
  next[j] = tmp;
  return next.map((w, index) => ({
    ...w,
    order: index,
    size: clampSize(w.type, w.size),
  }));
}

/**
 * 위젯을 한 칸 위로 이동(order 감소). 이미 맨 위거나 없으면 원본 그대로(정규화).
 */
export function moveUp(widgets: readonly WidgetConfig[], type: WidgetType): WidgetConfig[] {
  const sorted = normalizeWidgets(widgets);
  const i = indexOfType(sorted, type);
  if (i <= 0) {
    return sorted;
  }
  return swap(sorted, i, i - 1);
}

/**
 * 위젯을 한 칸 아래로 이동(order 증가). 이미 맨 아래거나 없으면 원본 그대로(정규화).
 */
export function moveDown(widgets: readonly WidgetConfig[], type: WidgetType): WidgetConfig[] {
  const sorted = normalizeWidgets(widgets);
  const i = indexOfType(sorted, type);
  if (i < 0 || i >= sorted.length - 1) {
    return sorted;
  }
  return swap(sorted, i, i + 1);
}

/**
 * fromIndex의 항목을 빼서 toIndex 위치에 끼워넣은 새 배열(드래그 재정렬용 순수 변형).
 * 인접 swap이 아니라 임의 위치 이동을 지원한다(드래그 드롭). order는 인덱스로 재부여.
 * 잘못된 인덱스나 from===to면 원본 그대로(정규화). 크기 정책도 함께 보정.
 */
export function reorder(
  widgets: readonly WidgetConfig[],
  fromIndex: number,
  toIndex: number,
): WidgetConfig[] {
  const sorted = normalizeWidgets(widgets);
  const n = sorted.length;
  // 범위를 벗어나거나(클램프 대신 무시) 동일 위치면 변화 없음.
  if (
    fromIndex < 0 ||
    fromIndex >= n ||
    toIndex < 0 ||
    toIndex >= n ||
    fromIndex === toIndex
  ) {
    return sorted;
  }
  const next = [...sorted];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next.map((w, index) => ({
    ...w,
    order: index,
    size: clampSize(w.type, w.size),
  }));
}

/**
 * type 위젯을 toIndex 위치로 이동한 새 배열(드래그 핸들이 호출).
 * 내부적으로 현재 위치를 찾아 reorder로 위임한다. 없는 타입이면 원본 그대로(정규화).
 */
export function moveTo(
  widgets: readonly WidgetConfig[],
  type: WidgetType,
  toIndex: number,
): WidgetConfig[] {
  const sorted = normalizeWidgets(widgets);
  const from = indexOfType(sorted, type);
  if (from < 0) {
    return sorted;
  }
  return reorder(sorted, from, toIndex);
}

/** 위젯 on/off를 명시값으로 설정. 없으면 원본 그대로(정규화). */
export function setEnabled(
  widgets: readonly WidgetConfig[],
  type: WidgetType,
  enabled: boolean,
): WidgetConfig[] {
  const sorted = normalizeWidgets(widgets);
  return sorted.map((w) => (w.type === type ? { ...w, enabled } : w));
}

/** 위젯 on/off를 반전한다. */
export function toggle(widgets: readonly WidgetConfig[], type: WidgetType): WidgetConfig[] {
  const sorted = normalizeWidgets(widgets);
  return sorted.map((w) => (w.type === type ? { ...w, enabled: !w.enabled } : w));
}

/**
 * 위젯 크기를 설정한다. 정책 위반(예: 날씨 large)은 clampSize로 보정해 적용한다.
 * 해당 타입이 없으면 원본 그대로(정규화).
 */
export function setSize(
  widgets: readonly WidgetConfig[],
  type: WidgetType,
  size: WidgetSize,
): WidgetConfig[] {
  const sorted = normalizeWidgets(widgets);
  return sorted.map((w) => (w.type === type ? { ...w, size: clampSize(type, size) } : w));
}

// ─────────────────────────────────────────────────────────────
// 홈 렌더 셀렉터 (today 홈의 단일 소스)
// ─────────────────────────────────────────────────────────────

/**
 * 홈에 실제로 그릴 위젯 목록.
 * enabled === true 인 위젯만, order 오름차순으로 반환(정규화된 order 기준).
 * today 홈은 이 결과만 보고 렌더한다(하드코딩 목록 금지, PRD §4).
 */
export function homeWidgets(widgets: readonly WidgetConfig[]): WidgetConfig[] {
  return normalizeWidgets(widgets).filter((w) => w.enabled);
}

/** 홈 렌더 순서(타입만) — 비-UI 검증/스냅샷용 셀렉터. */
export function homeWidgetTypes(widgets: readonly WidgetConfig[]): WidgetType[] {
  return homeWidgets(widgets).map((w) => w.type);
}
