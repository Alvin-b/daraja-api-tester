-- Fix function search paths for security
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_or_create_schedule(
  p_route_id UUID,
  p_travel_date DATE,
  p_departure_time TEXT,
  p_direction TEXT DEFAULT 'outbound'
)
RETURNS public.route_schedules AS $$
DECLARE
  v_schedule public.route_schedules;
  v_total_seats INTEGER;
BEGIN
  SELECT * INTO v_schedule
  FROM public.route_schedules
  WHERE route_id = p_route_id
    AND travel_date = p_travel_date
    AND departure_time = p_departure_time
    AND direction = p_direction;
  
  IF NOT FOUND THEN
    SELECT total_seats_per_bus INTO v_total_seats
    FROM public.routes WHERE id = p_route_id;
    
    INSERT INTO public.route_schedules (route_id, travel_date, departure_time, direction, total_seats, available_seats)
    VALUES (p_route_id, p_travel_date, p_departure_time, p_direction, v_total_seats, v_total_seats)
    RETURNING * INTO v_schedule;
  END IF;
  
  RETURN v_schedule;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.book_seats(
  p_route_id UUID,
  p_travel_date DATE,
  p_departure_time TEXT,
  p_direction TEXT DEFAULT 'outbound',
  p_num_seats INTEGER DEFAULT 1
)
RETURNS TABLE(success BOOLEAN, available INTEGER, message TEXT) AS $$
DECLARE
  v_schedule public.route_schedules;
BEGIN
  SELECT * INTO v_schedule FROM public.get_or_create_schedule(p_route_id, p_travel_date, p_departure_time, p_direction);
  
  IF v_schedule.available_seats < p_num_seats THEN
    RETURN QUERY SELECT false, v_schedule.available_seats, 'Not enough seats available'::TEXT;
    RETURN;
  END IF;
  
  UPDATE public.route_schedules
  SET available_seats = available_seats - p_num_seats
  WHERE id = v_schedule.id
  RETURNING available_seats INTO v_schedule.available_seats;
  
  RETURN QUERY SELECT true, v_schedule.available_seats, 'Seats booked successfully'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.check_availability(
  p_route_name TEXT,
  p_travel_date DATE,
  p_departure_time TEXT DEFAULT NULL,
  p_direction TEXT DEFAULT 'outbound'
)
RETURNS TABLE(
  route_id UUID,
  route_name TEXT,
  departure_time TEXT,
  direction TEXT,
  total_seats INTEGER,
  available_seats INTEGER,
  price INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id as route_id,
    r.route_name,
    COALESCE(rs.departure_time, unnest(r.departure_times)) as departure_time,
    COALESCE(rs.direction, p_direction) as direction,
    COALESCE(rs.total_seats, r.total_seats_per_bus) as total_seats,
    COALESCE(rs.available_seats, r.total_seats_per_bus) as available_seats,
    r.price
  FROM public.routes r
  LEFT JOIN public.route_schedules rs ON rs.route_id = r.id 
    AND rs.travel_date = p_travel_date 
    AND rs.direction = p_direction
    AND (p_departure_time IS NULL OR rs.departure_time = p_departure_time)
  WHERE r.route_name ILIKE '%' || p_route_name || '%'
    OR p_route_name ILIKE '%' || r.route_name || '%'
  ORDER BY r.route_name, departure_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop overly permissive policies and replace with service-role only
DROP POLICY IF EXISTS "Service role can manage routes" ON public.routes;
DROP POLICY IF EXISTS "Service role can manage route schedules" ON public.route_schedules;

-- Routes management only via service role (edge functions)
CREATE POLICY "Authenticated users can view routes" 
ON public.routes 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view schedules" 
ON public.route_schedules 
FOR SELECT 
TO authenticated
USING (true);