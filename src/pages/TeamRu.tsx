import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import aigulPhoto from "@/assets/aigul.jpeg";
import joshPhoto from "@/assets/josh.jpg";
import nurzadaPhoto from "@/assets/nurzada.jpg";
import samuelPhoto from "@/assets/samuel.jpg";
import heroImage from "@/assets/hero-campus.jpg";
import usFlag from "@/assets/flags/us.svg";
import caFlag from "@/assets/flags/ca.svg";
import gbFlag from "@/assets/flags/gb.svg";
import cnFlag from "@/assets/flags/cn.svg";
import krFlag from "@/assets/flags/kr.svg";

const TeamRu = () => {
  const navigate = useNavigate();

  const teamMembers = [
    {
      name: "Самуэль Хан",
      photo: samuelPhoto,
      hometown: "Торонто, Канада",
      education: "Йельский университет",
      languages: "Английский, Корейский (двуязычный); Русский, Китайский (разговорный)"
    },
    {
      name: "Нурзада Абдивалиева",
      photo: nurzadaPhoto,
      hometown: "Бишкек, Кыргызстан",
      education: "Американский университет Центральной Азии | Школа KDI | Кембриджский университет | Университет Цинхуа",
      languages: "Русский (родной), Кыргызский (родной), Английский (продвинутый)"
    },
    {
      name: "Джош Хьюз",
      photo: joshPhoto,
      hometown: "Норт-Огаста, Южная Каролина, США",
      education: "Университет Южной Каролины | Гарвардский университет",
      languages: "Английский (родной), Русский (продвинутый), Кыргызский (ниже среднего)"
    },
    {
      name: "Айгуль Абдубаетова",
      photo: aigulPhoto,
      hometown: "Бишкек, Кыргызстан",
      education: "Университет Орегона",
      languages: "Английский (свободно), Кыргызский (родной), Русский (свободно)"
    }
  ];

  return (
    <div 
      className="min-h-screen relative"
      style={{
        backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0.85)), url(${heroImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/ru")}
            className="gap-2 hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Назад на главную
          </Button>
          <LanguageSwitcher />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 space-y-8">
            <div className="inline-block">
              <h1 className="text-4xl md:text-5xl font-bold text-primary mb-2">
                Наша команда
              </h1>
              <div className="h-1 w-24 bg-gradient-to-r from-primary to-gold mx-auto rounded-full"></div>
            </div>
            
            {/* Stats Section */}
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="space-y-2">
                <div className="text-4xl md:text-5xl font-bold text-gold">$500K+</div>
                <div className="text-sm md:text-base text-muted-foreground">стипендий получено</div>
              </div>
              <div className="space-y-2">
                <div className="text-4xl md:text-5xl font-bold text-gold">10+</div>
                <div className="text-sm md:text-base text-muted-foreground">лет совместного опыта</div>
              </div>
              <div className="space-y-2">
                <div className="h-12 md:h-14 flex items-center justify-center">
                  <div className="flex gap-3 md:gap-4 items-center justify-center flex-nowrap overflow-x-auto">
                    <div className="w-12 h-12 rounded-full border-2 border-gold/40 overflow-hidden bg-background">
                      <img src={usFlag} alt="Флаг США" className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    <div className="w-12 h-12 rounded-full border-2 border-gold/40 overflow-hidden bg-background">
                      <img src={caFlag} alt="Флаг Канады" className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    <div className="w-12 h-12 rounded-full border-2 border-gold/40 overflow-hidden bg-background">
                      <img src={gbFlag} alt="Флаг Великобритании" className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    <div className="w-12 h-12 rounded-full border-2 border-gold/40 overflow-hidden bg-background">
                      <img src={cnFlag} alt="Флаг Китая" className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    <div className="w-12 h-12 rounded-full border-2 border-gold/40 overflow-hidden bg-background">
                      <img src={krFlag} alt="Флаг Южной Кореи" className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  </div>
                </div>
                <div className="text-sm md:text-base text-muted-foreground">межконтинентальная экспертиза</div>
              </div>
            </div>
          </div>

          {/* Team Grid */}
          <div className="grid md:grid-cols-2 gap-8">
            {teamMembers.map((member, index) => (
              <Card 
                key={index} 
                className="group p-8 hover:shadow-2xl transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm hover:border-gold/30 hover:scale-[1.02]"
              >
                <div className="flex flex-col items-center text-center space-y-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-gold/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-300 opacity-0 group-hover:opacity-100"></div>
                    <img
                      src={member.photo}
                      alt={member.name}
                      className="relative w-48 h-48 rounded-full object-cover border-4 border-primary/40 group-hover:border-primary/70 transition-all duration-300 shadow-lg"
                    />
                  </div>
                  <div className="space-y-3 w-full">
                    <h2 className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">{member.name}</h2>
                    <div className="space-y-2 text-sm">
                      <p className="text-muted-foreground">
                        <span className="font-semibold text-gold">Из:</span> {member.hometown}
                      </p>
                      <p className="text-muted-foreground">
                        <span className="font-semibold text-gold">Образование:</span> {member.education}
                      </p>
                      <p className="text-muted-foreground">
                        <span className="font-semibold text-gold">Языки:</span> {member.languages}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default TeamRu;
