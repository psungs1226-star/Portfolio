# ADR-0008: 제한적 pilot은 단일 VM의 loopback local-model 구성으로 배포한다

## Context

Phase 09 pilot은 실제 직원정보를 받지 않고 공개 법령과 합성 CASE-A/B/C만 처리해야
한다. 생성·임베딩·재랭킹은 외부 추론 API가 아니라 Ollama loopback을 사용하므로
애플리케이션과 모델 runtime의 network boundary, TLS, rollback과 로그 정책을 함께
고정해야 한다. Phase 08 legal release는 아직 없어 실제 배포는 허용되지 않는다.

## Options

1. 브라우저에서 외부 모델 API를 직접 호출한다.
2. serverless API와 별도 외부 GPU endpoint를 사용한다.
3. 단일 Linux VM에서 Caddy, FastAPI와 Ollama를 Docker Compose로 실행하고 Ollama를
   loopback에만 bind한다.
4. 로컬 노트북 시연만 하고 배포 계약을 두지 않는다.

## Decision

옵션 3을 pilot 배포 계약으로 선택한다.

- Caddy가 자동 HTTPS와 공개 ingress를 담당하고 FastAPI만 내부 network로 전달한다.
- Ollama는 `127.0.0.1:11434`에만 bind하고 cloud 기능과 외부 inference egress를
  사용하지 않는다.
- 공개 origin, trusted host와 incident contact는 배포 시 host environment에서
  주입한다. 저장소·이미지·클라이언트 bundle에는 secret이나 운영 주소를 넣지 않는다.
- production 시작은 `legal_validation_candidate`, 사람 승인 기록, 승인 index
  manifest와 치명적 오류 0을 모두 요구한다.
- 질문·모델 원문은 로그에 남기지 않고 비식별 event는 14일 뒤 삭제한다.
- 이전 container image와 승인 index manifest를 한 쌍으로 보존해 rollback한다.
- 실제 URL, 배포 성공, latency와 사용성 결과는 smoke artifact가 생긴 뒤에만 공개한다.

## Consequences

- 로컬 모델과 API key 불필요 원칙을 pilot에서도 유지할 수 있다.
- 모델과 API가 같은 VM에 있어 구성은 단순하지만 단일 장애 지점과 제한된 처리량이
  남는다.
- 배포 계약 validator와 production settings gate는 구현할 수 있지만 Phase 08 legal
  release, VM·domain과 실제 secret injection 없이는 배포 완료로 표시하지 않는다.

## Revisit

- 독립 법령 평가에서 공개 범위가 결정될 때
- 동시성·latency 측정이 단일 VM 한계를 넘을 때
- 기관 환경이 별도 network zone이나 managed secret store를 요구할 때
- 실제 개인정보 처리 범위를 검토하게 될 때

