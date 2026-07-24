#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);

function parseArgs(argv) {
  const result = { viewports: "390x844,880x1000,1440x1000" };
  for (let index = 2; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (key === "--input" || key === "--output-dir" || key === "--viewports") {
      result[key.slice(2).replace("-dir", "Dir")] = value;
      index += 1;
    }
  }
  if (!result.input || !result.outputDir) {
    throw new Error("usage: render_artifact.mjs --input artifact.html --output-dir screenshots [--viewports 390x844,880x1000]");
  }
  return result;
}

function parseViewports(value) {
  return value.split(",").map((item) => {
    const match = item.trim().match(/^(\d+)x(\d+)$/);
    if (!match) throw new Error(`invalid viewport: ${item}`);
    return { width: Number(match[1]), height: Number(match[2]) };
  });
}

async function main() {
  const args = parseArgs(process.argv);
  const { chromium } = require("playwright");
  const input = path.resolve(args.input);
  const outputDir = path.resolve(args.outputDir);
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const results = [];

  try {
    for (const viewport of parseViewports(args.viewports)) {
      const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
      const consoleErrors = [];
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      page.on("pageerror", (error) => consoleErrors.push(error.message));
      await page.goto(pathToFileURL(input).href, { waitUntil: "load" });
      await page.waitForFunction(() => document.documentElement.dataset.vdaReady);
      const ready = await page.evaluate(() => document.documentElement.dataset.vdaReady);
      const filename = `${path.basename(input, path.extname(input))}-${viewport.width}x${viewport.height}.png`;
      const output = path.join(outputDir, filename);
      await page.screenshot({ path: output, fullPage: true });
      const dimensions = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        scrollHeight: document.documentElement.scrollHeight,
      }));
      const tooltipTargets = await page.locator("[data-tip]").count();
      let keyboardTooltipOpen = null;
      if (tooltipTargets > 0) {
        await page.locator("[data-tip]").first().focus();
        keyboardTooltipOpen =
          (await page.locator('.vda-tooltip[data-open="true"]').count()) === 1;
        await page.evaluate(() => {
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          } else if (document.activeElement?.blur) {
            document.activeElement.blur();
          }
        });
      }
      const lineHitboxes = await page.locator("[data-line-hitbox]").count();
      let lineInteraction = null;
      if (lineHitboxes > 0) {
        const hitbox = page.locator("[data-line-hitbox]").first();
        const box = await hitbox.boundingBox();
        if (!box) throw new Error("line hitbox has no bounding box");

        await hitbox.hover({
          position: {
            x: box.width * 0.52,
            y: box.height * 0.45,
          },
        });
        const pointerState = await page.evaluate(() => {
          const target = document.querySelector("[data-line-hitbox]");
          const section = target.closest("[data-component-id]");
          const component = window.__VDA_SPEC__.components.find(
            (item) => item.id === section.dataset.componentId
          );
          const expectedIndex = Math.round((component.labels.length - 1) * 0.52);
          return {
            selectedIndex: Number(target.getAttribute("aria-valuenow")),
            expectedIndex,
            focusLayerOpen:
              section.querySelector(".vda-line-focus-layer").dataset.open ===
              "true",
            tooltipOpen:
              document.querySelector(".vda-tooltip").dataset.open === "true",
            shared:
              document.querySelector(".vda-tooltip").dataset.shared === "true",
          };
        });
        await page.waitForFunction(
          () =>
            window.getComputedStyle(
              document.querySelector(".vda-tooltip")
            ).opacity === "1"
        );
        const crosshairFilename = `${path.basename(
          input,
          path.extname(input)
        )}-${viewport.width}x${viewport.height}-crosshair.png`;
        await page.locator(".skip-link").evaluate((element) => {
          element.style.visibility = "hidden";
        });
        await page.screenshot({
          path: path.join(outputDir, crosshairFilename),
          fullPage: true,
        });
        await page.locator(".skip-link").evaluate((element) => {
          element.style.visibility = "";
        });

        const touchBox = await hitbox.boundingBox();
        if (!touchBox) throw new Error("line hitbox disappeared before touch test");
        const touchPoint = {
          clientX: touchBox.x + touchBox.width * 0.36,
          clientY: touchBox.y + touchBox.height * 0.5,
          pointerType: "touch",
          bubbles: true,
        };
        await hitbox.dispatchEvent("pointerdown", touchPoint);
        await hitbox.dispatchEvent("pointerleave", touchPoint);
        const touchPersistent = await page.evaluate(() => {
          const section = document
            .querySelector("[data-line-hitbox]")
            .closest("[data-component-id]");
          return (
            section.querySelector(".vda-line-focus-layer").dataset.open ===
              "true" &&
            document.querySelector(".vda-tooltip").dataset.open === "true"
          );
        });
        await page.locator("body").dispatchEvent("pointerdown", {
          clientX: 4,
          clientY: 4,
          pointerType: "touch",
          bubbles: true,
        });
        const touchDismissesOutside = await page.evaluate(
          () =>
            document.querySelector(".vda-tooltip").dataset.open !== "true"
        );

        await hitbox.focus();
        await hitbox.press("End");
        const endState = await page.evaluate(() => {
          const target = document.querySelector("[data-line-hitbox]");
          const section = target.closest("[data-component-id]");
          const component = window.__VDA_SPEC__.components.find(
            (item) => item.id === section.dataset.componentId
          );
          const index = component.labels.length - 1;
          const tooltip = document.querySelector(".vda-tooltip");
          const rows = Array.from(
            tooltip.querySelectorAll(".vda-tooltip-row")
          );
          return {
            selectedIndex: Number(target.getAttribute("aria-valuenow")),
            expectedIndex: index,
            tooltipLabel:
              tooltip.querySelector(".vda-tooltip-title")?.textContent || "",
            expectedLabel: String(component.labels[index]),
            rowCount: rows.length,
            expectedRowCount: component.series.length,
            rawValues: rows.map((row) => row.dataset.rawValue),
            expectedRawValues: component.series.map((entry) => {
              const value = entry.values[index];
              return value == null || value === "" ? "" : String(value);
            }),
            ariaValueText: target.getAttribute("aria-valuetext") || "",
          };
        });
        await hitbox.press("ArrowLeft");
        const leftIndex = Number(
          await hitbox.getAttribute("aria-valuenow")
        );
        lineInteraction = {
          hitboxes: lineHitboxes,
          pointerSnap:
            pointerState.selectedIndex === pointerState.expectedIndex,
          pointerTooltip:
            pointerState.focusLayerOpen &&
            pointerState.tooltipOpen &&
            pointerState.shared,
          touchPersistent,
          touchDismissesOutside,
          keyboardEnd:
            endState.selectedIndex === endState.expectedIndex,
          keyboardLeft:
            leftIndex === Math.max(0, endState.expectedIndex - 1),
          labelMatches: endState.tooltipLabel === endState.expectedLabel,
          rowsMatch:
            endState.rowCount === endState.expectedRowCount,
          rawValuesMatch:
            JSON.stringify(endState.rawValues) ===
            JSON.stringify(endState.expectedRawValues),
          ariaValueTextPresent: endState.ariaValueText.length > 0,
          screenshot: crosshairFilename,
        };
      }
      results.push({
        viewport,
        output: filename,
        ready,
        consoleErrors,
        dimensions,
        interaction: { tooltipTargets, keyboardTooltipOpen },
        lineInteraction,
      });
      await page.close();
    }
  } finally {
    await browser.close();
  }

  const summaryPath = path.join(outputDir, "render-summary.json");
  fs.writeFileSync(summaryPath, JSON.stringify(results, null, 2));
  const failed = results.some((result) =>
    result.ready !== "true" ||
    result.consoleErrors.length > 0 ||
    result.dimensions.scrollWidth > result.dimensions.clientWidth + 1 ||
    (result.interaction.tooltipTargets > 0 &&
      result.interaction.keyboardTooltipOpen !== true) ||
    (result.lineInteraction &&
      Object.entries(result.lineInteraction).some(
        ([key, value]) =>
          !["hitboxes", "screenshot"].includes(key) && value !== true
      ))
  );
  process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
  if (failed) process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`render failed: ${error.stack || error.message}\n`);
  process.exitCode = 1;
});
