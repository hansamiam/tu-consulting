import { useState, useMemo, useEffect, useRef } from "react";
import { usePrep } from "@/contexts/PrepContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, CheckCircle2, Clock, AlertTriangle, Trophy, RotateCcw, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getMockExamQuestions, BankQuestion } from "@/data/questionBank";

const MockExam = () => {
  const navigate = useNavigate();
  const { language, addXP, updateStreak, addMockExamResult, addStudyMinutes, updateSkillProfile } = usePrep();
  const t = (en: string, ru: string) => language === "ru" ? ru : en;

  const [examType, setExamType] = useState<"ielts" | "sat" | null>(null);
  const [started, setStarted] = useState(false);
  const [sectionIdx, setSectionIdx] = useState(0);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [sectionResults, setSectionResults] = useState<{ section: string; score: number; maxScore: number }[]>([]);
  const [currentCorrect, setCurrentCorrect] = useState(0);
  const [finished, setFinished] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  const sections = useMemo(() => examType ? getMockExamQuestions(examType) : [], [examType]);
  const currentSection = sections[sectionIdx];
  const currentQ = currentSection?.questions[questionIdx];
  
  const totalQuestions = sections.reduce((sum, s) => sum + s.questions.length, 0);
  const answeredSoFar = sections.slice(0, sectionIdx).reduce((sum, s) => sum + s.questions.length, 0) + questionIdx + (showAnswer ? 1 : 0);

  useEffect(() => {
    if (started && !finished) {
      startTimeRef.current = Date.now() - timeElapsed * 1000;
      timerRef.current = setInterval(() => {
        setTimeElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [started, finished]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const handleCheck = () => {
    if (selected === null || !currentQ) return;
    setShowAnswer(true);
    const isCorrect = selected === currentQ.correct;
    if (isCorrect) setCurrentCorrect(c => c + 1);
    updateSkillProfile(currentQ.section, currentQ.subSkill, isCorrect);
  };

  const handleNext = () => {
    setSelected(null);
    setShowAnswer(false);

    if (questionIdx < (currentSection?.questions.length || 0) - 1) {
      setQuestionIdx(questionIdx + 1);
    } else {
      // End of section
      setSectionResults(prev => [...prev, {
        section: currentSection.section,
        score: currentCorrect,
        maxScore: currentSection.questions.length,
      }]);

      if (sectionIdx < sections.length - 1) {
        setSectionIdx(sectionIdx + 1);
        setQuestionIdx(0);
        setCurrentCorrect(0);
      } else {
        finishExam();
      }
    }
  };

  const finishExam = () => {
    if (!examType) return;
    const finalResults = [...sectionResults, {
      section: currentSection.section,
      score: currentCorrect,
      maxScore: currentSection.questions.length,
    }];

    const totalScore = finalResults.reduce((s, r) => s + r.score, 0);
    const totalMax = finalResults.reduce((s, r) => s + r.maxScore, 0);
    const pct = totalMax > 0 ? totalScore / totalMax : 0;

    let estimatedBand: string;
    if (examType === "ielts") {
      estimatedBand = pct >= 0.9 ? "8.0+" : pct >= 0.8 ? "7.0-7.5" : pct >= 0.65 ? "6.0-6.5" : pct >= 0.5 ? "5.0-5.5" : "4.0-4.5";
    } else {
      estimatedBand = pct >= 0.9 ? "1500+" : pct >= 0.75 ? "1300-1500" : pct >= 0.6 ? "1100-1300" : pct >= 0.45 ? "900-1100" : "700-900";
    }

    addMockExamResult({
      exam: examType, date: new Date().toISOString(),
      sections: finalResults, totalScore, totalMax,
      estimatedBand, duration: timeElapsed,
    });

    const xpEarned = Math.round(pct * 200) + 50;
    addXP(xpEarned);
    updateStreak();
    addStudyMinutes(Math.round(timeElapsed / 60));

    if (timerRef.current) clearInterval(timerRef.current);
    setFinished(true);
    setSectionResults(finalResults);
  };

  // Exam selection
  if (!examType) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <Trophy className="h-12 w-12 text-accent mx-auto" />
          <h2 className="text-2xl font-heading font-bold">{t("Mock Exam", "Пробный экзамен")}</h2>
          <p className="text-muted-foreground">{t("Full-length timed simulation with section-by-section scoring", "Полноформатная симуляция с оценкой по разделам")}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(["ielts", "sat"] as const).map(type => {
            const questions = getMockExamQuestions(type);
            const total = questions.reduce((s, q) => s + q.questions.length, 0);
            return (
              <Card key={type} className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-accent/50" onClick={() => setExamType(type)}>
                <CardContent className="p-8 text-center space-y-3">
                  <h3 className="text-2xl font-bold">{type.toUpperCase()}</h3>
                  <p className="text-sm text-muted-foreground">
                    {questions.map(q => q.section).join(" · ")}
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <Badge variant="secondary">{total} {t("questions", "вопросов")}</Badge>
                    <Badge variant="outline" className="border-accent text-accent">
                      <Clock className="h-3 w-3 mr-1" /> ~{Math.round(total * 1.2)} {t("min", "мин")}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // Pre-start
  if (!started) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 text-center">
        <Trophy className="h-12 w-12 text-accent mx-auto" />
        <h2 className="text-2xl font-heading font-bold">{examType.toUpperCase()} {t("Mock Exam", "Пробный экзамен")}</h2>
        <Card className="border-accent/20 bg-accent/5">
          <CardContent className="p-6 space-y-4">
            <p className="text-sm text-muted-foreground">{t("This exam covers all sections. Timer starts when you begin.", "Экзамен охватывает все разделы. Таймер начнётся при старте.")}</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {sections.map(s => (
                <Badge key={s.section} variant="outline">{s.section} ({s.questions.length})</Badge>
              ))}
            </div>
            <Button size="lg" onClick={() => setStarted(true)} className="bg-accent text-accent-foreground hover:bg-accent/90">
              {t("Start Exam", "Начать экзамен")} <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </CardContent>
        </Card>
        <Button variant="ghost" onClick={() => setExamType(null)}>{t("← Choose different exam", "← Другой экзамен")}</Button>
      </div>
    );
  }

  // Results
  if (finished) {
    const totalScore = sectionResults.reduce((s, r) => s + r.score, 0);
    const totalMax = sectionResults.reduce((s, r) => s + r.maxScore, 0);
    const pct = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;

    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4">
          <Trophy className="h-16 w-16 text-accent mx-auto" />
          <h2 className="text-2xl font-heading font-bold">{t("Exam Complete!", "Экзамен завершён!")}</h2>
          <div className="flex items-center justify-center gap-4">
            <Badge variant="secondary" className="text-base px-3 py-1">
              {totalScore}/{totalMax} ({pct}%)
            </Badge>
            <Badge variant="outline" className="text-base px-3 py-1">
              <Clock className="h-4 w-4 mr-1" /> {formatTime(timeElapsed)}
            </Badge>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {sectionResults.map((r, i) => {
            const secPct = r.maxScore > 0 ? Math.round((r.score / r.maxScore) * 100) : 0;
            return (
              <motion.div key={r.section} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <Card className={secPct >= 75 ? "border-green-500/30" : secPct >= 50 ? "border-accent/30" : "border-destructive/30"}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{r.section}</span>
                      <span className={`font-bold ${secPct >= 75 ? "text-green-600" : secPct >= 50 ? "text-accent" : "text-destructive"}`}>
                        {r.score}/{r.maxScore} ({secPct}%)
                      </span>
                    </div>
                    <Progress value={secPct} className="h-2" />
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <div className="flex gap-3 justify-center pt-4">
          <Button variant="outline" onClick={() => { setExamType(null); setStarted(false); setSectionIdx(0); setQuestionIdx(0); setCurrentCorrect(0); setSectionResults([]); setFinished(false); setTimeElapsed(0); }}>
            <RotateCcw className="mr-2 h-4 w-4" /> {t("Take Again", "Ещё раз")}
          </Button>
          <Button onClick={() => navigate("/prep/analytics")} className="bg-accent text-accent-foreground hover:bg-accent/90">
            {t("View Analytics", "Аналитика")} <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Active exam
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge className="bg-accent text-accent-foreground">{currentSection.section}</Badge>
          <span className="text-sm text-muted-foreground">
            Q{questionIdx + 1}/{currentSection.questions.length}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline">
            <Clock className="h-3 w-3 mr-1" /> {formatTime(timeElapsed)}
          </Badge>
          <span className="text-xs text-muted-foreground">{answeredSoFar}/{totalQuestions}</span>
        </div>
      </div>

      <Progress value={(answeredSoFar / totalQuestions) * 100} className="h-2" />

      {/* Section progress dots */}
      <div className="flex gap-1">
        {sections.map((s, i) => (
          <div key={s.section} className={`h-1 flex-1 rounded-full ${i < sectionIdx ? "bg-accent" : i === sectionIdx ? "bg-accent/50" : "bg-muted"}`} />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={`${sectionIdx}-${questionIdx}`} initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }}>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">
                  {currentQ?.difficulty === 1 ? "Easy" : currentQ?.difficulty === 2 ? "Medium" : "Hard"}
                </Badge>
                <Badge variant="outline" className="text-[10px]">{currentQ?.subSkill}</Badge>
              </div>
              <CardTitle className="text-lg mt-2">{currentQ?.question}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {currentQ?.options.map((opt, idx) => (
                <button key={idx} onClick={() => !showAnswer && setSelected(idx)} disabled={showAnswer}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    showAnswer
                      ? idx === currentQ.correct ? "border-green-500 bg-green-500/10" : idx === selected ? "border-destructive bg-destructive/10" : "border-border"
                      : selected === idx ? "border-accent bg-accent/10" : "border-border hover:border-accent/50"
                  }`}>
                  <span className="font-medium mr-2">{String.fromCharCode(65 + idx)}.</span> {opt}
                </button>
              ))}

              {showAnswer && currentQ && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                  💡 {currentQ.explanation}
                </motion.div>
              )}

              <div className="flex justify-end pt-2">
                {!showAnswer ? (
                  <Button onClick={handleCheck} disabled={selected === null} className="bg-accent text-accent-foreground hover:bg-accent/90">
                    {t("Check", "Проверить")}
                  </Button>
                ) : (
                  <Button onClick={handleNext} className="bg-accent text-accent-foreground hover:bg-accent/90">
                    {questionIdx < (currentSection?.questions.length || 0) - 1
                      ? t("Next", "Далее")
                      : sectionIdx < sections.length - 1
                        ? t("Next Section →", "След. раздел →")
                        : t("Finish Exam", "Завершить")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default MockExam;
