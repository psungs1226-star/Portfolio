# ETF fixture 메모

이 폴더의 데이터는 계산 엔진과 화면 검증을 위한 로컬 fixture다.

## 파일

- `schdFixture.ts`: SCHD 설명 화면을 만들기 위한 로컬 고정 예시 데이터
- `marketFixtures.generated.ts`: `npm run fetch:fixtures`로 Yahoo Finance chart API에서 받은 QQQM, VOO, USD/KRW 검증 데이터
- `etfFixtures.ts`: 화면과 테스트가 사용하는 fixture 목록

## SCHD 고정 예시

- 분석 대상 표기: `SCHD`
- 기간: `2014-01-02`부터 `2024-12-31`까지
- 가격: 연도별 USD anchor를 일자별로 선형 보간
- 중간 변동: 2015년, 2018년, 2020년, 2022년의 하락 구간을 삼각형 stress factor로 반영
- 환율: 연도별 KRW/USD anchor를 일자별로 선형 보간
- 배당: 계산 가정에서 연 3.2%를 일 단위로 나누어 재투자

## QQQM/VOO 검증 데이터

- `QQQM`, `VOO`: Yahoo Finance chart API의 일별 조정종가
- `KRW=X`: Yahoo Finance chart API의 USD/KRW 일별 종가
- 배당: 조정종가에 반영된 것으로 보고 추가 배당률은 0으로 둔다.
- QQQM은 상장 이후 기간이 짧아 10년 참고 범위 표본을 만들지 않는다.

한계:

- Yahoo Finance 검증 데이터는 제출 검증용 로컬 스냅샷이며 운영 서비스용 시세 공급 계약을 대신하지 않는다.
- 실시간 시세, 실제 주문, 세무 계산, 계좌 정보와 연결하지 않는다.
- 결과는 과거 데이터 형태의 예시와 가정으로 만든 설명용 숫자이며 미래 성과가 아니다.
