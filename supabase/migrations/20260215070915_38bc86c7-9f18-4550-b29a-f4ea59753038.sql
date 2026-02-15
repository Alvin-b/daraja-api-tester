
-- Allow insert/update on wifi_packages (admin, no auth yet)
CREATE POLICY "WiFi packages insertable by everyone" ON public.wifi_packages FOR INSERT WITH CHECK (true);
CREATE POLICY "WiFi packages updatable by everyone" ON public.wifi_packages FOR UPDATE USING (true);

-- Vouchers and sessions are managed by edge functions with service role key
-- but add policies for completeness
CREATE POLICY "Vouchers insertable by service" ON public.wifi_vouchers FOR INSERT WITH CHECK (true);
CREATE POLICY "Vouchers updatable by service" ON public.wifi_vouchers FOR UPDATE USING (true);
CREATE POLICY "Sessions insertable by service" ON public.wifi_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Sessions updatable by service" ON public.wifi_sessions FOR UPDATE USING (true);
