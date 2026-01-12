import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Smartphone, DollarSign, Send, Loader2 } from "lucide-react";

interface STKPushFormProps {
  onSubmit: (data: {
    phoneNumber: string;
    amount: number;
    accountReference: string;
    transactionDesc: string;
  }) => void;
  isLoading: boolean;
}

const STKPushForm = ({ onSubmit, isLoading }: STKPushFormProps) => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [amount, setAmount] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Auto-generate account reference and description
    const accountRef = `TXN${Date.now().toString().slice(-8)}`;
    onSubmit({
      phoneNumber,
      amount: parseFloat(amount),
      accountReference: accountRef,
      transactionDesc: "Payment",
    });
  };

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl font-semibold">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Send className="h-4 w-4 text-primary" />
          </div>
          STK Push Request
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Initiate an M-Pesa STK Push payment request
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2 text-sm font-medium">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              Phone Number
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="0712345678 or 254712345678"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
              className="font-mono bg-input border-border focus:border-primary focus:ring-primary text-lg h-12"
            />
            <p className="text-xs text-muted-foreground">Enter M-Pesa registered phone number</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount" className="flex items-center gap-2 text-sm font-medium">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              Amount (KES)
            </Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="font-mono bg-input border-border focus:border-primary focus:ring-primary text-lg h-12"
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-5 w-5" />
                Send STK Push
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default STKPushForm;
