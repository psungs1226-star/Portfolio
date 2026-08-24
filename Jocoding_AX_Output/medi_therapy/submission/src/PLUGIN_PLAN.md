# Meditherapy Influencer Seeding Codex Plugin Plan

## 0. Phase Harness 운영 구조

Phase 0에서 고정한 문제 문장은 "글로벌 뷰티/홈에스테틱 제품의 인플루언서 시딩 의사결정을 온톨로지, 인과 가설, 반복 실험 루프로 바꾸는 Codex 플러그인"이다. 이 문장은 공개 근거로 확인 가능한 글로벌 확장, TikTok/인플루언서, 제품별 메시지, 광고 데이터 분석 니즈를 바탕으로 한 보수적 문제 정의다. 내부 매출 데이터 없이 특정 시딩이 매출을 만들었다고 단정하지 않고, 매출 기여 가능성을 검증 가능한 가설과 KPI 루프로 남긴다.

상세 실행 단계는 `submission/PHASE_HARNESS.md`와 `submission/src/data/phase_harness.json`에 둔다. Reviewer 모델의 phase별 검수 항목과 사용자 직접 검토 지점은 `submission/REVIEW_PROTOCOL.md`에 둔다. 사용자 승인 요청 전에 Codex가 먼저 수행할 자체 검토 절차는 `submission/PRE_APPROVAL_PROTOCOL.md`에 둔다. 자체검증 후 수정/재검증 루프는 `submission/SELF_VALIDATION_FIX_LOOP.md`에 둔다. 이 기획서는 전략과 판단 기준을 설명하고, harness 문서는 각 단계를 입력, 수행, 검수 게이트, 산출물, 실패 시 조치로 나눈다.

Phase 구성:

- Phase 0: 문제와 공개 근거 고정
- Phase 1: 제품 온톨로지 고정
- Phase 2: 인플루언서 후보 수집
- Phase 3: 인플루언서 파라미터 추출 및 정규화
- Phase 4: 제품-인플루언서 매칭
- Phase 5: 시딩 수행
- Phase 6: 결과 수집 및 성과 테이블
- Phase 6A: 신제품 입력 기반 기존 DB 랭킹
- Phase 6B: 신제품 리서치 갭 판단
- Phase 6C: 신제품 추가 리서치 및 재랭킹
- Phase 7: 5.4 Mini 리뷰어 검수
- Phase 8: 반복 학습
- Phase 9: 제출 패키징

인플루언서 데이터는 Phase 2와 Phase 3에서 가장 엄격하게 다룬다. 후보 30명, 후보당 최근 콘텐츠 10개, 총 300개 관찰치를 기준으로 하며, 필수 필드 미충족 후보는 추천하지 않고 `needs_more_data` 또는 `insufficient_public_data`로 남긴다.

신제품 입력 시나리오는 Phase 6 이후 확장 루프로 둔다. 기본 모드는 신제품 1개를 기존 인플루언서 DB 전체에 매칭해 즉시 랭킹하는 `Phase 6A`다. 추가 공개 리서치는 기본값이 아니라, 기존 DB로 충분한 후보를 만들 수 없거나 데이터 freshness가 낮을 때만 `Phase 6B`에서 판단하고 `Phase 6C`에서 제한적으로 실행한다. 이 구조는 실시간 리서치의 불안정성을 줄이고, DB 기반 판단 시스템이 반복적으로 더 똑똑해지는 AX 루프를 보여주기 위한 결정이다.

## 1. MVP 데이터 파라미터

### MVP 범위

- 대상 시장: 북미 우선, 한국/일본/동남아는 확장 슬롯으로 둔다.
- 대상 채널: TikTok 1순위, Instagram Reels 2순위, Amazon review/Live 3순위.
- 후보 규모: 30명 수집, 12명 숏리스트, 6명 시딩 추천, 3명 대조군 기록.
- 제품 규모: 제품군 5개 중 MVP 제품 9개만 우선 사용한다.
- 콘텐츠 표본: 후보당 최근 공개 콘텐츠 10개, 총 300개 메타데이터를 수집한다.
- 실험 기간: 2주 콘텐츠 설계 + 2주 성과 관찰 + 1주 회고 루프.

### 필수 파라미터

인플루언서 기본값:

- `handle`, `platform`, `country`, `language`
- `follower_band`: `1k-10k`, `10k-50k`, `50k-250k`, `250k+`
- `content_domains`: skincare, makeup, GRWM, acne, anti-aging, home-esthetic, ingredient education
- `skin_concerns`: dryness, acne-prone, redness, barrier, texture, pores, pigmentation, wrinkles, dullness
- `audience_signals`: country, age band, repeated comment themes, purchase intent phrases
- `commercial_signals`: past sponsored content, product review style, link/coupon usage, Amazon/TikTok Shop fit
- `risk_signals`: medical claims, filter-heavy review, sensitive skin/retinoid/pregnancy disclosures, claim compliance risk

제품 기본값:

- `product_id`, `family_id`, `format`
- `best_for_concerns`
- `skin_type_fit`, `skin_type_caution`
- `content_fit`
- `audience_fit`
- `risk_flags`
- `measurement_kpis`

스코어 기본값:

- 인플루언서 본인 피부 적합도: 35
- 팔로워/시장 적합도: 25
- 콘텐츠 형식 적합도: 20
- 채널/국가 구매경로 적합도: 10
- 리스크 감점: 10

## 2. 대회용 인플루언서 대상 선정 및 수집방법

### 선정 원칙

실제 계약 가능한 최종 명단을 맞히는 것이 아니라, 메디테라피가 내부 데이터 없이도 판단 가능한 시딩 시스템을 보여주는 것이 목적이다. 따라서 대회 MVP는 공개 데이터로 분류 가능한 후보군을 만들고, 플러그인이 왜 특정 제품과 후보를 연결했는지 설명하게 한다.

### 후보군 구성

- A군: acne/trouble/barrier creator 8명
- B군: texture/pore/makeup-prep creator 7명
- C군: tone/spot/glow creator 5명
- D군: anti-aging/home-esthetic creator 5명
- E군: broad GRWM/lifestyle beauty creator 5명

### 우선 수집 대상

- 1순위: 팔로워 10k-250k의 마이크로/미드 크리에이터
- 2순위: 최근 30일 스킨케어 콘텐츠가 3개 이상인 계정
- 3순위: 필터 없는 피부 클로즈업, 루틴 설명, 댓글 질의응답이 있는 계정
- 제외: 질병 치료를 단정하는 계정, 과도한 before/after 보정 계정, 제품 고지 없는 반복 광고 계정

### 수집 방법

1. TikTok 검색어로 후보를 찾는다.
   - `acne prone skincare routine`
   - `skin barrier repair routine`
   - `retinal skincare`
   - `hyperpigmentation skincare`
   - `k beauty skincare review`
   - `pdrn skincare`
   - `home facial skincare`
2. 공개 후보 리스트와 인플루언서 검색 도구 페이지를 보조 근거로 쓴다.
   - Modash, Favikon, SocialBook, Insense, IZEA 등 공개 랭킹/후보 페이지
3. 후보별 최근 콘텐츠 10개의 공개 메타데이터를 표준 입력으로 정리한다.
   - URL, 날짜, 조회수, 좋아요, 댓글 수, 콘텐츠 주제, 언급 피부고민, 제품군, 광고 여부
4. 댓글은 원문 저장 대신 테마만 추출한다.
   - 예: `where_to_buy`, `sensitive_skin_question`, `routine_request`, `price_question`, `before_after_request`

## 3. 메디테라피 제품군 중 실제 데이터 -> 파라미터 분할

### MVP 제품 9개

- `hyaluronic_first_serum`: 건조/수분/입문 루틴/GRWM 후보용 낮은 리스크 기본 세럼
- `pdrn_serum`: 트러블/붉음/장벽 후보용 기본 세럼
- `panthenol_core_booster_cream`: 민감/장벽 리스크가 높은 후보의 안전 대안
- `retinal_skin_booster_serum`: 피부결/흔적/화잘먹 후보용
- `aha_bha_routine_cleanser`: 지성/각질/모공 루틴 진입 제품
- `vitamin_bubble_serum`: 톤/광채/버블 제형 시연형 숏폼 제품
- `tranexamic_cream`: 흔적/색소/스팟 루틴형 제품
- `tension_up_mask`: 홈에스테틱/비주얼 데모 제품
- `wrinklefit_eye_patch`: GRWM/퀵케어/눈가 피로 콘텐츠 제품

### 파라미터 분할 방식

- 제품 설명 데이터: 공식/판매 페이지의 포지셔닝, 제형, 사용 맥락
- 피부고민 데이터: 제품이 해결한다고 주장하는 고민을 표준 태그로 변환
- 콘텐츠 데이터: 숏폼에서 보여줄 수 있는 시연 가능성을 태그로 변환
- 리스크 데이터: 레티날, 산 성분, 눈가, 텐션, 민감피부, 의료적 표현 위험을 감점 태그로 변환
- 측정 데이터: 제품별 기대 KPI를 다르게 둔다.

제품별 KPI 예시:

- 히알루론산: 루틴 저장률, 건조/수분 질문, GRWM 메이크업프렙 댓글
- PDRN/판테놀: 댓글의 민감피부 질문, 루틴 저장률, 재방문 댓글
- 레티날/AHA-BHA: 사용법 질문, 야간 루틴 저장률, 부작용 리스크 신고
- 비타민/트라넥삼산: 톤/광채 관련 댓글, 2주 루틴 완주율
- 텐션업/아이패치: 시청 유지율, 공유율, GRWM 전환 클릭

## 4. 데이터 수집 - 분류 - 시딩 - 결과 구축 과정

### 1단계: 수집

입력:

- 제품 JSON
- 후보 계정 URL
- 최근 콘텐츠 URL 10개
- 공개 지표
- 수집자가 작성한 피부/콘텐츠/댓글 테마 요약

산출:

- `influencer_candidates.jsonl`
- `content_observations.jsonl`
- `collection_notes.md`

### 2단계: 분류

플러그인은 후보를 아래 온톨로지로 분류한다.

- Creator: 계정, 채널, 국가, 언어, 팔로워 밴드
- Skin Concern: 피부 타입, 피부 고민, 금기/주의 신호
- Content Context: 루틴, GRWM, 교육, 리뷰, 챌린지, 홈에스테틱 데모
- Audience Intent: 구매 질문, 사용법 질문, 민감성 질문, 가격 질문, 대체품 질문
- Product Fit: 제품군, 제형, 사용 난이도, 리스크
- Measurement: 노출, 참여, 클릭, 쿠폰, 댓글 품질, 반복 콘텐츠 가능성

산출:

- 후보별 `influencer_profile`
- 제품별 `product_fit_score`
- 누락 데이터 질문
- 리스크 플래그

### 3단계: 시딩 추천

추천 결과는 단순 순위가 아니라 가설로 출력한다.

- 후보에게 어떤 제품을 보낼지
- 왜 본인 피부/콘텐츠/팔로워에 맞는지
- 어떤 콘텐츠 각도가 매출 가설과 연결되는지
- 어떤 표현을 피해야 하는지
- 어떤 KPI로 성공/실패를 볼지
- 다음 반복에서 무엇을 바꿀지

결과 표시 우선순위:

1. `ready_for_matching`: 근거가 충분해 바로 제품 매칭을 검토할 수 있는 후보
2. `review_required_before_matching`: 점수가 높아도 의료/시술/과장 표현 리스크 검토가 먼저 필요한 후보
3. `needs_more_data`: 후보군에는 남기지만 추가 데이터 없이는 고신뢰 추천으로 보이지 않게 하단 배치

이 우선순위는 최종 추천 점수보다 먼저 적용한다. 점수는 같은 그룹 안에서만 정렬 기준으로 쓴다.

추천 예시 구조:

```json
{
  "creator_handle": "@example",
  "display_group": "ready_for_matching",
  "display_priority": 1,
  "recommended_product": "pdrn_serum",
  "causal_hypothesis": "민감/트러블 루틴을 자주 다루는 후보라서 PDRN 세럼 시딩 시 댓글의 사용법 질문과 저장률이 높아질 가능성이 있다.",
  "content_brief": "필터 없는 7일 장벽 루틴, 자극 표현은 체감 중심으로 제한",
  "primary_kpi": "save_rate",
  "secondary_kpi": "sensitive_skin_question_count",
  "risk_review": ["do_not_claim_medical_acne_treatment"]
}
```

### 4단계: 결과 구축

내부 매출 데이터가 없는 대회 MVP에서는 직접 매출을 단정하지 않는다. 대신 매출 기여 가능성을 단계별 프록시로 둔다.

- 0단계: 게시 여부
- 1단계: 콘텐츠 품질과 조회수
- 2단계: 저장/공유/댓글 의도
- 3단계: 링크 클릭/쿠폰 사용/장바구니
- 4단계: 주문/재구매

대회 제출에서는 0-2단계를 공개 데이터/수기 데이터로 시연하고, 3-4단계는 메디테라피 내부 데이터 연결 시 확장되는 구조로 설명한다.

## 5. 5.4 Mini 리뷰어 검수 설계

### 리뷰어 역할

`5.4 mini reviewer`는 플러그인의 출력이 기획 의도와 맞는지 독립적으로 검수하는 별도 리뷰어다. 생성 모델이 추천을 만든 뒤, 리뷰어 모델이 아래 기준으로 실패를 찾는다.

### 검수 대상

- 코드: 스키마, 스코어링, 출력 계약, 리스크 필터
- 기획: 온톨로지 -> 인과 가설 -> 반복 루프가 유지되는지
- 제품 적합성: 제품 파라미터와 추천 사유가 충돌하지 않는지
- 리스크: 의료/효능/민감피부/레티날/산 성분 표현 위험을 누락하지 않았는지
- 데이터 품질: 후보 데이터가 부족한데 과도하게 단정하지 않았는지

### 리뷰어 체크리스트

- 성별을 1차 제품 추천 기준으로 쓰지 않았는가
- 내부 매출 데이터 없이 매출 효과를 단정하지 않았는가
- 제품별 금기/주의 신호를 감점하거나 제외했는가
- 추천 이유가 인플루언서 본인, 팔로워, 콘텐츠, 시장, 리스크로 분해되어 있는가
- 결과 KPI가 제품/콘텐츠 가설과 연결되어 있는가
- 누락 데이터 질문이 포함되어 있는가
- 후보와 제품이 맞지 않을 때 `no_seed` 또는 대체 제품을 낼 수 있는가

### 리뷰어 출력

```json
{
  "review_status": "pass | revise | fail",
  "score": 0,
  "planning_alignment": [],
  "code_alignment": [],
  "risk_findings": [],
  "required_fixes": [],
  "final_comment": ""
}
```

## 6. 인플루언서와 신제품 입력 세팅

### 인플루언서 기초값

후보별로 변하지 않는 값과 캠페인마다 변하는 값을 분리한다.

고정값:

- 계정, 국가, 언어, 채널
- 주요 콘텐츠 형식
- 반복 피부고민
- 팔로워 규모 밴드
- 신뢰/리스크 패턴

변동값:

- 최근 콘텐츠 성과
- 최근 피부 상태/루틴 언급
- 시즌성 이슈
- 경쟁 제품 노출
- 협찬 피로도

### 신제품 입력값

새 제품이 들어오면 아래 필드를 입력한다.

- `new_product_name`
- `format`
- `target_concerns`
- `skin_type_fit`
- `skin_type_caution`
- `content_demonstrability`
- `usage_complexity`
- `claim_risk_flags`
- `market_priority`
- `expected_purchase_path`

### 매칭 방식

1. 신제품을 기존 제품 온톨로지에 매핑한다.
2. hard conflict를 먼저 제거한다.
3. 남은 후보에 대해 self/audience/content/market/risk 점수를 계산한다.
4. 상위 후보를 추천하되, 점수 차이가 작으면 실험군/대조군으로 나눈다.
5. 추천 결과에는 제품 설명문이 아니라 인과 가설과 검증 KPI를 포함한다.

### 신제품 랭킹 운영 모드

#### 기본 모드: 기존 DB 기반 즉시 랭킹

신제품이 입력되면 플러그인은 먼저 별도 리서치 없이 `influencer_profiles.jsonl` 전체를 대상으로 랭킹한다. 이 모드는 대회 제출과 실제 마케터 사용 흐름의 기본값이다.

입력:

- 신제품 JSON
- 기존 인플루언서 프로필 DB
- 기존 제품 온톨로지 태그 체계
- Phase 4 scoring weights

출력:

- 전체 후보 순위
- 점수 trace
- 추천/보류 사유
- 인과 가설
- KPI
- `no_seed` 가능성
- 추가 리서치 필요 여부

이 모드를 기본값으로 두는 이유:

- 빠르고 재현 가능하다.
- 이미 검증한 후보 DB와 리스크 필터를 활용한다.
- 결과가 단순 검색 목록이 아니라 온톨로지와 인과 가설로 설명된다.
- 제출 시연에서 외부 플랫폼 접근 실패 리스크가 낮다.

#### 확장 모드: 리서치 갭 판단

기존 DB 랭킹 결과가 충분하지 않을 때만 추가 리서치 필요성을 판단한다. 플러그인은 아래 조건 중 하나라도 충족하면 리서치 갭을 출력한다.

- `ready_for_matching` 후보가 6명 미만
- 신제품 핵심 세그먼트의 ready 후보가 3명 미만
- 상위 후보 6명 중 동일 세그먼트 쏠림이 70% 이상
- `stale` 또는 `expired` 후보가 전체의 30% 이상
- 제품 리스크 때문에 상위 후보 절반 이상이 `review_required` 또는 `no_seed`

리서치 갭 결과는 바로 후보를 바꾸지 않는다. 먼저 부족한 세그먼트, 필요한 검색어, 추가 수집 목표, 예상 리스크를 마케터에게 보여준다.

#### 확장 모드: 추가 리서치 후 재랭킹

사용자가 추가 리서치를 승인한 경우에만 공개 후보를 제한 수집한다. 신규 후보는 Phase 2와 Phase 3의 규칙을 그대로 통과해야 하며, 기존 DB와 merge한 뒤 재랭킹한다.

추가 리서치 후 반드시 남겨야 하는 것:

- 신규 후보 출처 URL
- 후보별 콘텐츠 관찰치
- 댓글 원문 미저장 여부
- 중복 제거 결과
- 신규 후보 confidence
- 기존 DB 랭킹과 리프레시 랭킹의 차이
- 추천 변경 사유

이 확장 모드는 “항상 새로 검색하는 자동화”가 아니라 “DB가 부족하다고 판단했을 때만 더 조사하는 반복 학습 루프”로 설명한다.

## 7. 검증 방식

### 대회 MVP 검증

- 스키마 검증: 입력 JSON이 필수 필드를 만족하는지 확인
- 휴리스틱 검증: 추천 점수 계산이 의도한 가중치대로 동작하는지 확인
- 케이스 검증: 5개 대표 인플루언서 프로필에 대해 예상 제품이 나오는지 확인
- 리스크 검증: 임신/레티날/민감피부/상처/의료표현 케이스에서 차단 또는 경고가 나오는지 확인
- 리뷰어 검증: 5.4 mini reviewer가 추천 산출물을 별도 평가

### 사업 검증

- A/B 구조: 비슷한 후보를 제품 적합 추천군과 일반 후보군으로 나눈다.
- 1차 KPI: 게시율, 조회수, 저장률, 댓글 의도 품질
- 2차 KPI: 링크 클릭, 쿠폰 사용, 장바구니
- 3차 KPI: 주문, CPA, ROAS, 재구매
- 반복 기준: 실패 원인을 후보/제품/콘텐츠/시장/리스크 중 하나로 분류하고 다음 시딩 규칙에 반영한다.

### 성공 기준

대회 제출 기준:

- 플러그인이 후보 데이터를 구조화한다.
- 제품 추천 이유를 온톨로지와 인과 가설로 설명한다.
- 리스크와 누락 데이터를 명시한다.
- 결과 KPI와 다음 반복 루프를 만든다.
- 리뷰어가 코드와 기획의 정합성을 검수한다.

실무 확장 기준:

- 내부 매출/클릭/쿠폰 데이터 연결 시 추천 규칙이 학습 가능하다.
- 국가별 콘텐츠 메시지와 제품군 우선순위를 분리할 수 있다.
- 마케터가 사람이 판단해야 할 창발적 콘텐츠 각도를 남겨둘 수 있다.
