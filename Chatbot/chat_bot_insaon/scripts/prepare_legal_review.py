#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from insaon.adapters.source import approval_template, canonical_sha256

ROOT = Path(__file__).resolve().parent.parent


def _key_slice_paths(audit: dict[str, Any]) -> set[tuple[str, str]]:
    for check in audit.get("checks", []):
        if check.get("check_id") == "key_leave_slice_presence":
            return {
                (str(item["source_id"]), str(item["article_path"]))
                for item in check.get("observed", [])
            }
    return set()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--candidate", type=Path, required=True)
    parser.add_argument("--audit", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument(
        "--artifact",
        type=Path,
        default=Path("artifacts/legal/human-review-readiness.json"),
    )
    args = parser.parse_args()
    candidate = json.loads(args.candidate.read_text(encoding="utf-8"))
    audit = json.loads(args.audit.read_text(encoding="utf-8"))
    if audit.get("automated_structural_quality") != "passed":
        raise ValueError("review packet requires a passed automated audit")
    output_dir = args.output_dir.resolve()
    if ROOT == output_dir or ROOT in output_dir.parents:
        raise ValueError("human review packet must stay outside public submission")
    output_dir.mkdir(parents=True, exist_ok=True)

    key_paths = _key_slice_paths(audit)
    key_provisions = [
        provision
        for provision in candidate.get("provisions", [])
        if (str(provision["source_id"]), str(provision["article_path"])) in key_paths
    ]
    packet = {
        "schema_version": "0.1.0",
        "status": "ready_for_human_review",
        "candidate_sha256": canonical_sha256(candidate),
        "audit_sha256": canonical_sha256(audit),
        "source_manifest_hash": candidate["source_manifest_hash"],
        "parser_version": candidate["parser_version"],
        "sources": candidate["sources"],
        "quality": candidate["quality"],
        "automated_audit": audit,
        "key_leave_provisions": key_provisions,
        "review_instructions": [
            "공식 URL과 source hash를 대조한다.",
            "핵심 조문의 조·항·호·목과 본문을 원문에서 대조한다.",
            "다만 단서와 관련 부칙·적용례가 후보에 보존됐는지 확인한다.",
            (
                "삭제 조문 tombstone "
                f"{audit['quality_counts']['deleted_article_tombstones']}건이 "
                "원문 표식과 일치하는지 확인한다."
            ),
            "승인 template은 독립 사람 검토자가 직접 작성한다.",
        ],
        "approval_boundary": (
            "자동화 도구와 모델은 reviewer_id, checklist 또는 attestation을 대신 작성하지 않는다."
        ),
    }
    (output_dir / "review-packet.json").write_text(
        json.dumps(packet, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    (output_dir / "approval.template.json").write_text(
        json.dumps(approval_template(candidate, audit), ensure_ascii=False, indent=2)
        + "\n",
        encoding="utf-8",
    )

    artifact = {
        "schema_version": "0.1.0",
        "profile": "official-corpus-human-review-readiness",
        "status": "ready_for_human_review",
        "candidate_sha256": canonical_sha256(candidate),
        "audit_sha256": canonical_sha256(audit),
        "source_manifest_hash": candidate["source_manifest_hash"],
        "source_count": len(candidate["sources"]),
        "provision_count": candidate["provision_count"],
        "key_slice_count": len(key_provisions),
        "automated_audit": audit["check_summary"],
        "human_approval": "pending",
        "reviewer_count": 0,
        "index_promotion": "blocked",
        "blocked_reason": "독립 사람 검토자가 원문 대조와 승인 attestation을 완료하지 않았다.",
    }
    artifact_path = args.artifact if args.artifact.is_absolute() else ROOT / args.artifact
    artifact_path.parent.mkdir(parents=True, exist_ok=True)
    artifact_path.write_text(
        json.dumps(artifact, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(
        f"Human review packet prepared: {len(key_provisions)} key provisions, "
        "approval pending."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
