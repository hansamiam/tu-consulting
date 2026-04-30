// Prep dashboard — minimalist 4-tool layout. No XP-store/leaderboard/etc clutter.
import { usePrep } from "@/contexts/PrepContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ClipboardCheck, BookOpen, Bot, Zap, Flame,
  Target, Calendar, ArrowRight, PenTool, Compass,
} from "lucide-react";
import { motion } from "framer-motion";

const PrepDashboard = () => {
  const navigate = useNavigate();
  const {
    xp, streak, targetExam, targetScore, examDate,
    diagnosticResults, practiceSessions, language,
    level, xpToNextLevel,
  } = usePrep();

  const t = (en: string, ru: string) => language === "ru" ? ru : en;
  const totalSessions = practiceSessions.length;
  const hasDiagnostic = diagnosticResults.length > 0;

  const tools = [
    {
      icon: ClipboardCheck,
      label: t("Diagnostic & Plan", "Диагностика и план"),
      desc: t("15-min test → personalized study plan", "15 мин → персональный план"),
      path: "/prep/diagnostic",
      primary: !hasDiagnostic,
    },
    {
      icon: BookOpen,
      label: t("Practice", "Практика"),
      desc: t("Adaptive drills with vocab & flashcards built in", "Адаптивные задания со словарём"),
      path: "/prep/practice",
    },
    {
      icon: PenTool,
      label: t("Essay Grader", "Оценка эссе"),
      desc: t("AI band-score with rubric breakdown", "Оценка по критериям"),
      path: "/prep/essay-grader",
    },
    {
      icon: Bot,
      label: t("AI Tutor", "AI Репетитор"),
      desc: t("Ask anything · explains every wrong answer", "Объяснит любой ответ"),
      path: "/prep/tutor",
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Welcome */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
        <h2 className="text-2xl font-heading font-bold text-foreground">
          {t("TopUni Prep", "TopUni Prep")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("Four focused tools. No fluff.", "Четыре инструмента. Ничего лишнего.")}
        </p>
      </motion.div>

      {/* Compact stats strip */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/5 border border-accent/15">
          <Zap className="h-4 w-4 text-accent" />
          <span className="text-sm font-medium">{xp} XP · {t("Lvl", "Ур.")} {level}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500/5 border border-orange-500/15">
          <Flame className="h-4 w-4 text-orange-500" />
          <span className="text-sm font-medium">{streak} {t("day streak", "дн. подряд")}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border">
          <span className="text-sm text-muted-foreground">{totalSessions} {t("sessions", "сессий")}</span>
        </div>
        {targetExam && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border">
            <Target className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{targetExam.toUpperCase()} {targetScore && `→ ${targetScore}`}</span>
            {examDate && <Calendar className="h-3.5 w-3.5 text-muted-foreground" />}
          </div>
        )}
      </div>

      {/* Level progress (subtle) */}
      <div>
        <div className="flex items-center justify-between mb-1.5 text-xs text-muted-foreground">
          <span>{t("Level", "Уровень")} {level}</span>
          <span>{100 - xpToNextLevel}/100 XP</span>
        </div>
        <Progress value={100 - xpToNextLevel} className="h-1.5" />
      </div>

      {/* Setup prompt */}
      {!hasDiagnostic && (
        <Card className="border-accent/30 bg-accent/5">
          <CardContent className="p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Target className="h-7 w-7 text-accent shrink-0" />
              <div>
                <p className="font-semibold text-foreground">{t("Start with the Diagnostic", "Начните с диагностики")}</p>
                <p className="text-sm text-muted-foreground">{t("15 minutes → your personalized study plan.", "15 минут → ваш план обучения.")}</p>
              </div>
            </div>
            <Button onClick={() => navigate("/prep/diagnostic")} className="bg-accent text-accent-foreground hover:bg-accent/90 shrink-0">
              {t("Start", "Начать")} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 4 tools */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tools.map((tool, i) => (
          <motion.div
            key={tool.path}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card
              className={`cursor-pointer transition-all hover:border-accent/40 hover:shadow-md group h-full ${
                tool.primary ? "border-accent/40 bg-accent/[0.03]" : ""
              }`}
              onClick={() => navigate(tool.path)}
            >
              <CardContent className="p-5 flex items-start gap-4">
                <div className="h-11 w-11 rounded-xl bg-accent/10 flex items-center justify-center shrink-0 group-hover:bg-accent/15 transition-colors">
                  <tool.icon className="h-5 w-5 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground mb-1">{tool.label}</p>
                  <p className="text-sm text-muted-foreground leading-snug">{tool.desc}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-accent group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Funnel back to Discover */}
      <Card className="border-border bg-gradient-to-r from-accent/5 to-transparent">
        <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Compass className="h-6 w-6 text-accent shrink-0" />
            <div>
              <p className="font-semibold text-foreground">{t("Know what score you actually need?", "Знаете, какой балл нужен?")}</p>
              <p className="text-sm text-muted-foreground">{t("Find your matched scholarships and their cutoffs first.", "Сначала найдите подходящие стипендии и их пороги.")}</p>
            </div>
          </div>
          <Button onClick={() => navigate("/discover")} variant="outline" className="shrink-0">
            {t("Open Discover", "Открыть Discover")} <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrepDashboard;
