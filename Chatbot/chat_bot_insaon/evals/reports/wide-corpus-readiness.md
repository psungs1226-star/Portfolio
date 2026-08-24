# 공식 법령 corpus 준비 검토

## 결론

Phase 10·12·13의 공식 원문 수집과 계층 파싱 dry-run은 실행됐다. 그러나 결과는
`pending_human_approval`이며 검색 index로 승격되지 않았다.

| 항목 | 실제 결과 |
|---|---:|
| 공식 source snapshot | 16개 |
| 파싱 provision | 12640개 |
| 부칙 node | 5777개 |
| 치명적 parser 오류 | 0개 |
| 활성 조문 미파싱 warning | 0개 |
| 삭제 조문 tombstone | 72개 |
| 사람 승인자 | 0명 |
| release | `hold` |

## 불변 source 증거

| Source ID | SHA-256 | 시행일 | 효력 종료(미포함) |
|---|---|---|---|
| `LAW-LOCAL-OFFICIAL` | `b610461b6e51bdb399391e2b5a918b63efa2d4ab19c188119cb56f5ad4bc4266` | 2026-06-02 | 현행 |
| `DECREE-LOCAL-APPOINTMENT-OFFICIAL` | `7b25189d399566ff89f2e99f37132f075ec43be00f105e6451ad3210ad652217` | 2026-06-30 | 현행 |
| `RULE-LOCAL-HR-GUIDE-OFFICIAL` | `ac6f5373a80463c8cb0ee7cb4fb1f5c5fcebd3ba3f431e6f642b80b30162a9ee` | 2026-04-07 | 현행 |
| `LAW-LOCAL-OFFICIAL-20221227` | `be99a77dfedeed910b4d29268ec554c2e7a7f9aeda2e36c098a5ac1287afea72` | 2022-12-27 | 2024-09-20 |
| `DECREE-LOCAL-APPOINTMENT-OFFICIAL-20230613` | `edaf5736b61fbf51197f768513322f447226a9e5347b60ce120b28d6e271f5de` | 2023-06-13 | 2024-06-27 |
| `RULE-LOCAL-HR-GUIDE-OFFICIAL-20231228` | `45a5c90fa143bce0a47993953015da6bae87c2c680585d69c0910ff20657ba72` | 2023-12-28 | 2024-06-27 |
| `RULE-LOCAL-PERSONNEL-RECORDS-OFFICIAL` | `c8a7c8a6efb5755e2069f6f8a786aedbbb662c9893cf33a71b6b18009905e376` | 2022-01-13 | 현행 |
| `RULE-LOCAL-PERFORMANCE-OFFICIAL` | `44d84ab08f4fd57cc3164007e6c48d7ac4877d487c40d9bdcf63842a9d271b59` | 2026-06-30 | 현행 |
| `DECREE-LOCAL-SERVICE-OFFICIAL` | `7911eaf86786e22c62fc3630b9bba7875e9a0412896638f6696d3c78e2bb8761` | 2026-06-23 | 현행 |
| `DECREE-LOCAL-PAY-OFFICIAL` | `badc782626e9384a89457dbe1c22e6d11cf8589232ae62d9f269d3317d003b11` | 2026-08-01 | 현행 |
| `DECREE-LOCAL-PAY-20260701-OFFICIAL` | `201d81a81456333b81c3e28d3ced3f57c9788f93fdc322be78a08844477f3444` | 2026-07-01 | 2026-08-01 |
| `DECREE-LOCAL-ALLOWANCE-OFFICIAL` | `a4e849fd80f47a5542e8ea01a97b8793ad060bbd4faf9f2c483bf8c67f06a1c8` | 2026-07-01 | 현행 |
| `DECREE-LOCAL-DISCIPLINE-OFFICIAL` | `53df80b5eb533b7bdfa0c45a96256ba64b51e3c5ee5d327ec46cbed5669a2fb0` | 2025-07-01 | 현행 |
| `LAW-LOCAL-TRAINING-OFFICIAL` | `1bf15fffcd77593e1c111cd5ebb9052bed6c19253af570ad599aa8fb8bbf2002` | 2022-01-13 | 현행 |
| `DECREE-LOCAL-TRAINING-OFFICIAL` | `7abf1a80714b510efdb9e9d1ea9b7c9771b6a63d06ddf11756fff386395803dd` | 2022-01-13 | 현행 |
| `DECREE-LOCAL-RETIREMENT-ALLOWANCE-OFFICIAL` | `f4bc56ad1d5ea2e114bd1c8428ca0e048fc64adc13ab7ead24581fa2afe693a1` | 2024-01-02 | 현행 |

## parser 정보 항목

| Source ID | 유형 | 건수 |
|---|---|---:|
| `DECREE-LOCAL-ALLOWANCE-OFFICIAL` | `DELETED_ARTICLE_TOMBSTONE` | 10 |
| `DECREE-LOCAL-APPOINTMENT-OFFICIAL` | `DELETED_ARTICLE_TOMBSTONE` | 11 |
| `DECREE-LOCAL-APPOINTMENT-OFFICIAL-20230613` | `DELETED_ARTICLE_TOMBSTONE` | 12 |
| `DECREE-LOCAL-DISCIPLINE-OFFICIAL` | `DELETED_ARTICLE_TOMBSTONE` | 1 |
| `DECREE-LOCAL-PAY-20260701-OFFICIAL` | `DELETED_ARTICLE_TOMBSTONE` | 3 |
| `DECREE-LOCAL-PAY-OFFICIAL` | `DELETED_ARTICLE_TOMBSTONE` | 3 |
| `LAW-LOCAL-OFFICIAL` | `DELETED_ARTICLE_TOMBSTONE` | 6 |
| `LAW-LOCAL-OFFICIAL-20221227` | `DELETED_ARTICLE_TOMBSTONE` | 6 |
| `RULE-LOCAL-HR-GUIDE-OFFICIAL` | `DELETED_ARTICLE_TOMBSTONE` | 7 |
| `RULE-LOCAL-PERFORMANCE-OFFICIAL` | `DELETED_ARTICLE_TOMBSTONE` | 11 |
| `RULE-LOCAL-PERSONNEL-RECORDS-OFFICIAL` | `DELETED_ARTICLE_TOMBSTONE` | 2 |

72개 항목은 공식 HTML에서 `삭제`라고 명시된 조문 표식으로 재현되어
`DELETED_ARTICLE_TOMBSTONE`으로 분류했다. 활성 조문 형식의
`UNPARSED_ARTICLE`은 0개다. 이 분류와 별개로 승인자는 원문을 다시 열어
조·항·호·목, 단서, 부칙과 휴직 관련 조문을 대조해야 한다.

## 다음 승인 절차

1. 비제출 `private/legal-wide/processed/candidate.json`과 위 source hash를 대조한다.
2. 자동 품질감사 결과와 삭제 조문 tombstone 분류를 확인한다.
3. 휴직·복직과 휴직 파생 정근수당의 본문·단서·부칙·시점 교차 근거를 원문과 대조한다.
4. 승인자 ID·승인시각·승인 hash를 별도 비제출 승인 기록에 남긴다.
5. 승인 뒤에만 versioned legal index와 Phase 08 독립 평가를 실행한다.

이 결과는 공식 페이지의 수집·파싱 준비 증거이며 법률 정답성이나 최신 법령 보장이 아니다.
