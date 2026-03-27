import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PenTool, Lightbulb, Loader2, Send, Sparkles, Copy, CheckCircle2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/topuni-chat`;

interface EssayToolsProps {
  profile: {
    fullName: string;
    major: string;
    targetCountries: string[];
    gpa: string;
    gradeLevel: string;
  };
  language: "en" | "ru";
}

const EssayTools = ({ profile, language }: EssayToolsProps) => {
  const isRu = language === "ru";
  const t = (en: string, ru: string) => (isRu ? ru : en);

  // Essay Reviewer state
  const [essayText, setEssayText] = useState("");
  const [essayType, setEssayType] = useState("personal-statement");
  const [reviewResult, setReviewResult] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);

  // Brainstormer state
  const [brainstormPrompt, setBrainstormPrompt] = useState("");
  const [brainstormResult, setBrainstormResult] = useState("");
  const [brainstormLoading, setBrainstormLoading] = useState(false);

  const [copied, setCopied] = useState(false);

  const streamAI = async (systemPrompt: string, userPrompt: string, onDelta: (chunk: string) => void, onDone: () => void) => {
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        language,
      }),
    });

    if (!resp.ok || !resp.body) {
      onDelta("Something went wrong. Please try again.");
      onDone();
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") { onDone(); return; }
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) onDelta(content);
        } catch { break; }
      }
    }
    onDone();
  };

  const reviewEssay = async () => {
    if (!essayText.trim() || reviewLoading) return;
    setReviewLoading(true);
    setReviewResult("");
    let soFar = "";

    const systemPrompt = `You are an elite university admissions essay reviewer. The student is ${profile.fullName}, studying ${profile.major || "undeclared"}, targeting ${profile.targetCountries.join(", ") || "international universities"}, GPA: ${profile.gpa || "N/A"}.

Review their ${essayType.replace("-", " ")} and provide:
1. **Overall Score** (1-10) with letter grade
2. **Strengths** - What works well (be specific, quote lines)
3. **Critical Issues** - What needs fixing (grammar, structure, clarity, authenticity)
4. **Line-by-Line Annotations** - Flag specific sentences with suggestions
5. **Admissions Impact** - How this essay would be perceived by an admissions committee
6. **Rewrite Suggestions** - Provide 2-3 alternative openings or key paragraph rewrites
7. **Action Plan** - Prioritized list of revisions

Be honest but constructive. This is a premium review.`;

    await streamAI(
      systemPrompt,
      `Please review this ${essayType.replace("-", " ")}:\n\n${essayText}`,
      (chunk) => { soFar += chunk; setReviewResult(soFar); },
      () => setReviewLoading(false)
    );
  };

  const brainstormEssay = async () => {
    if (brainstormLoading) return;
    setBrainstormLoading(true);
    setBrainstormResult("");
    let soFar = "";

    const context = brainstormPrompt.trim() || `I'm applying to study ${profile.major || "my chosen field"} at universities in ${profile.targetCountries.join(", ") || "various countries"}`;

    const systemPrompt = `You are an elite university admissions essay strategist. The student is ${profile.fullName}, studying ${profile.major || "undeclared"}, GPA: ${profile.gpa || "N/A"}, grade: ${profile.gradeLevel || "N/A"}.

Generate creative, compelling, and unique essay ideas. For each idea provide:
- **Hook** - A powerful opening line
- **Core Narrative** - The story arc  
- **Unique Angle** - What makes this stand out
- **Universities It Works For** - Which types of schools would love this

Provide 5 distinct essay concepts ranging from safe to bold. Include at least one unconventional approach that would make an admissions officer stop and read twice.`;

    await streamAI(
      systemPrompt,
      `Help me brainstorm essay topics. Context: ${context}`,
      (chunk) => { soFar += chunk; setBrainstormResult(soFar); },
      () => setBrainstormLoading(false)
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const essayTypes = [
    { value: "personal-statement", label: t("Personal Statement", "Мотивационное письмо") },
    { value: "supplemental", label: t("Supplemental Essay", "Доп. эссе") },
    { value: "why-us", label: t("Why This University", "Почему этот университет") },
    { value: "diversity", label: t("Diversity Essay", "Эссе о разнообразии") },
    { value: "activity", label: t("Activity Essay", "Эссе об активности") },
  ];

  return (
    <Tabs defaultValue="reviewer" className="space-y-4">
      <TabsList className="grid w-full grid-cols-2 h-auto gap-1 bg-muted/50 p-1">
        <TabsTrigger value="reviewer" className="flex items-center gap-1.5 text-xs sm:text-sm py-2">
          <PenTool className="w-4 h-4" /> {t("Essay Reviewer", "Проверка эссе")}
        </TabsTrigger>
        <TabsTrigger value="brainstormer" className="flex items-center gap-1.5 text-xs sm:text-sm py-2">
          <Lightbulb className="w-4 h-4" /> {t("Idea Generator", "Генератор идей")}
        </TabsTrigger>
      </TabsList>

      {/* ESSAY REVIEWER */}
      <TabsContent value="reviewer">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <PenTool className="w-5 h-5 text-accent" />
              {t("AI Essay Reviewer", "AI Проверка эссе")}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {t("Paste your essay and get line-by-line feedback from an admissions expert AI.", "Вставьте эссе и получите детальный разбор от AI-эксперта.")}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {essayTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setEssayType(type.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    essayType === type.value
                      ? "bg-accent text-accent-foreground border-accent"
                      : "bg-background text-muted-foreground border-border hover:border-accent/50"
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>

            <textarea
              value={essayText}
              onChange={(e) => setEssayText(e.target.value)}
              placeholder={t(
                "Paste your essay here... (minimum 100 words recommended)",
                "Вставьте эссе сюда... (минимум 100 слов рекомендуется)"
              )}
              className="w-full min-h-[200px] p-4 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
            />

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {essayText.split(/\s+/).filter(Boolean).length} {t("words", "слов")}
              </span>
              <Button variant="gold" onClick={reviewEssay} disabled={reviewLoading || essayText.trim().length < 50}>
                {reviewLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                {t("Review Essay", "Проверить эссе")}
              </Button>
            </div>

            {reviewResult && (
              <div className="border border-accent/20 rounded-lg p-4 bg-accent/5">
                <div className="flex items-center justify-between mb-3">
                  <Badge className="bg-accent/10 text-accent border-accent/30">
                    <Sparkles className="w-3 h-3 mr-1" /> {t("AI Review", "AI Отзыв")}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(reviewResult)}>
                    {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <div className="prose prose-sm max-w-none dark:prose-invert [&_h2]:text-foreground [&_h3]:text-foreground [&_p]:text-muted-foreground [&_li]:text-muted-foreground [&_strong]:text-foreground">
                  <ReactMarkdown>{reviewResult}</ReactMarkdown>
                  {reviewLoading && <span className="inline-block w-2 h-4 bg-accent animate-pulse ml-1" />}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* BRAINSTORMER */}
      <TabsContent value="brainstormer">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lightbulb className="w-5 h-5 text-accent" />
              {t("Essay Idea Generator", "Генератор идей для эссе")}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {t("Get 5 unique, compelling essay concepts tailored to your profile and target universities.", "Получите 5 уникальных концепций эссе, адаптированных под ваш профиль.")}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                value={brainstormPrompt}
                onChange={(e) => setBrainstormPrompt(e.target.value)}
                placeholder={t(
                  "Optional: Add context (e.g., 'I grew up in a small town and love robotics')",
                  "Опционально: Добавьте контекст (напр., 'Я вырос в маленьком городе и люблю робототехнику')"
                )}
                className="text-sm"
              />
            </div>

            <Button variant="gold" onClick={brainstormEssay} disabled={brainstormLoading} className="w-full">
              {brainstormLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Lightbulb className="w-4 h-4 mr-2" />}
              {t("Generate Essay Ideas", "Сгенерировать идеи")}
            </Button>

            {brainstormResult && (
              <div className="border border-accent/20 rounded-lg p-4 bg-accent/5">
                <div className="flex items-center justify-between mb-3">
                  <Badge className="bg-accent/10 text-accent border-accent/30">
                    <Lightbulb className="w-3 h-3 mr-1" /> {t("Essay Concepts", "Концепции эссе")}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(brainstormResult)}>
                    {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <div className="prose prose-sm max-w-none dark:prose-invert [&_h2]:text-foreground [&_h3]:text-foreground [&_p]:text-muted-foreground [&_li]:text-muted-foreground [&_strong]:text-foreground">
                  <ReactMarkdown>{brainstormResult}</ReactMarkdown>
                  {brainstormLoading && <span className="inline-block w-2 h-4 bg-accent animate-pulse ml-1" />}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default EssayTools;
