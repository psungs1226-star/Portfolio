# 제한적 pilot 운영 runbook

## 시작 전 gate

1. Phase 08의 `legal_validation_candidate` manifest와 치명적 오류 0을 확인한다.
2. 독립 사람 승인 hash와 approved legal index manifest를 확인한다.
3. container image, model digest, prompt·rule·parser·index version을 release manifest와
   대조한다.
4. 공개 origin·trusted host·incident contact를 host environment에 주입한다.
5. 실제 개인정보 금지 고지와 합성 CASE-A/B/C만 노출되는지 확인한다.

하나라도 없으면 서비스를 시작하지 않는다.

## 배포와 readiness

- Caddy만 80/443을 공개하고 HTTP는 HTTPS로 전환한다.
- FastAPI와 Ollama port는 외부에 공개하지 않는다.
- `/healthz`는 process 상태, `/readyz`는 승인 index와 local model 준비 상태를
  구분해 반환한다.
- request는 16 KiB, 분당 30회, provider timeout 120초로 제한한다.
- wildcard CORS, debug, docs endpoint와 raw request/model logging을 허용하지 않는다.

## 로그와 보존

- session ID, answer status, latency bucket, 오류 code와 release version만 event로 남긴다.
- 질문·응답 원문, 직원 식별자, 건강·가족 사실과 locked 정답은 기록하지 않는다.
- event는 14일 뒤 삭제하고 incident hold가 필요하면 사유·범위·해제시점을 기록한다.

## incident

개인정보 의심 입력, 외부 egress, 무효 조문·허위 인용 또는 결정적 예외 누락을 확인하면
즉시 ingress를 중단한다. 관련 release·index hash와 비식별 event만 보존하고 질문
원문을 복구하려 하지 않는다. 공개 범위를 축소하거나 수정된 version으로 재평가한다.

## rollback

1. ingress를 maintenance 상태로 전환한다.
2. 직전 통과 container image와 그 image가 참조한 승인 index manifest를 함께 복원한다.
3. health/readiness, CASE-A/B/C와 보안 suite를 다시 실행한다.
4. 실패하면 서비스를 계속 중단하고 이전 성공으로 표시하지 않는다.

## 삭제와 종료

pilot 종료 시 비식별 event, 임시 container와 배포 secret을 삭제한다. 공식 원문,
승인 기록과 평가 artifact는 공개·비공개 보존 정책에 따라 별도로 관리한다.

