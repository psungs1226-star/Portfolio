from insaon.adapters.source import ProvisionParser


def test_all_parsed_records_trace_to_snapshot_hash(semantic_snapshot) -> None:
    parsed = ProvisionParser().parse(semantic_snapshot)
    assert all(p.source_hash == semantic_snapshot.content_hash for p in parsed.provisions)
    assert all(p.valid_time.start >= semantic_snapshot.effective_from for p in parsed.provisions)
