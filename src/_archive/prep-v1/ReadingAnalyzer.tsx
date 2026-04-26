import { useState, useEffect, useCallback } from "react";
import { usePrep } from "@/contexts/PrepContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BookOpenCheck, Clock, Eye, ChevronRight, CheckCircle2,
  AlertCircle, Highlighter, Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface Passage {
  id: string;
  title: string;
  titleRu: string;
  difficulty: "easy" | "medium" | "hard";
  wordCount: number;
  timeLimit: number; // seconds
  text: string;
  vocabHighlights: { word: string; definition: string; definitionRu: string }[];
  questions: { q: string; qRu: string; options: string[]; correct: number }[];
}

const passages: Passage[] = [
  {
    id: "climate-change",
    title: "The Impact of Climate Change on Global Agriculture",
    titleRu: "Влияние изменения климата на мировое сельское хозяйство",
    difficulty: "medium",
    wordCount: 280,
    timeLimit: 600,
    text: `Climate change poses significant challenges to global food security. Rising temperatures, altered precipitation patterns, and increased frequency of extreme weather events are fundamentally transforming agricultural systems worldwide. Studies indicate that crop yields for major staples such as wheat, rice, and maize could decline by up to 25% by 2050 if current trends persist.

In tropical regions, where many developing nations rely heavily on subsistence farming, the consequences are particularly acute. Prolonged droughts and unpredictable monsoon patterns have already led to substantial crop failures in parts of Sub-Saharan Africa and South Asia. Conversely, some temperate regions may initially benefit from longer growing seasons, though this advantage is likely to be offset by increased pest activity and soil degradation.

Adaptation strategies vary considerably across regions. In developed nations, precision agriculture technologies—including drone-based monitoring, AI-driven irrigation systems, and genetically modified drought-resistant crops—offer promising solutions. However, the adoption of such technologies in low-income countries remains constrained by limited infrastructure and financial resources.

Furthermore, the relationship between climate change and agriculture is bidirectional. Agricultural activities contribute approximately 10-12% of global greenhouse gas emissions through methane from livestock, nitrous oxide from fertilisers, and carbon dioxide from deforestation for farmland expansion. Consequently, sustainable farming practices—such as agroforestry, conservation tillage, and integrated pest management—are increasingly recognised as essential components of climate change mitigation.

International cooperation and policy frameworks, such as the Paris Agreement's provisions for agricultural adaptation, play a crucial role in coordinating global responses. Nevertheless, the gap between policy commitments and implementation remains a significant barrier to effective action.`,
    vocabHighlights: [
      { word: "precipitation", definition: "Rain, snow, or other forms of water falling from the sky", definitionRu: "Осадки" },
      { word: "subsistence farming", definition: "Farming that provides enough food for the farmer's family but no surplus for sale", definitionRu: "Натуральное хозяйство" },
      { word: "agroforestry", definition: "Combining trees and shrubs with crops/livestock", definitionRu: "Агролесоводство" },
      { word: "mitigation", definition: "The action of reducing severity or seriousness", definitionRu: "Смягчение" },
      { word: "bidirectional", definition: "Operating in two directions", definitionRu: "Двунаправленный" },
    ],
    questions: [
      { q: "By what percentage could major crop yields decline by 2050?", qRu: "На сколько процентов могут снизиться урожаи к 2050?", options: ["10%", "15%", "25%", "50%"], correct: 2 },
      { q: "What percentage of global greenhouse gas emissions comes from agriculture?", qRu: "Какой процент выбросов парниковых газов приходится на сельское хозяйство?", options: ["5-7%", "10-12%", "15-18%", "20-25%"], correct: 1 },
      { q: "Which regions may initially benefit from climate change?", qRu: "Какие регионы могут временно выиграть?", options: ["Tropical regions", "Temperate regions", "Arctic regions", "Desert regions"], correct: 1 },
      { q: "What limits technology adoption in low-income countries?", qRu: "Что ограничивает технологии в бедных странах?", options: ["Lack of interest", "Infrastructure and finances", "Government bans", "Cultural resistance"], correct: 1 },
      { q: "The word 'acute' in paragraph 2 is closest in meaning to:", qRu: "Слово 'acute' во 2 абзаце ближе всего к:", options: ["Mild", "Severe", "Gradual", "Temporary"], correct: 1 },
    ],
  },
  {
    id: "urbanization",
    title: "Urbanization and Its Effects on Mental Health",
    titleRu: "Урбанизация и её влияние на психическое здоровье",
    difficulty: "hard",
    wordCount: 260,
    timeLimit: 540,
    text: `The rapid pace of urbanization in the 21st century has profound implications for mental health. By 2050, an estimated 68% of the world's population will reside in urban areas, up from 55% in 2018. While cities offer economic opportunities and access to services, the urban environment also presents unique psychological stressors.

Research consistently demonstrates that urban residents face elevated risks of mood disorders, anxiety, and schizophrenia compared to their rural counterparts. The mechanisms underlying this urban-rural disparity are multifaceted, encompassing factors such as social isolation despite high population density, chronic noise pollution, reduced access to green spaces, and the relentless pace of urban life.

Neuroscientific studies using functional MRI have revealed that city dwellers exhibit heightened activity in the amygdala—the brain's threat-processing centre—when subjected to social stress. This neurological sensitivity may partly explain the increased prevalence of anxiety disorders in urban populations.

However, the relationship between urbanization and mental health is not uniformly negative. Well-designed urban environments can promote psychological well-being through accessible public spaces, community centres, and integrated mental health services. The concept of "biophilic design"—incorporating natural elements into urban architecture—has shown promising results in reducing stress and improving cognitive function.

Policy interventions that prioritise mental health in urban planning, including mandatory green space requirements and noise reduction regulations, represent critical steps toward creating psychologically sustainable cities. The challenge lies in balancing economic development with the psychological needs of urban populations.`,
    vocabHighlights: [
      { word: "disparity", definition: "A great difference or inequality", definitionRu: "Неравенство, различие" },
      { word: "multifaceted", definition: "Having many different aspects or features", definitionRu: "Многогранный" },
      { word: "amygdala", definition: "Part of the brain involved in processing emotions, especially fear", definitionRu: "Миндалевидное тело мозга" },
      { word: "biophilic", definition: "Having a love of nature; incorporating nature into design", definitionRu: "Биофильный (связанный с любовью к природе)" },
      { word: "prevalence", definition: "The fact of being widespread or common", definitionRu: "Распространённость" },
    ],
    questions: [
      { q: "What percentage of the world's population is expected to live in cities by 2050?", qRu: "Какой процент населения будет жить в городах к 2050?", options: ["55%", "60%", "68%", "75%"], correct: 2 },
      { q: "Which brain region shows heightened activity in city dwellers under stress?", qRu: "Какая область мозга активнее у горожан при стрессе?", options: ["Hippocampus", "Prefrontal cortex", "Amygdala", "Cerebellum"], correct: 2 },
      { q: "What is 'biophilic design'?", qRu: "Что такое 'биофильный дизайн'?", options: ["Using only bio materials", "Incorporating nature into architecture", "Designing bio labs", "Building in forests"], correct: 1 },
      { q: "Which is NOT mentioned as an urban psychological stressor?", qRu: "Что НЕ упомянуто как стрессор?", options: ["Social isolation", "Noise pollution", "Air pollution", "Reduced green spaces"], correct: 2 },
    ],
  },
];

const difficultyColors = { easy: "text-green-500 bg-green-500/10", medium: "text-amber-500 bg-amber-500/10", hard: "text-destructive bg-destructive/10" };

const ReadingAnalyzer = () => {
  const { language, addXP, updateStreak, addPracticeSession } = usePrep();
  const t = (en: string, ru: string) => language === "ru" ? ru : en;

  const [selectedPassage, setSelectedPassage] = useState<Passage | null>(null);
  const [phase, setPhase] = useState<"select" | "read" | "quiz" | "results">("select");
  const [timeLeft, setTimeLeft] = useState(0);
  const [showVocab, setShowVocab] = useState(false);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [startTime, setStartTime] = useState(0);

  useEffect(() => {
    if (phase !== "read" || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timer); setPhase("quiz"); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, timeLeft]);

  const startReading = (p: Passage) => {
    setSelectedPassage(p);
    setPhase("read");
    setTimeLeft(p.timeLimit);
    setStartTime(Date.now());
    setAnswers(new Array(p.questions.length).fill(null));
    setShowVocab(false);
  };

  const submitQuiz = () => {
    if (!selectedPassage) return;
    const correct = answers.filter((a, i) => a === selectedPassage.questions[i].correct).length;
    const total = selectedPassage.questions.length;
    const xpEarned = correct * 15;
    const duration = Math.round((Date.now() - startTime) / 60000);

    addXP(xpEarned);
    updateStreak();
    addPracticeSession({
      module: "IELTS Reading",
      score: correct,
      maxScore: total,
      xpEarned,
      date: new Date().toDateString(),
      duration,
    });

    setPhase("results");
    toast.success(t(`${correct}/${total} correct! +${xpEarned} XP`, `${correct}/${total} правильно! +${xpEarned} XP`));
  };

  if (phase === "select") {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <BookOpenCheck className="h-7 w-7 text-accent" />
            {t("Reading Passage Analyzer", "Анализ текста (Reading)")}
          </h2>
          <p className="text-muted-foreground text-sm">{t("Timed IELTS-style reading practice with vocabulary highlights", "Практика чтения IELTS с подсветкой словаря")}</p>
        </motion.div>

        <div className="grid gap-4">
          {passages.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => startReading(p)}>
                <CardContent className="p-5 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">{language === "ru" ? p.titleRu : p.title}</p>
                    <div className="flex items-center gap-2">
                      <Badge className={difficultyColors[p.difficulty]}>{p.difficulty.toUpperCase()}</Badge>
                      <span className="text-xs text-muted-foreground">{p.wordCount} {t("words", "слов")} · {p.questions.length} {t("questions", "вопросов")} · {Math.round(p.timeLimit / 60)}min</span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  if (phase === "read" && selectedPassage) {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur py-3 z-10">
          <h3 className="font-semibold text-foreground text-sm truncate">{language === "ru" ? selectedPassage.titleRu : selectedPassage.title}</h3>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setShowVocab(!showVocab)}>
              <Highlighter className="mr-1 h-3.5 w-3.5" /> {t("Vocab", "Словарь")}
            </Button>
            <Badge className={`font-mono ${timeLeft < 60 ? "bg-destructive/15 text-destructive" : "bg-accent/15 text-accent"}`}>
              <Clock className="mr-1 h-3 w-3" /> {mins}:{String(secs).padStart(2, "0")}
            </Badge>
            <Button size="sm" onClick={() => setPhase("quiz")} className="bg-accent text-accent-foreground">
              {t("Go to Questions", "К вопросам")} →
            </Button>
          </div>
        </div>

        {showVocab && (
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="p-4">
              <p className="text-sm font-semibold text-foreground mb-2">{t("Key Vocabulary", "Ключевые слова")}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {selectedPassage.vocabHighlights.map(v => (
                  <div key={v.word} className="text-xs">
                    <span className="font-bold text-accent">{v.word}</span>: <span className="text-muted-foreground">{language === "ru" ? v.definitionRu : v.definition}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-6">
            <div className="prose prose-sm max-w-none text-foreground leading-relaxed whitespace-pre-line">
              {selectedPassage.text}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "quiz" && selectedPassage) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <h3 className="text-lg font-semibold text-foreground">{t("Comprehension Questions", "Вопросы на понимание")}</h3>
        {selectedPassage.questions.map((q, qi) => (
          <Card key={qi} className={answers[qi] !== null ? "border-accent/20" : ""}>
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-medium text-foreground">{qi + 1}. {language === "ru" ? q.qRu : q.q}</p>
              <div className="grid grid-cols-1 gap-2">
                {q.options.map((opt, oi) => (
                  <Button
                    key={oi}
                    variant={answers[qi] === oi ? "default" : "outline"}
                    className={`justify-start text-left ${answers[qi] === oi ? "bg-accent text-accent-foreground" : ""}`}
                    onClick={() => { const newAns = [...answers]; newAns[qi] = oi; setAnswers(newAns); }}
                  >
                    {String.fromCharCode(65 + oi)}. {opt}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
        <Button onClick={submitQuiz} className="w-full bg-accent text-accent-foreground" disabled={answers.some(a => a === null)}>
          {t("Submit Answers", "Отправить ответы")}
        </Button>
      </div>
    );
  }

  if (phase === "results" && selectedPassage) {
    const correct = answers.filter((a, i) => a === selectedPassage.questions[i].correct).length;
    const total = selectedPassage.questions.length;
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Card className="border-accent/20">
          <CardContent className="p-6 text-center space-y-3">
            <p className="text-4xl font-bold text-accent">{correct}/{total}</p>
            <Progress value={(correct / total) * 100} className="h-3 max-w-xs mx-auto" />
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              <Zap className="h-4 w-4 text-accent" /> +{correct * 15} XP {t("earned", "заработано")}
            </p>
          </CardContent>
        </Card>
        {selectedPassage.questions.map((q, qi) => (
          <Card key={qi} className={answers[qi] === q.correct ? "border-green-500/20" : "border-destructive/20"}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start gap-2">
                {answers[qi] === q.correct ? <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" /> : <AlertCircle className="h-5 w-5 text-destructive shrink-0" />}
                <div>
                  <p className="text-sm font-medium text-foreground">{language === "ru" ? q.qRu : q.q}</p>
                  {answers[qi] !== q.correct && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("Your answer:", "Ваш ответ:")} {q.options[answers[qi]!]} → {t("Correct:", "Правильно:")} <span className="text-green-500 font-medium">{q.options[q.correct]}</span>
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        <Button onClick={() => { setPhase("select"); setSelectedPassage(null); }} className="w-full" variant="outline">
          {t("Back to Passages", "К текстам")}
        </Button>
      </div>
    );
  }

  return null;
};

export default ReadingAnalyzer;
