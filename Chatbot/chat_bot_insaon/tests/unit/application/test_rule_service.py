from dataclasses import replace
from datetime import date

from insaon.application.rules import RuleService
from insaon.domain import DateRange
from tests.unit.retrieval.test_retrievers import provisions


def test_rule_service_rejects_invalid_version_and_unknown_citation() -> None:
    provision = replace(provisions()[0], valid_time=DateRange(date(2025, 1, 1)))
    result = RuleService().validate_temporal_and_citations(
        date(2024, 1, 1), (provision,), ("MISSING",)
    )
    assert not result.passed
    assert set(result.review_reasons) == {
        "invalid_effective_version",
        "citation_id_not_found",
    }


def test_rule_service_returns_review_reason_for_unresolved_legal_inputs() -> None:
    provision = provisions()[0]
    result = RuleService().validate_temporal_and_citations(
        date(2024, 1, 1),
        (provision,),
        (provision.provision_id,),
        unresolved_supplementary=True,
        local_rule_conflict=True,
    )
    assert result.review_reasons == (
        "supplementary_interpretation_required",
        "local_rule_conflict",
    )
