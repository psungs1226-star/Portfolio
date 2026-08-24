"""Replace synthetic wide-topic provisions with real legal provisions.

Reads the candidate corpus from private/legal-wide/processed/candidate.json,
selects 8-12 directly answerable provisions per topic, and rewrites the
SYNTH-W-* entries in data/sample/distractor-corpus.json with real content.
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CANDIDATE_PATH = PROJECT_ROOT.parent.parent / "private" / "legal-wide" / "processed" / "candidate.json"
DISTRACTOR_PATH = PROJECT_ROOT / "data" / "sample" / "distractor-corpus.json"

# ── topic configuration ──────────────────────────────────────────────

TOPIC_SOURCE_IDS = {
    "discipline_and_appeal": "SYNTHETIC-WIDE-DISCIPLINE-AND-APPEAL",
    "performance_and_promotion": "SYNTHETIC-WIDE-PERFORMANCE-AND-PROMOTION",
    "pay_and_allowance": "SYNTHETIC-WIDE-PAY-AND-ALLOWANCE",
    "service_and_leave": "SYNTHETIC-WIDE-SERVICE-AND-LEAVE",
    "appointment": "SYNTHETIC-WIDE-APPOINTMENT",
    "retirement": "SYNTHETIC-WIDE-RETIREMENT",
    "training": "SYNTHETIC-WIDE-TRAINING",
    "personnel_records": "SYNTHETIC-WIDE-PERSONNEL-RECORDS",
}

WIDE_TOPIC_LABELS = {
    "discipline_and_appeal": "징계.소청",
    "performance_and_promotion": "근무성적평정.승진",
    "pay_and_allowance": "보수.수당",
    "service_and_leave": "복무.연가",
    "appointment": "신규임용",
    "retirement": "퇴직",
    "training": "교육훈련",
    "personnel_records": "인사기록",
}

# Adjacent topic pairs for confusable provisions
ADJACENT_TOPICS = {
    "discipline_and_appeal": "performance_and_promotion",
    "performance_and_promotion": "discipline_and_appeal",
    "pay_and_allowance": "retirement",
    "service_and_leave": "pay_and_allowance",
    "appointment": "performance_and_promotion",
    "retirement": "appointment",
    "training": "service_and_leave",
    "personnel_records": "discipline_and_appeal",
}

# ── provision selection per topic ─────────────────────────────────────
# Each entry: (provision_id, role)
#   role: "core" (main answerable), "proviso", "supplementary",
#         "superseded", "future", "adjacent", "subject_mismatch"

TOPIC_SELECTIONS: dict[str, list[tuple[str, str]]] = {
    "discipline_and_appeal": [
        # Core answerable provisions
        ("LAW-LOCAL-OFFICIAL:article:70", "core"),                     # 징계의 종류
        ("LAW-LOCAL-OFFICIAL:article:69:paragraph:1", "core"),         # 징계사유
        ("LAW-LOCAL-OFFICIAL:article:69의2:paragraph:1", "core"),      # 징계부가금
        ("LAW-LOCAL-OFFICIAL:article:73의2:paragraph:1", "core"),      # 징계 시효
        ("LAW-LOCAL-OFFICIAL:article:65의3:paragraph:1", "core"),      # 직위해제 사유
        # Proviso
        ("LAW-LOCAL-OFFICIAL:article:65의3:paragraph:5", "proviso"),   # 직위해제 사유 경합 단서
        # Supplementary
        ("DECREE-LOCAL-DISCIPLINE-OFFICIAL:article:1", "supplementary"),  # 징계령 목적(부칙 성격)
        # Superseded
        ("LAW-LOCAL-OFFICIAL-20221227:article:70", "superseded"),      # 구 징계 종류
        ("LAW-LOCAL-OFFICIAL-20221227:article:69:paragraph:1", "superseded"),  # 구 징계사유
        # Future (use a provision from future-effective pay decree as placeholder)
        ("DECREE-LOCAL-PAY-20260701-OFFICIAL:article:4:paragraph:3", "future"),
        # Adjacent confusable
        ("LAW-LOCAL-OFFICIAL:article:38:paragraph:1", "adjacent"),     # 승진(인접 주제)
        # Subject mismatch
        ("LAW-LOCAL-OFFICIAL:article:73의3", "subject_mismatch"),      # 특수경력직 징계
    ],
    "performance_and_promotion": [
        ("LAW-LOCAL-OFFICIAL:article:38:paragraph:1", "core"),         # 승진
        ("LAW-LOCAL-OFFICIAL:article:39의3:paragraph:1", "core"),      # 특별승진
        ("LAW-LOCAL-OFFICIAL:article:39의2:paragraph:1", "core"),      # 승진시험 구분
        ("DECREE-LOCAL-APPOINTMENT-OFFICIAL:article:33:paragraph:1", "core"),  # 승진소요최저연수
        ("RULE-LOCAL-PERFORMANCE-OFFICIAL:article:7", "core"),         # 근무성적평정점
        # Proviso
        ("DECREE-LOCAL-APPOINTMENT-OFFICIAL:article:33:paragraph:3", "proviso"),  # 최저연수 단축
        # Supplementary
        ("RULE-LOCAL-PERFORMANCE-OFFICIAL:article:1", "supplementary"),  # 근무성적평정 규칙 목적
        # Superseded
        ("LAW-LOCAL-OFFICIAL-20221227:article:38:paragraph:1", "superseded"),
        ("DECREE-LOCAL-APPOINTMENT-OFFICIAL-20230613:article:33:paragraph:1", "superseded"),
        # Future
        ("DECREE-LOCAL-PAY-20260701-OFFICIAL:article:8:paragraph:1", "future"),
        # Adjacent
        ("LAW-LOCAL-OFFICIAL:article:70", "adjacent"),                 # 징계 종류(인접)
        # Subject mismatch
        ("LAW-LOCAL-OFFICIAL:article:39의2:paragraph:3", "subject_mismatch"),  # 공개경쟁승진(5급 한정)
    ],
    "pay_and_allowance": [
        ("LAW-LOCAL-OFFICIAL:article:44:paragraph:1", "core"),         # 보수결정원칙
        ("DECREE-LOCAL-PAY-OFFICIAL:article:3:item:1", "core"),        # 보수 정의
        ("DECREE-LOCAL-PAY-OFFICIAL:article:3:item:2", "core"),        # 봉급 정의
        ("DECREE-LOCAL-PAY-OFFICIAL:article:27:paragraph:1", "core"),  # 휴직 중 봉급
        ("DECREE-LOCAL-ALLOWANCE-OFFICIAL:article:6:paragraph:1", "core"),  # 정근수당
        ("DECREE-LOCAL-ALLOWANCE-OFFICIAL:article:15:paragraph:1", "core"),  # 시간외근무수당
        # Proviso
        ("DECREE-LOCAL-PAY-OFFICIAL:article:27:paragraph:4", "proviso"),  # 미규정 휴직 봉급 미지급
        # Supplementary
        ("DECREE-LOCAL-ALLOWANCE-OFFICIAL:article:1", "supplementary"),  # 수당령 목적
        # Superseded
        ("DECREE-LOCAL-PAY-20260701-OFFICIAL:article:3:item:1", "superseded"),
        ("DECREE-LOCAL-PAY-20260701-OFFICIAL:article:3:item:2", "superseded"),
        # Future (use a future-effective provision)
        ("DECREE-LOCAL-PAY-20260701-OFFICIAL:article:4:paragraph:4", "future"),
        # Adjacent
        ("LAW-LOCAL-OFFICIAL:article:66:paragraph:1", "adjacent"),     # 정년(퇴직 인접)
        # Subject mismatch
        ("DECREE-LOCAL-ALLOWANCE-OFFICIAL:article:18", "subject_mismatch"),  # 정액급식비(일반적)
    ],
    "service_and_leave": [
        ("DECREE-LOCAL-SERVICE-OFFICIAL:article:2:paragraph:1", "core"),     # 근무시간
        ("DECREE-LOCAL-SERVICE-OFFICIAL:article:6:paragraph:1", "core"),     # 휴가 종류
        ("DECREE-LOCAL-SERVICE-OFFICIAL:article:7:paragraph:1", "core"),     # 연가일수
        ("DECREE-LOCAL-SERVICE-OFFICIAL:article:7의5:paragraph:1", "core"),  # 병가
        ("DECREE-LOCAL-SERVICE-OFFICIAL:article:7의6", "core"),              # 공가
        # Proviso
        ("DECREE-LOCAL-SERVICE-OFFICIAL:article:7의5:paragraph:3", "proviso"),  # 병가 6일 초과 진단서
        # Supplementary
        ("DECREE-LOCAL-SERVICE-OFFICIAL:article:1", "supplementary"),   # 복무규정 목적
        # Superseded (use old source equivalent)
        ("LAW-LOCAL-OFFICIAL-20221227:article:47", "superseded"),      # 구 복무선서
        ("LAW-LOCAL-OFFICIAL-20221227:article:48", "superseded"),      # 구 성실의무
        # Future
        ("DECREE-LOCAL-PAY-20260701-OFFICIAL:article:27:paragraph:1", "future"),
        # Adjacent
        ("DECREE-LOCAL-ALLOWANCE-OFFICIAL:article:15:paragraph:4", "adjacent"),  # 시간외근무 한도(보수 인접)
        # Subject mismatch
        ("DECREE-LOCAL-SERVICE-OFFICIAL:article:7의9", "subject_mismatch"),  # 시간선택제 특례
    ],
    "appointment": [
        ("LAW-LOCAL-OFFICIAL:article:27:paragraph:1", "core"),         # 신규임용 원칙
        ("LAW-LOCAL-OFFICIAL:article:27:paragraph:2", "core"),         # 경력경쟁임용
        ("LAW-LOCAL-OFFICIAL:article:28:paragraph:1", "core"),         # 시보임용
        ("LAW-LOCAL-OFFICIAL:article:31", "core"),                     # 결격사유
        ("LAW-LOCAL-OFFICIAL:article:25", "core"),                     # 임용의 기준
        # Proviso
        ("LAW-LOCAL-OFFICIAL:article:28:paragraph:2", "proviso"),      # 시보기간 산입 제외
        # Supplementary
        ("DECREE-LOCAL-APPOINTMENT-OFFICIAL:article:13:paragraph:1", "supplementary"),  # 신규임용후보자 배치
        # Superseded
        ("LAW-LOCAL-OFFICIAL-20221227:article:27:paragraph:1", "superseded"),
        ("LAW-LOCAL-OFFICIAL-20221227:article:31", "superseded"),
        # Future
        ("DECREE-LOCAL-PAY-20260701-OFFICIAL:article:8:paragraph:2", "future"),
        # Adjacent
        ("LAW-LOCAL-OFFICIAL:article:38:paragraph:1", "adjacent"),     # 승진(인접)
        # Subject mismatch
        ("LAW-LOCAL-OFFICIAL:article:25의2:paragraph:1", "subject_mismatch"),  # 외국인 임용
    ],
    "retirement": [
        ("LAW-LOCAL-OFFICIAL:article:66:paragraph:1", "core"),         # 정년 60세
        ("LAW-LOCAL-OFFICIAL:article:66:paragraph:2", "core"),         # 정년 퇴직일
        ("LAW-LOCAL-OFFICIAL:article:61", "core"),                     # 당연퇴직
        ("LAW-LOCAL-OFFICIAL:article:66의2:paragraph:1", "core"),      # 명예퇴직
        ("DECREE-LOCAL-RETIREMENT-ALLOWANCE-OFFICIAL:article:4", "core"),  # 명예퇴직수당 지급액
        # Proviso
        ("LAW-LOCAL-OFFICIAL:article:66의2:paragraph:3", "proviso"),   # 명예퇴직수당 환수
        # Supplementary
        ("DECREE-LOCAL-RETIREMENT-ALLOWANCE-OFFICIAL:article:1", "supplementary"),  # 명예퇴직수당령 목적
        # Superseded
        ("LAW-LOCAL-OFFICIAL-20221227:article:66:paragraph:1", "superseded"),
        ("LAW-LOCAL-OFFICIAL-20221227:article:61", "superseded"),
        # Future
        ("DECREE-LOCAL-PAY-20260701-OFFICIAL:article:4:paragraph:6", "future"),
        # Adjacent
        ("LAW-LOCAL-OFFICIAL:article:27:paragraph:1", "adjacent"),     # 신규임용(인접)
        # Subject mismatch
        ("DECREE-LOCAL-RETIREMENT-ALLOWANCE-OFFICIAL:article:10", "subject_mismatch"),  # 조기퇴직수당 지급액
    ],
    "training": [
        ("LAW-LOCAL-TRAINING-OFFICIAL:article:4:paragraph:1", "core"),  # 교육훈련 의무
        ("DECREE-LOCAL-TRAINING-OFFICIAL:article:4", "core"),           # 교육훈련 구분
        ("LAW-LOCAL-TRAINING-OFFICIAL:article:19:paragraph:1", "core"),  # 위탁교육훈련
        ("DECREE-LOCAL-TRAINING-OFFICIAL:article:34:paragraph:1", "core"),  # 의무복무기간
        ("DECREE-LOCAL-TRAINING-OFFICIAL:article:35:paragraph:1", "core"),  # 경비반납
        # Proviso
        ("DECREE-LOCAL-TRAINING-OFFICIAL:article:7:paragraph:2", "proviso"),  # 이수시간 미반영 예외
        # Supplementary
        ("LAW-LOCAL-TRAINING-OFFICIAL:article:1", "supplementary"),     # 교육훈련법 목적
        # Superseded (use old law source)
        ("LAW-LOCAL-OFFICIAL-20221227:article:25", "superseded"),
        ("LAW-LOCAL-OFFICIAL-20221227:article:28:paragraph:1", "superseded"),
        # Future
        ("DECREE-LOCAL-PAY-20260701-OFFICIAL:article:6", "future"),
        # Adjacent
        ("DECREE-LOCAL-SERVICE-OFFICIAL:article:2:paragraph:1", "adjacent"),  # 근무시간(복무 인접)
        # Subject mismatch
        ("DECREE-LOCAL-TRAINING-OFFICIAL:article:24", "subject_mismatch"),  # 교수요원 결격사유
    ],
    "personnel_records": [
        ("DECREE-LOCAL-APPOINTMENT-OFFICIAL:article:10:paragraph:1", "core"),  # 인사기록 작성의무
        ("RULE-LOCAL-PERSONNEL-RECORDS-OFFICIAL:article:4", "core"),   # 인사기록 종류
        ("RULE-LOCAL-PERSONNEL-RECORDS-OFFICIAL:article:5의2:paragraph:1", "core"),  # 전자적 관리
        ("RULE-LOCAL-PERSONNEL-RECORDS-OFFICIAL:article:6:paragraph:1", "core"),  # 인사기록카드 정리
        ("RULE-LOCAL-PERSONNEL-RECORDS-OFFICIAL:article:7:paragraph:1", "core"),  # 징계기록 말소
        # Proviso
        ("RULE-LOCAL-PERSONNEL-RECORDS-OFFICIAL:article:23:paragraph:1", "proviso"),  # 재직증명서 발급
        # Supplementary
        ("RULE-LOCAL-PERSONNEL-RECORDS-OFFICIAL:article:1", "supplementary"),  # 인사기록 규칙 목적
        # Superseded
        ("LAW-LOCAL-OFFICIAL-20221227:article:25", "superseded"),
        ("DECREE-LOCAL-APPOINTMENT-OFFICIAL-20230613:article:10:paragraph:1", "superseded"),
        # Future
        ("DECREE-LOCAL-PAY-20260701-OFFICIAL:article:3:item:3", "future"),
        # Adjacent
        ("LAW-LOCAL-OFFICIAL:article:70", "adjacent"),                 # 징계 종류(인접)
        # Subject mismatch
        ("RULE-LOCAL-PERSONNEL-RECORDS-OFFICIAL:article:12의3", "subject_mismatch"),  # 복수국적 확인
    ],
}


def load_json(path: Path) -> Any:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def save_json(path: Path, data: Any) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    # Ensure trailing newline
    with open(path, "a", encoding="utf-8") as f:
        f.write("\n")


def build_provision_index(provisions: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    """Index provisions by provision_id for O(1) lookup."""
    return {p["provision_id"]: p for p in provisions}


def compute_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def make_provision_id(topic: str, seq: int, role: str) -> str:
    """Generate a provision_id like REAL-W-DISCIPLINE-AND-APPEAL-01."""
    topic_upper = topic.upper().replace("_", "-")
    if role == "proviso":
        return f"REAL-W-{topic_upper}-PROV"
    if role == "supplementary":
        return f"REAL-W-{topic_upper}-SUP"
    if role == "superseded":
        return f"REAL-W-{topic_upper}-{seq:02d}-OLD"
    if role == "future":
        return f"REAL-W-{topic_upper}-FUT"
    if role == "adjacent":
        return f"REAL-W-{topic_upper}-ADJ"
    if role == "subject_mismatch":
        return f"REAL-W-{topic_upper}-SUBJ"
    return f"REAL-W-{topic_upper}-{seq:02d}"


def build_topic_tags(topic: str, role: str) -> list[str]:
    tags = [topic, "wide_evidence"]
    if role == "proviso":
        tags.append("proviso")
    elif role == "supplementary":
        tags.append("supplementary")
    elif role == "superseded":
        tags.append("superseded")
    elif role == "future":
        tags.append("not_yet_effective")
    elif role == "adjacent":
        adj = ADJACENT_TOPICS.get(topic)
        if adj:
            tags.insert(1, adj)
        tags.append("adjacent_confusable")
    elif role == "subject_mismatch":
        tags.append("subject_mismatch")
    return tags


def build_valid_time(role: str, src_prov: dict[str, Any]) -> dict[str, Any]:
    if role == "superseded":
        eff_from = src_prov.get("effective_from", "2022-01-01")
        eff_to = src_prov.get("effective_to")
        if eff_to:
            return {"start": eff_from, "end": eff_to}
        # If no effective_to, mark it as ending before current corpus
        end = "2024-01-01" if eff_from < "2024-01-01" else "2026-08-01"
        return {"start": eff_from, "end": end}
    if role == "future":
        return {"start": "2027-01-01", "end": None}
    return {"start": "2024-01-01", "end": None}


def build_title(topic: str, role: str, src_prov: dict[str, Any]) -> str:
    label = WIDE_TOPIC_LABELS[topic]
    orig_title = src_prov.get("title", "")
    if role == "superseded":
        return f"{label} . {orig_title} (구버전)"
    if role == "future":
        return f"{label} . 개정 예정"
    if role == "adjacent":
        adj = ADJACENT_TOPICS.get(topic, "")
        adj_label = WIDE_TOPIC_LABELS.get(adj, adj)
        return f"{label}.{adj_label} 구분"
    if role == "subject_mismatch":
        return f"{label} . 다른 직군"
    return f"{label} . {orig_title}"


def build_real_provisions(
    topic: str,
    selections: list[tuple[str, str]],
    prov_index: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    """Build the replacement provisions for one topic."""
    source_id = TOPIC_SOURCE_IDS[topic]
    provisions: list[dict[str, Any]] = []
    core_seq = 0
    old_seq = 0
    sup_id = make_provision_id(topic, 0, "supplementary")

    for orig_pid, role in selections:
        src = prov_index.get(orig_pid)
        if src is None:
            print(f"  WARNING: {orig_pid} not found, skipping", file=sys.stderr)
            continue

        # Skip provisions that are just article headers with no text
        text = src["text"].strip()
        if len(text) < 10 or text == src["article_path"]:
            # Try to use children text instead
            text = src["text"]

        if role == "core":
            core_seq += 1
            pid = make_provision_id(topic, core_seq, role)
        elif role == "superseded":
            old_seq += 1
            pid = make_provision_id(topic, old_seq, role)
        else:
            pid = make_provision_id(topic, 0, role)

        # Build relation_ids: core provisions relate to supplementary
        relation_ids: list[str] = []
        if role == "core":
            relation_ids = [sup_id]

        # Proviso has parent pointing to first core provision
        parent = None
        if role == "proviso":
            parent = make_provision_id(topic, 1, "core")

        prov = {
            "provision_id": pid,
            "source_id": source_id,
            "article_path": src["article_path"],
            "title": build_title(topic, role, src),
            "text": src["text"],
            "valid_time": build_valid_time(role, src),
            "applies_to": ["local_general_service"],
            "topic_tags": build_topic_tags(topic, role),
            "parent_provision_id": parent,
            "relation_ids": relation_ids,
            "source_hash": src.get("source_hash", compute_hash(src["text"])),
        }
        provisions.append(prov)

    return provisions


def update_wide_topics_metadata(corpus: dict[str, Any]) -> None:
    """Update the wide_topics metadata to reflect real provisions."""
    for topic, source_id in TOPIC_SOURCE_IDS.items():
        label = WIDE_TOPIC_LABELS[topic]
        key = topic
        corpus["wide_topics"][key] = {
            "label": label,
            "source_id": source_id,
            "source_name": f"지방공무원 인사규정 . {label}",
            "source_url": f"https://example.invalid/real/{topic}",
        }


def main() -> None:
    if not CANDIDATE_PATH.exists():
        print(f"ERROR: Candidate corpus not found at {CANDIDATE_PATH}", file=sys.stderr)
        sys.exit(1)

    print(f"Loading candidate corpus from {CANDIDATE_PATH}")
    candidate = load_json(CANDIDATE_PATH)
    prov_index = build_provision_index(candidate["provisions"])
    print(f"  {len(prov_index)} provisions indexed")

    print(f"Loading distractor corpus from {DISTRACTOR_PATH}")
    corpus = load_json(DISTRACTOR_PATH)
    old_count = len(corpus["provisions"])

    # Remove existing SYNTH-W-* provisions
    wide_source_ids = set(TOPIC_SOURCE_IDS.values())
    non_wide = [p for p in corpus["provisions"] if p["source_id"] not in wide_source_ids]
    removed = old_count - len(non_wide)
    print(f"  Removed {removed} synthetic wide provisions")

    # Build real provisions for each topic
    new_wide: list[dict[str, Any]] = []
    for topic, selections in TOPIC_SELECTIONS.items():
        provs = build_real_provisions(topic, selections, prov_index)
        new_wide.extend(provs)
        print(f"  {topic}: {len(provs)} real provisions")

    corpus["provisions"] = non_wide + new_wide
    total = len(corpus["provisions"])
    print(f"  Total provisions after replacement: {total}")

    # Update metadata
    update_wide_topics_metadata(corpus)

    # Save
    save_json(DISTRACTOR_PATH, corpus)
    print(f"Written to {DISTRACTOR_PATH}")

    # Summary
    wide_final = [p for p in corpus["provisions"] if p["source_id"] in wide_source_ids]
    print(f"\nSummary: {len(wide_final)} real wide provisions replacing {removed} synthetic ones")


if __name__ == "__main__":
    main()
