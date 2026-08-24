# Meditherapy Seeding Plugin Phase Harness

이 문서는 `submission/PLUGIN_PLAN.md`를 실제 실행 가능한 phase harness로 쪼갠 것이다. 각 phase는 입력, 수행, 검수 게이트, 산출물, 실패 시 조치를 가진다. 목적은 인플루언서 파라미터 수집과 검증을 대충 하지 않고, 추천 결과가 항상 근거와 리스크를 가진 상태로 나오게 만드는 것이다.

Phase별 reviewer 모델 검수 항목과 사용자 직접 검토 지점은 `submission/REVIEW_PROTOCOL.md`에 고정한다. 이 문서는 실행 흐름을 정의하고, `REVIEW_PROTOCOL.md`는 각 phase에서 무엇을 통과/수정/실패로 볼지와 사용자가 언제 판단해야 하는지를 정의한다.

사용자 승인 요청 전 Codex 자체 검토 절차는 `submission/PRE_APPROVAL_PROTOCOL.md`에 고정한다. 각 phase는 사용자에게 넘기기 전에 산출물 존재, 형식 검증, 내용 정합성, 리스크, reviewer 결과, 사용자 판단 포인트를 먼저 정리해야 한다.

자체검증 이후 발견된 이슈의 수정/재검증 루프는 `submission/SELF_VALIDATION_FIX_LOOP.md`에 고정한다. 각 phase는 blocker 또는 reviewer `fail`이 남아 있으면 다음 phase로 넘어가지 않는다.

## Phase 0. 문제와 공개 근거 고정

목적:

- 대회 제출 문제가 공개 자료로 검증 가능한지 고정한다.
- 플러그인이 풀 문제를 “매출로 이어지는 인플루언서 시딩 시스템 설계”로 좁힌다.

입력:

- AX 인재전쟁 페이지
- 메디테라피 인터뷰 영상
- 메디테라피 채용 비전
- 글로벌 TikTok 마케팅 채용공고
- 2030년 누적매출 1조 목표 기사

수행:

- 문제 문장을 1개로 고정한다.
- 메디테라피의 니즈를 `글로벌 확장`, `TikTok/인플루언서`, `제품별 메시지`, `광고 데이터 분석`, `반복 가능한 AX 루프`로 분해한다.
- 플러그인이 하지 않을 것을 명시한다.

검수 게이트:

- 공개 URL이 최소 3개 이상 남아 있는가
- 내부 데이터 없이는 매출 효과를 단정하지 않는가
- 문제 정의가 온톨로지, 인과 가설, 반복 루프와 연결되는가

산출물:

- `agents.md` 추가 사실 로그
- README 공개 근거 섹션
- `submission/README.md` 문제 정의 섹션
- `submission/logs/phase0_validation.json`
- `submission/logs/phase0_pre_approval.md`

실패 시 조치:

- 공개 근거가 부족하면 범위를 줄이고 “가설 설계 도구”로 표현한다.

## Phase 1. 제품 온톨로지 고정

목적:

- 메디테라피 제품을 피부 고민, 콘텐츠 형식, 리스크, KPI로 나눠 플러그인이 판단 가능한 형태로 만든다.

입력:

- `submission/src/data/meditherapy_product_parameters.json`
- 공식/판매 페이지의 제품명, 제형, 포지셔닝, 사용 맥락

수행:

- 제품군을 5개로 분류한다.
- MVP 제품 9개만 우선 사용한다.
- 각 제품에 `best_for_concerns`, `skin_type_fit`, `skin_type_caution`, `content_fit`, `risk_flags`, `measurement_kpis`를 붙인다.
- 레티날, AHA/BHA, 눈가 제품, 텐션 제품처럼 리스크가 큰 제품은 hard caution을 둔다.

검수 게이트:

- 모든 MVP 제품에 피부 고민, 콘텐츠, 리스크 태그가 있는가
- 효능 표현이 의료적 치료 단정으로 바뀌지 않았는가
- 성별이 제품 추천의 1차 기준으로 쓰이지 않는가
- 신제품 입력 시 기존 온톨로지에 매핑 가능한가

산출물:

- `meditherapy_product_parameters.json`
- 제품별 추천/비추천 근거
- 제품별 KPI 후보
- `submission/logs/phase1_product_ontology_summary.md`
- `submission/logs/phase1_validation.json`
- `submission/logs/phase1_pre_approval.md`

실패 시 조치:

- 태그가 부족한 제품은 MVP에서 제외하거나 `needs_more_product_evidence`로 표시한다.

## Phase 2. 인플루언서 후보 수집 Harness

목적:

- 대회 MVP에 맞는 후보 30명을 공개 데이터 기반으로 수집한다.
- 후보별로 최소한의 관찰 근거를 확보해 추천이 추측으로 흐르지 않게 한다.

수집 규모:

- 총 후보: 30명
- 후보 세그먼트: 5개
- 후보당 콘텐츠: 최근 공개 콘텐츠 10개
- 총 콘텐츠 관찰치: 300개
- 우선 채널: TikTok
- 보조 채널: Instagram Reels, Amazon review/Live

후보 세그먼트:

- A군 `acne_trouble_barrier`: 8명
- B군 `texture_pore_makeup_prep`: 7명
- C군 `tone_spot_glow`: 5명
- D군 `anti_aging_home_esthetic`: 5명
- E군 `grwm_lifestyle_beauty`: 5명

필수 수집 필드:

- `handle`
- `platform`
- `profile_url`
- `country`
- `language`
- `follower_band`
- `segment_id`
- `recent_skincare_post_count_30d`
- `sampled_content_urls`
- `observed_skin_concerns`
- `observed_content_domains`
- `audience_intent_themes`
- `commercial_signals`
- `risk_signals`
- `collector_notes`
- `source_confidence`

콘텐츠별 필수 필드:

- `content_url`
- `published_at`
- `view_count`
- `like_count`
- `comment_count`
- `content_type`
- `mentioned_skin_concerns`
- `mentioned_product_categories`
- `visual_evidence_level`: `clear_skin_closeup`, `partial`, `not_visible`
- `sponsorship_signal`: `disclosed`, `likely`, `none`, `unknown`
- `comment_intent_themes`
- `claim_risk_observed`

수행:

1. 세그먼트별 검색어를 실행한다.
2. 후보 계정 URL을 수집한다.
3. 최근 30일 스킨케어 콘텐츠가 3개 이상인지 확인한다.
4. 후보당 최근 콘텐츠 10개를 표본으로 잡는다.
5. 댓글 원문은 저장하지 않고 의도 테마만 기록한다.
6. 후보별 수집 신뢰도를 `high`, `medium`, `low`로 표시한다.

검수 게이트:

- 후보 30명 중 24명 이상이 필수 필드를 충족하는가
- 각 세그먼트가 최소 목표치의 80% 이상 채워졌는가
- 후보당 콘텐츠 10개가 없으면 부족 사유가 기록되었는가
- 피부 고민은 최소 2개 이상의 관찰 근거에서 나온 것인가
- 댓글 의도 테마는 원문 저장 없이 분류값으로만 남겼는가
- 광고/협찬/필터/의료 주장 리스크가 별도 필드로 남았는가

산출물:

- `submission/src/data/influencer_candidates.jsonl`
- `submission/src/data/content_observations.jsonl`
- `submission/logs/collection_notes.md`

실패 시 조치:

- 후보 데이터가 부족하면 `insufficient_public_data`로 표시하고 추천 대상에서 제외한다.
- 세그먼트가 부족하면 세그먼트 검색어를 확장하되, MVP 규모는 늘리지 않는다.

## Phase 3. 인플루언서 파라미터 추출 및 정규화 Harness

목적:

- 수집 데이터를 플러그인이 점수화할 수 있는 표준 인플루언서 프로필로 바꾼다.

입력:

- `influencer_candidates.jsonl`
- `content_observations.jsonl`
- `influencer_mvp_parameters.json`

수행:

- 피부 고민을 표준 태그로 변환한다.
- 콘텐츠 형식을 표준 태그로 변환한다.
- 댓글 의도를 구매 가능성 프록시로 분류한다.
- 리스크 신호를 hard exclusion, soft penalty, review note로 나눈다.
- 각 추출값에 근거 URL 개수와 confidence를 붙인다.

정규화 규칙:

- `skin_concerns`는 관찰 2회 이상이면 primary, 1회이면 secondary로 둔다.
- `content_domains`는 최근 10개 콘텐츠 중 3개 이상이면 primary로 둔다.
- `audience_intent_themes`는 댓글 원문 저장 없이 카운트와 테마만 둔다.
- 팔로워 수는 정확값보다 band로 저장한다.
- 민감 정보와 성별은 제품 추천의 핵심 기준으로 쓰지 않는다.

검수 게이트:

- 모든 후보에 `influencer_profile`이 생성되었는가
- primary concern이 근거 없이 생성되지 않았는가
- risk hard exclusion이 soft penalty로 약화되지 않았는가
- `unknown` 값을 모델이 임의로 채우지 않았는가
- 제품 추천에 쓰인 필드와 수집 필드가 추적 가능한가

산출물:

- `submission/src/data/influencer_profiles.jsonl`
- `submission/logs/normalization_report.json`

실패 시 조치:

- 근거가 부족한 필드는 `unknown`으로 유지한다.
- 추천에 필요한 핵심 필드가 부족하면 후보 상태를 `needs_more_data`로 둔다.

## Phase 4. 제품-인플루언서 매칭 Harness

목적:

- 후보와 제품을 점수로 연결하되, 결과를 설명 가능한 인과 가설로 바꾼다.

입력:

- `meditherapy_product_parameters.json`
- `influencer_profiles.jsonl`
- `influencer_mvp_parameters.json`

수행:

1. hard exclusion을 먼저 적용한다.
2. 결과 표시 우선순위는 `ready_for_matching` -> `review_required_before_matching` -> `needs_more_data` 순서로 고정한다.
3. 인플루언서 본인 피부 적합도 35점을 계산한다.
4. 팔로워/시장 적합도 25점을 계산한다.
5. 콘텐츠 형식 적합도 20점을 계산한다.
6. 채널/국가 구매경로 적합도 10점을 계산한다.
7. 리스크 감점 10점을 적용한다.
8. 상위 3개 제품과 `no_seed` 가능성을 함께 산출한다.
9. 추천마다 인과 가설, 콘텐츠 브리프, KPI, 리스크, 누락 질문을 붙인다.

검수 게이트:

- hard exclusion 후보에게 위험 제품이 추천되지 않았는가
- 추천 사유가 self/audience/content/market/risk로 분해되어 있는가
- 점수와 자연어 설명이 충돌하지 않는가
- 점수가 높아도 리스크가 크면 보류할 수 있는가
- 대조군 3명을 별도로 잡을 수 있는가
- 결과 표시 순서가 `ready_for_matching`, `review_required_before_matching`, `needs_more_data` 우선순위를 따르는가
- `needs_more_data` 후보가 상단 추천/고신뢰 추천처럼 보이지 않는가

산출물:

- `submission/src/data/seed_recommendations.json`
- `submission/logs/matching_trace.jsonl`

실패 시 조치:

- 추천 설명과 점수가 충돌하면 `review_required`로 내린다.
- 모든 제품이 위험하면 `no_seed`를 출력한다.
- 표시 우선순위와 추천 점수가 충돌하면 표시 우선순위를 유지하고, 점수는 후보 그룹 내부 정렬에만 사용한다.

## Phase 5. 시딩 수행 Harness

목적:

- 추천을 실제 캠페인 실행안으로 바꾼다.
- 마케터가 바로 검토할 수 있는 후보별 시딩 브리프를 만든다.

입력:

- `seed_recommendations.json`
- 제품별 콘텐츠 가이드
- 리스크 체크리스트

수행:

- 후보별 시딩 제품을 확정한다.
- 후보별 1문장 가설을 만든다.
- 콘텐츠 브리프를 작성한다.
- 금지 표현과 주의 문구를 붙인다.
- 1차 KPI와 2차 KPI를 설정한다.
- 실험군/대조군을 분리한다.
- 내부 데이터가 없으면 공개 KPI만 수집하도록 둔다.

시딩 브리프 필수 항목:

- `creator_handle`
- `seed_product`
- `why_this_creator`
- `why_this_product`
- `causal_hypothesis`
- `content_angle`
- `required_disclosures`
- `avoid_claims`
- `primary_kpi`
- `secondary_kpi`
- `collection_window`
- `next_iteration_rule`

검수 게이트:

- 콘텐츠 브리프가 제품 효능을 과장하지 않는가
- 각 후보의 KPI가 제품/콘텐츠 가설과 연결되는가
- 후보가 제품을 쓸 수 없는 사유가 누락되지 않았는가
- 시딩 수행 기록이 나중에 결과와 매칭 가능한가

산출물:

- `submission/src/data/seeding_briefs.json`
- `submission/logs/seeding_execution_plan.md`

실패 시 조치:

- 브리프가 모호하면 추천 단계로 되돌려 missing data 질문을 추가한다.

## Phase 6. 결과 수집 및 성과 테이블 Harness

목적:

- 시딩 후 결과를 다음 추천 규칙에 반영 가능한 데이터로 만든다.

입력:

- 게시 URL
- 공개 지표
- 댓글 의도 테마
- 내부 연결 가능 시 클릭/쿠폰/주문 데이터

수행:

- 게시 여부를 기록한다.
- 게시 후 24시간, 72시간, 7일, 14일 지표를 기록한다.
- 댓글 원문은 저장하지 않고 의도 테마만 집계한다.
- 제품별 KPI와 실제 관찰값을 비교한다.
- 실패 원인을 후보/제품/콘텐츠/시장/리스크/데이터 부족 중 하나로 분류한다.

성과 단계:

- Stage 0: 게시 여부
- Stage 1: 조회수, 좋아요, 댓글, 저장, 공유
- Stage 2: 구매 의도 댓글, 사용법 질문, 가격 질문, where-to-buy 질문
- Stage 3: 링크 클릭, 쿠폰 사용, 장바구니
- Stage 4: 주문, CPA, ROAS, 재구매

검수 게이트:

- 공개 데이터와 내부 데이터가 섞일 때 출처가 구분되는가
- 매출 데이터가 없으면 매출 성공으로 표현하지 않는가
- KPI가 사후에 임의 변경되지 않았는가
- 실패 사례도 다음 루프에 남기는가

산출물:

- `submission/src/data/experiment_results.json`
- `submission/logs/result_review.md`

실패 시 조치:

- 결과 데이터가 부족하면 `inconclusive`로 표시한다.
- 성과가 낮아도 후보를 삭제하지 않고 실패 원인을 태그화한다.

## Phase 6A. 신제품 입력 기반 기존 DB 랭킹 Harness

목적:

- 신제품 1개가 들어왔을 때, 이미 정규화된 인플루언서 DB 전체를 대상으로 즉시 랭킹한다.
- 추가 리서치 없이도 왜 특정 후보가 맞는지 self/audience/content/market/risk 점수와 인과 가설로 설명한다.
- 이 기능을 플러그인의 기본 모드로 둔다.

입력:

- `submission/src/data/influencer_profiles.jsonl`
- 신제품 입력 JSON
- 기존 제품 온톨로지 태그 체계
- Phase 4 scoring weights

신제품 필수 입력 필드:

- `product_id`
- `name`
- `format`
- `best_for_concerns`
- `skin_type_fit`
- `skin_type_caution`
- `content_fit`
- `risk_flags`
- `measurement_kpis`
- `market_priority`
- `expected_purchase_path`

수행:

1. 신제품 입력을 기존 제품 온톨로지 태그로 정규화한다.
2. 필수 필드와 리스크 태그 누락을 먼저 검증한다.
3. hard exclusion과 제품-후보 리스크 충돌을 점수 계산보다 먼저 적용한다.
4. 전체 인플루언서 DB를 `ready_for_matching` -> `review_required_before_matching` -> `needs_more_data` 순서로 정렬한다.
5. 같은 표시 그룹 안에서 제품 적합 점수로 후보를 정렬한다.
6. 각 후보에 점수 trace, 추천/보류 이유, 인과 가설, KPI, 누락 질문을 붙인다.
7. 랭킹 결과가 충분한지 리서치 갭 판단값을 함께 출력한다.

검수 게이트:

- 신제품 필수 필드가 모두 존재하는가
- 기존 온톨로지에 매핑되지 않는 태그가 `unknown` 또는 `needs_product_mapping`으로 남는가
- hard exclusion이 시딩 추천으로 올라오지 않는가
- `needs_more_data` 후보가 상단 고신뢰 추천처럼 보이지 않는가
- 점수 trace와 자연어 추천 사유가 충돌하지 않는가
- 추천 결과가 단순 팔로워 수 순서가 아닌가

산출물:

- `submission/src/data/new_product_example.json`
- `submission/src/data/new_product_rankings.json`
- `submission/logs/new_product_matching_trace.jsonl`
- `submission/logs/new_product_ranking_report.md`
- `submission/logs/phase6a_validation.json`

실패 시 조치:

- 제품 필드가 부족하면 랭킹하지 않고 `needs_more_product_evidence`를 출력한다.
- 기존 DB만으로 ready 후보가 부족하면 Phase 6B 리서치 갭 판단으로 넘긴다.
- 리스크 충돌이 크면 `no_seed` 또는 `review_required_before_seed`로 보류한다.

## Phase 6B. 신제품 리서치 갭 판단 Harness

목적:

- 기존 DB 랭킹만으로 충분한지, 추가 공개 리서치가 필요한지 판단한다.
- “항상 전체 재리서치”가 아니라 부족한 세그먼트와 검색 쿼리만 제한적으로 제안한다.

입력:

- `new_product_rankings.json`
- `influencer_profiles.jsonl`
- 신제품 입력 JSON
- 데이터 freshness 정책

수행:

1. ready 후보 수를 계산한다.
2. 제품 관련 세그먼트별 후보 커버리지를 계산한다.
3. 후보별 `last_researched_at`, `evidence_url_count`, `recent_relevant_content_count`, `profile_confidence`를 확인한다.
4. 추가 리서치 트리거를 판단한다.
5. 필요한 경우 제품 기반 검색 쿼리와 수집 타깃 세그먼트를 생성한다.
6. 추가 리서치가 필요 없으면 기존 DB 랭킹을 최종 추천으로 유지한다.

추가 리서치 트리거:

- `ready_for_matching` 후보가 6명 미만
- 신제품 핵심 세그먼트의 ready 후보가 3명 미만
- 상위 후보 6명 중 동일 세그먼트 쏠림이 70% 이상
- `expired` 또는 `stale` 후보가 전체의 30% 이상
- 제품 리스크 때문에 상위 후보 절반 이상이 `review_required` 또는 `no_seed`

검수 게이트:

- 추가 리서치 필요 여부가 정량 조건으로 설명되는가
- 리서치 쿼리가 신제품 태그와 연결되는가
- 단순히 후보 수를 늘리기 위해 범위를 과확장하지 않는가
- 추가 리서치 전에도 기존 DB 기반 결과를 보존하는가

산출물:

- `submission/logs/new_product_research_gap.md`
- `submission/src/data/new_product_research_plan.json`
- `submission/logs/phase6b_validation.json`

실패 시 조치:

- 판단 근거가 약하면 `research_optional`로 표시하고 Phase 6A 결과를 우선 사용한다.
- 공개 데이터 접근이 불안정하면 리서치 실행 대신 쿼리 계획만 제출한다.

## Phase 6C. 신제품 추가 리서치 및 재랭킹 Harness

목적:

- Phase 6B에서 추가 리서치가 필요하다고 판단된 경우에만 실행한다.
- 신제품에 맞는 신규 후보를 공개 데이터로 보강하고, 기존 DB와 합쳐 재랭킹한다.

입력:

- `new_product_research_plan.json`
- 공개 후보 URL
- 최근 공개 콘텐츠 메타데이터
- 기존 `influencer_candidates.jsonl`
- 기존 `content_observations.jsonl`
- 기존 `influencer_profiles.jsonl`

수행:

1. 신제품 리서치 쿼리로 후보를 제한 수집한다.
2. 후보별 최근 콘텐츠를 표본 수집한다.
3. 댓글 원문은 저장하지 않고 의도 테마만 기록한다.
4. 기존 후보와 신규 후보의 중복을 제거한다.
5. 신규 후보를 Phase 3 규칙으로 정규화한다.
6. 기존 DB와 신규 후보를 merge한다.
7. Phase 6A 랭킹을 재실행한다.
8. 신규 리서치가 랭킹을 어떻게 바꿨는지 diff를 남긴다.

검수 게이트:

- 신규 후보 출처 URL이 추적 가능한가
- 댓글 원문이나 민감 개인정보가 저장되지 않았는가
- 신규 후보가 기존 후보와 중복 제거되었는가
- 데이터 부족 신규 후보가 고신뢰 추천으로 올라오지 않는가
- 기존 DB 랭킹과 리프레시 후 랭킹의 차이가 설명되는가
- 매출/ROAS/주문 증가를 내부 데이터 없이 주장하지 않는가

산출물:

- `submission/src/data/new_product_refreshed_candidates.jsonl`
- `submission/src/data/new_product_refreshed_profiles.jsonl`
- `submission/src/data/new_product_refreshed_rankings.json`
- `submission/logs/new_product_refresh_diff.md`
- `submission/logs/phase6c_validation.json`

실패 시 조치:

- 공개 리서치가 막히면 기존 DB 랭킹을 유지하고 `research_blocked`로 남긴다.
- 신규 후보 품질이 낮으면 merge하지 않고 별도 `needs_more_data` 풀로 보관한다.
- 리프레시 후에도 ready 후보가 부족하면 제품-콘텐츠 가설을 축소한다.

## Phase 7. 5.4 Mini 리뷰어 검수 Harness

목적:

- 생성 모델의 추천과 코드가 기획 의도에 맞는지 독립 검수한다.

입력:

- 제품 파라미터
- 인플루언서 프로필
- 추천 결과
- 시딩 브리프
- 결과 테이블

수행:

- 코드 스키마 검수
- 추천 논리 검수
- 기획 의도 검수
- 리스크 필터 검수
- 데이터 품질 검수
- 출력 문장 검수

검수 기준:

- `pass`: 바로 제출 가능
- `revise`: 수정 후 재검수 필요
- `fail`: 추천/기획/리스크 중 핵심 결함

필수 실패 조건:

- 성별을 1차 추천 기준으로 사용
- 내부 매출 데이터 없이 ROAS/매출 효과 확정
- hard exclusion 무시
- 제품 리스크와 콘텐츠 브리프 충돌
- 후보 데이터 부족 상태에서 고신뢰 추천

산출물:

- `submission/logs/reviewer_report.json`
- `submission/logs/reviewer_findings.md`

실패 시 조치:

- `fail`이면 Phase 3 또는 Phase 4로 되돌린다.
- `revise`이면 수정 diff와 재검수 결과를 남긴다.

## Phase 8. 반복 학습 Harness

목적:

- 한 번의 추천에서 끝나지 않고 다음 시딩 규칙을 더 똑똑하게 만든다.

입력:

- `experiment_results.json`
- `reviewer_report.json`
- 마케터 회고

수행:

- 성공/실패 원인을 태그화한다.
- 제품별 잘 맞는 콘텐츠 형식을 업데이트한다.
- 후보 세그먼트별 KPI 기준을 조정한다.
- 리스크 발생 사례를 제품 파라미터에 반영한다.
- 새 제품 입력 시 기존 후보 데이터로 추천 가능한지 테스트한다.

검수 게이트:

- 룰 변경 사유가 결과 데이터와 연결되는가
- 단일 사례를 전체 룰로 과잉 일반화하지 않았는가
- 다음 실험 질문이 명확한가

산출물:

- `submission/logs/iteration_notes.md`
- 업데이트된 제품/인플루언서 파라미터
- 다음 시딩 실험안

실패 시 조치:

- 근거가 약한 변경은 `hypothesis_only`로 표시하고 기본 룰에 반영하지 않는다.

## Phase 9. 제출 패키징 Harness

목적:

- 대회 제출물이 요구 구조를 만족하고, 기획과 구현이 연결되어 있음을 보여준다.

입력:

- `src/.codex-plugin/plugin.json`
- `src/skills/<name>/SKILL.md`
- README
- data
- logs

수행:

- 제출 구조를 점검한다.
- README에 phase harness 요약을 넣는다.
- README와 검증 로그에 phase 구조를 반영한다.
- 로그와 산출물이 과제 요구사항에 맞는지 점검한다.

검수 게이트:

- `submission.zip`에 필수 파일이 들어가는가
- README, 데이터, 로그의 설명이 서로 충돌하지 않는가
- 로그에 비밀정보가 없는가
- 플러그인 설명이 실제 구현 범위를 과장하지 않는가

산출물:

- `submission.zip`
- 최종 검수 로그

실패 시 조치:

- 누락 파일이 있으면 패키징을 중단하고 Phase 9를 다시 수행한다.
