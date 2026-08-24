from datetime import UTC, date, datetime

import pytest
from local_transport import ScriptedOllamaTransport

from insaon.adapters.source import CandidateCorpusError, CandidateEvidenceCorpus
from insaon.application.factory import build_local_runtime, build_review_service
from insaon.application.review import ReviewCommand
from insaon.domain import AnswerStatus, DateRange, Provision
from insaon.settings import Settings


def _settings() -> Settings:
    return Settings(runtime_profile="local", provider_max_retries=0, _env_file=None)


def _official_medical_corpus(
    *, effective_from: date = date(2026, 6, 30), missing_period_basis: bool = False
) -> CandidateEvidenceCorpus:
    source_id = "RULE-LOCAL-HR-GUIDE-OFFICIAL"
    law_source_id = "LAW-LOCAL-OFFICIAL"
    provisions = (
        Provision(
            provision_id=f"{law_source_id}:article:63:1:1",
            source_id=law_source_id,
            article_path="제63조 제1항 제1호",
            title="[지방공무원법] 휴직",
            text="신체ㆍ정신상의 장애로 장기요양이 필요할 때 휴직을 명할 수 있다.",
            valid_time=DateRange(effective_from),
            applies_to=frozenset({"local_general_service"}),
            topic_tags=frozenset({"medical_leave", "service_and_leave"}),
            source_hash="b" * 64,
        ),
        Provision(
            provision_id=f"{law_source_id}:article:64:1",
            source_id=law_source_id,
            article_path="제64조 제1호",
            title="[지방공무원법] 휴직기간",
            text=(
                "제63조제1항제1호에 따른 휴직기간은 1년 이내로 하되, "
                "부득이한 경우 1년의 범위에서 연장할 수 있다."
            ),
            valid_time=DateRange(effective_from),
            applies_to=frozenset({"local_general_service"}),
            topic_tags=frozenset({"medical_leave", "service_and_leave"}),
            source_hash="b" * 64,
        ),
        Provision(
            provision_id=f"{source_id}:article:70:1",
            source_id=source_id,
            article_path="제70조 제1항",
            title="[지방공무원 인사제도 운영지침] 질병휴직",
            text=(
                "질병휴직은 신체ㆍ정신상의 장애로 장기요양이 필요한 경우 가능하며 "
                "진단서 또는 휴직 사유를 증빙할 수 있는 자료로 판단한다."
            ),
            valid_time=DateRange(effective_from),
            applies_to=frozenset({"local_general_service"}),
            topic_tags=frozenset({"medical_leave", "service_and_leave"}),
            source_hash="a" * 64,
        ),
        Provision(
            provision_id=f"{source_id}:article:70:3",
            source_id=source_id,
            article_path="제70조 제3항",
            title="[지방공무원 인사제도 운영지침] 질병휴직",
            text=(
                "휴직기간 만료 후 복귀할 때 정상적인 근무가 가능하다는 진단서 또는 "
                "복직 사유를 증빙할 수 있는 자료로 정상근무 가능 여부를 판단한다."
            ),
            valid_time=DateRange(effective_from),
            applies_to=frozenset({"local_general_service"}),
            topic_tags=frozenset({"medical_leave", "reinstatement"}),
            source_hash="a" * 64,
        ),
    )
    if missing_period_basis:
        provisions = tuple(
            provision
            for provision in provisions
            if provision.article_path != "제64조 제1호"
        )
    return CandidateEvidenceCorpus(
        provisions=provisions,
        source_names={
            source_id: "지방공무원 인사제도 운영지침",
            law_source_id: "지방공무원법",
        },
        source_urls={
            source_id: "https://www.law.go.kr/LSW/admRulInfoP.do?admRulSeq=2100000281476",
            law_source_id: "https://www.law.go.kr/법령/지방공무원법",
        },
        source_review_tiers={source_id: "deep_review", law_source_id: "deep_review"},
        topic_source_ids={
            "service_and_leave": frozenset({source_id, law_source_id})
        },
        candidate_status="pending_human_approval",
        data_as_of=date(2026, 8, 3),
    )


def _official_parental_corpus() -> CandidateEvidenceCorpus:
    source_id = "LAW-LOCAL-OFFICIAL"
    provisions = (
        Provision(
            provision_id=f"{source_id}:article:63:2:4",
            source_id=source_id,
            article_path="제63조 제2항 제4호",
            title="[지방공무원법] 휴직",
            text=(
                "12세 이하 또는 초등학교 6학년 이하의 자녀를 양육하기 위하여 "
                "필요하거나 여성공무원이 임신 또는 출산하게 되었을 때"
            ),
            valid_time=DateRange(date(2026, 1, 1)),
            applies_to=frozenset({"local_general_service"}),
            topic_tags=frozenset({"parental_leave", "service_and_leave"}),
            source_hash="c" * 64,
        ),
        Provision(
            provision_id=f"{source_id}:article:64:8",
            source_id=source_id,
            article_path="제64조 제8호",
            title="[지방공무원법] 휴직기간",
            text="제63조제2항제4호에 따른 휴직기간은 자녀 1명에 대하여 3년 이내로 한다.",
            valid_time=DateRange(date(2026, 1, 1)),
            applies_to=frozenset({"local_general_service"}),
            topic_tags=frozenset({"parental_leave", "service_and_leave"}),
            source_hash="c" * 64,
        ),
        Provision(
            provision_id=f"{source_id}:article:65:3",
            source_id=source_id,
            article_path="제65조 제3항",
            title="[지방공무원법] 휴직의 효력",
            text="휴직기간이 끝난 공무원이 30일 이내에 복귀신고를 하면 당연히 복직된다.",
            valid_time=DateRange(date(2026, 1, 1)),
            applies_to=frozenset({"local_general_service"}),
            topic_tags=frozenset({"parental_leave", "reinstatement"}),
            source_hash="c" * 64,
        ),
    )
    return CandidateEvidenceCorpus(
        provisions=provisions,
        source_names={source_id: "지방공무원법"},
        source_urls={source_id: "https://www.law.go.kr/법령/지방공무원법"},
        source_review_tiers={source_id: "deep_review"},
        topic_source_ids={"service_and_leave": frozenset({source_id})},
        candidate_status="pending_human_approval",
        data_as_of=date(2026, 8, 3),
    )


def test_local_case_b_runs_embedding_reranker_generation_in_order() -> None:
    transport = ScriptedOllamaTransport()
    runtime = build_local_runtime(
        _settings(),
        transport=transport,
        created_at=datetime(2026, 7, 29, tzinfo=UTC),
    )
    transport.calls.clear()
    answer = runtime.service.handle(
        ReviewCommand(
            "CASE-B",
            "2024-01-01 질병휴직 공개 근거를 찾아주세요",
            local_rule_checked=True,
        )
    )
    assert answer.status is AnswerStatus.ANSWERABLE
    assert answer.citations and answer.claims
    assert answer.claims[0].kind == "review_position"
    assert answer.short_answer == answer.claims[0].text
    cited = {citation.provision_id for citation in answer.citations}
    # The corpus carries deliberate distractors, so an exact-set assertion would only
    # restate today's ranking. What must hold is that the decisive evidence is present
    # and that nothing invalid on the question date is cited.
    assert {
        "SYNTHETIC-EVIDENCE-B-001",
        "SYNTHETIC-EXCEPTION-B-001",
        "SYNTH-SUPPLEMENT-001",
    } <= cited
    assert not [item for item in cited if "-OLD-" in item or "-FUT-" in item]
    assert "SYNTHETIC-NOT-EFFECTIVE-B-001" not in cited
    assert answer.model_used
    assert answer.model_id == "qwen3:4b-instruct"
    assert answer.model_recommended_status is AnswerStatus.ANSWERABLE
    assert [path for path, _ in transport.calls] == ["/embed", "/chat", "/chat"]
    assert runtime.index_manifest.embedding_model == "bge-m3:latest"
    assert runtime.model_artifacts["generation"].startswith("sha256:")


def test_local_model_failure_discards_draft_and_abstains() -> None:
    transport = ScriptedOllamaTransport()
    runtime = build_local_runtime(_settings(), transport=transport)
    transport.calls.clear()
    transport.next_status = 500
    answer = runtime.service.handle(
        ReviewCommand(
            "CASE-B-FAIL",
            "2024-01-01 질병휴직 공개 근거를 찾아주세요",
            local_rule_checked=True,
        )
    )
    assert answer.status is AnswerStatus.INSUFFICIENT_EVIDENCE
    assert answer.claims == ()
    assert not answer.model_used
    assert answer.model_id == "qwen3:4b-instruct"
    assert answer.review_reasons == ("provider_unavailable",)


def test_local_model_can_downgrade_a_possible_question_to_human_review() -> None:
    transport = ScriptedOllamaTransport()
    runtime = build_local_runtime(_settings(), transport=transport)
    answer = runtime.service.handle(
        ReviewCommand(
            "CASE-MEDICAL-JUDGMENT",
            "2024-01-01 비공무상 질병휴직 후 복직 가능한가요?",
            local_rule_checked=True,
        )
    )
    assert answer.status is AnswerStatus.REVIEW_REQUIRED
    assert answer.model_recommended_status is AnswerStatus.REVIEW_REQUIRED
    assert answer.review_reasons == ("model_recommends_human_review",)
    assert "확정할 수 없습니다" in answer.short_answer


def test_local_deep_review_uses_official_candidate_instead_of_synthetic_fixture() -> None:
    transport = ScriptedOllamaTransport()
    runtime = build_local_runtime(
        _settings(),
        transport=transport,
        evidence_corpus=_official_medical_corpus(),
    )
    transport.calls.clear()

    answer = runtime.service.handle(
        ReviewCommand(
            "OFFICIAL-MEDICAL",
            "2026-07-01 질병휴직과 복직의 공개 근거를 찾아주세요",
            local_rule_checked=True,
        )
    )

    assert answer.status is AnswerStatus.REVIEW_REQUIRED
    assert answer.model_used
    assert answer.citations
    assert "candidate_corpus_unapproved" in answer.review_reasons
    assert {citation.source_name for citation in answer.citations} == {
        "지방공무원 인사제도 운영지침",
        "지방공무원법",
    }
    assert all(
        not citation.provision_id.startswith("SYNTH") for citation in answer.citations
    )
    assert all(citation.source_url.startswith("https://www.law.go.kr/") for citation in answer.citations)
    paths = [path for path, _ in transport.calls]
    assert paths.count("/embed") == 4
    assert paths.count("/chat") == 2


def test_local_deep_review_does_not_replace_missing_historical_version_with_fixture() -> None:
    transport = ScriptedOllamaTransport()
    runtime = build_local_runtime(
        _settings(),
        transport=transport,
        evidence_corpus=_official_medical_corpus(),
    )
    transport.calls.clear()

    answer = runtime.service.handle(
        ReviewCommand(
            "OFFICIAL-HISTORICAL-GAP",
            "2024-01-01 질병휴직과 복직의 공개 근거를 찾아주세요",
            local_rule_checked=True,
        )
    )

    assert answer.status is AnswerStatus.INSUFFICIENT_EVIDENCE
    assert answer.citations == ()
    assert not answer.model_used
    assert answer.review_reasons == ("invalid_effective_version",)
    assert all(path != "/chat" for path, _ in transport.calls)


def test_local_medical_deep_review_requires_reason_period_and_reinstatement_evidence() -> None:
    transport = ScriptedOllamaTransport()
    runtime = build_local_runtime(
        _settings(),
        transport=transport,
        evidence_corpus=_official_medical_corpus(missing_period_basis=True),
    )
    transport.calls.clear()

    answer = runtime.service.handle(
        ReviewCommand(
            "OFFICIAL-MEDICAL-INCOMPLETE",
            "2026-07-01 비공무상 질병휴직 후 복직 가능한가요?",
            local_rule_checked=True,
        )
    )

    assert answer.status is AnswerStatus.INSUFFICIENT_EVIDENCE
    assert answer.review_reasons == ("required_medical_evidence_missing",)
    assert not answer.model_used


def test_local_parental_deep_review_requires_basis_period_and_reinstatement_evidence() -> None:
    transport = ScriptedOllamaTransport()
    runtime = build_local_runtime(
        _settings(),
        transport=transport,
        evidence_corpus=_official_parental_corpus(),
    )
    transport.calls.clear()

    answer = runtime.service.handle(
        ReviewCommand(
            "OFFICIAL-PARENTAL",
            (
                "2026-07-01 육아휴직 후 복직 근거를 찾아주세요. "
                "자녀 출생일은 2022-05-01이고 같은 자녀의 이전 육아휴직은 없습니다."
            ),
            local_rule_checked=True,
        )
    )

    assert answer.status is AnswerStatus.REVIEW_REQUIRED
    assert {citation.article_path for citation in answer.citations} == {
        "제63조 제2항 제4호",
        "제64조 제8호",
        "제65조 제3항",
    }
    assert answer.model_used


def test_local_product_service_refuses_synthetic_fallback_without_official_corpus(
    tmp_path,
) -> None:
    with pytest.raises(CandidateCorpusError, match="official candidate corpus"):
        build_review_service(
            Settings(
                runtime_profile="local",
                candidate_corpus_path=str(tmp_path / "missing-candidate.json"),
                _env_file=None,
            )
        )
