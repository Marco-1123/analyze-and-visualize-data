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

## 2. Chart rules

### Line

- Use for ordered time.
- Keep time intervals continuous or disclose gaps.
- Use no more than four emphasized series.
- Direct-label the final value when possible.
- For two or more series, use a shared x-axis crosshair tooltip by default:
  snap to the nearest time point, highlight every available series point, and
  show the time label plus all series values in one comparison panel.
- Preserve exact or appropriately formatted values in the shared tooltip even
  when the visible axis uses compact notation.
- Support pointer movement, touch selection, and Left/Right/Home/End keyboard
  navigation. Do not require precise hovering on an individual point.
- Render the legend as a visible, keyboard-accessible series filter. Clicking
  or activating an item toggles its line, end label, crosshair point, tooltip
  row, and accessible selected-value text as one state change.
- Keep at least one series visible and keep the original y-domain stable while
  toggling.
- Keep missing series values visible as unavailable (`—`) rather than silently
  removing the series from the comparison.
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
- On narrow screens, begin with the zero axis visible when possible and show a
  concise horizontal-scroll cue. Do not implement mouse grab-to-drag.

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
- On narrow screens, keep each 12-hour module legible and allow module-level
  horizontal scrolling; do not make the page itself overflow.

### Table

- Use when exact values or many dimensions matter.
- Do not reproduce every chart as a redundant table.
- Apply conditional emphasis sparingly.

## 3. Annotation

- Annotate the evidence that supports the nearby claim.
- Prefer a short label plus precise value.
- Use reference lines for target, average, or policy threshold.
- Distinguish observed annotation from interpretive commentary.
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
