const dropArea = document.getElementById("drop-area");
const fileElem = document.getElementById("fileElem");
const thumbnails = document.getElementById("thumbnails");
const mergeBtn = document.getElementById("mergeBtn");
const splitBtn = document.getElementById("splitBtn");

let pdfFiles = []; // Store uploaded files

// Handle drag & drop
dropArea.addEventListener("click", () => fileElem.click());
fileElem.addEventListener("change", handleFiles);
dropArea.addEventListener("dragover", e => {
  e.preventDefault();
  dropArea.style.background = "#ddd";
});
dropArea.addEventListener("dragleave", () => dropArea.style.background = "white");
dropArea.addEventListener("drop", e => {
  e.preventDefault();
  dropArea.style.background = "white";
  handleFiles({ target: { files: e.dataTransfer.files } });
});

// Load PDFs and show thumbnails
async function handleFiles(event) {
  const files = event.target.files;
  for (let file of files) {
    if (file.type === "application/pdf") {
      pdfFiles.push(file);
      await renderThumbnails(file);
    }
  }
}

// Render PDF pages as thumbnails
async function renderThumbnails(file) {
  const fileReader = new FileReader();
  fileReader.onload = async function () {
    const typedarray = new Uint8Array(this.result);
    const pdf = await pdfjsLib.getDocument(typedarray).promise;
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 0.2 });
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: ctx, viewport }).promise;

      const thumbDiv = document.createElement("div");
      thumbDiv.className = "thumbnail";
      thumbDiv.innerHTML = `<p>Page ${pageNum}</p>`;
      thumbDiv.appendChild(canvas);

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.dataset.fileName = file.name;
      checkbox.dataset.pageNum = pageNum;
      thumbDiv.appendChild(checkbox);

      thumbnails.appendChild(thumbDiv);
    }
  };
  fileReader.readAsArrayBuffer(file);
}

// Merge PDFs
mergeBtn.addEventListener("click", async () => {
  if (pdfFiles.length < 2) return alert("Upload at least two PDFs to merge.");

  const mergedPdf = await PDFLib.PDFDocument.create();

  for (let file of pdfFiles) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach(page => mergedPdf.addPage(page));
  }

  const mergedBytes = await mergedPdf.save();
  downloadFile(mergedBytes, "merged.pdf");
});

// Split selected pages into new PDF
splitBtn.addEventListener("click", async () => {
  const selectedPages = [...document.querySelectorAll(".thumbnail input:checked")];

  if (!selectedPages.length) return alert("Select pages to split.");

  const splitPdf = await PDFLib.PDFDocument.create();

  for (let item of selectedPages) {
    const file = pdfFiles.find(f => f.name === item.dataset.fileName);
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
    const [page] = await splitPdf.copyPages(pdf, [parseInt(item.dataset.pageNum) - 1]);
    splitPdf.addPage(page);
  }

  const splitBytes = await splitPdf.save();
  downloadFile(splitBytes, "split.pdf");
});

// Helper function to download files
function downloadFile(bytes, filename) {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}
