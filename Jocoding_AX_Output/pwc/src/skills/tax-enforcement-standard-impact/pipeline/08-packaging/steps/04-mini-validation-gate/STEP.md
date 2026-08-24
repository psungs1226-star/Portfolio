# Step 4. Mini-Validation Gate

- Run one same-axis mini-validation to catch logic-type (가) errors before freezing (not a statistical run).
- Candidate axes: an L2 axis where an on-point 심판례 contradicts a past 예규 (to exercise REVIEW_WORTHY escalation), or a second deep-judgment axis (②축).
- If a (가) logic error surfaces, fix the rule and re-run; coverage-type (나) gaps are logged, not blocking.
- Verify: pipeline passes with no false positives on the mini set; any fix is re-run to green.
