async function processBatchQueue() {
  if (!state.queue.length) return;
  elements.progressLabel.classList.remove("hidden");
  const processedIds = new Set();
  const queueCopy = [...state.queue];
  for (let i = 0; i < queueCopy.length; i++) {
    const session = queueCopy[i];
    state.activeSessionId = session.id;
    elements.progressLabel.textContent = `Processing ${i + 1} of ${queueCopy.length}...`;
    const success = await processSession(session);
    if (success) {
      processedIds.add(session.id);
      removeFromQueue(session.id);
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
  elements.progressLabel.classList.add("hidden");
  updateQueueIndicator();
  notify("Batch Mode", "Batch processing complete.");
}
