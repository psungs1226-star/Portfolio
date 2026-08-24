# Phase 5. Internal Review List Output

## Purpose

Create an internal review list ranked by likely impact on enforcement standards.

## Step 1. Build Review Table

Required columns:

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

Status values:

- `review`
- `hold`
- `exclude`

## Step 2. Separate Output Sections

Use these sections:

1. Likely affected enforcement standards.
2. Supporting interpretation cases.
3. New review topics with no enforcement standard candidate.
4. Held or excluded items.

Do not mix new review topics with affected enforcement standards.

## Step 3. Rank Candidates

Rank by:

1. Confidence.
2. Direct article link.
3. Logic match count.
4. Evidence completeness.
5. Timing relevance.

Limit default output to:

- Top 10 candidates, or
- Candidates above the selected confidence threshold.

## Step 4. Safety Checks

Do not say:

- The enforcement standard will definitely change.
- A taxpayer should take a final filing position.
- A tax benefit is guaranteed.

Use:

- Likely review candidate.
- Possible impact.
- Hold for professional review.
- Supporting interpretation case.

## Step 5. Optional Use Cases

Keep optional outputs separate from the core review list:

- Tax Agent response guardrail.
- Client impact summary.
- Outreach or newsletter draft.

These are not MVP core outputs.
