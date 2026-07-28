#!/usr/bin/env python3
"""Validate the analysis plan, evidence ledger, component specs, and report manifest."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from build_artifact import SUPPORTED_TYPES, validate_spec


SCHEMA_VERSION = "1.0"
ANALYSIS_MODES = {"single-entity", "multi-entity"}
OUTPUT_MODES = {"report", "dashboard"}
ENTITY_SCOPES = {"single", "selected", "all", "portfolio"}
LEDGER_COLLECTIONS = {
    "facts",
    "series",
    "findings",
    "events",
    "methods",
    "limitations",
    "recommendations",
}


def fail(message: str) -> None:
    raise ValueError(message)


def load_json(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        fail(f"{path}: cannot read valid JSON: {error}")
    if not isinstance(value, dict):
        fail(f"{path}: root must be an object")
    return value


def require_string(value: Any, path: str) -> str:
    if not isinstance(value, str) or not value.strip():
        fail(f"{path} must be a non-empty string")
    return value


def require_string_list(
    value: Any, path: str, *, allow_empty: bool = True
) -> list[str]:
    if not isinstance(value, list) or (not allow_empty and not value):
        suffix = "a non-empty array" if not allow_empty else "an array"
        fail(f"{path} must be {suffix}")
    if not all(isinstance(item, str) and item.strip() for item in value):
        fail(f"{path} must contain non-empty strings")
    if len(value) != len(set(value)):
        fail(f"{path} must not contain duplicates")
    return value


def validate_catalog(catalog: dict[str, Any], root: Path) -> dict[str, dict[str, Any]]:
    if catalog.get("schemaVersion") != SCHEMA_VERSION:
        fail(f"component catalog schemaVersion must be {SCHEMA_VERSION}")
    entries = catalog.get("components")
    if not isinstance(entries, list) or not entries:
        fail("component catalog components must be a non-empty array")
    by_type: dict[str, dict[str, Any]] = {}
    for index, entry in enumerate(entries):
        path = f"component catalog components[{index}]"
        if not isinstance(entry, dict):
            fail(f"{path} must be an object")
        component_type = require_string(entry.get("type"), f"{path}.type")
        if component_type in by_type:
            fail(f"component catalog type {component_type!r} is duplicated")
        require_string_list(entry.get("questions"), f"{path}.questions", allow_empty=False)
        require_string_list(entry.get("dataShapes"), f"{path}.dataShapes", allow_empty=False)
        multi = entry.get("multiEntity")
        if not isinstance(multi, dict):
            fail(f"{path}.multiEntity must be an object")
        support = multi.get("support")
        if support not in {"native", "selective", "portfolio-only"}:
            fail(f"{path}.multiEntity.support is invalid")
        max_entities = multi.get("maxEntities")
        if (
            not isinstance(max_entities, int)
            or isinstance(max_entities, bool)
            or not 1 <= max_entities <= 10
        ):
            fail(f"{path}.multiEntity.maxEntities must be an integer from 1 to 10")
        fallback = multi.get("fallback")
        if fallback is not None and (
            not isinstance(fallback, str) or fallback not in SUPPORTED_TYPES
        ):
            fail(f"{path}.multiEntity.fallback must be a supported component type or null")
        example = require_string(entry.get("example"), f"{path}.example")
        if not (root / example).is_file():
            fail(f"{path}.example does not exist: {example}")
        by_type[component_type] = entry
    declared_types = set(by_type)
    if declared_types != SUPPORTED_TYPES:
        missing = sorted(SUPPORTED_TYPES - declared_types)
        extra = sorted(declared_types - SUPPORTED_TYPES)
        fail(f"component catalog/runtime mismatch; missing={missing}, extra={extra}")
    return by_type


def validate_recipes(
    recipes: dict[str, Any], catalog: dict[str, dict[str, Any]]
) -> dict[str, dict[str, Any]]:
    if recipes.get("schemaVersion") != SCHEMA_VERSION:
        fail(f"analysis recipes schemaVersion must be {SCHEMA_VERSION}")
    entries = recipes.get("recipes")
    if not isinstance(entries, list) or not entries:
        fail("analysis recipes must be a non-empty array")
    by_id: dict[str, dict[str, Any]] = {}
    for index, recipe in enumerate(entries):
        path = f"analysis recipes[{index}]"
        if not isinstance(recipe, dict):
            fail(f"{path} must be an object")
        recipe_id = require_string(recipe.get("id"), f"{path}.id")
        if recipe_id in by_id:
            fail(f"analysis recipe {recipe_id!r} is duplicated")
        require_string(recipe.get("label"), f"{path}.label")
        modes = set(
            require_string_list(
                recipe.get("allowedModes"), f"{path}.allowedModes", allow_empty=False
            )
        )
        if not modes <= OUTPUT_MODES:
            fail(f"{path}.allowedModes contains unsupported values")
        analysis_modes = set(
            require_string_list(
                recipe.get("analysisModes"), f"{path}.analysisModes", allow_empty=False
            )
        )
        if not analysis_modes <= ANALYSIS_MODES:
            fail(f"{path}.analysisModes contains unsupported values")
        required_roles = set(
            require_string_list(
                recipe.get("requiredSectionRoles"),
                f"{path}.requiredSectionRoles",
                allow_empty=False,
            )
        )
        steps = recipe.get("steps")
        if not isinstance(steps, list) or not steps:
            fail(f"{path}.steps must be a non-empty array")
        step_roles: set[str] = set()
        for step_index, step in enumerate(steps):
            step_path = f"{path}.steps[{step_index}]"
            if not isinstance(step, dict):
                fail(f"{step_path} must be an object")
            role = require_string(step.get("role"), f"{step_path}.role")
            if role in step_roles:
                fail(f"{path}.steps role {role!r} is duplicated")
            step_roles.add(role)
            require_string(step.get("question"), f"{step_path}.question")
            preferred = require_string_list(
                step.get("preferredComponents"),
                f"{step_path}.preferredComponents",
                allow_empty=False,
            )
            unknown = sorted(set(preferred) - set(catalog))
            if unknown:
                fail(f"{step_path}.preferredComponents has unknown types: {unknown}")
        if not required_roles <= step_roles:
            fail(f"{path}.requiredSectionRoles must be declared in steps")
        by_id[recipe_id] = recipe
    return by_id


def validate_fact_ledger(
    facts: dict[str, Any],
) -> tuple[set[str], set[str]]:
    identifiers: set[str] = set()
    finding_ids: set[str] = set()
    for collection in LEDGER_COLLECTIONS:
        entries = facts.get(collection, [])
        if not isinstance(entries, list):
            fail(f"facts.{collection} must be an array")
        for index, entry in enumerate(entries):
            path = f"facts.{collection}[{index}]"
            if not isinstance(entry, dict):
                fail(f"{path} must be an object")
            item_id = require_string(entry.get("id"), f"{path}.id")
            if item_id in identifiers:
                fail(f"evidence id {item_id!r} is duplicated")
            identifiers.add(item_id)
            if collection == "findings":
                finding_ids.add(item_id)
    for index, finding in enumerate(facts.get("findings", [])):
        evidence = require_string_list(
            finding.get("evidence"),
            f"facts.findings[{index}].evidence",
            allow_empty=False,
        )
        finding_id = finding["id"]
        if finding_id in evidence:
            fail(f"finding {finding_id!r} cannot cite itself")
        unresolved = sorted(set(evidence) - identifiers)
        if unresolved:
            fail(f"finding {finding_id!r} has unresolved evidence ids: {unresolved}")
    if not identifiers:
        fail("fact ledger must contain at least one identified evidence item")
    return identifiers, finding_ids


def validate_analysis_plan(
    plan: dict[str, Any],
    recipes: dict[str, dict[str, Any]],
    catalog: dict[str, dict[str, Any]],
    evidence_ids: set[str],
    finding_ids: set[str],
) -> dict[str, dict[str, Any]]:
    if plan.get("schemaVersion") != SCHEMA_VERSION:
        fail(f"analysis plan schemaVersion must be {SCHEMA_VERSION}")
    recipe_id = require_string(plan.get("recipeId"), "plan.recipeId")
    if recipe_id not in recipes:
        fail(f"plan.recipeId is unknown: {recipe_id}")
    recipe = recipes[recipe_id]
    mode = plan.get("mode")
    if mode not in OUTPUT_MODES:
        fail("plan.mode must be 'report' or 'dashboard'")
    if mode not in recipe["allowedModes"]:
        fail(f"recipe {recipe_id!r} does not allow mode {mode!r}")
    analysis_mode = plan.get("analysisMode")
    if analysis_mode not in ANALYSIS_MODES:
        fail("plan.analysisMode must be 'single-entity' or 'multi-entity'")
    if analysis_mode not in recipe["analysisModes"]:
        fail(f"recipe {recipe_id!r} does not allow analysisMode {analysis_mode!r}")
    require_string(plan.get("question"), "plan.question")
    shape = plan.get("dataShape")
    if not isinstance(shape, dict):
        fail("plan.dataShape must be an object")
    for key in ("entityCount", "metricCount", "timePointCount"):
        value = shape.get(key)
        if not isinstance(value, int) or isinstance(value, bool) or value < 0:
            fail(f"plan.dataShape.{key} must be a non-negative integer")
    entity_count = shape["entityCount"]
    if analysis_mode == "multi-entity" and not 2 <= entity_count <= 10:
        fail("multi-entity plan.dataShape.entityCount must be between 2 and 10")
    if analysis_mode == "single-entity" and entity_count != 1:
        fail("single-entity plan.dataShape.entityCount must be 1")

    sections = plan.get("sections")
    if not isinstance(sections, list) or not sections:
        fail("plan.sections must be a non-empty array")
    section_ids: set[str] = set()
    roles: set[str] = set()
    planned_components: dict[str, dict[str, Any]] = {}
    for section_index, section in enumerate(sections):
        section_path = f"plan.sections[{section_index}]"
        if not isinstance(section, dict):
            fail(f"{section_path} must be an object")
        section_id = require_string(section.get("id"), f"{section_path}.id")
        if section_id in section_ids:
            fail(f"plan section id {section_id!r} is duplicated")
        section_ids.add(section_id)
        role = require_string(section.get("role"), f"{section_path}.role")
        roles.add(role)
        require_string(section.get("question"), f"{section_path}.question")
        section_evidence = set(
            require_string_list(
                section.get("evidenceIds"),
                f"{section_path}.evidenceIds",
                allow_empty=False,
            )
        )
        unresolved = sorted(section_evidence - evidence_ids)
        if unresolved:
            fail(f"{section_path}.evidenceIds are unresolved: {unresolved}")
        section_findings = set(
            require_string_list(
                section.get("findingIds", []), f"{section_path}.findingIds"
            )
        )
        unresolved_findings = sorted(section_findings - finding_ids)
        if unresolved_findings:
            fail(f"{section_path}.findingIds are not findings: {unresolved_findings}")
        components = section.get("components")
        if not isinstance(components, list):
            fail(f"{section_path}.components must be an array")
        for component_index, component in enumerate(components):
            component_path = f"{section_path}.components[{component_index}]"
            if not isinstance(component, dict):
                fail(f"{component_path} must be an object")
            component_id = require_string(component.get("id"), f"{component_path}.id")
            if component_id in planned_components:
                fail(f"plan component id {component_id!r} is duplicated")
            component_type = require_string(
                component.get("type"), f"{component_path}.type"
            )
            if component_type not in catalog:
                fail(f"{component_path}.type is unsupported: {component_type}")
            require_string(component.get("spec"), f"{component_path}.spec")
            require_string(component.get("artifact"), f"{component_path}.artifact")
            require_string(
                component.get("selectionReason"), f"{component_path}.selectionReason"
            )
            component_evidence = set(
                require_string_list(
                    component.get("evidenceIds"),
                    f"{component_path}.evidenceIds",
                    allow_empty=component_type == "divider",
                )
            )
            unresolved = sorted(component_evidence - evidence_ids)
            if unresolved:
                fail(f"{component_path}.evidenceIds are unresolved: {unresolved}")
            if not component_evidence <= section_evidence:
                fail(f"{component_path}.evidenceIds must be included in its section")
            scope = component.get("entityScope")
            if scope not in ENTITY_SCOPES:
                fail(f"{component_path}.entityScope is invalid")
            multi = catalog[component_type]["multiEntity"]
            if analysis_mode == "multi-entity":
                support = multi["support"]
                if support == "native" and scope not in {"all", "selected"}:
                    fail(f"{component_path} native multi-entity component needs all/selected scope")
                if support == "selective":
                    if scope != "selected":
                        fail(f"{component_path} selective component needs selected scope")
                    selected = require_string_list(
                        component.get("selectedEntityIds"),
                        f"{component_path}.selectedEntityIds",
                        allow_empty=False,
                    )
                    if len(selected) > multi["maxEntities"]:
                        fail(
                            f"{component_path} selects {len(selected)} entities; "
                            f"maximum is {multi['maxEntities']}"
                        )
                if support == "portfolio-only" and scope != "portfolio":
                    fail(f"{component_path} portfolio-only component needs portfolio scope")
            elif scope not in {"single", "portfolio"}:
                fail(f"{component_path} single-entity plan needs single/portfolio scope")
            planned_components[component_id] = component
    required_roles = set(recipe["requiredSectionRoles"])
    missing_roles = sorted(required_roles - roles)
    if missing_roles:
        fail(f"plan is missing required recipe section roles: {missing_roles}")
    return planned_components


def validate_specs(
    specs: list[tuple[Path, dict[str, Any]]],
    plan: dict[str, Any],
    planned_components: dict[str, dict[str, Any]],
    evidence_ids: set[str],
    root: Path,
) -> None:
    actual_components: dict[str, dict[str, Any]] = {}
    expected_spec_paths: dict[Path, list[dict[str, Any]]] = {}
    for component in planned_components.values():
        expected_path = (root / component["spec"]).resolve()
        expected_spec_paths.setdefault(expected_path, []).append(component)
    supplied_paths = {path.resolve() for path, _ in specs}
    missing_paths = sorted(str(path) for path in set(expected_spec_paths) - supplied_paths)
    if missing_paths:
        fail(f"planned spec files were not supplied: {missing_paths}")
    extra_paths = sorted(str(path) for path in supplied_paths - set(expected_spec_paths))
    if extra_paths:
        fail(f"supplied spec files are not in the plan: {extra_paths}")

    for spec_path, spec in specs:
        validate_spec(spec)
        expected_mode = "dashboard" if plan["mode"] == "dashboard" else "report-component"
        if spec.get("mode") != expected_mode:
            fail(f"{spec_path}: mode must be {expected_mode!r}")
        if spec.get("analysisMode") is not None and spec.get("analysisMode") != plan["analysisMode"]:
            fail(f"{spec_path}: analysisMode does not match plan")
        if plan["analysisMode"] == "multi-entity":
            entities = spec.get("entitySet", {}).get("entities", [])
            if len(entities) != plan["dataShape"]["entityCount"]:
                fail(f"{spec_path}: entity count does not match plan.dataShape")
        for component in spec.get("components", []):
            component_id = component["id"]
            if component_id in actual_components:
                fail(f"spec component id {component_id!r} is duplicated across files")
            if component_id not in planned_components:
                fail(f"{spec_path}: component {component_id!r} is absent from the plan")
            planned = planned_components[component_id]
            if component.get("type") != planned["type"]:
                fail(f"{spec_path}: component {component_id!r} type does not match plan")
            actual_evidence = set(
                require_string_list(
                    component.get("evidenceIds"),
                    f"{spec_path}:{component_id}.evidenceIds",
                    allow_empty=component.get("type") == "divider",
                )
            )
            unresolved = sorted(actual_evidence - evidence_ids)
            if unresolved:
                fail(f"{spec_path}: component {component_id!r} has unresolved evidence: {unresolved}")
            if actual_evidence != set(planned["evidenceIds"]):
                fail(f"{spec_path}: component {component_id!r} evidenceIds do not match plan")
            actual_components[component_id] = component
    missing_components = sorted(set(planned_components) - set(actual_components))
    if missing_components:
        fail(f"planned components missing from supplied specs: {missing_components}")


def validate_manifest(
    manifest: dict[str, Any],
    plan: dict[str, Any],
    planned_components: dict[str, dict[str, Any]],
    evidence_ids: set[str],
    finding_ids: set[str],
) -> None:
    if manifest.get("schemaVersion") not in {None, SCHEMA_VERSION}:
        fail(f"manifest schemaVersion must be {SCHEMA_VERSION}")
    if manifest.get("mode") != plan["mode"]:
        fail("manifest.mode does not match plan.mode")
    sections = manifest.get("sections")
    if sections is None and isinstance(manifest.get("nativeDocument"), dict):
        sections = manifest["nativeDocument"].get("sections")
    if not isinstance(sections, list):
        fail("manifest.sections or manifest.nativeDocument.sections must be an array")
    plan_section_ids = {section["id"] for section in plan["sections"]}
    plan_sections = {section["id"]: section for section in plan["sections"]}
    manifest_section_ids: set[str] = set()
    manifest_artifacts: list[str] = []
    for index, section in enumerate(sections):
        path = f"manifest.sections[{index}]"
        if not isinstance(section, dict):
            fail(f"{path} must be an object")
        section_id = require_string(section.get("id"), f"{path}.id")
        if section_id in manifest_section_ids:
            fail(f"manifest section id {section_id!r} is duplicated")
        manifest_section_ids.add(section_id)
        section_findings = set(
            require_string_list(section.get("findingIds", []), f"{path}.findingIds")
        )
        unresolved = sorted(section_findings - finding_ids)
        if unresolved:
            fail(f"{path}.findingIds are not findings: {unresolved}")
        planned_findings = set(plan_sections.get(section_id, {}).get("findingIds", []))
        if section_findings != planned_findings:
            fail(f"{path}.findingIds do not match the analysis plan")
        if "evidenceIds" in section:
            section_evidence = set(
                require_string_list(section["evidenceIds"], f"{path}.evidenceIds")
            )
            unresolved_evidence = sorted(section_evidence - evidence_ids)
            if unresolved_evidence:
                fail(f"{path}.evidenceIds are unresolved: {unresolved_evidence}")
            planned_evidence = set(
                plan_sections.get(section_id, {}).get("evidenceIds", [])
            )
            if section_evidence != planned_evidence:
                fail(f"{path}.evidenceIds do not match the analysis plan")
        components = require_string_list(
            section.get("components", []), f"{path}.components"
        )
        manifest_artifacts.extend(components)
    if manifest_section_ids != plan_section_ids:
        missing = sorted(plan_section_ids - manifest_section_ids)
        extra = sorted(manifest_section_ids - plan_section_ids)
        fail(f"manifest/plan section mismatch; missing={missing}, extra={extra}")
    if len(manifest_artifacts) != len(set(manifest_artifacts)):
        fail("manifest component artifacts must appear exactly once")
    planned_artifacts = [component["artifact"] for component in planned_components.values()]
    if set(manifest_artifacts) != set(planned_artifacts):
        missing = sorted(set(planned_artifacts) - set(manifest_artifacts))
        extra = sorted(set(manifest_artifacts) - set(planned_artifacts))
        fail(f"manifest/plan artifact mismatch; missing={missing}, extra={extra}")


def validate_bundle(
    *,
    facts_path: Path,
    plan_path: Path,
    manifest_path: Path,
    spec_paths: list[Path],
    catalog_path: Path,
    recipes_path: Path,
    root: Path,
) -> None:
    catalog = validate_catalog(load_json(catalog_path), root)
    recipes = validate_recipes(load_json(recipes_path), catalog)
    facts = load_json(facts_path)
    evidence_ids, finding_ids = validate_fact_ledger(facts)
    plan = load_json(plan_path)
    planned_components = validate_analysis_plan(
        plan, recipes, catalog, evidence_ids, finding_ids
    )
    specs = [(path.resolve(), load_json(path.resolve())) for path in spec_paths]
    validate_specs(specs, plan, planned_components, evidence_ids, root)
    manifest = load_json(manifest_path)
    validate_manifest(
        manifest, plan, planned_components, evidence_ids, finding_ids
    )


def parse_args() -> argparse.Namespace:
    script_root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(
        description="Validate an evidence-linked visual analysis bundle."
    )
    parser.add_argument("--facts", required=True, type=Path)
    parser.add_argument("--plan", required=True, type=Path)
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--spec", required=True, action="append", type=Path)
    parser.add_argument("--root", type=Path, default=script_root)
    parser.add_argument(
        "--catalog",
        type=Path,
        default=script_root / "assets" / "component-catalog.json",
    )
    parser.add_argument(
        "--recipes",
        type=Path,
        default=script_root / "assets" / "analysis-recipes.json",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        validate_bundle(
            facts_path=args.facts.resolve(),
            plan_path=args.plan.resolve(),
            manifest_path=args.manifest.resolve(),
            spec_paths=args.spec,
            catalog_path=args.catalog.resolve(),
            recipes_path=args.recipes.resolve(),
            root=args.root.resolve(),
        )
    except ValueError as error:
        print(f"FAILED: {error}", file=sys.stderr)
        return 1
    print(
        "PASS: analysis plan, evidence ledger, component specs, and manifest agree"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
