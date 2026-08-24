"""검증기는 인용이 실재하고 유효한지만 봤지, claim이 그 인용에서 나왔는지는 안 봤다.

실모델 1회 실행에서 Qwen3 4B가 "육아휴직 기간은 자녀 출생 후 6개월 이내로 인정됩니다"를
만들었다. corpus 101건 어디에도 `6개월`도 `출생 후`도 없다. 인용은 전부 실재하고 기준일에
유효했으므로 검증을 통과해 `ANSWERABLE`로 나갔다.

여기서 막는 것은 수량이다. 기간·횟수·비율은 이 도메인에서 결론을 바꾸는 값이고, 인용문에
없는 수량은 모델이 만든 것이다. 문장 전체의 함의는 검사하지 않는다.
"""

from insaon.application.grounding import ungrounded_quantities


def test_quantity_absent_from_every_cited_text_is_reported() -> None:
    unsupported = ungrounded_quantities(
        claim_text="육아휴직 기간은 자녀 출생 후 6개월 이내로 인정됩니다.",
        cited_texts=("육아휴직 검토에는 자녀와 기존 기간 조건을 확인한다.",),
        allowed_values=(),
    )

    assert unsupported == ("6개월",)


def test_quantity_present_in_a_cited_text_is_accepted() -> None:
    unsupported = ungrounded_quantities(
        claim_text="육아휴직은 자녀 1명당 3년까지 사용할 수 있습니다.",
        cited_texts=("자녀 1명에 대하여 3년 이내로 휴직할 수 있다.",),
        allowed_values=(),
    )

    assert unsupported == ()


def test_quantity_supplied_by_the_asker_is_accepted() -> None:
    """질문자가 준 기준일·생년월일을 답변이 되풀이하는 것은 환각이 아니다."""
    unsupported = ungrounded_quantities(
        claim_text="기준일 2026년 3월 2일 기준 자녀 생년월일은 2024년 5월 10일입니다.",
        cited_texts=("육아휴직 검토에는 자녀와 기존 기간 조건을 확인한다.",),
        allowed_values=("2026-03-02", "2024-05-10"),
    )

    assert unsupported == ()


def test_computed_rule_output_is_accepted_when_declared() -> None:
    """정근수당 지급률처럼 규칙엔진이 계산한 값은 인용문에 없어도 근거가 있다."""
    unsupported = ungrounded_quantities(
        claim_text="정근수당액 대비 100%로 판단되며 실제 근무기간은 6개월입니다.",
        cited_texts=("제6조제1항에 따른 정근수당액을 지급한다.",),
        allowed_values=("100%", "6개월"),
    )

    assert unsupported == ()


def test_spacing_between_number_and_unit_does_not_hide_support() -> None:
    unsupported = ungrounded_quantities(
        claim_text="휴직 기간은 3 년입니다.",
        cited_texts=("휴직 기간은 3년으로 한다.",),
        allowed_values=(),
    )

    assert unsupported == ()


def test_every_ungrounded_quantity_is_reported_in_order() -> None:
    unsupported = ungrounded_quantities(
        claim_text="2회까지 분할할 수 있고 총 5년까지 가능합니다.",
        cited_texts=("분할 사용에 관하여 정한다.",),
        allowed_values=(),
    )

    assert unsupported == ("2회", "5년")


def test_claim_without_any_quantity_is_not_blocked() -> None:
    """수량이 없는 문장은 이 검사의 대상이 아니다. 함의 검증이 아니라는 뜻이다."""
    unsupported = ungrounded_quantities(
        claim_text="자녀 돌봄에 해당하는 육아휴직은 가족돌봄휴직과 구분해 검토해야 합니다.",
        cited_texts=("육아휴직과 가족돌봄휴직의 사용 요건이 다르다.",),
        allowed_values=(),
    )

    assert unsupported == ()


def test_a_date_the_statute_writes_in_its_own_notation_is_not_an_invention() -> None:
    """법령 원문은 `2012. 3. 21.`로 쓰고 문장은 `2012년 3월 21일`로 되풀이한다.

    같은 날짜다. 표기만 다른데 수량 토큰으로 쪼개 비교하면 `2012년`·`3월`·`21일`이 인용문에
    없는 값으로 잡힌다. local 프로필에서 승진 질문이 `claim_quantity_unsupported`로 막힌
    실제 원인이 이것이다. 모델은 인용문을 정확히 옮겼는데 게이트가 환각으로 판정했다.
    """
    unsupported = ungrounded_quantities(
        claim_text="해당 조항은 2012년 3월 21일과 2021년 10월 8일에 개정되었습니다.",
        cited_texts=(
            "승진후보자 명부는 시·도지사가 작성한다. <개정 2012. 3. 21., 2021. 10. 8.>",
        ),
        allowed_values=(),
    )

    assert unsupported == ()


def test_a_date_no_source_contains_is_still_reported() -> None:
    """날짜를 수량 검사에서 빼는 것이 아니라 날짜로서 검사한다.

    앞 테스트가 표기 차이를 허용한다고 해서 모델이 시행일을 지어내도 된다는 뜻은 아니다.
    """
    unsupported = ungrounded_quantities(
        claim_text="이 규정은 2019년 5월 1일부터 시행됩니다.",
        cited_texts=("승진후보자 명부는 시·도지사가 작성한다. <개정 2012. 3. 21.>",),
        allowed_values=(),
    )

    assert unsupported == ("2019-05-01",)


def test_a_date_the_asker_supplied_is_accepted_in_any_notation() -> None:
    unsupported = ungrounded_quantities(
        claim_text="2024년 7월 1일 기준으로 검토했습니다.",
        cited_texts=("승진임용의 방법에 관하여 정한다.",),
        allowed_values=("2024-07-01",),
    )

    assert unsupported == ()


def test_a_bare_year_is_still_checked_as_a_quantity() -> None:
    """`2012년 3월 21일`은 날짜지만 `3년`은 기간이다. 날짜 처리가 기간을 덮으면 안 된다."""
    unsupported = ungrounded_quantities(
        claim_text="휴직은 2012년 3월 21일 개정 이후 3년까지 가능합니다.",
        cited_texts=("휴직에 관하여 정한다. <개정 2012. 3. 21.>",),
        allowed_values=(),
    )

    assert unsupported == ("3년",)
