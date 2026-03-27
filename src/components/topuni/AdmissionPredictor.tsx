import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart3, TrendingUp, Search, Target, Shield, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

interface AdmissionPredictorProps {
  profile: {
    fullName: string;
    gpa: string;
    ielts: string;
    sat: string;
    major: string;
    targetCountries: string[];
    prestige: number;
    scholarship: number;
  };
  language: "en" | "ru";
}

interface UniversityPrediction {
  name: string;
  country: string;
  chance: number; // 0-100
  tier: "safety" | "target" | "reach" | "dream";
  factors: { label: string; score: number; max: number }[];
  tips: string[];
}

const AdmissionPredictor = ({ profile, language }: AdmissionPredictorProps) => {
  const isRu = language === "ru";
  const t = (en: string, ru: string) => (isRu ? ru : en);
  const [searchQuery, setSearchQuery] = useState("");

  // Simulated prediction engine based on profile
  const predictions = useMemo<UniversityPrediction[]>(() => {
    const gpa = parseFloat(profile.gpa) || 0;
    const ielts = parseFloat(profile.ielts) || 0;
    const sat = parseInt(profile.sat) || 0;

    const universities = [
      { name: "MIT", country: "United States", baseReq: { gpa: 3.9, ielts: 7.5, sat: 1550 } },
      { name: "Stanford University", country: "United States", baseReq: { gpa: 3.9, ielts: 7.5, sat: 1530 } },
      { name: "University of Oxford", country: "United Kingdom", baseReq: { gpa: 3.8, ielts: 7.5, sat: 0 } },
      { name: "University of Cambridge", country: "United Kingdom", baseReq: { gpa: 3.8, ielts: 7.5, sat: 0 } },
      { name: "ETH Zurich", country: "Switzerland", baseReq: { gpa: 3.7, ielts: 7.0, sat: 0 } },
      { name: "University of Toronto", country: "Canada", baseReq: { gpa: 3.5, ielts: 6.5, sat: 0 } },
      { name: "University of British Columbia", country: "Canada", baseReq: { gpa: 3.4, ielts: 6.5, sat: 0 } },
      { name: "Korea University", country: "South Korea", baseReq: { gpa: 3.3, ielts: 6.0, sat: 0 } },
      { name: "Yonsei University", country: "South Korea", baseReq: { gpa: 3.2, ielts: 5.5, sat: 0 } },
      { name: "Technical University of Munich", country: "Germany", baseReq: { gpa: 3.3, ielts: 6.5, sat: 0 } },
      { name: "University of Amsterdam", country: "Netherlands", baseReq: { gpa: 3.3, ielts: 6.5, sat: 0 } },
      { name: "Charles University", country: "Czech Republic", baseReq: { gpa: 3.0, ielts: 5.5, sat: 0 } },
      { name: "Politecnico di Milano", country: "Italy", baseReq: { gpa: 3.2, ielts: 6.0, sat: 0 } },
      { name: "University of Tartu", country: "Estonia", baseReq: { gpa: 3.0, ielts: 5.5, sat: 0 } },
      { name: "Bilkent University", country: "Turkey", baseReq: { gpa: 3.0, ielts: 6.0, sat: 1200 } },
    ];

    return universities
      .filter((u) => {
        if (profile.targetCountries.length === 0) return true;
        return profile.targetCountries.includes(u.country);
      })
      .map((uni) => {
        // Calculate admission probability
        let gpaScore = gpa > 0 ? Math.min(100, (gpa / uni.baseReq.gpa) * 100) : 50;
        let ieltsScore = ielts > 0 ? Math.min(100, (ielts / uni.baseReq.ielts) * 100) : 50;
        let satScore = uni.baseReq.sat > 0 && sat > 0 ? Math.min(100, (sat / uni.baseReq.sat) * 100) : 70;

        // Weight: GPA 40%, IELTS 30%, SAT 15%, other factors 15%
        let chance = Math.round(gpaScore * 0.4 + ieltsScore * 0.3 + satScore * 0.15 + 50 * 0.15);
        chance = Math.max(5, Math.min(95, chance));

        const tier: "safety" | "target" | "reach" | "dream" =
          chance >= 75 ? "safety" : chance >= 55 ? "target" : chance >= 35 ? "reach" : "dream";

        const factors = [
          { label: "GPA", score: Math.round(gpaScore), max: 100 },
          { label: "IELTS", score: Math.round(ieltsScore), max: 100 },
          ...(uni.baseReq.sat > 0 ? [{ label: "SAT", score: Math.round(satScore), max: 100 }] : []),
        ];

        const tips: string[] = [];
        if (gpaScore < 80) tips.push(t("Strengthen your GPA or provide strong extracurriculars", "Улучшите GPA или предоставьте сильные внеклассные активности"));
        if (ieltsScore < 80) tips.push(t(`Aim for IELTS ${uni.baseReq.ielts}+`, `Стремитесь к IELTS ${uni.baseReq.ielts}+`));
        if (uni.baseReq.sat > 0 && satScore < 80) tips.push(t(`Target SAT ${uni.baseReq.sat}+`, `Целевой SAT ${uni.baseReq.sat}+`));

        return { name: uni.name, country: uni.country, chance, tier, factors, tips };
      })
      .sort((a, b) => b.chance - a.chance);
  }, [profile, isRu]);

  const filtered = searchQuery
    ? predictions.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.country.toLowerCase().includes(searchQuery.toLowerCase()))
    : predictions;

  const tierConfig = {
    safety: { color: "text-green-600 bg-green-500/10 border-green-500/30", icon: CheckCircle2, label: t("Safety", "Запасной") },
    target: { color: "text-blue-600 bg-blue-500/10 border-blue-500/30", icon: Target, label: t("Target", "Целевой") },
    reach: { color: "text-amber-600 bg-amber-500/10 border-amber-500/30", icon: TrendingUp, label: t("Reach", "Амбициозный") },
    dream: { color: "text-red-600 bg-red-500/10 border-red-500/30", icon: AlertTriangle, label: t("Dream", "Мечта") },
  };

  const stats = {
    safety: filtered.filter((p) => p.tier === "safety").length,
    target: filtered.filter((p) => p.tier === "target").length,
    reach: filtered.filter((p) => p.tier === "reach").length,
    dream: filtered.filter((p) => p.tier === "dream").length,
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {(["safety", "target", "reach", "dream"] as const).map((tier) => {
          const cfg = tierConfig[tier];
          const Icon = cfg.icon;
          return (
            <Card key={tier} className={`border ${cfg.color.split(" ").slice(1).join(" ")}`}>
              <CardContent className="p-3 text-center">
                <Icon className={`w-5 h-5 mx-auto mb-1 ${cfg.color.split(" ")[0]}`} />
                <p className="text-xl font-bold text-foreground">{stats[tier]}</p>
                <p className="text-[10px] text-muted-foreground">{cfg.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t("Search universities...", "Поиск университетов...")}
          className="pl-10 text-sm"
        />
      </div>

      {/* Predictions */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto">
        {filtered.map((pred) => {
          const cfg = tierConfig[pred.tier];
          const Icon = cfg.icon;
          return (
            <Card key={pred.name} className="border">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">{pred.name}</h3>
                    <p className="text-xs text-muted-foreground">{pred.country}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`${cfg.color} text-xs`}>
                      <Icon className="w-3 h-3 mr-1" /> {cfg.label}
                    </Badge>
                    <span className={`text-lg font-bold ${
                      pred.chance >= 70 ? "text-green-600" : pred.chance >= 50 ? "text-blue-600" : pred.chance >= 30 ? "text-amber-600" : "text-red-600"
                    }`}>
                      {pred.chance}%
                    </span>
                  </div>
                </div>

                <div className="mb-3">
                  <Progress value={pred.chance} className="h-2" />
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3">
                  {pred.factors.map((f) => (
                    <div key={f.label} className="text-center">
                      <p className="text-[10px] text-muted-foreground">{f.label}</p>
                      <p className={`text-sm font-semibold ${f.score >= 80 ? "text-green-600" : f.score >= 60 ? "text-amber-600" : "text-red-600"}`}>
                        {f.score}%
                      </p>
                    </div>
                  ))}
                </div>

                {pred.tips.length > 0 && (
                  <div className="space-y-1">
                    {pred.tips.map((tip, i) => (
                      <p key={i} className="text-[11px] text-muted-foreground flex items-start gap-1">
                        <Shield className="w-3 h-3 mt-0.5 text-accent shrink-0" /> {tip}
                      </p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-8">
            <XCircle className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">{t("No universities found for your criteria.", "Университеты не найдены.")}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdmissionPredictor;
