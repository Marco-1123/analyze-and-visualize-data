---
name: analyze-and-visualize-data
description: "Analyze fixed datasets and turn them into polished, Feishu-ready visual deliverables. Use when Codex receives CSV, XLSX, JSON, Lark Sheet/Base data, tables, or structured metrics and needs to produce: (1) a narrative analysis report with native document prose plus one or more embedded self-contained HTML evidence components per chapter, or (2) a one-page static-data dashboard. Also use for requests mentioning 数据分析报告, 可视化报告, HTML 图表, 静态 Dashboard, 仪表盘, 数据故事, 管理层数据汇报, or embedding HTML analysis in Feishu/Lark documents. Do not use for continuously refreshed monitoring systems."
---

# Analyze and Visualize Data

Turn a fixed dataset into an accurate, explanatory, visually refined report or dashboard. Treat analytical correctness, communication clarity, and visual quality as equal completion requirements.

## Load only the references needed

- Always read [workflow.md](references/workflow.md), [data-contract.md](references/data-contract.md), [design-system.md](references/design-system.md), and [quality-assurance.md](references/quality-assurance.md).
- Read [report-mode.md](references/report-mode.md) for the default narrative report.
- Read [dashboard-mode.md](references/dashboard-mode.md) only when the user explicitly requests a dashboard or accepts a dashboard recommendation.
- Read [visualization-grammar.md](references/visualization-grammar.md) before choosing or building charts.
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

Both modes use fixed embedded data. Filters, tabs, sorting, tooltips, and local drill-down are allowed; network refresh, live databases, scheduled polling, and monitoring backends are out of scope.

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

### 2. Create the fact ledger

- Create an `analysis-facts.json` following [data-contract.md](references/data-contract.md).
- Compute every KPI, comparison, series, ranking, and exception before writing prose or chart configuration.
- Give each fact and finding a stable ID.
- Link each narrative claim to one or more fact IDs.
- Use the same fact values for prose, metric cards, charts, and tables.

### 3. Build the analysis plan

- Restate the decision or question the deliverable should support.
- Select only modules that contribute evidence.
- Organize the narrative as summary → evidence → explanation → implications.
- Prefer a report chapter to contain one primary question and one to three HTML components.
- Avoid chart inventories with no analytical storyline.

### 4. Choose the visual language

- Apply [design-system.md](references/design-system.md) as a hard baseline.
- Apply [visualization-grammar.md](references/visualization-grammar.md) to chart selection and annotation.
- Use the bundled tokens and runtime instead of inventing arbitrary colors, spacing, radii, or number formats.
- Use the light editorial theme by default. Use dark, highly decorative, or brand-heavy themes only when explicitly requested.
- Keep emphasis scarce: one main accent and semantic exceptions.

### 5. Generate the artifact

- Start from `assets/examples/report-kpi-spec.json`,
  `assets/examples/report-trend-spec.json`,
  `assets/examples/report-hourly-heatmap-spec.json`, or
  `assets/examples/report-diverging-bar-spec.json`, or
  `assets/examples/dashboard-spec.json`.
- Run:

```bash
python3 scripts/build_artifact.py --spec <spec.json> --output <artifact.html>
```

- Produce self-contained HTML with embedded data, CSS, and JavaScript.
- Do not require a web server for the default artifact.
- Use custom HTML only when the bundled component vocabulary cannot express a material analytical need; retain the same tokens and QA requirements.

### 6. Validate data and presentation

- Run `scripts/validate_artifact.py` on every HTML output.
- Render every final component rather than trusting source inspection alone.
- Inspect the common Feishu width, a narrow/mobile width, and full-screen width.
- Check clipping, overflow, label collisions, hierarchy, empty space, color semantics, number formatting, and interaction.
- For every multi-series line chart, verify nearest-x pointer snapping, a shared
  crosshair tooltip containing all series values, touch selection, and keyboard
  navigation. Render the legend as keyboard-accessible series toggles; hidden
  series must also disappear from crosshair points and the shared tooltip.
  Per-point hover targets or static legends alone are not acceptable.
- For a canonical 24-hour heatmap, default to one HTML component with 0–11 and
  12–23 rendered as vertically stacked groups. Both groups must share one color
  domain and one legend; never squeeze all 24 hours into one horizontal row.
- For a bar containing both negative and positive values, verify the common
  zero axis, directionally correct marks, unclipped category and endpoint
  labels, and native component-level horizontal scrolling at 390 px and
  520 px. Trackpad/wheel and touch scrolling must work without causing
  page-level overflow; do not add grab-to-drag JavaScript.
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
- `scripts/check_version.py`: verify semantic version metadata and release tags.
- `assets/design-tokens.json`: machine-readable visual tokens.
- `assets/theme.css`: shared light editorial visual language.
- `assets/visual-runtime.js`: dependency-free chart and component runtime.
- `assets/shell.html`: HTML artifact shell.
- `assets/examples/`: baseline report and dashboard specifications.
