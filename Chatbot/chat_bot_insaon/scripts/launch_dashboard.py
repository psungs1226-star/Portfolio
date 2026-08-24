#!/usr/bin/env python3
"""Open a healthy InsaON dashboard or start one in the background."""

from __future__ import annotations

import http.client
import json
import os
import shutil
import subprocess
import sys
import time
import tomllib
import webbrowser
from pathlib import Path

REQUIRED_LOCAL_MODELS = frozenset({"qwen3:4b-instruct", "bge-m3:latest"})
OLLAMA_EXECUTABLE_CANDIDATES = (
    Path("/opt/homebrew/bin/ollama"),
    Path("/usr/local/bin/ollama"),
    Path("/Applications/Ollama.app/Contents/Resources/ollama"),
)
OLLAMA_LOG_PATH = Path("/tmp/insaon-ollama.log")
DASHBOARD_LOG_PATH = Path("/tmp/insaon-dashboard.log")


def _candidate_path(project_root: Path) -> Path:
    return project_root.parents[1] / "private/legal-wide/processed/candidate.json"


def _candidate_is_usable(path: Path, source_manifest_path: Path) -> bool:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
        registry = tomllib.loads(source_manifest_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError, tomllib.TOMLDecodeError):
        return False
    quality = payload.get("quality") if isinstance(payload, dict) else None
    candidate_sources = payload.get("sources") if isinstance(payload, dict) else None
    registry_sources = registry.get("sources") if isinstance(registry, dict) else None
    if not isinstance(candidate_sources, list) or not isinstance(registry_sources, list):
        return False
    candidate_ids = {
        item.get("source_id") for item in candidate_sources if isinstance(item, dict)
    }
    required_ids = {
        item.get("source_id")
        for item in registry_sources
        if isinstance(item, dict) and item.get("review_tier") != "metadata_only"
    }
    return bool(
        isinstance(quality, dict)
        and quality.get("fatal_count") == 0
        and candidate_ids == required_ids
        and payload.get("candidate_status")
        in {"pending_human_approval", "approved_legal_index"}
    )


def ensure_official_candidate(
    project_root: Path,
    python: Path,
    *,
    timeout_seconds: float = 240.0,
) -> bool:
    """Collect and parse the declared keyless official corpus on first launch."""
    candidate_path = _candidate_path(project_root)
    source_manifest_path = project_root / "configs/sources/official-hr-wide.toml"
    if _candidate_is_usable(candidate_path, source_manifest_path):
        return True
    raw_root = candidate_path.parents[1] / "raw"
    commands = (
        [
            str(python),
            str(project_root / "scripts/collect_sources.py"),
            "--config",
            str(project_root / "configs/sources/official-hr-wide.toml"),
            "--output-private",
            str(raw_root),
        ],
        [
            str(python),
            str(project_root / "scripts/promote_snapshot.py"),
            "--manifest",
            str(raw_root / "manifest.json"),
            "--config",
            str(project_root / "configs/sources/official-hr-wide.toml"),
            "--output",
            str(candidate_path),
            "--dry-run",
        ],
    )
    for command in commands:
        try:
            result = subprocess.run(
                command,
                cwd=project_root,
                check=False,
                capture_output=True,
                text=True,
                timeout=timeout_seconds,
            )
        except (OSError, subprocess.TimeoutExpired):
            with DASHBOARD_LOG_PATH.open("a", encoding="utf-8") as log_stream:
                log_stream.write(f"공식 원문 준비 명령 실행 실패: {command[1]}\n")
            return False
        if result.returncode != 0:
            with DASHBOARD_LOG_PATH.open("a", encoding="utf-8") as log_stream:
                log_stream.write(
                    f"공식 원문 준비 실패: {command[1]} (exit {result.returncode})\n"
                )
                if result.stderr:
                    log_stream.write(result.stderr[-4000:] + "\n")
            return False
    return _candidate_is_usable(candidate_path, source_manifest_path)


def has_healthy_insaon_server(
    host: str, port: int, expected_profile: str = "local"
) -> bool:
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
    connection = http.client.HTTPConnection(host, port, timeout=0.4)
    try:
        connection.connect()
        return True
    except OSError:
        return False
    finally:
        connection.close()


def select_dashboard_port(
    host: str,
    start_port: int,
    attempts: int,
) -> tuple[int, bool]:
    for port in range(start_port, start_port + attempts):
        if has_healthy_insaon_server(host, port, "local"):
            return port, True
        if not port_is_in_use(host, port):
            return port, False
    raise RuntimeError("인사ON을 실행할 빈 로컬 포트를 찾지 못했다.")


def local_ollama_models(
    host: str = "127.0.0.1", port: int = 11434
) -> set[str] | None:
    connection = http.client.HTTPConnection(host, port, timeout=1.0)
    try:
        connection.request("GET", "/api/tags")
        response = connection.getresponse()
        if response.status != 200:
            return None
        payload = json.loads(response.read().decode("utf-8"))
        models = payload.get("models")
        if not isinstance(models, list):
            return None
        return {
            str(item.get("name"))
            for item in models
            if isinstance(item, dict) and item.get("name")
        }
    except (OSError, json.JSONDecodeError):
        return None
    finally:
        connection.close()


def find_ollama_executable() -> Path | None:
    """Find Ollama even when a Finder-launched app has a minimal PATH."""
    discovered = shutil.which("ollama")
    candidates = (
        *((Path(discovered),) if discovered else ()),
        *OLLAMA_EXECUTABLE_CANDIDATES,
    )
    for candidate in candidates:
        if candidate.is_file() and os.access(candidate, os.X_OK):
            return candidate
    return None


def ensure_local_ollama(project_root: Path, timeout_seconds: float = 30.0) -> bool:
    log_path = OLLAMA_LOG_PATH
    available_models = local_ollama_models()
    if available_models is not None:
        missing = sorted(REQUIRED_LOCAL_MODELS - available_models)
        if missing:
            log_path.write_text(
                "Ollama는 실행 중이지만 필수 모델이 없습니다: "
                + ", ".join(missing)
                + "\n",
                encoding="utf-8",
            )
            return False
        return True
    ollama = find_ollama_executable()
    if ollama is None:
        log_path.write_text(
            "Ollama 실행 파일을 찾지 못했습니다. 확인 경로: "
            + ", ".join(str(path) for path in OLLAMA_EXECUTABLE_CANDIDATES)
            + "\n",
            encoding="utf-8",
        )
        return False
    environment = dict(os.environ)
    path_candidates = (
        str(ollama.parent),
        "/opt/homebrew/bin",
        "/usr/local/bin",
        environment.get("PATH", ""),
    )
    environment["PATH"] = os.pathsep.join(
        dict.fromkeys(path for path in path_candidates if path)
    )
    environment.update(
        {
            "OLLAMA_HOST": "127.0.0.1:11434",
            "OLLAMA_NO_CLOUD": "1",
            "OLLAMA_KEEP_ALIVE": "20m",
        }
    )
    try:
        with log_path.open("ab") as log_stream:
            log_stream.write(f"\n인사ON: Ollama 시작 경로 {ollama}\n".encode())
            log_stream.flush()
            subprocess.Popen(
                [str(ollama), "serve"],
                cwd=project_root,
                env=environment,
                stdin=subprocess.DEVNULL,
                stdout=log_stream,
                stderr=subprocess.STDOUT,
                start_new_session=True,
            )
    except OSError as error:
        with log_path.open("a", encoding="utf-8") as log_stream:
            log_stream.write(f"Ollama 실행 실패: {type(error).__name__}\n")
        return False
    deadline = time.monotonic() + timeout_seconds
    while time.monotonic() < deadline:
        available_models = local_ollama_models()
        if available_models is not None and REQUIRED_LOCAL_MODELS <= available_models:
            return True
        time.sleep(0.25)
    missing = sorted(REQUIRED_LOCAL_MODELS - (available_models or set()))
    with log_path.open("a", encoding="utf-8") as log_stream:
        log_stream.write(
            "Ollama 준비 시간 초과. 확인되지 않은 모델: "
            + ", ".join(missing)
            + "\n"
        )
    return False


def show_macos_alert(message: str) -> None:
    if sys.platform != "darwin":
        return
    subprocess.run(
        [
            "osascript",
            "-e",
            f'display alert "인사ON을 열 수 없음" message "{message}" as warning',
        ],
        check=False,
        capture_output=True,
        text=True,
    )


def wait_until_healthy(host: str, port: int, timeout_seconds: float = 20.0) -> bool:
    deadline = time.monotonic() + timeout_seconds
    while time.monotonic() < deadline:
        if has_healthy_insaon_server(host, port):
            return True
        time.sleep(0.2)
    return False


def main() -> int:
    project_root = Path(__file__).resolve().parents[1]
    python = project_root / ".venv/bin/python"
    preview_script = project_root / "scripts/preview_dashboard.py"
    host = "127.0.0.1"

    if not python.is_file():
        show_macos_alert("프로젝트의 .venv 실행 환경을 찾지 못했다. README의 최초 설치를 확인해야 한다.")
        return 2

    if not ensure_official_candidate(project_root, python):
        show_macos_alert(
            "공식 공개 원문 후보를 수집하거나 파싱하지 못했다. 인터넷 연결과 "
            "/tmp/insaon-dashboard.log를 확인해야 한다. 합성 근거로 대체 실행하지 않는다."
        )
        return 6

    if not ensure_local_ollama(project_root):
        show_macos_alert(
            "로컬 Ollama 또는 필수 모델(qwen3:4b-instruct, bge-m3:latest)을 "
            "실행하지 못했다. /tmp/insaon-ollama.log를 확인해야 한다."
        )
        return 5

    try:
        port, already_running = select_dashboard_port(host, 8000, 10)
    except RuntimeError as error:
        show_macos_alert(str(error))
        return 3

    url = f"http://{host}:{port}/"
    if already_running:
        webbrowser.open(url)
        return 0

    log_path = DASHBOARD_LOG_PATH
    with log_path.open("ab") as log_stream:
        subprocess.Popen(
            [
                str(python),
                str(preview_script),
                "--host",
                host,
                "--port",
                str(port),
                "--profile",
                "local",
                "--no-open",
                "--idle-minutes",
                "20",
            ],
            cwd=project_root,
            stdin=subprocess.DEVNULL,
            stdout=log_stream,
            stderr=subprocess.STDOUT,
            start_new_session=True,
        )

    if not wait_until_healthy(host, port):
        show_macos_alert(f"서버 시작을 확인하지 못했다. 로그: {log_path}")
        return 4

    webbrowser.open(url)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
