import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { trackPaymentFunnel } from "@/utils/analytics";

interface ExitIntentRecoveryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResume: () => void;
  language: "en" | "ru";
}

const WHATSAPP_URL = "https://wa.me/996556447020?text=Hi%2C%20I%20was%20trying%20to%20book%20a%20consultation%20but%20got%20stuck%20on%20payment.";

export const ExitIntentRecovery = ({ open, onOpenChange, onResume, language }: ExitIntentRecoveryProps) => {
  const t = language === "ru" ? {
    title: "Подождите — вы почти у цели",
    desc: "Вы уже загрузили данные. Не теряйте прогресс. Если возникли сложности, мы поможем за минуту.",
    resume: "Вернуться к оплате",
    whatsapp: "Написать в WhatsApp",
    leave: "Всё равно закрыть",
  } : {
    title: "Wait — you're 30 seconds away",
    desc: "You've already filled in your details. Don't lose your progress. If something's blocking you, our team can help right now.",
    resume: "Resume payment",
    whatsapp: "Message us on WhatsApp",
    leave: "Close anyway",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">{t.title}</DialogTitle>
          <DialogDescription className="text-base pt-2">{t.desc}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-col gap-2 mt-4">
          <Button
            variant="gold"
            className="w-full"
            onClick={() => {
              trackPaymentFunnel("exit_intent_resumed", {});
              onResume();
            }}
          >
            {t.resume}
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              trackPaymentFunnel("exit_intent_whatsapp", {});
              window.open(WHATSAPP_URL, "_blank");
            }}
          >
            <MessageCircle size={18} className="mr-2" />
            {t.whatsapp}
          </Button>
          <button
            className="text-xs text-muted-foreground hover:underline mt-2"
            onClick={() => {
              trackPaymentFunnel("exit_intent_dismissed", {});
              onOpenChange(false);
            }}
          >
            {t.leave}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
