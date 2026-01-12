import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Smartphone, DollarSign, FileText, Send, Loader2 } from "lucide-react";

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
  const [accountReference, setAccountReference] = useState("");
  const [transactionDesc, setTransactionDesc] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      phoneNumber,
      amount: parseFloat(amount),
      accountReference,
      transactionDesc: transactionDesc || "Payment",
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
              placeholder="254712345678"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
              className="font-mono bg-input border-border focus:border-primary focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground">Format: 254XXXXXXXXX</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount" className="flex items-center gap-2 text-sm font-medium">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              Amount (KES)
            </Label>
            <Input
              id="amount"
              type="number"
              placeholder="100"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="font-mono bg-input border-border focus:border-primary focus:ring-primary"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference" className="flex items-center gap-2 text-sm font-medium">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Account Reference
            </Label>
            <Input
              id="reference"
              type="text"
              placeholder="INV-001"
              value={accountReference}
              onChange={(e) => setAccountReference(e.target.value)}
              required
              maxLength={12}
              className="font-mono bg-input border-border focus:border-primary focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground">Max 12 characters</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="flex items-center gap-2 text-sm font-medium">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Transaction Description
            </Label>
            <Input
              id="description"
              type="text"
              placeholder="Payment for services"
              value={transactionDesc}
              onChange={(e) => setTransactionDesc(e.target.value)}
              maxLength={20}
              className="font-mono bg-input border-border focus:border-primary focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground">Optional, max 20 characters</p>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
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
