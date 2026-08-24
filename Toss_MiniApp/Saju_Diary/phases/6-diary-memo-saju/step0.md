# Step 0: completed-todo-logic (순수 로직 + 타입)

이 step은 **순수 함수·타입만** 다룬다. UI(MemoWidget/DiaryScreen)는 다음 step에서 손대므로 **건드리지 마라**. 빌드는 이 step만으로 green이어야 한다(기존 UI 호출부가 깨지지 않게 시그니처를 하위호환으로 설계).

## 읽어야 할 파일

먼저 아래를 읽고 설계 의도를 파악하라:

- `CLAUDE.md` (CRITICAL 규칙 — 특히 #1 로컬 저장 전용·외부 전송 금지, #5 스택 고정, #7 컨텍스트 예산)
- `docs/ARCHITECTURE.md` §4(데이터 모델)
- `src/types/index.ts` (Memo, Diary, FortuneResult, FortuneBasis, DateString)
- `src/widgets/memo-ops.ts` (+ `src/widgets/memo-ops.test.ts`)
- `src/screens/diary/diary-ops.ts` (+ `src/screens/diary/diary-ops.test.ts`)
- `src/widgets/fortune-today.ts` 의 `buildBasisLine(basis: FortuneBasis): string` (export됨, line ~204) — 재사용 대상

## 배경 (왜)

사용자 요청: "일기에 사주, 메모에서 오늘 완료한 일들 넣게하자. 메모는 완료하게 되면 오늘날짜를 디폴트로 두고, 이전에 완료했으면 날짜 선택해서 일기에 넣어둘 수 있게."

해석 → 두 가지:
1. **완료한 할 일이 일기에 흘러든다.** 메모(할 일)를 완료하면 "완료일(completedDate)"이 붙고, 그 날짜의 일기 화면에 "그날 완료한 일"로 보인다. 완료일 기본값=오늘, 과거 완료분은 날짜를 골라 재지정 가능. **출처는 메모(memos)** — 일기에 따로 복사 저장하지 않는다(완료일 attribution = "넣어두기"). 라이브 조회.
2. **일기의 사주(운세) 스냅샷에 신강/신약 근거 한 줄 추가.** 이미 일기 헤더에 운세(별점·행운색·일진)가 박제된다. 여기에 `buildBasisLine`로 만든 근거 한 줄("일간 庚金·여름 출생이라 신약 사주…")을 더해 "사주"를 더 분명히 보여준다.

## 작업

### 1) `src/types/index.ts` — Memo에 완료일 추가

`Memo`에 선택 필드 추가(하위호환 — 기존 데이터/migration 불필요):

```ts
export interface Memo {
  id: string;
  date: DateString;        // 던진 날(생성일) — 기존 의미 유지
  text: string;
  checked: boolean;
  isTodo: boolean;
  /** 할 일 완료일 `YYYY-MM-DD`. 완료(checked=true) 시 부여, 해제 시 제거.
   *  이 날짜의 일기에 "그날 완료한 일"로 노출된다(기본=완료한 날, 과거분은 재지정 가능). */
  completedDate?: DateString;
}
```

### 2) `src/widgets/memo-ops.ts` — 완료일 로직 (순수)

- **`toggleMemo` 시그니처 확장(하위호환):**
  ```ts
  export interface ToggleMemoOptions {
    /** 완료(false→true)로 바뀔 때 부여할 완료일. 보통 오늘. 미지정 시 completedDate를 건드리지 않음(하위호환). */
    completedDate?: DateString;
  }
  export function toggleMemo(memos: Memo[], id: string, opts?: ToggleMemoOptions): Memo[];
  ```
  규칙:
  - 대상이 `isTodo`인 메모만 변경(기존 규칙 유지).
  - `checked` false→true 전환 시: `opts.completedDate`가 있으면 `completedDate`에 그 값 설정. 없으면 completedDate를 변경하지 않음(기존 호출부 `toggleMemo(memos, id)` 무손상).
  - `checked` true→false 전환 시: `completedDate` **제거**(필드 삭제, undefined 아님 — 객체에서 키 없애기).
  - 불변(입력 배열·객체 미변경, 새 배열/객체 반환).

- **새 함수 `setMemoCompletedDate`** — 이미 완료된 할 일의 완료일을 다른 날짜로 재지정(날짜 선택 UI용):
  ```ts
  /** id 메모의 completedDate를 date로 바꾼다.
   *  대상이 isTodo이고 checked=true일 때만 적용(완료된 할 일만 재지정 가능).
   *  조건 불충족이거나 id 없음 → 동일 내용 새 배열 반환. 불변. */
  export function setMemoCompletedDate(memos: Memo[], id: string, date: DateString): Memo[];
  ```

- **새 함수 `completedTodosForDate`** — 그날 일기에 보일 "완료한 할 일" 조회:
  ```ts
  /** completedDate === date 이고 isTodo && checked 인 메모만(순서 보존).
   *  일기 화면이 그날 완료한 일을 라이브로 보여주는 데 쓴다. */
  export function completedTodosForDate(memos: Memo[], date: DateString): Memo[];
  ```

기존 `addMemo`/`removeMemo`/`memosForDate`는 그대로 둔다.

### 3) `src/screens/diary/diary-ops.ts` — 운세 스냅샷에 근거 한 줄

- `FortuneSnapshot`에 선택 필드 추가:
  ```ts
  export interface FortuneSnapshot {
    overall: number;
    luckyColor: LuckyColor;
    luckyDirection: Direction;
    iljin: string;
    advice: string;
    /** 신강/신약 근거 한 줄(있으면). "왜 이 운세인지" — 일기에 사주를 분명히. */
    basisLine?: string;
  }
  ```
- `buildFortuneSnapshot(result)`가 `result.basis`로 `buildBasisLine`을 호출해 `basisLine`을 채운다(빈 문자열이면 필드 생략). `buildBasisLine`은 `src/widgets/fortune-today.ts`에서 import(순수 함수 재사용 — 만세력/엔진 재구현 금지). 결과는 입력과 독립된 새 객체(복사 저장 안전) 유지.

### 4) 테스트 갱신/추가

- `src/widgets/memo-ops.test.ts`: 기존 `toggleMemo(memos, id)` 케이스 유지(completedDate 무손상 확인) + 신규: 완료 시 completedDate 부여(opts), 해제 시 제거, `setMemoCompletedDate`(완료된 todo만 재지정·미완료/일반메모 무변경), `completedTodosForDate`(필터·순서·불변).
- `src/screens/diary/diary-ops.test.ts`: `buildFortuneSnapshot`이 basis로 basisLine을 채우는지(고정 basis fixture로 결정론 검증). 기존 케이스 유지.

## Acceptance Criteria

```bash
npm run build    # tsc 컴파일 에러 0
npm test         # vitest 전부 통과(기존 + 신규)
npm run lint     # eslint 0 경고/에러
```

## 검증 절차

1. 위 AC 3개 실행.
2. 체크리스트:
   - CRITICAL #1: Storage/네트워크 import 없음(이 파일들은 순수 — types/buildBasisLine만 import). 외부 전송 0.
   - CRITICAL #5: 새 라이브러리 0, RN 프리미티브 0.
   - 하위호환: `toggleMemo(memos, id)` 2-인자 호출이 여전히 컴파일·동작(MemoWidget 아직 미수정).
   - 불변성: 모든 변형 함수가 입력 미변경.
3. `phases/6-diary-memo-saju/index.json`의 step 0를 갱신:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약(추가/변경한 export·시그니처 포함)"`
   - 3회 수정 후 실패 → `"status": "error"`, `"error_message"`
   - 외부 개입 필요 → `"status": "blocked"`, `"blocked_reason"` 후 중단

## 금지사항

- `src/widgets/MemoWidget.tsx`·`src/screens/diary/DiaryScreen.tsx`를 수정하지 마라. 이유: UI 배선은 step 1 담당이고, 이 step은 빌드 green을 유지한 채 순수 로직만 바꾼다.
- `toggleMemo`를 2-인자 호출과 비호환으로 만들지 마라. 이유: MemoWidget이 아직 `toggleMemo(memos, id)`로 호출 중 → 빌드가 깨진다.
- 완료한 할 일을 Diary 레코드에 복사 저장하는 필드를 추가하지 마라. 이유: 출처는 memos(라이브 조회) — 중복·불변성 충돌 방지. 일기엔 완료일 attribution으로만 연결한다.
- 새 의존성 추가·대량 파일 탐색 금지(CRITICAL #7 컨텍스트 예산).
- 기존 테스트를 깨뜨리지 마라.
