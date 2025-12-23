async function processBatchQueue() {
  if (!state.queue.length) return;
  elements.progressLabel.classList.remove("hidden");
  const previousSessionId = state.activeSessionId;
  const processedIds = new Set();
  const queueCopy = [...state.queue];
  for (let i = 0; i < queueCopy.length; i++) {
    const session = queueCopy[i];
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
  if (processedIds.size) {
    state.queue = state.queue.filter((item) => !processedIds.has(item.id));
    if (db) {
      const tx = db.transaction("queue", "readwrite");
      const store = tx.objectStore("queue");
      processedIds.forEach((id) => store.delete(id));
    }
  }
  state.activeSessionId = previousSessionId;
  elements.progressLabel.classList.add("hidden");
  updateQueueIndicator();
  notify("Batch Mode", "Batch processing complete.");
}
