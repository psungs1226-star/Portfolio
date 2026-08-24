# 아키텍처

## 범위

이 문서는 `submission/src/web/`에 만들 웹 MVP와 `submission/src/` 아래 Codex 플러그인 산출물의 구조 계약을 정의한다.

## 디렉토리 계획

```text
submission/
  README.md
  logs/
  src/
    .codex-plugin/
      plugin.json
    skills/
      kakaopay-securities/
        SKILL.md
    docs/
      research-kakaopaysec.md
      research-kakaopaysec-deeper.md
      research-kakaopaysec-competitive-gaps.md
      mvp-phase-review-plan.md
    web/
      package.json
      src/
        app/
        components/
        data/
        lib/
        styles/
```

## 웹 기술 스택

- Vite: 로컬 빌드 도구
- React: UI 구성
- TypeScript: 계산 로직과 컴포넌트 계약
- CSS modules 또는 일반 CSS: 로컬 스타일링
- 로컬 고정 예시 데이터 파일: 샘플 과거 데이터와 가정 관리

## 런타임 모델

- 웹 앱은 완전한 클라이언트 사이드 앱으로 동작한다.
- 런타임 API 호출은 필요하지 않다.
- API 키, 증권 계정 인증정보, 계좌번호, 개인 데이터는 저장하지 않는다.
- 모든 숫자는 번들에 포함된 고정 예시 데이터와 화면에 공개된 가정에서 나온다.

## 핵심 모듈

### `data`

- SCHD 고정 예시 데이터 행과 가정 메타데이터를 보관한다.
- 데이터 기간, 출처 메모, 통화 기준, 한계를 함께 둔다.
- 고정 예시 데이터가 상품 권유로 읽히지 않도록 작성한다.

### `lib`

- 결정론적 계산 함수를 둔다.
- 고정 예시 데이터로 원금, 시나리오 결과, 최대낙폭, 비용 영향을 계산한다.
- React 컴포넌트와 분리한다.

### `components`

- 모바일 우선 입력, 결과 요약, 고지 라벨, 단순 그래프를 제공한다.
- 빈값, 잘못된 입력, 로딩, 비활성, 접힘, 펼침 상태를 처리한다.

### `app`

- 입력 상태, 가정, 계산 결과, 결과 화면을 연결한다.
- 결과 표시 순서는 리스크 우선 원칙을 따른다.

## 계산 범위

- 입력값은 시나리오 가정이며 투자 지시가 아니다.
- 출력값은 과거 고정 예시 데이터에서 나온 설명용 범위다.
- 계산 엔진은 상품 순위, 주문 지시, 미래 성과 표현을 만들지 않는다.

## 검증 계획

- 웹 앱 골격 생성 이후 `npm run build`를 실행한다.
- 고정 예시 데이터 엔진 구현 이후 계산 함수 단위 테스트를 추가한다.
- UI 단계 이후 390px 모바일 화면을 수동 검수한다.
- 제출 통합 전 금지 표현을 검색한다.

## 플러그인 통합

Codex 스킬은 해외 ETF 모으기 리스크 설명 UX를 평가하거나 개선하는 절차를 안내한다. 웹 MVP는 로컬 SCHD 고정 예시 데이터를 사용해 해당 절차의 구체적인 작동 예시를 보여준다.
