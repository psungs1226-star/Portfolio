# Phase 3. Matching Law Changes to Enforcement Standards

## Purpose

Find enforcement standards likely affected by the normalized law change.

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

## Step 1. Hard Filter

Exclude or hold if:

- Tax type is not VAT.
- Document is not an enforcement standard or supporting interpretation example.
- Taxpayer type clearly differs.
- Transaction type clearly differs.
- Timing is clearly unrelated.

## Step 2. Direct Link

Strong candidate if:

- Enforcement standard cites the changed article.
- Enforcement standard cites an enforcement decree article tied to the changed law article.
- API related article matches the changed article.

Direct link can override weak keyword match, but not missing evidence.

## Step 3. Logic Match

Compare:

- Target.
- Condition.
- Action.
- Effect.
- Exception.
- Time scope.

Rules:

- Target plus condition match is the strongest non-direct signal.
- Effect conflict is a strong review signal.
- Keyword-only similarity cannot produce high confidence.

## Step 4. Keyword Match

Use keywords only as support.

Rules:

- Generic keyword alone is weak.
- Issue-specific keyword plus logic match can strengthen confidence.
- Synonym dictionary must be issue-specific.

## Step 5. Semantic Match

Use only to recover missed candidates:

- Missing article reference.
- Broadly worded enforcement standard.
- Related paragraph with no exact keyword.

Semantic match alone cannot produce high confidence.

## Step 6. Evidence Check

Each candidate needs at least one:

- Changed article.
- Enforcement standard number.
- Related article.
- Main rule paragraph summary.
- Supporting interpretation revision case.

No evidence means hold or exclude.

## Step 7. Score

Suggested scoring:

```text
direct_article_link: 35
target_match: 15
condition_match: 15
effect_match_or_conflict: 15
issue_keyword_match: 10
semantic_top_hit: 10
timing_relevance: 10
```

Confidence:

- High: direct link plus logic match.
- Medium: logic match with evidence.
- Low: weak keyword or semantic match.
- Hold: plausible but missing key evidence.
