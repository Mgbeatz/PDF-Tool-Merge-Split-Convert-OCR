// Tab switching
const tabs = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");

tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    tabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    const target = tab.dataset.tab;
    tabContents.forEach(c => {
      c.classList.toggle("active", c.id === target);
    });
  });
});

/* -------- Merge & Split Tab -------- */

const dropZoneMS = document.getElementById("drop-zone-ms");
const fileInputMS = document.getElementById("file-input-ms");
const thumbnailsMS = document.getElementById("thumbnail-container-ms");
const mergeBtn = document.getElementById("merge-btn");
const splitBtn = document.getElementById("split-btn");

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

mergeBtn.addEventListener("click", async () => {
  if (pdfFilesMS.length < 2) {
    alert("Please add at least 2 PDFs to merge.");
    return;
  }
  const mergedPdf = await PDFLib.PDFDocument.create();
  for (const file of pdfFilesMS) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach(page => mergedPdf.addPage(page));
  }
  const mergedBytes = await mergedPdf.save();
  downloadFile(mergedBytes, "merged.pdf");
});

splitBtn.addEventListener("click", async () => {
  if (pdfFilesMS.length === 0) {
    alert("Please add PDFs to split.");
    return;
  }
  for (const file of pdfFilesMS) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
    const totalPages = pdf.getPageCount();

    for (let i = 0; i < totalPages; i++) {
      const newPdf = await PDFLib.PDFDocument.create();
      const [page] = await newPdf.copyPages(pdf, [i]);
      newPdf.addPage(page);
      const pdfBytes = await newPdf.save();
      downloadFile(pdfBytes, `${file.name.replace(".pdf", "")}_page${i + 1}.pdf`);
    }
  }
});

/* -------- Convert Tab -------- */

const dropZoneCV = document.getElementById("drop-zone-cv");
const fileInputCV = document.getElementById("file-input-cv");
const fileInfoCV = document.getElementById("file-info-cv");
const toExcelBtn = document.getElementById("to-excel-btn");
const toWordBtn = document.getElementById("to-word-btn");

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

toExcelBtn.addEventListener("click", async () => {
  if (!pdfFileCV) {
    alert("Please upload a PDF first.");
    return;
  }
  const textPages = await extractTextByPage(pdfFileCV);
  let sheetData = [];
  textPages.forEach((pageText, idx) => {
    sheetData.push([`Page ${idx + 1}`]);
    // Very naive split by line breaks
    const rows = pageText.split(/\r?\n/);
    rows.forEach(row => sheetData.push([row]));
  });
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "PDF Data");
  XLSX.writeFile(wb, pdfFileCV.name.replace(".pdf", ".xlsx"));
});

toWordBtn.addEventListener("click", async () => {
  if (!pdfFileCV) {
    alert("Please upload a PDF first.");
    return;
  }
  const textPages = await extractTextByPage(pdfFileCV);
  const doc = new docx.Document();
  textPages.forEach(pageText => {
    doc.addSection({ children: [new docx.Paragraph(pageText)] });
  });
  const blob = await docx.Packer.toBlob(doc);
  saveBlob(blob, pdfFileCV.name.replace(".pdf", ".docx"));
});

/* -------- Helpers -------- */

async function extractTextByPage(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map(item => item.str);
    pages.push(strings.join(" "));
  }
  return pages;
}

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
