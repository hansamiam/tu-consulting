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
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-primary/80 to-gold bg-clip-text text-transparent mb-2">
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
                <div className="flex gap-3 justify-center items-center flex-wrap text-4xl md:text-5xl font-bold text-gold">
                  {/* USA Flag */}
                  <div className="w-12 h-12 rounded-full border-2 border-gold/30 flex items-center justify-center bg-primary/5">
                    <svg className="w-7 h-7" viewBox="0 0 60 40" fill="none">
                      <rect width="60" height="40" fill="currentColor" opacity="0.2"/>
                      <rect width="60" height="3" y="0" fill="currentColor"/>
                      <rect width="60" height="3" y="7" fill="currentColor"/>
                      <rect width="60" height="3" y="14" fill="currentColor"/>
                      <rect width="60" height="3" y="21" fill="currentColor"/>
                      <rect width="60" height="3" y="28" fill="currentColor"/>
                      <rect width="60" height="3" y="35" fill="currentColor"/>
                      <rect width="25" height="17" fill="currentColor" opacity="0.4"/>
                      <circle cx="5" cy="3" r="1" fill="currentColor"/>
                      <circle cx="10" cy="3" r="1" fill="currentColor"/>
                      <circle cx="15" cy="3" r="1" fill="currentColor"/>
                      <circle cx="20" cy="3" r="1" fill="currentColor"/>
                      <circle cx="5" cy="8" r="1" fill="currentColor"/>
                      <circle cx="10" cy="8" r="1" fill="currentColor"/>
                      <circle cx="15" cy="8" r="1" fill="currentColor"/>
                      <circle cx="20" cy="8" r="1" fill="currentColor"/>
                      <circle cx="5" cy="13" r="1" fill="currentColor"/>
                      <circle cx="10" cy="13" r="1" fill="currentColor"/>
                      <circle cx="15" cy="13" r="1" fill="currentColor"/>
                      <circle cx="20" cy="13" r="1" fill="currentColor"/>
                    </svg>
                  </div>
                  
                  {/* Canada Flag - Maple Leaf */}
                  <div className="w-12 h-12 rounded-full border-2 border-gold/30 flex items-center justify-center bg-primary/5">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 3l1 3h3l-2 2 1 3-3-2-3 2 1-3-2-2h3l1-3zm-1 8v8m-2-2h6"/>
                    </svg>
                  </div>
                  
                  {/* UK Flag - Union Jack */}
                  <div className="w-12 h-12 rounded-full border-2 border-gold/30 flex items-center justify-center bg-primary/5">
                    <svg className="w-7 h-7" viewBox="0 0 60 40" fill="currentColor">
                      <path d="M0 0h60v40H0z" opacity="0.2"/>
                      <path d="M0 0l60 40M60 0L0 40" strokeWidth="8" stroke="currentColor" opacity="0.3"/>
                      <path d="M30 0v40M0 20h60" strokeWidth="12" stroke="currentColor" opacity="0.3"/>
                      <path d="M30 0v40M0 20h60" strokeWidth="6" stroke="currentColor"/>
                    </svg>
                  </div>
                  
                  {/* China Flag - 5 Stars */}
                  <div className="w-12 h-12 rounded-full border-2 border-gold/30 flex items-center justify-center bg-primary/5">
                    <svg className="w-7 h-7" viewBox="0 0 30 20" fill="currentColor">
                      <rect width="30" height="20" fill="currentColor" opacity="0.2"/>
                      <path d="M5 3l1.5 4.5h4.5l-3.75 2.5 1.5 4.5L5 12l-3.75 2.5 1.5-4.5L-1 7.5h4.5z"/>
                      <path d="M15 2l.5 1.5h1.5l-1.25 1 .5 1.5-1.25-1-1.25 1 .5-1.5-1.25-1h1.5z" opacity="0.8"/>
                      <path d="M17 5l.5 1.5h1.5l-1.25 1 .5 1.5-1.25-1-1.25 1 .5-1.5-1.25-1h1.5z" opacity="0.8"/>
                      <path d="M17 10l.5 1.5h1.5l-1.25 1 .5 1.5-1.25-1-1.25 1 .5-1.5-1.25-1h1.5z" opacity="0.8"/>
                      <path d="M15 13l.5 1.5h1.5l-1.25 1 .5 1.5-1.25-1-1.25 1 .5-1.5-1.25-1h1.5z" opacity="0.8"/>
                    </svg>
                  </div>
                  
                  {/* South Korea Flag - Taeguk */}
                  <div className="w-12 h-12 rounded-full border-2 border-gold/30 flex items-center justify-center bg-primary/5">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="12" cy="12" r="9" opacity="0.3"/>
                      <path d="M12 3a9 9 0 0 0 0 18c2.5 0 4.5-2 4.5-4.5S14.5 12 12 12c-2.5 0-4.5-2-4.5-4.5S9.5 3 12 3z" fill="currentColor" opacity="0.6"/>
                      <path d="M17 6l1 1m0-1l-1 1m-11 9l1 1m0-1l-1 1m11 0l1-1m0 1l-1-1M7 7l1-1m0 1l-1-1" strokeWidth="2"/>
                    </svg>
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
