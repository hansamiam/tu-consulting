import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { MessageCircle, X, Send, Sparkles, Loader2, RotateCcw } from "lucide-react";
import ReactMarkdown from "react-markdown";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/topuni-chat`;

const SUGGESTED_QUESTIONS_EN = [
  "What universities can I get into with a 3.5 GPA?",
  "How do I get a scholarship in the US?",
  "What IELTS score do I need for UK universities?",
  "Best countries for studying CS on a budget?",
];

const SUGGESTED_QUESTIONS_RU = [
  "В какие университеты я могу поступить с GPA 3.5?",
  "Как получить стипендию в США?",
  "Какой балл IELTS нужен для университетов Великобритании?",
  "Лучшие страны для изучения IT с ограниченным бюджетом?",
];

interface TopUniChatProps {
  language?: "en" | "ru";
}

const TopUniChat = ({ language = "en" }: TopUniChatProps) => {
  const isRu = language === "ru";
  const SUGGESTED_QUESTIONS = isRu ? SUGGESTED_QUESTIONS_RU : SUGGESTED_QUESTIONS_EN;
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Msg = { role: "user", content: text.trim() };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";
    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: allMessages, language }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!resp.ok || !resp.body) {
        const errData = await resp.json().catch(() => ({}));
        upsertAssistant(errData.error || (isRu ? "Произошла ошибка. Попробуйте снова." : "Sorry, something went wrong. Please try again."));
        setIsLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch { /* ignore */ }
        }
      }
    } catch (e: any) {
      clearTimeout(timeout);
      const isTimeout = e.name === "AbortError";
      const errorMsg = isTimeout
        ? (isRu ? "⏱ Время ожидания истекло. Нажмите «↻» чтобы повторить." : "⏱ Request timed out. Tap ↻ to retry.")
        : (isRu ? "⚠️ Не удалось подключиться. Нажмите «↻» чтобы повторить." : "⚠️ Couldn't connect. Tap ↻ to retry.");
      upsertAssistant(errorMsg);
    }

    setIsLoading(false);
  };

  const retryLast = () => {
    const lastUserMsg = [...messages].reverse().find(m => m.role === "user");
    if (lastUserMsg) {
      setMessages(prev => {
        const lastAssistant = prev[prev.length - 1];
        if (lastAssistant?.role === "assistant") return prev.slice(0, -1);
        return prev;
      });
      sendMessage(lastUserMsg.content);
    }
  };

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-accent text-accent-foreground shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center"
          >
            <MessageCircle className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-6rem)] flex flex-col"
          >
            <Card className="flex flex-col h-full border-accent/30 shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-accent" />
                  <div>
                    <p className="font-heading font-semibold text-sm">TopUni AI Navigator</p>
                    <p className="text-[11px] text-primary-foreground/60">{isRu ? "Спросите о поступлении" : "Ask anything about admissions"}</p>
                  </div>
                </div>
                <button onClick={() => setIsOpen(false)} className="text-primary-foreground/60 hover:text-primary-foreground transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-background">
                {messages.length === 0 && (
                  <div className="space-y-3">
                    <div className="bg-accent/10 rounded-lg p-3 text-sm text-muted-foreground">
                    <p className="font-semibold text-foreground mb-1">{isRu ? "👋 Привет! Я ваш навигатор TopUni." : "👋 Hi! I'm your TopUni Navigator."}</p>
                      <p>{isRu ? "Задайте любой вопрос о поступлении, стипендиях или планировании учёбы за рубежом." : "Ask me anything about university admissions, scholarships, or study abroad planning."}</p>
                    </div>
                    <div className="space-y-2">
                      {SUGGESTED_QUESTIONS.map((q, i) => (
                        <button
                          key={i}
                          onClick={() => sendMessage(q)}
                          className="w-full text-left text-xs px-3 py-2 rounded-md border border-border hover:border-accent/50 hover:bg-accent/5 text-muted-foreground transition-colors"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                      msg.role === "user"
                        ? "bg-accent text-accent-foreground"
                        : "bg-muted text-foreground"
                    }`}>
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && messages[messages.length - 1]?.role === "user" && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-3 py-2">
                      <Loader2 className="w-4 h-4 animate-spin text-accent" />
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="border-t border-border p-3 bg-background shrink-0">
                <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }} className="flex gap-2">
                  <Input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder={isRu ? "Спросите об университетах..." : "Ask about universities..."}
                    className="text-sm"
                    disabled={isLoading}
                  />
                  <Button type="submit" size="icon" variant="gold" disabled={isLoading || !input.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default TopUniChat;
