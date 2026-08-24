# 평가 실행 절차

**계약 버전:** `0.1.0`  
**현재 상태:** 오프라인 합성 회귀 CLI와 release gate 구현 완료. 독립 검토 법령셋 실행은 미수행이다.

## 1. 사전 조건

- 합성 회귀에서는 공개 synthetic fixture와 source snapshot ID가 고정됐다.
- parser·rule·prompt·model·embedding·reranker·index version이 고정됐다.
- dataset schema와 `group_id` split 검사가 통과했다.
- 독립 법령 holdout에서는 테스트셋 담당자와 시스템 개선 담당자의 접근 경계를 별도 기록한다.
- working tree와 실행 환경을 재현할 revision/lock hash가 있다.

현재 합성 회귀는 다음 계약 검사를 항상 실행한다.

```bash
python scripts/validate_eval_contract.py --results evals/results
python -m pytest tests/unit/evaluation tests/integration/test_ablation_runner.py -q
```

## 2. 실행 순서

```bash
python -m insaon.evaluation.cli validate-dataset \
  --dataset ../../private/evals/test_mvp_locked.synthetic.jsonl

python -m insaon.evaluation.cli run \
  --config configs/eval/offline-all.toml

python -m insaon.evaluation.cli compare \
  --results evals/results \
  --output evals/reports/comparison.md

python -m insaon.evaluation.cli failures \
  --results evals/results/h3_reranker_context.json \
  --private-case-results ../../private/evals/results \
  --output evals/reports/failure_analysis.md

python scripts/sync_public_results.py
python scripts/release_check.py --profile offline
```

`release_check.py`는 평가를 다시 실행하고 비교·실패 보고서를 재생성한 뒤 Harness/eval schema/공개 경계/pytest/Ruff/mypy를 검사한다.

## 3. 동일 조건 잠금

B0~H3에서 다음 값은 동일해야 한다.

- dataset version과 hash
- source snapshot과 parser version
- provision/chunk 집합
- case order와 top-k
- scoring 코드 version
- 반복 seed 정책

구성별로 달라질 수 있는 값은 retrieval config ID, embedding, fusion, temporal/subject filter, reranker와 context expansion뿐이다.

현재 H3는 reranker와 context expansion을 함께 켠 구현 구성이다. reranker-only와 context-only 분리는 향후 실제 승인 법령 snapshot 실험에서 추가하며, 현재 결과에 존재하지 않는 ablation 수치를 작성하지 않는다.

## 4. 생성 반복

검색과 결정적 규칙은 고정 설정에서 1회 실행한다. 생성 단계는 같은 입력과 설정으로 최소 3회 실행하고 다음을 기록한다.

- 반복별 case result
- 지표 평균
- 안전 지표의 최악 실행
- seed 또는 provider가 제공한 재현성 파라미터

현재 offline adapter는 결정적이므로 3회 결과가 동일하다. 실제 로컬 모델 실행은 완전한
결정성을 보장하지 않음을 limitation에 기록하고 `local-model-smoke`/`legal` profile로 분리한다.

## 5. 중단과 재실행

- dataset/hash 불일치: 실행 전 중단
- 치명적 개인정보 경계 실패: 즉시 중단하고 외부 호출이 없었는지 확인
- 일부 case 실패: run 상태를 `partial`로 저장하고 완료 결과와 분리
- provider 장애: 재시도 횟수와 실패 분모를 보존
- 잠금 정답 확인 뒤 코드 수정: 새 dataset version 또는 탐색 결과 표기

실패 실행의 결과 파일을 삭제해 분모를 바꾸지 않는다.

## 6. 사람 검토

사람 검토가 필요한 항목은 정답 근거, 시점·부칙, claim support, 치명적 오류다. 구조화 스키마, source ID 존재, 기간 계산과 검색 metric은 자동 계산한다. LLM-as-judge는 claim 분할 보조로만 사용할 수 있고 최종 판정값과 분리 저장한다.

## 7. 공개 전 체크

- 결과에 numerator/denominator와 평가셋 version이 있는가?
- source snapshot과 모든 모델·규칙·프롬프트·index version이 있는가?
- 미측정과 수집 실패를 그대로 표시했는가?
- 치명적 오류와 실패 사례를 숨기지 않았는가?
- 실제 개인정보, 잠금 정답과 사람 메모가 없는가?
- CASE-A/B/C가 UI·보고서·추적표에서 동일한가?
- 검색 성능을 업무효과로 확대 해석하지 않았는가?
