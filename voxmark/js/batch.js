async function processBatchQueue() {
  if (!state.queue.length) return;
  elements.progressLabel.classList.remove("hidden");
  const queueCopy = [...state.queue];
  for (let i = 0; i < queueCopy.length; i++) {
    const session = queueCopy[i];
    state.activeSessionId = session.id;
    elements.progressLabel.textContent = `Processing ${i + 1} of ${queueCopy.length}...`;
    const success = await processSession(session);
    if (success) removeFromQueue(session.id);
  }
  elements.progressLabel.classList.add("hidden");
  updateQueueIndicator();
  notify("Batch Mode", "Batch processing complete.");
}
