import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { UniversityResult } from "./types";
import { motion } from "framer-motion";

interface Props {
  universities: UniversityResult[];
  language: "en" | "ru";
}

interface FieldStat {
  field: string;
  programCount: number;
  uniCount: number;
  avgTuition: number;
  avgIelts: number | null;
  scholarshipCount: number;
  demand: "high" | "medium" | "low";
}

const t = {
  en: {
    title: "Field of Study Analytics",
    subtitle: "Program availability and requirements by field",
    programs: "programs",
    unis: "universities",
    avgTuition: "avg tuition",
    avgIelts: "avg IELTS",
    scholarships: "scholarships",
    highDemand: "High supply",
    medDemand: "Moderate",
    lowDemand: "Limited",
  },
  ru: {
    title: "Аналитика направлений",
    subtitle: "Доступность программ и требования по направлениям",
    programs: "программ",
    unis: "университетов",
    avgTuition: "ср. стоимость",
    avgIelts: "ср. IELTS",
    scholarships: "стипендий",
    highDemand: "Много программ",
    medDemand: "Средне",
    lowDemand: "Мало",
  },
};

export const FieldAnalytics = ({ universities, language }: Props) => {
  const l = t[language];

  const fieldStats = useMemo((): FieldStat[] => {
    const map = new Map<string, { programs: number; unis: Set<string>; tuitions: number[]; ielts: number[]; scholarships: number }>();

    universities.forEach(uni => {
      uni.programs?.forEach(p => {
        const existing = map.get(p.field_of_study) || { programs: 0, unis: new Set<string>(), tuitions: [], ielts: [], scholarships: 0 };
        existing.programs++;
        existing.unis.add(uni.university_id);
        if (uni.tuition_usd_per_year != null) existing.tuitions.push(uni.tuition_usd_per_year);
        const ieltsMin = p.admission_requirements?.[0]?.ielts_score_min;
        if (ieltsMin != null) existing.ielts.push(ieltsMin);
        map.set(p.field_of_study, existing);
      });
      uni.scholarships?.forEach(() => {
        // Distribute scholarships proportionally across fields
        const fieldCount = new Set(uni.programs?.map(p => p.field_of_study) || []);
        fieldCount.forEach(f => {
          const existing = map.get(f);
          if (existing) existing.scholarships++;
        });
      });
    });

    return Array.from(map.entries())
      .map(([field, data]) => ({
        field,
        programCount: data.programs,
        uniCount: data.unis.size,
        avgTuition: data.tuitions.length ? Math.round(data.tuitions.reduce((a, b) => a + b, 0) / data.tuitions.length) : 0,
        avgIelts: data.ielts.length ? Math.round(data.ielts.reduce((a, b) => a + b, 0) / data.ielts.length * 10) / 10 : null,
        scholarshipCount: data.scholarships,
        demand: (data.programs > 50 ? "high" : data.programs > 20 ? "medium" : "low") as "high" | "medium" | "low",
      }))
      .sort((a, b) => b.programCount - a.programCount);
  }, [universities]);

  if (fieldStats.length === 0) return null;
  const maxPrograms = fieldStats[0]?.programCount || 1;

  const demandConfig = {
    high: { icon: TrendingUp, color: "text-green-500", label: l.highDemand },
    medium: { icon: Minus, color: "text-amber-500", label: l.medDemand },
    low: { icon: TrendingDown, color: "text-destructive", label: l.lowDemand },
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <BarChart3 className="h-4 w-4 text-accent" />
          {l.title}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{l.subtitle}</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {fieldStats.slice(0, 12).map((stat, i) => {
            const dc = demandConfig[stat.demand];
            return (
              <motion.div
                key={stat.field}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors"
              >
                <div className="w-36 sm:w-44 shrink-0">
                  <p className="text-xs font-medium text-foreground truncate">{stat.field}</p>
                  <p className="text-[9px] text-muted-foreground">{stat.uniCount} {l.unis}</p>
                </div>
                <div className="flex-1 h-4 bg-muted/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent/60 rounded-full"
                    style={{ width: `${(stat.programCount / maxPrograms) * 100}%` }}
                  />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-mono text-foreground w-8 text-right">{stat.programCount}</span>
                  <dc.icon className={`h-3 w-3 ${dc.color}`} />
                  {stat.avgIelts && (
                    <Badge variant="outline" className="text-[9px]">IELTS {stat.avgIelts}</Badge>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
