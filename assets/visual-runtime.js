(function () {
  "use strict";

  var spec = window.__VDA_SPEC__ || {};
  var root = document.getElementById("main");
  var NS = "http://www.w3.org/2000/svg";
  var palette = [
    "#315CF5", "#17A6A1", "#7357D6", "#C98924",
    "#D45B86", "#5D7B8A", "#7D8D31", "#AD6A3F"
  ];

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function finite(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function formatValue(value, format) {
    if (value == null || value === "" || !Number.isFinite(Number(value))) {
      return "—";
    }
    var options = format || {};
    var number = Number(value);
    var decimals = Number.isInteger(options.decimals) ? options.decimals : null;
    var locale = options.locale || "zh-CN";
    var formatterOptions = {
      maximumFractionDigits: decimals == null ? 1 : decimals,
      minimumFractionDigits: decimals == null ? 0 : decimals
    };

    if (options.type === "percent") {
      if (options.input !== "ratio") {
        number = number / 100;
      }
      formatterOptions.style = "percent";
    } else if (options.type === "currency") {
      formatterOptions.style = "currency";
      formatterOptions.currency = options.currency || "CNY";
      formatterOptions.currencyDisplay = options.currencyDisplay || "narrowSymbol";
    }
    if (options.compact === true) {
      formatterOptions.notation = "compact";
      formatterOptions.compactDisplay = "short";
    }

    try {
      return new Intl.NumberFormat(locale, formatterOptions).format(number);
    } catch (error) {
      return String(number);
    }
  }

  function displayValue(item) {
    if (item && item.display != null) return String(item.display);
    return formatValue(item ? item.value : null, item ? item.format : null);
  }

  function renderComponentNote(note) {
    if (!note) return "";
    if (typeof note === "string") {
      return '<p class="vda-note" data-note-kind="legacy">' +
        esc(note) + "</p>";
    }
    var labels = {
      definition: "口径说明",
      scope: "范围说明",
      method: "方法说明",
      limitation: "限制说明",
      source: "来源说明"
    };
    var kind = note.kind || "definition";
    var text = note.text || "";
    if (!text) return "";
    return (
      '<p class="vda-note" data-note-kind="' + esc(kind) + '">' +
      '<span class="vda-note-label">' +
      esc(labels[kind] || "补充说明") +
      "：</span>" +
      '<span class="vda-note-text">' + esc(text) + "</span></p>"
    );
  }

  function svgEl(name, attrs, text) {
    var element = document.createElementNS(NS, name);
    Object.keys(attrs || {}).forEach(function (key) {
      element.setAttribute(key, String(attrs[key]));
    });
    if (text != null) element.textContent = String(text);
    return element;
  }

  function componentFrame(component, body, options) {
    var opts = options || {};
    var span = clamp(finite(component.span, 12), 3, 12);
    var badge = component.badge
      ? '<span class="vda-badge">' + esc(component.badge) + "</span>"
      : "";
    var subtitle = component.subtitle
      ? '<p class="vda-panel-subtitle">' + esc(component.subtitle) + "</p>"
      : "";
    var note = renderComponentNote(component.note);
    var title = component.title
      ? '<div><h2 class="vda-panel-title">' + esc(component.title) + "</h2>" + subtitle + "</div>"
      : "";
    var head = title || badge
      ? '<header class="vda-panel-head">' + title + badge + "</header>"
      : "";
    var tone = component.tone ? ' data-tone="' + esc(component.tone) + '"' : "";
    var emphasis = component.emphasis
      ? ' data-emphasis="' + esc(component.emphasis) + '"'
      : "";
    var panelClass = opts.panel === false ? "" : " vda-panel";
    return (
      '<section class="vda-component' + panelClass + '" style="--span:' + span + '"' +
      ' data-component-id="' + esc(component.id || "") + '"' + tone + emphasis +
      ' aria-label="' + esc(component.ariaLabel || component.title || component.type || "数据组件") + '">' +
      head + body + note + "</section>"
    );
  }

  function renderMetrics(component) {
    var items = Array.isArray(component.items) ? component.items : [];
    var columns = clamp(finite(component.columns, Math.min(items.length || 1, 4)), 1, 6);
    var html =
      '<div class="vda-metrics" data-count="' + items.length +
      '" data-requested-columns="' + columns +
      '" style="--columns:' + columns + '">';
    items.forEach(function (item) {
      var change = item.change
        ? '<span class="vda-change" data-tone="' + esc(item.change.tone || "neutral") + '">' +
          esc(item.change.label || item.change.display || "") + "</span>"
        : "";
      var context = item.context ? "<span>" + esc(item.context) + "</span>" : "";
      var unit = item.unit ? '<span class="vda-metric-unit">' + esc(item.unit) + "</span>" : "";
      html +=
        '<article class="vda-metric">' +
        '<p class="vda-metric-label">' + esc(item.label) + "</p>" +
        '<p class="vda-metric-value">' + esc(displayValue(item)) + unit + "</p>" +
        '<div class="vda-metric-context">' + change + context + "</div>" +
        "</article>";
    });
    html += "</div>";
    return componentFrame(component, html, { panel: false });
  }

  function getExtent(series) {
    var values = [];
    (series || []).forEach(function (entry) {
      (entry.values || []).forEach(function (value) {
        if (Number.isFinite(Number(value))) values.push(Number(value));
      });
    });
    if (!values.length) return [0, 1];
    var min = Math.min.apply(null, values);
    var max = Math.max.apply(null, values);
    if (min === max) {
      var padding = Math.abs(min || 1) * 0.1;
      return [min - padding, max + padding];
    }
    var range = max - min;
    return [Math.min(0, min - range * 0.08), max + range * 0.12];
  }

  function compactChartLayout() {
    return window.innerWidth <= 520;
  }

  function compactChartWidth() {
    return Math.max(300, window.innerWidth - 54);
  }

  function estimateTextWidth(value, fontSize) {
    var size = finite(fontSize, 11);
    var units = Array.from(String(value == null ? "" : value)).reduce(function (sum, char) {
      if (/[\u2E80-\u9FFF\uAC00-\uD7AF]/.test(char)) return sum + 1;
      if (/[MW@%￥¥]/.test(char)) return sum + 0.82;
      if (/\s/.test(char)) return sum + 0.36;
      if (/[.,:;|!'"`()[\]{}+\-]/.test(char)) return sum + 0.44;
      return sum + 0.62;
    }, 0);
    return Math.ceil(units * size);
  }

  function resolveBarLayout(component, categories, values) {
    var max = Math.max.apply(null, values.concat([0]));
    var min = Math.min.apply(null, values.concat([0]));
    var hasPositive = max > 0;
    var hasNegative = min < 0;
    var requested = component.layout || "auto";
    var diverging = requested === "diverging" ||
      (requested !== "standard" && hasPositive && hasNegative);
    if (!diverging) {
      var compact = compactChartLayout();
      return {
        diverging: false,
        width: compact ? compactChartWidth() : 760,
        margin: compact
          ? { top: 6, right: 46, bottom: 18, left: 92 }
          : { top: 6, right: 86, bottom: 18, left: 138 },
        categoryX: null
      };
    }

    var categoryWidth = categories.reduce(function (largest, category) {
      return Math.max(largest, estimateTextWidth(category, 11));
    }, 0);
    var valueWidth = values.reduce(function (largest, value) {
      return Math.max(
        largest,
        estimateTextWidth(formatValue(value, component.format), 11)
      );
    }, 0);
    var labelWidth = clamp(categoryWidth + 16, 104, 196);
    var valueGutter = clamp(valueWidth + 14, 36, 96);
    var negativeMagnitude = Math.abs(Math.min(0, min));
    var positiveMagnitude = Math.max(0, max);
    var totalMagnitude = negativeMagnitude + positiveMagnitude || 1;
    var negativeShare = negativeMagnitude / totalMagnitude;
    var positiveShare = positiveMagnitude / totalMagnitude;
    var minimumSide = 72;
    var plotWidth = Math.max(
      520,
      negativeShare > 0 ? minimumSide / negativeShare : 0,
      positiveShare > 0 ? minimumSide / positiveShare : 0
    );
    plotWidth = clamp(Math.ceil(plotWidth), 520, 640);
    var plotLeft = valueGutter + 20;
    var right = valueGutter + 20;
    var minorSidePixels = plotWidth * Math.min(negativeShare, positiveShare);
    var extremeRatio = Math.max(negativeMagnitude, positiveMagnitude) /
      Math.max(1e-9, Math.min(negativeMagnitude, positiveMagnitude));
    return {
      diverging: true,
      width: Math.ceil(plotLeft + plotWidth + right),
      margin: { top: 6, right: right, bottom: 18, left: plotLeft },
      categoryX: null,
      labelWidth: labelWidth,
      valueGutter: valueGutter,
      plotWidth: plotWidth,
      negativeMagnitude: negativeMagnitude,
      positiveMagnitude: positiveMagnitude,
      minorSidePixels: minorSidePixels,
      extremeRatio: extremeRatio,
      extreme: hasPositive && hasNegative && minorSidePixels < 24,
      minorityDirection: negativeMagnitude <= positiveMagnitude
        ? "negative"
        : "positive"
    };
  }

  function renderDivergingBarDetail(component, categories, values, layout) {
    if (!layout.extreme) return "";
    var direction = layout.minorityDirection;
    var items = categories.map(function (category, index) {
      return {
        category: category,
        value: Number.isFinite(values[index]) ? values[index] : 0,
        index: index
      };
    }).filter(function (item) {
      return direction === "negative" ? item.value < 0 : item.value > 0;
    });
    var maxMagnitude = items.reduce(function (largest, item) {
      return Math.max(largest, Math.abs(item.value));
    }, 0) || 1;
    var title = direction === "negative" ? "小量级负向局部放大" : "小量级正向局部放大";
    return (
      '<aside class="vda-bar-detail" data-bar-detail="true" data-minority-direction="' +
      direction + '" aria-label="' + title + '">' +
      '<div class="vda-bar-detail-head">' +
      '<strong>' + title + '</strong>' +
      '<span>独立比例，仅用于辨认小量级项目，不与主图条长比较</span>' +
      '</div>' +
      '<div class="vda-bar-detail-list">' +
      items.map(function (item) {
        var ratio = Math.abs(item.value) / maxMagnitude;
        return (
          '<div class="vda-bar-detail-row" data-bar-detail-row="' + item.index + '">' +
          '<span class="vda-bar-detail-label" title="' + esc(item.category) + '">' +
          esc(item.category) + '</span>' +
          '<span class="vda-bar-detail-track" aria-hidden="true">' +
          '<span class="vda-bar-detail-fill" data-direction="' + direction +
          '" style="width:' + Math.max(4, ratio * 100) + '%"></span></span>' +
          '<strong class="vda-bar-detail-value">' +
          esc(formatValue(item.value, component.format)) + '</strong>' +
          '</div>'
        );
      }).join("") +
      '</div></aside>'
    );
  }

  function renderDivergingBarNavigation() {
    return (
      '<div class="vda-bar-navigation" role="group" aria-label="双向条形图快速定位">' +
      '<button type="button" data-bar-jump="negative">负向极值</button>' +
      '<button type="button" data-bar-jump="zero">零轴</button>' +
      '<button type="button" data-bar-jump="positive">正向极值</button>' +
      '</div>'
    );
  }

  function renderLineChart(component) {
    var labels = Array.isArray(component.labels) ? component.labels : [];
    var series = Array.isArray(component.series) ? component.series : [];
    var compact = compactChartLayout();
    var width = compact ? compactChartWidth() : 760;
    var height = compact ? Math.max(250, finite(component.height, 300) * 0.86) : finite(component.height, 300);
    var margin = compact
      ? { top: 18, right: 18, bottom: 38, left: 44 }
      : { top: 16, right: 26, bottom: 42, left: 58 };
    var innerW = width - margin.left - margin.right;
    var innerH = height - margin.top - margin.bottom;
    var extent = component.domain || getExtent(series);
    var minY = finite(extent[0], 0);
    var maxY = finite(extent[1], 1);
    var yRange = maxY - minY || 1;
    var svg = svgEl("svg", {
      viewBox: "0 0 " + width + " " + height,
      role: "img",
      "aria-label": component.ariaLabel || component.title || "趋势图"
    });

    for (var tick = 0; tick <= 4; tick += 1) {
      var y = margin.top + (innerH * tick) / 4;
      var value = maxY - (yRange * tick) / 4;
      svg.appendChild(svgEl("line", {
        x1: margin.left, x2: width - margin.right, y1: y, y2: y,
        class: tick === 4 && minY === 0 ? "vda-zero-line" : "vda-grid-line"
      }));
      svg.appendChild(svgEl("text", {
        x: margin.left - 10, y: y + 4, "text-anchor": "end", class: "vda-axis-label"
      }, formatValue(value, component.format)));
    }

    var xStep = labels.length > 1 ? innerW / (labels.length - 1) : innerW;
    var labelEvery = Math.max(1, Math.ceil(labels.length / (compact ? 4 : 6)));
    labels.forEach(function (label, index) {
      if (index % labelEvery !== 0 && index !== labels.length - 1) return;
      var x = margin.left + xStep * index;
      svg.appendChild(svgEl("text", {
        x: x, y: height - 14, "text-anchor": index === 0 ? "start" : index === labels.length - 1 ? "end" : "middle",
        class: "vda-axis-label"
      }, label));
    });

    series.forEach(function (entry, seriesIndex) {
      var color = entry.color || palette[seriesIndex % palette.length];
      var values = Array.isArray(entry.values) ? entry.values : [];
      var points = [];
      values.forEach(function (raw, index) {
        var value = Number(raw);
        if (!Number.isFinite(value)) return;
        var x = margin.left + xStep * index;
        var y = margin.top + ((maxY - value) / yRange) * innerH;
        points.push([x, y, value, index]);
      });
      if (!points.length) return;

      var d = points.map(function (point, index) {
        return (index === 0 ? "M" : "L") + point[0].toFixed(2) + "," + point[1].toFixed(2);
      }).join(" ");
      var seriesMarks = svgEl("g", {
        "data-series-mark": "true",
        "data-series-index": seriesIndex
      });
      seriesMarks.appendChild(svgEl("path", {
        d: d,
        fill: "none",
        stroke: color,
        "stroke-width": entry.emphasis === "secondary" ? 2 : 3,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        opacity: entry.emphasis === "secondary" ? 0.55 : 1
      }));

      var last = points[points.length - 1];
      if (component.endLabels !== false) {
        seriesMarks.appendChild(svgEl("text", {
          x: last[0] - 2,
          y: last[1] - 10,
          "text-anchor": "end",
          class: "vda-value-label",
          fill: color
        }, formatValue(last[2], component.format)));
      }
      svg.appendChild(seriesMarks);
    });

    if (component.annotation && Number.isInteger(component.annotation.index)) {
      var ai = clamp(component.annotation.index, 0, Math.max(0, labels.length - 1));
      var ax = margin.left + xStep * ai;
      svg.appendChild(svgEl("line", {
        x1: ax, x2: ax, y1: margin.top, y2: height - margin.bottom,
        stroke: "#7357D6", "stroke-width": 1.5, "stroke-dasharray": "4 5"
      }));
      svg.appendChild(svgEl("text", {
        x: clamp(ax + 8, margin.left + 8, width - margin.right - 8),
        y: margin.top + 12,
        class: "vda-value-label",
        fill: "#7357D6"
      }, component.annotation.label || ""));
    }

    var focusLayer = svgEl("g", {
      class: "vda-line-focus-layer",
      "data-open": "false",
      "aria-hidden": "true"
    });
    focusLayer.appendChild(svgEl("line", {
      x1: margin.left,
      x2: margin.left,
      y1: margin.top,
      y2: height - margin.bottom,
      class: "vda-crosshair-line"
    }));
    series.forEach(function (entry, seriesIndex) {
      focusLayer.appendChild(svgEl("circle", {
        cx: margin.left,
        cy: margin.top,
        r: 4.5,
        class: "vda-crosshair-point",
        fill: "#FFFFFF",
        stroke: entry.color || palette[seriesIndex % palette.length],
        "stroke-width": 2.5,
        "data-series-index": seriesIndex
      }));
    });
    svg.appendChild(focusLayer);

    svg.appendChild(svgEl("rect", {
      x: margin.left,
      y: margin.top,
      width: innerW,
      height: innerH,
      class: "vda-line-hitbox",
      fill: "transparent",
      tabindex: "0",
      role: "slider",
      "aria-label": (component.title || "趋势图") + "，使用左右方向键查看各时间点数值",
      "aria-valuemin": 0,
      "aria-valuemax": Math.max(0, labels.length - 1),
      "aria-valuenow": 0,
      "data-line-hitbox": "true",
      "data-plot-left": margin.left,
      "data-plot-right": width - margin.right,
      "data-plot-top": margin.top,
      "data-plot-bottom": height - margin.bottom,
      "data-min-y": minY,
      "data-max-y": maxY
    }));

    var container = document.createElement("div");
    container.className = "vda-chart";
    container.style.setProperty("--chart-height", height + "px");
    container.appendChild(svg);

    var legend = "";
    if (series.length > 1) {
      legend =
        '<div class="vda-legend" role="group" aria-label="图例，点击显示或隐藏数据系列" data-line-legend="true">' +
        series.map(function (entry, index) {
          var name = entry.name || "系列 " + (index + 1);
          return (
            '<button class="vda-legend-item" type="button" ' +
            'data-series-toggle="true" data-series-index="' + index + '" ' +
            'data-state="visible" aria-pressed="true" ' +
            'aria-label="' + esc(name) + '，当前显示，点击隐藏">' +
            '<span class="vda-legend-swatch" style="--series-color:' +
            esc(entry.color || palette[index % palette.length]) + '"></span>' +
            '<span class="vda-legend-label">' + esc(name) + "</span>" +
            "</button>"
          );
        }).join("") +
        '<span class="vda-sr-only" aria-live="polite" data-line-legend-status></span>' +
        "</div>";
    }
    return componentFrame(component, container.outerHTML + legend);
  }

  function renderBarChart(component) {
    var categories = Array.isArray(component.categories) ? component.categories : [];
    var displayCategories =
      Array.isArray(component.displayCategories) &&
      component.displayCategories.length === categories.length
        ? component.displayCategories.map(String)
        : categories.map(String);
    var values = Array.isArray(component.values) ? component.values.map(Number) : [];
    var layout = resolveBarLayout(component, displayCategories, values);
    var width = layout.width;
    var rowHeight = clamp(
      finite(component.rowHeight, layout.diverging ? 44 : 38),
      layout.diverging ? 40 : 28,
      60
    );
    var height = Math.max(180, categories.length * rowHeight + 32);
    var margin = layout.margin;
    var innerW = width - margin.left - margin.right;
    var max = Math.max.apply(null, values.concat([0]));
    var min = Math.min.apply(null, values.concat([0]));
    var range = max - Math.min(0, min) || 1;
    var zeroX = margin.left + ((0 - Math.min(0, min)) / range) * innerW;
    var svg = svgEl("svg", {
      viewBox: "0 0 " + width + " " + height,
      role: "img",
      "aria-label": component.ariaLabel || component.title || "条形图",
      "data-bar-svg": "true",
      "data-bar-layout": layout.diverging ? "diverging" : "standard",
      "data-domain-min": Math.min(0, min),
      "data-domain-max": Math.max(0, max)
    });
    if (layout.diverging) svg.style.minWidth = width + "px";

    svg.appendChild(svgEl("line", {
      x1: zeroX, x2: zeroX, y1: margin.top, y2: height - margin.bottom,
      class: "vda-zero-line",
      "data-bar-zero": "true"
    }));

    categories.forEach(function (category, index) {
      var displayCategory = displayCategories[index];
      var value = Number.isFinite(values[index]) ? values[index] : 0;
      var y = margin.top + index * rowHeight + rowHeight * 0.18;
      var barH = rowHeight * 0.56;
      var valueX = margin.left + ((value - Math.min(0, min)) / range) * innerW;
      var x = Math.min(zeroX, valueX);
      var barW = value === 0 ? 0 : Math.abs(valueX - zeroX);
      var color = (component.colors && component.colors[index]) ||
        (component.highlightIndex === index ? "#315CF5" : index === 0 ? "#315CF5" : "#A8B0BF");

      if (!layout.diverging) {
        svg.appendChild(svgEl("text", {
          x: margin.left - 12,
          y: y + barH / 2 + 4,
          "text-anchor": "end",
          class: "vda-axis-label",
          "data-bar-category-label": "true"
        }, displayCategory));
      }

      var bar = svgEl("rect", {
        x: x, y: y, width: barW, height: barH, rx: 3,
        fill: color,
        opacity: component.highlightIndex == null || component.highlightIndex === index ? 1 : 0.48,
        tabindex: "0",
        "data-bar-mark": "true",
        "data-bar-index": index,
        "data-bar-value": value,
        "data-bar-direction": value < 0 ? "negative" : value > 0 ? "positive" : "zero",
        "data-tip": esc(category) + ": " + esc(formatValue(value, component.format))
      });
      bar.setAttribute("aria-label", bar.getAttribute("data-tip"));
      svg.appendChild(bar);
      svg.appendChild(svgEl("text", {
        x: value >= 0 ? valueX + 8 : valueX - 8,
        y: y + barH / 2 + 4,
        "text-anchor": value >= 0 ? "start" : "end",
        class: "vda-value-label",
        "data-bar-value-label": "true",
        "data-bar-index": index,
        "data-bar-direction": value < 0 ? "negative" : value > 0 ? "positive" : "zero"
      }, formatValue(value, component.format)));
    });

    var container = document.createElement("div");
    container.className = "vda-chart" +
      (layout.diverging ? " vda-bar-chart" : "");
    container.style.setProperty("--chart-height", height + "px");
    container.appendChild(svg);
    if (layout.diverging) {
      container.setAttribute("data-bar-layout", "diverging");
      container.setAttribute("data-bar-zero-ratio", zeroX / width);
      container.setAttribute("data-bar-chart-width", width);
      container.setAttribute("data-bar-extreme", layout.extreme ? "true" : "false");
      container.setAttribute("data-bar-extreme-ratio", layout.extremeRatio);
      container.setAttribute("data-bar-minor-side-pixels", layout.minorSidePixels);
      container.setAttribute("role", "group");
      container.setAttribute("tabindex", "0");
      container.setAttribute(
        "aria-label",
        (component.ariaLabel || component.title || "双向条形图") +
          "，可左右滚动查看正负两侧"
      );
      var frame = document.createElement("div");
      frame.className = "vda-bar-scroll-frame";
      frame.setAttribute("data-bar-scroll-frame", "true");
      frame.appendChild(container);
      var labelRail =
        '<div class="vda-bar-label-rail" aria-label="类别标签；可聚焦或点击查看完整名称">' +
        categories.map(function (category, index) {
          var displayCategory = displayCategories[index];
          var accessibleLabel = displayCategory === category
            ? category
            : displayCategory + "；完整名称：" + category;
          return (
            '<button type="button" class="vda-bar-category-label" ' +
            'data-bar-category-index="' + index + '" ' +
            'data-bar-category-full="' + esc(category) + '" ' +
            'data-bar-category-display="' + esc(displayCategory) + '" ' +
            'data-tip="' + esc(category) + '" ' +
            'aria-label="' + esc(accessibleLabel) + '">' +
            '<span class="vda-bar-category-label-text">' +
            esc(displayCategory) + "</span></button>"
          );
        }).join("") +
        "</div>";
      return componentFrame(
        component,
        '<div class="vda-diverging-bar-layout" style="--bar-label-width:' +
          layout.labelWidth + "px;--bar-row-height:" + rowHeight + 'px">' +
          labelRail + frame.outerHTML + "</div>" +
          renderDivergingBarNavigation() +
          '<p class="vda-scroll-cue vda-bar-scroll-cue">' +
          "可左右滑动，或用上方按钮快速查看两端 →</p>" +
          '<p class="vda-scroll-cue vda-bar-label-cue">' +
          "长标签可悬停、聚焦或点击查看完整名称</p>" +
          renderDivergingBarDetail(component, categories, values, layout)
      );
    }
    return componentFrame(component, container.outerHTML);
  }

  function renderDonut(component) {
    var segments = Array.isArray(component.segments) ? component.segments : [];
    var values = segments.map(function (item) { return Math.max(0, finite(item.value, 0)); });
    var total = values.reduce(function (sum, value) { return sum + value; }, 0) || 1;
    var width = 680;
    var height = 300;
    var cx = 180;
    var cy = 146;
    var radius = 96;
    var stroke = 28;
    var compact = compactChartLayout();
    if (compact) {
      width = compactChartWidth();
      height = 360;
      cx = width / 2;
      cy = 118;
      radius = 76;
      stroke = 24;
    }
    var circumference = 2 * Math.PI * radius;
    var offset = 0;
    var svg = svgEl("svg", {
      viewBox: "0 0 " + width + " " + height,
      role: "img",
      "aria-label": component.ariaLabel || component.title || "占比图"
    });

    svg.appendChild(svgEl("circle", {
      cx: cx, cy: cy, r: radius, fill: "none", stroke: "#EEF0F3", "stroke-width": stroke
    }));

    segments.forEach(function (segment, index) {
      var length = (values[index] / total) * circumference;
      var color = segment.color || palette[index % palette.length];
      var circle = svgEl("circle", {
        cx: cx, cy: cy, r: radius,
        fill: "none",
        stroke: color,
        "stroke-width": stroke,
        "stroke-dasharray": length + " " + (circumference - length),
        "stroke-dashoffset": -offset,
        "stroke-linecap": "butt",
        transform: "rotate(-90 " + cx + " " + cy + ")",
        tabindex: "0",
        "data-tip": esc(segment.label) + ": " + esc(formatValue(segment.value, component.format))
      });
      circle.setAttribute("aria-label", circle.getAttribute("data-tip"));
      svg.appendChild(circle);
      offset += length;
    });

    svg.appendChild(svgEl("text", {
      x: cx, y: cy - 2, "text-anchor": "middle",
      fill: "#181C23", "font-size": "30", "font-weight": "680",
      "letter-spacing": "-0.04em"
    }, component.centerValue || formatValue(total, component.totalFormat || component.format)));
    svg.appendChild(svgEl("text", {
      x: cx, y: cy + 22, "text-anchor": "middle",
      class: "vda-axis-label"
    }, component.centerLabel || "总计"));

    segments.forEach(function (segment, index) {
      var y = compact ? 238 + index * 28 : 58 + index * 32;
      svg.appendChild(svgEl("rect", {
        x: compact ? 26 : 360, y: y - 9, width: 9, height: 9, rx: 2,
        fill: segment.color || palette[index % palette.length]
      }));
      svg.appendChild(svgEl("text", {
        x: compact ? 44 : 378, y: y, class: "vda-axis-label"
      }, segment.label));
      svg.appendChild(svgEl("text", {
        x: compact ? width - 26 : 640, y: y, "text-anchor": "end", class: "vda-value-label"
      }, formatValue(segment.value, component.format)));
    });

    var container = document.createElement("div");
    container.className = "vda-chart";
    container.appendChild(svg);
    return componentFrame(component, container.outerHTML);
  }

  function mixColor(start, end, amount) {
    function parse(hex) {
      var value = hex.replace("#", "");
      return [
        parseInt(value.slice(0, 2), 16),
        parseInt(value.slice(2, 4), 16),
        parseInt(value.slice(4, 6), 16)
      ];
    }
    var a = parse(start);
    var b = parse(end);
    return "#" + a.map(function (value, index) {
      return Math.round(value + (b[index] - value) * amount).toString(16).padStart(2, "0");
    }).join("");
  }

  function parseHourLabel(label) {
    var normalized = String(label == null ? "" : label)
      .trim()
      .replace(/\s+/g, "")
      .replace(/时$/, "")
      .replace(/:00$/, "");
    if (!/^\d{1,2}$/.test(normalized)) return null;
    var hour = Number(normalized);
    return hour >= 0 && hour <= 23 ? hour : null;
  }

  function isCanonicalHourlyColumns(columns) {
    if (columns.length !== 24) return false;
    return columns.every(function (label, index) {
      return parseHourLabel(label) === index;
    });
  }

  function resolveHeatmapGroups(component, columns) {
    if (component.layout === "single") return [];
    var supplied = Array.isArray(component.columnGroups)
      ? component.columnGroups
      : [];
    if (supplied.length) {
      return supplied.map(function (group, index) {
        return {
          label: group.label || "分组 " + (index + 1),
          start: clamp(finite(group.start, 0), 0, Math.max(0, columns.length - 1)),
          end: clamp(finite(group.end, columns.length - 1), 0, Math.max(0, columns.length - 1))
        };
      });
    }
    if (isCanonicalHourlyColumns(columns)) {
      return [
        { label: "0–11 时", start: 0, end: 11 },
        { label: "12–23 时", start: 12, end: 23 }
      ];
    }
    return [];
  }

  function buildHeatmapChart(component, rows, columns, matrix, group, min, max, compact) {
    var start = group ? group.start : 0;
    var end = group ? group.end : columns.length - 1;
    var indices = [];
    for (var index = start; index <= end; index += 1) indices.push(index);
    var grouped = Boolean(group);
    var range = max - min || 1;
    var cellW = grouped ? (compact ? 48 : 54) : (compact ? 60 : 86);
    var cellH = grouped ? 36 : 40;
    var rowLabelWidth = rows.reduce(function (largest, row) {
      return Math.max(largest, estimateTextWidth(row, 11));
    }, 0);
    var formattedValueWidth = matrix.reduce(function (largest, row) {
      return Math.max(
        largest,
        (row || []).reduce(function (rowLargest, value) {
          return Math.max(
            rowLargest,
            estimateTextWidth(formatValue(value, component.format), 10.5)
          );
        }, 0)
      );
    }, 0);
    var left = grouped
      ? clamp(rowLabelWidth + 14, 62, 94)
      : clamp(rowLabelWidth + 18, 76, 112);
    var minimumCellWidth = grouped
      ? clamp(formattedValueWidth + 8, 28, 38)
      : clamp(formattedValueWidth + 12, 36, 60);
    var top = 42;
    var width = left + indices.length * cellW + 18;
    var height = top + rows.length * cellH + 20;
    var svg = svgEl("svg", {
      viewBox: "0 0 " + width + " " + height,
      role: "img",
      "aria-label": (component.ariaLabel || component.title || "热力图") +
        (group ? "，" + group.label : ""),
      "data-heatmap-svg": "true",
      "data-domain-min": min,
      "data-domain-max": max,
      "data-column-count": indices.length,
      "data-row-label-width": left,
      "data-min-cell-width": minimumCellWidth,
      "data-preferred-cell-width": cellW
    });
    svg.style.minWidth = width + "px";

    indices.forEach(function (columnIndex, localIndex) {
      svg.appendChild(svgEl("text", {
        x: left + localIndex * cellW + cellW / 2,
        y: 25,
        "text-anchor": "middle",
        class: "vda-axis-label",
        "data-heatmap-column-label": "true",
        "data-local-column-index": localIndex
      }, columns[columnIndex]));
    });

    rows.forEach(function (row, rowIndex) {
      svg.appendChild(svgEl("text", {
        x: left - 10,
        y: top + rowIndex * cellH + cellH / 2 + 4,
        "text-anchor": "end",
        class: "vda-axis-label",
        "data-heatmap-row-label": "true"
      }, row));
      indices.forEach(function (columnIndex, localIndex) {
        var value = matrix[rowIndex] ? Number(matrix[rowIndex][columnIndex]) : NaN;
        var ratio = Number.isFinite(value) ? clamp((value - min) / range, 0, 1) : 0;
        var fill = Number.isFinite(value) ? mixColor("#EEF2FF", "#315CF5", ratio) : "#F1F3F6";
        var textColor = ratio > 0.58 ? "#FFFFFF" : "#263044";
        var rawValue = Number.isFinite(value) ? String(matrix[rowIndex][columnIndex]) : "";
        var rect = svgEl("rect", {
          x: left + localIndex * cellW + 2,
          y: top + rowIndex * cellH + 2,
          width: cellW - 4,
          height: cellH - 4,
          rx: 5,
          fill: fill,
          tabindex: "0",
          "data-heatmap-cell": "true",
          "data-row-index": rowIndex,
          "data-column-index": columnIndex,
          "data-local-column-index": localIndex,
          "data-raw-value": rawValue,
          "data-tip": esc(row) + " · " + esc(columns[columnIndex]) + ": " +
            esc(Number.isFinite(value) ? formatValue(value, component.format) : "无数据")
        });
        rect.setAttribute("aria-label", rect.getAttribute("data-tip"));
        svg.appendChild(rect);
        if (component.showValues !== false && Number.isFinite(value)) {
          svg.appendChild(svgEl("text", {
            x: left + localIndex * cellW + cellW / 2,
            y: top + rowIndex * cellH + cellH / 2 + 4,
            "text-anchor": "middle",
            fill: textColor,
            "font-size": grouped ? "10.5" : "11",
            "font-weight": "650",
            "pointer-events": "none",
            "data-heatmap-value-label": "true",
            "data-local-column-index": localIndex
          }, formatValue(value, component.format)));
        }
      });
    });

    var chart = document.createElement("div");
    chart.className = "vda-chart vda-heatmap-chart";
    chart.style.setProperty("--chart-height", height + "px");
    chart.setAttribute("data-heatmap-min-width", left + indices.length * minimumCellWidth + 18);
    chart.appendChild(svg);
    return chart;
  }

  function renderHeatmap(component) {
    var rows = Array.isArray(component.rows) ? component.rows : [];
    var columns = Array.isArray(component.columns) ? component.columns : [];
    var matrix = Array.isArray(component.values) ? component.values : [];
    var flat = [];
    matrix.forEach(function (row) {
      (row || []).forEach(function (value) {
        if (Number.isFinite(Number(value))) flat.push(Number(value));
      });
    });
    var min = component.domain ? finite(component.domain[0], 0) : Math.min.apply(null, flat.concat([0]));
    var max = component.domain ? finite(component.domain[1], 1) : Math.max.apply(null, flat.concat([1]));
    var compact = compactChartLayout();
    var groups = resolveHeatmapGroups(component, columns);
    var container = document.createElement("div");
    container.className = groups.length ? "vda-heatmap-stack" : "vda-heatmap-single";
    container.setAttribute("data-heatmap-layout", groups.length ? "stacked-groups" : "single");
    container.setAttribute("data-domain-min", min);
    container.setAttribute("data-domain-max", max);

    if (groups.length) {
      groups.forEach(function (group, groupIndex) {
        var module = document.createElement("section");
        module.className = "vda-heatmap-group";
        module.setAttribute("data-heatmap-group", "true");
        module.setAttribute("data-group-index", groupIndex);
        module.setAttribute("data-start-index", group.start);
        module.setAttribute("data-end-index", group.end);
        module.setAttribute("data-column-count", group.end - group.start + 1);
        module.setAttribute("data-domain-min", min);
        module.setAttribute("data-domain-max", max);
        var heading = document.createElement("h3");
        heading.className = "vda-heatmap-group-title";
        heading.textContent = group.label;
        module.appendChild(heading);
        module.appendChild(buildHeatmapChart(
          component, rows, columns, matrix, group, min, max, compact
        ));
        container.appendChild(module);
      });
    } else {
      container.appendChild(buildHeatmapChart(
        component, rows, columns, matrix, null, min, max, compact
      ));
    }

    var legend = document.createElement("div");
    legend.className = "vda-heatmap-legend";
    legend.setAttribute("data-heatmap-shared-legend", "true");
    legend.innerHTML =
      '<span class="vda-heatmap-legend-value">' + esc(formatValue(min, component.format)) + '</span>' +
      '<span class="vda-heatmap-legend-ramp" aria-hidden="true"></span>' +
      '<span class="vda-heatmap-legend-value">' + esc(formatValue(max, component.format)) + '</span>';
    container.appendChild(legend);
    if (groups.length) {
      var cue = document.createElement("p");
      cue.className = "vda-scroll-cue vda-heatmap-scroll-cue";
      cue.textContent = "每个时段组可左右滑动查看完整 12 小时 →";
      container.appendChild(cue);
    }
    return componentFrame(component, container.outerHTML);
  }

  function renderInsight(component) {
    var frameComponent = Object.assign({}, component, {
      title: "",
      subtitle: "",
      badge: "",
      ariaLabel: component.ariaLabel || component.title || "关键发现"
    });
    var body =
      '<article class="vda-insight" data-tone="' + esc(component.tone || "info") + '">' +
      "<div>" +
      '<p class="vda-insight-kicker">' + esc(component.kicker || "关键发现") + "</p>" +
      '<h2 class="vda-insight-title">' + esc(component.title || "") + "</h2>" +
      '<p class="vda-insight-body">' + esc(component.body || "") + "</p>" +
      "</div></article>";
    return componentFrame(frameComponent, body, { panel: false });
  }

  function renderTable(component) {
    var columns = Array.isArray(component.columns) ? component.columns : [];
    var rows = Array.isArray(component.rows) ? component.rows : [];
    var header = columns.map(function (column) {
      return '<th scope="col" data-align="' + esc(column.align || (column.type === "number" ? "right" : "left")) + '">' +
        esc(column.label || column.key) + "</th>";
    }).join("");
    var body = rows.map(function (row) {
      return "<tr>" + columns.map(function (column) {
        var raw = row[column.key];
        var text = column.type === "number" ? formatValue(raw, column.format) : raw;
        var tone = row.tones && row.tones[column.key] ? row.tones[column.key] : "";
        return '<td data-align="' + esc(column.align || (column.type === "number" ? "right" : "left")) +
          '"' + (tone ? ' data-tone="' + esc(tone) + '"' : "") + ">" + esc(text) + "</td>";
      }).join("") + "</tr>";
    }).join("");
    var html = '<div class="vda-table-wrap" tabindex="0" aria-label="' +
      esc(component.ariaLabel || component.title || "数据表格") + '"><table class="vda-table"><thead><tr>' +
      header + "</tr></thead><tbody>" + body + "</tbody></table></div>";
    return componentFrame(component, html);
  }

  function renderDivider(component) {
    return (
      '<section class="vda-divider" style="--span:12" aria-label="' + esc(component.title || "分节") + '">' +
      "<h2>" + esc(component.title || "") + "</h2>" +
      (component.subtitle ? "<p>" + esc(component.subtitle) + "</p>" : "") +
      "</section>"
    );
  }

  function renderUnknown(component) {
    return componentFrame(component, '<div class="vda-error">不支持的组件类型：' + esc(component.type) + "</div>");
  }

  function renderComponent(component) {
    switch (component.type) {
      case "metrics": return renderMetrics(component);
      case "line": return renderLineChart(component);
      case "bar": return renderBarChart(component);
      case "donut": return renderDonut(component);
      case "heatmap": return renderHeatmap(component);
      case "insight": return renderInsight(component);
      case "table": return renderTable(component);
      case "divider": return renderDivider(component);
      default: return renderUnknown(component);
    }
  }

  function renderHeader() {
    var meta = spec.meta || {};
    var metaItems = [];
    if (meta.period) {
      metaItems.push(
        '<span class="vda-meta-item"><strong>周期</strong><span>' +
        esc(meta.period) + "</span></span>"
      );
    }
    if (meta.scope) {
      metaItems.push(
        '<span class="vda-meta-item"><strong>范围</strong><span>' +
        esc(meta.scope) + "</span></span>"
      );
    }
    if (meta.source) {
      metaItems.push(
        '<span class="vda-meta-item"><strong>来源</strong><span>' +
        esc(meta.source) + "</span></span>"
      );
    }
    return (
      '<header class="vda-header">' +
      "<div>" +
      (spec.eyebrow ? '<p class="vda-eyebrow">' + esc(spec.eyebrow) + "</p>" : "") +
      '<h1 class="vda-title">' + esc(spec.title || "数据分析") + "</h1>" +
      (spec.subtitle ? '<p class="vda-subtitle">' + esc(spec.subtitle) + "</p>" : "") +
      "</div>" +
      (metaItems.length
        ? '<div class="vda-meta" aria-label="数据范围">' +
          metaItems.join("") + "</div>"
        : "") +
      "</header>"
    );
  }

  function renderFooter() {
    var footer = spec.footer || {};
    if (!footer.source && !footer.note) return "";
    return (
      '<footer class="vda-footer">' +
      "<span>" + esc(footer.source || "") + "</span>" +
      "<span>" + esc(footer.note || "") + "</span>" +
      "</footer>"
    );
  }

  function setupTooltips() {
    var tooltip = document.createElement("div");
    tooltip.className = "vda-tooltip";
    tooltip.setAttribute("role", "tooltip");
    document.body.appendChild(tooltip);

    function position(x, y) {
      var rect = tooltip.getBoundingClientRect();
      var left = clamp(x, 12, Math.max(12, window.innerWidth - rect.width - 12));
      var top = clamp(y, 12, Math.max(12, window.innerHeight - rect.height - 12));
      tooltip.style.left = left + "px";
      tooltip.style.top = top + "px";
    }

    function showText(target, event) {
      var text = target.getAttribute("data-tip");
      if (!text) return;
      tooltip.removeAttribute("data-shared");
      tooltip.textContent = text.replace(/&amp;/g, "&");
      tooltip.dataset.open = "true";
      var x = event && event.clientX ? event.clientX + 12 : target.getBoundingClientRect().left + 12;
      var y = event && event.clientY ? event.clientY + 12 : target.getBoundingClientRect().top + 12;
      position(x, y);
    }

    function showShared(label, rows, x, y) {
      tooltip.replaceChildren();
      tooltip.dataset.shared = "true";
      var title = document.createElement("div");
      title.className = "vda-tooltip-title";
      title.textContent = label;
      tooltip.appendChild(title);
      rows.forEach(function (row, index) {
        var item = document.createElement("div");
        item.className = "vda-tooltip-row";
        item.dataset.seriesIndex = String(
          row.seriesIndex == null ? index : row.seriesIndex
        );
        item.dataset.rawValue = row.raw == null ? "" : String(row.raw);
        var swatch = document.createElement("span");
        swatch.className = "vda-tooltip-swatch";
        swatch.style.background = row.color;
        var name = document.createElement("span");
        name.className = "vda-tooltip-name";
        name.textContent = row.name;
        var value = document.createElement("strong");
        value.className = "vda-tooltip-value";
        value.textContent = row.display;
        item.appendChild(swatch);
        item.appendChild(name);
        item.appendChild(value);
        tooltip.appendChild(item);
      });
      tooltip.dataset.open = "true";
      position(x, y);
    }

    function hide() {
      tooltip.dataset.open = "false";
    }

    var pinnedTarget = null;

    document.addEventListener("pointerover", function (event) {
      var target = event.target.closest("[data-tip]");
      if (target) showText(target, event);
    });
    document.addEventListener("pointermove", function (event) {
      var target = event.target.closest("[data-tip]");
      if (target && tooltip.dataset.open === "true") showText(target, event);
    });
    document.addEventListener("pointerout", function (event) {
      var target = event.target.closest("[data-tip]");
      if (target && target !== pinnedTarget) hide();
    });
    document.addEventListener("pointerdown", function (event) {
      var target = event.target.closest("[data-tip]");
      if (
        target &&
        (event.pointerType === "touch" || event.pointerType === "pen")
      ) {
        pinnedTarget = target;
        showText(target, event);
        return;
      }
      if (pinnedTarget && (!target || target !== pinnedTarget)) {
        pinnedTarget = null;
        hide();
      }
    });
    document.addEventListener("focusin", function (event) {
      var target = event.target.closest("[data-tip]");
      if (target) showText(target);
    });
    document.addEventListener("focusout", function (event) {
      if (event.target !== pinnedTarget) hide();
    });
    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape") return;
      pinnedTarget = null;
      hide();
    });

    return {
      element: tooltip,
      hide: hide,
      showShared: showShared
    };
  }

  function setupLineChartInteractions(tooltipApi) {
    var components = Array.isArray(spec.components) ? spec.components : [];
    document.querySelectorAll("[data-line-hitbox]").forEach(function (hitbox) {
      var section = hitbox.closest("[data-component-id]");
      var componentId = section ? section.getAttribute("data-component-id") : "";
      var component = components.find(function (item) {
        return item && item.id === componentId && item.type === "line";
      });
      if (!component) return;

      var labels = Array.isArray(component.labels) ? component.labels : [];
      var series = Array.isArray(component.series) ? component.series : [];
      if (!labels.length || !series.length) return;

      var svg = hitbox.ownerSVGElement;
      var focusLayer = svg.querySelector(".vda-line-focus-layer");
      var crosshair = focusLayer.querySelector(".vda-crosshair-line");
      var points = Array.from(focusLayer.querySelectorAll(".vda-crosshair-point"));
      var marks = Array.from(svg.querySelectorAll("[data-series-mark]"));
      var toggles = Array.from(
        section.querySelectorAll("[data-series-toggle]")
      );
      var legendStatus = section.querySelector("[data-line-legend-status]");
      var plotLeft = finite(hitbox.dataset.plotLeft, 0);
      var plotRight = finite(hitbox.dataset.plotRight, 1);
      var plotTop = finite(hitbox.dataset.plotTop, 0);
      var plotBottom = finite(hitbox.dataset.plotBottom, 1);
      var minY = finite(hitbox.dataset.minY, 0);
      var maxY = finite(hitbox.dataset.maxY, 1);
      var yRange = maxY - minY || 1;
      var currentIndex = null;
      var pinned = false;
      var visibleSeries = series.map(function () { return true; });

      function chartX(index) {
        return labels.length > 1
          ? plotLeft + ((plotRight - plotLeft) * index) / (labels.length - 1)
          : (plotLeft + plotRight) / 2;
      }

      function chartY(value) {
        return plotTop + ((maxY - value) / yRange) * (plotBottom - plotTop);
      }

      function clientPoint(index) {
        var rect = svg.getBoundingClientRect();
        var viewBox = svg.viewBox.baseVal;
        var x = chartX(index);
        return {
          x: rect.left + ((x - viewBox.x) / viewBox.width) * rect.width,
          y: rect.top + ((plotTop - viewBox.y) / viewBox.height) * rect.height
        };
      }

      function accessibleText(index, rows) {
        return [labels[index]].concat(rows.map(function (row) {
          return row.name + " " + row.display;
        })).join("，");
      }

      function selectIndex(index, clientX, clientY) {
        index = clamp(index, 0, labels.length - 1);
        currentIndex = index;
        var x = chartX(index);
        crosshair.setAttribute("x1", x);
        crosshair.setAttribute("x2", x);
        var rows = [];
        series.forEach(function (entry, seriesIndex) {
          var raw = Array.isArray(entry.values) ? entry.values[index] : null;
          var numeric = Number(raw);
          var valid = raw != null && raw !== "" && Number.isFinite(numeric);
          var point = points[seriesIndex];
          point.setAttribute("cx", x);
          if (visibleSeries[seriesIndex] && valid) {
            point.setAttribute("cy", chartY(numeric));
            point.style.display = "";
          } else {
            point.style.display = "none";
          }
          if (!visibleSeries[seriesIndex]) return;
          rows.push({
            seriesIndex: seriesIndex,
            name: entry.name || "系列 " + (seriesIndex + 1),
            raw: valid ? raw : null,
            display: valid ? formatValue(raw, entry.format || component.format) : "—",
            color: entry.color || palette[seriesIndex % palette.length]
          });
        });
        focusLayer.dataset.open = "true";
        hitbox.setAttribute("aria-valuenow", index);
        hitbox.setAttribute("aria-valuetext", accessibleText(index, rows));
        var anchor = clientPoint(index);
        tooltipApi.showShared(
          labels[index],
          rows,
          clientX == null ? anchor.x + 12 : clientX + 12,
          clientY == null ? anchor.y + 12 : clientY + 12
        );
      }

      function visibleCount() {
        return visibleSeries.filter(Boolean).length;
      }

      function updateLegendState(message) {
        var count = visibleCount();
        toggles.forEach(function (toggle, seriesIndex) {
          var visible = visibleSeries[seriesIndex];
          var name = series[seriesIndex].name || "系列 " + (seriesIndex + 1);
          var lastVisible = visible && count === 1;
          toggle.setAttribute("aria-pressed", visible ? "true" : "false");
          toggle.setAttribute("aria-disabled", lastVisible ? "true" : "false");
          toggle.dataset.state = visible ? "visible" : "hidden";
          toggle.setAttribute(
            "aria-label",
            visible
              ? name + (lastVisible
                ? "，当前显示，至少保留一个系列"
                : "，当前显示，点击隐藏")
              : name + "，当前隐藏，点击显示"
          );
        });
        if (legendStatus) legendStatus.textContent = message || "";
        hitbox.setAttribute(
          "aria-label",
          (component.title || "趋势图") + "，当前显示 " + count +
          " 个系列，使用左右方向键查看各时间点数值"
        );
      }

      function setSeriesVisibility(seriesIndex, visible) {
        visibleSeries[seriesIndex] = visible;
        var mark = marks.find(function (candidate) {
          return Number(candidate.dataset.seriesIndex) === seriesIndex;
        });
        if (mark) {
          mark.dataset.visible = visible ? "true" : "false";
          mark.style.display = visible ? "" : "none";
        }
        var point = points[seriesIndex];
        if (point && !visible) point.style.display = "none";
      }

      function hide() {
        if (pinned) return;
        focusLayer.dataset.open = "false";
        tooltipApi.hide();
      }

      function indexFromPointer(event) {
        var rect = svg.getBoundingClientRect();
        var viewBox = svg.viewBox.baseVal;
        var svgX = viewBox.x + ((event.clientX - rect.left) / rect.width) * viewBox.width;
        var ratio = clamp((svgX - plotLeft) / (plotRight - plotLeft || 1), 0, 1);
        return Math.round(ratio * Math.max(0, labels.length - 1));
      }

      hitbox.addEventListener("pointerenter", function (event) {
        if (event.pointerType === "touch") return;
        selectIndex(indexFromPointer(event), event.clientX, event.clientY);
      });
      hitbox.addEventListener("pointermove", function (event) {
        if (event.pointerType === "touch" || pinned) return;
        selectIndex(indexFromPointer(event), event.clientX, event.clientY);
      });
      hitbox.addEventListener("pointerleave", hide);
      hitbox.addEventListener("pointerdown", function (event) {
        pinned = event.pointerType === "touch" || event.pointerType === "pen";
        selectIndex(indexFromPointer(event), event.clientX, event.clientY);
      });
      hitbox.addEventListener("focus", function () {
        selectIndex(currentIndex == null ? 0 : currentIndex);
      });
      hitbox.addEventListener("blur", function () {
        if (!pinned) hide();
      });
      hitbox.addEventListener("keydown", function (event) {
        var index = currentIndex == null ? 0 : currentIndex;
        if (event.key === "ArrowRight") index += 1;
        else if (event.key === "ArrowLeft") index -= 1;
        else if (event.key === "Home") index = 0;
        else if (event.key === "End") index = labels.length - 1;
        else if (event.key === "Escape") {
          pinned = false;
          hide();
          return;
        } else {
          return;
        }
        event.preventDefault();
        pinned = true;
        selectIndex(index);
      });
      toggles.forEach(function (toggle, seriesIndex) {
        toggle.addEventListener("click", function () {
          var name = series[seriesIndex].name || "系列 " + (seriesIndex + 1);
          if (visibleSeries[seriesIndex] && visibleCount() === 1) {
            updateLegendState("至少保留一个可见系列");
            return;
          }
          var nextVisible = !visibleSeries[seriesIndex];
          setSeriesVisibility(seriesIndex, nextVisible);
          updateLegendState(
            name + (nextVisible ? "已显示" : "已隐藏")
          );
          if (currentIndex != null && focusLayer.dataset.open === "true") {
            selectIndex(currentIndex);
          }
        });
      });
      updateLegendState("");
      document.addEventListener("pointerdown", function (event) {
        if (event.target === hitbox || section.contains(event.target)) return;
        if (event.target.closest("[data-tip]")) {
          pinned = false;
          focusLayer.dataset.open = "false";
          return;
        }
        pinned = false;
        hide();
      });
    });
  }

  function setupDivergingBarScrolling() {
    document.querySelectorAll(
      '.vda-bar-chart[data-bar-layout="diverging"]'
    ).forEach(function (chart) {
      var component = chart.closest("[data-component-id]");
      var controls = component
        ? Array.from(component.querySelectorAll("[data-bar-jump]"))
        : [];
      var requestedPosition = "zero";
      var programmaticPosition = null;

      function metrics() {
        var maxScroll = Math.max(0, chart.scrollWidth - chart.clientWidth);
        var zeroRatio = clamp(finite(chart.dataset.barZeroRatio, 0.5), 0, 1);
        return {
          maxScroll: maxScroll,
          zeroPixel: zeroRatio * chart.scrollWidth
        };
      }

      function targetFor(position) {
        var state = metrics();
        if (position === "negative") return 0;
        if (position === "positive") return state.maxScroll;
        return clamp(
          state.zeroPixel - chart.clientWidth / 2,
          0,
          state.maxScroll
        );
      }

      function setControlState(position) {
        controls.forEach(function (control) {
          var selected = control.dataset.barJump === position;
          control.dataset.current = selected ? "true" : "false";
          control.setAttribute("aria-pressed", selected ? "true" : "false");
        });
      }

      function updateCurrentPosition(preferredPosition) {
        var state = metrics();
        var positions = {
          negative: 0,
          zero: targetFor("zero"),
          positive: state.maxScroll
        };
        var current = preferredPosition || requestedPosition || "zero";
        if (Math.abs(chart.scrollLeft - positions[current]) > 2) {
          var nearest = Infinity;
          Object.keys(positions).forEach(function (position) {
            var distance = Math.abs(chart.scrollLeft - positions[position]);
            if (distance < nearest - 0.5) {
              nearest = distance;
              current = position;
            }
          });
        }
        requestedPosition = current;
        setControlState(current);
      }

      var target = targetFor("zero");
      chart.scrollLeft = target;
      var maxScroll = metrics().maxScroll;
      chart.dataset.scrollable = maxScroll > 1 ? "true" : "false";
      chart.dataset.initialScrollLeft = String(chart.scrollLeft);
      var frame = chart.closest("[data-bar-scroll-frame]");
      if (frame) frame.dataset.scrollable = chart.dataset.scrollable;
      if (component) component.dataset.barScrollable = chart.dataset.scrollable;
      controls.forEach(function (control) {
        control.addEventListener("click", function () {
          requestedPosition = control.dataset.barJump;
          programmaticPosition = requestedPosition;
          var requestedTarget = targetFor(requestedPosition);
          setControlState(requestedPosition);
          chart.scrollTo({
            left: requestedTarget,
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
              ? "auto"
              : "smooth"
          });
          window.setTimeout(function () {
            updateCurrentPosition(programmaticPosition);
            programmaticPosition = null;
          }, 500);
        });
      });
      chart.addEventListener("scroll", function () {
        if (programmaticPosition) {
          setControlState(programmaticPosition);
          return;
        }
        updateCurrentPosition();
      }, { passive: true });
      updateCurrentPosition();
    });
  }

  function setupDivergingBarLabels() {
    document.querySelectorAll(
      '.vda-bar-chart[data-bar-layout="diverging"]'
    ).forEach(function (chart) {
      var component = chart.closest("[data-component-id]");
      if (!component) return;
      var labels = Array.from(
        component.querySelectorAll(".vda-bar-category-label")
      );
      var hasCondensedLabel = false;
      labels.forEach(function (label) {
        var text = label.querySelector(".vda-bar-category-label-text");
        var full = label.dataset.barCategoryFull || "";
        var display = label.dataset.barCategoryDisplay || "";
        var visuallyTruncated = Boolean(text) && (
          text.scrollHeight > text.clientHeight + 1 ||
          text.scrollWidth > text.clientWidth + 1
        );
        var condensed = visuallyTruncated || full !== display;
        label.dataset.truncated = visuallyTruncated ? "true" : "false";
        label.dataset.condensed = condensed ? "true" : "false";
        hasCondensedLabel = hasCondensedLabel || condensed;
      });
      component.dataset.barLongLabels = hasCondensedLabel ? "true" : "false";
    });
  }

  function layoutHeatmapChart(chart) {
    var svg = chart.querySelector("[data-heatmap-svg]");
    if (!svg || chart.clientWidth <= 0) return;
    var columnCount = Math.max(1, finite(svg.dataset.columnCount, 1));
    var left = finite(svg.dataset.rowLabelWidth, 72);
    var minimumCellWidth = finite(svg.dataset.minCellWidth, 28);
    var preferredCellWidth = finite(svg.dataset.preferredCellWidth, 54);
    var availableForCells = Math.max(
      0,
      chart.clientWidth - left - 18
    );
    var fittedCellWidth = availableForCells / columnCount;
    var cellWidth = fittedCellWidth >= minimumCellWidth
      ? Math.min(preferredCellWidth, fittedCellWidth)
      : minimumCellWidth;
    var width = Math.ceil(left + columnCount * cellWidth + 18);
    var viewBox = String(svg.getAttribute("viewBox") || "").split(/\s+/);
    var height = finite(viewBox[3], 240);
    svg.setAttribute("viewBox", "0 0 " + width + " " + height);
    svg.style.width = width + "px";
    svg.style.minWidth = width + "px";

    svg.querySelectorAll("[data-heatmap-column-label]").forEach(function (label) {
      var localIndex = finite(label.dataset.localColumnIndex, 0);
      label.setAttribute("x", left + localIndex * cellWidth + cellWidth / 2);
    });
    svg.querySelectorAll("[data-heatmap-row-label]").forEach(function (label) {
      label.setAttribute("x", left - 10);
    });
    svg.querySelectorAll("[data-heatmap-cell]").forEach(function (cell) {
      var localIndex = finite(cell.dataset.localColumnIndex, 0);
      cell.setAttribute("x", left + localIndex * cellWidth + 2);
      cell.setAttribute("width", Math.max(1, cellWidth - 4));
    });
    svg.querySelectorAll("[data-heatmap-value-label]").forEach(function (label) {
      var localIndex = finite(label.dataset.localColumnIndex, 0);
      label.setAttribute("x", left + localIndex * cellWidth + cellWidth / 2);
    });

    var scrollable = chart.scrollWidth > chart.clientWidth + 1;
    chart.dataset.scrollable = scrollable ? "true" : "false";
    var group = chart.closest("[data-heatmap-group]");
    if (group) group.dataset.scrollable = chart.dataset.scrollable;
  }

  function setupHeatmapSizing() {
    var charts = Array.from(document.querySelectorAll(".vda-heatmap-chart"));
    charts.forEach(layoutHeatmapChart);
    document.querySelectorAll('[data-heatmap-layout="stacked-groups"]').forEach(function (stack) {
      var component = stack.closest("[data-component-id]");
      var scrollable = Array.from(
        stack.querySelectorAll(".vda-heatmap-chart")
      ).some(function (chart) {
        return chart.dataset.scrollable === "true";
      });
      if (component) {
        component.dataset.heatmapScrollable = scrollable ? "true" : "false";
      }
    });
    if (typeof ResizeObserver === "function") {
      charts.forEach(function (chart) {
        var observer = new ResizeObserver(function () {
          layoutHeatmapChart(chart);
          var stack = chart.closest('[data-heatmap-layout="stacked-groups"]');
          var component = chart.closest("[data-component-id]");
          if (stack && component) {
            component.dataset.heatmapScrollable = Array.from(
              stack.querySelectorAll(".vda-heatmap-chart")
            ).some(function (item) {
              return item.scrollWidth > item.clientWidth + 1;
            }) ? "true" : "false";
          }
        });
        observer.observe(chart);
      });
    }
  }

  function init() {
    try {
      var mode = spec.mode === "dashboard" ? "dashboard" : "report-component";
      root.dataset.mode = mode;
      root.innerHTML =
        '<div class="vda-shell">' +
        renderHeader() +
        '<div class="vda-grid">' +
        (Array.isArray(spec.components) ? spec.components.map(renderComponent).join("") : "") +
        "</div>" +
        renderFooter() +
        "</div>";
      var tooltipApi = setupTooltips();
      setupLineChartInteractions(tooltipApi);
      window.requestAnimationFrame(function () {
        setupHeatmapSizing();
        setupDivergingBarLabels();
        setupDivergingBarScrolling();
        document.documentElement.dataset.vdaReady = "true";
        window.dispatchEvent(new CustomEvent("vda:ready"));
      });
    } catch (error) {
      root.innerHTML = '<div class="vda-error"><strong>组件渲染失败</strong><br>' + esc(error.message) + "</div>";
      document.documentElement.dataset.vdaReady = "error";
      console.error(error);
    }
  }

  init();
})();
