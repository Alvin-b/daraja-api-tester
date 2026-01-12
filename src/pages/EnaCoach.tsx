import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Ticket } from "lucide-react";
import ChatHeader from "@/components/ena-coach/ChatHeader";
import ChatMessage from "@/components/ena-coach/ChatMessage";
import ChatInput from "@/components/ena-coach/ChatInput";
import PaymentModal from "@/components/ena-coach/PaymentModal";
import QuickActions from "@/components/ena-coach/QuickActions";
import BookingHistory from "@/components/ena-coach/BookingHistory";
import { createBooking, updateBookingCheckoutId, updateBookingStatus } from "@/lib/bookings";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

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

const EnaCoach = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Karibu! 🚌 I'm Maji, your Ena Coach booking assistant. Where would you like to travel today?",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const { data, error } = await supabase.functions.invoke('ena-coach-agent', {
        body: {
          messages: [{ role: 'user', content: messageText }],
          conversationHistory
        },
      });

      if (error) throw error;

      let displayMessage = data.message;
      displayMessage = displayMessage.replace(/```json\n[\s\S]*?\n```/g, '').trim();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: displayMessage,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (data.paymentAction) {
        setBookingDetails(data.paymentAction);
        setShowPayment(true);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Connection Error",
        description: "Unable to reach Maji. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateBookingReference = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let ref = 'ENA';
    for (let i = 0; i < 6; i++) {
      ref += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return ref;
  };

  const formatPhoneNumber = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) return '254' + cleaned.substring(1);
    if (cleaned.startsWith('+254')) return cleaned.substring(1);
    if (cleaned.startsWith('254')) return cleaned;
    if (cleaned.startsWith('7') || cleaned.startsWith('1')) return '254' + cleaned;
    return cleaned;
  };

  const handlePayment = async () => {
    if (!bookingDetails) return;

    const bookingRef = generateBookingReference();
    const formattedPhone = formatPhoneNumber(bookingDetails.phoneNumber);

    try {
      const { data: bookingRecord, error: bookingError } = await createBooking({
        booking_reference: bookingRef,
        passenger_name: bookingDetails.passengerName,
        phone_number: formattedPhone,
        from_city: bookingDetails.from,
        to_city: bookingDetails.to,
        travel_date: bookingDetails.date,
        travel_time: bookingDetails.time,
        passengers: bookingDetails.passengers,
        bus_type: bookingDetails.busType,
        fare_amount: bookingDetails.totalFare,
        payment_status: 'pending',
      });

      if (bookingError || !bookingRecord) {
        throw new Error('Failed to create booking record');
      }

      const { data, error } = await supabase.functions.invoke('daraja-stk-push', {
        body: {
          phoneNumber: bookingDetails.phoneNumber,
          amount: bookingDetails.totalFare,
          accountReference: bookingRef,
          transactionDesc: `Ena Coach ${bookingDetails.from} to ${bookingDetails.to}`,
          bookingId: bookingRecord.id,
        },
      });

      if (error) throw error;

      if (data.success) {
        await updateBookingCheckoutId(bookingRecord.id, data.data?.CheckoutRequestID);

        toast({
          title: "Payment Initiated! 📱",
          description: `Check your phone (${data.formattedPhone}) for the M-Pesa prompt.`,
        });
        setShowPayment(false);
        
        const confirmMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `✅ Payment request sent to ${data.formattedPhone}!\n\n📋 **Booking Reference: ${bookingRef}**\n\nPlease enter your M-Pesa PIN to complete the payment of KES ${bookingDetails.totalFare.toLocaleString()} for your ${bookingDetails.from} to ${bookingDetails.to} trip on ${bookingDetails.date} at ${bookingDetails.time}.\n\nOnce payment is confirmed, you can view your e-ticket in the "My Bookings" tab. Asante sana for choosing Ena Coach! 🚌`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, confirmMessage]);
      } else {
        await updateBookingStatus(bookingRecord.id, 'failed');
        throw new Error(data.data?.errorMessage || 'Payment request failed');
      }

    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Error",
        description: error instanceof Error ? error.message : "Failed to initiate payment",
        variant: "destructive",
      });
    }
  };

  const handleQuickAction = (action: string) => {
    sendMessage(action);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-background to-green-50 flex flex-col">
      <ChatHeader />
      
      <main className="flex-1 container mx-auto px-4 py-4 max-w-2xl flex flex-col overflow-hidden">
        <Tabs defaultValue="chat" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Chat with Maji
            </TabsTrigger>
            <TabsTrigger value="bookings" className="flex items-center gap-2">
              <Ticket className="h-4 w-4" />
              My Bookings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden mt-0">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto space-y-4 pb-4">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3 max-w-[85%]">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-sm text-muted-foreground">Maji is typing...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions */}
            {messages.length <= 2 && (
              <QuickActions onAction={handleQuickAction} />
            )}

            {/* Input Area */}
            <ChatInput
              value={input}
              onChange={setInput}
              onSend={() => sendMessage(input)}
              isLoading={isLoading}
            />
          </TabsContent>

          <TabsContent value="bookings" className="flex-1 overflow-y-auto mt-0">
            <BookingHistory />
          </TabsContent>
        </Tabs>
      </main>

      {/* Payment Modal */}
      <PaymentModal
        open={showPayment}
        onOpenChange={setShowPayment}
        booking={bookingDetails}
        onConfirm={handlePayment}
      />
    </div>
  );
};

export default EnaCoach;
