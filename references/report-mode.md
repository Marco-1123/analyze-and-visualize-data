# Report mode

## Default output

Create native Feishu/Lark narrative blocks with one or more self-contained HTML evidence components after each relevant chapter.

## Recommended structure

1. Title and scope
2. Executive summary
3. Data quality and methodology
4. Chapter 1: overall performance
5. Chapter 2: key decomposition
6. Chapter 3: exceptions or drivers
7. Implications and recommended actions
8. Limitations and appendix

Adapt the chapters to the business question. Do not force this exact outline when fewer sections communicate better.

For 2–10 peer queues or entities, use the portfolio sequence in
`multi-entity-mode.md`: portfolio summary → governed comparison → material
exceptions → selected detail → complete appendix. Do not create one equal
chapter per entity.

## Chapter contract

Each chapter should contain:

- a question-led heading;
- one to three findings;
- concise native prose;
- one or more HTML evidence components;
- interpretation and caveat;
- optional next action.

Place the conclusion before the chart when the audience is executive. Place the exploratory question before the chart when discovery is the point.

## HTML component contract

- Keep a component focused on one primary analytical question.
- Use one chart, one compact KPI strip, one table, or a tightly related comparison pair.
- Use a decision block when the chapter must preserve the distinction between a
  finding, an interpretation, a risk, and a next action.
- Use a target block for goal status, a paired range for two-period movement, a
  waterfall for a reconciled additive bridge, and sparklines only for compact
  secondary trends.
- Include title, scope, unit, source, and a short evidence note.
- Avoid duplicating long prose from the native document.
- Make the component understandable if viewed alone.
- Optimize for Feishu embedding and avoid unnecessary page chrome.
- Keep conclusions, causal interpretation, and recommendations in native document prose by default.
- Do not bundle KPI, trend, decomposition, and recommendation into one report component merely because the runtime supports it.
- Target one component at roughly 180–520 px natural height at common Feishu width; exceed this only when the evidence itself requires it.
- A 5–10 entity shared-scale small-multiple component may exceed the ordinary
  height target when keeping the complete peer comparison together is the
  evidence task. Do not split it into unrelated cards solely to satisfy a
  nominal height.

## Report manifest

Maintain a working manifest:

```json
{
  "title": "Q2 performance review",
  "mode": "report",
  "sections": [
    {
      "id": "overall",
      "heading": "1. Overall performance",
      "findingIds": ["finding_growth"],
      "components": ["01-kpi-overview.html", "02-weekly-trend.html"]
    }
  ]
}
```

Use the manifest to prevent missing, duplicated, or misplaced components.
