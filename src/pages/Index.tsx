import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import STKPushForm from "@/components/STKPushForm";
import APIResponse from "@/components/APIResponse";

interface STKPushData {
  phoneNumber: string;
  amount: number;
  accountReference: string;
  transactionDesc: string;
}

interface APIResponseData {
  success: boolean;
  data: any;
  timestamp?: string;
  formattedPhone?: string;
}

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<APIResponseData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSTKPush = async (data: STKPushData) => {
    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      const { data: result, error: functionError } = await supabase.functions.invoke(
        'daraja-stk-push',
        {
          body: data,
        }
      );

      if (functionError) {
        throw new Error(functionError.message);
      }

      setResponse(result);

      if (result.success) {
        toast({
          title: "STK Push Sent!",
          description: `Check your phone (${result.formattedPhone}) for the payment prompt.`,
        });
      } else {
        toast({
          title: "Request Failed",
          description: result.data?.errorMessage || "The STK Push request was not successful.",
          variant: "destructive",
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Test M-Pesa STK Push
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Send real STK Push requests to the Safaricom Daraja API. 
            Enter the payment details below to initiate a payment prompt on any M-Pesa registered phone.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <STKPushForm onSubmit={handleSTKPush} isLoading={isLoading} />
          <APIResponse response={response} error={error} isLoading={isLoading} />
        </div>

        <footer className="mt-12 text-center">
          <p className="text-xs text-muted-foreground">
            Using Safaricom Daraja API v1 • Production Environment
          </p>
        </footer>
      </main>
    </div>
  );
};

export default Index;
