import json
from dataclasses import replace

from insaon.adapters.source import ProvisionParser


def test_parser_preserves_hierarchy_proviso_and_supplement(semantic_snapshot) -> None:
    parsed = ProvisionParser().parse(semantic_snapshot)
    assert parsed.quality_passed
    assert len(parsed.provisions) == 3
    proviso = next(p for p in parsed.provisions if "proviso" in p.topic_tags)
    assert proviso.parent_provision_id == "SYNTH-ARTICLE-1"
    assert parsed.supplementary_ids == ("SYNTH-SUPPLEMENT-1",)


def test_parser_reports_orphan_without_inventing_parent(semantic_snapshot) -> None:
    payload = json.loads(semantic_snapshot.content)
    payload["provisions"][1]["parent_provision_id"] = "MISSING"
    parsed = ProvisionParser().parse(
        replace(semantic_snapshot, content=json.dumps(payload, ensure_ascii=False))
    )
    assert any(issue.code == "ORPHAN_NODE" for issue in parsed.quality_issues)
