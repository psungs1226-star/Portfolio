"""Which provisions may become retrieval candidates at all.

Parsing a statute into 조·항·호·목 produces nodes that hold structure rather than
content. A 조 node whose children carry every sentence is left with its own article
number as its text, and a clause removed by amendment is left with the tombstone the
publisher prints in its place. Neither can answer a question, but both entered the
lexical and vector indexes with the same standing as every other provision.

Across eight topics and 21 queries, 35.2% of the top-5 slots were these nodes. Two of
the five citations a reviewer reads were blank.

They stay in the corpus. `article_path` reconstruction, parent traversal and relation
expansion all pass through them. What is withdrawn is only their eligibility to be
returned as evidence.

Length is deliberately not a criterion. `7급, 8급 및 9급: 1년 이상` is eleven characters
and is the answer to the most common promotion question.
"""

from __future__ import annotations

import re
from collections.abc import Sequence

from insaon.domain import Provision

# 개정으로 삭제된 조항에 발행처가 남기는 표기. `삭제 <2013. 11. 20.>` 형태다.
_TOMBSTONE = re.compile(r"^삭제\s*[<(]")


def is_searchable(provision: Provision) -> bool:
    text = provision.text.strip()
    if not text:
        return False
    if text == provision.article_path.strip():
        return False
    return not _TOMBSTONE.match(text)


def searchable_provisions(provisions: Sequence[Provision]) -> tuple[Provision, ...]:
    return tuple(item for item in provisions if is_searchable(item))
