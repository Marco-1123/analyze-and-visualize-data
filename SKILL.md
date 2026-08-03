---
name: analyze-and-visualize-data
description: "Analyze fixed datasets and turn them into polished, Feishu-ready visual deliverables. Use when Codex receives CSV, XLSX, JSON, Lark Sheet/Base data, tables, or structured metrics and needs to produce: (1) a narrative analysis report with native document prose plus one or more embedded self-contained HTML evidence components per chapter, or (2) a one-page static-data dashboard. Also use for single or batch queue analysis, 2–10 peer queue/entity comparisons, 数据分析报告, 可视化报告, HTML 图表, 静态 Dashboard, 仪表盘, 数据故事, 管理层数据汇报, or embedding HTML analysis in Feishu/Lark documents. Do not use for continuously refreshed monitoring systems."
---

# Analyze and Visualize Data

Turn a fixed dataset into an accurate, explanatory, visually refined report or dashboard. Treat analytical correctness, communication clarity, and visual quality as equal completion requirements.

## Load only the references needed

- Always read [workflow.md](references/workflow.md) and
  [planning-and-evidence.md](references/planning-and-evidence.md) first.
- Read [data-contract.md](references/data-contract.md) while profiling and
  building the fact ledger.
- Read [design-system.md](references/design-system.md),
  [visualization-grammar.md](references/visualization-grammar.md), and
  [quality-assurance.md](references/quality-assurance.md) after the analysis
  plan has selected the necessary evidence components.
- Read [report-mode.md](references/report-mode.md) for the default narrative report.
- Read [dashboard-mode.md](references/dashboard-mode.md) only when the user explicitly requests a dashboard or accepts a dashboard recommendation.
- Read [multi-entity-mode.md](references/multi-entity-mode.md) when the request
  contains two or more peer queues, regions, teams, channels, stores, projects,
  or other entities that must be compared together.
- Read [feishu-embedding.md](references/feishu-embedding.md) when creating or updating a Feishu/Lark document or preparing HTML for its component container.
- Read [maintenance.md](references/maintenance.md) only when changing or
  releasing the Skill itself. Use the root `VERSION` file as the version source
  of truth.

## Route the output mode

Apply these rules in order:

1. Honor an explicit request for `report` or `dashboard`.
2. Default to `report` when the user does not specify a mode.
3. Recommend `dashboard` when the main need is broad browsing across many peer metrics or dimensions, a one-page overview, or interactive exploration without a strong narrative question.
4. Never silently switch an unspecified request from the default report to a dashboard. State the recommendation and let the user choose.

Both modes use fixed embedded data. A component may use filters, tabs, sorting,
tooltips, or local drill-down only when its catalog entry and bundled runtime
actually implement that interaction. Generic cross-component linked filtering
is not part of this Skill. Network refresh, live databases, scheduled polling,
and monitoring backends are out of scope.

## Use bounded analytical autonomy

- Proceed without clarification when field meanings and the requested business question are sufficiently clear.
- Ask only when an ambiguous metric definition, denominator, time grain, or population would materially change the conclusion.
- Record non-blocking assumptions in the deliverable's methodology or limitations section.
- Separate observed facts, derived findings, hypotheses, and recommendations. Do not present a plausible explanation as a proven cause.
- Prefer fewer defensible findings over many weak observations.

## Execute the workflow

### 1. Inspect and normalize the data

- Preserve the source file.
- Profile CSV, JSON, and XLSX inputs with `scripts/profile_data.py` when practical.
- Use the spreadsheets skill for complex workbooks, formulas, merged structures, or multiple related sheets.
- Check row counts, missingness, duplicates, types, ranges, category cardinality, time coverage, and likely units.
- Identify grain, dimensions, measures, identifiers, date fields, denominators, and comparison periods.
- When 2–10 peer entities are present, set `analysisMode: "multi-entity"` and
  create the governed entity and metric registries before aggregating or
  composing components.

### 2. Create the fact ledger

- Create an `analysis-facts.json` following [data-contract.md](references/data-contract.md).
- Compute every KPI, comparison, series, ranking, and exception before writing prose or chart configuration.
- Give each fact and finding a stable ID.
- Link each narrative claim to one or more fact IDs.
- Use the same fact values for prose, metric cards, charts, and tables.

### 3. Build the analysis plan

- Restate the decision or question the deliverable should support.
- Choose one recipe from `assets/analysis-recipes.json`.
- Choose components from `assets/component-catalog.json`; obey their data-shape,
  multi-entity, limit, and fallback contracts.
- Write an `analysis-plan.json` before writing component specs or HTML. Include
  chapter questions, component selection reasons, entity scope, evidence IDs,
  spec paths, and artifact paths.
- Select only modules that contribute evidence.
- Organize the narrative as summary → evidence → explanation → implications.
- Prefer a report chapter to contain one primary question and one to three HTML components.
- Avoid chart inventories with no analytical storyline.
- For multiple queues or peer entities, summarize the portfolio first, compare
  all entities second, and expand only material exceptions. Never duplicate the
  single-entity report for every entity.
- Create the ordered report/dashboard manifest and run the bundle validation
  command in [planning-and-evidence.md](references/planning-and-evidence.md).
  Do not proceed while the fact ledger, plan, specs, and manifest disagree.

### 4. Choose the visual language

- Apply [design-system.md](references/design-system.md) as a hard baseline.
- Apply [visualization-grammar.md](references/visualization-grammar.md) to chart selection and annotation.
- Use the bundled tokens and runtime instead of inventing arbitrary colors, spacing, radii, or number formats.
- Use the light editorial theme by default. Use dark, highly decorative, or brand-heavy themes only when explicitly requested.
- Keep emphasis scarce: one main accent and semantic exceptions.

### 5. Generate the artifact

- Start from the example path declared by the selected component in
  `assets/component-catalog.json`.
- Run:

```bash
python3 scripts/build_artifact.py --spec <spec.json> --output <artifact.html>
```

- Produce self-contained HTML with embedded data, CSS, and JavaScript.
- Do not require a web server for the default artifact.
- Use custom HTML only when the bundled component vocabulary cannot express a material analytical need; retain the same tokens and QA requirements.

### 6. Validate data and presentation

- Run `scripts/validate_artifact.py` on every HTML output.
- Re-run `scripts/validate_analysis_bundle.py` after final spec and manifest
  edits; a visual render cannot substitute for evidence closure.
- Render every final component rather than trusting source inspection alone.
- Inspect the common Feishu width, a narrow/mobile width, and full-screen width.
- Check clipping, overflow, label collisions, hierarchy, empty space, color semantics, number formatting, and interaction.
- For every multi-series line chart, verify nearest-x pointer snapping, a shared
  crosshair tooltip containing all series values, touch selection, and keyboard
  navigation. Render the legend as keyboard-accessible series toggles; hidden
  series must also disappear from crosshair points and the shared tooltip.
  Per-point hover targets or static legends alone are not acceptable.
- For line value labels, default to `valueLabels.mode: "auto"`. Use `key` when
  the business needs explicit event, end, extrema, or threshold values; use
  `all` only on explicit request. Never overlap static labels or make the line
  plot scroll to fit them. If an all-point request is too dense, keep
  prioritized labels in the plot and provide the complete expandable value
  table. Missing values remain gaps and are never labeled as zero.
- Before building any line chart, reconcile each `series[].values` array
  against `labels[]`: lengths must match exactly and missing observations must
  be explicit `null` placeholders. Never trim the data array to the subset of
  static labels expected to remain visible. After rendering, if `auto` resolves
  to `all`, verify that every valid source point actually received a static
  label; the preflight decision and final placement counts must agree.
- Preserve the selected line-chart baseline while reserving an automatic,
  pixel-aware buffer between source extrema and the plot boundaries. Static
  labels, selection rings, and annotations must not sit directly against the
  SVG edge. Treat `maxPerSeries` as a key-point cap only: when `auto` resolves
  to `all`, it must not truncate an otherwise readable short series.
- For a canonical 24-hour heatmap, default to one HTML component with 0–11 and
  12–23 rendered as vertically stacked groups. Both groups must share one color
  domain and one legend; never squeeze all 24 hours into one horizontal row.
  Fit each 12-hour group into the component when its calculated readable cell
  width permits; use native module-level scrolling only when it does not fit.
- For a bar containing both negative and positive values, verify the common
  zero axis, directionally correct marks, unclipped category and endpoint
  labels, and native component-level horizontal scrolling at 390 px and
  520 px. Trackpad/wheel and touch scrolling must work without causing
  page-level overflow; do not add grab-to-drag JavaScript.
- For long diverging-bar categories or queue IDs, preserve exact source
  identifiers, keep visible labels to at most two non-overlapping lines, and
  expose full names by pointer, keyboard focus, and touch. Use optional
  `displayCategories` for concise human-readable labels without replacing
  `categories`.
- For extreme positive/negative ratios, keep the main plot on one linear scale,
  require the labeled independent-scale small-side detail, and verify all three
  quick-position controls.
- Use `decision` when a finding, interpretation, risk, or action needs explicit
  evidence, confidence, caveat, ownership, or impact semantics. Never present
  an interpretation as a measured fact.
- Use `target` for actual-versus-goal reading. Derive gap and attainment from
  the source actual, target, and direction; show attainment as unavailable when
  a zero target or cross-sign comparison makes the ratio misleading.
- Use `range` only for paired start/end observations of the same entity. At
  narrow widths switch to an exact paired-value list rather than shrinking a
  dumbbell chart until labels become unreadable.
- Require a `waterfall` to reconcile its ordered start, deltas, subtotals, and
  end value before rendering. Keep many steps in a component-level native
  horizontal scroll viewport.
- Keep metric sparklines secondary to their KPI. Same-group sparklines share a
  y-domain by default, and incomplete or missing periods must remain explicit.
- For `line.annotations[]`, separate fact events from interpretations. At
  narrow widths use numbered plot markers with a complete event list below;
  time adjacency is context, not proof of causation.
- Use structured component notes only for definitions, scope, methods,
  limitations, and sources. Put findings and recommendations in analytical
  content, not in subdued gray notes.
- For 5–10 queue trends, prefer shared-scale `small-multiples` over five to ten
  simultaneously emphasized line series. Use `comparison-matrix` for governed
  queue × metric scanning; keep exact raw queue IDs accessible behind concise
  display names.
- A `small-multiples` panel may contain one to three compatible governed line
  series. Use the component-level shared legend, keep its visibility state
  synchronized across every entity panel, preserve the shared y-domain, and
  verify per-panel multi-value pointer, touch, and keyboard inspection. Never
  mix incompatible units or drop nested series to make a compact plot fit.
- Iterate after visual inspection. One-pass HTML generation is not complete.

### 7. Assemble the delivery

For `report`:

- Write the narrative in native Feishu/Lark document blocks by default.
- Place one or more HTML evidence components after the relevant chapter text.
- Include executive summary, methodology, assumptions, limitations, and data scope.
- Keep each component understandable in the immediate document context.
- Keep one report component focused on one evidence task. Do not use a mini-dashboard as the default chapter component.

For `dashboard`:

- Deliver one self-contained HTML page.
- Keep the first viewport decisive: title, scope, key KPIs, and the most important finding.
- Provide detail progressively below the fold.

### 8. Publish to Feishu when requested

- Use the lark-doc skill for document creation and editing.
- Follow [feishu-embedding.md](references/feishu-embedding.md) for HTML component preparation and compatibility checks.
- Prefer direct HTML-file component mounting when the connected Feishu environment supports it.
- If automated component insertion is unavailable, still create the final HTML files and document structure, then state the exact remaining manual insertion step.
- Do not deploy a public webpage unless the user explicitly requests hosting.

## Definition of done

Do not declare completion until:

- Source scope and assumptions are stated.
- Key calculations are reproducible.
- The fact ledger, analysis plan, component specs, and manifest pass bundle
  validation.
- Narrative numbers match charts and tables.
- Claims distinguish fact from hypothesis.
- Every chart answers a specific question.
- The design system is applied consistently.
- The artifact passes automated validation.
- Rendered output has been visually inspected at required widths.
- The Feishu handoff or embedding status is explicit.

## Bundled resources

- `scripts/profile_data.py`: profile CSV, JSON, and XLSX inputs.
- `scripts/build_artifact.py`: compile a JSON artifact specification into self-contained HTML.
- `scripts/validate_artifact.py`: enforce structural, portability, and accessibility checks.
- `scripts/validate_analysis_bundle.py`: enforce recipe, evidence, component,
  entity-scope, spec, and manifest consistency.
- `scripts/run_qa.py`: run the complete package regression suite through one
  command; use `--quick` only when browser checks are intentionally deferred.
- `scripts/render_artifact.py`: render and interactively inspect any generated
  artifact at the required widths while automatically locating the bundled
  browser runtime.
- `scripts/test_p1_runtime.mjs`: exercise P1 components, edge cases, native
  scrolling, touch, keyboard, and responsive behavior in a headless browser.
- `scripts/test_line_value_labels.mjs`: verify intelligent line-label density,
  collision avoidance, exact-value fallback, legend synchronization, missing
  values, and responsive containment.
- `scripts/check_version.py`: verify semantic version metadata and release tags.
- `assets/design-tokens.json`: machine-readable visual tokens.
- `assets/component-catalog.json`: machine-readable capability and constraint
  catalog for every shared component.
- `assets/analysis-recipes.json`: reusable analytical sequences and required
  chapter roles.
- `assets/theme.css`: shared light editorial visual language.
- `assets/visual-runtime.js`: dependency-free chart and component runtime.
- `assets/shell.html`: HTML artifact shell.
- `assets/examples/`: baseline report and dashboard specifications.
