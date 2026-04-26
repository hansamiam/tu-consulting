import { useMemo } from "react";
import { usePrep } from "@/contexts/PrepContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  FileBarChart, TrendingUp, TrendingDown, Minus, Zap, Flame,
  Clock, Target, Brain, Trophy, Calendar, BarChart3, Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

const ProgressReport = () => {
  const {
    language, xp, streak, level, practiceSessions, mockExamResults,
    diagnosticResults, totalStudyMinutes, essaysSubmitted,
    skillProfile, unlockedAchievements, achievements,
  } = usePrep();

  const t = (en: string, ru: string) => language === "ru" ? ru : en;
  const now = Date.now();
  const weekAgo = now - 7 * 86400000;
  const twoWeeksAgo = now - 14 * 86400000;

  // This week vs last week
  const thisWeekSessions = practiceSessions.filter(s => new Date(s.date).getTime() > weekAgo);
  const lastWeekSessions = practiceSessions.filter(s => { const t = new Date(s.date).getTime(); return t > twoWeeksAgo && t <= weekAgo; });

  const thisWeekXP = thisWeekSessions.reduce((sum, s) => sum + s.xpEarned, 0);
  const lastWeekXP = lastWeekSessions.reduce((sum, s) => sum + s.xpEarned, 0);
  const xpTrend = lastWeekXP > 0 ? ((thisWeekXP - lastWeekXP) / lastWeekXP * 100).toFixed(0) : thisWeekXP > 0 ? "+∞" : "0";

  const thisWeekAvgScore = thisWeekSessions.length > 0 ? Math.round(thisWeekSessions.reduce((sum, s) => sum + (s.score / s.maxScore) * 100, 0) / thisWeekSessions.length) : 0;
  const lastWeekAvgScore = lastWeekSessions.length > 0 ? Math.round(lastWeekSessions.reduce((sum, s) => sum + (s.score / s.maxScore) * 100, 0) / lastWeekSessions.length) : 0;

  const thisWeekMins = thisWeekSessions.reduce((sum, s) => sum + (s.duration || 0), 0);

  // Daily activity for chart
  const dailyData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now - i * 86400000);
      const dateStr = date.toDateString();
      const dayLabel = date.toLocaleDateString(language === "ru" ? "ru-RU" : "en-US", { weekday: "short" });
      const sessions = practiceSessions.filter(s => s.date === dateStr);
      days.push({
        day: dayLabel,
        sessions: sessions.length,
        xp: sessions.reduce((sum, s) => sum + s.xpEarned, 0),
        minutes: sessions.reduce((sum, s) => sum + (s.duration || 0), 0),
      });
    }
    return days;
  }, [practiceSessions, now, language]);

  // Module breakdown for pie chart
  const moduleBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    thisWeekSessions.forEach(s => { counts[s.module] = (counts[s.module] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [thisWeekSessions]);

  const COLORS = ["hsl(var(--accent))", "#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444", "#6366f1"];

  // Skill improvements
  const skillChanges = useMemo(() => {
    return Object.entries(skillProfile).map(([section, data]) => ({
      section,
      level: data.level,
      attempts: data.totalAttempts,
    })).sort((a, b) => b.level - a.level);
  }, [skillProfile]);

  // Score trend over time
  const scoreTrend = useMemo(() => {
    return practiceSessions.slice(-20).map((s, i) => ({
      session: i + 1,
      score: Math.round((s.score / s.maxScore) * 100),
    }));
  }, [practiceSessions]);

  const TrendIcon = Number(xpTrend) > 0 ? TrendingUp : Number(xpTrend) < 0 ? TrendingDown : Minus;
  const trendColor = Number(xpTrend) > 0 ? "text-green-500" : Number(xpTrend) < 0 ? "text-destructive" : "text-muted-foreground";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
          <FileBarChart className="h-7 w-7 text-accent" />
          {t("Weekly Progress Report", "Недельный отчёт")}
        </h2>
        <p className="text-muted-foreground text-sm">{t("Your performance this week at a glance", "Ваша успеваемость за неделю")}</p>
      </motion.div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Zap className="h-5 w-5 mx-auto text-accent mb-1" />
            <p className="text-2xl font-bold text-foreground">{thisWeekXP}</p>
            <p className="text-xs text-muted-foreground">{t("XP This Week", "XP за неделю")}</p>
            <div className={`flex items-center justify-center gap-1 mt-1 text-xs ${trendColor}`}>
              <TrendIcon className="h-3 w-3" /> {xpTrend}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Target className="h-5 w-5 mx-auto text-blue-500 mb-1" />
            <p className="text-2xl font-bold text-foreground">{thisWeekSessions.length}</p>
            <p className="text-xs text-muted-foreground">{t("Sessions", "Сессий")}</p>
            <p className="text-[10px] text-muted-foreground/70">{t(`vs ${lastWeekSessions.length} last week`, `vs ${lastWeekSessions.length} прошлая`)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-5 w-5 mx-auto text-purple-500 mb-1" />
            <p className="text-2xl font-bold text-foreground">{thisWeekMins}m</p>
            <p className="text-xs text-muted-foreground">{t("Study Time", "Время учёбы")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Brain className="h-5 w-5 mx-auto text-green-500 mb-1" />
            <p className="text-2xl font-bold text-foreground">{thisWeekAvgScore}%</p>
            <p className="text-xs text-muted-foreground">{t("Avg Score", "Ср. балл")}</p>
            <p className="text-[10px] text-muted-foreground/70">{t(`vs ${lastWeekAvgScore}% last week`, `vs ${lastWeekAvgScore}% прошлая`)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Activity Chart */}
      <Card>
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-accent" /> {t("Daily Activity", "Активность по дням")}
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }} />
              <Bar dataKey="xp" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} name="XP" />
              <Bar dataKey="minutes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name={t("Minutes", "Минуты")} opacity={0.5} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Score Trend + Module Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {scoreTrend.length > 2 && (
          <Card>
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" /> {t("Score Trend", "Тренд баллов")}
              </h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={scoreTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="session" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }} />
                  <Line type="monotone" dataKey="score" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {moduleBreakdown.length > 0 && (
          <Card>
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" /> {t("Module Focus", "Фокус модулей")}
              </h3>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={moduleBreakdown} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={5} dataKey="value">
                    {moduleBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 mt-2 justify-center">
                {moduleBreakdown.map((m, i) => (
                  <Badge key={m.name} variant="outline" className="text-[10px]">
                    <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    {m.name}-({m.value})
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Skill Levels */}
      {skillChanges.length > 0 && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Brain className="h-4 w-4 text-accent" /> {t("Skill Proficiency", "Уровень навыков")}
            </h3>
            {skillChanges.map(s => (
              <div key={s.section} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{s.section}</span>
                  <span className="text-muted-foreground text-xs">{s.level}% · {s.attempts} {t("attempts", "попыток")}</span>
                </div>
                <Progress value={s.level} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Overall Summary */}
      <Card className="border-accent/20 bg-accent/5">
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-accent" /> {t("Overall Progress", "Общий прогресс")}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center text-sm">
            <div><p className="text-xl font-bold text-accent">{xp}</p><p className="text-xs text-muted-foreground">{t("Total XP", "Всего XP")}</p></div>
            <div><p className="text-xl font-bold text-foreground">{t("Lvl", "Ур.")} {level}</p><p className="text-xs text-muted-foreground">{t("Level", "Уровень")}</p></div>
            <div><p className="text-xl font-bold text-foreground">{streak}</p><p className="text-xs text-muted-foreground">{t("Day Streak", "Дн. серия")}</p></div>
            <div><p className="text-xl font-bold text-foreground">{Math.round(totalStudyMinutes / 60)}h</p><p className="text-xs text-muted-foreground">{t("Total Study", "Всего учёбы")}</p></div>
            <div><p className="text-xl font-bold text-foreground">{unlockedAchievements.length}/{achievements.length}</p><p className="text-xs text-muted-foreground">{t("Achievements", "Достижения")}</p></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProgressReport;
