
from insaon.application.rules import RuleService
from tests.unit.retrieval.test_retrievers import provisions


def test_temporal_rule_flow_requires_reference_date() -> None:
    provision = provisions()[0]
    result = RuleService().validate_temporal_and_citations(
        None, (provision,), (provision.provision_id,)
    )
    assert not result.passed
    assert result.review_reasons == ("reference_date_required",)
