import { useState, useMemo } from "react";
import { usePrep } from "@/contexts/PrepContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic, PenTool, Calculator, BookOpen, Languages, ArrowRight, CheckCircle2,
  RotateCcw, Zap, Headphones, Type, Sparkles, Loader2, ArrowUpRight,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import {
  getAdaptiveQuestions, getQuestionsBySection, BankQuestion,
  essayPrompts, speakingCueCards, sectionMeta,
} from "@/data/questionBank";
import { useTrackMilestone } from "@/hooks/use-track-milestone";

// ── Adaptive Quiz Runner ──
const AdaptiveQuizRunner = ({ section, exam, moduleName, xpReward }: {
  section: string; exam?: "ielts" | "sat"; moduleName: string; xpReward: number;
}) => {
  const { addXP, updateStreak, addPracticeSession, addStudyMinutes, updateSkillProfile, skillProfile, language } = usePrep();
  const { track: trackMilestone } = useTrackMilestone();
  const t = (en: string, ru: string) => language === "ru" ? ru : en;

  const userLevel = skillProfile[section]?.level ?? 50;
  const [questionCount, setQuestionCount] = useState<number>(0);
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);
  const [started, setStarted] = useState(false);

  const availableCount = getQuestionsBySection(section, exam).length;
  const sizes = [5, 10, 15, 20].filter(n => n <= availableCount);

  const startQuiz = (count: number) => {
    setQuestionCount(count);
    setQuestions(getAdaptiveQuestions(section, count, userLevel, exam));
    setStarted(true);
  };

  const q = questions[idx];
  const progress = started ? ((idx + (showAnswer ? 1 : 0)) / questions.length) * 100 : 0;

  const check = () => {
    if (selected === null || !q) return;
    setShowAnswer(true);
    const isCorrect = selected === q.correct;
    if (isCorrect) setCorrect(c => c + 1);
    updateSkillProfile(q.section, q.subSkill, isCorrect);
  };

  const next = () => {
    setSelected(null); setShowAnswer(false);
    if (idx < questions.length - 1) { setIdx(idx + 1); }
    else {
      const earned = Math.round((correct / questions.length) * xpReward);
      addXP(earned); updateStreak();
      addStudyMinutes(Math.round(questions.length * 1.5));
      addPracticeSession({
        module: moduleName, score: correct, maxScore: questions.length,
        xpEarned: earned, date: new Date().toISOString(),
        duration: Math.round(questions.length * 1.5), difficulty: q?.difficulty,
      });
      setDone(true);
      // Engagement milestone: first quiz completion (idempotent)
      trackMilestone("first_quiz", { module: moduleName, score: correct, max: questions.length });
    }
  };

  const reset = () => { setIdx(0); setSelected(null); setShowAnswer(false); setCorrect(0); setDone(false); setStarted(false); };

  if (!started) {
    const meta = sectionMeta[section];
    return (
      <div className="space-y-4 text-center py-4">
        <div className="text-4xl">{meta?.icon || "📚"}</div>
        <p className="text-sm text-muted-foreground">
          {t("Your skill level:", "Ваш уровень:")}{" "}
          <span className={`font-bold ${userLevel >= 70 ? "text-green-600" : userLevel >= 40 ? "text-accent" : "text-destructive"}`}>
            {userLevel}%
          </span>
          {" · "}{availableCount} {t("questions available", "вопросов доступно")}
        </p>
        <p className="text-xs text-muted-foreground">{t("Questions adapt to your level", "Вопросы подстраиваются под ваш уровень")}</p>
        <div className="flex gap-2 justify-center flex-wrap">
          {sizes.map(n => (
            <Button key={n} variant="outline" onClick={() => startQuiz(n)} className="gap-1">
              {n} {t("questions", "вопросов")}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  if (done) {
    const pct = Math.round((correct / questions.length) * 100);
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-4 py-6">
        <CheckCircle2 className={`h-14 w-14 mx-auto ${pct >= 70 ? "text-green-500" : pct >= 40 ? "text-accent" : "text-destructive"}`} />
        <p className="text-2xl font-bold">{correct}/{questions.length} ({pct}%)</p>
        <p className="text-accent flex items-center justify-center gap-1"><Zap className="h-4 w-4" /> +{Math.round((correct / questions.length) * xpReward)} XP</p>
        {pct < 60 && <p className="text-sm text-muted-foreground">{t("Keep practicing! Difficulty will adjust.", "Продолжайте! Сложность подстроится.")}</p>}
        {pct >= 90 && <p className="text-sm text-green-600 font-medium">{t("🎉 Outstanding! Try harder questions next time.", "🎉 Отлично! Попробуйте сложнее.")}</p>}
        <div className="flex gap-2 justify-center">
          <Button variant="outline" onClick={reset}><RotateCcw className="mr-2 h-4 w-4" />{t("Again", "Ещё")}</Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          <Badge variant="outline" className="text-[10px]">{q?.difficulty === 1 ? "Easy" : q?.difficulty === 2 ? "Medium" : "Hard"}</Badge>
          <Badge variant="outline" className="text-[10px]">{q?.subSkill}</Badge>
        </div>
        <span className="text-sm text-muted-foreground">{idx + 1}/{questions.length}</span>
      </div>
      <Progress value={progress} className="h-2" />
      <AnimatePresence mode="wait">
        <motion.div key={idx} initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }} className="space-y-3">
          <p className="font-medium text-lg">{q?.question}</p>
          {q?.options.map((o, i) => (
            <button key={i} onClick={() => !showAnswer && setSelected(i)} disabled={showAnswer}
              className={`w-full text-left p-3 rounded-lg border transition-all ${
                showAnswer ? (i === q.correct ? "border-green-500 bg-green-500/10" : i === selected ? "border-destructive bg-destructive/10" : "border-border")
                : selected === i ? "border-accent bg-accent/10" : "border-border hover:border-accent/50"
              }`}>
              {String.fromCharCode(65 + i)}. {o}
            </button>
          ))}
          {showAnswer && q && <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">💡 {q.explanation}</p>}
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

// ── AI Writing Practice ──
const AIWritingPractice = () => {
  const { language, addXP, updateStreak, addPracticeSession, incrementEssays, addStudyMinutes } = usePrep();
  const t = (en: string, ru: string) => language === "ru" ? ru : en;
  const navigate = useNavigate();
  const [essay, setEssay] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const wordCount = essay.trim().split(/\s+/).filter(Boolean).length;

  const [prompt] = useState(() => essayPrompts[Math.floor(Math.random() * essayPrompts.length)]);

  const handleSubmit = async () => {
    if (wordCount < 50) return;
    setLoading(true);

    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/prep-tutor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: `Score this IELTS Task 2 essay. Prompt: "${prompt.topic}"\n\nEssay:\n${essay}\n\nProvide:\n1. Estimated Band Score (0-9)\n2. Task Response feedback\n3. Coherence & Cohesion feedback\n4. Lexical Resource feedback\n5. Grammatical Range feedback\n6. Top 3 specific improvements\n\nBe encouraging but honest. Use ${language === "ru" ? "Russian" : "English"}.`,
          }],
          language,
          context: { targetExam: "ielts" },
        }),
      });

      if (!resp.ok) throw new Error("Failed");

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let result = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) { result += delta; setFeedback(result); }
          } catch {}
        }
      }
    } catch {
      setFeedback(t("Could not get AI feedback. Your essay has been recorded.", "Не удалось получить отзыв AI. Эссе сохранено."));
    }

    const score = wordCount >= 250 ? 8 : Math.round((wordCount / 250) * 8);
    addXP(40); updateStreak(); incrementEssays(); addStudyMinutes(15);
    addPracticeSession({ module: "Writing", score, maxScore: 10, xpEarned: 40, date: new Date().toISOString(), duration: 15 });
    setSubmitted(true);
    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-8 w-8 text-green-500 shrink-0" />
          <div>
            <p className="font-bold">{t("Essay Scored!", "Эссе оценено!")}</p>
            <p className="text-accent text-sm flex items-center gap-1"><Zap className="h-3.5 w-3.5" /> +40 XP · {wordCount} {t("words", "слов")}</p>
          </div>
        </div>
        {feedback && (
          <Card className="border-accent/20">
            <CardContent className="p-4 prose prose-sm dark:prose-invert max-w-none">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-accent" />
                <span className="font-semibold text-accent">{t("AI Feedback", "Отзыв AI")}</span>
              </div>
              <div className="whitespace-pre-wrap text-sm">{feedback}</div>
            </CardContent>
          </Card>
        )}
        <Card className="border-accent/20 bg-accent/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">{t("Want expert human feedback?", "Хотите отзыв от эксперта?")}</p>
              <p className="text-xs text-muted-foreground">{t("Book a consultation with our IELTS specialists", "Запишитесь на консультацию к нашим IELTS-специалистам")}</p>
            </div>
            <Button size="sm" variant="default" onClick={() => navigate("/offerings")} className="gap-1 shrink-0">
              {t("View Plans", "Тарифы")} <ArrowUpRight className="h-3 w-3" />
            </Button>
          </CardContent>
        </Card>
        <Button variant="outline" onClick={() => { setEssay(""); setSubmitted(false); setFeedback(""); }}><RotateCcw className="mr-2 h-4 w-4" />{t("Write Another", "Написать ещё")}</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-accent/20 bg-accent/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-[10px] capitalize">{prompt.type}</Badge>
            <Badge variant="outline" className="text-[10px]">
              {prompt.difficulty === 1 ? "Easy" : prompt.difficulty === 2 ? "Medium" : "Hard"}
            </Badge>
          </div>
          <p className="italic text-sm">{prompt.topic}</p>
        </CardContent>
      </Card>
      <Textarea value={essay} onChange={e => setEssay(e.target.value)} placeholder={t("Write your essay here (aim for 250+ words)...", "Напишите эссе здесь (цель — 250+ слов)...")} className="min-h-[250px]" />
      <div className="flex items-center justify-between">
        <span className={`text-sm ${wordCount >= 250 ? "text-green-500 font-medium" : "text-muted-foreground"}`}>{wordCount} {t("words", "слов")} {wordCount >= 250 && "✓"}</span>
        <Button onClick={handleSubmit} disabled={wordCount < 50 || loading} className="bg-accent text-accent-foreground gap-2">
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> {t("Scoring...", "Оценка...")}</> : <><Sparkles className="h-4 w-4" /> {t("Get AI Score", "AI Оценка")}</>}
        </Button>
      </div>
    </div>
  );
};

// ── Speaking Practice ──
const SpeakingPractice = () => {
  const { language, addXP, updateStreak, addPracticeSession, addStudyMinutes } = usePrep();
  const t = (en: string, ru: string) => language === "ru" ? ru : en;
  const [started, setStarted] = useState(false);
  const [timer, setTimer] = useState(120);
  const [done, setDone] = useState(false);
  const [cue] = useState(() => speakingCueCards[Math.floor(Math.random() * speakingCueCards.length)]);

  const startPractice = () => {
    setStarted(true);
    const interval = setInterval(() => {
      setTimer(t => { if (t <= 1) { clearInterval(interval); setDone(true); return 0; } return t - 1; });
    }, 1000);
  };

  const finish = () => {
    addXP(25); updateStreak(); addStudyMinutes(2);
    addPracticeSession({ module: "Speaking", score: 8, maxScore: 10, xpEarned: 25, date: new Date().toISOString(), duration: 2 });
    setDone(true);
  };

  if (done) return (
    <div className="text-center space-y-4 py-8">
      <Mic className="h-12 w-12 text-green-500 mx-auto" />
      <p className="font-bold text-lg">{t("Speaking Practice Complete!", "Говорение завершено!")}</p>
      <p className="text-accent flex items-center justify-center gap-1"><Zap className="h-4 w-4" /> +25 XP</p>
      <Button variant="outline" onClick={() => { setStarted(false); setTimer(120); setDone(false); }}><RotateCcw className="mr-2 h-4 w-4" />{t("Practice Again", "Ещё раз")}</Button>
    </div>
  );

  return (
    <div className="space-y-4 text-center">
      <Card className="border-accent/20 bg-accent/5">
        <CardContent className="p-4 text-left">
          <Badge variant="outline" className="text-[10px] mb-2">{cue.difficulty === 1 ? "Easy" : cue.difficulty === 2 ? "Medium" : "Hard"}</Badge>
          <p className="font-medium">{cue.topic}</p>
          <ul className="text-sm text-muted-foreground mt-2 space-y-1">
            {cue.prompts.map((p, i) => <li key={i}>• {p}</li>)}
          </ul>
        </CardContent>
      </Card>
      {!started ? (
        <Button onClick={startPractice} className="bg-accent text-accent-foreground" size="lg">
          <Mic className="mr-2 h-5 w-5" /> {t("Start Speaking (2 min)", "Начать (2 мин)")}
        </Button>
      ) : (
        <div className="space-y-4">
          <div className="text-4xl font-mono font-bold text-accent">{Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, "0")}</div>
          <p className="text-sm text-muted-foreground animate-pulse">🎙 {t("Speaking... practice out loud!", "Говорите вслух!")}</p>
          <Button variant="outline" onClick={finish}>{t("Finish Early", "Завершить")}</Button>
        </div>
      )}
    </div>
  );
};

// ── Main Practice Page ──
const Practice = () => {
  const { language, skillProfile } = usePrep();
  const t = (en: string, ru: string) => language === "ru" ? ru : en;

  const modules = [
    { id: "vocab", label: t("Vocabulary", "Словарь"), icon: Languages, section: "Vocabulary" },
    { id: "reading", label: t("Reading", "Чтение"), icon: BookOpen, section: "Reading" },
    { id: "grammar", label: t("Grammar", "Грамматика"), icon: Type, section: "Grammar" },
    { id: "listening", label: t("Listening", "Аудирование"), icon: Headphones, section: "Listening" },
    { id: "math", label: t("SAT Math", "SAT Мат."), icon: Calculator, section: "Math" },
    { id: "writing", label: t("Writing", "Письмо"), icon: PenTool, section: "Writing" },
    { id: "speaking", label: t("Speaking", "Говорение"), icon: Mic, section: "Speaking" },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-heading font-bold">{t("Practice Modules", "Модули практики")}</h2>
        <p className="text-muted-foreground">{t("110+ questions with adaptive difficulty across 7 sections", "110+ вопросов с адаптивной сложностью в 7 разделах")}</p>
      </div>

      {/* Skill overview */}
      <div className="grid grid-cols-7 gap-2">
        {modules.map(m => {
          const level = skillProfile[m.section]?.level ?? 0;
          const meta = sectionMeta[m.section];
          return (
            <div key={m.id} className="text-center">
              <div className="text-lg">{meta?.icon}</div>
              <Progress value={level} className="h-1 mt-1" />
              <p className="text-[10px] text-muted-foreground mt-0.5">{level}%</p>
            </div>
          );
        })}
      </div>

      <Tabs defaultValue="vocab">
        <TabsList className="grid grid-cols-7 w-full h-auto">
          {modules.map(m => (
            <TabsTrigger key={m.id} value={m.id} className="text-xs flex flex-col items-center gap-0.5 py-2">
              <m.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{m.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="vocab" className="mt-4">
          <Card><CardHeader><CardTitle>{t("Vocabulary Building", "Словарь")}</CardTitle><CardDescription>{t("Academic words, context clues, word roots, collocations", "Академические слова, контекст, корни, коллокации")}</CardDescription></CardHeader>
            <CardContent><AdaptiveQuizRunner section="Vocabulary" moduleName="Vocabulary" xpReward={30} /></CardContent></Card>
        </TabsContent>

        <TabsContent value="reading" className="mt-4">
          <Card><CardHeader><CardTitle>{t("Reading Comprehension", "Чтение")}</CardTitle><CardDescription>{t("Main idea, inference, rhetoric, vocabulary in context", "Главная мысль, вывод, риторика, словарь в контексте")}</CardDescription></CardHeader>
            <CardContent><AdaptiveQuizRunner section="Reading" moduleName="Reading" xpReward={30} /></CardContent></Card>
        </TabsContent>

        <TabsContent value="grammar" className="mt-4">
          <Card><CardHeader><CardTitle>{t("Grammar Mastery", "Грамматика")}</CardTitle><CardDescription>{t("Tenses, agreement, conditionals, parallel structure", "Времена, согласование, условные, параллельные структуры")}</CardDescription></CardHeader>
            <CardContent><AdaptiveQuizRunner section="Grammar" moduleName="Grammar" xpReward={30} /></CardContent></Card>
        </TabsContent>

        <TabsContent value="listening" className="mt-4">
          <Card><CardHeader><CardTitle>{t("IELTS Listening Strategy", "Стратегия аудирования")}</CardTitle><CardDescription>{t("Formats, traps, note-taking techniques", "Форматы, ловушки, конспектирование")}</CardDescription></CardHeader>
            <CardContent><AdaptiveQuizRunner section="Listening" exam="ielts" moduleName="Listening" xpReward={30} /></CardContent></Card>
        </TabsContent>

        <TabsContent value="math" className="mt-4">
          <Card><CardHeader><CardTitle>{t("SAT Math Drills", "SAT Математика")}</CardTitle><CardDescription>{t("Algebra, geometry, functions, statistics, percentages", "Алгебра, геометрия, функции, статистика, проценты")}</CardDescription></CardHeader>
            <CardContent><AdaptiveQuizRunner section="Math" exam="sat" moduleName="SAT Math" xpReward={35} /></CardContent></Card>
        </TabsContent>

        <TabsContent value="writing" className="mt-4">
          <Card><CardHeader>
            <CardTitle className="flex items-center gap-2">{t("IELTS Writing", "Письмо IELTS")} <Badge className="bg-accent text-accent-foreground text-[10px]">AI Scoring</Badge></CardTitle>
            <CardDescription>{t("Write essays and get instant AI band-score feedback", "Пишите эссе и получайте мгновенный AI-отзыв")}</CardDescription>
          </CardHeader>
            <CardContent><AIWritingPractice /></CardContent></Card>
        </TabsContent>

        <TabsContent value="speaking" className="mt-4">
          <Card><CardHeader><CardTitle>{t("IELTS Speaking Simulation", "Говорение IELTS")}</CardTitle><CardDescription>{t("Part 2 cue cards with timer and prompts", "Карточки Части 2 с таймером")}</CardDescription></CardHeader>
            <CardContent><SpeakingPractice /></CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Practice;
