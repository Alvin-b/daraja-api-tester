import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface QueryResult {
  success: boolean;
  data: any;
  resultMeaning: string;
  timestamp: string;
}

const TransactionQuery = () => {
  const [checkoutRequestId, setCheckoutRequestId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleQuery = async () => {
    if (!checkoutRequestId.trim()) return;
    
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke(
        'daraja-stk-query',
        {
          body: { checkoutRequestId: checkoutRequestId.trim() },
        }
      );

      if (functionError) {
        throw new Error(functionError.message);
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Query failed");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = () => {
    if (!result) return null;
    
    const resultCode = result.data?.ResultCode?.toString();
    
    if (resultCode === '0') {
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    } else if (resultCode === '1032' || resultCode === '1037' || resultCode === '1019') {
      return <Clock className="h-5 w-5 text-yellow-500" />;
    } else if (resultCode === '2002') {
      return <AlertTriangle className="h-5 w-5 text-orange-500" />;
    } else {
      return <XCircle className="h-5 w-5 text-destructive" />;
    }
  };

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
            <Search className="h-4 w-4 text-foreground" />
          </div>
          Query Transaction Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="checkoutId">Checkout Request ID</Label>
          <div className="flex gap-2">
            <Input
              id="checkoutId"
              placeholder="ws_CO_..."
              value={checkoutRequestId}
              onChange={(e) => setCheckoutRequestId(e.target.value)}
              className="font-mono text-sm"
            />
            <Button 
              onClick={handleQuery} 
              disabled={isLoading || !checkoutRequestId.trim()}
              size="default"
            >
              {isLoading ? "Querying..." : "Query"}
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="text-sm text-destructive">{error}</span>
          </div>
        )}

        {result && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className="font-medium">{result.resultMeaning}</span>
              <Badge variant={result.success ? "default" : "secondary"}>
                Code: {result.data?.ResultCode}
              </Badge>
            </div>
            
            <div className="rounded-lg bg-muted/50 p-3 border border-border">
              <pre className="text-xs font-mono overflow-auto whitespace-pre-wrap">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </div>

            {result.data?.ResultDesc && (
              <p className="text-sm text-muted-foreground">
                <strong>Description:</strong> {result.data.ResultDesc}
              </p>
            )}
          </div>
        )}

        <div className="text-xs text-muted-foreground bg-muted/30 rounded p-2">
          <strong>Debug tip:</strong> Copy the CheckoutRequestID from a successful STK Push response and paste it here to check if the payment was completed.
        </div>
      </CardContent>
    </Card>
  );
};

export default TransactionQuery;
