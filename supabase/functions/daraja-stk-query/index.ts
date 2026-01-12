import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface STKQueryRequest {
  checkoutRequestId: string;
}

async function getAccessToken(): Promise<string> {
  const consumerKey = Deno.env.get('DARAJA_CONSUMER_KEY');
  const consumerSecret = Deno.env.get('DARAJA_CONSUMER_SECRET');
  
  if (!consumerKey || !consumerSecret) {
    throw new Error('Daraja credentials not configured');
  }

  const auth = btoa(`${consumerKey}:${consumerSecret}`);
  
  const response = await fetch(
    'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
    {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
      },
    }
  );

  const responseText = await response.text();
  console.log('OAuth response status:', response.status);

  if (!response.ok) {
    throw new Error(`Failed to get access token: ${response.status} - ${responseText}`);
  }

  const data = JSON.parse(responseText);
  
  if (!data.access_token) {
    throw new Error(`No access token in response: ${responseText}`);
  }
  
  return data.access_token;
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
    const { checkoutRequestId }: STKQueryRequest = await req.json();
    
    console.log('STK Query request received:', { checkoutRequestId });

    if (!checkoutRequestId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: checkoutRequestId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const shortcode = Deno.env.get('DARAJA_SHORTCODE');
    const passkey = Deno.env.get('DARAJA_PASSKEY');

    if (!shortcode || !passkey) {
      return new Response(
        JSON.stringify({ error: 'Daraja configuration incomplete' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = await getAccessToken();
    const timestamp = getTimestamp();
    const password = btoa(`${shortcode}${passkey}${timestamp}`);

    const queryPayload = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    };

    console.log('STK Query payload:', JSON.stringify(queryPayload, null, 2));

    const queryResponse = await fetch(
      'https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(queryPayload),
      }
    );

    const queryText = await queryResponse.text();
    console.log('STK Query response status:', queryResponse.status);
    console.log('STK Query response:', queryText);

    let queryData;
    try {
      queryData = JSON.parse(queryText);
    } catch {
      queryData = { rawResponse: queryText };
    }

    // ResultCode meanings:
    // 0 = Success
    // 1032 = Request cancelled by user
    // 1037 = Timeout waiting for user input
    // 1 = Insufficient funds
    // 2001 = Wrong PIN entered
    const resultCodeMeanings: Record<string, string> = {
      '0': 'Transaction successful',
      '1': 'Insufficient funds',
      '1032': 'Request cancelled by user',
      '1037': 'Timeout - no user response',
      '2001': 'Wrong PIN entered',
      '1025': 'Invalid phone number',
      '1019': 'Transaction expired',
    };

    const resultCode = queryData.ResultCode?.toString();
    const meaning = resultCodeMeanings[resultCode] || 'Unknown result';

    return new Response(
      JSON.stringify({
        success: queryData.ResultCode === '0' || queryData.ResultCode === 0,
        data: queryData,
        resultMeaning: meaning,
        timestamp: new Date().toISOString(),
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('STK Query error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: String(error)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
