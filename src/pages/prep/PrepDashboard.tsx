import { usePrep } from "@/contexts/PrepContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardCheck, BookOpen, Bot, BarChart3, Zap, Flame,
  Target, Calendar, Trophy, ArrowRight, CheckCircle2, FileText,
  ArrowUpRight, Sparkles, Brain, PenTool, Activity, Languages, Calculator, BookMarked, FileEdit,
  ShoppingBag, Swords, Users,
} from "lucide-react";
import { motion } from "framer-motion";

const PrepDashboard = () => {
  const navigate = useNavigate();
  const {
    xp, streak, targetExam, targetScore, examDate,
    diagnosticResults, practiceSessions, completedToday, language,
    level, xpToNextLevel, unlockedAchievements, achievements,
    mockExamResults, skillProfile, totalStudyMinutes, essaysSubmitted,
  } = usePrep();

  const t = (en: string, ru: string) => language === "ru" ? ru : en;
  const totalSessions = practiceSessions.length;
  const hasDiagnostic = diagnosticResults.length > 0;

  const recentAchievements = achievements
    .filter(a => unlockedAchievements.includes(a.id))
    .slice(-3);

  const quickActions = [
    { icon: ClipboardCheck, label: t("Diagnostic", "Диагностика"), path: "/prep/diagnostic", color: "text-blue-500", desc: t("Assess your level", "Оцените уровень") },
    { icon: BookOpen, label: t("Practice", "Практика"), path: "/prep/practice", color: "text-green-500", desc: t("110+ questions", "110+ вопросов") },
    { icon: FileText, label: t("Mock Exam", "Пробный"), path: "/prep/mock-exam", color: "text-purple-500", desc: t("Full simulation", "Полная симуляция") },
    { icon: Bot, label: t("AI Tutor", "AI Репетитор"), path: "/prep/tutor", color: "text-accent", desc: t("Ask anything", "Задайте вопрос") },
    { icon: Brain, label: t("Spaced Review", "Интервал"), path: "/prep/spaced-review", color: "text-cyan-500", desc: t("SM-2 algorithm", "Алгоритм SM-2") },
    { icon: PenTool, label: t("Essay Grader", "Оценка эссе"), path: "/prep/essay-grader", color: "text-pink-500", desc: t("4-criteria rubric", "4 критерия") },
    { icon: Activity, label: t("Skill Radar", "Радар"), path: "/prep/skill-radar", color: "text-orange-500", desc: t("Deep analytics", "Глубокая аналитика") },
    { icon: Languages, label: t("IELTS Flashcards", "IELTS Карточки"), path: "/prep/ielts-flashcards", color: "text-emerald-500", desc: t("30 academic words", "30 акад. слов") },
    { icon: FileEdit, label: t("Writing Templates", "Шаблоны"), path: "/prep/writing-templates", color: "text-rose-500", desc: t("Task 1 & 2", "Task 1 и 2") },
    { icon: BookMarked, label: t("SAT Vocabulary", "SAT Словарь"), path: "/prep/sat-words", color: "text-violet-500", desc: t("40 SAT words", "40 SAT слов") },
    { icon: Calculator, label: t("Formula Sheet", "Формулы"), path: "/prep/formula-sheet", color: "text-amber-500", desc: t("35+ formulas", "35+ формул") },
    { icon: ShoppingBag, label: t("XP Store", "Магазин XP"), path: "/prep/xp-store", color: "text-accent", desc: t("Spend XP on rewards", "Трать XP на награды") },
    { icon: Swords, label: t("Challenges", "Задания"), path: "/prep/challenges", color: "text-red-500", desc: t("Bonus XP missions", "Бонусные миссии") },
    { icon: Users, label: t("Leaderboard", "Рейтинг"), path: "/prep/leaderboard", color: "text-indigo-500", desc: t("Compete & climb", "Соревнуйтесь") },
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
            : t("Ready to study? Let's build your skills.", "Готовы заниматься?")}
        </p>
      </motion.div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="border-accent/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10"><Zap className="h-5 w-5 text-accent" /></div>
            <div><p className="text-2xl font-bold text-foreground">{xp}</p><p className="text-xs text-muted-foreground">XP</p></div>
          </CardContent>
        </Card>
        <Card className="border-orange-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10"><Flame className="h-5 w-5 text-orange-500" /></div>
            <div><p className="text-2xl font-bold text-foreground">{streak}</p><p className="text-xs text-muted-foreground">{t("Streak", "Дн.")}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10"><Trophy className="h-5 w-5 text-blue-500" /></div>
            <div><p className="text-2xl font-bold text-foreground">{t("Lvl", "Ур.")} {level}</p><p className="text-xs text-muted-foreground">{100 - xpToNextLevel}/100</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10"><CheckCircle2 className="h-5 w-5 text-green-500" /></div>
            <div><p className="text-2xl font-bold text-foreground">{totalSessions}</p><p className="text-xs text-muted-foreground">{t("Sessions", "Сессий")}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10"><FileText className="h-5 w-5 text-purple-500" /></div>
            <div><p className="text-2xl font-bold text-foreground">{mockExamResults.length}</p><p className="text-xs text-muted-foreground">{t("Mock Exams", "Пробные")}</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Level progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">{t("Level", "Уровень")} {level}</span>
            <span className="text-xs text-muted-foreground">{100 - xpToNextLevel}/100 XP</span>
          </div>
          <Progress value={100 - xpToNextLevel} className="h-2" />
        </CardContent>
      </Card>

      {/* Recent achievements */}
      {recentAchievements.length > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">{t("Recent:", "Последние:")}</span>
          <div className="flex gap-2 flex-1 overflow-x-auto">
            {recentAchievements.map(a => (
              <Badge key={a.id} variant="outline" className="border-accent/30 text-accent shrink-0 gap-1">
                {a.icon} {language === "ru" ? a.nameRu : a.name}
              </Badge>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/prep/achievements")} className="text-accent text-xs shrink-0">
            {unlockedAchievements.length}/{achievements.length} →
          </Button>
        </div>
      )}

      {/* Setup prompt if no target */}
      {!targetExam && (
        <Card className="border-accent/30 bg-accent/5">
          <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Target className="h-8 w-8 text-accent" />
              <div>
                <p className="font-semibold text-foreground">{t("Set your goal", "Установите цель")}</p>
                <p className="text-sm text-muted-foreground">{t("Take a diagnostic to personalize your plan.", "Пройдите диагностику.")}</p>
              </div>
            </div>
            <Button onClick={() => navigate("/prep/diagnostic")} className="bg-accent text-accent-foreground hover:bg-accent/90">
              {t("Start Diagnostic", "Начать")} <ArrowRight className="ml-2 h-4 w-4" />
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Service Funnel CTA */}
      <Card className="border-accent/20 bg-gradient-to-r from-accent/5 to-transparent">
        <CardContent className="p-5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-accent shrink-0" />
            <div>
              <p className="font-semibold text-foreground">{t("Ready for expert guidance?", "Готовы к экспертной помощи?")}</p>
              <p className="text-sm text-muted-foreground">{t("Book a free consultation with our IELTS/SAT specialists for a personalized strategy.", "Запишитесь на бесплатную консультацию к нашим специалистам IELTS/SAT.")}</p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" onClick={() => navigate("/offerings")} className="gap-1">
              {t("View Plans", "Тарифы")} <ArrowUpRight className="h-3 w-3" />
            </Button>
            <Button onClick={() => navigate("/discover")} className="bg-accent text-accent-foreground gap-1">
              {t("Find Universities", "Найти вузы")} <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrepDashboard;
