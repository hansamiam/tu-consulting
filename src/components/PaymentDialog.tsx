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
}

export const PaymentDialog = ({ open, onOpenChange, consultationType, price, language }: PaymentDialogProps) => {
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const text = {
    en: {
      title: "Complete Payment",
      description: "Upload your payment receipt to proceed with booking",
      paymentDetails: "Payment Details",
      accountName: "Account Name: Samuel Seunghyun H.",
      phoneNumber: "Phone Number: +996 556 447 020",
      scanQR: "Scan QR code to pay",
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
      uploadReceipt: "Загрузите квитанцию об оплате",
      uploadButton: "Выбрать файл",
      noFile: "Файл не выбран",
      uploadSuccess: "Квитанция успешно загружена!",
      proceedButton: "Перейти к планированию",
      note: "После подтверждения оплаты вы сможете выбрать удобное время для консультации.",
    },
  };

  const t = text[language];

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
    
    // Open Calendly in new tab
    window.open("https://calendly.com/nurzada-abdivalieva88/interview", "_blank");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{t.title}</DialogTitle>
          <div className="pt-2">
            <p className="text-lg font-semibold text-accent">{consultationType} - {price}</p>
          </div>
          <DialogDescription className="text-base pt-2">
            {t.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
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
              {t.uploadReceipt}
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
        </div>
      </DialogContent>
    </Dialog>
  );
};
