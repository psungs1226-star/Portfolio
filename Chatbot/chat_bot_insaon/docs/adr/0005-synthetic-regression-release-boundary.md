# ADR-0005: 합성 시스템 회귀와 법령 검증 release를 분리한다

## Context

Phase 05는 제품·안전·평가 코드를 재현 가능하게 검증해야 하지만, 현재 공식 승인 법령 snapshot과 독립 검토 법령 정답셋은 준비되지 않았다. 기계 생성 합성셋의 높은 수치를 법률 정확도로 공개하면 증거 범위를 넘어선다.

## Options

1. 합성 회귀 결과를 MVP 법률 성능으로 공개한다.
2. 법령 holdout이 준비될 때까지 어떤 실행 결과도 만들지 않는다.
3. 합성 회귀와 독립 법령 검증을 별도 release 상태와 dataset version으로 관리한다.

## Decision

옵션 3을 선택한다. 현재 release 상태는 `synthetic_regression_candidate`로 제한한다. B0~H3는 같은 합성 dataset·snapshot·top-k·반복 조건에서 실행하고 실패를 공개하되, 법률 정확도와 운영 효과는 `unmeasured`로 둔다. 독립 법령 검증은 공식 승인 snapshot과 사람 검토 locked set을 갖춘 새 dataset version에서만 시작한다.

## Consequences

- H2의 치명적 오류 12건과 H3의 0건은 파이프라인·안전 회귀 근거로 사용할 수 있다.
- 합성 H3의 1.000 지표를 법률 정답률이나 실제 업무효과로 표현할 수 없다.
- release manifest와 HTML/PDF는 측정값과 미측정 경계를 같은 화면에 표시해야 한다.
- 법령 holdout을 만든 뒤 현재 결과 파일의 이름만 바꾸지 않고 별도 실행·hash·검토 기록을 생성해야 한다.

## Revisit

공식 승인 법령 snapshot, 독립 검토자와 adjudication이 있는 locked set, 로컬 모델 실행
profile이 준비되면 legal validation release 상태와 추가 gate를 별도 ADR로 검토한다.
