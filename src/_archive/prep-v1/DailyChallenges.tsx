import { useState, useMemo } from "react";
import { usePrep } from "@/contexts/PrepContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Zap, Flame, Target, Clock, CheckCircle2, Circle,
  Swords, Star, TrendingUp, Calendar, Gift, Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Challenge {
  id: string;
  title: string;
  titleRu: string;
  description: string;
  descriptionRu: string;
  xpReward: number;
  type: "daily" | "weekly" | "special";
  icon: React.ElementType;
  requirement: (state: any) => { current: number; target: number };
  action?: string; // route to navigate
}

const DailyChallenges = () => {
  const navigate = useNavigate();
  const {
    xp, streak, language, practiceSessions, mockExamResults,
    essaysSubmitted, totalStudyMinutes, completedToday,
    dailyChallengesClaimed, claimChallenge, addXP,
  } = usePrep();

  const t = (en: string, ru: string) => language === "ru" ? ru : en;
  const today = new Date().toDateString();

  // Generate deterministic daily challenges based on date
  const daySeed = new Date().getDate() + new Date().getMonth() * 31;

  const challenges: Challenge[] = useMemo(() => [
    // Daily
    { id: `daily-practice-${today}`, title: "Practice Makes Perfect", titleRu: "Практика — сила", description: "Complete 1 practice session today", descriptionRu: "Завершите 1 практику сегодня", xpReward: 30, type: "daily", icon: Target, requirement: () => {
      const todaySessions = practiceSessions.filter(s => s.date === today).length;
      return { current: Math.min(todaySessions, 1), target: 1 };
    }, action: "/prep/practice" },
    { id: `daily-study-${today}`, title: "Study Session", titleRu: "Учебная сессия", description: "Study for at least 15 minutes", descriptionRu: "Учитесь минимум 15 минут", xpReward: 25, type: "daily", icon: Clock, requirement: () => {
      const todayMins = practiceSessions.filter(s => s.date === today).reduce((sum, s) => sum + (s.duration || 0), 0);
      return { current: Math.min(todayMins, 15), target: 15 };
    }, action: "/prep/practice" },
    { id: `daily-streak-${today}`, title: "Keep the Fire", titleRu: "Не гаси огонь", description: "Maintain your study streak", descriptionRu: "Сохраните свою серию", xpReward: 20, type: "daily", icon: Flame, requirement: () => ({ current: completedToday ? 1 : 0, target: 1 }), action: "/prep/practice" },

    // Weekly  
    { id: `weekly-sessions-${Math.floor(Date.now() / (7*86400000))}`, title: "Weekly Warrior", titleRu: "Недельный воин", description: "Complete 5 practice sessions this week", descriptionRu: "5 практик за неделю", xpReward: 100, type: "weekly", icon: Swords, requirement: () => {
      const weekAgo = Date.now() - 7 * 86400000;
      const count = practiceSessions.filter(s => new Date(s.date).getTime() > weekAgo).length;
      return { current: Math.min(count, 5), target: 5 };
    }, action: "/prep/practice" },
    { id: `weekly-mock-${Math.floor(Date.now() / (7*86400000))}`, title: "Mock Master", titleRu: "Мастер пробных", description: "Complete 1 full mock exam this week", descriptionRu: "1 пробный экзамен за неделю", xpReward: 75, type: "weekly", icon: Star, requirement: () => {
      const weekAgo = Date.now() - 7 * 86400000;
      const count = mockExamResults.filter(m => new Date(m.date).getTime() > weekAgo).length;
      return { current: Math.min(count, 1), target: 1 };
    }, action: "/prep/mock-exam" },
    { id: `weekly-essay-${Math.floor(Date.now() / (7*86400000))}`, title: "Wordcraft", titleRu: "Мастерство слова", description: "Submit 2 essays this week", descriptionRu: "2 эссе за неделю", xpReward: 80, type: "weekly", icon: TrendingUp, requirement: () => ({ current: Math.min(essaysSubmitted, 2), target: 2 }), action: "/prep/essay-grader" },

    // Special rotating
    { id: `special-streak5-${Math.floor(daySeed / 3)}`, title: "🔥 Fire Starter", titleRu: "🔥 Разжигатель", description: "Reach a 5-day streak", descriptionRu: "Серия 5 дней", xpReward: 200, type: "special", icon: Sparkles, requirement: () => ({ current: Math.min(streak, 5), target: 5 }) },
  ], [today, practiceSessions, mockExamResults, essaysSubmitted, streak, completedToday, daySeed]);

  const handleClaim = (challenge: Challenge) => {
    const { current, target } = challenge.requirement(null);
    if (current < target) {
      toast.error(t("Challenge not completed yet!", "Задание ещё не выполнено!"));
      return;
    }
    if (dailyChallengesClaimed.includes(challenge.id)) {
      toast.info(t("Already claimed!", "Уже получено!"));
      return;
    }
    claimChallenge(challenge.id, challenge.xpReward);
    toast.success(t(`+${challenge.xpReward} XP earned!`, `+${challenge.xpReward} XP заработано!`));
  };

  // Streak multiplier
  const multiplier = streak >= 30 ? 3 : streak >= 14 ? 2.5 : streak >= 7 ? 2 : streak >= 3 ? 1.5 : 1;

  const typeOrder = { daily: 0, weekly: 1, special: 2 };
  const sorted = [...challenges].sort((a, b) => typeOrder[a.type] - typeOrder[b.type]);

  const typeBadge = { daily: "bg-green-500/15 text-green-500", weekly: "bg-blue-500/15 text-blue-500", special: "bg-amber-500/15 text-amber-500" };
  const typeLabel = { daily: t("Daily", "Ежедневное"), weekly: t("Weekly", "Недельное"), special: t("Special", "Особое") };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
          <Swords className="h-7 w-7 text-accent" />
          {t("Daily Challenges", "Ежедневные задания")}
        </h2>
        <p className="text-muted-foreground text-sm">{t("Complete challenges to earn bonus XP!", "Выполняйте задания для бонусного XP!")}</p>
      </motion.div>

      {/* Streak Multiplier */}
      {multiplier > 1 && (
        <Card className="border-orange-500/30 bg-gradient-to-r from-orange-500/5 to-transparent">
          <CardContent className="p-4 flex items-center gap-3">
            <Flame className="h-8 w-8 text-orange-500" />
            <div>
              <p className="font-bold text-foreground">{t("Streak Bonus Active!", "Бонус серии активен!")} 🔥</p>
              <p className="text-sm text-muted-foreground">
                {t(`${streak}-day streak = ${multiplier}x XP multiplier on all challenges!`, 
                   `Серия ${streak} дней = ${multiplier}x множитель XP!`)}
              </p>
            </div>
            <Badge className="ml-auto bg-orange-500/15 text-orange-500 border-orange-500/30 text-lg font-bold">
              {multiplier}x
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* Challenge Cards */}
      <div className="space-y-3">
        {sorted.map((challenge, i) => {
          const { current, target } = challenge.requirement(null);
          const completed = current >= target;
          const claimed = dailyChallengesClaimed.includes(challenge.id);
          const effectiveReward = Math.round(challenge.xpReward * multiplier);

          return (
            <motion.div key={challenge.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}>
              <Card className={`transition-all ${claimed ? "opacity-50" : completed ? "border-green-500/30 shadow-sm shadow-green-500/10" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-xl ${completed ? "bg-green-500/10" : "bg-muted"}`}>
                      {completed ? <CheckCircle2 className="h-6 w-6 text-green-500" /> : <challenge.icon className="h-6 w-6 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-semibold text-foreground text-sm">{language === "ru" ? challenge.titleRu : challenge.title}</p>
                        <Badge variant="outline" className={`text-[10px] ${typeBadge[challenge.type]}`}>
                          {typeLabel[challenge.type]}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{language === "ru" ? challenge.descriptionRu : challenge.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Progress value={(current / target) * 100} className="h-1.5 flex-1" />
                        <span className="text-xs text-muted-foreground font-mono">{current}/{target}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="flex items-center gap-1 text-sm font-bold text-accent">
                        <Zap className="h-3.5 w-3.5" /> +{effectiveReward}
                        {multiplier > 1 && <span className="text-[10px] text-orange-500">({multiplier}x)</span>}
                      </span>
                      {claimed ? (
                        <Badge className="bg-muted text-muted-foreground text-xs">{t("Claimed", "Получено")} ✓</Badge>
                      ) : completed ? (
                        <Button size="sm" onClick={() => handleClaim(challenge)} className="bg-green-500 hover:bg-green-600 text-white text-xs gap-1">
                          <Gift className="h-3 w-3" /> {t("Claim", "Забрать")}
                        </Button>
                      ) : challenge.action ? (
                        <Button size="sm" variant="outline" onClick={() => navigate(challenge.action!)} className="text-xs">
                          {t("Go", "Начать")} →
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Info */}
      <Card className="bg-muted/30">
        <CardContent className="p-4 text-center space-y-1">
          <Calendar className="h-6 w-6 mx-auto text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">{t("Daily challenges reset at midnight. Weekly challenges reset every Monday.", "Ежедневные задания обновляются в полночь. Недельные — каждый понедельник.")}</p>
          <p className="text-xs text-muted-foreground/70">{t("Build streaks to earn XP multipliers: 3d=1.5x, 7d=2x, 14d=2.5x, 30d=3x", "Серия = множитель: 3д=1.5x, 7д=2x, 14д=2.5x, 30д=3x")}</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DailyChallenges;
