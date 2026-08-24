# Materials: Phase 6 Validation

## Validation Case Schema

```json
{
  "case_id": "...",
  "selected_issue": "...",
  "related_law_article": "...",
  "before_interpretation_doc_no": "...",
  "after_interpretation_doc_no": "...",
  "expected_status": "positive|negative|hold",
  "expected_reason": "...",
  "expected_impact_type": "..."
}
```

## Metrics

- Recall.
- Precision.
- Evidence rate.
- Reason quality.
- Hold quality.

## Failure Labels

- Missed article link.
- Wrong issue tag.
- Keyword false positive.
- Logic extraction error.
- Missing timing rule.
- No evidence but scored too high.
- Interpretation example treated as primary standard.

## Improvement Assets

- Issue tag dictionary updates.
- Article linkage table updates.
- Keyword stoplist updates.
- Confidence threshold updates.
- Evidence checklist updates.
