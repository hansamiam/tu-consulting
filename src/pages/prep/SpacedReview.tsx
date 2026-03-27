import { useState, useMemo } from "react";
import { usePrep } from "@/contexts/PrepContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, RotateCcw, Zap, ArrowRight, CheckCircle2,
  Clock, Layers, AlertTriangle, Sparkles, Calendar,
} from "lucide-react";
import { allQuestions, BankQuestion } from "@/data/questionBank";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SM-2 SPACED REPETITION ALGORITHM
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface SRSCard {
  questionId: string;
  easeFactor: number;  // ≥1.3
  interval: number;    // days
  repetitions: number;
  nextReview: string;  // ISO date
  lastQuality: number; // 0-5
}

const SRS_STORAGE_KEY = "topuni-prep-srs";

function loadSRSCards(): SRSCard[] {
  try {
    const saved = localStorage.getItem(SRS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

function saveSRSCards(cards: SRSCard[]) {
  localStorage.setItem(SRS_STORAGE_KEY, JSON.stringify(cards));
}

function sm2Update(card: SRSCard, quality: number): SRSCard {
  // quality: 0=total blackout, 1=wrong, 2=wrong but close, 3=correct with effort, 4=correct, 5=perfect
  let { easeFactor, interval, repetitions } = card;

  if (quality < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * easeFactor);
    repetitions++;
  }

  easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + interval);

  return {
    ...card,
    easeFactor,
    interval,
    repetitions,
    nextReview: nextDate.toISOString(),
    lastQuality: quality,
  };
}

function getOrCreateCard(questionId: string, cards: SRSCard[]): SRSCard {
  const existing = cards.find(c => c.questionId === questionId);
  if (existing) return existing;
  return {
    questionId,
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    nextReview: new Date().toISOString(),
    lastQuality: -1,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMPONENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const SpacedReview = () => {
  const { language, addXP, updateStreak, addStudyMinutes, updateSkillProfile } = usePrep();
  const t = (en: string, ru: string) => language === "ru" ? ru : en;

  const [srsCards, setSrsCards] = useState<SRSCard[]>(loadSRSCards);
  const [sessionActive, setSessionActive] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [sessionResults, setSessionResults] = useState<{ qId: string; correct: boolean }[]>([]);
  const [done, setDone] = useState(false);

  // Get due cards
  const now = new Date().toISOString();
  const dueCards = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return srsCards.filter(c => new Date(c.nextReview) <= today);
  }, [srsCards]);

  // New cards = questions not yet in SRS
  const newQuestionIds = useMemo(() => {
    const existingIds = new Set(srsCards.map(c => c.questionId));
    return allQuestions.filter(q => !existingIds.has(q.id)).map(q => q.id);
  }, [srsCards]);

  // Build review session: due cards + some new cards
  const sessionQuestions = useMemo(() => {
    if (!sessionActive) return [];
    const dueQIds = dueCards.map(c => c.questionId);
    const newToAdd = newQuestionIds.slice(0, Math.max(5, 10 - dueQIds.length));
    const allIds = [...dueQIds, ...newToAdd].slice(0, 20);
    return allIds
      .map(id => allQuestions.find(q => q.id === id))
      .filter(Boolean) as BankQuestion[];
  }, [sessionActive, dueCards, newQuestionIds]);

  const currentQ = sessionQuestions[currentIdx];

  // Stats
  const masteredCount = srsCards.filter(c => c.interval >= 21).length;
  const learningCount = srsCards.filter(c => c.interval > 0 && c.interval < 21).length;
  const totalInSRS = srsCards.length;
  const retentionRate = totalInSRS > 0
    ? Math.round((srsCards.filter(c => c.lastQuality >= 3).length / totalInSRS) * 100)
    : 0;

  const startSession = () => {
    setSessionActive(true);
    setCurrentIdx(0);
    setSelected(null);
    setShowAnswer(false);
    setSessionResults([]);
    setDone(false);
  };

  const handleCheck = () => {
    if (selected === null || !currentQ) return;
    setShowAnswer(true);
  };

  const handleRate = (quality: number) => {
    if (!currentQ) return;
    const isCorrect = quality >= 3;
    updateSkillProfile(currentQ.section, currentQ.subSkill, isCorrect);

    const card = getOrCreateCard(currentQ.id, srsCards);
    const updated = sm2Update(card, quality);

    const newCards = srsCards.filter(c => c.questionId !== currentQ.id);
    newCards.push(updated);
    setSrsCards(newCards);
    saveSRSCards(newCards);

    setSessionResults(prev => [...prev, { qId: currentQ.id, correct: isCorrect }]);

    // Next question
    setSelected(null);
    setShowAnswer(false);
    if (currentIdx < sessionQuestions.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      // Session done
      const correctCount = [...sessionResults, { qId: currentQ.id, correct: isCorrect }].filter(r => r.correct).length;
      const earned = Math.round((correctCount / sessionQuestions.length) * 30) + 10;
      addXP(earned);
      updateStreak();
      addStudyMinutes(Math.round(sessionQuestions.length * 1.2));
      setDone(true);
    }
  };

  const correctInSession = sessionResults.filter(r => r.correct).length;

  // ── Dashboard View ──
  if (!sessionActive || done) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
          <h2 className="text-2xl font-heading font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-accent" />
            {t("Spaced Repetition", "Интервальное повторение")}
          </h2>
          <p className="text-muted-foreground">
            {t("SM-2 algorithm optimizes review timing for maximum retention", "Алгоритм SM-2 оптимизирует время повторения для максимального запоминания")}
          </p>
        </motion.div>

        {done && (
          <Card className="border-green-500/30 bg-green-500/5">
            <CardContent className="p-6 text-center space-y-3">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
              <p className="text-xl font-bold">{t("Review Complete!", "Повторение завершено!")}</p>
              <p className="text-muted-foreground">
                {correctInSession}/{sessionResults.length} {t("correct", "правильно")}
              </p>
              <p className="text-accent flex items-center justify-center gap-1">
                <Zap className="h-4 w-4" /> +{Math.round((correctInSession / Math.max(1, sessionResults.length)) * 30) + 10} XP
              </p>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border-accent/20">
            <CardContent className="p-4 text-center">
              <Clock className="h-5 w-5 text-accent mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{dueCards.length}</p>
              <p className="text-xs text-muted-foreground">{t("Due Today", "На сегодня")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Layers className="h-5 w-5 text-blue-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{learningCount}</p>
              <p className="text-xs text-muted-foreground">{t("Learning", "Изучаемые")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{masteredCount}</p>
              <p className="text-xs text-muted-foreground">{t("Mastered", "Освоенные")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Sparkles className="h-5 w-5 text-purple-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{retentionRate}%</p>
              <p className="text-xs text-muted-foreground">{t("Retention", "Запоминание")}</p>
            </CardContent>
          </Card>
        </div>

        {/* Mastery Progress */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">{t("Question Bank Mastery", "Освоение банка вопросов")}</span>
              <span className="text-xs text-muted-foreground">{totalInSRS}/{allQuestions.length}</span>
            </div>
            <Progress value={(totalInSRS / allQuestions.length) * 100} className="h-2" />
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500" /> {t("Mastered", "Освоено")} ({masteredCount})
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-500" /> {t("Learning", "Изучается")} ({learningCount})
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-muted-foreground" /> {t("New", "Новые")} ({newQuestionIds.length})
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Reviews */}
        {srsCards.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-accent" />
                {t("Upcoming Reviews", "Предстоящие повторения")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[0, 1, 2, 3, 7].map(days => {
                const target = new Date();
                target.setDate(target.getDate() + days);
                const dayStr = target.toDateString();
                const count = srsCards.filter(c => new Date(c.nextReview).toDateString() === dayStr).length;
                if (count === 0) return null;
                const label = days === 0 ? t("Today", "Сегодня")
                  : days === 1 ? t("Tomorrow", "Завтра")
                  : `${t("In", "Через")} ${days} ${t("days", "дн.")}`;
                return (
                  <div key={days} className="flex items-center justify-between text-sm px-2 py-1.5 rounded bg-muted/50">
                    <span>{label}</span>
                    <Badge variant="secondary">{count} {t("cards", "карт.")}</Badge>
                  </div>
                );
              }).filter(Boolean)}
            </CardContent>
          </Card>
        )}

        {/* CTA */}
        <div className="flex gap-3">
          <Button onClick={startSession} className="bg-accent text-accent-foreground flex-1" size="lg" disabled={dueCards.length === 0 && newQuestionIds.length === 0}>
            <Brain className="mr-2 h-5 w-5" />
            {dueCards.length > 0
              ? `${t("Review", "Повторить")} ${dueCards.length} ${t("due cards", "карточек")}`
              : newQuestionIds.length > 0
                ? t("Learn New Cards", "Учить новые")
                : t("All caught up!", "Всё повторено!")}
          </Button>
        </div>

        {dueCards.length === 0 && newQuestionIds.length === 0 && (
          <Card className="border-green-500/30 bg-green-500/5">
            <CardContent className="p-6 text-center space-y-2">
              <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto" />
              <p className="font-semibold">{t("You're all caught up!", "Всё повторено!")}</p>
              <p className="text-sm text-muted-foreground">{t("Come back later for more reviews", "Возвращайтесь позже")}</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // ── Active Review Session ──
  if (!currentQ) return null;

  const progress = ((currentIdx + (showAnswer ? 1 : 0)) / sessionQuestions.length) * 100;
  const existingCard = srsCards.find(c => c.questionId === currentQ.id);
  const isNew = !existingCard;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          <Badge variant={isNew ? "default" : "outline"} className={isNew ? "bg-blue-500" : "border-accent/30 text-accent"}>
            {isNew ? t("New", "Новая") : `${t("Review", "Повтор")} #${existingCard?.repetitions}`}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {currentQ.difficulty === 1 ? "Easy" : currentQ.difficulty === 2 ? "Medium" : "Hard"}
          </Badge>
          <Badge variant="outline" className="text-[10px]">{currentQ.section}</Badge>
        </div>
        <span className="text-sm text-muted-foreground">{currentIdx + 1}/{sessionQuestions.length}</span>
      </div>

      <Progress value={progress} className="h-2" />

      <AnimatePresence mode="wait">
        <motion.div key={currentIdx} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
          <Card>
            <CardContent className="p-6 space-y-4">
              <p className="font-medium text-lg">{currentQ.question}</p>

              {currentQ.options.map((opt, i) => (
                <button key={i} onClick={() => !showAnswer && setSelected(i)} disabled={showAnswer}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    showAnswer
                      ? (i === currentQ.correct ? "border-green-500 bg-green-500/10" : i === selected ? "border-destructive bg-destructive/10" : "border-border")
                      : selected === i ? "border-accent bg-accent/10" : "border-border hover:border-accent/50"
                  }`}>
                  {String.fromCharCode(65 + i)}. {opt}
                </button>
              ))}

              {showAnswer && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  <div className="text-sm bg-muted p-3 rounded-lg">💡 {currentQ.explanation}</div>

                  {/* SM-2 Quality Rating */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">{t("How well did you know this?", "Насколько хорошо вы это знали?")}</p>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                      {[
                        { q: 0, label: t("Blank", "Пусто"), color: "border-red-500 text-red-500 hover:bg-red-500/10" },
                        { q: 1, label: t("Wrong", "Неверно"), color: "border-orange-500 text-orange-500 hover:bg-orange-500/10" },
                        { q: 2, label: t("Almost", "Почти"), color: "border-yellow-500 text-yellow-500 hover:bg-yellow-500/10" },
                        { q: 3, label: t("Hard", "Сложно"), color: "border-blue-400 text-blue-400 hover:bg-blue-400/10" },
                        { q: 4, label: t("Good", "Хорошо"), color: "border-green-400 text-green-400 hover:bg-green-400/10" },
                        { q: 5, label: t("Easy", "Легко"), color: "border-green-600 text-green-600 hover:bg-green-600/10" },
                      ].map(btn => (
                        <Button key={btn.q} variant="outline" size="sm" onClick={() => handleRate(btn.q)}
                          className={`text-xs ${btn.color}`}>
                          {btn.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {!showAnswer && (
                <div className="flex justify-end">
                  <Button onClick={handleCheck} disabled={selected === null} className="bg-accent text-accent-foreground">
                    {t("Check", "Проверить")}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default SpacedReview;
