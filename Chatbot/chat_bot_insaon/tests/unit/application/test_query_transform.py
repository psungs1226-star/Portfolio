import json

import pytest

from insaon.application.query_transform import (
    SYNONYM_DICTIONARY_PATH,
    load_synonym_transformer,
)


def test_practitioner_wording_expands_to_statutory_terms() -> None:
    transformer = load_synonym_transformer()
    assert "육아휴직" in transformer.expand("직원이 애 키우느라 쉬겠다는데요")
    assert "질병휴직" in transformer.expand("아파서 한동안 못 나온다는데요")
    assert "가족돌봄휴직" in transformer.expand("부모님 모시느라 쉬겠답니다")


def test_nothing_expands_when_the_question_already_speaks_statute() -> None:
    """Expanding a statutory question measurably hurt, so it is gated off.

    The first H4 run expanded unconditionally and dropped Set Recall@5 from 1.000 to
    0.882 on the regression set: a question about 부칙과 예외 pulled in every proviso in
    the corpus and displaced the provision it needed.
    """
    transformer = load_synonym_transformer()
    assert transformer.expand("육아휴직 공개 근거와 부칙과 예외를 함께 찾아주세요") == ()
    assert transformer.expand("질병휴직 복직 조문") == ()


def test_unrelated_questions_expand_to_nothing() -> None:
    transformer = load_synonym_transformer()
    assert transformer.expand("오늘 날씨 어때") == ()
    assert transformer.expand("점심 뭐 먹지") == ()


def test_dictionary_must_declare_retrieval_only_scope(tmp_path) -> None:  # type: ignore[no-untyped-def]
    """The scope declaration is the guard against this dictionary filling conditions.

    A dictionary without it must fail loudly rather than be used to decide a leave type.
    """
    payload = json.loads(SYNONYM_DICTIONARY_PATH.read_text(encoding="utf-8"))
    payload["scope"] = "conditions"
    path = tmp_path / "synonyms.json"
    path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    with pytest.raises(ValueError, match="retrieval_expansion_only"):
        load_synonym_transformer(path)
