#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--candidate", type=Path, required=True)
    parser.add_argument(
        "--artifact",
        type=Path,
        default=Path("artifacts/legal/candidate-review.json"),
    )
    parser.add_argument(
        "--report",
        type=Path,
        default=Path("evals/reports/official-corpus-readiness.md"),
    )
    parser.add_argument("--phase-label", default="Phase 07")
    parser.add_argument(
        "--private-label",
        default="private/legal/processed/candidate.json",
    )
    parser.add_argument(
        "--review-scope",
        default="육아·질병·가족돌봄·자기개발 휴직 관련 본문·단서·부칙",
    )
    args = parser.parse_args()
    candidate = json.loads(args.candidate.read_text(encoding="utf-8"))
    issue_counts = Counter(
        (str(issue["source_id"]), str(issue["code"]))
        for issue in candidate["quality"]["issues"]
    )
    sources = [
        {
            "snapshot_id": source["snapshot_id"],
            "source_id": source["source_id"],
            "official_source_id": source["official_source_id"],
            "source_url": source["source_url"],
            "content_hash": source["content_hash"],
            "retrieved_at": source["retrieved_at"],
            "effective_from": source["effective_from"],
            "effective_to": source.get("effective_to"),
        }
        for source in candidate["sources"]
    ]
    artifact = {
        "schema_version": "0.1.0",
        "profile": "legal-corpus-candidate",
        "candidate_status": candidate["candidate_status"],
        "source_manifest_hash": candidate["source_manifest_hash"],
        "parser_version": candidate["parser_version"],
        "source_count": len(sources),
        "sources": sources,
        "provision_count": candidate["provision_count"],
        "supplementary_count": candidate["supplementary_count"],
        "quality": {
            "fatal_count": candidate["quality"]["fatal_count"],
            "warning_count": candidate["quality"]["warning_count"],
            "informational_count": candidate["quality"]["informational_count"],
            "issue_counts": [
                {"source_id": source_id, "code": code, "count": count}
                for (source_id, code), count in sorted(issue_counts.items())
            ],
        },
        "approval": {
            "status": candidate["approval"]["status"],
            "reviewer_count": 0,
        },
        "release_status": "hold",
        "blocked_reason": (
            "자동 구조 품질감사는 통과했지만 본문·단서·부칙을 원문 대조하고 "
            "승인 hash를 남길 독립 사람 승인자가 없다."
        ),
        "limitations": candidate["limitations"],
    }
    artifact_path = args.artifact if args.artifact.is_absolute() else ROOT / args.artifact
    artifact_path.parent.mkdir(parents=True, exist_ok=True)
    artifact_path.write_text(
        json.dumps(artifact, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    rows = "\n".join(
        f"| `{source['source_id']}` | `{source['content_hash']}` | "
        f"{source['effective_from']} | {source['effective_to'] or '현행'} |"
        for source in sources
    )
    issues = "\n".join(
        f"| `{entry['source_id']}` | `{entry['code']}` | {entry['count']} |"
        for entry in artifact["quality"]["issue_counts"]
    )
    report = f"""# 공식 법령 corpus 준비 검토

## 결론

{args.phase_label}의 공식 원문 수집과 계층 파싱 dry-run은 실행됐다. 그러나 결과는
`pending_human_approval`이며 검색 index로 승격되지 않았다.

| 항목 | 실제 결과 |
|---|---:|
| 공식 source snapshot | {len(sources)}개 |
| 파싱 provision | {candidate["provision_count"]}개 |
| 부칙 node | {candidate["supplementary_count"]}개 |
| 치명적 parser 오류 | {candidate["quality"]["fatal_count"]}개 |
| 활성 조문 미파싱 warning | {candidate["quality"]["warning_count"]}개 |
| 삭제 조문 tombstone | {candidate["quality"]["informational_count"]}개 |
| 사람 승인자 | 0명 |
| release | `hold` |

## 불변 source 증거

| Source ID | SHA-256 | 시행일 | 효력 종료(미포함) |
|---|---|---|---|
{rows}

## parser 정보 항목

| Source ID | 유형 | 건수 |
|---|---|---:|
{issues}

{candidate["quality"]["informational_count"]}개 항목은 공식 HTML에서 `삭제`라고 명시된 조문 표식으로 재현되어
`DELETED_ARTICLE_TOMBSTONE`으로 분류했다. 활성 조문 형식의
`UNPARSED_ARTICLE`은 0개다. 이 분류와 별개로 승인자는 원문을 다시 열어
조·항·호·목, 단서, 부칙과 휴직 관련 조문을 대조해야 한다.

## 다음 승인 절차

1. 비제출 `{args.private_label}`과 위 source hash를 대조한다.
2. 자동 품질감사 결과와 삭제 조문 tombstone 분류를 확인한다.
3. {args.review_scope}을 원문과 대조한다.
4. 승인자 ID·승인시각·승인 hash를 별도 비제출 승인 기록에 남긴다.
5. 승인 뒤에만 versioned legal index와 Phase 08 독립 평가를 실행한다.

이 결과는 공식 페이지의 수집·파싱 준비 증거이며 법률 정답성이나 최신 법령 보장이 아니다.
"""
    report_path = args.report if args.report.is_absolute() else ROOT / args.report
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(report, encoding="utf-8")
    print(f"Legal candidate summary written: {artifact_path}, {report_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
