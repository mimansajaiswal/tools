function bindInteractions() {
  elements.pdfInput.addEventListener("change", (event) => handlePdfUpload(event.target.files));
  elements.uploadPdf.addEventListener("click", () => {
    closePdfMenu();
    elements.pdfInput.click();
  });
  if (elements.pdfMenuToggle) {
    elements.pdfMenuToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      togglePdfMenu();
    });
  }
  if (elements.overflowToggle) {
    elements.overflowToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleOverflowMenu();
    });
  }
  elements.settingsToggle.addEventListener("click", toggleSettings);
  elements.logsToggle.addEventListener("click", toggleLogs);
  elements.logsClose.addEventListener("click", closeLogs);
  document.addEventListener("click", (event) => {
    if (!elements.settingsPanel.classList.contains("open")) return;
    const isToggle = elements.settingsToggle.contains(event.target);
    const isPanel = elements.settingsPanel.contains(event.target);
    if (!isToggle && !isPanel) {
      elements.settingsPanel.classList.remove("open");
      elements.settingsScrim.classList.remove("active");
    }
  });
  document.addEventListener("click", (event) => {
    if (!elements.jumpBack || !elements.jumpBack.classList.contains("open")) return;
    if (!elements.jumpBack.contains(event.target)) hideJumpBack();
  });
  document.addEventListener("click", (event) => {
    if (elements.pdfMenu?.classList.contains("open")) {
      const insideMenu = elements.pdfMenu.contains(event.target);
      const isToggle = elements.pdfMenuToggle?.contains(event.target);
      if (!insideMenu && !isToggle) closePdfMenu();
    }
    if (elements.overflowMenu?.classList.contains("open")) {
      const insideMenu = elements.overflowMenu.contains(event.target);
      const isToggle = elements.overflowToggle?.contains(event.target);
      if (!insideMenu && !isToggle) closeOverflowMenu();
    }
  });
  elements.settingsScrim.addEventListener("click", () => {
    elements.settingsPanel.classList.remove("open");
    elements.settingsScrim.classList.remove("active");
  });
  elements.logsScrim.addEventListener("click", closeLogs);
  if (elements.jumpBackReturn) {
    elements.jumpBackReturn.addEventListener("click", () => {
      if (!state.linkReturn) return;
      navigateToReturnPoint(state.linkReturn);
      hideJumpBack();
    });
  }
  if (elements.jumpBackClose) {
    elements.jumpBackClose.addEventListener("click", hideJumpBack);
  }
  elements.saveSettings.addEventListener("click", saveSettings);
  elements.themeToggle.addEventListener("click", cycleTheme);
  elements.themeTogglePanel.addEventListener("click", cycleTheme);
  elements.clearOffline.addEventListener("click", () => {
    if (db) {
      const txQueue = db.transaction("queue", "readwrite");
      txQueue.objectStore("queue").clear();
      const txPdf = db.transaction("pdfs", "readwrite");
      txPdf.objectStore("pdfs").clear();
      const txSession = db.transaction("session", "readwrite");
      txSession.objectStore("session").clear();
      const txLogs = db.transaction("logs", "readwrite");
      txLogs.objectStore("logs").clear();
    }
    state.queue = [];
    state.logs = [];
    state.sessionState = null;
    updateQueueIndicator();
    updateLogIndicator();
    renderLogs();
    updateStorageUsage();
    if (window.caches && caches.keys) {
      caches.keys().then((keys) => keys.forEach((key) => caches.delete(key)));
    }
    notify("Storage", "Offline data cleared.");
  });
  elements.micButton.addEventListener("click", () => {
    if (state.recording) stopRecordingSession();
    else startRecordingSession();
  });
  elements.processBatch.addEventListener("click", processBatchQueue);
  if (elements.processBatchMenu) {
    elements.processBatchMenu.addEventListener("click", () => {
      closeOverflowMenu();
      processBatchQueue();
    });
  }
  elements.tapFocusButton.addEventListener("click", () => {
    state.settings.tapFocus = !state.settings.tapFocus;
    setTapFocusButtonState(state.settings.tapFocus);
    persistSettings();
  });
  if (elements.modeRealtime) {
    elements.modeRealtime.addEventListener("click", () => setMode("realtime"));
  }
  if (elements.modeBatch) {
    elements.modeBatch.addEventListener("click", () => setMode("batch"));
  }
  elements.mockToggle.addEventListener("change", (event) => {
    state.settings.mockAI = event.target.checked;
    persistSettings();
  });
  if (elements.ocrToggle) {
    elements.ocrToggle.addEventListener("change", (event) => {
      state.settings.ocrEnabled = event.target.checked;
      persistSettings();
    });
  }
  if (elements.ocrRun) {
    elements.ocrRun.addEventListener("click", () => {
      runOcrOnVisiblePages();
    });
  }
  elements.toggleAdjust.addEventListener("click", toggleAdjustMode);
  elements.commitAdjust.addEventListener("click", commitAdjustments);
  elements.snapToText.addEventListener("click", snapSelectedToText);
  elements.freeBox.addEventListener("click", () => {
    const pdfState = getActivePdf();
    const annotation = pdfState?.annotations.find((a) => a.id === state.selectedAnnotationId);
    if (!annotation) {
      notify("Adjust Mode", "Select an annotation to unlock free bbox.");
      return;
    }
    annotation.mode = "bbox";
    renderOverlays(pdfState);
    notify("Adjust Mode", "Free bbox enabled for selected annotation.");
  });
  elements.downloadSingle.addEventListener("click", () => {
    closeOverflowMenu();
    downloadActive();
  });
  elements.downloadMerged.addEventListener("click", () => {
    closeOverflowMenu();
    downloadMerged();
  });
  elements.downloadZip.addEventListener("click", () => {
    closeOverflowMenu();
    downloadZip();
  });
  if (elements.pageJumpGo) {
    elements.pageJumpGo.addEventListener("click", () => {
      jumpToPage(elements.pageJumpInput.value);
    });
  }
  if (elements.pageJumpInput) {
    elements.pageJumpInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        jumpToPage(elements.pageJumpInput.value);
      }
    });
  }
  if (elements.searchGo) {
    elements.searchGo.addEventListener("click", () => {
      searchInActivePdf(elements.searchInput.value);
    });
  }
  if (elements.searchInput) {
    elements.searchInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        searchInActivePdf(elements.searchInput.value);
      }
    });
  }
  if (elements.outlineTab && elements.thumbTab) {
    elements.outlineTab.addEventListener("click", () => setNavTab("outline"));
    elements.thumbTab.addEventListener("click", () => setNavTab("thumbs"));
  }
  elements.toggleSidebar.addEventListener("click", () => {
    const app = document.querySelector(".app");
    if (window.innerWidth < 960) {
      app.classList.toggle("sidebar-open");
      elements.sidebarScrim.classList.toggle("active", app.classList.contains("sidebar-open"));
      return;
    }
    app.classList.toggle("sidebar-collapsed");
  });
  if (elements.closeSidebar) {
    elements.closeSidebar.addEventListener("click", () => {
      const app = document.querySelector(".app");
      app.classList.remove("sidebar-open");
      elements.sidebarScrim.classList.remove("active");
    });
  }
  elements.sidebarScrim.addEventListener("click", () => {
    const app = document.querySelector(".app");
    app.classList.remove("sidebar-open");
    elements.sidebarScrim.classList.remove("active");
  });
  elements.resetSession.addEventListener("click", () => {
    closeOverflowMenu();
    confirmResetSession();
  });
  elements.resetSessionPanel.addEventListener("click", confirmResetSession);
  let tapFocusPointer = null;
  elements.viewerArea.addEventListener("pointerdown", (event) => {
    if (!state.settings.tapFocus || state.adjustMode) return;
    if (event.pointerType === "touch") return;
    if (event.button !== 0) return;
    const pageDiv = event.target.closest(".page");
    if (!pageDiv) return;
    const rect = pageDiv.getBoundingClientRect();
    tapFocusPointer = {
      pageDiv,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      time: Date.now(),
      clientX: event.clientX,
      clientY: event.clientY
    };
  });
  elements.viewerArea.addEventListener("pointerup", (event) => {
    if (!tapFocusPointer) return;
    const dx = event.clientX - tapFocusPointer.clientX;
    const dy = event.clientY - tapFocusPointer.clientY;
    const dt = Date.now() - tapFocusPointer.time;
    if (Math.hypot(dx, dy) > 10 || dt > 650) {
      tapFocusPointer = null;
      return;
    }
    handleTapFocusPointer(tapFocusPointer);
    tapFocusPointer = null;
  });
  elements.viewerArea.addEventListener("scroll", () => {
    scheduleActivePageUpdate();
    if (!state.recording) return;
    const snapshot = captureSnapshot();
    if (snapshot) state.recordingSession.snapshots.push(snapshot);
  });
  elements.viewerArea.addEventListener("dragover", (event) => {
    event.preventDefault();
    elements.viewerArea.classList.add("dragging");
  });
  elements.viewerArea.addEventListener("dragleave", () => {
    elements.viewerArea.classList.remove("dragging");
  });
  elements.viewerArea.addEventListener("drop", (event) => {
    event.preventDefault();
    elements.viewerArea.classList.remove("dragging");
    if (event.dataTransfer?.files?.length) {
      handlePdfUpload(event.dataTransfer.files);
    }
  });

  elements.viewerArea.addEventListener(
    "wheel",
    (event) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const delta = event.deltaY > 0 ? -0.08 : 0.08;
      const pdfState = getActivePdf();
      if (!pdfState) return;
      const rect = elements.viewerArea.getBoundingClientRect();
      const anchor = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };
      setPdfScale(pdfState, pdfState.scale + delta, true, anchor, true);
    },
    { passive: false }
  );
  let touchState = null;
  let gestureState = null;
  elements.viewerArea.addEventListener(
    "gesturestart",
    (event) => {
      if (touchState?.type === "pinch") return;
      const pdfState = getActivePdf();
      if (!pdfState) return;
      event.preventDefault();
      pdfState.autoFit = false;
      state.isPinching = true;
      const rect = elements.viewerArea.getBoundingClientRect();
      const originViewport = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };
      gestureState = {
        startScale: pdfState.scale || 1.15,
        lastScale: event.scale || 1,
        previewScale: pdfState.scale || 1.15,
        originViewport,
        origin: {
          x: elements.viewerArea.scrollLeft + originViewport.x,
          y: elements.viewerArea.scrollTop + originViewport.y
        }
      };
      setPreviewScale(pdfState, gestureState.previewScale, gestureState.origin);
    },
    { passive: false }
  );
  elements.viewerArea.addEventListener(
    "gesturechange",
    (event) => {
      if (!gestureState) return;
      const pdfState = getActivePdf();
      if (!pdfState) return;
      event.preventDefault();
      const ratio = (event.scale || 1) / Math.max(0.01, gestureState.lastScale || 1);
      const clamped = Math.min(1.3, Math.max(0.7, ratio));
      const target = Math.min(3.5, Math.max(0.4, gestureState.previewScale * clamped));
      gestureState.previewScale =
        gestureState.previewScale + (target - gestureState.previewScale) * 0.35;
      gestureState.lastScale = event.scale || 1;
      setPreviewScale(pdfState, gestureState.previewScale, gestureState.origin);
    },
    { passive: false }
  );
  elements.viewerArea.addEventListener(
    "gestureend",
    (event) => {
      if (!gestureState) return;
      const pdfState = getActivePdf();
      if (!pdfState) {
        gestureState = null;
        state.isPinching = false;
        return;
      }
      event.preventDefault();
      const finalScale = gestureState.previewScale || gestureState.startScale;
      const origin = gestureState.originViewport;
      gestureState = null;
      setPdfScale(pdfState, finalScale, true, origin, true);
      state.isPinching = false;
    },
    { passive: false }
  );
  const commitPinchZoom = () => {
    if (!touchState || touchState.type !== "pinch") return;
    if (touchState.pending) {
      state.isPinching = false;
      elements.viewerArea.style.touchAction = "pan-x pan-y";
      touchState = null;
      return;
    }
    const pdfState = getActivePdf();
    if (!pdfState) {
      state.isPinching = false;
      touchState = null;
      return;
    }
    const finalScale = touchState.previewScale || touchState.startScale;
    const origin = touchState.originViewport;
    setPdfScale(pdfState, finalScale, true, origin, true);
    elements.viewerArea.style.touchAction = "pan-x pan-y";
    state.isPinching = false;
  };
  elements.viewerArea.addEventListener(
    "touchstart",
    (event) => {
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      touchState = {
        type: "swipe",
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: Date.now(),
        moved: false,
        tapFocus: null
      };
      if (state.settings.tapFocus && !state.adjustMode) {
        const pageDiv = event.target.closest(".page");
        if (pageDiv) {
          const rect = pageDiv.getBoundingClientRect();
          touchState.tapFocus = {
            pageDiv,
            x: touch.clientX - rect.left,
            y: touch.clientY - rect.top,
            time: touchState.startTime,
            clientX: touch.clientX,
            clientY: touch.clientY
          };
        }
      }
    } else if (event.touches.length === 2) {
      const [t1, t2] = event.touches;
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const pdfState = getActivePdf();
      if (pdfState) pdfState.autoFit = false;
      state.isPinching = true;
      event.preventDefault();
      elements.viewerArea.style.touchAction = "none";
      const viewerRect = elements.viewerArea.getBoundingClientRect();
      const centerX = (t1.clientX + t2.clientX) / 2;
      const centerY = (t1.clientY + t2.clientY) / 2;
      const originViewport = {
        x: centerX - viewerRect.left,
        y: centerY - viewerRect.top
      };
      const originContainer = {
        x: elements.viewerArea.scrollLeft + originViewport.x,
        y: elements.viewerArea.scrollTop + originViewport.y
      };
      touchState = {
        type: "pinch",
        startDistance: Math.max(1, dist),
        startScale: pdfState?.scale || 1.15,
        previewScale: pdfState?.scale || 1.15,
        lastDistance: Math.max(1, dist),
        lastCenter: { x: centerX, y: centerY },
        pending: dist < 30,
        origin: originContainer,
        originViewport,
        startScrollLeft: elements.viewerArea.scrollLeft,
        startScrollTop: elements.viewerArea.scrollTop,
        raf: null
      };
    }
    },
    { passive: false }
  );
  elements.viewerArea.addEventListener(
    "touchmove",
    (event) => {
      if (!touchState) return;
      if (touchState.type === "pinch" && event.touches.length === 2) {
        event.preventDefault();
        const [t1, t2] = event.touches;
        const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        const pdfState = getActivePdf();
        if (!pdfState) return;
        if (touchState.pending) {
          if (dist < 30) return;
          touchState.pending = false;
          touchState.startDistance = dist;
          touchState.previewScale = touchState.startScale;
          touchState.lastDistance = dist;
          return;
        }
        const viewerRect = elements.viewerArea.getBoundingClientRect();
        const centerX = (t1.clientX + t2.clientX) / 2;
        const centerY = (t1.clientY + t2.clientY) / 2;
        if (Math.hypot(centerX - touchState.lastCenter.x, centerY - touchState.lastCenter.y) > 32) {
          touchState.originViewport = {
            x: centerX - viewerRect.left,
            y: centerY - viewerRect.top
          };
          touchState.origin = {
            x: elements.viewerArea.scrollLeft + touchState.originViewport.x,
            y: elements.viewerArea.scrollTop + touchState.originViewport.y
          };
          touchState.lastCenter = { x: centerX, y: centerY };
        }
        const ratio = dist / Math.max(1, touchState.lastDistance || touchState.startDistance);
        const clampedRatio = Math.min(1.25, Math.max(0.8, ratio));
        const targetScale = Math.min(3.5, Math.max(0.4, touchState.previewScale * clampedRatio));
        touchState.previewScale =
          touchState.previewScale + (targetScale - touchState.previewScale) * 0.35;
        touchState.lastDistance = dist;
        if (!touchState.raf) {
          touchState.raf = requestAnimationFrame(() => {
            touchState.raf = null;
            setPreviewScale(pdfState, touchState.previewScale, touchState.origin);
          });
        }
        return;
      }
      if (touchState.type === "swipe" && event.touches.length === 1) {
        const touch = event.touches[0];
        const dx = touch.clientX - touchState.startX;
        const dy = touch.clientY - touchState.startY;
        if (Math.hypot(dx, dy) > 18) {
          touchState.moved = true;
        }
      }
    },
    { passive: false }
  );
  elements.viewerArea.addEventListener("touchend", (event) => {
    if (!touchState) return;
    if (touchState.type === "pinch") {
      commitPinchZoom();
    }
    if (touchState.type === "swipe" && event.changedTouches.length) {
      const endX = event.changedTouches[0].clientX;
      const endY = event.changedTouches[0].clientY;
      const dx = endX - touchState.startX;
      const dy = endY - touchState.startY;
      const dt = Date.now() - (touchState.startTime || 0);
      if (touchState.tapFocus && !touchState.moved && dt < 650) {
        const rect = touchState.tapFocus.pageDiv.getBoundingClientRect();
        handleTapFocusPointer({
          ...touchState.tapFocus,
          x: endX - rect.left,
          y: endY - rect.top,
          clientX: endX,
          clientY: endY
        });
        touchState = null;
        return;
      }
      if (Math.abs(dx) > 60 && Math.abs(dy) < 40) {
        switchPdfByDelta(dx < 0 ? 1 : -1);
      }
    }
    touchState = null;
  });
  elements.viewerArea.addEventListener("touchcancel", () => {
    if (touchState?.type === "pinch") {
      commitPinchZoom();
    }
    state.isPinching = false;
    elements.viewerArea.style.touchAction = "pan-x pan-y";
    touchState = null;
  });

  document.addEventListener("pointermove", handlePointerMove);
  document.addEventListener("pointerup", handlePointerUp);
  elements.modalOverlay.addEventListener("click", (event) => {
    if (event.target === elements.modalOverlay) closeModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && elements.modalOverlay.classList.contains("open")) {
      closeModal();
    }
    if (event.key === "Escape" && elements.logsPanel.classList.contains("open")) {
      closeLogs();
    }
    if (event.key === "Escape" && elements.settingsPanel.classList.contains("open")) {
      elements.settingsPanel.classList.remove("open");
      elements.settingsScrim.classList.remove("active");
    }
    if (event.key === "Escape" && elements.jumpBack?.classList.contains("open")) {
      hideJumpBack();
    }
    if (event.key === "Escape" && elements.pdfMenu?.classList.contains("open")) {
      closePdfMenu();
    }
    if (event.key === "Escape" && elements.overflowMenu?.classList.contains("open")) {
      closeOverflowMenu();
    }
    if (window.innerWidth >= 960 && event.code === "KeyM") {
      const tag = event.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || event.target.isContentEditable) return;
      event.preventDefault();
      if (state.recording) stopRecordingSession();
      else startRecordingSession();
    }
  });
  window.addEventListener("online", updateConnectionStatus);
  window.addEventListener("offline", updateConnectionStatus);
  window.addEventListener("resize", () => {
    const app = document.querySelector(".app");
    if (window.innerWidth >= 960) {
      app.classList.remove("sidebar-open");
      elements.sidebarScrim.classList.remove("active");
    }
    if (elements.pdfMenu?.classList.contains("open")) {
      requestAnimationFrame(() => {
        positionDropdown(elements.pdfMenu, elements.pdfMenuToggle, "left");
      });
    }
    if (elements.overflowMenu?.classList.contains("open")) {
      requestAnimationFrame(() => {
        positionDropdown(elements.overflowMenu, elements.overflowToggle, "right");
      });
    }
    applyFitScale(getActivePdf());
  });
}

function togglePdfMenu() {
  if (!elements.pdfMenu || !elements.pdfMenuToggle) return;
  closeOverflowMenu();
  const open = elements.pdfMenu.classList.toggle("open");
  elements.pdfMenuToggle.setAttribute("aria-expanded", open ? "true" : "false");
  if (open) {
    requestAnimationFrame(() => {
      positionDropdown(elements.pdfMenu, elements.pdfMenuToggle, "left");
    });
  }
}

function closePdfMenu() {
  if (!elements.pdfMenu || !elements.pdfMenuToggle) return;
  elements.pdfMenu.classList.remove("open");
  elements.pdfMenuToggle.setAttribute("aria-expanded", "false");
  resetDropdownPosition(elements.pdfMenu);
}

function toggleOverflowMenu() {
  if (!elements.overflowMenu || !elements.overflowToggle) return;
  closePdfMenu();
  const open = elements.overflowMenu.classList.toggle("open");
  elements.overflowToggle.setAttribute("aria-expanded", open ? "true" : "false");
  if (open) {
    requestAnimationFrame(() => {
      positionDropdown(elements.overflowMenu, elements.overflowToggle, "right");
    });
  }
}

function closeOverflowMenu() {
  if (!elements.overflowMenu || !elements.overflowToggle) return;
  elements.overflowMenu.classList.remove("open");
  elements.overflowToggle.setAttribute("aria-expanded", "false");
  resetDropdownPosition(elements.overflowMenu);
}

function positionDropdown(menu, trigger, align = "left") {
  if (!menu || !trigger) return;
  const margin = 12;
  const rect = trigger.getBoundingClientRect();
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  const isMobile = viewportW < 720;
  if (isMobile) {
    menu.style.width = `${viewportW - margin * 2}px`;
  } else {
    menu.style.width = "";
  }
  const menuRect = menu.getBoundingClientRect();
  const menuWidth = menuRect.width || menu.offsetWidth || 240;
  const menuHeight = menuRect.height || menu.offsetHeight || 240;
  let left = isMobile ? margin : align === "right" ? rect.right - menuWidth : rect.left;
  left = Math.min(Math.max(margin, left), viewportW - menuWidth - margin);
  let top = rect.bottom + 8;
  if (top + menuHeight > viewportH - margin) {
    top = Math.max(margin, rect.top - menuHeight - 8);
  }
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
  menu.style.right = "auto";
}

function resetDropdownPosition(menu) {
  if (!menu) return;
  menu.style.left = "";
  menu.style.top = "";
  menu.style.width = "";
  menu.style.right = "";
}

async function initApp() {
  loadSettings();
  const storedMode = localStorage.getItem("voxmark-mode");
  setMode(storedMode || state.mode);
  await openDB();
  updateConnectionStatus();
  updateStorageUsage();
  const storedPdfs = await loadPdfsFromDB();
  for (const pdf of storedPdfs) {
    await restorePdfState(pdf);
  }
  const sessionState = await loadSessionState();
  if (sessionState?.activePdfId) {
    setActivePdf(sessionState.activePdfId);
  } else if (state.pdfs.length) {
    setActivePdf(state.pdfs[0].id);
  }
  if (sessionState?.activeSessionId) {
    state.activeSessionId = sessionState.activeSessionId;
  }
  const storedLogs = await loadLogsFromDB();
  if (storedLogs.length) {
    state.logs = storedLogs;
    updateLogIndicator();
    renderLogs();
  }
  const queue = await loadQueueFromDB();
  state.queue = queue;
  updateQueueIndicator();
  bindInteractions();
  setNavTab(state.navTab || "outline");
}
