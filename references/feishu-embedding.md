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

Not yet confirmed:

- copy/duplicate behavior across documents;
- viewer permissions in accounts other than the creator;
- visual behavior in every desktop and mobile Feishu client version.

Automated browser-based visual inspection was blocked by the enterprise browser
network policy during this test. This is a client-observation gap, not an API
creation failure. Keep the created test document available for one manual visual
check before treating client rendering as universally verified.

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
