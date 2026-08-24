from __future__ import annotations

import json
import re
from dataclasses import replace
from datetime import date
from html.parser import HTMLParser
from typing import Any

from insaon.domain import DateRange, ParsedDocument, Provision, QualityIssue, RawSnapshot


class ProvisionParser:
    """Parse an explicit semantic JSON snapshot without character-count chunking."""

    def parse(self, snapshot: RawSnapshot) -> ParsedDocument:
        try:
            payload = json.loads(snapshot.content)
        except json.JSONDecodeError:
            return ParsedDocument(
                snapshot=snapshot,
                provisions=(),
                quality_issues=(QualityIssue("INVALID_JSON", "snapshot is not valid JSON"),),
            )
        raw_provisions = payload.get("provisions")
        if not isinstance(raw_provisions, list):
            return ParsedDocument(
                snapshot=snapshot,
                provisions=(),
                quality_issues=(QualityIssue("MISSING_HIERARCHY", "provisions array is required"),),
            )

        issues: list[QualityIssue] = []
        provisions: list[Provision] = []
        seen: set[str] = set()
        raw_ids = {
            value.get("provision_id")
            for value in raw_provisions
            if isinstance(value, dict) and isinstance(value.get("provision_id"), str)
        }
        for index, raw in enumerate(raw_provisions):
            if not isinstance(raw, dict):
                issues.append(QualityIssue("INVALID_NODE", f"node {index} is not an object"))
                continue
            provision_id = str(raw.get("provision_id", ""))
            if not provision_id or provision_id in seen:
                issues.append(QualityIssue("DUPLICATE_ID", f"duplicate or empty id at {index}"))
                continue
            seen.add(provision_id)
            parent = raw.get("parent_provision_id")
            if parent is not None and parent not in raw_ids:
                issues.append(QualityIssue("ORPHAN_NODE", f"{provision_id} has unknown parent"))
            try:
                valid_from = date.fromisoformat(str(raw.get("effective_from")))
                valid_to_value = raw.get("effective_to")
                valid_to = date.fromisoformat(valid_to_value) if valid_to_value else None
                valid_time = DateRange(valid_from, valid_to)
            except (TypeError, ValueError):
                issues.append(QualityIssue("INVALID_VALID_TIME", provision_id))
                continue
            text = raw.get("text")
            if not isinstance(text, str) or not text.strip():
                issues.append(QualityIssue("EMPTY_TEXT", provision_id))
                continue
            relations = raw.get("relation_ids", [])
            unresolved = [value for value in relations if value not in raw_ids]
            if unresolved:
                issues.append(
                    QualityIssue(
                        "UNRESOLVED_RELATION",
                        f"{provision_id}: {','.join(str(value) for value in unresolved)}",
                        fatal=False,
                    )
                )
            provisions.append(
                self._to_provision(snapshot, raw, valid_time, relations)
            )
        supplements = tuple(
            provision.provision_id
            for provision in provisions
            if "supplementary" in provision.topic_tags
        )
        return ParsedDocument(snapshot, tuple(provisions), tuple(issues), supplements)

    @staticmethod
    def _to_provision(
        snapshot: RawSnapshot,
        raw: dict[str, Any],
        valid_time: DateRange,
        relations: list[Any],
    ) -> Provision:
        return Provision(
            provision_id=str(raw["provision_id"]),
            source_id=snapshot.source_id,
            article_path=str(raw.get("article_path", "")),
            title=str(raw.get("title", "")),
            text=str(raw["text"]),
            valid_time=valid_time,
            applies_to=frozenset(str(value) for value in raw.get("applies_to", [])),
            topic_tags=frozenset(str(value) for value in raw.get("topic_tags", [])),
            parent_provision_id=raw.get("parent_provision_id"),
            proviso_text=raw.get("proviso_text"),
            relation_ids=tuple(str(value) for value in relations),
            source_hash=snapshot.content_hash,
        )


_ARTICLE = re.compile(r"^제(?P<number>\d+)조(?P<sub>의\d+)?\((?P<title>[^)]+)\)\s*(?P<body>.*)$")
_DELETED_ARTICLE = re.compile(
    r"^제\d+조(?:의\d+)?\s+삭제(?:\s+<[^>]+>)?$"
)
_ITEM = re.compile(r"^(?P<number>\d+(?:의\d+)?)\.\s*(?P<body>.*)$")
_SUBITEM = re.compile(r"^(?P<label>[가-하])\.\s*(?P<body>.*)$")
_ARTICLE_REFERENCE = re.compile(r"제(?P<number>\d+)조(?P<sub>의\d+)?")
_CIRCLED = {
    value: index
    for index, value in enumerate("①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳", start=1)
}


class _ParagraphCollector(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.paragraphs: list[tuple[str, str]] = []
        self._depth = 0
        self._class_name = ""
        self._parts: list[str] = []

    def handle_starttag(
        self, tag: str, attrs: list[tuple[str, str | None]]
    ) -> None:
        if tag == "p" and self._depth == 0:
            attributes = dict(attrs)
            self._class_name = attributes.get("class") or ""
            self._parts = []
            self._depth = 1
        elif self._depth:
            self._depth += 1

    def handle_endtag(self, tag: str) -> None:
        if not self._depth:
            return
        self._depth -= 1
        if self._depth == 0 and tag == "p":
            text = " ".join("".join(self._parts).split())
            if text:
                self.paragraphs.append((self._class_name, text))
            self._class_name = ""
            self._parts = []

    def handle_data(self, data: str) -> None:
        if self._depth:
            self._parts.append(data)


class OfficialHtmlProvisionParser:
    """Parse National Law Information Center semantic paragraph classes."""

    parser_version = "official-html-v0.2.0"

    def parse(self, snapshot: RawSnapshot) -> ParsedDocument:
        if snapshot.content_type != "text/html":
            return ParsedDocument(
                snapshot=snapshot,
                provisions=(),
                quality_issues=(
                    QualityIssue("UNSUPPORTED_CONTENT_TYPE", snapshot.content_type),
                ),
            )
        collector = _ParagraphCollector()
        collector.feed(snapshot.content)
        provisions: list[Provision] = []
        issues: list[QualityIssue] = []
        current_article: Provision | None = None
        current_paragraph: Provision | None = None
        current_item: Provision | None = None
        current_supplement: Provision | None = None
        supplement_count = 0
        supplement_child_count = 0

        for class_name, text in collector.paragraphs:
            if class_name == "pty1_p4":
                article = self._article(snapshot, text)
                if article is None:
                    issue_code = (
                        "DELETED_ARTICLE_TOMBSTONE"
                        if _DELETED_ARTICLE.fullmatch(text)
                        else "UNPARSED_ARTICLE"
                    )
                    issues.append(
                        QualityIssue(
                            issue_code,
                            text[:160],
                            fatal=False,
                        )
                    )
                    continue
                current_article, paragraph = article
                provisions.append(current_article)
                if paragraph is not None:
                    provisions.append(paragraph)
                current_paragraph = paragraph
                current_item = None
                current_supplement = None
                continue

            if class_name == "pty1_de2_1" and current_article is not None:
                paragraph = self._paragraph(snapshot, current_article, text)
                if paragraph is not None:
                    provisions.append(paragraph)
                    current_paragraph = paragraph
                    current_item = None
                continue

            if class_name == "pty1_de2h" and current_article is not None:
                item = self._item(snapshot, current_article, current_paragraph, text)
                if item is not None:
                    provisions.append(item)
                    current_item = item
                continue

            if class_name == "pty1_de3" and current_article is not None:
                subitem = self._subitem(
                    snapshot,
                    current_article,
                    current_paragraph,
                    current_item,
                    text,
                )
                if subitem is not None:
                    provisions.append(subitem)
                continue

            if class_name == "pty3":
                supplement_count += 1
                supplement_child_count = 0
                current_supplement = self._supplement_header(
                    snapshot, supplement_count, text
                )
                provisions.append(current_supplement)
                current_article = None
                current_paragraph = None
                current_item = None
                continue

            if class_name.startswith("pty3_dep") and current_supplement is not None:
                supplement_child_count += 1
                provisions.append(
                    self._supplement_child(
                        snapshot,
                        current_supplement,
                        supplement_child_count,
                        text,
                    )
                )

        if not provisions:
            issues.append(
                QualityIssue("MISSING_HIERARCHY", "no semantic legal paragraphs parsed")
            )
        provisions = self._resolve_article_relations(provisions)
        provision_ids = {provision.provision_id for provision in provisions}
        for provision in provisions:
            if (
                provision.parent_provision_id is not None
                and provision.parent_provision_id not in provision_ids
            ):
                issues.append(
                    QualityIssue("ORPHAN_NODE", provision.provision_id)
                )
        supplementary_ids = tuple(
            provision.provision_id
            for provision in provisions
            if "supplementary" in provision.topic_tags
        )
        return ParsedDocument(
            snapshot=snapshot,
            provisions=tuple(provisions),
            quality_issues=tuple(issues),
            supplementary_ids=supplementary_ids,
        )

    def _article(
        self, snapshot: RawSnapshot, text: str
    ) -> tuple[Provision, Provision | None] | None:
        match = _ARTICLE.match(text)
        if match is None:
            return None
        article_label = f"제{match.group('number')}조{match.group('sub') or ''}"
        article_id = f"{snapshot.source_id}:article:{match.group('number')}{match.group('sub') or ''}"
        body = match.group("body").strip()
        paragraph_number, paragraph_body = _leading_paragraph(body)
        article_text = body if paragraph_number is None and body else article_label
        article = self._provision(
            snapshot,
            provision_id=article_id,
            article_path=article_label,
            title=match.group("title"),
            text=article_text,
            parent=None,
        )
        if paragraph_number is None:
            return article, None
        paragraph = self._provision(
            snapshot,
            provision_id=f"{article_id}:paragraph:{paragraph_number}",
            article_path=f"{article_label} 제{paragraph_number}항",
            title=match.group("title"),
            text=paragraph_body,
            parent=article_id,
        )
        return article, paragraph

    def _paragraph(
        self, snapshot: RawSnapshot, article: Provision, text: str
    ) -> Provision | None:
        number, body = _leading_paragraph(text)
        if number is None or not body:
            return None
        return self._provision(
            snapshot,
            provision_id=f"{article.provision_id}:paragraph:{number}",
            article_path=f"{article.article_path} 제{number}항",
            title=article.title,
            text=body,
            parent=article.provision_id,
        )

    def _item(
        self,
        snapshot: RawSnapshot,
        article: Provision,
        paragraph: Provision | None,
        text: str,
    ) -> Provision | None:
        match = _ITEM.match(text)
        if match is None:
            return None
        parent = paragraph or article
        number = match.group("number")
        return self._provision(
            snapshot,
            provision_id=f"{parent.provision_id}:item:{number}",
            article_path=(
                f"{parent.article_path} 제{number.split('의', 1)[0]}호"
                + (f"의{number.split('의', 1)[1]}" if "의" in number else "")
            ),
            title=article.title,
            text=match.group("body"),
            parent=parent.provision_id,
        )

    def _subitem(
        self,
        snapshot: RawSnapshot,
        article: Provision,
        paragraph: Provision | None,
        item: Provision | None,
        text: str,
    ) -> Provision | None:
        match = _SUBITEM.match(text)
        if match is None:
            return None
        parent = item or paragraph or article
        label = match.group("label")
        return self._provision(
            snapshot,
            provision_id=f"{parent.provision_id}:subitem:{label}",
            article_path=f"{parent.article_path} {label}목",
            title=article.title,
            text=match.group("body"),
            parent=parent.provision_id,
        )

    def _supplement_header(
        self, snapshot: RawSnapshot, number: int, text: str
    ) -> Provision:
        return self._provision(
            snapshot,
            provision_id=f"{snapshot.source_id}:supplement:{number}",
            article_path=f"부칙 {number}",
            title="부칙",
            text=text,
            parent=None,
            extra_tags={"supplementary"},
        )

    def _supplement_child(
        self,
        snapshot: RawSnapshot,
        supplement: Provision,
        number: int,
        text: str,
    ) -> Provision:
        return self._provision(
            snapshot,
            provision_id=f"{supplement.provision_id}:provision:{number}",
            article_path=f"{supplement.article_path} 제{number}항목",
            title="부칙",
            text=text,
            parent=supplement.provision_id,
            extra_tags={"supplementary"},
        )

    @staticmethod
    def _provision(
        snapshot: RawSnapshot,
        *,
        provision_id: str,
        article_path: str,
        title: str,
        text: str,
        parent: str | None,
        extra_tags: set[str] | None = None,
    ) -> Provision:
        tags = _topic_tags(text)
        if extra_tags:
            tags.update(extra_tags)
        proviso_index = text.find("다만,")
        proviso = text[proviso_index:] if proviso_index >= 0 else None
        return Provision(
            provision_id=provision_id,
            source_id=snapshot.source_id,
            article_path=article_path,
            title=title,
            text=text,
            valid_time=DateRange(snapshot.effective_from, snapshot.effective_to),
            applies_to=frozenset({"local_general_service"}),
            topic_tags=frozenset(tags),
            parent_provision_id=parent,
            proviso_text=proviso,
            source_hash=snapshot.content_hash,
        )

    @staticmethod
    def _resolve_article_relations(
        provisions: list[Provision],
    ) -> list[Provision]:
        articles: dict[str, str] = {}
        for provision in provisions:
            match = re.fullmatch(r"제(\d+)조(의\d+)?", provision.article_path)
            if match:
                articles[f"{match.group(1)}{match.group(2) or ''}"] = provision.provision_id
        resolved: list[Provision] = []
        for provision in provisions:
            relation_ids: list[str] = []
            for match in _ARTICLE_REFERENCE.finditer(
                f"{provision.text} {provision.proviso_text or ''}"
            ):
                target = articles.get(f"{match.group('number')}{match.group('sub') or ''}")
                if target and target != provision.provision_id and target not in relation_ids:
                    relation_ids.append(target)
            resolved.append(replace(provision, relation_ids=tuple(relation_ids)))
        return resolved


def _leading_paragraph(text: str) -> tuple[int | None, str]:
    if not text:
        return None, ""
    number = _CIRCLED.get(text[0])
    if number is None:
        return None, text
    return number, text[1:].strip()


def _topic_tags(text: str) -> set[str]:
    tags: set[str] = set()
    if any(keyword in text for keyword in ("질병", "부상", "장기요양", "장애")):
        tags.add("medical_leave")
    if any(keyword in text for keyword in ("자녀", "육아", "임신", "출산")):
        tags.add("parental_leave")
    if any(keyword in text for keyword in ("돌봄", "부양", "조부모", "손자녀")):
        tags.add("family_care_leave")
    if any(keyword in text for keyword in ("자기개발", "학습", "연구과제")):
        tags.add("self_development_leave")
    if "복직" in text:
        tags.add("reinstatement")
    return tags
