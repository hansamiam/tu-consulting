import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle, Home, Calendar, Mail, MessageCircle, ShieldCheck, Loader2, AlertTriangle, ArrowRight } from "lucide-react";
import Navigation from "@/components/Navigation";
import { supabase } from "@/integrations/supabase/client";
import PreCallIntake from "@/components/PreCallIntake";

interface VerifyResult {
  paid: boolean;
  status: string;
  amount_usd: number;
  currency: string;
  customer_email?: string;
  product_name?: string | null;
  is_consultation: boolean;
}

export default function ThankYou() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const legacyType = searchParams.get("type") || "consultation";

  const [result, setResult] = useState<VerifyResult | null>(null);
  const [verifying, setVerifying] = useState(!!sessionId);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [intakeDone, setIntakeDone] = useState(false);

  useEffect(() => {
    document.title = "Payment Confirmed — Top Uni Consulting";

    // Load Calendly
    const script = document.createElement("script");
    script.src = "https://assets.calendly.com/assets/external/widget.js";
    script.async = true;
    document.head.appendChild(script);
    return () => {
      try { document.head.removeChild(script); } catch { /* ignore */ }
    };
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("verify-payment", {
          body: { session_id: sessionId },
        });
        if (cancelled) return;
        if (error) throw error;
        setResult(data as VerifyResult);
      } catch (e) {
        if (cancelled) return;
        setVerifyError(e instanceof Error ? e.message : "Verification failed");
      } finally {
        if (!cancelled) setVerifying(false);
      }
    })();
    return () => { cancelled = true; };
  }, [sessionId]);

  const isConsultation = result?.is_consultation ?? legacyType === "consultation";
  const productLabel = result?.product_name || legacyType;

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary via-primary to-primary-dark">
      <Navigation language="en" />

      <div className="container mx-auto px-4 py-10 md:py-16">
        <div className="max-w-4xl mx-auto">
          {/* Status */}
          <div className="text-center mb-8">
            {verifying ? (
              <>
                <Loader2 className="w-14 h-14 text-gold mx-auto mb-4 animate-spin" />
                <h1 className="text-2xl md:text-3xl font-bold text-gold mb-2">Confirming your payment…</h1>
                <p className="text-primary-foreground/80">Just a few seconds.</p>
              </>
            ) : verifyError ? (
              <>
                <AlertTriangle className="w-14 h-14 text-yellow-400 mx-auto mb-4" />
                <h1 className="text-2xl md:text-4xl font-bold text-gold mb-3">We couldn't verify your payment automatically</h1>
                <p className="text-primary-foreground/90 max-w-2xl mx-auto">
                  Don't worry — if Stripe charged your card, your booking is safe. Email{" "}
                  <a href="mailto:team@topuniconsulting.com" className="underline">team@topuniconsulting.com</a>{" "}
                  with your receipt and we'll confirm within a few hours.
                </p>
              </>
            ) : result?.paid ? (
              <>
                <CheckCircle className="w-16 h-16 md:w-20 md:h-20 text-gold mx-auto mb-4" />
                <h1 className="text-3xl md:text-5xl font-bold text-gold mb-3">You're in. Welcome aboard.</h1>
                <p className="text-base md:text-lg text-primary-foreground/90 max-w-2xl mx-auto">
                  We've charged <strong>${result.amount_usd.toLocaleString()}</strong> for{" "}
                  <strong>{productLabel}</strong>. A receipt is on its way to{" "}
                  <strong>{result.customer_email}</strong>.
                </p>
              </>
            ) : (
              <>
                <AlertTriangle className="w-14 h-14 text-yellow-400 mx-auto mb-4" />
                <h1 className="text-2xl md:text-3xl font-bold text-gold mb-3">Payment is processing</h1>
                <p className="text-primary-foreground/90 max-w-2xl mx-auto">
                  Stripe says your payment is still being confirmed. Refresh this page in a minute, or email{" "}
                  <a href="mailto:team@topuniconsulting.com" className="underline">team@topuniconsulting.com</a>.
                </p>
              </>
            )}
          </div>

          {/* Step 1: Pre-call intake (gates Calendly) */}
          {result?.paid && sessionId && !intakeDone && (
            <PreCallIntake
              sessionId={sessionId}
              email={result?.customer_email}
              onComplete={() => setIntakeDone(true)}
            />
          )}

          {/* Step 2: Schedule (revealed after intake, or immediately if no session to gate on) */}
          {(intakeDone || !result?.paid || !sessionId) && (
            <div className="bg-card text-card-foreground rounded-2xl shadow-2xl p-3 md:p-4 mb-6">
              <div className="flex items-center gap-2 px-3 pt-2 pb-3">
                <span className="bg-accent text-accent-foreground rounded-full h-7 w-7 inline-flex items-center justify-center text-sm font-bold">
                  {result?.paid && sessionId ? "2" : "1"}
                </span>
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-accent" />
                  {isConsultation ? "Pick a time" : "Book your kickoff session"}
                </h2>
              </div>
              <div
                className="calendly-inline-widget"
                data-url="https://calendly.com/topuniconsulting"
                style={{ minWidth: "320px", height: "660px" }}
              />
            </div>
          )}

          {/* Next steps */}
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <div className="bg-gold/10 border border-gold/20 rounded-xl p-5">
              <Mail className="h-5 w-5 text-gold mb-2" />
              <h3 className="font-semibold text-gold mb-1">Check your inbox</h3>
              <p className="text-sm text-primary-foreground/80">Stripe receipt + Calendly confirmation arrive within minutes.</p>
            </div>
            <div className="bg-gold/10 border border-gold/20 rounded-xl p-5">
              <ShieldCheck className="h-5 w-5 text-gold mb-2" />
              <h3 className="font-semibold text-gold mb-1">7-day guarantee</h3>
              <p className="text-sm text-primary-foreground/80">Not satisfied? Email us within 7 days for a full refund.</p>
            </div>
            <div className="bg-gold/10 border border-gold/20 rounded-xl p-5">
              <MessageCircle className="h-5 w-5 text-gold mb-2" />
              <h3 className="font-semibold text-gold mb-1">Need help?</h3>
              <p className="text-sm text-primary-foreground/80">
                <a href="https://wa.me/996556447020" target="_blank" rel="noreferrer" className="underline">WhatsApp us</a>{" "}
                anytime.
              </p>
            </div>
          </div>

          {/* Smart upsell — only for consultation buyers */}
          {result?.paid && isConsultation && (
            <div className="bg-gradient-to-r from-gold/20 to-accent/20 border border-gold/40 rounded-2xl p-6 mb-8">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-[260px]">
                  <p className="text-xs uppercase tracking-wider font-semibold text-gold mb-1">Save 25% if you commit today</p>
                  <h3 className="text-xl font-bold text-gold mb-2">Apply your consultation fee toward a package</h3>
                  <p className="text-sm text-primary-foreground/90">
                    Decide during your call to upgrade and we'll credit the ${result.amount_usd} you just paid toward any consulting package — Starter, Standard, or Premium.
                  </p>
                </div>
                <Link to="/offerings#packages">
                  <Button variant="gold" size="lg">
                    See Packages <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Home */}
          <div className="text-center">
            <Button onClick={() => navigate("/")} variant="outline" className="border-gold text-gold hover:bg-gold hover:text-primary">
              <Home className="w-4 h-4 mr-2" /> Back to Home
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
