---
name: company-problem-evidence
description: Use when preparing an AX hackathon Codex plugin for one selected company, where the problem must be supported by public evidence and the output should separate facts, assumptions, and missing information.
---

# Company Problem Evidence

Use this skill when the user is preparing the AX hackathon submission for a single selected company.

## Workflow

1. Identify the selected company, intended user, problem, and public source URLs from the conversation.
2. If the company or problem is not clear, ask only for the missing decision.
3. Separate confirmed facts, reasonable assumptions, and missing evidence.
4. Keep the work focused on one company only.
5. Map findings to the five submission questions when useful:
   - What the plugin is, who uses it, and when.
   - Why this problem was selected.
   - How the plugin works.
   - How AI was used.
   - How it was verified.
6. Do not polish final submission prose unless the user explicitly asks.
7. When updating `answer.md`, append short bullets under the relevant question only.

## Output Rules

- Prefer concise working notes over final copy.
- Include source URLs next to evidence.
- Mark unsupported claims as assumptions.
- If evidence is insufficient, say what is missing instead of inventing it.
