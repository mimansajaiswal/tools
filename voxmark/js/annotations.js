function normalizeText(text) {
  return (text || "")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function tokenize(text) {
  return normalizeText(text).split(" ").filter(Boolean);
}

const FIGURE_CAPTION_PATTERNS = [
  /^(figure|fig\.?)\s*\d+/i,
  /^(table|tbl\.?)\s*\d+/i,
  /^(chart|graph|diagram)\s*\d+/i,
  /^(exhibit|plate)\s*\d+/i
];

function extractFigureReference(text) {
  if (!text) return null;
  const patterns = [
    /(figure|fig\.?)\s*(\d+[a-z]?)/i,
    /(table|tbl\.?)\s*(\d+[a-z]?)/i,
    /(chart|graph|diagram)\s*(\d+[a-z]?)/i
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return { type: match[1].toLowerCase().replace(".", ""), number: match[2] };
    }
  }
  return null;
}

function isCaptionSpan(text) {
  const trimmed = (text || "").trim();
  return FIGURE_CAPTION_PATTERNS.some((p) => p.test(trimmed));
}

function findFigureOrTableRegion(pageData, hint) {
  if (!pageData) return null;

  let spans = [];
  if (pageData.textLayer) {
    spans = Array.from(pageData.textLayer.querySelectorAll("span")).map((span) => {
      const rect = span.getBoundingClientRect();
      const pageRect = pageData.pageDiv.getBoundingClientRect();
      const relX = rect.left - pageRect.left;
      const relY = rect.top - pageRect.top;
      const [sx, sy] = pageData.viewport.convertToPdfPoint(relX, relY);
      const [sx2, sy2] = pageData.viewport.convertToPdfPoint(
        relX + rect.width,
        relY + rect.height
      );
      return {
        text: span.textContent || "",
        bbox: {
          x: Math.min(sx, sx2),
          y: Math.min(sy, sy2),
          width: Math.abs(sx2 - sx),
          height: Math.abs(sy2 - sy)
        }
      };
    });
  } else if (pageData.ocrSpans?.length) {
    spans = pageData.ocrSpans.map((s) => ({ text: s.text || "", bbox: s.bbox }));
  }

  if (!spans.length) return null;

  const captions = spans.filter((s) => isCaptionSpan(s.text));
  if (!captions.length) return null;

  let targetCaption = null;
  if (hint) {
    const ref = extractFigureReference(hint);
    if (ref) {
      const pattern = new RegExp(
        `^(${ref.type}|fig\\.?|tbl\\.?)\\s*${ref.number}`,
        "i"
      );
      targetCaption = captions.find((c) => pattern.test(c.text.trim()));
    }
    if (!targetCaption) {
      const hintLower = hint.toLowerCase();
      targetCaption = captions.find((c) => c.text.toLowerCase().includes(hintLower));
    }
  }
  if (!targetCaption && captions.length) {
    targetCaption = captions[0];
  }
  if (!targetCaption) return null;

  const captionY = targetCaption.bbox.y;
  const pageBox = pageData.viewport?.viewBox || [0, 0, 612, 792];
  const pageWidth = pageBox[2] - pageBox[0];
  const pageHeight = pageBox[3] - pageBox[1];

  const aboveSpans = spans.filter(
    (s) => s.bbox.y > captionY && s !== targetCaption
  );
  const belowSpans = spans.filter(
    (s) => s.bbox.y + s.bbox.height < captionY && s !== targetCaption
  );

  let figureTop = captionY + targetCaption.bbox.height;
  let figureBottom = captionY;
  const gapThreshold = pageHeight * 0.04;

  if (aboveSpans.length) {
    const sortedAbove = aboveSpans.sort((a, b) => a.bbox.y - b.bbox.y);
    for (const s of sortedAbove) {
      const gap = s.bbox.y - figureTop;
      if (gap > gapThreshold) break;
      figureTop = Math.max(figureTop, s.bbox.y + s.bbox.height);
    }
  } else {
    figureTop = Math.min(pageHeight, captionY + pageHeight * 0.35);
  }

  if (belowSpans.length) {
    const sortedBelow = belowSpans.sort((a, b) => b.bbox.y - a.bbox.y);
    let lastTextBottom = sortedBelow[0].bbox.y + sortedBelow[0].bbox.height;
    for (let i = 1; i < sortedBelow.length; i++) {
      const s = sortedBelow[i];
      const gap = lastTextBottom - (s.bbox.y + s.bbox.height);
      if (gap > gapThreshold) {
        figureBottom = s.bbox.y + s.bbox.height + gapThreshold * 0.5;
        break;
      }
      lastTextBottom = s.bbox.y + s.bbox.height;
    }
  }

  const captionX = targetCaption.bbox.x;
  const captionRight = captionX + targetCaption.bbox.width;
  const margin = pageWidth * 0.05;
  const x = Math.max(0, captionX - margin);
  const width = Math.min(pageWidth, captionRight - captionX + margin * 2);

  return {
    x,
    y: figureBottom,
    width,
    height: figureTop - figureBottom
  };
}

function expandBboxToFigureRegion(bbox, pageData, hint) {
  const figureRegion = findFigureOrTableRegion(pageData, hint);
  if (!figureRegion) return bbox;

  const bboxCenter = { x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height / 2 };
  const figCenter = {
    x: figureRegion.x + figureRegion.width / 2,
    y: figureRegion.y + figureRegion.height / 2
  };
  const dist = Math.hypot(bboxCenter.x - figCenter.x, bboxCenter.y - figCenter.y);

  const pageBox = pageData.viewport?.viewBox || [0, 0, 612, 792];
  const pageHeight = pageBox[3] - pageBox[1];
  if (dist < pageHeight * 0.3) {
    return figureRegion;
  }
  return bbox;
}

async function resolveTarget(annotation, pdfState, session) {
  const pageData = pdfState.pages.find((p) => p.pageNum - 1 === annotation.pageIndex);
  if (!pageData) return null;
  const target = annotation.target || {};

  const figureHint = extractFigureReference(annotation.comment) ||
    extractFigureReference(target.text?.exact) ||
    extractFigureReference(target.text?.quote);
  const hintText = figureHint ? `${figureHint.type} ${figureHint.number}` : null;

  if (target.mode === "tapFocus" && session?.taps?.length) {
    const tap = session.taps[target.tapFocusIndex] || session.taps[session.taps.length - 1];
    if (tap && tap.pageIndex === annotation.pageIndex) {
      return { bbox: { x: tap.pdfX, y: tap.pdfY, width: 60, height: 20 } };
    }
  }

  if (target.mode === "figure" || target.mode === "table") {
    if (!pageData.textLayer) {
      await renderPage(pdfState, pageData);
    }
    const figureRegion = findFigureOrTableRegion(pageData, hintText || target.text?.exact);
    if (figureRegion) {
      return { bbox: figureRegion };
    }
  }

  if (target.mode === "bbox" && target.bbox) {
    let bbox = target.bbox;
    if (hintText || target.confidence === "low") {
      if (!pageData.textLayer) {
        await renderPage(pdfState, pageData);
      }
      bbox = expandBboxToFigureRegion(bbox, pageData, hintText);
    }
    return { bbox };
  }

  const query = target.text?.exact || target.text?.quote;
  const startHint = target.text?.startHint;
  const endHint = target.text?.endHint;
  if (query || startHint || endHint) {
    if (!pageData.textLayer) {
      await renderPage(pdfState, pageData);
    }
    let spans = [];
    if (pageData.textLayer) {
      spans = Array.from(pageData.textLayer.querySelectorAll("span"))
        .map((span) => {
          const rect = span.getBoundingClientRect();
          const pageRect = pageData.pageDiv.getBoundingClientRect();
          const relX = rect.left - pageRect.left;
          const relY = rect.top - pageRect.top;
          const [sx, sy] = pageData.viewport.convertToPdfPoint(relX, relY);
          const [sx2, sy2] = pageData.viewport.convertToPdfPoint(
            relX + rect.width,
            relY + rect.height
          );
          return {
            text: span.textContent || "",
            bbox: {
              x: Math.min(sx, sx2),
              y: Math.min(sy, sy2),
              width: Math.abs(sx2 - sx),
              height: Math.abs(sy2 - sy)
            }
          };
        })
        .filter(Boolean);
    } else if (pageData.ocrSpans?.length) {
      spans = pageData.ocrSpans.map((span) => ({
        text: span.text || "",
        bbox: span.bbox
      }));
    }
    const tokens = buildTokenMap(spans);
    let match = null;
    if (startHint || endHint) {
      match = findMatchFromHints(tokens, startHint, endHint);
    }
    if (!match && query) {
      match = findTextMatch(tokens, query);
    }
    if (match) return { bbox: match };
  }

  if (target.mode === "auto" && (hintText || target.confidence === "low")) {
    if (!pageData.textLayer) {
      await renderPage(pdfState, pageData);
    }
    const figureRegion = findFigureOrTableRegion(pageData, hintText);
    if (figureRegion) {
      return { bbox: figureRegion };
    }
  }

  const snapshotIndex =
    annotation?.contextRef?.previousSection && session.snapshots.length > 1
      ? session.snapshots.length - 2
      : session.snapshots.length - 1;
  const latestSnapshot = session.snapshots[snapshotIndex];
  const pageSnapshot = latestSnapshot?.pages?.find((p) => p.pageIndex === annotation.pageIndex);
  if (pageSnapshot) return { bbox: pageSnapshot.viewportBox };
  return null;
}

function buildTokenMap(spans) {
  const tokens = [];
  const ordered = orderSpansForColumns(spans);
  ordered.forEach((span) => {
    const words = tokenize(span.text);
    if (!words.length) return;
    const widthPerWord = span.bbox.width / words.length;
    words.forEach((word, index) => {
      tokens.push({
        text: word,
        bbox: {
          x: span.bbox.x + widthPerWord * index,
          y: span.bbox.y,
          width: widthPerWord,
          height: span.bbox.height
        }
      });
    });
  });
  return tokens;
}

function orderSpansForColumns(spans) {
  if (!spans.length) return spans;

  const xs = spans.map((s) => s.bbox.x);
  const x2s = spans.map((s) => s.bbox.x + s.bbox.width);
  const minX = Math.min(...xs);
  const maxX = Math.max(...x2s);
  const pageWidth = Math.max(1, maxX - minX);

  const avgCharWidth = spans.reduce((sum, s) => {
    const charCount = Math.max(1, (s.text || "").length);
    return sum + s.bbox.width / charCount;
  }, 0) / spans.length;
  const gapThreshold = Math.max(avgCharWidth * 4, pageWidth * 0.08);

  const centers = spans.map((s) => s.bbox.x + s.bbox.width / 2);
  const sortedCenters = [...centers].sort((a, b) => a - b);

  const gaps = [];
  for (let i = 1; i < sortedCenters.length; i++) {
    const gap = sortedCenters[i] - sortedCenters[i - 1];
    if (gap > gapThreshold) {
      gaps.push({
        gap,
        splitAt: (sortedCenters[i] + sortedCenters[i - 1]) / 2
      });
    }
  }

  gaps.sort((a, b) => b.gap - a.gap);
  const maxColumns = 4;
  const significantGaps = gaps
    .slice(0, maxColumns - 1)
    .filter((g) => g.gap > pageWidth * 0.06)
    .sort((a, b) => a.splitAt - b.splitAt);

  const avgHeight = spans.reduce((sum, s) => sum + s.bbox.height, 0) / spans.length;
  const lineTolerance = avgHeight * 0.5;

  function groupByLines(columnSpans) {
    if (!columnSpans.length) return [];
    const sorted = [...columnSpans].sort((a, b) => b.bbox.y - a.bbox.y);
    const lines = [];
    let currentLine = [sorted[0]];
    let currentY = sorted[0].bbox.y;

    for (let i = 1; i < sorted.length; i++) {
      const span = sorted[i];
      if (Math.abs(span.bbox.y - currentY) <= lineTolerance) {
        currentLine.push(span);
      } else {
        currentLine.sort((a, b) => a.bbox.x - b.bbox.x);
        lines.push(...currentLine);
        currentLine = [span];
        currentY = span.bbox.y;
      }
    }
    currentLine.sort((a, b) => a.bbox.x - b.bbox.x);
    lines.push(...currentLine);
    return lines;
  }

  if (!significantGaps.length) {
    return groupByLines(spans);
  }

  const splitPoints = significantGaps.map((g) => g.splitAt);
  const columns = Array.from({ length: splitPoints.length + 1 }, () => []);

  spans.forEach((span) => {
    const center = span.bbox.x + span.bbox.width / 2;
    let colIndex = 0;
    for (let i = 0; i < splitPoints.length; i++) {
      if (center > splitPoints[i]) colIndex = i + 1;
    }
    columns[colIndex].push(span);
  });

  const fullWidthThreshold = pageWidth * 0.7;
  const result = [];
  const fullWidthSpans = [];

  columns.forEach((col) => {
    col.forEach((span) => {
      if (span.bbox.width > fullWidthThreshold) {
        fullWidthSpans.push(span);
      }
    });
  });

  columns.forEach((col, idx) => {
    columns[idx] = col.filter((s) => s.bbox.width <= fullWidthThreshold);
  });

  const sortedFullWidth = groupByLines(fullWidthSpans);
  const columnResults = columns.map((col) => groupByLines(col));

  let colPointers = columnResults.map(() => 0);
  let fullPointer = 0;

  while (colPointers.some((p, i) => p < columnResults[i].length) || fullPointer < sortedFullWidth.length) {
    if (fullPointer < sortedFullWidth.length) {
      const fwSpan = sortedFullWidth[fullPointer];
      const fwY = fwSpan.bbox.y;

      let allColumnsBelow = true;
      for (let c = 0; c < columnResults.length; c++) {
        if (colPointers[c] < columnResults[c].length) {
          const colSpan = columnResults[c][colPointers[c]];
          if (colSpan.bbox.y >= fwY - lineTolerance) {
            allColumnsBelow = false;
            break;
          }
        }
      }

      if (allColumnsBelow) {
        result.push(fwSpan);
        fullPointer++;
        continue;
      }
    }

    for (let c = 0; c < columnResults.length; c++) {
      while (colPointers[c] < columnResults[c].length) {
        const span = columnResults[c][colPointers[c]];
        if (fullPointer < sortedFullWidth.length) {
          const fwY = sortedFullWidth[fullPointer].bbox.y;
          if (span.bbox.y < fwY - lineTolerance) break;
        }
        result.push(span);
        colPointers[c]++;
      }
    }

    if (fullPointer < sortedFullWidth.length) {
      result.push(sortedFullWidth[fullPointer]);
      fullPointer++;
    }
  }

  return result;
}

function fuzzyTokenMatch(token1, token2, threshold = 0.8) {
  if (token1 === token2) return true;
  if (Math.abs(token1.length - token2.length) > 2) return false;

  const longer = token1.length >= token2.length ? token1 : token2;
  const shorter = token1.length < token2.length ? token1 : token2;

  if (longer.includes(shorter) && shorter.length >= 3) return true;

  let matches = 0;
  const len = Math.min(token1.length, token2.length);
  for (let i = 0; i < len; i++) {
    if (token1[i] === token2[i]) matches++;
  }
  return matches / Math.max(token1.length, token2.length) >= threshold;
}

function findTokenSequenceFuzzy(tokens, sequence, start = 0, fuzzyThreshold = 0.8) {
  for (let i = start; i <= tokens.length - sequence.length; i++) {
    let matched = true;
    let fuzzyCount = 0;
    for (let j = 0; j < sequence.length; j++) {
      if (tokens[i + j].text === sequence[j]) continue;
      if (fuzzyTokenMatch(tokens[i + j].text, sequence[j], fuzzyThreshold)) {
        fuzzyCount++;
        if (fuzzyCount > Math.ceil(sequence.length * 0.2)) {
          matched = false;
          break;
        }
      } else {
        matched = false;
        break;
      }
    }
    if (matched) return i;
  }
  return -1;
}

function findMatchFromHints(tokens, startHint, endHint) {
  const startTokens = tokenize(startHint);
  const endTokens = tokenize(endHint);
  if (!startTokens.length && !endTokens.length) return null;
  let startIndex = 0;
  if (startTokens.length) {
    startIndex = findTokenSequence(tokens, startTokens);
    if (startIndex < 0) {
      startIndex = findTokenSequenceFuzzy(tokens, startTokens);
    }
    if (startIndex < 0) return null;
  }
  let endIndex = tokens.length - 1;
  if (endTokens.length) {
    endIndex = findTokenSequence(tokens, endTokens, startIndex);
    if (endIndex < 0) {
      endIndex = findTokenSequenceFuzzy(tokens, endTokens, startIndex);
    }
    if (endIndex < 0) return null;
    endIndex += endTokens.length - 1;
  }
  const boxes = tokens.slice(startIndex, endIndex + 1).map((t) => t.bbox);
  return combineBoxes(boxes);
}

function findTextMatch(tokens, query) {
  const queryTokens = tokenize(query);
  if (!queryTokens.length) return null;
  let startIndex = findTokenSequence(tokens, queryTokens);
  if (startIndex < 0) {
    startIndex = findTokenSequenceFuzzy(tokens, queryTokens);
  }
  if (startIndex < 0) return null;
  const boxes = tokens
    .slice(startIndex, startIndex + queryTokens.length)
    .map((t) => t.bbox);
  return combineBoxes(boxes);
}

function findTokenSequence(tokens, sequence, start = 0) {
  for (let i = start; i <= tokens.length - sequence.length; i++) {
    let matched = true;
    for (let j = 0; j < sequence.length; j++) {
      if (tokens[i + j].text !== sequence[j]) {
        matched = false;
        break;
      }
    }
    if (matched) return i;
  }
  return -1;
}

function combineBoxes(boxes) {
  if (!boxes.length) return null;
  const xs = boxes.map((b) => b.x);
  const ys = boxes.map((b) => b.y);
  const x2s = boxes.map((b) => b.x + b.width);
  const y2s = boxes.map((b) => b.y + b.height);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  const width = Math.max(...x2s) - x;
  const height = Math.max(...y2s) - y;
  return { x, y, width, height };
}

function drawAnnotation(page, annotation, target, options = {}) {
  const colorMap = {
    yellow: "#f9de6f",
    blue: "#6f9fe6",
    red: "#e56b6b",
    green: "#6dbb8a",
    purple: "#b1a0d4",
    pink: "#d9a0b5"
  };
  const normalized = normalizeAnnotationColor(annotation.color);
  const palette = getAllowedColors();
  const paletteEntry = palette.find((entry) => entry.key === normalized);
  const hex = paletteEntry?.color || colorMap[normalized] || colorMap.yellow;
  let color = hexToRgb(hex);
  if (!color) color = PDFLib.rgb(0.98, 0.9, 0.55);
  if (options.invertForView) {
    color = adjustColorForInvert(color);
  }
  const { x, y, width, height } = target.bbox;

  if (annotation.type === "highlight") {
    page.drawRectangle({ x, y, width, height, color, opacity: 0.35 });
  } else if (annotation.type === "underline") {
    page.drawLine({
      start: { x, y: y + 2 },
      end: { x: x + width, y: y + 2 },
      thickness: 2,
      color
    });
  } else if (annotation.type === "strikethrough") {
    page.drawLine({
      start: { x, y: y + height / 2 },
      end: { x: x + width, y: y + height / 2 },
      thickness: 2,
      color
    });
  } else if (annotation.type === "note") {
    page.drawRectangle({ x, y, width: width + 60, height: height + 30, color, opacity: 0.2 });
    page.drawText(annotation.comment || "Note", {
      x: x + 4,
      y: y + height + 8,
      size: 9,
      color: PDFLib.rgb(0.2, 0.2, 0.2)
    });
  } else if (annotation.type === "bbox") {
    page.drawRectangle({ x, y, width, height, borderColor: color, borderWidth: 2 });
  }
}

function hexToRgb(hex) {
  if (!hex) return null;
  const value = hex.replace("#", "").trim();
  if (![3, 6].includes(value.length)) return null;
  const expanded =
    value.length === 3
      ? value
        .split("")
        .map((ch) => ch + ch)
        .join("")
      : value;
  const int = parseInt(expanded, 16);
  if (Number.isNaN(int)) return null;
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return PDFLib.rgb(r / 255, g / 255, b / 255);
}

function normalizeAnnotationColor(value) {
  const palette = getAllowedColors();
  const color = (value || "").toString().trim().toLowerCase();
  const paletteKeys = palette.map((entry) => entry.key);
  if (paletteKeys.includes(color)) return color;
  const fuzzyMatch = paletteKeys.find((key) =>
    key.includes(color) || color.includes(key) ||
    levenshteinDistance(key, color) <= 2
  );
  if (fuzzyMatch) return fuzzyMatch;
  const defaults = ["yellow", "blue", "red", "green", "purple", "pink"];
  if (defaults.includes(color)) return color;
  const defaultFuzzy = defaults.find((d) =>
    d.includes(color) || color.includes(d) ||
    levenshteinDistance(d, color) <= 2
  );
  if (defaultFuzzy) return defaultFuzzy;
  return palette[0]?.key || "yellow";
}

function levenshteinDistance(a, b) {
  if (!a || !b) return Math.max((a || "").length, (b || "").length);
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[b.length][a.length];
}

function getAllowedColors() {
  const palette = Array.isArray(state.settings.colorPalette)
    ? state.settings.colorPalette
    : [];
  return palette
    .map((entry) => ({
      key: String(entry.name || "").trim().toLowerCase(),
      color: String(entry.color || "").trim()
    }))
    .filter((entry) => entry.key);
}

function adjustColorForInvert(color) {
  if (!color) return color;
  const inverted = {
    r: 1 - color.r,
    g: 1 - color.g,
    b: 1 - color.b
  };
  const rotated = hueRotate(inverted, 180);
  return PDFLib.rgb(
    clamp01(rotated.r),
    clamp01(rotated.g),
    clamp01(rotated.b)
  );
}

function hueRotate(color, degrees) {
  const angle = (degrees * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const r = color.r;
  const g = color.g;
  const b = color.b;
  return {
    r:
      (0.213 + 0.787 * cos - 0.213 * sin) * r +
      (0.715 - 0.715 * cos - 0.715 * sin) * g +
      (0.072 - 0.072 * cos + 0.928 * sin) * b,
    g:
      (0.213 - 0.213 * cos + 0.143 * sin) * r +
      (0.715 + 0.285 * cos + 0.14 * sin) * g +
      (0.072 - 0.072 * cos - 0.283 * sin) * b,
    b:
      (0.213 - 0.213 * cos - 0.787 * sin) * r +
      (0.715 - 0.715 * cos + 0.715 * sin) * g +
      (0.072 + 0.928 * cos + 0.072 * sin) * b
  };
}

function clamp01(value) {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function renderOverlays(pdfState) {
  if (!pdfState) return;
  pdfState.pages.forEach((page) => {
    page.pageDiv.querySelectorAll(".annotation-overlay").forEach((el) => el.remove());
  });
  if (!state.adjustMode) return;
  pdfState.annotations.forEach((annotation) => {
    const pageData = pdfState.pages.find((p) => p.pageNum - 1 === annotation.pageIndex);
    if (!pageData) return;
    const rect = pdfToViewportRect(pageData, annotation.bbox);
    const overlay = document.createElement("div");
    overlay.className = "annotation-overlay";
    overlay.dataset.id = annotation.id;
    overlay.style.left = `${rect.x}px`;
    overlay.style.top = `${rect.y}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
    overlay.style.borderColor =
      annotation.color === "purple" ? "rgba(123,109,141,0.7)" : "rgba(192,143,162,0.7)";
    overlay.addEventListener("pointerdown", (event) => beginDrag(event, annotation, pageData));

    const handle = document.createElement("div");
    handle.className = "annotation-handle";
    handle.addEventListener("pointerdown", (event) => beginResize(event, annotation, pageData));
    overlay.appendChild(handle);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "annotation-delete";
    deleteBtn.innerHTML = '<i class="ph ph-trash"></i>';
    deleteBtn.title = "Delete annotation";
    deleteBtn.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
      event.preventDefault();
    });
    deleteBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      deleteAnnotation(pdfState, annotation.id);
    });
    overlay.appendChild(deleteBtn);

    if (annotation.id === state.selectedAnnotationId) {
      overlay.classList.add("selected");
    }

    pageData.pageDiv.appendChild(overlay);
  });
}

const annotationHistory = [];
const MAX_HISTORY = 50;

function pushAnnotationHistory(pdfState) {
  if (!pdfState) return;
  const snapshot = {
    pdfId: pdfState.id,
    annotations: JSON.parse(JSON.stringify(pdfState.annotations)),
    timestamp: Date.now()
  };
  annotationHistory.push(snapshot);
  if (annotationHistory.length > MAX_HISTORY) {
    annotationHistory.shift();
  }
}

async function undoAnnotation() {
  const pdfState = getActivePdf();
  if (!pdfState) {
    notify("Undo", "No active PDF.");
    return;
  }
  const lastForPdf = [...annotationHistory]
    .reverse()
    .find((s) => s.pdfId === pdfState.id);
  if (!lastForPdf) {
    if (!pdfState.annotations.length) {
      notify("Undo", "Nothing to undo.");
      return;
    }
    const removed = pdfState.annotations.pop();
    await applyAllAnnotations(pdfState, { invertForView: isPdfInvertedView() });
    logEvent({
      title: "Annotation undone",
      detail: { pdfId: pdfState.id, mode: "fallback", removed: removed?.id },
      sessionId: state.activeSessionId
    });
    notify("Undo", "Last annotation removed.");
    return;
  }
  const index = annotationHistory.indexOf(lastForPdf);
  annotationHistory.splice(index, 1);
  pdfState.annotations = lastForPdf.annotations;
  await applyAllAnnotations(pdfState, { invertForView: isPdfInvertedView() });
  logEvent({
    title: "Annotation undone",
    detail: { pdfId: pdfState.id, mode: "history" },
    sessionId: state.activeSessionId
  });
  notify("Undo", "Annotation change undone.");
}

function deleteAnnotation(pdfState, annotationId) {
  if (!pdfState) return;
  pushAnnotationHistory(pdfState);
  const index = pdfState.annotations.findIndex((a) => a.id === annotationId);
  if (index === -1) return;
  pdfState.annotations.splice(index, 1);
  if (state.selectedAnnotationId === annotationId) {
    state.selectedAnnotationId = null;
  }
  applyAllAnnotations(pdfState, { invertForView: isPdfInvertedView() });
  notify("Adjust Mode", "Annotation deleted.");
}

function pdfToViewportRect(pageData, bbox) {
  const [vx, vy] = pageData.viewport.convertToViewportPoint(bbox.x, bbox.y + bbox.height);
  const [vx2, vy2] = pageData.viewport.convertToViewportPoint(
    bbox.x + bbox.width,
    bbox.y
  );
  return {
    x: Math.min(vx, vx2),
    y: Math.min(vy, vy2),
    width: Math.abs(vx2 - vx),
    height: Math.abs(vy2 - vy)
  };
}

function viewportToPdfRect(pageData, rect) {
  const [pdfX1, pdfY1] = pageData.viewport.convertToPdfPoint(rect.x, rect.y + rect.height);
  const [pdfX2, pdfY2] = pageData.viewport.convertToPdfPoint(
    rect.x + rect.width,
    rect.y
  );
  return {
    x: Math.min(pdfX1, pdfX2),
    y: Math.min(pdfY1, pdfY2),
    width: Math.abs(pdfX2 - pdfX1),
    height: Math.abs(pdfY2 - pdfY1)
  };
}

let dragState = null;

function beginDrag(event, annotation, pageData) {
  if (!state.adjustMode) return;
  event.preventDefault();
  selectAnnotation(annotation.id);
  const rect = pdfToViewportRect(pageData, annotation.bbox);
  dragState = {
    type: "move",
    annotation,
    pageData,
    startX: event.clientX,
    startY: event.clientY,
    startRect: rect
  };
  event.target.setPointerCapture(event.pointerId);
}

function beginResize(event, annotation, pageData) {
  if (!state.adjustMode) return;
  event.preventDefault();
  event.stopPropagation();
  selectAnnotation(annotation.id);
  const rect = pdfToViewportRect(pageData, annotation.bbox);
  dragState = {
    type: "resize",
    annotation,
    pageData,
    startX: event.clientX,
    startY: event.clientY,
    startRect: rect
  };
  event.target.setPointerCapture(event.pointerId);
}

function handlePointerMove(event) {
  if (!dragState) return;
  const { type, startX, startY, startRect, annotation, pageData } = dragState;
  const dx = event.clientX - startX;
  const dy = event.clientY - startY;
  let rect = { ...startRect };
  if (type === "move") {
    rect.x += dx;
    rect.y += dy;
  } else if (type === "resize") {
    rect.width = Math.max(12, startRect.width + dx);
    rect.height = Math.max(12, startRect.height + dy);
  }
  annotation.bbox = viewportToPdfRect(pageData, rect);
  renderOverlays(getActivePdf());
}

function handlePointerUp() {
  dragState = null;
}

function selectAnnotation(id) {
  state.selectedAnnotationId = id;
  updateAdjustToolbarState();
  renderOverlays(getActivePdf());
}

function updateAdjustToolbarState() {
  const hasSelection = Boolean(state.selectedAnnotationId);
  elements.snapToText.disabled = !hasSelection;
  elements.freeBox.disabled = !hasSelection;
}

function snapSelectedToText() {
  const pdfState = getActivePdf();
  const annotation = pdfState?.annotations.find((a) => a.id === state.selectedAnnotationId);
  if (!annotation || !pdfState) {
    notify("Adjust Mode", "Select an annotation to snap.");
    return;
  }
  const pageData = pdfState.pages.find((p) => p.pageNum - 1 === annotation.pageIndex);
  if (!pageData) return;
  if (!pageData.textLayer) {
    notify("Adjust Mode", "No text layer available on this page.");
    return;
  }
  const spans = Array.from(pageData.textLayer.querySelectorAll("span"));
  if (!spans.length) {
    notify("Adjust Mode", "No text found on this page.");
    return;
  }
  const center = {
    x: annotation.bbox.x + annotation.bbox.width / 2,
    y: annotation.bbox.y + annotation.bbox.height / 2
  };
  let best = null;
  let bestDist = Infinity;
  spans.forEach((span) => {
    const rect = span.getBoundingClientRect();
    const pageRect = pageData.pageDiv.getBoundingClientRect();
    const relX = rect.left - pageRect.left;
    const relY = rect.top - pageRect.top;
    const [sx, sy] = pageData.viewport.convertToPdfPoint(relX, relY);
    const [sx2, sy2] = pageData.viewport.convertToPdfPoint(
      relX + rect.width,
      relY + rect.height
    );
    const bbox = {
      x: Math.min(sx, sx2),
      y: Math.min(sy, sy2),
      width: Math.abs(sx2 - sx),
      height: Math.abs(sy2 - sy)
    };
    const cx = bbox.x + bbox.width / 2;
    const cy = bbox.y + bbox.height / 2;
    const dist = Math.hypot(cx - center.x, cy - center.y);
    if (dist < bestDist) {
      best = bbox;
      bestDist = dist;
    }
  });
  if (best) {
    annotation.bbox = best;
    annotation.mode = "text";
    renderOverlays(pdfState);
    notify("Adjust Mode", "Snapped to nearest text.");
  }
}

async function applyAllAnnotations(pdfState, options = {}) {
  const bytes = await buildAnnotatedBytes(pdfState, options);
  if (!bytes) return;
  pdfState.bytes = bytes;
  await refreshPdfRender(pdfState);
  refreshPdfList();
  if (!pdfState.restoring) {
    persistPdfState(pdfState);
  }
}

async function buildAnnotatedBytes(pdfState, options = {}) {
  if (!pdfState) return null;
  const pdfDoc = await PDFLib.PDFDocument.load(pdfState.originalBytes);
  const pageCount = pdfDoc.getPageCount();
  pdfState.annotationCount = 0;
  const validAnnotations = [];
  let invalidCount = 0;
  for (const annotation of pdfState.annotations) {
    const pageIndex = Number(annotation.pageIndex);
    if (!Number.isInteger(pageIndex) || pageIndex < 0 || pageIndex >= pageCount) {
      invalidCount += 1;
      continue;
    }
    if (!annotation.bbox) {
      invalidCount += 1;
      continue;
    }
    const page = pdfDoc.getPage(pageIndex);
    drawAnnotation(page, annotation, { bbox: annotation.bbox }, options);
    pdfState.annotationCount += 1;
    validAnnotations.push(annotation);
  }
  if (invalidCount) {
    logEvent({
      title: "Invalid annotations skipped",
      detail: { pdfId: pdfState.id, skipped: invalidCount },
      sessionId: state.activeSessionId
    });
  }
  pdfState.annotations = validAnnotations;
  return await pdfDoc.save();
}

function toggleAdjustMode() {
  const pdfState = getActivePdf();
  if (!state.adjustMode && (!pdfState || !pdfState.annotations.length)) {
    notify("Adjust Mode", "No annotations to adjust yet.");
    return;
  }
  state.adjustMode = !state.adjustMode;
  elements.adjustToolbar.classList.toggle("active", state.adjustMode);
  elements.commitAdjust.classList.toggle("hidden", !state.adjustMode);
  elements.toggleAdjust.classList.toggle("toggle-active", state.adjustMode);
  if (!state.adjustMode) {
    state.selectedAnnotationId = null;
  }
  renderOverlays(getActivePdf());
  updateAdjustToolbarState();
  notify("Adjust Mode", state.adjustMode ? "Adjust mode enabled." : "Adjust mode disabled.");
}

async function commitAdjustments() {
  const pdfState = getActivePdf();
  if (!pdfState) return;
  notify("Adjust Mode", "Applying adjustments...");
  await applyAllAnnotations(pdfState, { invertForView: isPdfInvertedView() });
}

function areBboxesNear(a, b, tolerance = 1.5) {
  if (!a || !b) return false;
  return (
    Math.abs((a.x || 0) - (b.x || 0)) <= tolerance &&
    Math.abs((a.y || 0) - (b.y || 0)) <= tolerance &&
    Math.abs((a.width || 0) - (b.width || 0)) <= tolerance &&
    Math.abs((a.height || 0) - (b.height || 0)) <= tolerance
  );
}

function isDuplicateAnnotation(pdfState, nextAnnotation) {
  if (!pdfState || !nextAnnotation) return false;
  const commentKey = String(nextAnnotation.comment || "").trim().toLowerCase();
  return pdfState.annotations.some((existing) => {
    if (existing.pageIndex !== nextAnnotation.pageIndex) return false;
    if ((existing.type || "") !== (nextAnnotation.type || "")) return false;
    if ((existing.color || "") !== (nextAnnotation.color || "")) return false;
    const existingComment = String(existing.comment || "").trim().toLowerCase();
    if (existingComment !== commentKey) return false;
    return areBboxesNear(existing.bbox, nextAnnotation.bbox);
  });
}

async function applyAnnotations(aiResponse, session) {
  if (!aiResponse?.annotations?.length) return 0;
  let addedTotal = 0;
  const grouped = new Map();
  for (const annotation of aiResponse.annotations) {
    const pdfId = resolvePdfIdForAnnotation(annotation, session);
    if (!grouped.has(pdfId)) grouped.set(pdfId, []);
    grouped.get(pdfId).push(annotation);
  }
  for (const [pdfId, annotations] of grouped.entries()) {
    const pdfState = state.pdfs.find((pdf) => pdf.id === pdfId) || getActivePdf();
    if (!pdfState) continue;
    let added = 0;
    for (const annotation of annotations) {
      if (
        !Number.isInteger(annotation.pageIndex) ||
        annotation.pageIndex < 0 ||
        annotation.pageIndex >= pdfState.pageCount
      ) {
        continue;
      }
      const target = await resolveTarget(annotation, pdfState, session);
      if (!target) continue;
      const nextAnnotation = {
        id: crypto.randomUUID(),
        pageIndex: annotation.pageIndex,
        type: annotation.type,
        color: normalizeAnnotationColor(annotation.color || "yellow"),
        comment: annotation.comment || "",
        mode: annotation.target?.mode || "auto",
        bbox: target.bbox
      };
      if (isDuplicateAnnotation(pdfState, nextAnnotation)) {
        continue;
      }
      pdfState.annotations.push(nextAnnotation);
      added += 1;
    }
    await applyAllAnnotations(pdfState, { invertForView: isPdfInvertedView() });
    addedTotal += added;
    logEvent({
      title: "Annotations applied",
      detail: {
        pdfId,
        added,
        total: pdfState.annotations.length
      },
      sessionId: session?.id
    });
  }
  return addedTotal;
}

function isPdfInvertedView() {
  return document.documentElement.classList.contains("pdf-invert");
}

function resolvePdfIdForAnnotation(annotation, session) {
  const lastSnapshotPdf = session?.snapshots?.[session.snapshots.length - 1]?.pdfId;
  if (annotation?.contextRef?.previousPdf && session?.pdfContextHistory?.length) {
    const last = session.pdfContextHistory[session.pdfContextHistory.length - 1];
    return last.fromPdfId || lastSnapshotPdf;
  }
  return lastSnapshotPdf || state.activePdfId;
}

async function refreshPdfRender(pdfState) {
  const bytes = pdfState.bytes;
  const bytesForPdfjs = cloneUint8(bytes);
  pdfState.pdfDoc = await pdfjsLib.getDocument({ data: bytesForPdfjs }).promise;
  pdfState.pageCount = pdfState.pdfDoc.numPages;
  await renderPdf(pdfState);
}
