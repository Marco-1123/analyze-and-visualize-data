#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);

function parseArgs(argv) {
  const result = { viewports: "390x844,520x900,818x1000,880x1000,1440x1000" };
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
      const layoutIntegrity = await page.evaluate(() => {
        const roundedPositions = (elements, axis) =>
          Array.from(
            new Set(
              elements.map((element) =>
                Math.round(element.getBoundingClientRect()[axis])
              )
            )
          );
        const metrics = Array.from(
          document.querySelectorAll(".vda-metrics")
        ).map((group) => {
          const cards = Array.from(group.querySelectorAll(".vda-metric"));
          const values = Array.from(
            group.querySelectorAll(".vda-metric-value")
          );
          const fontSizes = values.map((value) =>
            Number.parseFloat(window.getComputedStyle(value).fontSize)
          );
          return {
            count: cards.length,
            requestedColumns: Number(group.dataset.requestedColumns),
            renderedColumns: roundedPositions(cards, "left").length,
            renderedRows: roundedPositions(cards, "top").length,
            fontSizes,
            fontInRange: fontSizes.every(
              (size) => size >= 24 && size <= 32
            ),
          };
        });
        const meta = document.querySelector(".vda-meta");
        const metaItems = meta
          ? Array.from(meta.querySelectorAll(".vda-meta-item"))
          : [];
        return {
          metrics,
          meta: meta
            ? {
                count: metaItems.length,
                renderedRows: roundedPositions(metaItems, "top").length,
                pairsStayInline: metaItems.every((item) => {
                  const label = item.querySelector("strong");
                  const value = item.querySelector("span");
                  if (!label || !value) return false;
                  return (
                    Math.abs(
                      label.getBoundingClientRect().top -
                        value.getBoundingClientRect().top
                    ) <= 2
                  );
                }),
              }
            : null,
        };
      });
      const contentIntegrity = await page.evaluate(() => {
        const notes = Array.from(document.querySelectorAll(".vda-note"));
        const allowedKinds = new Set([
          "definition",
          "scope",
          "method",
          "limitation",
          "source",
        ]);
        return {
          structuredComponentNotes: notes.every(
            (note) =>
              allowedKinds.has(note.dataset.noteKind) &&
              Boolean(note.querySelector(".vda-note-label")) &&
              Boolean(note.querySelector(".vda-note-text"))
          ),
        };
      });
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
        const lineSection = hitbox.locator(
          "xpath=ancestor::*[@data-component-id][1]"
        );
        const legendButtons = lineSection.locator("[data-series-toggle]");
        const legendButtonCount = await legendButtons.count();
        const legendInitial =
          legendButtonCount === endState.expectedRowCount &&
          (await legendButtons.evaluateAll((buttons) =>
            buttons.every(
              (button) =>
                button.getAttribute("aria-pressed") === "true" &&
                button.dataset.state === "visible"
            )
          ));
        const domainBeforeToggle = {
          min: await hitbox.getAttribute("data-min-y"),
          max: await hitbox.getAttribute("data-max-y"),
        };

        const toggleTarget = legendButtons.nth(1);
        await toggleTarget.click();
        await page.waitForTimeout(180);
        const hiddenLegendState = await page.evaluate(() => {
          const target = document.querySelector("[data-line-hitbox]");
          const section = target.closest("[data-component-id]");
          const component = window.__VDA_SPEC__.components.find(
            (item) => item.id === section.dataset.componentId
          );
          const hiddenIndex = 1;
          const button = section.querySelector(
            `[data-series-toggle][data-series-index="${hiddenIndex}"]`
          );
          const mark = section.querySelector(
            `[data-series-mark][data-series-index="${hiddenIndex}"]`
          );
          const point = section.querySelector(
            `.vda-crosshair-point[data-series-index="${hiddenIndex}"]`
          );
          const tooltipRows = Array.from(
            document.querySelectorAll(".vda-tooltip-row")
          );
          const hiddenName =
            component.series[hiddenIndex].name ||
            `系列 ${hiddenIndex + 1}`;
          return {
            buttonHidden:
              button.getAttribute("aria-pressed") === "false" &&
              button.dataset.state === "hidden",
            markHidden:
              !mark || window.getComputedStyle(mark).display === "none",
            pointHidden:
              !point || window.getComputedStyle(point).display === "none",
            tooltipFiltered:
              tooltipRows.length === component.series.length - 1 &&
              !tooltipRows.some(
                (row) => Number(row.dataset.seriesIndex) === hiddenIndex
              ),
            ariaFiltered:
              !(target.getAttribute("aria-valuetext") || "").includes(
                hiddenName
              ),
          };
        });
        const domainAfterToggle = {
          min: await hitbox.getAttribute("data-min-y"),
          max: await hitbox.getAttribute("data-max-y"),
        };
        const legendFilename = `${path.basename(
          input,
          path.extname(input)
        )}-${viewport.width}x${viewport.height}-legend-hidden.png`;
        await page.locator(".skip-link").evaluate((element) => {
          element.style.visibility = "hidden";
        });
        await page.screenshot({
          path: path.join(outputDir, legendFilename),
          fullPage: true,
        });
        await page.locator(".skip-link").evaluate((element) => {
          element.style.visibility = "";
        });

        const lastVisibleButton = legendButtons.nth(0);
        await lastVisibleButton.dispatchEvent("click");
        const lastSeriesProtected =
          (await lastVisibleButton.getAttribute("aria-pressed")) === "true" &&
          (await lastVisibleButton.getAttribute("aria-disabled")) === "true" &&
          (await lineSection
            .locator("[data-line-legend-status]")
            .textContent()).includes("至少保留");

        await toggleTarget.click();
        const legendRestore =
          (await legendButtons.evaluateAll((buttons) =>
            buttons.every(
              (button) =>
                button.getAttribute("aria-pressed") === "true" &&
                button.dataset.state === "visible"
            )
          )) &&
          (await lineSection.locator("[data-series-mark]").evaluateAll(
            (marks) =>
              marks.every(
                (mark) => window.getComputedStyle(mark).display !== "none"
              )
          )) &&
          (await page.locator(".vda-tooltip-row").count()) ===
            endState.expectedRowCount;

        await toggleTarget.focus();
        await toggleTarget.press("Space");
        const keyboardHidden =
          (await toggleTarget.getAttribute("aria-pressed")) === "false";
        await toggleTarget.press("Space");
        const spaceRestored =
          keyboardHidden &&
          (await toggleTarget.getAttribute("aria-pressed")) === "true";
        await toggleTarget.press("Enter");
        const enterHidden =
          (await toggleTarget.getAttribute("aria-pressed")) === "false";
        await toggleTarget.press("Enter");
        const legendKeyboard =
          spaceRestored &&
          enterHidden &&
          (await toggleTarget.getAttribute("aria-pressed")) === "true";

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
          legendButtons: legendButtonCount,
          legendInitial,
          legendHide: hiddenLegendState.buttonHidden,
          legendMarkHidden: hiddenLegendState.markHidden,
          legendPointHidden: hiddenLegendState.pointHidden,
          legendTooltipFiltered: hiddenLegendState.tooltipFiltered,
          legendAriaFiltered: hiddenLegendState.ariaFiltered,
          legendDomainStable:
            JSON.stringify(domainBeforeToggle) ===
            JSON.stringify(domainAfterToggle),
          lastSeriesProtected,
          legendRestore,
          legendKeyboard,
          screenshot: crosshairFilename,
          legendScreenshot: legendFilename,
        };
      }
      const divergingBarCount = await page.locator(
        '.vda-bar-chart[data-bar-layout="diverging"]'
      ).count();
      let barInteraction = null;
      if (divergingBarCount > 0) {
        const barChart = page.locator(
          '.vda-bar-chart[data-bar-layout="diverging"]'
        ).first();
        await barChart.scrollIntoViewIfNeeded();
        await barChart.evaluate((chart) => {
          chart.scrollLeft = Number(chart.dataset.initialScrollLeft || 0);
        });
        const initialState = await barChart.evaluate((chart) => {
          const svg = chart.querySelector("[data-bar-svg]");
          const zero = svg.querySelector("[data-bar-zero]");
          const marks = Array.from(svg.querySelectorAll("[data-bar-mark]"));
          const labels = Array.from(
            svg.querySelectorAll(
              "[data-bar-category-label], [data-bar-value-label]"
            )
          );
          const categoryLabels = Array.from(
            chart
              .closest("[data-component-id]")
              .querySelectorAll(".vda-bar-category-label")
          );
          const zeroX = Number(zero.getAttribute("x1"));
          const chartRect = chart.getBoundingClientRect();
          const zeroRect = zero.getBoundingClientRect();
          const viewBoxWidth = svg.viewBox.baseVal.width;
          const section = chart.closest("[data-component-id]");
          const component = window.__VDA_SPEC__.components.find(
            (item) => item.id === section.dataset.componentId
          );
          const expectedDisplayCategories =
            Array.isArray(component.displayCategories) &&
            component.displayCategories.length === component.categories.length
              ? component.displayCategories.map(String)
              : component.categories.map(String);
          const categoryLabelTexts = categoryLabels.map((label) =>
            label.querySelector(".vda-bar-category-label-text")
          );
          const categoryLabelRects = categoryLabels.map((label) =>
            label.getBoundingClientRect()
          );
          const cue = section.querySelector(".vda-bar-scroll-cue");
          const detail = section.querySelector("[data-bar-detail]");
          const extreme = chart.dataset.barExtreme === "true";
          const minorityDirection = detail
            ? detail.dataset.minorityDirection
            : null;
          const expectedMinorityValues = marks
            .filter(
              (mark) =>
                mark.dataset.barDirection === minorityDirection
            )
            .map((mark) => Number(mark.dataset.barValue))
            .sort((a, b) => a - b);
          const detailValues = detail
            ? Array.from(detail.querySelectorAll(".vda-bar-detail-value"))
                .map((value) =>
                  Number(
                    value.textContent
                      .replace(/[^\d.+-]/g, "")
                  )
                )
                .sort((a, b) => a - b)
            : [];
          const pixelsPerUnit = marks
            .filter((mark) => Number(mark.dataset.barValue) !== 0)
            .map(
              (mark) =>
                Number(mark.getAttribute("width")) /
                Math.abs(Number(mark.dataset.barValue))
            );
          return {
            count: marks.length,
            clientWidth: chart.clientWidth,
            scrollWidth: chart.scrollWidth,
            initialScrollLeft: chart.scrollLeft,
            nativeOverflow:
              window.getComputedStyle(chart).overflowX === "auto",
            pageContained:
              document.documentElement.scrollWidth <=
              document.documentElement.clientWidth + 1,
            zeroVisibleInitial:
              zeroRect.left >= chartRect.left - 1 &&
              zeroRect.left <= chartRect.right + 1,
            bothSigns:
              marks.some((mark) => mark.dataset.barDirection === "negative") &&
              marks.some((mark) => mark.dataset.barDirection === "positive"),
            positiveDirection: marks
              .filter((mark) => mark.dataset.barDirection === "positive")
              .every(
                (mark) => Number(mark.getAttribute("x")) >= zeroX - 0.5
              ),
            negativeDirection: marks
              .filter((mark) => mark.dataset.barDirection === "negative")
              .every(
                (mark) =>
                  Number(mark.getAttribute("x")) +
                    Number(mark.getAttribute("width")) <=
                  zeroX + 0.5
              ),
            labelsWithinSvg: labels.every((label) => {
              const bounds = label.getBBox();
              return (
                bounds.x >= -0.5 &&
                bounds.x + bounds.width <= viewBoxWidth + 0.5
              );
            }),
            categoryLabelsVisible:
              categoryLabels.length === marks.length &&
              categoryLabels.every((label) => {
                const bounds = label.getBoundingClientRect();
                const sectionBounds = chart
                  .closest("[data-component-id]")
                  .getBoundingClientRect();
                return (
                  bounds.left >= sectionBounds.left - 1 &&
                  bounds.right <= sectionBounds.right + 1 &&
                  bounds.width > 0 &&
                  bounds.height > 0
                );
              }),
            categoryLabelRowsSafe:
              categoryLabelTexts.every((text, index) => {
                if (!text) return false;
                const textBounds = text.getBoundingClientRect();
                const labelBounds = categoryLabelRects[index];
                const style = window.getComputedStyle(text);
                return (
                  style.overflow === "hidden" &&
                  textBounds.left >= labelBounds.left - 1 &&
                  textBounds.right <= labelBounds.right + 1 &&
                  textBounds.top >= labelBounds.top - 1 &&
                  textBounds.bottom <= labelBounds.bottom + 1 &&
                  labelBounds.height >= 40
                );
              }),
            categoryLabelsDoNotOverlap:
              categoryLabelRects.every(
                (bounds, index) =>
                  index === categoryLabelRects.length - 1 ||
                  bounds.bottom <= categoryLabelRects[index + 1].top + 1
              ),
            categoryFullNamesPreserved:
              categoryLabels.length === component.categories.length &&
              categoryLabels.every((label, index) => {
                const raw = String(component.categories[index]);
                const mark = marks.find(
                  (item) => Number(item.dataset.barIndex) === index
                );
                return (
                  label.dataset.barCategoryFull === raw &&
                  label.dataset.tip === raw &&
                  (label.getAttribute("aria-label") || "").includes(raw) &&
                  Boolean(mark) &&
                  (mark.dataset.tip || "").includes(raw)
                );
              }),
            categoryDisplayLabelsPreserved:
              categoryLabelTexts.length === expectedDisplayCategories.length &&
              categoryLabelTexts.every(
                (text, index) =>
                  text.textContent === expectedDisplayCategories[index]
              ),
            longLabelStateValid:
              (!component.categories.some(
                (category, index) =>
                  String(category).length > 20 ||
                  String(category) !== expectedDisplayCategories[index]
              ) ||
                section.dataset.barLongLabels === "true"),
            labelCueMatchesCondensed:
              (section.dataset.barLongLabels === "true") ===
              (window.getComputedStyle(
                section.querySelector(".vda-bar-label-cue")
              ).display !== "none"),
            cueMatchesOverflow:
              (chart.scrollWidth > chart.clientWidth + 1) ===
              (window.getComputedStyle(cue).display !== "none"),
            mainScaleLinear:
              pixelsPerUnit.length < 2 ||
              Math.max(...pixelsPerUnit) -
                Math.min(...pixelsPerUnit) <
                Math.max(...pixelsPerUnit) * 0.02,
            extremeDetailValid:
              !extreme ||
              (Boolean(detail) &&
                detail.textContent.includes("独立比例") &&
                detail.textContent.includes("不与主图条长比较") &&
                JSON.stringify(detailValues) ===
                  JSON.stringify(expectedMinorityValues)),
            extremeDetailAbsentWhenUnneeded: extreme || !detail,
            mouseGrabNotEnabled:
              !["grab", "grabbing"].includes(
                window.getComputedStyle(chart).cursor
              ) &&
              chart.onpointerdown == null &&
              chart.onmousedown == null,
          };
        });
        const initialScrollLeft = initialState.initialScrollLeft;
        const component = barChart.locator(
          "xpath=ancestor::*[@data-component-id][1]"
        );
        const firstCategoryLabel = component
          .locator(".vda-bar-category-label")
          .first();
        await firstCategoryLabel.focus();
        const categoryKeyboardTooltip = await firstCategoryLabel.evaluate(
          (label) => {
            const tooltip = document.querySelector(".vda-tooltip");
            return (
              tooltip.dataset.open === "true" &&
              tooltip.textContent === label.dataset.barCategoryFull
            );
          }
        );
        await firstCategoryLabel.evaluate((label) => label.blur());
        const maxScroll = Math.max(
          0,
          initialState.scrollWidth - initialState.clientWidth
        );
        let navigationWorks = true;
        const navigation = component.locator("[data-bar-navigation], .vda-bar-navigation");
        if (maxScroll > 1) {
          const negativeButton = component.locator('[data-bar-jump="negative"]');
          const zeroButton = component.locator('[data-bar-jump="zero"]');
          const positiveButton = component.locator('[data-bar-jump="positive"]');
          navigationWorks =
            (await navigation.count()) === 1 &&
            (await negativeButton.count()) === 1 &&
            (await zeroButton.count()) === 1 &&
            (await positiveButton.count()) === 1;
          if (navigationWorks) {
            await negativeButton.click();
            await page.waitForTimeout(700);
            const negativePosition = await barChart.evaluate((chart) => ({
              scrollLeft: chart.scrollLeft,
              pressed:
                chart
                  .closest("[data-component-id]")
                  .querySelector('[data-bar-jump="negative"]')
                  .getAttribute("aria-pressed") === "true",
            }));
            await positiveButton.click();
            await page.waitForTimeout(700);
            const positivePosition = await barChart.evaluate((chart) => ({
              scrollLeft: chart.scrollLeft,
              pressed:
                chart
                  .closest("[data-component-id]")
                  .querySelector('[data-bar-jump="positive"]')
                  .getAttribute("aria-pressed") === "true",
            }));
            await zeroButton.click();
            await page.waitForTimeout(700);
            const zeroPosition = await barChart.evaluate((chart) => ({
              actual: chart.scrollLeft,
              expected: Math.max(
                0,
                Math.min(
                  chart.scrollWidth - chart.clientWidth,
                  Number(chart.dataset.barZeroRatio) * chart.scrollWidth -
                  chart.clientWidth / 2
                )
              ),
              pressed:
                chart
                  .closest("[data-component-id]")
                  .querySelector('[data-bar-jump="zero"]')
                  .getAttribute("aria-pressed") === "true",
            }));
            navigationWorks =
              negativePosition.scrollLeft <= 2 &&
              negativePosition.pressed &&
              positivePosition.scrollLeft >= maxScroll - 2 &&
              positivePosition.pressed &&
              Math.abs(zeroPosition.actual - zeroPosition.expected) <= 2 &&
              zeroPosition.pressed;
          }
        }

        await barChart.evaluate((chart) => {
          chart.scrollLeft = 0;
        });
        const negativeExtremeReadable = await barChart.evaluate((chart) => {
          const labels = Array.from(
            chart.querySelectorAll(
              '[data-bar-value-label][data-bar-direction="negative"]'
            )
          );
          if (!labels.length) return false;
          const target = labels.reduce((leftmost, label) =>
            label.getBBox().x < leftmost.getBBox().x ? label : leftmost
          );
          const chartRect = chart.getBoundingClientRect();
          const labelRect = target.getBoundingClientRect();
          return (
            labelRect.left >= chartRect.left - 1 &&
            labelRect.right <= chartRect.right + 1
          );
        });

        let wheelNative = true;
        if (maxScroll > 1) {
          const barBox = await barChart.boundingBox();
          if (!barBox) throw new Error("diverging bar has no bounding box");
          await page.mouse.move(
            barBox.x + barBox.width / 2,
            barBox.y + barBox.height / 2
          );
          await page.mouse.wheel(180, 0);
          await page.waitForTimeout(120);
          wheelNative = (await barChart.evaluate((chart) => chart.scrollLeft)) > 0;
        }

        await barChart.evaluate((chart) => {
          chart.scrollLeft = chart.scrollWidth - chart.clientWidth;
        });
        const positiveExtremeReadable = await barChart.evaluate((chart) => {
          const labels = Array.from(
            chart.querySelectorAll(
              '[data-bar-value-label][data-bar-direction="positive"]'
            )
          );
          if (!labels.length) return false;
          const target = labels.reduce((rightmost, label) =>
            label.getBBox().x > rightmost.getBBox().x ? label : rightmost
          );
          const chartRect = chart.getBoundingClientRect();
          const labelRect = target.getBoundingClientRect();
          return (
            labelRect.left >= chartRect.left - 1 &&
            labelRect.right <= chartRect.right + 1
          );
        });
        let barScreenshot = "";
        if (maxScroll > 1) {
          barScreenshot = `${path.basename(
            input,
            path.extname(input)
          )}-${viewport.width}x${viewport.height}-bar-scrolled.png`;
          await page.screenshot({
            path: path.join(outputDir, barScreenshot),
            fullPage: true,
          });
        }
        await barChart.evaluate((chart, scrollLeft) => {
          chart.scrollLeft = scrollLeft;
        }, initialScrollLeft);

        let touchNative = true;
        let touchPageContained = true;
        let categoryTouchTooltip = true;
        if (viewport.width <= 520 && maxScroll > 1) {
          const touchContext = await browser.newContext({
            viewport,
            deviceScaleFactor: 1,
            hasTouch: true,
            isMobile: true,
          });
          const touchPage = await touchContext.newPage();
          await touchPage.goto(pathToFileURL(input).href, {
            waitUntil: "load",
          });
          await touchPage.waitForFunction(
            () => document.documentElement.dataset.vdaReady
          );
          const touchChart = touchPage
            .locator('.vda-bar-chart[data-bar-layout="diverging"]')
            .first();
          await touchChart.scrollIntoViewIfNeeded();
          await touchChart.evaluate((chart) => {
            chart.scrollLeft = 0;
          });
          const touchBox = await touchChart.boundingBox();
          if (!touchBox) throw new Error("touch diverging bar has no bounding box");
          const cdp = await touchContext.newCDPSession(touchPage);
          const startX = touchBox.x + touchBox.width - 24;
          const endX = touchBox.x + 42;
          const y = touchBox.y + touchBox.height / 2;
          await cdp.send("Input.dispatchTouchEvent", {
            type: "touchStart",
            touchPoints: [{ x: startX, y }],
          });
          for (let step = 1; step <= 8; step += 1) {
            const x = startX + ((endX - startX) * step) / 8;
            await cdp.send("Input.dispatchTouchEvent", {
              type: "touchMove",
              touchPoints: [{ x, y }],
            });
            await touchPage.waitForTimeout(18);
          }
          await cdp.send("Input.dispatchTouchEvent", {
            type: "touchEnd",
            touchPoints: [],
          });
          await touchPage.waitForTimeout(180);
          const touchState = await touchChart.evaluate((chart) => ({
            scrollLeft: chart.scrollLeft,
            pageClientWidth: document.documentElement.clientWidth,
            pageScrollWidth: document.documentElement.scrollWidth,
          }));
          touchNative = touchState.scrollLeft > 0;
          touchPageContained =
            touchState.pageScrollWidth <= touchState.pageClientWidth + 1;
          const touchLabel = touchPage
            .locator(".vda-bar-category-label")
            .first();
          await touchLabel.dispatchEvent("pointerdown", {
            pointerType: "touch",
            clientX: 24,
            clientY: 24,
            bubbles: true,
          });
          const touchTooltipState = await touchLabel.evaluate((label) => {
            const tooltip = document.querySelector(".vda-tooltip");
            return (
              tooltip.dataset.open === "true" &&
              tooltip.textContent === label.dataset.barCategoryFull
            );
          });
          await touchPage.locator("body").dispatchEvent("pointerdown", {
            pointerType: "touch",
            clientX: 2,
            clientY: 2,
            bubbles: true,
          });
          const touchTooltipDismissed = await touchPage.evaluate(
            () => document.querySelector(".vda-tooltip").dataset.open !== "true"
          );
          categoryTouchTooltip =
            touchTooltipState && touchTooltipDismissed;
          await touchContext.close();
        }

        barInteraction = {
          ...initialState,
          compactInnerScroll:
            viewport.width > 520 ||
            initialState.scrollWidth > initialState.clientWidth + 1,
          negativeExtremeReadable,
          positiveExtremeReadable,
          wheelNative,
          touchNative,
          touchPageContained,
          categoryKeyboardTooltip,
          categoryTouchTooltip,
          navigationWorks,
          screenshot: barScreenshot,
        };
      }
      const groupedHeatmaps = await page.locator(
        '[data-heatmap-layout="stacked-groups"]'
      ).count();
      let heatmapInteraction = null;
      if (groupedHeatmaps > 0) {
        const heatmapState = await page.evaluate(() => {
          const stack = document.querySelector(
            '[data-heatmap-layout="stacked-groups"]'
          );
          const section = stack.closest("[data-component-id]");
          const component = window.__VDA_SPEC__.components.find(
            (item) => item.id === section.dataset.componentId
          );
          const groups = Array.from(
            stack.querySelectorAll("[data-heatmap-group]")
          );
          const firstRowIndices = Array.from(
            stack.querySelectorAll('[data-heatmap-cell][data-row-index="0"]')
          ).map((cell) => Number(cell.dataset.columnIndex));
          const domains = groups.map((group) => [
            group.dataset.domainMin,
            group.dataset.domainMax,
          ]);
          const expectedDomain = [
            stack.dataset.domainMin,
            stack.dataset.domainMax,
          ];
          const charts = Array.from(
            stack.querySelectorAll(".vda-heatmap-chart")
          );
          const overflows = charts.map(
            (chart) => chart.scrollWidth > chart.clientWidth + 1
          );
          const cue = stack.querySelector(".vda-heatmap-scroll-cue");
          return {
            groupCount: groups.length,
            groupCountMatches:
              groups.length ===
              (Array.isArray(component.columnGroups)
                ? component.columnGroups.length
                : 2),
            columnCounts: groups.map((group) =>
              Number(group.dataset.columnCount)
            ),
            twelveByTwelve:
              groups.length === 2 &&
              groups.every(
                (group) => Number(group.dataset.columnCount) === 12
              ),
            coverage:
              JSON.stringify(firstRowIndices) ===
              JSON.stringify(Array.from({ length: 24 }, (_, index) => index)),
            cellCount:
              stack.querySelectorAll("[data-heatmap-cell]").length ===
              component.rows.length * component.columns.length,
            sharedLegend:
              stack.querySelectorAll("[data-heatmap-shared-legend]").length ===
              1,
            sharedDomain: domains.every(
              (domain) =>
                domain[0] === expectedDomain[0] &&
                domain[1] === expectedDomain[1]
            ),
            fitWithoutUnnecessaryScroll:
              window.innerWidth < 520 ||
              overflows.every((overflow) => !overflow),
            narrowScrollWhenRequired:
              window.innerWidth >= 520 ||
              overflows.every(Boolean),
            cueMatchesOverflow:
              overflows.some(Boolean) ===
              (window.getComputedStyle(cue).display !== "none"),
            pageContained:
              document.documentElement.scrollWidth <=
              document.documentElement.clientWidth + 1,
          };
        });

        const secondGroupCell = page
          .locator(
            '[data-heatmap-group][data-group-index="1"] [data-heatmap-cell]'
          )
          .first();
        await secondGroupCell.focus();
        await page.waitForFunction(
          () =>
            window.getComputedStyle(
              document.querySelector(".vda-tooltip")
            ).opacity === "1"
        );
        const cellState = await secondGroupCell.evaluate((cell) => {
          const section = cell.closest("[data-component-id]");
          const component = window.__VDA_SPEC__.components.find(
            (item) => item.id === section.dataset.componentId
          );
          const rowIndex = Number(cell.dataset.rowIndex);
          const columnIndex = Number(cell.dataset.columnIndex);
          return {
            rawValueMatches:
              cell.dataset.rawValue ===
              String(component.values[rowIndex][columnIndex]),
            tooltipHasCoordinates:
              cell.dataset.tip.includes(String(component.rows[rowIndex])) &&
              cell.dataset.tip.includes(String(component.columns[columnIndex])),
          };
        });
        const heatmapFilename = `${path.basename(
          input,
          path.extname(input)
        )}-${viewport.width}x${viewport.height}-heatmap-tooltip.png`;
        await page.locator(".skip-link").evaluate((element) => {
          element.style.visibility = "hidden";
        });
        await page.screenshot({
          path: path.join(outputDir, heatmapFilename),
          fullPage: true,
        });
        await page.locator(".skip-link").evaluate((element) => {
          element.style.visibility = "";
        });
        await secondGroupCell.evaluate((cell) => cell.blur());
        heatmapInteraction = {
          ...heatmapState,
          ...cellState,
          screenshot: heatmapFilename,
        };
      }
      results.push({
        viewport,
        output: filename,
        ready,
        consoleErrors,
        dimensions,
        layoutIntegrity,
        contentIntegrity,
        interaction: { tooltipTargets, keyboardTooltipOpen },
        lineInteraction,
        barInteraction,
        heatmapInteraction,
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
    result.layoutIntegrity.metrics.some(
      (metrics) =>
        !metrics.fontInRange ||
        (result.viewport.width >= 760 &&
          metrics.count === 4 &&
          metrics.requestedColumns === 4 &&
          (metrics.renderedColumns !== 4 || metrics.renderedRows !== 1)) ||
        (result.viewport.width <= 520 &&
          metrics.count === 4 &&
          metrics.requestedColumns === 4 &&
          (metrics.renderedColumns !== 2 || metrics.renderedRows !== 2))
    ) ||
    (result.layoutIntegrity.meta &&
      (!result.layoutIntegrity.meta.pairsStayInline ||
        (result.viewport.width >= 760 &&
          result.layoutIntegrity.meta.count === 3 &&
          result.layoutIntegrity.meta.renderedRows !== 1))) ||
    result.contentIntegrity.structuredComponentNotes !== true ||
    (result.interaction.tooltipTargets > 0 &&
      result.interaction.keyboardTooltipOpen !== true) ||
    (result.lineInteraction &&
      Object.entries(result.lineInteraction).some(
        ([key, value]) =>
          ![
            "hitboxes",
            "legendButtons",
            "screenshot",
            "legendScreenshot",
          ].includes(key) && value !== true
      )) ||
    (result.barInteraction &&
      Object.entries(result.barInteraction).some(
        ([key, value]) =>
          ![
            "count",
            "clientWidth",
            "scrollWidth",
            "initialScrollLeft",
            "screenshot",
          ].includes(key) && value !== true
      )) ||
    (result.heatmapInteraction &&
      Object.entries(result.heatmapInteraction).some(
        ([key, value]) =>
          !["groupCount", "columnCounts", "screenshot"].includes(key) &&
          value !== true
      ))
  );
  process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
  if (failed) process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`render failed: ${error.stack || error.message}\n`);
  process.exitCode = 1;
});
