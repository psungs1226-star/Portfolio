# Codex 교차검증 브리프 — action-brief HTML 파이프라인 (스킬 패키징 직전)

> 목적: 이번 세션에서 만든 **"파이프라인 산출물(JSON) → 선제 대응 실행 브리프 HTML"** 변환 파이프라인과 수용성 데모를 제3자(Codex)가 독립 재검증한다. 아래 명령만 실행하면 클레임을 스스로 확인할 수 있게 구성했다. **정적 파일 점검이 아니라 "돌려서 같은 결과가 나오는가"로 검증한다.**

## 0. 한 줄 요약

부가가치세 면세 개정이 흔드는 집행기준·과거 예규를, 손편집이 아니라 **canonical 파이프라인 아티팩트에서 결정론적으로 유도해 HTML로 렌더**하는 변환기를 붙였다. 판단축(심각도 Tier / 확신도 verdict / 비자명성 hop)은 전부 소스 필드에서 나온다. 신선 주제 1건으로 "주제 투입 → HTML 답" end-to-end까지 닫았다.

## 1. 검증 대상 파일 (모두 `src/skills/tax-enforcement-standard-impact/pipeline/08-packaging/steps/05-html-finalize/`)

| 파일 | 역할 | 종류 |
|---|---|---|
| `HTML_SCHEMA.json` | 필드 계약 (2축 tier×verdict, hop, action_kind, 정렬·렌더 규칙) | 계약 |
| `MAPPING.md` | 소스 필드 → 카드 필드 + moat/verdict/hop 유도 규칙 | 규칙 |
| `brief_template.json` | 편집성 프레임(제목·실익·왜 지금). **데이터 아님** | 프레임 |
| `build_brief.py` | **변환기** — canonical 아티팩트 → `brief_data.json` → HTML (단일 진입점) | 코드 |
| `render_brief.py` | 렌더러 — `brief_data.json` → HTML (2축 매트릭스·정렬) | 코드 |
| `brief_data.json` | build_brief 산출 중간 데이터. **generated, 손편집 금지** | 생성물 |
| `demo_brief_data.json` | S7 수용성 데모 입력(신선 주제) | 데모입력 |

산출 HTML: repo 루트 `tax_agent_proactive_action_brief.html`(5카드), `tax_agent_acceptance_demo.html`(데모 1카드).

## 2. 클레임 → 재검증 명령

리포 루트(`/Users/psh/JO_AX/pwc`)에서 실행.

### C1. 변환기가 재현 가능하다 (topic-in → HTML-out, 손편집 없음)
```bash
D=src/skills/tax-enforcement-standard-impact/pipeline/08-packaging/steps/05-html-finalize
python3 $D/build_brief.py            # brief_data.json + HTML 재생성
cp tax_agent_proactive_action_brief.html /tmp/r1.html
python3 $D/build_brief.py
diff -q /tmp/r1.html tax_agent_proactive_action_brief.html   # 무출력 = 결정론적
```
기대: 두 번 실행 diff 동일(결정론적). `built 5 items` 출력.

### C2. 모든 카드 판단축이 canonical 소스에 정박한다 (조작 아님)
`MAPPING.md`의 소스→카드 표대로, 각 값이 실제 소스 파일에 있는지 대조:
- 토지임대부 ← `05-review-list-output/OUTPUT.json` `section_1[0]` (standard_no 26-41-1, confidence high, staleness 확정은 `07/OUTPUT.json.aggregate.staleness_confirmed_positive`).
- 기술보증기금(REVIEW_WORTHY·≥1홉) ← `07/JUDGMENT_SCAFFOLD_AXIS1.json` (`verdict.flip=false`, `hop_class.class="≥1홉"`, 제3호 신설/제6호 불변 verbatim).
- 마일리지(Tier2 과표) ← `07/JUDGMENT_LAYER_PILOT.json.tier2_demonstration.confirmed_firing_과표축` + 유발개정은 `BLIND_BACKTEST.json` flip 5 (대령 28641, 2018-02-13).
- 신규 면세 편입 ← `07/JUDGMENT_LAYER_PILOT.json.pilot_target.amendment_events` 중 '신설'.
- 유동화 ← `07/JUDGMENT_LAYER_PILOT.json.plan_A_executed.flip_analysis[]` (flip_verdict `hold_확인필요`).
- 모니터링 works_on/misses ← `BLIND_BACKTEST.json.results.per_flip` (HIT: §98의6 rank 2, 한·스위스 rank 4 / MISS: 동의어 gap·해상도·프록시 잡음).

```bash
# 예: verdict 라벨이 스키마 허용값만 쓰는지
python3 - <<'PY'
import json,glob
allowed={'confirmed','review_worthy','hold','exclude'}
for f in ['.../brief_data.json','.../demo_brief_data.json']:  # 위 05-html-finalize 경로로 치환
    d=json.load(open(f))
    for it in d['items']:
        assert it['verdict'] in allowed and it['tier'] in (1,2,3) and it['hop'] in (0,1), it['id']
print('OK')
PY
```

### C3. 정직성 게이트가 실제로 작동한다 (손편집 drift를 canonical 라벨로 하향)
- 마일리지: 정비 기록 기반 **메커니즘 확인**이지 확정 실증 아님 → verdict `review_worthy`, confidence `med` (confirmed/high 아님).
- 유동화: 별개 호라 exclude 근접이나 소스 flip_verdict가 `hold_확인필요` → verdict `hold` (exclude로 단정 안 함).
- 어디에도 "면세→과세 flip 확정"으로 승격한 카드 없음. verdict 문구는 '확정' 대신 '검토 후보/검토 큐'.

### C4. 플러그인이 유효하다 (신규 파일 추가 후에도)
```bash
python3 -m venv /tmp/vp && /tmp/vp/bin/pip -q install pyyaml
/tmp/vp/bin/python ~/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py ./src   # "Plugin validation passed"
```
(validator는 외부 도구, repo 밖. `08-packaging/PACKAGING_INDEX.json.plugin_validation_record`에 실행 증빙 기록.)

### C5. HTML 무결성
```bash
python3 - <<'PY'
import re
for f in ['tax_agent_proactive_action_brief.html','tax_agent_acceptance_demo.html']:
    h=open(f,encoding='utf-8').read()
    bad=[b for b in ['undefined','{{','}}',"['","']",'<script','<iframe'] if b in h]
    print(f, 'doctype/close', h.startswith('<!DOCTYPE html>') and h.rstrip().endswith('</html>'), 'leaks', bad or 'none')
PY
```
기대: doctype/close True, leaks none. (`',` 같은 한글 인용부호는 정상 콘텐츠 — repr 누출 `['`/`']`만 결함.)

### C6. 수용성 데모가 신선 주제에서 HTML을 낸다 (S7)
```bash
D=src/skills/tax-enforcement-standard-impact/pipeline/08-packaging/steps/05-html-finalize
python3 $D/render_brief.py $D/demo_brief_data.json /tmp/demo.html
grep -c 'demo-minganjaeganjeop' /tmp/demo.html   # 1
```
데모 주제 `VAT-DEC-40-33735`(제40조①13 민간재간접벤처투자조합 면세 신설, 2023-10-19)가 2축 매트릭스 **1순위 × 검토 대상** 칸에 배치되고, verdict `REVIEW_WORTHY`(flip 단정 없음), 동의어 gap('재간접' 0건) 표면화되면 pass.

## 3. 검증 관점에서 특히 봐줄 것 (적대적 체크포인트)

1. **매핑 조작 여부**: `build_brief.py`의 각 extractor가 소스에 없는 값을 지어내지 않는가? 특히 tier/verdict/hop 유도가 `MAPPING.md` 규칙과 소스 태그(`moat_priority`, `flip_verdict`, `hop_class`)에 일치하는가.
2. **정직성 하향의 정당성**: 마일리지 review_worthy·유동화 hold 하향이 소스 근거와 맞는가, 아니면 과도한 방어인가.
3. **모니터링 수치**: works_on의 rank 2·4, HIT@10=2/7이 `BLIND_BACKTEST.json` 실제 값인가.
4. **요지 인라인 규칙**: 모든 참조 예규·집행기준이 문서번호만이 아니라 요지(결론 면세/과세 + 근거)를 달고 있는가 (프로젝트 규칙).
5. **재현성·이식성**: cwd 무관 실행되는가, `__pycache__` 등 부산물을 남기지 않는가(`sys.dont_write_bytecode`).

## 4. 알려진 한계 (정직 공개 — 이건 결함 아님, 라벨된 상태)

- 데모·플래그십은 **n=1**(과정/능력 시연이지 통계적 재현율 아님).
- 마일리지 Tier2는 유발 개정 원문 대조 pending(메커니즘 확인 수준).
- 예규 본문 근거조문 원문 일부 미조회(요지 채택) — 판단엔 비차단.
- 자동 감시는 **정밀 특정 개정(신설 조문·조약)에서만** 측정 작동(HIT@10 2/7); 광역 개정·동의어 gap은 놓침. 개선 레버(동의어 사전·항호 해상도·다중 키워드)는 미구현 로드맵.
- 상태 라벨: `completed_with_hold_flags`(brief) / `completed_with_source_check`(demo) / `generated_do_not_hand_edit`(brief_data.json).

## 5. 참고 문서

- 스킬 본문/파이프라인: `src/skills/tax-enforcement-standard-impact/SKILL.md` (Phase 0~7 + Phase 8 패키징).
- 패키징 산출물 인덱스: `08-packaging/PACKAGING_INDEX.json` (26 아티팩트, class/status 라벨).
- 수용성 데모 전문: `08-packaging/ACCEPTANCE_DEMO.md` (본문 + HTML 닫음 addendum).
- 세션 작업 로그: repo 루트 `answer.md` 하단 최근 bullet(Phase 8 S5 데이터구동 재구축 ~ 최종 검수).

> ⚠️ `logs/` 디렉터리는 열람·수정 금지(프로젝트 규칙). 검증에 불필요.
