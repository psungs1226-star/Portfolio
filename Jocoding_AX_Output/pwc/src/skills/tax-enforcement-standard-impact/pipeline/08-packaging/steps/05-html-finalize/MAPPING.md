# 파이프라인 OUTPUT.json → action-brief HTML : 매핑 계약

`build_brief.py`가 이 규칙대로 canonical 아티팩트를 읽어 `brief_data.json`을 유도하고 `render_brief.py`로 HTML을 낸다. 손으로 문장을 쓰지 않는다. 각 카드의 모든 판단축은 아래 출처 필드에서 결정론적으로 유도된다.

## 소스 → 카드 매핑

| 카드 | 소스 아티팩트 | 소스 경로 |
|---|---|---|
| 토지임대부 부수토지 임대 | `05-review-list-output/OUTPUT.json` | `section_1_likely_affected_enforcement_standards[0]` |
| 기술보증기금 면세범위(검토대상·≥1홉) | `07-scope-expansion/JUDGMENT_SCAFFOLD_AXIS1.json` | 전체 |
| 마일리지·포인트 과세표준(Tier2) | `07-scope-expansion/JUDGMENT_LAYER_PILOT.json` + `BLIND_BACKTEST.json` | `tier2_demonstration.confirmed_firing_과표축` + flip 5 개정 특정 |
| 신규 면세 편입(거래상대방 알림) | `07-scope-expansion/JUDGMENT_LAYER_PILOT.json` | `pilot_target.amendment_events` 중 `change`에 '신설' 포함 |
| 유동화 업무수탁용역(hold) | `07-scope-expansion/JUDGMENT_LAYER_PILOT.json` | `plan_A_executed.flip_analysis[]` 중 유동화 |
| 자동 감시(모니터링) | `07-scope-expansion/BLIND_BACKTEST.json` | `results.per_flip` (HIT/MISS) + `secondary_findings` |

편집성 프레임(제목·실익 카드·왜 지금 callout)은 데이터가 아니라 `brief_template.json`에서 병합한다.

## 판단축 유도 규칙 (moat / verdict / hop)

### tier (심각도)
- 과거 판정의 **분류가 뒤집힘(면세↔과세)** 또는 신규 면세/과세 편입 → **1**. (moat Tier 1, change_type=Target)
- 분류 유지·**효과/과세표준(에누리·안분) 변동** → **2**. (moat Tier 2, change_type=Effect)
- 분류·효과 무변동(관습 성문화) → **3**.
- 소스 태그: `JUDGMENT_LAYER_PILOT.moat_priority`, `flip_analysis[].tier`(`tier1_flip`→1, `tier3_low`→3), `tier2_demonstration`(→2), Phase5 `main_impact_type`(`Target impact`→1).

### verdict (확신도) — 절대 review_worthy를 '확정 변경'으로 승격 금지
- Phase5 `status=review` + staleness 확정(`07/OUTPUT.json.aggregate.staleness_confirmed_positive`) → **confirmed**.
- 신설 조문 개정 텍스트 실측(`JUDGMENT_SCAFFOLD_AXIS1.data_provenance`) → **confirmed**.
- 스캐폴드 `verdict.flip=false` / `flip_analysis[].flip_verdict`가 `REVIEW_WORTHY` → **review_worthy**.
- `flip_verdict=hold_확인필요` → **hold**.
- `flip_verdict=exclude` → **exclude**.
- Tier2 메커니즘 확인이나 유발 개정 원문 대조 pending → **review_worthy**(단정 회피).

### confidence
- Phase5/스캐폴드 `confidence`(high/medium/low) 그대로. pending 잔여가 있으면 한 단계 하향.

### hop (비자명성)
- Direct Link(조문번호·엔티티 키워드 직접 일치) → **0**.
- 유추·해석카논 연쇄·별개 호 반사효과(`hop_class.class="≥1홉"`) → **1**.

### keyword_diff (키워드 변경 요약)
- 신설: 스캐폴드 `requirement_text_verbatim`(before/after), pilot `amendment_events`, Phase5 `affected_legal_logic.target`.
- 삭제: `flip_analysis` 삭제 이벤트 → `op=삭제`.
- 불변: 스캐폴드 `제6호_불변`, 동의어 gap(마일리지↔포인트) → `op=불변`.
- 치환: 정비 전후 어휘 교체.

### inference / prior / action 텍스트
- prior.gist ← 소스의 `evidence_summary` / `gist_verbatim` / `deleted_case_gist`+`retained_case_gist` (요지 인라인, 문서번호 단독 금지).
- inference.delta ← `conclusion_delta.net` / `tier2_nature` / `flip_analysis[].reason`.
- counter_args ← `counter_arguments`. direct_check ← `conclusion_delta.corroborating_ruling_직접`. verification ← `adversarial_verification`(lenses 수 / flip 반증 수 / 잔여).
- action ← `review_question` / `next_steps` / pilot 후속조치.

## 실행

```
python3 build_brief.py            # canonical 아티팩트 → brief_data.json → HTML
python3 build_brief.py <out.html> # 출력 경로 지정
```

`build_brief.py`는 `brief_data.json`(generated, 재생성됨)과 HTML을 동시에 낸다. 새 개정을 넣으려면 소스 아티팩트만 갱신하고 재실행한다.
