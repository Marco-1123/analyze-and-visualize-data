# Editorial Analytics Design System

## Contents

1. Design intent
2. System layers
3. Foundations
4. Data semantics
5. Components and layouts
6. Interaction and motion
7. Responsive behavior
8. Content design
9. Accessibility
10. Agent constraints

## 1. Design intent

Create restrained, premium, content-first analytical interfaces. Use Semi Design as the main enterprise-system reference, Apple HIG as a restraint and hierarchy reference, and Feishu/Lark documents as the host-context reference.

Express quality through typography, spacing, alignment, proportion, and precise data emphasis. Do not rely on decoration, gradients, excessive cards, or dramatic shadows.

Default personality:

- calm;
- exact;
- editorial;
- modern;
- quietly confident;
- dense only where density helps comparison.

## 2. System layers

Maintain these layers:

1. Principles
2. Global tokens
3. Semantic tokens
4. Data-visualization tokens
5. Components
6. Layout patterns
7. Interaction patterns
8. Content rules
9. Accessibility and QA

Do not let a local component bypass a global semantic rule without a documented analytical reason.

## 3. Foundations

Use `assets/design-tokens.json` and `assets/theme.css` as the executable source.

### Color

- Use warm white or cool-white canvas, white surfaces, graphite text, and restrained indigo-blue accent.
- Use one primary accent per artifact.
- Reserve semantic red, amber, and green for meaning.
- Use categorical colors only when categories must remain distinct.
- Keep non-focus series neutral.
- Never rely on color alone.

### Typography

- Prefer system UI fonts that render Chinese and Latin consistently.
- Use tabular numerals for metrics and tables.
- Limit visible hierarchy to approximately five text levels.
- Use weight, size, and spacing before introducing color.
- Keep long narrative prose in the native document, not inside chart canvases.

### Spacing

- Use the defined spacing scale only.
- Build rhythm from 4 px and 8 px increments.
- Use tighter spacing within a semantic group and larger spacing between groups.
- Preserve breathing room around the main conclusion.

### Shape and elevation

- Use restrained radii.
- Prefer hairline borders and surface contrast over shadows.
- Use elevation only for interactive overlays or tooltips.
- Do not put every chart inside a visually heavy card.

### Grid

- Align titles, metrics, plots, annotations, and notes to a shared grid.
- Use 12-column dashboard layouts and simple one/two-column report modules.
- Keep a readable maximum line length for prose.

## 4. Data semantics

Determine positive and negative colors from business meaning, not numerical sign alone.

- `accent`: selected or primary evidence;
- `positive`: favorable movement;
- `negative`: unfavorable movement;
- `warning`: requires attention but is not necessarily negative;
- `neutral`: comparison, baseline, or non-focus;
- `target`: goal or threshold;
- `forecast`: predicted or uncertain values.

Use line style and opacity to distinguish actual, target, forecast, and incomplete periods.

## 5. Components and layouts

### Metric cards

- Show label, value, unit, comparison, and optional context.
- Avoid decorative icons unless they improve identification.
- Use no more than six top-level metrics in one row group.
- Treat 160 px per card as the default minimum readable width. Keep four metrics
  in one row across the 760–960 px Feishu embed range; use a balanced 2 × 2
  layout only when the component itself is narrower than 640 px.
- Keep primary metric values between 24 and 32 px in the default theme. Narrow
  layouts must never increase the numeric type size.
- Make the comparison basis explicit.

### Header metadata

- Keep period, scope, and source as compact inline label-value pairs.
- At Feishu embed and full-page widths, render all available metadata pairs on
  one horizontal row. Moving the row below the title is allowed; breaking each
  label from its value or forcing a 2 + 1 metadata grid is not.
- Allow metadata pairs to stack only below 520 px or when unusually long source
  text genuinely exhausts the available row.

### Charts

- Use finding-led titles.
- Put units and scope in subtitles.
- Direct-label important values when space allows.
- Use annotation to connect visual evidence to the claim.
- Keep source and caveat near the chart.
- For diverging bars, reserve separate horizontal regions for category labels,
  negative endpoint labels, the signed plot, and positive endpoint labels.
  Compute a minimum readable width rather than shrinking these regions until
  they collide. Keep the category-label rail fixed while the signed plot
  scrolls, so row identity is never lost.
- Keep category rows aligned to their bars. Show at most two visible label
  lines, clamp longer labels without overflow, and expose the exact full label
  on hover, keyboard focus, and touch. Prefer a concise display label backed by
  an unchanged source identifier over an indefinitely wide label rail.

### Insight blocks

- Distinguish observed fact, interpretation, and action.
- Use accent rules or subtle backgrounds, not oversized icons.
- Keep one primary message per block.

### Decision blocks

- Express finding, interpretation, risk, action, and evidence with semantic
  labels and restrained borders rather than decorative status cards.
- Keep the decision statement, confidence or risk level, evidence trace, and
  any owner/due status visible without interaction.
- Use different semantics for an observed finding and an interpretation; a
  caveat is part of the interpretation, not a gray afterthought.

### Target and range comparisons

- Separate actual, target, baseline, gap, and attainment through labels before
  color.
- Use quality bands only when their thresholds have a real definition.
- Show a compact visual key for actual, target, and baseline markers.
- At narrow widths, prefer an exact paired-value list over an illegibly scaled
  dumbbell chart.

### Waterfall

- Keep start, subtotal, and end visually structural; keep deltas directional.
- Preserve ordered spacing and connector continuity.
- When the bridge exceeds the component, contain it in a native horizontal
  scroll viewport and keep the surrounding document fixed.

### Sparklines

- Keep sparklines subordinate to the primary KPI value.
- Use shared scales among peer cards by default.
- Use dashed or faded line segments for incomplete periods and visible gaps for
  missing periods.
- Avoid filled decorative areas or exaggerated independent slopes.

### Tables

- Right-align numeric columns.
- Align decimals when relevant.
- Freeze or visually reinforce headers in long tables.
- Use subtle row separators.
- Emphasize only the cells that support a finding.

### Report layout

- Optimize for 720–960 px embedded widths.
- Keep one primary analytical question per component.
- Use a single-column visual narrative by default.
- Use side-by-side charts only when direct comparison is the point.

### Dashboard layout

- Make the first viewport communicate title, scope, KPIs, and the most important pattern.
- Use progressive disclosure below the fold.
- Align related modules horizontally.
- Avoid masonry layouts that destroy reading order.

## 6. Interaction and motion

- Use interaction to reveal detail, not to hide basic meaning.
- Support keyboard focus for interactive controls.
- Treat a multi-series line chart as one comparison surface: pointer or touch
  position selects the nearest x-axis value, a vertical guide aligns the
  comparison, and one shared tooltip lists every series value.
- Render each multi-series legend item as a toggle button. Use color plus
  pressed state, opacity, and label treatment to distinguish visible and hidden
  series; do not rely on color alone.
- Keep at least one series visible. Hiding a series must update its line, end
  label, crosshair point, shared tooltip row, and accessible selected-value
  text together.
- Keep the y-domain stable while toggling series so visibility changes do not
  visually exaggerate or compress the remaining data.
- Make chart exploration available through Left/Right/Home/End keys and expose
  the selected label and values as accessible text.
- Keep touch selection persistent until the viewer chooses another point or
  taps outside the chart.
- Use native component-level horizontal scrolling for a diverging bar whose
  readable width exceeds its container. Support trackpad/wheel, touch,
  scrollbar, and keyboard behavior without JavaScript grab-to-drag gestures.
- Keep the zero axis visible in the initial narrow view when possible. Preserve
  the common quantitative scale while scrolling; never rescale the two sides
  independently.
- When an extreme signed-domain ratio compresses the smaller side below 24
  pixels, keep the main plot linear and add a restrained, explicitly labeled
  small-side detail. State that the detail uses an independent scale and is not
  comparable to the main plot's bar lengths.
- On scrollable diverging bars, provide three compact quick-position controls
  for the negative extreme, zero axis, and positive extreme. Native scrolling
  remains the primary gesture.
- Use native horizontal scrolling for long waterfalls as well. Do not install
  custom pointer or touch gestures.
- Standalone sparklines support pointer, touch, and keyboard point inspection.
- Multi-event line plots use complete labels on roomy layouts, numbered plot
  markers on narrow layouts, and an always-visible event list below.
- Keep animation between 120 and 240 ms.
- Animate state changes only when continuity aids understanding.
- Respect reduced-motion preferences.
- Keep filters local to the fixed embedded dataset.

## 7. Responsive behavior

Test at:

- 390 px mobile;
- 760–960 px Feishu embed;
- 1280–1440 px full-page dashboard.

At narrow widths:

- reduce metric columns according to the component's actual width and card
  count; prefer balanced grids and avoid orphaned final cards;
- convert two-column modules to one column;
- simplify axes and labels;
- allow tables to scroll horizontally with a visible cue;
- keep signed bars inside an independent horizontal scroll viewport, with a
  visible mobile cue and no page-level horizontal overflow;
- switch paired range charts to an exact stacked list at 520 px and below;
- keep long waterfalls inside their own scroll viewport;
- use numbered in-plot event markers and a complete event list;
- preserve the headline finding;
- never shrink text below the defined minimum.

For high-cardinality heatmaps:

- split a canonical 24-hour axis into 0–11 and 12–23 stacked modules inside one
  component;
- use a subtle shared container hierarchy rather than two unrelated cards;
- repeat row labels for scanability;
- retain one shared color scale and legend;
- calculate cell width from the component's actual width, row labels, and
  formatted cell values;
- fit both 12-hour modules without scrolling whenever that calculated minimum
  remains readable, including ordinary Feishu widths;
- enable module-level native scrolling and its cue only when the minimum
  readable width truly exceeds the module.

## 8. Content design

- Lead with the most important information.
- Use chart titles that state a question or finding.
- Keep labels short and unambiguous.
- State time period, unit, denominator, and comparison basis.
- Use consistent Chinese punctuation and spacing around Latin text, numbers, and units.
- Distinguish “上升 3%” from “上升 3 个百分点”.
- Avoid empty executive language such as “持续赋能” or “表现亮眼” without evidence.
- Reserve subdued gray notes for structured definitions, scope, methods,
  limitations, and sources. Never render analytical findings, causal claims,
  recommendations, or drafting commentary as a gray footnote.

## 9. Accessibility

- Meet WCAG AA contrast for essential text and controls.
- Provide text equivalents for key findings.
- Use patterns, labels, or line styles in addition to color.
- Provide focus-visible states.
- Use semantic headings, tables, and button elements.
- Ensure touch targets are at least 40 px where feasible.
- Do not encode essential information only in hover.

## 10. Agent constraints

Hard constraints:

- tokens;
- semantic colors;
- numeric formatting;
- accessibility;
- responsive breakpoints;
- validation and visual review.

Medium freedom:

- component composition;
- chart sizing;
- annotation placement.

High freedom:

- analytical storyline;
- finding selection;
- chart choice within the visualization grammar.

Reject outputs with rainbow palettes, unnecessary 3D, indiscriminate glassmorphism, excessive gradients, excessive rounded cards, low-contrast gray text, or generic admin-dashboard aesthetics.
