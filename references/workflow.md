# Workflow and decision policy

## Contents

1. Intake
2. Mode routing
3. Analytical autonomy
4. Analysis stages
5. Delivery contract

## 1. Intake

Establish:

- the source data and its scope;
- the intended audience;
- the decision or question;
- the time window and comparison basis;
- the desired mode if explicitly stated;
- any brand, confidentiality, or export constraints.

Do not block on missing audience or styling preferences when a professional neutral default is safe. Do block when an unresolved definition changes a denominator, time grain, cohort, or business meaning.

## 2. Mode routing

### Default to report

Choose a report when:

- the user asks a question that needs explanation;
- the output will support a decision or presentation;
- findings require a sequence of evidence;
- the audience needs conclusions and recommendations;
- nearby prose should interpret each chart.

### Recommend dashboard

Recommend, but do not silently select, a dashboard when:

- the user asks for a one-page overview;
- many peer dimensions must be browsed or compared;
- the data naturally groups into KPI, trend, composition, ranking, and detail;
- exploration matters more than a single argument;
- local filtering materially improves comprehension.

### Never confuse static with non-interactive

Static means the dataset is frozen at build time. It may still support client-side filtering, sorting, tabs, hover details, and locally derived views.

## 3. Analytical autonomy

Use this escalation ladder:

1. **Clear:** proceed.
2. **Inferable:** proceed, record the assumption.
3. **Materially ambiguous:** ask one focused question.
4. **Unsafe or misleading:** stop and explain the missing requirement.

Do not ask generic questions such as “What do you want to analyze?” when the schema and request already indicate useful work. Do not invent causal explanations from descriptive data.

## 4. Analysis stages

### Data audit

- Identify grain and keys.
- Detect duplicates, missing values, impossible values, inconsistent labels, and time gaps.
- Confirm whether totals reconcile.
- Record data limitations before interpretation.

### Descriptive baseline

- Establish scale, central tendency, distribution, coverage, and change.
- Compute denominators explicitly.
- Keep display rounding separate from calculation precision.

### Diagnostic decomposition

- Break changes down by relevant dimensions.
- Compare contribution, not just absolute size.
- Look for mix effects, concentration, outliers, and Simpson's-paradox risks.

### Finding selection

Select findings using four criteria:

- magnitude;
- decision relevance;
- reliability;
- non-redundancy.

### Narrative construction

Use:

1. What changed?
2. Where did it change?
3. What evidence explains the pattern?
4. What remains uncertain?
5. What should the audience do or investigate next?

## 5. Delivery contract

Always provide:

- data scope and date range;
- assumptions and metric definitions;
- the top findings;
- evidence components;
- limitations;
- a clear artifact or Feishu handoff.

Never hide failed validation, unsupported embedding, or incomplete data behind polished visuals.
