# ADR-0017: 공개 범위와 심층 근거 gate를 분리한다

- 상태: 승인
- 결정일: 2026-08-08
- 관련 요구사항: FR-01, FR-04~FR-07, FR-10~FR-13

## 배경

저장소에는 휴직·복직 심층 검토 외에도 넓은 인사규정 검색과 육아휴직 파생 정근수당
연구 코드가 있다. 이 연구 레인을 공개 제품 범위처럼 제안하면 사용자는 승진·징계·수당
산정까지 답할 수 있다고 오해한다. 또 육아·질병휴직은 주제와 관련된 조문 몇 건만 검색돼도
생성을 시작할 수 있어 사유·기간·복직 근거 중 하나가 빠질 위험이 있었다.

## 결정

1. 공개 앱과 기본 API는 지방자치단체 일반직의 휴직·복직만 지원한다.
2. 육아·질병휴직을 심층 구현하고 가족돌봄·자기개발휴직을 확장 평가한다.
3. 승진·징계·전보·보수·수당 산정과 넓은 인사규정 검색은
   `enable_extended_evidence_topics=false`로 기본 비활성화한다.
4. 비활성 연구 코드는 비교·회귀 자산으로 보존할 수 있지만 공개 성능이나 지원 범위로
   표현하지 않는다.
5. 공식 candidate의 육아휴직은 사유와 기간, 복직 질문이면 복직 근거를 생성 전에 모두
   확인한다.
6. 공식 candidate의 질병휴직은 사유와 기간, 공무상 구분, 복직 질문이면 복직 근거를 생성
   전에 모두 확인한다.
7. 필수 근거가 하나라도 없으면 `INSUFFICIENT_EVIDENCE`, 인용 0건, 모델 호출 0건으로
   종료한다.
8. 필수 조문 집합은 영구 법률 정답이 아니라 candidate corpus version에 묶인 안전 회귀
   계약이다. corpus를 승격할 때 사람 검토와 함께 갱신한다.

## 결과

- 첫 화면과 quick prompt는 지원되는 휴직·복직 질문만 제안한다.
- 범위 밖 질문은 관련 연구 corpus가 있어도 공개 앱에서 답변하지 않는다.
- 생성 모델은 유형별 최소 근거가 완성된 뒤에만 호출된다.
- 합성 fixture는 법률 승인 자료가 아니므로 공식 candidate gate와 별도 회귀로 표시한다.

## 검증

- `test_public_api_abstains_from_wide_personnel_topics`
- `test_local_parental_deep_review_requires_basis_period_and_reinstatement_evidence`
- `test_local_medical_deep_review_requires_reason_period_and_reinstatement_evidence`
- `test_parental_complete_question_keeps_reference_date_separate_from_child_birth`

