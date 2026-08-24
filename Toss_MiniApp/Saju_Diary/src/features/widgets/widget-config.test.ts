import { describe, expect, it } from 'vitest';
import type { WidgetConfig } from '../../types';
import {
  ALLOWED_SIZES,
  clampSize,
  homeWidgetTypes,
  homeWidgets,
  isSizeAllowed,
  moveDown,
  moveTo,
  moveUp,
  normalizeWidgets,
  reorder,
  setEnabled,
  setSize,
  toggle,
} from './widget-config';

/** 테스트 픽스처: 기본 위젯 4종(순서·크기 정책 반영). */
function fixture(): WidgetConfig[] {
  return [
    { type: 'weather', enabled: true, size: 'small', order: 0 },
    { type: 'fortune', enabled: true, size: 'small', order: 1 },
    { type: 'dday', enabled: true, size: 'medium', order: 2 },
    { type: 'memo', enabled: false, size: 'medium', order: 3 },
  ];
}

describe('normalizeWidgets', () => {
  it('order를 배열 인덱스로 연속 재부여한다', () => {
    const messy: WidgetConfig[] = [
      { type: 'dday', enabled: true, size: 'medium', order: 50 },
      { type: 'weather', enabled: true, size: 'small', order: 10 },
      { type: 'memo', enabled: true, size: 'medium', order: 30 },
    ];
    const out = normalizeWidgets(messy);
    expect(out.map((w) => [w.type, w.order])).toEqual([
      ['weather', 0],
      ['memo', 1],
      ['dday', 2],
    ]);
  });

  it('정책 위반 크기(날씨 large)를 medium으로 강등한다', () => {
    const out = normalizeWidgets([
      { type: 'weather', enabled: true, size: 'large', order: 0 },
      { type: 'fortune', enabled: true, size: 'large', order: 1 },
      { type: 'dday', enabled: true, size: 'large', order: 2 },
    ]);
    expect(out[0].size).toBe('medium'); // weather large 금지
    expect(out[1].size).toBe('medium'); // fortune large 금지
    expect(out[2].size).toBe('large'); // dday large 허용
  });

  it('원본을 변형하지 않는다(불변)', () => {
    const input = fixture();
    const snapshot = JSON.stringify(input);
    normalizeWidgets(input);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it('결정론: 같은 입력은 같은 출력', () => {
    expect(normalizeWidgets(fixture())).toEqual(normalizeWidgets(fixture()));
  });
});

describe('크기 정책', () => {
  it('ALLOWED_SIZES: 날씨·운세·메모는 large 미포함, D-day·일기는 포함', () => {
    expect(ALLOWED_SIZES.weather).not.toContain('large');
    expect(ALLOWED_SIZES.fortune).not.toContain('large');
    expect(ALLOWED_SIZES.memo).not.toContain('large'); // 메모는 2단/1단만(#5)
    expect(ALLOWED_SIZES.dday).toContain('large');
    expect(ALLOWED_SIZES.diary).toContain('large');
  });

  it('isSizeAllowed', () => {
    expect(isSizeAllowed('weather', 'large')).toBe(false);
    expect(isSizeAllowed('weather', 'medium')).toBe(true);
    expect(isSizeAllowed('dday', 'large')).toBe(true);
  });

  it('clampSize: 금지 크기는 정책 상한(medium)으로, 허용 크기는 그대로', () => {
    expect(clampSize('weather', 'large')).toBe('medium');
    expect(clampSize('fortune', 'large')).toBe('medium');
    expect(clampSize('weather', 'small')).toBe('small');
    expect(clampSize('dday', 'large')).toBe('large');
  });
});

describe('moveUp / moveDown (경계)', () => {
  it('moveUp: 한 칸 위로 이동하고 order를 갱신', () => {
    const out = moveUp(fixture(), 'fortune');
    expect(out.map((w) => w.type)).toEqual(['fortune', 'weather', 'dday', 'memo']);
    expect(out.map((w) => w.order)).toEqual([0, 1, 2, 3]);
  });

  it('moveUp: 맨 위 위젯은 그대로(정규화만)', () => {
    const out = moveUp(fixture(), 'weather');
    expect(out.map((w) => w.type)).toEqual(['weather', 'fortune', 'dday', 'memo']);
  });

  it('moveDown: 한 칸 아래로 이동', () => {
    const out = moveDown(fixture(), 'weather');
    expect(out.map((w) => w.type)).toEqual(['fortune', 'weather', 'dday', 'memo']);
  });

  it('moveDown: 맨 아래 위젯은 그대로', () => {
    const out = moveDown(fixture(), 'memo');
    expect(out.map((w) => w.type)).toEqual(['weather', 'fortune', 'dday', 'memo']);
  });

  it('없는 타입은 그대로(정규화만)', () => {
    const out = moveUp(fixture(), 'diary');
    expect(out.map((w) => w.type)).toEqual(['weather', 'fortune', 'dday', 'memo']);
  });

  it('moveUp 후 moveDown은 원상복귀(왕복)', () => {
    const once = moveUp(fixture(), 'dday');
    const back = moveDown(once, 'dday');
    expect(back).toEqual(normalizeWidgets(fixture()));
  });

  it('원본을 변형하지 않는다', () => {
    const input = fixture();
    const snapshot = JSON.stringify(input);
    moveUp(input, 'fortune');
    moveDown(input, 'weather');
    expect(JSON.stringify(input)).toBe(snapshot);
  });
});

describe('reorder / moveTo (드래그 재정렬)', () => {
  it('reorder: 앞에서 뒤로 임의 이동 + order 연속 재부여', () => {
    // weather(0)를 dday 자리(2)로 — splice 삽입 시맨틱.
    const out = reorder(fixture(), 0, 2);
    expect(out.map((w) => w.type)).toEqual(['fortune', 'dday', 'weather', 'memo']);
    expect(out.map((w) => w.order)).toEqual([0, 1, 2, 3]);
  });

  it('reorder: 뒤에서 앞으로 임의 이동', () => {
    // memo(3)를 맨 앞(0)으로.
    const out = reorder(fixture(), 3, 0);
    expect(out.map((w) => w.type)).toEqual(['memo', 'weather', 'fortune', 'dday']);
    expect(out.map((w) => w.order)).toEqual([0, 1, 2, 3]);
  });

  it('reorder: 인접 이동은 swap과 동일 효과', () => {
    expect(reorder(fixture(), 0, 1).map((w) => w.type)).toEqual(
      moveDown(fixture(), 'weather').map((w) => w.type),
    );
  });

  it('reorder: from===to면 변화 없음(정규화만)', () => {
    expect(reorder(fixture(), 2, 2)).toEqual(normalizeWidgets(fixture()));
  });

  it('reorder: 범위 밖 인덱스는 무시(정규화만)', () => {
    expect(reorder(fixture(), -1, 2)).toEqual(normalizeWidgets(fixture()));
    expect(reorder(fixture(), 0, 99)).toEqual(normalizeWidgets(fixture()));
  });

  it('reorder: 원본을 변형하지 않는다(불변)', () => {
    const input = fixture();
    const snapshot = JSON.stringify(input);
    reorder(input, 0, 3);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it('reorder: 크기 정책 보정(날씨 large → medium)', () => {
    const bad: WidgetConfig[] = [
      { type: 'dday', enabled: true, size: 'large', order: 0 },
      { type: 'weather', enabled: true, size: 'large', order: 1 },
    ];
    const out = reorder(bad, 0, 1);
    expect(out.map((w) => w.type)).toEqual(['weather', 'dday']);
    expect(out.find((w) => w.type === 'weather')?.size).toBe('medium');
    expect(out.find((w) => w.type === 'dday')?.size).toBe('large');
  });

  it('moveTo: 타입을 지정 인덱스로 이동(reorder 위임)', () => {
    const out = moveTo(fixture(), 'memo', 0);
    expect(out.map((w) => w.type)).toEqual(['memo', 'weather', 'fortune', 'dday']);
    expect(out.map((w) => w.order)).toEqual([0, 1, 2, 3]);
  });

  it('moveTo: 없는 타입은 그대로(정규화만)', () => {
    expect(moveTo(fixture(), 'diary', 0)).toEqual(normalizeWidgets(fixture()));
  });

  it('moveTo: 결정론 + 불변', () => {
    const input = fixture();
    const snapshot = JSON.stringify(input);
    expect(moveTo(fixture(), 'dday', 0)).toEqual(moveTo(fixture(), 'dday', 0));
    moveTo(input, 'dday', 0);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it('moveTo로 옮긴 순서가 홈 렌더(homeWidgetTypes)에 반영', () => {
    const out = moveTo(fixture(), 'dday', 0); // dday를 맨 앞으로
    // memo는 off라 홈 목록에서 제외, 나머지는 새 순서.
    expect(homeWidgetTypes(out)).toEqual(['dday', 'weather', 'fortune']);
  });
});

describe('toggle / setEnabled', () => {
  it('toggle: enabled 반전', () => {
    const out = toggle(fixture(), 'memo');
    expect(out.find((w) => w.type === 'memo')?.enabled).toBe(true);
  });

  it('setEnabled: 명시값 설정', () => {
    const off = setEnabled(fixture(), 'weather', false);
    expect(off.find((w) => w.type === 'weather')?.enabled).toBe(false);
    const on = setEnabled(off, 'weather', true);
    expect(on.find((w) => w.type === 'weather')?.enabled).toBe(true);
  });

  it('toggle은 다른 위젯에 영향 없음', () => {
    const out = toggle(fixture(), 'memo');
    expect(out.find((w) => w.type === 'weather')?.enabled).toBe(true);
    expect(out.find((w) => w.type === 'fortune')?.enabled).toBe(true);
  });
});

describe('setSize (정책 강제)', () => {
  it('허용 크기는 그대로 적용', () => {
    const out = setSize(fixture(), 'dday', 'large');
    expect(out.find((w) => w.type === 'dday')?.size).toBe('large');
  });

  it('날씨에 large 시도 → medium으로 강제', () => {
    const out = setSize(fixture(), 'weather', 'large');
    expect(out.find((w) => w.type === 'weather')?.size).toBe('medium');
  });

  it('운세에 large 시도 → medium으로 강제', () => {
    const out = setSize(fixture(), 'fortune', 'large');
    expect(out.find((w) => w.type === 'fortune')?.size).toBe('medium');
  });
});

describe('homeWidgets / homeWidgetTypes (홈 렌더 단일 소스)', () => {
  it('enabled만, order 순서대로 반환', () => {
    expect(homeWidgetTypes(fixture())).toEqual(['weather', 'fortune', 'dday']); // memo off 제외
  });

  it('order가 뒤섞여도 정렬된 순서로 반영', () => {
    const reordered = moveUp(fixture(), 'dday'); // dday를 fortune 위로
    expect(homeWidgetTypes(reordered)).toEqual(['weather', 'dday', 'fortune']);
  });

  it('토글로 켜면 홈 목록에 등장', () => {
    const withMemo = toggle(fixture(), 'memo');
    expect(homeWidgetTypes(withMemo)).toEqual(['weather', 'fortune', 'dday', 'memo']);
  });

  it('전부 끄면 빈 목록', () => {
    let cfgs = fixture();
    for (const t of ['weather', 'fortune', 'dday', 'memo'] as const) {
      cfgs = setEnabled(cfgs, t, false);
    }
    expect(homeWidgets(cfgs)).toEqual([]);
  });

  it('홈 목록은 크기 정책이 보정된 채로 나온다', () => {
    const bad: WidgetConfig[] = [
      { type: 'weather', enabled: true, size: 'large', order: 0 },
    ];
    expect(homeWidgets(bad)[0].size).toBe('medium');
  });
});
