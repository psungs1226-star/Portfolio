from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from insaon.evaluation.failures import FAILURE_TYPES, FATAL_EQUIVALENTS


def load_results(directory: Path) -> list[dict[str, Any]]:
    return [
        json.loads(path.read_text(encoding="utf-8")) for path in sorted(directory.glob("*.json"))
    ]


def metric_value(result: dict[str, Any], metric_id: str) -> tuple[Any, int]:
    item = next(metric for metric in result["metrics"] if metric["metric_id"] == metric_id)
    return item["value"], item["denominator"]


def write_comparison(results_dir: Path, output: Path) -> None:
    results = load_results(results_dir)
    case_count = results[0]["data"]["case_count"] if results else 0
    lines = [
        "# 합성 시스템 회귀 비교",
        "",
        f"> 이 표는 {case_count}건 합성 시스템 회귀셋의 실제 실행 결과다. "
        "독립 검토된 법령 holdout이나 법률 정확도 결과가 아니다.",
        "",
        "| 구성 | Set Recall@5 | 상태 정확도 | 인용 완전성 | 표기 견고성 | 위험 답변률 | 치명적 오류 |",
        "|---|---:|---:|---:|---:|---:|---:|",
    ]
    for result in results:
        config_id = result["system"]["config_id"]
        values = [
            metric_value(result, "retrieval.set_recall_at_5")[0],
            metric_value(result, "answer.status_accuracy")[0],
            metric_value(result, "citation.completeness")[0],
            metric_value(result, "robustness.phrasing_status_agreement")[0],
            metric_value(result, "abstention.risky_answer_rate")[0],
        ]
        formatted = [f"{value:.3f}" if value is not None else "미측정" for value in values]
        lines.append(
            f"| {config_id} | {' | '.join(formatted)} | {result['fatal_errors']['total']} |"
        )
    first = results[0]
    lines.extend(
        [
            "",
            f"- 평가셋: `{first['data']['dataset_id']}@{first['data']['dataset_version']}`",
            f"- 문항 수: {first['data']['case_count']}",
            f"- 데이터 기준일: {first['data']['data_as_of']}",
            f"- dataset hash: `{first['data']['dataset_hash']}`",
            "",
            "## 다회차 대화",
            "",
            "위 표는 마지막 턴의 결과다. 이 표는 대화 자체가 무엇을 해내고 무엇을 놓치는지"
            " 나눈 것이다. 되묻는 데서 멈추고 정답 처리하면 이 제품의 핵심 시나리오"
            " 절반이 무측정으로 남는다.",
            "",
            "| 구성 | 대화 해결률 | 조건 이월 | 주제 격리 | 생략형 후속 |",
            "|---|---:|---:|---:|---:|",
        ]
    )
    for result in results:
        conversation = [
            metric_value(result, "conversation.resolution_rate"),
            metric_value(result, "conversation.condition_carryover"),
            metric_value(result, "conversation.topic_switch_isolation"),
            metric_value(result, "conversation.elliptical_followup"),
        ]
        cells = [
            f"{value:.3f} ({denominator}건)" if value is not None else "미측정"
            for value, denominator in conversation
        ]
        lines.append(f"| {result['system']['config_id']} | {' | '.join(cells)} |")
    lines.extend(
        [
            "",
            "- **대화 해결률** — 되물은 뒤 사용자가 답했을 때 기대 상태에 도달한 비율.",
            "- **조건 이월** — 앞 턴에서 물어본 필드를 사용자가 답한 뒤에도 세션이 들고"
            " 있는 비율.",
            "- **주제 격리** — 대화 도중 휴직 유형이 바뀌었을 때 앞 유형의 조문을 근거로"
            " 쓰지 않은 비율. 위반은 `FATAL_STALE_TURN_EVIDENCE`로도 센다.",
            "- **생략형 후속** — \"질병휴직은요?\" 같은 축약 발화에서 앞 턴의 과업을"
            " 유지한 비율.",
            "",
            "## 해석 제한",
            "",
            "- 모든 수치는 numerator/denominator가 있는 JSON artifact에서 생성했다.",
            "- 법령 정답, 실제 업무시간 절감, 처분 정확도, 사용자 만족도는 미측정이다.",
            "- 합성 회귀셋은 파이프라인·안전 동작 검증에만 사용한다.",
            "- 표기 견고성은 같은 질문의 조사 부착·점 표기 변형이 같은 상태로 끝나는 "
            "비율이다. 변형 두 종류뿐이므로 표기 견고성 전반의 측정이 아니다.",
            "- 상태 정확도가 낮은 구성에서는 표기 견고성이 높게 나온다. 원본과 변형이 "
            "같은 방식으로 실패해도 일치로 세기 때문이다. B0·B1·H1의 1.000은 그 경우다.",
            "- `claim.invented_quantity_rate`는 생성 모델이 호출된 케이스만 분모로 쓴다. "
            "결정적 모델은 템플릿만 쓰므로 이 표에서는 움직이지 않는다.",
            "- Set Recall@5는 질문 한 줄을 그대로 넣는 단일 질의 probe다. 다회차 케이스는 "
            "실제 제품이 이월된 조건과 분류 결과를 함께 넣어 검색하므로 이 probe로 "
            "재현되지 않는다. 분모에서 빼고 인용 완전성으로 판단한다.",
            "- 다회차 지표의 분모는 구성당 12건, 하위 지표는 각 4건이다. 신뢰구간을 논할 "
            "규모가 아니라 동작 유무를 보는 회귀 확인이다.",
        ]
    )
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text("\n".join(lines) + "\n", encoding="utf-8")


def _public_failure_examples(
    private_results_dir: Path | None,
    *,
    limit: int = 10,
) -> list[tuple[str, str, str]]:
    if private_results_dir is None or not private_results_dir.is_dir():
        return []
    examples: list[tuple[str, str, str]] = []
    seen: set[tuple[str, str, str]] = set()
    private_results: dict[str, list[dict[str, Any]]] = {}
    for path in sorted(private_results_dir.glob("*.case-results.json")):
        config_id = path.name.split(".", maxsplit=1)[0].upper()
        rows = json.loads(path.read_text(encoding="utf-8"))
        private_results[config_id] = rows
        for row in rows:
            for error_type in row["fatal_errors"]:
                example = (config_id, row["case_id"], error_type)
                if example not in seen:
                    seen.add(example)
                    examples.append(example)
    for config_id, rows in sorted(private_results.items()):
        for row in rows:
            actual_status = row["repeat_statuses"][0]
            actual_action = row["predicted_action"]
            if row["expected_status"] != actual_status or row["expected_action"] != actual_action:
                error_type = (
                    "STATUS_OR_ACTION_MISMATCH"
                    f" ({row['expected_status']}/{row['expected_action']}"
                    f" → {actual_status}/{actual_action})"
                )
                example = (config_id, row["case_id"], error_type)
                if example not in seen:
                    seen.add(example)
                    examples.append(example)
            if len(examples) >= limit:
                return examples[:limit]
    return examples[:limit]


def write_failures(
    results_dir: Path,
    output: Path,
    *,
    private_results_dir: Path | None = None,
) -> None:
    """Publish what each configuration got wrong, by class, across the whole ablation.

    Reporting one configuration's fatal count hides the trade every stage makes: the
    temporal pre-filter removes one class of failure and creates another, and only a
    per-class table across configurations shows it.
    """
    results = load_results(results_dir)
    examples = _public_failure_examples(private_results_dir)
    observed = [
        failure
        for failure in FAILURE_TYPES
        if any(result["failure_types"]["by_type"].get(failure) for result in results)
    ]
    unobserved = [failure for failure in FAILURE_TYPES if failure not in observed]

    lines = [
        "# 실패 분석",
        "",
        f"- 평가셋: `{results[0]['data']['dataset_id']}@{results[0]['data']['dataset_version']}`"
        f" · {results[0]['data']['case_count']}건",
        f"- 관측된 오류 유형: {len(observed)}종",
        "",
        "합성 회귀 실행의 case-level 기록은 비제출 영역에 보존한다. 공개 문서에는 질문 원문,"
        " 잠금 정답과 사람 메모를 복사하지 않는다.",
        "",
        "## 구성별 오류 유형 분포",
        "",
        "각 칸은 해당 유형이 관측된 case 수 / 전체 case 수다. 한 case가 여러 유형에 해당할 수"
        " 있으므로 행의 합은 `실패 case`보다 클 수 있다.",
        "",
        "| 구성 | " + " | ".join(observed) + " | 실패 case | 치명적 오류 |",
        "|---" * (len(observed) + 3) + "|",
    ]
    for result in results:
        counts = result["failure_types"]["by_type"]
        total = result["data"]["case_count"]
        cells = [f"{counts.get(failure, 0)}/{total}" for failure in observed]
        lines.append(
            f"| {result['system']['config_id']} | " + " | ".join(cells) + " | "
            f"{result['failure_types']['cases_with_any_failure']}/{total} | "
            f"{result['fatal_errors']['total']} |"
        )
    if unobserved:
        lines.extend(
            [
                "",
                "관측되지 않아 표에서 제외한 유형: "
                + ", ".join(f"`{item}`" for item in unobserved)
                + ". 0건이며 지어내지 않는다.",
            ]
        )

    lines.extend(
        [
            "",
            "## 각 단계가 고친 것과 새로 만든 것",
            "",
            "직전 구성 대비 증감이다. 어떤 단계도 실패를 일방적으로 줄이지 않는다.",
            "",
            "| 전이 | 없앤 유형 | 늘린 유형 |",
            "|---|---|---|",
        ]
    )
    for previous, current in zip(results[:-1], results[1:], strict=True):
        removed: list[str] = []
        added: list[str] = []
        for failure in observed:
            before = previous["failure_types"]["by_type"].get(failure, 0)
            after = current["failure_types"]["by_type"].get(failure, 0)
            if after < before:
                removed.append(f"`{failure}` {before}→{after}")
            elif after > before:
                added.append(f"`{failure}` {before}→{after}")
        lines.append(
            f"| {previous['system']['config_id']} → {current['system']['config_id']} | "
            f"{', '.join(removed) or '없음'} | {', '.join(added) or '없음'} |"
        )

    lines.extend(
        [
            "",
            "## 치명적 오류와의 대응",
            "",
            "`FATAL_` 접두사는 AGENTS.md의 치명적 오류에만 붙는다. 과거 리포트와 비교"
            " 가능하도록 대응 관계를 남긴다.",
            "",
            "| 오류 유형 | 치명적 오류 라벨 |",
            "|---|---|",
        ]
    )
    for failure in FAILURE_TYPES:
        label = FATAL_EQUIVALENTS.get(failure)
        lines.append(f"| `{failure}` | {f'`{label}`' if label else '해당 없음' } |")

    lines.extend(
        [
            "",
            "## 공개 가능한 대표 실패",
            "",
            "비제출 case-level 결과에서 case ID와 오류 유형만 추출했다. 불리한 구성을 빼지"
            " 않는다.",
            "",
            "| 구성 | case ID | 오류 유형 |",
            "|---|---|---|",
        ]
    )
    if examples:
        lines.extend(
            f"| {config_id} | `{case_id}` | {error_type} |"
            for config_id, case_id, error_type in examples
        )
    else:
        lines.append("| - | - | case-level 비제출 결과를 제공하지 않아 미생성 |")

    lines.extend(["", "## 현재 한계", ""])
    lines.extend(f"- {item}" for item in results[0]["limitations"])
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text("\n".join(lines) + "\n", encoding="utf-8")
