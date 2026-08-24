# ADR-0006: 포트폴리오 RAG는 로컬 모델로 실행한다

## Context

인사ON은 재현 가능한 포트폴리오 프로토타입이다. 생성·임베딩·재랭킹을 외부 유료 API와
credential에 의존시키면 핵심 RAG 경로를 심사자가 독립적으로 실행하기 어렵고, 실제
개인정보 의심 입력의 외부 전송 위험도 불필요하게 만든다. 따라서 Phase 06의 이전 외부
provider 결정은 폐기하고 실제 로컬 모델 artifact와 loopback smoke를 완료 조건으로 삼는다.

공식 문서는 2026-07-29에 확인했다.

- [Ollama 로컬 API](https://docs.ollama.com/api/introduction)
- [Ollama structured outputs](https://docs.ollama.com/capabilities/structured-outputs)
- [Ollama 로컬 인증 정책](https://docs.ollama.com/api/authentication)
- [Qwen3 4B GGUF 모델 카드](https://huggingface.co/Qwen/Qwen3-4B-GGUF)
- [BGE-M3 모델 카드](https://huggingface.co/BAAI/bge-m3)

## Options

1. 생성·임베딩·재랭킹을 외부 API로 실행한다.
2. 생성만 로컬에서 실행하고 검색 모델은 외부 API를 사용한다.
3. 생성·임베딩·재랭킹을 모두 loopback 로컬 runtime에서 실행한다.
4. 결정적 fake adapter만 유지한다.

## Decision

옵션 3을 선택한다.

- `offline` 결정적 회귀 profile은 유지하고 실제 모델 profile은 `local`로 명시한다.
- runtime은 Ollama `0.32.5`, endpoint는 `http://127.0.0.1:11434/api`로 제한한다.
- 생성은 `qwen3:4b-instruct` Q4_K_M, prompt `answer-v4-local`을 사용한다.
- 임베딩은 `bge-m3:latest` 1024차원, `embedding-v2-local`을 사용한다.
- 재랭킹은 같은 `qwen3:4b-instruct`, `reranker-v2-local` structured output을 사용한다.
- manifest에는 mutable tag만 쓰지 않고 Ollama가 제공한 SHA-256 artifact digest를 기록한다.
- API key는 요구하지 않는다. HTTP transport는 loopback exact allowlist, redirect 금지,
  proxy 환경 무시를 강제한다. Ollama는 loopback bind와 `OLLAMA_NO_CLOUD=1`로 실행한다.
- timeout은 120초, retry 상한은 1회로 시작한다. schema·후보 집합·citation allowlist는
  모델 응답 뒤 결정적 코드로 다시 검증한다.
- 생성·임베딩·재랭킹 요청은 `keep_alive=20m`를 전달한다. 마지막 모델 호출 뒤 20분이
  지나면 Ollama가 해당 모델을 GPU·메모리에서 자동 언로드한다.
- 생성 모델은 질문에 직접 답하는 `review_position`과 적용 근거·예외·담당자 확인 claim,
  권고 상태를 함께 반환한다. 권고 상태는 결정적 gate를 통과한 상태를 더 보수적으로만
  변경할 수 있고 더 낙관적으로 승격할 수 없다.
- CASE-A/C와 개인정보 의심 입력은 로컬 모델 호출 전에 종료한다.
- 원클릭 런처는 Ollama와 두 필수 모델을 확인하고 필요 시 `OLLAMA_NO_CLOUD=1`,
  loopback bind로 서버를 기동한다. 인사ON preview 기본 profile도 `local`로 둔다.
- API는 모델 claim·citation ID·권고 상태와 `completed`·`not_run`·`failed` 실행 상태를
  반환하며, Web UI는 이를 채팅 본문에서 숨기지 않는다.
- 모델 파일은 공개 저장소에 포함하지 않고 설치·pull 명령과 artifact digest만 공개한다.

## Consequences

- 심사자는 별도 API 계정이나 비용 없이 동일한 RAG 경로를 재현할 수 있다.
- 모델 다운로드 약 3.7GB와 로컬 메모리·실행시간이 필요하다.
- 대시보드를 닫은 뒤에도 모델이 무기한 메모리에 남지 않는다. 다음 요청은 모델 재로딩
  때문에 첫 응답이 느려질 수 있다.
- 2026-07-29 M3 16GB 단일 CASE-B smoke는 통과했지만 한 번의 latency를 일반 성능으로
  확대 해석하지 않는다.
- 외부 추론 egress는 제거되지만 입력·로그·프롬프트 인젝션 통제는 그대로 유지한다.
- 4B 모델의 법령 설명 품질은 공식 corpus와 독립 법령 holdout에서 별도로 평가해야 한다.

## Revisit

- 독립 legal ablation에서 생성 또는 재랭킹 품질 부족이 측정될 때
- 16GB 기준 OOM, 응답시간 또는 동시성 문제가 재현될 때
- 더 작은 로컬 모델이 동일 안전 gate에서 명확한 운영 이점을 보일 때
- 배포 환경에서 loopback runtime 격리와 모델 artifact 공급망 검증을 강화할 때
