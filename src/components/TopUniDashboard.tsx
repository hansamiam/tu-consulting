import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Sparkles, GraduationCap, Award, ClipboardList,
  Bot, Loader2, Send, ArrowLeft,
  Plus, Trash2, PenTool, BarChart3, Search, ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import EssayTools from "@/components/topuni/EssayTools";
import AdmissionPredictor from "@/components/topuni/AdmissionPredictor";
import ScholarshipMatcher from "@/components/topuni/ScholarshipMatcher";

interface StudentProfile {
  fullName: string;
  email: string;
  whatsapp: string;
  gradeLevel: string;
  gpa: string;
  ielts: string;
  sat: string;
  targetCountries: string[];
  major: string;
  budget: string;
  scholarshipNeeded: string;
  timeline: string;
  prestige: number;
  scholarship: number;
  careerRoi: number;
  visaAccess: number;
  locationPref: number;
}

interface TopUniDashboardProps {
  profile: StudentProfile;
  language: "en" | "ru";
  onBack: () => void;
}

type Msg = { role: "user" | "assistant"; content: string };

interface TrackerItem {
  id: string;
  university: string;
  program: string;
  deadline: string;
  status: "not_started" | "in_progress" | "submitted" | "accepted" | "rejected";
  notes: string;
}

const PATHWAY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/topuni-ai-pathway`;
const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/topuni-chat`;

const TopUniDashboard = ({ profile, language, onBack }: TopUniDashboardProps) => {
  const isRu = language === "ru";
  const t = (en: string, ru: string) => isRu ? ru : en;
  const navigate = useNavigate();

  // Pathway state
  const [pathwayContent, setPathwayContent] = useState("");
  const [pathwayLoading, setPathwayLoading] = useState(false);
  const [pathwayGenerated, setPathwayGenerated] = useState(false);

  // Chat state
  const [chatMessages, setChatMessages] = useState<Msg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Application tracker state
  const [trackerItems, setTrackerItems] = useState<TrackerItem[]>(() => {
    try {
      const saved = localStorage.getItem("topuni-tracker");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem("topuni-tracker", JSON.stringify(trackerItems));
  }, [trackerItems]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Only generate pathway if profile is actually filled
  const isProfileFilled = profile.fullName && profile.fullName !== "Student" && profile.gpa && profile.targetCountries.length > 0;

  useEffect(() => {
    if (!pathwayGenerated && isProfileFilled) {
      generatePathway();
    }
  }, []);

  const streamSSE = async (url: string, body: any, onDelta: (chunk: string) => void, onDone: () => void) => {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok || !resp.body) {
      const errData = await resp.json().catch(() => ({}));
      onDelta(errData.error || "Something went wrong. Please try again.");
      onDone();
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let streamDone = false;

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") { streamDone = true; break; }
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    if (textBuffer.trim()) {
      for (let raw of textBuffer.split("\n")) {
        if (!raw) continue;
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        if (raw.startsWith(":") || raw.trim() === "") continue;
        if (!raw.startsWith("data: ")) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch { /* ignore */ }
      }
    }
    onDone();
  };

  const generatePathway = async () => {
    setPathwayLoading(true);
    setPathwayContent("");
    let soFar = "";

    await streamSSE(
      PATHWAY_URL,
      { profile, language },
      (chunk) => { soFar += chunk; setPathwayContent(soFar); },
      () => { setPathwayLoading(false); setPathwayGenerated(true); }
    );
  };

  const sendChatMessage = async (text: string) => {
    if (!text.trim() || chatLoading) return;
    const userMsg: Msg = { role: "user", content: text.trim() };
    const allMessages = [...chatMessages, userMsg];
    setChatMessages(allMessages);
    setChatInput("");
    setChatLoading(true);

    let assistantSoFar = "";
    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setChatMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    await streamSSE(
      CHAT_URL,
      { messages: allMessages, language },
      (chunk) => upsertAssistant(chunk),
      () => setChatLoading(false)
    );
  };

  // Tracker functions
  const addTrackerItem = () => {
    setTrackerItems(prev => [...prev, {
      id: crypto.randomUUID(),
      university: "",
      program: "",
      deadline: "",
      status: "not_started",
      notes: "",
    }]);
  };

  const updateTrackerItem = (id: string, updates: Partial<TrackerItem>) => {
    setTrackerItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const removeTrackerItem = (id: string) => {
    setTrackerItems(prev => prev.filter(item => item.id !== id));
  };

  const statusColors: Record<string, string> = {
    not_started: "bg-muted text-muted-foreground",
    in_progress: "bg-blue-500/10 text-blue-600 border-blue-500/30",
    submitted: "bg-accent/10 text-accent border-accent/30",
    accepted: "bg-green-500/10 text-green-600 border-green-500/30",
    rejected: "bg-destructive/10 text-destructive border-destructive/30",
  };

  const statusLabels: Record<string, { en: string; ru: string }> = {
    not_started: { en: "Not Started", ru: "Не начато" },
    in_progress: { en: "In Progress", ru: "В процессе" },
    submitted: { en: "Submitted", ru: "Подано" },
    accepted: { en: "Accepted", ru: "Принято" },
    rejected: { en: "Rejected", ru: "Отклонено" },
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> {t("Back", "Назад")}
          </button>
          <Badge className="bg-accent/10 text-accent border-accent/30">
            <Sparkles className="w-3 h-3 mr-1" /> {t("AI-Powered", "На базе AI")}
          </Badge>
        </div>
        <h1 className="text-3xl md:text-4xl font-heading font-bold text-foreground">
          {isProfileFilled
            ? t(`Welcome, ${profile.fullName.split(" ")[0]}`, `Добро пожаловать, ${profile.fullName.split(" ")[0]}`)
            : t("Your Dashboard", "Ваша панель")
          }
        </h1>
        <p className="text-muted-foreground mt-1">
          {t("Your personalized university pathway dashboard", "Ваша персональная панель планирования")}
        </p>
        {isProfileFilled && (
          <div className="flex flex-wrap gap-2 mt-3">
            {profile.targetCountries.map(c => (
              <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
            ))}
            {profile.major && <Badge variant="outline" className="text-xs">{profile.major}</Badge>}
            {profile.gpa && <Badge variant="outline" className="text-xs">GPA: {profile.gpa}</Badge>}
            {profile.ielts && <Badge variant="outline" className="text-xs">IELTS: {profile.ielts}</Badge>}
          </div>
        )}
        {/* Discover CTA — prominent next step */}
        <div className="mt-4 p-4 rounded-xl border border-accent/30 bg-accent/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-foreground">
              {t("See scholarships you can actually win", "Посмотрите стипендии, которые вы можете получить")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("Ranked against your profile — real cutoffs, real deadlines.", "Отранжированы по вашему профилю — реальные требования и дедлайны.")}
            </p>
          </div>
          <Button variant="gold" size="sm" className="gap-1.5 shrink-0" onClick={() => navigate(isRu ? "/discover/ru" : "/discover")}>
            <Search className="w-4 h-4" /> {t("Find my scholarships", "Найти стипендии")} <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </motion.div>

      {/* Dashboard Tabs */}
      <Tabs defaultValue={isProfileFilled ? "pathway" : "counselor"} className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
            <TabsTrigger value="counselor" className="flex items-center gap-1.5 text-xs sm:text-sm py-2 px-4 border-2 border-accent bg-accent/10 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground font-bold shadow-sm hover:shadow-md transition-all">
              <Bot className="w-4 h-4" /> TopUni AI
            </TabsTrigger>
            <TabsTrigger value="pathway" className="flex items-center gap-1.5 text-xs sm:text-sm py-2">
              <GraduationCap className="w-4 h-4" /> {t("Pathway", "Путь")}
            </TabsTrigger>
            <TabsTrigger value="predictor" className="flex items-center gap-1.5 text-xs sm:text-sm py-2">
              <BarChart3 className="w-4 h-4" /> {t("Chances", "Шансы")}
            </TabsTrigger>
            <TabsTrigger value="essays" className="flex items-center gap-1.5 text-xs sm:text-sm py-2">
              <PenTool className="w-4 h-4" /> {t("Essays", "Эссе")}
            </TabsTrigger>
            <TabsTrigger value="scholarships" className="flex items-center gap-1.5 text-xs sm:text-sm py-2">
              <Award className="w-4 h-4" /> {t("Scholarships", "Стипендии")}
            </TabsTrigger>
            <TabsTrigger value="tracker" className="flex items-center gap-1.5 text-xs sm:text-sm py-2">
              <ClipboardList className="w-4 h-4" /> {t("Tracker", "Трекер")}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* MY PATHWAY TAB */}
        <TabsContent value="pathway">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-accent" />
                {t("Your AI-Generated Pathway", "Ваш AI-сгенерированный путь")}
              </CardTitle>
              {pathwayGenerated && (
                <Button variant="outline" size="sm" onClick={generatePathway} disabled={pathwayLoading}>
                  {pathwayLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("Regenerate", "Обновить")}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {!isProfileFilled && !pathwayContent && (
                <div className="text-center py-12 space-y-4">
                  <GraduationCap className="w-10 h-10 mx-auto text-muted-foreground/40" />
                  <p className="text-muted-foreground text-sm">{t("Complete your profile to generate a personalized pathway.", "Заполните профиль для персонального плана.")}</p>
                  <Button variant="gold" onClick={onBack}>
                    <Sparkles className="w-4 h-4 mr-2" /> {t("Start Your Plan", "Начать план")}
                  </Button>
                </div>
              )}
              {pathwayLoading && !pathwayContent && (
                <div className="flex flex-col items-center justify-center py-16 space-y-4">
                  <Loader2 className="w-8 h-8 animate-spin text-accent" />
                  <p className="text-muted-foreground text-sm">{t("Analyzing your profile and matching universities...", "Анализируем ваш профиль и подбираем университеты...")}</p>
                </div>
              )}
              {pathwayContent && (
                <div className="prose prose-sm max-w-none dark:prose-invert [&_h2]:text-foreground [&_h2]:font-heading [&_h2]:text-xl [&_h2]:mt-8 [&_h2]:mb-3 [&_h3]:text-foreground [&_h3]:font-heading [&_h3]:text-lg [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:text-muted-foreground [&_li]:text-muted-foreground [&_strong]:text-foreground">
                  <ReactMarkdown>{pathwayContent}</ReactMarkdown>
                  {pathwayLoading && <span className="inline-block w-2 h-4 bg-accent animate-pulse ml-1" />}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ADMISSION PREDICTOR TAB */}
        <TabsContent value="predictor">
          {isProfileFilled ? (
            <AdmissionPredictor profile={profile} language={language} />
          ) : (
            <Card>
              <CardContent className="text-center py-12 space-y-4">
                <BarChart3 className="w-10 h-10 mx-auto text-muted-foreground/40" />
                <p className="text-muted-foreground text-sm">{t("Complete your profile to see admission predictions.", "Заполните профиль для прогнозов.")}</p>
                <Button variant="gold" onClick={onBack}>
                  <Sparkles className="w-4 h-4 mr-2" /> {t("Start Your Plan", "Начать план")}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ESSAY TOOLS TAB */}
        <TabsContent value="essays">
          <EssayTools profile={profile} language={language} />
        </TabsContent>

        {/* APPLICATION TRACKER TAB */}
        <TabsContent value="tracker">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-accent" />
                {t("Application Tracker", "Трекер заявок")}
              </CardTitle>
              <Button variant="gold" size="sm" onClick={addTrackerItem}>
                <Plus className="w-4 h-4 mr-1" /> {t("Add", "Добавить")}
              </Button>
            </CardHeader>
            <CardContent>
              {trackerItems.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <ClipboardList className="w-10 h-10 mx-auto text-muted-foreground/40" />
                  <p className="text-muted-foreground text-sm">{t("No applications tracked yet. Add your first one!", "Пока нет заявок. Добавьте первую!")}</p>
                  <Button variant="outline" size="sm" onClick={addTrackerItem}>
                    <Plus className="w-4 h-4 mr-1" /> {t("Add Application", "Добавить заявку")}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {trackerItems.map(item => (
                    <div key={item.id} className="border border-border rounded-lg p-4 space-y-3">
                      <div className="grid sm:grid-cols-2 gap-3">
                        <Input
                          placeholder={t("University name", "Название университета")}
                          value={item.university}
                          onChange={e => updateTrackerItem(item.id, { university: e.target.value })}
                          className="text-sm"
                        />
                        <Input
                          placeholder={t("Program", "Программа")}
                          value={item.program}
                          onChange={e => updateTrackerItem(item.id, { program: e.target.value })}
                          className="text-sm"
                        />
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <Input
                          type="date"
                          value={item.deadline}
                          onChange={e => updateTrackerItem(item.id, { deadline: e.target.value })}
                          className="text-sm w-auto"
                        />
                        <div className="flex gap-1.5 flex-wrap">
                          {Object.entries(statusLabels).map(([key, label]) => (
                            <button
                              key={key}
                              onClick={() => updateTrackerItem(item.id, { status: key as TrackerItem["status"] })}
                              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                                item.status === key ? statusColors[key] : "bg-background text-muted-foreground border-border hover:border-accent/30"
                              }`}
                            >
                              {isRu ? label.ru : label.en}
                            </button>
                          ))}
                        </div>
                        <button onClick={() => removeTrackerItem(item.id)} className="text-muted-foreground hover:text-destructive transition-colors ml-auto">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <Input
                        placeholder={t("Notes...", "Заметки...")}
                        value={item.notes}
                        onChange={e => updateTrackerItem(item.id, { notes: e.target.value })}
                        className="text-sm"
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SCHOLARSHIP MATCHER TAB */}
        <TabsContent value="scholarships" className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl border border-accent/30 bg-accent/5">
            <p className="text-sm text-foreground font-medium">
              {t("Browse our full ranked scholarship database", "Просмотрите полную базу стипендий")}
            </p>
            <Button variant="gold" size="sm" className="gap-1.5 shrink-0" onClick={() => navigate(isRu ? "/discover/ru" : "/discover")}>
              <Search className="w-4 h-4" /> {t("Open Discover", "Открыть Discover")}
            </Button>
          </div>
          <ScholarshipMatcher profile={profile} language={language} />
        </TabsContent>

        {/* AI COUNSELOR TAB */}
        <TabsContent value="counselor">
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="shrink-0">
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-accent" />
                {t("AI Counselor", "AI Советник")}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {t("Your personal admissions counselor. Ask anything about universities, scholarships, applications, or strategy.",
                   "Ваш личный консультант по поступлению. Спросите о университетах, стипендиях, заявках или стратегии.")}
              </p>
            </CardHeader>
            <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-6 space-y-3">
              {chatMessages.length === 0 && (
                <div className="space-y-3 pt-4">
                  <div className="bg-accent/10 rounded-lg p-3 text-sm text-muted-foreground">
                    <p className="font-semibold text-foreground mb-1">
                      {isProfileFilled
                        ? (isRu ? `👋 Привет, ${profile.fullName.split(" ")[0]}! Я ваш AI-советник.` : `👋 Hi ${profile.fullName.split(" ")[0]}! I'm your AI counselor.`)
                        : (isRu ? "👋 Привет! Я ваш AI-советник по поступлению." : "👋 Hi! I'm your AI admissions counselor.")
                      }
                    </p>
                    <p>{isRu ? "Задайте любой вопрос о поступлении, стипендиях или планировании." : "Ask me anything about admissions, scholarships, or study planning."}</p>
                  </div>

                  {!isProfileFilled && (
                    <div className="bg-accent/5 border border-accent/20 rounded-lg p-4 space-y-3">
                      <p className="text-sm text-foreground font-medium">
                        {t("💡 Want personalized advice?", "💡 Хотите персональные советы?")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("Complete your profile for tailored university matches, admission predictions, and more.", "Заполните профиль для персональных рекомендаций.")}
                      </p>
                      <Button variant="gold" size="sm" onClick={onBack}>
                        <Sparkles className="w-4 h-4 mr-1" /> {t("Start Your Plan", "Начать план")}
                      </Button>
                    </div>
                  )}

                  <div className="grid sm:grid-cols-2 gap-2">
                    {[
                      t("What are my chances at my top choice?", "Каковы мои шансы в топ-выборе?"),
                      t("Help me write my personal statement", "Помогите с мотивационным письмом"),
                      t("What scholarships should I apply to?", "На какие стипендии подать?"),
                      t("Create a study plan for IELTS", "Составьте план подготовки к IELTS"),
                    ].map((q, i) => (
                      <button key={i} onClick={() => sendChatMessage(q)}
                        className="text-left text-xs px-3 py-2 rounded-md border border-border hover:border-accent/50 hover:bg-accent/5 text-muted-foreground transition-colors">
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    msg.role === "user" ? "bg-accent text-accent-foreground" : "bg-muted text-foreground"
                  }`}>
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : msg.content}
                  </div>
                </div>
              ))}
              {chatLoading && chatMessages[chatMessages.length - 1]?.role === "user" && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-3 py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-accent" />
                  </div>
                </div>
              )}
            </div>
            <div className="border-t border-border p-4 shrink-0">
              <form onSubmit={(e) => { e.preventDefault(); sendChatMessage(chatInput); }} className="flex gap-2">
                <Input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder={isRu ? "Спросите о поступлении..." : "Ask about admissions..."}
                  className="text-sm"
                  disabled={chatLoading}
                />
                <Button type="submit" size="icon" variant="gold" disabled={chatLoading || !chatInput.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
};

export default TopUniDashboard;
