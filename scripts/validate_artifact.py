#!/usr/bin/env python3
"""Validate a generated visual-data-analysis HTML artifact."""

from __future__ import annotations

import argparse
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from typing import Any


FEISHU_HTML_MAX_BYTES = 500 * 1024


class StructureParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.tags: dict[str, int] = {}
        self.has_lang = False
        self.has_viewport = False
        self.has_main = False
        self.has_h1 = False
        self.tables_without_headers = 0
        self._in_table = False
        self._table_has_th = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.tags[tag] = self.tags.get(tag, 0) + 1
        attr_map = dict(attrs)
        if tag == "html" and attr_map.get("lang"):
            self.has_lang = True
        if tag == "meta" and attr_map.get("name") == "viewport":
            self.has_viewport = True
        if tag == "main":
            self.has_main = True
        if tag == "h1":
            self.has_h1 = True
        if tag == "table":
            self._in_table = True
            self._table_has_th = False
        if tag == "th" and self._in_table:
            self._table_has_th = True

    def handle_endtag(self, tag: str) -> None:
        if tag == "table" and self._in_table:
            if not self._table_has_th:
                self.tables_without_headers += 1
            self._in_table = False


def extract_spec(text: str) -> dict[str, Any] | None:
    match = re.search(r"window\.__VDA_SPEC__\s*=\s*(\{.*?\});\s*</script>", text, re.DOTALL)
    if not match:
        return None
    try:
        value = json.loads(match.group(1))
    except json.JSONDecodeError:
        return None
    return value if isinstance(value, dict) else None


def validate(path: Path) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    text = path.read_text(encoding="utf-8")
    parser = StructureParser()
    parser.feed(text)

    if not parser.has_lang:
        errors.append("html lang attribute is missing")
    if not parser.has_viewport:
        errors.append("viewport meta tag is missing")
    if not parser.has_main:
        errors.append("semantic main element is missing")
    if not parser.has_h1 and 'class="vda-title"' not in text:
        errors.append("page h1 is missing")
    if parser.tables_without_headers:
        errors.append("one or more tables do not contain th headers")
    if "data-vda-ready" in text:
        warnings.append("unexpected literal data-vda-ready marker found")
    if "__DOCUMENT_TITLE__" in text or "/*__THEME_CSS__*/" in text or "__SPEC_JSON__" in text:
        errors.append("unresolved build markers found")
    if "__HEIGHT_MODE__" in text or "__DOCUMENT_DESCRIPTION__" in text:
        errors.append("unresolved Feishu HTML block markers found")
    if "__SKILL_VERSION__" in text:
        errors.append("unresolved Skill version marker found")
    if '<meta name="use-iframe" content="true">' not in text:
        errors.append("Feishu iframe meta tag is missing")
    if not re.search(r'<meta name="html-box-height-mode" content="(?:auto|viewport)">', text):
        errors.append("Feishu html-box-height-mode must be auto or viewport")
    if not re.search(r'<meta name="description" content="[^"]+">', text):
        errors.append("Feishu HTML block description is missing")
    if not re.search(
        r'<meta name="generator" content="analyze-and-visualize-data '
        r'(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)'
        r'(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?">',
        text,
    ):
        errors.append("Skill generator semantic-version metadata is missing")
    if re.search(r"\b(TODO|FIXME|PLACEHOLDER)\b", text):
        errors.append("unfinished placeholder text found")
    if re.search(r"<script[^>]+\bsrc\s*=", text, re.IGNORECASE):
        errors.append("external script dependency found")
    if re.search(r"<link[^>]+\brel=[\"']stylesheet[\"']", text, re.IGNORECASE):
        errors.append("external stylesheet dependency found")
    if re.search(r"(?:file://|/Users/|[A-Za-z]:\\\\Users\\\\)", text):
        errors.append("local absolute file path found")
    if re.search(r"(api[_-]?key|access[_-]?token|client[_-]?secret)\s*[:=]\s*[\"'][^\"']{8,}", text, re.IGNORECASE):
        errors.append("possible secret found")
    artifact_size = len(text.encode("utf-8"))
    if artifact_size > FEISHU_HTML_MAX_BYTES:
        errors.append(
            f"artifact exceeds Feishu HTML block limit: "
            f"{artifact_size} bytes > {FEISHU_HTML_MAX_BYTES} bytes"
        )

    spec = extract_spec(text)
    if spec is None:
        errors.append("embedded artifact specification is missing or invalid")
    else:
        if spec.get("mode") not in {"report-component", "dashboard"}:
            errors.append("embedded spec has invalid mode")
        expected_height_mode = (
            "viewport" if spec.get("mode") == "dashboard" else "auto"
        )
        if (
            f'<meta name="html-box-height-mode" content="{expected_height_mode}">'
            not in text
        ):
            errors.append(
                f"{spec.get('mode')} must use Feishu height mode "
                f"{expected_height_mode}"
            )
        if not spec.get("title"):
            errors.append("embedded spec has no title")
        components = spec.get("components")
        if not isinstance(components, list) or not components:
            errors.append("embedded spec has no components")
        else:
            ids = [component.get("id") for component in components if isinstance(component, dict)]
            if len(ids) != len(set(ids)):
                errors.append("component ids are not unique")
            for component in components:
                if not isinstance(component, dict):
                    continue
                if component.get("type") in {
                    "line",
                    "bar",
                    "donut",
                    "heatmap",
                    "table",
                    "decision",
                    "target",
                    "range",
                    "waterfall",
                    "sparkline",
                }:
                    if not component.get("title"):
                        errors.append(f"visual component {component.get('id')} has no title")
                    if not component.get("ariaLabel"):
                        warnings.append(f"visual component {component.get('id')} has no explicit ariaLabel")
    return errors, warnings


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate a self-contained HTML analysis artifact.")
    parser.add_argument("artifact", type=Path)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        errors, warnings = validate(args.artifact.resolve())
    except (OSError, UnicodeDecodeError) as error:
        print(f"validation failed: {error}", file=sys.stderr)
        return 1
    for warning in warnings:
        print(f"warning: {warning}")
    for error in errors:
        print(f"error: {error}", file=sys.stderr)
    if errors:
        print(f"FAILED: {len(errors)} error(s), {len(warnings)} warning(s)", file=sys.stderr)
        return 1
    print(f"PASS: {args.artifact.resolve()} ({len(warnings)} warning(s))")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
