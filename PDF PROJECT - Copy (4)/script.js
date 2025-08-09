let files = [];
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const statusText = document.getElementById('status');
const progressContainer = document.getElementById('progress-container');
const progressBar = document.getElementById('progress-bar');
const pageRangeInput = document.getElementById('page-range');
const fileList = document.getElementById('file-list');

// Click drop zone to select files
dropZone.addEventListener('click', () => fileInput.click());

// Handle file selection
fileInput.addEventListener('change', (e) => {
    files = files.concat(Array.from(e.target.files));
    renderFileList();
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
    files = files.concat(Array.from(e.dataTransfer.files));
    renderFileList();
    updateStatus(`${files.length} PDF(s) selected`);
});

// Render file list with reorder/remove
function renderFileList() {
    fileList.innerHTML = "";
    files.forEach((file, index) => {
        const li = document.createElement("li");
        li.textContent = file.name;

        const btnGroup = document.createElement("div");
        btnGroup.classList.add("move-btns");

        const upBtn = document.createElement("button");
        upBtn.textContent = "↑";
        upBtn.onclick = () => moveFile(index, -1);

        const downBtn = document.createElement("button");
        downBtn.textContent = "↓";
        downBtn.onclick = () => moveFile(index, 1);

        const removeBtn = document.createElement("button");
        removeBtn.textContent = "✖";
        removeBtn.onclick = () => removeFile(index);

        btnGroup.appendChild(upBtn);
        btnGroup.appendChild(downBtn);
        btnGroup.appendChild(removeBtn);

        li.appendChild(btnGroup);
        fileList.appendChild(li);
    });
}

// Move file order
function moveFile(index, direction) {
    const newIndex = index + direction;
    if (newIndex >= 0 && newIndex < files.length) {
        const temp = files[index];
        files[index] = files[newIndex];
        files[newIndex] = temp;
        renderFileList();
    }
}

// Remove file
function removeFile(index) {
    files.splice(index, 1);
    renderFileList();
    updateStatus(`${files.length} PDF(s) selected`);
}

// Merge PDFs
document.getElementById('merge-btn').addEventListener('click', async () => {
    if (files.length < 2) {
        alert('Please select at least two PDFs to merge.');
        return;
    }
    updateStatus("Merging PDFs...");
    showProgress(true);

    const mergedPdf = await PDFLib.PDFDocument.create();
    const pageRange = parsePageRange(pageRangeInput.value);

    for (let i = 0; i < files.length; i++) {
        const arrayBuffer = await files[i].arrayBuffer();
        const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
        const totalPages = pdf.getPageCount();

        const pagesToCopy = pageRange.length > 0
            ? pageRange.filter(p => p > 0 && p <= totalPages).map(p => p - 1)
            : pdf.getPageIndices();

        const copiedPages = await mergedPdf.copyPages(pdf, pagesToCopy);
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
    const totalPages = pdf.getPageCount();
    const pageRange = parsePageRange(pageRangeInput.value);

    const pagesToSplit = pageRange.length > 0
        ? pageRange.filter(p => p > 0 && p <= totalPages).map(p => p - 1)
        : pdf.getPageIndices();

    for (let i = 0; i < pagesToSplit.length; i++) {
        const newPdf = await PDFLib.PDFDocument.create();
        const [copiedPage] = await newPdf.copyPages(pdf, [pagesToSplit[i]]);
        newPdf.addPage(copiedPage);
        const pdfBytes = await newPdf.save();
        downloadPdf(pdfBytes, `page_${pagesToSplit[i] + 1}.pdf`);

        updateProgress(((i + 1) / pagesToSplit.length) * 100);
    }

    updateStatus("Split complete! Selected pages downloaded.");
    showProgress(false);
});

// Parse "1-3,5" to [1,2,3,5]
function parsePageRange(rangeStr) {
    if (!rangeStr.trim()) return [];
    const parts = rangeStr.split(',');
    let pages = [];
    parts.forEach(part => {
        if (part.includes('-')) {
            const [start, end] = part.split('-').map(Number);
            for (let i = start; i <= end; i++) pages.push(i);
        } else {
            pages.push(Number(part));
        }
    });
    return pages.filter(n => !isNaN(n));
}

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
