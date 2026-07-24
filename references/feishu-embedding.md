# Feishu/Lark HTML embedding

## Current policy

Treat the native Feishu HTML block as the preferred delivery path. It keeps the
artifact self-contained and avoids turning charts into public web pages.

Use the lark-doc skill for native document creation and editing. Do not convert
interactive HTML into ordinary native document blocks; that conversion does not
preserve the component runtime.

## Native block contract

Insert a local HTML file in document XML with:

```xml
<html5-block path="@01-overall-performance.html"></html5-block>
```

The HTML file must include:

```html
<meta name="use-iframe" content="true">
<meta name="html-box-height-mode" content="auto">
<meta name="description" content="这张图表说明什么">
```

Use `auto` for report evidence components so the document controls the reading
flow. Use `viewport` for dashboard mode so the HTML block behaves as a bounded
one-page workspace with internal scrolling.

Keep each HTML file at or below 500 KB. The bundled validator treats this as a
hard error.

## Verified path · 2026-07-24

Context: authenticated enterprise Feishu tenant, lark-doc v2 create and fetch
workflow.

Confirmed:

- one document was created with native prose and three local HTML files;
- multiple HTML blocks coexist in the same document;
- two report components using `auto` and one dashboard using `viewport` were
  accepted;
- self-contained inline CSS, JavaScript, SVG charts, and embedded fixed data were
  accepted by document creation;
- the created document could be fetched again with all three `html5-block`
  references intact;
- each file was preserved in the fetched document reference map;
- the HTML `description` metadata became the block's accessible fallback text;
- tested files of approximately 40–45 KB were accepted.
- all three existing HTML blocks were later replaced in place with rebuilt files
  by `block_replace`; the document advanced to a new revision and a second fetch
  again returned exactly three valid HTML references.
- the blocks were replaced again after adding the shared multi-series line-chart
  crosshair runtime; revision 9 returned three HTML blocks and three reference
  files, all containing the updated interaction code.
- a fourth HTML block was appended to verify the canonical 24-hour heatmap
  contract; revision 10 returned four HTML blocks and four reference files.
  The new file was byte-identical to the local artifact and contained automatic
  0–23 hour detection, vertically stacked 0–11 / 12–23 groups, exact cell
  tooltips, and one shared color legend.
- all four blocks were replaced with Skill v0.5.0 artifacts after adding
  interactive multi-series line legends. Revision 14 returned four blocks and
  four byte-identical reference files; the shared runtime contained legend
  toggle buttons, series-visibility state, filtered crosshair tooltips, and
  semantic generator-version metadata.
- the dashboard block was replaced with the Skill v0.7.0 artifact after adding
  the shared diverging-bar layout. Final revision 18 returned the new HTML
  block and a byte-identical 74,811-byte reference file. An authenticated
  Chrome session then
  loaded the actual Feishu iframe: the signed plot reported native
  `overflow-x: auto`, a 644 px viewport, a 752 px readable canvas, and 108 px
  of component-level horizontal range. A real horizontal wheel/trackpad event
  moved `scrollLeft` from 0 to 104 while the 818 px iframe document remained
  page-contained. The fixed category rail stayed visible, the shared zero axis
  remained valid, the positive endpoint became readable, and positive/negative
  marks remained on the correct sides.
- the dashboard and canonical hourly heatmap were replaced with Skill v0.8.0,
  and two dedicated 100:1 positive-dominant / negative-dominant diverging-bar
  blocks were appended. Final revision 26 returned six HTML blocks. The four
  v0.8.0 reference files were byte-identical to their local artifacts.
- in the authenticated 818 px Feishu embed, each 12-hour heatmap module had a
  710 px viewport and a 710 px canvas, so neither module scrolled and the
  horizontal-scroll cue stayed hidden. Both groups contained exactly 12 ordered
  columns, shared one legend, and the iframe page remained contained.
- the positive-dominant and negative-dominant 100:1 bars retained a linear main
  scale, correct signed directions, a visible zero axis, and labeled
  independent-scale small-side details. Their native `overflow-x: auto`
  viewports were 635 px wide over 774 px and 782 px canvases respectively.
  A real horizontal wheel/trackpad event moved the positive fixture from
  `scrollLeft = 0` to `120` without page-level overflow. Quick positioning
  reached the signed extreme and zero targets, including the case where two
  targets share the same physical scroll offset; the selected button state
  remained faithful to the user's last choice.
- a seventh HTML block was appended for Skill v0.9.0 long-category regression.
  Final revision 28 returned the block as an 88,856-byte reference file that
  was SHA-256 byte-identical to the local artifact.
- in the authenticated 818 px Feishu embed, the long-label fixture exposed a
  532 px native `overflow-x: auto` viewport over a 632 px readable canvas.
  A real horizontal wheel/trackpad event moved `scrollLeft` from 0 to the
  100 px maximum while the iframe page remained contained and the zero axis
  stayed visible. All five 44 px label rows remained aligned and
  non-overlapping; the one visually clamped label stayed within its two-line
  row. Selecting the concise `APAC North` display label opened a tooltip with
  the exact source queue ID, and every label accessible name retained its
  corresponding raw category.
- seven Skill v0.10.0 P1 blocks were appended in one update: decision, target,
  paired range, waterfall, sparkline, multi-event line annotations, and one
  combined adversarial regression artifact. Revision 29 returned fourteen HTML
  blocks in total and references `html5_8` through `html5_14`. Every new
  reference file was byte-identical to its local artifact (144,169–148,059
  bytes) and carried generator version `0.10.0`.
- this run could not repeat the authenticated Chrome iframe interaction check
  because the browser-control channel's enterprise network policy rejected
  access to the tenant domain. Local browser QA still covered 390, 520, 880,
  and 1440 px; mobile touch and native waterfall scrolling were exercised in
  the bundled runtime harness. Treat the revision-29 result as verified mount
  and readback, not as a new tenant-UI interaction confirmation.

Not yet confirmed:

- copy/duplicate behavior across documents;
- viewer permissions in accounts other than the creator;
- visual behavior in every desktop and mobile Feishu client version. Desktop
  Chrome embedding is verified; mobile touch is covered by the artifact
  regression harness but has not been exercised in every native Feishu client.

Do not generalize this tenant result to every Feishu/Lark environment without a
small compatibility test.

## Packaging defaults

- Produce one `.html` file per report evidence component.
- Produce one `.html` file for dashboard mode.
- Embed data, CSS, and JavaScript.
- Use UTF-8.
- Avoid network calls.
- Use descriptive filenames such as `01-overall-performance.html`.
- Include title, source scope, and accessible text inside every file.
- Keep report components focused on one evidence task; do not mount a chapter
  mini-dashboard by default.

## Fallbacks

Apply in order:

1. Directly mount the HTML file as a Feishu component.
2. Attach the HTML file and insert a static preview image with clear open instructions.
3. Provide the HTML files and exact manual insertion step.
4. Host only when the user explicitly asks for a web URL.

Never silently replace an interactive component with a screenshot.
