import { useState } from "react";
import { usePrep } from "@/contexts/PrepContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  BookX, Plus, Search, Filter, Trash2, ChevronDown, ChevronUp,
  AlertTriangle, Brain, Lightbulb, Tag, Calendar,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface MistakeEntry {
  id: string;
  date: string;
  module: string;
  question: string;
  yourAnswer: string;
  correctAnswer: string;
  explanation: string;
  tags: string[];
  reviewed: boolean;
  reviewCount: number;
}

const MODULE_OPTIONS = [
  "IELTS Reading", "IELTS Writing", "IELTS Listening", "IELTS Speaking",
  "SAT Math", "SAT Reading", "SAT Writing", "SAT Grammar",
];

const MistakeJournal = () => {
  const { language } = usePrep();
  const t = (en: string, ru: string) => language === "ru" ? ru : en;

  const [entries, setEntries] = useState<MistakeEntry[]>(() => {
    try {
      const saved = localStorage.getItem("topuni-mistakes");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [filterModule, setFilterModule] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form state
  const [formModule, setFormModule] = useState(MODULE_OPTIONS[0]);
  const [formQuestion, setFormQuestion] = useState("");
  const [formYourAnswer, setFormYourAnswer] = useState("");
  const [formCorrectAnswer, setFormCorrectAnswer] = useState("");
  const [formExplanation, setFormExplanation] = useState("");
  const [formTags, setFormTags] = useState("");

  const save = (updated: MistakeEntry[]) => {
    setEntries(updated);
    localStorage.setItem("topuni-mistakes", JSON.stringify(updated));
  };

  const addEntry = () => {
    if (!formQuestion.trim()) { toast.error(t("Question is required", "Вопрос обязателен")); return; }
    const entry: MistakeEntry = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      module: formModule,
      question: formQuestion,
      yourAnswer: formYourAnswer,
      correctAnswer: formCorrectAnswer,
      explanation: formExplanation,
      tags: formTags.split(",").map(t => t.trim()).filter(Boolean),
      reviewed: false,
      reviewCount: 0,
    };
    save([entry, ...entries]);
    setFormQuestion(""); setFormYourAnswer(""); setFormCorrectAnswer(""); setFormExplanation(""); setFormTags("");
    setShowForm(false);
    toast.success(t("Mistake logged! Review it later to learn.", "Ошибка записана! Повторите позже."));
  };

  const toggleReviewed = (id: string) => {
    save(entries.map(e => e.id === id ? { ...e, reviewed: !e.reviewed, reviewCount: e.reviewCount + 1 } : e));
  };

  const deleteEntry = (id: string) => {
    save(entries.filter(e => e.id !== id));
    toast.info(t("Entry removed", "Запись удалена"));
  };

  const filtered = entries.filter(e => {
    if (filterModule !== "all" && e.module !== filterModule) return false;
    if (search && !e.question.toLowerCase().includes(search.toLowerCase()) && !e.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  const moduleStats = MODULE_OPTIONS.map(m => ({
    module: m,
    count: entries.filter(e => e.module === m).length,
    unreviewed: entries.filter(e => e.module === m && !e.reviewed).length,
  })).filter(s => s.count > 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <BookX className="h-7 w-7 text-accent" />
            {t("Mistake Journal", "Журнал ошибок")}
          </h2>
          <p className="text-muted-foreground text-sm">{t("Log mistakes, review them, never repeat them.", "Записывайте ошибки, повторяйте, не допускайте снова.")}</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="bg-accent text-accent-foreground gap-1">
          <Plus className="h-4 w-4" /> {t("Log Mistake", "Записать")}
        </Button>
      </motion.div>

      {/* Stats */}
      {moduleStats.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {moduleStats.map(s => (
            <Badge
              key={s.module}
              variant="outline"
              className={`shrink-0 cursor-pointer transition-colors ${filterModule === s.module ? "bg-accent/15 text-accent border-accent/30" : ""}`}
              onClick={() => setFilterModule(filterModule === s.module ? "all" : s.module)}
            >
              {s.module} ({s.count})
              {s.unreviewed > 0 && <span className="ml-1 text-destructive">•{s.unreviewed}</span>}
            </Badge>
          ))}
        </div>
      )}

      {/* Add Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <Card className="border-accent/20">
              <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">{t("Module", "Модуль")}</label>
                    <select value={formModule} onChange={e => setFormModule(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      {MODULE_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">{t("Tags (comma-separated)", "Теги (через запятую)")}</label>
                    <Input value={formTags} onChange={e => setFormTags(e.target.value)} placeholder="grammar, tenses, vocabulary..." />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">{t("Question / Problem", "Вопрос / Задача")}</label>
                  <Textarea value={formQuestion} onChange={e => setFormQuestion(e.target.value)} rows={2} placeholder={t("Describe the question you got wrong...", "Опишите вопрос, на который ответили неправильно...")} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">{t("Your Answer", "Ваш ответ")}</label>
                    <Input value={formYourAnswer} onChange={e => setFormYourAnswer(e.target.value)} placeholder={t("What you answered", "Что ответили")} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">{t("Correct Answer", "Правильный ответ")}</label>
                    <Input value={formCorrectAnswer} onChange={e => setFormCorrectAnswer(e.target.value)} placeholder={t("The right answer", "Правильный ответ")} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">{t("Why you got it wrong / Explanation", "Почему ошиблись / Объяснение")}</label>
                  <Textarea value={formExplanation} onChange={e => setFormExplanation(e.target.value)} rows={2} placeholder={t("What concept did you misunderstand?", "Какой концепт не поняли?")} />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowForm(false)}>{t("Cancel", "Отмена")}</Button>
                  <Button onClick={addEntry} className="bg-accent text-accent-foreground">{t("Save Mistake", "Сохранить")}</Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} className="pl-10" placeholder={t("Search mistakes by question or tag...", "Поиск по вопросу или тегу...")} />
      </div>

      {/* Entries */}
      {filtered.length === 0 ? (
        <Card className="border-dashed border-2 border-muted-foreground/20">
          <CardContent className="p-8 text-center space-y-2">
            <BookX className="h-10 w-10 mx-auto text-muted-foreground/40" />
            <p className="font-medium text-muted-foreground">{t("No mistakes logged yet", "Ошибок пока нет")}</p>
            <p className="text-xs text-muted-foreground/70">{t("Every mistake is a learning opportunity. Log them to track your growth!", "Каждая ошибка — возможность учиться!")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry, i) => (
            <motion.div key={entry.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
              <Card className={`transition-all ${entry.reviewed ? "opacity-60" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 cursor-pointer" onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}>
                    <AlertTriangle className={`h-5 w-5 mt-0.5 shrink-0 ${entry.reviewed ? "text-green-500" : "text-destructive"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">{entry.module}</Badge>
                        {entry.tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-[10px] gap-0.5">
                            <Tag className="h-2.5 w-2.5" />{tag}
                          </Badge>
                        ))}
                        <span className="text-[10px] text-muted-foreground ml-auto flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(entry.date).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground mt-1 line-clamp-2">{entry.question}</p>
                    </div>
                    {expandedId === entry.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <AnimatePresence>
                    {expandedId === entry.id && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-3 pt-3 border-t border-border space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-2 rounded bg-destructive/5 border border-destructive/10">
                            <p className="text-[10px] text-destructive font-medium mb-0.5">{t("YOUR ANSWER", "ВАШ ОТВЕТ")}</p>
                            <p className="text-sm text-foreground">{entry.yourAnswer || "—"}</p>
                          </div>
                          <div className="p-2 rounded bg-green-500/5 border border-green-500/10">
                            <p className="text-[10px] text-green-500 font-medium mb-0.5">{t("CORRECT", "ПРАВИЛЬНО")}</p>
                            <p className="text-sm text-foreground">{entry.correctAnswer || "—"}</p>
                          </div>
                        </div>
                        {entry.explanation && (
                          <div className="p-2 rounded bg-muted/50 flex gap-2">
                            <Lightbulb className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-sm text-muted-foreground">{entry.explanation}</p>
                          </div>
                        )}
                        <div className="flex items-center gap-2 justify-end">
                          <Badge variant="outline" className="text-[10px]">
                            <Brain className="h-3 w-3 mr-1" /> {t("Reviewed", "Повторено")} {entry.reviewCount}x
                          </Badge>
                          <Button size="sm" variant="outline" onClick={() => toggleReviewed(entry.id)} className={entry.reviewed ? "text-green-500" : ""}>
                            {entry.reviewed ? t("Mark Unreviewed", "Не повторено") : t("Mark Reviewed", "Повторено")} ✓
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => deleteEntry(entry.id)} className="text-destructive hover:text-destructive">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Summary */}
      {entries.length > 0 && (
        <Card className="bg-muted/30">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">
              {t(`${entries.length} mistakes logged · ${entries.filter(e => e.reviewed).length} reviewed · ${entries.filter(e => !e.reviewed).length} pending review`,
                 `${entries.length} ошибок · ${entries.filter(e => e.reviewed).length} повторено · ${entries.filter(e => !e.reviewed).length} ожидает`)}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MistakeJournal;
