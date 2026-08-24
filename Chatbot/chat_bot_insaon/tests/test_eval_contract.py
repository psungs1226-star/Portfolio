from __future__ import annotations

import json
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VALIDATOR = ROOT / "scripts" / "validate_eval_contract.py"
SAMPLE_CASES = ROOT / "evals" / "samples" / "dev.sample.jsonl"


class EvalContractCliTest(unittest.TestCase):
    def run_validator(self, *args: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            ["python3", str(VALIDATOR), *args],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=False,
        )

    def test_sample_contract_is_valid(self) -> None:
        result = self.run_validator()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("3 case(s)", result.stdout)

    def test_group_leakage_is_rejected(self) -> None:
        first = json.loads(SAMPLE_CASES.read_text(encoding="utf-8").splitlines()[0])
        leaked = dict(first)
        leaked["case_id"] = "CASE-LEAKED"
        leaked["split"] = "test_mvp_locked"
        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / "leak.jsonl"
            path.write_text(
                json.dumps(first, ensure_ascii=False)
                + "\n"
                + json.dumps(leaked, ensure_ascii=False)
                + "\n",
                encoding="utf-8",
            )
            result = self.run_validator("--cases", str(path))
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("group leakage", result.stdout)

    def test_forbidden_answer_key_is_rejected(self) -> None:
        case = json.loads(SAMPLE_CASES.read_text(encoding="utf-8").splitlines()[0])
        case["answer_key"] = "must remain private"
        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / "forbidden.jsonl"
            path.write_text(
                json.dumps(case, ensure_ascii=False) + "\n",
                encoding="utf-8",
            )
            result = self.run_validator("--cases", str(path))
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("forbidden field", result.stdout)

    def test_nested_json_schema_enum_is_enforced(self) -> None:
        case = json.loads(SAMPLE_CASES.read_text(encoding="utf-8").splitlines()[0])
        case["subject"]["employee_system"] = "national_government"
        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / "invalid-enum.jsonl"
            path.write_text(
                json.dumps(case, ensure_ascii=False) + "\n",
                encoding="utf-8",
            )
            result = self.run_validator("--cases", str(path))
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("value is not in enum", result.stdout)


if __name__ == "__main__":
    unittest.main()
