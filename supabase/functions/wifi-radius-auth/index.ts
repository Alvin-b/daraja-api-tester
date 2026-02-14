import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'authenticate';
    const body = await req.json();

    if (action === 'authenticate') {
      // FreeRADIUS sends username (voucher code) and optionally password
      const { username, mac_address, ip_address } = body;

      if (!username) {
        return new Response(
          JSON.stringify({ reply: 'Access-Reject', message: 'No username provided' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Look up voucher by code or M-Pesa receipt
      const { data: voucher, error } = await supabase
        .from('wifi_vouchers')
        .select('*, wifi_packages(*)')
        .or(`code.eq.${username.toUpperCase()},mpesa_receipt.eq.${username}`)
        .in('status', ['active', 'pending'])
        .single();

      if (error || !voucher) {
        return new Response(
          JSON.stringify({ reply: 'Access-Reject', message: 'Invalid or expired voucher' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // If pending, activate it now (payment confirmed by using it)
      if (voucher.status === 'pending') {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + voucher.duration_minutes * 60 * 1000);

        await supabase
          .from('wifi_vouchers')
          .update({
            status: 'active',
            activated_at: now.toISOString(),
            expires_at: expiresAt.toISOString(),
          })
          .eq('id', voucher.id);

        // Create session
        await supabase
          .from('wifi_sessions')
          .insert({
            voucher_id: voucher.id,
            mac_address: mac_address || null,
            ip_address: ip_address || null,
            username: username.toUpperCase(),
            expires_at: expiresAt.toISOString(),
            is_active: true,
          });

        const speedLimit = voucher.wifi_packages?.speed_limit || '5M/5M';
        const [rxLimit, txLimit] = speedLimit.split('/');

        return new Response(
          JSON.stringify({
            reply: 'Access-Accept',
            session_timeout: voucher.duration_minutes * 60,
            rate_limit_rx: rxLimit,
            rate_limit_tx: txLimit,
            voucher_code: voucher.code,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Already active - check expiry
      if (voucher.expires_at && new Date(voucher.expires_at) < new Date()) {
        await supabase
          .from('wifi_vouchers')
          .update({ status: 'expired' })
          .eq('id', voucher.id);

        await supabase
          .from('wifi_sessions')
          .update({ is_active: false })
          .eq('voucher_id', voucher.id);

        return new Response(
          JSON.stringify({ reply: 'Access-Reject', message: 'Voucher expired' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const remainingSeconds = voucher.expires_at
        ? Math.floor((new Date(voucher.expires_at).getTime() - Date.now()) / 1000)
        : voucher.duration_minutes * 60;

      const speedLimit = voucher.wifi_packages?.speed_limit || '5M/5M';
      const [rxLimit, txLimit] = speedLimit.split('/');

      // Update or create session
      await supabase
        .from('wifi_sessions')
        .upsert({
          voucher_id: voucher.id,
          mac_address: mac_address || null,
          ip_address: ip_address || null,
          username: username.toUpperCase(),
          expires_at: voucher.expires_at,
          is_active: true,
        }, { onConflict: 'voucher_id' })
        .select();

      return new Response(
        JSON.stringify({
          reply: 'Access-Accept',
          session_timeout: remainingSeconds,
          rate_limit_rx: rxLimit,
          rate_limit_tx: txLimit,
          voucher_code: voucher.code,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'accounting') {
      const { username, bytes_in, bytes_out, status_type } = body;

      if (status_type === 'Stop') {
        await supabase
          .from('wifi_sessions')
          .update({
            is_active: false,
            bytes_in: bytes_in || 0,
            bytes_out: bytes_out || 0,
          })
          .eq('username', username?.toUpperCase())
          .eq('is_active', true);
      } else if (status_type === 'Interim-Update') {
        await supabase
          .from('wifi_sessions')
          .update({
            bytes_in: bytes_in || 0,
            bytes_out: bytes_out || 0,
          })
          .eq('username', username?.toUpperCase())
          .eq('is_active', true);
      }

      return new Response(
        JSON.stringify({ reply: 'Accounting-Response' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check payment status and activate voucher
    if (action === 'check-payment') {
      const { checkoutRequestId } = body;

      const { data: voucher } = await supabase
        .from('wifi_vouchers')
        .select('*')
        .eq('checkout_request_id', checkoutRequestId)
        .single();

      if (!voucher) {
        return new Response(
          JSON.stringify({ status: 'not_found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Query Daraja for payment status
      const consumerKey = Deno.env.get('DARAJA_CONSUMER_KEY')!;
      const consumerSecret = Deno.env.get('DARAJA_CONSUMER_SECRET')!;
      const auth = btoa(`${consumerKey}:${consumerSecret}`);

      const tokenRes = await fetch(
        'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
        { method: 'GET', headers: { 'Authorization': `Basic ${auth}` } }
      );
      const tokenData = await tokenRes.json();

      const shortcode = Deno.env.get('DARAJA_SHORTCODE')!;
      const passkey = Deno.env.get('DARAJA_PASSKEY')!;
      const now = new Date();
      const timestamp = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}${String(now.getSeconds()).padStart(2,'0')}`;
      const password = btoa(`${shortcode}${passkey}${timestamp}`);

      const queryRes = await fetch(
        'https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            BusinessShortCode: shortcode,
            Password: password,
            Timestamp: timestamp,
            CheckoutRequestID: checkoutRequestId,
          }),
        }
      );

      const queryData = await queryRes.json();

      if (queryData.ResultCode === '0' || queryData.ResultCode === 0) {
        // Payment successful - activate voucher
        const expiresAt = new Date(Date.now() + voucher.duration_minutes * 60 * 1000);

        await supabase
          .from('wifi_vouchers')
          .update({
            status: 'active',
            activated_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString(),
          })
          .eq('id', voucher.id);

        return new Response(
          JSON.stringify({
            status: 'paid',
            voucherCode: voucher.code,
            expiresAt: expiresAt.toISOString(),
            durationMinutes: voucher.duration_minutes,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          status: voucher.status,
          resultCode: queryData.ResultCode,
          resultDesc: queryData.ResultDesc,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Unknown action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('RADIUS auth error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
