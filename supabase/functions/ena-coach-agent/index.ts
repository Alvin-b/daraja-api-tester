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

// Fallback static data in case DB is unavailable
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
  
  // First find the route
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
    // Check for existing schedules on this date
    const { data: schedules } = await supabase
      .from('route_schedules')
      .select('*')
      .eq('route_id', route.id)
      .eq('travel_date', travelDate);
    
    // For each departure time, get or use default availability
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

  return `You are Maji, the friendly AI booking assistant for Ena Coach, a trusted Kenyan bus company since 2002. You help customers:

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
When users ask about seat availability for a specific route and date, provide real-time availability.
IMPORTANT: Always ask for the travel date to check accurate availability.

## Booking Process:
When a user wants to book:
1. Ask for: departure city, destination, travel date, number of passengers
2. Check seat availability for that date and route
3. Show available times with seat counts and confirm their choice
4. Ask for passenger name(s) and phone number for M-Pesa payment
5. Confirm total amount and initiate payment

## Response Guidelines:
- Be warm, professional, and helpful (Kenyan hospitality!)
- Use simple language, avoid jargon
- Confirm details before proceeding with bookings
- Always provide fare in KES
- When asked about availability, mention the number of seats available
- If unsure about something, provide the general contact: ${fallbackContacts.general}

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, conversationHistory = [], availabilityContext } = await req.json();
    
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Fetch routes from database
    const routes = await getRoutesFromDB();
    const systemPrompt = buildSystemPrompt(routes);

    // Build conversation with history and any availability context
    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
    ];

    // If we have availability context from a previous check, include it
    if (availabilityContext) {
      fullMessages.push({
        role: 'system',
        content: `[SEAT AVAILABILITY INFO] ${JSON.stringify(availabilityContext)}`
      });
    }

    fullMessages.push(...messages);

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
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Rate limits exceeded, please try again later.",
          message: "Samahani! We're experiencing high traffic. Please try again in a moment. 🙏"
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: "Service temporarily unavailable.",
          message: "Pole sana! Our booking system is temporarily unavailable. Please call 0709832000 for assistance."
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI Gateway error:', errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices[0].message.content;

    // Check for actions in the response
    let paymentAction = null;
    let availabilityAction = null;
    let availabilityData = null;

    const jsonMatch = assistantMessage.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        
        if (parsed.action === 'initiate_payment') {
          paymentAction = parsed.booking;
          
          // Book the seats when payment is initiated
          if (paymentAction.route_id && paymentAction.date && paymentAction.time) {
            const bookingResult = await bookSeats(
              paymentAction.route_id,
              paymentAction.date,
              paymentAction.time,
              paymentAction.passengers || 1
            );
            console.log('Seat booking result:', bookingResult);
          }
        } else if (parsed.action === 'check_availability') {
          availabilityAction = parsed;
          // Check seat availability
          availabilityData = await checkSeatAvailability(
            parsed.route,
            parsed.date,
            parsed.time
          );
        }
      } catch (e) {
        console.log('No valid action JSON found');
      }
    }

    // Format routes for response
    const formattedRoutes = routes.map(r => ({
      from: r.route_name.split(' - ')[0],
      to: r.route_name.split(' - ')[1],
      fare: r.price,
      departures: r.departure_times,
      stops: r.stops
    }));

    return new Response(JSON.stringify({ 
      message: assistantMessage,
      paymentAction,
      availabilityAction,
      availabilityData,
      routes: formattedRoutes
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
