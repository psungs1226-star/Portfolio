"""Classify what a configuration got wrong, not just how often.

Until the distractor corpus arrived, the public failure report could only show one error
type, because a seven-provision fixture had no way to produce any other. A single count
also hides the thing an ablation is for: a stage that removes one class of failure often
creates another, and "fatal errors went down" says nothing about which trade was made.

Gold answers reach this module and never leave it. It runs inside ``insaon.evaluation``,
which is allowed to call the runtime pipeline but must not hand the runtime any answer
key, so classification happens after the answer already exists.
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence

from insaon.domain import AnswerStatus, ExpectedAction, Provision, ReviewAnswer
from insaon.evaluation.models import EvaluationCase

# Ordered most retrieval-side first so the published table reads along the pipeline.
FAILURE_TYPES = (
    "RETRIEVAL_MISS",
    "WRONG_VERSION",
    "ADJACENT_TYPE_CONFUSION",
    "MISSING_DECISIVE_EXCEPTION",
    "CITATION_INCOMPLETE",
    "WRONG_STATUS",
    "RISKY_ANSWER",
)

# Which failure types are also 치명적 오류 under AGENTS.md, and under what label the
# earlier reports recorded them. Keeping this explicit is what makes the new taxonomy
# comparable with the reports published before it existed.
FATAL_EQUIVALENTS = {
    "WRONG_VERSION": "FATAL_INVALID_EFFECTIVE_VERSION",
    "MISSING_DECISIVE_EXCEPTION": "FATAL_MISSING_DECISIVE_EXCEPTION",
    "RISKY_ANSWER": "FATAL_OUT_OF_SCOPE_DEFINITE_ANSWER",
}

_LANE_TAGS = {
    "parental": "parental_leave",
    "medical": "medical_leave",
    "family_care": "family_care_leave",
    "self_development": "self_development_leave",
}
# Tags that belong to no single lane; retrieving them is never lane confusion.
_LANE_NEUTRAL_TAGS = frozenset({"supplementary", "proviso", "reinstatement"})


def classify_failures(
    case: EvaluationCase,
    answer: ReviewAnswer,
    predicted_action: ExpectedAction,
    candidate_ids: Sequence[str],
    provisions: Mapping[str, Provision],
) -> tuple[str, ...]:
    """Return every failure type observed for one case, in ``FAILURE_TYPES`` order."""
    observed: set[str] = set()
    cited = {citation.provision_id for citation in answer.citations}
    required_evidence = set(case.expected.required_evidence_ids)
    required_exceptions = set(case.expected.required_exception_ids)

    if answer.status is not case.expected.answer_status or predicted_action is not (
        case.expected.action
    ):
        observed.add("WRONG_STATUS")

    if (
        case.expected.action in {ExpectedAction.ASK, ExpectedAction.ABSTAIN}
        and answer.status is AnswerStatus.ANSWERABLE
    ):
        observed.add("RISKY_ANSWER")

    if candidate_ids and case.reference_date is not None:
        if required_evidence and not required_evidence <= set(candidate_ids):
            observed.add("RETRIEVAL_MISS")
        if any(
            provision_id in provisions
            and not provisions[provision_id].valid_time.contains(case.reference_date)
            for provision_id in candidate_ids
        ):
            observed.add("WRONG_VERSION")
        if _has_adjacent_lane_candidate(case, candidate_ids, provisions):
            observed.add("ADJACENT_TYPE_CONFUSION")

    if answer.status is AnswerStatus.ANSWERABLE:
        if required_exceptions and not required_exceptions <= cited:
            observed.add("MISSING_DECISIVE_EXCEPTION")
        # Reported separately from the exception case: citing the rule but not the
        # proviso that overturns it is a different defect from citing an incomplete
        # bundle of ordinary evidence, and the two are fixed by different stages.
        if required_evidence and not required_evidence <= cited:
            observed.add("CITATION_INCOMPLETE")

    # A citation that is invalid on the question date is a fatal version error even when
    # retrieval looked clean, so it is checked against citations too.
    if case.reference_date is not None and any(
        provision_id in provisions
        and not provisions[provision_id].valid_time.contains(case.reference_date)
        for provision_id in cited
    ):
        observed.add("WRONG_VERSION")

    return tuple(item for item in FAILURE_TYPES if item in observed)


def _has_adjacent_lane_candidate(
    case: EvaluationCase,
    candidate_ids: Sequence[str],
    provisions: Mapping[str, Provision],
) -> bool:
    lane = _LANE_TAGS.get(case.slice.leave_type)
    if lane is None:
        return False
    for provision_id in candidate_ids:
        provision = provisions.get(provision_id)
        if provision is None:
            continue
        lane_tags = {
            tag
            for tag in provision.topic_tags
            if tag.endswith("_leave") and tag not in _LANE_NEUTRAL_TAGS
        }
        if lane_tags and lane not in lane_tags:
            return True
    return False
