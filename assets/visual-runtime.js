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
    var note = component.note
      ? '<p class="vda-note">' + esc(component.note) + "</p>"
      : "";
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
    var html = '<div class="vda-metrics" style="--columns:' + columns + '">';
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
      svg.appendChild(svgEl("path", {
        d: d,
        fill: "none",
        stroke: color,
        "stroke-width": entry.emphasis === "secondary" ? 2 : 3,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        opacity: entry.emphasis === "secondary" ? 0.55 : 1
      }));

      points.forEach(function (point) {
        var circle = svgEl("circle", {
          cx: point[0], cy: point[1], r: 7,
          fill: "transparent",
          stroke: "transparent",
          tabindex: "0",
          "data-tip": (entry.name ? entry.name + " · " : "") +
            esc(labels[point[3]] || "") + ": " + esc(formatValue(point[2], component.format))
        });
        circle.setAttribute("aria-label", circle.getAttribute("data-tip"));
        svg.appendChild(circle);
      });

      var last = points[points.length - 1];
      if (component.endLabels !== false) {
        svg.appendChild(svgEl("text", {
          x: last[0] - 2,
          y: last[1] - 10,
          "text-anchor": "end",
          class: "vda-value-label",
          fill: color
        }, formatValue(last[2], component.format)));
      }
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

    var container = document.createElement("div");
    container.className = "vda-chart";
    container.style.setProperty("--chart-height", height + "px");
    container.appendChild(svg);

    var legend = "";
    if (series.length > 1) {
      legend = '<div class="vda-legend">' + series.map(function (entry, index) {
        return '<span class="vda-legend-item"><span class="vda-legend-swatch" style="background:' +
          esc(entry.color || palette[index % palette.length]) + '"></span>' + esc(entry.name || "系列 " + (index + 1)) + "</span>";
      }).join("") + "</div>";
    }
    return componentFrame(component, container.outerHTML + legend);
  }

  function renderBarChart(component) {
    var categories = Array.isArray(component.categories) ? component.categories : [];
    var values = Array.isArray(component.values) ? component.values.map(Number) : [];
    var compact = compactChartLayout();
    var width = compact ? compactChartWidth() : 760;
    var rowHeight = clamp(finite(component.rowHeight, 38), 28, 54);
    var height = Math.max(180, categories.length * rowHeight + 32);
    var margin = compact
      ? { top: 6, right: 46, bottom: 18, left: 92 }
      : { top: 6, right: 86, bottom: 18, left: 138 };
    var innerW = width - margin.left - margin.right;
    var max = Math.max.apply(null, values.concat([0]));
    var min = Math.min.apply(null, values.concat([0]));
    var range = max - Math.min(0, min) || 1;
    var zeroX = margin.left + ((0 - Math.min(0, min)) / range) * innerW;
    var svg = svgEl("svg", {
      viewBox: "0 0 " + width + " " + height,
      role: "img",
      "aria-label": component.ariaLabel || component.title || "条形图"
    });

    svg.appendChild(svgEl("line", {
      x1: zeroX, x2: zeroX, y1: margin.top, y2: height - margin.bottom,
      class: "vda-zero-line"
    }));

    categories.forEach(function (category, index) {
      var value = Number.isFinite(values[index]) ? values[index] : 0;
      var y = margin.top + index * rowHeight + rowHeight * 0.18;
      var barH = rowHeight * 0.56;
      var valueX = margin.left + ((value - Math.min(0, min)) / range) * innerW;
      var x = Math.min(zeroX, valueX);
      var barW = Math.max(1, Math.abs(valueX - zeroX));
      var color = (component.colors && component.colors[index]) ||
        (component.highlightIndex === index ? "#315CF5" : index === 0 ? "#315CF5" : "#A8B0BF");

      svg.appendChild(svgEl("text", {
        x: margin.left - 12,
        y: y + barH / 2 + 4,
        "text-anchor": "end",
        class: "vda-axis-label"
      }, category));

      var bar = svgEl("rect", {
        x: x, y: y, width: barW, height: barH, rx: 3,
        fill: color,
        opacity: component.highlightIndex == null || component.highlightIndex === index ? 1 : 0.48,
        tabindex: "0",
        "data-tip": esc(category) + ": " + esc(formatValue(value, component.format))
      });
      bar.setAttribute("aria-label", bar.getAttribute("data-tip"));
      svg.appendChild(bar);
      svg.appendChild(svgEl("text", {
        x: value >= 0 ? valueX + 8 : valueX - 8,
        y: y + barH / 2 + 4,
        "text-anchor": value >= 0 ? "start" : "end",
        class: "vda-value-label"
      }, formatValue(value, component.format)));
    });

    var container = document.createElement("div");
    container.className = "vda-chart";
    container.style.setProperty("--chart-height", height + "px");
    container.appendChild(svg);
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
    var range = max - min || 1;
    var compact = compactChartLayout();
    var cellW = compact ? 68 : 86;
    var cellH = 40;
    var left = compact ? 76 : 112;
    var top = 42;
    var width = left + columns.length * cellW + 18;
    var height = top + rows.length * cellH + 20;
    var svg = svgEl("svg", {
      viewBox: "0 0 " + width + " " + height,
      role: "img",
      "aria-label": component.ariaLabel || component.title || "热力图"
    });

    columns.forEach(function (column, index) {
      svg.appendChild(svgEl("text", {
        x: left + index * cellW + cellW / 2,
        y: 25,
        "text-anchor": "middle",
        class: "vda-axis-label"
      }, column));
    });

    rows.forEach(function (row, rowIndex) {
      svg.appendChild(svgEl("text", {
        x: left - 10,
        y: top + rowIndex * cellH + cellH / 2 + 4,
        "text-anchor": "end",
        class: "vda-axis-label"
      }, row));
      columns.forEach(function (column, columnIndex) {
        var value = matrix[rowIndex] ? Number(matrix[rowIndex][columnIndex]) : NaN;
        var ratio = Number.isFinite(value) ? clamp((value - min) / range, 0, 1) : 0;
        var fill = Number.isFinite(value) ? mixColor("#EEF2FF", "#315CF5", ratio) : "#F1F3F6";
        var textColor = ratio > 0.58 ? "#FFFFFF" : "#263044";
        var rect = svgEl("rect", {
          x: left + columnIndex * cellW + 2,
          y: top + rowIndex * cellH + 2,
          width: cellW - 4,
          height: cellH - 4,
          rx: 5,
          fill: fill,
          tabindex: "0",
          "data-tip": esc(row) + " · " + esc(column) + ": " +
            esc(Number.isFinite(value) ? formatValue(value, component.format) : "无数据")
        });
        rect.setAttribute("aria-label", rect.getAttribute("data-tip"));
        svg.appendChild(rect);
        if (component.showValues !== false && Number.isFinite(value)) {
          svg.appendChild(svgEl("text", {
            x: left + columnIndex * cellW + cellW / 2,
            y: top + rowIndex * cellH + cellH / 2 + 4,
            "text-anchor": "middle",
            fill: textColor,
            "font-size": "11",
            "font-weight": "650"
          }, formatValue(value, component.format)));
        }
      });
    });

    var container = document.createElement("div");
    container.className = "vda-chart";
    container.style.overflowX = "auto";
    container.appendChild(svg);
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
    if (meta.period) metaItems.push("<span><strong>周期</strong><br>" + esc(meta.period) + "</span>");
    if (meta.scope) metaItems.push("<span><strong>范围</strong><br>" + esc(meta.scope) + "</span>");
    if (meta.source) metaItems.push("<span><strong>来源</strong><br>" + esc(meta.source) + "</span>");
    return (
      '<header class="vda-header">' +
      "<div>" +
      (spec.eyebrow ? '<p class="vda-eyebrow">' + esc(spec.eyebrow) + "</p>" : "") +
      '<h1 class="vda-title">' + esc(spec.title || "数据分析") + "</h1>" +
      (spec.subtitle ? '<p class="vda-subtitle">' + esc(spec.subtitle) + "</p>" : "") +
      "</div>" +
      (metaItems.length ? '<div class="vda-meta">' + metaItems.join("") + "</div>" : "") +
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

    function show(target, event) {
      var text = target.getAttribute("data-tip");
      if (!text) return;
      tooltip.textContent = text.replace(/&amp;/g, "&");
      tooltip.dataset.open = "true";
      var x = event && event.clientX ? event.clientX + 12 : target.getBoundingClientRect().left + 12;
      var y = event && event.clientY ? event.clientY + 12 : target.getBoundingClientRect().top + 12;
      var rect = tooltip.getBoundingClientRect();
      tooltip.style.left = Math.min(x, window.innerWidth - rect.width - 12) + "px";
      tooltip.style.top = Math.min(y, window.innerHeight - rect.height - 12) + "px";
    }

    function hide() {
      tooltip.dataset.open = "false";
    }

    document.addEventListener("pointerover", function (event) {
      var target = event.target.closest("[data-tip]");
      if (target) show(target, event);
    });
    document.addEventListener("pointermove", function (event) {
      var target = event.target.closest("[data-tip]");
      if (target && tooltip.dataset.open === "true") show(target, event);
    });
    document.addEventListener("pointerout", function (event) {
      if (event.target.closest("[data-tip]")) hide();
    });
    document.addEventListener("focusin", function (event) {
      var target = event.target.closest("[data-tip]");
      if (target) show(target);
    });
    document.addEventListener("focusout", hide);
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
      setupTooltips();
      document.documentElement.dataset.vdaReady = "true";
      window.dispatchEvent(new CustomEvent("vda:ready"));
    } catch (error) {
      root.innerHTML = '<div class="vda-error"><strong>组件渲染失败</strong><br>' + esc(error.message) + "</div>";
      document.documentElement.dataset.vdaReady = "error";
      console.error(error);
    }
  }

  init();
})();
