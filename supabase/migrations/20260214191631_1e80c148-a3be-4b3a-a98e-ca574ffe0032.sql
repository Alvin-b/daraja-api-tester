
-- WiFi packages table
CREATE TABLE public.wifi_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  price INTEGER NOT NULL,
  speed_limit TEXT DEFAULT '5M/5M',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.wifi_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "WiFi packages are viewable by everyone" ON public.wifi_packages FOR SELECT USING (true);

-- WiFi vouchers table (the 5-letter codes)
CREATE TABLE public.wifi_vouchers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  package_id UUID NOT NULL REFERENCES public.wifi_packages(id),
  phone_number TEXT NOT NULL,
  mpesa_receipt TEXT,
  checkout_request_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired', 'used')),
  amount_paid INTEGER NOT NULL,
  duration_minutes INTEGER NOT NULL,
  activated_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.wifi_vouchers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vouchers viewable by everyone" ON public.wifi_vouchers FOR SELECT USING (true);

-- WiFi active sessions
CREATE TABLE public.wifi_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  voucher_id UUID NOT NULL REFERENCES public.wifi_vouchers(id),
  mac_address TEXT,
  ip_address TEXT,
  username TEXT NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  bytes_in BIGINT DEFAULT 0,
  bytes_out BIGINT DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.wifi_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sessions viewable by everyone" ON public.wifi_sessions FOR SELECT USING (true);

-- MikroTik router settings
CREATE TABLE public.mikrotik_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  router_name TEXT NOT NULL DEFAULT 'Main Router',
  router_ip TEXT NOT NULL,
  api_port INTEGER NOT NULL DEFAULT 8728,
  api_username TEXT NOT NULL DEFAULT 'admin',
  api_password TEXT NOT NULL DEFAULT '',
  hotspot_server TEXT NOT NULL DEFAULT 'hotspot1',
  dns_name TEXT,
  portal_url TEXT,
  is_connected BOOLEAN NOT NULL DEFAULT false,
  last_connected_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.mikrotik_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "MikroTik settings viewable by everyone" ON public.mikrotik_settings FOR SELECT USING (true);
CREATE POLICY "MikroTik settings insertable by everyone" ON public.mikrotik_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "MikroTik settings updatable by everyone" ON public.mikrotik_settings FOR UPDATE USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_wifi_packages_updated_at BEFORE UPDATE ON public.wifi_packages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_wifi_sessions_updated_at BEFORE UPDATE ON public.wifi_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_mikrotik_settings_updated_at BEFORE UPDATE ON public.mikrotik_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default packages
INSERT INTO public.wifi_packages (name, duration_minutes, price, speed_limit) VALUES
  ('1 Hour', 60, 20, '5M/5M'),
  ('3 Hours', 180, 50, '5M/5M'),
  ('24 Hours', 1440, 100, '10M/10M'),
  ('7 Days', 10080, 500, '10M/10M');
