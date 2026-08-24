# Phase 8 · Step 7 — Acceptance Demo (post-packaging end-to-end)

**Method (user-specified):** throw one small topic at the packaged skill and validate by driving the output-production process end-to-end — not by inspecting files. Also serves as the Step 4 logic gate.

**Small topic chosen (different axis from the flagship):** amendment `VAT-DEC-40-33735` — 부가가치세법 시행령 제40조 제1항 **제13호 신설** (2023-10-19): "금융 면세에 **민간재간접벤처투자조합** 대상 자산 관리·운용 용역 신설" (change_type = 면세 대상 신설).

## End-to-end run

**1. Reach (탐색).** Search past 예규 in 부가세 제26조 면세 scope.
- Direct amendment term "재간접" → **0 hits** (해석례 `ASIPDI002PR01`, categoryMap empty). → the synonym-gap coverage cap fires, exactly as the blind backtest predicted (amendment vocabulary ≠ ruling vocabulary). Logged, not hidden.
- Broader term "벤처투자조합" → 2 candidates; 1 on-axis:
  - **서면-2015-법령해석부가-0932** (질의, 2016-02-15, DOC_ID 010000000000514841) — "창업투자회사가 자산 관리·운용용역 수행과정에서 정보시스템을 구축하여 대여/매각 시 부가세 면제 여부". GIST(요지): 중소기업창업투자회사가 정보시스템을 자산관리운용에 사용함 없이 **창업투자조합에 독립적으로 대여·매각하면 과세**.
  - (off-axis: 2022-07-08 비영리법인 국가위탁사업 면세 — 위탁금 반환, excluded by subject mismatch.)

**2. Judgment (판단, deep-question scaffold — not a verdict).**
- **Added 요건 (개정 원문 요지):** 제40조 제1항 제13호는 *민간재간접벤처투자조합을 대상으로 한 자산 관리·운용 용역*을 면세로 신설.
- **Fact-pattern application:** the 2016 ruling taxed an IT system supplied **independently** (별도 공급) to a 창업투자조합 — its 과세 basis is the *independence* of the service, not the fund's core business. The amendment enumerates the *fund's asset-management/operation service* as exempt; it does not enumerate independent IT-system supply.
- **Conclusion delta:** 면세 절반 — none (the amendment's exempt target ≠ the 2016 service). 과세 절반 — **consistent / undisturbed** (독립 공급 = 과세 stays; the amendment does not exempt independent ancillary IT supply, so it leaves the 2016 holding untouched — per the flagship review correction, "reinforces" would re-use the very a-contrario mechanism the panel rejected).
- **Counter-argument:** if the 2016 IT system were re-characterized as *부수하여* the newly-exempt 자산 관리·운용 용역 (not independent), the 부수 법리 could pull it into exemption — but the 2016 ruling explicitly found it independent, so this path is closed on its own facts.
- **Confidence / verdict:** `REVIEW_WORTHY` (not a flip). Same structural pattern as the ①축 flagship: an enumerated exemption of a specific target leaves an independently-taxed ancillary service undisturbed (consistent, not "reinforced" — review-corrected wording). ≥1-hop (entity analogy 창업투자조합↔민간재간접벤처투자조합 + independence doctrine).

**3. Output shape (honestly labeled).**

| field | value |
|---|---|
| amendment | VAT-DEC-40-33735 · 시행령 제40조①13 신설 (2023-10-19) |
| candidate past ruling | 서면 질의 2016-02-15 (창업투자조합 정보시스템 독립 대여/매각 = 과세) |
| impact type | Target change (enumerated exemption) → tests classification |
| verdict | **REVIEW_WORTHY** (no flip; 과세 half undisturbed/consistent) |
| confidence | medium (on-axis but sibling-entity analogy; 재간접 direct term missed) |
| coverage cap | synonym gap: "재간접" = 0 hits → entity-synonym dictionary needed (known lever) |
| status | completed_with_source_check |

## Result — pass

- The process ran end-to-end on a **fresh, non-flagship topic** and produced a coherent, honestly-labeled output **without manual repair**.
- **Logic gate (Step 4) — no (가) logic error.** Two known behaviors reproduced independently: (i) the synonym-gap coverage cap fired (재간접=0, logged not hidden); (ii) the deep-judgment layer correctly returned REVIEW_WORTHY (not a fabricated flip) via the same independence/enumeration reasoning as the flagship.
- **Honesty invariants held:** no assertion of a flip; coverage cap surfaced; status label attached; sources cited with 요지(결론=과세)+근거.

## Limits (disclosed)

- One topic (n=1 acceptance run), lightweight fetch (2 해석례 queries; 신구조문 full-text not re-pulled — amendment cited from AMENDMENT_EVENTS).
- Ruling full text (exact 근거조문) not fetched (list GIST used; detail action unconfirmed) — non-blocking for the process demonstration.
- This is an acceptance/process demonstration, not a statistical recall measurement.

---

## Addendum — HTML end-to-end close (data-driven converter)

기존 데모는 판단 레이어까지만 돌렸다. 이번엔 같은 신선 주제(`VAT-DEC-40-33735`)를 **action-brief 스키마에 매핑 → `render_brief.py`로 실제 HTML 카드까지** 산출해 "주제 투입 → HTML 아웃풋"을 닫았다.

**실행:** `python3 render_brief.py demo_brief_data.json tax_agent_acceptance_demo.html` (변환기/렌더러 도구 그대로 사용, 손편집 아님).

**검증된 출력 형태:**
- 유효 HTML(doctype/종료태그 OK, undefined/리스트-repr 누출 0).
- 2축 매트릭스에서 **1순위 × 검토 대상** 칸에 정확히 배치(분류 테스트·flip 아님) — 스키마의 tier×verdict 유도가 신선 주제에서도 작동.
- 뱃지 정합: `검토 대상` / `신뢰도 보통` / `추론근거 · ≥1단계`(hop 1) / `포지션 재점검`.
- 키워드 변경 블록: 신설(제13호 민간재간접벤처투자조합) + 동의어 gap 발화('재간접' 0건 → '벤처투자조합' 우회).
- 정직 불변식 유지: flip 단정 없음(REVIEW_WORTHY), coverage cap 표면화, 상태 라벨(`completed_with_source_check`), 예규 요지(결론=과세)+근거 인라인.

**결과 — pass.** 변환기·스키마·렌더러가 베이스라인 5카드에 없던 새 주제 1건을 받아 무수리로 유효한 HTML 답으로 닫음. 로직(가)오류 0.

**산출물:** `steps/05-html-finalize/demo_brief_data.json`(데모 입력) · `tax_agent_acceptance_demo.html`(HTML 답, repo root). 헤드리스 Chrome 렌더 시각 확인 완료.
