# 공식 법령 corpus 준비 검토

## 결론

Phase 07의 공식 원문 수집과 계층 파싱 dry-run은 실행됐다. 그러나 결과는
`pending_human_approval`이며 검색 index로 승격되지 않았다.

| 항목 | 실제 결과 |
|---|---:|
| 공식 source snapshot | 3개 |
| 파싱 provision | 4106개 |
| 부칙 node | 1510개 |
| 치명적 parser 오류 | 0개 |
| 활성 조문 미파싱 warning | 0개 |
| 삭제 조문 tombstone | 24개 |
| 사람 승인자 | 0명 |
| release | `hold` |

## 불변 source 증거

| Source ID | SHA-256 | 시행일 |
|---|---|---|
| `LAW-LOCAL-OFFICIAL` | `b610461b6e51bdb399391e2b5a918b63efa2d4ab19c188119cb56f5ad4bc4266` | 2026-06-02 |
| `DECREE-LOCAL-APPOINTMENT-OFFICIAL` | `7b25189d399566ff89f2e99f37132f075ec43be00f105e6451ad3210ad652217` | 2026-06-30 |
| `RULE-LOCAL-HR-GUIDE-OFFICIAL` | `ac6f5373a80463c8cb0ee7cb4fb1f5c5fcebd3ba3f431e6f642b80b30162a9ee` | 2026-04-07 |

## parser 정보 항목

| Source ID | 유형 | 건수 |
|---|---|---:|
| `DECREE-LOCAL-APPOINTMENT-OFFICIAL` | `DELETED_ARTICLE_TOMBSTONE` | 11 |
| `LAW-LOCAL-OFFICIAL` | `DELETED_ARTICLE_TOMBSTONE` | 6 |
| `RULE-LOCAL-HR-GUIDE-OFFICIAL` | `DELETED_ARTICLE_TOMBSTONE` | 7 |

24개 항목은 공식 HTML에서 `삭제`라고 명시된 조문 표식으로 재현되어
`DELETED_ARTICLE_TOMBSTONE`으로 분류했다. 활성 조문 형식의
`UNPARSED_ARTICLE`은 0개다. 이 분류와 별개로 승인자는 원문을 다시 열어
조·항·호·목, 단서, 부칙과 휴직 관련 조문을 대조해야 한다.

## 다음 승인 절차

1. 비제출 `private/legal/processed/candidate.json`과 위 source hash를 대조한다.
2. 자동 품질감사 결과와 삭제 조문 tombstone 분류를 확인한다.
3. 육아·질병·가족돌봄·자기개발 휴직 관련 본문·단서·부칙을 원문과 대조한다.
4. 승인자 ID·승인시각·승인 hash를 별도 비제출 승인 기록에 남긴다.
5. 승인 뒤에만 versioned legal index와 Phase 08 독립 평가를 실행한다.

이 결과는 공식 페이지의 수집·파싱 준비 증거이며 법률 정답성이나 최신 법령 보장이 아니다.
