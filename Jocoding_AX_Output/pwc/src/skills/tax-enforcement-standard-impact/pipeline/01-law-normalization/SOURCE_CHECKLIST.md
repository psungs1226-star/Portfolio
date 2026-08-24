# Phase 1 Source Checklist

Phase 1 cannot be marked complete from an interpretation case alone.

## Completion Gate

Before `OUTPUT.json` status is `completed`, collect or explicitly mark each item:

- Amended law or decree article.
- Before article text.
- After article text.
- Parent law article.
- Directly delegated decree/rule article.
- External referenced statute article, if the amended text says "under another Act".
- Effective date.
- Application rule or transition rule.
- Source action or URL for each article.

If any article text is missing, set status to `partial_hold` or `completed_with_hold_flags`, not `completed`.

## Source Order

1. Initialize the statute page/list action to identify the correct law ID and tax law code.
2. Select the exact history row by effective date and promulgation number.
3. Fetch article text by history ID.
4. Fetch before article text from the immediately preceding relevant history row.
5. Follow delegated and external-reference articles.
6. Only then extract legal logic.

## Current Phase 1 Inputs

- Main amendment: VAT Enforcement Decree Article 41.
- Parent law: VAT Act Article 26(1)12.
- External reference: Housing Act Article 2(9).
- Application rule: Article 41 amendment applies to services supplied on or after 2024-07-01.
