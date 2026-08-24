# Materials: Phase 1 Law Normalization

## Required API Data

- VAT law amendment text.
- Before article text.
- After article text.
- Effective date.
- Application rule.
- Transition rule.
- Directly linked Enforcement Decree article, if any.

## Normalized Schema

```json
{
  "change_id": "...",
  "tax_type": "VAT",
  "law_name": "부가가치세법",
  "article_path": "제XX조 제X항",
  "before_text": "...",
  "after_text": "...",
  "change_type": "...",
  "effective_date": "YYYY-MM-DD",
  "application_rule": "...",
  "transition_rule": "...",
  "legal_logic": {
    "target": [],
    "condition": [],
    "action": [],
    "effect": [],
    "exception": [],
    "time_scope": []
  },
  "inferred_fields": [],
  "review_flags": []
}
```

## Rule Assets

- Article parser patterns.
- Before/after comparison rules.
- Change type mapping.
- Effective date and application rule extraction rules.
