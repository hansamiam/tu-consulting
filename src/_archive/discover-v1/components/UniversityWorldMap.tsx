import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, Building2 } from "lucide-react";
import { UniversityResult } from "./types";
import { motion } from "framer-motion";

interface Props {
  universities: UniversityResult[];
  language: "en" | "ru";
}

interface CountryCluster {
  country: string;
  count: number;
  topCity: string;
  avgTuition: number;
}

const t = {
  en: {
    title: "World Map",
    subtitle: "University distribution by country",
    unis: "universities",
    topCity: "Top city",
    avg: "avg",
  },
  ru: {
    title: "Карта мира",
    subtitle: "Распределение университетов по странам",
    unis: "университетов",
    topCity: "Главный город",
    avg: "ср.",
  },
};

// Approximate lat/lng for countries (for positioning on the visual map)
const countryPositions: Record<string, { x: number; y: number; region: string }> = {
  "United States": { x: 20, y: 35, region: "Americas" },
  "Canada": { x: 22, y: 22, region: "Americas" },
  "United Kingdom": { x: 47, y: 25, region: "Europe" },
  "Germany": { x: 51, y: 28, region: "Europe" },
  "France": { x: 49, y: 32, region: "Europe" },
  "Switzerland": { x: 50, y: 31, region: "Europe" },
  "Netherlands": { x: 50, y: 27, region: "Europe" },
  "Italy": { x: 52, y: 34, region: "Europe" },
  "Spain": { x: 46, y: 35, region: "Europe" },
  "Sweden": { x: 53, y: 20, region: "Europe" },
  "Finland": { x: 55, y: 18, region: "Europe" },
  "Poland": { x: 54, y: 28, region: "Europe" },
  "Czech Republic": { x: 53, y: 29, region: "Europe" },
  "Hungary": { x: 54, y: 31, region: "Europe" },
  "Romania": { x: 56, y: 31, region: "Europe" },
  "Lithuania": { x: 55, y: 25, region: "Europe" },
  "Latvia": { x: 55, y: 24, region: "Europe" },
  "Estonia": { x: 56, y: 22, region: "Europe" },
  "Turkey": { x: 58, y: 35, region: "Europe" },
  "Georgia": { x: 62, y: 33, region: "Asia" },
  "Russia": { x: 65, y: 22, region: "Asia" },
  "Kazakhstan": { x: 68, y: 30, region: "Asia" },
  "Uzbekistan": { x: 67, y: 33, region: "Asia" },
  "Kyrgyzstan": { x: 70, y: 33, region: "Asia" },
  "China": { x: 76, y: 38, region: "Asia" },
  "Japan": { x: 84, y: 35, region: "Asia" },
  "South Korea": { x: 82, y: 37, region: "Asia" },
  "India": { x: 70, y: 45, region: "Asia" },
  "Singapore": { x: 76, y: 55, region: "Asia" },
  "Malaysia": { x: 76, y: 53, region: "Asia" },
  "Hong Kong": { x: 79, y: 43, region: "Asia" },
  "United Arab Emirates": { x: 63, y: 42, region: "Middle East" },
  "Saudi Arabia": { x: 60, y: 42, region: "Middle East" },
  "Qatar": { x: 62, y: 43, region: "Middle East" },
  "Israel": { x: 58, y: 38, region: "Middle East" },
  "Lebanon": { x: 58, y: 37, region: "Middle East" },
  "Australia": { x: 83, y: 68, region: "Oceania" },
  "New Zealand": { x: 90, y: 72, region: "Oceania" },
};

export const UniversityWorldMap = ({ universities, language }: Props) => {
  const l = t[language];

  const clusters = useMemo((): CountryCluster[] => {
    const map = new Map<string, UniversityResult[]>();
    universities.forEach(u => {
      const arr = map.get(u.country) || [];
      arr.push(u);
      map.set(u.country, arr);
    });

    return Array.from(map.entries())
      .map(([country, unis]) => {
        const cityMap = new Map<string, number>();
        unis.forEach(u => cityMap.set(u.city, (cityMap.get(u.city) || 0) + 1));
        const topCity = Array.from(cityMap.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
        const tuitions = unis.map(u => u.tuition_usd_per_year).filter((t): t is number => t != null && t > 0);
        const avgTuition = tuitions.length ? Math.round(tuitions.reduce((a, b) => a + b, 0) / tuitions.length) : 0;

        return { country, count: unis.length, topCity, avgTuition };
      })
      .sort((a, b) => b.count - a.count);
  }, [universities]);

  const maxCount = Math.max(...clusters.map(c => c.count));

  const getBubbleSize = (count: number) => {
    const min = 24;
    const max = 56;
    return Math.max(min, Math.round(min + (count / maxCount) * (max - min)));
  };

  return (
    <Card className="border-border overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Globe className="h-4 w-4 text-accent" />
          {l.title}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{l.subtitle}</p>
      </CardHeader>
      <CardContent>
        {/* Visual bubble map */}
        <div className="relative w-full h-[280px] sm:h-[340px] bg-muted/20 rounded-xl overflow-hidden mb-4">
          {clusters.map((cluster, i) => {
            const pos = countryPositions[cluster.country];
            if (!pos) return null;
            const size = getBubbleSize(cluster.count);
            return (
              <motion.div
                key={cluster.country}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.03, type: "spring", stiffness: 200 }}
                className="absolute group cursor-pointer"
                style={{
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <div
                  className="rounded-full bg-accent/20 border-2 border-accent/40 flex items-center justify-center hover:bg-accent/30 hover:border-accent/60 transition-all hover:scale-110"
                  style={{ width: size, height: size }}
                >
                  <span className="text-[9px] font-bold text-accent">{cluster.count}</span>
                </div>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                  <div className="bg-card border border-border rounded-lg shadow-lg p-2 whitespace-nowrap">
                    <p className="text-xs font-semibold text-foreground">{cluster.country}</p>
                    <p className="text-[9px] text-muted-foreground">{cluster.count} {l.unis}</p>
                    <p className="text-[9px] text-muted-foreground">{l.topCity}: {cluster.topCity}</p>
                    {cluster.avgTuition > 0 && (
                      <p className="text-[9px] text-muted-foreground">{l.avg}: ${cluster.avgTuition.toLocaleString()}/yr</p>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Country list */}
        <div className="flex flex-wrap gap-1.5">
          {clusters.map(c => (
            <Badge key={c.country} variant="outline" className="text-[10px] gap-1">
              <Building2 className="h-2.5 w-2.5" />
              {c.country} ({c.count})
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
