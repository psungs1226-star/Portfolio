# ADR-0011: Case Workbench를 챗봇의 production 시각 시스템으로 선택한다

## Context

기존 production 화면은 채팅·조건·근거·품질을 연결했지만 연보라 accent와 작은
metadata, 단단한 사각형이 범용 SaaS dashboard에 가깝게 보였다. design-agent 절차로
A Evidence Ledger, B Case Workbench, C Regulation Map을 분리 제작하고 1440×1100·
390×844에서 렌더 검수했다.

포트폴리오 소유자는 챗봇 과업을 중심에 둔 B를 선택하면서 형태를 더 둥글게, 기존
미색·차콜·포레스트 톤은 유지하고, 한글을 조금 더 둥글고 굵게 보이도록 요청했다.

## Options

1. 현행 production의 연보라 Front Inbox 계열을 유지한다.
2. A Evidence Ledger의 고밀도 조문 원장을 production 기본 화면으로 쓴다.
3. B Case Workbench의 사례 대화·검토 노트 구조를 soft rounded system으로 통합한다.
4. C Regulation Map의 시간축·법령 지도를 production 기본 화면으로 쓴다.

## Decision

옵션 3을 선택한다.

- 질문·답변·조건·근거·사람 검토를 한 사례 흐름에 둔 B의 task topology를 유지한다.
- canvas `#efede6`, paper `#fbfaf5`, charcoal `#202522`, forest `#184f3a`를 주 역할로 쓴다.
- panel 22~26px, row·input 16px, 반복 action은 pill인 일관된 radius 체계를 쓴다.
- LINE Seed Sans KR Regular·Bold를 official package에서 자체 호스팅하고
  `font-synthesis: none`으로 가짜 굵기를 막는다.
- 고빈도 작업에는 위치 animation을 넣지 않고 focus·press·짧은 상태 feedback만 둔다.
- status 색은 label·shape와 함께 사용하고 장식 accent로 재사용하지 않는다.
- launcher, planning report와 portfolio case study도 같은 palette·type family를 공유한다.

## Consequences

- 챗봇 과업이 첫 시선에 남으면서 기존 화면보다 친근하고 포트폴리오 고유성이 높아진다.
- 둥근 component가 많아도 원장·근거 정보는 shared baseline과 border로 스캔 구조를 유지한다.
- LINE Seed Sans KR woff2 두 파일을 공개 artifact에 포함하고 source·license attribution을
  함께 보존해야 한다.
- 사람이 B를 선택했지만 실제 A/B task completion, 시간과 선호는 아직 미측정이다.
- 과도한 둥근 형태가 공공 casework의 단정함을 약화하는지는 사람 사용성 검증에서 본다.

## Revisit

- 실제 인사담당자 A/B 세션이 생길 때
- 긴 조문·확대 text-spacing에서 밀도 또는 clipping 문제가 생길 때
- 서체 라이선스나 official distribution package가 바뀔 때
