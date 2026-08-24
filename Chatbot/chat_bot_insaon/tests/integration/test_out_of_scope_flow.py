from insaon.application.classification import QuestionClassifier
from insaon.application.conditions import ConditionExtractor, QuestionPolicy
from insaon.application.factory import build_offline_review_service
from insaon.application.review import ReviewCommand
from insaon.domain import AnswerStatus, ExpectedAction


def test_case_c_abstains_without_definitive_answer() -> None:
    text = "국가공무원의 기관 내부 규정으로 최종 처분을 확정해주세요"
    classification = QuestionClassifier().classify(text)
    decision = QuestionPolicy().decide(
        classification, ConditionExtractor().extract(text, classification)
    )
    assert decision.action is ExpectedAction.ABSTAIN
    assert decision.answer_status is AnswerStatus.INSUFFICIENT_EVIDENCE


def test_unrelated_questions_abstain_without_asking_for_leave_conditions() -> None:
    service = build_offline_review_service()
    for index, text in enumerate(
        (
            "오늘 날씨 어때",
            "점심시간은 몇 시부터인가요?",
            "우리 팀 워크숍 예산은 어디서 확인하죠?",
            "계약직 재계약 절차 알려줘",
        )
    ):
        answer = service.handle(
            ReviewCommand(request_id=f"NO-SIGNAL-{index}", question_text=text)
        )
        assert answer.status is AnswerStatus.INSUFFICIENT_EVIDENCE, text
        assert not answer.citations, text
        missing = [item.field for item in answer.missing_conditions]
        assert "leave_type" not in missing, text
        assert "reference_date" not in missing, text


def test_out_of_scope_answer_explains_the_boundary_and_next_supported_action() -> None:
    answer = build_offline_review_service().handle(
        ReviewCommand(
            request_id="OUT-OF-SCOPE-ACTIONABLE",
            question_text="승진 심사 결과를 최종 판단해 주세요",
        )
    )

    assert answer.status is AnswerStatus.INSUFFICIENT_EVIDENCE
    assert "근거 부족" not in answer.short_answer
    assert "최종 인사처분 판단" in answer.short_answer
    assert any("육아·질병·가족돌봄·자기개발" in item for item in answer.limitations)
    # 넓은 lane을 지원하면서 "승진·징계·수당은 지원하지 않는다"고 말하지 않는다.
    # 화면이 제품보다 좁게 자기를 소개하면 사용자는 되는 질문을 시도하지 않는다.
    assert any("근거 조문을 찾아 드려요" in item for item in answer.limitations)


def test_a_question_the_corpus_cannot_reach_is_not_called_out_of_product_scope() -> None:
    """저장소에 조문이 없는 것과 지원하지 않는 것은 다른 일이다.

    옛 문구는 `가점` 질문에 "인사ON은 휴직·복직 질문만 지원해요"라고 답했다. 사실이
    아니다 — 여덟 개 인사 주제가 색인돼 있다. 화면이 제품을 잘못 소개하면 사용자는
    되는 질문까지 접는다.
    """
    answer = build_offline_review_service().handle(
        ReviewCommand(
            request_id="NO-CORPUS-REACH",
            question_text="인사의 가점을 받을 수 있는 법적인 근거들 모아봐",
        )
    )

    assert answer.status is AnswerStatus.INSUFFICIENT_EVIDENCE
    assert answer.review_reasons == ("no_supported_topic_signal",)
    assert "휴직·복직 질문만" not in answer.short_answer
    assert "찾지 못했어요" in answer.short_answer
    assert any("근거 조문을 찾아 드려요" in item for item in answer.limitations)
