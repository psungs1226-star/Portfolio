from datetime import date

from insaon.application.factory import synthetic_demo_provisions
from insaon.application.review import CitationValidator
from insaon.domain import Citation, Claim


def citation(provision_id: str, source_id: str = "SYNTHETIC-PUBLIC-FIXTURE") -> Citation:
    return Citation(
        citation_id=f"CITE-{provision_id}",
        source_id=source_id,
        provision_id=provision_id,
        source_name="합성",
        article_path="합성 제1조",
        effective_from=date(2024, 1, 1),
        effective_to=None,
        source_url="https://example.invalid/source",
    )


def test_validator_rejects_hallucinated_and_missing_exception_citations() -> None:
    provisions = {item.provision_id: item for item in synthetic_demo_provisions()}
    validator = CitationValidator(provisions)
    fake = citation("NOT-FOUND")
    result = validator.validate(
        reference_date=date(2024, 1, 1),
        subject="local_general_service",
        citations=(fake,),
        claims=(Claim("C", "claim", (fake.citation_id,)),),
        required_exception_ids=("SYNTHETIC-EXCEPTION-B-001",),
    )
    assert not result.valid
    assert "citation_provision_not_found" in result.reason_codes
    assert "decisive_exception_missing" in result.reason_codes
