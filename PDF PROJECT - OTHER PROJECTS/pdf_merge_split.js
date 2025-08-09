const dropZone = document.getElementById("drop-zone"); 
const fileInput = document.getElementById("file-input");
const fileList = document.getElementById("file-list");
const mergeBtn = document.getElementById("merge-btn");
const splitBtn = document.getElementById("split-btn");
const output = document.getElementById("output");

let pdfFiles = [];

// Click on drop zone opens file picker
dropZone.addEventListener("click", () => fileInput.click());

// Drag events
dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.style.backgroundColor = "#0af2";
});

dropZone.addEventListener("dragleave", (e) => {
  e.preventDefault();
  dropZone.style.backgroundColor = "#222";
});

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.style.backgroundColor = "#222";
  handleFiles(e.dataTransfer.files);
});

// File input change event
fileInput.addEventListener("change", (e) => {
  handleFiles(e.target.files);
});

// Handle files selected or dropped
function handleFiles(files) {
  for (const file of files) {
    if (file.type !== "application/pdf") {
      alert(`File ${file.name} is not a PDF.`);
      continue;
    }
    pdfFiles.push(file);
  }
  updateFileList();
}

// Update file list display
function updateFileList() {
  fileList.innerHTML = "";
  pdfFiles.forEach((file, i) => {
    const div = document.createElement("div");
    div.textContent = `${i + 1}. ${file.name}`;
    fileList.appendChild(div);
  });
}

const { PDFDocument } = PDFLib;

// Merge PDFs function
async function mergePDFs(files) {
  const mergedPdf = await PDFDocument.create();

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach(page => mergedPdf.addPage(page));
  }

  const mergedPdfFile = await mergedPdf.save();
  download(new Blob([mergedPdfFile], { type: "application/pdf" }), "merged.pdf");
  output.textContent = "PDFs merged successfully!";
}

// Split PDF function (splits first PDF into single-page PDFs)
async function splitPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(arrayBuffer);

  for (let i = 0; i < pdf.getPageCount(); i++) {
    const newPdf = await PDFDocument.create();
    const [copiedPage] = await newPdf.copyPages(pdf, [i]);
    newPdf.addPage(copiedPage);
    const pdfBytes = await newPdf.save();
    download(new Blob([pdfBytes], { type: "application/pdf" }), `page_${i + 1}.pdf`);
  }
  output.textContent = "PDF split into individual pages successfully!";
}

// Download helper
function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Async event handlers for buttons
mergeBtn.addEventListener("click", async () => {
  if (pdfFiles.length < 2) {
    alert("Please add at least two PDF files to merge.");
    return;
  }
  output.textContent = "Merging PDFs...";
  await mergePDFs(pdfFiles);
});

splitBtn.addEventListener("click", async () => {
  if (pdfFiles.length === 0) {
    alert("Please add at least one PDF file to split.");
    return;
  }
  output.textContent = "Splitting PDF...";
  await splitPDF(pdfFiles[0]);  // Only split the first PDF file
});
