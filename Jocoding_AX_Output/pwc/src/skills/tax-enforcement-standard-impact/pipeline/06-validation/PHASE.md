# Phase 6. Validation

## Purpose

Check whether the workflow can find review candidates with evidence and avoid obvious false positives.

This phase is **offline golden-set validation** — it measures the workflow against labeled cases and answers "is the pipeline good?". It does not verify the output of a *new* amendment that has no ground-truth label yet. That per-run check is the **Runtime Verification Gate** in `SKILL.md` (evidence gate → hop labeling → adversarial refutation → negative control → blind-spot self-report → honest verdict + reproducibility), which is mandatory on every production run. This phase closes the loop later: when a new amendment receives a 정비 record / 심판례 / 판례, add it to the validation set and re-measure.

## Step 1. Build Validation Set

Use tax interpretation revision cases.

Include:

- Positive examples: before/after interpretation changed after a law change.
- Negative examples: similar issue but not affected.
- Hold examples: related but missing enough evidence.

Each case needs:

- Case ID.
- Related law article.
- Before interpretation.
- After interpretation.
- Expected issue tag.
- Expected status.
- Reason.

## Step 2. Run Full Pipeline

Run:

1. Phase 0 issue selection.
2. Phase 1 law normalization.
3. Phase 2 enforcement standard normalization.
4. Phase 3 matching.
5. Phase 4 classification.
6. Phase 5 output generation.

Partial runs do not validate the full workflow.

## Step 3. Compare Results

Metrics:

- Recall.
- Precision.
- Evidence rate.
- Reason quality.
- Hold quality.

Review:

- Did affected candidates surface?
- Were unrelated standards excluded?
- Does every candidate have evidence?
- Are interpretation-only cases separated from enforcement standard candidates?

## Step 4. Classify Failures

Failure types:

- Missed article link.
- Wrong issue tag.
- Keyword false positive.
- Logic extraction error.
- Missing timing rule.
- No evidence but scored too high.
- Interpretation example treated as primary standard.

## Step 5. Improve Rules

Improve:

- Issue tag dictionary.
- Article linkage table.
- Logic extraction rules.
- Keyword synonym set.
- Confidence threshold.
- Evidence check.

Do not fix failures only by changing prompts.
