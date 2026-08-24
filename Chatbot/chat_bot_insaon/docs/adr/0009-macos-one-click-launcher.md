# ADR-0009: macOS 데모는 HTML에서 로컬 런처 앱을 호출한다

## Context

Jinja2 template을 파일로 직접 열면 서버 데이터가 결합되지 않고, 터미널에서 Python
명령을 실행하는 절차는 포트 충돌과 중복 실행 오류를 사용자에게 노출한다. 포트폴리오
검토자는 제품 동작을 보기 전에 실행 방법부터 해석하지 않아야 한다. 다만 일반 HTML은
브라우저 보안상 로컬 Python 프로세스를 직접 실행할 수 없다.

## Options

1. 터미널 명령과 `OPEN_DASHBOARD.command`만 제공한다.
2. HTML 버튼이 서버 주소만 열고 서버 시작은 사용자에게 맡긴다.
3. HTML 버튼이 등록된 macOS URL scheme을 호출하고, 저장소 안의 로컬 런처 앱이
   서버 탐색·시작·포트 선택·브라우저 이동을 맡는다.
4. 브라우저 보안을 우회해 HTML에서 임의 셸 명령을 실행한다.

## Decision

옵션 3을 선택한다.

- `OPEN_DASHBOARD.html`을 macOS 데모의 기본 진입점으로 둔다.
- 버튼은 `insaon://launch`를 호출하고 ad-hoc 서명한 `InsaON Launcher.app`이 처리한다.
- 런처 source는 `scripts/insaon_launcher.applescript`, 서버 시작 로직은
  `scripts/launch_dashboard.py`에 둔다.
- 정상 인사ON 서버를 먼저 재사용하고, 8000번이 다른 앱에 점유되면 8009번까지 다음
  빈 포트를 선택한다.
- 서버는 백그라운드로 시작하고 준비 완료 뒤 기본 브라우저를 연다.
- 런처가 시작한 서버는 `/healthz`·`/readyz`가 아닌 마지막 HTTP 활동 뒤 20분이 지나고
  처리 중 요청이 없으면 Uvicorn의 graceful shutdown으로 종료한다.
- 대시보드 종료 시 다른 로컬 프로젝트와 공유할 수 있는 Ollama 서버 자체는 죽이지 않는다.
  각 모델은 ADR-0006의 `keep_alive=20m`로 별도 언로드한다.
- 앱은 자신의 위치에서 프로젝트 경로를 계산하며 사용자 절대경로와 인증 정보를
  포함하지 않는다.
- 새 macOS 환경의 URL handler 등록은 앱 또는 `OPEN_DASHBOARD.command` 최초 1회
  실행으로 처리한다. Windows·Linux는 기존 Python 명령을 유지한다.

## Consequences

- 등록 이후에는 HTML에서 한 번 눌러 실제 대시보드까지 이동한다.
- 기존 서버 중복 실행과 8000번 포트 충돌을 사용자가 처리하지 않아도 된다.
- 닫아 둔 대시보드 서버와 모델이 밤새 남는 문제를 줄이고, 다시 열면 같은 원클릭 경로로 재기동한다.
- macOS 외 환경과 최초 URL handler 등록에는 별도 진입 절차가 남는다.
- 런처 앱은 제품 서버나 로컬 모델을 대체하지 않으며 질문·답변을 저장하지 않는다.

## Revisit

- 포트폴리오 제출 형식이 설치형 앱이나 컨테이너로 바뀔 때
- Windows·Linux에서도 같은 수준의 단일 클릭 실행이 필요할 때
- macOS의 URL scheme 또는 ad-hoc 서명 정책이 변경될 때
