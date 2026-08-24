from datetime import UTC, date, datetime

import pytest

from insaon.adapters.source import RecordedLawSourceClient, SourceFetchError, SourceResponse


def test_recorded_source_client_validates_and_hashes_response() -> None:
    def transport(source_id: str, effective: date, timeout: float) -> SourceResponse:
        assert timeout == 1.0
        return SourceResponse(
            status_code=200,
            content=b'{"provisions":[]}',
            content_type="application/json",
            source_url="https://example.invalid/source",
            source_id=source_id,
            promulgation_date=date(2023, 1, 1),
            effective_from=effective,
            retrieved_at=datetime(2026, 7, 29, tzinfo=UTC),
        )

    snapshot = RecordedLawSourceClient(transport, timeout_seconds=1.0).fetch_document(
        "SYNTH", date(2024, 1, 1)
    )
    assert len(snapshot.content_hash) == 64
    assert snapshot.effective_from == date(2024, 1, 1)


def test_source_client_uses_bounded_retries_without_network() -> None:
    calls = 0

    def timeout(*_args: object) -> SourceResponse:
        nonlocal calls
        calls += 1
        raise TimeoutError

    with pytest.raises(SourceFetchError):
        RecordedLawSourceClient(timeout, retries=2).fetch_document(
            "SYNTH", date(2024, 1, 1)
        )
    assert calls == 3
