# 공식 법령 후보 자동 품질감사

## 결론

실제 비제출 원문 snapshot과 promotion candidate를 다시 읽어 결정적 품질검사를
실행했다. 자동 구조 품질은 `passed`이며
12/12개 검사가 통과했다.

이 통과는 파일·파서·계층·관계·단서·핵심 경로의 기계적 일관성에 한정된다.
법률 내용 정확도는 `unmeasured`, 사람 승인은
`pending`, release는 `hold`다.

| 항목 | 실제 결과 |
|---|---:|
| 파싱 provision | 4106개 |
| 부칙 node | 1510개 |
| 치명적 parser 오류 | 0개 |
| 활성 조문 미파싱 warning | 0개 |
| 삭제 조문 tombstone | 24개 |
| 자동 품질검사 | 12/12 통과 |
| 사람 승인자 | 0명 |
| release | `hold` |

## 검사 결과

| 검사 | 결과 |
|---|---|
| `source_snapshot_integrity` | 통과 |
| `selected_source_manifest_hash` | 통과 |
| `deterministic_reparse_equivalence` | 통과 |
| `parser_issue_reproducibility` | 통과 |
| `article_header_coverage` | 통과 |
| `candidate_quality_count_contract` | 통과 |
| `tree_integrity` | 통과 |
| `relation_target_integrity` | 통과 |
| `proviso_extraction_integrity` | 통과 |
| `key_leave_slice_presence` | 통과 |
| `required_topic_coverage` | 통과 |
| `candidate_count_contract` | 통과 |

검사 범위는 source manifest·SHA-256·byte count, 동일 parser 재실행 결과,
조·항·호·목 계층, parent와 relation 대상, 시행기간 형식, `다만,` 단서 추출,
부칙 수, 네 휴직 유형 topic tag, 사전 고정한 핵심 조문 경로의 존재와 최소 marker다.

## 판정 경계

- 24개 항목은 공식 HTML에서 `삭제`라고 명시된 조문 표식으로 재현되어
  `DELETED_ARTICLE_TOMBSTONE` 정보 항목으로 분류했다.
- 활성 조문 형식의 `UNPARSED_ARTICLE`은 0개다.
- marker 검사는 조문 경로와 최소 문자열의 보존 여부만 확인한다. 법률 해석이나
  사례 결론을 채점하지 않는다.
- 독립 검토자가 원문과 본문·단서·부칙을 대조하고 승인 hash를 남기기 전에는
  versioned legal index로 승격하지 않는다.
