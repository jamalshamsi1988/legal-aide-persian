interface LegalAnalysis {
  summary: string;
  legalBasis: string[];
  analysis: string;
  nextSteps: string[];
  draft: string | null;
}

export const generateLegalPdf = (data: LegalAnalysis) => {
  const now = new Date().toLocaleDateString("fa-IR");

  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Vazirmatn', 'Tahoma', sans-serif; direction: rtl; padding: 40px; color: #1a1a2e; font-size: 13px; line-height: 1.9; }
  h1 { text-align: center; font-size: 20px; margin-bottom: 6px; color: #0f1b3d; }
  .date { text-align: center; font-size: 11px; color: #666; margin-bottom: 30px; }
  h2 { font-size: 15px; color: #0f1b3d; border-bottom: 2px solid #c9a84c; padding-bottom: 4px; margin: 24px 0 10px; }
  p { margin-bottom: 10px; text-align: justify; }
  ul, ol { padding-right: 20px; margin-bottom: 10px; }
  li { margin-bottom: 6px; }
  .draft-box { background: #faf8f0; border: 1px solid #ddd; border-radius: 6px; padding: 16px; white-space: pre-wrap; font-size: 12px; margin-top: 8px; }
  .disclaimer { text-align: center; font-size: 10px; color: #999; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
<h1>⚖️ تحلیل حقوقی</h1>
<p class="date">تاریخ: ${now}</p>

<h2>خلاصه پرونده</h2>
<p>${data.summary}</p>

<h2>مبانی قانونی مرتبط</h2>
<ul>
${data.legalBasis.map((b) => `<li>${b}</li>`).join("\n")}
</ul>

<h2>تحلیل حقوقی</h2>
<p>${data.analysis.replace(/\n/g, "<br>")}</p>

<h2>پیشنهاد اقدام بعدی</h2>
<ol>
${data.nextSteps.map((s) => `<li>${s}</li>`).join("\n")}
</ol>

${
  data.draft
    ? `<h2>پیش‌نویس لایحه رسمی</h2>
<div class="draft-box">${data.draft}</div>`
    : ""
}

<p class="disclaimer">⚖️ اطلاعات ارائه شده جنبه آموزشی دارد و جایگزین مشاوره حقوقی تخصصی نمی‌شود.</p>
</body>
</html>`;

  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.print();
  };
};
