const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const thumbnailContainer = document.getElementById('thumbnail-container');

let pdfFiles = [];

dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.style.background = '#eef'; });
dropZone.addEventListener('dragleave', () => dropZone.style.background = 'white');
dropZone.addEventListener('drop', handleDrop);
fileInput.addEventListener('change', e => handleFiles(e.target.files));

function handleDrop(e) {
  e.preventDefault();
  dropZone.style.background = 'white';
  handleFiles(e.dataTransfer.files);
}

function handleFiles(files) {
  for (let file of files) {
    if (file.type === "application/pdf") {
      pdfFiles.push(file);
      generateThumbnail(file);
    }
  }
}

async function generateThumbnail(file) {
  const fileReader = new FileReader();
  fileReader.onload = async function() {
    const pdfData = new Uint8Array(this.result);
    const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 0.5 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    await page.render({ canvasContext: context, viewport }).promise;

    const thumbDiv = document.createElement('div');
    thumbDiv.classList.add('thumbnail');
    thumbDiv.innerHTML = `<img src="${canvas.toDataURL()}"><p>${file.name}</p>`;
    thumbnailContainer.appendChild(thumbDiv);
  };
  fileReader.readAsArrayBuffer(file);
}

// Merge PDFs
document.getElementById('merge-btn').addEventListener('click', async () => {
  const mergedPdf = await PDFLib.PDFDocument.create();
  for (let file of pdfFiles) {
    const bytes = await file.arrayBuffer();
    const pdf = await PDFLib.PDFDocument.load(bytes);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach(p => mergedPdf.addPage(p));
  }
  const mergedBytes = await mergedPdf.save();
  downloadFile(mergedBytes, "merged.pdf");
});

// Split PDFs
document.getElementById('split-btn').addEventListener('click', async () => {
  for (let file of pdfFiles) {
    const bytes = await file.arrayBuffer();
    const pdf = await PDFLib.PDFDocument.load(bytes);
    for (let i = 0; i < pdf.getPageCount(); i++) {
      const newPdf = await PDFLib.PDFDocument.create();
      const [page] = await newPdf.copyPages(pdf, [i]);
      newPdf.addPage(page);
      const pdfBytes = await newPdf.save();
      downloadFile(pdfBytes, `${file.name.replace('.pdf', '')}_page${i+1}.pdf`);
    }
  }
});

// Convert PDF to Excel
document.getElementById('convert-excel-btn').addEventListener('click', async () => {
  for (let file of pdfFiles) {
    const textData = await extractTextFromPDF(file);
    const rows = textData.split('\n').map(r => [r]); // simple row split
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, file.name.replace('.pdf', '.xlsx'));
  }
});

// Convert PDF to Word
document.getElementById('convert-word-btn').addEventListener('click', async () => {
  for (let file of pdfFiles) {
    const textData = await extractTextFromPDF(file);
    const doc = new docx.Document({
      sections: [{
        properties: {},
        children: [new docx.Paragraph(textData)]
      }]
    });
    const blob = await docx.Packer.toBlob(doc);
    downloadFile(await blob.arrayBuffer(), file.name.replace('.pdf', '.docx'));
  }
});

async function extractTextFromPDF(file) {
  const fileReader = new FileReader();
  return new Promise(resolve => {
    fileReader.onload = async function() {
      const pdfData = new Uint8Array(this.result);
      const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
      let text = "";
      for (let i = 0; i < pdf.numPages; i++) {
        const page = await pdf.getPage(i + 1);
        const content = await page.getTextContent();
        text += content.items.map(s => s.str).join(' ') + '\n';
      }
      resolve(text);
    };
    fileReader.readAsArrayBuffer(file);
  });
}

function downloadFile(data, filename) {
  const blob = new Blob([data], { type: "application/octet-stream" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}
