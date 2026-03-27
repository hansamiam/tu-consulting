import { useState } from "react";
import { usePrep } from "@/contexts/PrepContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Sparkles, Loader2, RotateCcw, Zap, CheckCircle2,
  AlertTriangle, ArrowUpRight, PenTool, BookOpen, Type, Link2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { essayPrompts } from "@/data/questionBank";

interface RubricScore {
  criterion: string;
  score: number;
  maxScore: number;
  feedback: string;
  suggestions: string[];
}

interface GraderResult {
  overallBand: string;
  rubricScores: RubricScore[];
  summary: string;
  strengths: string[];
  improvements: string[];
  annotatedEssay: string; // essay with inline markdown annotations
}

const IELTS_CRITERIA = [
  { key: "task", label: "Task Response", labelRu: "Ответ на задание", icon: FileText, color: "text-blue-500" },
  { key: "coherence", label: "Coherence & Cohesion", labelRu: "Связность", icon: Link2, color: "text-purple-500" },
  { key: "lexical", label: "Lexical Resource", labelRu: "Лексика", icon: BookOpen, color: "text-green-500" },
  { key: "grammar", label: "Grammatical Range", labelRu: "Грамматика", icon: Type, color: "text-orange-500" },
];

const EssayGrader = () => {
  const navigate = useNavigate();
  const { language, addXP, updateStreak, incrementEssays, addStudyMinutes, addPracticeSession } = usePrep();
  const t = (en: string, ru: string) => language === "ru" ? ru : en;

  const [taskType, setTaskType] = useState<"task1" | "task2">("task2");
  const [essay, setEssay] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GraderResult | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const wordCount = essay.trim().split(/\s+/).filter(Boolean).length;
  const minWords = taskType === "task1" ? 150 : 250;

  const [selectedPrompt] = useState(() => essayPrompts[Math.floor(Math.random() * essayPrompts.length)]);

  const gradeEssay = async () => {
    if (wordCount < 50) return;
    setLoading(true);
    setResult(null);

    const prompt = customPrompt || selectedPrompt.topic;
    const systemPrompt = `You are an IELTS examiner. Grade this IELTS ${taskType === "task1" ? "Task 1" : "Task 2"} essay using the official IELTS band descriptors.

RESPOND IN VALID JSON ONLY with this exact structure:
{
  "overallBand": "6.5",
  "rubricScores": [
    {"criterion": "Task Response", "score": 7, "maxScore": 9, "feedback": "...", "suggestions": ["...", "..."]},
    {"criterion": "Coherence & Cohesion", "score": 6, "maxScore": 9, "feedback": "...", "suggestions": ["...", "..."]},
    {"criterion": "Lexical Resource", "score": 7, "maxScore": 9, "feedback": "...", "suggestions": ["...", "..."]},
    {"criterion": "Grammatical Range & Accuracy", "score": 6, "maxScore": 9, "feedback": "...", "suggestions": ["...", "..."]}
  ],
  "summary": "Overall assessment paragraph",
  "strengths": ["strength1", "strength2", "strength3"],
  "improvements": ["improvement1", "improvement2", "improvement3"],
  "annotatedEssay": "The essay text with **bold annotations** marking errors and [suggestions in brackets]"
}

Be detailed but fair. Use ${language === "ru" ? "Russian" : "English"} for all text.`;

    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/prep-tutor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Essay Prompt: "${prompt}"\n\nEssay (${wordCount} words):\n${essay}` },
          ],
          language,
          context: { targetExam: "ielts" },
        }),
      });

      if (!resp.ok) throw new Error("Failed");

      // Read streamed response
      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
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
            if (delta) fullText += delta;
          } catch {}
        }
      }

      // Parse JSON from response
      const jsonMatch = fullText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as GraderResult;
        setResult(parsed);

        // Award XP
        const avgScore = parsed.rubricScores.reduce((sum, r) => sum + r.score, 0) / parsed.rubricScores.length;
        const earned = Math.round(avgScore * 8);
        addXP(earned);
        updateStreak();
        incrementEssays();
        addStudyMinutes(20);
        addPracticeSession({
          module: "Writing",
          score: Math.round(avgScore),
          maxScore: 9,
          xpEarned: earned,
          date: new Date().toISOString(),
          duration: 20,
        });
      } else {
        throw new Error("Invalid response");
      }
    } catch (e) {
      console.error("Essay grading error:", e);
      // Fallback result
      setResult({
        overallBand: "—",
        rubricScores: IELTS_CRITERIA.map(c => ({
          criterion: c.label,
          score: 0,
          maxScore: 9,
          feedback: t("Could not grade. Please try again.", "Не удалось оценить. Попробуйте снова."),
          suggestions: [],
        })),
        summary: t("An error occurred while grading your essay.", "Произошла ошибка при оценке эссе."),
        strengths: [],
        improvements: [],
        annotatedEssay: essay,
      });
    }

    setLoading(false);
  };

  const reset = () => {
    setEssay("");
    setResult(null);
    setCustomPrompt("");
    setActiveTab("overview");
  };

  // ── Results View ──
  if (result) {
    const avgScore = result.rubricScores.length > 0
      ? result.rubricScores.reduce((s, r) => s + r.score, 0) / result.rubricScores.length
      : 0;

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
          <h2 className="text-2xl font-heading font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-accent" />
            {t("Essay Grading Report", "Отчёт об оценке эссе")}
          </h2>
        </motion.div>

        {/* Overall Band Score */}
        <Card className="border-accent/30 bg-gradient-to-r from-accent/5 to-transparent">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">{t("Overall Band Score", "Общий балл")}</p>
              <p className="text-5xl font-bold text-accent">{result.overallBand}</p>
              <p className="text-sm text-muted-foreground mt-1">{wordCount} {t("words", "слов")}</p>
            </div>
            <div className="text-right">
              <p className="text-accent flex items-center gap-1 mb-2">
                <Zap className="h-4 w-4" /> +{Math.round(avgScore * 8)} XP
              </p>
              <Badge variant={parseFloat(result.overallBand) >= 7 ? "default" : "secondary"}
                className={parseFloat(result.overallBand) >= 7 ? "bg-green-500" : ""}>
                {parseFloat(result.overallBand) >= 7.5 ? t("Excellent", "Отлично")
                  : parseFloat(result.overallBand) >= 6.5 ? t("Good", "Хорошо")
                  : parseFloat(result.overallBand) >= 5.5 ? t("Competent", "Компетентно")
                  : t("Needs Work", "Нужна работа")}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Criteria Score Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {result.rubricScores.map((r, i) => {
            const meta = IELTS_CRITERIA[i];
            const pct = (r.score / r.maxScore) * 100;
            return (
              <Card key={r.criterion} className="overflow-hidden">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    {meta && <meta.icon className={`h-4 w-4 ${meta.color}`} />}
                    <p className="text-xs font-medium truncate">{language === "ru" && meta ? meta.labelRu : r.criterion}</p>
                  </div>
                  <p className="text-3xl font-bold">{r.score}<span className="text-sm text-muted-foreground">/9</span></p>
                  <Progress value={pct} className="h-1.5" />
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Detailed Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="overview">{t("Overview", "Обзор")}</TabsTrigger>
            <TabsTrigger value="criteria">{t("Criteria", "Критерии")}</TabsTrigger>
            <TabsTrigger value="annotated">{t("Annotated", "Разбор")}</TabsTrigger>
            <TabsTrigger value="tips">{t("Action Plan", "План")}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm leading-relaxed">{result.summary}</p>
              </CardContent>
            </Card>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-green-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-green-600 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" /> {t("Strengths", "Сильные стороны")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {result.strengths.map((s, i) => (
                    <p key={i} className="text-sm flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">✓</span> {s}
                    </p>
                  ))}
                </CardContent>
              </Card>
              <Card className="border-orange-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-orange-500 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> {t("To Improve", "Для улучшения")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {result.improvements.map((s, i) => (
                    <p key={i} className="text-sm flex items-start gap-2">
                      <span className="text-orange-500 mt-0.5">→</span> {s}
                    </p>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="criteria" className="space-y-4">
            {result.rubricScores.map((r, i) => {
              const meta = IELTS_CRITERIA[i];
              return (
                <Card key={r.criterion}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      {meta && <meta.icon className={`h-4 w-4 ${meta.color}`} />}
                      {language === "ru" && meta ? meta.labelRu : r.criterion}
                      <Badge variant="outline" className="ml-auto">{r.score}/9</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm">{r.feedback}</p>
                    {r.suggestions.length > 0 && (
                      <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">{t("Suggestions", "Рекомендации")}:</p>
                        {r.suggestions.map((s, j) => (
                          <p key={j} className="text-sm flex items-start gap-2">
                            <Sparkles className="h-3 w-3 text-accent mt-0.5 shrink-0" /> {s}
                          </p>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="annotated">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("Annotated Essay", "Эссе с комментариями")}</CardTitle>
                <CardDescription>{t("Bold text marks errors, [brackets] show suggestions", "Жирный текст — ошибки, [скобки] — рекомендации")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed">
                  {result.annotatedEssay}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tips" className="space-y-4">
            <Card className="border-accent/20 bg-accent/5">
              <CardContent className="p-5 space-y-3">
                <p className="font-semibold flex items-center gap-2">
                  <Target className="h-5 w-5 text-accent" />
                  {t("Your Action Plan", "Ваш план действий")}
                </p>
                <ol className="space-y-2 list-decimal list-inside text-sm">
                  {result.improvements.map((imp, i) => (
                    <li key={i}>{imp}</li>
                  ))}
                  <li>{t("Practice with more prompts on this page", "Практикуйтесь с другими темами на этой странице")}</li>
                  <li>{t("Review your weakest criterion and study example band 8-9 essays", "Изучите примеры эссе на 8-9 баллов")}</li>
                </ol>
              </CardContent>
            </Card>

            <Card className="border-accent/20 bg-gradient-to-r from-accent/5 to-transparent">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{t("Want expert human feedback?", "Хотите отзыв от эксперта?")}</p>
                  <p className="text-xs text-muted-foreground">{t("Our IELTS specialists provide detailed personal feedback", "Наши IELTS-специалисты дают подробную обратную связь")}</p>
                </div>
                <Button size="sm" onClick={() => navigate("/offerings")} className="gap-1 shrink-0">
                  {t("View Plans", "Тарифы")} <ArrowUpRight className="h-3 w-3" />
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Button variant="outline" onClick={reset} className="gap-2">
          <RotateCcw className="h-4 w-4" /> {t("Grade Another Essay", "Оценить другое эссе")}
        </Button>
      </div>
    );
  }

  // ── Input View ──
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
        <h2 className="text-2xl font-heading font-bold flex items-center gap-2">
          <PenTool className="h-6 w-6 text-accent" />
          {t("AI Essay Grader", "AI Оценщик эссе")}
        </h2>
        <p className="text-muted-foreground">
          {t("Get detailed IELTS rubric scoring with inline annotations and personalized improvement tips",
            "Получите детальную оценку по критериям IELTS с комментариями и персональными рекомендациями")}
        </p>
      </motion.div>

      {/* Task Type Selector */}
      <div className="flex gap-3">
        <Select value={taskType} onValueChange={(v) => setTaskType(v as "task1" | "task2")}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="task1">IELTS Task 1 ({t("150+ words", "150+ слов")})</SelectItem>
            <SelectItem value="task2">IELTS Task 2 ({t("250+ words", "250+ слов")})</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Prompt */}
      <Card className="border-accent/20 bg-accent/5">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] capitalize">{taskType}</Badge>
            <Badge variant="outline" className="text-[10px]">
              {selectedPrompt.difficulty === 1 ? "Easy" : selectedPrompt.difficulty === 2 ? "Medium" : "Hard"}
            </Badge>
          </div>
          <p className="text-sm italic">{selectedPrompt.topic}</p>
          <p className="text-xs text-muted-foreground">{t("Or write about your own topic below", "Или напишите на свою тему")}</p>
        </CardContent>
      </Card>

      {/* Custom prompt */}
      <div>
        <label className="text-sm text-muted-foreground mb-1 block">{t("Custom prompt (optional)", "Своя тема (опционально)")}</label>
        <Textarea
          value={customPrompt}
          onChange={e => setCustomPrompt(e.target.value)}
          placeholder={t("Enter your own essay topic...", "Введите свою тему...")}
          className="min-h-[60px]"
        />
      </div>

      {/* Essay Input */}
      <div>
        <label className="text-sm font-medium mb-1 block">{t("Your Essay", "Ваше эссе")}</label>
        <Textarea
          value={essay}
          onChange={e => setEssay(e.target.value)}
          placeholder={t(`Write your ${taskType === "task1" ? "Task 1" : "Task 2"} essay here...`,
            `Напишите эссе ${taskType === "task1" ? "Задание 1" : "Задание 2"} здесь...`)}
          className="min-h-[300px] font-mono text-sm"
        />
        <div className="flex items-center justify-between mt-2">
          <span className={`text-sm ${wordCount >= minWords ? "text-green-500 font-medium" : "text-muted-foreground"}`}>
            {wordCount} / {minWords}+ {t("words", "слов")} {wordCount >= minWords && "✓"}
          </span>
          <Button onClick={gradeEssay} disabled={wordCount < 50 || loading} className="bg-accent text-accent-foreground gap-2">
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> {t("Grading...", "Оценка...")}</>
            ) : (
              <><Sparkles className="h-4 w-4" /> {t("Grade Essay", "Оценить эссе")}</>
            )}
          </Button>
        </div>
      </div>

      {/* Info */}
      <Card className="bg-muted/30">
        <CardContent className="p-4 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">{t("How it works:", "Как это работает:")}</p>
          <p>• {t("AI examiner scores your essay on 4 official IELTS criteria", "AI экзаменатор оценивает по 4 критериям IELTS")}</p>
          <p>• {t("Each criterion scored 0-9 with detailed feedback", "Каждый критерий 0-9 с подробной обратной связью")}</p>
          <p>• {t("Get annotated essay with inline error marking", "Получите разбор эссе с пометками ошибок")}</p>
          <p>• {t("Personalized action plan for improvement", "Персональный план улучшения")}</p>
        </CardContent>
      </Card>
    </div>
  );
};

// Need Target imported for the tips tab
import { Target } from "lucide-react";

export default EssayGrader;
