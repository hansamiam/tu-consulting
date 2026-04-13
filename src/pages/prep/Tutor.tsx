import { useState, useRef, useEffect } from "react";
import { usePrep } from "@/contexts/PrepContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Bot, Send, User, Loader2, Sparkles, RotateCcw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";

interface Msg { role: "user" | "assistant"; content: string; }

const PREP_TUTOR_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/prep-tutor`;

const Tutor = () => {
  const { language, targetExam, diagnosticResults, addXP, updateStreak } = usePrep();
  const t = (en: string, ru: string) => language === "ru" ? ru : en;

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const hasEarnedXP = useRef(false);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const suggestedQuestions = language === "ru"
    ? ["Как улучшить балл IELTS Writing?", "Объясни стратегию SAT Math", "Помоги с грамматикой", "Как написать сильное эссе?"]
    : ["How to improve IELTS Writing?", "Explain SAT Math strategies", "Help with grammar", "How to write a strong essay?"];

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Msg = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    if (!hasEarnedXP.current) {
      addXP(10); updateStreak();
      hasEarnedXP.current = true;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const context = {
        targetExam,
        diagnosticResults: diagnosticResults.slice(-5),
      };

      const resp = await fetch(PREP_TUTOR_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: newMessages, language, context }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Request failed");
      }

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx;
        while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantContent += delta;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
                return [...prev, { role: "assistant", content: assistantContent }];
              });
            }
          } catch { buffer = line + "\n" + buffer; break; }
        }
      }
    } catch (e: any) {
      clearTimeout(timeout);
      const isAbort = e.name === "AbortError";
      const errorMsg = isAbort
        ? (language === "ru" ? "⏱ Время ожидания истекло. Нажмите ↻ чтобы повторить." : "⏱ Request timed out. Tap ↻ to retry.")
        : `⚠️ ${e.message || (language === "ru" ? "Что-то пошло не так. Нажмите ↻." : "Something went wrong. Tap ↻ to retry.")}`;
      setMessages(prev => [...prev, { role: "assistant", content: errorMsg }]);
    } finally {
      setLoading(false);
    }
  };

  const retryLast = () => {
    const lastUserMsg = [...messages].reverse().find(m => m.role === "user");
    if (lastUserMsg) {
      setMessages(prev => prev[prev.length - 1]?.role === "assistant" ? prev.slice(0, -1) : prev);
      send(lastUserMsg.content);
    }
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      <div className="space-y-1 mb-4">
        <h2 className="text-2xl font-heading font-bold flex items-center gap-2">
          <Bot className="h-6 w-6 text-accent" /> {t("AI Tutor", "AI Репетитор")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("Ask about grammar, essays, exam strategies, and more", "Спрашивайте о грамматике, эссе, стратегиях экзаменов")}</p>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardContent className="flex-1 overflow-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full space-y-4 text-center">
              <Sparkles className="h-10 w-10 text-accent" />
              <p className="text-muted-foreground">{t("Start a conversation with your AI tutor", "Начните разговор с AI репетитором")}</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {suggestedQuestions.map(q => (
                  <Badge key={q} variant="outline" className="cursor-pointer hover:bg-accent/10 hover:border-accent transition-colors" onClick={() => send(q)}>
                    {q}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
              {msg.role === "assistant" && <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center shrink-0"><Bot className="h-4 w-4 text-accent" /></div>}
              <div className={`max-w-[80%] rounded-lg p-3 text-sm ${msg.role === "user" ? "bg-accent text-accent-foreground" : "bg-muted"}`}>
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                ) : msg.content}
              </div>
              {msg.role === "user" && <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center shrink-0"><User className="h-4 w-4 text-accent-foreground" /></div>}
            </motion.div>
          ))}

          {loading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center"><Bot className="h-4 w-4 text-accent" /></div>
              <div className="bg-muted rounded-lg p-3"><Loader2 className="h-4 w-4 animate-spin text-accent" /></div>
            </div>
          )}
          <div ref={bottomRef} />
        </CardContent>

        <div className="p-4 border-t border-border">
          <form onSubmit={e => { e.preventDefault(); send(input); }} className="flex gap-2">
            <Input value={input} onChange={e => setInput(e.target.value)} placeholder={t("Ask about test prep...", "Спросите о подготовке к экзаменам...")} disabled={loading} className="flex-1" />
            <Button type="submit" disabled={!input.trim() || loading} className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
};

export default Tutor;
