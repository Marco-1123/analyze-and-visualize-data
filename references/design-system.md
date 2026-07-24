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
- Make the comparison basis explicit.

### Charts

- Use finding-led titles.
- Put units and scope in subtitles.
- Direct-label important values when space allows.
- Use annotation to connect visual evidence to the claim.
- Keep source and caveat near the chart.

### Insight blocks

- Distinguish observed fact, interpretation, and action.
- Use accent rules or subtle backgrounds, not oversized icons.
- Keep one primary message per block.

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
- Make chart exploration available through Left/Right/Home/End keys and expose
  the selected label and values as accessible text.
- Keep touch selection persistent until the viewer chooses another point or
  taps outside the chart.
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

- stack metric cards;
- convert two-column modules to one column;
- simplify axes and labels;
- allow tables to scroll horizontally with a visible cue;
- preserve the headline finding;
- never shrink text below the defined minimum.

For high-cardinality heatmaps:

- split a canonical 24-hour axis into 0–11 and 12–23 stacked modules inside one
  component;
- use a subtle shared container hierarchy rather than two unrelated cards;
- repeat row labels for scanability;
- retain one shared color scale and legend;
- prefer readable cells plus inner horizontal scrolling over compressed labels.

## 8. Content design

- Lead with the most important information.
- Use chart titles that state a question or finding.
- Keep labels short and unambiguous.
- State time period, unit, denominator, and comparison basis.
- Use consistent Chinese punctuation and spacing around Latin text, numbers, and units.
- Distinguish “上升 3%” from “上升 3 个百分点”.
- Avoid empty executive language such as “持续赋能” or “表现亮眼” without evidence.

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
