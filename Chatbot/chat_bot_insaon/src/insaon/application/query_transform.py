"""Widen retrieval candidates across the practitioner/statutory vocabulary gap.

A 담당자 writes "출산 후 언제부터 쉴 수 있나요"; the statute says 육아휴직. Neither the
char 2-gram retriever nor the string-containment classifier bridges that, so the correct
provision is never a candidate and no amount of reranking recovers it.

This module closes the gap in retrieval only. It deliberately does **not** feed the
condition extractor: guessing that the question means 육아휴직 would fill a ``core``
condition the questioner never stated, and an incorrect leave type changes the entire
conclusion rather than degrading it. Unconfirmed facts stay in ``missing_conditions``
and get asked back.

The dictionary lives in ``data/query/synonyms.json`` rather than in code so it can be
reviewed as data. Changing it changes retrieval results, so it is versioned.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

SYNONYM_DICTIONARY_PATH = Path(__file__).resolve().parents[3] / "data/query/synonyms.json"


@dataclass(frozen=True)
class SynonymEntry:
    surfaces: tuple[str, ...]
    statutory: tuple[str, ...]


class SynonymQueryTransformer:
    """Deterministic practitioner-phrase to statutory-term expansion.

    Deterministic on purpose: retrieval candidates must be reproducible across runs for
    the ablation to mean anything, and a model call here would make every evaluation
    depend on a downloaded model.
    """

    def __init__(self, entries: tuple[SynonymEntry, ...], dictionary_id: str) -> None:
        self._entries = entries
        self._dictionary_id = dictionary_id
        self._statutory_vocabulary = frozenset(
            term for entry in entries for term in entry.statutory
        )

    @property
    def implementation_id(self) -> str:
        return f"synonym-expansion-v1:{self._dictionary_id}"

    def expand(self, query: str) -> tuple[str, ...]:
        """Return the statutory terms this question implies, in dictionary order.

        Terms, not rewritten queries. The caller decides how to use them, and it needs
        both forms: a standalone term query, because appending 질병휴직 to a thirty
        character practitioner sentence barely moves a length-normalised character
        n-gram score, and a combined query for scoring stages that must still see what
        was actually asked.

        An empty result means no surface form matched, and the pipeline must then behave
        exactly as it would without this stage.

        Nothing is expanded when the question already speaks statute. This dictionary
        exists to bridge a gap; where the questioner has already crossed it there is
        nothing to bridge, and expanding anyway measurably hurts. The first H4 run
        expanded unconditionally and dropped Set Recall@5 from 1.000 to 0.882 on the
        regression set, because a question asking about 부칙과 예외 pulled in every
        proviso in the corpus and displaced the provision it actually needed.
        """
        if any(term in query for term in self._statutory_vocabulary):
            return ()
        matched: list[str] = []
        for entry in self._entries:
            if any(surface in query for surface in entry.surfaces):
                for term in entry.statutory:
                    if term not in matched and term not in query:
                        matched.append(term)
        return tuple(matched)


def load_synonym_transformer(
    path: Path = SYNONYM_DICTIONARY_PATH,
) -> SynonymQueryTransformer:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if payload.get("scope") != "retrieval_expansion_only":
        raise ValueError(
            "synonym dictionary must declare scope=retrieval_expansion_only; "
            "this dictionary must never be used to fill conditions"
        )
    entries = tuple(
        SynonymEntry(
            surfaces=tuple(str(value) for value in item["surface"]),
            statutory=tuple(str(value) for value in item["statutory"]),
        )
        for item in payload["entries"]
    )
    return SynonymQueryTransformer(entries, str(payload["dictionary_id"]))
