import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import aigulPhoto from "@/assets/aigul.jpeg";
import joshPhoto from "@/assets/josh.jpg";
import nurzadaPhoto from "@/assets/nurzada.jpg";
import samuelPhoto from "@/assets/samuel.jpg";
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
      title: "Основатель и CEO",
      tagline: "Yale",
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
      title: "Со-основатель и глава консалтинга",
      tagline: "Cambridge & Tsinghua",
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
      tagline: "Harvard",
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
      tagline: "Oregon & OSCE Academy",
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
    <div className="min-h-screen relative bg-background">
      <div className="relative z-10">
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
          {/* Header reverted 2026-05-10 to mirror EN — animated $500K+
              stat, animated 10+ years stat, country flag-circles row.
              Gradient title removed, solid foreground colour + solid
              gold underscore (gold-navy gradient was tacky). */}
          <div className="text-center mb-8 md:mb-16 space-y-4 md:space-y-8 animate-fade-in">
            <div className="inline-block">
              <h1 className="font-heading text-2xl sm:text-3xl md:text-5xl font-bold text-foreground tracking-tight mb-2">
                Команда
              </h1>
              <div className="h-1 w-16 md:w-24 bg-gold mx-auto rounded-full"></div>
            </div>

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
                  <div className="text-xs md:text-base text-muted-foreground">лет совокупного опыта</div>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} className="space-y-1 md:space-y-2">
                  <div className="min-h-[32px] md:min-h-[56px] flex items-center justify-center">
                    <div className="flex flex-nowrap gap-1.5 md:gap-3 items-center justify-center">
                      <div className="w-7 h-7 md:w-10 md:h-10 rounded-full border-2 border-gold/40 overflow-hidden flex-shrink-0 p-0.5">
                        <img src={usFlag} alt="USA" className="w-full h-full object-cover" loading="lazy" />
                      </div>
                      <div className="w-7 h-7 md:w-10 md:h-10 rounded-full border-2 border-gold/40 overflow-hidden flex-shrink-0 p-0.5">
                        <img src={caFlag} alt="Canada" className="w-full h-full object-cover" loading="lazy" />
                      </div>
                      <div className="w-7 h-7 md:w-10 md:h-10 rounded-full border-2 border-gold/40 overflow-hidden flex-shrink-0 p-0.5">
                        <img src={gbFlag} alt="UK" className="w-full h-full object-cover" loading="lazy" />
                      </div>
                      <div className="w-7 h-7 md:w-10 md:h-10 rounded-full border-2 border-gold/40 overflow-hidden flex-shrink-0 p-0.5">
                        <img src={cnFlag} alt="China" className="w-full h-full object-cover object-left" loading="lazy" />
                      </div>
                      <div className="w-7 h-7 md:w-10 md:h-10 rounded-full border-2 border-gold/40 overflow-hidden flex-shrink-0 p-0.5">
                        <img src={krFlag} alt="South Korea" className="w-full h-full object-cover" loading="lazy" />
                      </div>
                    </div>
                  </div>
                  <div className="text-xs md:text-base text-muted-foreground">меж­континентальный опыт</div>
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
                    className="group relative p-5 md:p-7 hover:shadow-lg transition-all duration-300 border-border/60 bg-card/70 backdrop-blur-sm hover:border-gold/35 cursor-pointer text-center"
                  >
                    <div className="flex flex-col items-center space-y-3.5">
                      <div className="w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden bg-canvas ring-1 ring-border/60 ring-offset-4 ring-offset-card/70 shadow-sm">
                        <img
                          src={member.photo}
                          alt={member.name}
                          className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-700"
                          loading="lazy"
                        />
                      </div>
                      <div className="space-y-1">
                        <p className="font-heading font-semibold text-foreground text-base md:text-lg leading-tight">
                          {member.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {member.title}
                        </p>
                        <p className="text-xs md:text-sm text-gold-dark font-semibold tracking-[0.05em] pt-0.5">
                          {member.tagline}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70 group-hover:text-gold-dark transition-colors pt-1">
                        Профиль
                        <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </Card>
                </DialogTrigger>
                <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <div className="flex items-center gap-4 mb-2">
                      <img
                        src={member.photo}
                        alt={member.name}
                        className="w-16 h-16 rounded-full object-cover ring-1 ring-border/60 shadow-sm shrink-0"
                      />
                      <div className="min-w-0">
                        <DialogTitle className="text-xl font-bold text-foreground tracking-tight">{member.name}</DialogTitle>
                        <p className="text-sm text-muted-foreground">{member.title}</p>
                        <p className="text-xs text-gold-dark font-semibold tracking-[0.05em] mt-0.5">{member.tagline}</p>
                      </div>
                    </div>
                  </DialogHeader>
                  <div className="space-y-5 text-sm pt-2">
                    <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1.5 text-muted-foreground">
                      <dt className="font-semibold text-foreground">Родной город</dt>
                      <dd>{member.hometown}</dd>
                      <dt className="font-semibold text-foreground">Образование</dt>
                      <dd>{member.education}</dd>
                      <dt className="font-semibold text-foreground">Языки</dt>
                      <dd>{member.languages}</dd>
                    </dl>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.22em] text-gold-dark font-bold mb-2">Достижения</p>
                      <ul className="space-y-1.5">
                        {member.accomplishments.map((accomplishment, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-muted-foreground">
                            <span className="text-gold-dark mt-1 shrink-0">·</span>
                            <span className="leading-relaxed">{accomplishment}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.22em] text-gold-dark font-bold mb-2">Специализация</p>
                      <p className="text-muted-foreground leading-relaxed">{member.strengths}</p>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </main>

      {/* Footer — same layout-breaking wrapper retired here as in
          Team.tsx; Footer renders its own <footer> + grid layout. */}
      <Footer language="ru" />
      </div>
    </div>
  );
};

export default TeamRu;
