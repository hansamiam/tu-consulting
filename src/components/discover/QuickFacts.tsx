import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Zap, GraduationCap, Globe, DollarSign, Award, Languages,
  Building2, BookOpen,
} from "lucide-react";
import { UniversityResult } from "./types";
import { motion } from "framer-motion";

interface Props {
  universities: UniversityResult[];
  language: "en" | "ru";
}

const t = {
  en: {
    title: "Quick Insights",
    freeUnis: "Free Tuition Universities",
    noIelts: "IELTS Optional Programs",
    foundationYear: "Foundation Year Available",
    gapYear: "Gap Year Accepted",
    fullRide: "Full Ride Scholarships",
    topFields: "Most Popular Fields",
    languages: "Languages of Instruction",
    countries: "Countries Covered",
  },
  ru: {
    title: "Быстрые факты",
    freeUnis: "Бесплатные университеты",
    noIelts: "IELTS не обязателен",
    foundationYear: "Подготовительный год",
    gapYear: "Gap year принимается",
    fullRide: "Полные стипендии",
    topFields: "Популярные направления",
    languages: "Языки обучения",
    countries: "Стран охвачено",
  },
};

export const QuickFacts = ({ universities, language }: Props) => {
  const l = t[language];

  const facts = useMemo(() => {
    const freeUnis = universities.filter(u => u.tuition_usd_per_year === 0);
    const noIeltsPrograms = universities.reduce((acc, u) =>
      acc + (u.programs?.filter(p => p.admission_requirements?.some(a => !a.ielts_required))?.length || 0), 0);
    const foundationCount = universities.filter(u => u.foundation_year_available).length;
    const gapYearCount = universities.filter(u => u.gap_year_accepted).length;
    const fullRideCount = universities.reduce((acc, u) =>
      acc + (u.scholarships?.filter(s => s.coverage_type === "full_ride")?.length || 0), 0);

    const fieldCounts = new Map<string, number>();
    universities.forEach(u => u.programs?.forEach(p => {
      fieldCounts.set(p.field_of_study, (fieldCounts.get(p.field_of_study) || 0) + 1);
    }));
    const topFields = Array.from(fieldCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const langSet = new Set<string>();
    universities.forEach(u => { if (u.language_of_instruction) langSet.add(u.language_of_instruction); });

    const countrySet = new Set(universities.map(u => u.country));

    return { freeUnis, noIeltsPrograms, foundationCount, gapYearCount, fullRideCount, topFields, languages: langSet, countries: countrySet };
  }, [universities]);

  // Full Ride stat tile stripped 2026-05-27 alongside the rest of the
  // full-ride mentions ("completely get rid of every single one because
  // of edge cases").
  const cards = [
    { icon: DollarSign, label: l.freeUnis, value: facts.freeUnis.length, color: "text-green-500", examples: facts.freeUnis.slice(0, 3).map(u => u.university_name) },
    { icon: BookOpen, label: l.noIelts, value: facts.noIeltsPrograms, color: "text-blue-500" },
    { icon: GraduationCap, label: l.foundationYear, value: facts.foundationCount, color: "text-purple-500" },
    { icon: Building2, label: l.gapYear, value: facts.gapYearCount, color: "text-accent" },
    { icon: Globe, label: l.countries, value: facts.countries.size, color: "text-accent" },
  ];

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Zap className="h-4 w-4 text-accent" />
          {l.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {cards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              className="text-center p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <card.icon className={`h-5 w-5 mx-auto mb-1.5 ${card.color}`} />
              <p className="text-lg font-bold text-foreground">{card.value}</p>
              <p className="text-[10px] text-muted-foreground">{card.label}</p>
              {card.examples && (
                <div className="mt-1.5 space-y-0.5">
                  {card.examples.map(e => (
                    <p key={e} className="text-[9px] text-muted-foreground truncate">{e}</p>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {facts.topFields.length > 0 && (
          <div className="mt-4 pt-3 border-t border-border">
            <p className="text-xs font-medium text-muted-foreground mb-2">{l.topFields}</p>
            <div className="flex flex-wrap gap-1.5">
              {facts.topFields.map(([field, count]) => (
                <Badge key={field} variant="outline" className="text-[10px] gap-1">
                  {field} <span className="text-muted-foreground">({count})</span>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
