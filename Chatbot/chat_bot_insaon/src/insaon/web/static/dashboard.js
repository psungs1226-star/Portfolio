(() => {
  "use strict";

  if (globalThis.location.protocol === "file:") return;

  const app = document.getElementById("dashboard-app");
  const form = document.getElementById("review-form");
  const question = document.getElementById("question");
  const conversation = document.getElementById("conversation");
  const submitButton = form.querySelector(".send-button");
  const formError = document.getElementById("form-error");
  const localRuleChecked = document.getElementById("local-rule-checked");

  const statusPresentation = {
    ANSWERABLE: {
      label: "근거를 확인했어요",
      indicator: "answerable",
      badge: "status-answerable",
    },
    REVIEW_REQUIRED: {
      label: "원문 확인이 필요해요",
      indicator: "review-required",
      badge: "status-review_required",
    },
    INSUFFICIENT_EVIDENCE: {
      label: "답변할 근거가 부족해요",
      indicator: "insufficient-evidence",
      badge: "status-insufficient_evidence",
    },
  };

  const conditionLabels = {
    employee_system: "공무원 체계",
    employee_category: "직군",
    topic: "검토 업무",
    leave_type: "휴직 유형",
    allowance_type: "수당 유형",
    allowance_period: "정근수당 산정 반기",
    reference_date: "질문 기준일",
    reinstatement_date: "복직일",
    leave_periods: "이번 휴직 기간",
    prior_same_child_leave_months: "같은 자녀의 기존 육아휴직 개월",
    salary_on_payment_date: "지급일 재직·봉급 지급 여부",
    disciplinary_action_in_period: "산정기간 중 징계 여부",
    other_nonservice_periods: "직위해제 등 제외기간",
    annual_salary_exclusion_applies: "정근수당 별도 미지급 연봉제 여부",
    child_order: "자녀 순서",
    expanded_parental_leave_eligibility: "육아휴직 산입 확대 요건",
    child_birth_date: "자녀 출생일",
    same_child: "동일 자녀 여부",
    medical_leave_basis: "질병휴직 사유 구분",
    care_recipient_relation: "돌봄 대상과의 관계",
    application_purpose: "자기개발휴직 신청 목적",
    previous_leave_periods: "기존 휴직 기간",
    spouse_usage: "배우자 사용 여부",
    local_rule_checked: "기관 규정 확인",
  };

  const visibleConditionNames = new Set([
    "leave_type",
    "allowance_period",
    "reference_date",
    "reinstatement_date",
    "leave_periods",
    "child_birth_date",
    "previous_leave_periods",
    "medical_leave_basis",
    "care_recipient_relation",
    "application_purpose",
  ]);

  const regularAllowanceFollowupGroups = [
    {
      key: "allowance_period",
      fields: ["allowance_period", "reference_date"],
      title: "산정 반기",
    },
    {
      key: "reinstatement_date",
      fields: ["reinstatement_date"],
      title: "복직일",
    },
    {
      key: "leave_periods",
      fields: ["leave_periods"],
      title: "이번 육아휴직 기간",
    },
  ];

  const reasonLabels = {
    out_of_scope: "현재 지원 범위를 벗어난 질문",
    unsupported_subject_or_topic: "지원 대상·업무 범위를 벗어난 질문",
    no_supported_topic_signal: "저장소에서 연결할 조문을 찾지 못했어요",
    evidence_only_human_review: "공개 근거를 한 번 더 확인해 주세요",
    candidate_corpus_unapproved: "공식 원문을 함께 확인해 주세요",
    wide_corpus_unavailable: "공식 자료를 불러오지 못했어요",
    derived_pay_corpus_unavailable: "정근수당 자료를 불러오지 못했어요",
    required_regular_allowance_evidence_missing: "필요한 근거를 모두 찾지 못했어요",
    required_parental_evidence_missing: "육아휴직의 사유·기간·복직 근거를 모두 찾지 못했어요",
    required_medical_evidence_missing: "질병휴직의 사유·기간·복직 근거를 모두 찾지 못했어요",
    ambiguous_leave_type: "휴직 유형을 구분할 추가 정보 필요",
    required_conditions_missing: "필수 조건 확인 필요",
    local_rule_unconfirmed: "기관 규정 확인 필요",
    privacy_input_blocked: "개인정보 의심 입력 차단",
    reference_date_required: "질문 기준일 확인 필요",
    decisive_exception_missing: "결론을 바꿀 수 있는 예외 근거 부족",
    provider_unavailable: "답변 모델을 불러오지 못했어요",
    model_recommends_human_review: "추가 확인이 필요해요",
    model_recommends_insufficient_evidence: "답변할 근거가 부족해요",
    invalid_effective_version: "기준일에 유효한 규정 버전 확인 필요",
    source_version_gap: "기준일에 버전이 없는 법령이 있어요",
    temporal_fallback: "시점 검증 없이 참고용 조문을 검색했어요",
    model_draft_discarded: "생성한 설명 문장을 폐기하고 조문만 제공해요",
    claim_quantity_unsupported: "인용문에 없는 수치가 있어 문장을 폐기했어요",
    draft_empty: "생성한 설명 문장이 없어 조문만 제공해요",
    insufficient_retrieval_context: "질문에 연결할 근거를 찾지 못했어요",
    invalid_regular_allowance_conditions: "정근수당 조건이 서로 맞지 않아요",
    citation_provision_not_found: "인용한 조문을 저장소에서 찾지 못했어요",
    citation_source_mismatch: "인용한 조문의 출처가 맞지 않아요",
    citation_not_effective: "인용한 조문이 질문 기준일에 유효하지 않아요",
    unsupported_claim: "인용으로 뒷받침되지 않는 문장이 있어요",
    citation_id_not_found: "검증 가능한 인용 근거 부족",
    local_rule_conflict: "기관 규정 충돌 가능성 확인 필요",
    supplementary_interpretation_required: "부칙 적용 여부의 사람 검토 필요",
    resident_registration_number: "주민등록번호 형식 감지",
    phone_number: "전화번호 형식 감지",
    employee_number: "사번 형식 감지",
    email: "이메일 형식 감지",
    normal_case_assumptions_applied: "위 가정을 기준으로 확인했어요",
  };

  const assumedConditionLabels = {
    prior_same_child_leave_months: "같은 자녀 육아휴직 1년 이내",
    salary_on_payment_date: "지급기준일 재직·봉급",
    disciplinary_action_in_period: "징계 등 지급 제외 없음",
    other_nonservice_periods: "징계 등 지급 제외 없음",
    annual_salary_exclusion_applies: "징계 등 지급 제외 없음",
  };

  function conditionLabel(value) {
    return conditionLabels[value] || "추가 확인 항목";
  }

  function assumedConditionLabel(value) {
    return assumedConditionLabels[value] || conditionLabels[value] || "추가 가정 조건";
  }

  function reasonLabel(value) {
    return reasonLabels[value] || value;
  }

  function isRegularAllowanceReview(result) {
    return result.confirmed_conditions.includes("allowance_type");
  }

  function activeRegularAllowanceGroups(result) {
    const missing = new Set(result.missing_conditions);
    return regularAllowanceFollowupGroups.filter((group) =>
      group.fields.some((field) => missing.has(field)),
    );
  }

  function activeAssumedConditions(result) {
    const labels = new Map();
    (result.assumed_conditions || []).forEach((field) => {
      const label = assumedConditionLabel(field);
      if (!labels.has(label)) labels.set(label, field);
    });
    return [...labels].map(([label, field]) => ({ field, label }));
  }

  function regularAllowanceAnswerTemplate(result) {
    const missing = new Set(result.missing_conditions);
    const lines = [];
    if (missing.has("allowance_period") || missing.has("reference_date")) {
      lines.push("정근수당 산정 반기: ____년 상반기 / 하반기");
    }
    if (missing.has("reinstatement_date")) {
      lines.push("복직일: ____-__-__");
    }
    if (missing.has("leave_periods")) {
      lines.push("이번 육아휴직 기간: ____-__-__ ~ ____-__-__");
    }
    return lines.join("\n");
  }

  function containsUnansweredTemplate(value) {
    return /__|예\s*\/\s*아니오|있음\s*\/\s*없음/.test(value);
  }

  function hasSubstantiveReview(result) {
    return (
      result.status === "REVIEW_REQUIRED" &&
      result.missing_conditions.length === 0 &&
      result.claims.length > 0 &&
      result.citations.length > 0
    );
  }

  function presentationFor(result) {
    const base = statusPresentation[result.status] || statusPresentation.REVIEW_REQUIRED;
    if (result.status === "REVIEW_REQUIRED" && result.missing_conditions.length > 0) {
      return { ...base, label: "조금만 더 알려주세요" };
    }
    if (
      (result.assumed_conditions || []).length > 0 &&
      result.claims.length > 0 &&
      result.citations.length > 0
    ) {
      return { ...base, label: "조건부 확인" };
    }
    if (hasSubstantiveReview(result)) {
      return { ...base, label: "원문 확인이 필요해요" };
    }
    if (
      result.status === "REVIEW_REQUIRED" &&
      result.review_reasons.includes("candidate_corpus_unapproved")
    ) {
      return { ...base, label: "원문 확인이 필요해요" };
    }
    if (
      result.status === "REVIEW_REQUIRED" &&
      result.review_reasons.includes("evidence_only_human_review")
    ) {
      return { ...base, label: "추가 확인이 필요해요" };
    }
    if (
      result.status === "INSUFFICIENT_EVIDENCE" &&
      result.review_reasons.includes("unsupported_subject_or_topic")
    ) {
      return { ...base, label: "지원 범위를 벗어난 질문이에요" };
    }
    return base;
  }

  function createElement(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function idempotencyKey() {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
      return globalThis.crypto.randomUUID();
    }
    return `REVIEW-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function setWorkspaceState(statusOrResult) {
    const presentation = typeof statusOrResult === "string"
      ? statusPresentation[statusOrResult]
      : presentationFor(statusOrResult);
    const indicator = document.querySelector(".state-indicator");
    const label = document.getElementById("workspace-state-label");
    indicator.className = `state-indicator ${presentation ? presentation.indicator : "neutral"}`;
    label.textContent = presentation ? presentation.label : "검토 대기";
  }

  function scrollConversation() {
    conversation.scrollTop = conversation.scrollHeight;
  }

  function removeEmptyState() {
    document.getElementById("empty-state")?.remove();
    document.getElementById("quick-prompts")?.remove();
  }

  function addUserMessage(text) {
    const article = createElement("article", "message user-message");
    const body = createElement("div", "user-message-body");
    const meta = createElement("div", "message-meta");
    meta.append(createElement("span", "", "나"), createElement("span", "", "방금 전"));
    body.append(meta, createElement("p", "", text));
    article.append(body);
    conversation.append(article);
  }

  function addLoadingMessage() {
    const article = createElement("article", "message assistant-message loading-message");
    article.id = "loading-message";
    const avatar = createElement("div", "assistant-avatar", "인");
    avatar.setAttribute("aria-hidden", "true");
    const content = createElement("div", "message-content");
    const meta = createElement("div", "message-meta");
    meta.append(
      createElement("span", "", "인사ON"),
      createElement("span", "", "공개 근거 확인 중"),
    );
    const dots = createElement("div", "typing-dots");
    dots.setAttribute("aria-label", "답변 생성 중");
    dots.append(createElement("span"), createElement("span"), createElement("span"));
    content.append(meta, dots);
    article.append(avatar, content);
    conversation.append(article);
    conversation.setAttribute("aria-busy", "true");
    scrollConversation();
  }

  function addBasisSummary(content, result) {
    const basis = result.claims.find((claim) => claim.kind === "basis");
    if (!basis) return;
    const summary = createElement("div", "answer-basis-summary");
    summary.append(
      createElement("strong", "", "근거 요약"),
      createElement("p", "", basis.text),
    );
    content.append(summary);
  }

  function addAssumptionSummary(content, result) {
    const assumptions = activeAssumedConditions(result);
    if (!assumptions.length) return;
    const summary = createElement("p", "answer-assumptions-inline");
    summary.setAttribute("role", "note");
    summary.append(createElement("strong", "", "가정"));
    summary.append(
      createElement(
        "span",
        "",
        `${assumptions.map((item) => item.label).join(" · ")}. 이 조건을 기준으로 확인했어요. `
          + "조건이 다르면 실제 조건으로 다시 질문해 주세요.",
      ),
    );
    content.append(summary);
  }

  function addAssistantMessage(result) {
    document.getElementById("loading-message")?.remove();
    const presentation = presentationFor(result);
    const article = createElement("article", "message assistant-message");
    const avatar = createElement("div", "assistant-avatar", "인");
    avatar.setAttribute("aria-hidden", "true");
    const content = createElement("div", "message-content");
    const meta = createElement("div", "message-meta");
    meta.append(
      createElement("span", "", "인사ON"),
      createElement("span", "", "방금 전"),
    );
    const status = createElement("div", `answer-status ${presentation.badge}`, presentation.label);
    content.append(meta, status);

    if (result.missing_conditions.length) {
      const followup = createElement("div", "followup-card compact-followup");
      followup.setAttribute("aria-label", "추가로 필요한 조건");
      const actions = createElement("div", "followup-actions");
      actions.classList.add("followup-chip-row");
      if (isRegularAllowanceReview(result)) {
        const groups = activeRegularAllowanceGroups(result);
        addAssumptionSummary(content, result);
        content.append(
          createElement(
            "p",
            "answer-copy answer-prompt-copy",
            groups.length
              ? `지급률을 확인하려면 아래 ${groups.length}가지만 더 알려주세요.`
              : result.short_answer,
          ),
        );
        groups.forEach((group) => {
          const chip = createElement("button", "followup-chip", group.title);
          chip.type = "button";
          chip.dataset.followup = group.key;
          actions.append(chip);
        });
        if (groups.length > 1) {
          const example = createElement(
            "button",
            "followup-chip followup-example",
            "한 번에 답하기",
          );
          example.type = "button";
          example.dataset.followupExample = regularAllowanceAnswerTemplate(result);
          actions.append(example);
        }
        const groupedFields = new Set(groups.flatMap((group) => group.fields));
        result.missing_conditions
          .filter((item) => !groupedFields.has(item))
          .forEach((item) => {
            const button = createElement("button", "followup-chip", conditionLabel(item));
            button.type = "button";
            button.dataset.followup = item;
            actions.append(button);
          });
      } else {
        content.append(createElement("p", "answer-copy", result.short_answer));
        result.missing_conditions.forEach((item) => {
          const button = createElement("button", "followup-chip", conditionLabel(item));
          button.type = "button";
          button.dataset.followup = item;
          actions.append(button);
        });
      }
      followup.append(actions);
      content.append(followup);
    } else {
      content.append(createElement("p", "answer-copy", result.short_answer));
      addAssumptionSummary(content, result);
      addBasisSummary(content, result);
    }
    if (result.citations.length) {
      const link = createElement(
        "a",
        "answer-evidence-link",
        `관련 근거 ${result.citations.length}건 보기 →`,
      );
      link.href = "#evidence-rail";
      content.append(link);
    }
    article.append(avatar, content);
    conversation.append(article);
    conversation.setAttribute("aria-busy", "false");
    scrollConversation();
  }

  function renderConditions(result) {
    const list = document.getElementById("condition-list");
    const confirmedItems = result.confirmed_conditions.filter(
      (item) => visibleConditionNames.has(item),
    );
    const count = confirmedItems.length;
    document.getElementById("condition-count").textContent = String(count);
    list.replaceChildren();

    const addCondition = (item, state) => {
      const row = createElement("div", `condition-item ${state}`);
      const icon = createElement(
        "span",
        "",
        state === "confirmed" ? "✓" : state === "assumed" ? "~" : "?",
      );
      icon.setAttribute("aria-hidden", "true");
      const text = createElement("div");
      const label = typeof item === "string" ? conditionLabel(item) : item.label;
      text.append(
        createElement("strong", "", label),
        createElement(
          "small",
          "",
          state === "confirmed"
            ? "질문에서 확인했어요"
            : state === "assumed"
              ? "가정한 조건이에요"
              : "추가로 알려주세요",
        ),
      );
      row.append(icon, text);
      list.append(row);
    };

    confirmedItems.forEach((item) => addCondition(item, "confirmed"));
    if (!count) {
      const empty = createElement("div", "rail-empty");
      const icon = createElement("span", "", "○");
      icon.setAttribute("aria-hidden", "true");
      empty.append(icon, createElement("p", "", "질문에서 확인할 조건을 찾지 못했어요."));
      list.append(empty);
    }
  }

  function citationExplanation(citation, result) {
    const source = citationSourceName(citation);
    const article = citation.article_path.replace(/^합성\s+/, "");
    if (isRegularAllowanceReview(result)) {
      if (
        source === "지방공무원 수당 등에 관한 규정" &&
        (article.includes("제6조 제1항 제1호") || article.includes("제6조 제1항 제2호"))
      ) {
        return `「지방공무원 수당 등에 관한 규정」 ${article}에 따라 지급기준일 재직 여부와 봉급 지급 여부를 확인합니다.`;
      }
      if (source === "지방공무원 수당 등에 관한 규정" && article.includes("제6조 제2항")) {
        return "「지방공무원 수당 등에 관한 규정」 제6조 제2항에 따라 산입 대상 육아휴직 기간은 실제 근무기간으로 봅니다.";
      }
      if (source === "지방공무원 보수규정" && article.includes("제14조 제3호의2")) {
        return "「지방공무원 보수규정」 제14조 제3호의2에 따라 같은 자녀의 육아휴직은 기본 1년까지 실제 근무기간에 산입합니다.";
      }
      if (source === "지방공무원 수당 등에 관한 규정" && article.includes("제19조 제10항")) {
        return "「지방공무원 수당 등에 관한 규정」 제19조 제10항에 따라 정근수당 별도 미지급 연봉제 대상인지 확인합니다.";
      }
    }
    const linkedClaim = result.claims.find((claim) =>
      claim.citation_ids.includes(citation.citation_id) && claim.kind === "basis",
    );
    if (linkedClaim) return `「${source}」 ${article}에 따라 검토합니다. ${linkedClaim.text}`;
    return `「${source}」 ${article}에서 답변에 적용된 기준을 확인해 주세요.`;
  }

  function citationSourceName(citation) {
    return citation.source_name === "합성 법령 시나리오"
      ? "예시 규정 자료"
      : citation.source_name;
  }

  function attachSourceData(button, citation) {
    button.dataset.sourceName = citationSourceName(citation);
    button.dataset.sourceArticle = citation.article_path.replace(/^합성\s+/, "");
    button.dataset.sourceEffective = citation.effective_to
      ? `${citation.effective_from} ~ ${citation.effective_to} 전`
      : `${citation.effective_from}부터 시행`;
    button.dataset.sourceExcerpt = citation.excerpt || "원문 발췌를 제공하지 않습니다.";
    button.dataset.sourceUrl = citation.source_url;
  }

  function renderCitations(result) {
    const list = document.getElementById("citation-list");
    document.getElementById("citation-count").textContent = String(result.citations.length);
    list.replaceChildren();

    result.citations.forEach((citation) => {
      const card = createElement("article", "citation-card");
      const top = createElement("div", "citation-topline");
      top.append(
        createElement("span", "", citationSourceName(citation)),
        createElement("span", "", `${citation.effective_from} 기준`),
      );
      const sourceAction = createElement("button", "source-preview-button", "발췌 보기 →");
      sourceAction.type = "button";
      sourceAction.setAttribute("aria-haspopup", "dialog");
      attachSourceData(sourceAction, citation);
      card.append(
        top,
        createElement("h3", "", citation.article_path.replace(/^합성\s+/, "")),
        createElement("p", "citation-explanation", citationExplanation(citation, result)),
        sourceAction,
      );
      list.append(card);
    });

    if (!result.citations.length) {
      const empty = createElement("div", "rail-empty");
      const icon = createElement("span", "", "⌕");
      icon.setAttribute("aria-hidden", "true");
      empty.append(icon, createElement("p", "", "답변에 연결할 근거를 찾지 못했어요."));
      list.append(empty);
    }
  }

  function renderReviewBoundary(result) {
    document.getElementById("local-rule-status").textContent =
      result.local_rule_status === "checked" ? "확인했어요" : "별도 확인이 필요해요";
    document.getElementById("data-as-of").textContent = result.data_as_of || "—";
    const reasons = document.getElementById("review-reasons");
    reasons.replaceChildren();
    if (result.review_reasons.length) {
      const list = createElement("ul");
      result.review_reasons.forEach((item) =>
        list.append(createElement("li", "", reasonLabel(item))),
      );
      reasons.append(list);
    } else {
      reasons.append(createElement("p", "", "추가 유의사항이 없어요."));
    }
    const limitations = document.getElementById("review-limitations");
    limitations.replaceChildren();
    if (result.limitations.length) {
      const list = createElement("ul");
      result.limitations.forEach((item) => list.append(createElement("li", "", item)));
      limitations.append(list);
    } else {
      limitations.append(
        createElement("p", "", "결과는 최종 인사처분 또는 법률해석을 대신하지 않습니다. 질문 기준일의 원문과 기관 규정을 함께 확인해 주세요."),
      );
    }
  }

  function updateReviewPanel(result) {
    app.classList.remove("is-empty");
    app.classList.add("has-result");
    renderConditions(result);
    renderCitations(result);
    renderReviewBoundary(result);
    setWorkspaceState(result);
  }

  function reviewSummaryText() {
    const answer = [...document.querySelectorAll(".answer-copy")].at(-1)?.textContent.trim();
    if (!answer) return "";
    const conditions = [...document.querySelectorAll(".condition-item strong")]
      .map((item) => `- ${item.textContent.trim()}`)
      .join("\n");
    const citations = [...document.querySelectorAll(".citation-card")]
      .map((item) => {
        const source = item.querySelector("h3")?.textContent.trim() || "";
        const article = item.querySelector("p")?.textContent.trim() || "";
        return `- ${source} ${article}`.trim();
      })
      .join("\n");
    const limitations = [...document.querySelectorAll("#review-limitations li")]
      .map((item) => `- ${item.textContent.trim()}`)
      .join("\n");
    return [
      "[인사ON 답변]",
      `상태: ${document.getElementById("workspace-state-label").textContent.trim()}`,
      `요약: ${answer}`,
      `자료 확인일: ${document.getElementById("data-as-of").textContent.trim()}`,
      conditions ? `확인한 조건:\n${conditions}` : "확인한 조건: 없음",
      citations ? `근거:\n${citations}` : "근거: 없음",
      limitations ? `유의사항:\n${limitations}` : "유의사항: 질문 기준일의 원문과 기관 규정을 확인해 주세요.",
      "주의: 최종 인사처분 또는 법률해석을 대신하지 않습니다.",
    ].join("\n");
  }

  async function copyReviewSummary() {
    const status = document.getElementById("copy-status");
    const summary = reviewSummaryText();
    if (!summary) {
      status.textContent = "복사할 검토 결과가 없습니다.";
      return;
    }
    try {
      await navigator.clipboard.writeText(summary);
      status.textContent = "복사했습니다.";
    } catch {
      status.textContent = "브라우저에서 복사를 허용해 주세요.";
    }
  }

  function openSourceDialog(trigger) {
    const dialog = document.getElementById("source-dialog");
    document.getElementById("source-dialog-title").textContent =
      `${trigger.dataset.sourceName} ${trigger.dataset.sourceArticle}`;
    document.getElementById("source-dialog-meta").textContent =
      `시행 기준 · ${trigger.dataset.sourceEffective}`;
    document.getElementById("source-dialog-body").textContent = trigger.dataset.sourceExcerpt;
    const external = document.getElementById("source-dialog-external");
    const isSynthetic = trigger.dataset.sourceUrl.includes("example.invalid");
    external.hidden = isSynthetic;
    if (!isSynthetic) external.href = trigger.dataset.sourceUrl;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function closeSourceDialog() {
    const dialog = document.getElementById("source-dialog");
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }

  function showError(message) {
    document.getElementById("loading-message")?.remove();
    conversation.setAttribute("aria-busy", "false");
    formError.textContent = message;
    question.setAttribute("aria-invalid", "true");
    setWorkspaceState();
  }

  async function submitQuestion() {
    const text = question.value.trim();
    if (!text) {
      formError.textContent = "검토할 질문을 입력해 주세요.";
      question.focus();
      return;
    }
    if (containsUnansweredTemplate(text)) {
      formError.textContent = "선택하지 않은 항목이 있어요. 빈칸과 선택지를 모두 바꿔주세요.";
      question.setAttribute("aria-invalid", "true");
      question.focus();
      return;
    }

    formError.textContent = "";
    question.setAttribute("aria-invalid", "false");
    removeEmptyState();
    addUserMessage(text);
    addLoadingMessage();
    submitButton.disabled = true;
    question.disabled = true;
    const sessionId = app.dataset.sessionId;
    const endpoint = sessionId
      ? `/api/v1/reviews/${encodeURIComponent(sessionId)}/messages`
      : "/api/v1/reviews";

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey(),
        },
        body: JSON.stringify({
          question_text: text,
          local_rule_checked: localRuleChecked.checked,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        const detail = typeof result.detail === "string" ? result.detail : "request_failed";
        throw new Error(detail);
      }
      app.dataset.sessionId = result.session_id;
      addAssistantMessage(result);
      updateReviewPanel(result);
      question.value = "";
      question.style.height = "";
      document.getElementById("character-count").textContent = "0 / 2000";
    } catch (error) {
      const known = {
        request_too_large: "질문이 너무 깁니다. 핵심 조건만 남겨 다시 입력해 주세요.",
        rate_limit_exceeded: "요청이 많습니다. 잠시 후 다시 시도해 주세요.",
        review_session_not_found: "검토 세션이 만료되었습니다. 새 검토를 시작해 주세요.",
      };
      showError(known[error.message] || "검토 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      submitButton.disabled = false;
      question.disabled = false;
      question.focus();
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    submitQuestion();
  });

  question.addEventListener("input", () => {
    question.style.height = "auto";
    question.style.height = `${Math.min(question.scrollHeight, 150)}px`;
    formError.textContent = "";
    question.setAttribute("aria-invalid", "false");
    const characterCount = document.getElementById("character-count");
    characterCount.textContent = `${question.value.length} / 2000`;
    characterCount.classList.toggle("is-near-limit", question.value.length >= 1600);
  });

  question.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  document.querySelectorAll("[data-prompt]").forEach((button) => {
    button.addEventListener("click", () => {
      question.value = button.dataset.prompt;
      form.requestSubmit();
    });
  });

  conversation.addEventListener("click", (event) => {
    const example = event.target.closest("[data-followup-example]");
    if (example) {
      question.value = example.dataset.followupExample;
      question.dispatchEvent(new Event("input"));
      question.focus();
      return;
    }
    const button = event.target.closest("[data-followup]");
    if (!button) return;
    question.value = `${conditionLabel(button.dataset.followup)}: `;
    question.dispatchEvent(new Event("input"));
    question.focus();
  });

  document.querySelector(".notice-close")?.addEventListener("click", (event) => {
    event.currentTarget.closest(".privacy-notice").hidden = true;
  });

  document.getElementById("copy-review").addEventListener("click", copyReviewSummary);

  document.getElementById("citation-list").addEventListener("click", (event) => {
    const trigger = event.target.closest(".source-preview-button");
    if (trigger) openSourceDialog(trigger);
  });
  document.querySelectorAll("[data-source-dialog-close]").forEach((button) =>
    button.addEventListener("click", closeSourceDialog),
  );
  document.getElementById("source-dialog").addEventListener("click", (event) => {
    if (event.target === event.currentTarget) closeSourceDialog();
  });

  const initialStatus = document.getElementById("workspace-state-label").textContent.trim();
  if (statusPresentation[initialStatus]) setWorkspaceState(initialStatus);
  if (app.classList.contains("has-result")) {
    conversation.scrollTop = 0;
  } else {
    scrollConversation();
  }
})();
