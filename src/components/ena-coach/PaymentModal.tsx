import { Bus, MapPin, Calendar, Clock, Users, CreditCard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface BookingDetails {
  from: string;
  to: string;
  date: string;
  time: string;
  passengers: number;
  busType: string;
  totalFare: number;
  passengerName: string;
  phoneNumber: string;
}

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: BookingDetails | null;
  onConfirm: () => void;
}

const PaymentModal = ({ open, onOpenChange, booking, onConfirm }: PaymentModalProps) => {
  if (!booking) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="bg-orange-100 p-2 rounded-lg">
              <Bus className="h-5 w-5 text-orange-600" />
            </div>
            Confirm Your Booking
          </DialogTitle>
          <DialogDescription>
            Review your trip details before payment
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Route */}
          <div className="bg-orange-50 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="text-center">
                <p className="font-bold text-lg">{booking.from}</p>
                <p className="text-xs text-muted-foreground">Departure</p>
              </div>
              <div className="flex-1 px-4">
                <div className="border-t-2 border-dashed border-orange-300 relative">
                  <Bus className="absolute left-1/2 -translate-x-1/2 -top-2.5 h-5 w-5 text-orange-500 bg-orange-50" />
                </div>
              </div>
              <div className="text-center">
                <p className="font-bold text-lg">{booking.to}</p>
                <p className="text-xs text-muted-foreground">Arrival</p>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{booking.date}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{booking.time}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{booking.passengers} Passenger(s)</span>
            </div>
            <div className="flex items-center gap-2">
              <Bus className="h-4 w-4 text-muted-foreground" />
              <span>{booking.busType}</span>
            </div>
          </div>

          <Separator />

          {/* Passenger Info */}
          <div className="text-sm space-y-1">
            <p><span className="text-muted-foreground">Passenger:</span> {booking.passengerName}</p>
            <p><span className="text-muted-foreground">M-Pesa Number:</span> {booking.phoneNumber}</p>
          </div>

          <Separator />

          {/* Total */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Total Amount</span>
            <span className="text-2xl font-bold text-orange-600">
              KES {booking.totalFare.toLocaleString()}
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600"
              onClick={onConfirm}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Pay with M-Pesa
            </Button>
          </div>

          <p className="text-[10px] text-center text-muted-foreground">
            An STK Push will be sent to your phone. Enter your M-Pesa PIN to complete payment.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentModal;
