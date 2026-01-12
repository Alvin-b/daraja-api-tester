import { supabase } from "@/integrations/supabase/client";

export interface BookingRecord {
  id: string;
  booking_reference: string;
  passenger_name: string;
  phone_number: string;
  from_city: string;
  to_city: string;
  travel_date: string;
  travel_time: string;
  passengers: number;
  bus_type: string;
  fare_amount: number;
  payment_status: string;
  checkout_request_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateBookingInput {
  booking_reference: string;
  passenger_name: string;
  phone_number: string;
  from_city: string;
  to_city: string;
  travel_date: string;
  travel_time: string;
  passengers: number;
  bus_type: string;
  fare_amount: number;
  payment_status: string;
}

// Using raw SQL queries through RPC to avoid TypeScript type issues
// until the types are regenerated
export async function createBooking(input: CreateBookingInput): Promise<{ data: BookingRecord | null; error: Error | null }> {
  try {
    const { data, error } = await (supabase as any)
      .from('bookings')
      .insert(input)
      .select()
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as BookingRecord, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

export async function updateBookingCheckoutId(bookingId: string, checkoutRequestId: string): Promise<{ error: Error | null }> {
  try {
    const { error } = await (supabase as any)
      .from('bookings')
      .update({ checkout_request_id: checkoutRequestId })
      .eq('id', bookingId);

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

export async function updateBookingStatus(bookingId: string, status: string): Promise<{ error: Error | null }> {
  try {
    const { error } = await (supabase as any)
      .from('bookings')
      .update({ payment_status: status })
      .eq('id', bookingId);

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

export async function getBookingsByPhone(phoneNumber: string): Promise<{ data: BookingRecord[] | null; error: Error | null }> {
  try {
    const { data, error } = await (supabase as any)
      .from('bookings')
      .select('*')
      .eq('phone_number', phoneNumber)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as BookingRecord[], error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}
