"""FastAPI application factory."""

import json
import time
from collections import defaultdict, deque
from collections.abc import Awaitable, Callable
from pathlib import Path
from typing import cast

import uvicorn
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import HTMLResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from insaon import __version__
from insaon.adapters.provider import HttpxOllamaTransport, OllamaClient
from insaon.api.dashboard import load_dashboard_context
from insaon.api.reviews import InMemoryReviewSessionStore, ReviewApiService
from insaon.api.schemas import (
    HealthResponse,
    ReadinessResponse,
    ReviewRequest,
    ReviewResponse,
)
from insaon.application.factory import build_review_service
from insaon.application.provider_runtime import ProviderRuntimeError
from insaon.settings import Settings

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = PACKAGE_ROOT.parents[1]
TEMPLATES = Jinja2Templates(directory=PACKAGE_ROOT / "web/templates")

_ECHOING_ERROR_KEYS = frozenset({"input", "url"})


def redacted_errors(exc: RequestValidationError) -> list[dict[str, object]]:
    """Keep the diagnosis (which field, which rule) and drop the submitted value."""
    redacted: list[dict[str, object]] = []
    for error in exc.errors():
        entry = {
            key: value for key, value in error.items() if key not in _ECHOING_ERROR_KEYS
        }
        context = entry.get("ctx")
        if isinstance(context, dict):
            # ctx carries rule bounds such as max_length, but a regex error puts the
            # rejected string here too.
            entry["ctx"] = {
                key: value
                for key, value in context.items()
                if isinstance(value, int | float | bool)
            }
        redacted.append(entry)
    return redacted


def create_app(settings: Settings | None = None) -> FastAPI:
    """Create an app with the explicitly selected offline or loopback-local runtime."""
    resolved_settings = settings or Settings()
    application = FastAPI(
        title=resolved_settings.app_name,
        version=__version__,
        docs_url="/docs" if resolved_settings.environment != "production" else None,
        redoc_url=None,
    )
    application.state.settings = resolved_settings
    service = build_review_service(resolved_settings)
    if (
        resolved_settings.runtime_profile == "offline"
        and resolved_settings.environment != "test"
    ):
        from insaon.application.factory import _try_ollama_model

        ollama = _try_ollama_model(resolved_settings)
        if ollama is not None:
            from insaon.application.factory import build_offline_review_service

            service = build_offline_review_service(
                model=ollama,
                enable_extended_topics=resolved_settings.enable_extended_evidence_topics,
                wide_evidence="synthetic",
            )
    application.state.review_api = ReviewApiService(
        service, InMemoryReviewSessionStore()
    )

    @application.exception_handler(RequestValidationError)
    async def validation_error(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        """Report which field failed without repeating what the caller sent.

        Request validation runs before the privacy gate, and the default handler puts
        the offending value in ``input``. One oversized question was enough to reflect
        a 주민등록번호 straight back in the response body.
        """
        return JSONResponse(status_code=422, content={"detail": redacted_errors(exc)})
    application.mount(
        "/static",
        StaticFiles(directory=PACKAGE_ROOT / "web/static"),
        name="static",
    )
    request_times: dict[str, deque[float]] = defaultdict(deque)
    if resolved_settings.cors_allowed_origins:
        application.add_middleware(
            CORSMiddleware,
            allow_origins=list(resolved_settings.cors_allowed_origins),
            allow_methods=["GET", "POST"],
            allow_headers=["Content-Type", "Idempotency-Key"],
            allow_credentials=False,
        )
    application.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=list(resolved_settings.trusted_hosts),
    )

    @application.middleware("http")
    async def security_boundary(
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        content_length = request.headers.get("content-length")
        if content_length is not None:
            try:
                if int(content_length) > resolved_settings.request_max_bytes:
                    return JSONResponse(
                        status_code=413,
                        content={"detail": "request_too_large"},
                    )
            except ValueError:
                return JSONResponse(
                    status_code=400,
                    content={"detail": "invalid_content_length"},
                )
        if request.method == "POST" and request.url.path.startswith(
            resolved_settings.api_prefix
        ):
            client_id = request.client.host if request.client is not None else "unknown"
            now = time.monotonic()
            window = request_times[client_id]
            while window and now - window[0] >= 60:
                window.popleft()
            if len(window) >= resolved_settings.rate_limit_per_minute:
                return JSONResponse(
                    status_code=429,
                    content={"detail": "rate_limit_exceeded"},
                    headers={"Retry-After": "60"},
                )
            window.append(now)
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Cache-Control"] = "no-store"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; style-src 'self'; script-src 'self'; "
            "img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; "
            "base-uri 'none'; form-action 'self'"
        )
        if resolved_settings.environment == "production":
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains"
            )
        return response

    @application.get(
        "/healthz",
        response_model=HealthResponse,
        tags=["operations"],
    )
    def health(request: Request) -> HealthResponse:
        request_settings = cast(Settings, request.app.state.settings)
        return HealthResponse(
            service=request_settings.app_name,
            environment=request_settings.environment,
            runtime_profile=request_settings.runtime_profile,
        )

    @application.get(
        "/readyz",
        response_model=ReadinessResponse,
        tags=["operations"],
    )
    def readiness(request: Request) -> ReadinessResponse:
        request_settings = cast(Settings, request.app.state.settings)
        checks = {
            "legal_release": (
                request_settings.legal_release_status
                == "legal_validation_candidate"
            ),
            "approved_index": False,
            "local_model": False,
        }
        index_path_value = request_settings.approved_index_manifest_path
        if index_path_value:
            try:
                index_manifest = json.loads(
                    Path(index_path_value).read_text(encoding="utf-8")
                )
                checks["approved_index"] = (
                    index_manifest.get("status") == "approved_legal_index"
                )
            except (FileNotFoundError, OSError, json.JSONDecodeError):
                checks["approved_index"] = False
        if request_settings.runtime_profile == "local":
            try:
                client = OllamaClient(
                    HttpxOllamaTransport(
                        base_url=request_settings.local_model_base_url,
                        loopback_allowlist=request_settings.provider_egress_allowlist,
                    ),
                    timeout_seconds=min(
                        request_settings.provider_timeout_seconds, 5.0
                    ),
                    max_retries=0,
                )
                tags = client.get("/tags", operation="readiness")
                checks["local_model"] = isinstance(tags.get("models"), list)
            except ProviderRuntimeError:
                checks["local_model"] = False
        return ReadinessResponse(
            status="ready" if all(checks.values()) else "not_ready",
            checks=checks,
        )

    @application.post(
        f"{resolved_settings.api_prefix}/reviews",
        response_model=ReviewResponse,
        tags=["reviews"],
    )
    def create_review(
        payload: ReviewRequest,
        request: Request,
        idempotency_key: str = Header(alias="Idempotency-Key", min_length=8, max_length=128),
    ) -> ReviewResponse:
        service = cast(ReviewApiService, request.app.state.review_api)
        session_id, answer = service.create(
            question_text=payload.question_text,
            idempotency_key=idempotency_key,
            local_rule_checked=payload.local_rule_checked,
        )
        return ReviewResponse.from_domain(session_id, answer)

    @application.post(
        f"{resolved_settings.api_prefix}/reviews/{{session_id}}/messages",
        response_model=ReviewResponse,
        tags=["reviews"],
    )
    def add_review_message(
        session_id: str,
        payload: ReviewRequest,
        request: Request,
        idempotency_key: str = Header(alias="Idempotency-Key", min_length=8, max_length=128),
    ) -> ReviewResponse:
        service = cast(ReviewApiService, request.app.state.review_api)
        try:
            resolved_session, answer = service.message(
                session_id,
                question_text=payload.question_text,
                idempotency_key=idempotency_key,
                local_rule_checked=payload.local_rule_checked,
            )
        except KeyError as exc:
            raise HTTPException(status_code=404, detail="review_session_not_found") from exc
        return ReviewResponse.from_domain(resolved_session, answer)

    @application.get("/", response_class=HTMLResponse, include_in_schema=False)
    def review_home(request: Request) -> HTMLResponse:
        return TEMPLATES.TemplateResponse(
            request=request,
            name="review.html",
            context={
                "dashboard": load_dashboard_context(PROJECT_ROOT),
                "initial_response": None,
                "initial_question": None,
                "case_id": None,
                "runtime_profile": resolved_settings.runtime_profile,
                "docs_enabled": resolved_settings.environment != "production",
            },
        )

    @application.get("/demo/{case_id}", response_class=HTMLResponse, include_in_schema=False)
    def demo(case_id: str, request: Request) -> HTMLResponse:
        questions = {
            "CASE-A": ("휴직을 연장하거나 다른 유형으로 신청할 수 있나요?", False),
            "CASE-B": (
                "2024년 1월 1일 당시 질병휴직과 복직에 적용된 공개 규정을 찾아주세요.",
                True,
            ),
            "CASE-C": (
                "국가공무원의 기관 내부 규정으로 최종 처분을 확정해주세요.",
                False,
            ),
        }
        if case_id not in questions:
            raise HTTPException(status_code=404, detail="demo_case_not_found")
        question, checked = questions[case_id]
        service = cast(ReviewApiService, request.app.state.review_api)
        session_id, answer = service.create(
            question_text=question,
            idempotency_key=f"DEMO-{case_id}-STATIC",
            local_rule_checked=checked,
        )
        initial_response = ReviewResponse.from_domain(session_id, answer).model_dump(
            mode="json"
        )
        return TEMPLATES.TemplateResponse(
            request=request,
            name="review.html",
            context={
                "dashboard": load_dashboard_context(PROJECT_ROOT),
                "initial_response": initial_response,
                "initial_question": question,
                "case_id": case_id,
                "runtime_profile": resolved_settings.runtime_profile,
                "docs_enabled": resolved_settings.environment != "production",
            },
        )

    return application


app = create_app()


def run() -> None:
    """Run the local development server."""
    uvicorn.run("insaon.api.main:app", host="127.0.0.1", port=8000, reload=False)
