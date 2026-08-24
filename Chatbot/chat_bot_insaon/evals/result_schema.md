# 평가 결과 파일 계약

**스키마 버전:** `0.1.0`  
**상태:** JSON Schema·Pydantic 계약·validator와 합성 시스템 회귀 결과 구현 완료

각 비교 구성은 하나의 JSON 결과 파일을 만든다. 완료되지 않은 실행은 `status: partial | failed`로 보존한다.

```json
{
  "schema_version": "0.1.0",
  "run_id": "opaque-id",
  "status": "completed",
  "started_at": "RFC3339",
  "completed_at": "RFC3339",
  "system": {
    "config_id": "H2",
    "code_revision": "git-sha",
    "retrieval_config": "h2-temporal@version",
    "model": "provider/model@version-or-none",
    "embedding": "provider/model@version-or-none",
    "reranker": "provider/model@version-or-none",
    "query_transform": "dictionary-id-or-none",
    "prompt_version": "version",
    "rule_version": "version",
    "parser_version": "version",
    "index_version": "version"
  },
  "data": {
    "dataset_id": "insaon-mvp",
    "dataset_version": "version",
    "dataset_hash": "sha256",
    "case_count": 0,
    "unique_case_count": 0,
    "source_snapshot_id": "opaque-id",
    "source_snapshot_hash": "sha256",
    "data_as_of": "YYYY-MM-DD"
  },
  "execution": {
    "top_k": 5,
    "generation_repeats": 3,
    "seed_policy": "description",
    "environment_lock_hash": "sha256"
  },
  "metrics": [
    {
      "metric_id": "retrieval.set_recall_at_5",
      "slice_id": "all",
      "aggregation": "macro_mean",
      "numerator": null,
      "denominator": 0,
      "value": null,
      "ci95": {
        "low": null,
        "high": null
      },
      "undefined_reason": "not_measured"
    }
  ],
  "fatal_errors": {
    "total": 0,
    "by_type": {},
    "case_ids": []
  },
  "failure_types": {
    "by_type": {"RETRIEVAL_MISS": 0},
    "case_ids_by_type": {"RETRIEVAL_MISS": []},
    "cases_with_any_failure": 0
  },
  "case_results_path": "private-or-redacted-artifact-reference",
  "limitations": [],
  "notes": []
}
```

## 유효성 규칙

- `status=completed`이면 dataset/source/config hash와 모든 필수 version이 있어야 한다.
- `case_count`는 평가한 고유 case 수와 같아야 한다. `unique_case_count`를 함께 기록하고 두 값이 다르면 검증이 실패한다. case ID는 얼마든지 만들 수 있으므로, 고유성은 (질문+기준일+대상+기대) 조합으로 센다. 평가셋 v0.1.0은 case ID 60개가 고유 조합 12개 위에 얹혀 있어 모든 분모가 약 5배 부풀고 신뢰구간이 실제보다 좁았다.
- metric의 분모가 0이면 value와 CI는 `null`이어야 한다.
- 비율만 있고 numerator/denominator가 없는 metric은 거부한다.
- 치명적 오류 case ID는 공개 가능 식별자만 사용하며 입력 원문을 포함하지 않는다.
- `failure_types.by_type`의 각 건수는 `case_ids_by_type`의 목록 길이와 같아야 한다. 검증할 수 없는 건수는 근거가 아니며, 실패 건수가 조용히 깎이는 경로가 여기다.
- `failure_types.cases_with_any_failure`는 유형별 case ID의 **합집합** 크기다. 한 case가 여러 유형에 해당할 수 있으므로 건수의 합이 아니다.
- 관측되지 않은 오류 유형은 0으로 남기고 공개 표에서 제외한다. 지어내지 않는다.
- `FATAL_` 접두사는 AGENTS.md의 치명적 오류에만 붙이며, 대응 관계는 `src/insaon/evaluation/failures.py`의 `FATAL_EQUIVALENTS`에 둔다.
- API 키, token, prompt 원문, 질문 원문, 잠금 정답과 사람 메모를 저장하지 않는다.
- 공개 보고서는 이 파일에서 생성하고 숫자를 수동 입력하지 않는다.

정식 machine-readable 계약은 `evals/schemas/evaluation-result.schema.json`, 구조 예시는 `evals/samples/result.sample.json`, 실제 합성 회귀 결과는 `evals/results/`에 있다. `case_results_path`는 비제출 artifact를 가리키며 공개 저장소에서 역참조할 수 없어야 한다.
