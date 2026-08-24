from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape


def test_template_contains_required_review_fields_and_accessibility_basics() -> None:
    template = (
        Path(__file__).resolve().parents[2] / "src/insaon/web/templates/review.html"
    ).read_text(encoding="utf-8")
    for required in (
        "실제 개인정보를 입력하지 마십시오",
        "최종 인사처분 또는 법률해석을 대신하지",
        "confirmed_conditions",
        "assumed_conditions",
        "missing_conditions",
        "local_rule_status",
        "source_url",
        "data_as_of",
    ):
        assert required in template
    assert 'label for="question"' in template
    assert 'aria-live="polite"' in template
    assert "관련 조문" in template
    assert "확인한 조건" in template
    assert "유의사항" in template
    assert 'class="review-progress"' not in template
    assert 'id="session-label"' not in template
    assert "data-followup" in template
    assert 'class="mobile-case-nav"' not in template
    assert 'href="#evidence-rail"' in template
    assert 'id="character-count"' in template
    assert 'id="source-dialog"' in template
    assert 'id="source-dialog-body"' in template
    assert 'id="source-dialog-external"' in template
    assert 'id="copy-review"' in template
    assert 'id="copy-status"' in template
    assert 'href="#question"' in template
    assert "favicon.svg" in template
    assert "file-preview.js" in template
    assert 'class="file-preview"' in template
    definitions_start = template.index(
        '<div class="template-definitions" aria-hidden="true">'
    )
    definitions_end = template.index("</div>", definitions_start)
    assert definitions_start < template.index("{% set condition_labels") < definitions_end
    assert definitions_start < template.index("{% set reason_labels") < definitions_end
    assert 'href="insaon://launch"' in template
    assert "한 번 눌러 대시보드 열기" in template
    assert "휴직 유형" in template
    assert "지원 대상·업무 범위를 벗어난 질문" in template
    assert "신뢰도" not in template


def test_dashboard_assets_keep_behavior_out_of_inline_csp_boundary() -> None:
    root = Path(__file__).resolve().parents[2]
    template = (root / "src/insaon/web/templates/review.html").read_text(
        encoding="utf-8"
    )
    css = (root / "src/insaon/web/static/dashboard.css").read_text(encoding="utf-8")
    script = (root / "src/insaon/web/static/dashboard.js").read_text(encoding="utf-8")

    assert "<style" not in template
    assert "<script>" not in template
    assert ":focus-visible" in css
    assert "prefers-reduced-motion" in css
    assert "word-break: keep-all" in css
    assert "line-break: strict" in css
    assert "overflow-wrap: anywhere" not in css
    assert ".template-definitions" in css
    assert "display: none" in css
    assert ".conversation-panel" in css
    assert ".evidence-panel" in css
    assert "position: static" in css
    assert 'form.addEventListener("submit"' in script
    assert "/messages" in script
    assert "updateProgress" not in script
    assert 'closest("[data-followup]")' in script
    assert 'setAttribute("aria-invalid", "true")' in script
    assert 'fetch("/healthz"' not in script
    assert "copyReviewSummary" in script
    assert "conditionLabels" in script
    assert "reasonLabels" in script
    assert "regularAllowanceFollowupGroups" in script
    followup_contract = script[
        script.index("const regularAllowanceFollowupGroups") : script.index(
            "const reasonLabels"
        )
    ]
    assert 'fields: ["allowance_period", "reference_date"]' in followup_contract
    assert 'fields: ["reinstatement_date"]' in followup_contract
    assert 'fields: ["leave_periods"]' in followup_contract
    assert "prior_same_child_leave_months" not in followup_contract
    assert "salary_on_payment_date" not in followup_contract
    assert "disciplinary_action_in_period" not in followup_contract
    assert "지급률을 확인하려면 아래" in script
    assert "한 번에 답하기" in script
    assert "followup-chip-row" in script
    assert "containsUnansweredTemplate" in script
    assert "선택하지 않은 항목이 있어요" in script
    assert "같은 자녀 육아휴직 1년 이내" in script
    assert "지급기준일 재직·봉급" in script
    assert "가정한 조건이에요" in script
    assert "if (isRegularAllowanceReview(result))" in script
    assert "징계 등 지급 제외 없음" in script
    assert "조건이 다르면 실제 조건으로 다시 질문해 주세요" in script
    assert "answer-assumptions-inline" in script
    assert "assumedConditionLabels" in script
    assert "activeAssumedConditions" in script
    assert "regularAllowanceAssumptionGroups" not in script
    assert '|| "추가 가정 조건"' in script
    assert "answer-basis-summary" in script
    assert "answer-evidence-link" in script
    assert "openSourceDialog" in script
    assert 'app.classList.remove("is-empty")' in script


def test_initial_allowance_followup_keeps_assumptions_noninteractive_and_asks_core_only(
) -> None:
    root = Path(__file__).resolve().parents[2]
    environment = Environment(
        loader=FileSystemLoader(root / "src" / "insaon" / "web" / "templates"),
        autoescape=select_autoescape(),
    )
    html = environment.get_template("review.html").render(
        runtime_profile="local",
        initial_question="육아휴직 복직자의 정근수당을 확인해 주세요.",
        initial_response={
            "session_id": "REVIEW-CORE",
            "status": "REVIEW_REQUIRED",
            "short_answer": "핵심 날짜와 기간이 필요해요.",
            "confirmed_conditions": ["allowance_type", "leave_type"],
            "assumed_conditions": [
                "prior_same_child_leave_months",
                "salary_on_payment_date",
                "disciplinary_action_in_period",
                "other_nonservice_periods",
                "annual_salary_exclusion_applies",
                "unregistered_assumption_field",
            ],
            "missing_conditions": [
                "allowance_period",
                "reference_date",
                "reinstatement_date",
                "leave_periods",
            ],
            "claims": [],
            "citations": [],
            "local_rule_status": "unconfirmed",
            "data_as_of": "2026-08-04",
            "review_reasons": ["required_conditions_missing"],
            "limitations": [],
        },
    )

    conversation = html[html.index('<div class="conversation"') : html.index(
        '<form class="composer'
    )]
    assert conversation.index("answer-assumptions-inline") < conversation.index(
        "answer-prompt-copy"
    )
    assert conversation.count("answer-assumptions-inline") == 1
    assert "추가 가정 조건" in conversation
    assert "unregistered_assumption_field" not in conversation
    assert 'data-followup="allowance_period"' in conversation
    assert 'data-followup="reference_date"' not in conversation
    assert 'data-followup="reinstatement_date"' in conversation
    assert 'data-followup="leave_periods"' in conversation
    assert 'data-followup="prior_same_child_leave_months"' not in conversation
    assert 'data-followup="salary_on_payment_date"' not in conversation
    assert 'data-followup="disciplinary_action_in_period"' not in conversation
    assert "정근수당 산정 반기: ____년 상반기 / 하반기" in conversation
    assert "복직일: ____-__-__" in conversation
    assert "이번 육아휴직 기간: ____-__-__ ~ ____-__-__" in conversation
