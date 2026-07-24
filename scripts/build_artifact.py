#!/usr/bin/env python3
"""Compile a visual-data-analysis JSON spec into self-contained HTML."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any


SUPPORTED_TYPES = {
    "metrics",
    "line",
    "bar",
    "donut",
    "heatmap",
    "insight",
    "table",
    "divider",
}


def fail(message: str) -> None:
    raise ValueError(message)


def validate_spec(spec: dict[str, Any]) -> None:
    mode = spec.get("mode")
    if mode not in {"report-component", "dashboard"}:
        fail("spec.mode must be 'report-component' or 'dashboard'")
    if not isinstance(spec.get("title"), str) or not spec["title"].strip():
        fail("spec.title must be a non-empty string")
    components = spec.get("components")
    if not isinstance(components, list) or not components:
        fail("spec.components must be a non-empty array")

    seen_ids: set[str] = set()
    for index, component in enumerate(components):
        path = f"components[{index}]"
        if not isinstance(component, dict):
            fail(f"{path} must be an object")
        component_type = component.get("type")
        if component_type not in SUPPORTED_TYPES:
            fail(f"{path}.type is unsupported: {component_type!r}")
        component_id = component.get("id")
        if not isinstance(component_id, str) or not component_id.strip():
            fail(f"{path}.id must be a non-empty string")
        if component_id in seen_ids:
            fail(f"duplicate component id: {component_id}")
        seen_ids.add(component_id)

        if component_type not in {"metrics", "insight", "divider"}:
            if not isinstance(component.get("title"), str) or not component["title"].strip():
                fail(f"{path}.title is required for {component_type}")

        if component_type == "metrics":
            items = component.get("items")
            if not isinstance(items, list) or not items:
                fail(f"{path}.items must be a non-empty array")
        elif component_type == "line":
            if not isinstance(component.get("labels"), list):
                fail(f"{path}.labels must be an array")
            if not isinstance(component.get("series"), list) or not component["series"]:
                fail(f"{path}.series must be a non-empty array")
        elif component_type == "bar":
            categories = component.get("categories")
            values = component.get("values")
            if not isinstance(categories, list) or not isinstance(values, list):
                fail(f"{path}.categories and {path}.values must be arrays")
            if len(categories) != len(values):
                fail(f"{path}.categories and {path}.values must have the same length")
        elif component_type == "donut":
            if not isinstance(component.get("segments"), list) or not component["segments"]:
                fail(f"{path}.segments must be a non-empty array")
        elif component_type == "heatmap":
            rows = component.get("rows")
            columns = component.get("columns")
            values = component.get("values")
            if not all(isinstance(item, list) for item in (rows, columns, values)):
                fail(f"{path}.rows, columns, and values must be arrays")
            if len(rows) != len(values):
                fail(f"{path}.values row count must match rows")
            if any(len(row) != len(columns) for row in values):
                fail(f"{path}.values column count must match columns")
            layout = component.get("layout", "auto")
            if layout not in {"auto", "single", "stacked-groups"}:
                fail(
                    f"{path}.layout must be 'auto', 'single', or "
                    "'stacked-groups'"
                )
            groups = component.get("columnGroups")
            if groups is not None:
                if not isinstance(groups, list) or not groups:
                    fail(f"{path}.columnGroups must be a non-empty array")
                covered: list[int] = []
                previous_end = -1
                for group_index, group in enumerate(groups):
                    group_path = f"{path}.columnGroups[{group_index}]"
                    if not isinstance(group, dict):
                        fail(f"{group_path} must be an object")
                    start = group.get("start")
                    end = group.get("end")
                    if (
                        not isinstance(start, int)
                        or isinstance(start, bool)
                        or not isinstance(end, int)
                        or isinstance(end, bool)
                    ):
                        fail(f"{group_path}.start and end must be integers")
                    if start < 0 or end >= len(columns) or start > end:
                        fail(f"{group_path} has an invalid inclusive range")
                    if start <= previous_end:
                        fail(f"{path}.columnGroups must be ordered and non-overlapping")
                    previous_end = end
                    covered.extend(range(start, end + 1))
                if covered != list(range(len(columns))):
                    fail(
                        f"{path}.columnGroups must cover every column "
                        "exactly once"
                    )
            if layout == "stacked-groups" and groups is None:
                normalized_hours = []
                for label in columns:
                    normalized = (
                        str(label).strip().replace(" ", "")
                        .removesuffix("时").removesuffix(":00")
                    )
                    normalized_hours.append(
                        int(normalized) if normalized.isdigit() else -1
                    )
                if normalized_hours != list(range(24)):
                    fail(
                        f"{path}.layout 'stacked-groups' requires "
                        "columnGroups unless columns are canonical 0–23 hours"
                    )
        elif component_type == "table":
            if not isinstance(component.get("columns"), list):
                fail(f"{path}.columns must be an array")
            if not isinstance(component.get("rows"), list):
                fail(f"{path}.rows must be an array")


def safe_json_for_script(value: dict[str, Any]) -> str:
    rendered = json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    return (
        rendered.replace("<", "\\u003c")
        .replace(">", "\\u003e")
        .replace("&", "\\u0026")
        .replace("\u2028", "\\u2028")
        .replace("\u2029", "\\u2029")
    )


def safe_meta_text(value: Any) -> str:
    return (
        str(value or "")
        .replace("&", "&amp;")
        .replace('"', "&quot;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def compile_artifact(spec_path: Path, output_path: Path) -> None:
    skill_root = Path(__file__).resolve().parent.parent
    assets = skill_root / "assets"
    spec = json.loads(spec_path.read_text(encoding="utf-8"))
    if not isinstance(spec, dict):
        fail("top-level JSON value must be an object")
    validate_spec(spec)

    shell = (assets / "shell.html").read_text(encoding="utf-8")
    css = (assets / "theme.css").read_text(encoding="utf-8")
    runtime = (assets / "visual-runtime.js").read_text(encoding="utf-8")
    description = spec.get("description") or spec.get("subtitle") or spec["title"]
    replacements = {
        "__DOCUMENT_TITLE__": str(spec["title"]).replace("<", "").replace(">", ""),
        "__DOCUMENT_DESCRIPTION__": safe_meta_text(description),
        "__HEIGHT_MODE__": "viewport" if spec["mode"] == "dashboard" else "auto",
        "/*__THEME_CSS__*/": css,
        "__SPEC_JSON__": safe_json_for_script(spec),
        "/*__VISUAL_RUNTIME__*/": runtime,
    }
    for marker, content in replacements.items():
        if marker not in shell:
            fail(f"asset shell is missing marker: {marker}")
        shell = shell.replace(marker, content)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(shell, encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build a self-contained report component or dashboard HTML file."
    )
    parser.add_argument("--spec", required=True, type=Path, help="Artifact JSON specification")
    parser.add_argument("--output", required=True, type=Path, help="Output HTML path")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        compile_artifact(args.spec.resolve(), args.output.resolve())
    except (OSError, json.JSONDecodeError, ValueError) as error:
        print(f"build failed: {error}", file=sys.stderr)
        return 1
    print(f"built: {args.output.resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
