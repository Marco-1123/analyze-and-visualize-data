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
- the Skill v0.11.1 line-value-label block replaced its v0.11.0 predecessor in
  place. Revision 38 returned the new block and a reference file whose SHA-256
  (`6f15fb95e5adcaebcfb4622f2a62c5372c0593e841f64d16ac6a0134f84c7b9f`)
  was byte-identical to the local artifact. An authenticated Chrome session
  loaded the actual Feishu iframe and exposed the complete seven-day fixture:
  seven source dates, seven static value labels (`72.0%`, `74.5%`, `73.0%`,
  `78.0%`, `81.0%`, `80.0%`, `84.0%`), and one keyboard-accessible line-chart
  slider. The Feishu chapter heading and explanation also reflected v0.11.1.
  This confirms end-to-end mount, readback, and rendered cardinality rather than
  only a successful API write.
- the Skill v0.11.2 line-value-label block replaced its v0.11.1 predecessor in
  place. Revision 41 returned the new block and a reference file whose SHA-256
  (`d312f001a6d785688f5b54c0d859611ec481911426465cffaa03869267365f03`)
  was byte-identical to the local artifact. An authenticated Chrome session
  loaded the actual Feishu iframe and exposed the high-baseline seven-day
  regression: the y-axis retained the zero baseline, expanded to a natural
  `6,500` upper boundary, and rendered all seven static values (`5,769`,
  `5,819`, `5,828`, `5,742`, `5,636`, `5,612`, `5,654`). The iframe also
  exposed one keyboard-accessible line-chart slider, while the Feishu chapter
  heading and explanation reflected v0.11.2. This confirms end-to-end mount,
  resource readback, dynamic boundary headroom, and 7/7 rendered cardinality.
- a dedicated Skill v0.12.0 multi-queue report was created with native
  management narrative followed by a comparison matrix and shared-scale small
  multiples. Revision 3 returned exactly two HTML blocks. Their fetched
  reference files were byte-identical to the local artifacts: the matrix
  SHA-256 was
  `53e5a8fb8fd5935bf1068ee2f7fcc08332b5d169a1e5008a9201edd5586786cd`
  (182,856 bytes) and the trends SHA-256 was
  `f4fb9da9c021211324e70112fd1a03f6263485f579160ef9f785961bacc8caec`
  (181,872 bytes).
- in the authenticated 818 px Feishu embeds, the comparison matrix rendered
  eight entity rows and five columns without component or page scrolling; the
  queue column remained sticky, the scale-only metric stayed semantically
  neutral, and the governed SLA tones matched the target contract. The trends
  block rendered eight panels in three columns, two highlighted exceptions,
  eight shared 90% target lines, one shared y-domain, and the APAC North missing
  observation as four separated line segments. Keyboard `End` inspection
  returned `7/24，APAC North 88.4%`, while the full raw queue ID remained in the
  accessible label.
- a separate Feishu-native two-column document verified the same v0.12.0 files
  in real 396 px embeds. Revision 3 again returned exactly two reference files.
  The matrix exposed a 338 px `overflow-x: auto` viewport over a 720 px table,
  displayed the horizontal-scroll cue, and kept the page at
  `scrollWidth = clientWidth = 396`. A real browser horizontal wheel/trackpad
  event moved `scrollLeft` from 0 to 260 of the 382 px maximum; the sticky queue
  column remained at the component's left edge and the final metric stayed
  reachable. The trends block reflowed all eight panels to one column with eight
  target lines and no page-level horizontal overflow. This confirms wide and
  narrow Feishu mount, readback, responsive layout, and native component-level
  scrolling for the multi-queue contract.
- Skill v0.14.0 replaced the trends block in the existing multi-queue test
  document with the three-series small-multiple contract. Revision 8 returned
  block `doxcnhwtj4Vd3jaj21sAukpeEub`; the fetched HTML reference and local
  artifact were byte-identical at 203,417 bytes with SHA-256
  `6638a4e51a62e8157efe5409b0eef5bdced20c3d8978d7a5d362f69320bea73d`.
  An authenticated Chrome session rendered one shared legend, three toggles,
  eight entity panels, 24 line marks, and eight keyboard-accessible hit areas
  without a component error. At the ordinary 818 px inner width, the panels
  used three columns and the page remained contained. With a 390 px outer
  browser override, Feishu provided a 300 px HTML-block inner width; the panels
  reflowed to one column and `scrollWidth` equaled `clientWidth` at 300 px.
  Clicking the 48-hour legend item hid exactly eight peer lines, retained the
  other 16, and reduced the exact-value tooltip to the two visible series;
  restoring the legend returned all 24 marks before browser handoff.

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
