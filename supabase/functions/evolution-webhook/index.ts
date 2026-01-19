import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Ena Coach routes and pricing data
const routesData = {
  routes: [
    { from: "Nairobi", to: "Kisumu", fare: 1600, duration: "6-7 hours", departures: ["6:00 AM", "8:00 AM", "10:00 AM", "2:00 PM", "6:00 PM", "10:00 PM"] },
    { from: "Nairobi", to: "Mombasa", fare: 1800, duration: "8-9 hours", departures: ["7:00 AM", "9:00 AM", "8:00 PM", "10:00 PM"] },
    { from: "Nairobi", to: "Eldoret", fare: 1500, duration: "5-6 hours", departures: ["7:00 AM", "10:00 AM", "2:00 PM", "7:00 PM"] },
    { from: "Nairobi", to: "Kisii", fare: 1400, duration: "5-6 hours", departures: ["6:30 AM", "9:00 AM", "1:00 PM", "6:00 PM"] },
    { from: "Nairobi", to: "Sirare", fare: 1500, duration: "7-8 hours", departures: ["7:00 AM", "8:00 PM"] },
    { from: "Nairobi", to: "Homa Bay", fare: 1700, duration: "7-8 hours", departures: ["7:30 AM", "9:00 PM"] },
    { from: "Nairobi", to: "Busia", fare: 1800, duration: "8-9 hours", departures: ["7:00 AM", "9:00 PM"] },
    { from: "Nairobi", to: "Kakamega", fare: 1600, duration: "6-7 hours", departures: ["6:00 AM", "8:00 AM", "2:00 PM"] },
    { from: "Kisumu", to: "Nairobi", fare: 1600, duration: "6-7 hours", departures: ["6:00 AM", "8:00 AM", "10:00 AM", "2:00 PM", "6:00 PM", "10:00 PM"] },
    { from: "Mombasa", to: "Nairobi", fare: 1800, duration: "8-9 hours", departures: ["7:00 AM", "9:00 AM", "8:00 PM", "10:00 PM"] },
    { from: "Eldoret", to: "Nairobi", fare: 1500, duration: "5-6 hours", departures: ["6:00 AM", "10:00 AM", "2:00 PM", "7:00 PM"] },
  ],
  busTypes: [
    { type: "Standard", description: "Comfortable seats, AC, basic amenities", priceMultiplier: 1.0 },
    { type: "VIP", description: "Extra legroom, power outlets, WiFi, refreshments", priceMultiplier: 1.3 },
  ],
  contacts: {
    nairobi: "0709832000",
    kisumu: "0768905242",
    mombasa: "0768716001",
    general: "0709832000"
  },
  policies: {
    cancellation: "Free cancellation up to 24 hours before departure. 50% refund for cancellations within 24 hours.",
    luggage: "Each passenger allowed 1 large bag (max 20kg) and 1 carry-on bag.",
    children: "Children under 3 travel free on parent's lap. Ages 3-12 pay 50% fare."
  }
};

const systemPrompt = `You are Maji, the friendly AI booking assistant for Ena Coach, a trusted Kenyan bus company since 2002. You help customers via WhatsApp:

1. **Check routes and fares** - Provide accurate pricing and schedules
2. **Book seats** - Guide them through the booking process
3. **Answer questions** - About services, policies, luggage, etc.

## Available Routes & Fares (in KES):
${routesData.routes.map(r => `- ${r.from} to ${r.to}: KES ${r.fare}, Duration: ${r.duration}`).join('\n')}

## Bus Types:
- Standard: Comfortable seats, AC, basic amenities (base price)
- VIP: Extra legroom, power outlets, WiFi, refreshments (+30% of base fare)

## Key Policies:
- Cancellation: Free up to 24 hours before. 50% refund within 24 hours.
- Luggage: 1 large bag (max 20kg) + 1 carry-on per passenger
- Children: Under 3 free on lap, Ages 3-12 pay 50%

## Contact Numbers:
- Nairobi: 0709832000
- Kisumu: 0768905242
- Mombasa: 0768716001

## Booking Process:
When a user wants to book:
1. Ask for: departure city, destination, travel date, number of passengers
2. Show available times and confirm their choice
3. Ask for passenger name for M-Pesa payment (you already have their phone number from WhatsApp)
4. Confirm total amount and initiate payment

## Response Guidelines:
- Be warm, professional, and helpful (Kenyan hospitality!)
- Use simple language, avoid jargon
- Confirm details before proceeding with bookings
- Always provide fare in KES
- If unsure about something, provide the general contact: 0709832000
- Keep responses concise for WhatsApp (under 500 characters when possible)
- Use emojis sparingly for warmth 🚌

When a user is ready to pay, respond with a JSON block containing booking details:
\`\`\`json
{"action": "initiate_payment", "booking": {"from": "city", "to": "city", "date": "YYYY-MM-DD", "time": "HH:MM", "passengers": 1, "busType": "Standard", "totalFare": 1600, "passengerName": "name", "phoneNumber": "254..."}}
\`\`\`

Start conversations warmly: "Karibu! 🚌 I'm Maji, your Ena Coach booking assistant. Where would you like to travel today?"`;

// Simple in-memory conversation store (per phone number)
// In production, you'd want to store this in the database
const conversationStore: Map<string, Array<{ role: string; content: string }>> = new Map();

async function sendWhatsAppMessage(phoneNumber: string, message: string): Promise<void> {
  const evolutionUrl = Deno.env.get('EVOLUTION_API_URL');
  const evolutionKey = Deno.env.get('EVOLUTION_API_KEY');
  const instanceName = Deno.env.get('EVOLUTION_INSTANCE_NAME');

  if (!evolutionUrl || !evolutionKey || !instanceName) {
    console.error('Evolution API credentials not configured');
    throw new Error('Evolution API not configured');
  }

  // Remove any leading '+' and ensure it's just digits
  const cleanNumber = phoneNumber.replace(/\D/g, '');
  
  const response = await fetch(`${evolutionUrl}/message/sendText/${instanceName}`, {
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

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Evolution API error:', response.status, errorText);
    throw new Error(`Failed to send WhatsApp message: ${response.status}`);
  }

  console.log('WhatsApp message sent successfully to:', cleanNumber);
}

async function processWithAI(userMessage: string, phoneNumber: string): Promise<{ message: string; paymentAction?: any }> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) {
    throw new Error('LOVABLE_API_KEY not configured');
  }

  // Get or create conversation history for this phone number
  let conversationHistory = conversationStore.get(phoneNumber) || [];
  
  // Add user message to history
  conversationHistory.push({ role: 'user', content: userMessage });
  
  // Keep only last 20 messages to avoid token limits
  if (conversationHistory.length > 20) {
    conversationHistory = conversationHistory.slice(-20);
  }

  const fullMessages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
  ];

  console.log('Processing message from:', phoneNumber);

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-3-flash-preview',
      messages: fullMessages,
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AI Gateway error:', errorText);
    throw new Error(`AI Gateway error: ${response.status}`);
  }

  const data = await response.json();
  const assistantMessage = data.choices[0].message.content;

  // Add assistant response to history
  conversationHistory.push({ role: 'assistant', content: assistantMessage });
  conversationStore.set(phoneNumber, conversationHistory);

  // Check if the response contains a payment action
  let paymentAction = null;
  const jsonMatch = assistantMessage.match(/```json\n([\s\S]*?)\n```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      if (parsed.action === 'initiate_payment') {
        paymentAction = parsed.booking;
        // Set the phone number from WhatsApp if not provided
        if (!paymentAction.phoneNumber) {
          paymentAction.phoneNumber = phoneNumber;
        }
      }
    } catch (e) {
      console.log('No valid payment JSON found');
    }
  }

  // Clean the message for WhatsApp (remove JSON blocks)
  let cleanMessage = assistantMessage.replace(/```json\n[\s\S]*?\n```/g, '').trim();
  
  return { message: cleanMessage, paymentAction };
}

async function initiateSTKPush(booking: any): Promise<void> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  console.log('Initiating STK Push for booking:', booking);
  
  // Call the existing daraja-stk-push function
  const response = await fetch(`${supabaseUrl}/functions/v1/daraja-stk-push`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({
      phoneNumber: booking.phoneNumber,
      amount: booking.totalFare,
      accountReference: `ENA-${Date.now()}`,
      transactionDesc: `Ena Coach: ${booking.from} to ${booking.to}`,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('STK Push error:', errorText);
    throw new Error('Failed to initiate payment');
  }

  console.log('STK Push initiated successfully');
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log('Received Evolution webhook payload:', JSON.stringify(payload));

    // Evolution API webhook structure for incoming messages
    // The exact structure depends on the event type
    const eventType = payload.event;
    
    // Handle incoming messages
    if (eventType === 'messages.upsert') {
      const messageData = payload.data;
      
      // Skip if it's a message sent by us (not from the user)
      if (messageData.key?.fromMe) {
        console.log('Skipping our own message');
        return new Response(JSON.stringify({ status: 'skipped' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Extract phone number and message text
      const remoteJid = messageData.key?.remoteJid || '';
      const phoneNumber = remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');
      
      // Handle different message types
      let userMessage = '';
      if (messageData.message?.conversation) {
        userMessage = messageData.message.conversation;
      } else if (messageData.message?.extendedTextMessage?.text) {
        userMessage = messageData.message.extendedTextMessage.text;
      } else {
        console.log('Unsupported message type:', messageData.message);
        return new Response(JSON.stringify({ status: 'unsupported_message_type' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`Message from ${phoneNumber}: ${userMessage}`);

      // Process with AI
      const { message: responseMessage, paymentAction } = await processWithAI(userMessage, phoneNumber);

      // Send response via WhatsApp
      await sendWhatsAppMessage(phoneNumber, responseMessage);

      // If there's a payment action, initiate STK Push
      if (paymentAction) {
        try {
          await initiateSTKPush(paymentAction);
          // Send payment notification
          await sendWhatsAppMessage(
            phoneNumber, 
            `📱 Please check your phone for the M-Pesa payment prompt of KES ${paymentAction.totalFare}. Enter your PIN to complete the booking.`
          );
        } catch (error) {
          console.error('STK Push failed:', error);
          await sendWhatsAppMessage(
            phoneNumber,
            `❌ Sorry, there was an issue initiating payment. Please try again or call us at 0709832000 for assistance.`
          );
        }
      }

      return new Response(JSON.stringify({ 
        status: 'processed',
        phoneNumber,
        responseMessage,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle other event types (connection status, etc.)
    console.log('Unhandled event type:', eventType);
    return new Response(JSON.stringify({ status: 'ignored', eventType }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
