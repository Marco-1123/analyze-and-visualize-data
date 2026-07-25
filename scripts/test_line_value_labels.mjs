#!/usr/bin/env node

import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const fixture = path.join(root, "assets/examples/14-line-value-labels.html");
const viewports = [
  { width: 390, height: 844 },
  { width: 520, height: 900 },
  { width: 818, height: 1000 },
  { width: 880, height: 1000 },
  { width: 1440, height: 1000 },
];

function assert(value, message) {
  if (!value) throw new Error(message);
}

async function inspect(page, viewport) {
  await page.setViewportSize(viewport);
  await page.goto(pathToFileURL(fixture).href, { waitUntil: "load" });
  await page.waitForFunction(() => document.documentElement.dataset.vdaReady);

  const state = await page.evaluate(() => {
    const component = (id) =>
      document.querySelector(`[data-component-id="${id}"]`);
    const lineState = (id) => {
      const section = component(id);
      const svg = section.querySelector("svg");
      const boxes = Array.from(
        section.querySelectorAll(".vda-line-value-label .vda-value-label")
      ).map((node) => {
        const rect = node.getBoundingClientRect();
        return {
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
          text: node.textContent,
          point: node.closest("[data-point-index]")?.dataset.pointIndex,
          series: node.closest("[data-series-index]")?.dataset.seriesIndex,
        };
      });
      const collisions = [];
      for (let i = 0; i < boxes.length; i += 1) {
        for (let j = i + 1; j < boxes.length; j += 1) {
          const horizontal =
            Math.min(boxes[i].right, boxes[j].right) -
            Math.max(boxes[i].left, boxes[j].left);
          const vertical =
            Math.min(boxes[i].bottom, boxes[j].bottom) -
            Math.max(boxes[i].top, boxes[j].top);
          if (horizontal > 1 && vertical > 1) {
            collisions.push([boxes[i].text, boxes[j].text]);
          }
        }
      }
      const axis = Array.from(
        section.querySelectorAll("svg > .vda-axis-label")
      ).map((node) => {
        const rect = node.getBoundingClientRect();
        return { left: rect.left, right: rect.right, top: rect.top };
      });
      const svgRect = svg.getBoundingClientRect();
      const xAxis = axis
        .filter((box) => box.top > svgRect.bottom - 48)
        .sort((a, b) => a.left - b.left);
      let axisCollision = false;
      for (let i = 1; i < xAxis.length; i += 1) {
        if (xAxis[i].left < xAxis[i - 1].right - 1) axisCollision = true;
      }
      const table = section.querySelector("[data-line-value-table]");
      return {
        requested: svg.dataset.lineValueLabelRequested,
        mode: svg.dataset.lineValueLabelMode,
        candidates: Number(svg.dataset.lineValueLabelCandidates),
        rendered: Number(svg.dataset.lineValueLabelRendered),
        omitted: Number(svg.dataset.lineValueLabelOmitted),
        collisions,
        axisCollision,
        table: table
          ? {
              columns: table.querySelectorAll("thead th").length - 1,
              rows: table.querySelectorAll("tbody tr").length,
              scrollable:
                table.querySelector(".vda-line-value-table-scroll").scrollWidth >
                table.querySelector(".vda-line-value-table-scroll").clientWidth + 1,
            }
          : null,
        labeledPoints: boxes.map((box) => ({
          point: Number(box.point),
          series: Number(box.series),
        })),
      };
    };
    return {
      pageContained:
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth + 1,
      auto: lineState("line-labels-auto-short"),
      dense: lineState("line-labels-dense-all"),
      key: lineState("line-labels-key-points"),
      adversarial: lineState("line-labels-adversarial"),
    };
  });

  assert(state.pageContained, `${viewport.width}: page-level horizontal overflow`);
  for (const [name, chart] of Object.entries(state).filter(
    ([name]) => name !== "pageContained"
  )) {
    assert(!chart.collisions.length, `${viewport.width} ${name}: label collision`);
    assert(!chart.axisCollision, `${viewport.width} ${name}: x-axis collision`);
  }

  assert(state.auto.requested === "auto", `${viewport.width}: auto request lost`);
  if (viewport.width >= 818) {
    assert(
      state.auto.mode === "all" && state.auto.rendered === 8,
      `${viewport.width}: short auto series should show all eight values`
    );
  } else {
    assert(
      state.auto.mode === "key" && state.auto.rendered >= 2,
      `${viewport.width}: short auto series should degrade to key values`
    );
  }

  assert(state.dense.mode === "key-fallback", `${viewport.width}: dense all did not degrade`);
  assert(state.dense.omitted > 0, `${viewport.width}: dense all did not report omissions`);
  assert(
    state.dense.table?.columns === 18 && state.dense.table?.rows === 3,
    `${viewport.width}: dense complete value table is incomplete`
  );

  assert(state.key.rendered <= 5, `${viewport.width}: key maxPerSeries exceeded`);
  assert(
    state.key.labeledPoints.some((label) => label.point === 8) &&
      state.key.labeledPoints.some((label) => label.point === 11),
    `${viewport.width}: annotation or end priority was lost`
  );

  assert(
    state.adversarial.mode === "key-fallback" &&
      state.adversarial.table?.columns === 52 &&
      state.adversarial.table?.rows === 2,
    `${viewport.width}: adversarial fallback table is incomplete`
  );
  assert(
    !state.adversarial.labeledPoints.some(
      (label) => label.series === 0 && label.point === 20
    ),
    `${viewport.width}: missing value received a static label`
  );
  if (viewport.width <= 520) {
    assert(
      state.dense.table.scrollable && state.adversarial.table.scrollable,
      `${viewport.width}: narrow complete tables should scroll inside the component`
    );
  }

  const dense = page.locator('[data-component-id="line-labels-dense-all"]');
  const firstToggle = dense.locator("[data-series-toggle]").first();
  await firstToggle.click();
  assert(
    (await dense.locator('[data-series-mark][data-series-index="0"]').getAttribute("data-visible")) ===
      "false",
    `${viewport.width}: legend did not hide line and static labels`
  );
  assert(
    await dense
      .locator('[data-line-value-table-series="0"]')
      .evaluate((row) => row.hidden),
    `${viewport.width}: legend did not hide the corresponding table row`
  );
  await firstToggle.click();

  if (viewport.width <= 520) {
    const scroller = dense.locator(".vda-line-value-table-scroll");
    await scroller.evaluate((element) => {
      element.closest("details").open = true;
      element.scrollLeft = 0;
    });
    const box = await scroller.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(180, 0);
    await page.waitForTimeout(50);
    assert(
      (await scroller.evaluate((element) => element.scrollLeft)) > 0,
      `${viewport.width}: complete table did not accept native horizontal wheel scrolling`
    );
  }

  return state;
}

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const output = [];
  for (const viewport of viewports) {
    output.push({ viewport, state: await inspect(page, viewport) });
  }
  console.log(JSON.stringify(output, null, 2));
} finally {
  await browser.close();
}
