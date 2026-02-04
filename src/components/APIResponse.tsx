import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock, Terminal, RefreshCw, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface APIResponseProps {
  response: {
    success: boolean;
    data: any;
    timestamp?: string;
    formattedPhone?: string;
  } | null;
  error: string | null;
  isLoading: boolean;
}

interface StatusResult {
  success: boolean;
  data: {
    ResultCode: string;
    ResultDesc: string;
    CheckoutRequestID?: string;
  };
  resultMeaning?: string;
}

const RESULT_CODE_MEANINGS: Record<string, { label: string; variant: "success" | "warning" | "error" }> = {
  "0": { label: "Payment Successful", variant: "success" },
  "1": { label: "Insufficient Balance", variant: "error" },
  "1032": { label: "Cancelled by User", variant: "warning" },
  "1037": { label: "Timeout - Phone Unreachable", variant: "error" },
  "2001": { label: "Wrong PIN Entered", variant: "error" },
  "4999": { label: "Still Processing", variant: "warning" },
};

const APIResponse = ({ response, error, isLoading }: APIResponseProps) => {
  const [statusResult, setStatusResult] = useState<StatusResult | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  const checkTransactionStatus = async () => {
    if (!response?.data?.CheckoutRequestID) return;
    
    setIsCheckingStatus(true);
    try {
      const { data, error: queryError } = await supabase.functions.invoke('daraja-stk-query', {
        body: { checkoutRequestId: response.data.CheckoutRequestID },
      });
      
      if (queryError) throw queryError;
      setStatusResult(data);
    } catch (err) {
      console.error('Status check error:', err);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const getStatusBadge = () => {
    if (isLoading) {
      return (
        <Badge variant="secondary" className="gap-1">
          <Clock className="h-3 w-3 animate-spin" />
          Processing
        </Badge>
      );
    }
    if (error) {
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          Error
        </Badge>
      );
    }
    if (response?.success) {
      return (
        <Badge className="gap-1 bg-primary text-primary-foreground">
          <CheckCircle2 className="h-3 w-3" />
          Success
        </Badge>
      );
    }
    if (response && !response.success) {
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          Failed
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1 text-muted-foreground">
        <Terminal className="h-3 w-3" />
        Awaiting Request
      </Badge>
    );
  };

  const formatJSON = (obj: any) => {
    return JSON.stringify(obj, null, 2);
  };

  const getResultMeaning = (resultCode: string) => {
    return RESULT_CODE_MEANINGS[resultCode] || { label: `Unknown (${resultCode})`, variant: "warning" as const };
  };

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur h-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xl font-semibold">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
              <Terminal className="h-4 w-4 text-foreground" />
            </div>
            API Response
          </CardTitle>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <pre className="min-h-[300px] max-h-[500px] overflow-auto rounded-lg bg-muted/50 p-4 font-mono text-sm border border-border">
            {isLoading ? (
              <span className="text-muted-foreground animate-pulse">
                Waiting for response...
              </span>
            ) : error ? (
              <span className="text-destructive">{error}</span>
            ) : response ? (
              <code className="text-foreground whitespace-pre-wrap break-words">
                {formatJSON(response)}
              </code>
            ) : (
              <span className="text-muted-foreground">
                {`// Response will appear here after sending a request\n\n{\n  "status": "waiting",\n  "message": "Send an STK Push request to see the response"\n}`}
              </span>
            )}
          </pre>
        </div>

        {response?.data?.CheckoutRequestID && (
          <div className="mt-4 space-y-3">
            <h4 className="text-sm font-medium text-foreground">Quick Info</h4>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between rounded-md bg-muted/30 px-3 py-2">
                <span className="text-muted-foreground">Checkout Request ID:</span>
                <span className="font-mono text-foreground text-xs">{response.data.CheckoutRequestID}</span>
              </div>
              <div className="flex justify-between rounded-md bg-muted/30 px-3 py-2">
                <span className="text-muted-foreground">Merchant Request ID:</span>
                <span className="font-mono text-foreground text-xs">{response.data.MerchantRequestID}</span>
              </div>
              <div className="flex justify-between rounded-md bg-muted/30 px-3 py-2">
                <span className="text-muted-foreground">Response Code:</span>
                <span className="font-mono text-foreground">{response.data.ResponseCode}</span>
              </div>
            </div>

            {/* Status Checker */}
            <div className="pt-2 border-t border-border">
              <Button
                onClick={checkTransactionStatus}
                disabled={isCheckingStatus}
                variant="outline"
                className="w-full"
              >
                {isCheckingStatus ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Checking Status...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Check Payment Status
                  </>
                )}
              </Button>

              {statusResult && (
                <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    {statusResult.data.ResultCode === "0" ? (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    ) : statusResult.data.ResultCode === "4999" ? (
                      <Clock className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    )}
                    <span className="font-medium">
                      {getResultMeaning(statusResult.data.ResultCode).label}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {statusResult.data.ResultDesc}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Result Code: {statusResult.data.ResultCode}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default APIResponse;
