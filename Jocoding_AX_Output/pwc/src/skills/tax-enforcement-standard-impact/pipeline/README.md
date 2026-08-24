# Tax Enforcement Standard Impact Worktree

This worktree breaks one skill into internal pipeline phases, phase documents, and step documents.

The user-facing skill remains `tax-enforcement-standard-impact`. The directories below are implementation pipeline nodes, not separate user-facing skills.

## Worktree

```text
00-issue-selection/
  PHASE.md
  MATERIALS.md
  steps/*/STEP.md
01-law-normalization/
  PHASE.md
  MATERIALS.md
  steps/*/STEP.md
02-enforcement-standard-normalization/
  PHASE.md
  MATERIALS.md
  steps/*/STEP.md
03-matching/
  PHASE.md
  MATERIALS.md
  steps/*/STEP.md
04-impact-classification/
  PHASE.md
  MATERIALS.md
  steps/*/STEP.md
05-review-list-output/
  PHASE.md
  MATERIALS.md
  steps/*/STEP.md
06-validation/
  PHASE.md
  MATERIALS.md
  steps/*/STEP.md
```

## Execution Order

1. Phase 0 selects the first VAT issue by golden-set availability.
2. Phase 1 normalizes the law change.
3. Phase 2 normalizes enforcement standards first and interpretation examples only as support.
4. Phase 3 matches law changes to enforcement standards.
5. Phase 4 classifies impact and confidence.
6. Phase 5 creates the internal review list.
7. Phase 6 validates with tax interpretation revision cases.

## Scope Rules

- Main document set: official VAT enforcement standards.
- Supporting data: tax interpretation revision before/after cases.
- Excluded in MVP: internal guidance, MOEF interpretations, basic rulings, court cases, sales material, and final taxpayer advice. (Exception, user-approved: 심판례 = instability signal, 판례 = authority verifier, for the judgment layer only — see SKILL.md Phase 7 "Signal Layers.")
