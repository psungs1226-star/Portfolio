# CLAUDE.md

이 프로젝트의 작업 규칙은 `@AGENTS.md`에 있다. 그대로 따른다.

## 핵심 리마인더

- `logs/` 아래 파일은 열람·출력·요약·발췌·편집·삭제하지 않는다.
- 긴 원문·JSONL·HTML·PDF·diff·빌드/테스트 전체 로그를 대화에 붙이지 않는다. 필요한 키워드만 좁게 확인한다.
- `answer.md`는 문항별 append 전용 메모장이다. 관련 문항 아래 짧은 bullet만 추가하고, 기존 bullet은 사용자가 명시적으로 요청할 때만 고친다.
- `.env` 비밀값은 출력하지 않는다.
- "완료" 대신 `partial_hold`, `completed_with_hold_flags`, `completed_with_source_check`처럼 상태를 명확히 표기한다.
- HTML 산출물을 만들 때는 참조한 해석례·예규·집행기준 Q&A를 문서번호만 적지 말고, 요지(핵심 결론: 면세/과세)와 근거를 인라인으로 한 줄씩 요약해 둔다. 사용자가 원문을 직접 찾아보지 않고도 HTML만 보고 확인할 수 있어야 한다. 사용자 편의를 항상 우선한다.

## 모델 역할 (메인 · 검수자)

- 메인 모델(작업 수행): **Claude Opus**.
- 검수자 모델(리뷰·적대검증): **Claude Sonnet**.
- 이 역할로 진행하는 것이 기본값이다. **실제 사용 모델이 위와 달라지면 `README.md`에 그 변경(모델명·시점·역할)을 반드시 별도로 기록한다.** 문서와 실제가 어긋난 채로 두지 않는다.

## 현재 작업 맥락

- 최신 파이프라인 상태·다음 작업은 `answer.md` 하단 최근 bullet과 `pipeline/07-scope-expansion/` 산출물 기준. `HANDOFF_CLAUDE.md`는 Phase 1 시점의 historical 문서(프로젝트 목적·API 액션 메모는 유효, 상태 정보는 stale).
- 스킬 본문: `src/skills/tax-enforcement-standard-impact/SKILL.md` (Phase 0~6 파이프라인).
