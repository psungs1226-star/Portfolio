# Materials: Phase 5 Review List Output

## Output Table Columns

- Rank.
- Enforcement standard number.
- Enforcement standard title.
- Related changed article.
- Main impact type.
- Confidence.
- Affected legal logic.
- Evidence summary.
- Supporting interpretation revision case.
- Review question.
- Status.

## Output Sections

1. Likely affected enforcement standards.
2. Supporting interpretation cases.
3. New review topics with no enforcement standard candidate.
4. Held or excluded items.

## Row Template

```json
{
  "rank": 1,
  "standard_no": "...",
  "title": "...",
  "related_changed_article": "...",
  "main_impact_type": "...",
  "confidence": "high|medium|low|hold",
  "affected_legal_logic": {
    "target": [],
    "condition": [],
    "effect": [],
    "time_scope": []
  },
  "evidence_summary": "...",
  "supporting_interpretation_case": "...",
  "review_question": "...",
  "status": "review|hold|exclude"
}
```

## Safety Phrases

Use:

- Likely review candidate.
- Possible impact.
- Hold for professional review.

Avoid:

- Will change.
- Taxpayer should file this way.
- Tax benefit is guaranteed.
