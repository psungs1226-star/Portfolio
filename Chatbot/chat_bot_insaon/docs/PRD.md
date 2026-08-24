# PRD — 인사ON

## 1. 제품 정의

인사ON은 지방자치단체 일반직 공무원의 휴직·복직 질문에서 필요한 사실관계를 확인하고, 질문 기준일에 유효한 공개 근거를 찾아주는 인사담당자용 포트폴리오 프로토타입이다. 인사처분이나 법률해석을 자동 결정하지 않는다.

### 중앙 답변

휴직·복직 규정은 유형, 사유, 기간, 복직 시점과 시행일을 함께 확인해야 한다. 인사ON은 육아·질병휴직을 심층 구현하고 가족돌봄·자기개발휴직을 확장 평가하되, 필요한 core 조건이 없으면 재질문하고 근거가 부족하면 답변을 보류한다. 최종 판단과 처분은 인사담당자가 원문과 기관 규정을 확인해 수행한다.

## 2. 사용자와 업무

### Primary persona — 가설 기반 역할 페르소나

- 지방자치단체 인사과의 신규 또는 순환보직 담당자
- 휴직·복직 문의의 유형, 사실관계, 근거 조문과 적용일을 확인해 검토 의견을 준비하는 사람

이 페르소나는 실제 인터뷰를 완료한 인물이 아니라 MVP에서 우선 검증할 역할 가설이다. 업무 빈도, 처리시간과 세부 어려움은 실무자 인터뷰와 동일 과제 관찰로 검증한다.

### Secondary persona

- 자체 규정과 상위 규정의 관계를 확인하는 인사 실무자
- 검색·답변 실패를 분석하는 서비스 운영자

### 사용자의 핵심 업무

1. 질문이 어느 인사 업무와 규정에 해당하는지 찾는다.
2. 휴직·복직이면 신분·사유·기간·기준일 등 필요한 조건을 확인한다.
3. 해당 기준일에 적용 가능한 본문·단서·부칙·인용 조문을 함께 검토한다.
4. 근거와 불확실성, 지원 경계를 기록한 뒤 사람이 최종 판단한다.

## 3. MVP 범위

### 포함

- 지방자치단체 일반직 공무원
- 육아휴직·질병휴직과 그 복직에 직접 관련된 질문: 심층 구현·평가
- 가족돌봄휴직·자기개발휴직과 그 복직에 직접 관련된 질문: 공통 엔진 확장 구현·평가
- 유형별 신청·연장 조건, 기간, 복직 시점과 경력 산입 근거 탐색
- 질문 기준일 기준 현행·과거 버전 탐색
- 법령, 대통령령, 행정규칙과 공개 실무자료
- 필수 조건 확인, 근거 탐색, 기간 계산 보조
- 합성 사례와 공개 자료를 이용한 평가

### 제외

- 국가공무원, 교육공무원, 경찰·소방 등 별도 체계가 적용될 수 있는 직군
- 보수·수당의 조건별 판단, 원화 금액의 최종 산정과 실제 지급 결정
- 징계·승진·전보·경력경쟁임용과 그 밖의 인사 분야 검색·판단
- 기관 내부 규칙의 자동 수집
- 법적 효력이나 규정 충돌의 자동 확정
- 실제 직원 정보 처리
- 최종 처분문·발령문 자동 작성

지원 범위 밖 질문, 별도 직군·기관 규정·최종 처분 요청이나 검증 가능한 근거가 없는 질문은 `INSUFFICIENT_EVIDENCE`로 처리한다. 기존의 넓은 인사규정·정근수당 실험 레인은 코드와 회귀자료만 보존하고 공개 앱에서는 기본 비활성화한다.

## 4. 사용자 이야기

- 인사과 담당자는 짧은 질문을 입력하고 휴직 유형 분류와 누락된 판단 조건을 안내받을 수 있다.
- 인사담당자는 질문 기준일을 지정해 당시 유효했던 조문을 찾을 수 있다.
- 인사담당자는 답변 문장별 근거 조문과 원문 링크를 확인할 수 있다.
- 인사담당자는 기관별 규정 미확인 여부와 사람의 추가 검토 사유를 확인할 수 있다.
- 인사담당자는 대화 안에서 결론·짧은 가정·근거·유의사항을 순서대로 이해하고 후속 조건을 같은 세션에 입력할 수 있다.
- 인사담당자는 법령 사이트로 이동하기 전에 조문 발췌·시행일·출처를 화면 안에서 확인하고, 필요할 때만 공식 원문을 새 창으로 열 수 있다.
- 운영자는 검색 실패와 생성 실패를 구분해 개선할 수 있다.
- 운영자는 공개 artifact에서 집계한 corpus·로컬 모델·release 상태를 법률 정확도와 구분해 확인할 수 있다.

## 5. 기능 요구사항

| ID | 요구사항 | MVP 승인 기준 |
|---|---|---|
| FR-01 | 질문 유형을 육아·질병·가족돌봄·자기개발 휴직, 복직, 범위 밖으로 분류 | 고정 평가셋에서 유형별 결과 공개 |
| FR-02 | 필수 조건을 출처와 함께 구조화해 추출 | `core`·`normal_case_assumption`·`override` 구분, 한국어·ISO·점 표기 날짜/기간, 결정적으로 파생한 값의 provenance, 지원 휴직 4종의 유형별 상세 core 자연어 추출·후속 turn 보존, 누락·충돌·변경 조건 표시 |
| FR-03 | 모든 지원 질문에서 레인별 `core`는 재질문·미확인으로 남기고, 제품 계약상 승인된 프로필의 통상 가정만 사실과 분리해 적용 | 질문 또는 안전한 결정적 파생으로 확인한 core 재질문 0건, 지원 휴직 후속 turn의 기존 유형 유실 0건, 미등록 가정 0건, 필수 core를 가정으로 채운 결론 0건, 명시값 우선, 가정값의 질문 확인값·세션 사실 혼입 0건 |
| FR-04 | 기준일에 유효한 문서 버전만 후보로 사용 | 구법·미시행 규정 테스트 통과 |
| FR-05 | 키워드·의미·메타데이터 검색 결합 | Baseline과 동일 평가셋 비교 |
| FR-06 | 조문 문맥, 단서, 부칙, 인용 관계 제공 | 육아는 사유·기간·복직, 질병은 사유·기간·공무상 구분·복직에 필요한 근거 집합을 생성 전에 검증하고 관련 근거 영역과 화면 안 원문 dialog에서 함께 확인 가능 |
| FR-07 | 구조화된 답변·모델 검토 판단·권고 상태·실행 상태 반환 | 첫 claim은 직접적인 `review_position`, 후속 claim은 근거·예외·확인사항으로 분리, claim별 citation allowlist 검증, 모델 권고는 결정적 상태를 더 보수적으로만 변경, 모델 미실행·실패 구분 |
| FR-08 | 개인정보 패턴을 탐지하고 저장을 제한 | 보안 테스트 결과 공개 |
| FR-09 | 변경 조문 diff를 검토 후 반영 | 자동 공개 반영 없이 승인 단계 존재 |
| FR-10 | 채팅을 중심으로 결론·가정·근거·유의사항을 한 사용자 흐름에 제공 | `OPEN_DASHBOARD.html`의 단일 버튼으로 Ollama·local 서버 시작/재사용·포트 선택·화면 이동, 첫 화면은 휴직·복직 범위의 한 문장 안내·질문 입력·compact 예시만 표시, 최대 720px 카드 없는 답변, 누락 core chip, 결론→가정→근거 요약→근거 링크, 중복 개인정보 경고 0건, 데스크톱·모바일 입력창 접근 유지, 화면 안 원문 미리보기, 20분 미사용 모델·서버 종료 계약 통과 |
| FR-11 | 비활성 확장 실험으로 8개 인사 주제 evidence-only 검색 자산을 보존 | 공개 런타임의 `enable_extended_evidence_topics=false`, 범위 밖 상태·인용 0건; 실험 플래그에서만 기존 source·routing 회귀 수행 |
| FR-12 | 제품 local RAG는 합성 fallback 없이 공식 candidate와 질문 기준일의 유효 버전만 사용 | 공식 CASE-B 인용 10건·합성 인용 0건, candidate 승인 전 `REVIEW_REQUIRED`, candidate 부재·stale registry 안전 실패 |
| FR-13 | 비활성 정근수당 연구 레인의 날짜·기간·가정·계산 회귀 자산을 보존 | 공개 런타임에서는 수당 산정을 `INSUFFICIENT_EVIDENCE`로 보류하고, 실험 플래그에서만 현재 질문 날짜 사용·다른 CASE 날짜 누출 0건·결정적 계산 회귀 수행 |

## 6. 필수 입력 스키마

모든 필드를 사용자에게 한 번에 요구하지 않는다. 질문에서 추출하고, 해당 질문의 판단에
필요한 항목만 추가로 묻는다. 다만 입력 부담을 줄인다는 이유로 필수 사실을 정상 상태로
추정하지 않는다.

### 공통 조건 출처 계약

| 상태 | 의미 | 처리 |
|---|---|---|
| `core` | 레인의 분류·시점·적용대상·결론에 반드시 필요한 사실 | 질문에서 확인되지 않으면 재질문 또는 `미확인`; 통상 가정으로 대체 금지 |
| `normal_case_assumption` | 문서화·승인·버전화된 유형별 프로필이 허용한 정상 상태 | 등록 레인에서 미지정 허용 필드에만 임시 적용·표시하되, core 누락 중에는 결론 생성 금지; 확인값·세션 사실 저장 금지 |
| `override` | 사용자가 명시하거나 후속 turn에서 정정한 정상값·예외값 | 통상 가정보다 항상 우선; 해당 가정 제거 후 재계산·추가 질문·보류 |

값의 우선순위는 `override > normal_case_assumption > unknown`이다. 명시값끼리 충돌하면
최근값을 임의 채택하지 않고 충돌을 표시해 `REVIEW_REQUIRED`로 전환한다. 가정에 의존한
결과도 `REVIEW_REQUIRED`보다 낙관적으로 올리지 않는다. 등록된 프로필이 없는 레인이나
필드에는 정상 가정을 적용하지 않는다.

`core`는 질문 원문에서 직접 확인하거나 결정적 날짜 규칙으로 파생할 수 있다. 포함 종료일로
표현된 단일 휴직기간과 완료된 복직 표현이 함께 있고 별도 복직일이 없으면 내부 반개구간의
종료값, 즉 표시 종료일 다음 날을 `reinstatement_date`로 사용하고 provenance를
`derived_leave_period_end`로 남긴다. 이는 통상 가정이 아니다. 기간이 여러 개거나 복직
완료 표현이 없으면 파생하지 않으며, 명시 복직일이 기간 종료와 다르면 충돌로 재질문한다.

다음 값은 지원 유형의 안전한 `normal_case_assumption` 대상이 아니다. 해당 쟁점에
필요한데 질문에서 확인되지 않으면 반드시 재질문하거나 `미확인`으로 남긴다.

| 적용 범위 | 가정할 수 없는 `core` |
|---|---|
| 공통 | 휴직 유형, 질문 기준일, 적용 직군·제도 |
| 육아휴직 | 자녀 생년월일, 동일 자녀 여부처럼 자격·기간을 바꾸는 자녀 사실 |
| 질병휴직 | 공무상·비공무상 질병 여부 |
| 가족돌봄휴직 | 돌봄 대상과 신청자와의 관계 |
| 자기개발휴직 | 자기개발 목적 |
| 기관 규정 | 기관 규정의 존재·확인 여부·상위 규정과의 충돌 상태 |

### 최초 등록 통상 가정 프로필

정근수당은 공통 정책의 유일한 최초 등록 예시다. `regular-service-allowance-normal-v1`은
육아휴직·정근수당 질문으로 분류되면 미지정 허용 필드에 적용해 가정을 먼저 공개할 수
있다. 산정 반기·질문 기준일·복직일·이번 휴직기간의 `core`가 모두 확인되기 전에는
지급률 결론을 만들지 않고 실제 누락값만 묻는다.

| 사용자 표시 묶음 | 프로필 내부 가정 |
|---|---|
| 같은 자녀의 현재·이전 육아휴직 합산이 기본 산입 한도 1년 이내 | `prior_same_child_leave_months=0`을 조건부 계산값으로 사용 |
| 지급기준일 현재 재직하고 봉급 지급 | `salary_on_payment_date=true`; PAY-01 상반기 예시는 7월 1일 |
| 징계·직위해제 등 지급 제외기간이 없고 연봉제 별도 미지급 대상이 아님 | `disciplinary_action_in_period=false`, `other_nonservice_periods=[]`, `annual_salary_exclusion_applies=false` |

실제 적용한 내부 필드만 `assumed_conditions`로 반환한다. 사용자가 예외를 명시하면 해당
필드를 프로필에서 제거하고 나머지 미지정 필드에만 프로필을 계속 적용한다. 이 프로필은
조건부 검토 편의를 위한 제품 계약이며 사실 확인이나 법적 지급 결정이 아니다.

```yaml
employee_system: local_government
employee_category: general_service
topic: appointment | personnel_records | performance_and_promotion | service_and_leave | pay_and_allowance | discipline_and_appeal | training | retirement
review_mode: deep_review | evidence_only
leave_type: parental | medical | family_care | self_development | unknown
reference_date: YYYY-MM-DD
child_birth_date: YYYY-MM-DD | unknown
same_child: true | false | unknown
medical_leave_basis: public_duty | non_public_duty | unknown
care_recipient_relation: string | unknown
application_purpose: string | unknown
previous_leave_periods:
  - start_date: YYYY-MM-DD
    end_date: YYYY-MM-DD
spouse_usage: used | not_used | unknown | not_required
local_rule_checked: true | false  # false는 기관 규정 없음이 아니라 미확인

# regular_service_allowance_review에서만 사용
allowance_type: regular_service_allowance
allowance_period: first_half | second_half
reinstatement_date: YYYY-MM-DD
leave_periods:
  - start_date: YYYY-MM-DD
    end_date: YYYY-MM-DD
prior_same_child_leave_months: integer
salary_on_payment_date: true | false
disciplinary_action_in_period: true | false
other_nonservice_periods: []
annual_salary_exclusion_applies: true | false
child_order: integer | unknown
expanded_parental_leave_eligibility: true | false | unknown
```

공통 필드와 유형별 필드를 한 번에 모두 묻지 않는다. 이 스키마는 법적 요건 그 자체가 아니라 질문 처리용 데이터 계약이며, 실제 필수성은 휴직 유형과 근거가 연결된 버전형 규칙으로 관리한다.

## 7. 답변 계약

```json
{
  "status": "ANSWERABLE | REVIEW_REQUIRED | INSUFFICIENT_EVIDENCE",
  "short_answer": "검토용 요약",
  "confirmed_conditions": [],
  "assumed_conditions": [],
  "assumption_profile_id": "regular-service-allowance-normal-v1 | null",
  "missing_conditions": [],
  "citations": [
    {
      "source_name": "법령명",
      "article_path": "제00조 제0항 제0호",
      "effective_from": "YYYY-MM-DD",
      "source_url": "https://..."
    }
  ],
  "claims": [
    {
      "claim_id": "CLAIM-001",
      "kind": "review_position | basis | exception | next_check",
      "text": "근거 안에서 생성한 검토 의견",
      "citation_ids": ["CITE-001"]
    }
  ],
  "model": {
    "status": "completed | not_run | failed",
    "model_id": "qwen3:4b-instruct",
    "recommended_status": "ANSWERABLE | REVIEW_REQUIRED | INSUFFICIENT_EVIDENCE | null"
  },
  "review_reasons": [],
  "limitations": [],
  "data_as_of": "YYYY-MM-DD"
}
```

## 8. 비기능 요구사항

- 모든 답변은 사용한 데이터 기준일을 표시한다.
- 핵심 결론은 최소 한 개 이상의 정확한 인용에 연결한다.
- 검색 결과가 없거나 상충하면 답변을 보류한다.
- 원문 스냅샷과 파싱 결과의 해시를 기록한다.
- MVP RAG의 생성·임베딩·재랭킹은 loopback 로컬 모델로 실행하며 API key를 요구하지 않는다.
- 로컬 모델은 마지막 추론 후 20분에 자동 언로드하고, 원클릭 대시보드 서버도 실제
  HTTP 활동이 20분 없으면 처리 중 요청을 침범하지 않고 종료한다.
- 제품 `local` profile은 공식 candidate만 사용하고, 합성 corpus는 `offline` 회귀와 adapter smoke로 한정한다.
- 제품 local vector는 lexical shortlist가 아니라 해당 심층 lane의 전체 조문을 BGE-M3로 임베딩한다. 버전·원문 hash·문서 ID가 같은 비제출 cache만 재사용한다.
- 공식 candidate가 사람 승인 전이면 검증된 근거가 있어도 `ANSWERABLE`로 승격하지 않는다.
- 실제 개인정보 입력은 로컬 실행 여부와 관계없이 차단하고 저장하지 않는다.
- 평가 실행은 모델·프롬프트·인덱스 버전을 재현할 수 있어야 한다.
- Web UI는 인라인 스크립트 허용 없이 CSP에서 동작하고, 키보드 탐색·가시적 focus·축소 동작·반응형 배치를 제공해야 한다.
- Web UI는 cool-white canvas, graphite text와 절제된 단일 blue accent를 사용한다.
  assistant 답변은 최대 720px의 열린 본문으로 표시하고, 입력·dialog·보조 영역에만 필요한
  경계를 둔다. 자체 호스팅 LINE Seed Sans KR Regular·Bold를 유지하며 상태·조문·시행일의
  scan path를 색이나 장식에만 의존하지 않는다.

## 9. 성공과 중단 기준

### 성공

- 골든셋에서 검색, 인용, 조건 확인, 보류 성능을 함께 측정한다.
- Baseline 대비 개선의 원인을 ablation으로 설명할 수 있다.
- 공개된 수치는 실행 로그와 평가 결과로 재현 가능하다.

### 출시 보류

- 구법과 현행법 혼용 오류가 남아 있다.
- 존재하지 않는 조문을 인용한다.
- 범위 밖 질문을 지원되는 질문처럼 단정한다.
- 입력 개인정보가 로그 또는 외부 평가 데이터에 남는다.
- 정답 작성자와 시스템 개선자가 분리되지 않아 평가 누수가 심하다.

요구사항별 테스트와 공개 증거는 [요구사항–검증 추적표](TRACEABILITY.md)에서 관리한다.
