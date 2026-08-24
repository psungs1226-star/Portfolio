# 기술 구현 계획

## 1. 목적

이 문서는 인사ON의 제품·안전·평가 계약을 오프라인 합성 MVP에서 로컬 모델 RAG·공식 법령 검증·제한적 pilot까지 옮기는 Harness 경로다.

## 2. 구현 전략

Python 모듈러 모놀리스와 하나의 오프라인 회귀 명령을 유지한다. 평가 계약을 제품 구현 전에 코드로 고정하고, 한국어 법령 검색은 sample spike 결과가 나온 뒤 lexical 구현을 선택한다.

```text
00-foundation-eval
  └─ 01-legal-data
       └─ 02-retrieval-spike
            └─ 03-safe-decision
                 └─ 04-answer-product
                      └─ 05-fixed-eval-release
                           └─ 06-local-model-integration
                                ├─ 07-official-legal-corpus
                                │    └─ 08-independent-legal-evaluation
                                │         └─ 09-controlled-pilot
                                ├─ 10-wide-hr-evidence
                                ├─ 11-design-ab-evaluation
                                └─ 12-official-local-rag
                                     └─ 13-derived-allowance-rag
```

같은 critical path 안의 phase는 순서대로 구현·리뷰한다. phase 10의 넓은 근거 검색과
phase 11의 화면 검증은 phase 06 이후 독립된 공개 포트폴리오 경로이며, 완료해도
phase 07~09의 사람 승인·법률 평가·pilot gate를 통과한 것으로 계산하지 않는다.
phase 12는 phase 06의 로컬 모델과 phase 10의 공식 candidate를 실제 제품 경로에서
결합하되, 승인 전 `ANSWERABLE`을 금지하는 별도 안전 gate다.
phase 13은 실제 시연 질문인 육아휴직 복직자의 정근수당 지급률만 제한적 심층 범위로
추가하고, 전체 vector·시점 선필터·결정적 비율 계산·로컬 설명을 하나의 회귀 계약으로 묶는다.

**현재:** phase 00~06의 23개 step과 phase 07의 공식 source contract·불변
수집 2개 step, phase 10·11의 8개 step, phase 12·13의 8개 step, phase 14의 3개 step과
phase 15의 4개 step까지 총 56/70 step을 완료했다. Qwen3 4B 생성·재랭킹과 BGE-M3 임베딩은
loopback runtime에서 검증했고, 공식 본문도 API key 없이 수집했다. 공식 원문 3종의
4,106 provision 파싱 candidate는 자동 구조 품질감사 12/12, fatal 0, 활성 조문
미파싱 warning 0을 통과했다. 삭제 조문 tombstone 24건도 분리했지만 사람 승인자가
없어 phase 07 step 2에서 blocked다. 이 선행조건 때문에 phase 08·09의 첫 step도
blocked이며 나머지 16개 step은 pending이다. 별도 경로에서는 current 13종과 과거
버전 4종으로 구성한 17개 공식 source 계약, 16개 본문·12,640개 provision 파싱,
8개 주제 routing과 B Case Workbench 반응형 통합을 마쳤다. 공식 CASE-B local smoke는
2024-01-01에 유효한 인용 10건과 합성 인용 0건을 확인했지만, candidate 승인 대기 때문에
`REVIEW_REQUIRED`로 종료한다.
PAY-01 local smoke는 핵심 날짜·기간과 정상 시나리오 가정을 분리한 뒤 6개월·100% 계산,
공식 교차 인용 4건, 합성 인용 0건을 확인했다. 단일 실행이며 법률 정답성이나 P95 근거로 사용하지 않는다.

사람 검토 packet·approval hash validator·승인 후 versioned index builder,
독립 annotation role/split/adjudication validator, legal/pilot release 선행조건 gate와
pilot production 보안·배포 계약은 구현했다. 이 준비 코드의 존재를 사람 승인,
60건 독립 정답셋, 실제 배포 또는 완료된 사용성 세션으로 계산하지 않는다.
최초 candidate diff도 생성했으며 이전 승인본 0건 대비 추가 4,106건·삭제 0건·변경
0건이다. 상세 provision ID는 비제출 경계에 두고 공개에는 집계와 manifest hash만
남겼다.

## 3. Phase 구성

| Phase | Step | 핵심 산출물 | 완료 게이트 |
|---|---:|---|---|
| `00-foundation-eval` | 3 | 패키지, 핵심 타입, eval schema·validator | 오프라인 앱·평가 계약 검사 통과 |
| `01-legal-data` | 3 | 수집, 계층 파서, bitemporal 승인 저장소 | 해시·계층·효력·승격 검사 통과 |
| `02-retrieval-spike` | 3 | lexical 선택 근거, B0/B1/H1, H2/H3 | 같은 sample·top-k에서 재현 |
| `03-safe-decision` | 3 | 개인정보 gate, 조건·재질문, 결정적 규칙 | 누락·과거·범위 밖 안전 전환 |
| `04-answer-product` | 3 | orchestrator, 인용 검증, API·채팅 검토 대시보드 | 세 상태와 CASE-A/B/C·반응형 UI E2E 통과 |
| `05-fixed-eval-release` | 3 | B0~H3 평가, 치명적 gate, 공개 후보 | 고정셋·공개 경계·release 검사 통과 |
| `06-local-model-integration` | 5 | 실제 로컬 generation·embedding·reranker와 RAG | local 합성 smoke·artifact·인용 gate 통과 |
| `07-official-legal-corpus` | 4 | 공식 원문 수집·승인 snapshot·versioned index | 실제 snapshot·사람 승인·index manifest 통과 |
| `08-independent-legal-evaluation` | 4 | 독립 검토 locked set·로컬 모델 ablation | reviewer 분리·fatal 0·legal release gate |
| `09-controlled-pilot` | 4 | 보안 배포·합성 shadow task·공개 증거 | 실제 deployment smoke·완료 세션·public boundary |
| `10-wide-hr-evidence` | 4 | 공식 source·8개 주제 routing | 자동 구조 감사·안전 경계·공개 artifact 통과 |
| `11-design-ab-evaluation` | 4 | 3개 독립 방향·통제 A/B 계약·선택안 rollout | 선택 기록·반응형 렌더·동일 CASE·HTML 정합성 통과 |
| `12-official-local-rag` | 4 | 과거 공식 버전·official-only local RAG·grounding gate·공개 문서 동기화 | 공식 인용만 사용, 승인 전 보수적 상태, UI·문서·평가 정합성 통과 |
| `13-derived-allowance-rag` | 4 | 정근수당 조건·전체 vector·결정 계산·로컬 설명·PAY-01 평가 | 누락 조건 결론 차단, 기준일 교차 근거 4/4, 6개월·100%, 승인 전 보류 |
| `14-general-normal-case-policy` | 3 | 필수 사실·승인 가정·명시 예외 공통 계약, 유형별 경계 회귀, 공통 UI 메타데이터 | 미등록 가정 0, core 대체 0, 명시값 우선, 가정값 세션 비저장 |
| `15-public-demo-integrity` | 4 | 범위 밖 기본 거부, offline 기본 데모, 공개 artifact 화이트리스트, 문서 주장 동기화 | 무신호 질문 보류, Ollama 없이 데모 구동, 대시보드 값 0 방지, 수치 실측 일치 |
| `16-retrieval-evidence` | 8 | distractor corpus, 검색 결함 수정, B0~H4 재측정, 청킹 비교, 질의 변환, 실패 유형 분류 | 달성: B0 Set Recall@5 0.353, 오류 유형 5종 관측 |
| `17-selective-release` | 4 | 선별 공개 목록, README 재작성, 공개 전 전수 검증, 저장소 초기화 | 선별본 단독 구동, 링크 누락 0, 라이선스·포함 범위 사용자 결정 |

전체 계획은 18개 phase·70개 step이다. 이 중 56개는 완료, 3개는 blocked,
16개는 pending이다.

## 4. Critical path와 stretch scope

### 2주 안에 줄이지 않는 것

- 평가 schema·split leakage 검사
- 기준일·적용대상 필터
- 필수 조건 재질문
- source ID·효력·인용 검증
- 개인정보 외부 호출 전 차단
- 답변 보류와 치명적 오류 gate

### Core 완료 후에만 추가

- 실제 로컬 generation·embedding·reranker adapter
- 공식 법령 수집·승인·versioned index
- 독립 법령 정답셋과 legal release gate
- 실제 배포와 합성 과제 기반 shadow usability
- 관리자 동기화 UI
- 전체 운영 대시보드
- 고급 UI motion·장식
- 대규모 vector infrastructure

## 5. 디렉터리 목표

```text
src/insaon/{domain,application,adapters,api,web,evaluation}/
tests/{unit,integration,contract,security,e2e}/
evals/{schemas,samples,private,results,reports}/
data/{raw,processed,index,sample}/
phases/
scripts/
```

원문 전체, index, 잠금 정답과 사람 메모는 공개 저장소에 두지 않는다.

## 6. 결정적 경계

- LLM: 검증된 근거 안에서의 검토 판단·설명과 권고 상태 (상태를 더 보수적으로만 변경)
- 코드: 질문 분류, 조건 추출, 재질문 문구, 날짜·기간, 효력·대상 필터, 누락 필드, source/citation 존재, 출력 schema
- 사람: 모호한 법률개념, 기관 규정 충돌, 최종 자격·처분

모든 요청은 `ANSWERABLE`, `REVIEW_REQUIRED`, `INSUFFICIENT_EVIDENCE` 중 하나로 종료한다.

## 7. 평가를 앞당기는 이유

phase 00에서 case/result schema, CASE-A/B/C seed와 group leakage 검사를 고정한다. 각 후속 phase는 자기 기능의 metric·회귀 fixture를 같은 계약에 추가한다. 최종 phase는 새 평가 체계를 만들지 않고 고정 계약 위에서 B0~H3를 실행한다.

phase 06은 다운로드된 로컬 모델 artifact 연결을 합성 smoke로 검증한다. phase 07은
공식 법령 snapshot과 index, phase 08은 독립 검토 법령 정답성과 로컬 모델 ablation,
phase 09는 제한적 배포와 사용성을 각각 별도 gate로 다룬다.

## 8. Harness 실행

각 step은 읽을 파일, 수정 범위, interface 수준 지시, 실행형 AC와 금지사항을 포함한다.

프로젝트 로컬 `scripts/execute.py`는 Codex/Claude 실행, 최대 3회 재시도, 상태·요약 누적과 코드/메타데이터 분리 커밋을 지원한다. 공개 경계를 보호하기 위해 Git 루트가 `submission/insaon/`과 정확히 일치하지 않으면 실제 실행을 거부한다. 현재는 Git 저장소가 없어 executor의 브랜치·커밋 자동화는 의도적으로 차단되고, 각 step의 acceptance command와 전체 release gate를 직접 실행했다.
