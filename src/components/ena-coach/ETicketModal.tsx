import { useRef } from "react";
import { Bus, Calendar, Clock, MapPin, User, Phone, QrCode, Download, Share2, CheckCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

interface Booking {
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
  created_at: string;
}

interface ETicketModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: Booking | null;
}

const ETicketModal = ({ open, onOpenChange, booking }: ETicketModalProps) => {
  const ticketRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  if (!booking) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatPhone = (phone: string) => {
    if (phone.startsWith('254')) {
      return `+${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6)}`;
    }
    return phone;
  };

  const handleShare = async () => {
    const ticketText = `🚌 Ena Coach E-Ticket\n\nBooking Ref: ${booking.booking_reference}\nRoute: ${booking.from_city} → ${booking.to_city}\nDate: ${formatDate(booking.travel_date)}\nTime: ${booking.travel_time}\nPassenger: ${booking.passenger_name}\nFare: KES ${booking.fare_amount.toLocaleString()}\n\nPresent this reference at the counter. Safe travels!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Ena Coach E-Ticket',
          text: ticketText,
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          copyToClipboard(ticketText);
        }
      }
    } else {
      copyToClipboard(ticketText);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to Clipboard",
      description: "E-ticket details have been copied",
    });
  };

  const handleDownload = () => {
    // Create a simple text file for download
    const ticketText = `
═══════════════════════════════════════════
           ENA COACH E-TICKET
═══════════════════════════════════════════

Booking Reference: ${booking.booking_reference}
Status: CONFIRMED ✓

─────────────────────────────────────────────
JOURNEY DETAILS
─────────────────────────────────────────────

From:        ${booking.from_city}
To:          ${booking.to_city}
Date:        ${formatDate(booking.travel_date)}
Time:        ${booking.travel_time}
Bus Type:    ${booking.bus_type}

─────────────────────────────────────────────
PASSENGER INFORMATION
─────────────────────────────────────────────

Name:        ${booking.passenger_name}
Phone:       ${formatPhone(booking.phone_number)}
Passengers:  ${booking.passengers}

─────────────────────────────────────────────
PAYMENT DETAILS
─────────────────────────────────────────────

Total Fare:  KES ${booking.fare_amount.toLocaleString()}
Status:      PAID

═══════════════════════════════════════════

IMPORTANT NOTES:
• Please arrive 30 minutes before departure
• Present this ticket at the boarding counter
• Valid photo ID required for boarding
• Luggage limit: 20kg per passenger

For assistance call: 0709 832 000

Thank you for traveling with Ena Coach!
Safe Journey! 🚌

═══════════════════════════════════════════
    `;

    const blob = new Blob([ticketText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EnaCoach-Ticket-${booking.booking_reference}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Ticket Downloaded",
      description: "Your e-ticket has been downloaded",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <div ref={ticketRef}>
          {/* Ticket Header */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-400 text-white p-4">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                  <Bus className="h-6 w-6" />
                  <span className="text-xl font-bold">Ena Coach</span>
                </div>
                <div className="flex items-center gap-1 bg-green-500 px-2 py-1 rounded-full text-xs">
                  <CheckCircle className="h-3 w-3" />
                  CONFIRMED
                </div>
              </DialogTitle>
            </DialogHeader>
          </div>

          {/* Booking Reference */}
          <div className="bg-orange-50 p-3 text-center border-b border-dashed">
            <p className="text-xs text-muted-foreground">Booking Reference</p>
            <p className="font-mono text-2xl font-bold text-orange-600 tracking-wider">
              {booking.booking_reference}
            </p>
          </div>

          <div className="p-4 space-y-4">
            {/* Route */}
            <div className="flex items-center justify-between">
              <div className="text-center">
                <p className="text-xl font-bold">{booking.from_city}</p>
                <p className="text-xs text-muted-foreground">Departure</p>
              </div>
              <div className="flex-1 px-4">
                <div className="border-t-2 border-dashed border-orange-300 relative">
                  <Bus className="absolute left-1/2 -translate-x-1/2 -top-3 h-6 w-6 text-orange-500 bg-background p-0.5 rounded-full border-2 border-orange-300" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold">{booking.to_city}</p>
                <p className="text-xs text-muted-foreground">Arrival</p>
              </div>
            </div>

            <Separator />

            {/* Journey Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <div className="bg-orange-100 p-2 rounded-lg">
                  <Calendar className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="font-semibold text-sm">{formatDate(booking.travel_date)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-orange-100 p-2 rounded-lg">
                  <Clock className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Time</p>
                  <p className="font-semibold text-sm">{booking.travel_time}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-orange-100 p-2 rounded-lg">
                  <Bus className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Bus Type</p>
                  <p className="font-semibold text-sm">{booking.bus_type}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-orange-100 p-2 rounded-lg">
                  <MapPin className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Seats</p>
                  <p className="font-semibold text-sm">{booking.passengers}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Passenger Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{booking.passenger_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{formatPhone(booking.phone_number)}</span>
              </div>
            </div>

            <Separator />

            {/* Fare */}
            <div className="flex items-center justify-between bg-green-50 -mx-4 px-4 py-3">
              <span className="text-muted-foreground">Total Paid</span>
              <span className="text-2xl font-bold text-green-600">
                KES {booking.fare_amount.toLocaleString()}
              </span>
            </div>

            {/* QR Placeholder */}
            <div className="flex justify-center py-2">
              <div className="bg-gray-100 p-4 rounded-xl flex flex-col items-center">
                <QrCode className="h-16 w-16 text-gray-400" />
                <p className="text-xs text-muted-foreground mt-2">Scan at counter</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button
                className="flex-1 bg-orange-500 hover:bg-orange-600"
                onClick={handleShare}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>

            {/* Footer Notes */}
            <div className="text-[10px] text-center text-muted-foreground space-y-1">
              <p>Please arrive 30 minutes before departure</p>
              <p>Valid photo ID required • Luggage limit: 20kg</p>
              <p className="font-semibold">Help: 0709 832 000</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ETicketModal;
