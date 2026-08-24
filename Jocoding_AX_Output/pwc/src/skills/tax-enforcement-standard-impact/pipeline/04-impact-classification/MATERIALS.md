# Materials: Phase 4 Impact Classification

## Impact Types

- Direct article impact.
- Condition impact.
- Target impact.
- Effect impact.
- Exception impact.
- Timing impact.
- Low relevance.
- Hold for review.

## Confidence Rules

```json
{
  "high": "direct article match plus logic match plus evidence",
  "medium": "logic match with evidence but no direct article match",
  "low": "keyword or semantic match with weak evidence",
  "hold": "plausible but missing article, date, or rule evidence"
}
```

## Classification Schema

```json
{
  "standard_id": "...",
  "main_impact_type": "...",
  "secondary_impact_types": [],
  "confidence": "high|medium|low|hold",
  "evidence_summary": "...",
  "review_question": "...",
  "status": "review|hold|exclude"
}
```

## Review Question Templates

- Does the changed condition alter this enforcement standard's rule paragraph?
- Does the effective date affect transactions covered by this standard?
- Does the new exception include or exclude the taxpayer type in this standard?
