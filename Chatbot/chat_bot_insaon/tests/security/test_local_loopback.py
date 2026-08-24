import pytest

from insaon.adapters.provider import HttpxOllamaTransport


def test_local_transport_rejects_non_loopback_endpoint() -> None:
    with pytest.raises(ValueError, match="loopback"):
        HttpxOllamaTransport(
            base_url="https://example.com/api",
            loopback_allowlist=("127.0.0.1",),
        )


def test_local_transport_rejects_broad_allowlist() -> None:
    with pytest.raises(ValueError, match="loopback"):
        HttpxOllamaTransport(
            base_url="http://127.0.0.1:11434/api",
            loopback_allowlist=("0.0.0.0",),
        )
