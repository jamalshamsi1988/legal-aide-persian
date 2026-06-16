// ============================================================
// صفحه احراز هویت - ورود / ثبت‌نام کاربران
// ============================================================
// این صفحه برای احراز هویت کاربران طراحی شده است.
// - کاربران می‌توانند با ایمیل و رمز عبور وارد شوند یا ثبت‌نام کنند.
// - همچنین امکان ورود با حساب گوگل (OAuth) نیز فراهم است.
// - پس از ورود موفق، کاربر به صفحه قبلی هدایت می‌شود.
// - کاربران تایید‌شده با نقش "admin" می‌توانند به بخش‌های مدیریتی دسترسی داشته باشند.
// ============================================================

import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, Scale } from "lucide-react";

// ============================================================
// کنترلر صفحه احراز هویت
// ============================================================
// حالت‌های مختلف صفحه: "signin" (ورود) یا "signup" (ثبت‌نام)
// ============================================================
const AuthPage = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  // ============================================================
  // تعیین صفحه مقصد بعد از ورود موفق
  // ============================================================
  const from = (location.state as any)?.from || "/";

  // ============================================================
  // نمایش لودینگ enquanto در حال بررسی وضعیت احراز هویت
  // ============================================================
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-gold" /></div>;
  }

  // ============================================================
  // اگر کاربر قبلاً وارد شده باشد، به صفحه مقصد هدایت کن
  // ============================================================
  if (user) return <Navigate to={from} replace />;

  // ============================================================
  // هندلر ثبت‌نام و ورود با ایمیل و رمز عبور
  // ============================================================
  // - در حالت ثبت‌نام: کاربر جدید ایجاد می‌شود و سپس وارد حساب می‌شود
  // - در حالت ورود: اعتبارسنجی ایمیل و رمز عبور انجام می‌شود
  // ============================================================
  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        // ============================================================
        // ثبت‌نام کاربر جدید
        // ============================================================
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name || email },
          },
        });
        if (error) throw error;
        toast({ title: "ثبت‌نام موفق", description: "وارد حساب خود شدید." });
      } else {
        // ============================================================
        // ورود کاربر موجود با ایمیل و رمز عبور
        // ============================================================
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      toast({ title: "خطا", description: err.message || "خطای احراز هویت", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  // ============================================================
  // هندلر ورود با حساب گوگل (OAuth)
  // ============================================================
  // از سرویس Lovable Cloud برای احراز هویت استفاده می‌کند
  // ============================================================
  const handleGoogle = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) {
      toast({ title: "خطا در ورود با گوگل", description: String((result.error as any).message || result.error), variant: "destructive" });
      setBusy(false);
    }
  };

  // ============================================================
  // رابط کاربری صفحه احراز هویت
  // ============================================================
  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center gradient-section px-4">
      <Card className="w-full max-w-md p-6 space-y-5">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 text-gold mb-2"><Scale className="w-5 h-5" /><span className="font-bold">دستیار حقوقی</span></div>
          <h1 className="text-2xl font-bold text-navy">{mode === "signin" ? "ورود به حساب" : "ایجاد حساب کاربری"}</h1>
        </div>

        {/* دکمه ورود با گوگل */}
        <Button type="button" variant="outline" className="w-full" onClick={handleGoogle} disabled={busy}>
          ورود با گوگل
        </Button>

        <div className="relative text-center text-xs text-muted-foreground">
          <span className="bg-card px-2 relative z-10">یا</span>
          <div className="absolute inset-x-0 top-1/2 border-t" />
        </div>

        {/* فرم ورود/ثبت‌نام با ایمیل */}
        <form onSubmit={handleEmail} className="space-y-3">
          {mode === "signup" && (
            <div>
              <Label htmlFor="name">نام کامل</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          )}
          <div>
            <Label htmlFor="email">ایمیل</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" />
          </div>
          <div>
            <Label htmlFor="password">رمز عبور</Label>
            <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" />
          </div>
          <Button type="submit" className="w-full bg-navy hover:bg-navy/90 text-primary-foreground" disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === "signin" ? "ورود" : "ثبت‌نام"}
          </Button>
        </form>

        {/* تغییر حالت بین ورود و ثبت‌نام */}
        <button type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="w-full text-sm text-gold hover:underline">
          {mode === "signin" ? "حساب ندارید؟ ثبت‌نام" : "حساب دارید؟ ورود"}
        </button>
      </Card>
    </div>
  );
};

export default AuthPage;
