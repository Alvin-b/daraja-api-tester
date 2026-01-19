import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Route {
  id: string;
  route_name: string;
  departure_times: string[];
  price: number;
  buses_per_day: number;
  total_seats_per_bus: number;
  stops: string[];
}

const fallbackContacts = {
  nairobi: "0709832000",
  kisumu: "0768905242",
  mombasa: "0768716001",
  general: "0709832000"
};

const policies = {
  cancellation: "Free cancellation up to 24 hours before departure. 50% refund for cancellations within 24 hours.",
  luggage: "Each passenger allowed 1 large bag (max 20kg) and 1 carry-on bag.",
  children: "Children under 3 travel free on parent's lap. Ages 3-12 pay 50% fare."
};

// Simple in-memory conversation store (per phone number)
const conversationStore: Map<string, Array<{ role: string; content: string }>> = new Map();

async function getRoutesFromDB(): Promise<Route[]> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const { data, error } = await supabase
    .from('routes')
    .select('*')
    .eq('is_active', true)
    .order('route_name');
  
  if (error) {
    console.error('Error fetching routes:', error);
    return [];
  }
  
  return data || [];
}

async function checkSeatAvailability(
  routeName: string, 
  travelDate: string, 
  departureTime?: string
): Promise<any[]> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const { data: routes, error: routeError } = await supabase
    .from('routes')
    .select('*')
    .or(`route_name.ilike.%${routeName}%`);
  
  if (routeError || !routes?.length) {
    console.error('Route not found:', routeName);
    return [];
  }
  
  const results = [];
  for (const route of routes) {
    const { data: schedules } = await supabase
      .from('route_schedules')
      .select('*')
      .eq('route_id', route.id)
      .eq('travel_date', travelDate);
    
    for (const time of route.departure_times) {
      if (departureTime && time !== departureTime) continue;
      
      const existingSchedule = schedules?.find(s => s.departure_time === time);
      results.push({
        route_id: route.id,
        route_name: route.route_name,
        departure_time: time,
        total_seats: route.total_seats_per_bus,
        available_seats: existingSchedule?.available_seats ?? route.total_seats_per_bus,
        price: route.price,
        stops: route.stops
      });
    }
  }
  
  return results;
}

async function bookSeats(
  routeId: string,
  travelDate: string,
  departureTime: string,
  numSeats: number = 1
): Promise<{ success: boolean; available: number; message: string }> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const { data, error } = await supabase.rpc('book_seats', {
    p_route_id: routeId,
    p_travel_date: travelDate,
    p_departure_time: departureTime,
    p_direction: 'outbound',
    p_num_seats: numSeats
  });
  
  if (error) {
    console.error('Error booking seats:', error);
    return { success: false, available: 0, message: 'Failed to book seats' };
  }
  
  return data?.[0] || { success: false, available: 0, message: 'No response from booking' };
}

function buildSystemPrompt(routes: Route[]): string {
  const routesList = routes.map(r => 
    `- ${r.route_name}: KES ${r.price}, Departures: ${r.departure_times.join(', ')}, Stops: ${r.stops.join(' → ')}`
  ).join('\n');

  return `You are Maji, the friendly AI booking assistant for Ena Coach, a trusted Kenyan bus company since 2002. You help customers via WhatsApp:

1. **Check routes and fares** - Provide accurate pricing and schedules
2. **Book seats** - Guide them through the booking process
3. **Check seat availability** - Tell customers how many seats are available on specific dates
4. **Answer questions** - About services, policies, luggage, etc.

## Available Routes & Fares (in KES):
${routesList}

## Bus Types:
- Standard: Comfortable seats, AC, basic amenities (base price)
- VIP: Extra legroom, power outlets, WiFi, refreshments (+30% of base fare)

## Key Policies:
- Cancellation: ${policies.cancellation}
- Luggage: ${policies.luggage}
- Children: ${policies.children}

## Contact Numbers:
- Nairobi: ${fallbackContacts.nairobi}
- Kisumu: ${fallbackContacts.kisumu}
- Mombasa: ${fallbackContacts.mombasa}

## Seat Availability:
When users ask about seat availability, you can check real-time availability.
IMPORTANT: Always ask for the travel date to check accurate availability.

## Booking Process:
When a user wants to book:
1. Ask for: departure city, destination, travel date, number of passengers
2. Check seat availability for that date and route
3. Show available times with seat counts and confirm their choice
4. Ask for passenger name for M-Pesa payment (you already have their phone number from WhatsApp)
5. Confirm total amount and initiate payment

## Response Guidelines:
- Be warm, professional, and helpful (Kenyan hospitality!)
- Use simple language, avoid jargon
- Confirm details before proceeding with bookings
- Always provide fare in KES
- When asked about availability, mention the number of seats available
- If unsure about something, provide the general contact: ${fallbackContacts.general}
- Keep responses concise for WhatsApp (under 500 characters when possible)
- Use emojis sparingly for warmth 🚌

## Actions:
When you need to check seat availability, respond with:
\`\`\`json
{"action": "check_availability", "route": "route name", "date": "YYYY-MM-DD", "time": "HH:MM AM/PM (optional)"}
\`\`\`

When a user is ready to pay, respond with a JSON block containing booking details:
\`\`\`json
{"action": "initiate_payment", "booking": {"route_id": "uuid", "from": "city", "to": "city", "date": "YYYY-MM-DD", "time": "HH:MM AM/PM", "passengers": 1, "busType": "Standard", "totalFare": 1600, "passengerName": "name", "phoneNumber": "254..."}}
\`\`\`

Start conversations warmly: "Karibu! 🚌 I'm Maji, your Ena Coach booking assistant. Where would you like to travel today?"`;
}

async function sendWhatsAppMessage(phoneNumber: string, message: string): Promise<void> {
  const evolutionUrl = Deno.env.get('EVOLUTION_API_URL');
  const evolutionKey = Deno.env.get('EVOLUTION_API_KEY');
  const instanceName = Deno.env.get('EVOLUTION_INSTANCE_NAME');

  if (!evolutionUrl || !evolutionKey || !instanceName) {
    console.error('Evolution API credentials not configured');
    throw new Error('Evolution API not configured');
  }

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

async function processWithAI(
  userMessage: string, 
  phoneNumber: string,
  routes: Route[],
  availabilityContext?: any
): Promise<{ message: string; paymentAction?: any; availabilityAction?: any }> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) {
    throw new Error('LOVABLE_API_KEY not configured');
  }

  let conversationHistory = conversationStore.get(phoneNumber) || [];
  conversationHistory.push({ role: 'user', content: userMessage });
  
  if (conversationHistory.length > 20) {
    conversationHistory = conversationHistory.slice(-20);
  }

  const systemPrompt = buildSystemPrompt(routes);
  const fullMessages: any[] = [
    { role: 'system', content: systemPrompt },
  ];

  // Add availability context if available
  if (availabilityContext) {
    fullMessages.push({
      role: 'system',
      content: `[SEAT AVAILABILITY INFO] ${JSON.stringify(availabilityContext)}`
    });
  }

  fullMessages.push(...conversationHistory);

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

  conversationHistory.push({ role: 'assistant', content: assistantMessage });
  conversationStore.set(phoneNumber, conversationHistory);

  let paymentAction = null;
  let availabilityAction = null;
  
  const jsonMatch = assistantMessage.match(/```json\n([\s\S]*?)\n```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      if (parsed.action === 'initiate_payment') {
        paymentAction = parsed.booking;
        if (!paymentAction.phoneNumber) {
          paymentAction.phoneNumber = phoneNumber;
        }
      } else if (parsed.action === 'check_availability') {
        availabilityAction = parsed;
      }
    } catch (e) {
      console.log('No valid action JSON found');
    }
  }

  let cleanMessage = assistantMessage.replace(/```json\n[\s\S]*?\n```/g, '').trim();
  
  return { message: cleanMessage, paymentAction, availabilityAction };
}

async function initiateSTKPush(booking: any): Promise<void> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  console.log('Initiating STK Push for booking:', booking);
  
  // Book seats first
  if (booking.route_id && booking.date && booking.time) {
    const bookingResult = await bookSeats(
      booking.route_id,
      booking.date,
      booking.time,
      booking.passengers || 1
    );
    console.log('Seat booking result:', bookingResult);
    
    if (!bookingResult.success) {
      throw new Error(`No seats available: ${bookingResult.message}`);
    }
  }
  
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log('Received Evolution webhook payload:', JSON.stringify(payload));

    const eventType = payload.event;
    
    if (eventType === 'messages.upsert') {
      const messageData = payload.data;
      
      if (messageData.key?.fromMe) {
        console.log('Skipping our own message');
        return new Response(JSON.stringify({ status: 'skipped' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const remoteJid = messageData.key?.remoteJid || '';
      const phoneNumber = remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');
      
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

      // Fetch routes from database
      const routes = await getRoutesFromDB();

      // Process with AI
      let { message: responseMessage, paymentAction, availabilityAction } = await processWithAI(
        userMessage, 
        phoneNumber,
        routes
      );

      // If availability check is requested, get the data and re-process
      if (availabilityAction) {
        const availabilityData = await checkSeatAvailability(
          availabilityAction.route,
          availabilityAction.date,
          availabilityAction.time
        );
        
        // Format availability for user
        if (availabilityData.length > 0) {
          const availabilityInfo = availabilityData.map(a => 
            `${a.departure_time}: ${a.available_seats}/${a.total_seats} seats available`
          ).join('\n');
          
          responseMessage += `\n\n📊 Seat availability for ${availabilityAction.route} on ${availabilityAction.date}:\n${availabilityInfo}`;
        } else {
          responseMessage += `\n\nSorry, I couldn't find availability info for that route. Please call ${fallbackContacts.general} for assistance.`;
        }
      }

      // Send response via WhatsApp
      await sendWhatsAppMessage(phoneNumber, responseMessage);

      // If there's a payment action, initiate STK Push
      if (paymentAction) {
        try {
          await initiateSTKPush(paymentAction);
          await sendWhatsAppMessage(
            phoneNumber, 
            `📱 Please check your phone for the M-Pesa payment prompt of KES ${paymentAction.totalFare}. Enter your PIN to complete the booking.`
          );
        } catch (error) {
          console.error('STK Push failed:', error);
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          
          if (errorMsg.includes('No seats available')) {
            await sendWhatsAppMessage(
              phoneNumber,
              `😔 Sorry, those seats are no longer available. Would you like to check another time or date?`
            );
          } else {
            await sendWhatsAppMessage(
              phoneNumber,
              `❌ Sorry, there was an issue initiating payment. Please try again or call us at ${fallbackContacts.general} for assistance.`
            );
          }
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
