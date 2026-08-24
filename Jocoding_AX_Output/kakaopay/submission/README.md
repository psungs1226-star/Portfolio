# 카카오페이증권 ETF 리스크 설명 UX 플러그인

## 한눈에 보기

카카오페이증권의 해외 ETF 모으기 맥락에서, 과거 수익률 분포가 미래 성과 보장처럼 읽히지 않도록 화면과 설명 문구를 점검하는 Codex 플러그인이다.

플러그인은 과거 일별 시작점 결과를 바탕으로 최저치, 평균, 최고치를 함께 보이게 하고, 환율·배당·데이터 기간·데이터 한계를 확인하도록 돕는다. 투자 판단, 상품 권유, 주문 실행, 세무 신고, 개인 계좌 분석 기능은 제공하지 않는다.

`src/web/`에는 이 기준을 확인할 수 있는 모바일 웹 MVP가 포함되어 있다. SCHD 고정 예시 데이터와 QQQM·VOO 로컬 검증 데이터를 선택해, 기간과 하루 적립 금액에 따른 과거 참고 범위를 표시한다.

## 문제와 근거

해외 ETF 모으기와 소수점 거래처럼 반복 적립을 전제로 한 투자 화면에서는 과거 성과를 단일 수익 수치로 보여줄 경우, 사용자가 이를 앞으로의 결과로 오해할 수 있다. 이 제출물은 결과의 좋고 나쁨보다 결과가 만들어진 조건과 범위를 먼저 이해시키는 설명 UX를 목표로 한다.

공개 근거와 출처 URL은 다음 문서에 정리되어 있다.

- `src/docs/research-kakaopaysec.md`
- `src/docs/research-kakaopaysec-deeper.md`
- `src/docs/research-kakaopaysec-competitive-gaps.md`

## 플러그인 구성

```text
submission/
  README.md
  logs/                         # 편집하지 않은 AI 대화 원본 로그
  src/
    .codex-plugin/plugin.json   # Codex 플러그인 manifest
    skills/
      kakaopay-securities/
        SKILL.md                # 리스크 설명 UX 점검 기준
    docs/                       # 공개 근거와 코드 리뷰 기준
    web/                        # React 기반 모바일 웹 MVP
```

플러그인의 핵심 동작은 `src/skills/kakaopay-securities/SKILL.md`에 있다. Codex는 화면 문구, 컴포넌트 코드, README, 제출 답변 초안을 받아 아래를 점검한다.

1. 결과가 과거 참고 범위이며 보장이 아니라는 뜻이 결과 근처에 있는지
2. 과거 최저치·평균·최고치가 함께 표시되는지
3. ETF가 분석 대상 또는 검증 데이터로만 표현되는지
4. 환율, 배당, 데이터 출처, 기간, 한계가 확인 가능한지
5. 주문·매수·계좌·세무 처리로 이어지는 기능이나 표현이 없는지

## 사용 예시

```text
해외 ETF 모으기 결과 화면 문구를 점검해줘.
```

```text
아래 화면 초안을 과거 수익률 참고 범위 중심으로 고쳐줘.
```

```text
README와 웹 MVP가 같은 리스크 설명 원칙을 따르는지 확인해줘.
```

## 웹 MVP와 데이터

웹 MVP는 실행 중 외부 API를 호출하지 않는다. 저장된 로컬 fixture만 사용하므로, 같은 제출물에서 계산과 화면을 재현할 수 있다.

| 대상 | 데이터 성격 | 가격·배당 처리 | 가능한 과거 참고 기간 |
|---|---|---|---|
| SCHD | 로컬 고정 예시 | 예시 가격과 연 3.2% 배당 재투자 가정 | 3년, 5년, 10년 |
| QQQM | Yahoo Finance 로컬 스냅샷 검증 데이터 | 일별 조정종가, 추가 배당률 0% | 3년, 5년 |
| VOO | Yahoo Finance 로컬 스냅샷 검증 데이터 | 일별 조정종가, 추가 배당률 0% | 3년, 5년, 10년 |

QQQM은 상장 이후 데이터 기간이 10년보다 짧으므로 10년 선택을 제공하지 않는다. VOO는 10년 표본 계산까지 검증한다. QQQM·VOO와 USD/KRW 데이터의 출처 URL, 생성 시각, 데이터 시작·종료일은 `src/web/src/data/marketFixtures.generated.ts`에 기록된다.

`npm run fetch:fixtures`는 Yahoo Finance chart API에서 QQQM, VOO, USD/KRW 데이터를 다시 받아 로컬 스냅샷 파일을 갱신하는 검증용 명령이다. 운영 시세 연동이나 시세 공급 계약을 의미하지 않는다.

## 실행

```bash
cd submission/src/web
npm install
npm run dev
```

fixture를 새로 받아 검증하려면 네트워크 연결이 필요하다.

```bash
cd submission/src/web
npm run fetch:fixtures
npm test
npm run build
```

## 검증 방법

웹 계산과 빌드 검증:

```bash
cd submission/src/web
npm test
npm run build
```

데이터 snapshot 갱신을 포함한 검증:

```bash
cd submission/src/web
npm run fetch:fixtures
npm test
npm run build
```

Codex 플러그인 manifest와 스킬 구조 검증:

```bash
python3 -m venv /tmp/codex-plugin-validate
/tmp/codex-plugin-validate/bin/pip install PyYAML
/tmp/codex-plugin-validate/bin/python \
  /Users/psh/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py \
  submission/src
```

제출물에 필요한 파일 확인:

```bash
test -f submission/src/.codex-plugin/plugin.json
test -f submission/src/skills/kakaopay-securities/SKILL.md
test -f submission/README.md
find submission/logs -type f
```

사용자 문구의 금지 표현 확인:

```bash
rg -n "예상 수익률|95% 확률|추천|안정적|초보자에게 적합|장기적으로 유리" \
  submission/src submission/README.md
```

검색 결과는 금지 목록을 설명하는 문서에서만 허용한다. 앱 화면, CTA, 결과 라벨, 제품 주장에 해당 표현이 있으면 수정 대상이다.

## 한계와 범위

- 모든 숫자는 설명 UX 검증을 위한 과거 데이터와 가정에서 만든 참고 범위이며, 미래 성과를 의미하지 않는다.
- SCHD는 로컬 고정 예시이고 QQQM·VOO는 제출 시점에 저장한 검증용 snapshot이다. 특정 ETF 선택을 유도하지 않는다.
- 원화 결과는 USD/KRW 과거 데이터를 함께 반영하므로 환율에 따라 달라질 수 있다.
- 조정종가를 쓰는 QQQM·VOO에는 배당을 별도로 더하지 않는다.
- 실시간 시세, 실제 주문, 계좌 정보, 세무 계산, 카카오페이증권 내부 정책이나 내부 데이터와 연결하지 않는다.
- 이 제출물은 공개 자료 기반의 프로토타입이며 운영 서비스 구현이나 투자 자문이 아니다.

## 로그

AI와 주고받은 원본 대화 로그는 `logs/`에 보관한다. 제출 과정에서 로그를 편집·발췌·삭제하지 않는다.
