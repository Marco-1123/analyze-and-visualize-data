#!/usr/bin/env node

import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { launchChromium } from "./browser_launch.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const examples = path.join(root, "assets", "examples");
const matrixUrl = pathToFileURL(
  path.join(examples, "15-multi-queue-matrix.html")
).href;
const trendsUrl = pathToFileURL(
  path.join(examples, "16-multi-queue-trends.html")
).href;
const viewports = [
  { width: 300, height: 844, expectedTrendColumns: 1 },
  { width: 390, height: 844, expectedTrendColumns: 1 },
  { width: 520, height: 900, expectedTrendColumns: 1 },
  { width: 880, height: 1000, expectedTrendColumns: 3 },
  { width: 1440, height: 1000, expectedTrendColumns: 3 },
];

function assert(value, message) {
  if (!value) throw new Error(message);
}

async function openReady(page, url) {
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(url, { waitUntil: "load" });
  await page.waitForFunction(
    () => document.documentElement.dataset.vdaReady === "true"
  );
  assert(errors.length === 0, `${url}: console errors ${errors.join(" | ")}`);
}

const browser = await launchChromium(chromium);
const report = [];
try {
  for (const viewport of viewports) {
    const matrix = await browser.newPage({ viewport });
    await openReady(matrix, matrixUrl);
    const matrixState = await matrix.evaluate(() => {
      const scroll = document.querySelector(".vda-comparison-matrix-scroll");
      const firstHeader = document.querySelector(
        ".vda-comparison-matrix tbody th"
      );
      const south = document.querySelector(
        '[data-entity-id="queue_partner_escalation_south_tier_02"]'
      );
      return {
        pageContained:
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth + 1,
        rowCount: document.querySelectorAll(
          ".vda-comparison-matrix tbody tr"
        ).length,
        columnCount: document.querySelectorAll(
          ".vda-comparison-matrix thead th"
        ).length,
        scrollable: scroll.scrollWidth > scroll.clientWidth + 1,
        stickyEntityColumn:
          getComputedStyle(firstHeader).position === "sticky" &&
          getComputedStyle(firstHeader).left === "0px",
        southSlaTone: south.children[2].dataset.tone,
        southIntakeTone: south.children[1].dataset.tone,
        rawLongId: document.querySelector(
          '[data-entity-id="queue_overseas_apac_north_enterprise_followup_priority_tier_03"] th span'
        ).dataset.tip,
      };
    });
    assert(matrixState.pageContained, `${viewport.width}: matrix page overflow`);
    assert(matrixState.rowCount === 8, `${viewport.width}: matrix row count`);
    assert(matrixState.columnCount === 5, `${viewport.width}: matrix columns`);
    assert(
      matrixState.stickyEntityColumn,
      `${viewport.width}: entity column is not sticky`
    );
    assert(
      matrixState.southSlaTone === "negative",
      `${viewport.width}: higher-is-better tone is wrong`
    );
    assert(
      matrixState.southIntakeTone === "neutral",
      `${viewport.width}: neutral metric received semantic tone`
    );
    assert(
      matrixState.rawLongId ===
        "queue_overseas_apac_north_enterprise_followup_priority_tier_03",
      `${viewport.width}: raw queue id was lost`
    );
    if (viewport.width <= 520) {
      assert(matrixState.scrollable, `${viewport.width}: matrix should scroll`);
      const scroll = matrix.locator(".vda-comparison-matrix-scroll");
      await scroll.hover();
      await matrix.mouse.wheel(180, 0);
      await matrix.waitForTimeout(100);
      assert(
        (await scroll.evaluate((node) => node.scrollLeft)) > 0,
        `${viewport.width}: native horizontal wheel did not move matrix`
      );
    }
    await matrix.close();

    const trends = await browser.newPage({ viewport });
    await openReady(trends, trendsUrl);
    const trendState = await trends.evaluate(() => {
      const panels = Array.from(
        document.querySelectorAll(".vda-small-multiple")
      );
      const hitboxes = Array.from(
        document.querySelectorAll(
          ".vda-small-multiple [data-small-multiple-hitbox]"
        )
      );
      const columns = new Set(
        panels.map((panel) => Math.round(panel.getBoundingClientRect().left))
      ).size;
      const domains = hitboxes.map((hitbox) =>
        `${hitbox.dataset.minY},${hitbox.dataset.maxY}`
      );
      const apac = document.querySelector(
        '[data-entity-id="queue_overseas_apac_north_enterprise_followup_priority_tier_03"]'
      );
      return {
        pageContained:
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth + 1,
        panelCount: panels.length,
        columns,
        domainCount: new Set(domains).size,
        targetLineCount: document.querySelectorAll(
          ".vda-small-multiple .vda-small-multiple-reference"
        ).length,
        lineCount: document.querySelectorAll(
          ".vda-small-multiple [data-small-multiple-series-mark]"
        ).length,
        sharedLegendCount: document.querySelectorAll(
          "[data-small-multiples-legend]"
        ).length,
        legendButtonCount: document.querySelectorAll(
          "[data-small-multiple-series-toggle]"
        ).length,
        highlightedCount: document.querySelectorAll(
          ".vda-small-multiple.is-highlighted"
        ).length,
        apacPrimarySubpaths: (
          apac.querySelector(
            '[data-small-multiple-series-mark][data-series-index="0"] path'
          ).getAttribute("d").match(/M/g) || []
        ).length,
        apacRawId: apac.querySelector("header [data-tip]").dataset.tip,
      };
    });
    assert(trendState.pageContained, `${viewport.width}: trends page overflow`);
    assert(trendState.panelCount === 8, `${viewport.width}: trend panel count`);
    assert(
      trendState.columns === viewport.expectedTrendColumns,
      `${viewport.width}: expected ${viewport.expectedTrendColumns} columns, got ${trendState.columns}`
    );
    assert(trendState.domainCount === 1, `${viewport.width}: domains differ`);
    assert(
      trendState.targetLineCount === 8,
      `${viewport.width}: target line count`
    );
    assert(trendState.lineCount === 24, `${viewport.width}: three lines per panel`);
    assert(
      trendState.sharedLegendCount === 1 && trendState.legendButtonCount === 3,
      `${viewport.width}: shared three-series legend`
    );
    assert(
      trendState.highlightedCount === 2,
      `${viewport.width}: highlight count`
    );
    assert(
      trendState.apacPrimarySubpaths === 2,
      `${viewport.width}: missing observation was not rendered as a gap`
    );
    assert(
      trendState.apacRawId ===
        "queue_overseas_apac_north_enterprise_followup_priority_tier_03",
      `${viewport.width}: trend raw queue id was lost`
    );

    const firstHitbox = trends.locator("[data-small-multiple-hitbox]").first();
    await firstHitbox.focus();
    await firstHitbox.press("End");
    const keyboardState = await firstHitbox.evaluate((node) => ({
      index: node.getAttribute("aria-valuenow"),
      text: node.getAttribute("aria-valuetext"),
      tooltipRows: document.querySelectorAll(".vda-tooltip-row").length,
      tooltipOpen:
        document.querySelector(".vda-tooltip").dataset.open === "true",
    }));
    assert(keyboardState.index === "6", `${viewport.width}: End key failed`);
    assert(
      keyboardState.text.includes("7/24") &&
        keyboardState.text.includes("华东企业恢复") &&
        keyboardState.text.includes("24 小时 SLA") &&
        keyboardState.text.includes("72 小时 SLA"),
      `${viewport.width}: accessible exact value is incomplete`
    );
    assert(
      keyboardState.tooltipRows === 3,
      `${viewport.width}: shared tooltip must contain three values`
    );
    assert(keyboardState.tooltipOpen, `${viewport.width}: keyboard tooltip`);

    const domainBeforeToggle = await trends.evaluate(() =>
      Array.from(document.querySelectorAll("[data-small-multiple-hitbox]")).map(
        (node) => `${node.dataset.minY},${node.dataset.maxY}`
      )
    );
    const legendButtons = trends.locator("[data-small-multiple-series-toggle]");
    await legendButtons.nth(1).click();
    await firstHitbox.focus();
    await firstHitbox.press("End");
    const hiddenState = await trends.evaluate(() => ({
      hiddenMarks: Array.from(
        document.querySelectorAll(
          '[data-small-multiple-series-mark][data-series-index="1"]'
        )
      ).every((node) => node.style.display === "none"),
      visibleCount: document.querySelector(
        '[data-component-id="queue-sla-small-multiples"]'
      ).dataset.smallMultipleVisibleSeries,
      tooltipRows: document.querySelectorAll(".vda-tooltip-row").length,
      accessibleText: document.querySelector(
        "[data-small-multiple-hitbox]"
      ).getAttribute("aria-valuetext"),
      domains: Array.from(
        document.querySelectorAll("[data-small-multiple-hitbox]")
      ).map((node) => `${node.dataset.minY},${node.dataset.maxY}`),
    }));
    assert(hiddenState.hiddenMarks, `${viewport.width}: legend did not hide peer lines`);
    assert(hiddenState.visibleCount === "2", `${viewport.width}: visible-series state`);
    assert(hiddenState.tooltipRows === 2, `${viewport.width}: hidden tooltip row remained`);
    assert(
      !hiddenState.accessibleText.includes("48 小时 SLA"),
      `${viewport.width}: hidden series remained in accessible value`
    );
    assert(
      JSON.stringify(hiddenState.domains) === JSON.stringify(domainBeforeToggle),
      `${viewport.width}: legend changed shared domain`
    );
    await legendButtons.nth(1).click();

    await legendButtons.nth(1).click();
    await legendButtons.nth(2).click();
    await legendButtons.nth(0).dispatchEvent("click");
    const guardState = await trends.evaluate(() => ({
      pressed: document.querySelector(
        '[data-small-multiple-series-toggle][data-series-index="0"]'
      ).getAttribute("aria-pressed"),
      status: document.querySelector(
        "[data-small-multiple-legend-status]"
      ).textContent,
    }));
    assert(guardState.pressed === "true", `${viewport.width}: final series was hidden`);
    assert(
      guardState.status.includes("至少保留一个"),
      `${viewport.width}: final-series guard was not announced`
    );
    await legendButtons.nth(1).click();
    await legendButtons.nth(2).click();

    const box = await firstHitbox.boundingBox();
    await firstHitbox.dispatchEvent("pointerdown", {
      pointerType: "touch",
      clientX: box.x + box.width * 0.35,
      clientY: box.y + box.height * 0.5,
      bubbles: true,
    });
    await firstHitbox.dispatchEvent("pointerleave", {
      pointerType: "touch",
      clientX: box.x + box.width * 0.35,
      clientY: box.y + box.height * 0.5,
      bubbles: true,
    });
    assert(
      await trends.evaluate(
        () =>
          document.querySelector(".vda-small-multiple-focus").dataset.open ===
            "true" &&
          document.querySelector(".vda-tooltip").dataset.open === "true"
      ),
      `${viewport.width}: touch selection did not persist`
    );
    await trends.close();
    report.push({ viewport, matrix: matrixState, trends: trendState });
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} finally {
  await browser.close();
}
