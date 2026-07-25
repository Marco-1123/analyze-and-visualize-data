# Quality assurance

## Contents

1. Data checks
2. Analytical checks
3. Visual checks
4. Portability checks
5. Completion gate

## 1. Data checks

- Reconcile row counts and totals with the source.
- Check duplicates at the declared grain.
- Check missing and invalid denominators.
- Check time boundaries and incomplete periods.
- Recompute a representative sample independently.
- Verify rankings after filters and aggregation.
- Verify that displayed rounding does not reverse order or hide material differences.

## 2. Analytical checks

- Link each claim to evidence.
- Mark hypotheses and recommendations.
- Check whether mix, base size, or selection effects offer an alternative explanation.
- Remove redundant findings.
- State limitations that could alter decisions.
- Ensure recommendations follow from the evidence and remain proportionate.

## 3. Visual checks

Render and inspect at:

- 390 × 844;
- 520 × 900;
- 880 × 1000 or the closest Feishu component width;
- 1440 × 1000 for dashboard mode.

Check:

- clipping and overflow;
- text wrapping and truncation;
- label collisions;
- inconsistent alignment;
- empty or overly dense regions;
- four-card metric groups remain one row at 880 px and use a balanced 2 × 2
  layout at 390 px;
- primary metric values remain within the 24–32 px type range and never become
  larger at a narrower viewport;
- period, scope, and source remain one horizontal metadata row at 880 px, with
  each label and value kept on the same line;
- chart-title truthfulness;
- semantic color use;
- contrast and focus state;
- tooltip visibility;
- multi-series line-chart pointer snapping;
- shared tooltip label, series count, and numeric-value correctness;
- synchronized crosshair and point highlighting;
- legend buttons expose correct pressed state and keyboard activation;
- hiding a legend series removes its line, static labels, crosshair point,
  tooltip row, complete-table row, and accessible value while keeping the
  y-domain stable;
- restoring a series returns all linked marks and values;
- attempting to hide the final visible series is prevented and announced;
- Left/Right/Home/End keyboard navigation and accessible selected-value text;
- persistent touch selection without blocking vertical page scrolling;
- line value-label modes `auto`, `none`, `end`, `key`, and `all` pass schema
  validation; invalid include keys, thresholds, and caps fail;
- short single-series fixtures show all values when their formatted boxes fit;
  at 390 px and 520 px they degrade only when actual collision-free placement
  cannot contain every label;
- seven-day fixtures preserve all seven labels and all seven ordered source
  entries through specification, build, and render. A 7-label / 4-value input
  must fail before HTML generation, with explicit `null` required for a
  genuinely missing observation;
- when `auto` resolves to `all`, candidate count, rendered-label count, and
  valid source-point count must match after placement. A preflight decision
  alone is not sufficient;
- dense multi-series and 52-point fixtures retain prioritized plot labels,
  expose complete exact-value tables, and create no page-level overflow;
- label bounding boxes and x-axis labels do not overlap at 390, 520, 818, 880,
  and 1440 px;
- null and empty line values remain gaps and never receive a static label;
- expandable value tables preserve every time column and series row, accept
  native horizontal wheel/trackpad and touch scrolling, and keep the first
  series column readable;
- table scrolling;
- diverging bars preserve one zero axis and render every positive mark to its
  right and every negative mark to its left;
- diverging-bar endpoint labels remain inside the SVG bounds, while every
  category label remains visible in the fixed label rail;
- diverging-bar fixtures include 20+ character Chinese labels, 40+ character
  Chinese labels, delimited machine identifiers, and unbroken 60-character
  identifiers; visible label text never escapes its two-line row or overlaps
  the adjacent row;
- optional `displayCategories` stay aligned one-to-one with source
  `categories`; the rail uses the display label while pointer, keyboard, touch,
  accessible names, and bar-mark tooltips preserve the exact source category;
- at 390 px and 520 px, an oversized diverging bar scrolls inside its own
  container via native horizontal wheel/trackpad and touch movement;
- the diverging-bar initial narrow view exposes the zero axis, scrolling
  reaches both signed extremes, and the document itself never overflows;
- extreme positive-dominant and negative-dominant fixtures preserve a linear
  main scale, identify the compressed side, show exact values in a labeled
  independent-scale detail, and never imply that detail-bar length is
  comparable to the main plot;
- the negative-extreme, zero-axis, and positive-extreme quick-position controls
  reach their targets at 390 px, 520 px, common Feishu width, and desktop width;
- diverging bars do not install mouse grab-to-drag or custom touch gestures;
- canonical 24-hour heatmaps render exactly two groups with 12 columns each;
- all 24 heatmap columns appear exactly once and preserve their original order;
- stacked heatmap groups expose identical color-domain bounds and one shared
  legend;
- canonical heatmaps fit both 12-column modules without horizontal scrolling at
  520 px, common Feishu width, and wider viewports when the calculated minimum
  cells permit it;
- at narrower widths, heatmaps scroll only inside the affected module; the
  scroll cue appears if and only if overflow exists, and the page never
  overflows;
- heatmap cell tooltips preserve the exact source value and row/column labels;
- decision fixtures cover finding, interpretation, risk, action, and evidence
  semantics; required confidence, caveat, likelihood, impact, ownership, and
  evidence fields remain visible and correctly labeled;
- target fixtures cover higher-is-better, lower-is-better, neutral, zero
  target, zero actual, cross-sign values, ordered quality ranges, and multiple
  targets; actual, target, gap, and derived attainment never disagree;
- target marker keys remain understandable without relying on color, and
  target components never cause page-level horizontal overflow;
- paired-range fixtures cover positive, negative, equal, zero-start, extreme,
  and long raw-label cases; raw labels remain available in accessible names and
  tooltips;
- paired ranges use a readable dumbbell at ordinary Feishu width and an exact
  paired-value list at 390 px and 520 px, without clipped values or tiny text;
- waterfall fixtures cover zero, positive, and negative deltas, subtotals, long
  labels, and enough steps to overflow; invalid reconciliation fails before
  rendering;
- waterfall order, start, running totals, subtotals, and final end value match
  the specification; at 390 px and 520 px native scrolling reaches all steps
  while the page itself remains contained;
- waterfall and other native-scroll components do not install mouse
  grab-to-drag or custom touch handlers;
- metric and standalone sparkline fixtures cover shared and independent
  domains, single points, missing values, incomplete periods, target and
  baseline lines, and line/bar variants;
- incomplete sparkline segments use dashed/faded treatment, missing values do
  not become zero, and standalone point inspection works by pointer, touch, and
  Left/Right/Home/End keyboard navigation;
- multi-event line fixtures cover fact and interpretation styles, date and
  index addressing, more than three events, and closely spaced events;
- at 390 px and 520 px line events use numbered plot markers with the complete
  event content below; at wider widths no more than three full plot labels
  appear and event lines do not hide the trend;
- every component gray note uses a recognized structured kind and label;
  ambiguous analytical claims and drafting language fail specification
  validation instead of reaching the artifact;
- reduced-motion behavior;
- consistency across report components.

Use `scripts/render_artifact.mjs` when the bundled browser runtime is available. Otherwise open the HTML in an available browser and capture equivalent screenshots.

## 4. Portability checks

- Keep the default artifact self-contained.
- Keep each HTML file at or below 500 KB, the verified Feishu HTML block limit.
- Use `auto` height for report evidence components and `viewport` height for dashboards.
- Avoid external fonts, images, and scripts unless Feishu compatibility has been confirmed and the user accepts the dependency.
- Do not include secrets, local absolute file paths, or source-system credentials.
- Escape embedded JSON safely.
- Keep filenames stable and descriptive.

## 5. Completion gate

Require:

- automated validator passes;
- no unresolved console errors;
- visual inspection completed;
- at least one visual refinement after the first render for new layouts;
- explicit Feishu embedding or handoff status.

For a new shared component, completion requires a real Feishu HTML-block
mount/update and readback in addition to local screenshots. Confirm the mounted
file reference, byte identity when the API exposes the stored file, and an
authenticated browser render at an ordinary Feishu width and at a narrow width.
