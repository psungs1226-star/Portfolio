# Meditherapy Influencer Seeding Codex Plugin

## 한눈에 보기

이 제출물은 메디테라피의 공개 과제인 **"매출로 이어지는 인플루언서 시딩 시스템 설계"**를 해결하기 위한 Codex 플러그인 MVP다.

플러그인은 뷰티/소비재 마케터가 신제품을 입력하면 공개 인플루언서 DB를 기준으로 다음을 자동 생성한다.

- 제품 온톨로지: 피부 고민, 콘텐츠 적합성, 리스크, KPI를 구조화
- 후보 랭킹: 인플루언서 30명을 제품 적합도, 콘텐츠 맥락, 팔로워 의도, 시장/채널, 리스크로 평가
- 선정 사유 보고서: 왜 이 후보가 상위 추천인지 마케터가 읽을 수 있는 한국어 해석으로 설명
- 시딩 브리프: 콘텐츠 방향, 금지 표현, 관찰 KPI, 다음 액션을 정리
- 성과 관리 틀: 공개 반응과 내부 전환 데이터를 분리해 가설 검증 루프로 관리

MVP 최신 테스트는 메디테라피 신제품 **포쎄라 리얼 비피다 핑크 블러 크림**을 대상으로 실행했다. 최종 추천 후보 6명과 순위별 선정 사유는 `logs/new_product_ranking_report.html`에서 바로 확인할 수 있다.

## 사용 대상

- 북미 TikTok/인플루언서 시딩을 설계하는 뷰티 마케터
- 제품별 크리에이터 매칭과 콘텐츠 브리프를 빠르게 만들고 싶은 브랜드 담당자
- 내부 매출 데이터가 없는 상태에서도 과장 없이 시딩 가설과 측정 루프를 만들고 싶은 실무자

## 입력과 출력

주요 입력:

- `data/new_product_example.json`: 테스트할 신제품 정보
- `data/influencer_profiles.jsonl`: 정규화된 인플루언서 후보 30명
- `data/content_observations.jsonl`: 공개 콘텐츠 관찰치 300개
- `data/meditherapy_product_parameters.json`: MVP 제품 온톨로지

주요 출력:

- `logs/new_product_ranking_report.html`: 보고자용 HTML 랭킹 보고서
- `logs/new_product_ranking_report.md`: Markdown 랭킹 보고서
- `data/new_product_rankings.json`: 전체 후보 랭킹과 점수 trace
- `data/new_product_research_plan.json`: 추가 리서치 필요 여부 판단
- `logs/latest_new_product_test_result.md`: 최신 신제품 테스트 요약
- `logs/prepackage_test_results.json`: 패키징 전 검증 결과

## 바로 실행하기

압축 해제 후 `src` 디렉토리에서 실행한다.

```bash
python3 tools/run_phase6a_new_product_ranking.py
python3 tools/run_phase6b_research_gap.py
python3 tools/run_prepackage_tests.py
```

성공 기준:

- `logs/new_product_ranking_report.html` 생성
- `logs/prepackage_test_results.json`의 `overall_status`가 `pass`
- 보고서 산출물 계약 검사 `pass`

## Problem Definition

이 플러그인은 메디테라피의 글로벌 뷰티/홈에스테틱 마케터가 공개 인플루언서 후보, 콘텐츠 맥락, 제품 적합성, 리스크, KPI를 구조화해 "매출로 이어질 가능성을 검증할 수 있는 인플루언서 시딩 가설"을 설계하도록 돕는다.

Phase 0에서 고정한 문제 문장은 다음과 같다.

> 글로벌 뷰티/홈에스테틱 제품의 인플루언서 시딩 의사결정을 온톨로지, 인과 가설, 반복 실험 루프로 바꾸는 Codex 플러그인.

이 문제는 공개 자료에서 직접 확인되는 사실과 공개 자료를 바탕으로 한 보수적 추론을 구분해 다룬다. 메디테라피가 글로벌 확장을 지향하고, 북미 TikTok/인플루언서 시딩과 제품별 메시지, 광고 데이터 분석 업무를 채용공고에 명시했다는 점은 공개 근거로 확인한다. "어떤 시딩이 실제 매출을 만들었는가"는 내부 클릭, 쿠폰, 주문, 재구매 데이터 없이는 단정하지 않고, 플러그인은 이를 검증 가능한 가설과 측정 루프로 남긴다.

## Public Evidence

- AX 인재전쟁 공식 페이지: https://hackathon.jocodingax.ai/
- 메디테라피 인터뷰 영상: https://www.youtube.com/watch?v=1KwyhyBo0Rs
- 메디테라피 채용 비전: https://careermeditherapy.ninehire.site/vision
- 메디테라피 글로벌 TikTok 마케팅 채용공고: https://kr.linkedin.com/jobs/view/4413525615
- 2030년 누적매출 1조 목표 기사: https://www.dailian.co.kr/news/view/1412930/

## Need Breakdown

- 글로벌 확장: 북미, 일본, 동남아 등 시장별 메시지와 구매 경로를 분리한다.
- TikTok/인플루언서: 후보를 단순 팔로워 수가 아니라 피부 고민, 콘텐츠 형식, 팔로워 의도, 상업 신호로 분류한다.
- 제품별 메시지: 제품 온톨로지를 만들어 제품마다 적합한 콘텐츠 각도와 금지 표현을 분리한다.
- 광고 데이터 분석: 공개 KPI와 내부 전환 KPI를 구분하고, 내부 데이터가 있을 때만 매출 기여를 검증한다.
- 반복 가능한 AX 루프: 수집 -> 분류 -> 추천 -> 브리프 -> 결과 -> 학습의 반복 구조로 만든다.

## Non-Goals

- 공개 데이터만으로 매출, ROAS, 주문 증가를 확정하지 않는다.
- 인플루언서 성별이나 외모를 제품 추천의 1차 기준으로 쓰지 않는다.
- 의료적 치료, 완치, 영구 개선 등 화장품/뷰티 시딩에서 위험한 표현을 만들지 않는다.
- 단순 팔로워 수 랭킹이나 대량 DM 자동화 도구로 만들지 않는다.
- 댓글 원문, 비공개 개인정보, API 키, 토큰을 저장하지 않는다.

## Phase Harness

실행 단계는 `PHASE_HARNESS.md`에 정의되어 있다. Phase 0은 문제와 공개 근거를 고정하는 단계이며, 이후 Phase 1에서 제품 온톨로지, Phase 2-3에서 인플루언서 후보 수집과 정규화, Phase 4-8에서 추천/검증/반복 학습으로 이어진다.

## Mandatory Reports

신제품 랭킹을 실행하면 플러그인은 `logs/new_product_ranking_report.html`을 반드시 생성한다. 이 HTML 보고서는 보고자가 순위의 타당성을 판단할 수 있도록 최종 순위표, 후보별 점수 분해, 피부 고민 매칭, 콘텐츠 매칭, 리스크 판단, 인과 가설, 실행 방향, 관찰 KPI를 포함한다.

보고서는 내부 태그 나열이 아니라 마케터가 판단할 수 있는 한국어 해석을 먼저 제시한다. 후보가 어떤 제품 맥락을 자연스럽게 말할 수 있는지, 왜 그 순위인지, 어떤 가설을 검증하는지, 어떤 리스크 표현을 피해야 하는지를 설명하고 내부 태그는 보조 근거로만 남긴다. 동일한 근거는 `logs/new_product_ranking_report.md`에도 남기며, 최신 테스트 요약은 `logs/latest_new_product_test_result.md`에 별도로 정리한다. 패키징 전 테스트는 이 보고서 산출물이 없거나 선정 사유 섹션이 빠지면 실패하도록 구성했다.

## Product Ontology

Phase 1에서 MVP 제품 9개를 고정한다.

- 히알루론산 스킨부스터 퍼스트 세럼
- PDRN 스킨부스터 세럼
- 판테놀 코어 부스터 크림
- 레티날 스킨부스터 세럼
- AHA/BHA 루틴 클렌저
- 비타민 스킨부스터 버블세럼
- 트라넥삼산 스킨부스터 크림
- 텐션 업 마스크
- 링클핏 탱글 아이패치

각 제품은 `best_for_concerns`, `skin_type_fit`, `skin_type_caution`, `content_fit`, `risk_flags`, `measurement_kpis`를 가진다. 추천은 제품 설명문을 반복하지 않고, 인플루언서 본인 적합도, 팔로워/시장 적합도, 콘텐츠 적합도, 채널/국가 적합도, 리스크 감점을 분리해 만든다.

레티날, AHA/BHA, 눈가, 텐션, 톤·잡티 제품은 과장/의료 표현과 자극 리스크를 별도 필드로 유지한다. 리스크가 높거나 공개 데이터가 부족하면 플러그인은 제품을 추천하지 않고 `no_seed`, 대체 제품, 또는 추가 질문을 출력할 수 있다.
