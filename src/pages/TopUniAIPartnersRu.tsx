import { useState } from "react";
import { motion } from "framer-motion";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import topuniBg from "@/assets/topuni-bg.jpg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Users, Filter, Globe, BarChart3, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const TopUniAIPartnersRu = () => {
  const { toast } = useToast();
  const [institutionName, setInstitutionName] = useState("");
  const [region, setRegion] = useState("");
  const [contact, setContact] = useState("");
  
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    toast({ title: "Запрос отправлен", description: "Мы свяжемся с вами в течение 48 часов." });
  };

  const benefits = [
    { icon: <Users className="w-6 h-6" />, title: "Проверенные академические профили", desc: "Студенты оцениваются по GPA, результатам тестов и готовности до подбора." },
    { icon: <Filter className="w-6 h-6" />, title: "Фильтрация по бюджету", desc: "Подбор студентов, чьи финансовые возможности соответствуют вашей структуре оплаты." },
    { icon: <BarChart3 className="w-6 h-6" />, title: "Подбор по стипендиям", desc: "Связь со студентами, активно ищущими финансирование в вашем вузе." },
    { icon: <Globe className="w-6 h-6" />, title: "Доступ к региональному рынку", desc: "Видимость среди амбициозных студентов Кыргызстана, Казахстана и Узбекистана." },
  ];

  return (
    <div className="min-h-screen bg-background relative">
      <div className="fixed inset-0 z-0 opacity-20" style={{ backgroundImage: `url(${topuniBg})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(2px)' }} />
      <div className="relative z-10">
      <Navigation language="ru" />
      <div className="bg-primary text-primary-foreground text-center py-2 text-sm font-medium tracking-wide">
        <Sparkles className="inline-block w-4 h-4 mr-2 text-accent" />Скоро запуск — Прототип раннего доступа<Sparkles className="inline-block w-4 h-4 ml-2 text-accent" />
      </div>

      <div className="max-w-5xl mx-auto px-4 py-16 space-y-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-3xl mx-auto space-y-4">
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-foreground">Станьте партнёром TopUni AI как <span className="text-accent">спонсор путей</span></h1>
          <p className="text-lg text-muted-foreground leading-relaxed">Мы связываем предварительно отобранных, профилированных студентов из Центральной Азии с подходящими учебными заведениями по всему миру.</p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {benefits.map((b, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className="h-full border-border/50 hover:border-accent/30 transition-colors">
                <CardContent className="p-6 flex gap-4">
                  <div className="text-accent shrink-0 mt-1">{b.icon}</div>
                  <div><h3 className="font-heading font-semibold text-foreground mb-1">{b.title}</h3><p className="text-sm text-muted-foreground">{b.desc}</p></div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="max-w-xl mx-auto">
          <Card className="border-accent/20">
            <CardContent className="p-8">
              {submitted ? (
                <div className="text-center py-8 space-y-4">
                  <CheckCircle2 className="w-12 h-12 text-accent mx-auto" />
                  <h3 className="text-xl font-heading font-bold text-foreground">Спасибо за ваш интерес</h3>
                  <p className="text-muted-foreground">Наша команда по партнёрствам свяжется с вами в течение 48 часов.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <h3 className="text-xl font-heading font-bold text-foreground">Запросить обсуждение партнёрства</h3>
                  <div className="space-y-2"><Label>Название учреждения *</Label><Input required value={institutionName} onChange={e => setInstitutionName(e.target.value)} placeholder="напр. University of Example" /></div>
                  <div className="space-y-2"><Label>Регион *</Label><Input required value={region} onChange={e => setRegion(e.target.value)} placeholder="напр. Великобритания" /></div>
                  <div className="space-y-2"><Label>Email приёмной комиссии *</Label><Input required type="email" value={contact} onChange={e => setContact(e.target.value)} placeholder="admissions@university.edu" /></div>
                  <div className="space-y-2"><Label>Сообщение</Label><Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Расскажите о вашем учреждении и целях..." rows={4} /></div>
                  <Button type="submit" variant="gold" size="lg" className="w-full">Запросить обсуждение партнёрства</Button>
                </form>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
      <Footer language="ru" />
      </div>
    </div>
  );
};

export default TopUniAIPartnersRu;
