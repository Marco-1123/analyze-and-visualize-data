#!/usr/bin/env python3
"""Compile a visual-data-analysis JSON spec into self-contained HTML."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any


SUPPORTED_TYPES = {
    "metrics",
    "line",
    "bar",
    "donut",
    "heatmap",
    "decision",
    "target",
    "range",
    "waterfall",
    "sparkline",
    "insight",
    "table",
    "divider",
}
SUPPORTED_SCHEMA_VERSIONS = {"1.0"}
DECISION_KINDS = {"finding", "interpretation", "risk", "action", "evidence"}
TARGET_DIRECTIONS = {"higher-is-better", "lower-is-better", "neutral"}
TARGET_RANGE_TONES = {"negative", "warning", "positive", "neutral"}
RANGE_SORTS = {
    "none",
    "start-asc",
    "start-desc",
    "end-asc",
    "end-desc",
    "delta-asc",
    "delta-desc",
    "absolute-delta-desc",
}
LINE_ANNOTATION_KINDS = {"fact", "interpretation"}
SEMVER_PATTERN = re.compile(
    r"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)"
    r"(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$"
)
COMPONENT_NOTE_KINDS = {
    "definition",
    "scope",
    "method",
    "limitation",
    "source",
}
FORMAL_LEGACY_NOTE_PATTERN = re.compile(
    r"^(口径|范围|方法|限制|来源|数据状态|definition|scope|method|"
    r"limitation|source|data status)\s*[：:]",
    re.IGNORECASE,
)
AMBIGUOUS_NOTE_PATTERN = re.compile(
    r"(我觉得|感觉|大概|或许|可能不错|应该是|待补充|待确认|先这样|"
    r"暂时|TODO|FIXME|TBD)",
    re.IGNORECASE,
)
ANALYTICAL_CLAIM_NOTE_PATTERN = re.compile(
    r"(收入|利润|订单|销量|转化率|客单价|用户数|访问量|同比|环比)"
    r".{0,16}(增长|下降|提升|减少|集中|高于|低于|领先|落后|贡献|异常|显著)"
)


def fail(message: str) -> None:
    raise ValueError(message)


def is_number(value: Any) -> bool:
    return (
        isinstance(value, (int, float))
        and not isinstance(value, bool)
        and value == value
        and value not in {float("inf"), float("-inf")}
    )


def validate_non_empty_string(value: Any, path: str) -> None:
    if not isinstance(value, str) or not value.strip():
        fail(f"{path} must be a non-empty string")


def validate_string_array(value: Any, path: str, *, allow_empty: bool = True) -> None:
    if not isinstance(value, list) or (not allow_empty and not value):
        suffix = "a non-empty array" if not allow_empty else "an array"
        fail(f"{path} must be {suffix}")
    if not all(isinstance(item, str) and item.strip() for item in value):
        fail(f"{path} must contain non-empty strings")


def validate_evidence_ids(value: Any, path: str, *, required: bool = False) -> None:
    if value is None:
        if required:
            fail(f"{path} is required")
        return
    validate_string_array(value, path, allow_empty=not required)


def validate_sparkline_contract(value: Any, path: str) -> None:
    if not isinstance(value, dict):
        fail(f"{path} must be an object")
    points = value.get("points")
    if not isinstance(points, list) or not points:
        fail(f"{path}.points must be a non-empty array")
    seen_x: set[str] = set()
    numeric_count = 0
    for point_index, point in enumerate(points):
        point_path = f"{path}.points[{point_index}]"
        if not isinstance(point, dict):
            fail(f"{point_path} must be an object")
        x = point.get("x")
        if not isinstance(x, (str, int, float)) or isinstance(x, bool):
            fail(f"{point_path}.x must be a string or number")
        x_key = str(x)
        if x_key in seen_x:
            fail(f"{path}.points x values must be unique and ordered")
        seen_x.add(x_key)
        point_value = point.get("value")
        status = point.get("status", "complete")
        if status not in {"complete", "incomplete", "missing"}:
            fail(
                f"{point_path}.status must be 'complete', 'incomplete', or 'missing'"
            )
        if point_value is None:
            if status != "missing":
                fail(f"{point_path}.value may be null only when status is 'missing'")
        elif not is_number(point_value):
            fail(f"{point_path}.value must be a finite number or null")
        else:
            numeric_count += 1
    if not numeric_count:
        fail(f"{path}.points must contain at least one numeric value")
    if value.get("variant", "line") not in {"line", "bar"}:
        fail(f"{path}.variant must be 'line' or 'bar'")
    if value.get("domainMode", "shared") not in {"shared", "independent"}:
        fail(f"{path}.domainMode must be 'shared' or 'independent'")
    domain = value.get("domain")
    if domain is not None:
        if (
            not isinstance(domain, list)
            or len(domain) != 2
            or not all(is_number(item) for item in domain)
            or domain[0] >= domain[1]
        ):
            fail(f"{path}.domain must be [min, max] with min < max")
    for optional_number in ("baseline", "target"):
        if value.get(optional_number) is not None and not is_number(
            value[optional_number]
        ):
            fail(f"{path}.{optional_number} must be a finite number")


def validate_target_item(item: Any, path: str, *, list_item: bool) -> None:
    if not isinstance(item, dict):
        fail(f"{path} must be an object")
    if list_item:
        validate_non_empty_string(item.get("id"), f"{path}.id")
        validate_non_empty_string(item.get("label"), f"{path}.label")
    if not is_number(item.get("actual")):
        fail(f"{path}.actual must be a finite number")
    if not is_number(item.get("target")):
        fail(f"{path}.target must be a finite number")
    if item.get("direction") not in TARGET_DIRECTIONS:
        fail(f"{path}.direction must be one of {sorted(TARGET_DIRECTIONS)}")
    if item.get("baseline") is not None and not is_number(item.get("baseline")):
        fail(f"{path}.baseline must be a finite number")
    ranges = item.get("ranges")
    if ranges is not None:
        if not isinstance(ranges, list) or not ranges:
            fail(f"{path}.ranges must be a non-empty array")
        previous_to: float | None = None
        for range_index, band in enumerate(ranges):
            band_path = f"{path}.ranges[{range_index}]"
            if not isinstance(band, dict):
                fail(f"{band_path} must be an object")
            if not is_number(band.get("from")) or not is_number(band.get("to")):
                fail(f"{band_path}.from and to must be finite numbers")
            if band["from"] >= band["to"]:
                fail(f"{band_path}.from must be less than to")
            if previous_to is not None and band["from"] < previous_to:
                fail(f"{path}.ranges must be ordered and non-overlapping")
            previous_to = float(band["to"])
            if band.get("tone", "neutral") not in TARGET_RANGE_TONES:
                fail(
                    f"{band_path}.tone must be one of "
                    f"{sorted(TARGET_RANGE_TONES)}"
                )
            if band.get("label") is not None:
                validate_non_empty_string(band["label"], f"{band_path}.label")


def validate_spec(spec: dict[str, Any]) -> None:
    schema_version = spec.get("schemaVersion")
    if schema_version is not None and schema_version not in SUPPORTED_SCHEMA_VERSIONS:
        fail(
            "spec.schemaVersion is unsupported; supported versions are "
            f"{sorted(SUPPORTED_SCHEMA_VERSIONS)}"
        )
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
        validate_evidence_ids(
            component.get("evidenceIds"), f"{path}.evidenceIds"
        )

        if component_type not in {"metrics", "insight", "divider"}:
            if not isinstance(component.get("title"), str) or not component["title"].strip():
                fail(f"{path}.title is required for {component_type}")

        note = component.get("note")
        if note is not None:
            note_text_for_lint = ""
            if isinstance(note, str):
                if not FORMAL_LEGACY_NOTE_PATTERN.match(note.strip()):
                    fail(
                        f"{path}.note free text is ambiguous; use a structured "
                        "note with kind and text, or a formal legacy prefix "
                        "such as '口径：' or '限制：'"
                    )
                note_text_for_lint = note
            elif isinstance(note, dict):
                note_kind = note.get("kind")
                note_text = note.get("text")
                if note_kind not in COMPONENT_NOTE_KINDS:
                    fail(
                        f"{path}.note.kind must be one of "
                        f"{sorted(COMPONENT_NOTE_KINDS)}"
                    )
                if not isinstance(note_text, str) or not note_text.strip():
                    fail(f"{path}.note.text must be a non-empty string")
                note_text_for_lint = note_text
                evidence_ids = note.get("evidenceIds")
                if evidence_ids is not None and (
                    not isinstance(evidence_ids, list)
                    or not all(
                        isinstance(item, str) and item.strip()
                        for item in evidence_ids
                    )
                ):
                    fail(f"{path}.note.evidenceIds must be an array of strings")
            else:
                fail(f"{path}.note must be a string or structured object")
            if AMBIGUOUS_NOTE_PATTERN.search(note_text_for_lint):
                fail(
                    f"{path}.note contains drafting or uncertain language; "
                    "rewrite it as a formal definition, scope, method, "
                    "limitation, or source statement"
                )
            if ANALYTICAL_CLAIM_NOTE_PATTERN.search(note_text_for_lint):
                fail(
                    f"{path}.note appears to contain an analytical claim; "
                    "move findings to the title, insight, annotation, or "
                    "native report prose"
                )

        if component_type == "metrics":
            items = component.get("items")
            if not isinstance(items, list) or not items:
                fail(f"{path}.items must be a non-empty array")
            for item_index, item in enumerate(items):
                item_path = f"{path}.items[{item_index}]"
                if not isinstance(item, dict):
                    fail(f"{item_path} must be an object")
                if item.get("sparkline") is not None:
                    validate_sparkline_contract(
                        item["sparkline"], f"{item_path}.sparkline"
                    )
        elif component_type == "line":
            if not isinstance(component.get("labels"), list):
                fail(f"{path}.labels must be an array")
            if not isinstance(component.get("series"), list) or not component["series"]:
                fail(f"{path}.series must be a non-empty array")
            if component.get("annotation") is not None and component.get(
                "annotations"
            ) is not None:
                fail(f"{path} cannot define both annotation and annotations")
            annotations = component.get("annotations")
            if annotations is not None:
                if not isinstance(annotations, list):
                    fail(f"{path}.annotations must be an array")
                seen_annotation_ids: set[str] = set()
                labels = component.get("labels", [])
                for annotation_index, annotation in enumerate(annotations):
                    annotation_path = (
                        f"{path}.annotations[{annotation_index}]"
                    )
                    if not isinstance(annotation, dict):
                        fail(f"{annotation_path} must be an object")
                    validate_non_empty_string(
                        annotation.get("id"), f"{annotation_path}.id"
                    )
                    if annotation["id"] in seen_annotation_ids:
                        fail(f"{path}.annotations ids must be unique")
                    seen_annotation_ids.add(annotation["id"])
                    validate_non_empty_string(
                        annotation.get("label"),
                        f"{annotation_path}.label",
                    )
                    if annotation.get("kind") not in LINE_ANNOTATION_KINDS:
                        fail(
                            f"{annotation_path}.kind must be 'fact' or "
                            "'interpretation'"
                        )
                    has_index = "index" in annotation
                    has_date = "date" in annotation
                    if has_index == has_date:
                        fail(
                            f"{annotation_path} must define exactly one of "
                            "index or date"
                        )
                    if has_index and (
                        not isinstance(annotation["index"], int)
                        or isinstance(annotation["index"], bool)
                        or annotation["index"] < 0
                        or annotation["index"] >= len(labels)
                    ):
                        fail(f"{annotation_path}.index is outside labels")
                    if has_date and annotation["date"] not in labels:
                        fail(f"{annotation_path}.date must match a line label")
                    if annotation.get("description") is not None:
                        validate_non_empty_string(
                            annotation["description"],
                            f"{annotation_path}.description",
                        )
                    validate_evidence_ids(
                        annotation.get("evidenceIds"),
                        f"{annotation_path}.evidenceIds",
                    )
        elif component_type == "bar":
            categories = component.get("categories")
            values = component.get("values")
            if not isinstance(categories, list) or not isinstance(values, list):
                fail(f"{path}.categories and {path}.values must be arrays")
            if len(categories) != len(values):
                fail(f"{path}.categories and {path}.values must have the same length")
            if not all(isinstance(item, str) and item.strip() for item in categories):
                fail(f"{path}.categories must contain non-empty strings")
            display_categories = component.get("displayCategories")
            if display_categories is not None:
                if not isinstance(display_categories, list):
                    fail(f"{path}.displayCategories must be an array")
                if len(display_categories) != len(categories):
                    fail(
                        f"{path}.displayCategories and {path}.categories "
                        "must have the same length"
                    )
                if not all(
                    isinstance(item, str) and item.strip()
                    for item in display_categories
                ):
                    fail(
                        f"{path}.displayCategories must contain "
                        "non-empty strings"
                    )
            layout = component.get("layout", "auto")
            if layout not in {"auto", "standard", "diverging"}:
                fail(
                    f"{path}.layout must be 'auto', 'standard', or "
                    "'diverging'"
                )
            numeric_values = [
                float(value)
                for value in values
                if isinstance(value, (int, float)) and not isinstance(value, bool)
            ]
            if layout == "diverging" and not (
                any(value < 0 for value in numeric_values)
                and any(value > 0 for value in numeric_values)
            ):
                fail(
                    f"{path}.layout 'diverging' requires at least one "
                    "negative and one positive value"
                )
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
        elif component_type == "decision":
            kind = component.get("kind")
            if kind not in DECISION_KINDS:
                fail(f"{path}.kind must be one of {sorted(DECISION_KINDS)}")
            validate_non_empty_string(component.get("body"), f"{path}.body")
            if component.get("confidence") is not None:
                if component["confidence"] not in {"low", "medium", "high"}:
                    fail(
                        f"{path}.confidence must be 'low', 'medium', or 'high'"
                    )
            if kind == "finding":
                validate_evidence_ids(
                    component.get("evidenceIds"),
                    f"{path}.evidenceIds",
                    required=True,
                )
                if component.get("confidence") is None:
                    fail(f"{path}.confidence is required for finding")
            elif kind == "interpretation":
                validate_non_empty_string(
                    component.get("caveat"), f"{path}.caveat"
                )
                if component.get("confidence") is None:
                    fail(f"{path}.confidence is required for interpretation")
            elif kind == "risk":
                for field in ("likelihood", "impact"):
                    validate_non_empty_string(
                        component.get(field), f"{path}.{field}"
                    )
            elif kind == "action":
                validate_evidence_ids(
                    component.get("evidenceIds"),
                    f"{path}.evidenceIds",
                    required=True,
                )
            for field in ("owner", "due", "status"):
                if component.get(field) is not None:
                    validate_non_empty_string(
                        component[field], f"{path}.{field}"
                    )
            details = component.get("details")
            if details is not None:
                if not isinstance(details, list) or not details:
                    fail(f"{path}.details must be a non-empty array")
                if not all(
                    isinstance(item, str) and item.strip()
                    for item in details
                ):
                    fail(f"{path}.details must contain non-empty strings")
        elif component_type == "target":
            items = component.get("items")
            if items is None:
                validate_target_item(component, path, list_item=False)
            else:
                if any(key in component for key in ("actual", "target", "direction")):
                    fail(
                        f"{path} cannot mix top-level target fields with items"
                    )
                if not isinstance(items, list) or not items:
                    fail(f"{path}.items must be a non-empty array")
                seen_target_ids: set[str] = set()
                for item_index, item in enumerate(items):
                    item_path = f"{path}.items[{item_index}]"
                    validate_target_item(item, item_path, list_item=True)
                    if item["id"] in seen_target_ids:
                        fail(f"{path}.items ids must be unique")
                    seen_target_ids.add(item["id"])
        elif component_type == "range":
            validate_non_empty_string(
                component.get("startLabel"), f"{path}.startLabel"
            )
            validate_non_empty_string(
                component.get("endLabel"), f"{path}.endLabel"
            )
            if component.get("sort", "none") not in RANGE_SORTS:
                fail(f"{path}.sort must be one of {sorted(RANGE_SORTS)}")
            items = component.get("items")
            if not isinstance(items, list) or not items:
                fail(f"{path}.items must be a non-empty array")
            seen_range_ids: set[str] = set()
            for item_index, item in enumerate(items):
                item_path = f"{path}.items[{item_index}]"
                if not isinstance(item, dict):
                    fail(f"{item_path} must be an object")
                validate_non_empty_string(item.get("id"), f"{item_path}.id")
                validate_non_empty_string(
                    item.get("label"), f"{item_path}.label"
                )
                if item.get("displayLabel") is not None:
                    validate_non_empty_string(
                        item["displayLabel"], f"{item_path}.displayLabel"
                    )
                if item["id"] in seen_range_ids:
                    fail(f"{path}.items ids must be unique")
                seen_range_ids.add(item["id"])
                for field in ("start", "end"):
                    if not is_number(item.get(field)):
                        fail(f"{item_path}.{field} must be a finite number")
        elif component_type == "waterfall":
            tolerance = component.get("reconciliationTolerance", 0.01)
            if not is_number(tolerance) or tolerance < 0:
                fail(
                    f"{path}.reconciliationTolerance must be a non-negative "
                    "finite number"
                )
            steps = component.get("steps")
            if not isinstance(steps, list) or len(steps) < 3:
                fail(f"{path}.steps must contain at least three steps")
            seen_step_ids: set[str] = set()
            if not isinstance(steps[0], dict) or not isinstance(steps[-1], dict):
                fail(f"{path}.steps must contain objects")
            if steps[0].get("kind") != "start":
                fail(f"{path}.steps[0].kind must be 'start'")
            if steps[-1].get("kind") != "end":
                fail(f"{path}.steps[-1].kind must be 'end'")
            running: float | None = None
            for step_index, step in enumerate(steps):
                step_path = f"{path}.steps[{step_index}]"
                if not isinstance(step, dict):
                    fail(f"{step_path} must be an object")
                validate_non_empty_string(step.get("id"), f"{step_path}.id")
                validate_non_empty_string(
                    step.get("label"), f"{step_path}.label"
                )
                if step["id"] in seen_step_ids:
                    fail(f"{path}.steps ids must be unique")
                seen_step_ids.add(step["id"])
                kind = step.get("kind")
                if kind not in {"start", "delta", "subtotal", "end"}:
                    fail(
                        f"{step_path}.kind must be start, delta, subtotal, "
                        "or end"
                    )
                if step_index and kind == "start":
                    fail(f"{path}.steps may contain only one start step")
                if not is_number(step.get("value")):
                    fail(f"{step_path}.value must be a finite number")
                value = float(step["value"])
                if kind == "start":
                    running = value
                elif kind == "delta":
                    if running is None:
                        fail(f"{step_path} appears before a start step")
                    running += value
                else:
                    if running is None:
                        fail(f"{step_path} appears before a start step")
                    if abs(value - running) > float(tolerance):
                        fail(
                            f"{step_path}.value does not reconcile with the "
                            f"running total {running:g}"
                        )
        elif component_type == "sparkline":
            validate_sparkline_contract(component, path)
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
    skill_version = (skill_root / "VERSION").read_text(encoding="utf-8").strip()
    if not SEMVER_PATTERN.fullmatch(skill_version):
        fail(f"VERSION is not valid semantic version: {skill_version!r}")
    description = spec.get("description") or spec.get("subtitle") or spec["title"]
    replacements = {
        "__DOCUMENT_TITLE__": str(spec["title"]).replace("<", "").replace(">", ""),
        "__DOCUMENT_DESCRIPTION__": safe_meta_text(description),
        "__SKILL_VERSION__": skill_version,
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
