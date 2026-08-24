# 평가 작업공간

현재 상태는 **평가 계약 v0.1.0, B0/B1/H1/H2/H3 실행기와 합성 시스템 회귀 결과 생성 완료**다. 결과는 파이프라인·안전 동작을 검증하는 기계 생성 합성 회귀이며, 독립 검토 법령 holdout이나 법률 정확도 결과가 아니다.

## 문서

- [데이터셋 카드](dataset_card.md)
- [지표 정의](metrics_definition.md)
- [평가 실행 절차](runbook.md)
- [결과 파일 계약](result_schema.md)
- [case/result JSON Schema](schemas/)
- [명시적 합성 샘플](samples/)
- [실행 결과](results/)
- [B0~H3 비교 보고서](reports/comparison.md)
- [공개 가능한 실패 분석](reports/failure_analysis.md)
- [로컬 모델 통합 리뷰](reports/local-model-integration-review.md)

## 공개 산출물

```text
evals/
├── README.md
├── dataset_card.md
├── metrics_definition.md
├── runbook.md
├── result_schema.md
├── results/
│   ├── b0_lexical.json
│   ├── b1_vector.json
│   ├── h1_hybrid.json
│   ├── h2_temporal_filter.json
│   └── h3_reranker_context.json
└── reports/
    ├── comparison.md
    ├── failure_analysis.md
    └── local-model-integration-review.md
```

정답 원문과 사람 채점 메모는 공개하지 않고, 비식별 질문·집계 결과·평가 코드·데이터셋 카드만 공개한다. 공개 결과에는 데이터, 모델, 프롬프트와 인덱스 버전을 포함한다.

다음 명령은 schema, 합성 CASE-A/B/C, 결과와 누수 방지 규칙을 검사하고 동일 조건 회귀를 재생성한다.

```bash
python scripts/validate_eval_contract.py --results evals/results
python -m insaon.evaluation.cli run --config configs/eval/offline-all.toml
python -m insaon.evaluation.cli compare \
  --results evals/results \
  --output evals/reports/comparison.md
python scripts/release_check.py --profile offline
```

평가 입력과 case-level 결과는 제출물 바깥 `private/`에 둔다. 공개 JSON에는 version, hash, numerator/denominator, 치명적 오류 case ID와 한계만 남긴다. 공식 승인 법령 snapshot과 독립 검토 정답셋이 준비되면 새 dataset version으로 별도 실행하고, 현재 합성 결과를 legal holdout으로 이름만 바꾸지 않는다.
