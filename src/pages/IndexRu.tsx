import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Instagram } from "lucide-react";
import heroImage from "@/assets/hero-campus.jpg";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const IndexRu = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, введите действительный адрес электронной почты",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('waitlist_emails')
        .insert([{ email: email.trim().toLowerCase() }]);

      if (error) {
        if (error.code === '23505') {
          toast({
            title: "Уже зарегистрирован!",
            description: "Этот адрес уже в нашем списке ожидания. Мы уведомим вас о запуске!",
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "Успешно присоединились! 🎉",
          description: "Спасибо за ваш интерес! Мы будем держать вас в курсе нашего запуска.",
        });
        setEmail("");
      }
    } catch (error) {
      console.error('Error submitting to waitlist:', error);
      toast({
        title: "Ошибка",
        description: "Что-то пошло не так. Пожалуйста, попробуйте еще раз.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="min-h-screen relative">
      {/* Hero Section with Background Image */}
      <div 
        className="min-h-screen relative flex items-center justify-center bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(rgba(10, 35, 66, 0.75), rgba(10, 35, 66, 0.75)), url(${heroImage})`,
        }}
      >
        <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-20 text-center">
          {/* Language Switcher */}
          <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
            <LanguageSwitcher />
          </div>
          
          {/* Logo/Brand Name */}
          <div className="mb-8 sm:mb-12 animate-fade-in">
            <h2 className="text-primary-foreground font-heading text-xl sm:text-2xl md:text-3xl font-semibold tracking-wide mb-2">
              Top Uni Consulting
            </h2>
            <div className="w-20 sm:w-24 h-1 bg-gold mx-auto rounded-full" />
          </div>
          {/* Main Headline - Coming Soon */}
          <div className="mb-6 sm:mb-8 inline-block px-6 sm:px-8 py-3 sm:py-4 border-2 border-gold/30 rounded-lg">
            <h1 className="font-heading text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-semibold text-gold leading-tight tracking-tight">
              Скоро запуск
            </h1>
          </div>

          {/* Subheadline */}
          <p className="text-base sm:text-lg md:text-xl text-primary-foreground/90 mb-6 sm:mb-8 max-w-2xl mx-auto font-light leading-relaxed px-4">
            Помогаем амбициозным студентам поступить в лучшие университеты
          </p>
          
          {/* Team Link */}
          <div className="mb-6 sm:mb-8 px-4">
            <Button
              onClick={() => navigate("/team/ru")}
              variant="outline"
              className="border-gold/50 bg-gold/10 text-primary-foreground hover:bg-gold/20 hover:border-gold w-auto px-8 sm:w-auto sm:px-12"
            >
              Познакомьтесь с нашей командой
            </Button>
          </div>

          {/* Waitlist Form */}
          <form onSubmit={handleWaitlistSubmit} className="max-w-md mx-auto mb-6 sm:mb-8 px-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-2">
              <input
                type="email"
                placeholder="Введите свой email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full sm:flex-1 px-4 py-3 rounded-md bg-primary-foreground/10 border border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50 focus:outline-none focus:border-gold focus:bg-primary-foreground/15 transition-all text-base"
                required
                disabled={isSubmitting}
              />
              <Button
                type="submit"
                variant="gold"
                className="self-center px-8 py-3 sm:w-auto whitespace-nowrap"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Отправка..." : "Присоединиться"}
              </Button>
            </div>
          </form>

          {/* Social Links */}
          <div className="flex gap-6 justify-center mb-6 sm:mb-8">
            <a
              href="https://www.instagram.com/top_uni_consulting/?g=5"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold hover:text-gold-light transition-all duration-200 p-2"
              aria-label="Follow us on Instagram"
            >
              <Instagram size={28} className="sm:w-8 sm:h-8" strokeWidth={1.5} />
            </a>
          </div>

          {/* Footer */}
          <footer className="text-primary-foreground/50 text-xs sm:text-sm space-y-3 px-4">
            <p>
              <a 
                href="mailto:team@topuniconsulting.com" 
                className="text-gold hover:text-gold-light transition-colors duration-300 break-all"
              >
                team@topuniconsulting.com
              </a>
            </p>
            <div className="border-t border-gold/20 pt-3 space-y-2">
              <p className="text-primary-foreground/60 text-xs sm:text-sm">Ведущая консалтинговая компания Центральной Азии по поступлению</p>
              <p className="text-primary-foreground/50 text-xs">© 2025 Top Uni Consulting | Все права защищены</p>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default IndexRu;
