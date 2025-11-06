import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import aigulPhoto from "@/assets/aigul.jpeg";
import joshPhoto from "@/assets/josh.jpg";
import nurzadaPhoto from "@/assets/nurzada.jpg";
import samuelPhoto from "@/assets/samuel.jpg";

const TeamRu = () => {
  const navigate = useNavigate();

  const teamMembers = [
    {
      name: "Айгуль Абдубаетова",
      photo: aigulPhoto,
      hometown: "Бишкек, Кыргызстан",
      education: "Университет Орегона - Магистр международных исследований (2003)",
      languages: "Английский (свободно), кыргызский (родной), русский (свободно)",
      highlights: [
        "Менеджер по поддержке исследований в Университете Центральной Азии",
        "Бывший руководитель отдела исследований и обучения Академии ОБСЕ (2019-2024)",
        "Научный сотрудник по Центральной Азии, Университет Джорджа Вашингтона (2019)",
        "Руководила множеством международных исследовательских проектов, включая проекты Госдепартамента США и ЕС Horizon 2020"
      ]
    },
    {
      name: "Джош Хьюз",
      photo: joshPhoto,
      hometown: "Северная Августа, Южная Каролина, США",
      education: "Университет Южной Каролины (бакалавр) | Гарвардский университет (магистр регионоведения: Россия, Восточная Европа и Центральная Азия)",
      languages: "Английский (родной), русский (продвинутый), кыргызский (начальный уровень)",
      highlights: [
        "Стипендиат по иностранным языкам и региональным исследованиям (2024-2026) - Министерство образования США",
        "Опыт этнографических исследований в Кыргызстане (2025)",
        "Стипендиат Critical Language Scholarship (2023) - программа Госдепартамента США",
        "Специалист по политологии и русскому языку с глубоким знанием региона"
      ]
    },
    {
      name: "Нурзада Абдивалиева",
      photo: nurzadaPhoto,
      hometown: "Бишкек, Кыргызстан",
      education: "Американский университет Центральной Азии (бакалавр) | KDI School (магистр) | Кембриджский университет (MPhil) | Университет Цинхуа (магистр)",
      languages: "Русский (родной), кыргызский (родной), английский (продвинутый)",
      highlights: [
        "Стипендиат Шварцмана - престижная полная стипендия (<3% приема) для магистратуры в Университете Цинхуа",
        "Стипендиат UCA Cambridge Trust - полностью финансируемая степень MPhil по социологии в Кембридже",
        "Стипендиат Global Ambassador - полностью финансируемая магистратура по государственной политике в KDI School",
        "Стипендиат US Central Asia Education Fellowship и финалист Capstone со стажировкой в Вашингтоне"
      ]
    },
    {
      name: "Самуэль Хан",
      photo: samuelPhoto,
      hometown: "Торонто, Канада",
      education: "Йельский университет - Молекулярная, клеточная биология и биология развития | Восточноазиатские исследования",
      languages: "Английский, корейский (свободно); русский, китайский (разговорный)",
      highlights: [
        "Опыт исследований в Массачусетской больнице общего профиля и Гарвардской медицинской школе",
        "Научно-исследовательский сотрудник Фонда Ага Хана Канады в Университете Центральной Азии",
        "Участник полностью финансируемых программ в Университете Цинхуа (Китай) и Университете Васэда (Япония)",
        "Специализация в биологических науках с сильной региональной экспертизой в Восточной и Центральной Азии"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/ru")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Вернуться на главную
          </Button>
          <LanguageSwitcher />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Наша команда
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Познакомьтесь с опытными профессионалами, посвятившими себя помощи амбициозным студентам в поступлении в лучшие университеты мира
            </p>
          </div>

          {/* Team Grid */}
          <div className="grid md:grid-cols-2 gap-8">
            {teamMembers.map((member, index) => (
              <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex flex-col items-center text-center space-y-4">
                  <img
                    src={member.photo}
                    alt={member.name}
                    className="w-48 h-48 rounded-full object-cover border-4 border-primary/10"
                  />
                  <div>
                    <h2 className="text-2xl font-bold mb-2">{member.name}</h2>
                    <p className="text-sm text-muted-foreground mb-1">
                      <span className="font-semibold">Родной город:</span> {member.hometown}
                    </p>
                    <p className="text-sm text-muted-foreground mb-1">
                      <span className="font-semibold">Образование:</span> {member.education}
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      <span className="font-semibold">Языки:</span> {member.languages}
                    </p>
                    <ul className="text-left space-y-2 text-sm">
                      {member.highlights.map((highlight, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          <span>{highlight}</span>
                        </li>
                      ))}
                    </ul>
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
