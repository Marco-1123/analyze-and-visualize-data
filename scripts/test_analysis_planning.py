#!/usr/bin/env python3
"""Regression tests for evidence-linked analysis planning."""

from __future__ import annotations

import copy
import json
import sys
import unittest
from pathlib import Path

from build_artifact import SUPPORTED_TYPES
from validate_analysis_bundle import (
    load_json,
    validate_analysis_plan,
    validate_catalog,
    validate_fact_ledger,
    validate_manifest,
    validate_recipes,
    validate_specs,
)


ROOT = Path(__file__).resolve().parents[1]
EXAMPLES = ROOT / "assets" / "examples"


class AnalysisPlanningTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.catalog = validate_catalog(
            load_json(ROOT / "assets" / "component-catalog.json"), ROOT
        )
        cls.recipes = validate_recipes(
            load_json(ROOT / "assets" / "analysis-recipes.json"), cls.catalog
        )
        cls.facts = load_json(EXAMPLES / "multi-queue-analysis-facts.json")
        cls.evidence_ids, cls.finding_ids = validate_fact_ledger(cls.facts)
        cls.plan = load_json(EXAMPLES / "multi-queue-analysis-plan.json")
        cls.manifest = load_json(EXAMPLES / "multi-queue-report-manifest.json")
        cls.specs = [
            (
                (EXAMPLES / "report-multi-queue-matrix-spec.json").resolve(),
                load_json(EXAMPLES / "report-multi-queue-matrix-spec.json"),
            ),
            (
                (EXAMPLES / "report-multi-queue-trends-spec.json").resolve(),
                load_json(EXAMPLES / "report-multi-queue-trends-spec.json"),
            ),
        ]

    def validate_plan(self, plan: dict) -> dict:
        return validate_analysis_plan(
            plan,
            self.recipes,
            self.catalog,
            self.evidence_ids,
            self.finding_ids,
        )

    def test_valid_multi_entity_bundle(self) -> None:
        planned = self.validate_plan(self.plan)
        validate_specs(
            self.specs, self.plan, planned, self.evidence_ids, ROOT
        )
        validate_manifest(
            self.manifest,
            self.plan,
            planned,
            self.evidence_ids,
            self.finding_ids,
        )
        self.assertEqual(len(planned), 2)

    def test_catalog_matches_runtime_types(self) -> None:
        self.assertEqual(set(self.catalog), SUPPORTED_TYPES)

    def test_unresolved_evidence_fails(self) -> None:
        plan = copy.deepcopy(self.plan)
        plan["sections"][0]["evidenceIds"].append("fact.does-not-exist")
        with self.assertRaisesRegex(ValueError, "unresolved"):
            self.validate_plan(plan)

    def test_selective_line_cannot_claim_all_eight_entities(self) -> None:
        plan = copy.deepcopy(self.plan)
        component = plan["sections"][1]["components"][0]
        component["id"] = "all-queue-line"
        component["type"] = "line"
        component["entityScope"] = "all"
        with self.assertRaisesRegex(ValueError, "selective component needs selected scope"):
            self.validate_plan(plan)

    def test_missing_required_recipe_role_fails(self) -> None:
        plan = copy.deepcopy(self.plan)
        plan["sections"] = [
            section
            for section in plan["sections"]
            if section["role"] != "implications"
        ]
        with self.assertRaisesRegex(ValueError, "missing required recipe section roles"):
            self.validate_plan(plan)

    def test_manifest_missing_component_fails(self) -> None:
        planned = self.validate_plan(self.plan)
        manifest = copy.deepcopy(self.manifest)
        manifest["sections"][1]["components"] = []
        with self.assertRaisesRegex(ValueError, "artifact mismatch"):
            validate_manifest(
                manifest,
                self.plan,
                planned,
                self.evidence_ids,
                self.finding_ids,
            )

    def test_manifest_finding_must_match_plan_section(self) -> None:
        planned = self.validate_plan(self.plan)
        manifest = copy.deepcopy(self.manifest)
        manifest["sections"][1]["findingIds"] = []
        with self.assertRaisesRegex(ValueError, "do not match the analysis plan"):
            validate_manifest(
                manifest,
                self.plan,
                planned,
                self.evidence_ids,
                self.finding_ids,
            )

    def test_spec_evidence_mismatch_fails(self) -> None:
        planned = self.validate_plan(self.plan)
        specs = copy.deepcopy(self.specs)
        specs[0][1]["components"][0]["evidenceIds"] = [
            "fact.portfolio.sla"
        ]
        with self.assertRaisesRegex(ValueError, "evidenceIds do not match plan"):
            validate_specs(
                specs, self.plan, planned, self.evidence_ids, ROOT
            )


if __name__ == "__main__":
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(
        AnalysisPlanningTests
    )
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    sys.exit(0 if result.wasSuccessful() else 1)
