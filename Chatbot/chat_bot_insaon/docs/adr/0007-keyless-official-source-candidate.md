# ADR-0007: 공식 current corpus는 keyless 공개 본문에서 candidate로 수집한다

## Context

Phase 07은 실제 공식 source snapshot이 필요하지만 국가법령정보 공동활용 Open API의
인증키를 로컬 RAG 실행의 필수조건으로 만들면 포트폴리오 재현성이 낮아진다. 2026-07-29
확인 결과 국가법령정보센터의 법령·행정규칙 공개 본문 endpoint는 인증 없이 조문과
부칙 HTML을 제공했다. 다만 이 HTML은 Open API schema가 아니며 형식 변경과 파싱
예외 위험이 있다.

## Options

1. Open API 인증키가 있을 때만 공식 corpus를 수집한다.
2. 검색 결과나 비공식 mirror를 corpus로 사용한다.
3. exact allowlist의 공식 공개 본문을 keyless current snapshot candidate로 수집하고,
   Open API는 연혁·구조화 보강을 위한 선택 adapter로 둔다.
4. 원문 파일을 저장소에 직접 포함한다.

## Decision

옵션 3을 선택한다.

- `configs/sources/official-mvp.toml`에 exact HTTPS URL·host·content type·크기·timeout·
  retry·expected marker를 source별로 고정한다.
- redirect, proxy 환경, 임의 URL과 credential 직렬화를 허용하지 않는다.
- 원문과 전체 semantic candidate는 비제출 `private/legal/`에 불변 hash version으로
  저장하고 공개에는 source metadata·hash·집계만 남긴다.
- 공개 본문 3종은 current snapshot candidate이며 과거 연혁 전체를 보장하지 않는다.
- HTML parser의 fatal 0이나 자동 구조 품질감사만으로 승인하지 않는다. 조·항·호·목,
  단서, 부칙과 휴직 핵심 조문을 사람이 원문 대조한 뒤에만 검색 version으로 승격한다.
- Open API 인증키는 로컬 LLM·RAG 실행에는 필요하지 않으며, 향후 연혁·변경이력 수집
  adapter를 사용할 때만 secret store로 주입한다.

## Consequences

- API key 없이 공식 원문 3종과 실무자료 메타데이터를 재현 가능하게 수집했다.
- 4,106 provision과 1,510 부칙 node candidate를 만들었고 자동 구조 품질감사
  12/12, parser fatal 0, 활성 `UNPARSED_ARTICLE` warning 0을 확인했다.
- 기존 24개 형식 예외는 공식 HTML에 명시된 삭제 조문과 정확히 일치해
  `DELETED_ARTICLE_TOMBSTONE` 정보 항목으로 분리했다.
- HTML 구조 변경과 현재본 중심 수집이라는 한계가 남는다.
- 사람 승인자가 없어 candidate는 `hold`이며 versioned legal index와 독립 법령 평가는
  시작하지 않는다.
- Open API가 제공하는 연혁·조문 변경이력과 현재 HTML candidate의 정합성은 후속
  승인 단계에서 별도 검증해야 한다.

## Revisit

- 공식 Open API 접근권한과 이용조건 검토가 완료될 때
- HTML 구조 변경으로 parser warning 또는 fatal이 증가할 때
- 과거 기준일 locked set에 필요한 연혁 snapshot을 확보할 때
- 사람 승인 결과가 current parser 계층이나 source 범위 변경을 요구할 때
