# Analysis data contract

## Contents

1. Fact ledger
2. Artifact specification
3. Numeric rules
4. Traceability

## 1. Fact ledger

Create `analysis-facts.json` before writing narrative content:

```json
{
  "meta": {
    "title": "Q2 channel performance",
    "source": "sales.xlsx",
    "grain": "one row per order",
    "period": {"start": "2026-04-01", "end": "2026-06-30"},
    "currency": "CNY",
    "assumptions": [],
    "limitations": []
  },
  "facts": [
    {
      "id": "revenue_total",
      "label": "Revenue",
      "value": 12840000,
      "format": "currency",
      "unit": "CNY",
      "calculation": "sum(net_revenue)",
      "source_fields": ["net_revenue"]
    }
  ],
  "series": [
    {
      "id": "revenue_by_month",
      "dimensions": ["month"],
      "measure": "revenue",
      "rows": [{"month": "2026-04", "revenue": 3800000}]
    }
  ],
  "findings": [
    {
      "id": "finding_growth_concentration",
      "kind": "derived",
      "claim": "华东贡献了大部分增长",
      "evidence": ["revenue_by_region", "revenue_total"],
      "confidence": "high",
      "caveat": "未控制价格变化"
    }
  ]
}
```

Use `kind` values:

- `observed`: direct measurement;
- `derived`: deterministic calculation;
- `hypothesis`: plausible interpretation not proven by the data;
- `recommendation`: proposed action.

## 2. Artifact specification

Use a JSON object with:

```json
{
  "mode": "report-component",
  "title": "Revenue momentum",
  "eyebrow": "CHAPTER 01 · OVERVIEW",
  "subtitle": "Fixed data through 30 June 2026",
  "theme": "editorial-light",
  "components": []
}
```

Supported baseline component types:

- `metrics`
- `line`
- `bar`
- `donut`
- `heatmap`
- `insight`
- `table`
- `divider`

Give every component:

- a stable `id`;
- a question-led or finding-led `title`;
- optional `subtitle` for unit, scope, or method;
- accessible `ariaLabel` when the visual alone is not self-explanatory;
- source or note when interpretation depends on scope.

## 3. Numeric rules

- Calculate with full available precision.
- Round only for display.
- Use a consistent decimal policy within a comparison.
- Show a leading zero for decimals.
- Distinguish percentage points from percent change.
- Keep currency and unit visible near the number.
- Use compact notation only when it improves scanning; preserve exact values in tooltips or tables.
- Treat division by zero and missing denominators as unavailable, not zero.
- Do not imply accuracy beyond the source.

## 4. Traceability

- Map each headline and recommendation to finding IDs.
- Map each finding to fact or series IDs.
- Keep transformations reproducible in a script, spreadsheet formula, or explicit calculation note.
- Preserve the original file and never overwrite it.
- Include source filename, sheet/table, filters, and date range in the final methodology.
