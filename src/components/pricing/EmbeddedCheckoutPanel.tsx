// Inline Stripe Embedded Checkout, rendered below the price card on
// /pricing when the user clicks "Become a member". Replaces the prior
// redirect-to-Stripe flow that bounced users off-domain — keeps the
// pitch + the payment form on the same screen.
import { useEffect, useRef } from "react";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { X } from "lucide-react";
import { getStripe } from "@/lib/stripeClient";

interface Props {
  /** Stripe Checkout Session client_secret from create-subscription-checkout. */
  clientSecret: string;
  /** Called when the user dismisses the embed (X button). */
  onClose: () => void;
  language?: "en" | "ru";
}

export const EmbeddedCheckoutPanel = ({ clientSecret, onClose, language = "en" }: Props) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const t = (en: string, ru: string) => (language === "ru" ? ru : en);
  const stripe = getStripe();

  // Auto-scroll into view when the panel mounts so the user doesn't have
  // to hunt for it. Stripe sometimes hijacks scroll after iframe init —
  // wait a tick before scrolling.
  useEffect(() => {
    const id = window.setTimeout(() => {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => window.clearTimeout(id);
  }, []);

  if (!stripe) return null;

  return (
    <div ref={ref} className="mt-10 mx-auto max-w-3xl px-5 sm:px-8">
      <div className="rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 sm:px-7 py-4 border-b border-border bg-muted/30">
          <div className="min-w-0">
            <p className="text-[10.5px] uppercase tracking-[0.18em] font-bold text-gold-dark m-0 mb-0.5">
              {t("Checkout", "Оплата")}
            </p>
            <p className="font-heading text-base sm:text-lg font-bold text-foreground tracking-tight m-0 truncate">
              {t("TopUni Membership · Early Access", "TopUni Membership · Ранний доступ")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("Close checkout", "Закрыть оплату")}
            className="shrink-0 ml-3 rounded-full w-8 h-8 inline-flex items-center justify-center text-foreground/55 hover:text-foreground hover:bg-foreground/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <EmbeddedCheckoutProvider stripe={stripe} options={{ clientSecret }}>
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </div>
      <p className="mt-3 text-[11px] text-center text-muted-foreground">
        {t(
          "Payment is processed securely by Stripe. You can cancel anytime.",
          "Оплата проходит через Stripe. Отмена в любой момент.",
        )}
      </p>
    </div>
  );
};
