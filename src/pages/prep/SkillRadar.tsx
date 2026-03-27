import { useMemo } from "react";
import { usePrep } from "@/contexts/PrepContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Tooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { motion } from "framer-motion";
import {
  Brain, TrendingUp, Target, Calendar, Activity, Flame,
  Zap, ArrowUpRight, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const SECTIONS = ["Reading", "Writing", "Listening", "Speaking", "Grammar", "Vocabulary", "Math"];

const SpacedReview = () => {
  const navigate = useNavigate();
  const {
    language, skillProfile, practiceSessions, diagnosticResults,
    mockExamResults, totalStudyMinutes, streak, xp,
  } = usePrep();
  const t = (en: string, ru: string) => language === "ru" ? ru : en;

  // ── Radar Data ──
  const radarData = useMemo(() =>
    SECTIONS.map(s => ({
      section: s,
      level: skillProfile[s]?.level ?? 0,
      fullMark: 100,
    })), [skillProfile]);

  // ── Score Prediction Timeline ──
  const predictionTimeline = useMemo(() => {
    const sorted = [...practiceSessions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (sorted.length < 2) return [];

    const points: { date: string; score: number; lower: number; upper: number }[] = [];
    let runningAvg = 0;
    let count = 0;

    sorted.forEach((s, i) => {
      const pct = (s.score / s.maxScore) * 100;
      count++;
      runningAvg = runningAvg + (pct - runningAvg) / count;

      if (i % Math.max(1, Math.floor(sorted.length / 15)) === 0 || i === sorted.length - 1) {
        const variance = Math.max(5, 20 - count * 0.5);
        points.push({
          date: new Date(s.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
          score: Math.round(runningAvg),
          lower: Math.round(Math.max(0, runningAvg - variance)),
          upper: Math.round(Math.min(100, runningAvg + variance)),
        });
      }
    });
    return points;
  }, [practiceSessions]);

  // ── Study Heatmap (last 12 weeks) ──
  const heatmapData = useMemo(() => {
    const weeks: { date: Date; count: number; minutes: number }[][] = [];
    const today = new Date();

    for (let w = 11; w >= 0; w--) {
      const week: { date: Date; count: number; minutes: number }[] = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(today);
        date.setDate(today.getDate() - (w * 7 + (6 - d)));
        const dayStr = date.toDateString();
        const sessions = practiceSessions.filter(s => new Date(s.date).toDateString() === dayStr);
        week.push({
          date,
          count: sessions.length,
          minutes: sessions.reduce((sum, s) => sum + s.duration, 0),
        });
      }
      weeks.push(week);
    }
    return weeks;
  }, [practiceSessions]);

  // ── Predicted Scores ──
  const avgLevel = useMemo(() => {
    const levels = SECTIONS.map(s => skillProfile[s]?.level ?? 0).filter(l => l > 0);
    return levels.length > 0 ? levels.reduce((a, b) => a + b, 0) / levels.length : 0;
  }, [skillProfile]);

  const ieltsEstimate = avgLevel >= 90 ? "8.0-9.0" : avgLevel >= 75 ? "7.0-7.5" : avgLevel >= 60 ? "6.0-6.5" : avgLevel >= 45 ? "5.0-5.5" : avgLevel >= 30 ? "4.0-4.5" : "—";
  const satEstimate = avgLevel >= 90 ? "1500+" : avgLevel >= 75 ? "1350-1500" : avgLevel >= 60 ? "1200-1350" : avgLevel >= 45 ? "1050-1200" : avgLevel >= 30 ? "900-1050" : "—";

  // ── Sub-skill breakdown ──
  const subSkillData = useMemo(() => {
    const data: { section: string; subSkill: string; level: number }[] = [];
    Object.entries(skillProfile).forEach(([section, profile]) => {
      Object.entries(profile.subSkills).forEach(([subSkill, level]) => {
        data.push({ section, subSkill, level });
      });
    });
    return data.sort((a, b) => a.level - b.level);
  }, [skillProfile]);

  const weakest = subSkillData.slice(0, 5);
  const strongest = subSkillData.slice(-5).reverse();

  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];

  const isEmpty = practiceSessions.length === 0 && Object.keys(skillProfile).length === 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
        <h2 className="text-2xl font-heading font-bold flex items-center gap-2">
          <Activity className="h-6 w-6 text-accent" />
          {t("Skill Radar & Deep Analytics", "Радар навыков и глубокая аналитика")}
        </h2>
        <p className="text-muted-foreground">
          {t("Comprehensive performance analysis with predictive scoring", "Комплексный анализ результатов с прогнозом оценок")}
        </p>
      </motion.div>

      {isEmpty ? (
        <Card className="border-accent/20 bg-accent/5">
          <CardContent className="p-8 text-center space-y-3">
            <Brain className="h-12 w-12 text-accent mx-auto" />
            <p className="font-semibold">{t("Start practicing to build your skill map", "Начните практику для построения карты навыков")}</p>
            <Button onClick={() => navigate("/prep/practice")} className="bg-accent text-accent-foreground">
              {t("Go to Practice", "К практике")} <ArrowUpRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="border-accent/20">
              <CardContent className="p-4 text-center">
                <Target className="h-5 w-5 text-accent mx-auto mb-1" />
                <p className="text-lg font-bold text-accent">{ieltsEstimate}</p>
                <p className="text-xs text-muted-foreground">{t("IELTS Estimate", "Оценка IELTS")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-5 w-5 text-blue-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-blue-500">{satEstimate}</p>
                <p className="text-xs text-muted-foreground">{t("SAT Estimate", "Оценка SAT")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Clock className="h-5 w-5 text-green-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-green-500">{Math.round(totalStudyMinutes / 60)}h</p>
                <p className="text-xs text-muted-foreground">{t("Study Time", "Время учёбы")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Flame className="h-5 w-5 text-orange-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-orange-500">{mockExamResults.length}</p>
                <p className="text-xs text-muted-foreground">{t("Mock Exams", "Пробные")}</p>
              </CardContent>
            </Card>
          </div>

          {/* Radar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-accent" />
                {t("Skill Radar", "Радар навыков")}
              </CardTitle>
              <CardDescription>{t("Your proficiency across all sections", "Ваш уровень по всем разделам")}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="section" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Radar name="Level" dataKey="level" stroke="hsl(46, 64%, 52%)" fill="hsl(46, 64%, 52%)" fillOpacity={0.3} strokeWidth={2} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Score Prediction Timeline */}
          {predictionTimeline.length > 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-accent" />
                  {t("Score Trajectory", "Траектория оценки")}
                </CardTitle>
                <CardDescription>{t("Performance trend with confidence interval", "Тренд результатов с доверительным интервалом")}</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={predictionTimeline}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                    <YAxis domain={[0, 100]} fontSize={11} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip />
                    <Area type="monotone" dataKey="upper" stroke="none" fill="hsl(46, 64%, 52%)" fillOpacity={0.1} />
                    <Area type="monotone" dataKey="lower" stroke="none" fill="hsl(var(--background))" fillOpacity={1} />
                    <Area type="monotone" dataKey="score" stroke="hsl(46, 64%, 52%)" fill="hsl(46, 64%, 52%)" fillOpacity={0.2} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Study Heatmap */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-accent" />
                {t("Study Heatmap", "Тепловая карта учёбы")}
              </CardTitle>
              <CardDescription>{t("Last 12 weeks of activity", "Активность за 12 недель")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {dayLabels.map((day, dayIdx) => (
                  <div key={dayIdx} className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground w-4">{day}</span>
                    {heatmapData.map((week, weekIdx) => {
                      const cell = week[dayIdx];
                      if (!cell) return <div key={weekIdx} className="w-3 h-3" />;
                      const intensity = cell.count === 0 ? 0 : cell.count === 1 ? 1 : cell.count <= 3 ? 2 : 3;
                      const colors = [
                        "bg-muted/40",
                        "bg-accent/30",
                        "bg-accent/60",
                        "bg-accent",
                      ];
                      return (
                        <div
                          key={weekIdx}
                          className={`w-3 h-3 rounded-sm ${colors[intensity]} transition-colors`}
                          title={`${cell.date.toLocaleDateString()}: ${cell.count} sessions, ${cell.minutes} min`}
                        />
                      );
                    })}
                  </div>
                ))}
                <div className="flex items-center gap-1 ml-5 mt-2">
                  <span className="text-[10px] text-muted-foreground">{t("Less", "Меньше")}</span>
                  <div className="w-3 h-3 rounded-sm bg-muted/40" />
                  <div className="w-3 h-3 rounded-sm bg-accent/30" />
                  <div className="w-3 h-3 rounded-sm bg-accent/60" />
                  <div className="w-3 h-3 rounded-sm bg-accent" />
                  <span className="text-[10px] text-muted-foreground">{t("More", "Больше")}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Strongest & Weakest Sub-skills */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {weakest.length > 0 && (
              <Card className="border-orange-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-orange-500">{t("⚠️ Weakest Sub-skills", "⚠️ Слабые стороны")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {weakest.map((s, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="text-muted-foreground">{s.section} → </span>
                        <span className="font-medium">{s.subSkill}</span>
                      </div>
                      <Badge variant="secondary" className={s.level < 40 ? "bg-destructive/10 text-destructive" : ""}>
                        {s.level}%
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
            {strongest.length > 0 && (
              <Card className="border-green-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-green-500">{t("💪 Strongest Sub-skills", "💪 Сильные стороны")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {strongest.map((s, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="text-muted-foreground">{s.section} → </span>
                        <span className="font-medium">{s.subSkill}</span>
                      </div>
                      <Badge variant="secondary" className={s.level >= 70 ? "bg-green-500/10 text-green-600" : ""}>
                        {s.level}%
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default SpacedReview;
