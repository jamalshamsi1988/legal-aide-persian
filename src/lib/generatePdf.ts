interface LegalSource {
  title: string;
  source_type?: string;
  excerpt?: string;
  similarity?: number;
}

interface RelatedDocument {
  title: string;
  source_type?: string;
  relation_type?: string;
  note?: string | null;
}

interface LegalPdfData {
  summary: string;
  legalBasis: string[];
  analysis: string;
  nextSteps: string[];
  draft: string | null;
  question?: string;
  workspaceName?: string;
  roleLabel?: string;
  detailed?: boolean;
  sources?: LegalSource[];
  related?: RelatedDocument[];
}

const escapeHtml = (s: string): string =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const nl2br = (s: string): string => escapeHtml(s).replace(/\r?\n/g, "<br>");

export const generateLegalPdf = (data: LegalPdfData) => {
  const now = new Date().toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const metaChips: string[] = [];
  if (data.workspaceName) metaChips.push(`فضای کاری: ${escapeHtml(data.workspaceName)}`);
  if (data.roleLabel) metaChips.push(`جایگاه: ${escapeHtml(data.roleLabel)}`);
  if (data.detailed) metaChips.push(`تحلیل ویژه`);

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
<meta charset="UTF-8">
<title>تحلیل حقوقی</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;700;900&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    font-family: 'Vazirmatn', 'Tahoma', 'Segoe UI', sans-serif;
    direction: rtl;
    text-align: right;
    unicode-bidi: embed;
    color: #1a2340;
    background: #ffffff;
    font-size: 13px;
    line-height: 1.95;
  }
  body { padding: 32px 36px; }

  .header {
    border-bottom: 3px solid #c9a84c;
    padding-bottom: 14px;
    margin-bottom: 22px;
    text-align: center;
  }
  .header h1 {
    font-size: 22px;
    color: #0f1b3d;
    font-weight: 900;
    margin-bottom: 4px;
  }
  .header .date { font-size: 11px; color: #6b7280; }

  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: flex-start;
    margin-bottom: 20px;
  }
  .chip {
    background: #faf4e0;
    border: 1px solid #e6d38a;
    color: #0f1b3d;
    border-radius: 999px;
    padding: 3px 12px;
    font-size: 11px;
    font-weight: 700;
  }

  .question-box {
    background: #f4f6fb;
    border-right: 4px solid #0f1b3d;
    border-radius: 8px;
    padding: 12px 16px;
    margin-bottom: 20px;
  }
  .question-box .label {
    font-size: 11px;
    color: #6b7280;
    margin-bottom: 4px;
  }
  .question-box p {
    font-size: 13px;
    color: #0f1b3d;
    text-align: justify;
  }

  section { margin-bottom: 18px; page-break-inside: avoid; }
  h2 {
    font-size: 15px;
    color: #0f1b3d;
    font-weight: 900;
    border-bottom: 2px solid #c9a84c;
    padding-bottom: 5px;
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  h2::before {
    content: '';
    display: inline-block;
    width: 6px; height: 6px;
    background: #c9a84c;
    border-radius: 50%;
  }

  p, li { text-align: justify; }
  p { margin-bottom: 8px; }

  ul, ol {
    padding-right: 22px;
    padding-left: 0;
    margin-bottom: 8px;
  }
  li { margin-bottom: 6px; }
  ol li::marker, ul li::marker { color: #c9a84c; font-weight: 700; }

  .draft-box {
    background: #faf8f0;
    border: 1px solid #e5decf;
    border-right: 4px solid #c9a84c;
    border-radius: 6px;
    padding: 14px 16px;
    white-space: pre-wrap;
    font-family: 'Vazirmatn', 'Tahoma', sans-serif;
    font-size: 12.5px;
    line-height: 2;
    color: #1a2340;
  }

  .source-item {
    background: #fdfaf0;
    border: 1px solid #e6d38a;
    border-radius: 6px;
    padding: 8px 12px;
    margin-bottom: 8px;
    font-size: 12px;
  }
  .source-item .title { color: #0f1b3d; font-weight: 700; margin-bottom: 3px; }
  .source-item .type { color: #6b7280; font-size: 10px; margin-bottom: 4px; }
  .source-item .excerpt { color: #333; }

  .related-item {
    background: #f4f6fb;
    border: 1px solid #d5dbe8;
    border-radius: 6px;
    padding: 8px 12px;
    margin-bottom: 8px;
    font-size: 12px;
  }
  .related-item .title { color: #0f1b3d; font-weight: 700; margin-bottom: 3px; }
  .related-item .type { color: #6b7280; font-size: 10px; margin-bottom: 4px; }

  .disclaimer {
    margin-top: 30px;
    padding-top: 14px;
    border-top: 1px solid #e5e7eb;
    text-align: center;
    font-size: 10.5px;
    color: #6b7280;
    line-height: 1.7;
  }

  @page { size: A4; margin: 14mm 14mm 18mm 14mm; }
  @media print {
    body { padding: 0; }
    .no-print { display: none !important; }
    section { page-break-inside: avoid; }
    h2 { page-break-after: avoid; }
  }
</style>
</head>
<body>
  <div class="header">
    <h1>⚖️ تحلیل حقوقی</h1>
    <p class="date">تاریخ صدور: ${escapeHtml(now)}</p>
  </div>

  ${metaChips.length ? `<div class="meta">${metaChips.map((c) => `<span class="chip">${c}</span>`).join("")}</div>` : ""}

  ${
    data.question
      ? `<div class="question-box">
    <div class="label">سوال / موضوع طرح‌شده:</div>
    <p>${nl2br(data.question)}</p>
  </div>`
      : ""
  }

  ${
    data.summary
      ? `<section>
    <h2>خلاصه پرونده</h2>
    <p>${nl2br(data.summary)}</p>
  </section>`
      : ""
  }

  ${
    Array.isArray(data.legalBasis) && data.legalBasis.length
      ? `<section>
    <h2>مبانی قانونی مرتبط</h2>
    <ul>
      ${data.legalBasis.map((b) => `<li>${nl2br(b)}</li>`).join("")}
    </ul>
  </section>`
      : ""
  }

  ${
    data.analysis
      ? `<section>
    <h2>تحلیل حقوقی</h2>
    <p>${nl2br(data.analysis)}</p>
  </section>`
      : ""
  }

  ${
    Array.isArray(data.nextSteps) && data.nextSteps.length
      ? `<section>
    <h2>پیشنهاد اقدام بعدی</h2>
    <ol>
      ${data.nextSteps.map((s) => `<li>${nl2br(s)}</li>`).join("")}
    </ol>
  </section>`
      : ""
  }

  ${
    data.draft
      ? `<section>
    <h2>پیش‌نویس لایحه رسمی</h2>
    <div class="draft-box">${escapeHtml(data.draft)}</div>
  </section>`
      : ""
  }

  ${
    Array.isArray(data.sources) && data.sources.length
      ? `<section>
    <h2>منابع استنادی از پایگاه دانش</h2>
    ${data.sources
      .map(
        (s) => `<div class="source-item">
          <div class="title">${escapeHtml(s.title || "")}</div>
          <div class="type">${escapeHtml(s.source_type || "")}${
          typeof s.similarity === "number" ? ` • شباهت ${Math.round(s.similarity * 100)}%` : ""
        }</div>
          ${s.excerpt ? `<div class="excerpt">${nl2br(s.excerpt)}${s.excerpt.length > 200 ? "…" : ""}</div>` : ""}
        </div>`
      )
      .join("")}
  </section>`
      : ""
  }

  ${
    Array.isArray(data.related) && data.related.length
      ? `<section>
    <h2>اسناد مرتبط (روابط حقوقی)</h2>
    ${data.related
      .map(
        (r) => `<div class="related-item">
          <div class="title">${escapeHtml(r.title || "")}</div>
          <div class="type">${escapeHtml(r.source_type || "")}${
          r.relation_type ? ` • ${escapeHtml(r.relation_type)}` : ""
        }</div>
          ${r.note ? `<div>${nl2br(r.note)}</div>` : ""}
        </div>`
      )
      .join("")}
  </section>`
      : ""
  }

  <div class="disclaimer">
    ⚖️ این سند توسط دستیار حقوقی هوشمند تولید شده است. اطلاعات ارائه‌شده جنبه آموزشی دارد و جایگزین مشاوره حقوقی تخصصی و مراجعه به وکیل دادگستری نمی‌شود.
  </div>

  <script>
    // Wait for the Vazirmatn font to load before printing so the PDF renders correctly in RTL.
    (function () {
      function doPrint() {
        setTimeout(function () {
          window.focus();
          window.print();
        }, 350);
      }
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(doPrint).catch(doPrint);
      } else {
        window.addEventListener('load', doPrint);
      }
    })();
  </script>
</body>
</html>`;

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("مرورگر شما پنجره جدید را مسدود کرده است. لطفاً اجازه باز شدن پنجره را بدهید.");
    return;
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
};
