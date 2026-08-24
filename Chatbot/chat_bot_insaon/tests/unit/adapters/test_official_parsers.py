import hashlib
from datetime import UTC, date, datetime

from insaon.adapters.source import OfficialHtmlProvisionParser
from insaon.domain import RawSnapshot


def _snapshot(
    content: str,
    *,
    effective_from: date = date(2026, 6, 2),
    effective_to: date | None = None,
) -> RawSnapshot:
    return RawSnapshot(
        snapshot_id="SNAP-LAW-OFFICIAL",
        source_id="LAW-LOCAL-OFFICIAL",
        official_source_id="lsiSeq:286499",
        source_url="https://www.law.go.kr/LSW/lsInfoR.do?lsiSeq=286499",
        content=content,
        content_type="text/html",
        content_hash=hashlib.sha256(content.encode()).hexdigest(),
        retrieved_at=datetime(2026, 7, 29, tzinfo=UTC),
        promulgation_date=date(2026, 6, 2),
        effective_from=effective_from,
        parser_version="official-html-v0.1.0",
        effective_to=effective_to,
    )


def test_parser_preserves_article_paragraph_item_subitem_and_proviso() -> None:
    parsed = OfficialHtmlProvisionParser().parse(
        _snapshot(
            """
            <div class="lawcon">
              <p class="pty1_p4"><label>제63조(휴직)</label>
                ① 공무원이 다음 각 호에 해당하면 휴직을 명하여야 한다.</p>
              <p class="pty1_de2h">1. 신체ㆍ정신상의 장애로 장기요양이 필요할 때</p>
              <p class="pty1_de2_1">② 휴직을 원하면 명할 수 있다. 다만, 제4호는
                특별한 사정이 없으면 명하여야 한다.</p>
              <p class="pty1_de2h">4. 자녀를 양육하거나 임신 또는 출산하게 되었을 때</p>
              <p class="pty1_p4"><label>제64조(휴직기간)</label>휴직기간은 다음과 같다.</p>
              <p class="pty1_de2h">1. 제63조제1항제1호 휴직기간은 1년 이내다.</p>
              <p class="pty1_de3">가. 공무상 질병</p>
            </div>
            """
        )
    )

    by_path = {provision.article_path: provision for provision in parsed.provisions}
    assert "제63조" in by_path
    assert by_path["제63조 제1항"].parent_provision_id == by_path["제63조"].provision_id
    assert (
        by_path["제63조 제1항 제1호"].parent_provision_id
        == by_path["제63조 제1항"].provision_id
    )
    assert "다만," in (by_path["제63조 제2항"].proviso_text or "")
    assert "parental_leave" in by_path["제63조 제2항 제4호"].topic_tags
    assert by_path["제64조 제1호 가목"].parent_provision_id == by_path["제64조 제1호"].provision_id
    assert by_path["제64조 제1호"].relation_ids
    assert parsed.quality_passed


def test_parser_applies_declared_historical_effective_end_to_every_provision() -> None:
    parsed = OfficialHtmlProvisionParser().parse(
        _snapshot(
            '<p class="pty1_p4"><label>제63조(휴직)</label>질병휴직 검토</p>',
            effective_from=date(2022, 12, 27),
            effective_to=date(2024, 9, 20),
        )
    )

    assert parsed.provisions
    assert {item.valid_time.end for item in parsed.provisions} == {date(2024, 9, 20)}


def test_parser_preserves_supplementary_provisions() -> None:
    parsed = OfficialHtmlProvisionParser().parse(
        _snapshot(
            """
            <p class="pty3"><span>부칙</span><span>&lt;법률 제21736호, 2026. 6. 2.&gt;</span></p>
            <p class="pty3_dep1">제1조(시행일) 이 법은 공포한 날부터 시행한다.</p>
            <p class="pty3_dep1">제2조(적용례) 제63조는 이 법 시행 이후부터 적용한다.</p>
            """
        )
    )

    supplements = [
        provision
        for provision in parsed.provisions
        if "supplementary" in provision.topic_tags
    ]
    assert len(supplements) == 3
    assert supplements[1].parent_provision_id == supplements[0].provision_id
    assert set(parsed.supplementary_ids) == {
        provision.provision_id for provision in supplements
    }


def test_parser_classifies_deleted_article_as_tombstone() -> None:
    parsed = OfficialHtmlProvisionParser().parse(
        _snapshot(
            """
            <p class="pty1_p4">제3조의2 삭제 &lt;1981. 4. 20.&gt;</p>
            <p class="pty1_p4"><label>제4조(결격사유)</label>본문</p>
            """
        )
    )

    assert [issue.code for issue in parsed.quality_issues] == [
        "DELETED_ARTICLE_TOMBSTONE"
    ]
    assert all("제3조의2" not in item.article_path for item in parsed.provisions)
    assert any(item.article_path == "제4조" for item in parsed.provisions)


def test_parser_keeps_unknown_article_shape_as_warning() -> None:
    parsed = OfficialHtmlProvisionParser().parse(
        _snapshot(
            """
            <p class="pty1_p4">제목 형식을 잃은 활성 조문 본문</p>
            """
        )
    )

    assert [issue.code for issue in parsed.quality_issues] == [
        "UNPARSED_ARTICLE",
        "MISSING_HIERARCHY",
    ]
