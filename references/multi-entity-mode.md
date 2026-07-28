# Multi-entity analysis mode

Use this mode for a fixed-data request covering 2–10 peer queues, regions,
teams, channels, stores, projects, or other comparable entities.

## Operating principle

Do not repeat the single-entity report for every entity. Build one portfolio
story:

1. summarize the whole set;
2. compare entities on governed metrics;
3. identify material exceptions;
4. expand only the entities that warrant diagnosis;
5. retain complete exact values in a matrix or appendix.

Keep the original request in report mode unless the user requests a dashboard
or broad local exploration is the main need. Recommend dashboard mode when
frequent entity switching, sorting, or linked filtering matters more than a
narrative conclusion.

Treat frequent cross-component linked filtering as a custom-dashboard
requirement, not an existing baseline interaction. Record it explicitly in the
plan and implement and test it before promising it to the user.

## Required data contract

Set `analysisMode` to `multi-entity` and define:

- `entitySet.kind`;
- 2–10 `entitySet.entities`;
- one or more `metricDefinitions`;
- the comparison components.

Every entity requires a stable raw `id` and a concise `displayName`. Preserve
the raw ID in tooltips and accessible labels. Optional `group` supports cohort
reading; optional non-negative `weight` records a governed aggregation weight.

Every metric definition requires:

- a stable `id` and label;
- business direction;
- aggregation method;
- a denominator for ratios and weighted averages;
- number formatting;
- an optional governed target or benchmark.

Never calculate an overall value before the aggregation rule is known. Do not
average queue percentages when the correct result requires denominator
weighting.

## Default report architecture

For 2–4 entities:

- direct comparisons may use ordinary bars, ranges, targets, or up to four
  emphasized line series;
- use the comparison matrix when several metrics must be scanned together.

For 5–10 entities:

- keep overall KPIs to four to six portfolio metrics;
- use `comparison-matrix` for queue × metric status;
- use `small-multiples` for peer trends on one shared scale;
- use a ranked bar or exception table for contribution and priority;
- create detailed chapters only for materially important exceptions.

Do not default to:

- five to ten equal-weight queue chapters;
- five to ten simultaneously emphasized lines;
- one KPI card per queue per metric;
- independent small-multiple scales without an explicit disclosure;
- a queue selector that hides the portfolio-level conclusion.

## Exception selection

Prioritize detail using:

1. decision impact;
2. distance from a governed target or benchmark;
3. scale or contribution;
4. persistent deterioration or reversal;
5. data completeness risk.

State why an entity was selected. Keep unselected entities in the complete
comparison matrix or appendix.

## Component contracts

### Comparison matrix

Use `comparison-matrix` with:

- `metricIds`: 1–6 governed metric IDs;
- `rows`: 2–10 entity rows;
- one value object per row;
- optional row `coverage` from 0 to 1.

The runtime resolves labels, formats, directions, targets, and benchmark
semantics from the top-level registries. It keeps the entity column sticky and
contains horizontal overflow inside the component.

### Small multiples

Use `small-multiples` with:

- one governed `metricId`;
- shared ordered `labels`;
- 2–10 entity series;
- explicit `null` values for missing observations;
- no more than three `highlightEntityIds`.

The runtime uses one shared y-domain and one reference line for every panel.
Each panel supports exact pointer, touch, and keyboard point inspection. Use
highlighting only for entities selected by the exception policy.

## Dashboard guidance

A static multi-entity dashboard may add local entity switching or sorting, but
the first viewport must still show portfolio state and the main exception.
Filters must never change metric definitions, denominators, or aggregation
weights. Preserve an unfiltered reset and show the active scope.

## Completion gate

Verify:

- 2-, 5-, 8-, and 10-entity specifications validate;
- an 11-entity shared component fails instead of silently degrading;
- raw IDs survive concise labels;
- matrix references and tones match metric direction;
- shared small-multiple domains are identical;
- missing periods remain gaps;
- 390, 520, 880, and 1440 px remain page-contained;
- component-level scrolling is native and the sticky entity column remains
  readable;
- exact trend values work by pointer, touch, and keyboard;
- the report does not mechanically duplicate one chapter per entity.
