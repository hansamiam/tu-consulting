import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle, Home } from "lucide-react";
import Navigation from "@/components/Navigation";

const ThankYouRu = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const consultationType = searchParams.get("type") || "consultation";

  useEffect(() => {
    // Load Calendly widget
    const head = document.querySelector("head");
    const script = document.createElement("script");
    script.setAttribute("src", "https://assets.calendly.com/assets/external/widget.js");
    script.setAttribute("type", "text/javascript");
    script.setAttribute("async", "true");
    head?.appendChild(script);

    return () => {
      // Cleanup
      head?.removeChild(script);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary via-primary to-primary-dark">
      <Navigation language="ru" />
      
      <div className="container mx-auto px-4 py-12 md:py-20">
        <div className="max-w-4xl mx-auto">
          {/* Success Message */}
          <div className="text-center mb-8 md:mb-12">
            <CheckCircle className="w-16 h-16 md:w-20 md:h-20 text-gold mx-auto mb-4 md:mb-6" />
            <h1 className="text-3xl md:text-5xl font-bold text-gold mb-4">
              Оплата подтверждена!
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/90 mb-2">
              Спасибо за оплату. Мы получили ваш чек и рады работать с вами.
            </p>
            <p className="text-base md:text-lg text-primary-foreground/80">
              Теперь давайте запланируем вашу {consultationType === "package" ? "первую сессию" : "консультацию"}:
            </p>
          </div>

          {/* Calendly Inline Widget */}
          <div className="bg-white rounded-lg shadow-xl p-2 mb-8">
            <div 
              className="calendly-inline-widget" 
              data-url="https://calendly.com/topuniconsulting/consultation"
              style={{ minWidth: "320px", height: "700px" }}
            />
          </div>

          {/* Navigation */}
          <div className="text-center">
            <Button
              onClick={() => navigate("/ru")}
              variant="outline"
              className="border-gold text-gold hover:bg-gold hover:text-primary"
            >
              <Home className="w-4 h-4 mr-2" />
              На главную
            </Button>
          </div>

          {/* Additional Info */}
          <div className="mt-12 p-6 bg-gold/10 border border-gold/20 rounded-lg">
            <h3 className="text-xl font-semibold text-gold mb-3">Что дальше?</h3>
            <ul className="space-y-2 text-primary-foreground/90">
              <li className="flex items-start gap-2">
                <span className="text-gold mt-1">•</span>
                <span>Вы получите подтверждающее письмо от Calendly с деталями бронирования</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold mt-1">•</span>
                <span>Мы отправим вам напоминание за 24 часа до сессии</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold mt-1">•</span>
                <span>Подготовьте вопросы или материалы, которые хотите обсудить</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold mt-1">•</span>
                <span>Если нужно перенести встречу, вы можете сделать это через письмо от Calendly</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThankYouRu;
