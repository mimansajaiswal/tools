function buildExportName(name, suffix) {
  if (!name) return `export${suffix}`;
  const base = name.replace(/\.pdf$/i, "");
  return `${base}${suffix}`;
}

async function downloadActive() {
  const pdfState = getActivePdf();
  if (!pdfState) {
    notify("Export", "No active PDF to download.");
    return;
  }
  const bytes = pdfState.annotations.length
    ? await buildAnnotatedBytes(pdfState, { invertForView: false })
    : pdfState.bytes;
  const blob = new Blob([bytes], { type: "application/pdf" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = buildExportName(pdfState.name, "-annotated.pdf");
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 0);
}

async function downloadMerged() {
  if (!state.pdfs.length) {
    notify("Export", "No PDFs loaded.");
    return;
  }
  const merged = await PDFLib.PDFDocument.create();
  for (const pdfState of state.pdfs) {
    const bytes = pdfState.annotations.length
      ? await buildAnnotatedBytes(pdfState, { invertForView: false })
      : pdfState.bytes;
    const doc = await PDFLib.PDFDocument.load(bytes);
    const pages = await merged.copyPages(doc, doc.getPageIndices());
    pages.forEach((page) => merged.addPage(page));
  }
  const bytes = await merged.save();
  const blob = new Blob([bytes], { type: "application/pdf" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "voxmark-merged.pdf";
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 0);
}

async function downloadZip() {
  if (!state.pdfs.length) {
    notify("Export", "No PDFs loaded.");
    return;
  }
  const zip = new JSZip();
  for (const pdfState of state.pdfs) {
    const bytes = pdfState.annotations.length
      ? await buildAnnotatedBytes(pdfState, { invertForView: false })
      : pdfState.bytes;
    zip.file(buildExportName(pdfState.name, "-annotated.pdf"), bytes);
  }
  const blob = await zip.generateAsync({ type: "blob" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "voxmark-pdfs.zip";
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 0);
}
