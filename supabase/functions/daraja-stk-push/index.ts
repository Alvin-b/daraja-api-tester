import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface STKPushRequest {
  phoneNumber: string;
  amount: number;
  accountReference: string;
  transactionDesc: string;
}

async function getAccessToken(): Promise<string> {
  const consumerKey = Deno.env.get('DARAJA_CONSUMER_KEY');
  const consumerSecret = Deno.env.get('DARAJA_CONSUMER_SECRET');
  
  if (!consumerKey || !consumerSecret) {
    throw new Error('Daraja credentials not configured');
  }

  console.log('Consumer Key length:', consumerKey.length);
  console.log('Consumer Secret length:', consumerSecret.length);

  const auth = btoa(`${consumerKey}:${consumerSecret}`);
  
  const response = await fetch(
    'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
    {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
      },
    }
  );

  const responseText = await response.text();
  console.log('OAuth response status:', response.status);
  console.log('OAuth response:', responseText);

  if (!response.ok) {
    throw new Error(`Failed to get access token: ${response.status} - ${responseText}`);
  }

  const data = JSON.parse(responseText);
  
  if (!data.access_token) {
    throw new Error(`No access token in response: ${responseText}`);
  }
  
  console.log('Access token obtained, length:', data.access_token.length);
  return data.access_token;
}

function formatPhoneNumber(phone: string): string {
  // Remove any spaces, dashes, or plus signs
  let cleaned = phone.replace(/[\s\-\+]/g, '');
  
  // If starts with 0, replace with 254
  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.substring(1);
  }
  
  // If starts with +254, remove the +
  if (cleaned.startsWith('+254')) {
    cleaned = cleaned.substring(1);
  }
  
  return cleaned;
}

function getTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phoneNumber, amount, accountReference, transactionDesc }: STKPushRequest = await req.json();
    
    console.log('STK Push request received:', { phoneNumber, amount, accountReference, transactionDesc });

    // Validate inputs
    if (!phoneNumber || !amount || !accountReference) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: phoneNumber, amount, accountReference' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const shortcode = Deno.env.get('DARAJA_SHORTCODE');
    const passkey = Deno.env.get('DARAJA_PASSKEY');
    const callbackUrl = Deno.env.get('DARAJA_CALLBACK_URL');

    console.log('Shortcode:', shortcode);
    console.log('Passkey length:', passkey?.length);
    console.log('Callback URL:', callbackUrl);

    if (!shortcode || !passkey || !callbackUrl) {
      return new Response(
        JSON.stringify({ error: 'Daraja configuration incomplete. Check DARAJA_SHORTCODE, DARAJA_PASSKEY, DARAJA_CALLBACK_URL' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get access token
    const accessToken = await getAccessToken();
    
    // Generate timestamp and password
    const timestamp = getTimestamp();
    const password = btoa(`${shortcode}${passkey}${timestamp}`);
    
    // Format phone number
    const formattedPhone = formatPhoneNumber(phoneNumber);
    
    console.log('Timestamp:', timestamp);
    console.log('Password (first 20 chars):', password.substring(0, 20) + '...');
    console.log('Initiating STK Push for:', formattedPhone);

    const stkPayload = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(amount),
      PartyA: formattedPhone,
      PartyB: shortcode,
      PhoneNumber: formattedPhone,
      CallBackURL: callbackUrl,
      AccountReference: accountReference.substring(0, 12),
      TransactionDesc: (transactionDesc || 'Payment').substring(0, 13),
    };

    console.log('STK Push payload:', JSON.stringify(stkPayload, null, 2));

    // Make STK Push request
    const stkResponse = await fetch(
      'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(stkPayload),
      }
    );

    const stkText = await stkResponse.text();
    console.log('STK Push response status:', stkResponse.status);
    console.log('STK Push response:', stkText);

    let stkData;
    try {
      stkData = JSON.parse(stkText);
    } catch {
      stkData = { rawResponse: stkText };
    }

    // Check for success based on ResponseCode
    const isSuccess = stkData.ResponseCode === '0';

    return new Response(
      JSON.stringify({
        success: isSuccess,
        data: stkData,
        timestamp,
        formattedPhone,
      }),
      { 
        status: isSuccess ? 200 : 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('STK Push error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: String(error)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
