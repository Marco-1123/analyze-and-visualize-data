#!/usr/bin/env node

import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { launchChromium } from "./browser_launch.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const fixtures = [
  "07-decision.html",
  "08-target.html",
  "09-range.html",
  "10-waterfall.html",
  "11-sparkline.html",
  "12-trend-annotations.html",
  "13-p1-adversarial.html",
];
const viewports = [
  { width: 390, height: 844 },
  { width: 520, height: 900 },
  { width: 880, height: 1000 },
];

function assert(value, message) {
  if (!value) throw new Error(message);
}

async function inspectPage(page, fixture, viewport) {
  await page.goto(
    pathToFileURL(path.join(root, "assets/examples", fixture)).href,
    { waitUntil: "load" }
  );
  await page.waitForFunction(() => document.documentElement.dataset.vdaReady);
  const state = await page.evaluate(() => {
    const visible = (element) =>
      Boolean(element) && window.getComputedStyle(element).display !== "none";
    const component = (id) =>
      document.querySelector(`[data-component-id="${id}"]`);
    const pageContained =
      document.documentElement.scrollWidth <=
      document.documentElement.clientWidth + 1;

    const decision = document.querySelector(".vda-decision");
    const targets = Array.from(document.querySelectorAll(".vda-target-row"));
    const range = document.querySelector('[data-component-id*="range"]');
    const waterfall = document.querySelector(".vda-waterfall-chart");
    const sparklines = Array.from(document.querySelectorAll(".vda-sparkline"));
    const annotationSection =
      component("line-sla-events") || component("line-dense-events");
    const annotationLabels = annotationSection
      ? Array.from(
          annotationSection.querySelectorAll(".vda-line-annotation-label")
        ).map((label) => label.textContent)
      : [];
    const annotationEvents = annotationSection
      ? Array.from(annotationSection.querySelectorAll(".vda-line-event"))
      : [];
    const targetEdge = component("target-edge-cases");
    const rangeEdge = component("range-edge-cases");
    const sparkEdge = component("sparkline-edge-cases");

    return {
      pageContained,
      decision: decision
        ? {
            kind: decision.dataset.kind,
            coreVisible:
              Boolean(decision.querySelector(".vda-decision-title")?.textContent) &&
              Boolean(decision.querySelector(".vda-decision-body")?.textContent),
            hasBoundary:
              !component("decision-interpretation-edge") ||
              Boolean(decision.querySelector(".vda-decision-caveat")?.textContent),
          }
        : null,
      targets: targets.length
        ? {
            count: targets.length,
            valuesComplete: targets.every(
              (row) =>
                row.querySelectorAll(".vda-target-values > span").length === 4 &&
                row.textContent.includes("实际") &&
                row.textContent.includes("目标") &&
                row.textContent.includes("差距") &&
                row.textContent.includes("达成率")
            ),
            keysComplete: targets.every(
              (row) =>
                row.textContent.includes("实际") &&
                row.textContent.includes("目标")
            ),
            edgeAttainment: targetEdge
              ? Array.from(
                  targetEdge.querySelectorAll(
                    ".vda-target-values > span:nth-child(4) strong"
                  )
                ).map((value) => value.textContent)
              : null,
          }
        : null,
      range: range
        ? {
            mobileVisible: visible(range.querySelector(".vda-range-mobile")),
            desktopVisible: visible(range.querySelector(".vda-range-layout")),
            rawLabelsPreserved: Array.from(
              range.querySelectorAll(
                ".vda-range-label, .vda-range-mobile-row"
              )
            ).every((label) => Boolean(label.getAttribute("aria-label"))),
            edgeRawLongLabel: rangeEdge
              ? Array.from(
                  rangeEdge.querySelectorAll(
                    ".vda-range-label, .vda-range-mobile-row"
                  )
                ).some((label) =>
                  label
                    .getAttribute("aria-label")
                    .includes(
                      "queue_enterprise_recovery_priority_tier_01_with_an_unbroken_identifier_abcdefghijklmnopqrstuvwxyz"
                    )
                )
              : null,
          }
        : null,
      waterfall: waterfall
        ? {
            stepCount: waterfall.querySelectorAll("[data-waterfall-step]").length,
            reconciled:
              waterfall.querySelector("[data-waterfall-svg]").dataset
                .reconciled === "true",
            scrollable:
              waterfall.scrollWidth > waterfall.clientWidth + 1,
            cueVisible: visible(
              waterfall
                .closest("[data-component-id]")
                .querySelector(".vda-waterfall-cue")
            ),
            noGrab:
              !["grab", "grabbing"].includes(
                window.getComputedStyle(waterfall).cursor
              ) &&
              waterfall.onpointerdown == null &&
              waterfall.onmousedown == null,
            signs: Array.from(
              waterfall.querySelectorAll('[data-kind="delta"]')
            ).map((step) => step.dataset.sign),
          }
        : null,
      sparklines: sparklines.length
        ? {
            count: sparklines.length,
            hitboxes: document.querySelectorAll("[data-sparkline-hitbox]").length,
            incomplete:
              document.querySelectorAll(
                ".vda-sparkline-segment.is-incomplete, .vda-sparkline-bar.is-incomplete"
              ).length > 0,
            edgeDomains: sparkEdge
              ? Array.from(
                  sparkEdge.querySelectorAll("[data-sparkline-hitbox]")
                ).map((hitbox) => [
                  hitbox.dataset.minY,
                  hitbox.dataset.maxY,
                ])
              : null,
            edgeMissingSegments: sparkEdge
              ? sparkEdge
                  .querySelectorAll(".vda-sparkline")[1]
                  .querySelectorAll(".vda-sparkline-segment").length
              : null,
            edgeIncompleteBar: sparkEdge
              ? Boolean(
                  sparkEdge.querySelector(
                    ".vda-sparkline-bar.is-incomplete"
                  )
                )
              : null,
          }
        : null,
      annotations: annotationSection
        ? {
            count: annotationLabels.length,
            labels: annotationLabels,
            eventCount: annotationEvents.length,
            kinds: annotationEvents.map((event) => event.dataset.kind),
            completeEventText: annotationEvents.every(
              (event) => Boolean(event.querySelector("strong")?.textContent)
            ),
          }
        : null,
    };
  });

  assert(state.pageContained, `${fixture} ${viewport.width}: page overflow`);
  if (state.decision) {
    assert(state.decision.coreVisible, `${fixture}: decision core hidden`);
    assert(state.decision.hasBoundary, `${fixture}: interpretation caveat hidden`);
  }
  if (state.targets) {
    assert(state.targets.valuesComplete, `${fixture}: target values incomplete`);
    assert(state.targets.keysComplete, `${fixture}: target key incomplete`);
    if (state.targets.edgeAttainment) {
      assert(
        state.targets.edgeAttainment.slice(0, 3).every((value) => value === "不可用"),
        `${fixture}: invalid target attainment was rendered`
      );
      assert(
        state.targets.edgeAttainment[3] === "100.0%",
        `${fixture}: neutral equal target should be 100%`
      );
    }
  }
  if (state.range) {
    assert(state.range.rawLabelsPreserved, `${fixture}: range raw labels lost`);
    assert(
      viewport.width <= 520
        ? state.range.mobileVisible && !state.range.desktopVisible
        : !state.range.mobileVisible && state.range.desktopVisible,
      `${fixture} ${viewport.width}: wrong responsive range mode`
    );
    if (state.range.edgeRawLongLabel != null) {
      assert(state.range.edgeRawLongLabel, `${fixture}: long raw range label lost`);
    }
  }
  if (state.waterfall) {
    assert(state.waterfall.reconciled, `${fixture}: waterfall not reconciled`);
    assert(state.waterfall.noGrab, `${fixture}: waterfall installed grab gesture`);
    assert(
      !state.waterfall.scrollable || state.waterfall.cueVisible,
      `${fixture}: missing waterfall scroll cue`
    );
    assert(
      state.waterfall.signs.includes("positive") &&
        state.waterfall.signs.includes("negative"),
      `${fixture}: signed waterfall steps missing`
    );
    const chart = page.locator(".vda-waterfall-chart").first();
    await chart.scrollIntoViewIfNeeded();
    const maxScroll = await chart.evaluate(
      (element) => element.scrollWidth - element.clientWidth
    );
    if (maxScroll > 1) {
      await chart.evaluate((element) => {
        element.scrollLeft = 0;
      });
      const box = await chart.boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.wheel(180, 0);
      await page.waitForTimeout(100);
      assert(
        (await chart.evaluate((element) => element.scrollLeft)) > 0,
        `${fixture} ${viewport.width}: native wheel did not scroll waterfall`
      );
    }
    const firstStep = chart.locator("[data-waterfall-step]").first();
    await firstStep.focus();
    await firstStep.press("End");
    assert(
      await chart
        .locator("[data-waterfall-step]")
        .last()
        .evaluate((step) => document.activeElement === step),
      `${fixture}: waterfall keyboard navigation failed`
    );
  }
  if (state.sparklines) {
    assert(
      state.sparklines.hitboxes === state.sparklines.count,
      `${fixture}: sparkline hitbox missing`
    );
    if (state.sparklines.edgeDomains) {
      const domains = state.sparklines.edgeDomains;
      assert(
        JSON.stringify(domains[0]) === JSON.stringify(domains[1]) &&
          JSON.stringify(domains[1]) === JSON.stringify(domains[2]),
        `${fixture}: peer sparkline domains are not shared`
      );
      assert(
        JSON.stringify(domains[2]) !== JSON.stringify(domains[3]),
        `${fixture}: independent sparkline domain not independent`
      );
      assert(
        state.sparklines.edgeMissingSegments === 0,
        `${fixture}: missing period was connected`
      );
      assert(
        state.sparklines.edgeIncompleteBar,
        `${fixture}: incomplete bar styling missing`
      );
    }
    const hitbox = page.locator("[data-sparkline-hitbox]").last();
    await hitbox.focus();
    await hitbox.press("End");
    assert(
      Boolean(await hitbox.getAttribute("aria-valuetext")),
      `${fixture}: sparkline keyboard value missing`
    );
    assert(
      (await page.locator('.vda-tooltip[data-open="true"]').count()) === 1,
      `${fixture}: sparkline keyboard tooltip missing`
    );
    const box = await hitbox.boundingBox();
    await hitbox.dispatchEvent("pointerdown", {
      pointerType: "touch",
      clientX: box.x + box.width * 0.5,
      clientY: box.y + box.height * 0.5,
      bubbles: true,
    });
    assert(
      (await page.locator('.vda-tooltip[data-open="true"]').count()) === 1,
      `${fixture}: sparkline touch selection missing`
    );
  }
  if (state.annotations) {
    assert(
      state.annotations.count === state.annotations.eventCount,
      `${fixture}: event marks/list mismatch`
    );
    assert(
      state.annotations.completeEventText,
      `${fixture}: event list lost full text`
    );
    assert(
      state.annotations.kinds.includes("fact") &&
        state.annotations.kinds.includes("interpretation"),
      `${fixture}: event semantics missing`
    );
    if (viewport.width <= 520) {
      assert(
        state.annotations.labels.every((label) => /^\d+$/.test(label)),
        `${fixture}: compact event labels should be numbered`
      );
    } else {
      assert(
        state.annotations.labels
          .slice(3)
          .every((label) => /^\d+$/.test(label)),
        `${fixture}: events after the third should be numbered`
      );
    }
  }
  return state;
}

async function testTouchWaterfall(browser, fixture, viewport) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await page.goto(
    pathToFileURL(path.join(root, "assets/examples", fixture)).href,
    { waitUntil: "load" }
  );
  await page.waitForFunction(() => document.documentElement.dataset.vdaReady);
  const chart = page.locator(".vda-waterfall-chart").first();
  await chart.scrollIntoViewIfNeeded();
  const maxScroll = await chart.evaluate(
    (element) => element.scrollWidth - element.clientWidth
  );
  if (maxScroll > 1) {
    const box = await chart.boundingBox();
    const cdp = await context.newCDPSession(page);
    const startX = box.x + box.width - 24;
    const endX = box.x + 36;
    const y = box.y + box.height / 2;
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: startX, y }],
    });
    for (let step = 1; step <= 8; step += 1) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          { x: startX + ((endX - startX) * step) / 8, y },
        ],
      });
    }
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await page.waitForTimeout(150);
    assert(
      (await chart.evaluate((element) => element.scrollLeft)) > 0,
      `${fixture} ${viewport.width}: touch did not scroll waterfall`
    );
  }
  const contained = await page.evaluate(
    () =>
      document.documentElement.scrollWidth <=
      document.documentElement.clientWidth + 1
  );
  assert(contained, `${fixture} ${viewport.width}: touch page overflow`);
  await context.close();
}

const browser = await launchChromium(chromium);
const results = [];
try {
  for (const fixture of fixtures) {
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
      const errors = [];
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      page.on("pageerror", (error) => errors.push(error.message));
      const state = await inspectPage(page, fixture, viewport);
      assert(errors.length === 0, `${fixture}: ${errors.join("; ")}`);
      results.push({ fixture, viewport: viewport.width, state });
      await page.close();
    }
  }
  for (const fixture of ["10-waterfall.html", "13-p1-adversarial.html"]) {
    for (const viewport of viewports.slice(0, 2)) {
      await testTouchWaterfall(browser, fixture, viewport);
    }
  }
} finally {
  await browser.close();
}

process.stdout.write(
  `P1 runtime QA passed: ${results.length} viewport-fixture combinations\n`
);
