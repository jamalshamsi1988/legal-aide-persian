import { Scale, Gavel, BookOpen, Shield, ShieldCheck } from "lucide-react";
import legalHero from "@/assets/legal-hero.jpg";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";


export const LegalHeader = () => {
  return (
    <header className="relative overflow-hidden">
      {/* Top bar — auth removed; admin tools always accessible */}
      <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-end gap-2 p-3">
        <Link to="/admin/corpus">
          <Button size="sm" variant="outline" className="bg-white/10 border-white/30 text-primary-foreground hover:bg-white/20">
            <ShieldCheck className="w-4 h-4 ml-1" /> پایگاه دانش
          </Button>
        </Link>
        <Link to="/admin/audit">
          <Button size="sm" variant="outline" className="bg-white/10 border-white/30 text-primary-foreground hover:bg-white/20">
            <ShieldCheck className="w-4 h-4 ml-1" /> گزارش‌ها
          </Button>
        </Link>
        <Link to="/admin/relations">
          <Button size="sm" variant="outline" className="bg-white/10 border-white/30 text-primary-foreground hover:bg-white/20">
            <ShieldCheck className="w-4 h-4 ml-1" /> روابط
          </Button>
        </Link>
      </div>

      {/* Hero background */}
      <div className="absolute inset-0">
        <img
          src={legalHero}
          alt="دفتر حقوقی"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 gradient-hero opacity-90" />
      </div>

      {/* Content */}
      <div className="relative z-10 container py-10 md:py-16 text-center">
        {/* Logo badge */}
        <div className="inline-flex items-center gap-2 bg-gold/20 border border-gold/40 rounded-full px-4 py-1.5 mb-6">
          <Scale className="w-4 h-4 text-gold" />
          <span className="text-gold text-sm font-medium">دستیار حقوقی هوشمند</span>
        </div>

        <h1 className="text-3xl md:text-5xl font-extrabold text-primary-foreground mb-4 leading-tight">
          مشاور حقوقی <span className="text-gold">حقوق ایران</span>
        </h1>

        <p className="text-primary-foreground/80 max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
          تحلیل حرفه‌ای پرونده‌های حقوقی بر اساس قوانین جمهوری اسلامی ایران.
          مستند، دقیق و قابل ارائه به مراجع قضایی.
        </p>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-3 mt-6">
          {[
            { icon: <BookOpen className="w-3.5 h-3.5" />, label: "استناد به مواد قانونی" },
            { icon: <Gavel className="w-3.5 h-3.5" />, label: "تحلیل حقوقی دقیق" },
            { icon: <Shield className="w-3.5 h-3.5" />, label: "پیش‌نویس لایحه" },
          ].map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1.5 text-primary-foreground text-xs"
            >
              {item.icon}
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
};
