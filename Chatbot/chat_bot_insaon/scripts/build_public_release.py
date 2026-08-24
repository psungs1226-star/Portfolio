"""Copy the publishable subset of this repository into a separate release tree.

This repository is a working tree. It carries a 771MB portfolio site, 4.3MB of design
renders, a macOS launcher bundle, coverage output and seventy phase step files. None of
that belongs in what a reviewer clones, and `private/` must never leave the workspace at
all.

Copying rather than moving is deliberate: the working tree has to keep running the
dashboard, the ablation and the test suite after this script executes.

Selection follows `phases/17-selective-release/step0.md`:

구동
    없으면 대시보드가 뜨지 않거나 화면이 조용히 "0건"으로 뜬다.
엔지니어 근거
    안전 게이트, 인용 검증, 평가 재현이 이 저장소의 차별점이다.
PM 근거
    범위 결정과 스스로 그은 한계선을 보여준다.
"""

from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# 디렉터리는 통째로, 파일은 개별로 복사한다. 목록에 없는 것은 공개하지 않는다.
INCLUDE_DIRS = (
    "src/insaon",
    # 대시보드는 이 JSON들을 읽어 화면 상단의 corpus·품질·릴리스 상태를 만든다.
    # 빠지면 앱은 정상으로 뜨는데 값이 조용히 "0건 / unavailable"이 된다. 실제로
    # 이 스크립트의 첫 실행에서 그렇게 됐다.
    "artifacts",
    "configs",
    "data",
    "docs",
    # evals 전체. 골든셋 정답은 애초에 이 안에 없고 `private/`에 있다.
    "evals",
    # "migrations" — DB 마이그레이션은 데모에서 안 쓰므로 제외.
    "report/assets",
    "scripts",
    "tests",
)
INCLUDE_FILES = (
    "README.md",
    "LICENSE",
    "CLAUDE.md",
    # "alembic.ini" — DB 마이그레이션 설정은 데모에서 안 쓰므로 제외.
    "pyproject.toml",
    "requirements-dev.lock",
    ".gitignore",
    ".env.example",
    "report/portfolio-case-study.html",
    "report/planning-report.html",
)

# 개별 glob으로 넣는 것들. 디렉터리를 통째로 넣으면 안 되는 자리다.
INCLUDE_GLOBS = (
    # phase 구조와 상태는 남기고 step 본문 70개는 뺀다.
    "phases/index.json",
    "phases/*/index.json",
)

# 공개 트리에서 제외한 자산을 검증하는 테스트. 파일이 없으니 반드시 실패한다.
# 테스트를 남기고 실패하게 두면 클론한 사람이 제일 먼저 보는 것이 빨간 줄이 된다.
EXCLUDE_TESTS = {
    "tests/contract/test_design_variants.py": "design/ 렌더를 검증한다",
    "tests/visual/test_design_variant_contract.py": "design/ 렌더를 검증한다",
    "tests/test_harness_executor.py": "phases/*/step*.md 본문을 실행한다",
    "tests/integration/test_ablation_runner.py": "비공개 잠금 골든셋으로 ablation을 재실행한다",
    "tests/e2e/test_case_b.py": (
        "비공개 candidate corpus의 데이터 기준일을 단언한다. 공개 트리에서 CASE-B는 "
        "합성 근거로 정상 렌더되지만 그 날짜는 나오지 않는다."
    ),
    "tests/contract/test_design_ab_evaluation.py": "design/ A·B 렌더 비교 기록을 검증한다",
    "tests/contract/test_preview_dashboard.py": "런처 파일(Launcher.app, OPEN_DASHBOARD)을 제외했으므로 검증 대상이 없다",
}

# 위 디렉터리 안에서도 빼는 것들. 패턴은 복사 대상 트리 기준의 부분 경로다.
EXCLUDE_NAMES = frozenset(
    {"__pycache__", ".pytest_cache", ".ruff_cache", ".mypy_cache", ".DS_Store",
     "insaon_launcher.applescript"}
)
EXCLUDE_SUFFIXES = (".pyc", ".pyo", ".coverage")

# 공개하지 않는 이유를 사람이 읽을 수 있게 남긴다. 목록에서 빠졌다는 사실만으로는
# 의도적으로 뺀 것인지 잊은 것인지 구분되지 않는다.
EXCLUDED_WITH_REASON = {
    "private/": "골든셋 정답과 검토 기록. 공개하면 평가 누수이며 되돌릴 수 없다.",
    "portfolio-site/": "별도로 배포되는 웹 케이스 스터디다. node_modules 포함 771MB.",
    "design/": "렌더 PNG 30여 장 4.3MB. 읽는 사람이 없고 저장소만 무거워진다.",
    "phases/*/step*.md": (
        "70개 step 본문. 진행 과정의 증거이지만 30분 리뷰가 읽을 분량이 아니다. "
        "phase 구조는 phases/index.json으로 남긴다."
    ),
    "report/planning-report.pdf": "같은 내용의 HTML을 포함한다. 223KB 중복이다.",
    ".coverage": "실행 산출물이다.",
    "InsaON Launcher.app/": "local 프로필을 하드코딩해 공개 트리에서 CandidateCorpusError로 끝난다.",
    "OPEN_DASHBOARD.html": "런처와 같은 이유. 공개 진입점은 scripts/preview_dashboard.py다.",
    "OPEN_DASHBOARD.command": "런처와 같은 이유.",
    "alembic.ini": "DB 마이그레이션은 데모에서 사용하지 않는다.",
    "migrations/": "DB 마이그레이션은 데모에서 사용하지 않는다.",
    "insaon_launcher.applescript": "런처 소스. 런처 자체를 제외했으므로 함께 뺀다.",
    "tmp/": "작업 중 임시 디렉터리다.",
    "AGENTS.md": "작업공간 운영 규칙이며 공개·비공개 경계 자체를 적은 내부 문서다.",
}


def _should_skip(path: Path) -> bool:
    return (
        any(part in EXCLUDE_NAMES for part in path.parts)
        or path.suffix in EXCLUDE_SUFFIXES
        or path.name in EXCLUDE_NAMES
    )


def copy_tree(source: Path, target: Path) -> int:
    copied = 0
    for item in sorted(source.rglob("*")):
        if item.is_dir() or _should_skip(item.relative_to(source)):
            continue
        destination = target / item.relative_to(source)
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(item, destination)
        copied += 1
    return copied


def write_manifest(target: Path, counts: dict[str, int]) -> None:
    lines = [
        "# 공개 선별 목록",
        "",
        "이 트리는 `scripts/build_public_release.py`가 작업 저장소에서 복사한 것이다.",
        "손으로 고치지 말고 원본을 고친 뒤 다시 생성한다.",
        "",
        "## 포함",
        "",
        "| 경로 | 파일 수 |",
        "|---|---:|",
    ]
    lines.extend(f"| `{path}` | {count} |" for path, count in sorted(counts.items()))
    lines.extend(
        [
            f"| **합계** | **{sum(counts.values())}** |",
            "",
            "## 공개 트리에서 대시보드 띄우기",
        "",
        "```bash",
        "python3 -m venv .venv",
        ".venv/bin/python -m pip install -r requirements-dev.lock",
        ".venv/bin/python -m pip install -e . --no-deps",
        ".venv/bin/python scripts/preview_dashboard.py",
        "```",
        "",
        "기본 프로필이 `offline`이라 Ollama도 모델 다운로드도 필요 없다.",
        "",
        "`OPEN_DASHBOARD.html`의 원클릭 버튼은 **이 트리에서 동작하지 않는다.** 그 경로는",
        "`--profile local`을 쓰고 local은 비공개 공식 candidate corpus를 요구하는데, 그 자료는",
        "공개하지 않는다(합성 자료로 대체하지 않는 것이 제품 규칙이다). macOS 원클릭 실행은",
        "작업 저장소에서만 재현된다.",
        "",
        "## 제외와 그 이유",
            "",
            "빠졌다는 사실만으로는 의도적으로 뺀 것인지 잊은 것인지 구분되지 않는다.",
            "",
            "| 경로 | 이유 |",
            "|---|---|",
        ]
    )
    lines.extend(
        f"| `{path}` | {reason} |" for path, reason in sorted(EXCLUDED_WITH_REASON.items())
    )
    lines.extend(
        [
            "",
            "### 함께 뺀 테스트",
            "",
            "위에서 제외한 자산을 검증하는 테스트다. 남겨두면 클론한 사람이 처음 보는 것이",
            "실패한 테스트가 된다. 작업 저장소에서는 그대로 실행된다.",
            "",
            "| 테스트 | 이유 |",
            "|---|---|",
        ]
    )
    lines.extend(f"| `{path}` | {reason} |" for path, reason in sorted(EXCLUDE_TESTS.items()))
    lines.append("")
    (target / "PUBLIC_MANIFEST.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--target", type=Path, required=True)
    parser.add_argument("--force", action="store_true", help="기존 대상 트리를 지우고 다시 만든다")
    args = parser.parse_args()

    target = args.target if args.target.is_absolute() else (Path.cwd() / args.target)
    if target.exists():
        if not args.force:
            print(f"target already exists: {target} (use --force to replace)", file=sys.stderr)
            return 2
        shutil.rmtree(target)
    target.mkdir(parents=True)

    counts: dict[str, int] = {}
    for relative in INCLUDE_DIRS:
        source = ROOT / relative
        if not source.is_dir():
            print(f"missing include dir: {relative}", file=sys.stderr)
            return 1
        counts[relative] = copy_tree(source, target / relative)
    for pattern in INCLUDE_GLOBS:
        matches = sorted(ROOT.glob(pattern))
        if not matches:
            print(f"no match for include glob: {pattern}", file=sys.stderr)
            return 1
        files = [item for item in matches if item.is_file() and not _should_skip(item)]
        for source in files:
            destination = target / source.relative_to(ROOT)
            destination.parent.mkdir(parents=True, exist_ok=True)
            # copy2는 실행 권한을 보존한다. 런처 번들의 applet이 실행 가능해야 한다.
            shutil.copy2(source, destination)
        counts[pattern] = len(files)
    for relative in INCLUDE_FILES:
        source = ROOT / relative
        if not source.is_file():
            print(f"missing include file: {relative}", file=sys.stderr)
            return 1
        destination = target / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)
        counts[relative] = 1

    for relative in EXCLUDE_TESTS:
        removed = target / relative
        if removed.is_file():
            removed.unlink()

    write_manifest(target, counts)
    print(f"copied {sum(counts.values())} files to {target}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
