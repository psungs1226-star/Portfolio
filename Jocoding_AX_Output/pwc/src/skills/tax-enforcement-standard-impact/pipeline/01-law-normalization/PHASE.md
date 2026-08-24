# Phase 1. Law Change Normalization

## Purpose

Convert a VAT law amendment into structured legal logic.

## Step 1. Collect Law Change Inputs

Accept:

- VAT law amendment text.
- Before/after article text.
- Enforcement Decree article directly linked to the law article.
- Effective date.
- Application rule.
- Transition rule.

Checks:

- Article path exists.
- Before/after text exists when available.
- Effective date or application rule is captured.

## Step 2. Parse Article Structure

Extract:

- Law name.
- Article number.
- Paragraph.
- Item/subitem.
- Proviso.
- Parenthetical clause.
- Supplementary provision.

Failure handling:

- If article path is unclear, mark `needs_manual_review`.
- If before/after text is missing, do not run high-confidence matching.

## Step 3. Compare Before and After

Detect:

- Added terms.
- Removed terms.
- Changed number or threshold.
- Changed obligation wording.
- Changed target.
- New exception or deleted exception.
- Timing/application changes.

## Step 4. Extract Legal Logic

Normalize into:

```json
{
  "target": [],
  "condition": [],
  "action": [],
  "effect": [],
  "exception": [],
  "time_scope": []
}
```

Rules:

- Mark LLM-only inference as `inferred`.
- Do not treat inferred logic as confirmed evidence.
- Separate target, condition, and effect whenever possible.

## Step 5. Classify Change Type

Types:

- Target change.
- Condition change.
- Amount or threshold change.
- Procedure change.
- Obligation change.
- Exception change.
- Timing change.
- Wording cleanup.

Checks:

- If no target, condition, effect, or timing changed, keep impact low.
- If effective date or application rule is missing, hold for review.
