import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Mic, Send, Loader2, RotateCcw, Play, User, GraduationCap, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/topuni-chat`;

interface InterviewSimulatorProps {
  profile: {
    fullName: string;
    major: string;
    targetCountries: string[];
    gpa: string;
    gradeLevel: string;
  };
  language: "en" | "ru";
}

type InterviewMsg = { role: "interviewer" | "student"; content: string };

const INTERVIEW_TYPES = [
  { id: "admissions", labelEn: "Admissions Interview", labelRu: "Вступительное интервью", icon: GraduationCap },
  { id: "scholarship", labelEn: "Scholarship Interview", labelRu: "Интервью на стипендию", icon: Sparkles },
  { id: "visa", labelEn: "Visa Interview Prep", labelRu: "Подготовка к визовому интервью", icon: User },
];

const InterviewSimulator = ({ profile, language }: InterviewSimulatorProps) => {
  const isRu = language === "ru";
  const t = (en: string, ru: string) => (isRu ? ru : en);

  const [interviewType, setInterviewType] = useState<string | null>(null);
  const [universityName, setUniversityName] = useState("");
  const [messages, setMessages] = useState<InterviewMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [feedbackMode, setFeedbackMode] = useState(false);
  const [feedback, setFeedback] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, feedback]);

  const streamAI = async (systemPrompt: string, userMessages: { role: string; content: string }[], onDelta: (chunk: string) => void, onDone: () => void) => {
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        messages: [{ role: "system", content: systemPrompt }, ...userMessages],
        language,
      }),
    });

    if (!resp.ok || !resp.body) { onDelta("Something went wrong."); onDone(); return; }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf("\n")) !== -1) {
        let line = buf.slice(0, idx);
        buf = buf.slice(idx + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (!line.startsWith("data: ")) continue;
        const json = line.slice(6).trim();
        if (json === "[DONE]") { onDone(); return; }
        try {
          const c = JSON.parse(json).choices?.[0]?.delta?.content;
          if (c) onDelta(c);
        } catch { break; }
      }
    }
    onDone();
  };

  const getSystemPrompt = () => {
    const uni = universityName || "a top international university";
    const base = `You are a realistic ${interviewType} interviewer at ${uni}. The student is ${profile.fullName}, studying ${profile.major || "undeclared"}, GPA: ${profile.gpa || "N/A"}, from ${profile.targetCountries.join(", ") || "abroad"}.

Conduct a realistic interview:
- Ask ONE question at a time
- Start with icebreakers, then go deeper
- React naturally to their answers (brief acknowledgment, then next question)
- Include follow-up questions based on their responses
- After 6-8 questions, wrap up the interview naturally
- Stay in character as the interviewer throughout
- Be warm but professional`;

    if (interviewType === "scholarship") return base + "\n- Focus on leadership, community impact, financial need, academic ambition";
    if (interviewType === "visa") return base + "\n- Act as a visa officer. Ask about study plans, financial support, ties to home country, post-graduation plans. Be more formal.";
    return base;
  };

  const startInterview = async () => {
    if (!interviewType) return;
    setStarted(true);
    setLoading(true);
    setMessages([]);
    setQuestionCount(1);
    setFeedbackMode(false);
    setFeedback("");

    let soFar = "";
    await streamAI(
      getSystemPrompt(),
      [{ role: "user", content: "Please start the interview. Greet me and ask your first question." }],
      (chunk) => {
        soFar += chunk;
        setMessages([{ role: "interviewer", content: soFar }]);
      },
      () => setLoading(false)
    );
  };

  const sendResponse = async (text: string) => {
    if (!text.trim() || loading) return;
    const studentMsg: InterviewMsg = { role: "student", content: text.trim() };
    const allMsgs = [...messages, studentMsg];
    setMessages(allMsgs);
    setInput("");
    setLoading(true);
    setQuestionCount((c) => c + 1);

    const chatHistory = allMsgs.map((m) => ({
      role: m.role === "interviewer" ? "assistant" : "user",
      content: m.content,
    }));

    let soFar = "";
    await streamAI(
      getSystemPrompt(),
      chatHistory,
      (chunk) => {
        soFar += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "interviewer" && prev.indexOf(last) === prev.length - 1 && !allMsgs.includes(last)) {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: soFar } : m));
          }
          return [...prev, { role: "interviewer", content: soFar }];
        });
      },
      () => setLoading(false)
    );
  };

  const getFeedback = async () => {
    setFeedbackMode(true);
    setLoading(true);
    setFeedback("");
    let soFar = "";

    const transcript = messages.map((m) => `${m.role === "interviewer" ? "Interviewer" : "Student"}: ${m.content}`).join("\n\n");

    await streamAI(
      `You are an expert admissions interview coach. Analyze this interview transcript and provide detailed feedback:
1. **Overall Performance Score** (1-10)
2. **Strengths** - What the student did well
3. **Areas for Improvement** - Specific weaknesses with examples from the transcript
4. **Body Language Tips** (general advice)
5. **Answer Quality Breakdown** - Rate each answer
6. **Suggested Better Answers** - For the 2 weakest responses, provide model answers
7. **Final Verdict** - Would this student likely pass this interview?`,
      [{ role: "user", content: `Here's the interview transcript:\n\n${transcript}` }],
      (chunk) => { soFar += chunk; setFeedback(soFar); },
      () => setLoading(false)
    );
  };

  const reset = () => {
    setStarted(false);
    setMessages([]);
    setFeedback("");
    setFeedbackMode(false);
    setQuestionCount(0);
  };

  // Setup screen
  if (!started) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mic className="w-5 h-5 text-accent" />
            {t("Interview Simulator", "Симулятор интервью")}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {t("Practice realistic admissions, scholarship, or visa interviews with AI.", "Практикуйте реалистичные интервью с AI.")}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">{t("Select interview type:", "Выберите тип интервью:")}</p>
            <div className="grid sm:grid-cols-3 gap-3">
              {INTERVIEW_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setInterviewType(type.id)}
                  className={`p-4 rounded-lg border-2 transition-all text-left space-y-2 ${
                    interviewType === type.id
                      ? "border-accent bg-accent/5"
                      : "border-border hover:border-accent/30"
                  }`}
                >
                  <type.icon className={`w-6 h-6 ${interviewType === type.id ? "text-accent" : "text-muted-foreground"}`} />
                  <p className="text-sm font-semibold text-foreground">{isRu ? type.labelRu : type.labelEn}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">{t("University name (optional):", "Университет (опционально):")}</p>
            <Input
              value={universityName}
              onChange={(e) => setUniversityName(e.target.value)}
              placeholder={t("e.g., MIT, Oxford, ETH Zurich", "напр., MIT, Oxford, ETH Zurich")}
              className="text-sm"
            />
          </div>

          <Button variant="gold" size="lg" className="w-full" onClick={startInterview} disabled={!interviewType}>
            <Play className="w-5 h-5 mr-2" /> {t("Start Interview", "Начать интервью")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Interview + feedback screen
  return (
    <Card className="h-[650px] flex flex-col">
      <CardHeader className="shrink-0 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mic className="w-5 h-5 text-accent" />
            {t("Live Interview", "Интервью")}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">Q{questionCount}</Badge>
            {!feedbackMode && messages.length >= 4 && (
              <Button variant="outline" size="sm" onClick={getFeedback} disabled={loading}>
                <Sparkles className="w-3 h-3 mr-1" /> {t("Get Feedback", "Получить отзыв")}
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "student" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
              msg.role === "student" ? "bg-accent text-accent-foreground" : "bg-muted text-foreground"
            }`}>
              <div className="flex items-center gap-1.5 mb-1">
                {msg.role === "interviewer" ? <GraduationCap className="w-3 h-3" /> : <User className="w-3 h-3" />}
                <span className="text-[10px] font-semibold uppercase opacity-60">
                  {msg.role === "interviewer" ? t("Interviewer", "Интервьюер") : t("You", "Вы")}
                </span>
              </div>
              <div className="prose prose-sm max-w-none [&_p]:my-1">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}

        {feedbackMode && feedback && (
          <div className="border border-accent/20 rounded-lg p-4 bg-accent/5 my-4">
            <Badge className="bg-accent/10 text-accent border-accent/30 mb-3">
              <Sparkles className="w-3 h-3 mr-1" /> {t("Performance Review", "Оценка")}
            </Badge>
            <div className="prose prose-sm max-w-none dark:prose-invert [&_h2]:text-foreground [&_h3]:text-foreground [&_p]:text-muted-foreground [&_li]:text-muted-foreground [&_strong]:text-foreground">
              <ReactMarkdown>{feedback}</ReactMarkdown>
              {loading && <span className="inline-block w-2 h-4 bg-accent animate-pulse ml-1" />}
            </div>
          </div>
        )}

        {loading && messages.length > 0 && messages[messages.length - 1]?.role === "student" && !feedbackMode && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-3 py-2">
              <Loader2 className="w-4 h-4 animate-spin text-accent" />
            </div>
          </div>
        )}
      </div>

      {!feedbackMode && (
        <div className="border-t border-border p-4 shrink-0">
          <form onSubmit={(e) => { e.preventDefault(); sendResponse(input); }} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("Type your answer...", "Введите ответ...")}
              className="text-sm"
              disabled={loading}
            />
            <Button type="submit" size="icon" variant="gold" disabled={loading || !input.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      )}

      {feedbackMode && !loading && (
        <div className="border-t border-border p-4 shrink-0">
          <Button variant="gold" className="w-full" onClick={reset}>
            <RotateCcw className="w-4 h-4 mr-2" /> {t("Start New Interview", "Начать заново")}
          </Button>
        </div>
      )}
    </Card>
  );
};

export default InterviewSimulator;
