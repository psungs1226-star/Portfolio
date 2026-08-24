"""Central application settings with safe, local-first defaults."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings loaded from INSAON_* environment variables."""

    model_config = SettingsConfigDict(
        env_prefix="INSAON_",
        env_file=".env",
        extra="ignore",
    )

    app_name: str = "인사ON"
    environment: Literal["local", "test", "production"] = "local"
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
    api_prefix: str = Field(default="/api/v1", pattern=r"^/[a-z0-9/_-]+$")

    runtime_profile: Literal["offline", "local"] = "offline"
    # 인사 전 영역의 근거 조문 검색을 기본으로 연다. 끄고 있던 이유는 넓은 lane이
    # 연결할 corpus가 없어서였고, 합성 corpus에 여덟 주제를 채운 뒤로는 그 이유가
    # 사라졌다. 이 lane은 근거를 찾아 사람에게 넘기는 evidence_only이고, 조건을
    # 되묻고 결론까지 가는 심층 검토는 휴직·복직만 유지한다.
    enable_extended_evidence_topics: bool = True

    generation_provider: Literal["ollama-local"] = "ollama-local"
    generation_model: str = "qwen3:4b-instruct"
    prompt_version: str = Field(
        default="answer-v7-derived-allowance", pattern=r"^[a-z0-9][a-z0-9._-]+$"
    )

    embedding_provider: Literal["ollama-local"] = "ollama-local"
    embedding_model: str = "bge-m3:latest"
    embedding_dimensions: int = Field(default=1024, ge=64, le=8192)
    embedding_version: str = Field(
        default="embedding-v2-local", pattern=r"^[a-z0-9][a-z0-9._-]+$"
    )

    reranker_provider: Literal["ollama-local"] = "ollama-local"
    reranker_model: str = "qwen3:4b-instruct"
    reranker_version: str = Field(
        default="reranker-v2-local", pattern=r"^[a-z0-9][a-z0-9._-]+$"
    )

    provider_timeout_seconds: float = Field(default=120.0, ge=1.0, le=300.0)
    provider_max_retries: int = Field(default=1, ge=0, le=3)
    local_model_keep_alive: str = "20m"
    local_model_base_url: str = "http://127.0.0.1:11434/api"
    provider_egress_allowlist: tuple[str, ...] = ("127.0.0.1",)

    legal_release_status: Literal["hold", "legal_validation_candidate"] = "hold"
    approved_index_manifest_path: str | None = None
    candidate_corpus_path: str | None = None
    cors_allowed_origins: tuple[str, ...] = ()
    trusted_hosts: tuple[str, ...] = (
        "localhost",
        "127.0.0.1",
        "test",
        "testserver",
    )
    request_max_bytes: int = Field(default=16_384, ge=256, le=65_536)
    rate_limit_per_minute: int = Field(default=30, ge=1, le=300)
    raw_request_logging: Literal[False] = False

    @model_validator(mode="after")
    def validate_production_boundary(self) -> Settings:
        if self.environment != "production":
            return self
        if self.runtime_profile != "local":
            raise ValueError("production pilot requires the loopback local runtime")
        if self.legal_release_status != "legal_validation_candidate":
            raise ValueError("production pilot requires a legal validation release")
        if not self.approved_index_manifest_path:
            raise ValueError("production pilot requires an approved index manifest path")
        if not self.cors_allowed_origins or any(
            origin == "*" or not origin.startswith("https://")
            for origin in self.cors_allowed_origins
        ):
            raise ValueError("production CORS origins must be exact HTTPS origins")
        if not self.trusted_hosts or any(
            host in {"*", "localhost", "127.0.0.1", "test", "testserver"}
            for host in self.trusted_hosts
        ):
            raise ValueError("production trusted hosts must be exact public hosts")
        if self.log_level == "DEBUG":
            raise ValueError("production debug logging is forbidden")
        return self

    def public_runtime_metadata(self) -> dict[str, Any]:
        """Return the reproducible local runtime contract."""

        return {
            "runtime_profile": self.runtime_profile,
            "generation": {
                "provider": self.generation_provider,
                "model": self.generation_model,
                "prompt_version": self.prompt_version,
            },
            "embedding": {
                "provider": self.embedding_provider,
                "model": self.embedding_model,
                "dimensions": self.embedding_dimensions,
                "version": self.embedding_version,
            },
            "reranker": {
                "provider": self.reranker_provider,
                "model": self.reranker_model,
                "version": self.reranker_version,
            },
            "network": {
                "base_url": self.local_model_base_url,
                "timeout_seconds": self.provider_timeout_seconds,
                "max_retries": self.provider_max_retries,
                "model_keep_alive": self.local_model_keep_alive,
                "egress_allowlist": self.provider_egress_allowlist,
                "api_key_required": False,
            },
            "http_boundary": {
                "cors_allowed_origins": self.cors_allowed_origins,
                "trusted_hosts": self.trusted_hosts,
                "request_max_bytes": self.request_max_bytes,
                "rate_limit_per_minute": self.rate_limit_per_minute,
                "raw_request_logging": self.raw_request_logging,
                "legal_release_status": self.legal_release_status,
                "approved_index_manifest_configured": (
                    self.approved_index_manifest_path is not None
                ),
                "candidate_corpus_configured": self.candidate_corpus_path is not None,
            },
            "product_scope": {
                "extended_evidence_topics_enabled": self.enable_extended_evidence_topics,
            },
        }
