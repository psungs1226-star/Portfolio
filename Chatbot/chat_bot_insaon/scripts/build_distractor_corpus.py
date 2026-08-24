#!/usr/bin/env python3
"""Generate the public synthetic retrieval corpus used by the offline evaluation.

The earlier offline corpus held seven provisions, so Set Recall@5 was 1.000 for every
ablation config and the B0-to-H3 comparison could not discriminate. This script builds
a deliberately adversarial corpus so that lexical-only retrieval fails and each later
stage has something real to recover.

Four distractor families are emitted:

``old`` / ``future``
    Near-duplicate wording of a gold provision under a validity interval that does not
    contain the question reference date. Only the temporal pre-filter removes these.
``alt``
    Same leave type, genuinely effective, but administrative wording that is lexically
    distant from the question. These stay in the pool after the temporal filter.
``adjacent``
    Confusable neighbours (parental vs family-care, medical vs public-duty medical)
    that share vocabulary across two lanes.
``exception``
    Decisive provisos attached to a gold provision through ``parent_provision_id``.
``subject_mismatch``
    Wording almost identical to a gold provision, effective on the reference date, but
    applying to a different 직군. Only the 적용대상 pre-filter removes these. Without
    them the corpus applied to exactly one subject, so removing the subject half of the
    filter entirely did not fail a single test.

Nothing here is real statutory text. Every ``text`` field is prefixed with ``[합성]``.

Usage:
    python scripts/build_distractor_corpus.py
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "data/sample/distractor-corpus.json"

SUBJECT = ["local_general_service"]
# A supported-looking but out-of-scope 직군. Provisions carrying this must never reach an
# answer for a 일반직 question, and the deterministic subject filter is what stops them.
OTHER_SUBJECT = ["local_special_service"]
REFERENCE_ERA_START = "2024-01-01"

LANES: dict[str, dict[str, str]] = {
    "parental": {
        "label": "육아휴직",
        "gold": "SYNTH-PARENTAL-001",
        "tag": "parental_leave",
        "core": "육아휴직 검토에는 자녀와 기존 기간 조건을 확인한다.",
    },
    "medical": {
        "label": "질병휴직",
        "gold": "SYNTHETIC-EVIDENCE-B-001",
        "tag": "medical_leave",
        "core": "질병휴직과 복직의 공개 근거는 질문 기준일에 유효한 원문으로 검토한다.",
    },
    "family_care": {
        "label": "가족돌봄휴직",
        "gold": "SYNTH-FAMILY-001",
        "tag": "family_care_leave",
        "core": "가족돌봄휴직 검토에는 돌봄 관계를 확인한다.",
    },
    "self_development": {
        "label": "자기개발휴직",
        "gold": "SYNTH-DEVELOP-001",
        "tag": "self_development_leave",
        "core": "자기개발휴직 검토에는 신청 목적을 확인한다.",
    },
}

# Administrative wording deliberately kept away from the question vocabulary
# ("공개 근거", "조문", "찾아주세요", the reference date) so that these survive the
# temporal filter without outranking the gold provision under term overlap.
ALT_SUBJECTS = (
    ("신청서 서식", "신청서 서식과 첨부 서류의 보관 기간을 정한다."),
    ("결재 절차", "소속 부서장의 결재 절차와 위임 전결 사항을 정한다."),
    ("대체인력", "대체인력 배치와 업무 인수인계 방법을 정한다."),
    ("통계 보고", "반기별 사용 현황 통계의 보고 서식을 정한다."),
    ("전산 등록", "인사 전산시스템 등록 항목과 정정 방법을 정한다."),
    ("사후 점검", "사용 종료 후 사후 점검표 작성 방법을 정한다."),
    ("교육 안내", "복무 담당자 대상 안내 교육의 실시 주기를 정한다."),
    ("서류 이관", "부서 이동 시 관련 서류의 이관 절차를 정한다."),
)

def _history(count: int) -> tuple[tuple[str, str], ...]:
    """Build ``count`` consecutive superseded intervals ending before 2024-01-01."""
    years = [2023 - (count - index) for index in range(count + 1)]
    return tuple(
        (f"{years[index]}-01-01", f"{years[index + 1]}-01-01") for index in range(count)
    )


AMENDMENT_HISTORY: dict[str, tuple[tuple[str, str], ...]] = {
    "parental": _history(6),
    "medical": _history(3),
    "family_care": _history(2),
    "self_development": _history(5),
}

ADJACENT_PAIRS = (
    ("parental", "family_care", "자녀 돌봄과 가족 돌봄의 사용 요건이 서로 다르다는 점"),
    ("medical", "medical", "공무상 질병과 비공무상 질병의 요양 절차가 다르다는 점"),
    ("family_care", "parental", "돌봄 대상이 자녀인 경우와 부모인 경우의 구분"),
    ("self_development", "parental", "자기개발 목적과 양육 목적의 구분"),
    ("medical", "family_care", "본인 질병과 가족 간병의 구분"),
)

EXCEPTIONS = (
    ("기관 규정 우선", "기관 규정이 상위 규정과 다르게 정한 경우 검토를 보류한다."),
    ("합산 한도", "동일 사유로 이미 사용한 기간은 한도에 합산한다."),
)

# 넓은 인사규정 영역. 분류기(`QuestionClassifier._wide_topics`)는 이 여덟 주제를 이미
# 알고 있었지만 corpus에 조문이 하나도 없어서, 켜도 `wide_corpus_unavailable`로 끝났다.
# 휴직·복직은 조건을 되묻고 결론까지 가는 심층 검토 lane이고, 여기는 근거 조문을 찾아
# 사람에게 넘기는 evidence_only lane이다. 그래서 조건 스키마 없이 조문만 채운다.
#
# 각 주제는 현행 2건 + 폐지된 옛 버전 2건을 갖는다. 옛 버전을 넣지 않으면 시점 필터가
# 이 영역에서 무엇을 걸러내는지 보이지 않는다.
WIDE_TOPICS: dict[str, dict[str, Any]] = {
    "appointment": {
        "label": "신규임용",
        "tag": "appointment",
        "articles": (
            ("임용 방법", "신규임용은 공개경쟁시험으로 하되 경력경쟁시험으로 임용할 수 있다."),
            ("시보 임용", "신규임용된 사람은 6개월간 시보로 임용하고 그 기간의 근무성적으로 정규 임용 여부를 판단한다."),
            ("전보 제한", "같은 직위에 임용된 날부터 1년 이내에는 다른 직위로 전보하지 아니한다."),
            (
                "임용 결격사유",
                "금고 이상의 형을 선고받고 그 집행이 끝나거나 집행을 받지 아니하기로 "
                "확정된 날부터 5년이 지나지 아니한 사람은 공무원으로 임용될 수 없다.",
            ),
            (
                "시보기간의 계산",
                "휴직기간, 직위해제기간, 징계처분으로 직무에 종사하지 아니한 기간은 "
                "시보 임용기간에 넣어 계산하지 아니한다.",
            ),
        ),
        "proviso": "다만 직제 개편이나 결원 보충이 필요한 경우에는 전보 제한 기간을 적용하지 아니한다.",
        "supplement": "이 규정의 임용 관련 조항은 공포 후 3개월이 지난 날부터 시행한다.",
        "future": "신규임용 시보기간을 9개월로 조정한다.",
        "adjacent": ("performance_and_promotion", "승진임용과 신규임용의 임용 절차가 서로 다르다는 점"),
        "mismatch": "특정직 공무원의 신규임용 절차는 따로 정한다.",
    },
    "personnel_records": {
        "label": "인사기록",
        "tag": "personnel_records",
        "articles": (
            ("인사기록카드", "인사기록카드에는 임용·전보·휴직·복직과 교육훈련 이수 사항을 기재한다."),
            ("기록 정정", "기재사항에 오류가 있으면 증빙자료를 붙여 정정을 신청할 수 있다."),
            ("인사통계 보고", "인사통계는 반기마다 작성하여 상급기관에 보고한다."),
            (
                "보존기간",
                "인사기록카드는 퇴직한 날부터 30년간 보존하고 보존기간이 지나면 폐기한다.",
            ),
            (
                "열람과 제공 제한",
                "인사기록의 열람과 제공은 인사관리에 필요한 범위로 한정하며 본인 외의 "
                "사람에게 제공할 때에는 제공한 사유와 범위를 기록하여 남긴다.",
            ),
        ),
        "proviso": "다만 징계처분 기록의 말소 여부는 인사기록 정정 절차로 다루지 아니한다.",
        "supplement": "인사기록 전산화 이전의 종이 기록은 종전의 규정에 따른다.",
        "future": "인사기록카드 기재사항에 원격근무 이력을 추가한다.",
        "adjacent": ("discipline_and_appeal", "징계기록 말소와 인사기록 정정의 구분"),
        "mismatch": "특정직 공무원의 인사기록은 소속 기관의 규정에 따른다.",
    },
    "performance_and_promotion": {
        "label": "근무성적평정·승진",
        "tag": "performance_and_promotion",
        "articles": (
            ("평정 시기", "근무성적평정은 매년 12월 31일을 기준으로 실시한다."),
            ("평정 요소", "근무성적평정은 근무실적과 직무수행능력을 평가하여 산정한다."),
            ("승진후보자명부", "승진임용은 평정 결과로 작성한 승진후보자명부의 순위에 따라 심사한다."),
            # "최소 승진연수는 언제 지나느냐"가 승진 주제에서 가장 흔한 질문인데 평정
            # 조문 세 건만 있어서 회수할 조문이 없었다. 화면에는 평정 시기·평정 요소·
            # 명부가 나왔고 질문한 값은 어디에도 없었다.
            (
                "승진소요최저연수",
                "승진임용에 필요한 승진소요최저연수는 9급 1년 6개월, 8급 2년, "
                "7급 3년으로 하며 해당 계급에서 재직한 기간으로 계산한다.",
            ),
            # 인접 조문(`-ADJ`)은 "징계처분에 따른 승진제한"을 대조하라고 말하는데
            # 정작 그 기간을 정한 조문이 없었다. 가리키는 대상이 없는 안내였다.
            (
                "승진임용의 제한",
                "징계처분을 받은 사람은 강등·정직 18개월, 감봉 12개월, 견책 6개월이 "
                "지나지 아니하면 승진임용할 수 없다.",
            ),
        ),
        "proviso": "다만 평정 대상기간 중 실제 근무기간이 2개월 미만이면 해당 기간은 평정에서 제외한다.",
        "supplement": "종전 평정 방식으로 작성된 명부는 다음 평정 시기까지 효력을 유지한다.",
        "future": "근무성적평정의 평가 요소에 협업 실적을 추가한다.",
        "adjacent": ("discipline_and_appeal", "징계처분에 따른 승진제한과 평정 결과의 구분"),
        "mismatch": "교육공무원의 근무성적평정은 따로 정한다.",
    },
    "service_and_leave": {
        "label": "복무·연가",
        "tag": "service_and_leave",
        "articles": (
            ("연가 일수", "연가 일수는 재직기간에 따라 산정하며 재직기간 6년 이상이면 21일로 한다."),
            ("병가", "병가는 질병이나 부상으로 직무를 수행할 수 없을 때 연 60일의 범위에서 사용한다."),
            ("출장 복무", "출장 중에는 해당 업무에 전념하여야 하며 출장 목적 외의 활동을 하지 아니한다."),
            (
                "특별휴가",
                "경조사 휴가는 본인의 결혼 5일, 배우자의 출산 10일, 부모의 사망 5일, "
                "조부모의 사망 3일로 하며 그 사유가 발생한 날부터 사용한다.",
            ),
            (
                "공가",
                "병역 판정검사, 법률에 따른 소집, 투표, 건강검진에 응할 때에는 그에 "
                "직접 필요한 기간을 공가로 승인한다.",
            ),
        ),
        "proviso": "다만 같은 사유의 병가가 연 30일을 넘으면 진단서를 제출하여야 한다.",
        "supplement": "이 규정 시행 당시 사용 중인 연가는 종전의 규정에 따른다.",
        "future": "연가 일수 산정의 재직기간 구간을 조정한다.",
        "adjacent": ("pay_and_allowance", "연가보상비 지급과 연가 사용의 구분"),
        "mismatch": "소방공무원의 교대근무자 복무는 따로 정한다.",
    },
    "pay_and_allowance": {
        "label": "보수·수당",
        "tag": "pay_and_allowance",
        "articles": (
            ("봉급 지급일", "봉급은 봉급표에 따라 매월 20일에 지급한다."),
            ("수당 지급 요건", "수당은 지급 대상 요건과 지급일 현재의 재직 여부를 확인하여 지급한다."),
            ("정근수당", "정근수당은 매년 1월과 7월의 보수 지급일에 근무연수에 따라 지급한다."),
            (
                "가족수당",
                "가족수당은 부양가족이 있는 사람에게 지급하며 배우자와 부양가족의 수에 "
                "따라 산정하되 4명을 넘는 부양가족에 대해서는 지급하지 아니한다.",
            ),
            (
                "시간외근무수당",
                "시간외근무수당은 월 57시간의 범위에서 실제 근무한 시간에 대하여 지급한다.",
            ),
            # 심층 lane과 넓은 lane 사이에 낀 질문이다. 휴직 가능 여부는 심층 lane이
            # 답하지만 "그동안 봉급이 나오느냐"는 어느 쪽에도 조문이 없었다.
            (
                "휴직기간 중의 보수",
                "휴직기간 중의 보수는 휴직 사유에 따라 달리 정하며, 질병휴직은 최초 "
                "1년까지 봉급의 7할, 1년을 넘는 기간은 5할을 지급하고 그 밖의 휴직은 "
                "봉급을 지급하지 아니한다.",
            ),
        ),
        "proviso": "다만 지급일 현재 직위해제 또는 정직 중인 사람에게는 해당 수당을 지급하지 아니한다.",
        "supplement": "이 규정에 따른 수당 지급 기준은 2026년 7월 1일부터 시행한다.",
        "future": "정근수당 가산금의 근무연수 구간을 조정한다.",
        "adjacent": ("retirement", "재직 중 수당과 퇴직급여의 구분"),
        "mismatch": "지방공무원 특정직의 수당 지급 기준은 따로 정한다.",
    },
    "discipline_and_appeal": {
        "label": "징계·소청",
        "tag": "discipline_and_appeal",
        "articles": (
            ("징계 종류", "징계는 파면·해임·강등·정직·감봉·견책으로 구분한다."),
            ("징계 시효", "징계 사유가 발생한 날부터 3년이 지나면 징계를 요구하지 못한다."),
            ("소청 청구", "처분사유 설명서를 받은 날부터 30일 이내에 소청심사를 청구할 수 있다."),
            (
                "직위해제",
                "직무수행 능력이 현저히 부족하거나 중징계 의결이 요구 중인 사람에게는 "
                "직위를 부여하지 아니할 수 있으며 직위해제는 징계처분이 아니다.",
            ),
            (
                "징계부가금",
                "금품 및 향응을 수수하거나 공금을 횡령한 경우에는 그 가액의 5배 이내의 "
                "징계부가금 부과를 함께 요구한다.",
            ),
        ),
        "proviso": "다만 금품 및 향응 수수의 경우 징계 시효를 5년으로 한다.",
        "supplement": "이 규정 시행 전에 발생한 징계 사유의 시효는 종전의 규정에 따른다.",
        "future": "소청 청구 기간을 60일로 연장한다.",
        "adjacent": ("performance_and_promotion", "징계처분과 승진제한 기간의 구분"),
        "mismatch": "경찰공무원의 징계 절차는 따로 정한다.",
    },
    "training": {
        "label": "교육훈련",
        "tag": "training",
        "articles": (
            ("교육훈련 이수", "공무원은 매년 100시간 이상의 교육훈련을 이수하여야 한다."),
            ("위탁교육", "위탁교육은 직무와 관련된 과정에 대하여 기관장의 승인을 받아 실시한다."),
            ("의무복무", "6개월 이상 위탁교육을 받은 사람은 교육기간의 2배에 해당하는 기간을 복무하여야 한다."),
            (
                "교육경비 반납",
                "의무복무 기간을 채우지 못하고 퇴직한 사람은 남은 기간에 해당하는 "
                "교육경비를 반납하여야 한다.",
            ),
            (
                "이수 결과의 활용",
                "교육훈련 이수 결과는 근무성적평정과 승진심사의 참고자료로 활용한다.",
            ),
        ),
        "proviso": "다만 본인의 귀책사유 없이 교육을 마치지 못한 경우에는 의무복무를 부과하지 아니한다.",
        "supplement": "이 규정에 따른 이수 시간 기준은 시행일이 속한 연도부터 적용한다.",
        "future": "교육훈련 연간 이수 시간 기준을 조정한다.",
        "adjacent": ("service_and_leave", "교육훈련 기간의 복무와 일반 복무의 구분"),
        "mismatch": "교육공무원의 연수와 위탁교육은 따로 정한다.",
    },
    "retirement": {
        "label": "퇴직",
        "tag": "retirement",
        "articles": (
            ("정년", "공무원의 정년은 60세로 하며 정년에 이른 날이 속하는 달의 말일에 당연퇴직한다."),
            ("명예퇴직 요건", "20년 이상 근속한 사람이 정년 전에 스스로 물러날 때 명예퇴직수당을 지급할 수 있다."),
            ("퇴직 절차", "퇴직 예정자는 담당 업무와 보유 자료를 인수인계하고 확인서를 제출한다."),
            (
                "당연퇴직",
                "임용 결격사유에 해당하게 된 사람은 그 사유가 발생한 날에 당연히 "
                "퇴직하며 별도의 처분을 요하지 아니한다.",
            ),
            (
                "퇴직급여의 제한",
                "재직 중의 사유로 금고 이상의 형이 확정된 사람에게는 퇴직급여의 일부를 "
                "감액하여 지급한다.",
            ),
        ),
        "proviso": "다만 징계 사유로 조사 또는 수사 중인 사람에게는 명예퇴직수당을 지급하지 아니한다.",
        "supplement": "이 규정 시행 당시 명예퇴직을 신청한 사람은 종전의 규정에 따른다.",
        "future": "명예퇴직 근속 요건을 조정한다.",
        "adjacent": ("appointment", "퇴직 후 재임용과 신규임용의 구분"),
        "mismatch": "특정직 공무원의 정년은 따로 정한다.",
    },
}

# 미시행 조문의 시행일. 휴직 lane의 `SYNTH-D-*-FUT-*`와 같은 날을 쓴다.
FUTURE_ERA_START = "2027-01-01"


def wide_source_id(topic: str) -> str:
    return f"SYNTHETIC-WIDE-{topic.upper().replace('_', '-')}"


def _wide_topic_provisions() -> list[dict[str, Any]]:
    """넓은 인사규정 lane의 근거 조문.

    처음에는 주제당 현행 2건과 구버전 2건만 뒀는데, 그러면 홈 화면의 예시 카드를 눌러도
    조문 두 줄만 나와 클릭할 이유가 없었다. 휴직 4종과 같은 밀도로 채운다. 주제마다
    본문 3~5건, 결론을 뒤집을 수 있는 단서 1건, 시행일을 정하는 부칙 1건, 폐지된 구버전
    2건, 아직 시행되지 않은 버전 1건, 인접 주제와 어휘가 겹치는 조문 1건, 기준일에는
    유효하지만 적용대상 직군이 다른 조문 1건이다.

    본문 건수가 주제마다 다른 이유는 실제로 많이 묻는 질문을 기준으로 채웠기 때문이다.
    "7급 최소 승진연수"를 물었더니 평정 시기·평정 요소·명부만 나온 적이 있다. 주변
    조문은 있는데 정작 결론을 정하는 조문이 없는 상태였다. 같은 기준으로 여덟 주제를
    다시 훑어 결격사유·보존기간·승진제한·특별휴가·직위해제·당연퇴직처럼 담당자가 먼저
    찾는 조문을 채웠다.

    이 lane은 evidence_only다. 조문을 찾아 사람에게 넘기는 것이 목적이므로 결론 규칙이
    아니라 검토자가 대조할 근거가 갖춰져 있어야 한다.
    """
    provisions: list[dict[str, Any]] = []
    for index, (topic, meta) in enumerate(WIDE_TOPICS.items(), start=1):
        lane = topic.upper().replace("_", "-")
        source_id = wide_source_id(topic)
        base = 100 + index * 10
        head_id = f"SYNTH-W-{lane}-01"
        supplement_id = f"SYNTH-W-{lane}-SUP"

        for order, (title, text) in enumerate(meta["articles"], start=1):
            provisions.append(
                _provision(
                    f"SYNTH-W-{lane}-{order:02d}",
                    f"합성 인사규정 제{base + order}조",
                    f"[합성] {meta['label']} · {title}",
                    f"[합성] {text}",
                    [meta["tag"], "wide_evidence"],
                    REFERENCE_ERA_START,
                    relations=[supplement_id],
                    source_id=source_id,
                )
            )
        provisions.append(
            _provision(
                f"SYNTH-W-{lane}-PROV",
                f"합성 인사규정 제{base + 1}조 단서",
                f"[합성] {meta['label']} · 단서",
                f"[합성] {meta['proviso']}",
                [meta["tag"], "wide_evidence", "proviso"],
                REFERENCE_ERA_START,
                parent=head_id,
                source_id=source_id,
            )
        )
        provisions.append(
            _provision(
                supplement_id,
                f"합성 인사규정 부칙 제{index}조",
                f"[합성] {meta['label']} · 부칙",
                f"[합성] {meta['supplement']}",
                [meta["tag"], "wide_evidence", "supplementary"],
                REFERENCE_ERA_START,
                source_id=source_id,
            )
        )
        for order in (1, 2):
            provisions.append(
                _provision(
                    f"SYNTH-W-{lane}-{order:02d}-OLD",
                    f"합성 인사규정 제{base + order}조",
                    f"[합성] {meta['label']} · {meta['articles'][order - 1][0]} (구버전)",
                    f"[합성] {meta['articles'][order - 1][1]} 개정 전 기준을 적용한다.",
                    [meta["tag"], "wide_evidence", "superseded"],
                    "2022-01-01",
                    REFERENCE_ERA_START,
                    source_id=source_id,
                )
            )
        provisions.append(
            _provision(
                f"SYNTH-W-{lane}-FUT",
                f"합성 인사규정 제{base + 1}조",
                f"[합성] {meta['label']} · 개정 예정",
                f"[합성] {meta['future']}",
                [meta["tag"], "wide_evidence", "not_yet_effective"],
                FUTURE_ERA_START,
                source_id=source_id,
            )
        )
        partner, note = meta["adjacent"]
        provisions.append(
            _provision(
                f"SYNTH-W-{lane}-ADJ",
                f"합성 인사규정 제{base + 9}조",
                f"[합성] {meta['label']}·{WIDE_TOPICS[partner]['label']} 구분",
                f"[합성] {note}을 검토 시 확인한다.",
                [meta["tag"], WIDE_TOPICS[partner]["tag"], "wide_evidence", "adjacent_confusable"],
                REFERENCE_ERA_START,
                source_id=source_id,
            )
        )
        provisions.append(
            _provision(
                f"SYNTH-W-{lane}-SUBJ",
                f"합성 인사규정 제{base + 8}조",
                f"[합성] {meta['label']} · 다른 직군",
                f"[합성] {meta['mismatch']}",
                [meta["tag"], "wide_evidence", "subject_mismatch"],
                REFERENCE_ERA_START,
                applies_to=OTHER_SUBJECT,
                source_id=source_id,
            )
        )
    return provisions


def _hash(seed: str) -> str:
    return hashlib.sha256(seed.encode("utf-8")).hexdigest()


def _provision(
    provision_id: str,
    article_path: str,
    title: str,
    text: str,
    tags: list[str],
    start: str,
    end: str | None = None,
    parent: str | None = None,
    relations: list[str] | None = None,
    applies_to: list[str] | None = None,
    source_id: str = "SYNTHETIC-PUBLIC-FIXTURE",
) -> dict[str, Any]:
    return {
        "provision_id": provision_id,
        "source_id": source_id,
        "article_path": article_path,
        "title": title,
        "text": text,
        "valid_time": {"start": start, "end": end},
        "applies_to": applies_to or SUBJECT,
        "topic_tags": tags,
        "parent_provision_id": parent,
        "relation_ids": relations or [],
        "source_hash": _hash(provision_id),
    }


def _gold_provisions() -> list[dict[str, Any]]:
    """The original seven fixtures, preserved byte-for-byte in meaning.

    CASE-A/B/C and several E2E tests depend on these IDs, their wording and their
    validity intervals, so they must not drift when the corpus grows.
    """
    return [
        _provision(
            "SYNTHETIC-EVIDENCE-B-001",
            "합성 제1조",
            "질병휴직·복직 검토 fixture",
            "[합성] 질병휴직과 복직의 공개 근거는 질문 기준일에 유효한 원문으로 검토한다.",
            ["medical_leave", "reinstatement"],
            REFERENCE_ERA_START,
            relations=["SYNTHETIC-EXCEPTION-B-001", "SYNTH-SUPPLEMENT-001"],
        ),
        _provision(
            "SYNTHETIC-EXCEPTION-B-001",
            "합성 제1조 단서",
            "기관 규정 확인 fixture",
            "[합성] 다만 기관 규정이 필요한 경우 최종 판단을 보류한다.",
            ["medical_leave", "proviso"],
            REFERENCE_ERA_START,
            parent="SYNTHETIC-EVIDENCE-B-001",
        ),
        _provision(
            "SYNTH-PARENTAL-001",
            "합성 제2조",
            "육아휴직 검토 fixture",
            "[합성] 육아휴직 검토에는 자녀와 기존 기간 조건을 확인한다.",
            ["parental_leave"],
            REFERENCE_ERA_START,
            relations=["SYNTH-SUPPLEMENT-001"],
        ),
        _provision(
            "SYNTH-FAMILY-001",
            "합성 제3조",
            "가족돌봄휴직 검토 fixture",
            "[합성] 가족돌봄휴직 검토에는 돌봄 관계를 확인한다.",
            ["family_care_leave"],
            REFERENCE_ERA_START,
            relations=["SYNTH-SUPPLEMENT-001"],
        ),
        _provision(
            "SYNTH-DEVELOP-001",
            "합성 제4조",
            "자기개발휴직 검토 fixture",
            "[합성] 자기개발휴직 검토에는 신청 목적을 확인한다.",
            ["self_development_leave"],
            REFERENCE_ERA_START,
            relations=["SYNTH-SUPPLEMENT-001"],
        ),
        _provision(
            "SYNTH-SUPPLEMENT-001",
            "합성 부칙 제1조",
            "공통 시행일 fixture",
            "[합성] 부칙과 시행일은 질문 기준일과 함께 검토한다.",
            ["supplementary"],
            REFERENCE_ERA_START,
        ),
        _provision(
            "SYNTHETIC-NOT-EFFECTIVE-B-001",
            "합성 미시행 제1조",
            "미시행 질병휴직 fixture",
            "[합성] 질병휴직 복직의 미래 시행 예정 자료.",
            ["medical_leave", "not_yet_effective"],
            "2027-01-01",
        ),
    ]


def _temporal_distractors() -> list[dict[str, Any]]:
    """Near-duplicates of the gold wording that are not effective on the question date.

    The question text is of the form
    "[합성] 2024년 1월 1일 당시 {label} 공개 근거와 조문을 찾아주세요."
    so these repeat that vocabulary verbatim and then restate the gold sentence. Under
    character bigram or term overlap they outrank the gold provision, and only the
    temporal pre-filter can remove them.
    """
    rows: list[dict[str, Any]] = []
    for lane, meta in LANES.items():
        label, core, tag = meta["label"], meta["core"], meta["tag"]
        # Amendment history length differs per lane on purpose. A uniform count makes
        # every lane succeed or fail together, so Set Recall@5 lands on 0.000 or 1.000
        # and still fails to discriminate. Lanes with more superseded versions than
        # ``top_k`` push the gold provision out of the baseline result set; lanes with
        # fewer do not.
        for index, (start, end) in enumerate(AMENDMENT_HISTORY[lane], start=1):
            rows.append(
                _provision(
                    f"SYNTH-D-{lane.upper()}-OLD-{index:02d}",
                    f"합성 종전 제{index}조",
                    f"{label} 공개 근거 종전 제{index}차",
                    # Carries the lane label and one phrase from the question so that
                    # same-lane superseded versions outrank the gold provision, while
                    # staying short enough that the length-normalised lexical score
                    # does not lift other lanes' superseded versions with it.
                    f"[합성] {label} 공개 근거 종전 규정 제{index}차. {core}",
                    [tag, "superseded"],
                    start,
                    end,
                )
            )
        # Future versions are deliberately *less* query-shaped than the superseded ones.
        # If every temporally invalid provision outranked the gold text, the gold would
        # never reach the top five and B0/B1/H1 would all collapse to exactly 0.000,
        # which reads as a rigged corpus rather than a weak retriever.
        for index, start in enumerate(("2027-01-01", "2028-01-01", "2029-01-01"), start=1):
            rows.append(
                _provision(
                    f"SYNTH-D-{lane.upper()}-FUT-{index:02d}",
                    f"합성 미시행 제{index}조",
                    f"{label} 개정 예정 제{index}차",
                    (
                        f"[합성] 장래 시행 예정인 {label} 개정안이다. {core} "
                        "시행일 도래 전에는 적용하지 아니한다."
                    ),
                    [tag, "not_yet_effective"],
                    start,
                )
            )
    return rows


def _same_type_distractors() -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for lane, meta in LANES.items():
        label, tag = meta["label"], meta["tag"]
        for index, (topic, sentence) in enumerate(ALT_SUBJECTS, start=1):
            rows.append(
                _provision(
                    f"SYNTH-D-{lane.upper()}-ALT-{index:02d}",
                    f"합성 시행세칙 제{index}조",
                    f"{label} {topic}",
                    f"[합성] {label} {topic}에 관하여 {sentence}",
                    [tag, "administrative"],
                    "2020-01-01",
                )
            )
    return rows


def _adjacent_distractors() -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for index, (left, right, note) in enumerate(ADJACENT_PAIRS, start=1):
        left_label = LANES[left]["label"]
        right_label = LANES[right]["label"]
        for side, (lane, other) in enumerate(((left, right), (right, left)), start=1):
            rows.append(
                _provision(
                    f"SYNTH-D-ADJ-{index:02d}-{side}",
                    f"합성 유사조 제{index}조의{side}",
                    f"{LANES[lane]['label']}·{LANES[other]['label']} 구분",
                    (
                        f"[합성] {left_label}과 {right_label}을 혼동하지 않도록 {note}을 "
                        f"구분한다. 사용 요건과 기간 산정 방법이 서로 다르다."
                    ),
                    [LANES[lane]["tag"], "adjacent_confusable"],
                    "2020-01-01",
                )
            )
    return rows


def _exception_distractors() -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for lane, meta in LANES.items():
        for index, (topic, sentence) in enumerate(EXCEPTIONS, start=1):
            rows.append(
                _provision(
                    f"SYNTH-D-{lane.upper()}-EXC-{index:02d}",
                    f"합성 제{index}조 단서",
                    f"{meta['label']} {topic} 단서",
                    f"[합성] 다만 {sentence}",
                    [meta["tag"], "proviso"],
                    REFERENCE_ERA_START,
                    parent=meta["gold"],
                )
            )
    return rows


def _subject_mismatch_distractors() -> list[dict[str, Any]]:
    """Near-copies of each gold provision that apply to a different 직군.

    These are effective on the question date and lexically closer to the question than
    most of the corpus, so lexical, vector and reranking stages all rank them highly.
    Only the deterministic 적용대상 filter can exclude them, which is the point: a
    provision that does not apply to the questioner is not weaker evidence, it is wrong
    evidence, and citing it would state the law of a 직군 nobody asked about.
    """
    rows: list[dict[str, Any]] = []
    for lane, meta in LANES.items():
        label, tag, core = meta["label"], meta["tag"], meta["core"]
        for index, scope in enumerate(("특정직", "별정직"), start=1):
            rows.append(
                _provision(
                    f"SYNTH-D-{lane.upper()}-SUBJ-{index:02d}",
                    f"합성 {scope} 제{index}조",
                    f"{scope} {label} 검토",
                    f"[합성] {scope} 공무원의 {core}",
                    [tag, "subject_mismatch"],
                    "2020-01-01",
                    applies_to=OTHER_SUBJECT,
                )
            )
    return rows


def _supplementary_filler() -> list[dict[str, Any]]:
    return [
        _provision(
            f"SYNTH-D-SUP-{index:02d}",
            f"합성 부칙 제{index + 1}조",
            f"경과조치 제{index}호",
            (
                f"[합성] 제{index}차 개정 당시 이미 사용 중이던 기간에 관한 경과조치를 "
                "정한다. 시행일 전후의 적용 관계를 구분한다."
            ),
            ["supplementary"],
            "2020-01-01",
        )
        for index in range(1, 9)
    ]


def build_corpus() -> dict[str, Any]:
    provisions = (
        _gold_provisions()
        + _temporal_distractors()
        + _same_type_distractors()
        + _adjacent_distractors()
        + _exception_distractors()
        + _subject_mismatch_distractors()
        + _supplementary_filler()
        + _wide_topic_provisions()
    )
    identifiers = [item["provision_id"] for item in provisions]
    if len(identifiers) != len(set(identifiers)):
        raise ValueError("duplicate provision_id in generated corpus")
    return {
        "dataset_id": "insaon-synthetic-distractor-corpus",
        "version": "0.3.0",
        "notice": (
            "공개 가능한 합성 자료다. 실제 법령 원문이 아니며 검색 구성의 변별력을 "
            "확인하기 위해 의도적으로 혼동되는 조문을 포함한다."
        ),
        "distractor_families": {
            "superseded_or_future": "질문 기준일에 효력이 없는 근사 중복 조문",
            "administrative": "같은 휴직 유형의 유효한 행정 절차 조문",
            "adjacent_confusable": "인접 휴직 유형과 어휘가 겹치는 조문",
            "proviso": "결론을 뒤집을 수 있는 단서 조문",
            "subject_mismatch": "기준일에 유효하지만 적용대상 직군이 다른 조문",
            "wide_evidence": "휴직 외 인사 영역의 근거 조문과 그 폐지된 옛 버전",
        },
        # 넓은 lane의 주제 → source 매핑. 팩토리가 이름을 다시 적지 않도록 corpus가
        # 함께 낸다. 두 곳에 적으면 한쪽만 고쳐져 주제가 조용히 비게 된다.
        "wide_topics": {
            topic: {
                "label": meta["label"],
                "source_id": wide_source_id(topic),
                "source_name": f"[합성] 지방공무원 인사규정 · {meta['label']}",
                "source_url": f"https://example.invalid/synthetic/{topic}",
            }
            for topic, meta in WIDE_TOPICS.items()
        },
        "provisions": provisions,
    }


def main() -> int:
    corpus = build_corpus()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(
        json.dumps(corpus, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"wrote {len(corpus['provisions'])} provisions to {OUTPUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
