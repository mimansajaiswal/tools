function bindInteractions() {
  let wheelCommitTimer = null;
  let wheelPreviewScale = null;
  let wheelOriginViewport = null;

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
  if (elements.queueToggle) {
    elements.queueToggle.addEventListener("click", toggleQueue);
  }
  if (elements.queueIndicator) {
    elements.queueIndicator.addEventListener("click", toggleQueue);
  }
  if (elements.searchToggle) {
    elements.searchToggle.addEventListener("click", (event) => {
      event.preventDefault();
      toggleSearchPanel();
    });
  }
  elements.settingsToggle.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (typeof closeOverflowMenu === "function") {
      closeOverflowMenu();
    }
    requestAnimationFrame(() => {
      toggleSettings();
    });
  });
  elements.logsToggle.addEventListener("click", toggleLogs);
  elements.logsClose.addEventListener("click", closeLogs);
  if (elements.logsClear) {
    elements.logsClear.addEventListener("click", () => {
      confirmModal({
        title: "Clear Logs",
        body: "<p>Clear logs for the current session?</p>",
        confirmLabel: "Clear Logs",
        onConfirm: () => clearLogs("active")
      });
    });
  }
  document.addEventListener("click", (event) => {
    if (!elements.settingsPanel.classList.contains("open")) return;
    const isToggle = elements.settingsToggle.contains(event.target);
    const isPanel = elements.settingsPanel.contains(event.target);
    if (!isToggle && !isPanel) {
      elements.settingsPanel.classList.remove("open");
      elements.settingsScrim.classList.remove("active");
      elements.settingsToggle?.setAttribute("aria-expanded", "false");
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
    elements.settingsToggle?.setAttribute("aria-expanded", "false");
  });
  elements.logsScrim.addEventListener("click", closeLogs);
  if (elements.queueScrim) {
    elements.queueScrim.addEventListener("click", closeQueue);
  }
  if (elements.searchScrim) {
    elements.searchScrim.addEventListener("click", closeSearchPanel);
  }
  if (elements.queueClose) {
    elements.queueClose.addEventListener("click", closeQueue);
  }
  if (elements.queueRetryAll) {
    elements.queueRetryAll.addEventListener("click", async () => {
      const failed = state.queue.filter((item) => item.status === "failed");
      if (!failed.length) {
        notify("Queue", "No failed sessions to retry.");
        return;
      }
      for (const session of failed) {
        await processQueueItem(session);
      }
    });
  }
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
  if (elements.paletteAdd) {
    elements.paletteAdd.addEventListener("click", () => {
      const palette = Array.isArray(state.settings.colorPalette)
        ? [...state.settings.colorPalette]
        : [];
      palette.push({ name: "Color", color: "#f9de6f" });
      state.settings.colorPalette = palette;
      renderPaletteEditor();
      persistSettings();
    });
  }
  if (elements.paletteSaveDefault) {
    elements.paletteSaveDefault.addEventListener("click", () => {
      const palette = getPaletteFromDOM();
      localStorage.setItem("voxmark-default-palette", JSON.stringify(palette));
      notify("Palette", "Default palette saved.");
    });
  }
  if (elements.paletteRestoreDefault) {
    elements.paletteRestoreDefault.addEventListener("click", () => {
      const stored = localStorage.getItem("voxmark-default-palette");
      const palette = stored ? JSON.parse(stored) : [...DEFAULT_SETTINGS.colorPalette];
      state.settings.colorPalette = palette;
      renderPaletteEditor();
      persistSettings();
      notify("Palette", "Default palette restored.");
    });
  }
  if (elements.paletteList) {
    elements.paletteList.addEventListener("input", () => {
      state.settings.colorPalette = getPaletteFromDOM();
      persistSettings();
    });
    elements.paletteList.addEventListener("click", (event) => {
      const target = event.target.closest(".palette-remove");
      if (!target) return;
      const row = target.closest(".palette-row");
      if (!row) return;
      const index = Number(row.dataset.index);
      if (!Number.isFinite(index)) return;
      const palette = getPaletteFromDOM().filter((_, i) => i !== index);
      state.settings.colorPalette =
        palette.length ? palette : [...DEFAULT_SETTINGS.colorPalette];
      renderPaletteEditor();
      persistSettings();
    });
  }
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
    state.activeSessionId = null;
    updateQueueIndicator();
    updateLogIndicator();
    renderLogs();
    updateStorageUsage();
    if (window.caches && caches.keys) {
      caches.keys().then((keys) =>
        keys.filter((key) => key.startsWith("voxmark-")).forEach((key) => caches.delete(key))
      );
    }
    notify("Storage", "Offline data cleared.");
  });
  elements.micButton.addEventListener("click", async () => {
    if (state.recording) stopRecordingSession();
    else await startRecordingSession();
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
  if (elements.invertPdfToggle) {
    elements.invertPdfToggle.addEventListener("change", (event) => {
      state.settings.invertPdf = event.target.checked;
      persistSettings();
      updatePdfInvert();
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
      if (document.querySelector(".app")?.classList.contains("search-open")) {
        closeSearchPanel();
      }
    });
  }
  if (elements.searchInput) {
    elements.searchInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        searchInActivePdf(elements.searchInput.value);
        if (document.querySelector(".app")?.classList.contains("search-open")) {
          closeSearchPanel();
        }
      }
    });
  }
  if (elements.searchClear) {
    elements.searchClear.addEventListener("click", () => {
      elements.searchInput.value = "";
      elements.searchResults.innerHTML = "";
      clearSearchHighlights(getActivePdf());
      state.searchResults = [];
      state.activeSearchIndex = -1;
      state.searchTerm = "";
      updateSearchNavButtons();
      elements.searchInput.focus();
      if (document.querySelector(".app")?.classList.contains("search-open")) {
        closeSearchPanel();
      }
    });
  }
  if (elements.searchPrev) {
    elements.searchPrev.addEventListener("click", () => {
      goToSearchResult(-1);
    });
  }
  if (elements.searchNext) {
    elements.searchNext.addEventListener("click", () => {
      goToSearchResult(1);
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
  if (elements.resetApp) {
    elements.resetApp.addEventListener("click", () => {
      closeOverflowMenu();
      confirmResetApp();
    });
  }
  if (elements.resetAppPanel) {
    elements.resetAppPanel.addEventListener("click", confirmResetApp);
  }
  document.querySelectorAll(".inline-form").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
    });
  });
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
    captureSnapshot().then((snapshot) => {
      if (snapshot) state.recordingSession.snapshots.push(snapshot);
    });
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
      const pdfState = getActivePdf();
      if (!pdfState) return;
      const rect = elements.viewerArea.getBoundingClientRect();
      const anchor = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };
      const rawZoom = Math.exp(-event.deltaY * 0.006);
      const zoomFactor = Math.min(1.25, Math.max(0.8, rawZoom));
      const baseScale = wheelPreviewScale ?? pdfState.scale;
      const targetScale = baseScale * zoomFactor;
      const origin = {
        x: elements.viewerArea.scrollLeft + anchor.x,
        y: elements.viewerArea.scrollTop + anchor.y
      };
      wheelPreviewScale = targetScale;
      wheelOriginViewport = anchor;
      setPreviewScale(pdfState, targetScale, origin);
      if (wheelCommitTimer) clearTimeout(wheelCommitTimer);
      wheelCommitTimer = setTimeout(() => {
        const active = getActivePdf();
        if (!active || wheelPreviewScale === null) return;
        const commitScale = wheelPreviewScale;
        const commitOrigin = wheelOriginViewport;
        wheelPreviewScale = null;
        wheelOriginViewport = null;
        setPdfScale(active, commitScale, true, commitOrigin, true);
      }, 120);
    },
    { passive: false }
  );
  let touchState = null;
  let gestureState = null;
  const LERP_FACTOR = 0.25;
  const MAX_SCALE_CHANGE_PER_FRAME = 0.15;
  const DEAD_ZONE = 0.02;
  const MOMENTUM_FRICTION = 0.92;
  const MIN_VELOCITY_THRESHOLD = 0.001;

  function applyMomentum(pdfState, velocity, lastScale, originViewport) {
    if (Math.abs(velocity) < MIN_VELOCITY_THRESHOLD) {
      state.isPinching = false;
      elements.viewerArea.classList.remove("pinching");
      return;
    }
    const newScale = Math.min(3.5, Math.max(0.4, lastScale * (1 + velocity)));
    setPdfScale(pdfState, newScale, true, originViewport, true);
    requestAnimationFrame(() => {
      applyMomentum(pdfState, velocity * MOMENTUM_FRICTION, newScale, originViewport);
    });
  }

  elements.viewerArea.addEventListener(
    "gesturestart",
    (event) => {
      if (touchState?.type === "pinch") return;
      const pdfState = getActivePdf();
      if (!pdfState) return;
      event.preventDefault();
      pdfState.autoFit = false;
      state.isPinching = true;
      elements.viewerArea.classList.add("pinching");
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
        },
        velocity: 0,
        lastTime: performance.now(),
        raf: null
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
      const now = performance.now();
      const dt = Math.max(1, now - gestureState.lastTime);
      gestureState.lastTime = now;

      const rect = elements.viewerArea.getBoundingClientRect();
      gestureState.originViewport = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };
      gestureState.origin = {
        x: elements.viewerArea.scrollLeft + gestureState.originViewport.x,
        y: elements.viewerArea.scrollTop + gestureState.originViewport.y
      };

      const ratio = (event.scale || 1) / Math.max(0.01, gestureState.lastScale || 1);
      if (Math.abs(ratio - 1) < DEAD_ZONE) return;

      const clampedRatio = Math.min(1 + MAX_SCALE_CHANGE_PER_FRAME, Math.max(1 - MAX_SCALE_CHANGE_PER_FRAME, ratio));
      const target = Math.min(3.5, Math.max(0.4, gestureState.previewScale * clampedRatio));
      const prev = gestureState.previewScale;
      gestureState.previewScale = prev + (target - prev) * LERP_FACTOR;

      gestureState.velocity = (gestureState.previewScale / prev - 1) / dt * 16;
      gestureState.lastScale = event.scale || 1;

      if (!gestureState.raf) {
        gestureState.raf = requestAnimationFrame(() => {
          gestureState.raf = null;
          if (gestureState) {
            setPreviewScale(pdfState, gestureState.previewScale, gestureState.origin);
          }
        });
      }
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
        elements.viewerArea.classList.remove("pinching");
        return;
      }
      event.preventDefault();
      const finalScale = gestureState.previewScale || gestureState.startScale;
      const originViewport = gestureState.originViewport;
      const velocity = gestureState.velocity || 0;
      gestureState = null;

      if (Math.abs(velocity) > MIN_VELOCITY_THRESHOLD * 2) {
        applyMomentum(pdfState, velocity, finalScale, originViewport);
      } else {
        setPdfScale(pdfState, finalScale, true, originViewport, true);
        state.isPinching = false;
        elements.viewerArea.classList.remove("pinching");
      }
    },
    { passive: false }
  );
  let commitPinchTimeout = null;

  const commitPinchZoom = (usesMomentum = false) => {
    if (commitPinchTimeout) {
      clearTimeout(commitPinchTimeout);
      commitPinchTimeout = null;
    }
    if (!touchState || touchState.type !== "pinch") return;
    const pdfState = getActivePdf();
    const finalScale = touchState.previewScale || touchState.startScale;
    const originViewport = touchState.originViewport;
    const velocity = touchState.velocity || 0;
    elements.viewerArea.style.touchAction = "pan-x pan-y";
    elements.viewerArea.classList.remove("pinching");
    touchState = null;

    if (!pdfState) {
      state.isPinching = false;
      return;
    }

    if (usesMomentum && Math.abs(velocity) > MIN_VELOCITY_THRESHOLD * 2) {
      applyMomentum(pdfState, velocity, finalScale, originViewport);
    } else {
      setPdfScale(pdfState, finalScale, true, originViewport, true);
      state.isPinching = false;
    }
  };

  const debouncedCommitPinch = () => {
    if (commitPinchTimeout) clearTimeout(commitPinchTimeout);
    commitPinchTimeout = setTimeout(() => {
      commitPinchZoom(true);
    }, 50);
  };

  elements.viewerArea.addEventListener(
    "touchstart",
    (event) => {
      if (event.touches.length === 1) {
        if (touchState?.type === "pinch") {
          debouncedCommitPinch();
          return;
        }
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
        if (commitPinchTimeout) {
          clearTimeout(commitPinchTimeout);
          commitPinchTimeout = null;
        }
        const [t1, t2] = event.touches;
        const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        const pdfState = getActivePdf();
        if (pdfState) pdfState.autoFit = false;
        state.isPinching = true;
        event.preventDefault();
        elements.viewerArea.style.touchAction = "none";
        elements.viewerArea.classList.add("pinching");
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
          lastDistance: dist,
          startScale: pdfState?.scale || 1.15,
          previewScale: pdfState?.scale || 1.15,
          origin: originContainer,
          originViewport,
          velocity: 0,
          lastTime: performance.now(),
          raf: null
        };
        if (pdfState) {
          setPreviewScale(pdfState, touchState.previewScale, touchState.origin);
        }
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

        const now = performance.now();
        const dt = Math.max(1, now - touchState.lastTime);
        touchState.lastTime = now;

        const viewerRect = elements.viewerArea.getBoundingClientRect();
        const centerX = (t1.clientX + t2.clientX) / 2;
        const centerY = (t1.clientY + t2.clientY) / 2;
        touchState.originViewport = {
          x: centerX - viewerRect.left,
          y: centerY - viewerRect.top
        };
        touchState.origin = {
          x: elements.viewerArea.scrollLeft + touchState.originViewport.x,
          y: elements.viewerArea.scrollTop + touchState.originViewport.y
        };

        const ratio = dist / Math.max(1, touchState.startDistance);
        const deltaRatio = dist / Math.max(1, touchState.lastDistance || dist);

        if (Math.abs(deltaRatio - 1) < DEAD_ZONE) return;

        const clampedDelta = Math.min(1 + MAX_SCALE_CHANGE_PER_FRAME, Math.max(1 - MAX_SCALE_CHANGE_PER_FRAME, deltaRatio));
        const targetScale = Math.min(3.5, Math.max(0.4, touchState.startScale * ratio));
        const prev = touchState.previewScale;
        touchState.previewScale = prev + (targetScale - prev) * LERP_FACTOR;
        touchState.lastDistance = dist;

        touchState.velocity = (touchState.previewScale / prev - 1) / dt * 16;

        if (!touchState.raf) {
          touchState.raf = requestAnimationFrame(() => {
            if (touchState) {
              touchState.raf = null;
              setPreviewScale(pdfState, touchState.previewScale, touchState.origin);
            }
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
      if (event.touches.length === 1) {
        debouncedCommitPinch();
      } else if (event.touches.length === 0) {
        commitPinchZoom(true);
      }
      return;
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
    if (commitPinchTimeout) {
      clearTimeout(commitPinchTimeout);
      commitPinchTimeout = null;
    }
    if (touchState?.type === "pinch") {
      elements.viewerArea.classList.remove("pinching");
      const pdfState = getActivePdf();
      if (pdfState) {
        clearPreviewScale(pdfState);
      }
    }
    state.isPinching = false;
    elements.viewerArea.style.touchAction = "pan-x pan-y";
    touchState = null;
  });

  if (elements.zoomInput) {
    const MIN_ZOOM = 25;
    const MAX_ZOOM = 400;
    const commitZoomInput = () => {
      const raw = elements.zoomInput.value.trim().replace("%", "");
      const value = Number(raw);
      if (!Number.isFinite(value)) {
        updateZoomLabel(getActivePdf());
        return;
      }
      const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
      if (clamped !== value) {
        notify("Zoom", `Zoom must be between ${MIN_ZOOM}% and ${MAX_ZOOM}%`);
      }
      const pdfState = getActivePdf();
      if (!pdfState) return;
      const target = clamped / 100;
      setPdfScale(pdfState, target, true, null, false);
    };
    elements.zoomInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        elements.zoomInput.blur();
        commitZoomInput();
      }
    });
    elements.zoomInput.addEventListener("blur", () => {
      commitZoomInput();
    });
  }

  document.addEventListener("pointermove", handlePointerMove);
  document.addEventListener("pointerup", handlePointerUp);
  elements.modalOverlay.addEventListener("click", (event) => {
    if (event.target === elements.modalOverlay) closeModal();
  });
  document.addEventListener("keydown", (event) => {
    const tag = event.target.tagName;
    const isEditable = tag === "INPUT" || tag === "TEXTAREA" || event.target.isContentEditable;
    if (event.key === "Escape" && elements.modalOverlay.classList.contains("open")) {
      closeModal();
    }
    if (event.key === "Escape" && elements.logsPanel.classList.contains("open")) {
      closeLogs();
    }
    if (event.key === "Escape" && elements.settingsPanel.classList.contains("open")) {
      elements.settingsPanel.classList.remove("open");
      elements.settingsScrim.classList.remove("active");
      elements.settingsToggle?.setAttribute("aria-expanded", "false");
    }
    if (event.key === "Escape" && elements.queuePanel?.classList.contains("open")) {
      closeQueue();
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
    if (event.key === "Escape" && document.querySelector(".app")?.classList.contains("search-open")) {
      closeSearchPanel();
    }
    if (isEditable) return;
    if (event.key === "PageDown") {
      const pdfState = getActivePdf();
      if (!pdfState) return;
      event.preventDefault();
      navigateToPageIndex(Math.min(pdfState.pageCount - 1, state.activePageIndex + 1), pdfState);
    }
    if (event.key === "PageUp") {
      const pdfState = getActivePdf();
      if (!pdfState) return;
      event.preventDefault();
      navigateToPageIndex(Math.max(0, state.activePageIndex - 1), pdfState);
    }
    if (event.key === "+" || event.key === "=") {
      const pdfState = getActivePdf();
      if (!pdfState) return;
      event.preventDefault();
      setPdfScale(pdfState, (pdfState.scale || 1) * 1.1, true);
    }
    if (event.key === "-") {
      const pdfState = getActivePdf();
      if (!pdfState) return;
      event.preventDefault();
      setPdfScale(pdfState, (pdfState.scale || 1) / 1.1, true);
    }
    if (window.innerWidth >= 960 && event.code === "KeyM") {
      event.preventDefault();
      if (state.recording) stopRecordingSession();
      else startRecordingSession();
    }
    if ((event.ctrlKey || event.metaKey) && event.key === "z" && !event.shiftKey) {
      event.preventDefault();
      if (typeof undoAnnotation === "function") {
        undoAnnotation();
      }
    }
    if (event.key === "?" && !isEditable) {
      event.preventDefault();
      showKeyboardShortcutsHelp();
    }
  });
  window.addEventListener("online", updateConnectionStatus);
  window.addEventListener("offline", updateConnectionStatus);
  window.addEventListener("resize", () => {
    const app = document.querySelector(".app");
    if (window.innerWidth >= 960) {
      closeSidebar();
      closeSearchPanel();
    }
    updateHeaderOffset();
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
  // Use viewport positioning so dropdowns stay anchored on desktop and mobile.
  menu.style.position = "fixed";
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
  menu.style.position = "";
  menu.style.left = "";
  menu.style.top = "";
  menu.style.width = "";
  menu.style.right = "";
}

async function initApp() {
  await openDB();
  await loadSettings();
  updateHeaderOffset();
  const storedMode = localStorage.getItem("voxmark-mode");
  setMode(storedMode || state.mode);
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
  state.queue = queue.map((item) => ({
    ...item,
    status: item.status || "queued",
    attempts: item.attempts || 0,
    lastError: item.lastError || "",
    processedChunks: item.processedChunks || []
  }));
  updateQueueIndicator();
  bindInteractions();
  setNavTab(state.navTab || "outline");
}

function setupFocusTrap(panel) {
  if (!panel) return;
  panel.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    const focusable = panel.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
}

setupFocusTrap(elements.settingsPanel);
setupFocusTrap(elements.logsPanel);
setupFocusTrap(elements.queuePanel);

function showKeyboardShortcutsHelp() {
  const shortcuts = `
    <div class="shortcuts-list">
      <div class="shortcut-row"><kbd>M</kbd> Toggle recording (desktop)</div>
      <div class="shortcut-row"><kbd>Ctrl/⌘ + Z</kbd> Undo annotation</div>
      <div class="shortcut-row"><kbd>PageUp</kbd> Previous page</div>
      <div class="shortcut-row"><kbd>PageDown</kbd> Next page</div>
      <div class="shortcut-row"><kbd>+</kbd> / <kbd>=</kbd> Zoom in</div>
      <div class="shortcut-row"><kbd>-</kbd> Zoom out</div>
      <div class="shortcut-row"><kbd>Escape</kbd> Close panels</div>
      <div class="shortcut-row"><kbd>?</kbd> Show this help</div>
    </div>
  `;
  openModal({
    title: "Keyboard Shortcuts",
    body: shortcuts,
    actions: [{ label: "Close", variant: "secondary", onClick: closeModal }]
  });
}
