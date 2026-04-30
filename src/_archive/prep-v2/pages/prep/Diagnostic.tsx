import { useState } from "react";
import { usePrep } from "@/contexts/PrepContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, CheckCircle2, RotateCcw, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type ExamType = "ielts" | "sat";

interface Question {
  id: number;
  section: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

const ieltsQuestions: Question[] = [
  { id: 1, section: "Reading", question: "What does 'ubiquitous' mean?", options: ["Rare", "Found everywhere", "Dangerous", "Beautiful"], correct: 1, explanation: "'Ubiquitous' means present, appearing, or found everywhere." },
  { id: 2, section: "Reading", question: "Which word best completes: 'The research _____ significant findings.'", options: ["yielded", "yielding", "yields", "had yield"], correct: 0, explanation: "Past tense 'yielded' matches the simple past context." },
  { id: 3, section: "Writing", question: "Which is the best topic sentence for an argumentative essay?", options: ["I think education is important.", "While some argue for traditional schooling, evidence suggests online learning can be equally effective.", "Education is good.", "Let me tell you about education."], correct: 1, explanation: "A strong topic sentence presents a clear argument with nuance." },
  { id: 4, section: "Listening", question: "In IELTS Listening, if you hear 'the deadline is the fifteenth of March', what should you write?", options: ["15 March", "March 15th", "15/3", "Any of the above"], correct: 3, explanation: "IELTS accepts multiple date formats as long as they're clear." },
  { id: 5, section: "Speaking", question: "What's the best strategy for IELTS Speaking Part 2?", options: ["Memorize a script", "Make brief notes then speak naturally", "Speak as fast as possible", "Use only simple words"], correct: 1, explanation: "Making notes and speaking naturally demonstrates fluency and coherence." },
  { id: 6, section: "Reading", question: "Choose the correct form: 'Neither the students nor the teacher _____ aware.'", options: ["were", "was", "are", "is being"], correct: 1, explanation: "With 'neither...nor', the verb agrees with the nearest subject (teacher = singular)." },
  { id: 7, section: "Writing", question: "Which cohesive device shows contrast?", options: ["Furthermore", "Nevertheless", "In addition", "Similarly"], correct: 1, explanation: "'Nevertheless' introduces a contrasting point." },
  { id: 8, section: "Vocabulary", question: "What is a synonym for 'ameliorate'?", options: ["Worsen", "Improve", "Maintain", "Destroy"], correct: 1, explanation: "'Ameliorate' means to make something better." },
];

const satQuestions: Question[] = [
  { id: 1, section: "Math", question: "If 3x + 7 = 22, what is x?", options: ["3", "5", "7", "15"], correct: 1, explanation: "3x = 15, so x = 5." },
  { id: 2, section: "Math", question: "What is the slope of the line passing through (2, 3) and (6, 11)?", options: ["1", "2", "3", "4"], correct: 1, explanation: "Slope = (11-3)/(6-2) = 8/4 = 2." },
  { id: 3, section: "Math", question: "If a circle has radius 5, what is its area?", options: ["25π", "10π", "50π", "5π"], correct: 0, explanation: "Area = πr² = 25π." },
  { id: 4, section: "Reading", question: "What is the primary purpose of a 'thesis statement'?", options: ["To summarize the conclusion", "To present the main argument", "To list evidence", "To introduce the author"], correct: 1, explanation: "A thesis statement presents the essay's central claim." },
  { id: 5, section: "Reading", question: "In the sentence 'The findings corroborate earlier studies', 'corroborate' means:", options: ["Contradict", "Confirm", "Ignore", "Replace"], correct: 1, explanation: "'Corroborate' means to confirm or support with evidence." },
  { id: 6, section: "Math", question: "Simplify: (x² - 9) / (x - 3)", options: ["x + 3", "x - 3", "x² - 3", "9"], correct: 0, explanation: "x² - 9 = (x+3)(x-3), so divided by (x-3) gives x+3." },
  { id: 7, section: "Writing", question: "Which sentence is grammatically correct?", options: ["Me and him went to the store.", "He and I went to the store.", "Him and I went to the store.", "Him and me went to store."], correct: 1, explanation: "'He and I' uses subject pronouns correctly." },
  { id: 8, section: "Math", question: "What is 15% of 200?", options: ["15", "25", "30", "35"], correct: 2, explanation: "0.15 × 200 = 30." },
];

const Diagnostic = () => {
  const { language, addDiagnosticResult, addXP, updateStreak, setTargetExam } = usePrep();
  const navigate = useNavigate();
  const t = (en: string, ru: string) => language === "ru" ? ru : en;

  const [examType, setExamType] = useState<ExamType | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [answers, setAnswers] = useState<number[]>([]);
  const [finished, setFinished] = useState(false);

  const questions = examType === "ielts" ? ieltsQuestions : satQuestions;
  const question = questions[currentQ];
  const progress = examType ? ((currentQ + (showExplanation ? 1 : 0)) / questions.length) * 100 : 0;

  const handleSelect = (idx: number) => {
    if (showExplanation) return;
    setSelected(idx);
  };

  const handleSubmit = () => {
    if (selected === null) return;
    setShowExplanation(true);
    setAnswers(prev => [...prev, selected]);
  };

  const handleNext = () => {
    setSelected(null);
    setShowExplanation(false);
    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      finishDiagnostic();
    }
  };

  const finishDiagnostic = () => {
    if (!examType) return;
    const allAnswers = [...answers];
    const sections = [...new Set(questions.map(q => q.section))];
    sections.forEach(section => {
      const sectionQs = questions.filter(q => q.section === section);
      const sectionAnswers = sectionQs.map((q, i) => {
        const qIndex = questions.indexOf(q);
        return allAnswers[qIndex] === q.correct ? 1 : 0;
      });
      const score = sectionAnswers.reduce((a, b) => a + b, 0);
      addDiagnosticResult({
        examType, section, score, maxScore: sectionQs.length,
        date: new Date().toISOString(),
      });
    });
    setTargetExam(examType);
    addXP(50);
    updateStreak();
    setFinished(true);
  };

  const totalCorrect = answers.filter((a, i) => a === questions[i]?.correct).length;
  const percentage = Math.round((totalCorrect / questions.length) * 100);

  const getIELTSBand = (pct: number) => {
    if (pct >= 90) return "7.5-8.0";
    if (pct >= 75) return "6.5-7.0";
    if (pct >= 60) return "5.5-6.0";
    if (pct >= 40) return "4.5-5.0";
    return "3.5-4.0";
  };

  const getSATRange = (pct: number) => {
    if (pct >= 90) return "1400-1600";
    if (pct >= 75) return "1200-1400";
    if (pct >= 60) return "1000-1200";
    if (pct >= 40) return "800-1000";
    return "600-800";
  };

  // Exam selection
  if (!examType) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-heading font-bold">{t("Diagnostic Assessment", "Диагностический тест")}</h2>
          <p className="text-muted-foreground">{t("Choose an exam to assess your current level", "Выберите экзамен для оценки уровня")}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(["ielts", "sat"] as ExamType[]).map(type => (
            <Card key={type} className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-accent/50" onClick={() => setExamType(type)}>
              <CardContent className="p-8 text-center space-y-3">
                <h3 className="text-xl font-bold">{type.toUpperCase()}</h3>
                <p className="text-sm text-muted-foreground">
                  {type === "ielts"
                    ? t("Reading, Writing, Speaking, Listening", "Чтение, Письмо, Говорение, Аудирование")
                    : t("Math, Reading, Writing", "Математика, Чтение, Письмо")}
                </p>
                <Badge variant="secondary">{t("8 questions", "8 вопросов")}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Results
  if (finished) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
          <h2 className="text-2xl font-heading font-bold">{t("Assessment Complete!", "Тест завершён!")}</h2>
          <p className="text-lg">{totalCorrect}/{questions.length} {t("correct", "правильно")} ({percentage}%)</p>
          <Card className="border-accent/30">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-1">{t("Estimated Level", "Оценочный уровень")}</p>
              <p className="text-3xl font-bold text-accent">
                {examType === "ielts" ? `IELTS ${getIELTSBand(percentage)}` : `SAT ${getSATRange(percentage)}`}
              </p>
            </CardContent>
          </Card>
          <div className="flex gap-3 justify-center pt-4">
            <Button variant="outline" onClick={() => { setExamType(null); setCurrentQ(0); setAnswers([]); setFinished(false); }}>
              <RotateCcw className="mr-2 h-4 w-4" /> {t("Retake", "Пересдать")}
            </Button>
            <Button onClick={() => navigate("/prep/study-plan")} className="bg-accent text-accent-foreground hover:bg-accent/90">
              {t("View Study Plan", "План обучения")} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
          <Button variant="link" onClick={() => navigate("/prep/practice")} className="text-accent">
            {t("Start Practicing →", "Начать практику →")}
          </Button>
        </motion.div>
      </div>
    );
  }

  // Quiz
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Badge>{examType.toUpperCase()} — {question.section}</Badge>
          <span className="text-sm text-muted-foreground">{currentQ + 1}/{questions.length}</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={currentQ} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{question.question}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {question.options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelect(idx)}
                  disabled={showExplanation}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    showExplanation
                      ? idx === question.correct
                        ? "border-green-500 bg-green-500/10 text-green-700"
                        : idx === selected
                          ? "border-destructive bg-destructive/10 text-destructive"
                          : "border-border"
                      : selected === idx
                        ? "border-accent bg-accent/10"
                        : "border-border hover:border-accent/50"
                  }`}
                >
                  <span className="font-medium mr-2">{String.fromCharCode(65 + idx)}.</span>
                  {opt}
                </button>
              ))}

              {showExplanation && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                  💡 {question.explanation}
                </motion.div>
              )}

              <div className="flex justify-end pt-2">
                {!showExplanation ? (
                  <Button onClick={handleSubmit} disabled={selected === null} className="bg-accent text-accent-foreground hover:bg-accent/90">
                    {t("Check", "Проверить")}
                  </Button>
                ) : (
                  <Button onClick={handleNext} className="bg-accent text-accent-foreground hover:bg-accent/90">
                    {currentQ < questions.length - 1 ? t("Next", "Далее") : t("Finish", "Завершить")} <ArrowRight className="ml-2 h-4 w-4" />
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

export default Diagnostic;
