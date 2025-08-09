const dropZone = document.getElementById("drop-zone");
const fileInput = document.getElementById("file-input");
const fileList = document.getElementById("file-list");
const convertBtn = document.getElementById("convert-btn");
const output = document.getElementById("output");
const converterSelect = document.getElementById("converter-select");

let imageFiles = [];







const formatSelect = document.getElementById("format-select");
const formatLabel = document.getElementById("format-label");

function updateFormatVisibility() {
  if (converterSelect.value === "bmp" || converterSelect.value === "tiff") {
    formatSelect.style.display = "inline-block";
    formatLabel.style.display = "inline-block";
  } else {
    formatSelect.style.display = "none";
    formatLabel.style.display = "none";
  }
}
converterSelect.addEventListener("change", updateFormatVisibility);
updateFormatVisibility();












// Open file picker on drop zone click
dropZone.addEventListener("click", () => fileInput.click());

// Drag events
dropZone.addEventListener("dragover", e => {
  e.preventDefault();
  dropZone.style.backgroundColor = "#0af2";
});

dropZone.addEventListener("dragleave", e => {
  e.preventDefault();
  dropZone.style.backgroundColor = "#222";
});

dropZone.addEventListener("drop", e => {
  e.preventDefault();
  dropZone.style.backgroundColor = "#222";
  handleFiles(e.dataTransfer.files);
});

// File input change
fileInput.addEventListener("change", e => {
  handleFiles(e.target.files);
});

function handleFiles(files) {
  for (const file of files) {
    // Accept only the supported types
    if (!["image/webp","image/avif","image/bmp","image/tiff"].includes(file.type)) {
      alert(`Unsupported file type: ${file.name}`);
      continue;
    }
    imageFiles.push(file);
  }
  updateFileList();
}

function updateFileList() {
  fileList.innerHTML = "";
  imageFiles.forEach((file, i) => {
    const div = document.createElement("div");
    div.textContent = `${i+1}. ${file.name} (${file.type})`;
    fileList.appendChild(div);
  });
}






convertBtn.addEventListener("click", async () => {
  if (imageFiles.length === 0) {
    alert("Please add image files to convert.");
    return;
  }
  const converter = converterSelect.value;
  const outputMime = (converter === "bmp" || converter === "tiff") ? formatSelect.value : "image/jpeg";
  const outputExt = outputMime === "image/png" ? "png" : "jpg";

  output.textContent = `Converting ${imageFiles.length} file(s)...`;
  try {
    if (converter === "webp-jpg") {
      await convertImages(imageFiles, "image/webp", outputMime, outputExt);
    } else if (converter === "avif-jpg") {
      await convertImages(imageFiles, "image/avif", outputMime, outputExt);
    } else if (converter === "bmp") {
      await convertImages(imageFiles, "image/bmp", outputMime, outputExt);
    } else if (converter === "tiff") {
      await convertImages(imageFiles, "image/tiff", outputMime, outputExt);
    }
    output.textContent = `Conversion completed!`;
  } catch (err) {
    output.textContent = `Error: ${err.message}`;
  }
});











async function convertImages(files, inputMime, outputMime, outputExt) {
  for (const file of files) {
    if (file.type !== inputMime) continue; // skip wrong type for selected converter

    const img = await loadImageFromFile(file);
    const blob = await imageToBlob(img, outputMime);
    download(blob, file.name.replace(/\.\w+$/, `.${outputExt}`));
  }
}







// Load image from File to HTMLImageElement
function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image " + file.name));
    };
    img.src = url;
  });
}

// Convert HTMLImageElement to Blob in given mime type using Canvas
function imageToBlob(img, mimeType) {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    canvas.toBlob(blob => resolve(blob), mimeType, 0.92);
  });
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










// Existing code up to convertImages() remains unchanged

async function convertImages(files, inputMime, outputMime, outputExt) {
  for (const file of files) {
    if (file.type !== inputMime) continue;

    let img;

    if (inputMime === "image/bmp") {
      img = await decodeBmp(file);
    } else if (inputMime === "image/tiff") {
      img = await decodeTiff(file);
    } else {
      img = await loadImageFromFile(file);
    }

    const blob = await imageToBlob(img, outputMime);
    download(blob, file.name.replace(/\.\w+$/, `.${outputExt}`));
  }
}

function decodeBmp(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const bmpData = BMP.decode(reader.result);
        const canvas = document.createElement("canvas");
        canvas.width = bmpData.width;
        canvas.height = bmpData.height;
        const ctx = canvas.getContext("2d");
        const imageData = ctx.createImageData(bmpData.width, bmpData.height);
        imageData.data.set(bmpData.data);
        ctx.putImageData(imageData, 0, 0);

        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Failed to create BMP image"));
        img.src = canvas.toDataURL();
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read BMP file"));
    reader.readAsArrayBuffer(file);
  });
}

function decodeTiff(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const tiffData = new Uint8Array(reader.result);
        const ifds = UTIF.decode(tiffData);
        UTIF.decodeImages(tiffData, ifds);
        const firstPage = ifds[0];
        const rgba = UTIF.toRGBA8(tiffData, firstPage);

        const width = firstPage.width;
        const height = firstPage.height;

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        const imageData = ctx.createImageData(width, height);
        imageData.data.set(rgba);
        ctx.putImageData(imageData, 0, 0);

        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Failed to create TIFF image"));
        img.src = canvas.toDataURL();
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read TIFF file"));
    reader.readAsArrayBuffer(file);
  });
}
