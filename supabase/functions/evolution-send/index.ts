import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phoneNumber, message, mediaUrl, mediaType } = await req.json();

    if (!phoneNumber || !message) {
      return new Response(JSON.stringify({ error: 'phoneNumber and message are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const evolutionUrl = Deno.env.get('EVOLUTION_API_URL');
    const evolutionKey = Deno.env.get('EVOLUTION_API_KEY');
    const instanceName = Deno.env.get('EVOLUTION_INSTANCE_NAME');

    if (!evolutionUrl || !evolutionKey || !instanceName) {
      console.error('Evolution API credentials not configured');
      return new Response(JSON.stringify({ error: 'Evolution API not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Remove any non-digit characters from phone number
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    
    let response;
    
    if (mediaUrl) {
      // Send media message
      const endpoint = mediaType === 'image' 
        ? 'sendMedia' 
        : mediaType === 'document' 
          ? 'sendDocument' 
          : 'sendMedia';
          
      response = await fetch(`${evolutionUrl}/message/${endpoint}/${instanceName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': evolutionKey,
        },
        body: JSON.stringify({
          number: cleanNumber,
          mediatype: mediaType || 'image',
          media: mediaUrl,
          caption: message,
        }),
      });
    } else {
      // Send text message
      response = await fetch(`${evolutionUrl}/message/sendText/${instanceName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': evolutionKey,
        },
        body: JSON.stringify({
          number: cleanNumber,
          text: message,
        }),
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Evolution API error:', response.status, errorText);
      return new Response(JSON.stringify({ 
        error: 'Failed to send message',
        details: errorText 
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await response.json();
    console.log('Message sent successfully:', result);

    return new Response(JSON.stringify({ 
      success: true,
      messageId: result.key?.id,
      result 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Send message error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
