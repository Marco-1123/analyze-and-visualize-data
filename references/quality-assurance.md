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
- 880 × 1000 or the closest Feishu component width;
- 1440 × 1000 for dashboard mode.

Check:

- clipping and overflow;
- text wrapping and truncation;
- label collisions;
- inconsistent alignment;
- empty or overly dense regions;
- chart-title truthfulness;
- semantic color use;
- contrast and focus state;
- tooltip visibility;
- multi-series line-chart pointer snapping;
- shared tooltip label, series count, and numeric-value correctness;
- synchronized crosshair and point highlighting;
- Left/Right/Home/End keyboard navigation and accessible selected-value text;
- persistent touch selection without blocking vertical page scrolling;
- table scrolling;
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
