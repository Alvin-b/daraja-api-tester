-- Add multi-currency / country support to packages
ALTER TABLE public.wifi_packages
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'KES',
  ADD COLUMN IF NOT EXISTS country_code text NOT NULL DEFAULT 'KE';

-- Add provider tracking to vouchers
ALTER TABLE public.wifi_vouchers
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'KES',
  ADD COLUMN IF NOT EXISTS payment_provider text NOT NULL DEFAULT 'mpesa',
  ADD COLUMN IF NOT EXISTS paystack_reference text;

CREATE INDEX IF NOT EXISTS idx_wifi_vouchers_paystack_ref
  ON public.wifi_vouchers(paystack_reference)
  WHERE paystack_reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wifi_packages_country
  ON public.wifi_packages(country_code, is_active);