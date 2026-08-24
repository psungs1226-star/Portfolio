from typing import get_type_hints

from insaon.application import ports


def test_ports_are_protocols_and_domain_has_no_framework_imports() -> None:
    assert ports.LexicalRetriever._is_protocol
    assert ports.ModelGateway._is_protocol
    hints = get_type_hints(ports.LawSourceClient.fetch_document)
    assert hints["return"].__name__ == "RawSnapshot"

    import insaon.domain.models as domain_models

    source = domain_models.__loader__.get_source(domain_models.__name__)  # type: ignore[union-attr]
    assert "fastapi" not in source
    assert "sqlalchemy" not in source
    assert "pydantic" not in source
