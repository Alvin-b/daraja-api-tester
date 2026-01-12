import { useState } from "react";
import { Bus, Calendar, Clock, MapPin, Ticket, Search, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import ETicketModal from "./ETicketModal";
import { getBookingsByPhone, BookingRecord } from "@/lib/bookings";

type Booking = BookingRecord;

const BookingHistory = () => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showTicket, setShowTicket] = useState(false);
  const { toast } = useToast();

  const formatPhoneForSearch = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      return '254' + cleaned.substring(1);
    }
    if (cleaned.startsWith('254')) {
      return cleaned;
    }
    if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
      return '254' + cleaned;
    }
    return cleaned;
  };

  const searchBookings = async () => {
    if (!phoneNumber.trim()) {
      toast({
        title: "Phone Number Required",
        description: "Please enter your phone number to view bookings",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setHasSearched(true);

    try {
      const formattedPhone = formatPhoneForSearch(phoneNumber);
      const { data, error } = await getBookingsByPhone(formattedPhone);

      if (error) throw error;

      setBookings(data || []);
      
      if (!data || data.length === 0) {
        toast({
          title: "No Bookings Found",
          description: "No bookings found for this phone number",
        });
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast({
        title: "Error",
        description: "Failed to fetch bookings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: "secondary", label: "Pending Payment" },
      completed: { variant: "default", label: "Confirmed ✓" },
      failed: { variant: "destructive", label: "Payment Failed" },
      cancelled: { variant: "outline", label: "Cancelled" },
    };

    const config = statusConfig[status] || { variant: "secondary" as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const viewTicket = (booking: Booking) => {
    if (booking.payment_status !== 'completed') {
      toast({
        title: "Ticket Not Available",
        description: "E-ticket is only available after payment is confirmed",
        variant: "destructive",
      });
      return;
    }
    setSelectedBooking(booking);
    setShowTicket(true);
  };

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-orange-500" />
            Find Your Bookings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              placeholder="Enter your phone number (e.g., 0712345678)"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchBookings()}
              className="flex-1"
            />
            <Button 
              onClick={searchBookings} 
              disabled={isLoading}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                "Search"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Section */}
      {hasSearched && (
        <div className="space-y-4">
          {bookings.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Bus className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No bookings found for this phone number</p>
                <p className="text-sm mt-1">Try a different number or make a new booking</p>
              </CardContent>
            </Card>
          ) : (
            bookings.map((booking) => (
              <Card key={booking.id} className="overflow-hidden">
                <div className="bg-gradient-to-r from-orange-500 to-orange-400 text-white px-4 py-2 flex justify-between items-center">
                  <span className="font-mono font-bold">{booking.booking_reference}</span>
                  {getStatusBadge(booking.payment_status)}
                </div>
                <CardContent className="pt-4">
                  {/* Route */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-center">
                      <p className="font-bold">{booking.from_city}</p>
                      <p className="text-xs text-muted-foreground">From</p>
                    </div>
                    <div className="flex-1 px-4">
                      <div className="border-t-2 border-dashed border-orange-300 relative">
                        <Bus className="absolute left-1/2 -translate-x-1/2 -top-2.5 h-5 w-5 text-orange-500 bg-card" />
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="font-bold">{booking.to_city}</p>
                      <p className="text-xs text-muted-foreground">To</p>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{new Date(booking.travel_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{booking.travel_time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{booking.passengers} Passenger(s)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Bus className="h-4 w-4 text-muted-foreground" />
                      <span>{booking.bus_type}</span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div>
                      <span className="text-sm text-muted-foreground">Total Fare</span>
                      <p className="font-bold text-orange-600">KES {booking.fare_amount.toLocaleString()}</p>
                    </div>
                    <Button
                      variant={booking.payment_status === 'completed' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => viewTicket(booking)}
                      disabled={booking.payment_status !== 'completed'}
                    >
                      <Ticket className="h-4 w-4 mr-1" />
                      View E-Ticket
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* E-Ticket Modal */}
      <ETicketModal
        open={showTicket}
        onOpenChange={setShowTicket}
        booking={selectedBooking}
      />
    </div>
  );
};

export default BookingHistory;
