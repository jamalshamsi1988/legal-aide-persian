
-- ============================================================
-- USER CREDITS: موجودی توکن + شمارنده رایگان روزانه
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_credits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance_tokens BIGINT NOT NULL DEFAULT 0,
  total_purchased_tokens BIGINT NOT NULL DEFAULT 0,
  free_analyses_today INT NOT NULL DEFAULT 0,
  last_free_reset DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.user_credits TO authenticated;
GRANT ALL ON public.user_credits TO service_role;

ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user reads own credits"
  ON public.user_credits FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- USAGE LEDGER: تاریخچه مصرف
-- ============================================================
CREATE TABLE IF NOT EXISTS public.usage_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,                     -- 'standard' | 'detailed' | 'search'
  mode TEXT NOT NULL,                     -- 'free' | 'paid'
  prompt_tokens INT NOT NULL DEFAULT 0,
  completion_tokens INT NOT NULL DEFAULT 0,
  total_tokens INT NOT NULL DEFAULT 0,
  workspace_slug TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usage_ledger_user_date ON public.usage_ledger(user_id, created_at DESC);

GRANT SELECT ON public.usage_ledger TO authenticated;
GRANT ALL ON public.usage_ledger TO service_role;

ALTER TABLE public.usage_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user reads own usage"
  ON public.usage_ledger FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- TOKEN PACKAGES: بسته‌های خرید (قابل خواندن توسط همه)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.token_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title_fa TEXT NOT NULL,
  tokens BIGINT NOT NULL,
  price_toman INT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.token_packages TO anon, authenticated;
GRANT ALL ON public.token_packages TO service_role;

ALTER TABLE public.token_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "packages readable by all"
  ON public.token_packages FOR SELECT TO anon, authenticated
  USING (is_active = TRUE);

-- ============================================================
-- PAYMENT ORDERS: سفارش‌های پرداخت
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES public.token_packages(id),
  amount_toman INT NOT NULL,
  tokens BIGINT NOT NULL,
  gateway TEXT NOT NULL DEFAULT 'zarinpal',
  authority TEXT,
  ref_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | paid | failed | canceled
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_orders_user ON public.payment_orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_orders_authority ON public.payment_orders(authority);

GRANT SELECT ON public.payment_orders TO authenticated;
GRANT ALL ON public.payment_orders TO service_role;

ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user reads own orders"
  ON public.payment_orders FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- FUNCTION: مقداردهی اولیه اعتبار کاربر
-- ============================================================
CREATE OR REPLACE FUNCTION public.ensure_user_credits(_uid UUID)
RETURNS public.user_credits
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec public.user_credits;
BEGIN
  INSERT INTO public.user_credits(user_id) VALUES (_uid)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.user_credits
  SET free_analyses_today = 0,
      last_free_reset = CURRENT_DATE,
      updated_at = now()
  WHERE user_id = _uid AND last_free_reset < CURRENT_DATE;

  SELECT * INTO rec FROM public.user_credits WHERE user_id = _uid;
  RETURN rec;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_user_credits(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_user_credits(UUID) TO authenticated, service_role;

-- ============================================================
-- FUNCTION: بررسی مجاز بودن استفاده قبل از فراخوانی AI
-- Returns: { allowed, mode, reason, free_left, balance }
-- kind: 'standard' | 'detailed' | 'search'
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_can_use(_uid UUID, _kind TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec public.user_credits;
  free_daily_limit INT := 3;
  min_paid_standard INT := 500;    -- حداقل موجودی برای شروع تحلیل عادی
  min_paid_detailed INT := 3000;   -- حداقل موجودی برای تحلیل ویژه
  min_paid_search INT := 100;
  free_left INT;
BEGIN
  rec := public.ensure_user_credits(_uid);
  free_left := GREATEST(free_daily_limit - rec.free_analyses_today, 0);

  -- تحلیل ویژه هیچ‌گاه رایگان نیست
  IF _kind = 'detailed' THEN
    IF rec.balance_tokens >= min_paid_detailed THEN
      RETURN jsonb_build_object('allowed', true, 'mode', 'paid',
        'balance', rec.balance_tokens, 'free_left', free_left);
    END IF;
    RETURN jsonb_build_object('allowed', false, 'mode', 'blocked',
      'reason', 'insufficient_balance_detailed',
      'balance', rec.balance_tokens, 'free_left', free_left);
  END IF;

  -- تحلیل عادی: ابتدا سهمیه رایگان
  IF _kind = 'standard' THEN
    IF free_left > 0 THEN
      RETURN jsonb_build_object('allowed', true, 'mode', 'free',
        'balance', rec.balance_tokens, 'free_left', free_left);
    END IF;
    IF rec.balance_tokens >= min_paid_standard THEN
      RETURN jsonb_build_object('allowed', true, 'mode', 'paid',
        'balance', rec.balance_tokens, 'free_left', 0);
    END IF;
    RETURN jsonb_build_object('allowed', false, 'mode', 'blocked',
      'reason', 'free_exhausted_no_balance',
      'balance', rec.balance_tokens, 'free_left', 0);
  END IF;

  -- جستجو (سبک)
  IF _kind = 'search' THEN
    IF free_left > 0 OR rec.balance_tokens >= min_paid_search THEN
      RETURN jsonb_build_object('allowed', true,
        'mode', CASE WHEN free_left > 0 THEN 'free' ELSE 'paid' END,
        'balance', rec.balance_tokens, 'free_left', free_left);
    END IF;
    RETURN jsonb_build_object('allowed', false, 'mode', 'blocked',
      'reason', 'insufficient',
      'balance', rec.balance_tokens, 'free_left', free_left);
  END IF;

  RETURN jsonb_build_object('allowed', false, 'mode', 'blocked', 'reason', 'unknown_kind');
END;
$$;

REVOKE ALL ON FUNCTION public.check_can_use(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_can_use(UUID, TEXT) TO service_role;

-- ============================================================
-- FUNCTION: ثبت مصرف پس از فراخوانی AI و کسر توکن
-- ============================================================
CREATE OR REPLACE FUNCTION public.record_ai_usage(
  _uid UUID,
  _kind TEXT,
  _mode TEXT,
  _prompt_tokens INT,
  _completion_tokens INT,
  _workspace_slug TEXT,
  _meta JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total INT := COALESCE(_prompt_tokens, 0) + COALESCE(_completion_tokens, 0);
  new_balance BIGINT;
BEGIN
  PERFORM public.ensure_user_credits(_uid);

  INSERT INTO public.usage_ledger(user_id, kind, mode, prompt_tokens, completion_tokens, total_tokens, workspace_slug, meta)
  VALUES (_uid, _kind, _mode, COALESCE(_prompt_tokens,0), COALESCE(_completion_tokens,0), total, _workspace_slug, COALESCE(_meta,'{}'::jsonb));

  IF _mode = 'free' THEN
    UPDATE public.user_credits
    SET free_analyses_today = free_analyses_today + 1,
        updated_at = now()
    WHERE user_id = _uid
    RETURNING balance_tokens INTO new_balance;
  ELSIF _mode = 'paid' THEN
    UPDATE public.user_credits
    SET balance_tokens = GREATEST(balance_tokens - total, 0),
        updated_at = now()
    WHERE user_id = _uid
    RETURNING balance_tokens INTO new_balance;
  ELSE
    SELECT balance_tokens INTO new_balance FROM public.user_credits WHERE user_id = _uid;
  END IF;

  RETURN jsonb_build_object('total_tokens', total, 'new_balance', new_balance);
END;
$$;

REVOKE ALL ON FUNCTION public.record_ai_usage(UUID, TEXT, TEXT, INT, INT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_ai_usage(UUID, TEXT, TEXT, INT, INT, TEXT, JSONB) TO service_role;

-- ============================================================
-- FUNCTION: افزودن توکن پس از پرداخت موفق (service_role only)
-- ============================================================
CREATE OR REPLACE FUNCTION public.credit_tokens(_uid UUID, _tokens BIGINT, _order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_balance BIGINT;
BEGIN
  PERFORM public.ensure_user_credits(_uid);
  UPDATE public.user_credits
  SET balance_tokens = balance_tokens + _tokens,
      total_purchased_tokens = total_purchased_tokens + _tokens,
      updated_at = now()
  WHERE user_id = _uid
  RETURNING balance_tokens INTO new_balance;

  INSERT INTO public.usage_ledger(user_id, kind, mode, total_tokens, meta)
  VALUES (_uid, 'purchase', 'credit', -_tokens, jsonb_build_object('order_id', _order_id));

  RETURN jsonb_build_object('new_balance', new_balance);
END;
$$;

REVOKE ALL ON FUNCTION public.credit_tokens(UUID, BIGINT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.credit_tokens(UUID, BIGINT, UUID) TO service_role;

-- ============================================================
-- Seed: بسته‌های پیش‌فرض
-- ============================================================
INSERT INTO public.token_packages (slug, title_fa, tokens, price_toman, sort_order) VALUES
  ('starter',  'بسته پایه — ۱۰۰ هزار توکن',  100000,   99000, 1),
  ('pro',      'بسته حرفه‌ای — ۵۰۰ هزار توکن', 500000,  349000, 2),
  ('unlimited','بسته نامحدود — ۲ میلیون توکن', 2000000, 990000, 3)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- Trigger برای updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.tg_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS touch_user_credits ON public.user_credits;
CREATE TRIGGER touch_user_credits BEFORE UPDATE ON public.user_credits
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

DROP TRIGGER IF EXISTS touch_payment_orders ON public.payment_orders;
CREATE TRIGGER touch_payment_orders BEFORE UPDATE ON public.payment_orders
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
