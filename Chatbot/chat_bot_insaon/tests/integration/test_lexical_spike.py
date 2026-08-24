import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_lexical_spike_is_reproducible_and_records_both_candidates() -> None:
    command = [
        sys.executable,
        "-m",
        "insaon.evaluation.cli",
        "retrieval-spike",
        "--config",
        "configs/spike/lexical.toml",
    ]
    first = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, check=False)
    assert first.returncode == 0, first.stderr
    first_manifest = json.loads(
        (ROOT / "artifacts/spikes/lexical/manifest.json").read_text(encoding="utf-8")
    )
    second = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, check=False)
    assert second.returncode == 0, second.stderr
    second_manifest = json.loads(
        (ROOT / "artifacts/spikes/lexical/manifest.json").read_text(encoding="utf-8")
    )
    assert first_manifest["selected"] == second_manifest["selected"]
    assert first_manifest["candidates"]["char_ngram"]["rankings"] == second_manifest[
        "candidates"
    ]["char_ngram"]["rankings"]
    assert set(first_manifest["candidates"]) == {"sqlite_fts5", "char_ngram"}
