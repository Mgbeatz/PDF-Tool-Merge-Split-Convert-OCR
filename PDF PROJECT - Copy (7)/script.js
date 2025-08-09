let pdfFiles = [];

// Handle file drop and click
document.getElementById("drop-zone").addEventListener("click", () => {
    document.getElementById("file-input").click();
});

document.getElementById("file-input").addEventListener("change", handleFiles);
document.getElementById("drop-zone").addEventListener("dragover", e => e.preventDefault());
document.getElementById("drop-zone").addEventListener("drop", e => {
    e.preventDefault();
    handleFiles({ target: { files: e.dataTransfer.files } });
});

function handleFiles(e) {
    let files = Array.from(e.target.files);
    pdfFiles.push(...files);
    displayThumbnails(files);
}

// Display PDF thumbnails
async function displayThumbnails(files) {
    const container = document.getElementById("thumbnails");

    for (let file of files) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);

        const viewport = page.getViewport({ scale: 0.5 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport: viewport }).promise;

        const div = document.createElement("div");
        div.classList.add("thumbnail");
        div.innerHTML = `<img src="${canvas.toDataURL()}" alt="PDF Thumbnail"><br>${file.name}`;
        container.appendChild(div);
    }
}

// Merge PDFs
document.getElementById("merge-btn").addEventListener("click", async () => {
    const mergedPdf = await PDFLib.PDFDocument.create();

    for (let file of pdfFiles) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach(p => mergedPdf.addPage(p));
    }

    const mergedBytes = await mergedPdf.save();
    downloadFile(mergedBytes, "merged.pdf");
});

// Split PDFs
document.getElementById("split-btn").addEventListener("click", async () => {
    for (let file of pdfFiles) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFLib.PDFDocument.load(arrayBuffer);

        for (let i = 0; i < pdf.getPageCount(); i++) {
            const newPdf = await PDFLib.PDFDocument.create();
            const [page] = await newPdf.copyPages(pdf, [i]);
            newPdf.addPage(page);
            const bytes = await newPdf.save();
            downloadFile(bytes, `${file.name.replace(".pdf", "")}_page${i + 1}.pdf`);
        }
    }
});

// PDF → Word
document.getElementById("to-word-btn").addEventListener("click", async () => {
    for (let file of pdfFiles) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        const doc = new docx.Document();
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(" ");
            doc.addSection({ children: [new docx.Paragraph(pageText)] });
        }

        const blob = await docx.Packer.toBlob(doc);
        downloadFile(await blob.arrayBuffer(), file.name.replace(".pdf", ".docx"));
    }
});

// PDF → Excel
document.getElementById("to-excel-btn").addEventListener("click", async () => {
    for (let file of pdfFiles) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        let sheetData = [];
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageRows = textContent.items.map(item => [item.str]);
            sheetData.push(["Page " + i]);
            sheetData = sheetData.concat(pageRows);
        }

        const ws = XLSX.utils.aoa_to_sheet(sheetData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "PDF_Data");
        const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        downloadFile(wbout, file.name.replace(".pdf", ".xlsx"));
    }
});

function downloadFile(data, filename) {
    const blob = new Blob([data]);
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}
