// memo-ops 단위 테스트 — 순수 변형(추가/체크 토글/삭제/날짜 필터) + 불변성 검증.
//
// 비결정 요소(id·date)는 주입하므로 테스트는 결정론적이다.
// UI(MemoWidget)는 빌드 통과로 검증한다. 여기서는 순수 로직만 본다.

import { describe, it, expect } from 'vitest';
import {
  addMemo,
  toggleMemo,
  editMemo,
  removeMemo,
  memosForDate,
  activeMemosForDate,
  homeMemoItems,
  setMemoCompletedDate,
  setMemoColor,
  completedTodosForDate,
} from './memo-ops';
import type { Memo } from '../types';

function memo(over: Partial<Memo> = {}): Memo {
  const base: Memo = {
    id: over.id ?? 'm1',
    date: over.date ?? '2026-06-14',
    text: over.text ?? '메모',
    checked: over.checked ?? false,
    isTodo: over.isTodo ?? false,
  };
  if (over.completedDate !== undefined) {
    base.completedDate = over.completedDate;
  }
  if (over.color !== undefined) {
    base.color = over.color;
  }
  return base;
}

describe('메모 꾸미기 색(addMemo color · setMemoColor)', () => {
  it('addMemo: color를 주면 저장하고, none/미지정이면 color 키가 없다', () => {
    const withColor = addMemo([], { id: 'a', date: '2026-06-14', text: '메모', color: 'rose' });
    expect(withColor[0].color).toBe('rose');
    const none = addMemo([], { id: 'b', date: '2026-06-14', text: '메모', color: 'none' });
    expect('color' in none[0]).toBe(false);
    const omitted = addMemo([], { id: 'c', date: '2026-06-14', text: '메모' });
    expect('color' in omitted[0]).toBe(false);
  });

  it('setMemoColor: 색을 바꾸고, none이면 색 키를 제거한다(불변)', () => {
    const prev: Memo[] = [memo({ id: 'm1', color: 'honey' })];
    const recolored = setMemoColor(prev, 'm1', 'sage');
    expect(recolored[0].color).toBe('sage');
    expect(prev[0].color).toBe('honey'); // 원본 불변
    const cleared = setMemoColor(recolored, 'm1', 'none');
    expect('color' in cleared[0]).toBe(false);
  });
});

describe('addMemo — 새 메모는 맨 위에', () => {
  it('빈 목록에 추가 → 길이 1', () => {
    const next = addMemo([], { id: 'a', date: '2026-06-14', text: '우유 사기' });
    expect(next).toHaveLength(1);
    expect(next[0]).toEqual({
      id: 'a',
      date: '2026-06-14',
      text: '우유 사기',
      checked: false,
      isTodo: false,
    });
  });

  it('기존 목록 맨 앞에 쌓인다(최신 우선)', () => {
    const prev = [memo({ id: 'old', text: '예전' })];
    const next = addMemo(prev, { id: 'new', date: '2026-06-14', text: '방금' });
    expect(next.map((m) => m.id)).toEqual(['new', 'old']);
  });

  it('isTodo 주입 시 할 일로 추가, checked는 항상 false 시작', () => {
    const next = addMemo([], { id: 'a', date: '2026-06-14', text: '운동', isTodo: true });
    expect(next[0].isTodo).toBe(true);
    expect(next[0].checked).toBe(false);
  });

  it('text를 trim한다', () => {
    const next = addMemo([], { id: 'a', date: '2026-06-14', text: '  공백  ' });
    expect(next[0].text).toBe('공백');
  });

  it('공백뿐인 text는 추가하지 않는다', () => {
    const next = addMemo([], { id: 'a', date: '2026-06-14', text: '   ' });
    expect(next).toHaveLength(0);
  });

  it('불변성: 입력 배열을 변경하지 않는다', () => {
    const prev = [memo({ id: 'old' })];
    const snapshot = JSON.parse(JSON.stringify(prev));
    addMemo(prev, { id: 'new', date: '2026-06-14', text: '추가' });
    expect(prev).toEqual(snapshot);
    expect(prev).toHaveLength(1);
  });
});

describe('toggleMemo — checked 반전(할 일만)', () => {
  it('할 일의 checked를 false→true로 반전', () => {
    const prev = [memo({ id: 'a', isTodo: true, checked: false })];
    const next = toggleMemo(prev, 'a');
    expect(next[0].checked).toBe(true);
  });

  it('할 일의 checked를 true→false로 반전', () => {
    const prev = [memo({ id: 'a', isTodo: true, checked: true })];
    const next = toggleMemo(prev, 'a');
    expect(next[0].checked).toBe(false);
  });

  it('일반 메모(isTodo=false)도 완료 토글된다(사용자 요청 — 메모 완료)', () => {
    const prev = [memo({ id: 'a', isTodo: false, checked: false })];
    const next = toggleMemo(prev, 'a');
    expect(next[0].checked).toBe(true);
  });

  it('대상 외 항목은 그대로 둔다', () => {
    const prev = [
      memo({ id: 'a', isTodo: true, checked: false }),
      memo({ id: 'b', isTodo: true, checked: false }),
    ];
    const next = toggleMemo(prev, 'a');
    expect(next[0].checked).toBe(true);
    expect(next[1].checked).toBe(false);
  });

  it('없는 id면 내용 변화 없음', () => {
    const prev = [memo({ id: 'a', isTodo: true })];
    const next = toggleMemo(prev, 'zzz');
    expect(next).toEqual(prev);
  });

  it('불변성: 입력 배열·항목을 변경하지 않는다', () => {
    const prev = [memo({ id: 'a', isTodo: true, checked: false })];
    const snapshot = JSON.parse(JSON.stringify(prev));
    toggleMemo(prev, 'a');
    expect(prev).toEqual(snapshot);
  });

  // ── 완료일(completedDate) 동작 ──────────────────────────────

  it('2-인자 호출(하위호환): completedDate를 건드리지 않는다', () => {
    const prev = [memo({ id: 'a', isTodo: true, checked: false })];
    const next = toggleMemo(prev, 'a');
    expect(next[0].checked).toBe(true);
    expect('completedDate' in next[0]).toBe(false);
  });

  it('완료(false→true) + opts.completedDate → 완료일 부여', () => {
    const prev = [memo({ id: 'a', isTodo: true, checked: false })];
    const next = toggleMemo(prev, 'a', { completedDate: '2026-06-15' });
    expect(next[0].checked).toBe(true);
    expect(next[0].completedDate).toBe('2026-06-15');
  });

  it('완료 해제(true→false)는 completedDate 키를 제거한다', () => {
    const prev = [memo({ id: 'a', isTodo: true, checked: true, completedDate: '2026-06-15' })];
    const next = toggleMemo(prev, 'a');
    expect(next[0].checked).toBe(false);
    expect('completedDate' in next[0]).toBe(false);
  });

  it('완료 해제 시 opts가 있어도 completedDate를 남기지 않는다', () => {
    const prev = [memo({ id: 'a', isTodo: true, checked: true, completedDate: '2026-06-15' })];
    const next = toggleMemo(prev, 'a', { completedDate: '2026-06-20' });
    expect(next[0].checked).toBe(false);
    expect('completedDate' in next[0]).toBe(false);
  });

  it('불변성: 완료 해제가 입력 객체의 completedDate를 지우지 않는다', () => {
    const prev = [memo({ id: 'a', isTodo: true, checked: true, completedDate: '2026-06-15' })];
    const snapshot = JSON.parse(JSON.stringify(prev));
    toggleMemo(prev, 'a');
    expect(prev).toEqual(snapshot);
    expect(prev[0].completedDate).toBe('2026-06-15');
  });
});

describe('setMemoCompletedDate — 완료된 할 일의 완료일 재지정', () => {
  it('완료된 todo의 completedDate를 다른 날짜로 바꾼다', () => {
    const prev = [memo({ id: 'a', isTodo: true, checked: true, completedDate: '2026-06-15' })];
    const next = setMemoCompletedDate(prev, 'a', '2026-06-10');
    expect(next[0].completedDate).toBe('2026-06-10');
  });

  it('미완료(checked=false) todo는 재지정하지 않는다', () => {
    const prev = [memo({ id: 'a', isTodo: true, checked: false })];
    const next = setMemoCompletedDate(prev, 'a', '2026-06-10');
    expect('completedDate' in next[0]).toBe(false);
  });

  it('완료된 일반 메모(isTodo=false)도 완료일을 재지정한다(사용자 요청)', () => {
    const prev = [memo({ id: 'a', isTodo: false, checked: true })];
    const next = setMemoCompletedDate(prev, 'a', '2026-06-10');
    expect(next[0].completedDate).toBe('2026-06-10');
  });

  it('없는 id면 내용 변화 없음', () => {
    const prev = [memo({ id: 'a', isTodo: true, checked: true, completedDate: '2026-06-15' })];
    const next = setMemoCompletedDate(prev, 'zzz', '2026-06-10');
    expect(next).toEqual(prev);
  });

  it('불변성: 입력 배열·항목을 변경하지 않는다', () => {
    const prev = [memo({ id: 'a', isTodo: true, checked: true, completedDate: '2026-06-15' })];
    const snapshot = JSON.parse(JSON.stringify(prev));
    setMemoCompletedDate(prev, 'a', '2026-06-10');
    expect(prev).toEqual(snapshot);
  });
});

describe('completedTodosForDate — 그날 완료한 일 조회(라이브)', () => {
  it('completedDate가 일치하는 완료된 todo만 골라낸다(순서 보존)', () => {
    const prev = [
      memo({ id: 'a', isTodo: true, checked: true, completedDate: '2026-06-15' }),
      memo({ id: 'b', isTodo: true, checked: true, completedDate: '2026-06-14' }),
      memo({ id: 'c', isTodo: true, checked: true, completedDate: '2026-06-15' }),
    ];
    const next = completedTodosForDate(prev, '2026-06-15');
    expect(next.map((m) => m.id)).toEqual(['a', 'c']);
  });

  it('미완료 todo·일반 메모·다른 날짜는 제외한다', () => {
    const prev = [
      memo({ id: 'done', isTodo: true, checked: true, completedDate: '2026-06-15' }),
      memo({ id: 'undone', isTodo: true, checked: false }),
      memo({ id: 'plain', isTodo: false, checked: false, completedDate: '2026-06-15' }),
      memo({ id: 'other', isTodo: true, checked: true, completedDate: '2026-06-14' }),
    ];
    const next = completedTodosForDate(prev, '2026-06-15');
    expect(next.map((m) => m.id)).toEqual(['done']);
  });

  it('일치 없으면 빈 배열', () => {
    const prev = [memo({ id: 'a', isTodo: true, checked: true, completedDate: '2026-06-15' })];
    expect(completedTodosForDate(prev, '2026-06-01')).toEqual([]);
  });

  it('불변성: 입력 배열을 변경하지 않는다', () => {
    const prev = [memo({ id: 'a', isTodo: true, checked: true, completedDate: '2026-06-15' })];
    const snapshot = JSON.parse(JSON.stringify(prev));
    completedTodosForDate(prev, '2026-06-15');
    expect(prev).toEqual(snapshot);
  });
});

describe('editMemo — 본문 교체(인라인 수정)', () => {
  it('해당 id의 text를 교체한다', () => {
    const prev = [memo({ id: 'a', text: '예전' }), memo({ id: 'b', text: '그대로' })];
    const next = editMemo(prev, 'a', '바뀐 내용');
    expect(next[0].text).toBe('바뀐 내용');
    expect(next[1].text).toBe('그대로');
  });

  it('text를 trim한다', () => {
    const prev = [memo({ id: 'a', text: '예전' })];
    const next = editMemo(prev, 'a', '  공백  ');
    expect(next[0].text).toBe('공백');
  });

  it('빈(공백뿐) text는 무시하고 원본 본문을 유지한다', () => {
    const prev = [memo({ id: 'a', text: '예전' })];
    const next = editMemo(prev, 'a', '   ');
    expect(next[0].text).toBe('예전');
  });

  it('checked/isTodo/completedDate 등 다른 필드는 보존한다', () => {
    const prev = [memo({ id: 'a', text: '예전', isTodo: true, checked: true, completedDate: '2026-06-15' })];
    const next = editMemo(prev, 'a', '새 본문');
    expect(next[0]).toMatchObject({
      id: 'a',
      text: '새 본문',
      isTodo: true,
      checked: true,
      completedDate: '2026-06-15',
    });
  });

  it('없는 id면 내용 변화 없음', () => {
    const prev = [memo({ id: 'a', text: '예전' })];
    const next = editMemo(prev, 'zzz', '새 본문');
    expect(next).toEqual(prev);
  });

  it('불변성: 입력 배열·항목을 변경하지 않는다', () => {
    const prev = [memo({ id: 'a', text: '예전' })];
    const snapshot = JSON.parse(JSON.stringify(prev));
    editMemo(prev, 'a', '새 본문');
    expect(prev).toEqual(snapshot);
  });
});

describe('activeMemosForDate — 그날 미완료 메모만(완료는 목록서 숨김)', () => {
  it('그날 메모 중 checked!==true 만 골라낸다(순서 보존)', () => {
    const prev = [
      memo({ id: 'a', date: '2026-06-15', isTodo: true, checked: false }),
      memo({ id: 'b', date: '2026-06-15', isTodo: true, checked: true, completedDate: '2026-06-15' }),
      memo({ id: 'c', date: '2026-06-15', isTodo: true, checked: false }),
    ];
    const next = activeMemosForDate(prev, '2026-06-15');
    expect(next.map((m) => m.id)).toEqual(['a', 'c']);
  });

  it('완료된 메모는 제외하지만 저장(배열)에는 그대로 남는다(removeMemo와 구분)', () => {
    const prev = [
      memo({ id: 'done', date: '2026-06-15', isTodo: true, checked: true, completedDate: '2026-06-15' }),
    ];
    expect(activeMemosForDate(prev, '2026-06-15')).toEqual([]);
    // 완료분은 completedTodosForDate로 여전히 조회 가능(캘린더 자료).
    expect(completedTodosForDate(prev, '2026-06-15').map((m) => m.id)).toEqual(['done']);
  });

  it('다른 날짜 메모는 제외한다', () => {
    const prev = [
      memo({ id: 'a', date: '2026-06-15', checked: false }),
      memo({ id: 'b', date: '2026-06-14', checked: false }),
    ];
    expect(activeMemosForDate(prev, '2026-06-15').map((m) => m.id)).toEqual(['a']);
  });

  it('일반 메모(isTodo=false, checked=false)는 활성으로 포함', () => {
    const prev = [memo({ id: 'a', date: '2026-06-15', isTodo: false, checked: false })];
    expect(activeMemosForDate(prev, '2026-06-15').map((m) => m.id)).toEqual(['a']);
  });

  it('일치 없으면 빈 배열', () => {
    const prev = [memo({ id: 'a', date: '2026-06-15', checked: true })];
    expect(activeMemosForDate(prev, '2026-06-15')).toEqual([]);
  });

  it('불변성: 입력 배열을 변경하지 않는다', () => {
    const prev = [memo({ id: 'a', date: '2026-06-15', checked: false })];
    const snapshot = JSON.parse(JSON.stringify(prev));
    activeMemosForDate(prev, '2026-06-15');
    expect(prev).toEqual(snapshot);
  });
});

describe('removeMemo — id로 삭제', () => {
  it('해당 id 항목을 제거', () => {
    const prev = [memo({ id: 'a' }), memo({ id: 'b' })];
    const next = removeMemo(prev, 'a');
    expect(next.map((m) => m.id)).toEqual(['b']);
  });

  it('없는 id면 길이 유지', () => {
    const prev = [memo({ id: 'a' })];
    const next = removeMemo(prev, 'zzz');
    expect(next).toHaveLength(1);
  });

  it('불변성: 입력 배열을 변경하지 않는다', () => {
    const prev = [memo({ id: 'a' }), memo({ id: 'b' })];
    const snapshot = JSON.parse(JSON.stringify(prev));
    removeMemo(prev, 'a');
    expect(prev).toEqual(snapshot);
    expect(prev).toHaveLength(2);
  });
});

describe('homeMemoItems — 홈 메모/할 일(미래 할 일 포함)', () => {
  it('오늘 메모 + 미래 날짜 할 일을 모두 포함하고, 미래 일반 메모는 제외한다', () => {
    const prev = [
      memo({ id: 'a', date: '2026-06-27', text: '우유', isTodo: false }), // 오늘 메모 ✓
      memo({ id: 'b', date: '2026-06-29', text: '시험', isTodo: true }), // 뒷날 할 일 ✓
      memo({ id: 'c', date: '2026-06-27', text: '운동', isTodo: true }), // 오늘 할 일 ✓
      memo({ id: 'd', date: '2026-07-02', text: '여행 메모', isTodo: false }), // 미래 일반 메모 ✗
    ];
    const ids = homeMemoItems(prev, '2026-06-27').map((m) => m.id);
    expect(ids).toEqual(['a', 'c', 'b']); // 날짜 오름차순(같은 날은 원래 순서)
  });

  it('완료(checked)된 항목은 제외한다', () => {
    const prev = [
      memo({ id: 'a', date: '2026-06-29', text: '시험', isTodo: true, checked: true }),
      memo({ id: 'b', date: '2026-07-02', text: '치과', isTodo: true }),
    ];
    expect(homeMemoItems(prev, '2026-06-27').map((m) => m.id)).toEqual(['b']);
  });

  it('불변성: 입력 배열을 변경하지 않는다', () => {
    const prev = [memo({ id: 'a', date: '2026-06-29', isTodo: true })];
    const snapshot = JSON.parse(JSON.stringify(prev));
    homeMemoItems(prev, '2026-06-27');
    expect(prev).toEqual(snapshot);
  });
});

describe('memosForDate — 날짜 필터(날짜 연결)', () => {
  it('해당 날짜 메모만 골라낸다(순서 보존)', () => {
    const prev = [
      memo({ id: 'a', date: '2026-06-14' }),
      memo({ id: 'b', date: '2026-06-13' }),
      memo({ id: 'c', date: '2026-06-14' }),
    ];
    const next = memosForDate(prev, '2026-06-14');
    expect(next.map((m) => m.id)).toEqual(['a', 'c']);
  });

  it('일치 없으면 빈 배열', () => {
    const prev = [memo({ id: 'a', date: '2026-06-14' })];
    expect(memosForDate(prev, '2026-06-15')).toEqual([]);
  });

  it('불변성: 입력 배열을 변경하지 않는다', () => {
    const prev = [memo({ id: 'a', date: '2026-06-14' })];
    const snapshot = JSON.parse(JSON.stringify(prev));
    memosForDate(prev, '2026-06-14');
    expect(prev).toEqual(snapshot);
  });
});
