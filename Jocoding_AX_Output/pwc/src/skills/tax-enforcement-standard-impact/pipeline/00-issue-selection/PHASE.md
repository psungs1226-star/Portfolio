# Phase 0. Issue Selection by Golden-Set Availability

## Purpose

Select the first VAT issue by available validation data, not by preference.

## Step 1. Collect Tax Interpretation Revision Data

Required fields:

- Revision case ID.
- Tax type.
- Before interpretation document number.
- After interpretation document number.
- Before summary.
- After summary.
- Related law article.
- Revision reason.
- Revision or publication date.

Failure risks:

- Before/after documents are not both available.
- Revision reason is too generic.
- Revision is only wording cleanup.

Checks:

- Prefer cases with both before and after documents.
- Hold cases without related law article.
- Exclude typo, formatting, and simple wording cleanup cases.

## Step 2. Filter VAT Cases

Keep:

- Tax type is VAT.
- Related law is VAT Act, Enforcement Decree, or Enforcement Rule.
- Revision summary clearly concerns a VAT issue.

Exclude:

- Corporate income tax, individual income tax, inheritance/gift tax, local tax.
- Tax Special Treatment Control Act cases with no direct VAT link.
- Revisions not connected to law interpretation.

## Step 3. Tag Issues

Suggested tags:

- Simplified taxpayer.
- Tax invoice.
- Input VAT deduction.
- Exemption/taxable classification.
- Supply timing.
- Zero rating.
- Penalty tax.
- Bad debt tax credit.
- Common input VAT allocation.

Rules:

- Assign one primary issue.
- Assign optional secondary issues.
- Hold cases without a clear primary issue.

## Step 4. Count Usable Cases

Track:

- `total_count`
- `usable_count`
- `law_linked_count`
- `non_trivial_count`
- `negative_candidate_count`
- `trivial_count`

Use:

```text
issue_score =
  usable_count * 4
  + law_linked_count * 3
  + non_trivial_count * 2
  + negative_candidate_count
  - trivial_count * 2
```

## Step 5. Select First MVP Issue

Select the issue with:

- Highest `issue_score`.
- Enough usable positive cases.
- At least a few negative candidates.
- Clear related VAT law articles.

Output:

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
