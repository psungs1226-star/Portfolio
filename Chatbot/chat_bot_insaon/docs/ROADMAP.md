# 2주 MVP 로드맵

**현재 상태:** Harness phase 00~06의 23개 step, phase 07 공식 source·불변 수집
2개 step, phase 10 넓은 근거와 phase 11 디자인 검증 8개 step, phase 12 공식 local
RAG와 phase 13 휴직 파생 정근수당 8개 step, phase 14 공통 정상가정 정책 3개 step과
phase 15 공개 데모 무결성 4개 step을 합쳐 **70개 step 중 56개**를 완료했다.
사람 승인·독립 평가·pilot 선행조건에서 3개 step이 blocked이고 후속 16개 step은
pending이다. 실제 집계는 `python scripts/validate_harness.py`와
`phases/*/index.json`으로 확인한다.

## 범위 원칙

2주 안에는 “공무원 인사 전체”가 아니라 “지방자치단체 일반직의 휴직·복직” 도메인을 검증한다. 육아·질병휴직은 심층 구현하고, 가족돌봄·자기개발휴직은 같은 공통 엔진에서 유형 분류·조건 스키마·근거 검색의 확장성을 검증한다.

## 1주차 — 데이터와 검색

| 일 | 산출물 | 완료 조건 |
|---|---|---|
| 1 | PRD, 비목표, 유형별 질문 스키마 | 네 휴직 유형과 최종 판단 비자동화 범위 확정 |
| 2 | 공식 자료 목록, 데이터 스키마 | 조문·부칙·효력기간 표현 가능 |
| 3 | 수집·파싱 파이프라인 | 원문 해시와 파싱 검증 로그 생성 |
| 4 | BM25/Vector 기준선 | 같은 개발셋으로 두 결과 측정 |
| 5 | Hybrid와 시간 필터 | 과거·미시행 테스트 케이스 통과 |
| 6 | 구조화 답변과 인용 검증 | 존재하지 않는 source ID 차단 |
| 7 | 30문항 개발셋 | 육아·질병 심층 사례와 가족돌봄·자기개발 확장 사례 포함 |

## 2주차 — 조건 확인과 검증

| 일 | 산출물 | 완료 조건 |
|---|---|---|
| 8 | 유형 분류·조건 추출·재질문 | 유형 또는 필수 정보가 없으면 결론 생성 금지 |
| 9 | 부칙·관련 조문 문맥 확장 | 기준일 평가 슬라이스 실행 |
| 10 | Reranker·ablation | 각 구성의 비교표 작성 |
| 11 | 날짜·기간·효력 규칙 | 법적 결론이 아닌 결정적 계산만 수행 |
| 12 | 60문항 합성 시스템 회귀셋 | 비제출 경계·버전·hash 고정, 독립 법령 holdout과 구분 |
| 13 | 오류 분석과 회귀 테스트 | 대표 실패 10건 정리 |
| 14 | 공개 후보·README·HTML/PDF | 공개 경계와 release 체크 통과 |

## 후속 Harness 경로

| 순서 | Phase | 핵심 증거 | 완료를 막는 외부 의존성 |
|---:|---|---|---|
| 1 | `06-local-model-integration` | Qwen3·BGE-M3 artifact와 local RAG E2E | 완료 |
| 2 | `07-official-legal-corpus` | 공식 snapshot, 자동 구조 품질감사, 사람 승인, versioned index manifest | keyless 수집·파싱·자동 감사 12/12 완료; 승인자 미확보 |
| 3 | `08-independent-legal-evaluation` | 독립 검토 locked set, B0~H3 실제 비교, fatal 0 | 승인 index·작성자·검토자·adjudicator |
| 4 | `09-controlled-pilot` | 실제 배포 smoke와 합성 과제 기반 usability evidence | legal release, hosting, secret store, 참여자 |
| 5 | `10-wide-hr-evidence` | 공식 source·8개 topic 안전 routing | 사람 승인·독립 주제별 검색 평가 |
| 6 | `11-design-ab-evaluation` | 3개 방향·동일 CASE 비교·B Case Workbench rollout | 사람 과업 사용성 측정 |
| 7 | `12-official-local-rag` | 공식 candidate·과거 버전·official-only local CASE-B | 완료; 사람 승인은 phase 07, 법률 평가는 phase 08에 남음 |
| 8 | `13-derived-allowance-rag` | 17개 계약·16개 파싱·전체 vector·PAY-01 6개월/100%·공식 교차 인용 4건 | 완료; 사람 승인·독립 법령 평가·반복 latency는 남음 |
| 9 | `14-general-normal-case-policy` | 필수 사실·승인 가정·명시 예외 분리, 유형별 무가정 경계 | 완료; 새 가정 프로필별 사람 검토는 남음 |
| 10 | `15-public-demo-integrity` | 범위 밖 기본 거부, offline 기본 데모, 공개 artifact 경계, 문서 주장 동기화 | 완료 |
| 11 | `16-retrieval-evidence` | distractor corpus로 B0 포화 해제, 검색 결함 수정, B0~H4 재측정, 청킹 비교, 질의 변환, 실패 유형 분류 | 완료; B0 Set Recall@5 0.353, 오류 유형 5종 관측 |
| 12 | `17-selective-release` | 선별 공개 목록, README 재작성, 공개 전 전수 검증, 저장소 초기화 | 미착수; 라이선스와 포함 범위는 사용자 결정 |

각 외부 의존성이 없으면 해당 step은 `completed`가 아니라 `blocked`다. mock·합성 회귀만으로 다음 증거 수준을 대신하지 않는다.

## 장기 확장

1. 테스트셋 120문항 이상과 독립 검토자 채점 확대
2. 네 휴직 유형의 동일 수준 심층 구현과 경력 산입 규칙 확장
3. 기관 자치법규를 선택적으로 연결하는 관리자 기능
4. 임용·전보·승진을 별도 도메인 모듈로 추가
5. 실제 운영 승인을 받은 뒤에만 개인정보 처리 범위를 별도 검토

## 범위 축소 우선순위

일정이 부족하면 UI 장식 → 자동 매일 동기화 → 전체 대시보드 → 문항 수 순으로 줄인다. 기준일 검색, 인용 검증, 답변 보류와 평가 재현성은 줄이지 않는다.

## Harness 실행 매핑

일 단위 로드맵은 산출물 일정이고, 실제 구현 단위는 [기술 구현 계획](IMPLEMENTATION_PLAN.md)과 `phases/`를 따른다.

| Harness phase | 주 대응 일정 | 선행 조건 |
|---|---|---|
| `00-foundation-eval` | 1~2일차 기반·평가 계약 | 없음 |
| `01-legal-data` | 2~3일차 | foundation 완료 |
| `02-retrieval-spike` | 4~5일차, 9~10일차 | 승인된 sample snapshot |
| `03-safe-decision` | 8일차, 11일차 | domain·retrieval 계약 |
| `04-answer-product` | 6일차와 UI 통합 | 안전·결정 로직 |
| `05-fixed-eval-release` | 12~14일차 | 제품 E2E와 잠금 평가셋 |
| `06-local-model-integration` | 후속 gate 1 | phase 05 offline release |
| `07-official-legal-corpus` | 후속 gate 2 | 로컬 모델 adapter와 source contract |
| `08-independent-legal-evaluation` | 후속 gate 3 | 승인 legal index와 독립 검토자 |
| `09-controlled-pilot` | 후속 gate 4 | legal release gate와 hosting·참여자 |
| `10-wide-hr-evidence` | phase 06 이후 독립 확장 | 공개 공식 source와 evidence-only 경계 |
| `11-design-ab-evaluation` | phase 06 이후 독립 제품 검증 | 동일 CASE·선택 기록·반응형 렌더 |
| `12-official-local-rag` | phase 06·10 이후 제품 결합 | 공식 과거 version·승인 전 안전 gate |
| `13-derived-allowance-rag` | phase 12 이후 제한적 심층 확장 | 정근수당 조건·시점·결정 계산·공식 교차 근거 |

각 phase는 이전 phase 전체 AC를 통과하고 리뷰·병합한 뒤 시작한다.
