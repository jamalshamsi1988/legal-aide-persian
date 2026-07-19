import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Loader2, Mail, Lock, Scale, ArrowRight } from "lucide-react";

const sanitizeNext = (raw: string | null): string => {
  if (!raw) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
};

const Auth = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = sanitizeNext(params.get("next"));
  const { user, loading } = useAuth();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate(next, { replace: true });
  }, [user, loading, next, navigate]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || password.length < 6) {
      toast({ title: "خطا", description: "ایمیل معتبر و رمز حداقل ۶ کاراکتری وارد کنید.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${next}`,
            data: { display_name: displayName.trim() || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast({ title: "خوش آمدید 🎉", description: "حساب شما ایجاد شد." });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "خطا در احراز هویت";
      const fa = msg.includes("Invalid login")
        ? "ایمیل یا رمز عبور اشتباه است"
        : msg.includes("already registered") || msg.includes("User already")
        ? "این ایمیل قبلاً ثبت‌نام کرده است"
        : msg;
      toast({ title: "خطا", description: fa, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast({ title: "خطا در ورود با گوگل", description: String(result.error.message || result.error), variant: "destructive" });
      }
      // If redirected, browser navigates away
    } catch (err) {
      toast({ title: "خطا", description: err instanceof Error ? err.message : "خطا در ورود با گوگل", variant: "destructive" });
    } finally {
      setGoogleBusy(false);
    }
  };

  return (
    <div className="min-h-screen gradient-section flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-6 text-navy">
          <Scale className="w-6 h-6 text-gold" />
          <span className="font-bold text-lg">مشاور حقوقی هوشمند</span>
        </Link>

        <div className="bg-card rounded-2xl shadow-legal-lg border border-border overflow-hidden">
          <div className="bg-navy p-5">
            <h1 className="text-primary-foreground font-bold text-lg">
              {mode === "signin" ? "ورود به حساب" : "ایجاد حساب رایگان"}
            </h1>
            <p className="text-primary-foreground/60 text-xs mt-1">
              {mode === "signin"
                ? "برای استفاده از تحلیل حقوقی وارد شوید."
                : "با ثبت‌نام، روزانه ۳ تحلیل رایگان دریافت کنید."}
            </p>
          </div>

          <div className="p-5 space-y-4">
            <button
              onClick={handleGoogle}
              disabled={googleBusy || busy}
              className="w-full flex items-center justify-center gap-2 bg-white border border-border rounded-xl px-4 py-3 text-sm font-medium text-navy hover:bg-parchment transition-colors disabled:opacity-50"
            >
              {googleBusy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              ورود با گوگل
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">یا با ایمیل</span></div>
            </div>

            <form onSubmit={handleEmailSubmit} className="space-y-3">
              {mode === "signup" && (
                <input
                  type="text"
                  placeholder="نام (اختیاری)"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-parchment border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50"
                />
              )}
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  required
                  placeholder="ایمیل"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  dir="ltr"
                  className="w-full bg-parchment border border-border rounded-xl pr-9 pl-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 text-right"
                />
              </div>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="رمز عبور (حداقل ۶ کاراکتر)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  dir="ltr"
                  className="w-full bg-parchment border border-border rounded-xl pr-9 pl-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 text-right"
                />
              </div>

              <button
                type="submit"
                disabled={busy || googleBusy}
                className="w-full flex items-center justify-center gap-2 gradient-gold text-navy font-bold rounded-xl px-4 py-3 shadow-gold hover:opacity-90 transition-all disabled:opacity-40 text-sm"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                {mode === "signin" ? "ورود" : "ثبت‌نام رایگان"}
              </button>
            </form>

            <p className="text-center text-xs text-muted-foreground">
              {mode === "signin" ? "حساب ندارید؟" : "قبلاً ثبت‌نام کرده‌اید؟"}{" "}
              <button
                type="button"
                onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                className="text-navy font-semibold hover:text-gold transition-colors"
              >
                {mode === "signin" ? "ثبت‌نام کنید" : "وارد شوید"}
              </button>
            </p>
          </div>
        </div>

        <p className="text-center text-[11px] text-muted-foreground mt-4">
          با ثبت‌نام، قوانین و حریم خصوصی سرویس را می‌پذیرید.
        </p>
      </div>
    </div>
  );
};

export default Auth;
