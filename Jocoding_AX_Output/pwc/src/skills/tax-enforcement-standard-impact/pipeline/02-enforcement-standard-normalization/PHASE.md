# Phase 2. Enforcement Standard Normalization

## Purpose

Normalize VAT enforcement standards as the primary document set. Use interpretation examples only as supporting validation data.

## Step 1. Fix Document Scope

Primary:

- VAT enforcement standards related to the Phase 0 selected issue.

Support:

- Tax interpretation revision before/after examples.
- Other interpretation examples only when enforcement standard evidence is too sparse.

Exclude:

- Internal guidance.
- MOEF interpretations.
- Basic rulings.
- Court cases.
- Sales or marketing material.

## Step 2. Collect Enforcement Standards

Required fields:

- Enforcement standard number.
- Title.
- Related VAT law article.
- Main rule paragraph.
- Exception paragraph.
- Example paragraph.
- Caution or note.
- Revision date, if available.

Checks:

- Standard number exists.
- Related law article exists or is marked as missing.
- Main rule paragraph is separated from examples.

## Step 3. Parse Enforcement Standard Structure

Chunk by:

- Standard number.
- Subheading.
- Rule paragraph.
- Exception paragraph.
- Example paragraph.
- Note/caution.

Failure handling:

- If standard number is missing, hold.
- If only examples exist with no rule paragraph, low confidence.
- If related article is missing, use semantic search only as support.

## Step 4. Collect Supporting Interpretation Examples

Collect only when:

- It is a tax interpretation revision before/after case.
- It supports validation.
- It provides positive or negative examples.
- Enforcement standard evidence is too sparse.

Do not let interpretation examples become the primary output.

## Step 5. Add Metadata and Tags

Tags:

- Tax type: VAT.
- Document type: enforcement standard, revision interpretation, support interpretation.
- Issue.
- Taxpayer type.
- Transaction type.
- Related article.
- Target/condition/action/effect/exception/time scope.

Tag source:

- `manual`
- `api`
- `rule`
- `llm`
- `unknown`

## Step 6. Quality Checks

Pass conditions:

- Enforcement standard number is present.
- Related article is present or explicitly missing.
- Rule paragraph and examples are separated.
- Interpretation examples are marked as supporting data.
- Excluded document types are not included.
