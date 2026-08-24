# Phase 8. Packaging & Release

## Purpose

Take the built skill from "works in the worktree" to a **submittable, self-consistent, honestly-labeled package** (Codex plugin bundling `tax-enforcement-standard-impact`). This is a **build/release phase, not a runtime data phase** — it does not process a law change; it hardens and ships what Phases 0–7 produced.

## Packaging philosophy (settled)

- Ship as a **data-independent, re-runnable skill (approach A)**. The augmentation-verify-rerun loop (approach B) already lives inside Phase 6 (steps 01→05).
- Gate release with **one same-axis mini-validation** to catch logic-type (가) errors only; coverage-type (나) gaps are absorbed by data, not blocking.
- Thin coverage is labeled `hold` / `REVIEW_WORTHY` / new-review-topic — never asserted.
- Status labels everywhere: `partial`, `completed_with_hold_flags`, `completed_with_source_check`. Never a bare "done".

## Scope decision (locks the rest of the phase — see Step 1)

- **Baseline (recommended):** ship the shallow→deep **pipeline (Phase 0–7)** as the core validated capability; present the **deep-judgment scaffold + 3-signal layers (L1/L2/L3)** as the *differentiator*, honestly labeled "designed + piloted (n=1)". No new R&D except the Step 4 mini-gate.
- **Alternative:** declare deep-judgment as a core capability → requires multi-axis + L2 recall statistical validation → larger schedule, n=1 overclaim risk.

## Steps

1. **Scope lock & artifact reconciliation** — fix what ships vs roadmap; tag every artifact canonical/pilot/superseded; one index.
2. **Skill coherence pass** — a fresh agent can run Phase 0→7 from the docs; cross-refs and vocabulary consistent.
3. **Honesty / claims audit** — every capability claim traces to a status-labeled artifact; adversarial overclaim sweep.
4. **Mini-validation gate** — one same-axis run to catch logic (가) errors before freezing.
5. **HTML deliverable finalization** — reflect deep-judgment + L2 + REVIEW_WORTHY; inline source 요지(결론+근거), not just doc numbers. `proactive_action_brief`는 데이터구동 재생성: `steps/05-html-finalize/build_brief.py`(canonical 아티팩트→스키마→HTML, 손편집 금지 — 상세는 해당 STEP.md).
6. **Plugin packaging & validation** — plugin.json metadata, `validate_plugin.py` pass, structure check; finalize answer.md 문항 4·5.
7. **Acceptance demo (post-packaging verification)** — the agreed acceptance test: throw one small topic at the packaged skill and validate by **driving the output-production process end-to-end**, not by inspecting files.

## Output

- `PACKAGING_INDEX.json`: canonical/pilot/superseded artifact map + shipped-vs-roadmap scope.
- Validated `src/.codex-plugin/` (validate_plugin.py pass).
- Finalized HTML deliverables + answer.md 문항 4·5.
- `ACCEPTANCE_DEMO.md` (or json): the small-topic end-to-end run transcript and pass/fail against expected output shape.

## Boundaries

- Do not expand the MVP issue during packaging.
- Do not upgrade "piloted (n=1)" claims to "validated" without the corresponding measurement.
- `logs/` untouched.
