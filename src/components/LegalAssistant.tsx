import { useState } from "react";
import { Send, Loader2, RotateCcw, HelpCircle } from "lucide-react";
import { LegalResult } from "./LegalResult";

interface LegalAnalysis {
  summary: string;
  legalBasis: string[];
  analysis: string;
  nextSteps: string[];
  draft: string | null;
}

const EXAMPLE_QUESTIONS = [
  "صاحب‌خانه‌ام بدون اطلاع قبلی قرارداد اجاره را فسخ کرده و مهلت تخلیه داده. آیا این کار قانونی است؟",
  "کارفرمایم بدون دلیل موجه اخراجم کرده و حقوق معوقه پرداخت نکرده. چه اقدامی کنم؟",
  "در تصادف رانندگی طرف مقابل مقصر بود اما از پرداخت خسارت امتناع می‌کند.",
];

const analyzeLegalQuestion = async (question: string): Promise<LegalAnalysis> => {
  // Simulate API delay
  await new Promise((r) => setTimeout(r, 2000));

  // Mock structured response based on question content
  const isRental = question.includes("اجاره") || question.includes("مستأجر") || question.includes("صاحب‌خانه");
  const isEmployment = question.includes("کارفرما") || question.includes("اخراج") || question.includes("حقوق");
  const isAccident = question.includes("تصادف") || question.includes("خسارت") || question.includes("رانندگی");

  if (isRental) {
    return {
      summary:
        "موجر بدون رعایت تشریفات قانونی اقدام به فسخ یک‌جانبه قرارداد اجاره و اعلام تخلیه نموده است. این امر مستلزم بررسی مفاد قرارداد و انطباق با قوانین روابط موجر و مستأجر می‌باشد.",
      legalBasis: [
        "ماده ۴ قانون روابط موجر و مستأجر مصوب ۱۳۵۶ – شرایط فسخ قرارداد اجاره",
        "ماده ۴۷۷ قانون مدنی – التزام موجر به تسلیم عین مستأجره و استمرار آن",
        "ماده ۴۹۰ قانون مدنی – حقوق مستأجر در قبال موجر",
        "ماده ۶ قانون روابط موجر و مستأجر ۱۳۷۶ – الزام به تخلیه از طریق مراجع قضایی",
        "ماده ۱۷۸ قانون آیین دادرسی مدنی – دعوای تخلیه عین مستأجره",
      ],
      analysis:
        "بر اساس قانون روابط موجر و مستأجر، فسخ یک‌طرفه قرارداد اجاره بدون دلایل موجه قانونی (مانند عدم پرداخت اجاره‌بها، تعدی و تفریط، یا انقضای مدت) فاقد اعتبار حقوقی است.\n\nموجر تنها از طریق طرح دعوی در دادگاه می‌تواند حکم تخلیه دریافت کند. هیچ اقدام مستقیمی برای تخلیه اجباری بدون حکم قضایی قانونی نیست.\n\nاگر مدت قرارداد پایان یافته و تمدید توافق نشده، موجر باید از طریق اظهارنامه رسمی (۳ ماه قبل از انقضا) مراتب را اطلاع دهد.",
      nextSteps: [
        "نسخه کامل قرارداد اجاره را بررسی کنید و شرایط فسخ و مدت قرارداد را مطالعه نمایید.",
        "در صورتی که قرارداد هنوز معتبر است، اظهارنامه رسمی به موجر ارسال و حقوق خود را اعلام کنید.",
        "در صورت تهدید به تخلیه اجباری، دادخواست توقف اقدامات موجر را در دادگاه مطرح کنید.",
        "جهت احقاق حقوق خود، با یک وکیل متخصص در امور ملکی مشورت نمایید.",
      ],
      draft: `ریاست محترم دادگاه حقوقی

موضوع: دادخواست ممانعت از تخلیه غیرقانونی

اینجانب [نام و نام خانوادگی]، به شماره ملی [شماره]، مستأجر پلاک ثبتی [شماره پلاک] واقع در [آدرس]، به استحضار می‌رساند:

بر اساس قرارداد اجاره مورخ [تاریخ] منعقده فیمابین اینجانب و آقا/خانم [نام موجر]، مدت اجاره تا تاریخ [تاریخ پایان] تمدید و معتبر می‌باشد.

نظر به اینکه خوانده (موجر) برخلاف مفاد قرارداد و مقررات ماده ۶ قانون روابط موجر و مستأجر ۱۳۷۶، اقدام به فسخ یک‌جانبه قرارداد و تهدید به تخلیه اجباری نموده است،

خواسته:
۱. صدور دستور موقت مبنی بر توقف هرگونه اقدام جهت تخلیه
۲. الزام خوانده به اجرای تعهدات قراردادی

دلایل و مستندات:
الف) اصل قرارداد اجاره
ب) اظهارنامه ارسالی به موجر
ج) مدارک پرداخت اجاره‌بها

با احترام،
[نام و امضاء]
تاریخ: [تاریخ]`,
    };
  }

  if (isEmployment) {
    return {
      summary:
        "کارگر بدون ارائه دلایل موجه و رعایت تشریفات قانونی از کار اخراج شده و کارفرما از پرداخت حقوق معوقه و مزایای پایان کار امتناع می‌نماید.",
      legalBasis: [
        "ماده ۲۱ قانون کار – موارد موجه خاتمه قرارداد کار",
        "ماده ۲۷ قانون کار – اخراج از کار و شرایط قانونی آن",
        "ماده ۲۹ قانون کار – مزایای پایان کار",
        "ماده ۳۵ قانون کار – پرداخت حق سنوات",
        "ماده ۱۵۷ قانون کار – صلاحیت هیأت تشخیص در اختلافات کارگر و کارفرما",
        "ماده ۱۶۰ قانون کار – آیین رسیدگی به شکایات کارگری",
      ],
      analysis:
        "طبق ماده ۲۷ قانون کار، کارفرما تنها در صورت قصور کارگر و با تأیید شورای اسلامی کار یا نماینده کارگر می‌تواند قرارداد کار را فسخ کند. اخراج یک‌طرفه و بدون دلیل موجه قانونی فاقد اثر است.\n\nکارفرما موظف به پرداخت تمامی مطالبات کارگر از جمله حقوق معوقه، حق سنوات (به ازای هر سال یک ماه)، عیدی، و خسارت احتمالی است.\n\nدعوی در هیأت تشخیص اداره کار قابل طرح و پیگیری می‌باشد.",
      nextSteps: [
        "کلیه مدارک استخدامی (قرارداد کار، فیش‌های حقوقی، احکام کارگزینی) را جمع‌آوری کنید.",
        "شکواییه به اداره کار شهرستان محل اشتغال تقدیم کنید.",
        "جهت پیگیری حقوق معوقه، دادخواست مطالبه به مرجع صالح ارائه دهید.",
        "در صورت نیاز، از مشاوره رایگان خانه کارگر استفاده نمایید.",
      ],
      draft: `هیأت تشخیص اداره کار و امور اجتماعی [شهرستان]

موضوع: شکواییه اخراج غیرقانونی و مطالبه حقوق معوقه

شاکی: [نام کارگر] — شغل: [عنوان شغلی]
مشتکی‌عنه: [نام کارفرما / شرکت]

خلاصه شکایت:
اینجانب از تاریخ [تاریخ شروع] تا [تاریخ اخراج] در [نام کارگاه/شرکت] مشغول به کار بودم. کارفرما در تاریخ [تاریخ] برخلاف مفاد قرارداد کار و بدون رعایت تشریفات مقرر در ماده ۲۷ قانون کار، اقدام به اخراج اینجانب نموده است.

خواسته:
۱. الزام کارفرما به بازگشت به کار (یا پرداخت خسارت اخراج)
۲. مطالبه حقوق معوقه به مبلغ [مبلغ] ریال
۳. مطالبه حق سنوات و مزایای پایان کار

مستندات پیوست:
- تصویر قرارداد کار
- فیش‌های حقوقی
- مستندات اخراج

با احترام،
[نام و امضاء] — تاریخ: [تاریخ]`,
    };
  }

  if (isAccident) {
    return {
      summary:
        "در تصادف رانندگی، طرف مقابل مسبب حادثه شناخته شده لیکن از جبران خسارات وارده امتناع می‌نماید. موضوع مستلزم پیگیری از طریق بیمه شخص ثالث و یا مراجع قضایی می‌باشد.",
      legalBasis: [
        "ماده ۱ قانون بیمه اجباری خسارات وارد شده به اشخاص ثالث در اثر حوادث ناشی از وسایل نقلیه مصوب ۱۳۹۵",
        "ماده ۳ همان قانون – مسؤولیت دارنده وسیله نقلیه در برابر اشخاص ثالث",
        "ماده ۳۳۱ قانون مدنی – ضمان ناشی از اتلاف",
        "ماده ۳۳۳ قانون مدنی – مسؤولیت صاحب حیوان و ماشین",
        "ماده ۵۲۷ قانون آیین دادرسی کیفری – الزام به جبران خسارت در پرونده‌های جزایی",
      ],
      analysis:
        "دارنده وسیله نقلیه‌ای که موجب بروز تصادف شده، بر اساس قانون بیمه اجباری ۱۳۹۵ و ماده ۳۳۱ قانون مدنی مسؤول جبران کلیه خسارات مالی و جانی است.\n\nبیمه‌گر وسیله نقلیه مقصر موظف به پرداخت خسارات تا سقف تعهدات بیمه‌نامه است. در صورت عدم پوشش کامل، مازاد بر عهده مقصر شخصاً می‌باشد.\n\nامتناع از جبران خسارت، علاوه بر مسؤولیت مدنی، می‌تواند منجر به طرح شکایت کیفری بر اساس قانون تخلفات رانندگی نیز گردد.",
      nextSteps: [
        "کروکی پلیس و گزارش رسمی حادثه را تهیه کنید.",
        "به شرکت بیمه طرف مقابل مراجعه و مدارک خسارت را تحویل دهید.",
        "در صورت استنکاف بیمه، دادخواست مطالبه خسارت در دادگاه حقوقی تقدیم کنید.",
        "امکان طرح شکایت کیفری علیه مقصر جهت پرداخت دیه یا خسارت نیز وجود دارد.",
      ],
      draft: `ریاست محترم دادگاه حقوقی [شهرستان]

موضوع: دادخواست مطالبه خسارت ناشی از تصادف رانندگی

خواهان: [نام زیان‌دیده]
خوانده: [نام مقصر] / شرکت بیمه [نام]

شرح موضوع:
در تاریخ [تاریخ تصادف]، در مکان [آدرس]، بر اثر بی‌احتیاطی خوانده در رانندگی، تصادفی رخ داد که منجر به [شرح خسارت جانی/مالی] گردید. کروکی پلیس مقصریت خوانده را تأیید می‌نماید.

خواسته:
۱. مطالبه خسارت مالی به مبلغ [مبلغ] ریال بر اساس کارشناسی
۲. مطالبه هزینه‌های درمانی [مبلغ] ریال
۳. مطالبه خسارت دادرسی و حق‌الوکاله

دلایل:
- کروکی رسمی پلیس راهنمایی
- گزارش کارشناسی خسارت
- مدارک پزشکی و هزینه‌های درمان

با احترام،
[نام و امضاء] — تاریخ: [تاریخ]`,
    };
  }

  // Generic response
  return {
    summary:
      "سوال حقوقی مطرح شده نیازمند بررسی دقیق مستندات و شرایط موضوعی می‌باشد. برای ارائه تحلیل جامع‌تر، لطفاً اطلاعات تکمیلی ارائه دهید.",
    legalBasis: [
      "قانون مدنی جمهوری اسلامی ایران – مواد عمومی مرتبط با موضوع",
      "قانون آیین دادرسی مدنی – مواد مربوط به شیوه اقامه دعوی",
    ],
    analysis:
      "برای ارائه تحلیل حقوقی دقیق، لازم است اطلاعات بیشتری از جمله: نوع رابطه حقوقی طرفین، مستندات موجود، و سابقه اختلاف را بیان فرمایید. پرسش‌های تکمیلی: آیا قراردادی مکتوب وجود دارد؟ زمان وقوع اختلاف چه بوده؟",
    nextSteps: [
      "اطلاعات کامل‌تر و مستندات مربوطه را آماده کنید.",
      "با یک وکیل متخصص در حوزه مربوطه مشورت نمایید.",
      "در صورت نیاز به اقدام فوری، با اورژانس قضایی ۱۲۰ تماس بگیرید.",
    ],
    draft: null,
  };
};

export const LegalAssistant = () => {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LegalAnalysis | null>(null);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!question.trim() || question.trim().length < 15) {
      setError("لطفاً سوال حقوقی خود را به طور کامل بنویسید (حداقل ۱۵ کاراکتر).");
      return;
    }
    setError("");
    setLoading(true);
    setResult(null);
    try {
      const analysis = await analyzeLegalQuestion(question);
      setResult(analysis);
    } catch {
      setError("خطایی در پردازش سوال شما رخ داد. لطفاً دوباره تلاش کنید.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setQuestion("");
    setResult(null);
    setError("");
  };

  const handleExample = (ex: string) => {
    setQuestion(ex);
    setResult(null);
    setError("");
  };

  return (
    <main className="container max-w-3xl py-8 px-4">
      {/* Question Input */}
      <div className="bg-card rounded-2xl shadow-legal-lg border border-border overflow-hidden">
        <div className="bg-navy p-4 md:p-5">
          <h2 className="text-primary-foreground font-bold text-base flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-gold" />
            سوال حقوقی خود را مطرح کنید
          </h2>
          <p className="text-primary-foreground/60 text-xs mt-1">
            هر چه کامل‌تر توضیح دهید، تحلیل دقیق‌تر خواهد بود.
          </p>
        </div>

        <div className="p-4 md:p-6 space-y-4">
          {/* Example buttons */}
          {!result && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">نمونه سوالات:</p>
              <div className="flex flex-col gap-2">
                {EXAMPLE_QUESTIONS.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => handleExample(ex)}
                    className="text-right text-xs text-navy bg-gold-pale border border-gold/20 rounded-lg px-3 py-2 hover:bg-gold/20 transition-colors duration-200 leading-relaxed"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Textarea */}
          <div>
            <textarea
              value={question}
              onChange={(e) => {
                setQuestion(e.target.value);
                if (error) setError("");
              }}
              placeholder="سوال حقوقی خود را اینجا بنویسید... مثلاً: صاحب‌خانه‌ام بدون اطلاع قرارداد را فسخ کرده، چه کاری انجام دهم؟"
              className="w-full min-h-[140px] md:min-h-[160px] bg-parchment border border-border rounded-xl p-4 text-foreground text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all duration-200 placeholder:text-muted-foreground font-vazir"
              disabled={loading}
            />
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-xs text-muted-foreground">{question.length} کاراکتر</span>
              {error && (
                <span className="text-xs text-destructive">{error}</span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={loading || !question.trim()}
              className="flex-1 flex items-center justify-center gap-2 gradient-gold text-navy font-bold rounded-xl px-5 py-3 shadow-gold hover:opacity-90 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  در حال تحلیل...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  تحلیل حقوقی
                </>
              )}
            </button>
            {(result || question) && (
              <button
                onClick={handleReset}
                className="flex items-center gap-2 bg-secondary text-navy border border-border rounded-xl px-4 py-3 text-sm hover:bg-muted transition-colors duration-200"
              >
                <RotateCcw className="w-4 h-4" />
                پاک کردن
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="mt-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-5 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-muted rounded-lg" />
                <div className="h-4 bg-muted rounded w-40" />
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-muted rounded w-full" />
                <div className="h-3 bg-muted rounded w-5/6" />
                <div className="h-3 bg-muted rounded w-4/6" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <LegalResult
          summary={result.summary}
          legalBasis={result.legalBasis}
          analysis={result.analysis}
          nextSteps={result.nextSteps}
          draft={result.draft}
        />
      )}

      {/* Disclaimer */}
      <p className="text-center text-xs text-muted-foreground mt-8 leading-relaxed max-w-lg mx-auto">
        ⚖️ اطلاعات ارائه شده جنبه آموزشی و اطلاع‌رسانی دارد و جایگزین مشاوره حقوقی تخصصی نمی‌شود.
        برای اقدام قانونی، حتماً با وکیل مجاز مشورت نمایید.
      </p>
    </main>
  );
};
