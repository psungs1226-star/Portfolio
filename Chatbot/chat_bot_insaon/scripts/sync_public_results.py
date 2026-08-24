#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def metric(result: dict[str, Any], metric_id: str) -> dict[str, Any]:
    return next(item for item in result["metrics"] if item["metric_id"] == metric_id)


def count(value: object) -> str:
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value)


def replace_generated_block(
    path: Path,
    marker: str,
    generated: str,
) -> None:
    text = path.read_text(encoding="utf-8")
    start = f"<!-- GENERATED:{marker}:START -->"
    end = f"<!-- GENERATED:{marker}:END -->"
    if text.count(start) != 1 or text.count(end) != 1:
        raise ValueError(f"{path}: expected exactly one {marker} marker pair")
    before, remainder = text.split(start, maxsplit=1)
    _, after = remainder.split(end, maxsplit=1)
    path.write_text(
        f"{before}{start}\n{generated.rstrip()}\n{end}{after}",
        encoding="utf-8",
    )


def ratio_text(result: dict[str, Any], metric_id: str) -> str:
    item = metric(result, metric_id)
    return f"{count(item['numerator'])}/{item['denominator']} ({item['value']:.3f})"


def main() -> int:
    h2 = load_json(ROOT / "evals/results/h2_temporal_filter.json")
    h3 = load_json(ROOT / "evals/results/h3_reranker_context.json")
    lexical = load_json(ROOT / "artifacts/spikes/lexical/manifest.json")
    if h3["data"]["dataset_hash"] != h2["data"]["dataset_hash"]:
        raise ValueError("H2 and H3 dataset hashes differ")

    readme = "\n".join(
        [
            "### 합성 시스템 회귀 결과",
            "",
            "> 아래 값은 기계 생성 합성 회귀셋에서 파이프라인·안전 동작을 확인한 결과다. 독립 검토 법령 holdout이나 법률 정확도 결과가 아니다.",
            "",
            "| 항목 | H3 성공/전체 | 값 |",
            "|---|---:|---:|",
            f"| 근거 조문 Set Recall@5 | {count(metric(h3, 'retrieval.set_recall_at_5')['numerator'])}/{metric(h3, 'retrieval.set_recall_at_5')['denominator']} | {metric(h3, 'retrieval.set_recall_at_5')['value']:.3f} |",
            f"| 답변 상태 정확도 | {count(metric(h3, 'answer.status_accuracy')['numerator'])}/{metric(h3, 'answer.status_accuracy')['denominator']} | {metric(h3, 'answer.status_accuracy')['value']:.3f} |",
            f"| 인용 완전성 | {count(metric(h3, 'citation.completeness')['numerator'])}/{metric(h3, 'citation.completeness')['denominator']} | {metric(h3, 'citation.completeness')['value']:.3f} |",
            f"| 위험 답변률 | {count(metric(h3, 'abstention.risky_answer_rate')['numerator'])}/{metric(h3, 'abstention.risky_answer_rate')['denominator']} | {metric(h3, 'abstention.risky_answer_rate')['value']:.3f} |",
            f"| 다회차 대화 해결률 | {count(metric(h3, 'conversation.resolution_rate')['numerator'])}/{metric(h3, 'conversation.resolution_rate')['denominator']} | {metric(h3, 'conversation.resolution_rate')['value']:.3f} |",
            f"| 생략형 후속 유지 | {count(metric(h3, 'conversation.elliptical_followup')['numerator'])}/{metric(h3, 'conversation.elliptical_followup')['denominator']} | {metric(h3, 'conversation.elliptical_followup')['value']:.3f} |",
            f"| 치명적 오류 | {h3['fatal_errors']['total']}/{h3['data']['case_count']} | H2 {h2['fatal_errors']['total']}건 → H3 {h3['fatal_errors']['total']}건 |",
            "",
            f"- 평가셋: `{h3['data']['dataset_id']}@{h3['data']['dataset_version']}` · {h3['data']['case_count']}건 · 기준일 {h3['data']['data_as_of']}",
            "- 결과: [`H3 JSON`](evals/results/h3_reranker_context.json) · [`B0~H3 비교`](evals/reports/comparison.md) · [`실패 분석`](evals/reports/failure_analysis.md)",
            "- 법률 정답성, 실제 사용자 효과와 로컬 모델 반복 성능은 미측정이다.",
        ]
    )
    replace_generated_block(ROOT / "README.md", "SYNTHETIC-RESULTS", readme)

    candidates = lexical["candidates"]
    fts5 = candidates["sqlite_fts5"]
    ngram = candidates["char_ngram"]
    lexical_html = "\n".join(
        [
            "                <tr>",
            "                  <td>Lexical spike</td>",
            "                  <td>SQLite FTS5<br>문자 2-gram</td>",
            f"                  <td>동일 합성 개발 corpus·query·top-k=5에서 FTS5 Set Recall@5 {fts5['set_recall_at_5']:.3f}, MRR@10 {fts5['mrr_at_10']:.3f}; 문자 2-gram {ngram['set_recall_at_5']:.3f}, {ngram['mrr_at_10']:.3f}</td>",
            f"                  <td><strong>{lexical['selected']}</strong><br>합성 spike 선택</td>",
            "                </tr>",
        ]
    )
    replace_generated_block(
        ROOT / "report/planning-report.html",
        "LEXICAL-SPIKE",
        lexical_html,
    )

    synthetic_html = "\n".join(
        [
            f"                <li><strong>데이터</strong><span>{h3['data']['dataset_id']}@{h3['data']['dataset_version']} · {h3['data']['case_count']}건 · {h3['data']['data_as_of']} · CASE-A · CASE-B · CASE-C 연계</span></li>",
            f"                <li><strong>H3 품질</strong><span>Set Recall@5 {ratio_text(h3, 'retrieval.set_recall_at_5')} · 상태 {ratio_text(h3, 'answer.status_accuracy')}</span></li>",
            f"                <li><strong>H3 안전</strong><span>인용 완전성 {ratio_text(h3, 'citation.completeness')} · 위험 답변 {ratio_text(h3, 'abstention.risky_answer_rate')} · 치명적 오류 {h3['fatal_errors']['total']}건</span></li>",
            f"                <li><strong>Ablation</strong><span>H2 {h2['fatal_errors']['total']}건 → H3 {h3['fatal_errors']['total']}건 (결정적 예외 누락 포함 치명적 오류)</span></li>",
            "                <li><strong>경계</strong><span>합성 시스템 회귀이며 독립 법령 holdout·법률 정확도·실무 효과·반복 성능은 미측정</span></li>",
        ]
    )
    replace_generated_block(
        ROOT / "report/planning-report.html",
        "SYNTHETIC-RESULTS",
        synthetic_html,
    )
    print("Synced README and planning-report.html from result artifacts.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
