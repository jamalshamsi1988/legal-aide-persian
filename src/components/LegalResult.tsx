import { Scale, BookOpen, FileText, ChevronLeft, AlertCircle, Download, Library } from "lucide-react";
import { generateLegalPdf } from "@/lib/generatePdf";

export interface LegalSource {
  title: string;
  source_type: string;
  excerpt: string;
  similarity: number;
}

interface LegalResultProps {
  summary: string;
  legalBasis: string[];
  analysis: string;
  nextSteps: string[];
  draft: string | null;
  sources?: LegalSource[];
}

const SectionCard = ({
  icon,
  title,
  children,
  accentColor = "gold",
  delay = 0,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  accentColor?: "gold" | "navy" | "green" | "red";
  delay?: number;
}) => {
  const accentMap = {
    gold: "border-r-gold bg-gold-pale",
    navy: "border-r-navy bg-secondary",
    green: "border-r-emerald-500 bg-emerald-50",
    red: "border-r-destructive bg-red-50",
  };

  const iconMap = {
    gold: "bg-gold text-navy",
    navy: "bg-navy text-gold",
    green: "bg-emerald-500 text-white",
    red: "bg-destructive text-white",
  };

  return (
    <div
      className={`rounded-xl border border-border border-r-4 ${accentMap[accentColor]} p-5 shadow-legal animate-fade-in`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-9 h-9 rounded-lg ${iconMap[accentColor]} flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>
        <h3 className="text-navy font-bold text-base">{title}</h3>
      </div>
      {children}
    </div>
  );
};

export const LegalResult = ({ summary, legalBasis, analysis, nextSteps, draft, sources }: LegalResultProps) => {
  const handleDownload = () => {
    generateLegalPdf({ summary, legalBasis, analysis, nextSteps, draft });
  };

  return (
    <div className="space-y-4 mt-6">
      {/* Download Button */}
      <div className="flex justify-end">
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 gradient-gold text-navy font-bold rounded-xl px-5 py-2.5 shadow-gold hover:opacity-90 transition-all duration-200 text-sm"
        >
          <Download className="w-4 h-4" />
          دانلود PDF
        </button>
      </div>

      {/* Summary */}
      <SectionCard icon={<Scale className="w-4 h-4" />} title="خلاصه پرونده" accentColor="navy" delay={0}>
        <p className="text-foreground leading-relaxed text-sm">{summary}</p>
      </SectionCard>

      {/* Legal Basis */}
      <SectionCard icon={<BookOpen className="w-4 h-4" />} title="مبانی قانونی مرتبط" accentColor="gold" delay={100}>
        <ul className="space-y-2">
          {legalBasis.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <ChevronLeft className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
              <span className="text-foreground leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      </SectionCard>

      {/* Legal Analysis */}
      <SectionCard icon={<Scale className="w-4 h-4" />} title="تحلیل حقوقی" accentColor="navy" delay={200}>
        <p className="text-foreground leading-relaxed text-sm whitespace-pre-line">{analysis}</p>
      </SectionCard>

      {/* Next Steps */}
      <SectionCard icon={<AlertCircle className="w-4 h-4" />} title="پیشنهاد اقدام بعدی" accentColor="green" delay={300}>
        <ol className="space-y-2 list-none">
          {nextSteps.map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-sm">
              <span className="w-6 h-6 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">
                {i + 1}
              </span>
              <span className="text-foreground leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
      </SectionCard>

      {/* Draft Pleading */}
      {draft && (
        <SectionCard icon={<FileText className="w-4 h-4" />} title="پیش‌نویس لایحه رسمی" accentColor="red" delay={400}>
          <div className="bg-parchment rounded-lg p-4 border border-border">
            <pre className="text-sm text-foreground whitespace-pre-wrap leading-relaxed font-vazir">{draft}</pre>
          </div>
          <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            این پیش‌نویس جنبه آموزشی دارد. پیش از ارائه به دادگاه، با وکیل مشورت کنید.
          </p>
        </SectionCard>
      )}
    </div>
  );
};
