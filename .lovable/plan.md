# نقشه راه استارتاپی — مرحله به مرحله

بر اساس پاسخ‌های شما: **ثبت‌نام ایمیل/گوگل**، **۳ تحلیل رایگان روزانه**، **مصرف واقعی توکن AI**، **درگاه زرین‌پال/IDPay**.

## نقاط ضعف فعلی (بررسی سریع)
- ❌ احراز هویت کاملاً حذف شده → امکان سوءاستفاده نامحدود، عدم امکان مانیتایز
- ❌ مسیرهای `/admin/*` بدون هیچ محافظت → هر کسی به پایگاه دانش دسترسی دارد
- ❌ Edge functions با `verify_jwt = false` → قابل فراخوانی بدون مجوز، هزینه‌ی AI بدون کنترل
- ❌ تاریخچه فقط در localStorage → با پاک‌شدن مرورگر از دست می‌رود
- ❌ هیچ سیستم Quota/Billing/Usage tracking
- ❌ Landing page ضعیف؛ فاقد قیمت‌گذاری، توضیح محصول، CTA خرید
- ❌ SEO ناقص (`index.html` احتمالاً دیفالت)
- ❌ عدم rate limiting و logging مصرف
- ❌ در `.env` کلید GapGPT قدیمی commit شده (نظر)

## مرحله ۱ — بازگرداندن Auth (Email + Google)
- فعال‌سازی Google OAuth مدیریت‌شده Cloud + Email/Password
- صفحه `/auth` با تب ورود/ثبت‌نام و دکمه Google
- `AuthProvider` واقعی با `onAuthStateChange` + `getUser`
- `ProtectedRoute` برای `/workspace/*` و `/admin/*`
- سینک تاریخچه localStorage با جدول DB بعد از login

## مرحله ۲ — مدل توکن و سهمیه رایگان
جدول‌های جدید:
- `user_credits(user_id PK, balance_tokens BIGINT, free_analyses_today INT, last_free_reset DATE)`
- `usage_ledger(id, user_id, kind, tokens_used, cost_tokens, meta, created_at)` — history
- `plans` و `token_packages` (بسته‌های خرید مثل ۱۰۰k/۵۰۰k/۲M توکن)

قواعد:
- `free_analyses_today` روزانه ریست می‌شود (۳ تحلیل عادی رایگان)
- تحلیل ویژه (Gemini Pro) همیشه از توکن مصرف می‌کند (رایگان نیست)
- بعد از سقف رایگان، سیستم به‌ازای هر تحلیل `input_tokens + output_tokens` را از موجودی کم می‌کند
- RPC امن `consume_credits(user, kind, tokens)` که در Edge Function قبل و بعد از فراخوانی AI اجرا می‌شود

## مرحله ۳ — سخت‌سازی Edge Functions
- `verify_jwt = true` برای `legal-ai`, `legal-search`, `legal-ingest`
- در هر function: احراز JWT → بررسی سهمیه → فراخوانی AI → ثبت مصرف در ledger
- ثبت خطاهای عدم موجودی با پیام فارسی واضح
- `legal-ingest` فقط برای admin role

## مرحله ۴ — درگاه پرداخت زرین‌پال
- درخواست `ZARINPAL_MERCHANT_ID` از کاربر (add_secret)
- Edge functions:
  - `payment-create`: ایجاد authority + ثبت `payment_orders(id, user_id, package_id, amount, authority, status)`
  - `payment-verify`: verify + شارژ توکن + به‌روزرسانی وضعیت
- صفحه `/pricing` با ۳ پکیج (مثلاً ۹۹k/۲۹۹k/۹۹۹k تومان)
- صفحه `/payment/callback` برای دریافت `Authority` و `Status`

## مرحله ۵ — UI استارتاپ
- Landing جدید: Hero + Features + Pricing + FAQ + CTA
- Header: نمایش موجودی توکن + دکمه شارژ
- Dashboard کاربر: `/account` (موجودی، تاریخچه مصرف، تاریخچه خرید)
- Toast هنگام کاهش سهمیه/توکن با پیام دوستانه
- SEO: title, description, OG tags در `index.html`

## مرحله ۶ — Polish
- پاک‌سازی `.env` از کلیدهای قدیمی
- تست e2e با Playwright (signup → استفاده رایگان → اتمام → خرید → استفاده)
- Rate limit ساده در Edge Functions (مثلاً حداکثر ۳۰ req/min)
- Security scan نهایی و رفع issueها

## اجرا
هر مرحله را پیاده می‌کنم، تست می‌کنم و به مرحله بعد می‌روم. **مرحله ۱ (Auth) را همین حالا شروع کنم؟**
