// Tab switching
const tabs = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");
tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    tabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    const target = tab.dataset.tab;
    tabContents.forEach(c => c.classList.toggle("active", c.id === target));
  });
});

/* -------- Merge & Split Tab -------- */

const dropZoneMS = document.getElementById("drop-zone-ms");
const fileInputMS = document.getElementById("file-input-ms");
const thumbnailsMS = document.getElementById("thumbnail-container-ms");
const mergeBtn = document.getElementById("merge-btn");
const splitBtn = document.getElementById("split-btn");
const pageRangeInputMS = document.getElementById("page-range-ms");
const progressBarMS = document.getElementById("progress-ms");
const progressTextMS = document.getElementById("progress-text-ms");

let pdfFilesMS = [];

dropZoneMS.addEventListener("click", () => fileInputMS.click());
dropZoneMS.addEventListener("dragover", e => {
  e.preventDefault();
  dropZoneMS.style.backgroundColor = "#eef";
});
dropZoneMS.addEventListener("dragleave", () => {
  dropZoneMS.style.backgroundColor = "white";
});
dropZoneMS.addEventListener("drop", e => {
  e.preventDefault();
  dropZoneMS.style.backgroundColor = "white";
  handleFilesMS(e.dataTransfer.files);
});
fileInputMS.addEventListener("change", e => handleFilesMS(e.target.files));

async function handleFilesMS(files) {
  for (const file of files) {
    if (file.type !== "application/pdf") continue;
    pdfFilesMS.push(file);
    await addThumbnailMS(file);
  }
}

async function addThumbnailMS(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 0.5 });
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvasContext: ctx, viewport }).promise;

  const div = document.createElement("div");
  div.classList.add("thumbnail");
  div.innerHTML = `<img src="${canvas.toDataURL()}" alt="Thumbnail"><br>${file.name}`;
  thumbnailsMS.appendChild(div);
}

// Parses page range string like "1-3,5,7" into an array of page numbers (1-based)
function parsePageRange(str, maxPage) {
  if (!str || !str.trim()) return Array.from({ length: maxPage }, (_, i) => i + 1);

  const pages = new Set();
  const parts = str.split(",");
  for (const part of parts) {
    if (part.includes("-")) {
      const [start, end] = part.split("-").map(x => parseInt(x));
      if (isNaN(start) || isNaN(end) || start > end) continue;
      for (let i = start; i <= end && i <= maxPage; i++) pages.add(i);
    } else {
      const p = parseInt(part);
      if (!isNaN(p) && p <= maxPage) pages.add(p);
    }
  }
  return Array.from(pages).sort((a, b) => a - b);
}

// Merge PDFs with page range
mergeBtn.addEventListener("click", async () => {
  if (pdfFilesMS.length < 2) {
    alert("Please add at least 2 PDFs to merge.");
    return;
  }
  progressBarMS.style.display = "block";
  progressBarMS.value = 0;
  progressTextMS.textContent = "Starting merge...";

  const mergedPdf = await PDFLib.PDFDocument.create();
  let filesDone = 0;

  for (const file of pdfFilesMS) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
    const maxPage = pdf.getPageCount();

    let pagesToCopy;
    try {
      pagesToCopy = parsePageRange(pageRangeInputMS.value, maxPage);
      if (pagesToCopy.length === 0) pagesToCopy = Array.from({ length: maxPage }, (_, i) => i + 1);
    } catch {
      pagesToCopy = Array.from({ length: maxPage }, (_, i) => i + 1);
    }
    // zero-based page indexes:
    const zeroBasedPages = pagesToCopy.map(p => p - 1);

    const copiedPages = await mergedPdf.copyPages(pdf, zeroBasedPages);
    copiedPages.forEach(page => mergedPdf.addPage(page));

    filesDone++;
    progressBarMS.value = (filesDone / pdfFilesMS.length) * 100;
    progressTextMS.textContent = `Merged ${filesDone} of ${pdfFilesMS.length} files`;
  }

  const mergedBytes = await mergedPdf.save();
  downloadFile(mergedBytes, "merged.pdf");
  progressTextMS.textContent = "Merge complete!";
  setTimeout(() => {
    progressBarMS.style.display = "none";
    progressTextMS.textContent = "";
  }, 3000);
});

// Split PDFs with page range
splitBtn.addEventListener("click", async () => {
  if (pdfFilesMS.length === 0) {
    alert("Please add PDFs to split.");
    return;
  }
  progressBarMS.style.display = "block";
  progressBarMS.value = 0;
  progressTextMS.textContent = "Starting split...";

  let totalPagesCount = 0;
  for (const file of pdfFilesMS) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
    totalPagesCount += pdf.getPageCount();
  }

  let processedPages = 0;

  for (const file of pdfFilesMS) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
    const maxPage = pdf.getPageCount();

    let pagesToSplit;
    try {
      pagesToSplit = parsePageRange(pageRangeInputMS.value, maxPage);
      if (pagesToSplit.length === 0) pagesToSplit = Array.from({ length: maxPage }, (_, i) => i + 1);
    } catch {
      pagesToSplit = Array.from({ length: maxPage }, (_, i) => i + 1);
    }

    for (const p of pagesToSplit) {
      const newPdf = await PDFLib.PDFDocument.create();
      const [page] = await newPdf.copyPages(pdf, [p - 1]);
      newPdf.addPage(page);
      const pdfBytes = await newPdf.save();
      downloadFile(pdfBytes, `${file.name.replace(".pdf", "")}_page${p}.pdf`);
      processedPages++;
      progressBarMS.value = (processedPages / totalPagesCount) * 100;
      progressTextMS.textContent = `Split ${processedPages} of ${totalPagesCount} pages`;
      await new Promise(r => setTimeout(r, 10)); // small delay to keep UI responsive
    }
  }
  progressTextMS.textContent = "Split complete!";
  setTimeout(() => {
    progressBarMS.style.display = "none";
    progressTextMS.textContent = "";
  }, 3000);
});

/* -------- Convert Tab -------- */

const dropZoneCV = document.getElementById("drop-zone-cv");
const fileInputCV = document.getElementById("file-input-cv");
const fileInfoCV = document.getElementById("file-info-cv");
const toExcelBtn = document.getElementById("to-excel-btn");
const toWordBtn = document.getElementById("to-word-btn");
const toOcrExcelBtn = document.getElementById("to-ocr-excel-btn");
const pageRangeInputCV = document.getElementById("page-range-cv");
const progressBarCV = document.getElementById("progress-cv");
const progressTextCV = document.getElementById("progress-text-cv");

let pdfFileCV = null;

dropZoneCV.addEventListener("click", () => fileInputCV.click());
dropZoneCV.addEventListener("dragover", e => {
  e.preventDefault();
  dropZoneCV.style.backgroundColor = "#eef";
});
dropZoneCV.addEventListener("dragleave", () => {
  dropZoneCV.style.backgroundColor = "white";
});
dropZoneCV.addEventListener("drop", e => {
  e.preventDefault();
  dropZoneCV.style.backgroundColor = "white";
  handleFileCV(e.dataTransfer.files);
});
fileInputCV.addEventListener("change", e => handleFileCV(e.target.files));

function handleFileCV(files) {
  if (files.length === 0) return;
  const file = files[0];
  if (file.type !== "application/pdf") {
    alert("Please upload a PDF file.");
    return;
  }
  pdfFileCV = file;
  fileInfoCV.textContent = `Selected file: ${file.name}`;
}

// Advanced table detection: group text items by y-pos to rows, x-pos for columns
function parsePageTextContentToTable(items) {
  // Group items by similar y position (rows)
  const rowThreshold = 5; // pixels tolerance for same line
  let rows = [];

  items.forEach(item => {
    const y = item.transform[5]; // vertical position
    let row = rows.find(r => Math.abs(r.y - y) < rowThreshold);
    if (!row) {
      row = { y, items: [] };
      rows.push(row);
    }
    row.items.push(item);
  });

  // Sort rows top-to-bottom (pdf.js origin bottom-left)
  rows.sort((a, b) => b.y - a.y);

  // For each row, sort items left-to-right by x pos (transform[4])
  const table = rows.map(row => {
    row.items.sort((a, b) => a.transform[4] - b.transform[4]);
    return row.items.map(i => i.str.trim());
  });

  return table;
}

toExcelBtn.addEventListener("click", async () => {
  if (!pdfFileCV) {
    alert("Please upload a PDF first.");
    return;
  }
  progressBarCV.style.display = "block";
  progressBarCV.value = 0;
  progressTextCV.textContent = "Loading PDF...";

  const arrayBuffer = await pdfFileCV.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const maxPage = pdf.numPages;

  let pagesToProcess = [];
  try {
    pagesToProcess = parsePageRange(pageRangeInputCV.value, maxPage);
    if (pagesToProcess.length === 0) pagesToProcess = Array.from({ length: maxPage }, (_, i) => i + 1);
  } catch {
    pagesToProcess = Array.from({ length: maxPage }, (_, i) => i + 1);
  }

  let sheetData = [];

  for (let i = 0; i < pagesToProcess.length; i++) {
    const pageNum = pagesToProcess[i];
    progressTextCV.textContent = `Extracting text from page ${pageNum} of ${maxPage}...`;
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const table = parsePageTextContentToTable(content.items);
    sheetData = sheetData.concat(table);

    progressBarCV.value = ((i + 1) / pagesToProcess.length) * 100;
    await new Promise(r => setTimeout(r, 10)); // keep UI responsive
  }

  progressTextCV.textContent = "Building Excel file...";
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "PDF Data");
  XLSX.writeFile(wb, pdfFileCV.name.replace(".pdf", ".xlsx"));

  progressTextCV.textContent = "Excel conversion done!";
  setTimeout(() => {
    progressBarCV.style.display = "none";
    progressTextCV.textContent = "";
  }, 3000);
});

toWordBtn.addEventListener("click", async () => {
  if (!pdfFileCV) {
    alert("Please upload a PDF first.");
    return;
  }
  progressBarCV.style.display = "block";
  progressBarCV.value = 0;
  progressTextCV.textContent = "Loading PDF...";

  const arrayBuffer = await pdfFileCV.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const maxPage = pdf.numPages;

  let pagesToProcess = [];
  try {
    pagesToProcess = parsePageRange(pageRangeInputCV.value, maxPage);
    if (pagesToProcess.length === 0) pagesToProcess = Array.from({ length: maxPage }, (_, i) => i + 1);
  } catch {
    pagesToProcess = Array.from({ length: maxPage }, (_, i) => i + 1);
  }

  let paragraphs = [];

  for (let i = 0; i < pagesToProcess.length; i++) {
    const pageNum = pagesToProcess[i];
    progressTextCV.textContent = `Extracting text from page ${pageNum} of ${maxPage}...`;
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items.map(item => item.str).join(" ");

    paragraphs.push(new docx.Paragraph(pageText));

    progressBarCV.value = ((i + 1) / pagesToProcess.length) * 100;
    await new Promise(r => setTimeout(r, 10)); // keep UI responsive
  }

  progressTextCV.textContent = "Building Word document...";
  const doc = new docx.Document({
    sections: [{
      properties: {},
      children: paragraphs
    }]
  });

  const blob = await docx.Packer.toBlob(doc);
  saveBlob(blob, pdfFileCV.name.replace(".pdf", ".docx"));

  progressTextCV.textContent = "Word conversion done!";
  setTimeout(() => {
    progressBarCV.style.display = "none";
    progressTextCV.textContent = "";
  }, 3000);
});

// OCR-based PDF to Excel

async function renderPageToCanvas(pdf, pageNum) {
  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale: 2 }); // High res for OCR
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas;
}

async function ocrPageImage(canvas) {
  const { data: { text } } = await Tesseract.recognize(
    canvas,
    'eng',
    { logger: m => console.log(m) }
  );
  return text;
}

toOcrExcelBtn.addEventListener("click", async () => {
  if (!pdfFileCV) {
    alert("Please upload a PDF first.");
    return;
  }

  progressBarCV.style.display = "block";
  progressBarCV.value = 0;
  progressTextCV.textContent = "Loading PDF...";

  const arrayBuffer = await pdfFileCV.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const maxPage = pdf.numPages;
  let pagesToProcess = [];
  try {
    pagesToProcess = parsePageRange(pageRangeInputCV.value, maxPage);
    if (pagesToProcess.length === 0) pagesToProcess = Array.from({ length: maxPage }, (_, i) => i + 1);
  } catch {
    pagesToProcess = Array.from({ length: maxPage }, (_, i) => i + 1);
  }

  let sheetData = [];

  for (let i = 0; i < pagesToProcess.length; i++) {
    const pageNum = pagesToProcess[i];
    progressTextCV.textContent = `Rendering page ${pageNum} of ${maxPage}...`;
    const canvas = await renderPageToCanvas(pdf, pageNum);

    progressTextCV.textContent = `Performing OCR on page ${pageNum} of ${maxPage}...`;
    const ocrText = await ocrPageImage(canvas);

    // Split OCR text into lines and simple heuristic for tables
    const rows = ocrText.split(/\r?\n/).map(r => r.trim()).filter(r => r.length > 0);
    rows.forEach(row => {
      // Split by multiple spaces or tabs, naive column split
      const cols = row.split(/ {2,}|\t/);
      sheetData.push(cols);
    });

    progressBarCV.value = ((i + 1) / pagesToProcess.length) * 100;
    await new Promise(r => setTimeout(r, 10));
  }

  progressTextCV.textContent = "Building Excel file...";
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "OCR PDF Data");
  XLSX.writeFile(wb, pdfFileCV.name.replace(".pdf", "_OCR.xlsx"));

  progressTextCV.textContent = "OCR Excel conversion done!";
  setTimeout(() => {
    progressBarCV.style.display = "none";
    progressTextCV.textContent = "";
  }, 4000);
});

/* -------- Helpers -------- */

function downloadFile(data, filename) {
  const blob = new Blob([data], { type: "application/pdf" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

function saveBlob(blob, filename) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}
