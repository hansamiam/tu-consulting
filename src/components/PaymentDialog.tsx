import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { trackPaymentFunnel } from "@/utils/analytics";
import { supabase } from "@/integrations/supabase/client";
import { ExitIntentRecovery } from "@/components/ExitIntentRecovery";
import paymentQR from "@/assets/payment-qr.jpg";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consultationType: string;
  price: string;
  language: "en" | "ru";
  isConsultation: boolean;
}

const STORAGE_KEY = "tu_payment_dialog_state";

export const PaymentDialog = ({ open, onOpenChange, consultationType, price, language, isConsultation }: PaymentDialogProps) => {
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptName, setReceiptName] = useState<string>("");
  const [receiptPath, setReceiptPath] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [promoError, setPromoError] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [contactEmail, setContactEmail] = useState("");
  const [contactName, setContactName] = useState("");
  const [showExitIntent, setShowExitIntent] = useState(false);
  const { toast } = useToast();
  const openedRef = useRef(false);

  // Restore state on mount (so refresh / accidental close doesn't kill the booking)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s.promoCode) setPromoCode(s.promoCode);
        if (typeof s.discount === "number") setDiscount(s.discount);
        if (s.termsAccepted) setTermsAccepted(s.termsAccepted);
        if (s.receiptName) setReceiptName(s.receiptName);
        if (s.receiptPath) setReceiptPath(s.receiptPath);
        if (s.contactEmail) setContactEmail(s.contactEmail);
        if (s.contactName) setContactName(s.contactName);
      }
    } catch {/* ignore */}
  }, []);

  // Persist on change
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        promoCode, discount, termsAccepted,
        receiptName: receiptFile?.name || receiptName,
        receiptPath, contactEmail, contactName,
      }));
    } catch {/* ignore */}
  }, [promoCode, discount, termsAccepted, receiptFile, receiptName, receiptPath, contactEmail, contactName]);

  // Track open/close for funnel analytics — see where users drop off
  useEffect(() => {
    if (open && !openedRef.current) {
      openedRef.current = true;
      trackPaymentFunnel("dialog_opened", { type: consultationType, price, is_consultation: isConsultation });
    } else if (!open && openedRef.current) {
      openedRef.current = false;
      trackPaymentFunnel("dialog_closed", {
        had_promo: discount > 0,
        had_receipt: !!receiptFile,
        accepted_terms: termsAccepted,
      });
    }
  }, [open, consultationType, price, isConsultation, discount, receiptFile, termsAccepted]);

  const langSuffix = language === "ru" ? "/ru" : "";

  const text = {
    en: {
      title: "Complete Payment",
      description: "Upload your payment receipt to proceed with booking",
      paymentDetails: "Payment Details",
      accountName: "Account Name: Samuel Seunghyun H.",
      phoneNumber: "Phone Number: +996 556 447 020",
      scanQR: "Scan QR code to pay",
      promoCode: "Promo Code (Optional)",
      promoPlaceholder: "Enter promo code",
      applyPromo: "Apply",
      promoSuccess: "Discount applied!",
      promoInvalid: "Invalid promo code",
      originalPrice: "Original Price",
      discount: "Discount",
      finalPrice: "Final Price",
      uploadReceipt: "Upload Payment Receipt",
      uploadButton: "Choose File",
      noFile: "No file chosen",
      uploadSuccess: "Receipt uploaded successfully!",
      proceedButton: "Proceed to Schedule",
      note: "After confirming your payment, you'll be able to schedule your consultation time.",
      termsText: "By proceeding with payment, you agree to the",
      privacyPolicy: "Privacy Policy",
      and: "and",
      publicOffer: "Public Offer",
      refundText: "See",
      refundPolicy: "Refund Policy",
      refundSuffix: "for refund terms.",
      checkboxLabel: "I agree to the Privacy Policy and Public Offer",
      checkboxRequired: "You must accept the terms to proceed",
    },
    ru: {
      title: "Завершите оплату",
      description: "Загрузите квитанцию об оплате, чтобы продолжить бронирование",
      paymentDetails: "Платежные реквизиты",
      accountName: "Имя получателя: Samuel Seunghyun H.",
      phoneNumber: "Номер телефона: +996 556 447 020",
      scanQR: "Отсканируйте QR-код для оплаты",
      promoCode: "Промокод (необязательно)",
      promoPlaceholder: "Введите промокод",
      applyPromo: "Применить",
      promoSuccess: "Скидка применена!",
      promoInvalid: "Неверный промокод",
      originalPrice: "Начальная цена",
      discount: "Скидка",
      finalPrice: "Итоговая цена",
      uploadReceipt: "Загрузите квитанцию об оплате",
      uploadButton: "Выбрать файл",
      noFile: "Файл не выбран",
      uploadSuccess: "Квитанция успешно загружена!",
      proceedButton: "Перейти к планированию",
      note: "После подтверждения оплаты вы сможете выбрать удобное время для консультации.",
      termsText: "Продолжая оплату, вы соглашаетесь с",
      privacyPolicy: "Политикой конфиденциальности",
      and: "и",
      publicOffer: "Публичной офертой",
      refundText: "Для возврата средств ознакомьтесь с",
      refundPolicy: "Правилами возврата",
      refundSuffix: ".",
      checkboxLabel: "Я согласен(а) с условиями Политики конфиденциальности и Публичной оферты",
      checkboxRequired: "Вы должны принять условия для продолжения",
    },
  };

  const t = text[language];

  const calculateFinalPrice = () => {
    const numPrice = parseFloat(price.replace('$', '').replace(/,/g, ''));
    return numPrice - (numPrice * discount);
  };

  const handlePromoApply = () => {
    const code = promoCode.toUpperCase().trim();
    if (code === "LAUNCH30") {
      if (!isConsultation) {
        setPromoError(language === "en" ? "This promo code is only valid for consultations" : "Этот промокод действителен только для консультаций");
        setDiscount(0);
        trackPaymentFunnel("promo_invalid", { code, reason: "not_consultation" });
        return;
      }
      setDiscount(0.30);
      setPromoError("");
      trackPaymentFunnel("promo_applied", { code, discount: 0.30 });
      toast({
        title: t.promoSuccess,
        description: language === "en" ? "30% discount applied!" : "Скидка 30% применена!",
      });
    } else if (code === "") {
      setPromoError("");
      setDiscount(0);
    } else {
      setPromoError(t.promoInvalid);
      setDiscount(0);
      trackPaymentFunnel("promo_invalid", { code });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 10MB cap
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: language === "en" ? "File too large" : "Файл слишком большой",
        description: language === "en" ? "Max 10MB. Please compress or use a different file." : "Максимум 10МБ. Сожмите файл или используйте другой.",
        variant: "destructive",
      });
      return;
    }

    setReceiptFile(file);
    setReceiptName(file.name);
    setIsUploading(true);

    const ext = file.name.split(".").pop() || "bin";
    const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;

    try {
      const { error } = await supabase.storage
        .from("payment-receipts")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;

      setReceiptPath(path);
      setIsUploading(false);
      trackPaymentFunnel("receipt_uploaded", { filename: file.name, size_kb: Math.round(file.size / 1024), path });
      toast({
        title: t.uploadSuccess,
        description: t.note,
      });
    } catch (err) {
      setIsUploading(false);
      setReceiptPath("");
      trackPaymentFunnel("receipt_upload_failed", { error: String(err).slice(0, 200) });
      toast({
        title: language === "en" ? "Upload failed" : "Ошибка загрузки",
        description: language === "en"
          ? "Couldn't upload receipt. Please try again or contact us on WhatsApp."
          : "Не удалось загрузить квитанцию. Попробуйте ещё раз или напишите нам в WhatsApp.",
        variant: "destructive",
      });
    }
  };

  const handleProceed = async () => {
    if (!termsAccepted) {
      toast({ title: t.checkboxRequired, variant: "destructive" });
      return;
    }
    if (!receiptPath) {
      toast({
        title: language === "en" ? "Receipt required" : "Требуется квитанция",
        description: language === "en"
          ? "Please upload your payment receipt first"
          : "Пожалуйста, сначала загрузите квитанцию об оплате",
        variant: "destructive",
      });
      return;
    }
    if (!contactEmail.trim()) {
      toast({
        title: language === "en" ? "Email required" : "Требуется email",
        description: language === "en"
          ? "We need your email to confirm the booking"
          : "Нам нужен ваш email для подтверждения бронирования",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    const finalPrice = calculateFinalPrice();
    trackPaymentFunnel("proceeded", { type: consultationType, price, discount, final_price: finalPrice });

    // Save booking server-side so it's not lost if Calendly is skipped
    try {
      const { error } = await supabase.functions.invoke("booking-notify", {
        body: {
          consultation_type: consultationType,
          is_consultation: isConsultation,
          original_price: price,
          discount,
          final_price: finalPrice,
          promo_code: promoCode || null,
          language,
          receipt_path: receiptPath,
          contact_email: contactEmail.trim(),
          contact_name: contactName.trim() || null,
        },
      });
      if (error) throw error;
      trackPaymentFunnel("booking_saved", { final_price: finalPrice });
    } catch (err) {
      trackPaymentFunnel("booking_save_failed", { error: String(err).slice(0, 200) });
      console.error("Booking save failed:", err);
      // Don't block — receipt is already in storage, user can still complete on Calendly
    }

    try { sessionStorage.removeItem(STORAGE_KEY); } catch {/* ignore */}

    const thankYouPath = language === "ru" ? "/thank-you/ru" : "/thank-you";
    const ctype = isConsultation ? "consultation" : "package";
    window.location.href = `${thankYouPath}?type=${ctype}`;
  };

  // Exit-intent: if user tries to close mid-flow with progress, intercept once
  const exitShownRef = useRef(false);
  const handleOpenChange = (next: boolean) => {
    if (!next && !exitShownRef.current && !isSubmitting) {
      const hasProgress = !!receiptPath || discount > 0 || !!contactEmail.trim();
      if (hasProgress) {
        exitShownRef.current = true;
        trackPaymentFunnel("exit_intent_shown", {
          had_receipt: !!receiptPath, had_promo: discount > 0, had_email: !!contactEmail.trim(),
        });
        setShowExitIntent(true);
        return;
      }
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{t.title}</DialogTitle>
          <div className="pt-2">
            <p className="text-lg font-semibold text-accent">{consultationType}</p>
          </div>
          <DialogDescription className="text-base pt-2">
            {t.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Promo Code Section */}
          <div className="space-y-3 p-4 bg-gold/5 rounded-lg border border-gold/20">
            <Label htmlFor="promoCode" className="text-base font-semibold">
              {t.promoCode}
            </Label>
            <div className="flex gap-2">
              <Input
                id="promoCode"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder={t.promoPlaceholder}
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={handlePromoApply}
              >
                {t.applyPromo}
              </Button>
            </div>
            {promoError && <p className="text-sm text-destructive">{promoError}</p>}
            {discount > 0 && (
              <div className="text-sm space-y-1 pt-2 border-t border-gold/20">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t.originalPrice}:</span>
                  <span className="line-through">{price}</span>
                </div>
                <div className="flex justify-between text-accent">
                  <span>{t.discount}:</span>
                  <span>-{(discount * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                  <span>{t.finalPrice}:</span>
                  <span className="text-accent">${calculateFinalPrice().toFixed(0)}</span>
                </div>
              </div>
            )}
            {discount === 0 && (
              <div className="text-sm pt-2 border-t border-gold/20">
                <div className="flex justify-between font-semibold text-lg">
                  <span>{t.finalPrice}:</span>
                  <span className="text-accent">{price}</span>
                </div>
              </div>
            )}
          </div>

          {/* Payment Details Section */}
          <div className="space-y-4 p-6 bg-accent/5 rounded-lg border border-accent/20">
            <h3 className="font-semibold text-lg text-primary">{t.paymentDetails}</h3>
            
            <div className="space-y-2 text-foreground">
              <p>{t.accountName}</p>
              <p>{t.phoneNumber}</p>
            </div>

            <div className="text-center pt-4">
              <p className="text-sm text-muted-foreground mb-3">{t.scanQR}</p>
              <img 
                src={paymentQR} 
                alt="Payment QR Code" 
                className="mx-auto w-64 h-auto rounded-lg border-2 border-border"
              />
            </div>
          </div>

          {/* Receipt Upload Section */}
          <div className="space-y-4">
            <Label htmlFor="receipt" className="text-base font-semibold">
              {t.uploadReceipt} <span className="text-destructive">*</span>
            </Label>
            <div className="flex items-center gap-4">
              <Input
                id="receipt"
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById("receipt")?.click()}
                className="flex items-center gap-2"
              >
                <Upload size={18} />
                {t.uploadButton}
              </Button>
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                {receiptFile ? (
                  <>
                    <CheckCircle2 size={18} className="text-accent" />
                    {receiptFile.name}
                  </>
                ) : receiptName ? (
                  <span className="italic">
                    {language === "en" ? "Previously: " : "Ранее: "}{receiptName} — {language === "en" ? "please re-upload" : "загрузите снова"}
                  </span>
                ) : (
                  t.noFile
                )}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {t.note}
            </p>
          </div>

          {/* Legal Terms Section */}
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg border border-border">
            {/* Terms Text */}
            <p className="text-sm text-muted-foreground">
              {t.termsText}{" "}
              <Link 
                to={`/privacy-policy${langSuffix}`} 
                className="text-accent hover:underline font-medium"
                target="_blank"
              >
                {t.privacyPolicy}
              </Link>{" "}
              {t.and}{" "}
              <Link 
                to={`/public-offer${langSuffix}`} 
                className="text-accent hover:underline font-medium"
                target="_blank"
              >
                {t.publicOffer}
              </Link>.{" "}
              {t.refundText}{" "}
              <Link 
                to={`/refund-policy${langSuffix}`} 
                className="text-accent hover:underline font-medium"
                target="_blank"
              >
                {t.refundPolicy}
              </Link>
              {t.refundSuffix}
            </p>

            {/* Required Checkbox */}
            <div className="flex items-start gap-3">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                className="mt-0.5"
              />
              <Label 
                htmlFor="terms" 
                className="text-sm font-medium cursor-pointer leading-relaxed"
              >
                {t.checkboxLabel} <span className="text-destructive">*</span>
              </Label>
            </div>

            {/* Payment System Logos */}
            <div className="flex items-center justify-center gap-4 pt-2 border-t border-border">
              <div className="flex items-center gap-3">
                {/* Visa Logo */}
                <div className="bg-white px-3 py-1.5 rounded border border-border">
                  <svg viewBox="0 0 780 500" className="h-6 w-auto">
                    <path fill="#1434CB" d="M293.2 348.73l33.359-195.76h53.358l-33.384 195.76H293.2zm246.11-191.54c-10.569-3.966-27.135-8.222-47.821-8.222-52.726 0-89.863 26.551-90.181 64.604-.297 28.129 26.515 43.822 46.754 53.185 20.771 9.598 27.752 15.716 27.652 24.283-.133 13.123-16.586 19.115-31.924 19.115-21.355 0-32.701-2.967-50.225-10.273l-6.878-3.111-7.487 43.822c12.463 5.467 35.508 10.199 59.438 10.445 56.09 0 92.502-26.248 92.916-66.885.199-22.27-14.016-39.215-44.801-53.188-18.65-9.056-30.072-15.099-29.951-24.269 0-8.137 9.668-16.838 30.559-16.838 17.447-.271 30.088 3.534 39.936 7.5l4.781 2.259 7.232-42.427m137.31-4.223h-41.23c-12.772 0-22.332 3.486-27.94 16.234l-79.245 179.4h56.031s9.159-24.121 11.231-29.418c6.123 0 60.555.084 68.336.084 1.596 6.854 6.492 29.334 6.492 29.334h49.512l-43.187-195.64zm-65.417 126.41c4.414-11.279 21.26-54.724 21.26-54.724-.314.521 4.381-11.334 7.074-18.684l3.606 16.878s10.217 46.729 12.353 56.527h-44.293v.003zM231.2 152.97l-52.239 133.5-5.565-27.129c-9.726-31.274-40.025-65.157-73.898-82.12l47.767 171.2 56.455-.063 84.004-195.39-56.524-.001"/>
                    <path fill="#F9A533" d="M146.92 152.96H60.879l-.682 4.073c66.939 16.204 111.23 55.363 129.62 102.42l-18.709-89.96c-3.229-12.396-12.597-16.096-24.186-16.528"/>
                  </svg>
                </div>
                {/* Mastercard Logo */}
                <div className="bg-white px-3 py-1.5 rounded border border-border">
                  <svg viewBox="0 0 780 500" className="h-6 w-auto">
                    <path fill="#FF5F00" d="M278.198 334.228V313.85c0-7.773-4.925-12.84-12.86-12.84-4.122 0-8.566 1.373-11.653 5.804-2.284-3.645-5.847-5.804-10.848-5.804-3.445 0-6.852 1.048-9.538 4.853v-4.043h-7.09v32.408h7.09v-17.992c0-5.721 3.127-8.727 7.893-8.727 4.603 0 6.934 3.169 6.934 8.645v18.074h7.09v-17.992c0-5.721 3.286-8.727 7.893-8.727 4.764 0 7.013 3.169 7.013 8.645v18.074h7.076zm107.39-32.408h-11.574v-9.823h-7.09v9.823h-6.613v6.45h6.612v14.828c0 7.533 2.927 11.98 11.333 11.98 3.045 0 6.613-.958 9.378-2.521l-2.044-6.126c-2.442 1.29-5.125 1.764-7.169 1.764-4.043 0-4.407-2.524-4.407-5.419v-14.506h11.574v-6.45zm61.424-.807c-4.043 0-6.693 1.932-8.405 4.853v-4.046h-7.013v32.408h7.09v-18.156c0-5.4 2.284-8.4 6.852-8.4 1.453 0 3.045.246 4.603.729l2.044-6.855a17.78 17.78 0 00-5.171-.533zm-92.804 3.406c-3.366-2.28-7.973-3.406-13.098-3.406-8.164 0-13.418 3.894-13.418 10.261 0 5.24 3.886 8.482 11.092 9.498l3.286.486c3.848.564 5.61 1.612 5.61 3.49 0 2.522-2.604 4.042-7.489 4.042-4.925 0-8.487-1.612-10.848-3.566l-3.366 5.32c3.848 3.086 8.727 4.528 14.055 4.528 9.297 0 14.7-4.369 14.7-10.501 0-5.644-4.286-8.645-11.252-9.66l-3.286-.487c-3.045-.404-5.448-1.048-5.448-3.243 0-2.442 2.364-3.89 6.289-3.89 4.205 0 8.247 1.612 10.289 2.768l3.084-5.64zm192.82-3.406c-4.043 0-6.69 1.932-8.405 4.853v-4.046h-7.013v32.408h7.09v-18.156c0-5.4 2.284-8.4 6.852-8.4 1.453 0 3.042.246 4.603.729l2.044-6.855a17.78 17.78 0 00-5.171-.533zm-92.564 17.012c0 9.82 6.852 17.2 17.299 17.2 4.764 0 7.973-1.048 11.412-3.815l-3.448-5.564c-2.683 1.932-5.448 2.929-8.246 2.929-5.687 0-9.859-4.125-9.859-10.745 0-6.29 4.172-10.5 9.859-10.748 2.763 0 5.563 1 8.246 2.932l3.448-5.567c-3.439-2.766-6.648-3.812-11.412-3.812-10.447 0-17.299 7.373-17.299 17.19zm67.157 0v-16.205h-7.09v4.043c-2.444-3.006-5.89-4.85-10.612-4.85-9.456 0-16.867 7.373-16.867 17.012 0 9.66 7.411 17.012 16.867 17.012 4.925 0 8.327-1.846 10.612-4.852v4.046h7.09v-16.206zm-26.658 0c0-6.048 3.887-10.748 10.048-10.748 5.926 0 9.938 4.535 9.938 10.748 0 6.132-4.012 10.745-9.938 10.745-6.132-.082-10.048-4.697-10.048-10.745zm-83.916-17.012c-9.777 0-16.705 7.048-16.705 17.012 0 10.048 7.09 17.012 17.183 17.012 5.048 0 9.698-1.211 13.74-4.611l-3.445-5.158c-2.847 2.282-6.452 3.487-9.938 3.487-4.764 0-9.135-2.198-10.213-8.318h25.163c.081-.97.16-1.932.16-3.006-.081-9.964-6.21-16.418-15.945-16.418zm-.16 6.295c4.682 0 7.729 2.929 8.487 8.157h-17.86c.759-4.858 3.727-8.157 9.373-8.157zm174.077 10.717v-29.07h-7.012v16.912c-2.445-3.006-5.888-4.85-10.612-4.85-9.456 0-16.867 7.373-16.867 17.012 0 9.66 7.411 17.012 16.867 17.012 4.925 0 8.324-1.846 10.612-4.852v4.046h7.012v-16.21zm-26.58 0c0-6.048 3.887-10.748 10.048-10.748 5.926 0 9.935 4.535 9.935 10.748 0 6.132-4.009 10.745-9.935 10.745-6.132-.082-10.048-4.697-10.048-10.745zm-285.12 0v-16.205h-7.09v4.043c-2.444-3.006-5.887-4.85-10.612-4.85-9.456 0-16.864 7.373-16.864 17.012 0 9.66 7.408 17.012 16.864 17.012 4.925 0 8.327-1.846 10.612-4.852v4.046h7.09v-16.206zm-26.658 0c0-6.048 3.887-10.748 10.048-10.748 5.926 0 9.935 4.535 9.935 10.748 0 6.132-4.009 10.745-9.935 10.745-6.132-.082-10.048-4.697-10.048-10.745z"/>
                    <path fill="#EB001B" d="M449.01 250c0 99.143-80.371 179.5-179.5 179.5S90 349.143 90 250 170.371 70.5 269.5 70.5 449.01 150.857 449.01 250z"/>
                    <path fill="#F79E1B" d="M690.008 250c0 99.143-80.371 179.5-179.508 179.5S331 349.143 331 250 411.363 70.5 510.5 70.5 690.008 150.857 690.008 250z"/>
                    <path fill="#FF5F00" d="M390.002 97.997c-48.992 38.495-80.504 98.476-80.504 165.505 0 67.021 31.512 127.008 80.504 165.498 48.999-38.49 80.51-98.477 80.51-165.498 0-67.03-31.511-127.01-80.51-165.505z"/>
                  </svg>
                </div>
                {/* Элкарт Logo */}
                <div className="bg-white px-3 py-1.5 rounded border border-border">
                  <span className="font-bold text-sm text-green-600">Элкарт</span>
                </div>
              </div>
            </div>
          </div>

          {/* Proceed Button */}
          <Button
            variant="gold"
            className="w-full"
            size="lg"
            onClick={handleProceed}
            disabled={isUploading || !termsAccepted}
          >
            {t.proceedButton}
          </Button>

          {/* Contact Note */}
          <p className="text-xs text-muted-foreground text-center">
            {language === "en" 
              ? "If you run into any issues processing payment or would like to discuss alternative methods, please get in touch with us at "
              : "Если у вас возникли проблемы с оплатой или вы хотите обсудить альтернативные способы, свяжитесь с нами по адресу "}
            <a href="mailto:team@topuniconsulting.com" className="text-accent hover:underline">
              team@topuniconsulting.com
            </a>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
