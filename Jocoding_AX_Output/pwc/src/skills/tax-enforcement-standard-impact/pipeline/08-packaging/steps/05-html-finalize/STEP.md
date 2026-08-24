# Step 5. HTML Deliverable Finalization

- Update `judgment_layer` (currently pilot) to reflect the deep-judgment scaffold + L2 심판례 result.
- Reflect REVIEW_WORTHY verdict and the L1/L2/L3 signal layers in `proactive_action_brief` and `review_list`.
- Enforce the source-summary rule: cite each 예규·심판례·집행기준 with its 요지 (면세/과세 결론 + 근거) inline, not just the document number.
- Verify: doctype/title/closing tags OK; no TODO/undefined/stray script-iframe; inline 요지 rule satisfied on every referenced source.

## Data-driven build (proactive_action_brief)

`proactive_action_brief.html`은 손편집이 아니라 canonical 아티팩트에서 재생성한다. 새 개정은 소스만 갱신 후 재실행.

```
python3 build_brief.py            # 05/07 OUTPUT.json → brief_data.json → HTML (repo root)
python3 build_brief.py <out.html> # 출력 경로 지정
python3 render_brief.py           # brief_data.json만 다시 렌더(변환 생략)
```

- `HTML_SCHEMA.json` — 필드 계약(2축: 심각도 tier1/2/3 × 확신도 confirmed/review_worthy/hold/exclude, hop 0/≥1, action_kind). `verdict` 문구는 '확정' 대신 '검토 후보' 강제.
- `MAPPING.md` — 소스 필드 → 카드 필드 + moat/verdict/hop 유도 규칙.
- `brief_template.json` — 편집성 프레임(제목·실익·왜 지금). 데이터 아님.
- `build_brief.py` — canonical 아티팩트 유도 + 병합. 손편집 drift를 canonical 라벨로 교정(예: 마일리지→review_worthy, 유동화→hold).
- `render_brief.py` — 2축 개요 매트릭스 + tier×verdict×confidence 정렬 + 항목별 적대검증/놓침범위.
- 소스: `05-review-list-output/OUTPUT.json`, `07-scope-expansion/{JUDGMENT_SCAFFOLD_AXIS1,JUDGMENT_LAYER_PILOT,BLIND_BACKTEST,OUTPUT}.json`.
- 렌더 검증은 로컬 headless Chrome 스크린샷(원격 브라우저는 로컬 loopback 미도달 + 내부 산출물 외부 노출 금지).
