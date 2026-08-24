# 인사ON 평가 데이터셋 카드

**계약 버전:** `0.1.0`  
**상태:** schema·CASE-A/B/C seed·기계 생성 60건 합성 시스템 회귀 작성 및 실행 완료, 독립 검토 법령셋 미작성  
**적용 범위:** 지방자치단체 일반직 공무원의 휴직·복직 검토 지원  
**기준 문서:** `docs/EVALUATION_PLAN.md`

## 1. 목적

데이터셋은 시스템이 다음 행동을 안전하게 구분하는지 평가한다.

- 조건과 근거가 충분하면 검토용 답변
- 결정적인 조건이 부족하면 재질문
- 범위 밖·근거 부족·기관 규정 또는 해석 확인이 필요하면 보류·사람 검토

최종 인사처분의 자동 정확도를 주장하거나 실제 직원 사례를 재현하기 위한 데이터셋이 아니다.

## 2. 데이터 단계

현재 실행한 `insaon-synthetic-system-regression@0.1.0`은 60건의 기계 생성 회귀셋이다. 비제출 경로의 파일명에는 `test_mvp_locked.synthetic`를 사용하지만, 이는 실행 중 변경을 막는다는 뜻일 뿐 독립 검토된 법률 holdout을 의미하지 않는다.

| Split | 목표 규모 | 사용 | 공개 |
|---|---:|---|---|
| `dev` | 30 | 검색·프롬프트·규칙 개선 | 비식별 질문과 공개 가능한 metadata |
| `test_mvp_locked.synthetic` | 60 | 현재 시스템 회귀·ablation | 집계 결과와 case ID·오류 유형 |
| `test_mvp_locked` | 60 | 향후 독립 법령 검토 | 검토 완료 후 집계 결과와 제한된 비식별 사례 |
| `test_extended_locked` | 120+ | 범위 확장 뒤 검증 | 집계 결과 |

동일 쟁점의 표현 변형은 같은 `group_id`로 묶고 split은 `group_id` 단위로 나눈다. 잠금 정답을 확인한 뒤 시스템을 변경하면 그 결과는 holdout이 아니라 탐색 결과로 표기한다.

## 3. 사례 스키마

정식 machine-readable 계약은 `evals/schemas/evaluation-case.schema.json`에 있다. `evals/samples/dev.sample.jsonl`의 CASE-A/B/C는 파이프라인 연결 검사용 합성 seed이며 법령 정답이나 측정셋이 아니다.

```yaml
schema_version: "0.1.0"
case_id: "CASE-..."
group_id: "GROUP-..."
split: "dev | test_mvp_locked | test_extended_locked"
question_text: "비식별 합성 질문"
turns: []
slice:
  task: "single_evidence | multi_evidence | missing_condition | temporal | out_of_scope | security"
  leave_type: "parental | medical | family_care | self_development | mixed_or_other"
reference_date: "YYYY-MM-DD | null"
subject:
  employee_system: "local_government | other | unknown"
  employee_category: "general_service | other | unknown"
expected:
  action: "answer | ask | abstain"
  answer_status: "ANSWERABLE | REVIEW_REQUIRED | INSUFFICIENT_EVIDENCE"
  required_condition_fields: []
  required_evidence_ids: []
  required_exception_ids: []
  forbidden_evidence_ids: []
critical_flags: []
annotation:
  author_id: "pseudonymous id"
  reviewer_ids: []
  adjudication_status: "pending | accepted | excluded"
```

공개본에서는 잠금 정답, 검토자 메모와 원문 전체를 제거하거나 별도 집계로 대체한다.

## 4. MVP 60문항 구성 계약

### 평가 목적 축

| 유형 | 문항 수 |
|---|---:|
| 단일 근거 검색 | 12 |
| 복수 근거·예외 결합 | 12 |
| 조건 누락·추가 질문 | 10 |
| 기준일·개정·부칙 | 10 |
| 지원 범위 밖·근거 부족 | 8 |
| 국가직·특정직 혼동 | 4 |
| 공격·민감정보 입력 | 4 |
| 합계 | 60 |

### 휴직 유형 축

| 유형 | 문항 수 |
|---|---:|
| 육아휴직·복직 | 16 |
| 질병휴직·복직 | 14 |
| 가족돌봄휴직·복직 | 8 |
| 자기개발휴직·복직 | 6 |
| 비교·범위 밖·공격 | 16 |
| 합계 | 60 |

두 표는 서로 다른 분류축이다. 현재 합성 생성기는 각 합계를 자동 검사한다. 향후 독립 검토셋도 같은 분포 계약을 기본으로 하되 법령 쟁점과 검토 결과에 따라 새 버전으로 조정한다.

## 5. 작성과 검토

아래 절차는 아직 수행하지 않은 독립 법령 holdout의 작성·검토 계약이다.

1. 작성자가 공식 원문에서 질문, 기준일, 필수 조건과 근거 집합을 작성한다.
2. 독립 검토자가 공식 원문을 다시 열어 기대 행동과 근거를 검토한다.
3. 불일치는 원시 판정을 보존한 뒤 adjudication으로 해결한다.
4. 해석이 갈리는 사례는 `REVIEW_REQUIRED`로 라벨링하거나 제외한다.
5. 잠금 시 canonical serialization의 SHA-256과 source snapshot hash를 기록한다.

기대 행동에는 원시 일치율과 Cohen’s kappa를 기록한다. 표본이 작으므로 일치도만으로 법률적 정답성을 주장하지 않는다.

## 6. 개인정보와 공개 경계

- 공개 법령과 합성 사례만 사용한다.
- 실제 이름, 사번, 주민등록번호, 건강·가족·징계·평정·급여정보를 사용하지 않는다.
- 합성 개인정보 공격셋은 명백한 synthetic marker를 갖고 실제 식별자와 충돌하지 않게 생성한다.
- 잠금 정답과 사람 검토 메모는 프로젝트의 `evals/private/` 또는 작업공간의 비제출 `private/`에만 저장한다.
- 공개 결과에는 민감 입력 원문을 복사하지 않고 case ID, 오류 유형과 집계만 둔다.

## 7. 알려진 한계

- 60문항은 작은 프로토타입 표본이다.
- 가족돌봄·자기개발 표본은 적어 전체 성능으로 일반화하지 않는다.
- 합성 사례는 실제 현장의 질문 분포와 다를 수 있다.
- 현재 60건은 시스템과 같은 합성 fixture 규칙으로 생성돼 완벽한 수치를 실제 법령 질문으로 일반화할 수 없다.
- 독립 법령 검토자 일치도와 adjudication 결과는 아직 미측정이다.
- 공개 자료만 사용하므로 기관 내부 규정이 결정적인 사례는 완전한 자동 정답을 만들 수 없다.
