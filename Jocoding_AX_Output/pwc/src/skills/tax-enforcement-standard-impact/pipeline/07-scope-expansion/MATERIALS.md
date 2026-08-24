# Materials: Phase 7 Scope Expansion

## Required Inputs

- Selected issue from Phase 0 (default: 면세/과세구분).
- Existing phase logic (Phase 1 to Phase 5), reused unchanged.
- Phase 6 failure labels and improvement assets.

## Amendment Event Schema

```json
{
  "amendment_id": "...",
  "law_name": "...",
  "article_path": "...",
  "parent_article": "...",
  "promulgation_no": "...",
  "before_history_id": "...",
  "after_history_id": "...",
  "effective_date": "YYYY-MM-DD",
  "application_rule": "...",
  "change_type": "...",
  "touches_selected_issue": true,
  "priority": "high|medium|low|trivial_negative"
}
```

## Per-Amendment Result Schema

```json
{
  "amendment_id": "...",
  "matched_standards": [
    {"standard_no": "...", "main_impact_type": "...", "confidence": "...", "status": "review|hold|exclude"}
  ],
  "new_review_topics": [],
  "evidence_complete": true,
  "notes": "..."
}
```

## Aggregate Metrics Schema

```json
{
  "amendment_count": 0,
  "positive_events": 0,
  "negative_events": 0,
  "hold_events": 0,
  "recall": "found_affected / expected_affected",
  "precision": "true_positive / (true_positive + false_positive)",
  "evidence_rate": "...",
  "false_positives": [],
  "false_negatives": []
}
```

## Sources (reused)

- 국세법령정보시스템 세법 연혁: 목록 `ASISTZ001MR01`(집행기준), 법령 연혁 `ASISTA005PR01`, 조문 본문 `ASISTA002MR03`.
- 세법집행기준: 상세 `USESTE001M`(ntstBscId), 목차 `ASISTE001MR02`(rgtYr), 본문 PDF는 PDF.js `getTextContent`.
- 세법해석정비: 목록 `ASIQTF001MR01`, 상세 `ASIQTB002PR01` (validation/support only).

## Rule Assets (shared with Phase 3 / Phase 6)

- Article linkage table (집행기준 번호 = 법조-영조).
- Issue-specific synonym dictionary.
- Generic keyword stoplist.
- Confidence thresholds.
- Evidence requirement checklist.

## Guardrails

- Enforcement standards primary; interpretation cases validation/support.
- Reuse phase logic; do not fork rules per amendment.
- Log any coverage cap (top-N amendments, window bounds) explicitly — no silent truncation.
- Keep status labels explicit (`partial` / `completed_with_hold_flags` / `completed`).
