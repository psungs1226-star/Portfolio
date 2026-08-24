# Materials: Phase 3 Matching

## Required Inputs

- Normalized law change from Phase 1.
- Normalized enforcement standards from Phase 2.
- Supporting interpretation examples, if needed.

## Matching Order

```text
Hard Filter
  -> Direct Link
  -> Logic Match
  -> Keyword Match
  -> Semantic Match
  -> Evidence Check
  -> Score
```

## Matching Record Schema

```json
{
  "change_id": "...",
  "standard_id": "...",
  "hard_filter_status": "pass|hold|exclude",
  "direct_link": true,
  "logic_match": {
    "target": false,
    "condition": false,
    "action": false,
    "effect": false,
    "exception": false,
    "time_scope": false
  },
  "keyword_hits": [],
  "semantic_rank": null,
  "evidence_items": [],
  "score": 0,
  "status": "candidate|hold|exclude"
}
```

## Rule Assets

- Article linkage table.
- Issue-specific synonym dictionary.
- Generic keyword stoplist.
- Evidence requirement checklist.
