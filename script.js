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











// Clear thumbnails before adding if you want
// thumbnailsMS.innerHTML = "";

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
  div.draggable = true;
  div.innerHTML = `<img src="${canvas.toDataURL()}" alt="Thumbnail"><br>${file.name}`;
  
  // Set data-index attribute for tracking
  div.dataset.fileName = file.name;

  // Add drag event listeners
  div.addEventListener("dragstart", e => {
    div.classList.add("dragging");
    e.dataTransfer.setData("text/plain", file.name);
  });
  div.addEventListener("dragend", () => {
    div.classList.remove("dragging");
  });

  thumbnailsMS.appendChild(div);
}

// Enable dropping in thumbnails container
thumbnailsMS.addEventListener("dragover", e => {
  e.preventDefault();
  const draggingElem = thumbnailsMS.querySelector(".dragging");
  const afterElement = getDragAfterElement(thumbnailsMS, e.clientY);
  if (afterElement == null) {
    thumbnailsMS.appendChild(draggingElem);
  } else {
    thumbnailsMS.insertBefore(draggingElem, afterElement);
  }
});

// Helper to find the closest element after the drag position vertically
function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll(".thumbnail:not(.dragging)")];

  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// Update your merge button handler to reorder pdfFilesMS array based on thumbnail order before merging
mergeBtn.addEventListener("click", async () => {
  if (pdfFilesMS.length < 2) {
    alert("Please add at least 2 PDFs to merge.");
    return;
  }

  // Reorder pdfFilesMS to match thumbnail order
  const orderedFiles = [];
  const thumbs = thumbnailsMS.querySelectorAll(".thumbnail");
  thumbs.forEach(th => {
    const name = th.dataset.fileName;
    const file = pdfFilesMS.find(f => f.name === name);
    if (file) orderedFiles.push(file);
  });
  pdfFilesMS = orderedFiles;

  // Continue with existing merge code...
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





// --- PDF to JPG Tab logic ---

const dropZoneJPG = document.getElementById("drop-zone-jpg");
const fileInputJPG = document.getElementById("file-input-jpg");
const fileInfoJPG = document.getElementById("file-info-jpg");
const pageRangeInputJPG = document.getElementById("page-range-jpg");
const convertToJpgBtn = document.getElementById("convert-to-jpg-btn");
const progressBarJPG = document.getElementById("progress-jpg");
const progressTextJPG = document.getElementById("progress-text-jpg");
const jpgResults = document.getElementById("jpg-results");

let pdfFileJPG = null;

dropZoneJPG.addEventListener("click", () => fileInputJPG.click());
dropZoneJPG.addEventListener("dragover", e => {
  e.preventDefault();
  dropZoneJPG.style.backgroundColor = "#eef";
});
dropZoneJPG.addEventListener("dragleave", () => {
  dropZoneJPG.style.backgroundColor = "white";
});
dropZoneJPG.addEventListener("drop", e => {
  e.preventDefault();
  dropZoneJPG.style.backgroundColor = "white";
  handleFileJPG(e.dataTransfer.files);
});
fileInputJPG.addEventListener("change", e => handleFileJPG(e.target.files));

function handleFileJPG(files) {
  if (files.length === 0) return;
  const file = files[0];
  if (file.type !== "application/pdf") {
    alert("Please upload a PDF file.");
    return;
  }
  pdfFileJPG = file;
  fileInfoJPG.textContent = `Selected file: ${file.name}`;
  jpgResults.innerHTML = "";
}

convertToJpgBtn.addEventListener("click", async () => {
  if (!pdfFileJPG) {
    alert("Please upload a PDF first.");
    return;
  }
  progressBarJPG.style.display = "block";
  progressBarJPG.value = 0;
  progressTextJPG.textContent = "Loading PDF...";

  const arrayBuffer = await pdfFileJPG.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const maxPage = pdf.numPages;

  let pagesToProcess = [];
  try {
    pagesToProcess = parsePageRange(pageRangeInputJPG.value, maxPage);
    if (pagesToProcess.length === 0) pagesToProcess = Array.from({ length: maxPage }, (_, i) => i + 1);
  } catch {
    pagesToProcess = Array.from({ length: maxPage }, (_, i) => i + 1);
  }

  jpgResults.innerHTML = "";

  for (let i = 0; i < pagesToProcess.length; i++) {
    const pageNum = pagesToProcess[i];
    progressTextJPG.textContent = `Rendering page ${pageNum} of ${maxPage}...`;
    const page = await pdf.getPage(pageNum);

    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport }).promise;

    // Convert canvas to blob/jpeg and download
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${pdfFileJPG.name.replace(".pdf", "")}_page${pageNum}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/jpeg", 0.95);

    // Show thumbnail preview
    const img = document.createElement("img");
    img.src = canvas.toDataURL("image/jpeg", 0.9);
    img.alt = `Page ${pageNum}`;
    jpgResults.appendChild(img);

    progressBarJPG.value = ((i + 1) / pagesToProcess.length) * 100;
    await new Promise(r => setTimeout(r, 10)); // allow UI update
  }

  progressTextJPG.textContent = "Conversion complete!";
  setTimeout(() => {
    progressBarJPG.style.display = "none";
    progressTextJPG.textContent = "";
  }, 3000);
});










// --- WebP to JPG Tab logic ---

const dropZoneWebP = document.getElementById("drop-zone-webp");
const fileInputWebP = document.getElementById("file-input-webp");
const fileInfoWebP = document.getElementById("file-info-webp");
const convertWebPToJpgBtn = document.getElementById("convert-webp-to-jpg-btn");
const progressBarWebP = document.getElementById("progress-webp");
const progressTextWebP = document.getElementById("progress-text-webp");
const webpJpgResults = document.getElementById("webp-jpg-results");

let webpFiles = [];

dropZoneWebP.addEventListener("click", () => fileInputWebP.click());
dropZoneWebP.addEventListener("dragover", e => {
  e.preventDefault();
  dropZoneWebP.style.backgroundColor = "#eef";
});
dropZoneWebP.addEventListener("dragleave", () => {
  dropZoneWebP.style.backgroundColor = "white";
});
dropZoneWebP.addEventListener("drop", e => {
  e.preventDefault();
  dropZoneWebP.style.backgroundColor = "white";
  handleFilesWebP(e.dataTransfer.files);
});
fileInputWebP.addEventListener("change", e => handleFilesWebP(e.target.files));

function handleFilesWebP(files) {
  webpFiles = [];
  webpJpgResults.innerHTML = "";
  fileInfoWebP.textContent = "";

  for (const file of files) {
    if (file.type !== "image/webp") continue;
    webpFiles.push(file);
  }

  if (webpFiles.length > 0) {
    fileInfoWebP.textContent = `Selected ${webpFiles.length} WebP file(s)`;
  } else {
    fileInfoWebP.textContent = "No valid WebP files selected.";
  }
}

convertWebPToJpgBtn.addEventListener("click", async () => {
  if (webpFiles.length === 0) {
    alert("Please upload at least one WebP image.");
    return;
  }

  progressBarWebP.style.display = "block";
  progressBarWebP.value = 0;
  progressTextWebP.textContent = "Converting images...";

  webpJpgResults.innerHTML = "";

  for (let i = 0; i < webpFiles.length; i++) {
    const file = webpFiles[i];
    const imgUrl = URL.createObjectURL(file);

    // Create an image element
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = imgUrl;
    });

    // Draw the image on canvas
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    // Convert canvas to JPEG blob
    const blob = await new Promise(resolve => {
      canvas.toBlob(resolve, "image/jpeg", 0.95);
    });

    // Download the JPEG file
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = file.name.replace(/\.webp$/i, ".jpg");
    a.click();
    URL.revokeObjectURL(a.href);

    // Show preview
    const previewImg = document.createElement("img");
    previewImg.src = canvas.toDataURL("image/jpeg", 0.9);
    previewImg.alt = file.name.replace(/\.webp$/i, ".jpg");
    webpJpgResults.appendChild(previewImg);

    progressBarWebP.value = ((i + 1) / webpFiles.length) * 100;
    await new Promise(r => setTimeout(r, 10));
  }

  progressTextWebP.textContent = "Conversion complete!";
  setTimeout(() => {
    progressBarWebP.style.display = "none";
    progressTextWebP.textContent = "";
  }, 3000);
});



const webpUrlInput = document.getElementById("webp-url-input");
const loadWebpUrlBtn = document.getElementById("load-webp-url-btn");

loadWebpUrlBtn.addEventListener("click", () => {
  const url = webpUrlInput.value.trim();
  if (!url) {
    alert("Please enter a valid URL.");
    return;
  }
  if (!url.toLowerCase().endsWith(".webp")) {
    alert("Please enter a URL ending with .webp");
    return;
  }

  // Clear previous files & results
  webpFiles = [];
  webpJpgResults.innerHTML = "";
  fileInfoWebP.textContent = `Loaded image from URL: ${url}`;

  // Fetch the image as a blob and convert to File-like object
  fetch(url)
    .then(res => {
      if (!res.ok) throw new Error("Failed to fetch image");
      return res.blob();
    })
    .then(blob => {
      // Create a File object from blob
      const file = new File([blob], url.split("/").pop(), { type: "image/webp" });
      webpFiles.push(file);
    })
    .catch(err => {
      alert("Error loading image from URL: " + err.message);
      fileInfoWebP.textContent = "";
    });
});
















// --- AVIF to JPG Tab logic ---

const dropZoneAVIF = document.getElementById("drop-zone-avif");
const fileInputAVIF = document.getElementById("file-input-avif");
const fileInfoAVIF = document.getElementById("file-info-avif");
const convertAvifToJpgBtn = document.getElementById("convert-avif-to-jpg-btn");
const progressBarAVIF = document.getElementById("progress-avif");
const progressTextAVIF = document.getElementById("progress-text-avif");
const avifJpgResults = document.getElementById("avif-jpg-results");

let avifFiles = [];

dropZoneAVIF.addEventListener("click", () => fileInputAVIF.click());
dropZoneAVIF.addEventListener("dragover", e => {
  e.preventDefault();
  dropZoneAVIF.style.backgroundColor = "#eef";
});
dropZoneAVIF.addEventListener("dragleave", () => {
  dropZoneAVIF.style.backgroundColor = "white";
});
dropZoneAVIF.addEventListener("drop", e => {
  e.preventDefault();
  dropZoneAVIF.style.backgroundColor = "white";
  handleFilesAVIF(e.dataTransfer.files);
});
fileInputAVIF.addEventListener("change", e => handleFilesAVIF(e.target.files));

function handleFilesAVIF(files) {
  avifFiles = [];
  avifJpgResults.innerHTML = "";
  fileInfoAVIF.textContent = "";

  for (const file of files) {
    if (file.type !== "image/avif") continue;
    avifFiles.push(file);
  }

  if (avifFiles.length > 0) {
    fileInfoAVIF.textContent = `Selected ${avifFiles.length} AVIF file(s)`;
  } else {
    fileInfoAVIF.textContent = "No valid AVIF files selected.";
  }
}

convertAvifToJpgBtn.addEventListener("click", async () => {
  if (avifFiles.length === 0) {
    alert("Please upload at least one AVIF image.");
    return;
  }

  progressBarAVIF.style.display = "block";
  progressBarAVIF.value = 0;
  progressTextAVIF.textContent = "Converting images...";

  avifJpgResults.innerHTML = "";

  for (let i = 0; i < avifFiles.length; i++) {
    const file = avifFiles[i];
    const imgUrl = URL.createObjectURL(file);

    // Create an image element
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = imgUrl;
    });

    // Draw the image on canvas
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    // Convert canvas to JPEG blob
    const blob = await new Promise(resolve => {
      canvas.toBlob(resolve, "image/jpeg", 0.95);
    });

    // Download the JPEG file
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = file.name.replace(/\.avif$/i, ".jpg");
    a.click();
    URL.revokeObjectURL(a.href);

    // Show preview
    const previewImg = document.createElement("img");
    previewImg.src = canvas.toDataURL("image/jpeg", 0.9);
    previewImg.alt = file.name.replace(/\.avif$/i, ".jpg");
    avifJpgResults.appendChild(previewImg);

    progressBarAVIF.value = ((i + 1) / avifFiles.length) * 100;
    await new Promise(r => setTimeout(r, 10));
  }

  progressTextAVIF.textContent = "Conversion complete!";
  setTimeout(() => {
    progressBarAVIF.style.display = "none";
    progressTextAVIF.textContent = "";
  }, 3000);
});









// --- BMP to JPG/PNG Tab logic ---

const dropZoneBMP = document.getElementById("drop-zone-bmp");
const fileInputBMP = document.getElementById("file-input-bmp");
const fileInfoBMP = document.getElementById("file-info-bmp");
const convertBmpToJpgBtn = document.getElementById("convert-bmp-to-jpg-btn");
const convertBmpToPngBtn = document.getElementById("convert-bmp-to-png-btn");
const progressBarBMP = document.getElementById("progress-bmp");
const progressTextBMP = document.getElementById("progress-text-bmp");
const bmpResults = document.getElementById("bmp-results");

let bmpFiles = [];

dropZoneBMP.addEventListener("click", () => fileInputBMP.click());
dropZoneBMP.addEventListener("dragover", e => {
  e.preventDefault();
  dropZoneBMP.style.backgroundColor = "#eef";
});
dropZoneBMP.addEventListener("dragleave", () => {
  dropZoneBMP.style.backgroundColor = "white";
});
dropZoneBMP.addEventListener("drop", e => {
  e.preventDefault();
  dropZoneBMP.style.backgroundColor = "white";
  handleFilesBMP(e.dataTransfer.files);
});
fileInputBMP.addEventListener("change", e => handleFilesBMP(e.target.files));

function handleFilesBMP(files) {
  bmpFiles = [];
  bmpResults.innerHTML = "";
  fileInfoBMP.textContent = "";

  for (const file of files) {
    if (file.type !== "image/bmp") continue;
    bmpFiles.push(file);
  }

  if (bmpFiles.length > 0) {
    fileInfoBMP.textContent = `Selected ${bmpFiles.length} BMP file(s)`;
  } else {
    fileInfoBMP.textContent = "No valid BMP files selected.";
  }
}

async function convertBMPFilesTo(type) {
  if (bmpFiles.length === 0) {
    alert("Please upload at least one BMP image.");
    return;
  }

  progressBarBMP.style.display = "block";
  progressBarBMP.value = 0;
  progressTextBMP.textContent = `Converting BMP to ${type.toUpperCase()}...`;

  bmpResults.innerHTML = "";

  for (let i = 0; i < bmpFiles.length; i++) {
    const file = bmpFiles[i];
    const imgUrl = URL.createObjectURL(file);

    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load BMP image"));
      img.src = imgUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    const blob = await new Promise(resolve => {
      canvas.toBlob(resolve, `image/${type}`, 0.95);
    });

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = file.name.replace(/\.bmp$/i, `.${type}`);
    a.click();
    URL.revokeObjectURL(a.href);

    const previewImg = document.createElement("img");
    previewImg.src = canvas.toDataURL(`image/${type}`, 0.9);
    previewImg.alt = file.name.replace(/\.bmp$/i, `.${type}`);
    bmpResults.appendChild(previewImg);

    progressBarBMP.value = ((i + 1) / bmpFiles.length) * 100;
    await new Promise(r => setTimeout(r, 10));
  }

  progressTextBMP.textContent = "Conversion complete!";
  setTimeout(() => {
    progressBarBMP.style.display = "none";
    progressTextBMP.textContent = "";
  }, 3000);
}

convertBmpToJpgBtn.addEventListener("click", () => convertBMPFilesTo("jpeg"));
convertBmpToPngBtn.addEventListener("click", () => convertBMPFilesTo("png"));








// --- TIFF to JPG/PNG Tab logic ---

const dropZoneTIFF = document.getElementById("drop-zone-tiff");
const fileInputTIFF = document.getElementById("file-input-tiff");
const fileInfoTIFF = document.getElementById("file-info-tiff");
const convertTiffToJpgBtn = document.getElementById("convert-tiff-to-jpg-btn");
const convertTiffToPngBtn = document.getElementById("convert-tiff-to-png-btn");
const progressBarTIFF = document.getElementById("progress-tiff");
const progressTextTIFF = document.getElementById("progress-text-tiff");
const tiffResults = document.getElementById("tiff-results");

let tiffFiles = [];

dropZoneTIFF.addEventListener("click", () => fileInputTIFF.click());
dropZoneTIFF.addEventListener("dragover", e => {
  e.preventDefault();
  dropZoneTIFF.style.backgroundColor = "#eef";
});
dropZoneTIFF.addEventListener("dragleave", () => {
  dropZoneTIFF.style.backgroundColor = "white";
});
dropZoneTIFF.addEventListener("drop", e => {
  e.preventDefault();
  dropZoneTIFF.style.backgroundColor = "white";
  handleFilesTIFF(e.dataTransfer.files);
});
fileInputTIFF.addEventListener("change", e => handleFilesTIFF(e.target.files));

function handleFilesTIFF(files) {
  tiffFiles = [];
  tiffResults.innerHTML = "";
  fileInfoTIFF.textContent = "";

  for (const file of files) {
    if (file.type !== "image/tiff" && file.type !== "image/tif") continue;
    tiffFiles.push(file);
  }

  if (tiffFiles.length > 0) {
    fileInfoTIFF.textContent = `Selected ${tiffFiles.length} TIFF file(s)`;
  } else {
    fileInfoTIFF.textContent = "No valid TIFF files selected.";
  }
}

async function convertTIFFFilesTo(type) {
  if (tiffFiles.length === 0) {
    alert("Please upload at least one TIFF image.");
    return;
  }

  progressBarTIFF.style.display = "block";
  progressBarTIFF.value = 0;
  progressTextTIFF.textContent = `Converting TIFF to ${type.toUpperCase()}...`;

  tiffResults.innerHTML = "";

  for (let i = 0; i < tiffFiles.length; i++) {
    const file = tiffFiles[i];
    const arrayBuffer = await file.arrayBuffer();

    try {
      // Decode TIFF using tiff.js
      const tiff = new Tiff({ buffer: arrayBuffer });
      const canvas = tiff.toCanvas();
      if (!canvas) throw new Error("Failed to decode TIFF");

      // Convert canvas to Blob
      const blob = await new Promise(resolve => {
        canvas.toBlob(resolve, `image/${type}`, 0.95);
      });

      // Download file
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = file.name.replace(/\.(tiff|tif)$/i, `.${type}`);
      a.click();
      URL.revokeObjectURL(a.href);

      // Show preview
      const previewImg = document.createElement("img");
      previewImg.src = canvas.toDataURL(`image/${type}`, 0.9);
      previewImg.alt = file.name.replace(/\.(tiff|tif)$/i, `.${type}`);
      tiffResults.appendChild(previewImg);

      progressBarTIFF.value = ((i + 1) / tiffFiles.length) * 100;
      await new Promise(r => setTimeout(r, 10));
    } catch (err) {
      alert(`Failed to convert ${file.name}: ${err.message}`);
    }
  }

  progressTextTIFF.textContent = "Conversion complete!";
  setTimeout(() => {
    progressBarTIFF.style.display = "none";
    progressTextTIFF.textContent = "";
  }, 3000);
}

convertTiffToJpgBtn.addEventListener("click", () => convertTIFFFilesTo("jpeg"));
convertTiffToPngBtn.addEventListener("click", () => convertTIFFFilesTo("png"));
