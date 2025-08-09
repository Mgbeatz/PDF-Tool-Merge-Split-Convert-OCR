let files = [];

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');

// Click drop zone to select files
dropZone.addEventListener('click', () => fileInput.click());

// Handle file selection
fileInput.addEventListener('change', (e) => {
    files = Array.from(e.target.files);
    dropZone.textContent = files.length + " PDF(s) selected";
});

// Handle drag & drop
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = '#4CAF50';
});
dropZone.addEventListener('dragleave', () => {
    dropZone.style.borderColor = '#aaa';
});
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    files = Array.from(e.dataTransfer.files);
    dropZone.textContent = files.length + " PDF(s) selected";
});

// Merge PDFs
document.getElementById('merge-btn').addEventListener('click', async () => {
    if (files.length < 2) {
        alert('Please select at least two PDFs to merge.');
        return;
    }

    const mergedPdf = await PDFLib.PDFDocument.create();

    for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
    }

    const mergedPdfBytes = await mergedPdf.save();
    downloadPdf(mergedPdfBytes, "merged.pdf");
});

// Split PDF
document.getElementById('split-btn').addEventListener('click', async () => {
    if (files.length !== 1) {
        alert('Please select exactly one PDF to split.');
        return;
    }

    const arrayBuffer = await files[0].arrayBuffer();
    const pdf = await PDFLib.PDFDocument.load(arrayBuffer);

    for (let i = 0; i < pdf.getPageCount(); i++) {
        const newPdf = await PDFLib.PDFDocument.create();
        const [copiedPage] = await newPdf.copyPages(pdf, [i]);
        newPdf.addPage(copiedPage);
        const pdfBytes = await newPdf.save();
        downloadPdf(pdfBytes, `page_${i + 1}.pdf`);
    }
});

// Download helper
function downloadPdf(bytes, filename) {
    const blob = new Blob([bytes], { type: "application/pdf" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}
