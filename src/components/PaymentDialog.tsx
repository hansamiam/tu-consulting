import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Upload, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import paymentQR from "@/assets/payment-qr.jpg";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consultationType: string;
  price: string;
  language: "en" | "ru";
  isConsultation: boolean;
}

export const PaymentDialog = ({ open, onOpenChange, consultationType, price, language, isConsultation }: PaymentDialogProps) => {
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [promoError, setPromoError] = useState("");
  const { toast } = useToast();

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
        return;
      }
      setDiscount(0.30);
      setPromoError("");
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
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
      setIsUploading(true);
      
      // Simulate upload
      setTimeout(() => {
        setIsUploading(false);
        toast({
          title: t.uploadSuccess,
          description: t.note,
        });
      }, 1000);
    }
  };

  const handleProceed = () => {
    if (!receiptFile) {
      toast({
        title: language === "en" ? "Receipt required" : "Требуется квитанция",
        description: language === "en" 
          ? "Please upload your payment receipt first" 
          : "Пожалуйста, сначала загрузите квитанцию об оплате",
        variant: "destructive",
      });
      return;
    }
    
    // Redirect to thank you page with Calendly embedded
    const thankYouPath = language === "ru" ? "/thank-you/ru" : "/thank-you";
    const consultationType = isConsultation ? "consultation" : "package";
    window.location.href = `${thankYouPath}?type=${consultationType}`;
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
                ) : (
                  t.noFile
                )}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {t.note}
            </p>
          </div>

          {/* Proceed Button */}
          <Button
            variant="gold"
            className="w-full"
            size="lg"
            onClick={handleProceed}
            disabled={isUploading}
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
