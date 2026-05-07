import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Lock, Loader2, ShieldCheck, Sparkles, Clock, CheckCircle2, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { trackPaymentFunnel } from "@/utils/analytics";
import { supabase } from "@/integrations/supabase/client";
import { ExitIntentRecovery } from "@/components/ExitIntentRecovery";

// Map a display name → server catalog key. The server is the source of truth
// for actual prices, so we never trust the client number.
const PRODUCT_KEY_MAP: Record<string, string> = {
  "Starter Package": "starter",
  "Standard Package": "standard",
  "Premium Package": "premium",
  "Strategy Consultation": "strategy",
};

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consultationType: string; // display name e.g. "Standard Package"
  price: string;            // display string e.g. "$690" — for UI only
  language: "en" | "ru";
  isConsultation: boolean;
  productKey?: string;      // optional override; otherwise mapped from name
}

const STORAGE_KEY = "tu_payment_dialog_state_v2";

export const PaymentDialog = ({
  open,
  onOpenChange,
  consultationType,
  price,
  language,
  isConsultation,
  productKey,
}: PaymentDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; pct: number } | null>(null);
  const [promoError, setPromoError] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [contactEmail, setContactEmail] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [showExitIntent, setShowExitIntent] = useState(false);
  const { toast } = useToast();
  const openedRef = useRef(false);

  const resolvedKey = useMemo(
    () => productKey || PRODUCT_KEY_MAP[consultationType] || "",
    [productKey, consultationType],
  );

  // Restore on mount so accidental refresh doesn't kill the cart.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s.promoCode) setPromoCode(s.promoCode);
        if (s.appliedPromo) setAppliedPromo(s.appliedPromo);
        if (s.termsAccepted) setTermsAccepted(s.termsAccepted);
        if (s.contactEmail) setContactEmail(s.contactEmail);
        if (s.contactName) setContactName(s.contactName);
        if (s.contactPhone) setContactPhone(s.contactPhone);
      }
    } catch {/* ignore */}
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ promoCode, appliedPromo, termsAccepted, contactEmail, contactName, contactPhone }),
      );
    } catch {/* ignore */}
  }, [promoCode, appliedPromo, termsAccepted, contactEmail, contactName, contactPhone]);

  useEffect(() => {
    if (open && !openedRef.current) {
      openedRef.current = true;
      trackPaymentFunnel("dialog_opened", { type: consultationType, price, is_consultation: isConsultation });
    } else if (!open && openedRef.current) {
      openedRef.current = false;
      trackPaymentFunnel("dialog_closed", {
        had_promo: !!appliedPromo,
        accepted_terms: termsAccepted,
        had_email: !!contactEmail.trim(),
      });
    }
  }, [open, consultationType, price, isConsultation, appliedPromo, termsAccepted, contactEmail]);

  const langSuffix = language === "ru" ? "/ru" : "";

  const t = {
    en: {
      title: "Secure Checkout",
      subtitle: "Powered by Stripe — encrypted, PCI-compliant card payment",
      orderSummary: "Order Summary",
      promoCode: "Promo code",
      promoPlaceholder: "Enter code (e.g. LAUNCH30)",
      apply: "Apply",
      promoApplied: "Promo applied",
      promoInvalid: "Invalid or non-applicable promo code",
      subtotal: "Subtotal",
      discount: "Discount",
      total: "Total due today",
      yourInfo: "Your contact info",
      email: "Email *",
      fullName: "Full name *",
      phone: "Phone / WhatsApp (optional)",
      checkbox: "I agree to the Privacy Policy, Public Offer, and Refund Policy",
      pay: "Pay",
      processing: "Redirecting to secure checkout…",
      moneyBack: "7-day satisfaction guarantee — full refund if we haven't met expectations.",
      stripeLine: "Stripe handles your card. We never see your card number.",
      whyTrust: "Why students trust us",
      benefit1: "Yale, Harvard, Cambridge, Tsinghua-led team",
      benefit2: "$50K+ scholarship outcomes for Standard students",
      benefit3: "Reschedule or refund within 7 days, no questions asked",
      privacy: "Privacy Policy",
      offer: "Public Offer",
      refund: "Refund Policy",
      and: "and",
      seeRefund: "See",
    },
    ru: {
      title: "Безопасная оплата",
      subtitle: "Через Stripe — зашифрованный, PCI-совместимый платёж",
      orderSummary: "Ваш заказ",
      promoCode: "Промокод",
      promoPlaceholder: "Введите код (напр. LAUNCH30)",
      apply: "Применить",
      promoApplied: "Промокод применён",
      promoInvalid: "Промокод недействителен или неприменим",
      subtotal: "Промежуточный итог",
      discount: "Скидка",
      total: "К оплате сейчас",
      yourInfo: "Ваши контактные данные",
      email: "Email *",
      fullName: "Полное имя *",
      phone: "Телефон / WhatsApp (необязательно)",
      checkbox: "Я согласен(а) с Политикой конфиденциальности, Публичной офертой и Правилами возврата",
      pay: "Оплатить",
      processing: "Переходим к безопасной оплате…",
      moneyBack: "Гарантия 7 дней — полный возврат, если мы не оправдали ожидания.",
      stripeLine: "Stripe обрабатывает карту. Мы никогда не видим её номер.",
      whyTrust: "Почему студенты нам доверяют",
      benefit1: "Команда Yale, Harvard, Cambridge, Tsinghua",
      benefit2: "$50K+ стипендий у студентов Standard",
      benefit3: "Возврат или перенос за 7 дней без вопросов",
      privacy: "Политикой конфиденциальности",
      offer: "Публичной офертой",
      refund: "Правилами возврата",
      and: "и",
      seeRefund: "См.",
    },
  }[language];

  // Parse the display price ($690, $1,300) → number for UI math only.
  // Server re-validates against authoritative catalog.
  const parsedAmount = useMemo(() => {
    const n = parseFloat(price.replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }, [price]);

  const finalAmount = useMemo(() => {
    if (!appliedPromo) return parsedAmount;
    return Math.round(parsedAmount * (1 - appliedPromo.pct));
  }, [parsedAmount, appliedPromo]);

  const handlePromo = () => {
    const code = promoCode.trim().toUpperCase();
    if (!code) {
      setAppliedPromo(null);
      setPromoError("");
      return;
    }
    if (code === "LAUNCH30") {
      if (!isConsultation) {
        setAppliedPromo(null);
        setPromoError(language === "en" ? "Only valid for consultations" : "Действительно только для консультаций");
        trackPaymentFunnel("promo_invalid", { code, reason: "not_consultation" });
        return;
      }
      setAppliedPromo({ code, pct: 0.3 });
      setPromoError("");
      trackPaymentFunnel("promo_applied", { code, discount: 0.3 });
      toast({ title: t.promoApplied, description: "30% off" });
    } else {
      setAppliedPromo(null);
      setPromoError(t.promoInvalid);
      trackPaymentFunnel("promo_invalid", { code });
    }
  };

  const handleCheckout = async () => {
    if (!termsAccepted) {
      toast({
        title: language === "en" ? "Please accept terms" : "Примите условия",
        variant: "destructive",
      });
      return;
    }
    if (!contactEmail.trim() || !contactEmail.includes("@")) {
      toast({
        title: language === "en" ? "Valid email required" : "Требуется email",
        variant: "destructive",
      });
      return;
    }
    if (!contactName.trim()) {
      toast({
        title: language === "en" ? "Full name required" : "Требуется имя",
        variant: "destructive",
      });
      return;
    }
    if (!resolvedKey) {
      toast({
        title: language === "en" ? "Product configuration error" : "Ошибка конфигурации продукта",
        description: language === "en"
          ? "Please contact us — this product can't be checked out yet."
          : "Свяжитесь с нами — этот продукт пока недоступен.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    trackPaymentFunnel("proceeded", {
      type: consultationType,
      product_key: resolvedKey,
      price,
      discount: appliedPromo?.pct || 0,
      final_price: finalAmount,
    });

    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          product_key: resolvedKey,
          contact_email: contactEmail.trim(),
          contact_name: contactName.trim(),
          contact_phone: contactPhone.trim() || null,
          promo_code: appliedPromo?.code || null,
          language,
        },
      });
      if (error) throw error;
      if (!data?.url) throw new Error("No checkout URL returned");

      trackPaymentFunnel("booking_saved", { final_price: finalAmount, session_id: data.session_id });
      try { sessionStorage.removeItem(STORAGE_KEY); } catch {/* ignore */}
      window.location.href = data.url;
    } catch (err) {
      setIsSubmitting(false);
      trackPaymentFunnel("booking_save_failed", { error: String(err).slice(0, 200) });
      console.error("Checkout creation failed:", err);
      toast({
        title: language === "en" ? "Couldn't start checkout" : "Не удалось начать оплату",
        description: language === "en"
          ? "Please try again or contact team@topuniconsulting.com"
          : "Попробуйте снова или напишите на team@topuniconsulting.com",
        variant: "destructive",
      });
    }
  };

  // Exit-intent recovery if user tries to close mid-flow with progress.
  const exitShownRef = useRef(false);
  const handleOpenChange = (next: boolean) => {
    if (!next && !exitShownRef.current && !isSubmitting) {
      const hasProgress = !!appliedPromo || !!contactEmail.trim() || !!contactName.trim();
      if (hasProgress) {
        exitShownRef.current = true;
        trackPaymentFunnel("exit_intent_shown", {
          had_promo: !!appliedPromo,
          had_email: !!contactEmail.trim(),
        });
        setShowExitIntent(true);
        return;
      }
    }
    onOpenChange(next);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <Lock className="h-5 w-5 text-accent" />
              <DialogTitle className="text-2xl">{t.title}</DialogTitle>
            </div>
            <DialogDescription>{t.subtitle}</DialogDescription>
          </DialogHeader>

          <div className="space-y-5 mt-2">
            {/* Order summary card */}
            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">{t.orderSummary}</span>
                <span className="text-xs text-muted-foreground uppercase tracking-wide">USD</span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground leading-tight">{consultationType}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isConsultation
                      ? language === "en" ? "1-on-1 video session" : "1-на-1 видеосессия"
                      : language === "en" ? "Multi-session program" : "Программа из нескольких сессий"}
                  </p>
                </div>
                <span className="font-semibold text-foreground tabular-nums">${parsedAmount.toLocaleString()}</span>
              </div>

              {/* Promo */}
              <div className="border-t border-border/60 pt-3">
                <Label htmlFor="promo" className="text-xs text-muted-foreground">{t.promoCode}</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="promo"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder={t.promoPlaceholder}
                    className="h-9 text-sm"
                  />
                  <Button variant="outline" size="sm" onClick={handlePromo} className="h-9">
                    {t.apply}
                  </Button>
                </div>
                {promoError && <p className="text-xs text-destructive mt-1">{promoError}</p>}
                {appliedPromo && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {appliedPromo.code} — {(appliedPromo.pct * 100).toFixed(0)}% off
                  </p>
                )}
              </div>

              {/* Totals */}
              <div className="border-t border-border/60 pt-3 space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>{t.subtotal}</span>
                  <span className="tabular-nums">${parsedAmount.toLocaleString()}</span>
                </div>
                {appliedPromo && (
                  <div className="flex justify-between text-green-600">
                    <span>{t.discount}</span>
                    <span className="tabular-nums">-${(parsedAmount - finalAmount).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base text-foreground pt-1 border-t border-border/40">
                  <span>{t.total}</span>
                  <span className="tabular-nums text-accent">${finalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Contact info */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">{t.yourInfo}</Label>
              <Input
                type="email"
                required
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder={t.email}
                autoComplete="email"
              />
              <Input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder={t.fullName}
                autoComplete="name"
                required
              />
              <Input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder={t.phone}
                autoComplete="tel"
              />
            </div>

            {/* Trust block */}
            <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Sparkles className="h-4 w-4 text-accent" />
                {t.whyTrust}
              </div>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-accent flex-shrink-0 mt-0.5" />{t.benefit1}</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-accent flex-shrink-0 mt-0.5" />{t.benefit2}</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-accent flex-shrink-0 mt-0.5" />{t.benefit3}</li>
              </ul>
            </div>

            {/* Terms */}
            <div className="flex items-start gap-2.5">
              <Checkbox
                id="tos"
                checked={termsAccepted}
                onCheckedChange={(c) => setTermsAccepted(c === true)}
                className="mt-0.5"
              />
              <Label htmlFor="tos" className="text-xs leading-relaxed cursor-pointer text-muted-foreground">
                {t.checkbox}.{" "}
                <Link to={`/privacy-policy${langSuffix}`} target="_blank" className="text-accent hover:underline">
                  {t.privacy}
                </Link>{" "}·{" "}
                <Link to={`/public-offer${langSuffix}`} target="_blank" className="text-accent hover:underline">
                  {t.offer}
                </Link>{" "}·{" "}
                <Link to={`/refund-policy${langSuffix}`} target="_blank" className="text-accent hover:underline">
                  {t.refund}
                </Link>
              </Label>
            </div>

            {/* CTA */}
            <Button
              variant="gold"
              size="lg"
              className="w-full text-base"
              onClick={handleCheckout}
              disabled={isSubmitting || !termsAccepted || !contactEmail.trim() || !contactName.trim()}
            >
              {isSubmitting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t.processing}</>
              ) : (
                <><Lock className="h-4 w-4 mr-2" />{t.pay} ${finalAmount.toLocaleString()}</>
              )}
            </Button>

            {/* Trust footer */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> {t.stripeLine}</span>
              </div>
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                <Clock className="h-3 w-3" /> {t.moneyBack}
              </div>
              <div className="flex items-center justify-center gap-2 pt-1">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Visa · Mastercard · Amex · Apple Pay · Google Pay</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <ExitIntentRecovery
        open={showExitIntent}
        onOpenChange={(o) => {
          setShowExitIntent(o);
          if (!o) onOpenChange(false);
        }}
        onResume={() => setShowExitIntent(false)}
        language={language}
      />
    </>
  );
};
