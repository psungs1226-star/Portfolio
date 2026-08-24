# Step 1. Enumerate Amendment Events

- Pull VAT statute/decree revision history (연혁) over a defined window.
- For each history row, capture effective date, promulgation number, before/after history ids.
- Flag rows whose changed article path or keywords touch the selected issue (면세/과세구분).
- Output a candidate amendment event list. Log the window bounds explicitly.
