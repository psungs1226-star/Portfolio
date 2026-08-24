# 법령 데이터 정의서

## 1. 데이터 원칙

- 공개된 공식 자료만 사용한다.
- 법령을 임의 글자 수로만 자르지 않는다.
- 조문 계층과 단서·부칙·별표 연결을 보존한다.
- 현행 버전으로 과거 버전을 덮어쓰지 않는다.
- 원문, 파싱 결과, 임베딩 인덱스를 구분한다.
- 모든 파생 데이터가 원문 URL과 해시로 추적 가능해야 한다.

## 2. 공식 자료 범위

| 자료 | 역할 |
|---|---|
| 지방공무원법 | 육아·질병·가족돌봄·자기개발 휴직의 법률상 근거 |
| 지방공무원 임용령 | 임용·경력·휴직·복직 관련 세부 기준 |
| 지방공무원 인사제도 운영지침 | 통일적 인사운영 기준과 절차 |
| 지방공무원 인사실무 | 공개 실무 설명·사례의 보조자료 |

넓은 근거 검색 registry는 위 4종에 다음 current 공식 자료를 더한다.

| 인사 주제 | 추가 자료 | 검토 등급 |
|---|---|---|
| 인사기록 | 지방공무원 인사기록·통계 및 인사사무 처리 규칙 | evidence-only |
| 평정·승진 | 지방공무원 평정규칙 | evidence-only |
| 복무·휴가 | 지방공무원 복무규정 | deep-review 보강 |
| 보수·수당 | 지방공무원 보수규정, 지방공무원 수당 등에 관한 규정 | 일반 질문은 evidence-only, 휴직 파생 정근수당 조문만 제한적 deep-review |
| 징계·소청 | 지방공무원 징계 및 소청 규정 | evidence-only |
| 교육훈련 | 지방공무원 교육훈련법, 같은 법 시행령 | evidence-only |
| 퇴직 | 지방공무원 명예퇴직수당 등 지급 규정 | evidence-only |

전체 source contract는 `configs/sources/official-hr-wide.toml`에서 관리한다. source가 registry에 있다는 사실은 원문 승인, 법률 정답성 또는 해당 주제 자동 판단 완료를 뜻하지 않는다.

과거 기준일·지급 기준일 심층 검토용으로 다음 4개 과거 버전을 별도 source로 보존한다.

| 자료 | 유효 시작 | 유효 종료(배타) | 용도 |
|---|---|---|---|
| 지방공무원법 과거 버전 | 2022-12-27 | 2024-09-20 | CASE-B 2024 법률 근거 |
| 지방공무원 임용령 과거 버전 | 2023-06-13 | 2024-06-27 | CASE-B 휴직기간·복직 관련 세부 근거 |
| 지방공무원 인사제도 운영지침 과거 버전 | 2023-12-28 | 2024-06-27 | CASE-B 실무 절차 근거 |
| 지방공무원 보수규정 2026-07-01 버전 | 2026-07-01 | 2026-08-01 | 2026년 상반기 정근수당의 육아휴직 산입 근거 |

`effective_to`가 있는 버전은 `effective_from <= reference_date < effective_to`일 때만
유효하다. current source와 과거 source의 원문 hash·수집시각·source ID를 각각 보존하며,
같은 자료명이라는 이유로 한쪽을 덮어쓰지 않는다.

자치법규와 기관 내부 규칙은 1차 MVP에 자동 포함하지 않는다. 존재 가능성을 표시하고 사람의 확인 대상으로 남긴다.

## 3. 핵심 엔터티

### `source_document`

```yaml
source_id: stable internal id
source_name: 지방공무원법
source_type: law | presidential_decree | ministry_rule | admin_rule | manual
issuer: 발령·소관 기관
official_source_id: 원천 시스템 ID
promulgation_date: YYYY-MM-DD
effective_from: YYYY-MM-DD
effective_to: YYYY-MM-DD | null
retrieved_at: RFC3339 timestamp
source_url: official URL
content_hash: sha256
parser_version: semantic version
topic_domains: [appointment | personnel_records | performance_and_promotion | service_and_leave | pay_and_allowance | discipline_and_appeal | training | retirement]
review_tier: deep_review | evidence_only | metadata_only
```

### `provision`

```yaml
provision_id: stable internal id
source_id: parent source id
article_no: 조 번호
paragraph_no: 항 번호 | null
item_no: 호 번호 | null
subitem_no: 목 번호 | null
title: 조문 제목
text: 원문
proviso_text: 단서 | null
parent_provision_id: 상위 조문 id | null
effective_from: YYYY-MM-DD
effective_to: YYYY-MM-DD | null
applies_to: [local_general_service]
topic_tags: [parental_leave | medical_leave | family_care_leave | self_development_leave, reinstatement]
```

### `relation`

```yaml
from_provision_id: source
relation_type: cites | delegates | exception_to | supplemented_by | attached_table
to_provision_id: target | null
target_text: 원문에 표시된 대상
resolution_status: resolved | unresolved
```

### `supplementary_provision`

부칙은 별도 엔터티로 저장하고 적용례·경과조치·시행일을 검색 대상에 포함한다.

```yaml
supplement_id: stable internal id
source_id: parent source id
type: effective_date | transition | applicability | other
text: 원문
related_provision_ids: []
effective_from: YYYY-MM-DD | null
```

## 4. 청크 전략

검색 단위는 조·항·호·목을 기본으로 하며, 생성 컨텍스트에는 다음을 함께 확장한다.

- 해당 조문 제목과 상위 조문
- 같은 조의 단서
- 직접 연결된 부칙·적용례
- 인용된 조문
- 관련 별표

본문과 예외를 무조건 한 벡터로 합치지 않는다. 각각 검색 가능하게 유지하면서 `parent_provision_id`와 관계 그래프로 묶는다.

제품 local vector는 lexical 상위 후보를 의미 벡터처럼 재사용하지 않는다. 휴직·복직과
휴직 파생 정근수당으로 승인된 lane의 전체 provision을 BGE-M3로 임베딩한다. 비제출
vector cache는 embedding model·version·artifact digest, source hash와 정렬된 provision
ID가 모두 같은 경우에만 읽고, 하나라도 바뀌면 전량 다시 만든다.

## 5. 품질 검사

- 조문 번호 중복과 누락
- 계층의 고아 노드
- 시행일 역전
- 동일 효력기간의 중복 버전
- 원문 대비 파싱 텍스트 해시
- 부칙과 관련 조문의 연결 누락
- 별표 다운로드·변환 실패
- HWP/PDF 텍스트 순서 이상
- 인용 대상 미해결
- registry의 non-metadata source별 검색 가능 provision 1건 이상
- 임용·기록·평정·승진·복무·휴직·보수·징계·교육·퇴직 probe의 topic 분류와 top-5 source 회수

공식 HTML의 `제N조 삭제` 표식은 활성 조문 파싱 실패와 구분해
`DELETED_ARTICLE_TOMBSTONE` 정보 항목으로 기록한다. 자동 품질감사는 원문
manifest·SHA-256·byte count·결정적 재파싱 동일성·계층·relation 대상·단서·핵심
조문 경로를 검사하며, 통과 결과는 법률 내용 정확도나 사람 승인을 뜻하지 않는다.

품질 검사 실패 데이터는 검색 인덱스로 승격하지 않는다.

## 6. 데이터 분리

```text
data/raw/         # 원문 다운로드, Git 제외
data/processed/   # 파싱 결과, Git 제외
data/index/       # 검색 인덱스, Git 제외
data/sample/      # 공개 가능한 소량 샘플
```

현재 로컬 데모의 공식 snapshot·candidate·vector cache는 저장소 밖
`private/legal-wide/` 아래에 두며 공개 제출물에는 원문과 벡터를 복사하지 않는다.

전체 원문을 저장소에 재배포하기 전에 이용조건과 출처표시 요구를 확인한다. 공개 저장소에서는 가능한 한 수집 스크립트, 스키마와 소량 샘플을 제공한다.
