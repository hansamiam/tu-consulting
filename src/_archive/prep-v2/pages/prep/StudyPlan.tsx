import { usePrep } from "@/contexts/PrepContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Target, BookOpen, CheckCircle2, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const StudyPlan = () => {
  const {
    language, targetExam, targetScore, examDate,
    setTargetExam, setTargetScore, setExamDate, diagnosticResults,
  } = usePrep();
  const navigate = useNavigate();
  const t = (en: string, ru: string) => language === "ru" ? ru : en;

  const [localExam, setLocalExam] = useState<"ielts" | "sat" | "both">(targetExam || "ielts");
  const [localScore, setLocalScore] = useState(targetScore?.toString() || "");
  const [localDate, setLocalDate] = useState(examDate || "");

  const hasPlan = targetExam && examDate;

  const saveGoal = () => {
    setTargetExam(localExam as any);
    if (localScore) setTargetScore(parseFloat(localScore));
    if (localDate) setExamDate(localDate);
  };

  // Generate weekly plan based on diagnostic weaknesses and exam date
  const weeksUntilExam = examDate ? Math.max(1, Math.ceil((new Date(examDate).getTime() - Date.now()) / (7 * 24 * 60 * 60 * 1000))) : 8;
  const weakSections = diagnosticResults
    .filter(r => (r.score / r.maxScore) < 0.6)
    .map(r => r.section);

  const generateWeekPlan = (weekNum: number) => {
    const isIELTS = targetExam === "ielts" || targetExam === "both";
    const isSAT = targetExam === "sat" || targetExam === "both";

    const tasks: { task: string; module: string; duration: string }[] = [];

    if (weekNum <= 2) {
      tasks.push({ task: t("Complete diagnostic assessment", "Пройти диагностику"), module: "Diagnostic", duration: "30 min" });
      tasks.push({ task: t("Review fundamentals", "Повторить основы"), module: "Reading", duration: "45 min" });
    }

    if (isIELTS) {
      if (weakSections.includes("Writing") || weekNum % 2 === 0)
        tasks.push({ task: t("Practice IELTS Writing Task 2", "Практика IELTS Writing Task 2"), module: "Writing", duration: "45 min" });
      if (weakSections.includes("Speaking") || weekNum % 3 === 0)
        tasks.push({ task: t("Speaking simulation (2 topics)", "Симуляция говорения (2 темы)"), module: "Speaking", duration: "20 min" });
      tasks.push({ task: t("Vocabulary: learn 20 new words", "Словарь: выучить 20 новых слов"), module: "Vocabulary", duration: "30 min" });
      if (weekNum > 2)
        tasks.push({ task: t("Reading comprehension practice", "Практика понимания текста"), module: "Reading", duration: "40 min" });
    }

    if (isSAT) {
      tasks.push({ task: t("SAT Math drill set", "Набор задач SAT Math"), module: "SAT Math", duration: "45 min" });
      if (weekNum > 1)
        tasks.push({ task: t("SAT Reading passage practice", "Практика SAT чтения"), module: "Reading", duration: "40 min" });
    }

    tasks.push({ task: t("AI Tutor: ask 3 questions", "AI Репетитор: задать 3 вопроса"), module: "AI Tutor", duration: "15 min" });

    return tasks;
  };

  const weeks = Array.from({ length: Math.min(weeksUntilExam, 8) }, (_, i) => i + 1);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-heading font-bold flex items-center gap-2">
          <Calendar className="h-6 w-6 text-accent" /> {t("Study Plan", "План обучения")}
        </h2>
        <p className="text-muted-foreground">{t("Your personalized weekly roadmap", "Ваш персональный план по неделям")}</p>
      </div>

      {/* Goal Setting */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Target className="h-5 w-5" /> {t("Set Your Goal", "Установите цель")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{t("Exam", "Экзамен")}</Label>
              <Select value={localExam} onValueChange={(v) => setLocalExam(v as "ielts" | "sat" | "both")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ielts">IELTS</SelectItem>
                  <SelectItem value="sat">SAT</SelectItem>
                  <SelectItem value="both">{t("Both", "Оба")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("Target Score", "Целевой балл")}</Label>
              <Input type="number" step="0.5" value={localScore} onChange={e => setLocalScore(e.target.value)} placeholder={localExam === "sat" ? "1400" : "7.0"} />
            </div>
            <div className="space-y-2">
              <Label>{t("Exam Date", "Дата экзамена")}</Label>
              <Input type="date" value={localDate} onChange={e => setLocalDate(e.target.value)} min={new Date().toISOString().split("T")[0]} />
            </div>
          </div>
          <Button onClick={saveGoal} className="bg-accent text-accent-foreground hover:bg-accent/90">
            {t("Save Goal", "Сохранить цель")}
          </Button>
        </CardContent>
      </Card>

      {/* Diagnostic prompt */}
      {diagnosticResults.length === 0 && (
        <Card className="border-accent/20 bg-accent/5">
          <CardContent className="p-4 flex items-center justify-between">
            <p className="text-sm">{t("Take a diagnostic first to personalize your plan", "Сначала пройдите диагностику для персонализации плана")}</p>
            <Button variant="outline" size="sm" onClick={() => navigate("/prep/diagnostic")}>{t("Take Diagnostic", "Пройти тест")}</Button>
          </CardContent>
        </Card>
      )}

      {/* Weekly Plan */}
      {hasPlan && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-semibold text-lg">{t("Weekly Roadmap", "План по неделям")}</h3>
            <Badge variant="secondary">{weeksUntilExam} {t("weeks to exam", "нед. до экзамена")}</Badge>
          </div>

          {weeks.map((week, i) => {
            const tasks = generateWeekPlan(week);
            const isCurrent = week === 1;
            return (
              <motion.div key={week} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className={isCurrent ? "border-accent/30 shadow-md" : ""}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{t("Week", "Неделя")} {week} {isCurrent && <Badge className="ml-2 bg-accent text-accent-foreground">{t("Current", "Текущая")}</Badge>}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {tasks.map((task, j) => (
                        <div key={j} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{task.task}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">{task.duration}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudyPlan;
