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
- Do not smooth lines when smoothing implies unobserved values.

### Bar

- Start quantitative bars at zero.
- Sort by value unless time or a natural order applies.
- Prefer horizontal orientation for long category labels.
- Use one focus color and neutral comparisons.

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
