import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateVoucherCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[\s\-\+]/g, '');
  if (cleaned.startsWith('0')) cleaned = '254' + cleaned.substring(1);
  if (cleaned.startsWith('+254')) cleaned = cleaned.substring(1);
  return cleaned;
}

function getTimestamp(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  return `${y}${m}${d}${h}${mi}${s}`;
}

async function getAccessToken(): Promise<string> {
  const consumerKey = Deno.env.get('DARAJA_CONSUMER_KEY');
  const consumerSecret = Deno.env.get('DARAJA_CONSUMER_SECRET');
  if (!consumerKey || !consumerSecret) throw new Error('Daraja credentials not configured');

  const auth = btoa(`${consumerKey}:${consumerSecret}`);
  const response = await fetch(
    'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
    { method: 'GET', headers: { 'Authorization': `Basic ${auth}` } }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OAuth failed: ${response.status} - ${text}`);
  }

  const data = await response.json();
  if (!data.access_token) throw new Error('No access token in response');
  return data.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phoneNumber, packageId } = await req.json();

    if (!phoneNumber || !packageId) {
      return new Response(
        JSON.stringify({ error: 'Missing phoneNumber or packageId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get package details
    const { data: pkg, error: pkgError } = await supabase
      .from('wifi_packages')
      .select('*')
      .eq('id', packageId)
      .single();

    if (pkgError || !pkg) {
      return new Response(
        JSON.stringify({ error: 'Package not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const shortcode = Deno.env.get('DARAJA_SHORTCODE');
    const passkey = Deno.env.get('DARAJA_PASSKEY');
    const callbackUrl = Deno.env.get('DARAJA_CALLBACK_URL');

    if (!shortcode || !passkey || !callbackUrl) {
      return new Response(
        JSON.stringify({ error: 'Daraja configuration incomplete' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = await getAccessToken();
    const timestamp = getTimestamp();
    const password = btoa(`${shortcode}${passkey}${timestamp}`);
    const formattedPhone = formatPhoneNumber(phoneNumber);
    const tillNumber = '4159923';

    const stkPayload = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerBuyGoodsOnline',
      Amount: Math.round(pkg.price),
      PartyA: formattedPhone,
      PartyB: tillNumber,
      PhoneNumber: formattedPhone,
      CallBackURL: callbackUrl,
      AccountReference: 'WiFi',
      TransactionDesc: pkg.name.substring(0, 13),
    };

    const stkResponse = await fetch(
      'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(stkPayload),
      }
    );

    const stkData = await stkResponse.json();
    const isSuccess = stkData.ResponseCode === '0';

    if (isSuccess) {
      // Generate unique voucher code
      let code = generateVoucherCode();
      let attempts = 0;
      while (attempts < 10) {
        const { data: existing } = await supabase
          .from('wifi_vouchers')
          .select('id')
          .eq('code', code)
          .single();
        if (!existing) break;
        code = generateVoucherCode();
        attempts++;
      }

      // Create pending voucher
      const { data: voucher, error: voucherError } = await supabase
        .from('wifi_vouchers')
        .insert({
          code,
          package_id: packageId,
          phone_number: formattedPhone,
          checkout_request_id: stkData.CheckoutRequestID,
          status: 'pending',
          amount_paid: pkg.price,
          duration_minutes: pkg.duration_minutes,
        })
        .select()
        .single();

      if (voucherError) {
        console.error('Voucher creation error:', voucherError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          checkoutRequestId: stkData.CheckoutRequestID,
          voucherCode: code,
          message: 'STK push sent. Complete payment to activate your voucher.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'STK push failed', data: stkData }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('WiFi payment error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
