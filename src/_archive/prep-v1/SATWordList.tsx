import { useState, useMemo } from "react";
import { usePrep } from "@/contexts/PrepContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { Search, BookOpen, Star, CheckCircle2, Zap, RotateCcw } from "lucide-react";

interface SATWord {
  word: string;
  definition: string;
  example: string;
  frequency: "high" | "medium" | "low";
  category: string;
}

const satWords: SATWord[] = [
  { word: "Aberration", definition: "A departure from what is normal or expected", example: "His kind behavior was an aberration from his usual rudeness.", frequency: "high", category: "Behavior" },
  { word: "Abscond", definition: "To leave hurriedly and secretly to escape", example: "The suspect absconded before the police arrived.", frequency: "medium", category: "Action" },
  { word: "Acrimonious", definition: "Angry and bitter", example: "The divorce proceedings were acrimonious.", frequency: "high", category: "Emotion" },
  { word: "Admonish", definition: "To warn or reprimand firmly", example: "The teacher admonished the students for cheating.", frequency: "high", category: "Action" },
  { word: "Aesthetic", definition: "Concerned with beauty or artistic taste", example: "The building's aesthetic appeal attracted many visitors.", frequency: "high", category: "Description" },
  { word: "Aggrandize", definition: "To increase the power or importance of", example: "He used the media to aggrandize his public image.", frequency: "medium", category: "Action" },
  { word: "Alacrity", definition: "Brisk and cheerful readiness", example: "She accepted the invitation with alacrity.", frequency: "medium", category: "Behavior" },
  { word: "Ambivalent", definition: "Having mixed feelings or contradictory ideas", example: "She felt ambivalent about moving to a new city.", frequency: "high", category: "Emotion" },
  { word: "Anachronism", definition: "Something belonging to a different time period", example: "A typewriter in a modern office is an anachronism.", frequency: "medium", category: "Concept" },
  { word: "Anomaly", definition: "Something that deviates from the standard", example: "The warm December weather was an anomaly.", frequency: "high", category: "Concept" },
  { word: "Antipathy", definition: "A deep-seated feeling of dislike", example: "Her antipathy toward dishonesty was well known.", frequency: "medium", category: "Emotion" },
  { word: "Apathy", definition: "Lack of interest, enthusiasm, or concern", example: "Voter apathy led to low turnout in the election.", frequency: "high", category: "Emotion" },
  { word: "Arduous", definition: "Involving or requiring great effort; difficult", example: "The arduous climb took twelve hours.", frequency: "high", category: "Description" },
  { word: "Austere", definition: "Severe or strict in manner; having no luxuries", example: "The monastery's austere conditions tested the monks.", frequency: "medium", category: "Description" },
  { word: "Avarice", definition: "Extreme greed for wealth", example: "His avarice led him to exploit his workers.", frequency: "medium", category: "Behavior" },
  { word: "Benign", definition: "Gentle and kindly; not harmful", example: "Fortunately, the tumor turned out to be benign.", frequency: "high", category: "Description" },
  { word: "Bombastic", definition: "High-sounding but with little meaning", example: "The politician's bombastic speech impressed no one.", frequency: "low", category: "Description" },
  { word: "Cajole", definition: "To persuade someone by sustained coaxing", example: "She cajoled her parents into letting her go.", frequency: "medium", category: "Action" },
  { word: "Capitulate", definition: "To cease to resist; surrender", example: "After weeks of negotiation, they finally capitulated.", frequency: "medium", category: "Action" },
  { word: "Caustic", definition: "Sarcastic in a scathing way; corrosive", example: "Her caustic remarks left everyone uncomfortable.", frequency: "medium", category: "Description" },
  { word: "Circumscribe", definition: "To restrict within limits", example: "Budget constraints circumscribed their options.", frequency: "low", category: "Action" },
  { word: "Cogent", definition: "Clear, logical, and convincing", example: "She presented a cogent argument for the policy change.", frequency: "high", category: "Description" },
  { word: "Commensurate", definition: "Corresponding in size or degree; proportionate", example: "The salary was commensurate with experience.", frequency: "high", category: "Description" },
  { word: "Conundrum", definition: "A confusing and difficult problem", example: "The shortage posed a conundrum for planners.", frequency: "high", category: "Concept" },
  { word: "Corroborate", definition: "To confirm or give support to", example: "DNA evidence corroborated the witness's testimony.", frequency: "high", category: "Action" },
  { word: "Credulous", definition: "Having a tendency to believe too readily", example: "The credulous audience believed every word.", frequency: "medium", category: "Behavior" },
  { word: "Dearth", definition: "A scarcity or lack of something", example: "There is a dearth of affordable housing.", frequency: "high", category: "Concept" },
  { word: "Debacle", definition: "A sudden and complete disaster", example: "The product launch was a total debacle.", frequency: "medium", category: "Concept" },
  { word: "Demur", definition: "To raise objections or show reluctance", example: "She demurred at the suggestion to cut funding.", frequency: "low", category: "Action" },
  { word: "Didactic", definition: "Intended to teach, particularly morally", example: "The novel had a didactic tone that some readers disliked.", frequency: "medium", category: "Description" },
  { word: "Dissonance", definition: "Lack of harmony or agreement", example: "There was cognitive dissonance between his beliefs and actions.", frequency: "high", category: "Concept" },
  { word: "Dogmatic", definition: "Inclined to lay down principles as undeniably true", example: "His dogmatic approach alienated potential supporters.", frequency: "high", category: "Behavior" },
  { word: "Ebullient", definition: "Cheerful and full of energy", example: "Her ebullient personality lit up the room.", frequency: "medium", category: "Emotion" },
  { word: "Egregious", definition: "Outstandingly bad; shocking", example: "The accounting errors were egregious.", frequency: "high", category: "Description" },
  { word: "Elicit", definition: "To draw out a response or reaction", example: "The question elicited a surprising answer.", frequency: "high", category: "Action" },
  { word: "Equivocal", definition: "Open to more than one interpretation; ambiguous", example: "The politician gave an equivocal response.", frequency: "high", category: "Description" },
  { word: "Exonerate", definition: "To absolve from blame or guilt", example: "New evidence exonerated the defendant.", frequency: "high", category: "Action" },
  { word: "Facetious", definition: "Treating serious issues with inappropriate humor", example: "His facetious comment during the meeting was unwelcome.", frequency: "medium", category: "Behavior" },
  { word: "Gregarious", definition: "Fond of company; sociable", example: "His gregarious nature made him popular at parties.", frequency: "high", category: "Behavior" },
  { word: "Hackneyed", definition: "Lacking significance through overuse", example: "The essay was full of hackneyed phrases.", frequency: "medium", category: "Description" },
];

const SATWordList = () => {
  const { language, addXP, updateStreak, addStudyMinutes } = usePrep();
  const t = (en: string, ru: string) => language === "ru" ? ru : en;
  const [search, setSearch] = useState("");
  const [filterFreq, setFilterFreq] = useState<string | null>(null);
  const [mastered, setMastered] = useState<Set<string>>(new Set());
  const [quizMode, setQuizMode] = useState(false);
  const [quizIdx, setQuizIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [quizDone, setQuizDone] = useState(false);

  const filtered = useMemo(() => {
    return satWords.filter(w => {
      if (search && !w.word.toLowerCase().includes(search.toLowerCase()) && !w.definition.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterFreq && w.frequency !== filterFreq) return false;
      return true;
    });
  }, [search, filterFreq]);

  const quizWords = useMemo(() => {
    const pool = [...satWords].sort(() => Math.random() - 0.5).slice(0, 10);
    return pool;
  }, [quizMode]);

  const startQuiz = () => {
    setQuizMode(true);
    setQuizIdx(0);
    setShowAnswer(false);
    setQuizScore(0);
    setQuizDone(false);
  };

  const handleQuizAnswer = (knew: boolean) => {
    if (knew) setQuizScore(s => s + 1);
    setShowAnswer(false);
    if (quizIdx < quizWords.length - 1) {
      setQuizIdx(i => i + 1);
    } else {
      addXP(quizScore * 5);
      updateStreak();
      addStudyMinutes(5);
      setQuizDone(true);
    }
  };

  if (quizMode) {
    if (quizDone) {
      return (
        <div className="max-w-xl mx-auto text-center space-y-4 py-8">
          <CheckCircle2 className={`h-14 w-14 mx-auto ${quizScore >= 7 ? "text-green-500" : "text-accent"}`} />
          <p className="text-2xl font-bold">{quizScore}/10</p>
          <p className="text-accent flex items-center justify-center gap-1"><Zap className="h-4 w-4" /> +{quizScore * 5} XP</p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => setQuizMode(false)}>{t("Back to List", "К списку")}</Button>
            <Button onClick={startQuiz}><RotateCcw className="mr-2 h-4 w-4" />{t("Try Again", "Ещё раз")}</Button>
          </div>
        </div>
      );
    }

    const qw = quizWords[quizIdx];
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{quizIdx + 1}/10</span>
          <Button variant="ghost" size="sm" onClick={() => setQuizMode(false)}>{t("Exit Quiz", "Выход")}</Button>
        </div>
        <Card className="min-h-[200px] flex flex-col items-center justify-center text-center cursor-pointer" onClick={() => setShowAnswer(true)}>
          <CardContent className="p-8 space-y-3">
            <p className="text-3xl font-heading font-bold">{qw.word}</p>
            {!showAnswer ? (
              <p className="text-sm text-muted-foreground">{t("Tap to reveal definition", "Нажмите для определения")}</p>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                <p className="text-lg">{qw.definition}</p>
                <p className="text-sm text-muted-foreground italic">"{qw.example}"</p>
              </motion.div>
            )}
          </CardContent>
        </Card>
        {showAnswer && (
          <div className="flex gap-2 justify-center">
            <Button variant="outline" className="text-destructive" onClick={() => handleQuizAnswer(false)}>{t("Didn't Know", "Не знал")}</Button>
            <Button className="bg-green-600 text-white" onClick={() => handleQuizAnswer(true)}>{t("Knew It!", "Знал!")} ✓</Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-heading font-bold">{t("SAT Vocabulary Builder", "SAT Словарь")}</h2>
          <p className="text-muted-foreground">{t(`${satWords.length} high-frequency SAT words with examples`, `${satWords.length} высокочастотных SAT слов`)}</p>
        </div>
        <Button onClick={startQuiz} className="bg-accent text-accent-foreground gap-2">
          <Star className="h-4 w-4" /> {t("Quick Quiz", "Быстрый тест")}
        </Button>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t("Search words...", "Поиск слов...")} value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        {["high", "medium", "low"].map(f => (
          <Button key={f} size="sm" variant={filterFreq === f ? "default" : "outline"} className="text-xs capitalize"
            onClick={() => setFilterFreq(filterFreq === f ? null : f)}>
            {f}
          </Button>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">{filtered.length} {t("words", "слов")}</p>

      <div className="grid gap-2">
        {filtered.map(w => (
          <Card key={w.word} className={`hover:border-accent/30 transition-colors ${mastered.has(w.word) ? "border-green-500/30 bg-green-500/5" : ""}`}>
            <CardContent className="p-4 flex items-start justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground">{w.word}</p>
                  <Badge variant="outline" className={`text-[10px] ${w.frequency === "high" ? "border-accent text-accent" : ""}`}>{w.frequency}</Badge>
                  <Badge variant="outline" className="text-[10px]">{w.category}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{w.definition}</p>
                <p className="text-xs text-muted-foreground italic">"{w.example}"</p>
              </div>
              <Button size="sm" variant={mastered.has(w.word) ? "default" : "ghost"} className={`shrink-0 text-xs ${mastered.has(w.word) ? "bg-green-600" : ""}`}
                onClick={() => setMastered(prev => { const n = new Set(prev); if (n.has(w.word)) n.delete(w.word); else n.add(w.word); return n; })}>
                {mastered.has(w.word) ? "✓" : t("Mark Known", "Знаю")}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SATWordList;
