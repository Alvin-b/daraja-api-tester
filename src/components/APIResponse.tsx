import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, Terminal } from "lucide-react";

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

const APIResponse = ({ response, error, isLoading }: APIResponseProps) => {
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
          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-medium text-foreground">Quick Info</h4>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between rounded-md bg-muted/30 px-3 py-2">
                <span className="text-muted-foreground">Checkout Request ID:</span>
                <span className="font-mono text-foreground">{response.data.CheckoutRequestID}</span>
              </div>
              <div className="flex justify-between rounded-md bg-muted/30 px-3 py-2">
                <span className="text-muted-foreground">Merchant Request ID:</span>
                <span className="font-mono text-foreground">{response.data.MerchantRequestID}</span>
              </div>
              <div className="flex justify-between rounded-md bg-muted/30 px-3 py-2">
                <span className="text-muted-foreground">Response Code:</span>
                <span className="font-mono text-foreground">{response.data.ResponseCode}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default APIResponse;
