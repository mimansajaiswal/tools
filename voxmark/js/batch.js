async function processBatchQueue() {
  if (!state.queue.length || state.batchProcessing) return;
  state.batchProcessing = true;
  try {
    elements.progressLabel.classList.remove("hidden");
    const previousSessionId = state.activeSessionId;
    const processedIds = new Set();
    const queueCopy = [...state.queue];
    for (let i = 0; i < queueCopy.length; i++) {
      const session = queueCopy[i];
      if (session.processing || session.status === "processed") continue;
      state.activeSessionId = session.id;
      session.status = "processing";
      session.lastError = "";
      if (typeof updateQueueItem === "function") {
        updateQueueItem(session);
      }
      elements.progressLabel.textContent = `Processing ${i + 1} of ${queueCopy.length}...`;
      const success = await processSession(session);
      if (success) {
        processedIds.add(session.id);
        removeFromQueue(session.id);
      } else {
        session.status = "failed";
        if (typeof updateQueueItem === "function") {
          updateQueueItem(session);
        }
      }
    }

    state.activeSessionId = previousSessionId;
    elements.progressLabel.classList.add("hidden");
    updateQueueIndicator();
    notify("Batch Mode", "Batch processing complete.");
  } finally {
    state.batchProcessing = false;
    elements.progressLabel.classList.add("hidden");
  }
}
