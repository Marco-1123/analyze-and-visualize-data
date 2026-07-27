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
- `decision`
- `target`
- `range`
- `waterfall`
- `sparkline`
- `comparison-matrix`
- `small-multiples`
- `insight`
- `table`
- `divider`

New specifications should set `"schemaVersion": "1.0"`. Existing
specifications without this field remain valid for backward compatibility.
Every component may carry `evidenceIds`, an array of stable fact, finding,
series, event, method, or limitation IDs.

For two to ten comparable entities, add the governed multi-entity contract:

```json
{
  "analysisMode": "multi-entity",
  "entitySet": {
    "kind": "queue",
    "entities": [
      {
        "id": "queue_enterprise_recovery_east_priority",
        "displayName": "华东企业恢复",
        "group": "企业服务",
        "weight": 0.19
      }
    ]
  },
  "metricDefinitions": [
    {
      "id": "sla_24h",
      "label": "24 小时 SLA",
      "direction": "higher-is-better",
      "aggregation": "ratio",
      "denominator": "eligible_cases",
      "format": {
        "type": "percent",
        "input": "ratio",
        "decimals": 1
      },
      "reference": {
        "type": "target",
        "value": 0.9,
        "label": "目标",
        "warningTolerance": 0.03
      }
    }
  ]
}
```

- `analysisMode` accepts `single-entity` or `multi-entity`.
- Multi-entity mode contains 2–10 entities. Shared comparison components reject
  larger sets rather than silently producing an unreadable artifact.
- Raw entity IDs remain exact. `displayName` is presentation-only.
- `direction` is `higher-is-better`, `lower-is-better`, or `neutral`.
- `aggregation` is `sum`, `average`, `weighted-average`, `median`, `ratio`, or
  `none`. `ratio` and `weighted-average` require a denominator.
- A reference is a governed `target` or `benchmark`. `warningTolerance` uses
  the metric's source units.
- Overall values must follow `aggregation`; do not average ratios that require
  denominator weighting.

Use `comparison-matrix` to scan several governed metrics:

```json
{
  "type": "comparison-matrix",
  "metricIds": ["sla_24h", "backlog"],
  "rows": [
    {
      "entityId": "queue_enterprise_recovery_east_priority",
      "coverage": 0.99,
      "values": {"sla_24h": 0.934, "backlog": 642}
    }
  ]
}
```

Use `small-multiples` for peer trends:

```json
{
  "type": "small-multiples",
  "metricId": "sla_24h",
  "labels": ["7/18", "7/19", "7/20"],
  "highlightEntityIds": ["queue_partner_escalation_south_tier_02"],
  "series": [
    {
      "entityId": "queue_enterprise_recovery_east_priority",
      "values": [0.918, 0.926, 0.931]
    }
  ]
}
```

- Matrix metric IDs and row entity IDs must exist in the registries.
- Matrix values may be numeric or `null`; optional coverage is 0–1.
- Small multiples use 2–10 unique entities and one shared y-domain.
- Every small-multiple value array matches `labels` exactly. Missing
  observations are explicit `null`.
- Highlight at most three entities; selection follows decision relevance, not
  decoration.

For a heatmap with many ordered columns, use a layout contract instead of
pre-splitting or duplicating the data:

```json
{
  "type": "heatmap",
  "layout": "stacked-groups",
  "columns": ["0时", "1时", "…", "23时"],
  "columnGroups": [
    {"label": "0–11 时", "start": 0, "end": 11},
    {"label": "12–23 时", "start": 12, "end": 23}
  ],
  "values": []
}
```

- `layout` accepts `auto` (default), `single`, or `stacked-groups`.
- `columnGroups` use inclusive zero-based indices, must be ordered and
  non-overlapping, and must cover every column exactly once.
- Canonical 0–23 hour labels are auto-grouped into 0–11 and 12–23 unless
  `layout` is explicitly `single`.
- Keep the 24-column matrix once. Grouping is a presentation instruction, not a
  data transformation.
- Every group uses the component's one shared `domain` and legend.
- The runtime first fits all 12 columns into the available component width when
  every cell can remain readable. It enables native module-level horizontal
  scrolling only when the calculated minimum cell width, row-label rail, and
  formatted values genuinely cannot fit. Agents must not force scrolling with
  fixed cell widths.

Give every component:

- a stable `id`;
- a question-led or finding-led `title`;
- optional `subtitle` for unit, scope, or method;
- accessible `ariaLabel` when the visual alone is not self-explanatory;
- source or a structured note when interpretation depends on scope.

Component notes use a constrained formal contract:

```json
{
  "note": {
    "kind": "definition",
    "text": "方向仅表示增量的正负，不自动等同于经营表现的最终好坏。",
    "evidenceIds": ["fact.revenue.delta"]
  }
}
```

- `kind` is one of `definition`, `scope`, `method`, `limitation`, or `source`.
- `text` contains only a neutral definition, scope, method, limitation, or
  source statement. Do not place findings, causal explanations,
  recommendations, conversational drafting notes, or uncertain claims in the
  gray-note position.
- `evidenceIds` is optional and contains stable fact/finding IDs.
- A legacy string is accepted only when it begins with an explicit formal
  prefix such as `口径：`, `范围：`, `方法：`, `限制：`, `来源：`, or
  `数据状态：` (or the English equivalents). New specifications should use
  the object form.
- Put analytical claims in the component title, insight block, annotation, or
  native report prose where their evidence and certainty can be stated.
- The builder rejects common drafting/uncertainty phrases and metric-change
  claims in component notes. This lint supplements, but does not replace,
  editorial review.

For multi-series line components, the runtime provides an interactive legend by
default. Keep every `series` entry in the original specification and let the
runtime maintain local visibility state. Hiding a series must not mutate,
discard, or recalculate its source values, and must not change the shared
y-domain.

Line components may opt into static point-value labels:

```json
{
  "type": "line",
  "labels": ["W1", "W2", "W3"],
  "series": [{"name": "SLA", "values": [92.4, 89.8, 94.1]}],
  "valueLabels": {
    "mode": "auto",
    "include": ["end", "extrema", "annotations", "threshold-crossings"],
    "thresholds": [90],
    "maxPerSeries": 5,
    "fallback": "table"
  }
}
```

- `mode` is `auto`, `none`, `end`, `key`, or `all`; default is `auto`.
- Every `series[].values` array must have exactly one entry for every
  `labels[]` entry, in the same order. Use an explicit `null` for a missing
  observation. Never shorten, slice, or omit the tail of `values` because only
  a subset of static labels will be visible.
- `auto` shows every value only for a short single series whose formatted
  labels fit the actual plot width. The runtime must reconcile the preflight
  decision with the number of labels actually placed: `all` is valid only when
  every valid source point was placed. Otherwise it switches to the key-point
  policy instead of silently presenting a partial all-point result.
- `key` may include `start`, `end`, `extrema`, `annotations`, and
  `threshold-crossings`. Selection priority is annotations, end, extrema,
  threshold crossings, start, then ordinary points. `maxPerSeries` is an
  integer from 1 to 100 and caps only `key` or a key-point fallback. It is
  ignored when `auto` resolves to `all` and when an explicit `all` request
  remains readable; use `mode: "key"` when a hard visible-point cap is wanted.
- Automatically derived line domains retain the runtime's baseline policy but
  reserve a pixel-aware buffer above and below the source extrema for static
  labels, selection rings, and annotations. An explicit `domain` remains exact
  and therefore must include any required boundary space itself.
- `all` is a request for complete exact-value access, not permission to overlap
  text. When the plot cannot fit every label, the runtime retains prioritized
  labels in the plot and, for `fallback: "table"`, adds a complete expandable
  value table with native component-level horizontal scrolling.
- Missing values remain gaps and receive neither a mark nor a static value
  label. They appear as `—` in the tooltip and complete value table.
- Legend visibility applies to the line, static labels, crosshair point,
  tooltip row, accessible selected value, and complete-table row together.
- The legacy `endLabels: false` remains accepted as `mode: "none"` when
  `valueLabels` is absent. New specifications should use `valueLabels`.

For metric components, `columns` is the preferred maximum column count, not a
viewport breakpoint. The runtime preserves four columns when four cards have at
least 160 px each, reduces four cards to a balanced 2 × 2 grid only below that
capacity, and uses one column only when a two-column card would be unreadable.
Agents must not add local media-query overrides for ordinary metric counts.

For a signed bar comparison, use:

```json
{
  "type": "bar",
  "layout": "diverging",
  "categories": [
    "queue_enterprise_recovery_priority_tier_01",
    "queue_partner_risk_followup_tier_02"
  ],
  "displayCategories": ["企业恢复优先队列", "伙伴风险跟进队列"],
  "values": [82, -46],
  "format": {"decimals": 0}
}
```

- `layout` accepts `auto` (default), `standard`, or `diverging`.
- `auto` selects the diverging layout when `values` contain at least one
  negative and one positive value. Use `standard` only to opt out explicitly.
- `diverging` requires both signs and preserves one quantitative scale around a
  shared zero axis.
- `categories` preserves the exact source category or queue identifier.
  `displayCategories` is an optional same-length array of concise human-readable
  labels. It changes only visible labels; tooltips, accessible names, and data
  marks retain the exact `categories` value.
- The runtime derives the full layout from the signed domain, longest category
  display label, and longest formatted endpoint value. Category labels remain in a
  fixed rail while the signed plot receives its own minimum readable width.
  Agents must not hard-code viewport widths or add custom drag handlers.
- The fixed rail shows at most two lines per category. Longer text is visually
  clamped without colliding with adjacent rows; hover, keyboard focus, and touch
  expose the complete source category. Agents should use `displayCategories`
  for long machine identifiers instead of replacing or shortening
  `categories`.
- When the derived width exceeds the component, the bar scrolls horizontally
  inside its own container. The initial view keeps the zero axis visible when
  possible; native trackpad/wheel, touch, scrollbar, and keyboard behavior are
  retained. Mouse grab-to-drag is not part of the contract.
- The main plot always preserves one true linear scale. When the smaller signed
  side would receive fewer than 24 plotted pixels, the runtime adds an
  explicitly labeled small-side detail with an independent local scale. The
  detail is for identifying exact small-side items only and states that its bar
  lengths must not be compared with the main plot.
- Scrollable bars expose `负向极值`, `零轴`, and `正向极值` quick-position
  controls. These controls supplement, rather than replace, native scrolling.

### Decision

```json
{
  "type": "decision",
  "kind": "risk",
  "title": "夜间 SLA 可能继续低于 90%",
  "body": "连续三个完整周期高于容量基线。",
  "likelihood": "high",
  "impact": "medium",
  "confidence": "high",
  "evidenceIds": ["fact.sla-night", "fact.capacity-gap"]
}
```

- `kind` is `finding`, `interpretation`, `risk`, `action`, or `evidence`.
- A `finding` requires `confidence` and `evidenceIds`.
- An `interpretation` requires `confidence` and an explicit `caveat`.
- A `risk` requires `likelihood` and `impact`.
- An `action` requires `evidenceIds`; `owner`, `due`, and `status` are optional.
- `details` may add a short list of evidence or boundaries. Core meaning must
  remain visible without hover.

### Target

```json
{
  "type": "target",
  "items": [{
    "id": "sla",
    "label": "24 小时 SLA",
    "actual": 91.8,
    "target": 96,
    "baseline": 89.4,
    "direction": "higher-is-better",
    "ranges": [
      {"from": 80, "to": 90, "tone": "negative", "label": "风险"},
      {"from": 90, "to": 96, "tone": "warning", "label": "关注"},
      {"from": 96, "to": 102, "tone": "positive", "label": "达标"}
    ]
  }]
}
```

- A component may contain one top-level target or `items[]`.
- `actual`, `target`, and `direction` are required. `direction` is
  `higher-is-better`, `lower-is-better`, or `neutral`.
- `gap` and `attainment` are derived at runtime and must not be supplied as
  competing source values.
- Ranges must be ordered, finite, and non-overlapping.
- Higher-is-better attainment is `actual / target`; lower-is-better attainment
  is `target / actual`. A zero target, zero divisor, or actual/target values
  across zero produce unavailable attainment rather than a deceptive ratio.

### Paired range

```json
{
  "type": "range",
  "startLabel": "2025 Q2",
  "endLabel": "2026 Q2",
  "sort": "absolute-delta-desc",
  "items": [{
    "id": "queue_01",
    "label": "queue_enterprise_recovery_priority_tier_01",
    "displayLabel": "企业恢复优先队列",
    "start": 61.2,
    "end": 78.9
  }]
}
```

- `start` and `end` are paired observations of the same item, not a continuous
  time series.
- `label` preserves the source identifier; `displayLabel` is optional display
  text and never replaces the raw value in accessible names or tooltips.
- Supported sorting includes source order, start, end, delta, and absolute
  delta directions. Relative change is unavailable when the start is zero.
- Desktop uses a dumbbell view. At 520 px and below the runtime uses an exact
  paired-value list to keep long labels and both endpoints readable.

### Waterfall

```json
{
  "type": "waterfall",
  "steps": [
    {"id": "start", "label": "基期", "kind": "start", "value": 100},
    {"id": "volume", "label": "销量", "kind": "delta", "value": 20},
    {"id": "end", "label": "本期", "kind": "end", "value": 120}
  ],
  "reconciliationTolerance": 0.01
}
```

- The first step is `start`, the last is `end`, IDs are unique, and order is
  meaningful.
- `delta` values update the running total; `subtotal` values must equal the
  running total within tolerance; the final `end` must reconcile likewise.
- The runtime does not reorder or silently repair the bridge.
- Many steps use native component-level horizontal scrolling, never
  page-level overflow or custom grab gestures.

### Sparkline

```json
{
  "type": "sparkline",
  "points": [
    {"x": "W1", "value": 91.2},
    {"x": "W2", "value": 92.1, "status": "incomplete"}
  ],
  "variant": "line",
  "domainMode": "shared",
  "target": 96
}
```

- `x` values are unique; values may be numeric or `null`.
- `status` is `complete`, `incomplete`, or `missing`.
- `variant` is `line` or `bar`; `domainMode` is `shared` or `independent`.
- A metric item may embed the same `sparkline` object. Sparklines in one metric
  group share a domain by default so apparent slopes remain comparable.
- Incomplete segments use a dashed/faded treatment. Missing periods remain
  gaps, not zeros.

### Multiple line annotations

```json
{
  "type": "line",
  "labels": ["6/01", "6/08"],
  "series": [{"name": "SLA", "values": [92.4, 89.8]}],
  "annotations": [
    {
      "id": "routing-release",
      "date": "6/01",
      "label": "策略上线",
      "kind": "fact",
      "evidenceIds": ["event.routing-release"]
    },
    {
      "id": "adaptation",
      "index": 1,
      "label": "可能存在适应期",
      "kind": "interpretation"
    }
  ]
}
```

- Annotation IDs are unique. Set exactly one of `index` or `date`; `date` must
  match a line label.
- `kind` is `fact` or `interpretation`, with distinct line styles.
- The legacy single `annotation` object remains supported, but must not be
  mixed with `annotations`.
- Up to three full labels may appear in the desktop plot; later events use
  numbers. Narrow plots use numbers for all events and retain complete text in
  the event list below.

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
