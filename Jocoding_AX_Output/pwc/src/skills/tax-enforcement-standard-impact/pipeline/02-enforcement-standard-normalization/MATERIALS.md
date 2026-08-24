# Materials: Phase 2 Enforcement Standard Normalization

## Primary API Data

- VAT enforcement standard number.
- Title.
- Related VAT law article.
- Rule paragraph.
- Exception paragraph.
- Example paragraph.
- Note/caution.
- Revision date.

## Supporting API Data

- Tax interpretation revision before/after examples.
- Other interpretation examples only if enforcement standard evidence is sparse.

## Excluded Materials

- Internal guidance.
- MOEF interpretations.
- Basic rulings.
- Court cases.
- Sales or marketing material.

## Enforcement Standard Schema

```json
{
  "standard_id": "...",
  "doc_type": "enforcement_standard",
  "tax_type": "VAT",
  "standard_no": "...",
  "title": "...",
  "related_articles": [],
  "rule_text": "...",
  "exception_text": "...",
  "example_text": "...",
  "note_text": "...",
  "revision_date": "YYYY-MM-DD",
  "logic_units": {
    "target": [],
    "condition": [],
    "action": [],
    "effect": [],
    "exception": [],
    "time_scope": []
  }
}
```

## Supporting Interpretation Schema

```json
{
  "doc_id": "...",
  "doc_type": "supporting_revision_interpretation",
  "before_doc_no": "...",
  "after_doc_no": "...",
  "related_articles": [],
  "before_summary": "...",
  "after_summary": "...",
  "use": "validation_or_support"
}
```
