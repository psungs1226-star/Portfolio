from __future__ import annotations

import argparse
import json
import sys
import tomllib
from pathlib import Path

from insaon.evaluation.chunking import run_chunking_spike
from insaon.evaluation.models import EvaluationCase
from insaon.evaluation.query_probe import run_query_transform_probe
from insaon.evaluation.reporting import write_comparison, write_failures
from insaon.evaluation.runner import run_all
from insaon.evaluation.spike import run_lexical_spike

ROOT = Path(__file__).resolve().parents[3]


def main() -> int:
    parser = argparse.ArgumentParser(prog="python -m insaon.evaluation.cli")
    subparsers = parser.add_subparsers(dest="command", required=True)
    spike = subparsers.add_parser("retrieval-spike")
    spike.add_argument("--config", type=Path, required=True)
    chunking = subparsers.add_parser("chunking-spike")
    chunking.add_argument("--config", type=Path, required=True)
    probe = subparsers.add_parser("query-transform-probe")
    probe.add_argument("--config", type=Path, required=True)
    validate = subparsers.add_parser("validate-dataset")
    validate.add_argument("--dataset", type=Path, required=True)
    run = subparsers.add_parser("run")
    run.add_argument("--config", type=Path, required=True)
    compare = subparsers.add_parser("compare")
    compare.add_argument("--results", type=Path, required=True)
    compare.add_argument("--output", type=Path, required=True)
    failures = subparsers.add_parser("failures")
    failures.add_argument("--results", type=Path, required=True)
    failures.add_argument("--private-case-results", type=Path)
    failures.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    if args.command == "retrieval-spike":
        config_path = (
            (ROOT / args.config).resolve() if not args.config.is_absolute() else args.config
        )
        config = tomllib.loads(config_path.read_text(encoding="utf-8"))
        manifest = run_lexical_spike(
            ROOT / config["dataset"],
            ROOT / config["output"],
            int(config["top_k"]),
            int(config["char_ngram_size"]),
        )
        print(
            f"Lexical spike complete: selected={manifest['selected']} "
            f"dataset={manifest['dataset_id']}"
        )
        return 0
    if args.command == "chunking-spike":
        config_path = (
            (ROOT / args.config).resolve() if not args.config.is_absolute() else args.config
        )
        config = tomllib.loads(config_path.read_text(encoding="utf-8"))
        manifest = run_chunking_spike(
            ROOT / config["corpus"],
            ROOT / config["queries"],
            ROOT / config["output"],
            int(config["top_k"]),
        )
        print(
            "Chunking spike complete: "
            + " ".join(
                f"{name}=recall {result['set_recall_at_5']['value']:.3f}/"
                f"citable {1 - result['citation']['multi_provision_chunks']['value']:.3f}"
                for name, result in manifest["candidates"].items()
            )
        )
        return 0
    if args.command == "query-transform-probe":
        config_path = (
            (ROOT / args.config).resolve() if not args.config.is_absolute() else args.config
        )
        config = tomllib.loads(config_path.read_text(encoding="utf-8"))
        manifest = run_query_transform_probe(
            ROOT / config["probe"],
            ROOT / config["output"],
            int(config["top_k"]),
        )
        print(
            "Query transform probe complete: "
            + " ".join(
                f"{name}=hit {result['hit_rate_at_k']['value']:.3f}"
                for name, result in manifest["candidates"].items()
            )
        )
        return 0
    if args.command == "validate-dataset":
        dataset = (
            (ROOT / args.dataset).resolve() if not args.dataset.is_absolute() else args.dataset
        )
        cases = [
            EvaluationCase.model_validate_json(line)
            for line in dataset.read_text(encoding="utf-8").splitlines()
            if line.strip()
        ]
        groups = [case.group_id for case in cases]
        if len(groups) != len(set(groups)):
            raise ValueError("dataset has duplicate groups")
        print(f"Dataset valid: {len(cases)} cases, sha256 recorded at run time.")
        return 0
    if args.command == "run":
        config_path = (
            (ROOT / args.config).resolve() if not args.config.is_absolute() else args.config
        )
        config = tomllib.loads(config_path.read_text(encoding="utf-8"))
        results = run_all(ROOT, config)
        print(
            json.dumps(
                {
                    "runs": [result.run_id for result in results],
                    "fatal_errors": [result.fatal_errors.total for result in results],
                }
            )
        )
        return 0
    if args.command == "compare":
        results = (
            (ROOT / args.results).resolve() if not args.results.is_absolute() else args.results
        )
        output = (ROOT / args.output).resolve() if not args.output.is_absolute() else args.output
        write_comparison(results, output)
        print(f"Comparison report written: {output}")
        return 0
    if args.command == "failures":
        results = (
            (ROOT / args.results).resolve() if not args.results.is_absolute() else args.results
        )
        private_results = (
            (ROOT / args.private_case_results).resolve()
            if args.private_case_results is not None and not args.private_case_results.is_absolute()
            else args.private_case_results
        )
        output = (ROOT / args.output).resolve() if not args.output.is_absolute() else args.output
        write_failures(
            results,
            output,
            private_results_dir=private_results,
        )
        print(f"Failure report written: {output}")
        return 0
    return 2


if __name__ == "__main__":
    sys.exit(main())
