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
      education: "Университет Орегона - MA",
      languages: "Английский (свободно), Кыргызский (родной), Русский (свободно)"
    },
    {
      name: "Джош Хьюз",
      photo: joshPhoto,
      hometown: "Норт-Огаста, Южная Каролина, США",
      education: "Университет Южной Каролины - BA | Гарвардский университет - MA",
      languages: "Английский (родной), Русский (продвинутый), Кыргызский (ниже среднего)"
    },
    {
      name: "Нурзада Абдивалиева",
      photo: nurzadaPhoto,
      hometown: "Бишкек, Кыргызстан",
      education: "Американский университет Центральной Азии - BA | Школа KDI - MA | Кембриджский университет - MPhil | Университет Цинхуа - MA",
      languages: "Русский (родной), Кыргызский (родной), Английский (продвинутый)"
    },
    {
      name: "Самуэль Хан",
      photo: samuelPhoto,
      hometown: "Торонто, Канада",
      education: "Йельский университет - BA",
      languages: "Английский, Корейский (двуязычный); Русский, Китайский (разговорный)"
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
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold">Языки:</span> {member.languages}
                    </p>
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
