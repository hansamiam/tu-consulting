import { usePrep } from "@/contexts/PrepContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, Target, AlertTriangle, Award } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line } from "recharts";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

const Analytics = () => {
  const { language, diagnosticResults, practiceSessions, xp, streak, targetExam, targetScore } = usePrep();
  const t = (en: string, ru: string) => language === "ru" ? ru : en;

  // University requirement connection
  const [uniRequirements, setUniRequirements] = useState<any[]>([]);

  useEffect(() => {
    const fetchRequirements = async () => {
      const { data } = await supabase
        .from("admission_requirements")
        .select("*, programs(program_name, degree_level, universities(university_name, country, global_ranking))")
        .eq("ielts_required", true)
        .order("ielts_score_min", { ascending: true })
        .limit(10);
      if (data) setUniRequirements(data);
    };
    fetchRequirements();
  }, []);

  // Build section performance data from diagnostics
  const sectionData = diagnosticResults.reduce((acc, r) => {
    const existing = acc.find(a => a.section === r.section);
    if (existing) { existing.score = r.score; existing.maxScore = r.maxScore; }
    else acc.push({ section: r.section, score: r.score, maxScore: r.maxScore });
    return acc;
  }, [] as { section: string; score: number; maxScore: number }[]);

  // Practice timeline
  const sessionsByDate = practiceSessions.reduce((acc, s) => {
    const date = new Date(s.date).toLocaleDateString();
    const existing = acc.find(a => a.date === date);
    if (existing) { existing.sessions++; existing.xp += s.xpEarned; }
    else acc.push({ date, sessions: 1, xp: s.xpEarned });
    return acc;
  }, [] as { date: string; sessions: number; xp: number }[]);

  // Module performance
  const moduleStats = practiceSessions.reduce((acc, s) => {
    const existing = acc.find(a => a.module === s.module);
    if (existing) {
      existing.total++;
      existing.totalScore += s.score;
      existing.totalMax += s.maxScore;
    } else {
      acc.push({ module: s.module, total: 1, totalScore: s.score, totalMax: s.maxScore });
    }
    return acc;
  }, [] as { module: string; total: number; totalScore: number; totalMax: number }[]);

  // Predicted score
  const avgPerformance = sectionData.length > 0
    ? sectionData.reduce((sum, s) => sum + (s.score / s.maxScore), 0) / sectionData.length
    : 0;

  const predictedIELTS = avgPerformance >= 0.9 ? "7.5-8.0" : avgPerformance >= 0.75 ? "6.5-7.0" : avgPerformance >= 0.6 ? "5.5-6.0" : avgPerformance >= 0.4 ? "4.5-5.0" : "—";
  const predictedSAT = avgPerformance >= 0.9 ? "1400+" : avgPerformance >= 0.75 ? "1200-1400" : avgPerformance >= 0.6 ? "1000-1200" : avgPerformance >= 0.4 ? "800-1000" : "—";

  // Weaknesses
  const weakSections = sectionData.filter(s => (s.score / s.maxScore) < 0.6).map(s => s.section);

  const isEmpty = diagnosticResults.length === 0 && practiceSessions.length === 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-heading font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-accent" /> {t("Performance Analytics", "Аналитика")}
        </h2>
        <p className="text-muted-foreground">{t("Track your progress and identify areas to improve", "Отслеживайте прогресс и выявляйте области для улучшения")}</p>
      </div>

      {isEmpty ? (
        <Card className="border-accent/20 bg-accent/5">
          <CardContent className="p-8 text-center space-y-3">
            <BarChart3 className="h-12 w-12 text-accent mx-auto" />
            <p className="font-semibold">{t("No data yet", "Пока нет данных")}</p>
            <p className="text-sm text-muted-foreground">{t("Complete a diagnostic or practice session to see your analytics.", "Пройдите диагностику или практику для отображения аналитики.")}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Predicted Score & Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-accent/20">
              <CardContent className="p-5 text-center">
                <TrendingUp className="h-6 w-6 text-accent mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">{t("Predicted IELTS", "Прогноз IELTS")}</p>
                <p className="text-2xl font-bold text-accent">{predictedIELTS}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 text-center">
                <Target className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">{t("Predicted SAT", "Прогноз SAT")}</p>
                <p className="text-2xl font-bold text-blue-500">{predictedSAT}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 text-center">
                <Award className="h-6 w-6 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">{t("Total Sessions", "Всего сессий")}</p>
                <p className="text-2xl font-bold text-green-500">{practiceSessions.length}</p>
              </CardContent>
            </Card>
          </div>

          {/* Weaknesses */}
          {weakSections.length > 0 && (
            <Card className="border-orange-500/20">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="font-medium">{t("Areas to improve", "Области для улучшения")}</p>
                  <div className="flex gap-2 mt-1">{weakSections.map(s => <Badge key={s} variant="secondary">{s}</Badge>)}</div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section Performance Chart */}
          {sectionData.length > 0 && (
            <Card>
              <CardHeader><CardTitle>{t("Section Performance", "Результаты по разделам")}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={sectionData.map(s => ({ name: s.section, score: Math.round((s.score / s.maxScore) * 100) }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="score" fill="hsl(46, 64%, 52%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Activity Timeline */}
          {sessionsByDate.length > 0 && (
            <Card>
              <CardHeader><CardTitle>{t("Activity Timeline", "Хронология активности")}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={sessionsByDate}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" fontSize={11} />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="xp" stroke="hsl(46, 64%, 52%)" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* University Requirements Connection */}
          {uniRequirements.length > 0 && (
            <Card className="border-accent/20">
              <CardHeader>
                <CardTitle>{t("University Score Requirements", "Требования университетов")}</CardTitle>
                <CardDescription>{t("Based on your level, see what universities you can target", "На основе вашего уровня — какие университеты вам подходят")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {uniRequirements.slice(0, 5).map((req: any) => {
                    const uni = req.programs?.universities;
                    const program = req.programs;
                    if (!uni) return null;
                    const ieltsMin = req.ielts_score_min;
                    const reachable = avgPerformance * 9 >= (ieltsMin || 0);
                    return (
                      <div key={req.requirement_id} className={`flex items-center justify-between p-3 rounded-lg border ${reachable ? "border-green-500/30 bg-green-500/5" : "border-border"}`}>
                        <div>
                          <p className="font-medium text-sm">{uni.university_name}</p>
                          <p className="text-xs text-muted-foreground">{program?.program_name} — {uni.country}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant={reachable ? "default" : "secondary"} className={reachable ? "bg-green-500" : ""}>
                            IELTS {ieltsMin}+
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {reachable ? t("✓ Reachable", "✓ Достижимо") : t("↑ Keep improving", "↑ Продолжайте")}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default Analytics;
