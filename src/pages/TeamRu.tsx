import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Navigation from "@/components/Navigation";
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
import { ScrollProgress } from "@/components/ScrollProgress";
import { ScrollReveal } from "@/components/ScrollReveal";
import { StaggerContainer, StaggerItem } from "@/hooks/use-stagger-animation";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { motion } from "framer-motion";

const TeamRu = () => {
  const navigate = useNavigate();

  const teamMembers = [
    {
      name: "Самуэль Хан",
      title: "Со-основатель",
      photo: samuelPhoto,
      hometown: "Торонто, Канада",
      education: "Йельский университет",
      languages: "Английский, Корейский (двуязычный); Русский, Китайский (разговорный)",
      strengths: "Стратегии обучения, студенты gap year, естественные науки, иммигранты и студенты третьей культуры, поддержка студентов с СДВГ",
      accomplishments: [
        "Йельский университет (бакалавриат)",
        "Преодолел СДВГ и трудности с обучением",
        "Студент третьей культуры, прошедший через множество образовательных систем",
        "Специализация в приложениях по естественным наукам"
      ]
    },
    {
      name: "Нурзада Абдивалиева",
      title: "Со-основатель",
      photo: nurzadaPhoto,
      hometown: "Бишкек, Кыргызстан",
      education: "Американский университет Центральной Азии | Корейский институт развития (KDI) | Кембриджский университет | Университет Цинхуа",
      languages: "Русский (родной), Кыргызский (родной), Английский (продвинутый)",
      strengths: "Стипендии и стратегии финансирования, пути самофинансирования образования, кросс-культурная адаптация, убедительное повествование, социальные науки",
      accomplishments: [
        "Выпускник АУЦА, KDI, Кембриджа, Цинхуа",
        "Получила более $200K стипендий",
        "Множество конкурентных поступлений в магистратуру",
        "Эксперт по межкультурным образовательным переходам"
      ]
    },
    {
      name: "Джош Хьюз",
      title: "Ведущий консультант",
      photo: joshPhoto,
      hometown: "Норт-Огаста, Южная Каролина, США",
      education: "Университет Южной Каролины | Гарвардский университет",
      languages: "Английский (родной), Русский (продвинутый), Кыргызский (ниже среднего)",
      strengths: "Заявки в магистратуру, академические исследования, доработка эссе, языки и гуманитарные науки, стратегии сдачи тестов",
      accomplishments: [
        "Бакалавриат USC, магистратура Гарвард",
        "Идеальные баллы по множеству стандартизированных тестов",
        "Опубликованные академические исследования",
        "Многоязычный (английский, русский, кыргызский)"
      ]
    },
    {
      name: "Айгуль Абдубаетова",
      title: "Старший советник",
      photo: aigulPhoto,
      hometown: "Бишкек, Кыргызстан",
      education: "Университет Орегона",
      languages: "Английский (свободно), Кыргызский (родной), Русский (свободно)",
      strengths: "Руководство по рекомендательным письмам, карьерный коучинг, профессионалы на ранней и средней стадии карьеры, институциональное консультирование, международный нетворкинг",
      accomplishments: [
        "Выпускник Университета Орегона",
        "Написала более 100 рекомендательных писем",
        "Наставила разнообразных международных студентов",
        "Эксперт по институциональной навигации и карьерным переходам"
      ]
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
      <ScrollProgress />
      <Navigation language="ru" />
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 sticky top-16 z-40 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/ru")}
            className="gap-2 hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Назад на главную
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 md:py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 md:mb-16 space-y-4 md:space-y-8 animate-fade-in">
            <div className="inline-block">
              <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold bg-gradient-to-r from-gold via-accent to-primary bg-clip-text text-transparent mb-2">
                Наша команда
              </h1>
              <div className="h-1 w-16 md:w-24 bg-gradient-to-r from-primary to-gold mx-auto rounded-full"></div>
            </div>
            
            {/* Stats Section */}
            <ScrollReveal delay={0.2}>
              <div className="grid md:grid-cols-3 gap-4 md:gap-8 max-w-4xl mx-auto animate-enter">
                <motion.div whileHover={{ scale: 1.05 }} className="space-y-1 md:space-y-2">
                  <div className="min-h-[32px] md:min-h-[56px] flex items-center justify-center">
                    <div className="text-3xl md:text-5xl font-bold text-gold">
                      $<AnimatedNumber value={500} />K+
                    </div>
                  </div>
                  <div className="text-xs md:text-base text-muted-foreground">стипендий получено</div>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} className="space-y-1 md:space-y-2">
                  <div className="min-h-[32px] md:min-h-[56px] flex items-center justify-center">
                    <div className="text-3xl md:text-5xl font-bold text-gold">
                      <AnimatedNumber value={10} />+
                    </div>
                  </div>
                  <div className="text-xs md:text-base text-muted-foreground">лет совместного опыта</div>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} className="space-y-1 md:space-y-2">
  <div className="min-h-[32px] md:min-h-[56px] flex items-center justify-center">
    <div className="flex flex-nowrap gap-1.5 md:gap-3 items-center justify-center">
      <div className="w-7 h-7 md:w-10 md:h-10 rounded-full border-2 border-gold/40 overflow-hidden flex-shrink-0 p-0.5">
        <img src={usFlag} alt="Флаг США" className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    <div className="w-7 h-7 md:w-10 md:h-10 rounded-full border-2 border-gold/40 overflow-hidden flex-shrink-0 p-0.5">
                      <img src={caFlag} alt="Флаг Канады" className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    <div className="w-7 h-7 md:w-10 md:h-10 rounded-full border-2 border-gold/40 overflow-hidden flex-shrink-0 p-0.5">
                      <img src={gbFlag} alt="Флаг Великобритании" className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    <div className="w-7 h-7 md:w-10 md:h-10 rounded-full border-2 border-gold/40 overflow-hidden flex-shrink-0 p-0.5">
<img src={cnFlag} alt="Флаг Китая" className="w-full h-full object-cover object-left" loading="lazy" />
                    </div>
                    <div className="w-7 h-7 md:w-10 md:h-10 rounded-full border-2 border-gold/40 overflow-hidden flex-shrink-0 p-0.5">
                      <img src={krFlag} alt="Флаг Южной Кореи" className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  </div>
                </div>
                <div className="text-xs md:text-base text-muted-foreground">межконтинентальная экспертиза</div>
              </motion.div>
              </div>
            </ScrollReveal>
          </div>

          {/* Team Grid */}
          <StaggerContainer className="grid md:grid-cols-2 gap-4 md:gap-8 animate-fade-in">
            {teamMembers.map((member, index) => (
              <StaggerItem key={index}>
                <Dialog>
                <DialogTrigger asChild>
                  <Card 
                    className="group p-4 md:p-8 hover:shadow-2xl transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm hover:border-gold/30 hover:scale-[1.02] cursor-pointer"
                  >
                    <div className="flex flex-col items-center text-center space-y-3 md:space-y-6">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-gold/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-300 opacity-0 group-hover:opacity-100"></div>
                        <img
                          src={member.photo}
                          alt={member.name}
                          className="relative w-32 h-32 md:w-48 md:h-48 rounded-full object-cover border-4 border-primary/40 group-hover:border-primary/70 transition-all duration-300 shadow-lg"
                        />
                      </div>
                      <div className="space-y-2 md:space-y-3 w-full">
                        <h2 className="text-lg md:text-2xl font-bold text-foreground group-hover:text-primary transition-colors">{member.name}</h2>
                        <p className="text-sm md:text-base font-medium bg-gradient-to-r from-gold via-accent to-primary bg-clip-text text-transparent">{member.title}</p>
                        <div className="space-y-1.5 md:space-y-2 text-xs md:text-sm">
                          <p className="text-muted-foreground">
                            <span className="font-semibold text-gold">Родной город:</span> {member.hometown}
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
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <div className="flex flex-col items-center text-center space-y-4 mb-6">
                      <img
                        src={member.photo}
                        alt={member.name}
                        className="w-32 h-32 rounded-full object-cover border-4 border-primary/40 shadow-lg"
                      />
                      <div>
                        <DialogTitle className="text-2xl font-bold text-primary">{member.name}</DialogTitle>
                        <p className="text-base font-medium bg-gradient-to-r from-gold via-accent to-primary bg-clip-text text-transparent mt-1">{member.title}</p>
                      </div>
                    </div>
                  </DialogHeader>
                  <div className="space-y-6 text-sm">
                    <div>
                      <h3 className="font-semibold text-gold text-base mb-2">Основная информация</h3>
                      <div className="space-y-2">
                        <p className="text-muted-foreground">
                          <span className="font-semibold text-foreground">Родной город:</span> {member.hometown}
                        </p>
                        <p className="text-muted-foreground">
                          <span className="font-semibold text-foreground">Образование:</span> {member.education}
                        </p>
                        <p className="text-muted-foreground">
                          <span className="font-semibold text-foreground">Языки:</span> {member.languages}
                        </p>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gold text-base mb-2">Ключевые достижения</h3>
                      <ul className="space-y-1.5">
                        {member.accomplishments.map((accomplishment, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-muted-foreground">
                            <span className="text-gold mt-0.5">•</span>
                            <span>{accomplishment}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gold text-base mb-2">Специализируется в:</h3>
                      <p className="text-muted-foreground">{member.strengths}</p>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/30 bg-background/80 backdrop-blur-sm py-6 mt-12">
        <div className="container mx-auto px-4 text-center space-y-2">
          <p className="text-sm text-muted-foreground">Под руководством консультантов из Йеля, Гарварда, Кембриджа и Цинхуа</p>
          <p className="text-sm text-muted-foreground">Ведущая консалтинговая фирма по поступлению в Центральной Азии</p>
          <p className="text-xs text-muted-foreground mt-2">© 2025 Top Uni Consulting | Все права защищены</p>
        </div>
      </footer>
    </div>
  );
};

export default TeamRu;
