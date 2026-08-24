from insaon.application.privacy import PrivacyGate


def test_privacy_gate_returns_categories_without_matched_text() -> None:
    result = PrivacyGate().inspect("[합성 공격값] 000000-1000000")
    assert not result.allowed
    assert result.categories == ("resident_registration_number",)
    assert "000000" not in repr(result)


def test_benign_public_regulation_question_is_allowed() -> None:
    assert PrivacyGate().inspect("질병휴직 공개 규정의 시행일은 언제인가요?").allowed
