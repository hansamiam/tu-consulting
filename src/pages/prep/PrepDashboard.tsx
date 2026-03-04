import { usePrep } from "@/contexts/PrepContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ClipboardCheck, BookOpen, Bot, BarChart3, Zap, Flame,
  Target, Calendar, Trophy, ArrowRight, CheckCircle2,
} from "lucide-react";
import { motion } from "framer-motion";

const PrepDashboard = () => {
  const navigate = useNavigate();
  const {
    xp, streak, targetExam, targetScore, examDate,
    diagnosticResults, practiceSessions, completedToday, language,
  } = usePrep();

  const t = (en: string, ru: string) => language === "ru" ? ru : en;
  const level = Math.floor(xp / 100) + 1;
  const xpProgress = (xp % 100);
  const totalSessions = practiceSessions.length;
  const hasDiagnostic = diagnosticResults.length > 0;

  const quickActions = [
    { icon: ClipboardCheck, label: t("Take Diagnostic", "Пройти тест"), path: "/prep/diagnostic", color: "text-blue-500", desc: t("Assess your level", "Оцените свой уровень") },
    { icon: BookOpen, label: t("Practice", "Практика"), path: "/prep/practice", color: "text-green-500", desc: t("Start a module", "Начать модуль") },
    { icon: Bot, label: t("AI Tutor", "AI Репетитор"), path: "/prep/tutor", color: "text-purple-500", desc: t("Ask anything", "Задайте вопрос") },
    { icon: BarChart3, label: t("Analytics", "Аналитика"), path: "/prep/analytics", color: "text-accent", desc: t("Track progress", "Отслеживайте прогресс") },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Welcome */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
        <h2 className="text-2xl font-heading font-bold text-foreground">
          {t("Welcome to TopUni Prep", "Добро пожаловать в TopUni Prep")} 👋
        </h2>
        <p className="text-muted-foreground">
          {completedToday
            ? t("Great job! You've practiced today.", "Отлично! Вы уже позанимались сегодня.")
            : t("Ready to study? Let's build your skills.", "Готовы заниматься? Давайте улучшим ваши навыки.")}
        </p>
      </motion.div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-accent/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10"><Zap className="h-5 w-5 text-accent" /></div>
            <div><p className="text-2xl font-bold text-foreground">{xp}</p><p className="text-xs text-muted-foreground">XP {t("Points", "Очки")}</p></div>
          </CardContent>
        </Card>
        <Card className="border-orange-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10"><Flame className="h-5 w-5 text-orange-500" /></div>
            <div><p className="text-2xl font-bold text-foreground">{streak}</p><p className="text-xs text-muted-foreground">{t("Day Streak", "Дн. подряд")}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10"><Trophy className="h-5 w-5 text-blue-500" /></div>
            <div><p className="text-2xl font-bold text-foreground">{t("Lvl", "Ур.")} {level}</p><p className="text-xs text-muted-foreground">{xpProgress}/100 XP</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10"><CheckCircle2 className="h-5 w-5 text-green-500" /></div>
            <div><p className="text-2xl font-bold text-foreground">{totalSessions}</p><p className="text-xs text-muted-foreground">{t("Sessions", "Сессий")}</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Level progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">{t("Level", "Уровень")} {level}</span>
            <span className="text-xs text-muted-foreground">{xpProgress}/100 XP</span>
          </div>
          <Progress value={xpProgress} className="h-2" />
        </CardContent>
      </Card>

      {/* Setup prompt if no target */}
      {!targetExam && (
        <Card className="border-accent/30 bg-accent/5">
          <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Target className="h-8 w-8 text-accent" />
              <div>
                <p className="font-semibold text-foreground">{t("Set your goal", "Установите цель")}</p>
                <p className="text-sm text-muted-foreground">{t("Take a diagnostic to personalize your plan.", "Пройдите диагностику для персонального плана.")}</p>
              </div>
            </div>
            <Button onClick={() => navigate("/prep/diagnostic")} className="bg-accent text-accent-foreground hover:bg-accent/90">
              {t("Start Diagnostic", "Начать диагностику")} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Target info */}
      {targetExam && (
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-accent" />
              <span className="font-medium">{t("Target", "Цель")}: {targetExam.toUpperCase()} {targetScore && `— ${targetScore}`}</span>
            </div>
            {examDate && (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" /> {new Date(examDate).toLocaleDateString()}
              </span>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action, i) => (
          <motion.div key={action.path} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className="cursor-pointer hover:shadow-md transition-shadow group" onClick={() => navigate(action.path)}>
              <CardContent className="p-5 text-center space-y-2">
                <action.icon className={`h-8 w-8 mx-auto ${action.color} group-hover:scale-110 transition-transform`} />
                <p className="font-semibold text-foreground">{action.label}</p>
                <p className="text-xs text-muted-foreground">{action.desc}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default PrepDashboard;
