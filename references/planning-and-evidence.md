# Analysis planning and evidence closure

Use this gate after profiling the source and before writing component
specifications or HTML. Its purpose is to make cross-Agent decisions
inspectable and to prevent attractive but unsupported output.

## Required bundle

Create these four layers:

1. `analysis-facts.json`: normalized facts, series, findings, events, methods,
   limitations, and recommendations. Every item has a globally unique `id`.
2. `analysis-plan.json`: the chosen recipe, business question, data shape,
   chapter questions, component choices, entity scope, and evidence links.
3. One or more component spec files: the exact inputs to
   `scripts/build_artifact.py`.
4. A report or dashboard manifest: the ordered sections and final HTML files.

Do not skip the plan and reconstruct it after generating HTML.

## Select a recipe and components

Read:

- `assets/analysis-recipes.json` for reusable analytical sequences;
- `assets/component-catalog.json` for the question, data shape, entity support,
  limits, fallback, and example attached to every shared component.

Choose the recipe that best matches the decision. A recipe is a reasoning
scaffold, not a requirement to create every optional component. Required
section roles must be present even when a section is native document prose
without HTML.

In multi-entity work:

- `native` components may show all or a selected subset;
- `selective` components must name the selected entity IDs and remain within
  the component limit;
- `portfolio-only` components must represent the aggregate portfolio rather
  than masquerade as an all-entity comparison.

## Analysis plan contract

Use `schemaVersion: "1.0"`:

```json
{
  "schemaVersion": "1.0",
  "recipeId": "multi-entity-portfolio",
  "mode": "report",
  "analysisMode": "multi-entity",
  "question": "Which queues require attention and why?",
  "dataShape": {
    "entityCount": 8,
    "metricCount": 4,
    "timePointCount": 7
  },
  "sections": [
    {
      "id": "peer-comparison",
      "role": "peer-comparison",
      "question": "Where are the material peer differences?",
      "evidenceIds": ["finding.peer-exceptions"],
      "findingIds": ["finding.peer-exceptions"],
      "components": [
        {
          "id": "queue-matrix",
          "type": "comparison-matrix",
          "spec": "output/queue-matrix-spec.json",
          "artifact": "output/queue-matrix.html",
          "entityScope": "all",
          "evidenceIds": ["finding.peer-exceptions"],
          "selectionReason": "A governed matrix compares all peers across the same metrics."
        }
      ]
    }
  ]
}
```

For a selective multi-entity component, use:

```json
{
  "entityScope": "selected",
  "selectedEntityIds": ["queue-a", "queue-b"]
}
```

Every non-divider component needs at least one evidence ID and a plain-language
selection reason. Component evidence must be a subset of the parent section
evidence.

## Evidence rules

- Finding `evidence` IDs must resolve to real ledger items and cannot cite the
  finding itself.
- Section and component evidence IDs must resolve.
- `findingIds` must resolve specifically to ledger findings.
- Manifest sections repeat the plan's `findingIds`. They may also repeat
  `evidenceIds`; when present, those IDs must match the plan section exactly.
- Each component spec repeats the planned `evidenceIds`.
- Planned and generated component IDs, types, spec paths, and artifact paths
  must agree exactly.
- Every planned artifact appears exactly once in the final manifest.

## Validate before building

Run:

```bash
python3 scripts/validate_analysis_bundle.py \
  --facts <analysis-facts.json> \
  --plan <analysis-plan.json> \
  --manifest <report-manifest.json> \
  --spec <component-1-spec.json> \
  --spec <component-2-spec.json>
```

Fix every error before generating or delivering HTML. Then build the artifacts
and run `python3 scripts/run_qa.py` from the Skill repository when maintaining
the shared package. For a user output, run the bundle validator plus
`scripts/validate_artifact.py` and the required rendered checks.
