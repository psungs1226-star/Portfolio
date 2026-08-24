# 공식 자료와 출처

확인 기준일: **2026-08-04**

법령과 행정규칙은 계속 개정될 수 있다. 이 문서는 프로젝트 근거 목록이며 실제 질문 처리 시점의 유효 규정은 다시 조회해야 한다.

## 1. 공식 원천

| ID | 자료 | 용도 | 상태 |
|---|---|---|---|
| SRC-01 | [국가법령정보 공동활용 Open API 가이드](https://open.law.go.kr/LSO/openApi/guideList.do) | 법령·연혁·조문·행정규칙·자치법규 API 범위 확인 | 확인 |
| SRC-02 | [Open API 활용방법](https://open.law.go.kr/LSO/openApi/openApiManual.do) | 조문·부칙·별표·인용 관계 응답 구조 확인 | 확인 |
| SRC-03 | [지방공무원법](https://www.law.go.kr/LSW/lsInfoP.do?ancYnChk=0&chrClsCd=010202&efYd=20260602&lsiSeq=286499&urlMode=lsInfoP) | 휴직의 법률상 근거 | 확인 |
| SRC-04 | [지방공무원 임용령](https://www.law.go.kr/LSW/lsInfoP.do?lsId=005050&urlMode=lsInfoP) | 임용·경력·휴직 세부 기준 | 확인 |
| SRC-05 | [지방공무원 인사제도 운영지침](https://www.law.go.kr/LSW/admRulInfoP.do?admRulSeq=2100000277056) | 지방공무원 인사운영 기준과 절차 | 확인 |
| SRC-06 | [행정안전부 지방공무원 인사실무](https://www.data.go.kr/data/15038527/fileData.do) | 공개 실무 설명·사례의 보조자료 | 확인 |
| SRC-07 | [생성형 AI 개발·활용을 위한 개인정보 처리 안내서 발표](https://pipc.go.kr/np/cop/bbs/selectBoardArticle.do?bbsId=BS074&mCode=C020010000&nttId=11410) | 개인정보 처리와 안전조치 검토 | 확인 |
| SRC-08 | [Ollama 로컬 API](https://docs.ollama.com/api/introduction) | loopback model runtime 계약 | 확인 |
| SRC-09 | [Ollama structured outputs](https://docs.ollama.com/capabilities/structured-outputs) | 생성·재랭킹 JSON schema 출력 | 확인 |
| SRC-10 | [Qwen3 4B GGUF 모델 카드](https://huggingface.co/Qwen/Qwen3-4B-GGUF) | 로컬 다국어 생성·재랭킹 모델 | 확인 |
| SRC-11 | [BAAI BGE-M3 모델 카드](https://huggingface.co/BAAI/bge-m3) | 로컬 다국어 1024차원 임베딩 | 확인 |
| SRC-12 | [지방공무원 수당 등에 관한 규정(2026-07-01 시행)](https://www.law.go.kr/LSW/lsInfoP.do?ancYnChk=0&chrClsCd=010202&efYd=20260701&lsiSeq=287339&urlMode=lsInfoP) | 정근수당 지급대상·실제 근무기간·연봉제 제외 | 확인 |
| SRC-13 | [지방공무원 보수규정(2026-07-01 시행)](https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=287049) | 육아휴직 산입기간의 질문 기준일 버전 | 확인 |

### 넓은 인사규정 검색 registry

`configs/sources/official-hr-wide.toml`은 current 자료 13종과 기준일 재현용 과거 버전 4종, 총 17개 source를 keyless exact allowlist로 선언한다. 네 번째 과거 버전은 2026-07-01~2026-08-01 효력의 지방공무원 보수규정이다. `확인`은 공식 페이지와 source metadata를 확인했다는 뜻이며, 사람 승인이나 검색 품질 완료를 뜻하지 않는다.

| 주제 | 공식 자료 | 검토 등급 |
|---|---|---|
| 공통·임용 | 지방공무원법, 지방공무원 임용령, 지방공무원 인사제도 운영지침 | deep-review |
| 인사기록 | 지방공무원 인사기록·통계 및 인사사무 처리 규칙 | evidence-only |
| 평정·승진 | 지방공무원 평정규칙 | evidence-only |
| 복무·휴가 | 지방공무원 복무규정 | deep-review 보강 |
| 보수·수당 | 지방공무원 보수규정, 지방공무원 수당 등에 관한 규정 | 일반 질문 evidence-only, 육아휴직 파생 정근수당만 제한적 deep-review |
| 징계·소청 | 지방공무원 징계 및 소청 규정 | evidence-only |
| 교육훈련 | 지방공무원 교육훈련법, 지방공무원 교육훈련법 시행령 | evidence-only |
| 퇴직 | 지방공무원 명예퇴직수당 등 지급 규정 | evidence-only |
| 실무 보조 | 행정안전부 지방공무원 인사실무 metadata | metadata-only |
| 과거 기준일 | 2024 CASE-B용 3종과 2026-07-01 정근수당용 보수규정 1종 | deep-review·CASE-B/PAY-01 |

현재 wide registry 17개는 공식 endpoint 접근을 확인했고 비제출 경계에 불변 snapshot을
저장했다. 이 중 본문 16종을 12,640개 provision·5,777개 부칙 candidate로 파싱해 자동
구조 감사 12/12를 통과했다. 실무자료 1종은 계약대로 metadata-only다. 사람 승인과
독립 주제별 검색 평가는 아직 완료되지 않았다.

### 2026-07-29 실제 수집 기록

- `configs/sources/official-mvp.toml`은 법령·대통령령·행정규칙의 국가법령정보센터 본문
  URL과 공공데이터포털 실무자료 메타데이터 URL을 exact HTTPS allowlist로 고정한다.
- 공개 페이지 수집 경로는 API key를 사용하지 않는다. Open API는 향후 구조화 연혁
  수집 선택지이며 현재 공식 snapshot 완료의 필수조건이 아니다.
- 원문 body와 전체 파싱 candidate는 비제출 `private/legal/`에 저장하고 공개 영역에는
  source ID·URL·수집시각·SHA-256·집계만 남긴다.
- 공식 본문 3종에서 4,106 provision과 1,510 부칙 node를 파싱했으나 사람 승인은
  완료되지 않았다. [공식 corpus 준비 검토](../evals/reports/official-corpus-readiness.md)에
  fatal 0·활성 warning 0·삭제 조문 tombstone 24와 `hold` 사유를 공개한다.
- [자동 품질감사](../evals/reports/official-corpus-quality.md)는 원문 hash·byte·재파싱·
  품질 집계·계층·관계·단서·핵심 경로 12/12 통과를 기록하지만 법률 정답성 증거로 사용하지 않는다.

### 2026-08-04 통합 인사규정·과거 버전 수집 기록

- `configs/sources/official-hr-wide.toml`의 17개 공식 source에 접근했고 16개 본문과
  metadata-only 실무자료 1개를 비제출 경계에 보존했다.
- 16개 본문에서 12,640개 provision과 5,777개 부칙 candidate를 만들었고 자동 구조 감사
  12/12, fatal 0, warning 0을 기록했다. 원문이 `삭제`로 표시한 조문 72건은 정보성
  tombstone으로 분리했다.
- 2024-01-01 CASE-B에 사용할 세 과거 source는 각각 종료일을 가진 별도 버전이다.
  local 제품 smoke에서 공식 인용 10건, 합성 인용 0건을 확인했다.
- PAY-01은 2026-07-01 보수규정 버전과 수당규정을 교차 검색해 핵심 날짜·기간과 정상
  시나리오 가정을 분리하고, 실제 근무기간 6개월·100%, 공식 인용 4건과 합성 인용 0건을 확인했다.
- 이 결과는 source 접근·파싱·주제 routing 계약의 증거다. 사람 승인, 질문 기준일별
  법률 정답성이나 실제 검색 품질을 증명하지 않는다.

## 2. 확인된 기획 근거

- 공동활용 API는 현행법령뿐 아니라 법령 연혁, 변경이력, 일자별·조문별 개정 이력, 행정규칙과 자치법규 관련 API를 제공한다.
- 본문 조회에서는 기본정보, 조문, 부칙, 별표와 이미지·파일 링크를 확인할 수 있다.
- 지방공무원 인사실무 자료는 임용, 인사관리, 성과관리, 신분·권익보장과 사례·질의응답을 다루는 공개 실무자료다.
- 2026년에도 지방공무원법, 지방공무원 임용령, 인사제도 운영지침의 개정이 확인되므로 데이터 기준일과 버전 관리는 선택 기능이 아니다.
- 공동활용 서비스는 이용 신청, 출처 표시, 호출 제한과 데이터 정확성 확인에 관한 주의사항을 확인해야 한다.
- Ollama 로컬 API는 기본적으로 `localhost:11434`에서 실행되고 로컬 endpoint에는 인증이 필요하지 않는다.
- Qwen3 4B와 BGE-M3의 일반 모델 카드 성능을 인사ON의 법령 성능으로 사용하지 않는다. 선택은 M3 16GB 재현 가능성과 실제 local smoke에 근거하며 법령 품질은 독립 holdout에서 별도 측정한다.

## 3. 출처 사용 규칙

- 법적 근거는 가능한 한 법령·행정규칙 원문을 1차 출처로 사용한다.
- 실무책자와 안내서는 설명 보조자료로 사용하고 법령을 대체하지 않는다.
- 자치법규·행정규칙의 정확성은 필요하면 소관 기관 원문과 대조한다.
- 수집 시각, 공식 source ID, URL과 콘텐츠 해시를 저장한다.
- 외부 자료의 효과 수치를 로컬 시스템 성과처럼 사용하지 않는다.
