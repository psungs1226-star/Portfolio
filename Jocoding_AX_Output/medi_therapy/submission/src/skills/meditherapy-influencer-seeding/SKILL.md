---
name: meditherapy-influencer-seeding
description: Use when planning, ranking, reviewing, or packaging Meditherapy influencer seeding workflows. The skill turns product inputs and public influencer data into explainable rankings, seeding briefs, result tables, reviewer checks, and iteration plans without claiming sales impact before conversion data exists.
---

# Meditherapy Influencer Seeding

## Purpose

This skill supports the AX hackathon submission for Meditherapy's public problem: designing an influencer seeding system that can connect product fit, creator context, risk controls, causal hypotheses, and repeatable measurement loops.

Use this skill when the user asks to:

- rank influencers for an existing Meditherapy MVP product,
- rank influencers for a new product example,
- decide whether existing influencer DB coverage is sufficient,
- generate seeding briefs,
- create or review result collection tables,
- run reviewer checks,
- package the submission.

## Core Policy

- Do not use gender as the first-order product recommendation criterion.
- Do not rank creators by follower count alone.
- Do not claim sales, ROAS, order lift, or repeat purchase impact unless internal conversion data is present.
- Keep public metrics and internal conversion metrics separate.
- Store comment intent themes and counts, not raw comment text.
- Apply hard exclusions before scoring or seed selection.
- Keep `ready_for_matching`, `review_required_before_matching`, and `needs_more_data` as separate display groups.
- If data is insufficient, return `no_seed`, `review_required`, `needs_more_data`, or `hypothesis_only` instead of fabricating confidence.

## Data Files

The plugin expects the following files under `data/`:

- `meditherapy_product_parameters.json`: MVP product ontology.
- `influencer_mvp_parameters.json`: MVP scope, scoring policy, and display priority.
- `influencer_candidates.jsonl`: candidate source records.
- `content_observations.jsonl`: public content metadata observations.
- `influencer_profiles.jsonl`: normalized influencer profiles.
- `seed_recommendations.json`: Phase 4 product-influencer matching result.
- `seeding_briefs.json`: Phase 5 execution briefs.
- `experiment_results.json`: Phase 6 result collection contract.
- `new_product_example.json`: Phase 6A new product input.
- `new_product_rankings.json`: Phase 6A existing DB ranking output.
- `new_product_research_plan.json`: Phase 6B research gap decision.
- `iteration_learning_plan.json`: Phase 8 iteration learning plan.

The plugin must also write marketer-readable reports under `logs/`:

- `new_product_ranking_report.html`: mandatory HTML report for new product ranking decisions.
- `new_product_ranking_report.md`: Markdown companion report with the same ranking rationale.
- `latest_new_product_test_result.md`: compact final test summary.

The HTML report is not optional. It must let a reviewer judge each rank by showing score breakdown, skin-concern match, content match, risk judgment, causal hypothesis, execution direction, and observation KPIs.

Reports must be written for marketers first, not as raw trace dumps. Put Korean interpretation before internal tags:

- Explain what the creator can naturally say about the product.
- Explain why the rank is high or lower than adjacent candidates.
- Explain what hypothesis the seeding would test in plain Korean.
- Explain what claim risks or usage-context risks the marketer must control.
- Keep internal labels such as `makeup_adherence_issue` only as secondary evidence under a "근거 태그" style section.

## Workflow

1. Lock the problem and evidence.
   - Use public evidence and avoid unsupported claims.
   - Keep the problem statement as influencer seeding decisions through ontology, causal hypotheses, and repeatable loops.

2. Use the product ontology.
   - Match product concerns, content fit, risk flags, and KPIs.
   - Keep product caution fields visible in recommendations and briefs.

3. Normalize influencer context.
   - Use skin concerns, content domains, audience intent themes, commercial signals, market fit, and risk profile.
   - Preserve missing data questions instead of filling unknown values.

4. Rank products and influencers.
   - Score self fit, audience fit, content fit, market/channel fit, and risk penalty separately.
   - Apply hard exclusions before selection.
   - Sort display groups before product-fit score.

5. Generate seeding briefs.
   - Include why this creator, why this product, causal hypothesis, content angle, disclosures, avoided claims, KPIs, result collection windows, and next iteration rule.

6. Collect results conservatively.
   - Use Stage 0-4 interpretation:
     - Stage 0: posted or not.
     - Stage 1: public engagement.
     - Stage 2: comment intent themes.
     - Stage 3: internal click, coupon, cart.
     - Stage 4: internal orders, CPA, ROAS, repeat purchase.
   - If posted URL or KPI is absent, mark results inconclusive.

7. Handle a new product.
   - First run existing DB ranking.
   - Always generate `logs/new_product_ranking_report.html` for reviewer-facing judgment.
   - Then decide whether additional research is needed.
   - Do not run broad re-research unless quantitative triggers justify it and the user approves.

8. Run reviewer checks.
   - Verify schema, recommendation logic, risk filters, data quality, claims, and README/log consistency.
   - Do not proceed if reviewer status is `fail`.

9. Iterate without over-learning.
   - If outcomes are inconclusive, keep actual rule updates at zero.
   - Preserve candidate learnings as `hypothesis_only`.
   - Propose next experiment questions with minimum data requirements.

## Local Tool Commands

From the plugin root, the bundled scripts can be run in this order:

```bash
python3 tools/run_phase4_matching.py
python3 tools/run_phase5_briefs.py
python3 tools/run_phase6_results.py
python3 tools/run_phase6a_new_product_ranking.py
python3 tools/run_phase6b_research_gap.py
python3 tools/run_phase7_reviewer.py
python3 tools/run_phase8_iteration_learning.py
python3 tools/run_prepackage_tests.py
```

For this submission workspace, equivalent scripts also exist at the repository root under `tools/`.

## Output Style

When responding to marketers or judges:

- state the decision,
- show the evidence fields used,
- explain risk or missing data,
- separate public KPI claims from internal conversion claims,
- say when the answer is a hypothesis rather than a proven result,
- link the relevant JSON, Markdown, or HTML artifact.
