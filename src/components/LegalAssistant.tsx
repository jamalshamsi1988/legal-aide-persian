import { useState } from "react";
import { Send, Loader2, RotateCcw, HelpCircle, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { LegalResult, type LegalSource, type RoutingHint, type RelatedDocument } from "./LegalResult";
import { FileUploadZone, type UploadedFile } from "./FileUploadZone";

interface LegalAnalysis {
  summary: string;
  legalBasis: string[];
  analysis: string;
  nextSteps: string[];
  draft: string | null;
  sources?: LegalSource[];
  related?: RelatedDocument[];
  routing?: RoutingHint;
  blocked?: boolean;
  block_reason?: string;
}

const EXAMPLE_QUESTIONS = [
  "صاحب‌خانه‌ام بدون اطلاع قبلی قرارداد اجاره را فسخ کرده و مهلت تخلیه داده. آیا این کار قانونی است؟",
  "کارفرمایم بدون دلیل موجه اخراجم کرده و حقوق معوقه پرداخت نکرده. چه اقدامی کنم؟",
  "در تصادف رانندگی طرف مقابل مقصر بود اما از پرداخت خسارت امتناع می‌کند.",
];

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]); // strip data:...;base64, prefix
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const analyzeLegalQuestion = async (
  question: string,
  uploadedFiles: UploadedFile[],
  detailed: boolean = false,
  workspaceSlug?: string,
): Promise<LegalAnalysis> => {
  const files = await Promise.all(
    uploadedFiles.map(async (uf) => ({
      type: uf.type,
      mimeType: uf.file.type,
      name: uf.file.name,
      data: await fileToBase64(uf.file),
    }))
  );

  const { data, error } = await supabase.functions.invoke("legal-ai", {
    body: {
      question,
      files: files.length > 0 ? files : undefined,
      detailed,
      workspace_slug: workspaceSlug,
    },
  });

  if (error) {
    throw new Error(error.message || "خطا در ارتباط با سرور");
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return {
    summary: data.summary || "",
    legalBasis: data.legalBasis || [],
    analysis: data.analysis || "",
    nextSteps: data.nextSteps || [],
    draft: data.draft || null,
    sources: data.sources || [],
    related: data.related || [],
    routing: data.routing,
    blocked: data.blocked,
    block_reason: data.block_reason,
  };
};

interface LegalAssistantProps {
  workspaceSlug?: string;
  workspaceName?: string;
}

export const LegalAssistant = ({ workspaceSlug, workspaceName }: LegalAssistantProps = {}) => {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LegalAnalysis | null>(null);
  const [error, setError] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);

  const handleSubmit = async (detailed: boolean = false) => {
    if (!question.trim() || question.trim().length < 15) {
      setError("لطفاً سوال حقوقی خود را به طور کامل بنویسید (حداقل ۱۵ کاراکتر).");
      return;
    }
    setError("");
    setLoading(true);
    setResult(null);
    try {
      const analysis = await analyzeLegalQuestion(question, files, detailed, workspaceSlug);
      setResult(analysis);
    } catch (err) {
      const message = err instanceof Error ? err.message : "خطایی در پردازش سوال شما رخ داد.";
      setError(message);
      toast({ title: "خطا", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setQuestion("");
    setResult(null);
    setError("");
    files.forEach((f) => f.preview && URL.revokeObjectURL(f.preview));
    setFiles([]);
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
            هر چه کامل‌تر توضیح دهید، تحلیل دقیق‌تر خواهد بود. می‌توانید مدارک مرتبط را نیز بارگذاری کنید.
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

          {/* File Upload */}
          <FileUploadZone
            files={files}
            onFilesChange={setFiles}
            disabled={loading}
            maxFiles={50}
          />

          {/* Action buttons */}
          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              <button
                onClick={() => handleSubmit(false)}
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
                    {files.length > 0 && ` (${files.length} فایل)`}
                  </>
                )}
              </button>
              {(result || question || files.length > 0) && (
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 bg-secondary text-navy border border-border rounded-xl px-4 py-3 text-sm hover:bg-muted transition-colors duration-200"
                >
                  <RotateCcw className="w-4 h-4" />
                  پاک کردن
                </button>
              )}
            </div>
            <button
              onClick={() => handleSubmit(true)}
              disabled={loading || !question.trim()}
              className="w-full flex items-center justify-center gap-2 bg-navy text-primary-foreground font-bold rounded-xl px-5 py-3 hover:bg-navy/90 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed text-sm border-2 border-gold/30"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  در حال تحلیل ویژه...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 text-gold" />
                  تحلیل ویژه — لایحه و شکایت مفصل (۲۰۰۰-۳۰۰۰ کلمه)
                </>
              )}
            </button>
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
          sources={result.sources}
          routing={result.routing}
          blocked={result.blocked}
          block_reason={result.block_reason}
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
