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

async function resolveTarget(annotation, pdfState, session) {
  const pageData = pdfState.pages.find((p) => p.pageNum - 1 === annotation.pageIndex);
  if (!pageData) return null;
  const target = annotation.target || {};

  if (target.mode === "tapFocus" && session?.taps?.length) {
    const tap = session.taps[target.tapFocusIndex] || session.taps[session.taps.length - 1];
    if (tap && tap.pageIndex === annotation.pageIndex) {
      return { bbox: { x: tap.pdfX, y: tap.pdfY, width: 60, height: 20 } };
    }
  }

  if (target.mode === "bbox" && target.bbox) {
    return { bbox: target.bbox };
  }

  const query = target.text?.exact || target.text?.quote;
  const startHint = target.text?.startHint;
  const endHint = target.text?.endHint;
  if (query || startHint || endHint) {
    const spans = Array.from(pageData.textLayer.querySelectorAll("span"))
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
  const width = Math.max(1, maxX - minX);
  const centers = spans.map((s) => s.bbox.x + s.bbox.width / 2);
  const sortedCenters = [...centers].sort((a, b) => a - b);
  let maxGap = 0;
  let splitAt = null;
  for (let i = 1; i < sortedCenters.length; i++) {
    const gap = sortedCenters[i] - sortedCenters[i - 1];
    if (gap > maxGap) {
      maxGap = gap;
      splitAt = (sortedCenters[i] + sortedCenters[i - 1]) / 2;
    }
  }
  const hasColumns = splitAt && maxGap > width * 0.18;
  const sortByLine = (a, b) => {
    if (b.bbox.y !== a.bbox.y) return b.bbox.y - a.bbox.y;
    return a.bbox.x - b.bbox.x;
  };
  if (!hasColumns) {
    return [...spans].sort(sortByLine);
  }
  const left = spans.filter((s) => s.bbox.x + s.bbox.width / 2 <= splitAt).sort(sortByLine);
  const right = spans.filter((s) => s.bbox.x + s.bbox.width / 2 > splitAt).sort(sortByLine);
  return [...left, ...right];
}

function findMatchFromHints(tokens, startHint, endHint) {
  const startTokens = tokenize(startHint);
  const endTokens = tokenize(endHint);
  if (!startTokens.length && !endTokens.length) return null;
  let startIndex = 0;
  if (startTokens.length) {
    startIndex = findTokenSequence(tokens, startTokens);
    if (startIndex < 0) return null;
  }
  let endIndex = tokens.length - 1;
  if (endTokens.length) {
    endIndex = findTokenSequence(tokens, endTokens, startIndex);
    if (endIndex < 0) return null;
    endIndex += endTokens.length - 1;
  }
  const boxes = tokens.slice(startIndex, endIndex + 1).map((t) => t.bbox);
  return combineBoxes(boxes);
}

function findTextMatch(tokens, query) {
  const queryTokens = tokenize(query);
  if (!queryTokens.length) return null;
  const startIndex = findTokenSequence(tokens, queryTokens);
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

function drawAnnotation(page, annotation, target) {
  const colorMap = {
    yellow: PDFLib.rgb(0.98, 0.9, 0.55),
    blue: PDFLib.rgb(0.45, 0.6, 0.85),
    red: PDFLib.rgb(0.9, 0.45, 0.45),
    green: PDFLib.rgb(0.45, 0.75, 0.55),
    purple: PDFLib.rgb(0.62, 0.52, 0.76),
    pink: PDFLib.rgb(0.82, 0.6, 0.7)
  };
  const color = colorMap[annotation.color] || colorMap.yellow;
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

    if (annotation.id === state.selectedAnnotationId) {
      overlay.classList.add("selected");
    }

    pageData.pageDiv.appendChild(overlay);
  });
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
  const spans = Array.from(pageData.textLayer.querySelectorAll("span"));
  if (!spans.length) return;
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

async function applyAllAnnotations(pdfState) {
  const pdfDoc = await PDFLib.PDFDocument.load(pdfState.originalBytes);
  pdfState.annotationCount = 0;
  for (const annotation of pdfState.annotations) {
    const page = pdfDoc.getPage(annotation.pageIndex);
    drawAnnotation(page, annotation, { bbox: annotation.bbox });
    pdfState.annotationCount += 1;
  }
  pdfState.bytes = await pdfDoc.save();
  await refreshPdfRender(pdfState);
  refreshPdfList();
  if (!pdfState.restoring) {
    persistPdfState(pdfState);
  }
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
  await applyAllAnnotations(pdfState);
}

async function applyAnnotations(aiResponse, session) {
  if (!aiResponse?.annotations?.length) return;
  const grouped = new Map();
  for (const annotation of aiResponse.annotations) {
    const pdfId = resolvePdfIdForAnnotation(annotation, session);
    if (!grouped.has(pdfId)) grouped.set(pdfId, []);
    grouped.get(pdfId).push(annotation);
  }
  for (const [pdfId, annotations] of grouped.entries()) {
    const pdfState = state.pdfs.find((pdf) => pdf.id === pdfId) || getActivePdf();
    if (!pdfState) continue;
    for (const annotation of annotations) {
      const target = await resolveTarget(annotation, pdfState, session);
      if (!target) continue;
      pdfState.annotations.push({
        id: crypto.randomUUID(),
        pageIndex: annotation.pageIndex,
        type: annotation.type,
        color: annotation.color || "yellow",
        comment: annotation.comment || "",
        mode: annotation.target?.mode || "auto",
        bbox: target.bbox
      });
    }
    await applyAllAnnotations(pdfState);
    logEvent({
      title: "Annotations applied",
      detail: {
        pdfId,
        added: annotations.length,
        total: pdfState.annotations.length
      },
      sessionId: session?.id
    });
  }
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
