// Lazy file → text extraction for legal corpus ingestion.
// Supports: TXT/MD (direct), PDF (text layer with OCR fallback), images (OCR).
// OCR uses Tesseract.js with Persian + Arabic + English.

export type ExtractProgress = (info: {
  stage: string;
  pct: number; // 0..1
}) => void;

const OCR_LANGS = "fas+ara+eng";

async function loadPdfJs() {
  const pdfjs: any = await import("pdfjs-dist");
  // worker via CDN to avoid bundler hassle
  const workerSrc =
    "https://cdn.jsdelivr.net/npm/pdfjs-dist@" +
    (pdfjs.version || "6.0.227") +
    "/build/pdf.worker.min.mjs";
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
  return pdfjs;
}

async function ocrBlobOrCanvas(
  source: Blob | HTMLCanvasElement,
  onProgress?: ExtractProgress,
  label = "OCR"
): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker: any = await createWorker(OCR_LANGS, 1, {
    logger: (m: any) => {
      if (m.status === "recognizing text" && onProgress) {
        onProgress({ stage: `${label} ${Math.round(m.progress * 100)}%`, pct: m.progress });
      }
    },
  });
  try {
    const { data } = await worker.recognize(source as any);
    return (data?.text || "").trim();
  } finally {
    await worker.terminate();
  }
}

async function extractPdf(file: File, onProgress?: ExtractProgress): Promise<string> {
  const pdfjs = await loadPdfJs();
  const buf = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf }).promise;
  const numPages: number = pdf.numPages;
  const parts: string[] = [];
  let needsOcrPages: number[] = [];

  for (let i = 1; i <= numPages; i++) {
    onProgress?.({ stage: `استخراج متن صفحه ${i}/${numPages}`, pct: i / (numPages * 2) });
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    const text = tc.items
      .map((it: any) => (typeof it.str === "string" ? it.str : ""))
      .join(" ")
      .replace(/\s+\n/g, "\n")
      .trim();
    if (text.length < 30) {
      needsOcrPages.push(i);
    } else {
      parts.push(text);
    }
  }

  if (needsOcrPages.length > 0) {
    for (let idx = 0; idx < needsOcrPages.length; idx++) {
      const pn = needsOcrPages[idx];
      onProgress?.({
        stage: `OCR صفحه ${pn} (${idx + 1}/${needsOcrPages.length})`,
        pct: 0.5 + (idx / needsOcrPages.length) * 0.5,
      });
      const page = await pdf.getPage(pn);
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d")!;
      await page.render({ canvasContext: ctx, viewport, canvas }).promise;
      const t = await ocrBlobOrCanvas(canvas, onProgress, `OCR ص${pn}`);
      if (t) parts.push(t);
    }
  }

  return parts.join("\n\n").trim();
}

export async function extractTextFromFile(
  file: File,
  onProgress?: ExtractProgress
): Promise<string> {
  const name = file.name.toLowerCase();
  const type = file.type || "";

  if (type.startsWith("text/") || /\.(txt|md|markdown)$/i.test(name)) {
    onProgress?.({ stage: "خواندن متن", pct: 0.5 });
    return (await file.text()).trim();
  }

  if (type === "application/pdf" || name.endsWith(".pdf")) {
    return await extractPdf(file, onProgress);
  }

  if (type.startsWith("image/") || /\.(png|jpe?g|webp|bmp|tiff?)$/i.test(name)) {
    onProgress?.({ stage: "OCR تصویر", pct: 0.1 });
    return await ocrBlobOrCanvas(file, onProgress, "OCR");
  }

  throw new Error(`فرمت پشتیبانی نمی‌شود: ${file.name}`);
}

// Split very long documents into ingest-sized pieces (~40k chars).
export function splitForIngest(text: string, maxChars = 40000): string[] {
  if (text.length <= maxChars) return [text];
  const parts: string[] = [];
  let i = 0;
  while (i < text.length) {
    let end = Math.min(i + maxChars, text.length);
    if (end < text.length) {
      const slice = text.slice(i, end);
      const br = Math.max(slice.lastIndexOf("\n\n"), slice.lastIndexOf("\n"), slice.lastIndexOf("."));
      if (br > maxChars * 0.6) end = i + br;
    }
    parts.push(text.slice(i, end).trim());
    i = end;
  }
  return parts.filter((p) => p.length > 0);
}
