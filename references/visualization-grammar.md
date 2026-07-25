# Visualization grammar

## Contents

1. Choose by analytical question
2. Chart rules
3. Annotation
4. Density and reduction
5. Anti-patterns

## 1. Choose by analytical question

| Question | Preferred forms |
|---|---|
| What is the level? | metric, bullet, compact table |
| How did it change over time? | line, area only for meaningful magnitude |
| Which category is larger? | sorted horizontal bar |
| What contributes to the total? | stacked bar, contribution bar, donut only for few parts |
| Where is the change concentrated? | contribution bar, waterfall, Pareto |
| How is it distributed? | histogram, box plot, strip plot |
| Are two measures related? | scatter with careful caveat |
| Where are hot spots across two dimensions? | heatmap |
| How does a process convert? | funnel or staged bars |
| How do cohorts retain? | cohort heatmap |
| What needs attention? | exception table, annotated control/trend chart |
| How far are we from a goal? | target/bullet view |
| How did the same entities move between two endpoints? | paired range/dumbbell |
| What bridges a starting value to an ending value? | waterfall |
| What is the short local direction beside a KPI? | sparkline |
| What decision, risk, or action follows from the evidence? | decision block |

## 2. Chart rules

### Line

- Use for ordered time.
- Keep time intervals continuous or disclose gaps.
- Use no more than four emphasized series.
- Use intelligent static value labels when they materially shorten lookup:
  `auto` for the default, `end` for a minimal endpoint read, `key` for
  business-significant points, `all` only when complete visible labeling is
  explicitly required, and `none` when the line is contextual.
- `auto` may show every point only for a short single series whose formatted
  values fit the actual plot width. Dense or multi-series plots must retain
  prioritized labels rather than shrink text or permit overlap.
- If `all` cannot fit, preserve selected labels in the plot and provide the
  complete exact values in an expandable, horizontally scrollable table. Do
  not make the line plot itself scroll merely to fit static labels.
- For two or more series, use a shared x-axis crosshair tooltip by default:
  snap to the nearest time point, highlight every available series point, and
  show the time label plus all series values in one comparison panel.
- Preserve exact or appropriately formatted values in the shared tooltip even
  when the visible axis uses compact notation.
- Support pointer movement, touch selection, and Left/Right/Home/End keyboard
  navigation. Do not require precise hovering on an individual point.
- Render the legend as a visible, keyboard-accessible series filter. Clicking
  or activating an item toggles its line, static labels, crosshair point,
  tooltip row, complete-table row, and accessible selected-value text as one
  state change.
- Keep at least one series visible and keep the original y-domain stable while
  toggling.
- Keep missing series values visible as unavailable (`—`) rather than silently
  removing the series from the comparison.
- Render missing observations as real gaps; never coerce `null` or empty values
  to zero or attach a static label to them.
- Do not smooth lines when smoothing implies unobserved values.

### Bar

- Start quantitative bars at zero.
- Sort by value unless time or a natural order applies.
- Prefer horizontal orientation for long category labels.
- Use one focus color and neutral comparisons.
- When both signs are present, use one diverging bar with a shared zero axis and
  one quantitative scale. Positive marks extend right and negative marks extend
  left.
- Derive the fixed category-label rail and the signed plot's minimum readable
  width from the category text, signed domain, and formatted endpoint labels.
  If the plot exceeds the remaining component width, scroll it with native
  browser behavior instead of compressing or clipping it.
- For long category names or queue identifiers, preserve the raw identifier,
  optionally provide a concise display label, and limit the fixed rail to two
  visible lines. Full text must remain available by pointer, keyboard, and
  touch; labels must never overlap adjacent bar rows.
- On narrow screens, begin with the zero axis visible when possible and show a
  concise horizontal-scroll cue. Do not implement mouse grab-to-drag.
- Preserve one true linear scale even when positive and negative extremes differ
  sharply. If the smaller side would occupy fewer than 24 pixels, add a clearly
  named small-side detail with exact values and an explicit independent-scale
  disclaimer; never use an unlabeled broken axis or silently normalize the two
  sides.
- For scrollable plots, expose quick positioning to the negative extreme, zero
  axis, and positive extreme so a large domain does not require a long manual
  traversal.

### Stacked bar

- Use for composition across a small number of periods or groups.
- Keep segment order stable.
- Avoid when precise comparison of middle segments is the main task.

### Donut

- Use only for a small part-to-whole relationship.
- Prefer no more than five slices.
- Place the key total or focus share in the center.
- Use bars when precise comparison matters.

### Heatmap

- Sort rows and columns meaningfully.
- Provide a legend with units.
- Use sequential color for magnitude and diverging color only around a meaningful midpoint.
- Display values when the grid is small enough.
- For canonical 24-hour columns, use one component with two vertical modules:
  0–11 above 12–23. Repeat row labels, but do not duplicate the source matrix.
- Use one shared domain and one shared legend across heatmap modules so equal
  colors always mean equal values.
- Preserve exact cell values in keyboard-accessible and pointer-accessible
  tooltips even when visible labels are reduced.
- Size cells from the actual module width and formatted values. Fit all 12
  columns without scrolling when readability permits; otherwise allow
  module-level native horizontal scrolling and show the cue only while overflow
  exists. Never make the page itself overflow.

### Target

- Use for actual versus target, not as decorative progress.
- Show actual, target, signed gap, attainment when meaningful, and direction.
- Include a baseline only when it is a real comparison point.
- Use ordered quality ranges only when the boundaries are governed or
  analytically justified.
- Do not calculate attainment across zero or against a zero target.

### Paired range

- Use when every entity has exactly two comparable endpoints.
- Keep both endpoint labels and values explicit; do not imply intermediate
  observations.
- Sort by delta only when ranking movement is the analytical point.
- Use a mobile paired-value list when a compact dumbbell would require tiny
  labels or ambiguous overlap.

### Waterfall

- Use for an additive bridge from a start value to a reconciled end value.
- Preserve business sequence. Do not sort contributions after the fact.
- Distinguish start/end/subtotal from deltas using structure and labels.
- Treat positive and negative as mathematical direction unless business
  semantics separately justify favorable/unfavorable colors.
- Scroll the component natively when many steps cannot remain readable.

### Sparkline

- Use as a compact secondary trend, not as the only evidence for a complex
  conclusion.
- Share y-domains among peer KPI sparklines unless independent scaling is
  explicitly disclosed.
- Mark incomplete and missing periods; never draw missing observations as zero.
- Retain exact point values through accessible pointer, touch, and keyboard
  interaction for a standalone sparkline.

### Decision

- Use to make the status of a statement explicit: finding, interpretation,
  risk, action, or evidence.
- Keep core meaning, confidence, impact, owner, and due date visible when they
  matter; tooltips may add detail but may not hide the decision.
- Link factual findings and actions to stable evidence IDs.
- Give interpretations an explicit caveat and never style them as proven facts.

### Table

- Use when exact values or many dimensions matter.
- Do not reproduce every chart as a redundant table.
- Apply conditional emphasis sparingly.

## 3. Annotation

- Annotate the evidence that supports the nearby claim.
- Prefer a short label plus precise value.
- Use reference lines for target, average, or policy threshold.
- Distinguish observed annotation from interpretive commentary.
- Multiple line events use stable IDs and a complete event list. On narrow
  plots, replace long in-plot labels with numbered markers.
- Event timing provides context only. Do not claim causality from temporal
  overlap.
- Do not cover data marks or create visual clutter.

## 4. Density and reduction

- Aggregate or group categories before rendering unreadable labels.
- Use Top N plus “Other” when a long tail is not individually decision-relevant.
- Preserve the full dataset in a detail table when reduction could hide important context.
- Reduce decimal places, gridlines, legends, and repeated units before reducing font size.

## 5. Anti-patterns

Do not use:

- 3D chart effects;
- dual axes without a strong analytical justification;
- gauges for ordinary percentages;
- decorative radar charts;
- maps when geography is not analytically relevant;
- red/green without labels;
- pie charts with many slices;
- truncated bar axes;
- visual area that exaggerates a small difference;
- correlation language that implies causation.
