# 시스템 아키텍처

## 설계 원칙

1. 사람의 최종 판단을 보존한다.
2. 법령 시점과 출처를 답변 내용만큼 중요하게 다룬다.
3. 검색, 계산, 생성의 책임을 분리한다.
4. 실패하면 그럴듯한 답변보다 보류를 선택한다.
5. 모델·프롬프트·데이터·규칙 버전을 함께 기록한다.

## 전체 흐름

질문 분류 뒤 처리 레인을 분리한다.

```text
공통: 개인정보 차단 → 대상·업무 분류 → 기준일 확인
  ├─ 지원 범위 밖 → 인용 없이 INSUFFICIENT_EVIDENCE
  └─ 휴직·복직
       ├─ 육아·질병 → 유형별 조건 → 시점·필수 근거 집합 → 심층 검토
       └─ 가족돌봄·자기개발 → 유형별 조건 → 확장 평가
```

공개 런타임은 휴직·복직만 활성화한다. 8개 인사 주제 evidence-only와 정근수당 연구 레인은 회귀 자산으로 보존하지만 `enable_extended_evidence_topics=false`가 기본이며 공개 화면·API에서는 지원 범위 밖으로 보류한다.

레인 선택은 질문에 등장한 단어 하나가 아니라 현재 공개 범위와 구현된 조건·근거 계약을 기준으로 한다. 수당 산정, 승진, 징계, 전보 등은 관련 연구 코드가 있어도 공개 레인으로 승격하지 않는다.

```text
[Web UI]
   │
   ▼
[FastAPI / Request Validation]
   │
   ├─ 개인정보 탐지·차단
   ├─ 세션 조건 상태 관리
   └─ 질문 유형 분류
           │
           ▼
[Condition Extractor]
   ├─ 명시 사실과 provenance 추출·한국어/ISO/점 표기 날짜 정규화
   ├─ 단일 포함 종료기간+완료 복직 표현이면 half-open end를 복직일로 파생
   ├─ 등록 레인이면 승인된 통상 가정을 미지정 허용 필드에만 적용·공개
   └─ core가 없으면 결론 없이 실제 누락값만 재질문·미확인
           │
           ▼
 [Temporal Retrieval]
   ├─ Lexical (`char-ngram-v1`, ADR-0004)
   ├─ Vector Search
   ├─ 적용 대상·기준일 필터
   ├─ 후보 결합
   └─ Reranker
           │
           ▼
 [Context Builder]
   ├─ 조·항·호·목
   ├─ 상위 조문
   ├─ 단서·부칙·별표
   └─ 인용·관련 규정
           │
           ├──────────┐
           ▼          ▼
 [Rule Service]   [LLM Answerer]
   ├─ 날짜 계산     ├─ 근거 내 설명
   ├─ 효력 검사     ├─ 구조화 출력
   ├─ 근무개월·비율 ├─ 계산 경계 유지
   └─ 누락 검사     └─ 불확실성 표시
           └──────────┘
                  │
                  ▼
         [Citation Validator]
                  │
          통과 ───┴─── 실패
           │             │
           ▼             ▼
 [검토용 답변]     [답변 보류/재검토]
```

## 책임 분리

| 컴포넌트 | 담당 | 담당하지 않음 |
|---|---|---|
| Condition Extractor | 질문에서 조건 추출 | 법적 자격 확정 |
| Temporal Retrieval | 기준일에 맞는 후보 검색 | 규정 충돌의 최종 해석 |
| Rule Service | 날짜·기간·누락·효력 계산 | 모호한 법률 개념 판단 |
| LLM Answerer | 검색 근거를 읽기 쉽게 설명 | 근거 밖 사실 생성 |
| Citation Validator | 인용 존재·내용 연결 검사 | 인용의 최종 법적 해석 |
| Human Reviewer | 원문과 기관 규정을 확인해 판단 | 없음 |

### 조건 출처 정책

모든 지원 레인은 조건을 `core`, `normal_case_assumption`, `override`로 구분한다.

```text
명시 사실 추출
→ 레인별 core 완비 검사
   ├─ 누락: 재질문 또는 미확인 상태로 종료
   └─ 완비: 등록된 assumption profile 조회
             ├─ 없음: 확인 사실만으로 검색·검토
             └─ 있음: 미지정 허용 필드에만 normal-case 적용
→ 사용자 후속 명시값은 해당 assumption을 제거하고 override
→ 충돌·기관 규정 미확인·모호한 해석은 REVIEW_REQUIRED
```

우선순위는 `override > normal_case_assumption > unknown`이다. 사용자 명시값은 정상값과
예외값 모두 `override`로 취급하며 프로필이 덮어쓸 수 없다. 가정은 응답의
`assumed_conditions`에만 존재하고 `confirmed_conditions`나 API 세션의
`structured_conditions`에 저장하지 않는다. API의 `assumption_profile_id`는 적용된
profile ID·version을 감사용으로 반환하고 사용자 화면에서는 숨긴다. 가정에 의존한 결과는
`REVIEW_REQUIRED`보다 낙관적으로 승격하지 않는다.

통상 가정 프로필은 기본 거부형 registry다. 새 프로필은 최소한 다음 항목을 문서화하고
회귀 테스트와 사람 승인을 거쳐야 한다.

- profile ID와 version, 적용 review lane
- 선행 `core`와 적용 가능한 필드·정확한 값
- 사용자 표시 문구와 내부 값의 대응
- 명시값 override와 충돌 처리
- 최대 허용 상태, 근거·평가·철회 조건

결정적으로 파생한 `core`는 통상 가정 registry와 분리한다. 점 표기 날짜도 다른 날짜
표현과 같은 값으로 정규화하며, 포함 종료일은 내부 `DateRange.end`에서 다음 날인 반개구간
경계로 저장한다. 단일 휴직기간과 완료된 복직 표현이 있고 명시 복직일이 없을 때만 그
`end`를 `reinstatement_date`로 사용한다. 기간이 여러 개면 현재 기간을 추측하지 않고,
명시 복직일과 종료 경계가 다르면 `CONFLICT`로 재질문한다.

휴직 유형, 질문 기준일, 육아휴직 자녀 생년월일, 질병휴직의 공무상 여부,
가족돌봄휴직의 돌봄관계, 자기개발휴직 목적과 기관 규정 상태는 profile registry에 등록할
수 없는 `core`다. 필요할 때 확인되지 않으면 재질문하거나 `미확인`으로 남긴다. 특히 기관
규정을 수집하지 않았다는 사실을 `기관 규정 없음`으로 변환하지 않는다.

후속 turn에 휴직 유형명이 반복되지 않아도 세션에서 확인된 지원 휴직 유형을 유지한 뒤
자녀 출생일·이전 육아휴직, 공무상 여부, 돌봄 관계, 자기개발 목적을 해당 레인의 core로
추출한다. 자녀 출생일, 휴직기간 시작·종료일, 복직일처럼 의미가 붙은 날짜는 질문
기준일 후보에서 제외하고 기존 `reference_date`를 덮어쓰지 않는다.

공식 심층 검토는 `주질의 검색 → 유형별 보강 질의 → 기준일·대상 필터 → 필수 근거 집합
검증 → 관련 단서·부칙 확장 → 생성` 순서를 따른다. 육아는 사유·기간과 복직 질문의 복직
근거, 질병은 사유·기간·공무상 구분과 복직 질문의 복직 근거가 모두 있어야 한다. 하나라도
없으면 인용 없이 `INSUFFICIENT_EVIDENCE`로 종료하고 모델을 호출하지 않는다. 합성 회귀
fixture는 제품 법령 corpus가 아니므로 이 공식 candidate gate와 별도 계약으로 평가한다.

### 검토 깊이 계약

| 등급 | 허용 동작 | 금지 동작 |
|---|---|---|
| `deep_review` | 조건 재질문, 기준일·대상 필터, 인용 검증, 구조화 검토 답변 | 최종 처분 자동 확정 |
| `evidence_only` | 관련 공식 조문 후보, 시행일, 출처와 확인 항목 제시 | 자격·금액·처분·결과 단정 |
| `metadata_only` | 자료명·발행기관·공식 링크 안내 | 본문 근거처럼 인용 |

## 검토 대시보드

Jinja2 Web UI는 별도 관리 콘솔이 아니라 챗봇과 결합된 인사담당자 검토 작업대다.

```text
[대화: 질문 → 결론 → 가정 한 줄 → 근거 요약 → 관련 근거 링크]
                         │
                         └── [근거·유의사항: 조문 요약 → 화면 안 원문 미리보기]
```

- 채팅은 기존 review API의 session ID를 사용하며, 브라우저에도 현재 세션 외의 질문 원문 이력을 영구 저장하지 않는다.
- 최초 질문 전에는 빈 근거 영역을 숨겨 채팅 입력을 우선하고, 첫 응답 뒤 구조화 결과와
  함께 근거·유의사항 영역을 표시한다. assistant 응답은 카드 컨테이너 없이 최대 720px의
  열린 본문으로 읽히게 한다.
- 조건·근거 패널은 API가 반환한 구조화 필드만 표시하고 별도 결론을 계산하지 않는다.
- 모든 통상 가정은 질문에서 확인한 조건과 다른 상태로 표시한다. 현재 최초 등록 프로필인
  정근수당은 사용자 화면에서 `같은 자녀 육아휴직 1년 이내`, `지급기준일 재직·봉급 지급`,
  `지급제외조건(징계 등) 없음` 세 묶음으로 줄여 표시한다. PAY-01 상반기 예시에서
  지급기준일은 7월 1일이다. 내부 구조화 필드는 그대로 유지하고 세션의 확인 사실로
  저장하지 않는다.
- 가정 기반 결과는 `REVIEW_REQUIRED`보다 낙관적으로 표시하지 않고, 가정과 실제가 다르면
  실제 조건으로 다시 질문하라는 경계를 답변 본문에 둔다.
- 핵심 조건이 누락된 답변은 긴 조건 목록 대신 compact chip으로 후속 입력을 돕는다. 정상
  답변은 첫 `review_position`을 결론으로 표시한 뒤 가정 한 줄, 첫 `basis` 요약, 관련 근거
  링크 순서로 배치한다. 모델 실행 상태는 사용자가 조치해야 하는 오류일 때만 안내하고 내부
  상태명은 기본 화면에서 감춘다.
- 모델은 `ANSWERABLE`·`REVIEW_REQUIRED`·`INSUFFICIENT_EVIDENCE`를 권고할 수 있지만,
  결정적 조건·시점·인용 gate가 만든 상태를 더 낙관적으로 올릴 수 없다. 모델 권고가 더
  보수적일 때만 최종 제품 상태를 낮춘다.
- 운영 품질 집계는 API와 공개 artifact에 유지하되 사용자 챗봇 화면의 기본 탐색에서는 제거한다.
- `원문 확인`은 화면 안 dialog에 citation 발췌·출처·조문·시행일을 먼저 보여주고,
  공식 법령 URL은 사용자가 명시적으로 선택하는 보조 동작으로 둔다.
- CSS와 JavaScript는 same-origin 정적 파일로 분리해 production CSP에서 인라인 실행을 허용하지 않는다.
- 공식 corpus 승인 대기, 법률 정확도 미측정과 release `HOLD`를 성공 상태와 시각적으로 구분한다.
- 대표 CASE는 질문 예시로만 제공하고 데모 검증 가이드·세션 ID·모델 ID·품질 탭처럼
  사용자 과업과 직접 관련 없는 운영 정보는 기본 화면에서 제거한다.
- 화면 topology는 채팅을 주 열로, 근거·유의사항을 보조 열로 사용한다. 좁은 화면에서는
  대화 다음에 근거가 오는 1열 흐름으로 바꾸고 입력창을 화면 폭 안에 유지한다.
- cool-white surface, graphite text와 절제된 단일 blue accent를 공통 token으로 사용한다.
  LINE Seed Sans KR Regular·Bold는 외부 CDN 없이 same-origin 정적 자산으로 제공한다.

### 로컬 원클릭 진입

일반 HTML은 브라우저 보안상 로컬 Python 프로세스를 직접 실행할 수 없다. macOS 데모는
이 제약을 숨기지 않고 다음 로컬 런처 경계를 사용한다.

```text
OPEN_DASHBOARD.html의 단일 버튼
→ insaon:// URL scheme
→ 저장소 안의 InsaON Launcher.app
→ Ollama loopback·qwen3·bge-m3 확인 및 필요 시 기동
→ official registry와 candidate source 집합 비교, 필요 시 exact source 재수집·재파싱
→ local profile 인사ON 서버 탐색
→ 없으면 8000~8009 중 빈 포트에서 백그라운드 시작
→ 기본 브라우저로 실제 대시보드 이동
→ 마지막 실제 HTTP 활동 20분 뒤 대시보드 서버 graceful shutdown
```

- 런처는 앱 위치에서 프로젝트 경로를 계산하며 사용자 절대경로를 포함하지 않는다.
- 8000번에 local profile 인사ON 서버가 있으면 새 프로세스를 만들지 않고 재사용한다.
- offline profile 서버는 실제 모델 실행으로 오해하지 않게 다른 빈 포트에서 local 서버를 연다.
- local profile은 공식 candidate가 없거나 registry보다 오래됐을 때 합성 fallback으로 서버를 열지 않는다.
- 다른 프로그램이 포트를 사용하면 다음 빈 포트를 선택한다.
- 질문 원문, API key와 외부 endpoint를 런처가 읽거나 기록하지 않는다.
- `/healthz`·`/readyz`를 제외한 마지막 HTTP 활동 뒤 20분이 지나면 런처가 시작한
  대시보드 서버를 스스로 종료한다. 처리 중인 요청이 있으면 종료하지 않는다.
- 생성·임베딩·재랭킹 요청은 각각 Ollama `keep_alive=20m`를 사용해 마지막 추론 뒤
  모델을 자동 언로드한다. 공유 가능성이 있는 Ollama 서버 프로세스 자체는 종료하지 않는다.
- URL handler가 등록되지 않은 새 macOS 환경은 `InsaON Launcher.app` 또는
  `OPEN_DASHBOARD.command`를 한 번 열어 등록한다. 이후 HTML 버튼만 사용한다.

## 법령 우선순위 취급

`normative_level`은 검색·표시 메타데이터로 사용하되, 단순 숫자 점수로 규정 충돌을 자동 해결하지 않는다. 동일 사안을 다르게 규정하거나 기관별 규정이 누락되면 `REVIEW_REQUIRED`로 전환한다.

## 시간 모델

최소 두 시간을 구분한다.

- `valid_time`: 규정이 현실에서 효력을 가지는 기간
- `system_time`: 시스템이 해당 버전을 수집·수정한 시각

질문 기준일은 `valid_time`으로 필터링하고, 재현성과 감사에는 `system_time`을 사용한다. 공포일과 시행일이 다르면 시행일을 우선 적용하되 부칙의 별도 적용례를 함께 검사한다.

검색 후보의 `top-k` 절단은 source와 `valid_time` 필터 뒤에 수행한다. 질문 기준일에
유효한 과거 버전이 후보군에 있으면 미래 버전보다 순위가 낮아도 먼저 제거되지 않아야
한다. 연결된 corpus에 유효 버전이 전혀 없으면 `invalid_effective_version`으로 보류하고
현재 버전이나 합성 조문을 대신 노출하지 않는다.

H2/H3는 lexical·vector가 반환한 해당 lane 전체 후보에서 source, topic, `valid_time`,
적용대상을 먼저 제거한 다음 `top-k`를 자른다. 과거 유효 조문이 101위 아래에 있어도
고정 shortlist 때문에 사라지지 않는 회귀 테스트를 둔다. Vector 검색도 lexical 상위
48개만 임베딩하지 않고 심층 lane 전체 353개 조문을 독립적으로 임베딩한다. 최초 생성한
vector는 모델·embedding version·원문 hash·provision ID로 키를 만든 비제출 cache에
저장하고, 같은 키일 때만 재사용한다.

제품 `local` profile은 이 시간 필터와 유형별 필수 근거 gate를 통과한 공식
`deep_review` 휴직·복직 조문만 모델에 전달한다.
현재 registry에는 CASE-B의 2024-01-01을 재현하기 위한 지방공무원법·임용령·인사운영지침
과거 버전 3종이 별도 source ID로 들어 있다. 각 종료일은 `effective_to`의 배타 경계로
보존한다. candidate 승인 전에는 citation 검증까지 통과해도 최종 상태를
`candidate_corpus_unapproved` 사유의 `REVIEW_REQUIRED`로 낮춘다.

### 비활성 연구 프로필: 휴직 파생 정근수당

아래 레인은 공개 MVP에서 비활성화되어 있으며 날짜·기간·가정 엔진의 회귀 연구에만 쓴다.

```text
"2026-04-01 육아휴직 복직자, 2026년 상반기 정근수당 100%/50%?"
→ 상반기 지급 기준일을 2026-07-01로 변환
→ 이번 휴직기간이 없으면 재질문
→ profile `regular-service-allowance-normal-v1` 선행 core 완비 검사
→ 미지정 필드에 같은 자녀 기본 산입 한도 내·지급기준일 재직/봉급·지급 제외 없음 가정 표시
→ 정근수당 제6조제1항제2호·제2항, 보수규정 제14조제3호의2, 제19조제10항 검색
→ Rule Service가 산입 휴직 + 복직 후 근무를 합쳐 0~6개월과 지급률 계산
→ Qwen은 계산값을 바꾸지 않고 근거와 확인 경계만 설명
→ citation·효력·candidate 승인 gate
```

100%·50%는 근무연수별 정근수당액에 곱하는 산정 비율이다. 원화 금액이나 실제 지급
결정은 만들지 않는다. 사용자가 같은 자녀 총 육아휴직이 기본 1년을 넘는다고 입력하면
그 명시값을 `override`로 유지해 해당 정상 가정을 제거하고 자녀 순서와 1년 6개월 확대
요건을 추가로 묻는다. 이 프로필은 다른 휴직·복직 질문에 정상값을 자동 확장하는 근거가
아니다.

## 업데이트 정책

MVP에서는 매일 자동 공개 반영보다 다음 흐름을 사용한다.

```text
수동 동기화
→ 원문 해시 비교
→ 변경 조문과 부칙 diff
→ 파싱 검증
→ 원문·재파싱·계층·관계·단서 자동 품질감사
→ 관리자 승인
→ 변경 조문 재색인
→ 평가 회귀 테스트
→ 검색 버전 승격
```

자동 수집 결과가 바로 사용자 답변에 반영되지 않게 해 잘못된 파싱의 확산을 막는다.

현재 candidate에는 별도 비제출 사람 검토 packet과 approval template을 생성한다.
승인 기록은 candidate·자동 audit·source manifest·parser hash, 독립 reviewer ID,
전 항목 checklist와 원문 대조 attestation이 모두 일치해야 유효하다. 모델·자동화 도구는
reviewer ID나 attestation을 대신 작성하지 않는다. 승인 뒤에는 같은 provision ID
집합의 lexical terms와 BGE-M3 embedding이 모두 존재할 때만 versioned legal index
manifest를 만들며, 누락·hash drift 시 기존 active version을 유지한다.

## 관찰 가능성

질문 원문 대신 합성 ID 또는 비식별 이벤트를 기록한다.

- request ID
- 질문 유형
- 추출된 필드명과 누락 필드명
- 검색 버전과 후보 문서 ID
- 모델·프롬프트·규칙 버전
- 상태값과 보류 사유
- 단계별 latency와 토큰 사용량

## 로컬 모델 runtime 경계

ADR-0006에 따라 실제 RAG 모델 경로는 Ollama loopback에서 실행한다.

- `offline`은 결정적 회귀, `local`은 실제 모델 통합 profile이다.
- 원클릭·일반 preview의 기본값은 `local`이고 `offline`은 `--profile offline`으로만 선택한다.
- 생성·재랭킹은 `qwen3:4b-instruct`, 임베딩은 1024차원 `bge-m3:latest`다.
- transport는 Ollama loopback인 `127.0.0.1:11434`만 허용하고 외부 추론 egress를 차단한다.
- 모든 모델 호출의 `keep_alive`는 20분으로 고정해 미사용 모델이 GPU·메모리에 남지 않게 한다.
- 모델 tag와 함께 artifact SHA-256, prompt·embedding·reranker·index version을 기록한다.
- local factory는 privacy·조건 gate 뒤에 query embedding→temporal filter→reranker→규칙→generation→citation 검증을 연결한다.
- CASE-A/C와 개인정보 입력의 request-time 모델 호출은 0건이어야 한다.
- structured output 성공 뒤에도 후보 집합·schema·citation allowlist를 결정적 코드로 재검사한다.
