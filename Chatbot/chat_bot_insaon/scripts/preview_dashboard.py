#!/usr/bin/env python3
"""Run the local dashboard and open the canonical review screen."""

from __future__ import annotations

import argparse
import http.client
import json
import os
import socket
import sys
import threading
import time
import webbrowser
from collections.abc import Callable

import uvicorn
from starlette.types import ASGIApp, Receive, Scope, Send

DEFAULT_IDLE_MINUTES = 20.0


class IdleActivity:
    """Track real dashboard activity without letting health probes keep it alive."""

    _ignored_paths = frozenset({"/healthz", "/readyz"})

    def __init__(
        self,
        *,
        timeout_seconds: float,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        if timeout_seconds < 0:
            raise ValueError("idle timeout cannot be negative")
        self.timeout_seconds = timeout_seconds
        self._clock = clock
        self._last_activity = clock()
        self._active_requests = 0
        self._lock = threading.Lock()

    def request_started(self, path: str) -> bool:
        if path in self._ignored_paths:
            return False
        with self._lock:
            self._active_requests += 1
            self._last_activity = self._clock()
        return True

    def request_finished(self, tracked: bool) -> None:
        if not tracked:
            return
        with self._lock:
            self._active_requests = max(0, self._active_requests - 1)
            self._last_activity = self._clock()

    def should_shutdown(self) -> bool:
        if self.timeout_seconds == 0:
            return False
        with self._lock:
            return bool(
                self._active_requests == 0
                and self._clock() - self._last_activity >= self.timeout_seconds
            )


class IdleTrackingApp:
    def __init__(self, application: ASGIApp, activity: IdleActivity) -> None:
        self._application = application
        self._activity = activity

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        tracked = bool(
            scope["type"] == "http"
            and self._activity.request_started(str(scope.get("path", "")))
        )
        try:
            await self._application(scope, receive, send)
        finally:
            self._activity.request_finished(tracked)


def stop_server_when_idle(
    server: uvicorn.Server,
    activity: IdleActivity,
    *,
    poll_seconds: float = 1.0,
) -> None:
    while not server.should_exit:
        if activity.should_shutdown():
            print(
                f"- {activity.timeout_seconds / 60:g}분 미사용: 대시보드 서버 자동 종료"
            )
            server.should_exit = True
            return
        time.sleep(poll_seconds)


def preview_url(host: str, port: int) -> str:
    browser_host = "127.0.0.1" if host in {"0.0.0.0", "::"} else host
    return f"http://{browser_host}:{port}/"


def has_healthy_insaon_server(host: str, port: int, expected_profile: str) -> bool:
    connection = http.client.HTTPConnection(host, port, timeout=0.75)
    try:
        connection.request("GET", "/healthz")
        response = connection.getresponse()
        if response.status != 200:
            return False
        payload = json.loads(response.read().decode("utf-8"))
        return bool(
            payload.get("status") == "ok"
            and payload.get("service") == "인사ON"
            and payload.get("runtime_profile") == expected_profile
        )
    except (OSError, json.JSONDecodeError):
        return False
    finally:
        connection.close()


def port_is_in_use(host: str, port: int) -> bool:
    try:
        with socket.create_connection((host, port), timeout=0.5):
            return True
    except OSError:
        return False


def ollama_loopback_is_reachable(
    host: str = "127.0.0.1", port: int = 11434, timeout: float = 0.5
) -> bool:
    """Report whether the local model runtime is listening on the loopback address."""
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Start the InsaON dashboard and open it in the default browser."
    )
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument(
        "--profile",
        choices=("offline", "local"),
        default="offline",
        help=(
            "offline runs the deterministic synthetic corpus with no local models; "
            "local uses the official candidate and the Ollama loopback runtime."
        ),
    )
    parser.add_argument(
        "--no-open",
        action="store_true",
        help="Start the server without opening a browser.",
    )
    parser.add_argument(
        "--idle-minutes",
        type=float,
        default=DEFAULT_IDLE_MINUTES,
        help="Gracefully stop after this many minutes without dashboard activity; 0 disables.",
    )
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    if args.idle_minutes < 0:
        parser.error("--idle-minutes cannot be negative")
    url = preview_url(args.host, args.port)
    browser_host = "127.0.0.1" if args.host in {"0.0.0.0", "::"} else args.host
    if args.profile == "local" and not ollama_loopback_is_reachable():
        print(
            "local 프로필은 Ollama loopback(127.0.0.1:11434)이 필요하다.\n"
            "준비 방법:\n"
            "  brew install ollama\n"
            "  ollama serve\n"
            "  ollama pull qwen3:4b-instruct\n"
            "  ollama pull bge-m3\n"
            "합성 자료로 대체하지 않는다. 결정적 데모는 --profile offline을 사용한다.",
            file=sys.stderr,
        )
        return 3
    print("인사ON 대시보드 미리보기")
    print(f"- 실행 프로필: {args.profile}")
    if args.profile == "offline":
        print("  결정적 합성 corpus. 로컬 모델과 네트워크가 필요 없다.")
    else:
        print("  공식 candidate와 Ollama loopback 모델. 첫 실행은 수집·임베딩 시간이 필요하다.")
    print(f"- 기본 화면: {url}")
    print(f"- CASE-A 조건 누락: {url}demo/CASE-A")
    print(f"- CASE-B 과거 기준일: {url}demo/CASE-B")
    print(f"- CASE-C 범위 밖 보류: {url}demo/CASE-C")
    print("- 종료: 터미널에서 Ctrl+C")
    if args.idle_minutes:
        print(f"- 자동 종료: 마지막 사용 후 {args.idle_minutes:g}분")
    if has_healthy_insaon_server(browser_host, args.port, args.profile):
        print(f"- 기존 인사ON 서버 재사용: {url}")
        if not args.no_open:
            webbrowser.open(url)
        return 0
    if port_is_in_use(browser_host, args.port):
        print(
            f"포트 {args.port}을 다른 프로그램이 사용 중이다. "
            f"--port {args.port + 1}로 다시 실행해야 한다.",
            file=sys.stderr,
        )
        return 2
    if not args.no_open:
        threading.Timer(1.0, webbrowser.open, args=(url,)).start()
    os.environ["INSAON_RUNTIME_PROFILE"] = args.profile
    from insaon.api.main import app as insaon_app

    activity = IdleActivity(timeout_seconds=args.idle_minutes * 60)
    server = uvicorn.Server(
        uvicorn.Config(
            IdleTrackingApp(insaon_app, activity),
            host=args.host,
            port=args.port,
            reload=False,
        )
    )
    if args.idle_minutes:
        threading.Thread(
            target=stop_server_when_idle,
            args=(server, activity),
            daemon=True,
            name="insaon-idle-shutdown",
        ).start()
    try:
        server.run()
    except KeyboardInterrupt:
        print("\n인사ON 대시보드를 종료했습니다.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
