import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Globe, TrendingDown, TrendingUp } from "lucide-react";
import { UniversityResult } from "./types";
import { motion } from "framer-motion";

interface Props {
  universities: UniversityResult[];
  language: "en" | "ru";
}

const t = {
  en: {
    title: "Tuition by Country",
    subtitle: "Average annual tuition costs comparison",
    free: "Free",
    avg: "avg",
    unis: "unis",
    cheapest: "Most affordable",
    expensive: "Most expensive",
  },
  ru: {
    title: "Стоимость по странам",
    subtitle: "Сравнение средней годовой стоимости обучения",
    free: "Бесплатно",
    avg: "ср.",
    unis: "унив.",
    cheapest: "Самые доступные",
    expensive: "Самые дорогие",
  },
};

interface CountryStat {
  country: string;
  avgTuition: number;
  minTuition: number;
  maxTuition: number;
  count: number;
  freeCount: number;
}

export const TuitionHeatmap = ({ universities, language }: Props) => {
  const l = t[language];

  const countryStats = useMemo((): CountryStat[] => {
    const map = new Map<string, number[]>();
    universities.forEach(u => {
      if (u.tuition_usd_per_year != null) {
        const arr = map.get(u.country) || [];
        arr.push(u.tuition_usd_per_year);
        map.set(u.country, arr);
      }
    });

    return Array.from(map.entries())
      .map(([country, tuitions]) => ({
        country,
        avgTuition: Math.round(tuitions.reduce((a, b) => a + b, 0) / tuitions.length),
        minTuition: Math.min(...tuitions),
        maxTuition: Math.max(...tuitions),
        count: tuitions.length,
        freeCount: tuitions.filter(t => t === 0).length,
      }))
      .sort((a, b) => a.avgTuition - b.avgTuition);
  }, [universities]);

  if (countryStats.length === 0) return null;

  const maxAvg = Math.max(...countryStats.map(c => c.avgTuition));

  const getColor = (avg: number) => {
    if (avg === 0) return "bg-green-500";
    const ratio = avg / maxAvg;
    if (ratio < 0.15) return "bg-green-500";
    if (ratio < 0.3) return "bg-emerald-500";
    if (ratio < 0.5) return "bg-amber-500";
    if (ratio < 0.75) return "bg-orange-500";
    return "bg-destructive";
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Globe className="h-4 w-4 text-accent" />
          {l.title}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{l.subtitle}</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-1.5">
          {countryStats.map((stat, i) => (
            <motion.div
              key={stat.country}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.02 }}
              className="flex items-center gap-3 group"
            >
              <span className="text-xs text-foreground w-28 truncate shrink-0 font-medium">{stat.country}</span>
              <div className="flex-1 h-5 bg-muted/30 rounded-full overflow-hidden relative">
                <div
                  className={`h-full rounded-full transition-all ${getColor(stat.avgTuition)}`}
                  style={{ width: `${maxAvg === 0 ? 100 : Math.max(3, (stat.avgTuition / maxAvg) * 100)}%`, opacity: 0.7 }}
                />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-mono text-foreground w-16 text-right">
                  {stat.avgTuition === 0 ? l.free : `$${stat.avgTuition.toLocaleString()}`}
                </span>
                <Badge variant="outline" className="text-[9px] w-14 justify-center">
                  {stat.count} {l.unis}
                </Badge>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
