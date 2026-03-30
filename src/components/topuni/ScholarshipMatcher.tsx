import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Award, Search, Filter, Star, DollarSign, Calendar,
  MapPin, CheckCircle2, ExternalLink, Sparkles,
} from "lucide-react";

interface ScholarshipMatcherProps {
  profile: {
    fullName: string;
    gpa: string;
    ielts: string;
    sat: string;
    major: string;
    targetCountries: string[];
    budget: string;
    scholarshipNeeded: string;
  };
  language: "en" | "ru";
}

interface ScholarshipMatch {
  name: string;
  university: string;
  country: string;
  coverage: string;
  amount: string;
  deadline: string;
  matchScore: number;
  requirements: string[];
  tips: string;
  url?: string;
}

const ScholarshipMatcher = ({ profile, language }: ScholarshipMatcherProps) => {
  const isRu = language === "ru";
  const t = (en: string, ru: string) => isRu ? ru : en;
  const [search, setSearch] = useState("");
  const [filterCoverage, setFilterCoverage] = useState<string>("all");

  const gpa = parseFloat(profile.gpa) || 0;
  const ielts = parseFloat(profile.ielts) || 0;

  const scholarships = useMemo<ScholarshipMatch[]>(() => {
    const base: ScholarshipMatch[] = [
      { name: "Chevening Scholarship", university: "Various UK Universities", country: "United Kingdom", coverage: "Full", amount: "Full tuition + living expenses", deadline: "Nov 2026", matchScore: 0, requirements: ["2+ years work experience", "Bachelor's degree", "IELTS 6.5+", "Return to home country"], tips: "Strong leadership narrative is key. Focus on your impact story.", url: "https://www.chevening.org" },
      { name: "Erasmus Mundus Joint Masters", university: "EU Consortium", country: "Europe", coverage: "Full", amount: "€1,400/month + tuition", deadline: "Jan 2027", matchScore: 0, requirements: ["Bachelor's degree", "English proficiency", "No prior EU residence"], tips: "Apply to multiple consortia. Highlight cross-cultural experience.", url: "https://erasmus-plus.ec.europa.eu" },
      { name: "DAAD Scholarship", university: "German Universities", country: "Germany", coverage: "Partial", amount: "€934-1,200/month", deadline: "Oct 2026", matchScore: 0, requirements: ["Bachelor's degree", "GPA 3.0+", "German/English proficiency"], tips: "DAAD values academic excellence and development relevance." },
      { name: "Fulbright Program", university: "US Universities", country: "United States", coverage: "Full", amount: "Full tuition + stipend", deadline: "Oct 2026", matchScore: 0, requirements: ["Bachelor's degree", "Strong academic record", "English proficiency"], tips: "Emphasize cultural exchange and mutual benefit." },
      { name: "Commonwealth Scholarship", university: "UK Universities", country: "United Kingdom", coverage: "Full", amount: "Full tuition + airfare + stipend", deadline: "Dec 2026", matchScore: 0, requirements: ["Commonwealth citizen", "Bachelor's degree", "Cannot afford UK study"], tips: "Development impact is the primary selection criterion." },
      { name: "Korean Government Scholarship (KGSP)", university: "Korean Universities", country: "South Korea", coverage: "Full", amount: "Full tuition + ₩900K/month", deadline: "Feb 2027", matchScore: 0, requirements: ["GPA 2.64+", "Under 25", "Not Korean citizen"], tips: "Korean language study included. Great for STEM fields." },
      { name: "Türkiye Burslari", university: "Turkish Universities", country: "Turkey", coverage: "Full", amount: "Full tuition + ₺3,500/month", deadline: "Jan 2027", matchScore: 0, requirements: ["Under 21 for BA", "GPA 3.0+", "No Turkish citizenship"], tips: "Turkish language course provided. Very competitive." },
      { name: "University of Toronto Lester B. Pearson", university: "University of Toronto", country: "Canada", coverage: "Full", amount: "Full tuition + books + living (4 years)", deadline: "Nov 2026", matchScore: 0, requirements: ["International student", "Outstanding academic", "School nomination required"], tips: "Need school nomination. Demonstrate exceptional leadership." },
      { name: "Stipendium Hungaricum", university: "Hungarian Universities", country: "Hungary", coverage: "Full", amount: "Full tuition + €150/month", deadline: "Jan 2027", matchScore: 0, requirements: ["Non-EU citizen", "Medical certificate", "English proficiency"], tips: "Bilateral agreement required. Check if your country participates." },
      { name: "Nazarbayev University Scholarship", university: "Nazarbayev University", country: "Kazakhstan", coverage: "Full", amount: "Full tuition + stipend", deadline: "Mar 2027", matchScore: 0, requirements: ["Strong academic record", "English proficiency", "Entrance exams"], tips: "NU uses a holistic review. Strong IELTS/SAT scores are crucial." },
      { name: "CSC Scholarship (China)", university: "Chinese Universities", country: "China", coverage: "Full", amount: "Full tuition + ¥3,000/month", deadline: "Mar 2027", matchScore: 0, requirements: ["Under 25 for BA", "Good health", "HSK not required for English programs"], tips: "Apply through embassy or directly to universities." },
      { name: "Holland Scholarship", university: "Dutch Universities", country: "Netherlands", coverage: "Partial", amount: "€5,000 one-time", deadline: "May 2027", matchScore: 0, requirements: ["Non-EEA citizen", "First time in Netherlands", "Full-time bachelor's/master's"], tips: "Smaller amount but less competitive. Great supplementary funding." },
    ];

    // Calculate match scores
    return base.map(s => {
      let score = 50; // base
      const countriesMatch = profile.targetCountries.some(c => s.country.includes(c));
      if (countriesMatch) score += 20;
      if (gpa >= 3.5) score += 15;
      else if (gpa >= 3.0) score += 8;
      if (ielts >= 7.0) score += 10;
      else if (ielts >= 6.5) score += 5;
      if (s.coverage === "Full" && profile.scholarshipNeeded === "yes") score += 5;
      return { ...s, matchScore: Math.min(98, score) };
    }).sort((a, b) => b.matchScore - a.matchScore);
  }, [profile, gpa, ielts]);

  const filtered = scholarships.filter(s => {
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.country.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCoverage !== "all" && s.coverage !== filterCoverage) return false;
    return true;
  });

  const matchColor = (score: number) => score >= 70 ? "text-green-500" : score >= 50 ? "text-amber-500" : "text-muted-foreground";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="w-5 h-5 text-accent" />
          {t("Scholarship Matcher", "Подбор стипендий")}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{t("AI-matched scholarships based on your profile", "Стипендии, подобранные на основе вашего профиля")}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} className="pl-9 text-sm" placeholder={t("Search scholarships...", "Поиск стипендий...")} />
          </div>
          <Button variant={filterCoverage === "all" ? "default" : "outline"} size="sm" onClick={() => setFilterCoverage("all")} className={filterCoverage === "all" ? "bg-accent text-accent-foreground" : ""}>{t("All", "Все")}</Button>
          <Button variant={filterCoverage === "Full" ? "default" : "outline"} size="sm" onClick={() => setFilterCoverage("Full")} className={filterCoverage === "Full" ? "bg-accent text-accent-foreground" : ""}>{t("Full", "Полные")}</Button>
          <Button variant={filterCoverage === "Partial" ? "default" : "outline"} size="sm" onClick={() => setFilterCoverage("Partial")} className={filterCoverage === "Partial" ? "bg-accent text-accent-foreground" : ""}>{t("Partial", "Частичные")}</Button>
        </div>

        <div className="space-y-3">
          {filtered.map((s, i) => (
            <Card key={i} className={`transition-all hover:shadow-md ${s.matchScore >= 70 ? "border-green-500/20" : ""}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground text-sm">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.university}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-lg font-bold ${matchColor(s.matchScore)}`}>{s.matchScore}%</p>
                    <p className="text-[10px] text-muted-foreground">{t("match", "совпадение")}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-[10px] gap-1"><MapPin className="h-2.5 w-2.5" />{s.country}</Badge>
                  <Badge variant="outline" className={`text-[10px] ${s.coverage === "Full" ? "bg-green-500/10 text-green-500 border-green-500/30" : "bg-amber-500/10 text-amber-500 border-amber-500/30"}`}>
                    {s.coverage}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] gap-1"><DollarSign className="h-2.5 w-2.5" />{s.amount}</Badge>
                  <Badge variant="outline" className="text-[10px] gap-1"><Calendar className="h-2.5 w-2.5" />{s.deadline}</Badge>
                </div>
                <Progress value={s.matchScore} className="h-1.5" />
                <div className="flex items-start gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">{s.tips}</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {s.requirements.map((r, ri) => (
                    <Badge key={ri} variant="secondary" className="text-[9px]">{r}</Badge>
                  ))}
                </div>
                {s.url && (
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline flex items-center gap-1">
                    {t("Apply", "Подать")} <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ScholarshipMatcher;
