from insaon.application.privacy import PrivacyGate


def test_provider_is_not_called_when_privacy_gate_blocks() -> None:
    calls = 0

    def provider() -> None:
        nonlocal calls
        calls += 1

    inspection = PrivacyGate().inspect("[합성 공격값] 000000-1000000")
    if inspection.allowed:
        provider()
    assert calls == 0
