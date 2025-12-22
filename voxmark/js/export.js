async function downloadActive() {
  const pdfState = getActivePdf();
  if (!pdfState) {
    notify("Export", "No active PDF to download.");
    return;
  }
  const blob = new Blob([pdfState.bytes], { type: "application/pdf" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = pdfState.name.replace(".pdf", "-annotated.pdf");
  link.click();
}

async function downloadMerged() {
  if (!state.pdfs.length) {
    notify("Export", "No PDFs loaded.");
    return;
  }
  const merged = await PDFLib.PDFDocument.create();
  for (const pdfState of state.pdfs) {
    const doc = await PDFLib.PDFDocument.load(pdfState.bytes);
    const pages = await merged.copyPages(doc, doc.getPageIndices());
    pages.forEach((page) => merged.addPage(page));
  }
  const bytes = await merged.save();
  const blob = new Blob([bytes], { type: "application/pdf" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "voxmark-merged.pdf";
  link.click();
}

async function downloadZip() {
  if (!state.pdfs.length) {
    notify("Export", "No PDFs loaded.");
    return;
  }
  const zip = new JSZip();
  for (const pdfState of state.pdfs) {
    zip.file(pdfState.name.replace(".pdf", "-annotated.pdf"), pdfState.bytes);
  }
  const blob = await zip.generateAsync({ type: "blob" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "voxmark-pdfs.zip";
  link.click();
}
