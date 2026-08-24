# 요구사항–검증 추적표

이 문서는 PRD의 기능 요구사항이 어떤 테스트와 증거로 승인되는지 연결한다. `구현·합성 회귀`는 코드와 synthetic fixture의 acceptance contract 통과를 뜻하며 독립 법령 정답성이나 운영 효과를 뜻하지 않는다.

| 요구사항 | 검증 시나리오 | 핵심 지표·게이트 | 공개 증거 | 현재 |
|---|---|---|---|---|
| FR-01 질문 유형 분류 | 육아·질병·가족돌봄·자기개발 휴직, 복직, 범위 밖·혼합 업무 질문 | 유형별 Precision/Recall/F1, 혼합 질문 target topic 우선 | 분류 unit test, wide 혼합 routing 회귀 | 구현·합성 회귀 통과; 독립 법령 지표 미측정 |
| FR-02 조건 구조화 | 완전·누락·충돌·변경 조건과 `core`·`normal_case_assumption`·`override` provenance, 의미별 날짜 역할, 휴직 4종 상세 core 후속 추출 | 필드별 F1, Exact Match, provenance 일치율, 기준일·자녀 생년월일·휴직기간·복직일 역할 충돌 0건 | `test_parental_complete_question_keeps_reference_date_separate_from_child_birth`, `test_parental_followup_extracts_child_and_previous_leave_without_changing_date`, `test_regular_allowance_followup_period_does_not_replace_reference_date`, 유형별 core session test | 조건·날짜 역할·후속 core 보존 합성 회귀 통과; 독립 지표 미측정 |
| FR-03 누락 조건 재질문 | 유형별 core 제거, 질문·결정적 파생 core 재질문 방지, 미등록 가정 차단, 승인 프로필 적용, 명시값 override와 충돌 | 누락 조건 Recall, 불필요 재질문률, core 가정 대체 0, 미등록 가정 0, 가정-확인·세션 혼입 0, 명시값 덮어쓰기 0, 위험 답변률 | CASE-A, 점 표기 PAY-01 no-reask, 휴직 4종 후속 core·8개 인사 주제 default-deny, 유형별 non-assumable matrix, 최초 profile·세션 비저장·명시 예외 우선 integration, Phase 13 step0·Phase 14 step0·2, ADR-0016, H3 JSON | 공통 정책·점 표기 no-reask·지원 유형 후속 보존 자동 회귀 통과; 독립 법령 검토 미완료 |
| FR-04 기준일 버전 필터 | 구법·현행·미시행·부칙, 유효 version 부재 | 버전 선택 정확도, 무효 버전 혼입률, 안전 보류 | CASE-B, temporal·future-first top-k 회귀, 공식 과거 source interval | 구현·합성 회귀 통과; 2024 공식 과거 버전 3종 local 연결, 승인 미완료 |
| FR-05 하이브리드 검색 | B0/B1/H1/H2/H3 동일 평가 | Set Recall@5, MRR@10 | B0~H3 비교 보고서 | 구현·60건 합성 비교 완료 |
| FR-06 조문 문맥 제공 | 본문·단서·부칙·인용 관계와 유형별 필수 근거 집합 | 인용 완전성, 예외 동시 검색률, 필수 근거 누락 시 인용·generation 0건 | `test_local_parental_deep_review_requires_basis_period_and_reinstatement_evidence`, `test_local_medical_deep_review_requires_reason_period_and_reinstatement_evidence`, 관련 근거 dialog | 공식 candidate 생성 전 gate 구현; 성공·경계 세분 회귀 보강 중 |
| FR-07 구조화 답변 | answer·ask·abstain, model 권고·completed/not_run/failed | review_position 우선, claim-citation 연결, 모델 권고의 보수적 상태 병합, 위험 답변률 | API schema·local RAG 판단형 질문·E2E·H3 JSON | 모델 판단·권고·실행 상태 API 계약과 사용자 문장 표시 구현·합성 회귀 통과; 내부 모델 ID·상태 코드는 기본 화면에서 숨김 |
| FR-08 개인정보 제한 | 합성 주민번호·건강·가족정보 | 차단 Recall, 오탐률, 외부 전송 0건 | privacy·API·release gate | 합성 차단 회귀 통과; 실제 입력 처리 금지 |
| FR-09 변경 조문 승인 | 변경 감지·파싱 실패·승인 거절 | diff 정확성, 재색인 성공률 | snapshot promotion·approval hash·versioned index test | 사람 검토 packet·approval validator·다중 source index builder 구현; 실제 사람 승인·관리자 UI 미완료 |
| FR-10 채팅 검토 대시보드 | 원클릭 local LLM·휴직복직 범위 첫 화면·누락 core chip·결론→가정→근거→유의사항·원문 미리보기·20분 idle·반응형 | 중복 경고 0, 내부 분류어 노출 0, desktop composer 접근, mobile chat 우선·rail progressive disclosure, 390/768/1024/1280/1440 overflow 0 | dashboard/API schema, viewport 렌더 QA, CASE-A/B/C, launcher·idle contract, ADR-0015·0017 | 3행 chat grid·compact message·모바일 rail on-demand 구현; 사람 사용성 결과 미측정 |
| FR-11 비활성 넓은 인사규정 연구 | 공개 앱 기본 비활성, 실험 플래그에서만 8개 주제·17개 source 회귀 | 공개 API 범위 밖·인용 0건; 실험 결과를 제품 성능으로 표시하지 않음 | `test_public_api_abstains_from_wide_personnel_topics`, 별도 wide 연구 회귀 | 공개 범위 gate 구현; 연구 corpus 사람 승인 미완료 |
| FR-12 공식 local RAG 경계 | official-only local profile, candidate 부재·stale registry, 2024 CASE-B, 승인 대기 | 공식 인용/전체, 합성 인용 0, 효력일 일치, 승인 전 `ANSWERABLE` 0 | `local-smoke.json`, Phase 12, ADR-0012, local RAG·launcher·E2E 테스트 | 공식 인용 10/10·합성 0/10·`REVIEW_REQUIRED`; 법률 정확도 미측정 |
| FR-13 비활성 정근수당 연구 | 날짜·기간·가정·결정적 계산 회귀 자산 | 공개 API 보류, 실험에서 현재 질문 날짜 일치·다른 CASE 날짜 누출 0·포함 종료일 표시 일치 | `test_regular_allowance_constraints_use_the_current_question_dates_only`, 날짜·session 연구 회귀 | 공개 비활성; 연구 결과를 MVP 성능으로 표시하지 않음 |

## 대표 시연 사례

### A. 조건 누락

```text
질문: 휴직을 연장하거나 다른 유형으로 신청할 수 있나요?
기대: 휴직 유형을 먼저 구분하고 유형별 사유, 기존 기간, 기준일 등 필요한 조건을 확인
검증: FR-02, FR-03, FR-07
```

### B. 과거 기준일

```text
질문: 과거 특정 기준일 당시 질병휴직과 복직에 적용된 규정은 무엇인가요?
기대: 해당 기준일에 유효한 버전과 관련 부칙을 표시
검증: FR-04, FR-05, FR-06, FR-12
```

### C. 지원 범위 밖 또는 기관 규정 미확인

```text
질문: 별도 체계가 적용될 수 있는 직군 또는 기관 자체 규정의 최종 판단 요청
기대: 자동 확정하지 않고 미지원 범위와 확인 필요사항을 표시
검증: FR-01, FR-07
```

챗봇 데모, HTML 기반 PDF와 평가 리포트는 동일한 A·B·C 사례 ID를 사용한다. 화면과 보고서가 서로 다른 성공 사례만 선택해 보여주지 않도록 한다.

`PAY-01`은 공개 대표 CASE가 아니라 비활성 연구 profile의 다중 turn 회귀다. 초기
대시보드에서는 제안하지 않으며 확장 플래그를 켠 연구 평가에서만 사용한다. 다른 휴직
유형은 PAY-01의 정상값을 재사용하지 않고 ADR-0016의 유형별 core를 재질문·미확인으로
유지한다.

FR-08 개인정보·보안은 공개 시연에서 실제 개인정보를 입력하지 않고, 별도 합성 공격셋의 집계 결과와 차단 로그로 검증한다.

## Harness 구현 추적

phase 00~06의 23개 step, phase 07의 공식 source·불변 수집 2개 step, phase 12의
공식 local RAG 4개 step과 phase 13의 휴직 파생 정근수당 4개 step은 로컬 acceptance
contract를 통과했다. phase 14는 공통 정상가정 정책 3개 step으로 추가됐고 구현·대상
자동 회귀·Harness·평가계약·공개경계 validator를 통과해 index를 `completed`로 기록했다.
Git 저장소가 없어 Harness executor의 브랜치·커밋 자동화는 실행하지 않았고, 완료 표시는
해당 acceptance 명령과 validator가 실제 통과한 범위로 제한한다.

| 요구사항 | 구현 phase/step | 주요 테스트 계약 |
|---|---|---|
| FR-01 질문 유형 분류 | `03-safe-decision/step0`, `step1`; `10-wide-hr-evidence/step2` | `test_classification.py`, `test_out_of_scope_flow.py`, mixed pay/leave routing |
| FR-02 조건 구조화 | `00-foundation-eval/step1`, `03-safe-decision/step1`, `13-derived-allowance-rag/step0` | `test_condition_extraction.py`의 한국어·ISO·점 표기 날짜·파생 provenance·negative guard, `test_evaluation_contract.py` |
| FR-03 누락 조건 재질문 | `03-safe-decision/step1`, `04-answer-product/step0`, `13-derived-allowance-rag/step0`, `14-general-normal-case-policy/step0·step2` | `test_missing_condition_flow.py`, `test_question_policy.py`, `test_normal_assumption_boundary.py`의 점 표기 no-reask·유형별 non-assumable matrix·PAY-01 profile·세션 비저장·명시값 우선 |
| FR-04 기준일 버전 필터 | `01-legal-data/step2`, `02-retrieval-spike/step2`, `03-safe-decision/step2`, `10-wide-hr-evidence/step2`, `12-official-local-rag/step0` | `test_temporal_repository.py`, `test_temporal_filter.py`, official parser·quality interval, historical wide abstention |
| FR-05 하이브리드 검색 | `02-retrieval-spike/step0`~`step2`, `05-fixed-eval-release/step0` | `test_retrieval_pipeline.py`, `test_ablation_runner.py` |
| FR-06 조문 문맥 제공 | `01-legal-data/step1`, `02-retrieval-spike/step2`, `04-answer-product/step2` | `test_context_expansion.py`, `test_answer_template.py` |
| FR-07 구조화 답변 | `04-answer-product/step0`, `step1`; `06-local-model-integration/step1`, `step4` | `test_citation_validator.py`, `test_review_api_schema.py`, `test_local_rag_pipeline.py` |
| FR-08 개인정보 제한 | `03-safe-decision/step0`, `04-answer-product/step1`, `05-fixed-eval-release/step1` | `test_privacy_gate.py`, `test_api_privacy.py`, release gate |
| FR-09 변경 조문 승인 | `01-legal-data/step0`~`step2`, `05-fixed-eval-release/step2` | `test_snapshot_promotion.py`, release boundary |
| FR-10 채팅 검토 대시보드 | `04-answer-product/step1`, `step2`; `06-local-model-integration/step4`; `11-design-ab-evaluation/step0`~`step3`; `14-general-normal-case-policy/step1·step2` | `test_dashboard_context.py`, `test_dashboard_shell.py`, `test_preview_dashboard.py`, `test_review_api_schema.py`, 공통 가정 label·missing chip 분리, local model API/UI, CASE-A/B/C E2E |
| FR-04·05·06·09 공식 원문 candidate | `07-official-legal-corpus/step0`, `step1` | `test_official_source_contract.py`, `test_official_ingestion.py`, `test_official_parsers.py` |
| FR-11 비활성 넓은 인사규정 연구 | `10-wide-hr-evidence/step0`~`step3` | 공개 API 범위 gate와 별도 연구용 source·routing 회귀 |
| FR-12 공식 local RAG 경계 | `12-official-local-rag/step0`~`step3` | official source·candidate factory·local full pipeline·launcher stale registry·CASE-B E2E |
| FR-13 비활성 정근수당 연구 | `13-derived-allowance-rag/step0`~`step3`; `14-general-normal-case-policy/step0·step1` | 공개 API 보류와 별도 연구용 날짜·기간·계산·session 회귀 |

평가 계약은 `00-foundation-eval`, 합성 지표 실행과 공개·치명적 오류 gate는 `05-fixed-eval-release`에서 공통 검증한다. 독립 법령 holdout은 ADR-0005의 후속 gate다.

## 후속 증거 gate 추적

phase 06~09는 실제 모델·공식 corpus·독립 평가·pilot 증거를 순차 검증하는 후속 gate다.
phase 06의 로컬 모델 artifact와 CASE-B smoke는 완료했다. 아래 단계의 증거를 앞 단계
결과로 대신하지 않는다.

| Gate | 요구사항 연결 | Harness phase | 필수 증거 | 현재 |
|---|---|---|---|---|
| G-06 로컬 모델 RAG | FR-05, FR-07, FR-08 | `06-local-model-integration` | generation·embedding·reranker 실제 local smoke, 차단 경로 모델 호출 0, artifact/index manifest | 5/5 완료; CASE-B local E2E·인용 gate 통과 |
| G-07 공식 법령 corpus | FR-04, FR-05, FR-06, FR-09 | `07-official-legal-corpus` | 공식 source manifest, 불변 snapshot, 자동 구조 품질감사, 사람 승인, versioned legal index | 2/4 완료; 자동 감사 12/12와 review/index gate 구현, 실제 사람 승인 대기 |
| G-08 독립 법령 평가 | FR-01~FR-08 | `08-independent-legal-evaluation` | reviewer 분리 locked set, 실제 B0~H3 결과, 치명적 오류 gate | annotation·release validator 구현; 승인 legal index·사람 정답 60건 없음 |
| G-09 제한적 pilot | FR-03, FR-06~FR-08 | `09-controlled-pilot` | 실제 deployment smoke, 합성 과제 완료 세션, 공개·비공개 경계 | production HTTP·배포 계약 구현; legal release·VM/domain·완료 세션 없음 |
| G-12 공식 local 제품 경로 | FR-04~FR-07, FR-10~FR-12 | `12-official-local-rag` | 과거 공식 source, official-only candidate, 로컬 모델 full pipeline, 승인 전 보수적 상태, UI·문서 정합성 | 4/4 완료; 공식 10/10·합성 0/10, 사람 승인·법률 정확도는 G-07·G-08에 남음 |
| G-13 휴직 파생 정근수당 | FR-02~FR-07, FR-10~FR-13 | `13-derived-allowance-rag` | 점 표기 기간·결정적 복직일 파생·최초 assumption profile·결정적 재질문·시점 선필터·전체 vector·교차 근거·비율 계산·local generation | 4/4 구현·점 표기 no-reask·정근수당 profile 회귀 완료; candidate 사람 승인·독립 legal 판정은 후속 gate에 남음 |
| G-14 공통 정상가정 정책 | FR-02, FR-03, FR-07, FR-10, FR-13 | `14-general-normal-case-policy` | 승인 profile만 적용, 전 유형 미등록 가정 0, core 재질문, 명시값 override, 세션 비저장, profile ID·공통 UI·API 계약, ADR-0016 | 3/3 구현·전체 회귀·validator 통과; 사람 사용성·독립 법령 검토는 미완료 |

공식 원천 접근·승인자·독립 검토자·hosting·참여자가 없으면 관련 후속 step은
`blocked`다. mock이나 계획 문서만으로 완료 처리하지 않는다.
