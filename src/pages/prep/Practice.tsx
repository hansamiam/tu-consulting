import { useState } from "react";
import { usePrep } from "@/contexts/PrepContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, PenTool, Calculator, BookOpen, Languages, ArrowRight, CheckCircle2, XCircle, RotateCcw, Zap } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

// ── Shared quiz types ──
interface QuizQuestion { question: string; options: string[]; correct: number; explanation: string; }

const vocabQuestions: QuizQuestion[] = [
  { question: "What does 'pragmatic' mean?", options: ["Idealistic", "Practical and realistic", "Pessimistic", "Romantic"], correct: 1, explanation: "'Pragmatic' means dealing with things sensibly and realistically." },
  { question: "Choose the synonym of 'ephemeral':", options: ["Permanent", "Short-lived", "Mysterious", "Heavy"], correct: 1, explanation: "'Ephemeral' means lasting for a very short time." },
  { question: "'Benevolent' most nearly means:", options: ["Cruel", "Indifferent", "Kind and generous", "Weak"], correct: 2, explanation: "'Benevolent' means well-meaning and kindly." },
  { question: "What does 'eloquent' describe?", options: ["Quiet speech", "Fluent and persuasive speech", "Angry speech", "Slow speech"], correct: 1, explanation: "'Eloquent' means fluent or persuasive in speaking or writing." },
  { question: "The word 'meticulous' means:", options: ["Careless", "Very careful and precise", "Quick", "Lazy"], correct: 1, explanation: "'Meticulous' means showing great attention to detail." },
];

const satMathQuestions: QuizQuestion[] = [
  { question: "Solve: 2(x + 3) = 14", options: ["x = 2", "x = 4", "x = 5.5", "x = 7"], correct: 1, explanation: "2x + 6 = 14 → 2x = 8 → x = 4." },
  { question: "What is the value of √144?", options: ["10", "11", "12", "14"], correct: 2, explanation: "√144 = 12 since 12 × 12 = 144." },
  { question: "If f(x) = 2x² - 3, what is f(3)?", options: ["15", "12", "18", "21"], correct: 0, explanation: "f(3) = 2(9) - 3 = 18 - 3 = 15." },
  { question: "A triangle has angles 45° and 65°. What is the third angle?", options: ["60°", "70°", "80°", "90°"], correct: 1, explanation: "180 - 45 - 65 = 70°." },
  { question: "What is 3/8 as a decimal?", options: ["0.35", "0.375", "0.38", "0.325"], correct: 1, explanation: "3 ÷ 8 = 0.375." },
];

const readingQuestions: QuizQuestion[] = [
  { question: "What is the author's primary purpose when using an anecdote?", options: ["To confuse readers", "To illustrate a point with a story", "To add word count", "To change the topic"], correct: 1, explanation: "Anecdotes illustrate points through brief, engaging stories." },
  { question: "In academic texts, 'however' signals:", options: ["Agreement", "A contrast or counterpoint", "A conclusion", "An example"], correct: 1, explanation: "'However' introduces a contrasting idea." },
  { question: "What does 'inference' mean in reading comprehension?", options: ["Copying text directly", "Drawing conclusions from evidence", "Guessing randomly", "Summarizing"], correct: 1, explanation: "Inference means using evidence to reach a logical conclusion." },
  { question: "Which is NOT a feature of persuasive writing?", options: ["Emotional appeals", "Objective neutrality", "Call to action", "Rhetorical questions"], correct: 1, explanation: "Persuasive writing is subjective by nature, not objectively neutral." },
];

// ── Quiz Runner Component ──
const QuizRunner = ({ questions, moduleName, xpReward }: { questions: QuizQuestion[]; moduleName: string; xpReward: number }) => {
  const { addXP, updateStreak, addPracticeSession, language } = usePrep();
  const t = (en: string, ru: string) => language === "ru" ? ru : en;
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);

  const q = questions[idx];
  const progress = ((idx + (showAnswer ? 1 : 0)) / questions.length) * 100;

  const check = () => { setShowAnswer(true); if (selected === q.correct) setCorrect(c => c + 1); };
  const next = () => {
    setSelected(null); setShowAnswer(false);
    if (idx < questions.length - 1) { setIdx(idx + 1); }
    else {
      const earned = Math.round((correct / questions.length) * xpReward);
      addXP(earned); updateStreak();
      addPracticeSession({ module: moduleName, score: correct, maxScore: questions.length, xpEarned: earned, date: new Date().toISOString(), duration: 5 });
      setDone(true);
    }
  };
  const reset = () => { setIdx(0); setSelected(null); setShowAnswer(false); setCorrect(0); setDone(false); };

  if (done) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-4 py-8">
        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
        <p className="text-xl font-bold">{correct}/{questions.length} {t("correct", "правильно")}</p>
        <p className="text-accent flex items-center justify-center gap-1"><Zap className="h-4 w-4" /> +{Math.round((correct / questions.length) * xpReward)} XP</p>
        <Button variant="outline" onClick={reset}><RotateCcw className="mr-2 h-4 w-4" />{t("Try Again", "Ещё раз")}</Button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <Progress value={progress} className="h-2" />
      <p className="text-sm text-muted-foreground text-right">{idx + 1}/{questions.length}</p>
      <AnimatePresence mode="wait">
        <motion.div key={idx} initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }} className="space-y-3">
          <p className="font-medium text-lg">{q.question}</p>
          {q.options.map((o, i) => (
            <button key={i} onClick={() => !showAnswer && setSelected(i)} disabled={showAnswer}
              className={`w-full text-left p-3 rounded-lg border transition-all ${
                showAnswer ? (i === q.correct ? "border-green-500 bg-green-500/10" : i === selected ? "border-destructive bg-destructive/10" : "border-border")
                : selected === i ? "border-accent bg-accent/10" : "border-border hover:border-accent/50"
              }`}>
              {String.fromCharCode(65 + i)}. {o}
            </button>
          ))}
          {showAnswer && <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">💡 {q.explanation}</p>}
          <div className="flex justify-end">
            {!showAnswer
              ? <Button onClick={check} disabled={selected === null} className="bg-accent text-accent-foreground">{t("Check", "Проверить")}</Button>
              : <Button onClick={next} className="bg-accent text-accent-foreground">{idx < questions.length - 1 ? t("Next", "Далее") : t("Finish", "Завершить")} <ArrowRight className="ml-2 h-4 w-4" /></Button>
            }
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// ── Writing Practice ──
const WritingPractice = () => {
  const { language, addXP, updateStreak, addPracticeSession } = usePrep();
  const t = (en: string, ru: string) => language === "ru" ? ru : en;
  const [essay, setEssay] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const wordCount = essay.trim().split(/\s+/).filter(Boolean).length;

  const prompts = [
    "Some people believe that university education should be free for all students. To what extent do you agree or disagree?",
    "The rise of artificial intelligence will lead to more job losses than job creation. Discuss both views and give your opinion.",
    "In many countries, the gap between the rich and the poor is increasing. What problems does this cause and what solutions can you suggest?",
  ];
  const [prompt] = useState(prompts[Math.floor(Math.random() * prompts.length)]);

  const handleSubmit = () => {
    if (wordCount < 50) return;
    addXP(30); updateStreak();
    addPracticeSession({ module: "IELTS Writing", score: wordCount >= 250 ? 10 : Math.round((wordCount / 250) * 10), maxScore: 10, xpEarned: 30, date: new Date().toISOString(), duration: 15 });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="text-center space-y-4 py-8">
        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
        <p className="font-bold text-lg">{t("Essay Submitted!", "Эссе отправлено!")}</p>
        <p className="text-sm text-muted-foreground">{t("Word count:", "Количество слов:")} {wordCount}</p>
        <p className="text-accent flex items-center justify-center gap-1"><Zap className="h-4 w-4" /> +30 XP</p>
        <p className="text-sm text-muted-foreground">{t("For detailed AI feedback, visit the AI Tutor and paste your essay.", "Для подробной обратной связи посетите AI Репетитор и вставьте эссе.")}</p>
        <Button variant="outline" onClick={() => { setEssay(""); setSubmitted(false); }}><RotateCcw className="mr-2 h-4 w-4" />{t("Write Another", "Написать ещё")}</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-accent/20 bg-accent/5">
        <CardContent className="p-4">
          <p className="text-sm font-medium text-muted-foreground mb-1">{t("Writing Prompt:", "Тема для эссе:")}</p>
          <p className="italic">{prompt}</p>
        </CardContent>
      </Card>
      <Textarea value={essay} onChange={e => setEssay(e.target.value)} placeholder={t("Write your essay here (aim for 250+ words)...", "Напишите эссе здесь (цель — 250+ слов)...")} className="min-h-[250px]" />
      <div className="flex items-center justify-between">
        <span className={`text-sm ${wordCount >= 250 ? "text-green-500" : "text-muted-foreground"}`}>{wordCount} {t("words", "слов")} {wordCount >= 250 && "✓"}</span>
        <Button onClick={handleSubmit} disabled={wordCount < 50} className="bg-accent text-accent-foreground">{t("Submit Essay", "Отправить эссе")}</Button>
      </div>
    </div>
  );
};

// ── Speaking Practice ──
const SpeakingPractice = () => {
  const { language, addXP, updateStreak, addPracticeSession } = usePrep();
  const t = (en: string, ru: string) => language === "ru" ? ru : en;
  const [started, setStarted] = useState(false);
  const [timer, setTimer] = useState(120);
  const [done, setDone] = useState(false);

  const topics = [
    "Describe a place you have visited that you found very beautiful. What did it look like? Why did you visit? Why was it memorable?",
    "Talk about a skill you would like to learn. Why do you want to learn it? How would you learn it? How would it benefit you?",
    "Describe a person who has inspired you. Who are they? How did you meet them? What did they do that was inspiring?",
  ];
  const [topic] = useState(topics[Math.floor(Math.random() * topics.length)]);

  const startPractice = () => {
    setStarted(true);
    const interval = setInterval(() => {
      setTimer(t => {
        if (t <= 1) { clearInterval(interval); setDone(true); return 0; }
        return t - 1;
      });
    }, 1000);
  };

  const finish = () => {
    addXP(25); updateStreak();
    addPracticeSession({ module: "IELTS Speaking", score: 8, maxScore: 10, xpEarned: 25, date: new Date().toISOString(), duration: 2 });
    setDone(true);
  };

  if (done) {
    return (
      <div className="text-center space-y-4 py-8">
        <Mic className="h-12 w-12 text-green-500 mx-auto" />
        <p className="font-bold text-lg">{t("Speaking Practice Complete!", "Практика говорения завершена!")}</p>
        <p className="text-accent flex items-center justify-center gap-1"><Zap className="h-4 w-4" /> +25 XP</p>
        <p className="text-sm text-muted-foreground">{t("For real feedback, record yourself and share with the AI Tutor.", "Для обратной связи запишите себя и поделитесь с AI Репетитором.")}</p>
        <Button variant="outline" onClick={() => { setStarted(false); setTimer(120); setDone(false); }}><RotateCcw className="mr-2 h-4 w-4" />{t("Practice Again", "Ещё раз")}</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-center">
      <Card className="border-accent/20 bg-accent/5">
        <CardContent className="p-4">
          <p className="text-sm font-medium text-muted-foreground mb-1">{t("Speaking Topic (Part 2):", "Тема для говорения (Часть 2):")}</p>
          <p className="italic">{topic}</p>
        </CardContent>
      </Card>
      {!started ? (
        <Button onClick={startPractice} className="bg-accent text-accent-foreground" size="lg">
          <Mic className="mr-2 h-5 w-5" /> {t("Start Speaking (2 min)", "Начать говорить (2 мин)")}
        </Button>
      ) : (
        <div className="space-y-4">
          <div className="text-4xl font-mono font-bold text-accent">{Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, "0")}</div>
          <p className="text-sm text-muted-foreground animate-pulse">{t("🎙 Speaking... practice out loud!", "🎙 Говорите вслух!")}</p>
          <Button variant="outline" onClick={finish}>{t("Finish Early", "Завершить досрочно")}</Button>
        </div>
      )}
    </div>
  );
};

// ── Main Practice Page ──
const Practice = () => {
  const { language } = usePrep();
  const t = (en: string, ru: string) => language === "ru" ? ru : en;

  const modules = [
    { id: "vocab", label: t("Vocabulary", "Словарь"), icon: Languages },
    { id: "speaking", label: t("Speaking", "Говорение"), icon: Mic },
    { id: "writing", label: t("Writing", "Письмо"), icon: PenTool },
    { id: "math", label: t("SAT Math", "SAT Мат."), icon: Calculator },
    { id: "reading", label: t("Reading", "Чтение"), icon: BookOpen },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-heading font-bold">{t("Practice Modules", "Модули практики")}</h2>
        <p className="text-muted-foreground">{t("Sharpen your skills across all exam sections", "Улучшайте навыки по всем разделам экзамена")}</p>
      </div>

      <Tabs defaultValue="vocab">
        <TabsList className="grid grid-cols-5 w-full">
          {modules.map(m => (
            <TabsTrigger key={m.id} value={m.id} className="text-xs sm:text-sm flex items-center gap-1">
              <m.icon className="h-3.5 w-3.5 hidden sm:block" /> {m.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="vocab" className="mt-4">
          <Card><CardHeader><CardTitle>{t("Vocabulary Building", "Расширение словаря")}</CardTitle><CardDescription>{t("Academic words for IELTS & SAT", "Академические слова для IELTS и SAT")}</CardDescription></CardHeader>
            <CardContent><QuizRunner questions={vocabQuestions} moduleName="Vocabulary" xpReward={25} /></CardContent></Card>
        </TabsContent>

        <TabsContent value="speaking" className="mt-4">
          <Card><CardHeader><CardTitle>{t("IELTS Speaking Simulation", "Симуляция говорения IELTS")}</CardTitle><CardDescription>{t("Practice responding to Part 2 cue cards", "Практика ответов на карточки Части 2")}</CardDescription></CardHeader>
            <CardContent><SpeakingPractice /></CardContent></Card>
        </TabsContent>

        <TabsContent value="writing" className="mt-4">
          <Card><CardHeader><CardTitle>{t("IELTS Writing Practice", "Практика письма IELTS")}</CardTitle><CardDescription>{t("Write a Task 2 essay", "Напишите эссе Task 2")}</CardDescription></CardHeader>
            <CardContent><WritingPractice /></CardContent></Card>
        </TabsContent>

        <TabsContent value="math" className="mt-4">
          <Card><CardHeader><CardTitle>{t("SAT Math Drills", "SAT Математика")}</CardTitle><CardDescription>{t("Algebra, geometry, and problem solving", "Алгебра, геометрия и решение задач")}</CardDescription></CardHeader>
            <CardContent><QuizRunner questions={satMathQuestions} moduleName="SAT Math" xpReward={30} /></CardContent></Card>
        </TabsContent>

        <TabsContent value="reading" className="mt-4">
          <Card><CardHeader><CardTitle>{t("Reading Comprehension", "Понимание текста")}</CardTitle><CardDescription>{t("Critical reading skills for SAT & IELTS", "Навыки чтения для SAT и IELTS")}</CardDescription></CardHeader>
            <CardContent><QuizRunner questions={readingQuestions} moduleName="Reading" xpReward={25} /></CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Practice;
