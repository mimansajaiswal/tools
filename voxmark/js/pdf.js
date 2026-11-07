function addPdfCard(pdf) {
  const card = document.createElement("div");
  card.className = "pdf-card";
  card.dataset.id = pdf.id;
  const textStatus =
    pdf.hasTextLayer === null ? "Checking" : pdf.hasTextLayer ? "Text" : "Scanned";
  const title = document.createElement("strong");
  const icon = document.createElement("i");
  icon.className = "ph ph-file-pdf";
  const nameEl = document.createElement("span");
  nameEl.className = "pdf-name";
  nameEl.textContent = pdf.name;
  nameEl.title = pdf.name;
  title.appendChild(icon);
  title.appendChild(nameEl);

  const meta = document.createElement("div");
  meta.className = "pdf-meta";
  const metaText = document.createElement("span");
  metaText.textContent = `${pdf.pageCount} pages · ${textStatus}`;
  const badge = document.createElement("span");
  badge.className = "badge";
  badge.textContent = `${pdf.annotationCount} notes`;
  meta.appendChild(metaText);
  meta.appendChild(badge);

  const actions = document.createElement("div");
  actions.className = "pdf-actions";
  const removeBtn = document.createElement("button");
  removeBtn.className = "remove-btn";
  removeBtn.title = "Unload PDF";
  const removeIcon = document.createElement("i");
  removeIcon.className = "ph ph-x";
  removeBtn.appendChild(removeIcon);
  actions.appendChild(removeBtn);

  card.appendChild(title);
  card.appendChild(meta);
  card.appendChild(actions);
  removeBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    confirmRemovePdf(pdf.id);
  });
  card.addEventListener("click", () => setActivePdf(pdf.id));
  elements.pdfList.appendChild(card);
}

function refreshPdfList() {
  elements.pdfList.innerHTML = "";
  state.pdfs.forEach((pdf) => addPdfCard(pdf));
  document.querySelectorAll(".pdf-card").forEach((card) => {
    card.classList.toggle("active", card.dataset.id === state.activePdfId);
  });
  updateActivePdfLabel();
}

function updateActivePdfLabel() {
  if (!elements.activePdfLabel) return;
  const active = getActivePdf();
  elements.activePdfLabel.textContent = active ? active.name : "No PDF";
  elements.activePdfLabel.title = active ? active.name : "No PDF loaded";
}

function updateEmptyStateVisibility() {
  if (!elements.emptyState || !elements.viewerArea) return;
  if (!elements.viewerArea.contains(elements.emptyState)) {
    elements.viewerArea.appendChild(elements.emptyState);
  }
  elements.emptyState.classList.toggle("hidden", state.pdfs.length > 0);
}

function setActivePdf(id) {
  if (state.recording && state.recordingSession && state.activePdfId && state.activePdfId !== id) {
    state.recordingSession.pdfContextHistory.push({
      timestamp: Date.now(),
      fromPdfId: state.activePdfId,
      toPdfId: id
    });
  }
  state.activePdfId = id;
  state.activePageIndex = 0;
  state.pdfs.forEach((pdf) => {
    pdf.container.classList.toggle("hidden", pdf.id !== id);
  });
  refreshPdfList();
  renderOverlays(getActivePdf());
  updateZoomLabel(getActivePdf());
  updateNavigationForActivePdf();
  scheduleActivePageUpdate();
  saveSessionState({ activePdfId: id });
  updateActivePdfLabel();
  updateEmptyStateVisibility();
  if (typeof closePdfMenu === "function") {
    closePdfMenu();
  }
}

function confirmRemovePdf(id) {
  const pdfState = state.pdfs.find((pdf) => pdf.id === id);
  if (!pdfState) return;
  if (pdfState.annotationCount > 0) {
    confirmModal({
      title: "Unload PDF",
      body:
        "<p>This PDF has annotations. Make sure you've downloaded it. Remove anyway?</p>",
      confirmLabel: "Unload",
      onConfirm: () => removePdf(id)
    });
    return;
  }
  confirmModal({
    title: "Unload PDF",
    body: "<p>Remove this PDF from the session?</p>",
    confirmLabel: "Unload",
    onConfirm: () => removePdf(id)
  });
}

function removePdf(id) {
  const index = state.pdfs.findIndex((pdf) => pdf.id === id);
  if (index === -1) return;
  const [removed] = state.pdfs.splice(index, 1);
  if (removed.pageObserver) removed.pageObserver.disconnect();
  if (removed.thumbnailObserver) removed.thumbnailObserver.disconnect();
  removed.container.remove();
  deletePdfState(id);
  if (state.activePdfId === id) {
    const next = state.pdfs[0]?.id || null;
    state.activePdfId = null;
    if (next) setActivePdf(next);
  }
  refreshPdfList();
  updateEmptyStateVisibility();
  if (!state.pdfs.length) {
    updateNavigationForActivePdf();
  }
}

async function handlePdfUpload(files) {
  const fileArray = Array.from(files);
  if (!fileArray.length) return;
  setLoading(true, "Loading PDFs...");
  try {
    for (const file of fileArray) {
      try {
        const bytes = await file.arrayBuffer();
        const bytesForPdfjs = cloneUint8(bytes);
        const originalBytes = cloneArrayBuffer(bytes);
        const pdfDoc = await pdfjsLib.getDocument({
          data: bytesForPdfjs,
          disableAutoFetch: true,
          disableStream: true,
          stopAtErrors: false
        }).promise;
        const fitScale = await getFitScale(pdfDoc);
        const id = crypto.randomUUID();
        const container = document.createElement("div");
        container.dataset.id = id;
        elements.viewerArea.appendChild(container);

        const pdfState = {
          id,
          name: file.name,
          bytes: cloneArrayBuffer(bytes),
          originalBytes,
          pdfDoc,
          container,
          pageCount: pdfDoc.numPages,
          pages: [],
          annotationCount: 0,
          annotations: [],
          scale: fitScale,
          autoFit: true,
          textItemCount: 0,
          hasTextLayer: null
        };

        state.pdfs.push(pdfState);
        await renderPdf(pdfState);
        detectTextLayer(pdfState);
        addPdfCard(pdfState);
        persistPdfState(pdfState);
        if (!state.activePdfId) setActivePdf(id);
      } catch (error) {
        const detail = error?.message ? ` ${error.message}` : "";
        notify("PDF Load", `Failed to load ${file.name}.${detail}`, { type: "error", duration: 6000 });
      }
    }
    refreshPdfList();
    updateEmptyStateVisibility();
  } catch (error) {
    notify("PDF Load", "Failed to load one or more PDFs.", { type: "error", duration: 6000 });
  } finally {
    setLoading(false);
  }
}

async function renderPdf(pdfState) {
  pdfState.container.innerHTML = "";
  pdfState.pages = [];
  pdfState.textItemCount = 0;
  if (pdfState.hasTextLayer !== true && pdfState.hasTextLayer !== false) {
    pdfState.hasTextLayer = null;
  }
  if (pdfState.pageObserver) {
    pdfState.pageObserver.disconnect();
    pdfState.pageObserver = null;
  }
  for (let pageNum = 1; pageNum <= pdfState.pageCount; pageNum++) {
    const page = await pdfState.pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: pdfState.scale });
    const pageDiv = document.createElement("div");
    pageDiv.className = "page";
    pageDiv.style.width = `${viewport.width}px`;
    pageDiv.style.height = `${viewport.height}px`;
    pageDiv.style.setProperty("--scale-factor", pdfState.scale);
    pageDiv.dataset.pageNumber = pageNum;
    pageDiv.dataset.rendered = "false";

    pdfState.container.appendChild(pageDiv);

    pdfState.pages.push({
      pageNum,
      page,
      viewport,
      pageDiv,
      textLayer: null,
      annotationLayer: null,
      canvas: null,
      rendered: false,
      rendering: false,
      ocrSpans: null
    });
  }
  setupPageObserver(pdfState);
  renderOverlays(pdfState);
  updateZoomLabel(pdfState);
  if (pdfState.id === state.activePdfId) {
    updateNavigationForActivePdf();
  }
}

async function getFitScale(pdfDoc) {
  try {
    const page = await pdfDoc.getPage(1);
    const viewport = page.getViewport({ scale: 1 });
    const available = Math.max(320, elements.viewerArea.clientWidth - 48);
    const scale = available / viewport.width;
    return Math.min(2.0, Math.max(0.75, scale));
  } catch (error) {
    return 1.15;
  }
}

async function detectTextLayer(pdfState) {
  if (!pdfState || pdfState.textDetectionRunning) return;
  pdfState.textDetectionRunning = true;
  try {
    for (let pageNum = 1; pageNum <= pdfState.pageCount; pageNum++) {
      const page = await pdfState.pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      if (textContent.items?.length) {
        pdfState.hasTextLayer = true;
        refreshPdfList();
        return;
      }
    }
    pdfState.hasTextLayer = false;
    refreshPdfList();
  } catch (error) {
    pdfState.hasTextLayer = false;
    refreshPdfList();
  } finally {
    pdfState.textDetectionRunning = false;
  }
}

async function applyFitScale(pdfState) {
  if (!pdfState || !pdfState.autoFit || state.isPinching) return;
  const scale = await getFitScale(pdfState.pdfDoc);
  setPdfScale(pdfState, scale);
}

async function renderTextLayerSafe({ textContentSource, textContent, container, viewport }) {
  container.innerHTML = "";
  container.style.width = `${viewport.width}px`;
  container.style.height = `${viewport.height}px`;
  container.style.setProperty("--scale-factor", viewport.scale);
  container.style.position = "absolute";
  container.style.left = "0";
  container.style.top = "0";
  container.style.zIndex = "2";
  container.style.userSelect = "text";
  container.style.pointerEvents = "auto";
  const isStream = textContentSource && typeof textContentSource.getReader === "function";
  if (pdfjsLib.renderTextLayer && isStream) {
    const task = pdfjsLib.renderTextLayer({
      textContentSource,
      container,
      viewport,
      textDivs: [],
      enhanceTextSelection: true
    });
    if (task?.promise) {
      await task.promise;
    } else if (typeof task?.then === "function") {
      await task;
    }
    fixTextLayerSpans(container);
    return;
  }
  renderTextLayerManual(textContent, container, viewport);
}

function fixTextLayerSpans(container) {
  const spans = container.querySelectorAll("span");
  spans.forEach((span) => {
    span.style.userSelect = "text";
    span.style.pointerEvents = "auto";
    if (!span.style.fontFamily || span.style.fontFamily === "sans-serif") {
      span.style.fontFamily = "sans-serif";
    }
  });
}

function renderTextLayerManual(textContent, container, viewport) {
  container.innerHTML = "";
  const frag = document.createDocumentFragment();
  let lastItem = null;
  textContent.items.forEach((item, index) => {
    if (item.str === "" && !item.hasEOL) return;
    if (lastItem && item.str !== "" && needsWhitespace(lastItem, item, viewport)) {
      const space = document.createElement("span");
      space.textContent = " ";
      space.style.position = "absolute";
      space.style.opacity = "0";
      space.style.userSelect = "text";
      space.style.pointerEvents = "none";
      frag.appendChild(space);
    }
    const span = document.createElement("span");
    span.textContent = item.hasEOL ? item.str + "\n" : item.str;
    const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
    const [a, b, c, d, e, f] = tx;
    const fontSize = Math.hypot(a, b) || Math.hypot(c, d) || 12;
    span.style.position = "absolute";
    span.style.left = "0";
    span.style.top = "0";
    span.style.transform = `matrix(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`;
    span.style.transformOrigin = "0 0";
    span.style.fontSize = `${fontSize}px`;
    span.style.fontFamily = "sans-serif";
    span.style.lineHeight = "1.0";
    span.style.letterSpacing = "0";
    span.style.whiteSpace = "pre";
    span.style.color = "transparent";
    span.style.userSelect = "text";
    span.style.pointerEvents = "auto";
    if (item.width) {
      const textWidth = item.width * viewport.scale;
      span.style.width = `${textWidth}px`;
    }
    frag.appendChild(span);
    lastItem = item;
  });
  container.appendChild(frag);
}

function needsWhitespace(prevItem, currItem, viewport) {
  if (!prevItem || !currItem) return false;
  const prevTx = pdfjsLib.Util.transform(viewport.transform, prevItem.transform);
  const currTx = pdfjsLib.Util.transform(viewport.transform, currItem.transform);
  const prevEndX = prevTx[4] + (prevItem.width || 0) * viewport.scale;
  const currStartX = currTx[4];
  const prevY = prevTx[5];
  const currY = currTx[5];
  const fontSize = Math.hypot(prevTx[0], prevTx[1]) || 12;
  const sameLine = Math.abs(prevY - currY) < fontSize * 0.5;
  const hasGap = currStartX - prevEndX > fontSize * 0.15;
  return sameLine && hasGap;
}

const renderQueue = {
  high: [],
  low: [],
  processing: false,
  recentlyViewed: new Map()
};

function schedulePageRender(pdfState, pageData, priority = "low") {
  if (!pdfState || !pageData || pageData.rendered || pageData.rendering) return;
  const queue = priority === "high" ? renderQueue.high : renderQueue.low;
  const existing = queue.find((item) => item.pageData === pageData);
  if (existing) return;
  queue.push({ pdfState, pageData });
  processRenderQueue();
}

function processRenderQueue() {
  if (renderQueue.processing) return;
  const next = renderQueue.high.shift() || renderQueue.low.shift();
  if (!next) return;
  renderQueue.processing = true;
  const doRender = () => {
    renderPage(next.pdfState, next.pageData).finally(() => {
      renderQueue.processing = false;
      processRenderQueue();
    });
  };
  if (renderQueue.high.length === 0 && typeof requestIdleCallback !== "undefined") {
    requestIdleCallback(() => doRender(), { timeout: 100 });
  } else {
    doRender();
  }
}

let scrollThrottleTimeout = null;
function throttledScrollHandler(pdfState) {
  if (scrollThrottleTimeout) return;
  scrollThrottleTimeout = setTimeout(() => {
    scrollThrottleTimeout = null;
    renderVisiblePages(pdfState);
  }, 50);
}

function setupPageObserver(pdfState) {
  if (!pdfState) return;
  if (!("IntersectionObserver" in window)) {
    pdfState.pages.forEach((pageData) => renderPage(pdfState, pageData));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      const containerRect = elements.viewerArea.getBoundingClientRect();
      const containerCenter = containerRect.top + containerRect.height / 2;
      entries.forEach((entry) => {
        const pageNum = Number(entry.target.dataset.pageNumber);
        const pageData = pdfState.pages.find((p) => p.pageNum === pageNum);
        if (!pageData) return;
        if (entry.isIntersecting) {
          const rect = entry.target.getBoundingClientRect();
          const pageCenter = rect.top + rect.height / 2;
          const distanceFromCenter = Math.abs(pageCenter - containerCenter);
          const isCenterVisible = entry.intersectionRatio >= 0.5;
          const priority = isCenterVisible || distanceFromCenter < containerRect.height / 3 ? "high" : "low";
          schedulePageRender(pdfState, pageData, priority);
          renderQueue.recentlyViewed.set(pageNum, Date.now());
        }
      });
    },
    {
      root: elements.viewerArea,
      rootMargin: "1200px 0px",
      threshold: [0, 0.1, 0.5, 1]
    }
  );
  pdfState.pageObserver = observer;
  pdfState.pages.forEach((pageData) => observer.observe(pageData.pageDiv));
  renderVisiblePages(pdfState);
}

async function renderVisiblePages(pdfState) {
  if (!pdfState) return;
  const visible = getVisiblePages(pdfState);
  await Promise.all(visible.map((pageData) => renderPage(pdfState, pageData)));
  cleanupPageRendering(pdfState, visible);
}

async function renderPage(pdfState, pageData) {
  if (!pdfState || !pageData || pageData.rendered || pageData.rendering) return;
  pageData.rendering = true;
  try {
    ensurePageLayers(pageData);
    const viewport = pageData.page.getViewport({ scale: pdfState.scale });
    pageData.viewport = viewport;
    pageData.pageDiv.style.width = `${viewport.width}px`;
    pageData.pageDiv.style.height = `${viewport.height}px`;
    pageData.pageDiv.style.setProperty("--scale-factor", pdfState.scale);
    pageData.pageDiv.dataset.rendered = "true";
    const canvas = pageData.canvas;
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext("2d");
    await pageData.page.render({ canvasContext: context, viewport }).promise;
    const textContent = await pageData.page.getTextContent();
    const hasText = textContent.items.length > 0;
    const textContentSource = pageData.page.streamTextContent
      ? pageData.page.streamTextContent({ includeMarkedContent: true })
      : null;
    if (hasText) {
      pdfState.textItemCount += textContent.items.length;
      if (!pdfState.hasTextLayer) {
        pdfState.hasTextLayer = true;
        refreshPdfList();
      }
    }
    pageData.textLayer.classList.toggle("no-text", !hasText);
    if (hasText) {
      await renderTextLayerSafe({
        textContentSource,
        textContent,
        container: pageData.textLayer,
        viewport
      });
    } else {
      pageData.textLayer.innerHTML = "";
    }
    try {
      const annotations = await pageData.page.getAnnotations({ intent: "display" });
      await renderAnnotationLayer({
        annotations,
        annotationLayer: pageData.annotationLayer,
        viewport,
        pdfState
      });
    } catch (error) {
      pageData.annotationLayer.innerHTML = "";
    }
    pageData.rendered = true;
  } catch (error) {
    pageData.pageDiv.dataset.rendered = "false";
  } finally {
    pageData.rendering = false;
  }
}

function ensurePageLayers(pageData) {
  if (!pageData || pageData.canvas) return;
  pageData.pageDiv.style.position = "relative";
  const canvas = document.createElement("canvas");
  canvas.style.position = "absolute";
  canvas.style.left = "0";
  canvas.style.top = "0";
  canvas.style.zIndex = "1";
  pageData.pageDiv.appendChild(canvas);
  const textLayer = document.createElement("div");
  textLayer.className = "textLayer";
  textLayer.style.position = "absolute";
  textLayer.style.left = "0";
  textLayer.style.top = "0";
  textLayer.style.zIndex = "2";
  textLayer.style.pointerEvents = "auto";
  textLayer.style.userSelect = "text";
  pageData.pageDiv.appendChild(textLayer);
  const annotationLayer = document.createElement("div");
  annotationLayer.className = "annotationLayer";
  annotationLayer.style.position = "absolute";
  annotationLayer.style.left = "0";
  annotationLayer.style.top = "0";
  annotationLayer.style.zIndex = "3";
  annotationLayer.style.pointerEvents = "none";
  pageData.pageDiv.appendChild(annotationLayer);
  pageData.canvas = canvas;
  pageData.textLayer = textLayer;
  pageData.annotationLayer = annotationLayer;
}

async function renderAnnotationLayer({ annotations, annotationLayer, viewport, pdfState }) {
  annotationLayer.innerHTML = "";
  annotationLayer.style.width = `${viewport.width}px`;
  annotationLayer.style.height = `${viewport.height}px`;
  if (!annotations || !annotations.length) return;
  for (const annotation of annotations) {
    if (annotation.subtype === "Link") {
      renderLinkAnnotation({ annotation, annotationLayer, viewport, pdfState });
      continue;
    }
    if (annotation.subtype === "FileAttachment") {
      renderAttachmentAnnotation({ annotation, annotationLayer, viewport });
      continue;
    }
    renderExistingAnnotation({ annotation, annotationLayer, viewport });
  }
}

function renderLinkAnnotation({ annotation, annotationLayer, viewport, pdfState }) {
  if (!annotation.rect) return;
  const rect = toViewportRect(annotation.rect, viewport);
  if (!rect.width || !rect.height) return;
  const link = document.createElement("a");
  link.className = "link-annotation";
  link.style.left = `${rect.left}px`;
  link.style.top = `${rect.top}px`;
  link.style.width = `${rect.width}px`;
  link.style.height = `${rect.height}px`;
  link.setAttribute("aria-label", "PDF link");
  const rawUrl = annotation.url || annotation.unsafeUrl || annotation.action?.url;
  const safeUrl = sanitizeExternalUrl(rawUrl);
  if (safeUrl) {
    link.href = safeUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    annotationLayer.appendChild(link);
    return;
  }
  link.href = "#";
  link.addEventListener("click", async (event) => {
    event.preventDefault();
    const actionHandled = await handleLinkAction(annotation, pdfState);
    if (actionHandled) return;
    const destination = await resolveLinkDestination(pdfState, annotation);
    if (!destination) return;
    const returnPoint = captureReturnPoint();
    const label = `Jumped to page ${destination.pageIndex + 1}.`;
    showJumpBack(returnPoint, label);
    navigateToDestination(pdfState, destination);
  });
  annotationLayer.appendChild(link);
}

function renderAttachmentAnnotation({ annotation, annotationLayer, viewport }) {
  if (!annotation.rect) return;
  const rect = toViewportRect(annotation.rect, viewport);
  const button = document.createElement("button");
  button.type = "button";
  button.className = "pdf-annotation attachment";
  button.style.left = `${rect.left}px`;
  button.style.top = `${rect.top}px`;
  button.innerHTML = `<i class="ph ph-paperclip"></i>`;
  button.addEventListener("click", () => {
    const file = annotation.file;
    if (file?.content) {
      const blob = new Blob([file.content], { type: file.contentType || "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.filename || "attachment";
      link.click();
      URL.revokeObjectURL(url);
      return;
    }
    openModal({
      title: "File Attachment",
      body: "<p>This attachment cannot be accessed in the browser.</p>",
      actions: [{ label: "Close", variant: "secondary", onClick: closeModal }]
    });
  });
  annotationLayer.appendChild(button);
}

function renderExistingAnnotation({ annotation, annotationLayer, viewport }) {
  const subtype = (annotation.subtype || "").toLowerCase();
  const rects = getAnnotationRects(annotation, viewport);
  if (!rects.length) return;
  const color = resolveAnnotationColor(annotation, 0.28);
  rects.forEach((rect) => {
    if (!rect.width || !rect.height) return;
    if (subtype === "text" || subtype === "freetext") {
      const note = document.createElement("button");
      note.type = "button";
      note.className = "pdf-annotation note";
      note.style.left = `${rect.left}px`;
      note.style.top = `${rect.top}px`;
      note.innerHTML = `<i class="ph ph-note-pencil"></i>`;
      note.addEventListener("click", () => {
        openAnnotationNote(annotation);
      });
      annotationLayer.appendChild(note);
      return;
    }
    const overlay = document.createElement("div");
    overlay.className = `pdf-annotation ${subtype}`;
    overlay.style.left = `${rect.left}px`;
    overlay.style.top = `${rect.top}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
    if (subtype === "highlight") {
      overlay.style.background = color;
    } else if (subtype === "underline") {
      overlay.style.height = "2px";
      overlay.style.top = `${rect.top + rect.height - 2}px`;
      overlay.style.borderBottom = `2px solid ${color}`;
      overlay.style.background = "transparent";
    } else if (subtype === "strikeout" || subtype === "strikethrough") {
      overlay.style.height = "2px";
      overlay.style.top = `${rect.top + rect.height / 2}px`;
      overlay.style.borderBottom = `2px solid ${color}`;
      overlay.style.background = "transparent";
    } else if (subtype === "square" || subtype === "circle") {
      overlay.style.border = `2px solid ${color}`;
      overlay.style.background = "transparent";
      if (subtype === "circle") overlay.style.borderRadius = "50%";
    } else {
      overlay.style.background = color;
    }
    annotationLayer.appendChild(overlay);
  });
}

function openAnnotationNote(annotation) {
  const title = annotation.title || "PDF Note";
  const bodyText = annotation.contents || annotation.contentsObj?.str || "No comment provided.";
  const safe = escapeHtml(bodyText);
  openModal({
    title,
    body: `<p>${safe}</p>`,
    actions: [{ label: "Close", variant: "secondary", onClick: closeModal }]
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeExternalUrl(url) {
  if (!url || typeof url !== "string") return null;
  try {
    const parsed = new URL(url, window.location.href);
    if (!["http:", "https:", "mailto:", "tel:"].includes(parsed.protocol)) {
      return null;
    }
    return parsed.href;
  } catch (error) {
    return null;
  }
}

function resolveAnnotationColor(annotation, alpha = 0.28) {
  const color = annotation.color;
  if (Array.isArray(color) && color.length >= 3) {
    const r = Math.round(color[0] * 255);
    const g = Math.round(color[1] * 255);
    const b = Math.round(color[2] * 255);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return `rgba(214, 184, 95, ${alpha})`;
}

function getAnnotationRects(annotation, viewport) {
  if (annotation.quadPoints?.length >= 8) {
    const rects = [];
    for (let i = 0; i < annotation.quadPoints.length; i += 8) {
      const quad = annotation.quadPoints.slice(i, i + 8);
      const xs = [quad[0], quad[2], quad[4], quad[6]];
      const ys = [quad[1], quad[3], quad[5], quad[7]];
      const rect = [
        Math.min(...xs),
        Math.min(...ys),
        Math.max(...xs),
        Math.max(...ys)
      ];
      rects.push(toViewportRect(rect, viewport));
    }
    return rects;
  }
  if (annotation.rect) {
    return [toViewportRect(annotation.rect, viewport)];
  }
  return [];
}

function toViewportRect(rect, viewport) {
  const box = viewport.convertToViewportRectangle(rect);
  const left = Math.min(box[0], box[2]);
  const top = Math.min(box[1], box[3]);
  const width = Math.abs(box[0] - box[2]);
  const height = Math.abs(box[1] - box[3]);
  return { left, top, width, height };
}

async function handleLinkAction(annotation, pdfState) {
  const action = annotation.action;
  if (!action) return false;
  if (typeof action === "string") {
    handleNamedAction(action, pdfState);
    return true;
  }
  if (typeof action !== "object") return false;
  const actionType = action.action || action.type;
  const name = action.name || action.named;
  if (actionType === "GoToR") {
    const url = action.url || action.uri;
    openExternalActionModal("External PDF Link", url, action.filename);
    return true;
  }
  if (actionType === "Launch") {
    const url = action.url || action.uri;
    openExternalActionModal("Launch File", url, action.filename);
    return true;
  }
  if (actionType === "Named" || name) {
    handleNamedAction(name || actionType, pdfState);
    return true;
  }
  return false;
}

function handleNamedAction(name, pdfState) {
  if (!pdfState || !name) return;
  const currentIndex = getCurrentPageIndex(pdfState);
  let target = currentIndex;
  if (name === "NextPage") target = Math.min(pdfState.pageCount - 1, currentIndex + 1);
  if (name === "PrevPage" || name === "PreviousPage") target = Math.max(0, currentIndex - 1);
  if (name === "FirstPage") target = 0;
  if (name === "LastPage") target = pdfState.pageCount - 1;
  if (target !== currentIndex) navigateToPageIndex(target, pdfState);
}

function openExternalActionModal(title, url, filename) {
  const safeUrl = sanitizeExternalUrl(url);
  const detailValue = safeUrl || filename;
  const detail = detailValue ? `<p>${escapeHtml(detailValue)}</p>` : "<p>External action.</p>";
  const actions = [{ label: "Close", variant: "secondary", onClick: closeModal }];
  if (safeUrl) {
    actions.unshift({
      label: "Open",
      variant: "accent",
      onClick: () => {
        window.open(safeUrl, "_blank", "noopener,noreferrer");
        closeModal();
      }
    });
  }
  openModal({
    title,
    body: detail,
    actions
  });
}

async function resolveLinkDestination(pdfState, annotation) {
  try {
    if (!annotation) return null;
    let dest = annotation.dest;
    if (!dest && annotation.action && typeof annotation.action === "object") {
      dest = annotation.action.dest;
    }
    return resolveDestination(pdfState, dest);
  } catch (error) {
    return null;
  }
}

async function resolveDestination(pdfState, dest) {
  if (!pdfState || !dest) return null;
  let resolved = dest;
  if (typeof resolved === "string") {
    resolved = await pdfState.pdfDoc.getDestination(resolved);
  }
  if (!Array.isArray(resolved)) return null;
  let pageIndex = null;
  const pageRef = resolved[0];
  if (typeof pageRef === "number") {
    pageIndex = pageRef;
  } else if (pageRef && typeof pageRef === "object") {
    pageIndex = await pdfState.pdfDoc.getPageIndex(pageRef);
  }
  if (typeof pageIndex !== "number") return null;
  pageIndex = Math.max(0, Math.min(pdfState.pageCount - 1, pageIndex));
  const destType = resolved[1]?.name || resolved[1];
  let top = null;
  if (destType === "XYZ") {
    if (typeof resolved[3] === "number") top = resolved[3];
  } else if (destType === "FitH" || destType === "FitBH") {
    if (typeof resolved[2] === "number") top = resolved[2];
  }
  return { pageIndex, top, destType };
}

function navigateToDestination(pdfState, destination) {
  if (!pdfState || !destination) return;
  const pageData = pdfState.pages.find((p) => p.pageNum === destination.pageIndex + 1);
  if (!pageData) return;
  const viewerRect = elements.viewerArea.getBoundingClientRect();
  const pageRect = pageData.pageDiv.getBoundingClientRect();
  let target = elements.viewerArea.scrollTop + (pageRect.top - viewerRect.top);
  if (typeof destination.top === "number") {
    const [, vy] = pageData.viewport.convertToViewportPoint(0, destination.top);
    target += vy;
  }
  requestAnimationFrame(() => {
    elements.viewerArea.scrollTop = target;
  });
}

function captureReturnPoint() {
  const pdfState = getActivePdf();
  if (!pdfState) return null;
  const visible = getVisiblePages(pdfState);
  const pageIndex = visible[0] ? visible[0].pageNum - 1 : 0;
  return {
    pdfId: pdfState.id,
    scrollTop: elements.viewerArea.scrollTop,
    scrollLeft: elements.viewerArea.scrollLeft,
    pageIndex
  };
}

function navigateToReturnPoint(point) {
  if (!point) return;
  if (point.pdfId && point.pdfId !== state.activePdfId) {
    setActivePdf(point.pdfId);
  }
  requestAnimationFrame(() => {
    elements.viewerArea.scrollTop = point.scrollTop || 0;
    elements.viewerArea.scrollLeft = point.scrollLeft || 0;
  });
}

function navigateToPageIndex(
  pageIndex,
  pdfState,
  highlightTerm = "",
  matchIndex = null,
  matchStart = null,
  matchStartNoSpace = null
) {
  const targetPdf = pdfState || getActivePdf();
  if (!targetPdf) return;
  const pageData = targetPdf.pages[pageIndex];
  if (!pageData) return;
  const viewerRect = elements.viewerArea.getBoundingClientRect();
  const pageRect = pageData.pageDiv.getBoundingClientRect();
  const target = elements.viewerArea.scrollTop + (pageRect.top - viewerRect.top);
  elements.viewerArea.scrollTop = target;
  renderPage(targetPdf, pageData).then(() => {
    if (highlightTerm) {
      highlightSearchMatches(
        targetPdf,
        pageIndex,
        highlightTerm,
        matchIndex,
        matchStart,
        matchStartNoSpace
      );
    }
  });
  scheduleActivePageUpdate();
}

function getCurrentPageIndex(pdfState) {
  if (typeof state.activePageIndex === "number") return state.activePageIndex;
  const visible = getVisiblePages(pdfState);
  return visible[0] ? visible[0].pageNum - 1 : 0;
}

function jumpToPage(value) {
  const pdfState = getActivePdf();
  if (!pdfState || !elements.pageJumpInput) return;
  const pageNumber = parseInt(value, 10);
  if (!pageNumber || pageNumber < 1 || pageNumber > pdfState.pageCount) {
    elements.searchResults.innerHTML = `<div class="viewer-hint">Enter a page number between 1 and ${pdfState.pageCount}.</div>`;
    return;
  }
  navigateToPageIndex(pageNumber - 1, pdfState);
}

let searchRunning = false;
async function searchInActivePdf(query) {
  const pdfState = getActivePdf();
  if (!elements.searchResults) return;
  const term = (query || "").trim();
  elements.searchResults.innerHTML = "";
  clearSearchHighlights(pdfState);
  if (!pdfState || !term) {
    state.searchResults = [];
    state.searchTerm = "";
    state.activeSearchIndex = -1;
    updateSearchNavButtons();
    return;
  }
  if (searchRunning) return;
  searchRunning = true;
  elements.searchResults.innerHTML = `<div class="viewer-hint">Searching...</div>`;
  try {
    const results = [];
    const termLower = term.toLowerCase();
    const hasWhitespace = /\s/.test(termLower);
    const seen = new Set();
    for (const pageData of pdfState.pages) {
      const textRecord = await getPageTextRecord(pdfState, pageData);
      const text = textRecord.text || "";
      const textNoSpace = textRecord.textNoSpace || "";
      const noSpaceMap = textRecord.noSpaceMap || [];
      if (!text) continue;
      const lower = text.toLowerCase();
      let idx = lower.indexOf(termLower);
      let matchIndex = 0;
      while (idx !== -1) {
        const start = Math.max(0, idx - 24);
        const end = Math.min(text.length, idx + term.length + 24);
        const snippet = text.slice(start, end).replace(/\s+/g, " ").trim();
        const key = `t:${pageData.pageNum}:${idx}`;
        if (!seen.has(key)) {
          seen.add(key);
          results.push({
            pageIndex: pageData.pageNum - 1,
            snippet,
            matchIndex,
            matchStart: idx
          });
        }
        idx = lower.indexOf(termLower, idx + termLower.length);
        matchIndex += 1;
        if (results.length > 50) break;
      }
      if (!hasWhitespace && results.length <= 50 && textNoSpace) {
        const lowerNoSpace = textNoSpace.toLowerCase();
        let idxNoSpace = lowerNoSpace.indexOf(termLower);
        while (idxNoSpace !== -1) {
          const mappedIndex = noSpaceMap[idxNoSpace] ?? 0;
          if (text.slice(mappedIndex, mappedIndex + term.length).toLowerCase() !== termLower) {
            const start = Math.max(0, mappedIndex - 24);
            const end = Math.min(text.length, mappedIndex + term.length + 24);
            const snippet = text.slice(start, end).replace(/\s+/g, " ").trim();
            const key = `n:${pageData.pageNum}:${mappedIndex}`;
            if (!seen.has(key)) {
              seen.add(key);
              results.push({
                pageIndex: pageData.pageNum - 1,
                snippet,
                matchIndex: null,
                matchStart: mappedIndex,
                matchStartNoSpace: null
              });
            }
          }
          idxNoSpace = lowerNoSpace.indexOf(termLower, idxNoSpace + termLower.length);
          if (results.length > 50) break;
        }
      }
      if (results.length > 50) break;
    }
    renderSearchResults(results, term);
    state.searchResults = results;
    state.searchTerm = term;
    state.activeSearchIndex = results.length ? 0 : -1;
    updateSearchNavButtons();
    if (window.innerWidth < 960) {
      openSidebar();
    }
    if (document.querySelector(".app")?.classList.contains("search-open")) {
      closeSearchPanel();
    }
  } catch (error) {
    state.searchResults = [];
    state.searchTerm = term;
    state.activeSearchIndex = -1;
    updateSearchNavButtons();
    elements.searchResults.innerHTML = `<div class="viewer-hint">Search failed. Try again.</div>`;
  } finally {
    searchRunning = false;
  }
}

async function getPageText(pdfState, pageData) {
  const record = await getPageTextRecord(pdfState, pageData);
  return record.text;
}

async function getPageTextRecord(pdfState, pageData) {
  if (!pdfState.pageTextCache) pdfState.pageTextCache = {};
  if (pdfState.pageTextCache[pageData.pageNum]) {
    return pdfState.pageTextCache[pageData.pageNum];
  }
  const textContent = await pageData.page.getTextContent();
  const items = textContent.items.map((item) => item.str || "");
  const textParts = [];
  const noSpaceParts = [];
  const noSpaceMap = [];
  let textIndex = 0;
  items.forEach((item, idx) => {
    const str = item || "";
    for (let i = 0; i < str.length; i += 1) {
      const ch = str[i];
      textParts.push(ch);
      if (!/\s/.test(ch)) {
        noSpaceParts.push(ch);
        noSpaceMap.push(textIndex);
      }
      textIndex += 1;
    }
    if (idx < items.length - 1) {
      textParts.push(" ");
      textIndex += 1;
    }
  });
  const text = textParts.join("");
  const textNoSpace = noSpaceParts.join("");
  pdfState.pageTextCache[pageData.pageNum] = { text, items, textNoSpace, noSpaceMap };
  return pdfState.pageTextCache[pageData.pageNum];
}

let searchHighlightTimeout;
function clearSearchHighlights(pdfState) {
  if (!pdfState) return;
  pdfState.pages.forEach((pageData) => {
    pageData.textLayer?.querySelectorAll("span[data-search-original]").forEach((span) => {
      span.textContent = span.dataset.searchOriginal;
      delete span.dataset.searchOriginal;
    });
    pageData.textLayer?.querySelectorAll(".search-hit").forEach((span) => {
      span.classList.remove("search-hit");
    });
    pageData.pageDiv?.querySelectorAll(".search-hit-box").forEach((box) => box.remove());
  });
  if (searchHighlightTimeout) {
    clearTimeout(searchHighlightTimeout);
    searchHighlightTimeout = null;
  }
}

async function highlightSearchMatches(
  pdfState,
  pageIndex,
  term,
  matchIndex = null,
  matchStart = null,
  matchStartNoSpace = null
) {
  if (!pdfState || !term) return;
  const pageData = pdfState.pages[pageIndex];
  if (!pageData) return;
  await renderPage(pdfState, pageData);
  clearSearchHighlights(pdfState);
  const termLower = term.toLowerCase();
  const spans = pageData.textLayer
    ? Array.from(pageData.textLayer.querySelectorAll("span"))
    : [];
  let matched = false;
  let firstMatchRect = null;
  const countOccurrences = (text, needle) => {
    if (!text || !needle) return 0;
    let count = 0;
    let start = 0;
    let idx = text.indexOf(needle, start);
    while (idx !== -1) {
      count += 1;
      start = idx + needle.length;
      idx = text.indexOf(needle, start);
    }
    return count;
  };
  const spanIndex = buildSpanIndex(spans);
  if (matchStart === null && matchIndex !== null) {
    matchStart = findNthMatchIndex(spanIndex.combinedText.toLowerCase(), termLower, matchIndex);
  }
  const applyRangeHighlight = (startIndex, useNoSpace) => {
    if (startIndex === null) return false;
    const matchEnd = startIndex + term.length;
    let applied = false;
    spanIndex.entries.forEach((entry) => {
      const entryStart = useNoSpace ? entry.startNoSpace : entry.start;
      const entryEnd = useNoSpace ? entry.endNoSpace : entry.end;
      if (entryEnd < startIndex || entryStart > matchEnd) return;
      const localStart = Math.max(0, startIndex - entryStart);
      const localEnd = Math.min(entry.text.length, matchEnd - entryStart);
      if (localEnd <= localStart) return;
      const mark = highlightSpanRange(entry.span, localStart, localEnd);
      if (!firstMatchRect) {
        const rectTarget = mark || entry.span;
        firstMatchRect = rectTarget.getBoundingClientRect();
      }
      applied = true;
    });
    return applied;
  };
  if (matchStartNoSpace !== null) {
    matched = applyRangeHighlight(matchStartNoSpace, true);
  } else if (matchStart !== null) {
    matched = applyRangeHighlight(matchStart, false);
    if (!matched && matchIndex !== null) {
      matchStart = findNthMatchIndex(spanIndex.combinedText.toLowerCase(), termLower, matchIndex);
      matched = applyRangeHighlight(matchStart, false);
    }
  } else {
    let currentIndex = 0;
    spans.forEach((span) => {
      const text = (span.textContent || "").toLowerCase();
      if (!text.includes(termLower)) return;
      const occurrences = countOccurrences(text, termLower);
      if (matchIndex === null) {
        span.classList.add("search-hit");
        if (!firstMatchRect) {
          firstMatchRect = span.getBoundingClientRect();
        }
        matched = true;
        return;
      }
      if (matchIndex >= currentIndex && matchIndex < currentIndex + occurrences) {
        span.classList.add("search-hit");
        firstMatchRect = span.getBoundingClientRect();
        matched = true;
      }
      currentIndex += occurrences;
    });
  }
  if (!matched && pageData.ocrSpans?.length) {
    let ocrIndex = 0;
    pageData.ocrSpans.forEach((span) => {
      if (!span.text || !span.text.toLowerCase().includes(termLower)) return;
      const occurrences = countOccurrences(span.text.toLowerCase(), termLower);
      if (
        matchStart !== null &&
        !(matchStart >= ocrIndex && matchStart < ocrIndex + occurrences * term.length)
      ) {
        ocrIndex += occurrences;
        return;
      }
      if (matchIndex !== null && !(matchIndex >= ocrIndex && matchIndex < ocrIndex + occurrences)) {
        ocrIndex += occurrences;
        return;
      }
      const rect = pdfBoxToViewportRect(pageData, span.bbox);
      const box = document.createElement("div");
      box.className = "search-hit-box";
      box.style.left = `${rect.left}px`;
      box.style.top = `${rect.top}px`;
      box.style.width = `${rect.width}px`;
      box.style.height = `${rect.height}px`;
      pageData.pageDiv.appendChild(box);
      if (!firstMatchRect) {
        const pageRect = pageData.pageDiv.getBoundingClientRect();
        firstMatchRect = {
          top: pageRect.top + rect.top,
          bottom: pageRect.top + rect.top + rect.height
        };
      }
      matched = true;
      ocrIndex += occurrences;
    });
  }
  if (firstMatchRect) {
    const viewerRect = elements.viewerArea.getBoundingClientRect();
    const offset = 80;
    if (firstMatchRect.top < viewerRect.top || firstMatchRect.bottom > viewerRect.bottom) {
      elements.viewerArea.scrollTop += firstMatchRect.top - viewerRect.top - offset;
    }
  }
  searchHighlightTimeout = setTimeout(() => clearSearchHighlights(pdfState), 3600);
}

function pdfBoxToViewportRect(pageData, bbox) {
  const [vx, vy] = pageData.viewport.convertToViewportPoint(bbox.x, bbox.y + bbox.height);
  const [vx2, vy2] = pageData.viewport.convertToViewportPoint(
    bbox.x + bbox.width,
    bbox.y
  );
  return {
    left: Math.min(vx, vx2),
    top: Math.min(vy, vy2),
    width: Math.abs(vx2 - vx),
    height: Math.abs(vy2 - vy)
  };
}

function renderSearchResults(results, term) {
  if (!elements.searchResults) return;
  if (!results.length) {
    elements.searchResults.innerHTML = `<div class="viewer-hint">No results for "${escapeHtml(
      term
    )}".</div>`;
    updateSearchNavButtons();
    return;
  }
  elements.searchResults.innerHTML = "";
  results.forEach((result) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "search-result";
    button.textContent = `Page ${result.pageIndex + 1} · ${result.snippet}`;
    button.addEventListener("click", () => {
      const pdfState = getActivePdf();
      state.activeSearchIndex = results.indexOf(result);
      updateSearchNavButtons();
      navigateToPageIndex(
        result.pageIndex,
        pdfState,
        term,
        result.matchIndex,
        result.matchStart,
        result.matchStartNoSpace
      );
    });
    elements.searchResults.appendChild(button);
  });
}

function updateSearchNavButtons() {
  const disabled = !state.searchResults || state.searchResults.length === 0;
  if (elements.searchPrev) elements.searchPrev.disabled = disabled;
  if (elements.searchNext) elements.searchNext.disabled = disabled;
}

function goToSearchResult(delta = 1) {
  if (!state.searchResults || !state.searchResults.length) {
    notify("Search", "No matches yet.", { type: "info", duration: 1600 });
    return;
  }
  const total = state.searchResults.length;
  let index = state.activeSearchIndex;
  if (typeof index !== "number" || index < 0) index = 0;
  index = (index + delta + total) % total;
  const result = state.searchResults[index];
  state.activeSearchIndex = index;
  updateSearchNavButtons();
  navigateToPageIndex(
    result.pageIndex,
    getActivePdf(),
    state.searchTerm,
    result.matchIndex,
    result.matchStart,
    result.matchStartNoSpace
  );
}

function buildSpanIndex(spans) {
  let index = 0;
  let indexNoSpace = 0;
  const entries = spans.map((span) => {
    const text = span.textContent || "";
    const nonSpaceLength = text.replace(/\s/g, "").length;
    const start = index;
    const end = start + text.length;
    const startNoSpace = indexNoSpace;
    const endNoSpace = startNoSpace + nonSpaceLength;
    index = end + 1;
    indexNoSpace = endNoSpace;
    return { span, text, start, end, startNoSpace, endNoSpace };
  });
  const combinedText = entries.map((entry) => entry.text).join(" ");
  const combinedNoSpace = entries.map((entry) => entry.text).join("").replace(/\s/g, "");
  return { entries, combinedText, combinedNoSpace };
}

function highlightSpanRange(span, start, end) {
  if (!span || start >= end) return;
  if (!span.dataset.searchOriginal) {
    span.dataset.searchOriginal = span.textContent || "";
  }
  const text = span.dataset.searchOriginal;
  const before = text.slice(0, start);
  const match = text.slice(start, end);
  const after = text.slice(end);
  span.innerHTML = "";
  if (before) {
    const beforeNode = document.createElement("span");
    beforeNode.textContent = before;
    span.appendChild(beforeNode);
  }
  if (match) {
    const mark = document.createElement("span");
    mark.className = "search-hit-fragment";
    mark.textContent = match;
    span.appendChild(mark);
  }
  if (after) {
    const afterNode = document.createElement("span");
    afterNode.textContent = after;
    span.appendChild(afterNode);
  }
  return span.querySelector(".search-hit-fragment");
}

function findNthMatchIndex(text, needle, targetIndex) {
  if (!text || !needle || targetIndex == null) return null;
  let idx = text.indexOf(needle);
  let current = 0;
  while (idx !== -1) {
    if (current === targetIndex) return idx;
    current += 1;
    idx = text.indexOf(needle, idx + needle.length);
  }
  return null;
}

async function updateNavigationForActivePdf() {
  const pdfState = getActivePdf();
  if (!elements.outlineList || !elements.thumbnailList) return;
  elements.searchResults.innerHTML = "";
  clearSearchHighlights(pdfState);
  state.searchResults = [];
  state.searchTerm = "";
  state.activeSearchIndex = -1;
  updateSearchNavButtons();
  if (!pdfState) {
    elements.outlineList.innerHTML = `<div class="viewer-hint">No PDF loaded.</div>`;
    elements.thumbnailList.innerHTML = "";
    if (elements.pageJumpInput) {
      elements.pageJumpInput.value = "";
      elements.pageJumpInput.placeholder = "Page";
    }
    if (elements.pageJumpTotal) {
      elements.pageJumpTotal.textContent = "/ 0";
    }
    return;
  }
  if (elements.pageJumpInput) {
    elements.pageJumpInput.max = `${pdfState.pageCount}`;
    elements.pageJumpInput.placeholder = "Page";
  }
  if (elements.pageJumpTotal) {
    elements.pageJumpTotal.textContent = `/ ${pdfState.pageCount}`;
  }
  await loadOutline(pdfState);
  if (state.navTab === "thumbs") {
    setupThumbnailStrip(pdfState);
  } else {
    elements.thumbnailList.innerHTML = "";
  }
}

function setNavTab(tab) {
  state.navTab = tab;
  if (elements.outlineTab && elements.thumbTab) {
    elements.outlineTab.classList.toggle("active", tab === "outline");
    elements.thumbTab.classList.toggle("active", tab === "thumbs");
  }
  if (elements.outlinePanel && elements.thumbPanel) {
    elements.outlinePanel.classList.toggle("active", tab === "outline");
    elements.thumbPanel.classList.toggle("active", tab === "thumbs");
  }
  if (tab === "thumbs") {
    setupThumbnailStrip(getActivePdf());
  } else {
    clearThumbnailStrip(getActivePdf());
  }
}

async function loadOutline(pdfState) {
  if (!pdfState) return;
  if (pdfState.outlineLoaded) {
    renderOutlineList(pdfState);
    return;
  }
  elements.outlineList.innerHTML = `<div class="viewer-hint">Loading outline...</div>`;
  try {
    const outline = await pdfState.pdfDoc.getOutline();
    pdfState.outline = outline || [];
  } catch (error) {
    pdfState.outline = [];
  }
  pdfState.outlineLoaded = true;
  renderOutlineList(pdfState);
}

function renderOutlineList(pdfState) {
  if (!elements.outlineList) return;
  const outline = pdfState.outline || [];
  if (!outline.length) {
    elements.outlineList.innerHTML = `<div class="viewer-hint">No outline found.</div>`;
    return;
  }
  elements.outlineList.innerHTML = "";
  outline.forEach((item) => renderOutlineItem(pdfState, item, 0));
}

function renderOutlineItem(pdfState, item, depth) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "outline-item";
  button.style.paddingLeft = `${8 + depth * 12}px`;
  button.textContent = item.title || "Untitled";
  button.addEventListener("click", async () => {
    if (item.url) {
      const safeUrl = sanitizeExternalUrl(item.url);
      if (safeUrl) {
        window.open(safeUrl, "_blank", "noopener,noreferrer");
      } else {
        notify("PDF Link", "Blocked unsafe outline URL.", { type: "error", duration: 3500 });
      }
      return;
    }
    const destination = await resolveDestination(pdfState, item.dest);
    if (!destination) return;
    navigateToDestination(pdfState, destination);
  });
  elements.outlineList.appendChild(button);
  if (item.items && item.items.length) {
    item.items.forEach((child) => renderOutlineItem(pdfState, child, depth + 1));
  }
}

const thumbnailRenderQueue = {
  queue: [],
  processing: false
};

function scheduleThumbnailRender(pdfState, pageData) {
  if (!pdfState || !pageData || pageData.thumbRendered || pageData.thumbRendering || !pageData.thumbCanvas) return;
  const existing = thumbnailRenderQueue.queue.find((item) => item.pageData === pageData);
  if (existing) return;
  thumbnailRenderQueue.queue.push({ pdfState, pageData });
  processThumbnailQueue();
}

function processThumbnailQueue() {
  if (thumbnailRenderQueue.processing) return;
  const next = thumbnailRenderQueue.queue.shift();
  if (!next) return;
  thumbnailRenderQueue.processing = true;
  const doRender = () => {
    renderThumbnail(next.pdfState, next.pageData).finally(() => {
      thumbnailRenderQueue.processing = false;
      processThumbnailQueue();
    });
  };
  if (typeof requestIdleCallback !== "undefined") {
    requestIdleCallback(() => doRender(), { timeout: 200 });
  } else {
    setTimeout(doRender, 16);
  }
}

function setupThumbnailStrip(pdfState) {
  if (!elements.thumbnailList || !pdfState) return;
  elements.thumbnailList.innerHTML = "";
  thumbnailRenderQueue.queue = [];
  if (pdfState.thumbnailObserver) {
    pdfState.thumbnailObserver.disconnect();
    pdfState.thumbnailObserver = null;
  }
  if (!("IntersectionObserver" in window)) {
    pdfState.pages.forEach((pageData) => renderThumbnail(pdfState, pageData));
    return;
  }
  pdfState.pages.forEach((pageData, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "thumb-item";
    button.dataset.pageIndex = `${index}`;
    const canvas = document.createElement("canvas");
    const label = document.createElement("div");
    label.textContent = `Page ${index + 1}`;
    button.appendChild(canvas);
    button.appendChild(label);
    button.addEventListener("click", () => navigateToPageIndex(index, pdfState));
    elements.thumbnailList.appendChild(button);
    pageData.thumbCanvas = canvas;
    pageData.thumbRendered = false;
    pageData.thumbRendering = false;
  });
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const index = Number(entry.target.dataset.pageIndex);
        const pageData = pdfState.pages[index];
        if (pageData) scheduleThumbnailRender(pdfState, pageData);
      });
    },
    {
      root: elements.thumbnailList,
      rootMargin: "400px 0px",
      threshold: [0, 0.1]
    }
  );
  pdfState.thumbnailObserver = observer;
  elements.thumbnailList.querySelectorAll(".thumb-item").forEach((item) => observer.observe(item));
  updateActivePageIndicator();
}

function clearThumbnailStrip(pdfState) {
  if (elements.thumbnailList) {
    elements.thumbnailList.innerHTML = "";
  }
  if (pdfState?.thumbnailObserver) {
    pdfState.thumbnailObserver.disconnect();
    pdfState.thumbnailObserver = null;
  }
}

async function renderThumbnail(pdfState, pageData) {
  if (!pageData || pageData.thumbRendered || pageData.thumbRendering || !pageData.thumbCanvas) return;
  pageData.thumbRendering = true;
  try {
    const baseViewport = pageData.page.getViewport({ scale: 1 });
    const maxWidth = 140;
    const scale = Math.min(0.25, maxWidth / baseViewport.width);
    const viewport = pageData.page.getViewport({ scale });
    const canvas = pageData.thumbCanvas;
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext("2d");
    await pageData.page.render({ canvasContext: context, viewport }).promise;
    pageData.thumbRendered = true;
  } finally {
    pageData.thumbRendering = false;
  }
}

let pageIndicatorRaf = null;
function scheduleActivePageUpdate() {
  if (pageIndicatorRaf) return;
  pageIndicatorRaf = requestAnimationFrame(() => {
    pageIndicatorRaf = null;
    updateActivePageIndicator();
  });
}

function updateActivePageIndicator() {
  const pdfState = getActivePdf();
  if (!pdfState) return;
  const visible = getVisiblePages(pdfState);
  if (!visible.length) return;
  const pageIndex = visible[0].pageNum - 1;
  if (elements.pageJumpInput) {
    elements.pageJumpInput.value = `${pageIndex + 1}`;
  }
  if (state.activePageIndex === pageIndex) return;
  state.activePageIndex = pageIndex;
  if (!elements.thumbnailList) return;
  elements.thumbnailList.querySelectorAll(".thumb-item").forEach((item) => {
    item.classList.toggle("active", Number(item.dataset.pageIndex) === pageIndex);
  });
}

let ocrLoader = null;
const OCR_SCRIPT_URL = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
const OCR_WORKER_URL = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js";
const OCR_CORE_URL = "https://cdn.jsdelivr.net/npm/tesseract.js-core@5.0.0/tesseract-core.wasm.js";
const OCR_LANG_PATH = "https://tessdata.projectnaptha.com/4.0.0";

async function loadTesseract() {
  if (window.Tesseract) return window.Tesseract;
  if (ocrLoader) return ocrLoader;
  ocrLoader = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = OCR_SCRIPT_URL;
    script.onload = () => resolve(window.Tesseract);
    script.onerror = () => reject(new Error("Failed to load OCR library."));
    document.head.appendChild(script);
  });
  return ocrLoader;
}

async function runOcrOnVisiblePages() {
  const pdfState = getActivePdf();
  if (!pdfState) {
    notify("OCR", "No PDF loaded.");
    return;
  }
  if (!state.settings.ocrEnabled) {
    openModal({
      title: "OCR Disabled",
      body: "<p>Enable OCR in settings to process scanned pages.</p>",
      actions: [{ label: "Close", variant: "secondary", onClick: closeModal }]
    });
    return;
  }
  const visiblePages = getVisiblePages(pdfState);
  if (!visiblePages.length) {
    notify("OCR", "No visible pages to process.");
    return;
  }
  setLoading(true, "Running OCR...");
  let processed = 0;
  let worker = null;
  try {
    const Tesseract = await loadTesseract();
    worker = await Tesseract.createWorker("eng", 1, {
      logger: () => { },
      workerPath: OCR_WORKER_URL,
      corePath: OCR_CORE_URL,
      langPath: OCR_LANG_PATH
    });
    for (const pageData of visiblePages) {
      if (pageData.ocrSpans?.length) continue;
      if (!pageData.canvas) {
        await renderPage(pdfState, pageData);
      }
      if (!pageData.canvas) continue;
      // Only OCR pages that do not already expose selectable text.
      if (!pageData.textLayer?.classList.contains("no-text")) continue;
      const dataUrl = pageData.canvas.toDataURL("image/png");
      const { data } = await worker.recognize(dataUrl);
      const viewport = pageData.viewport;
      const scale = pdfState.scale || 1;
      pageData.ocrSpans = extractOcrSpans(data?.words || [], viewport, scale);
      processed += 1;
    }
    if (processed) {
      persistPdfState(pdfState);
    }
    notify("OCR", `Processed ${processed} page${processed === 1 ? "" : "s"}.`);
  } catch (error) {
    notify("OCR", `OCR failed: ${error.message || "Unknown error"}`, {
      type: "error",
      duration: 4000
    });
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch (error) {
        // Ignore worker cleanup failures.
      }
    }
    setLoading(false);
  }
}

function extractOcrSpans(words, viewport, scale) {
  return words
    .filter((word) => word.text && word.bbox)
    .map((word) => {
      const { x0, y0, x1, y1 } = word.bbox;
      const [sx, sy] = viewport.convertToPdfPoint(x0 / scale, y0 / scale);
      const [sx2, sy2] = viewport.convertToPdfPoint(x1 / scale, y1 / scale);
      return {
        text: word.text,
        bbox: {
          x: Math.min(sx, sx2),
          y: Math.min(sy, sy2),
          width: Math.abs(sx2 - sx),
          height: Math.abs(sy2 - sy)
        }
      };
    });
}

let renderTimeout;
let persistTimeout;
function setPdfScale(pdfState, scale, fromUser = false, anchor = null, preservePreview = false) {
  if (!pdfState) return;
  if (fromUser) pdfState.autoFit = false;
  if (!preservePreview) {
    clearPreviewScale(pdfState);
  }
  const prevScale = pdfState.scale || 1;
  const nextScale = Math.min(3.5, Math.max(0.4, scale));
  const ratio = nextScale / (prevScale || nextScale);
  const startLeft = elements.viewerArea.scrollLeft;
  const startTop = elements.viewerArea.scrollTop;
  const anchorX = anchor?.x ?? elements.viewerArea.clientWidth / 2;
  const anchorY = anchor?.y ?? elements.viewerArea.clientHeight / 2;
  const targetLeft = (startLeft + anchorX) * ratio - anchorX;
  const targetTop = (startTop + anchorY) * ratio - anchorY;
  pdfState.scale = nextScale;
  clearTimeout(renderTimeout);
  updateZoomLabel(pdfState);
  renderTimeout = setTimeout(() => {
    renderPdf(pdfState).then(() => {
      elements.viewerArea.scrollLeft = targetLeft;
      elements.viewerArea.scrollTop = targetTop;
      if (preservePreview) clearPreviewScale(pdfState);
      if (state.adjustMode) {
        renderOverlays(pdfState);
      }
    });
  }, 180);
  if (fromUser) {
    clearTimeout(persistTimeout);
    persistTimeout = setTimeout(() => persistPdfState(pdfState), 400);
  }
}

function updateZoomLabel(pdfState) {
  if (!elements.zoomInput || !pdfState) return;
  const pct = Math.round(pdfState.scale * 100);
  elements.zoomInput.value = `${pct}`;
}

function setPreviewScale(pdfState, scale, origin = null) {
  if (!pdfState) return;
  const clamped = Math.min(3.5, Math.max(0.4, scale));
  const ratio = clamped / (pdfState.scale || 1);
  pdfState.previewScale = clamped;
  pdfState.container.style.transformOrigin = origin
    ? `${origin.x}px ${origin.y}px`
    : "top center";
  pdfState.container.style.transform = `scale(${ratio})`;
  updateZoomLabel({ scale: clamped });
}

function clearPreviewScale(pdfState) {
  if (!pdfState || !pdfState.previewScale) return;
  pdfState.previewScale = null;
  pdfState.container.style.transform = "";
  pdfState.container.style.transformOrigin = "";
}

function switchPdfByDelta(delta) {
  if (state.pdfs.length < 2) return;
  const currentIndex = state.pdfs.findIndex((pdf) => pdf.id === state.activePdfId);
  if (currentIndex < 0) return;
  const nextIndex = (currentIndex + delta + state.pdfs.length) % state.pdfs.length;
  setActivePdf(state.pdfs[nextIndex].id);
}

function getVisiblePages(pdfState) {
  const containerRect = elements.viewerArea.getBoundingClientRect();
  return pdfState.pages.filter((p) => {
    const rect = p.pageDiv.getBoundingClientRect();
    return rect.bottom > containerRect.top && rect.top < containerRect.bottom;
  });
}

function cleanupPageRendering(pdfState, visible = []) {
  if (!pdfState || !pdfState.pages.length) return;
  if (!visible.length) return;
  const minPage = Math.max(1, visible[0].pageNum - 5);
  const maxPage = Math.min(pdfState.pageCount, visible[visible.length - 1].pageNum + 5);
  const now = Date.now();
  const recentThreshold = 30000;
  pdfState.pages.forEach((pageData) => {
    if (pageData.pageNum >= minPage && pageData.pageNum <= maxPage) return;
    if (pageData.rendering) return;
    const lastViewed = renderQueue.recentlyViewed.get(pageData.pageNum);
    if (lastViewed && now - lastViewed < recentThreshold) return;
    if (!pageData.canvas && !pageData.textLayer && !pageData.annotationLayer) return;
    if (pageData.canvas) {
      pageData.canvas.remove();
      pageData.canvas = null;
    }
    if (pageData.textLayer) {
      pageData.textLayer.remove();
      pageData.textLayer = null;
    }
    if (pageData.annotationLayer) {
      pageData.annotationLayer.remove();
      pageData.annotationLayer = null;
    }
    pageData.rendered = false;
    pageData.rendering = false;
    pageData.pageDiv.dataset.rendered = "false";
    renderQueue.recentlyViewed.delete(pageData.pageNum);
  });
}

function getPageSnapshot(pageData) {
  const rect = pageData.pageDiv.getBoundingClientRect();
  const containerRect = elements.viewerArea.getBoundingClientRect();
  const intersection = {
    left: Math.max(rect.left, containerRect.left),
    top: Math.max(rect.top, containerRect.top),
    right: Math.min(rect.right, containerRect.right),
    bottom: Math.min(rect.bottom, containerRect.bottom)
  };
  const width = Math.max(0, intersection.right - intersection.left);
  const height = Math.max(0, intersection.bottom - intersection.top);
  const offsetX = intersection.left - rect.left;
  const offsetY = intersection.top - rect.top;
  const [pdfX, pdfY] = pageData.viewport.convertToPdfPoint(offsetX, offsetY);
  const [pdfX2, pdfY2] = pageData.viewport.convertToPdfPoint(offsetX + width, offsetY + height);

  const spans = (pageData.textLayer
    ? Array.from(pageData.textLayer.querySelectorAll("span"))
    : [])
    .map((span) => {
      const spanRect = span.getBoundingClientRect();
      const containerRectInner = elements.viewerArea.getBoundingClientRect();
      const visible =
        spanRect.bottom > containerRectInner.top &&
        spanRect.top < containerRectInner.bottom &&
        spanRect.right > containerRectInner.left &&
        spanRect.left < containerRectInner.right;
      if (!visible) return null;
      const relX = spanRect.left - rect.left;
      const relY = spanRect.top - rect.top;
      const [sx, sy] = pageData.viewport.convertToPdfPoint(relX, relY);
      const [sx2, sy2] = pageData.viewport.convertToPdfPoint(
        relX + spanRect.width,
        relY + spanRect.height
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
  const ocrSpans = !spans.length && pageData.ocrSpans ? pageData.ocrSpans : [];

  return {
    pageIndex: pageData.pageNum - 1,
    viewportBox: {
      x: Math.min(pdfX, pdfX2),
      y: Math.min(pdfY, pdfY2),
      width: Math.abs(pdfX2 - pdfX),
      height: Math.abs(pdfY2 - pdfY)
    },
    spans: spans.length ? spans : ocrSpans,
    ocrUsed: !!ocrSpans.length
  };
}

async function captureSnapshot() {
  const pdfState = getActivePdf();
  if (!pdfState) return null;
  await renderVisiblePages(pdfState);
  const visiblePages = getVisiblePages(pdfState);
  return {
    timestamp: Date.now(),
    pdfId: pdfState.id,
    scrollTop: elements.viewerArea.scrollTop,
    pages: visiblePages.map(getPageSnapshot)
  };
}

function showViewportMarkers(snapshot) {
  if (!snapshot) return;
  const pdfState = getActivePdf();
  if (!pdfState) return;
  pdfState.pages.forEach((p) => {
    const existing = p.pageDiv.querySelector(".viewport-marker");
    if (existing) existing.remove();
  });
  snapshot.pages.forEach((pageSnap) => {
    const pageData = pdfState.pages.find((p) => p.pageNum - 1 === pageSnap.pageIndex);
    if (!pageData) return;
    const [vx, vy] = pageData.viewport.convertToViewportPoint(
      pageSnap.viewportBox.x,
      pageSnap.viewportBox.y + pageSnap.viewportBox.height
    );
    const [vx2, vy2] = pageData.viewport.convertToViewportPoint(
      pageSnap.viewportBox.x + pageSnap.viewportBox.width,
      pageSnap.viewportBox.y
    );
    const marker = document.createElement("div");
    marker.className = "viewport-marker";
    marker.style.left = `${Math.min(vx, vx2)}px`;
    marker.style.top = `${Math.min(vy, vy2)}px`;
    marker.style.width = `${Math.abs(vx2 - vx)}px`;
    marker.style.height = `${Math.abs(vy2 - vy)}px`;
    pageData.pageDiv.appendChild(marker);
  });
}

async function restorePdfState(stored) {
  try {
    if (!stored?.originalBytes) return null;
    const id = stored.id || crypto.randomUUID();
    const originalBuffer = cloneArrayBuffer(stored.originalBytes);
    if (!originalBuffer.byteLength) {
      deletePdfState(id);
      return null;
    }
    const bytesForPdfjs = cloneUint8(originalBuffer);
    if (!bytesForPdfjs.byteLength) {
      deletePdfState(id);
      return null;
    }
    const pdfDoc = await pdfjsLib.getDocument({
      data: bytesForPdfjs,
      disableAutoFetch: true,
      disableStream: true,
      stopAtErrors: false
    }).promise;
    const fitScale = await getFitScale(pdfDoc);
    const scale =
      stored.autoFit === false && stored.scale ? stored.scale : fitScale;
    const container = document.createElement("div");
    container.dataset.id = id;
    elements.viewerArea.appendChild(container);
    const workingBytes = cloneArrayBuffer(originalBuffer);
    const pdfState = {
      id,
      name: stored.name || "Restored PDF",
      bytes: workingBytes.byteLength ? workingBytes : originalBuffer,
      originalBytes: originalBuffer,
      pdfDoc,
      container,
      pageCount: pdfDoc.numPages,
      pages: [],
      annotationCount: stored.annotationCount || 0,
      annotations: stored.annotations || [],
      scale,
      autoFit: stored.autoFit ?? true,
      textItemCount: 0,
      restoring: true
    };
    state.pdfs.push(pdfState);
    updateEmptyStateVisibility();
    if (pdfState.annotations.length) {
      await applyAllAnnotations(pdfState, {
        invertForView: document.documentElement.classList.contains("pdf-invert")
      });
    } else {
      await renderPdf(pdfState);
    }
    pdfState.restoring = false;
    if (stored.ocrSpans && typeof stored.ocrSpans === "object") {
      Object.entries(stored.ocrSpans).forEach(([idx, spans]) => {
        const pageIndex = Number(idx);
        if (pdfState.pages[pageIndex] && Array.isArray(spans)) {
          pdfState.pages[pageIndex].ocrSpans = spans;
        }
      });
    }
    addPdfCard(pdfState);
    return pdfState;
  } catch (error) {
    if (stored?.id) deletePdfState(stored.id);
    notify("Restore", "Failed to restore a cached PDF. Please re-upload.", {
      type: "error",
      duration: 5000
    });
    return null;
  }
}
