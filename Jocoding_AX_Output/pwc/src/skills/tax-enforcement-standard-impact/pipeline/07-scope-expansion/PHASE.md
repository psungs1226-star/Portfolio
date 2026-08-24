# Phase 7. Scope Expansion (Batch Amendment Sweep)

## Purpose

Broaden the MVP from a single law change (VAT Enforcement Decree Article 41) to a batch of VAT law/decree amendments. Run the core pipeline (Phase 1 -> Phase 5) over each amendment and aggregate a validation set that actually exercises recall and precision.

This phase exists because a single amendment (n=1) can demo the pipeline but cannot statistically validate it. Phase 6 confirmed the logic gate passes; the remaining gap is coverage. Phase 7 supplies multiple events.

## Why this phase, not more of Phase 0

Phase 0 selects one MVP issue by golden-set availability. Phase 7 does not re-select an issue. It enumerates multiple **amendment events** within the chosen issue (and, optionally, adjacent issues) and pipelines each one. Phase 0 answers "which issue"; Phase 7 answers "how many change events."

## Step 1. Enumerate Amendment Events

- Collect VAT statute/decree revision history (연혁) over a defined window.
- Identify amendments that touch the selected issue (면세/과세구분) by changed article path and keywords.
- Record each as a candidate amendment event with effective date, promulgation number, before/after history ids.

## Step 2. Filter and Prioritize

- Keep amendments with clear before/after article text and a plausible enforcement-standard link.
- Drop pure wording cleanups and renumbering-only changes (mark as trivial negatives).
- Prioritize by likely enforcement-standard impact and by validation value (does a matching enforcement standard exist to check?).

## Step 3. Run Core Pipeline per Amendment

- For each prioritized amendment, run Phase 1 (normalize) -> Phase 2 (standards) -> Phase 3 (match) -> Phase 4 (classify) -> Phase 5 (review row).
- Reuse existing phase logic. Do not fork the rules.
- Store one review-list row set per amendment.

## Step 4. Build Multi-Event Validation Set

- Positive: amendment where a matching enforcement standard is found (affected or stale).
- Negative: enforcement standards on adjacent axes that share keywords but must not be flagged. **Feed these as candidate documents** so precision is actually exercised, not assumed.
- Hold: amendment or standard with related-but-insufficient evidence.

## Step 5. Aggregate Metrics

- Compute recall and precision across all events, not per single case.
- Report evidence rate, reason quality, hold quality.
- Emit a failure table keyed by the Phase 6 failure labels.

## Step 6. Precision Hardening and Rule Improvement

- Inject negative candidate documents into matching to confirm keyword-trap defense.
- Feed failures into the Phase 6 improvement assets (issue tag dictionary, article linkage table, keyword stoplist, confidence thresholds).
- Re-run affected amendments after each rule change.

## Step 7. Judgment-Case (Q&A) Layer

The rule-type layer (Steps 1-6) detects explicit wording changes in rule-form enforcement standards (26-x-1). This layer catches the second, harder failure mode: **past judgments decided under the old law whose conclusion may flip even though no text changed** — the value that lives in judgment/Q&A-form standards (e.g. 26-40-2 금융·보험용역 과세·면세 판정 사례) and in past 예규·해석사례.

Key difference from the rule-type layer: the **data window runs backward**. An amendment does not shake future text; it shakes *already-decided* past cases. So collect roughly 10 years of interpretation rulings ending at the amendment's effective date.

- **Data source**: 국세법령정보시스템 세법해석례 (전체 해석례) DB. Action `ASIPDI002PR01`, POST `/action.do`. Scope by 관련법령 (법 조문 단위; 시행령 정밀 스코프는 불가하므로 법 제26조 면세 전체로 근사) + 포함어 (changed 대상 entity). Counts from `categoryMap`, list from `body[].dcm` (TTL, DATE, NTST_TLAW_CL_NM, GIST_CNTN). See `JUDGMENT_LAYER_PILOT.json` for the exact param template.
- **Matching basis**: NOT date proximity. Match by the amendment's **changed 법리 (대상·요건·효과)** — the specific entity/service newly added or deleted. Surface past rulings that judged that 대상, then keep only those whose holding actually turns on the changed 요건·효과 (entity-keyword hit alone is not enough — it produces subject-mismatch false positives).
- **Core output is a deep-question scaffold, not a verdict**: apply the amendment's added 요건 to the *past ruling's fact pattern* → conclusion delta + exact 요건 원문 인용 + counter-arguments + calibrated confidence. The AI does not assert; it scaffolds for a professional. Score by hop count (0-hop article/keyword overlap = low value; ≥1-hop analogy/logic-chain/ripple = high value). **Adversarial verification is mandatory** — independent skeptics (distinct lenses) try to refute; kill on majority-refute. A killed flip is a *success* (REVIEW_WORTHY correctly separated from a real flip), not a failure. Example: `JUDGMENT_SCAFFOLD_AXIS1.json`.
- **Flip verdicts**: `confirmed` (flip survives adversarial refute) / `REVIEW_WORTHY` (no flip on merits but same 조문군 or live instability signal — keep in queue, do not assert) / `hold_확인필요` (adjacent but not identical 대상/요건) / `exclude` (subject or reason mismatch). Precision is exercised here, not assumed.
- **Signal layers (trigger-timing, distinct from impact Tier 1/2/3)**: L1 개정 (leading) / L2 심판례 (coincident, ~1yr post-assessment — REVIEW_WORTHY signal only, never a confirmed flip) / L3 판례 (lagging authority verifier). L2/L3 recipe: `ASIPDI002PR01` with `collectionName="precedent,precedent_gr"` + `dcmClCdCtl=001_05..10`, doc types 판례/심판/심사/적부/이의, VAT via `NTST_TLAW_CL_NM`. L2 pilot (`SIMPANLYE_L2_PILOT.json`): flagship 0 on-point (STABLE holds, absence = weak non-contradiction), but non-vacuous on adjacent axes (a 제40조 exemption 심판 — review-corrected: 제3항 기관의제 basis, not 부수; and 에누리 과표 심사).
- **Priority tier** (per affected candidate, orthogonal to verdict): `tier1_flip` = classification reverses (면세→과세 / 과세→면세), the main moat; `tier2_effect` = classification unchanged but the effect shifts (세율 / 과세표준 적용금액 / 계산·안분 방식); `tier3_low` = classification and effect both unchanged (codified practice); `none_excluded` = not affected (subject mismatch). Rank the review queue by tier: Tier 1 first, Tier 2 next, Tier 3 dropped. Maps to change types (Target change → Tier 1, Effect impact → Tier 2). Note: VAT rate is flat 10%, so Tier 2 in this MVP is driven by 과세표준·안분 changes, not rate changes.
- **Cross-verification**: 세법해석정비 DB (action `ASIQTF001MR01`). The full 996-record sweep (all tax types, `REVISION_996_ANALYSIS.json`) reframes how to use it: 994/996 records are 유지↔삭제 flip pairs, so it is a rich **pattern/anchor source** for "what counts as a conclusion flip" — but a **weak verifier for amendment-driven flips** (amendment-caused code 09/10 = 11/996 = 1.1%; code 09 = 0). Worse, of 31 records that even mention 개정, 20 are filed under non-amendment reason codes — so filtering by 정비 code misses ~65% of amendment-touching revisions. Therefore: do not gate on the 정비 reason code; match on 유지/삭제 pairs + 개정 text, and decide amendment-driven status from the amendment event, not the code. A recent amendment with no matching 정비 record is expected under the 1.1% base rate and is uninformative by itself — consistent with both registry latency and genuine flip rarity; count it neither for nor against the layer. Quantified: the registry is an interpretation-management tool (98.9% non-amendment), not an amendment-impact tracker — this establishes the *necessity* of a dedicated layer, not its *capability*. Capability is proven only by a falsifiable blind backtest: given only the amendment text, the layer must rank the deleted case of each known code-10 flip in top-k; misses are failures. **Backtest executed** (`BLIND_BACKTEST.json`): deleted cases turned out to be de-indexed from search (probe P2), so the pre-registered proxy target (retained case @10) was scored instead — result **HIT@10 = 2/7 testable** (2 HIT at ranks 2·4 on precisely-identified amendments; 5 MISS from synonym gaps / broad-recodification keywords / proxy noise; 4 UNTESTABLE). Axis reachability was higher (~9/11, with 8/10 pre-amendment docs in two flips). Strategic corollary of the de-indexing: retrospective analysis of flipped rulings is structurally impossible — amendment-time detection is the only moment they can be caught. Additionally, hold verdicts must cite which exemption *item* (호 단위) the past ruling relied on — directional adjacency ("면세 축소 방향") alone is insufficient.
- **Coverage cap**: "10 years deep, topic narrow." One 면세 sub-axis (e.g. 제40조 금융) per run. Log the window, the entity keywords used, and any subject-mismatch exclusions. No silent truncation.
- **Date-basis note**: filter on production date (생산일자), not registration date (등록일자) — they can differ by up to ~1 year, and "decided under old law" is a production-date question. The pilot used 등록일자 (FRS_RGT_DTM) as a stopgap; confirm the 생산일자 code before scaling.

## Output

- `OUTPUT.json`: enumerated amendments, per-amendment result rows, aggregated metrics, failure table, rule-change log.
- `JUDGMENT_LAYER_PILOT.json`: judgment-case layer pilot (제40조 금융 axis) — query recipe, volume funnel, candidate set, flip analysis, 정비 DB cross-check.
- `JUDGMENT_SCAFFOLD_AXIS1.json`: deep-judgment flagship (①축 유추·열거주의 반사효과) — 신구조문 인용, fact-pattern application, 3-lens adversarial panel, verdict REVIEW_WORTHY (not a flip).
- `SIMPANLYE_L2_PILOT.json`: L2 심판례 signal-layer pilot — data-source recipe, VAT funnel, flagship 0 on-point (STABLE), non-vacuous adjacent-axis signals, honest limits.
- Status uses `partial`, `completed_with_hold_flags`, or `completed`, never a bare "done".

## Boundaries

- Stay within the MVP issue (면세/과세구분) unless the user explicitly widens to other issues or tax types.
- Do not introduce excluded document types (internal guidance, MOEF interpretation, basic ruling, court case) to expand coverage. Exception (user-approved): 심판례 as an instability signal (L2) and 판례 as an authority verifier (L3) are admitted for the judgment layer only — signals/checks, not a sweep corpus. See SKILL.md Phase 7 "Signal Layers." These trigger-timing layers (L1 개정 / L2 심판례 / L3 판례) are distinct from the impact Tier 1/2/3 severity axis.
- Enforcement standards remain the primary document set; interpretation revision cases remain validation/support.
