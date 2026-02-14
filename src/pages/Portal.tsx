import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Wifi, Phone, Loader2, CheckCircle, AlertCircle, Clock, KeyRound } from "lucide-react";

interface WifiPackage {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
  speed_limit: string;
}

type PortalStep = 'packages' | 'login' | 'phone' | 'processing' | 'success' | 'error';

const Portal = () => {
  const [packages, setPackages] = useState<WifiPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<WifiPackage | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loginCode, setLoginCode] = useState("");
  const [step, setStep] = useState<PortalStep>('packages');
  const [voucherCode, setVoucherCode] = useState("");
  const [checkoutRequestId, setCheckoutRequestId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pollCount, setPollCount] = useState(0);

  useEffect(() => {
    supabase
      .from('wifi_packages')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true })
      .then(({ data }) => {
        if (data) setPackages(data);
      });
  }, []);

  const handleLoginCode = async () => {
    if (!loginCode.trim()) return;
    setLoading(true);
    setError("");

    try {
      const { data } = await supabase.functions.invoke('wifi-radius-auth', {
        body: { username: loginCode.trim() },
      });

      if (data?.reply === 'Access-Accept') {
        setVoucherCode(data.voucher_code);
        setStep('success');
      } else {
        setError(data?.message || 'Invalid code');
      }
    } catch {
      setError('Failed to validate code');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!selectedPackage || !phoneNumber.trim()) return;
    setLoading(true);
    setError("");

    try {
      const { data, error: fnError } = await supabase.functions.invoke('wifi-payment', {
        body: { phoneNumber: phoneNumber.trim(), packageId: selectedPackage.id },
      });

      if (fnError) throw fnError;

      if (data?.success) {
        setCheckoutRequestId(data.checkoutRequestId);
        setVoucherCode(data.voucherCode);
        setStep('processing');
        setPollCount(0);
      } else {
        setError(data?.error || 'Payment initiation failed');
      }
    } catch (e: any) {
      setError(e.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  // Poll for payment status
  useEffect(() => {
    if (step !== 'processing' || !checkoutRequestId) return;

    const interval = setInterval(async () => {
      setPollCount(prev => {
        if (prev >= 12) { // 60 seconds
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });

      try {
        const { data } = await supabase.functions.invoke('wifi-radius-auth', {
          body: { checkoutRequestId },
        });

        // Pass action via query string workaround - use the check-payment action
        const { data: checkData } = await supabase.functions.invoke('wifi-radius-auth?action=check-payment', {
          body: { checkoutRequestId },
        });

        if (checkData?.status === 'paid') {
          clearInterval(interval);
          setVoucherCode(checkData.voucherCode);
          setStep('success');
        }
      } catch {
        // Continue polling
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [step, checkoutRequestId]);

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    if (minutes < 1440) return `${minutes / 60} hrs`;
    return `${minutes / 1440} days`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(220,20%,8%)] to-[hsl(220,20%,14%)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-3">
            <Wifi className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">WiFi Hotspot</h1>
          <p className="text-muted-foreground text-sm mt-1">Select a package to get connected</p>
        </div>

        {/* Login code input */}
        {step === 'packages' && (
          <div className="bg-card border border-border rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <KeyRound className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Have a login code or M-Pesa code?</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter code..."
                value={loginCode}
                onChange={(e) => setLoginCode(e.target.value.toUpperCase())}
                className="flex-1 h-10 rounded-lg border border-border bg-muted px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={handleLoginCode}
                disabled={loading || !loginCode.trim()}
                className="px-4 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Connect'}
              </button>
            </div>
            {error && step === 'packages' && (
              <p className="text-destructive text-xs mt-2">{error}</p>
            )}
          </div>
        )}

        {/* Package selection */}
        {step === 'packages' && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground text-center">Or choose a package:</p>
            {packages.map((pkg) => (
              <button
                key={pkg.id}
                onClick={() => { setSelectedPackage(pkg); setStep('phone'); setError(""); }}
                className="w-full bg-card border border-border rounded-xl p-4 text-left hover:border-primary/50 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-foreground">{pkg.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{formatDuration(pkg.duration_minutes)}</span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">{pkg.speed_limit}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-primary">KES {pkg.price}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Phone number input */}
        {step === 'phone' && selectedPackage && (
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="text-center mb-4">
              <h3 className="font-semibold text-foreground">{selectedPackage.name}</h3>
              <p className="text-primary font-bold text-xl">KES {selectedPackage.price}</p>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Enter M-Pesa phone number</span>
            </div>
            <input
              type="tel"
              placeholder="07XX XXX XXX"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full h-12 rounded-lg border border-border bg-muted px-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-lg mb-4"
            />
            {error && <p className="text-destructive text-xs mb-3">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => { setStep('packages'); setError(""); }}
                className="flex-1 h-12 rounded-lg border border-border text-foreground text-sm font-medium"
              >
                Back
              </button>
              <button
                onClick={handlePayment}
                disabled={loading || !phoneNumber.trim()}
                className="flex-1 h-12 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Pay with M-Pesa'}
              </button>
            </div>
          </div>
        )}

        {/* Processing */}
        {step === 'processing' && (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">Waiting for payment...</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Check your phone for the M-Pesa prompt and enter your PIN
            </p>
            <div className="bg-muted rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Your voucher code will be:</p>
              <p className="text-2xl font-mono font-bold text-primary tracking-wider mt-1">{voucherCode}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Checking status... ({pollCount}/12)
            </p>
          </div>
        )}

        {/* Success */}
        {step === 'success' && (
          <div className="bg-card border border-primary/30 rounded-xl p-8 text-center">
            <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-bold text-foreground mb-2">You're Connected!</h3>
            <p className="text-muted-foreground text-sm mb-4">Use this code to connect to WiFi:</p>
            <div className="bg-muted rounded-lg p-4 mb-4">
              <p className="text-3xl font-mono font-bold text-primary tracking-widest">{voucherCode}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter this code as your username in the WiFi login prompt. No password needed.
            </p>
          </div>
        )}

        {/* Error */}
        {step === 'error' && (
          <div className="bg-card border border-destructive/30 rounded-xl p-8 text-center">
            <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h3 className="text-xl font-bold text-foreground mb-2">Payment Failed</h3>
            <p className="text-muted-foreground text-sm mb-4">{error}</p>
            <button
              onClick={() => { setStep('packages'); setError(""); }}
              className="h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Portal;
