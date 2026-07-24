# Static dashboard mode

## Purpose

Create one self-contained HTML page over a fixed embedded dataset. Allow local exploration without any live data connection.

## Recommended page architecture

1. Header: title, period, scope, source
2. Executive strip: three to six KPIs
3. Primary story: the most important trend or comparison
4. Diagnostic modules: composition, contribution, ranking, distribution
5. Exception or opportunity module
6. Detail table
7. Methodology and limitations

## Interaction

Allow:

- local filters;
- tabs;
- sorting;
- tooltips;
- dimension switches;
- linked highlighting;
- client-side search.

Do not require:

- authentication;
- network calls;
- database connections;
- refresh controls;
- background polling.

## First viewport

Ensure a viewer can answer within a few seconds:

- What is this?
- What period and population does it cover?
- What is the overall state?
- What is the most important finding?
- Where should attention go next?

## Density

- Use a 12-column grid on wide screens.
- Keep a four-KPI executive strip on one row throughout the common 760–960 px
  Feishu embed range. Reduce it to 2 × 2 only when the metric component is
  narrower than 640 px.
- Keep period, scope, and source as a single compact metadata row at Feishu
  width; move that row below the title before wrapping individual pairs.
- Keep related comparisons aligned.
- Prefer large modules for primary evidence and compact modules for context.
- Avoid equal-sized card grids when information importance is unequal.
- Preserve a logical vertical reading order on mobile.
