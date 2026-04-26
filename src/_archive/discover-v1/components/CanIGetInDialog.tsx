import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Target, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import { UniversityResult } from "./types";

interface Props {
  universities: UniversityResult[];
  language: "en" | "ru";
}

const t = {
  en: {
    title: "Can I Get In?",
    subtitle: "Enter your scores to see match percentages",
    gpa: "Your GPA (out of 4.0)", ielts: "Your IELTS Score", sat: "Your SAT Score (optional)",
    analyze: "Analyze My Chances", results: "Your Match Results",
    high: "High Chance", medium: "Medium Chance", low: "Low Chance", reach: "Reach",
    matchingPrograms: "matching programs",
    button: "Can I Get In?",
  },
  ru: {
    title: "Могу ли я поступить?",
    subtitle: "Введите свои баллы для оценки шансов",
    gpa: "Ваш GPA (из 4.0)", ielts: "Ваш балл IELTS", sat: "Ваш балл SAT (необязательно)",
    analyze: "Оценить шансы", results: "Результаты",
    high: "Высокие шансы", medium: "Средние шансы", low: "Низкие шансы", reach: "Амбициозно",
    matchingPrograms: "подходящих программ",
    button: "Могу ли я поступить?",
  },
};

interface MatchResult {
  uni: UniversityResult;
  score: number;
  matchingPrograms: number;
  totalPrograms: number;
  level: "high" | "medium" | "low" | "reach";
}

export const CanIGetInDialog = ({ universities, language }: Props) => {
  const l = t[language];
  const [gpa, setGpa] = useState("");
  const [ielts, setIelts] = useState("");
  const [sat, setSat] = useState("");
  const [showResults, setShowResults] = useState(false);

  const results = useMemo((): MatchResult[] => {
    if (!showResults || !gpa) return [];
    const userGpa = parseFloat(gpa);
    const userIelts = ielts ? parseFloat(ielts) : null;
    const userSat = sat ? parseInt(sat) : null;

    return universities.map(uni => {
      let totalScore = 0;
      let factors = 0;
      let matching = 0;

      uni.programs?.forEach(p => {
        const reqs = p.admission_requirements || [];
        let programMatch = true;

        reqs.forEach(req => {
          if (req.gpa_min != null) {
            factors++;
            if (userGpa >= req.gpa_min) { totalScore += 100; }
            else if (userGpa >= req.gpa_min - 0.3) { totalScore += 60; }
            else { totalScore += 20; programMatch = false; }
          }
          if (req.ielts_required && req.ielts_score_min != null && userIelts != null) {
            factors++;
            if (userIelts >= req.ielts_score_min) { totalScore += 100; }
            else if (userIelts >= req.ielts_score_min - 0.5) { totalScore += 50; }
            else { totalScore += 10; programMatch = false; }
          }
          if (!req.ielts_required && userIelts != null) {
            factors++;
            totalScore += 100; // IELTS not required = full score
          }
          if (req.sat_required && req.sat_score_min != null && userSat != null) {
            factors++;
            if (userSat >= req.sat_score_min) { totalScore += 100; }
            else if (userSat >= req.sat_score_min - 50) { totalScore += 60; }
            else { totalScore += 15; programMatch = false; }
          }
        });

        if (reqs.length === 0) { matching++; }
        else if (programMatch) { matching++; }
      });

      // Add admit rate factor
      const admitRates = uni.programs?.flatMap(p => p.applications?.map(a => a.acceptance_rate) ?? []).filter((r): r is number => r != null) || [];
      if (admitRates.length > 0) {
        const avgAdmit = admitRates.reduce((a, b) => a + b, 0) / admitRates.length;
        factors++;
        totalScore += Math.min(avgAdmit * 1.5, 100);
      }

      const score = factors > 0 ? Math.round(totalScore / factors) : 50;
      const level: MatchResult["level"] = score >= 75 ? "high" : score >= 50 ? "medium" : score >= 30 ? "low" : "reach";

      return { uni, score, matchingPrograms: matching, totalPrograms: uni.programs?.length || 0, level };
    }).sort((a, b) => b.score - a.score);
  }, [showResults, gpa, ielts, sat, universities]);

  const levelConfig = {
    high: { color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30", border: "border-green-200 dark:border-green-800", icon: CheckCircle, label: l.high },
    medium: { color: "text-accent", bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-800", icon: TrendingUp, label: l.medium },
    low: { color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/30", border: "border-orange-200 dark:border-orange-800", icon: AlertTriangle, label: l.low },
    reach: { color: "text-destructive", bg: "bg-red-50 dark:bg-red-950/30", border: "border-red-200 dark:border-red-800", icon: Target, label: l.reach },
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-accent text-accent hover:bg-accent hover:text-accent-foreground">
          <Target className="h-4 w-4" /> {l.button}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-heading">{l.title}</DialogTitle>
          <p className="text-sm text-muted-foreground">{l.subtitle}</p>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 mt-4">
          <div>
            <Label className="text-xs">{l.gpa}</Label>
            <Input type="number" step="0.1" min="0" max="4" placeholder="3.5" value={gpa} onChange={e => setGpa(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">{l.ielts}</Label>
            <Input type="number" step="0.5" min="0" max="9" placeholder="6.5" value={ielts} onChange={e => setIelts(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">{l.sat}</Label>
            <Input type="number" min="400" max="1600" placeholder="1200" value={sat} onChange={e => setSat(e.target.value)} />
          </div>
        </div>

        <Button className="w-full mt-3" onClick={() => setShowResults(true)} disabled={!gpa}>
          {l.analyze}
        </Button>

        {showResults && results.length > 0 && (
          <div className="mt-4 space-y-2">
            <h3 className="text-sm font-semibold">{l.results}</h3>
            <div className="flex gap-3 mb-3">
              {(["high", "medium", "low", "reach"] as const).map(level => {
                const count = results.filter(r => r.level === level).length;
                const cfg = levelConfig[level];
                return (
                  <div key={level} className={`flex items-center gap-1.5 text-xs ${cfg.color}`}>
                    <cfg.icon className="h-3.5 w-3.5" />
                    <span className="font-semibold">{count}</span> {cfg.label}
                  </div>
                );
              })}
            </div>
            <div className="space-y-1.5 max-h-[40vh] overflow-y-auto">
              {results.slice(0, 50).map(r => {
                const cfg = levelConfig[r.level];
                return (
                  <div key={r.uni.university_id} className={`flex items-center gap-3 p-2.5 rounded-lg border ${cfg.border} ${cfg.bg}`}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{r.uni.university_name}</p>
                      <p className="text-xs text-muted-foreground">{r.uni.city}, {r.uni.country} · {r.matchingPrograms}/{r.totalPrograms} {l.matchingPrograms}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Progress value={r.score} className="w-16 h-1.5" />
                      <span className={`text-sm font-bold ${cfg.color} w-10 text-right`}>{r.score}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
