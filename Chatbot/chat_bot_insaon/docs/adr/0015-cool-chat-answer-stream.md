# ADR-0015: cool-white 단일 blue와 열린 답변 흐름을 production UI로 사용한다

- 상태: Accepted
- 날짜: 2026-08-04
- 관계: ADR-0011의 production 색상·surface 결정을 대체하고, ADR-0014의 채팅 중심 정보구조를 구체화한다
- 조건 표시: ADR-0016의 승인 profile·명시값 우선·세션 비저장 계약을 따른다

## Context

ADR-0011에서 선택한 B Case Workbench는 미색·차콜·포레스트와 soft rounded panel을
production에 적용했다. ADR-0014는 여기서 운영 정보와 품질 탭을 제거하고 채팅·근거 중심의
사용자 흐름과 화면 안 원문 미리보기를 선택했다. 이후에도 assistant 답변이 panel이나 card로
읽히고, 가정·근거·유의사항이 여러 블록으로 분산돼 질문에 대한 결론을 따라가기 어려운
문제가 남았다.

포트폴리오 소유자는 대시보드보다 일반적인 챗봇에 가까운 읽기 흐름, 차가운 흰색 계열의
화면, graphite 본문과 절제된 단일 blue accent를 production 방향으로 지정했다. 이 결정은
법령 검색·조건·상태·인용 API 계약을 바꾸지 않고 화면의 표현 순서와 surface 사용만 바꾼다.

## Options

1. ADR-0011의 warm bone·forest Case Workbench surface를 유지한다.
2. 색상만 blue로 바꾸고 기존 assistant card와 분절된 답변 블록을 유지한다.
3. cool-white·graphite·단일 blue 시각 체계와 카드 없는 chat-first answer stream을 함께 적용한다.

## Decision

옵션 3을 선택한다.

- canvas와 surface는 cool-white 계열, 본문은 graphite 계열, 표현 accent는 blue 한 계열로
  제한한다. 경고·오류의 semantic 색은 장식 accent로 사용하지 않는다.
- 첫 질문 전에는 조건·시점·근거 설명표와 큰 예시 행을 두지 않는다. 한 문장 안내, 질문
  입력과 compact 예시 질문만 남겨 첫 행동을 하나로 만든다.
- 브랜드 보조 문구와 첫 화면은 ADR-0017의 공개 범위인 지방공무원 휴직·복직을 정확히
  나타낸다. 비활성 넓은 인사 주제와 수당 산정을 지원 예시처럼 노출하지 않는다.
- 범위 밖 질문은 근거 rail이나 후속 조건을 만들지 않고 지원 범위를 짧게 안내한다.
- assistant 답변은 card 배경이나 독립 shadow 없이 최대 720px의 열린 본문으로 표시한다.
- 핵심 조건이 누락되면 긴 설명이나 여러 panel 대신 compact chip으로 후속 입력을 돕는다.
- 정상 답변은 `결론 → 가정 한 줄 → 근거 요약 → 관련 근거 링크` 순서로 고정한다.
- 공통 렌더러는 API의 승인된 `assumed_conditions`만 한 줄에 표시하고 실제
  `missing_conditions`만 질문 chip으로 만든다. 비활성 정근수당 연구 profile은
  공개 화면에서 렌더하지 않는다. 실제 적용된 필드가 속한
  묶음만 보여주고 질문에서 확인한 사실과 섞지 않으며, 명시값은 가정이 아니라 결론·
  유의사항 흐름에 반영한다. 미등록 유형에는 정상 가정 문구를 만들지 않는다.
- 관련 근거 링크는 보조 근거 영역으로 이동시키고, 조문 발췌·출처·시행일을 보여주는
  ADR-0014의 화면 안 dialog와 외부 공식 원문 보조 링크는 유지한다.
- LINE Seed Sans KR 자체 호스팅, CSP, 키보드 focus, 반응형 1열 재배치와 구조화 API 계약은
  그대로 유지한다.

ADR-0011의 방향 탐색과 포트폴리오 소유자의 당시 B 선택은 역사적 설계 기록으로 유지한다.
다만 그 ADR의 미색·차콜·포레스트 production token과 panel 중심 surface는 이 ADR이
대체한다. ADR-0014의 사용자 언어·운영 정보 제거·원문 dialog 결정은 계속 유효하다.

## Consequences

- 첫 답변에서 결론과 근거 링크 사이의 읽기 순서가 하나의 대화 본문으로 고정된다.
- 내부 모델 상태와 운영 품질 집계는 계속 API·artifact에 남지만 기본 사용자 화면에는
  노출하지 않는다.
- 법령 근거의 상세 문맥과 유의사항은 보조 영역과 dialog에 남으므로 답변 본문만으로 최종
  인사판단을 확정할 수 없다.
- 이 변경의 반응형·CSP·상호작용 계약은 자동 검사할 수 있지만, 실제 과업 완료율·선호·
  법령 이해도 개선은 측정하지 않았다.

## Revisit

- 실제 인사담당자 사용성 세션에서 근거 발견 단계나 후속 질문 완료가 지연될 때
- 720px 본문 너비가 확대 글자·긴 한국어 답변에서 읽기 문제를 만들 때
- compact chip이 필요한 조건의 의미를 충분히 전달하지 못할 때
- 경고·오류 semantic 색과 blue accent가 상태 구분을 흐릴 때
