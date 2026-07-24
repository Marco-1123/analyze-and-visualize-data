#!/usr/bin/env python3
"""Regression tests for shared artifact specification contracts."""

from __future__ import annotations

import copy
import unittest

from build_artifact import validate_spec


BASE_SPEC = {
    "mode": "report-component",
    "title": "Contract test",
    "components": [
        {
            "id": "chart",
            "type": "bar",
            "title": "Signed change",
            "categories": ["A", "B"],
            "values": [1, -1],
            "layout": "diverging",
        }
    ],
}


class ComponentNoteContractTests(unittest.TestCase):
    def spec_with_note(self, note: object) -> dict:
        spec = copy.deepcopy(BASE_SPEC)
        spec["components"][0]["note"] = note
        return spec

    def test_structured_formal_note_is_valid(self) -> None:
        validate_spec(
            self.spec_with_note(
                {
                    "kind": "definition",
                    "text": "方向表示增量的正负。",
                    "evidenceIds": ["fact.delta"],
                }
            )
        )

    def test_ambiguous_free_text_is_rejected(self) -> None:
        with self.assertRaisesRegex(ValueError, "free text is ambiguous"):
            validate_spec(self.spec_with_note("这个结果可能还不错"))

    def test_drafting_language_is_rejected(self) -> None:
        with self.assertRaisesRegex(ValueError, "drafting or uncertain"):
            validate_spec(
                self.spec_with_note(
                    {"kind": "limitation", "text": "数据范围待确认，先这样。"}
                )
            )

    def test_analytical_claim_is_rejected(self) -> None:
        with self.assertRaisesRegex(ValueError, "analytical claim"):
            validate_spec(
                self.spec_with_note(
                    {
                        "kind": "scope",
                        "text": "华南收入下降主要集中在代理渠道。",
                    }
                )
            )

    def test_formal_legacy_prefix_remains_compatible(self) -> None:
        validate_spec(self.spec_with_note("口径：收入为含税金额。"))
        validate_spec(self.spec_with_note("Method: values use a fixed cohort."))


class BarDisplayCategoryContractTests(unittest.TestCase):
    def test_display_categories_are_optional(self) -> None:
        validate_spec(copy.deepcopy(BASE_SPEC))

    def test_display_categories_preserve_raw_category_identity(self) -> None:
        spec = copy.deepcopy(BASE_SPEC)
        spec["components"][0]["categories"] = [
            "queue_enterprise_recovery_priority_tier_01",
            "queue_partner_risk_followup_tier_02",
        ]
        spec["components"][0]["displayCategories"] = [
            "企业恢复优先队列",
            "伙伴风险跟进队列",
        ]
        validate_spec(spec)

    def test_display_categories_must_match_category_count(self) -> None:
        spec = copy.deepcopy(BASE_SPEC)
        spec["components"][0]["displayCategories"] = ["仅一个标签"]
        with self.assertRaisesRegex(ValueError, "must have the same length"):
            validate_spec(spec)

    def test_display_categories_reject_blank_labels(self) -> None:
        spec = copy.deepcopy(BASE_SPEC)
        spec["components"][0]["displayCategories"] = ["A", "  "]
        with self.assertRaisesRegex(ValueError, "non-empty strings"):
            validate_spec(spec)


class BaseComponentContractTests(unittest.TestCase):
    def test_schema_version_1_is_valid(self) -> None:
        spec = copy.deepcopy(BASE_SPEC)
        spec["schemaVersion"] = "1.0"
        spec["components"][0]["evidenceIds"] = ["fact.signed-change"]
        validate_spec(spec)

    def test_unknown_schema_version_is_rejected(self) -> None:
        spec = copy.deepcopy(BASE_SPEC)
        spec["schemaVersion"] = "2.0"
        with self.assertRaisesRegex(ValueError, "schemaVersion is unsupported"):
            validate_spec(spec)

    def test_component_evidence_ids_must_be_non_empty_strings(self) -> None:
        spec = copy.deepcopy(BASE_SPEC)
        spec["components"][0]["evidenceIds"] = ["fact.valid", " "]
        with self.assertRaisesRegex(ValueError, "non-empty strings"):
            validate_spec(spec)


class DecisionContractTests(unittest.TestCase):
    def decision_spec(self, kind: str = "finding") -> dict:
        spec = copy.deepcopy(BASE_SPEC)
        spec["components"] = [
            {
                "id": "decision",
                "type": "decision",
                "kind": kind,
                "title": "渠道变化需要关注",
                "body": "下降集中在高价值客户。",
            }
        ]
        return spec

    def test_finding_requires_traceable_evidence_and_confidence(self) -> None:
        spec = self.decision_spec()
        spec["components"][0].update(
            evidenceIds=["finding.channel-slowdown"],
            confidence="high",
        )
        validate_spec(spec)

    def test_finding_without_evidence_is_rejected(self) -> None:
        spec = self.decision_spec()
        spec["components"][0]["confidence"] = "high"
        with self.assertRaisesRegex(ValueError, "evidenceIds is required"):
            validate_spec(spec)

    def test_interpretation_requires_caveat(self) -> None:
        spec = self.decision_spec("interpretation")
        spec["components"][0]["confidence"] = "medium"
        with self.assertRaisesRegex(ValueError, "caveat"):
            validate_spec(spec)

    def test_risk_requires_likelihood_and_impact(self) -> None:
        spec = self.decision_spec("risk")
        spec["components"][0]["likelihood"] = "medium"
        with self.assertRaisesRegex(ValueError, "impact"):
            validate_spec(spec)

    def test_action_accepts_owner_due_and_details(self) -> None:
        spec = self.decision_spec("action")
        spec["components"][0].update(
            evidenceIds=["finding.channel-slowdown"],
            owner="渠道运营",
            due="2026-08-01",
            details=["回访前 20 个高价值客户", "复查续约率"],
        )
        validate_spec(spec)


class TargetContractTests(unittest.TestCase):
    def target_spec(self) -> dict:
        spec = copy.deepcopy(BASE_SPEC)
        spec["components"] = [
            {
                "id": "target",
                "type": "target",
                "title": "SLA 距目标仍有 4.2 个百分点",
                "actual": 91.8,
                "target": 96,
                "baseline": 89,
                "direction": "higher-is-better",
                "ranges": [
                    {"from": 80, "to": 90, "tone": "negative"},
                    {"from": 90, "to": 96, "tone": "warning"},
                    {"from": 96, "to": 102, "tone": "positive"},
                ],
            }
        ]
        return spec

    def test_canonical_target_is_valid(self) -> None:
        validate_spec(self.target_spec())

    def test_zero_target_is_valid_but_attainment_is_runtime_unavailable(self) -> None:
        spec = self.target_spec()
        spec["components"][0]["target"] = 0
        validate_spec(spec)

    def test_target_requires_direction(self) -> None:
        spec = self.target_spec()
        del spec["components"][0]["direction"]
        with self.assertRaisesRegex(ValueError, "direction"):
            validate_spec(spec)

    def test_overlapping_target_ranges_are_rejected(self) -> None:
        spec = self.target_spec()
        spec["components"][0]["ranges"][1]["from"] = 89
        with self.assertRaisesRegex(ValueError, "ordered and non-overlapping"):
            validate_spec(spec)

    def test_target_list_uses_one_contract_per_item(self) -> None:
        spec = self.target_spec()
        component = spec["components"][0]
        component.pop("actual")
        component.pop("target")
        component.pop("baseline")
        component.pop("direction")
        component.pop("ranges")
        component["items"] = [
            {
                "id": "sla",
                "label": "SLA",
                "actual": 91.8,
                "target": 96,
                "direction": "higher-is-better",
            },
            {
                "id": "cost",
                "label": "单均成本",
                "actual": 8.2,
                "target": 7.5,
                "direction": "lower-is-better",
            },
        ]
        validate_spec(spec)


class RangeContractTests(unittest.TestCase):
    def range_spec(self) -> dict:
        spec = copy.deepcopy(BASE_SPEC)
        spec["components"] = [
            {
                "id": "range",
                "type": "range",
                "title": "重点队列两期表现分化",
                "startLabel": "2025 Q2",
                "endLabel": "2026 Q2",
                "sort": "absolute-delta-desc",
                "items": [
                    {
                        "id": "east",
                        "label": "华东企业客户恢复优先队列",
                        "start": -12,
                        "end": 31,
                    },
                    {
                        "id": "equal",
                        "label": "保持不变的队列",
                        "start": 20,
                        "end": 20,
                    },
                ],
            }
        ]
        return spec

    def test_range_supports_negative_equal_and_long_labels(self) -> None:
        validate_spec(self.range_spec())

    def test_range_rejects_duplicate_ids(self) -> None:
        spec = self.range_spec()
        spec["components"][0]["items"][1]["id"] = "east"
        with self.assertRaisesRegex(ValueError, "ids must be unique"):
            validate_spec(spec)

    def test_range_requires_both_endpoints(self) -> None:
        spec = self.range_spec()
        del spec["components"][0]["items"][0]["end"]
        with self.assertRaisesRegex(ValueError, "end must be a finite number"):
            validate_spec(spec)


class WaterfallContractTests(unittest.TestCase):
    def waterfall_spec(self) -> dict:
        spec = copy.deepcopy(BASE_SPEC)
        spec["components"] = [
            {
                "id": "waterfall",
                "type": "waterfall",
                "title": "收入变化可完整对账",
                "reconciliationTolerance": 0.01,
                "steps": [
                    {
                        "id": "start",
                        "label": "基期收入",
                        "kind": "start",
                        "value": 1000,
                    },
                    {
                        "id": "volume",
                        "label": "销量",
                        "kind": "delta",
                        "value": 160,
                    },
                    {
                        "id": "price",
                        "label": "价格",
                        "kind": "delta",
                        "value": -40,
                    },
                    {
                        "id": "end",
                        "label": "本期收入",
                        "kind": "end",
                        "value": 1120,
                    },
                ],
            }
        ]
        return spec

    def test_reconciled_waterfall_is_valid(self) -> None:
        validate_spec(self.waterfall_spec())

    def test_unreconciled_end_is_rejected(self) -> None:
        spec = self.waterfall_spec()
        spec["components"][0]["steps"][-1]["value"] = 1119
        with self.assertRaisesRegex(ValueError, "does not reconcile"):
            validate_spec(spec)

    def test_waterfall_requires_start_first_and_end_last(self) -> None:
        spec = self.waterfall_spec()
        spec["components"][0]["steps"][0]["kind"] = "delta"
        with self.assertRaisesRegex(ValueError, "must be 'start'"):
            validate_spec(spec)

    def test_subtotal_must_equal_running_total(self) -> None:
        spec = self.waterfall_spec()
        spec["components"][0]["steps"].insert(
            -1,
            {
                "id": "subtotal",
                "label": "经营小计",
                "kind": "subtotal",
                "value": 1121,
            },
        )
        with self.assertRaisesRegex(ValueError, "does not reconcile"):
            validate_spec(spec)


class SparklineContractTests(unittest.TestCase):
    def sparkline(self) -> dict:
        return {
            "points": [
                {"x": "W1", "value": 72, "status": "complete"},
                {"x": "W2", "value": None, "status": "missing"},
                {"x": "W3", "value": 81, "status": "incomplete"},
            ],
            "target": 85,
            "domainMode": "shared",
        }

    def test_standalone_sparkline_supports_missing_and_incomplete_periods(self) -> None:
        spec = copy.deepcopy(BASE_SPEC)
        spec["components"] = [
            {
                "id": "spark",
                "type": "sparkline",
                "title": "周度质量趋势",
                **self.sparkline(),
            }
        ]
        validate_spec(spec)

    def test_metric_sparkline_reuses_the_same_contract(self) -> None:
        spec = copy.deepcopy(BASE_SPEC)
        spec["components"] = [
            {
                "id": "metrics",
                "type": "metrics",
                "items": [
                    {
                        "label": "SLA",
                        "value": 91.8,
                        "sparkline": self.sparkline(),
                    }
                ],
            }
        ]
        validate_spec(spec)

    def test_null_value_requires_missing_status(self) -> None:
        definition = self.sparkline()
        definition["points"][1]["status"] = "complete"
        spec = copy.deepcopy(BASE_SPEC)
        spec["components"] = [
            {
                "id": "spark",
                "type": "sparkline",
                "title": "周度质量趋势",
                **definition,
            }
        ]
        with self.assertRaisesRegex(ValueError, "only when status is 'missing'"):
            validate_spec(spec)

    def test_duplicate_x_values_are_rejected(self) -> None:
        definition = self.sparkline()
        definition["points"][2]["x"] = "W1"
        spec = copy.deepcopy(BASE_SPEC)
        spec["components"] = [
            {
                "id": "spark",
                "type": "sparkline",
                "title": "周度质量趋势",
                **definition,
            }
        ]
        with self.assertRaisesRegex(ValueError, "x values must be unique"):
            validate_spec(spec)


class LineAnnotationContractTests(unittest.TestCase):
    def line_spec(self) -> dict:
        spec = copy.deepcopy(BASE_SPEC)
        spec["components"] = [
            {
                "id": "line",
                "type": "line",
                "title": "发布后趋势发生变化",
                "labels": ["7/1", "7/8", "7/15", "7/22"],
                "series": [{"name": "SLA", "values": [90, 91, 88, 93]}],
                "annotations": [
                    {
                        "id": "release",
                        "date": "7/8",
                        "label": "新策略上线",
                        "kind": "fact",
                        "evidenceIds": ["event.release"],
                    },
                    {
                        "id": "interpretation",
                        "index": 2,
                        "label": "可能存在适应期",
                        "kind": "interpretation",
                        "description": "时间重合不代表因果。",
                    },
                ],
            }
        ]
        return spec

    def test_multiple_fact_and_interpretation_annotations_are_valid(self) -> None:
        validate_spec(self.line_spec())

    def test_legacy_and_new_annotations_cannot_mix(self) -> None:
        spec = self.line_spec()
        spec["components"][0]["annotation"] = {"index": 0, "label": "旧事件"}
        with self.assertRaisesRegex(ValueError, "cannot define both"):
            validate_spec(spec)

    def test_annotation_date_must_match_a_line_label(self) -> None:
        spec = self.line_spec()
        spec["components"][0]["annotations"][0]["date"] = "7/9"
        with self.assertRaisesRegex(ValueError, "must match a line label"):
            validate_spec(spec)


if __name__ == "__main__":
    unittest.main()
