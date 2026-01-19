-- Create routes table for static route information
CREATE TABLE public.routes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  route_name TEXT NOT NULL UNIQUE,
  departure_times TEXT[] NOT NULL,
  price INTEGER NOT NULL,
  buses_per_day INTEGER NOT NULL DEFAULT 1,
  total_seats_per_bus INTEGER NOT NULL DEFAULT 45,
  stops TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create route_schedules table for daily seat availability
CREATE TABLE public.route_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  route_id UUID NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  travel_date DATE NOT NULL,
  departure_time TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('outbound', 'return')),
  total_seats INTEGER NOT NULL DEFAULT 45,
  available_seats INTEGER NOT NULL DEFAULT 45,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(route_id, travel_date, departure_time, direction)
);

-- Enable RLS
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_schedules ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (routes are public info)
CREATE POLICY "Routes are viewable by everyone" 
ON public.routes 
FOR SELECT 
USING (true);

CREATE POLICY "Route schedules are viewable by everyone" 
ON public.route_schedules 
FOR SELECT 
USING (true);

-- Service role can manage routes and schedules
CREATE POLICY "Service role can manage routes" 
ON public.routes 
FOR ALL 
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role can manage route schedules" 
ON public.route_schedules 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_routes_route_name ON public.routes(route_name);
CREATE INDEX idx_route_schedules_route_date ON public.route_schedules(route_id, travel_date);
CREATE INDEX idx_route_schedules_date ON public.route_schedules(travel_date);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_routes_updated_at
BEFORE UPDATE ON public.routes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_route_schedules_updated_at
BEFORE UPDATE ON public.route_schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to get or create schedule for a route/date/time
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
  -- Try to get existing schedule
  SELECT * INTO v_schedule
  FROM public.route_schedules
  WHERE route_id = p_route_id
    AND travel_date = p_travel_date
    AND departure_time = p_departure_time
    AND direction = p_direction;
  
  -- If not found, create it
  IF NOT FOUND THEN
    SELECT total_seats_per_bus INTO v_total_seats
    FROM public.routes WHERE id = p_route_id;
    
    INSERT INTO public.route_schedules (route_id, travel_date, departure_time, direction, total_seats, available_seats)
    VALUES (p_route_id, p_travel_date, p_departure_time, p_direction, v_total_seats, v_total_seats)
    RETURNING * INTO v_schedule;
  END IF;
  
  RETURN v_schedule;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to book seats (decrement available seats)
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
  -- Get or create the schedule
  SELECT * INTO v_schedule FROM public.get_or_create_schedule(p_route_id, p_travel_date, p_departure_time, p_direction);
  
  -- Check if enough seats available
  IF v_schedule.available_seats < p_num_seats THEN
    RETURN QUERY SELECT false, v_schedule.available_seats, 'Not enough seats available'::TEXT;
    RETURN;
  END IF;
  
  -- Update available seats
  UPDATE public.route_schedules
  SET available_seats = available_seats - p_num_seats
  WHERE id = v_schedule.id
  RETURNING available_seats INTO v_schedule.available_seats;
  
  RETURN QUERY SELECT true, v_schedule.available_seats, 'Seats booked successfully'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check seat availability
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
$$ LANGUAGE plpgsql SECURITY DEFINER;