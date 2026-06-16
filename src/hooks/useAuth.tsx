// ============================================================
// هوک احراز هویت - useAuth
// ============================================================
// این هوک کل چرخه احراز هویت اپلیکیشن را مدیریت می‌کند:
// - وضعیت ورود کاربر (user, session) از طریق Supabase Auth
// - نقش‌های کاربر (roles) از جدول user_roles پایگاه داده
// - Computed isAdmin:布尔ien که آیا کاربر نقش "admin" دارد یا نه
// - امکان خروج از حساب (signOut)
//
// ساختار نقش‌ها:
//   - admin:     دسترسی کامل به همه بخش‌های مدیریتی
//   - lawyer:    دسترسی محدود‌تر (برای آینده)
//   - restricted: دسترسی محدود‌تر (برای آینده)
//
// نکته فنی: برای جلوگیری از deadlock در هنگام بارگذاری نقش‌ها،
// درخواست جدول user_roles در setTimeout قرار داده شده است.
// ============================================================

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// ============================================================
// تعریف انواع نقش‌های مجاز در سیستم
// // ============================================================
type AppRole = "admin" | "lawyer" | "restricted";

// ============================================================
// ساختار Context برای استفاده در سراسر اپلیکیشن
// ============================================================
interface AuthCtx {
  user: User | null;           // کاربر احراز هویت شده
  session: Session | null;     // نشست احراز هویت (توکن‌ها و metadata)
  loading: boolean;            // آیا در حال بارگذاری وضعیت احراز هویت هست؟
  roles: AppRole[];            // لیست نقش‌های کاربر (از جدول user_roles)
  isAdmin: boolean;            // آیا کاربر نقش admin دارد؟
  signOut: () => Promise<void>; // تابع خروج از حساب
}

// ============================================================
// مقدار پیش‌فرض Context (قبل از احراز هویت)
// ============================================================
const Ctx = createContext<AuthCtx>({
  user: null, session: null, loading: true, roles: [], isAdmin: false,
  signOut: async () => {},
});

// ============================================================
// Provider سطح بالا - باید کل اپلیکیشن را در بر گیرد
// ============================================================
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  // ============================================================
  // گوش دادن به تغییرات احراز هویت (ورود/خروج/تغییر توکن)
  // ============================================================
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);

      if (s?.user) {
        // ============================================================
        // بارگیری نقش‌های کاربر از جدول user_roles
        // نکته: در setTimeout قرار داده شده تا از deadlock جلوگیری شود
        // چون onAuthStateChange ممکن است چند بار در لحظه اجرا شود
        // ============================================================
        setTimeout(async () => {
          const { data } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", s.user!.id);
          setRoles((data || []).map((r: any) => r.role as AppRole));
        }, 0);
      } else {
        setRoles([]);
      }
    });

    // ============================================================
    // بررسی اولیه: آیا کاربر قبلاً وارد شده و توکن معتبر دارد؟
    // ============================================================
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", s.user.id)
          .then(({ data }) => setRoles((data || []).map((r: any) => r.role as AppRole)));
      }
      setLoading(false);
    });

    // ============================================================
    // تمیز کردن listener هنگام unmount کامپوننت
    // ============================================================
    return () => subscription.unsubscribe();
  }, []);

  // ============================================================
  // تابع خروج از حساب - نشست Supabase را خاتمه می‌دهد
  // ============================================================
  const signOut = async () => { await supabase.auth.signOut(); };

  // ============================================================
  // مقداردهی Context با computed isAdmin
  // isAdmin true است اگر نقش "admin" در لیست roles وجود داشته باشد
  // ============================================================
  return (
    <Ctx.Provider value={{
      user, session, loading, roles,
      isAdmin: roles.includes("admin"),
      signOut,
    }}>
      {children}
    </Ctx.Provider>
  );
};

// ============================================================
// هوک استفاده از Context در کامپوننت‌ها
// ============================================================
// مثال استفاده:
//   const { user, isAdmin, signOut } = useAuth();
// ============================================================
export const useAuth = () => useContext(Ctx);
