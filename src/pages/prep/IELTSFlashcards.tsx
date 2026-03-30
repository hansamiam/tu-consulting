import { useState, useMemo } from "react";
import { usePrep } from "@/contexts/PrepContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, ChevronLeft, ChevronRight, Zap, CheckCircle2, Volume2, Shuffle, BookOpen } from "lucide-react";

interface Flashcard {
  id: string;
  word: string;
  definition: string;
  example: string;
  partOfSpeech: string;
  difficulty: 1 | 2 | 3;
  category: string;
}

const ieltsFlashcards: Flashcard[] = [
  { id: "f1", word: "Ubiquitous", definition: "Present, appearing, or found everywhere", example: "Smartphones have become ubiquitous in modern society.", partOfSpeech: "adj", difficulty: 2, category: "Academic" },
  { id: "f2", word: "Ameliorate", definition: "Make something bad or unsatisfactory better", example: "The government implemented policies to ameliorate poverty.", partOfSpeech: "verb", difficulty: 3, category: "Academic" },
  { id: "f3", word: "Pragmatic", definition: "Dealing with things sensibly and realistically", example: "We need a pragmatic approach to solve this crisis.", partOfSpeech: "adj", difficulty: 2, category: "Academic" },
  { id: "f4", word: "Unprecedented", definition: "Never done or known before", example: "The pandemic caused unprecedented disruption to global trade.", partOfSpeech: "adj", difficulty: 2, category: "Academic" },
  { id: "f5", word: "Detrimental", definition: "Tending to cause harm", example: "Excessive screen time can be detrimental to children's development.", partOfSpeech: "adj", difficulty: 1, category: "Academic" },
  { id: "f6", word: "Proliferation", definition: "Rapid increase in number or amount", example: "The proliferation of social media has transformed communication.", partOfSpeech: "noun", difficulty: 3, category: "Academic" },
  { id: "f7", word: "Exacerbate", definition: "Make a problem or bad situation worse", example: "Climate change exacerbates the frequency of natural disasters.", partOfSpeech: "verb", difficulty: 3, category: "Academic" },
  { id: "f8", word: "Mitigate", definition: "Make less severe, serious, or painful", example: "Trees help mitigate the effects of urban heat islands.", partOfSpeech: "verb", difficulty: 2, category: "Academic" },
  { id: "f9", word: "Inherent", definition: "Existing as a natural or basic part of something", example: "There are inherent risks in any investment strategy.", partOfSpeech: "adj", difficulty: 2, category: "Academic" },
  { id: "f10", word: "Conducive", definition: "Making a certain situation or outcome likely or possible", example: "A quiet environment is conducive to learning.", partOfSpeech: "adj", difficulty: 2, category: "Collocations" },
  { id: "f11", word: "Disparity", definition: "A great difference", example: "There is a growing disparity between rich and poor nations.", partOfSpeech: "noun", difficulty: 2, category: "Academic" },
  { id: "f12", word: "Facilitate", definition: "Make an action or process easy or easier", example: "Technology can facilitate remote learning.", partOfSpeech: "verb", difficulty: 1, category: "Academic" },
  { id: "f13", word: "Scrutinize", definition: "Examine or inspect closely and thoroughly", example: "The committee will scrutinize the proposed budget.", partOfSpeech: "verb", difficulty: 2, category: "Academic" },
  { id: "f14", word: "Feasible", definition: "Possible and practical to do easily", example: "Is it feasible to complete the project by December?", partOfSpeech: "adj", difficulty: 1, category: "Academic" },
  { id: "f15", word: "Paradigm", definition: "A typical example or pattern of something", example: "The internet created a new paradigm in communication.", partOfSpeech: "noun", difficulty: 3, category: "Academic" },
  { id: "f16", word: "Subsequently", definition: "After a particular thing has happened; afterwards", example: "She graduated and subsequently found employment abroad.", partOfSpeech: "adv", difficulty: 1, category: "Linking Words" },
  { id: "f17", word: "Albeit", definition: "Although (used to introduce a concessive clause)", example: "The plan is ambitious, albeit realistic.", partOfSpeech: "conj", difficulty: 3, category: "Linking Words" },
  { id: "f18", word: "Notwithstanding", definition: "In spite of; despite", example: "Notwithstanding the challenges, the team succeeded.", partOfSpeech: "prep", difficulty: 3, category: "Linking Words" },
  { id: "f19", word: "Comprise", definition: "Consist of; be made up of", example: "The committee comprises twelve members.", partOfSpeech: "verb", difficulty: 2, category: "Academic" },
  { id: "f20", word: "Underpin", definition: "Support or form the basis of", example: "Research findings underpin the government's new policy.", partOfSpeech: "verb", difficulty: 3, category: "Academic" },
  { id: "f21", word: "Substantiate", definition: "Provide evidence to support or prove the truth of", example: "The claims were not substantiated by the data.", partOfSpeech: "verb", difficulty: 3, category: "Academic" },
  { id: "f22", word: "Plausible", definition: "Seeming reasonable or probable", example: "His explanation was plausible but lacked evidence.", partOfSpeech: "adj", difficulty: 2, category: "Academic" },
  { id: "f23", word: "Alleviate", definition: "Make suffering, deficiency, or a problem less severe", example: "Medication can alleviate the symptoms of anxiety.", partOfSpeech: "verb", difficulty: 2, category: "Academic" },
  { id: "f24", word: "Encompass", definition: "Surround and have or hold within", example: "The course encompasses both theory and practice.", partOfSpeech: "verb", difficulty: 2, category: "Academic" },
  { id: "f25", word: "Prevalent", definition: "Widespread in a particular area or at a particular time", example: "Fast food is increasingly prevalent in developing nations.", partOfSpeech: "adj", difficulty: 1, category: "Academic" },
  { id: "f26", word: "Inextricably", definition: "In a way impossible to disentangle or separate", example: "Education and economic development are inextricably linked.", partOfSpeech: "adv", difficulty: 3, category: "Academic" },
  { id: "f27", word: "Underscore", definition: "Underline or emphasize", example: "The report underscores the need for urgent climate action.", partOfSpeech: "verb", difficulty: 2, category: "Academic" },
  { id: "f28", word: "Albeit", definition: "Although", example: "It was a difficult, albeit rewarding experience.", partOfSpeech: "conj", difficulty: 3, category: "Linking Words" },
  { id: "f29", word: "Pertinent", definition: "Relevant or applicable to a particular matter", example: "Please include only pertinent information in your essay.", partOfSpeech: "adj", difficulty: 2, category: "Academic" },
  { id: "f30", word: "Delineate", definition: "Describe or portray something precisely", example: "The essay delineates the main arguments for and against.", partOfSpeech: "verb", difficulty: 3, category: "Academic" },
];

const IELTSFlashcards = () => {
  const { language, addXP, updateStreak, addStudyMinutes } = usePrep();
  const t = (en: string, ru: string) => language === "ru" ? ru : en;

  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Set<string>>(new Set());
  const [learning, setLearning] = useState<Set<string>>(new Set());
  const [shuffled, setShuffled] = useState(false);
  const [filterDifficulty, setFilterDifficulty] = useState<number | null>(null);

  const cards = useMemo(() => {
    let filtered = [...ieltsFlashcards];
    if (filterDifficulty) filtered = filtered.filter(c => c.difficulty === filterDifficulty);
    if (shuffled) filtered.sort(() => Math.random() - 0.5);
    return filtered;
  }, [shuffled, filterDifficulty]);

  const card = cards[currentIdx];
  const progress = cards.length > 0 ? ((known.size) / cards.length) * 100 : 0;

  const markKnown = () => {
    if (card) {
      setKnown(prev => new Set(prev).add(card.id));
      setLearning(prev => { const n = new Set(prev); n.delete(card.id); return n; });
    }
    next();
  };

  const markLearning = () => {
    if (card) {
      setLearning(prev => new Set(prev).add(card.id));
    }
    next();
  };

  const next = () => {
    setFlipped(false);
    setCurrentIdx(i => (i + 1) % cards.length);
  };

  const prev = () => {
    setFlipped(false);
    setCurrentIdx(i => (i - 1 + cards.length) % cards.length);
  };

  const handleShuffle = () => {
    setShuffled(s => !s);
    setCurrentIdx(0);
    setFlipped(false);
  };

  if (known.size === cards.length && cards.length > 0) {
    addXP(50);
    updateStreak();
    addStudyMinutes(10);
    return (
      <div className="text-center space-y-4 py-8">
        <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto" />
        <p className="text-2xl font-bold">{t("All cards mastered!", "Все карточки изучены!")}</p>
        <p className="text-accent flex items-center justify-center gap-1"><Zap className="h-4 w-4" /> +50 XP</p>
        <Button variant="outline" onClick={() => { setKnown(new Set()); setLearning(new Set()); setCurrentIdx(0); }}>
          <RotateCcw className="mr-2 h-4 w-4" /> {t("Start Over", "Начать заново")}
        </Button>
      </div>
    );
  }

  if (!card) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {[1, 2, 3].map(d => (
            <Button key={d} size="sm" variant={filterDifficulty === d ? "default" : "outline"} className="text-xs h-7"
              onClick={() => { setFilterDifficulty(filterDifficulty === d ? null : d); setCurrentIdx(0); setFlipped(false); }}>
              {d === 1 ? "Easy" : d === 2 ? "Medium" : "Hard"}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={handleShuffle} className="gap-1 text-xs">
            <Shuffle className="h-3.5 w-3.5" /> {t("Shuffle", "Перемешать")}
          </Button>
          <span className="text-xs text-muted-foreground">{currentIdx + 1}/{cards.length}</span>
        </div>
      </div>

      <Progress value={progress} className="h-2" />
      <div className="flex gap-3 text-xs text-muted-foreground">
        <span className="text-green-500 font-medium">✓ {known.size} {t("known", "знаю")}</span>
        <span className="text-amber-500 font-medium">~ {learning.size} {t("learning", "учу")}</span>
        <span>{cards.length - known.size - learning.size} {t("remaining", "осталось")}</span>
      </div>

      <div className="perspective-1000" onClick={() => setFlipped(f => !f)}>
        <AnimatePresence mode="wait">
          <motion.div
            key={`${card.id}-${flipped}`}
            initial={{ rotateY: 90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            exit={{ rotateY: -90, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="cursor-pointer"
          >
            <Card className={`min-h-[250px] flex flex-col items-center justify-center text-center border-2 transition-colors ${
              known.has(card.id) ? "border-green-500/30" : learning.has(card.id) ? "border-amber-500/30" : "border-border"
            }`}>
              <CardContent className="p-8 space-y-4">
                {!flipped ? (
                  <>
                    <Badge variant="outline" className="text-[10px]">{card.category} · {card.partOfSpeech}</Badge>
                    <p className="text-3xl font-heading font-bold text-foreground">{card.word}</p>
                    <p className="text-sm text-muted-foreground">{t("Tap to reveal", "Нажмите чтобы раскрыть")}</p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-semibold text-foreground">{card.definition}</p>
                    <p className="text-sm text-muted-foreground italic">"{card.example}"</p>
                    <Badge variant="outline" className="text-[10px]">
                      {card.difficulty === 1 ? "Easy" : card.difficulty === 2 ? "Medium" : "Hard"}
                    </Badge>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={prev}><ChevronLeft className="h-4 w-4" /></Button>
        <div className="flex gap-2">
          <Button variant="outline" className="text-amber-500 border-amber-500/30 hover:bg-amber-500/10" onClick={markLearning}>
            {t("Still Learning", "Учу")}
          </Button>
          <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={markKnown}>
            {t("I Know This", "Знаю")} ✓
          </Button>
        </div>
        <Button variant="outline" size="icon" onClick={next}><ChevronRight className="h-4 w-4" /></Button>
      </div>
    </div>
  );
};

export default IELTSFlashcards;
