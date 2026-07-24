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
      }
      results.push({
        viewport,
        output: filename,
        ready,
        consoleErrors,
        dimensions,
        interaction: { tooltipTargets, keyboardTooltipOpen },
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
      result.interaction.keyboardTooltipOpen !== true)
  );
  process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
  if (failed) process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`render failed: ${error.stack || error.message}\n`);
  process.exitCode = 1;
});
