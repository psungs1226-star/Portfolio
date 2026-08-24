#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from insaon.adapters.source import audit_legal_candidate

ROOT = Path(__file__).resolve().parent.parent


def _public_artifact(audit: dict[str, Any]) -> dict[str, Any]:
    return {
        "schema_version": audit["schema_version"],
        "profile": audit["profile"],
        "candidate_status": audit["candidate_status"],
        "source_manifest_hash": audit["source_manifest_hash"],
        "parser_version": audit["parser_version"],
        "automated_structural_quality": audit["automated_structural_quality"],
        "check_summary": audit["check_summary"],
        "quality_counts": audit["quality_counts"],
        "checks": audit["checks"],
        "legal_content_accuracy": audit["legal_content_accuracy"],
        "human_approval": audit["human_approval"],
        "release_status": audit["release_status"],
        "limitations": audit["limitations"],
    }


def _report(audit: dict[str, Any]) -> str:
    rows = "\n".join(
        f"| `{check['check_id']}` | "
        f"{'통과' if check['passed'] else '실패'} |"
        for check in audit["checks"]
    )
    counts = audit["quality_counts"]
    summary = audit["check_summary"]
    return f"""# 공식 법령 후보 자동 품질감사

## 결론

실제 비제출 원문 snapshot과 promotion candidate를 다시 읽어 결정적 품질검사를
실행했다. 자동 구조 품질은 `{audit["automated_structural_quality"]}`이며
{summary["passed"]}/{summary["total"]}개 검사가 통과했다.

이 통과는 파일·파서·계층·관계·단서·핵심 경로의 기계적 일관성에 한정된다.
법률 내용 정확도는 `{audit["legal_content_accuracy"]}`, 사람 승인은
`{audit["human_approval"]}`, release는 `{audit["release_status"]}`다.

| 항목 | 실제 결과 |
|---|---:|
| 파싱 provision | {counts["provisions"]}개 |
| 부칙 node | {counts["supplementary"]}개 |
| 치명적 parser 오류 | {counts["fatal"]}개 |
| 활성 조문 미파싱 warning | {counts["warning"]}개 |
| 삭제 조문 tombstone | {counts["deleted_article_tombstones"]}개 |
| 자동 품질검사 | {summary["passed"]}/{summary["total"]} 통과 |
| 사람 승인자 | 0명 |
| release | `hold` |

## 검사 결과

| 검사 | 결과 |
|---|---|
{rows}

검사 범위는 source manifest·SHA-256·byte count, 동일 parser 재실행 결과,
조·항·호·목 계층, parent와 relation 대상, 시행기간 형식, `다만,` 단서 추출,
부칙 수, 네 휴직 유형 topic tag, 사전 고정한 핵심 조문 경로의 존재와 최소 marker다.

## 판정 경계

- {counts["deleted_article_tombstones"]}개 항목은 공식 HTML에서 `삭제`라고 명시된 조문 표식으로 재현되어
  `DELETED_ARTICLE_TOMBSTONE` 정보 항목으로 분류했다.
- 활성 조문 형식의 `UNPARSED_ARTICLE`은 0개다.
- marker 검사는 조문 경로와 최소 문자열의 보존 여부만 확인한다. 법률 해석이나
  사례 결론을 채점하지 않는다.
- 독립 검토자가 원문과 본문·단서·부칙을 대조하고 승인 hash를 남기기 전에는
  versioned legal index로 승격하지 않는다.
"""


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--candidate", type=Path, required=True)
    parser.add_argument("--private-output", type=Path, required=True)
    parser.add_argument(
        "--artifact",
        type=Path,
        default=Path("artifacts/legal/quality-audit.json"),
    )
    parser.add_argument(
        "--report",
        type=Path,
        default=Path("evals/reports/official-corpus-quality.md"),
    )
    args = parser.parse_args()

    manifest_path = args.manifest.resolve()
    candidate = json.loads(args.candidate.read_text(encoding="utf-8"))
    raw_manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    audit = audit_legal_candidate(candidate, raw_manifest, manifest_path.parent)

    private_output = args.private_output.resolve()
    if ROOT == private_output or ROOT in private_output.parents:
        raise ValueError("full official corpus audit must stay outside public submission")
    private_output.parent.mkdir(parents=True, exist_ok=True)
    private_output.write_text(
        json.dumps(audit, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    artifact_path = args.artifact if args.artifact.is_absolute() else ROOT / args.artifact
    artifact_path.parent.mkdir(parents=True, exist_ok=True)
    artifact_path.write_text(
        json.dumps(_public_artifact(audit), ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    report_path = args.report if args.report.is_absolute() else ROOT / args.report
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(_report(audit), encoding="utf-8")

    summary = audit["check_summary"]
    print(
        "Official corpus automated audit: "
        f"{summary['passed']}/{summary['total']} passed, "
        f"status={audit['automated_structural_quality']}, "
        f"human_approval={audit['human_approval']}."
    )
    return 0 if summary["failed"] == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
