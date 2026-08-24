---
name: tax-enforcement-standard-impact
description: Use when preparing or running an internal tax review workflow that estimates which Korean VAT enforcement standards are likely affected by a law change, prioritizing official enforcement standards first and using tax interpretation revision cases only as validation or supporting evidence.
---

# Tax Enforcement Standard Impact

Use this skill to produce an internal review list of official VAT enforcement standards that may need review after a law change.

## Scope

- Primary target: Korean VAT enforcement standards.
- Primary output: internal review list ranked by likely impact.
- Main evidence: official enforcement standard number, related statute article, and affected legal logic.
- Supporting evidence: tax interpretation revision cases and interpretation examples only when they help create a golden set or fill a judgment gap.
- Excluded in MVP: internal firm guidance, Ministry of Economy and Finance interpretations, basic rulings, court cases, sales material, and final taxpayer advice. (Exception, user-approved: 심판례 as an instability signal and 판례 as an authority verifier are admitted for the judgment layer only — as signals/checks, not a sweep corpus. See Phase 7 "Signal Layers.")

## Skill vs Pipeline

This is one skill. The numbered phases below are the internal pipeline phases the skill follows.

Do not present the phases or steps as separate user-facing skills unless explicitly asked. The user-facing capability is: "detect likely affected VAT enforcement standards and produce an internal review list."

The implementation worktree lives under `pipeline/`. Read the relevant phase directory when implementing or reviewing that phase:

- `pipeline/00-issue-selection/PHASE.md`
- `pipeline/01-law-normalization/PHASE.md`
- `pipeline/02-enforcement-standard-normalization/PHASE.md`
- `pipeline/03-matching/PHASE.md`
- `pipeline/04-impact-classification/PHASE.md`
- `pipeline/05-review-list-output/PHASE.md`
- `pipeline/06-validation/PHASE.md`
- `pipeline/07-scope-expansion/PHASE.md`
- `pipeline/08-packaging/PHASE.md` (build/release phase — package & ship the skill, not a runtime data phase)

Each phase directory contains:

- `PHASE.md`: phase-level objective and step overview.
- `MATERIALS.md`: data fields, schemas, templates, and rule assets needed by the phase.
- `steps/*/STEP.md`: step-level execution notes, checks, and outputs.

## Inputs

Accept any of the following:

- VAT law amendment text.
- Before/after article text.
- Effective date, application rule, or transition rule.
- Tax interpretation revision data.
- VAT enforcement standard data from the user's API.
- A selected issue from Phase 0, if already chosen.

If the selected issue is not fixed, start with Phase 0.

## Phase 0. Select the First Issue by Golden-Set Availability

Do not choose the first issue by intuition.

1. Collect tax interpretation revision cases from the user's API.
2. Filter to VAT-related cases using tax type and related law fields.
3. Tag each case by primary issue and secondary issues.
4. Count usable cases by issue.
5. Select the issue with the best golden-set quality.

Use this scoring logic:

```text
issue_score =
  usable_count * 4
  + law_linked_count * 3
  + non_trivial_count * 2
  + negative_candidate_count
  - trivial_count * 2
```

Definitions:

- `usable_count`: before/after interpretation comparison is possible.
- `law_linked_count`: related law article is clear.
- `non_trivial_count`: not a typo, wording cleanup, or simple format change.
- `negative_candidate_count`: similar but unaffected cases are available for precision testing.

Proceed only when the selected issue has enough usable cases and at least a few negative candidates.

## Phase 1. Normalize the Law Change

Convert the law change into a structured object:

```json
{
  "tax_type": "VAT",
  "law_name": "부가가치세법",
  "article_path": "제XX조 제X항",
  "change_type": "요건변경",
  "effective_date": "YYYY-MM-DD",
  "application_rule": "...",
  "legal_logic": {
    "target": ["..."],
    "condition": ["..."],
    "action": ["..."],
    "effect": ["..."],
    "exception": ["..."],
    "time_scope": ["..."]
  },
  "keywords": ["..."],
  "review_flags": ["..."]
}
```

Required checks:

- Article path exists.
- Before/after text exists when available.
- Effective date or application rule is captured.
- Target, condition, effect, and time scope are separated when possible.
- LLM-inferred fields are marked as inferred, not confirmed.

## Phase 2. Normalize Enforcement Standards First

Use enforcement standards as the primary document set.

Collect and parse:

- Enforcement standard number.
- Title.
- Related VAT law article.
- Main rule paragraph.
- Exception paragraph.
- Example paragraph.
- Caution or note.
- Revision date, if available.

Only collect interpretation examples when:

- They are tax interpretation revision before/after cases for validation.
- Enforcement standard evidence is too sparse.
- They help create positive or negative examples.

Do not collect internal guidance, MOEF interpretations, basic rulings, or cases for the MVP unless the user explicitly changes scope.

## Phase 3. Match Law Change to Enforcement Standards

Use this order. Do not rely on score alone.

```text
Hard Filter
  -> Direct Link
  -> Logic Match
  -> Keyword Match
  -> Semantic Match
  -> Evidence Check
  -> Score
```

### Hard Filter

Exclude or hold if:

- Tax type is not VAT.
- Document is not an enforcement standard or supporting interpretation example.
- Taxpayer type is clearly different.
- Transaction type is clearly different.
- Timing is clearly unrelated.

### Direct Link

Strong match when:

- Enforcement standard directly cites the changed article.
- Enforcement standard cites an enforcement decree article directly tied to the changed law article.
- Related article in the API matches the changed article.

### Logic Match

Prioritize legal logic over surface keywords.

Compare:

- Target.
- Condition.
- Action.
- Effect.
- Exception.
- Time scope.

Do not assign high confidence unless target and condition both match, or a direct article link exists.

### Keyword Match

Use keywords only as supporting signals.

- One generic keyword is not enough.
- Issue-specific keywords must support the logic match.
- Treat generic words such as invoice, deduction, filing, and taxpayer cautiously.

### Semantic Match

Use semantic matching only to recover missed candidates, especially where article references are missing. Semantic match alone cannot produce high confidence.

### Evidence Check

Every output candidate must have at least one evidence item:

- Changed article.
- Enforcement standard number.
- Related article.
- Main rule paragraph summary.
- Supporting interpretation revision case, if used.

No evidence means hold or exclude.

## Phase 4. Classify Impact

Classify each candidate into one main impact type and optional secondary types.

Main impact types:

- Direct article impact.
- Condition impact.
- Target impact.
- Effect impact.
- Exception impact.
- Timing impact.
- Low relevance.
- Hold for review.

Confidence:

- High: direct article match plus logic match.
- Medium: logic match with evidence, but no direct article match.
- Low: keyword or semantic match with weak evidence.
- Hold: plausible but missing necessary article, date, or rule evidence.

## Phase 5. Produce the Internal Review List

Primary output is an internal review table.

Required columns:

- Rank.
- Enforcement standard number.
- Enforcement standard title.
- Related changed article.
- Main impact type.
- Confidence.
- Affected legal logic.
- Evidence summary.
- Supporting interpretation revision case, if any.
- Review question for a tax professional.
- Status: review, hold, or exclude.

Keep interpretation examples separate:

- `Likely affected enforcement standards`.
- `Supporting interpretation cases`.
- `New review topics with no enforcement standard candidate`.
- `Held or excluded items`.

Do not mix new review topics with "likely affected enforcement standards."

## Phase 6. Validate (offline, golden-set — measures the workflow)

This phase validates the *workflow itself* against an accumulated golden set. It is offline and periodic — it answers "is the pipeline good?", not "is this one new amendment's output correct?". For the latter, see the **Runtime Verification Gate** below, which is mandatory on every production run.

Use tax interpretation revision cases as the initial golden set.

Validation set must include:

- Positive examples: before/after interpretation changed after a law change.
- Negative examples: similar issue but not affected.
- Hold examples: related but missing enough legal logic evidence.

Metrics:

- Recall: did the workflow surface affected candidates?
- Precision: did it avoid unrelated enforcement standards?
- Evidence rate: does every candidate have article or standard evidence?
- Reason quality: does the affected legal logic make sense?

If a changed interpretation exists but no matching enforcement standard exists, classify it as a supporting interpretation case or new review topic, not as a changed enforcement standard.

## Runtime Verification Gate (per new amendment — mandatory before emitting)

Phase 6 validates the workflow against an accumulated golden set (offline, periodic). It does **not** by itself verify the output for a *new* amendment for which no ground-truth label exists yet. This is the gap that matters in production: when the skill runs on a fresh law change, there is no golden label to check against, so verification must be **intrinsic (self-checks) + adversarial (refutation) + honestly labeled**, not deferred to a golden set that does not exist yet.

Every production run on a new amendment MUST pass the gate below before the review list is emitted. No item skips the gate.

1. **Evidence gate (hard, from Phase 3).** Every candidate in "likely affected enforcement standards" carries ≥1 concrete evidence item (changed article / enforcement-standard number / related article / rule-paragraph summary). No evidence → forced to `hold` or `exclude`; it may not appear as likely-affected.

2. **Hop labeling (from the judgment layer).** Tag each candidate 0-hop (direct article/keyword link) vs ≥1-hop (inference). A ≥1-hop candidate may not be emitted as `confirmed` without passing step 3.

3. **Adversarial verification (mandatory for any flip claim or ≥1-hop candidate).** Run N independent skeptics with distinct lenses that try to *refute* the impact. If a majority refute, downgrade to `REVIEW_WORTHY` or `exclude`. A flip that adversarial verification kills is a **success** of the gate, not a failure — it separated `REVIEW_WORTHY` from a real flip. This is the same rule as the judgment layer; here it also applies to rule-sweep outputs.

4. **Negative control (precision, at runtime).** Seed the same run with known similar-but-unaffected standards as decoys. If a decoy surfaces as high-confidence, precision is failing on this amendment → tighten the hard filter and demote before emitting. This exercises precision even with no golden set.

5. **Blind-spot self-report (no silent truncation).** The blind backtest fixed the known miss modes — synonym gap (amendment vocabulary ≠ ruling/standard vocabulary) and broad recodification (only general-word keywords are produced). When the incoming amendment is a broad recodification, or candidate vocabulary diverges from the amendment vocabulary, the run MUST emit a "likely missed" note. Never present coverage as complete when it is not.

6. **Honest verdict + reproducibility.** Final labels only from `{confirmed, REVIEW_WORTHY, hold_확인필요, exclude}`. Never assert a standard will definitely change. A deterministic re-run must reproduce the same list.

7. **Golden-set feedback (closes the loop, periodic).** When a new amendment later receives a 세법해석 정비 record, a 심판례, or a 판례, add it to the golden set and re-run Phase 6 to re-measure recall/precision. Runtime verification (steps 1–6) is intrinsic/adversarial and happens on every run; Phase 6 is the retrospective ground-truth check and happens when labels arrive. Both are required — neither replaces the other.

## Phase 7. Scope Expansion (Optional)

Use after one full pipeline pass when a single amendment cannot statistically validate the workflow.

- Enumerate multiple VAT law/decree amendment events within the selected issue.
- Run Phase 1 to Phase 5 over each amendment, reusing the same rules.
- Build a multi-event validation set and feed negative candidates so precision is exercised, not assumed.
- Aggregate recall and precision across events, then feed failures into rule improvement.

### Judgment-Case (Q&A) Layer

The rule-type sweep above only catches explicit wording changes in rule-form standards (26-x-1). Add this parallel layer to catch past judgments (판정형·Q&A form standards such as 26-40-2, and past 예규·해석사례) whose **conclusion may flip even with no text change**.

**Separate reach from judgment.** *Reach* (finding candidates) is LLM hypothesis-generation + semantic search; the resulting map is a by-product cache of verified results, not a hand-built knowledge graph. *Judgment* is where the value is — do not hand-build brittle graphs to reach further; spend the depth on judging.

**Core output is a deep-question scaffold, not a verdict.** For each candidate, apply the amendment's newly-added 요건 to the *fact pattern of the past ruling* and produce: (1) conclusion delta, (2) exact 요건 원문 인용 (before/after), (3) counter-arguments (반대논거), (4) calibrated confidence. The AI does **not** assert a flip — it scaffolds the question for a tax professional.

**Self-evidence penalty (scoring):** 0-hop matches (shared article number / keyword overlap) are low-value; ≥1-hop reasoning (analogy, logical chains, downstream-article ripple, external-reference definition changes) is high-value. Rank the scaffold's worth by hop count.

**Adversarial verification is mandatory.** Untrustworthy depth is worse than none. Run independent skeptics (distinct lenses) that try to *refute* the flip; kill the flip if a majority refute. Go narrow-and-complete on one axis, not broad-and-shallow across four.

- Data window runs **backward** ~10 years from the amendment's effective date — the amendment shakes already-decided cases, not future text.
- Match by the amendment's **changed 법리 (대상·요건·효과)**, not date proximity; keep only rulings whose holding turns on the changed element (entity-keyword hit alone causes subject-mismatch false positives).
- Verdicts: `confirmed` (flip survives adversarial refute) / `REVIEW_WORTHY` (does not flip on the merits but touches the same 조문군 / carries a live instability signal — keep in the review queue, do not assert) / `hold_확인필요` / `exclude`. `REVIEW_WORTHY` is the common honest outcome of a ≥1-hop scaffold: a flip that adversarial verification kills is a *success* of the layer (it distinguished REVIEW_WORTHY from a real flip), not a failure. See the ①축 flagship `JUDGMENT_SCAFFOLD_AXIS1.json` (기술보증기금 제3호 신설 → 신용보증기금 발명평가 예규: 3-lens adversarial panel → STABLE/REVIEW_WORTHY, not a flip). Cross-verify with 세법해석정비, but treat it as a flip **pattern/anchor** source, not an amendment-driven verifier: across all 996 records only 1.1% (11, code 09/10) are amendment-driven and 20 of 31 amendment-mentioning records are mis-filed under other reason codes, while 994/996 are 유지↔삭제 flip pairs. Match on flip pairs + 개정 text, decide amendment-driven status from the amendment event. A recent amendment with no 정비 record is expected under the 1.1% base rate and is, by itself, uninformative — count it neither as success nor failure (it is consistent with both registry latency and genuine flip rarity). The 996 analysis establishes *necessity* (nothing tracks amendment impact); the layer's *capability* was measured by a falsifiable blind backtest on the 11 known code-10 flips (`pipeline/07-scope-expansion/BLIND_BACKTEST.json`): HIT@10 = 2/7 testable — precise amendments (new articles, treaty protocols) hit at ranks 2·4; broad recodifications and synonym gaps (amendment vocabulary ≠ ruling vocabulary) miss. Axis reachability ~9/11. Known fix levers: synonym dictionary, 항·호-level amendment resolution, multi-keyword queries. Deleted cases are de-indexed after 정비 — amendment-time detection is the only moment they can be caught.
- **Moat priority (what matters most, ranked):** Tier 1 = the past ruling's **classification flips** (면세→과세 or 과세→면세) — this is the main moat, top of the review queue. Tier 2 = classification stays the same (과세→과세 / 면세→면세) **but the effect changes** — tax rate, taxable-base applicable amount, or the calculation/apportionment method shifts due to the amendment — important, flag separately. Tier 3 = classification and effect both unchanged (amendment just codifies existing practice) — low priority / drop. Maps to change types: Target change → Tier 1, Effect impact → Tier 2.
- Coverage cap: "10 years deep, topic narrow" — one 면세 sub-axis per run; log window, keywords, and exclusions. Filter on 생산일자, not 등록일자.
- See `pipeline/07-scope-expansion/PHASE.md` Step 7 and `JUDGMENT_LAYER_PILOT.json` (제40조 금융 pilot).

### Signal Layers (user-approved scope expansion)

Beyond amendments, two adjudication sources are admitted for the judgment layer — as **instability signals / authority checks only**, never as a new sweep corpus and never as final authority:

- **심판례 (조세심판원 결정)** — an *early instability signal*: files within ~1 year of assessment, years ahead of courts, and is densest exactly where a taxpayer contests a 예규. Low authority (can be overturned) → use only as a REVIEW_WORTHY signal, never as a confirmed flip. Note: 심판례 is an administrative-appeal (행정심판) decision, not a 법원 court case; it sits closer to 예규 than to the "court cases" excluded in the MVP.
- **판례 (법원)** — an *authority verifier*: check whether a candidate 예규/집행기준 was already confirmed or overturned. It is retrospective, so its litigation latency is not a problem in this role.

Signal-source layering (this is a **trigger-timing** axis, kept distinct from the **impact Tier 1/2/3** severity axis above):

- **L1 개정 (leading)** — earliest, prospective. The existing amendment sweep. Deleted rulings are de-indexed after 정비, so amendment-time is the only moment they can be caught.
- **L2 심판례 (coincident)** — files within ~1 year of assessment, years ahead of courts; densest where a taxpayer contests a 예규. Use as a REVIEW_WORTHY *signal*, never a confirmed flip (low authority, can be overturned). Solves the "대법원 takes years" latency problem by reading the earlier rung of the dispute pipeline.
- **L3 판례 (lagging authority)** — retrospective authority verifier; latency is irrelevant in this role because we check a *past* ruling from *now*.

**Data-source recipe (L2/L3):** same action as 해석례 (`ASIPDI002PR01`), only `collectionName="precedent,precedent_gr"` + `dcmClCdCtl=["001_05"…"001_10"]`; doc types = 판례 / 심판(조세심판원) / 심사 / 적부 / 이의; VAT-scope by `NTST_TLAW_CL_NM` containing '부가'. Session via `GET /qt/USEQTA001M.do`. Detail full-text action unconfirmed (list `GIST_CNTN` available). See `SIMPANLYE_L2_PILOT.json`.

**L2 pilot result (①축):** 0 on-point 심판례 for the flagship (신용보증기금 발명평가 / 부수용역 면세) — entity-keyword hits are dominated by 세금계산서 부정·가공거래 noise → STABLE holds. **Absence is a weak signal only** (consistent with both "settled" and "not-yet-litigated / keyword miss") — count it as non-contradiction, not confirmation (same discipline as the 정비-부재 rule). L2 is **not vacuous**: adjacent axes carry live signal (a 2021-04-07 심판 cancelled a taxation under 제40조 — but note the review correction: its basis is 제3항 제1호 **기관의제** (banks established under laws other than 은행법 deemed 은행업), NOT the 부수 doctrine, which lives in 제2항; so it shows only that L2 reaches live 제40조 exemption disputes, and does not corroborate the flagship's 부수=면세 half; 2025 심사 on 지원금=매출에누리 is a live Tier 2 과표 signal). Precision task mirrors the judgment layer: filter entity-keyword hits down to on-point 쟁점.

Stay within the MVP issue and document scope unless the user explicitly widens it.

## Output Rules

- Be explicit when a result is based on enforcement standards versus interpretation examples.
- Never state that a standard will definitely change.
- Use wording such as "likely review candidate", "possible impact", or "hold for professional review."
- Do not provide final taxpayer advice.
- Do not introduce internal guidance, MOEF interpretation, basic ruling, or case-law scope unless the user asks to expand the MVP.
- When updating `answer.md`, append only short bullets under the relevant question.
