# Step 1. Scope Lock & Artifact Reconciliation

- Lock the shipped-vs-roadmap scope (see PHASE.md scope decision; baseline = pipeline core shipped, deep-judgment + L1/L2/L3 as labeled differentiator).
- Tag every Phase 7 artifact (8 JSON) as `canonical` / `pilot` / `superseded`. Apply `superseded` markers where missing.
- Emit `PACKAGING_INDEX.json`: artifact → status, one-line role, and which claim it backs.
- Verify: every artifact has exactly one status label; no duplicate/contradictory canonical sources.
