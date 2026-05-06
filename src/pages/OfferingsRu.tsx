import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, Star, ArrowLeft, Info } from "lucide-react";
import Navigation from "@/components/Navigation";
import { useToast } from "@/hooks/use-toast";
import { PaymentDialog } from "@/components/PaymentDialog";
import { Footer } from "@/components/Footer";
import heroCampus from "@/assets/hero-campus.jpg";
import heroLibrary from "@/assets/hero-library.jpg";
import yaleCampus from "@/assets/yale-campus.jpg";

const OfferingsRu = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    currentGrade: "",
    targetUniversities: "",
    intendedMajor: "",
    currentChallenges: "",
    goals: "",
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState<{name: string; price: string}>({name: "", price: ""});
  // Multi-session package state retired — see Offerings.tsx comment.

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      toast({
        title: "Необходимые поля не заполнены",
        description: "Пожалуйста, укажите ваше имя и email",
        variant: "destructive",
      });
      return;
    }

    // Close form dialog and open payment dialog
    setIsDialogOpen(false);
    setIsPaymentDialogOpen(true);
  };

  // handlePackageFormSubmit retired alongside the dead packages flow.



  const packageBackgrounds = [heroCampus, heroLibrary, yaleCampus];

  const consultations = [
    {
      name: "Бесплатная консультация",
      price: "Бесплатно",
      duration: "20 минут",
      description: "Идеально для первого разговора и вопросов",
      features: [
        "Узнать о вашем опыте",
        "Обсудить ваши цели",
        "Изучить варианты пакетов",
      ],
    },
    {
      name: "Стратегическая консультация",
      price: "$58",
      duration: "50 минут",
      description: "Расширенная сессия для обсуждения вашего пути",
      features: [
        "Комплексное обсуждение",
        "Первичная оценка",
        "Рекомендации по пакетам",
        "Вопросы и ответы",
      ],
    },
  ];

  return (
    <div 
      className="min-h-screen relative"
      style={{
        backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.9)), url(${heroCampus})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <Navigation language="ru" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-12">
        {/* Hero Section */}
        <div className="text-center mb-8 md:mb-16 animate-fade-in">
          <div className="inline-block px-3 py-1.5 md:px-4 md:py-2 bg-accent/10 border border-accent/20 rounded-full mb-3 md:mb-4">
            <p className="text-accent font-semibold text-xs md:text-sm uppercase tracking-wide">Специальное предложение запуска</p>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-gold via-accent to-primary bg-clip-text text-transparent mb-3 md:mb-4 px-2">
            Наши услуги
          </h1>
          <p className="text-sm md:text-lg text-muted-foreground max-w-2xl mx-auto mb-2 px-4">
            Начните с бесплатной консультации. Без давления, без апселла.
          </p>
        </div>


        <section className="mb-12 md:mb-20 animate-fade-in">
          <div className="text-center mb-6 md:mb-12">
            <h2 className="font-heading text-xl sm:text-2xl md:text-3xl font-bold mb-3 md:mb-4 text-foreground px-4">
              Записаться на консультацию
            </h2>
            <p className="text-muted-foreground text-sm md:text-lg px-4">
              Начните бесплатно. Углубитесь со Стратегической консультацией, если захотите.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-4 md:gap-8 max-w-4xl mx-auto">
            {consultations.map((consultation, index) => (
              <Card key={index} className="border-border">
                <CardHeader className="pb-4 md:pb-6">
                  <CardTitle className="text-lg md:text-xl">{consultation.name}</CardTitle>
                  <div className="pt-1 md:pt-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl md:text-3xl font-bold text-accent">{consultation.price}</span>
                      <span className="text-sm md:text-base text-muted-foreground">/ {consultation.duration}</span>
                    </div>
                  </div>
                  <CardDescription className="pt-1 md:pt-2 text-xs md:text-sm">{consultation.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 md:space-y-4">
                  <ul className="space-y-1.5 md:space-y-2">
                    {consultation.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="text-accent flex-shrink-0 mt-0.5" size={16} />
                        <span className="text-xs md:text-sm text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant="outline"
                    className="w-full border-accent/30"
                    onClick={() => {
                      setSelectedConsultation({name: consultation.name, price: consultation.price});
                      setIsDialogOpen(true);
                    }}
                  >
                    Забронировать
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">Забронируйте вашу {selectedConsultation.name}</DialogTitle>
              <DialogDescription className="text-base">
                Помогите нам подготовиться к вашей сессии. Чем больше деталей вы предоставите, тем больше пользы вы получите от консультации.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleFormSubmit} className="space-y-6 mt-4">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Полное имя *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Иван Иванов"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="ivan@example.com"
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="phone">Телефон</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+7123456789"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentGrade">Текущий класс/курс</Label>
                  <Input
                    id="currentGrade"
                    name="currentGrade"
                    value={formData.currentGrade}
                    onChange={handleInputChange}
                    placeholder="например, 11 класс"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetUniversities">Целевые университеты</Label>
                <Textarea
                  id="targetUniversities"
                  name="targetUniversities"
                  value={formData.targetUniversities}
                  onChange={handleInputChange}
                  placeholder="Перечислите университеты, которые вас интересуют..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="intendedMajor">Планируемая специальность</Label>
                <Input
                  id="intendedMajor"
                  name="intendedMajor"
                  value={formData.intendedMajor}
                  onChange={handleInputChange}
                  placeholder="например, Компьютерные науки, Бизнес"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currentChallenges">Текущие трудности</Label>
                <Textarea
                  id="currentChallenges"
                  name="currentChallenges"
                  value={formData.currentChallenges}
                  onChange={handleInputChange}
                  placeholder="Какие основные проблемы или трудности у вас с процессом подачи документов?"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="goals">Чего вы хотите достичь от этой консультации?</Label>
                <Textarea
                  id="goals"
                  name="goals"
                  value={formData.goals}
                  onChange={handleInputChange}
                  placeholder="Будьте конкретны в том, что вы хотите получить от нашей сессии..."
                  rows={4}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="submit"
                  variant="gold"
                  className="flex-1"
                >
                  Продолжить к оплате
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Consultation Payment Dialog */}
        <PaymentDialog
          open={isPaymentDialogOpen}
          onOpenChange={setIsPaymentDialogOpen}
          consultationType={selectedConsultation.name}
          price={selectedConsultation.price}
          language="ru"
          isConsultation={true}
        />


        {/* Trust Section */}
        <section className="mt-20 text-center">
          <div className="max-w-2xl mx-auto space-y-4">
            <p className="text-muted-foreground">
              🎓 Все консультации проводятся консультантами из топовых университетов, включая Yale, Harvard, Cambridge и Tsinghua
            </p>
            <p className="text-muted-foreground">
              🌍 Доступно на русском и английском языках
            </p>
          </div>
        </section>

        {/* Footer */}
        <section className="mt-12 pb-8">
          <Footer language="ru" variant="light" />
        </section>
      </main>
    </div>
  );
};

export default OfferingsRu;
