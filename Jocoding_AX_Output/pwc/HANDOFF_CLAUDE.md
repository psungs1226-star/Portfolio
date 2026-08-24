# Handoff To Claude

이 문서는 `/Users/psh/JO_AX/pwc` 작업을 Claude로 이어가기 위한 핸드오프다.

## 절대 지켜야 할 규칙

- `logs/` 아래 파일은 열람, 출력, 요약, 발췌, 편집, 삭제하지 않는다.
- 긴 원문, JSONL, HTML, PDF, 빌드/테스트 전체 로그를 대화에 붙이지 않는다.
- 외부 HTML/PDF는 필요하면 `/tmp`에 저장하고 `rg`/스크립트로 필요한 키워드와 필드만 좁게 확인한다.
- `answer.md`는 최종 답변 초안이 아니라 문항별 메모장이다. 새 판단은 관련 문항 아래 짧은 bullet로 append 한다.
- 기존 `answer.md` bullet은 사용자가 명시적으로 수정/정리/삭제/덮어쓰라고 할 때만 고친다.
- 현재 호칭은 `pipeline/00~06`이 Phase, 각 Phase 아래 `steps/01~`이 Step이다.

## 사용자의 최근 질문에 대한 직접 답

원래 계획은 “1개년도 자료만 모으는 것”이 아니었다.

- Phase 0은 특정 1개년이 아니라 국세법령정보시스템 세법해석정비 공개 목록 전체를 보고, 그중 부가가치세 사례를 필터링해 첫 MVP 쟁점을 고르는 단계다.
- Phase 1은 선택한 법령 개정건에 대해 개정 전/후 조문, 상위법, 위임 시행령, 외부참조, 적용례를 모으는 단계다. 여기서 현재 선택한 개정건이 2024-07-01 시행 개정이라 전후 비교 기준이 2024-02-29와 2024-07-01로 잡힌 것이다.
- 따라서 현재 2024년 중심으로 보이는 이유는 “전체 계획이 1개년도라서”가 아니라 “Phase 1의 특정 개정 이벤트가 2024-07-01 시행 개정이기 때문”이다.

## 프로젝트 목적

AX 해커톤 예선 제출물 준비 공간이다. 큰 문제정의는 삼일PwC/Samil PwC 맥락에서 “세법 개정이 기존 해석례·집행기준·실무지침에 미치는 영향을 선제적으로 찾는 내부용/Tax Agent 보강용 스킬”이다.

현재 1차 MVP는 다음처럼 좁혀졌다.

- 세목: 부가가치세
- 쟁점: 면세/과세구분
- 핵심 문서군: 국세청/국세법령정보시스템의 집행기준
- 해석례: 주 문서가 아니라 정답셋/검증/보조자료
- 제외: 내부지침, 기재부 해석, 기본통칙, 판례, 최종 세무자문
- 출력: “바뀔 가능성이 있는 집행기준/문단과 전문가 검토 질문” 중심의 내부 검토 리스트

## 주요 파일

- `answer.md`: 제출 답변에 쓸 사실/판단 메모. 새로 확인한 내용은 여기에 짧게 append.
- `src/skills/tax-enforcement-standard-impact/SKILL.md`: 스킬 본문. Phase/Step 파이프라인의 상위 지침.
- `src/skills/tax-enforcement-standard-impact/pipeline/00-issue-selection/OUTPUT.json`: Phase 0 완료 산출물.
- `src/skills/tax-enforcement-standard-impact/pipeline/01-law-normalization/OUTPUT.json`: Phase 1 보강 산출물.
- `src/skills/tax-enforcement-standard-impact/pipeline/01-law-normalization/SOURCE_CHECKLIST.md`: Phase 1 반복 실수 방지용 완료 기준.
- `tax_agent_pipeline_worktree.md`: 긴 실행계획 문서.
- `tax_agent_skill_architecture.md`: 아키텍처 설명 문서.
- `.env`: 사용자가 값을 채웠다. 비밀값 출력 금지. 값이 필요한지 여부만 확인한다.

## 현재 완료 상태

### 구조 정리

완료됨.

- 상위 `00~06` 디렉토리는 Phase.
- 각 Phase 아래 `steps/01~`은 Step.
- 상위 문서명은 `PHASE.md`.
- 하위 Step 문서명은 `STEP.md`.
- 기존 `phases/`, `STEP.md` 상위 표기, `Phase 0.1` 같은 표기는 정리됨.

### Phase 0 완료

파일: `src/skills/tax-enforcement-standard-impact/pipeline/00-issue-selection/OUTPUT.json`

공식 출처:

- 국세법령정보시스템 세법해석정비
- URL: `https://taxlaw.nts.go.kr/qt/USEQTE001M.do`

수집/선정 결과:

- 전체 세법해석정비 목록: 996건
- 부가가치세 필터: 183건
- 최종 selected issue: `면세/과세구분`
- score: 609
- total_count: 73
- usable_count: 56
- law_linked_count: 73
- negative_candidate_count: 20
- selected_cases: 10건
- held_cases: 8건

중요한 해석:

- 이전에 `면세/과세구분 51건`이라는 메모가 있는데, 이것은 1차 보수 태깅 결과다.
- 최종 `73건`은 세목 필드가 `부가가치세`인 183건 안에서 `면세/과세구분` 키워드를 넓혀 재점수화한 값이다.
- Phase 0은 특정 연도 제한이 아니라 공개 목록 전체 기준이다.

주의:

- Phase 0 selected/held cases는 Phase 6 검증셋 또는 Phase 2 보조자료로 쓰는 것이 맞다.
- 이 사례들을 Phase 1의 “법령 개정 입력”으로 쓰면 안 된다. 이 실수가 이미 한 번 발생했고 수정했다.

### Phase 1 현재 상태

파일: `src/skills/tax-enforcement-standard-impact/pipeline/01-law-normalization/OUTPUT.json`

상태:

- `completed_with_source_check`
- Phase 2로 넘어갈 수 있는 수준까지 보강됨.
- 다만 외부참조 주택법 원문은 OUTPUT에 요약으로만 들어 있고, 별도 source record로 저장하면 더 좋다.

현재 Phase 1 입력:

- 실제 법령 개정건: 부가가치세법 시행령 제41조
- 쟁점: 토지임대부 분양주택 부수토지 임대용역의 부가가치세 면세
- 상위법: 부가가치세법 제26조 제1항 제12호
- 외부참조: 주택법 제2조 제9호, 제2조 제6호
- 적용시기: 2024-07-01 이후 용역 공급분

확인된 전후 비교:

- 시행령 제41조 전 조문 기준: 2024-02-29 시행, history_id `100000000000260977`, 공포번호 `34270`
- 시행령 제41조 후 조문 기준: 2024-07-01 시행, history_id `100026097720240701`, 공포번호 `34270`
- 상위 부가가치세법 제26조 기준: 2024-07-01 시행, history_id `100025797320240701`, 공포번호 `19931`

확인된 상위법 문구:

- 부가가치세법 제26조 제1항 제12호: “주택과 이에 부수되는 토지의 임대 용역으로서 대통령령으로 정하는 것”

확인된 시행령 전 조문 요지:

- 2024-02-29 시행 제41조는 상시주거용 주택과 그 부수토지의 임대를 면세 범위로 규정하고, 부수토지 면적 기준을 같은 항 안에서 처리했다.

확인된 시행령 후 조문 요지:

- 2024-07-01 시행 제41조는 제1항을 각 호 구조로 바꾸고, 제1항 제2호에 `주택법 제2조제9호에 따른 토지임대부 분양주택(같은 조 제6호의 국민주택규모로 한정한다)에 부수되는 토지의 임대 용역`을 추가했다.
- 제2항은 제1항 적용 시 초과 토지 면적 제외 기준.
- 제3항은 주택과 사업용 건물이 함께 설치된 경우의 임대 범위.

확인된 적용례:

- 부가가치세법 시행령 부칙 제5조: “제41조의 개정규정은 2024년 7월 1일 이후 용역을 공급하는 경우부터 적용한다.”

분류:

- primary_change_type: `Target change`
- secondary_change_types: `Effect impact`, `Timing change`
- confidence: `high_for_decree_change_medium_for_external_reference_summary`

Phase 2 scope hint:

- `부가가치세법 제26조 제1항 제12호`
- `부가가치세법 시행령 제41조 제1항 제1호`
- `부가가치세법 시행령 제41조 제1항 제2호`
- `부가가치세법 시행령 제41조 제2항`
- `부가가치세법 시행령 제41조 제3항`
- `주택법 제2조 제9호`
- `주택법 제2조 제6호`
- 키워드: `토지임대부 분양주택`, `국민주택규모`, `토지임대료`, `주택 임대`, `부수토지`, `면세`, `2024.7.1 이후 공급분`

## 중요한 오류와 수정 내역

### 오류 1: Phase 1 입력을 해석정비 사례로 잘못 잡음

처음에는 Phase 0 selected case 중 `200000000000000130` BTL 사례를 Phase 1 대표 입력으로 삼았다.

그 결과:

- 법령 개정 전후문이 아니라 해석례 전후 결론 변화만 잡힘.
- `부가가치세법 제11조`, `제4조`, `시행령 제46조`, BTL/관리운영권/기부채납 쪽으로 좁아짐.
- 사용자가 “자료가 왜 이렇게 적냐”고 지적.

수정:

- Phase 1은 실제 법령 개정 조문으로 복구.
- 현재는 부가가치세법 시행령 제41조의 2024-07-01 시행 개정을 Phase 1 메인 입력으로 사용.
- BTL 해석정비 사례는 Phase 1 메인이 아니라 Phase 6 검증셋/보조자료로 내려야 한다.

남은 파일:

- `src/skills/tax-enforcement-standard-impact/pipeline/01-law-normalization/OUTPUT_STEPS_1_3.json`은 과거 partial 산출물이다. 지금 메인 산출물로 쓰지 않는다. 필요하면 historical note로만 참고.

### 오류 2: 국세법령정보시스템 액션 순서를 생략함

반복 원인:

- API가 없는 것이 문제가 아니라, 법령 목록 초기화 -> 연혁 선택 -> 본문 액션 순서를 생략하고 요약 자료로 Phase 1을 닫은 것이 문제였다.

확인된 올바른 순서:

1. `ASISTA002MR01`로 법령 목록/기초 정보 초기화.
2. `ASISTA005PR01`로 연혁 목록을 가져와 정확한 effective date와 history id 선택.
3. `ASISTA002MR03`으로 해당 history id의 조문 본문을 가져옴.

부가가치세 법령 식별:

- 부가가치세법: `ntstBscId=100000000000001571`, `ntstSysClCd=01`, `ntstTlawClCd=111`
- 부가가치세법 시행령: `ntstBscId=100000000000003666`, `ntstSysClCd=02`, `ntstTlawClCd=111`, `rfrnNtstBscId=100000000000001571`

주의:

- 처음에 `ntstTlawClCd=306`으로 호출해 연혁이 안 나왔다. 부가가치세 법령 쪽 tax law code는 `111`이었다.
- 법제처 DRF OpenAPI는 현재 사용자 검증 실패 메시지가 나왔다. `OC=test` 호출 결과: 사용자 정보 검증 실패. 따라서 현재는 국세법령정보시스템 액션을 우선 사용.

## 현재 자료가 충분한가

답: Phase 1은 보강되어 진행 가능하지만, 전체 파이프라인 기준으로는 아직 부족하다.

충분한 것:

- Phase 0 쟁점 선정.
- Phase 1의 실제 개정 조문 전후 비교.
- 상위법/시행령/적용례 확인.
- Phase 2로 넘어갈 우선 조문과 키워드.

부족한 것:

- 주택법 제2조 제6호/제9호 원문을 별도 source record로 저장.
- 시행령 제41조 관련 집행기준 본문 수집.
- 세법해석정비 selected cases를 Phase 6 검증셋으로 재배치.
- 신구조문대비표 원문 또는 관보/개정문 원문 추가 확인.
- Phase 2 이후 산출물은 아직 없음.

## 다음 작업 권장 순서

### 1. answer.md에 현재 질문 답 추가

사용자가 “원래 계획이 1개년도만 모으는거였어?”라고 물었다. `answer.md`에는 이미 관련 메모가 있지만, 답변용으로 다음 취지를 짧게 추가하면 좋다.

- 원래 1개년도만 모으는 계획은 아니었다.
- Phase 0은 전체 세법해석정비 목록 기준.
- Phase 1은 선택한 개정 이벤트의 전후 조문 기준이라 현재 2024년 자료가 중심이 된 것.
- Phase 2는 연도보다 관련 집행기준 본문/개정일/조문 연결성이 기준.

### 2. 주택법 제2조 제6호/제9호 원문 source record 추가

현재 `OUTPUT.json`에는 주택법 제2조 제9호가 요약으로만 들어 있다. Phase 3 매칭에서 외부참조가 evidence로 쓰이려면 별도 source record가 더 낫다.

추천 파일:

- `src/skills/tax-enforcement-standard-impact/pipeline/01-law-normalization/EXTERNAL_REFERENCES.json`

필드 예:

```json
{
  "source": "국가법령정보센터",
  "law_name": "주택법",
  "articles": [
    {
      "article_path": "제2조 제6호",
      "role": "국민주택규모 정의",
      "text_or_summary": "..."
    },
    {
      "article_path": "제2조 제9호",
      "role": "토지임대부 분양주택 정의",
      "text_or_summary": "..."
    }
  ]
}
```

### 3. Phase 2 시작

파일 기준:

- `src/skills/tax-enforcement-standard-impact/pipeline/02-enforcement-standard-normalization/PHASE.md`
- `src/skills/tax-enforcement-standard-impact/pipeline/02-enforcement-standard-normalization/MATERIALS.md`
- `src/skills/tax-enforcement-standard-impact/pipeline/02-enforcement-standard-normalization/steps/*/STEP.md`

Phase 2 목표:

- 집행기준이 주 문서군.
- 해석례는 보조/검증.
- `부가가치세법 제26조`, `시행령 제41조`, `토지임대부 분양주택`, `국민주택규모`, `토지임대료`, `부수토지`, `면세` 중심으로 집행기준 본문/문단을 수집.

Phase 2에서 만들 파일 추천:

- `src/skills/tax-enforcement-standard-impact/pipeline/02-enforcement-standard-normalization/OUTPUT.json`

최소 필드:

```json
{
  "phase": "Phase 2",
  "status": "partial|completed_with_hold_flags|completed",
  "primary_scope": {
    "selected_issue": "면세/과세구분",
    "articles": [],
    "keywords": []
  },
  "enforcement_standards": [
    {
      "standard_id": "...",
      "standard_no": "...",
      "title": "...",
      "related_articles": [],
      "rule_text_summary": "...",
      "exception_text_summary": "...",
      "example_text_summary": "...",
      "note_text_summary": "...",
      "source_url_or_action": "...",
      "confidence": "high|medium|low|hold"
    }
  ],
  "supporting_interpretations": [],
  "held_items": []
}
```

### 4. Phase 6 검증셋 재배치

Phase 0 selected/held cases는 Phase 6 validation set으로 내려야 한다.

추천:

- Positive: Phase 0 selected cases 중 전후 doc id가 있는 케이스.
- Hold: before document ID missing cases.
- Negative: 같은 `면세/과세구분` 인접 쟁점이지만 시행령 제41조 토지임대부 주택과 직접 관련 없는 케이스.

## API/액션 메모

### 세법해석정비 목록

공식 화면:

- `https://taxlaw.nts.go.kr/qt/USEQTE001M.do`

확인된 목록 액션:

- `/action.do`
- `actionId=ASIQTF001MR01`
- form-urlencoded 방식
- `paramData`는 JSON 문자열

### 해석문서 상세

상세 팝업:

- `/qt/USEQTA002P.do?ntstDcmId=...`

확인된 상세 액션:

- `ASIQTB002PR01`
- payload 예:

```text
actionId=ASIQTB002PR01
paramData={"dcmDVO":{"ntstDcmId":"200000000000019876"}}
```

### 법령 목록/연혁/본문

기본 화면:

- `https://taxlaw.nts.go.kr/st/USESTA002M.do`

액션:

- 초기화/법령목록: `ASISTA002MR01`
- 연혁: `ASISTA005PR01`
- 본문: `ASISTA002MR03`

중요 식별자:

- 부가가치세법: `ntstBscId=100000000000001571`, `ntstSysClCd=01`, `ntstTlawClCd=111`
- 부가가치세법 시행령: `ntstBscId=100000000000003666`, `ntstSysClCd=02`, `ntstTlawClCd=111`, `rfrnNtstBscId=100000000000001571`

현재 Phase 1에 쓴 history id:

- 법률 2024-07-01: `100025797320240701`
- 시행령 before 2024-02-29: `100000000000260977`
- 시행령 after 2024-07-01: `100026097720240701`

## 최종 제출 답변 관점

최종 제출문에는 너무 많은 내부 디테일을 쓰지 말고 다음 정도로 압축하면 된다.

- 문제: 세법 개정이 기존 집행기준/해석례에 미치는 영향을 사람이 놓치기 쉽다.
- 사용자: 삼일PwC 세무/Tax Agent 운영·검토 담당자.
- 방식: 법령 개정 전후문을 정규화하고, 집행기준을 조문/논리 단위로 매칭해 내부 검토 리스트를 만든다.
- 검증: 세법해석정비 전후 해석례를 정답셋/보조자료로 사용한다.
- 현재 MVP: 부가가치세 `면세/과세구분`, 시행령 제41조 토지임대부 분양주택 부수토지 임대용역 면세 개정.

## 현재 사용자 성향/주의

- 사용자는 자료가 부족하거나 과하게 넓은 것을 싫어한다.
- 사용자는 “원래 계획 대비 지금 수집이 맞는지”를 계속 확인한다.
- 산출물을 완료했다고 말하기 전에, 계획상 완료 기준과 실제 수집 필드를 대조해야 한다.
- “완료” 대신 `partial_hold`, `completed_with_hold_flags`, `completed_with_source_check`처럼 상태를 명확히 써야 한다.
- API 키/환경변수는 과하게 만들지 말 것. 이전에 `.env`를 너무 넓게 만들어 지적받았고, 최소 구성으로 줄였다.

## 마지막 상태 요약

- Phase 0: 완료.
- Phase 1: 보강 완료, `completed_with_source_check`.
- Phase 2: 아직 시작 전.
- Phase 3~6: 아직 실행 전.
- 지금 바로 이어서 할 일: `answer.md`에 “원래 1개년도 계획 아님” 메모를 추가하고, Phase 2 집행기준 수집으로 넘어가거나 주택법 외부참조 source record를 먼저 만든다.
