import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, DollarSign, GraduationCap, Star } from "lucide-react";
import { UniversityResult } from "./types";
import { DiscoverProfile } from "./DiscoverProfileGate";

interface Props {
  universities: UniversityResult[];
  profile: DiscoverProfile;
  language: "en" | "ru";
}

interface Recommendation {
  uni: UniversityResult;
  score: number;
  reasons: string[];
}

const parseBudget = (range: string): number => {
  const map: Record<string, number> = {
    "0-5000": 5000, "5000-15000": 15000, "15000-30000": 30000,
    "30000-50000": 50000, "50000+": 100000,
  };
  return map[range] || 50000;
};

export const SmartRecommendations = ({ universities, profile, language }: Props) => {
  const recommendations = useMemo((): Recommendation[] => {
    const budget = parseBudget(profile.budgetRange);
    const userGpa = profile.gpa ? parseFloat(profile.gpa) : null;
    const userIelts = profile.ieltsScore ? parseFloat(profile.ieltsScore) : null;

    return universities.map(uni => {
      let score = 50;
      const reasons: string[] = [];

      // Budget fit
      if (uni.tuition_usd_per_year != null) {
        if (uni.tuition_usd_per_year <= budget) {
          score += 15;
          if (uni.tuition_usd_per_year === 0) reasons.push("Free tuition");
          else if (uni.tuition_usd_per_year <= budget * 0.5) reasons.push("Well within budget");
        } else {
          score -= 10;
        }
      }

      // Scholarship availability
      if (uni.scholarships?.some(s => s.coverage_type === "full_ride")) {
        score += 15;
        reasons.push("Full ride scholarship available");
      } else if (uni.scholarships?.length) {
        score += 5;
      }

      // Degree match
      const hasTargetDegree = uni.programs?.some(p => p.degree_level === profile.targetDegree);
      if (hasTargetDegree) {
        score += 10;
        reasons.push(`Offers ${profile.targetDegree}'s programs`);
      } else {
        score -= 20;
      }

      // Field match
      const fieldMatch = uni.programs?.some(p =>
        profile.fieldOfInterest && p.field_of_study.toLowerCase().includes(profile.fieldOfInterest.toLowerCase().split(" ")[0])
      );
      if (fieldMatch) {
        score += 10;
        reasons.push("Matches your field of interest");
      }

      // GPA fit
      if (userGpa) {
        const gpaReqs = uni.programs?.flatMap(p =>
          p.admission_requirements?.map(a => a.gpa_min).filter((g): g is number => g != null) ?? []
        ) || [];
        if (gpaReqs.length > 0 && userGpa >= Math.min(...gpaReqs)) {
          score += 10;
          reasons.push("GPA meets requirements");
        }
      }

      // IELTS fit
      if (userIelts) {
        const ieltsReqs = uni.programs?.flatMap(p =>
          p.admission_requirements?.filter(a => a.ielts_required).map(a => a.ielts_score_min).filter((s): s is number => s != null) ?? []
        ) || [];
        const hasOptional = uni.programs?.some(p => p.admission_requirements?.some(a => !a.ielts_required));
        if (hasOptional) {
          score += 8;
          reasons.push("IELTS optional");
        } else if (ieltsReqs.length > 0 && userIelts >= Math.min(...ieltsReqs)) {
          score += 8;
          reasons.push("IELTS score qualifies");
        }
      }

      // Career outcomes
      const insight = uni.university_insights?.[0];
      if (insight?.employment_rate_6months && insight.employment_rate_6months > 85) {
        score += 5;
        reasons.push(`${insight.employment_rate_6months}% employment rate`);
      }

      return { uni, score: Math.min(100, Math.max(0, score)), reasons };
    })
      .filter(r => r.score >= 50)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  }, [universities, profile]);

  if (recommendations.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-accent/5 via-primary/5 to-accent/5 border border-accent/20 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 p-4 border-b border-accent/20">
        <Sparkles className="h-4 w-4 text-accent" />
        <h3 className="text-sm font-heading font-semibold">Recommended For You</h3>
        <Badge variant="outline" className="text-xs ml-auto border-accent/30 text-accent">AI-Powered</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
        {recommendations.map((rec, i) => (
          <div key={rec.uni.university_id} className="bg-card border border-border rounded-lg p-4 space-y-3 hover:border-accent/40 transition-colors">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  {i < 3 && <Star className="h-3.5 w-3.5 text-accent fill-accent shrink-0" />}
                  <p className="font-semibold text-sm text-foreground truncate">{rec.uni.university_name}</p>
                </div>
                <p className="text-xs text-muted-foreground">{rec.uni.city}, {rec.uni.country}</p>
              </div>
              <Badge className={`shrink-0 text-xs ${rec.score >= 80 ? "bg-green-600" : rec.score >= 65 ? "bg-accent" : "bg-muted text-foreground"}`}>
                {rec.score}%
              </Badge>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {rec.uni.tuition_usd_per_year != null && (
                <Badge variant="outline" className="text-[10px] gap-1">
                  <DollarSign className="h-2.5 w-2.5" />
                  {rec.uni.tuition_usd_per_year === 0 ? "Free" : `$${rec.uni.tuition_usd_per_year.toLocaleString()}`}
                </Badge>
              )}
              <Badge variant="outline" className="text-[10px] gap-1">
                <GraduationCap className="h-2.5 w-2.5" />
                {rec.uni.programs?.length || 0}
              </Badge>
            </div>

            <div className="space-y-1">
              {rec.reasons.slice(0, 3).map((r, j) => (
                <p key={j} className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <TrendingUp className="h-3 w-3 text-green-600 shrink-0" /> {r}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
