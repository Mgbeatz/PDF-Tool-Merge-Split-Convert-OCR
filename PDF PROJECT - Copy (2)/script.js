let files = [];
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const statusText = document.getElementById('status');
const progressContainer = document.getElementById('progress-container');
const progressBar = document.getElementById('progress-bar');

// Click drop zone to select files
dropZone.addEventListener('click', () => fileInput.click());

// Handle file selection
fileInput.addEventListener('change', (e) => {
    files = Array.from(e.target.files);
    updateStatus(`${files.length} PDF(s) selected`);
});

// Handle drag & drop
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    files = Array.from(e.dataTransfer.files);
    updateStatus(`${files.length} PDF(s) selected`);
});

// Merge PDFs
document.getElementById('merge-btn').addEventListener('click', async () => {
    if (files.length < 2) {
        alert('Please select at least two PDFs to merge.');
        return;
    }
    updateStatus("Merging PDFs...");
    showProgress(true);
    
    const mergedPdf = await PDFLib.PDFDocument.create();

    for (let i = 0; i < files.length; i++) {
        const arrayBuffer = await files[i].arrayBuffer();
        const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));

        updateProgress(((i + 1) / files.length) * 100);
    }

    const mergedPdfBytes = await mergedPdf.save();
    downloadPdf(mergedPdfBytes, "merged.pdf");

    updateStatus("Merge complete! Downloaded merged.pdf");
    showProgress(false);
});

// Split PDF
document.getElementById('split-btn').addEventListener('click', async () => {
    if (files.length !== 1) {
        alert('Please select exactly one PDF to split.');
        return;
    }
    updateStatus("Splitting PDF...");
    showProgress(true);

    const arrayBuffer = await files[0].arrayBuffer();
    const pdf = await PDFLib.PDFDocument.load(arrayBuffer);

    for (let i = 0; i < pdf.getPageCount(); i++) {
        const newPdf = await PDFLib.PDFDocument.create();
        const [copiedPage] = await newPdf.copyPages(pdf, [i]);
        newPdf.addPage(copiedPage);
        const pdfBytes = await newPdf.save();
        downloadPdf(pdfBytes, `page_${i + 1}.pdf`);

        updateProgress(((i + 1) / pdf.getPageCount()) * 100);
    }

    updateStatus("Split complete! All pages downloaded.");
    showProgress(false);
});

// Download helper
function downloadPdf(bytes, filename) {
    const blob = new Blob([bytes], { type: "application/pdf" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}

// Status and Progress UI
function updateStatus(message) {
    statusText.textContent = message;
}

function updateProgress(percent) {
    progressBar.style.width = percent + "%";
}

function showProgress(show) {
    progressContainer.style.display = show ? "block" : "none";
    if (!show) updateProgress(0);
}
