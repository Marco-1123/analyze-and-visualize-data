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


if __name__ == "__main__":
    unittest.main()
