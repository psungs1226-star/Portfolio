/**
 * memo-ops — 메모 목록 변형(순수 함수).
 *
 * 핵심 규칙(step1): id·날짜 등 비결정 요소는 *주입*해 테스트를 결정론적으로 만든다.
 * 모든 함수는 입력 배열을 변경하지 않고(불변) 새 Memo[]를 반환한다.
 *
 * 정렬 규칙: 새로 던진 메모는 *맨 위*에 쌓인다(최신 우선 = 수시 던지기 UX).
 *   - addMemo는 새 항목을 배열 맨 앞에 붙인다(unshift 아님, [new, ...prev]).
 *
 * 런타임 0 의존(순수). UI(MemoWidget)에서 import해 상태 변형에만 쓴다.
 * 저장은 storage 접근자가 담당(이 모듈은 Storage를 모른다 — CRITICAL #1 경계 유지).
 */
import type { Memo, MemoColor, DateString } from '../types';

/** addMemo에 주입하는 새 메모의 비결정/외부 입력값. */
export interface NewMemoInput {
  /** 고유 id(호출부 주입 — 테스트 결정론). */
  id: string;
  /** 기록 날짜 `YYYY-MM-DD`(호출부 주입 — 보통 오늘). */
  date: DateString;
  /** 본문. */
  text: string;
  /** 할 일 여부(체크 가능). 기본 false(일반 메모). */
  isTodo?: boolean;
  /** 꾸미기 색(선택). 'none'/미지정이면 색 미설정. */
  color?: MemoColor;
}

/**
 * 새 메모를 목록 맨 위에 추가한다.
 * text가 공백뿐이면 원본을 그대로 반환한다(빈 메모 방지).
 * 새 항목의 checked는 항상 false로 시작한다.
 */
export function addMemo(memos: Memo[], input: NewMemoInput): Memo[] {
  const text = input.text.trim();
  if (text === '') {
    return memos.slice();
  }
  const memo: Memo = {
    id: input.id,
    date: input.date,
    text,
    checked: false,
    isTodo: input.isTodo ?? false,
  };
  if (input.color != null && input.color !== 'none') {
    memo.color = input.color;
  }
  return [memo, ...memos];
}

/**
 * id에 해당하는 메모의 꾸미기 색을 바꾼다(불변). 'none'이면 색 키를 제거한다.
 * 해당 id가 없으면 원본과 동일 내용의 새 배열을 반환한다.
 */
export function setMemoColor(memos: Memo[], id: string, color: MemoColor): Memo[] {
  return memos.map((m) => {
    if (m.id !== id) {
      return m;
    }
    if (color === 'none') {
      const { color: _omit, ...rest } = m;
      return rest;
    }
    return { ...m, color };
  });
}

/** toggleMemo 확장 옵션(하위호환 — 미지정 시 기존 2-인자 동작 유지). */
export interface ToggleMemoOptions {
  /** 완료(false→true)로 바뀔 때 부여할 완료일. 보통 오늘. 미지정 시 completedDate를 건드리지 않음(하위호환). */
  completedDate?: DateString;
}

/**
 * id에 해당하는 메모의 checked를 반전한다.
 * isTodo가 아닌 일반 메모는 체크 개념이 없으므로 변경하지 않는다(텍스트만).
 * 해당 id가 없으면 원본과 동일 내용의 새 배열을 반환한다.
 *
 * 완료일(completedDate) 규칙:
 *  - false→true 전환 시: opts.completedDate가 있으면 그 값을 부여. 없으면 completedDate를 건드리지 않음(2-인자 호출 무손상).
 *  - true→false 전환 시: completedDate를 제거(객체에서 키 삭제 — undefined가 아니라 키 없음).
 *  - 불변(입력 배열·객체 미변경, 새 배열/객체 반환).
 */
export function toggleMemo(memos: Memo[], id: string, opts?: ToggleMemoOptions): Memo[] {
  return memos.map((m) => {
    // 메모·할 일 모두 완료 토글 가능(사용자 요청 — 메모에도 완료 체크).
    if (m.id !== id) {
      return m;
    }
    const nextChecked = !m.checked;
    if (nextChecked) {
      // false → true (완료)
      if (opts?.completedDate !== undefined) {
        return { ...m, checked: true, completedDate: opts.completedDate };
      }
      return { ...m, checked: true };
    }
    // true → false (완료 해제): completedDate 키 제거
    const { completedDate: _omit, ...rest } = m;
    void _omit;
    return { ...rest, checked: false };
  });
}

/**
 * id 메모의 completedDate를 date로 바꾼다.
 * 완료(checked=true)된 항목이면 메모·할 일 모두 재지정 가능(사용자 요청 — 완료일을 받아 그날 일기에 연동).
 * 조건 불충족이거나 id 없음 → 동일 내용 새 배열 반환. 불변.
 */
export function setMemoCompletedDate(memos: Memo[], id: string, date: DateString): Memo[] {
  return memos.map((m) =>
    m.id === id && m.checked ? { ...m, completedDate: date } : m,
  );
}

/**
 * completedDate === date 이고 checked 인 항목(메모·할 일 모두, 순서 보존).
 * 일기 화면이 그날 완료한 일을 라이브로 보여주는 데 쓴다(메모 완료도 일기 연동, 사용자 요청).
 */
export function completedTodosForDate(memos: Memo[], date: DateString): Memo[] {
  return memos.filter((m) => m.checked && m.completedDate === date);
}

/**
 * id 메모의 본문(text)을 교체한다(인라인 수정 — #3).
 * text는 trim하며, 빈 문자열이면 원본을 유지(메모를 빈 채로 만들지 않음).
 * 없는 id면 동일 내용 새 배열 반환. 불변(입력 배열·객체 미변경).
 */
export function editMemo(memos: Memo[], id: string, text: string): Memo[] {
  const next = text.trim();
  if (next === '') {
    // 빈 입력은 무시 — 원본 본문 유지(불변 규칙은 새 배열 반환).
    return memos.slice();
  }
  return memos.map((m) => (m.id === id ? { ...m, text: next } : m));
}

/** id에 해당하는 메모를 제거한다. 없으면 동일 내용의 새 배열을 반환한다. */
export function removeMemo(memos: Memo[], id: string): Memo[] {
  return memos.filter((m) => m.id !== id);
}

/** 주어진 날짜(`YYYY-MM-DD`)에 기록된 메모만 골라낸다(순서 보존). */
export function memosForDate(memos: Memo[], date: DateString): Memo[] {
  return memos.filter((m) => m.date === date);
}

/**
 * 그날(`YYYY-MM-DD`) 메모 중 *미완료*(checked !== true)만 골라낸다(순서 보존).
 * 완료(checked === true)한 메모는 활성 목록에서 빠진다(#4) — 저장은 유지되며
 * 완료분은 `completedTodosForDate`로 따로 조회(다음 step의 완료 메모 캘린더용).
 * 완료 ≠ 삭제: 완료는 목록서 숨김, 삭제(removeMemo)는 영구 제거 — 둘을 구분한다.
 */
export function activeMemosForDate(memos: Memo[], date: DateString): Memo[] {
  return memos.filter((m) => m.date === date && m.checked !== true);
}

/**
 * 홈탭 '메모/할 일' 섹션 항목(미완료만).
 *  - 일반 메모: 오늘(`today`) 날짜 것만(메모는 그날 기록).
 *  - 할 일(isTodo): **날짜와 무관하게 모두** 표시 — 뒷날로 잡아둔 할 일도 홈에서 보이게(사용자 요청).
 * 정렬: 날짜 오름차순(가까운 할 일이 위로). 같은 날짜는 원래 순서 유지(안정 정렬).
 */
export function homeMemoItems(memos: Memo[], today: DateString): Memo[] {
  const items = memos.filter(
    (m) => m.checked !== true && (m.date === today || m.isTodo === true),
  );
  return items
    .map((m, i) => ({ m, i }))
    .sort((a, b) => a.m.date.localeCompare(b.m.date) || a.i - b.i)
    .map((x) => x.m);
}
