# Materials: Phase 0 Issue Selection

## Required API Data

- Tax interpretation revision cases.
- Before interpretation document metadata.
- After interpretation document metadata.
- Related law article metadata.

## Minimal Fields

```json
{
  "revision_case_id": "...",
  "tax_type": "VAT",
  "before_doc_no": "...",
  "after_doc_no": "...",
  "before_summary": "...",
  "after_summary": "...",
  "related_law": "부가가치세법",
  "related_article": "제XX조",
  "revision_reason": "...",
  "revision_date": "YYYY-MM-DD"
}
```

## Derived Materials

- Issue tag dictionary.
- VAT-only filtered case table.
- Positive candidate list.
- Negative candidate list.
- Held case list.

## Output Artifact

```json
{
  "selected_issue": "...",
  "issue_score": 0,
  "usable_count": 0,
  "law_linked_count": 0,
  "negative_candidate_count": 0,
  "selected_cases": [],
  "held_cases": []
}
```
