import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageCircle, RefreshCw, ShieldCheck } from "lucide-react";
import Navigation from "@/components/Navigation";

interface Props { language?: "en" | "ru" }

export default function PaymentCanceled({ language = "en" }: Props) {
  const navigate = useNavigate();
  const isRu = language === "ru";

  return (
    <div className="min-h-screen bg-background">
      <Navigation language={language} />
      <main className="container mx-auto px-4 py-16 md:py-24 max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-5">
            <RefreshCw className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            {isRu ? "Оплата не завершена" : "Checkout not completed"}
          </h1>
          <p className="text-muted-foreground text-base md:text-lg">
            {isRu
              ? "Ничего страшного — деньги не списаны. Готовы попробовать ещё раз или у вас остались вопросы?"
              : "No worries — your card wasn't charged. Want to try again, or do you have a question we can answer?"}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <Link to={`/offerings${isRu ? "/ru" : ""}`}>
            <Button variant="gold" size="lg" className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              {isRu ? "Попробовать снова" : "Try again"}
            </Button>
          </Link>
          <a href="https://wa.me/996556447020" target="_blank" rel="noreferrer">
            <Button variant="outline" size="lg" className="w-full">
              <MessageCircle className="h-4 w-4 mr-2" />
              {isRu ? "Написать в WhatsApp" : "Talk to us on WhatsApp"}
            </Button>
          </a>
        </div>

        <div className="rounded-xl border border-accent/20 bg-accent/5 p-5 mb-8">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-foreground mb-1">
                {isRu ? "Если что-то не сработало" : "If something didn't work"}
              </p>
              <p className="text-sm text-muted-foreground">
                {isRu
                  ? "Карта отклонена, не работает 3D Secure, или просто остались сомнения? Напишите нам "
                  : "Card declined, 3D Secure issue, or just a hesitation? Email us at "}
                <a href="mailto:team@topuniconsulting.com" className="text-accent hover:underline">team@topuniconsulting.com</a>{" "}
                {isRu ? "и мы поможем." : "and we'll sort it out."}
              </p>
            </div>
          </div>
        </div>

        <div className="text-center">
          <Button variant="ghost" onClick={() => navigate(`/${isRu ? "ru" : ""}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {isRu ? "На главную" : "Back to home"}
          </Button>
        </div>
      </main>
    </div>
  );
}
