import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

const systemPrompt = `You are Maji, the friendly AI booking assistant for Ena Coach, a trusted Kenyan bus company since 2002. You help customers:

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
3. Ask for passenger name(s) and phone number for M-Pesa payment
4. Confirm total amount and initiate payment

## Response Guidelines:
- Be warm, professional, and helpful (Kenyan hospitality!)
- Use simple language, avoid jargon
- Confirm details before proceeding with bookings
- Always provide fare in KES
- If unsure about something, provide the general contact: 0709832000

When a user is ready to pay, respond with a JSON block containing booking details:
\`\`\`json
{"action": "initiate_payment", "booking": {"from": "city", "to": "city", "date": "YYYY-MM-DD", "time": "HH:MM", "passengers": 1, "busType": "Standard", "totalFare": 1600, "passengerName": "name", "phoneNumber": "254..."}}
\`\`\`

Start conversations warmly: "Karibu! 🚌 I'm Maji, your Ena Coach booking assistant. Where would you like to travel today?"`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, conversationHistory = [] } = await req.json();
    
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Build conversation with history
    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      ...messages
    ];

    console.log('Sending request to Lovable AI Gateway...');
    
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

    // Check if the response contains a payment action
    let paymentAction = null;
    const jsonMatch = assistantMessage.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.action === 'initiate_payment') {
          paymentAction = parsed.booking;
        }
      } catch (e) {
        console.log('No valid payment JSON found');
      }
    }

    return new Response(JSON.stringify({ 
      message: assistantMessage,
      paymentAction,
      routes: routesData.routes 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ena-coach-agent:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      error: errorMessage,
      message: "Pole sana! I'm having trouble right now. Please try again or call us at 0709832000 for assistance."
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
