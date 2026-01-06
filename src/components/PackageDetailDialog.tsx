import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, Clock, Globe, CreditCard, ArrowRight, FileText } from "lucide-react";

interface PackageDetails {
  name: string;
  price: string;
  priceUsd: string;
  originalPrice: string;
  originalPriceUsd: string;
  discount: string;
  sessions: string;
  features: string[];
  fullDescription: string;
  format: string;
  timeline: string;
  popular?: boolean;
}

interface PackageDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  package: PackageDetails | null;
  onProceedToPayment: () => void;
  language: "en" | "ru";
}

export const PackageDetailDialog = ({
  isOpen,
  onClose,
  package: pkg,
  onProceedToPayment,
  language,
}: PackageDetailDialogProps) => {
  const isRu = language === "ru";

  const labels = {
    fullDescription: isRu ? "Полное описание" : "Full Description",
    whatsIncluded: isRu ? "Что включено" : "What's Included",
    serviceFormat: isRu ? "Формат услуги" : "Service Format",
    timeline: isRu ? "Сроки и продолжительность" : "Timeline & Duration",
    pricing: isRu ? "Стоимость" : "Pricing",
    refundTerms: isRu ? "Условия возврата" : "Refund Terms",
    refundDescription: isRu
      ? "Возврат средств осуществляется в соответствии с нашей Политикой возврата. Полный возврат возможен до начала первой сессии."
      : "Refunds are processed according to our Refund Policy. Full refunds are available before the first session begins.",
    viewRefundPolicy: isRu ? "Ознакомиться с Правилами возврата" : "View Refund Policy",
    legalNote: isRu
      ? "Продолжая, вы соглашаетесь с нашими правовыми условиями:"
      : "By proceeding, you agree to our legal terms:",
    privacyPolicy: isRu ? "Политика конфиденциальности" : "Privacy Policy",
    publicOffer: isRu ? "Публичная оферта" : "Public Offer",
    refundPolicy: isRu ? "Правила возврата" : "Refund Policy",
    proceedToPayment: isRu ? "Перейти к оплате" : "Proceed to Payment",
    close: isRu ? "Закрыть" : "Close",
  };

  const refundPolicyLink = isRu ? "/refund-policy/ru" : "/refund-policy";
  const privacyPolicyLink = isRu ? "/privacy-policy/ru" : "/privacy-policy";
  const publicOfferLink = isRu ? "/public-offer/ru" : "/public-offer";

  return (
    <Dialog open={isOpen && pkg !== null} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl md:text-3xl font-bold">
            {pkg?.name}
          </DialogTitle>
          <DialogDescription className="text-base">
            {pkg?.sessions}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Pricing Section */}
          <div className="bg-accent/10 rounded-lg p-4 md:p-6">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="text-accent" size={20} />
              <h3 className="font-semibold text-lg">{labels.pricing}</h3>
            </div>
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="text-2xl md:text-3xl font-bold text-accent">
                {pkg?.price}
              </span>
              <span className="text-muted-foreground">({pkg?.priceUsd})</span>
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-sm text-muted-foreground line-through">
                {pkg?.originalPrice}
              </span>
              <span className="text-xs text-muted-foreground">
                ({pkg?.originalPriceUsd})
              </span>
              <span className="bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded">
                {pkg?.discount}
              </span>
            </div>
          </div>

          {/* Full Description */}
          <div>
            <h3 className="font-semibold text-lg mb-2">{labels.fullDescription}</h3>
            <p className="text-muted-foreground leading-relaxed">
              {pkg?.fullDescription}
            </p>
          </div>

          {/* Service Format */}
          <div className="flex items-start gap-3">
            <Globe className="text-accent flex-shrink-0 mt-1" size={20} />
            <div>
              <h3 className="font-semibold">{labels.serviceFormat}</h3>
              <p className="text-muted-foreground">{pkg?.format}</p>
            </div>
          </div>

          {/* Timeline */}
          <div className="flex items-start gap-3">
            <Clock className="text-accent flex-shrink-0 mt-1" size={20} />
            <div>
              <h3 className="font-semibold">{labels.timeline}</h3>
              <p className="text-muted-foreground">{pkg?.timeline}</p>
            </div>
          </div>

          {/* What's Included */}
          <div>
            <h3 className="font-semibold text-lg mb-3">{labels.whatsIncluded}</h3>
            <ul className="space-y-2 grid md:grid-cols-2 gap-2">
              {pkg?.features?.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <Check className="text-accent flex-shrink-0 mt-0.5" size={16} />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Refund Terms */}
          <div className="border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="text-accent" size={18} />
              <h3 className="font-semibold">{labels.refundTerms}</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              {labels.refundDescription}
            </p>
            <Link
              to={refundPolicyLink}
              className="text-accent hover:underline text-sm inline-flex items-center gap-1"
            >
              {labels.viewRefundPolicy}
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Legal Links */}
          <div className="bg-muted/50 rounded-lg p-4 text-sm">
            <p className="text-muted-foreground mb-2">{labels.legalNote}</p>
            <div className="flex flex-wrap gap-3">
              <Link
                to={privacyPolicyLink}
                className="text-accent hover:underline"
              >
                {labels.privacyPolicy}
              </Link>
              <span className="text-muted-foreground">•</span>
              <Link
                to={publicOfferLink}
                className="text-accent hover:underline"
              >
                {labels.publicOffer}
              </Link>
              <span className="text-muted-foreground">•</span>
              <Link
                to={refundPolicyLink}
                className="text-accent hover:underline"
              >
                {labels.refundPolicy}
              </Link>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              variant="gold"
              className="flex-1"
              onClick={onProceedToPayment}
            >
              {labels.proceedToPayment}
              <ArrowRight className="ml-2" size={18} />
            </Button>
            <Button variant="outline" onClick={onClose} className="sm:w-auto">
              {labels.close}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
