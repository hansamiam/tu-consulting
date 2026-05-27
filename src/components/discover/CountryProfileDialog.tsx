import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Globe, Building2, DollarSign, GraduationCap, Award, Languages,
  Users, ChevronDown, ChevronUp, MapPin, BookOpen,
} from "lucide-react";
import { UniversityResult } from "./types";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  universities: UniversityResult[];
  language: "en" | "ru";
}

interface CountryProfile {
  country: string;
  uniCount: number;
  avgTuition: number;
  minTuition: number;
  maxTuition: number;
  freeCount: number;
  scholarshipCount: number;
  fullRideCount: number;
  programCount: number;
  topFields: [string, number][];
  languages: string[];
  foundationAvailable: number;
  universities: { name: string; ranking: number | null; tuition: number | null }[];
}

const t = {
  en: {
    button: "Country Profiles",
    title: "Country Deep Dive",
    subtitle: "Explore study destinations in detail",
    unis: "universities",
    programs: "programs",
    scholarships: "scholarships",
    fullRides: "full rides",
    avgTuition: "Avg tuition",
    range: "Range",
    free: "Free",
    freeUnis: "free tuition unis",
    topFields: "Top Fields",
    languages: "Languages",
    foundation: "w/ foundation year",
    topUnis: "Universities",
  },
  ru: {
    button: "Профили стран",
    title: "Обзор стран",
    subtitle: "Подробности о каждом направлении",
    unis: "университетов",
    programs: "программ",
    scholarships: "стипендий",
    fullRides: "полных",
    avgTuition: "Ср. стоимость",
    range: "Диапазон",
    free: "Бесплатно",
    freeUnis: "бесплатных",
    topFields: "Направления",
    languages: "Языки",
    foundation: "с подг. годом",
    topUnis: "Университеты",
  },
};

export const CountryProfileDialog = ({ universities, language }: Props) => {
  const l = t[language];
  const [open, setOpen] = useState(false);
  const [expandedCountry, setExpandedCountry] = useState<string | null>(null);

  const profiles = useMemo((): CountryProfile[] => {
    const map = new Map<string, UniversityResult[]>();
    universities.forEach(u => {
      const arr = map.get(u.country) || [];
      arr.push(u);
      map.set(u.country, arr);
    });

    return Array.from(map.entries())
      .map(([country, unis]) => {
        const tuitions = unis.map(u => u.tuition_usd_per_year).filter((t): t is number => t != null);
        const avgTuition = tuitions.length ? Math.round(tuitions.reduce((a, b) => a + b, 0) / tuitions.length) : 0;
        const scholarships = unis.flatMap(u => u.scholarships || []);
        const programs = unis.flatMap(u => u.programs || []);

        const fieldMap = new Map<string, number>();
        programs.forEach(p => fieldMap.set(p.field_of_study, (fieldMap.get(p.field_of_study) || 0) + 1));
        const topFields = Array.from(fieldMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);

        const langSet = new Set<string>();
        unis.forEach(u => { if (u.language_of_instruction) langSet.add(u.language_of_instruction); });

        return {
          country,
          uniCount: unis.length,
          avgTuition,
          minTuition: tuitions.length ? Math.min(...tuitions) : 0,
          maxTuition: tuitions.length ? Math.max(...tuitions) : 0,
          freeCount: unis.filter(u => u.tuition_usd_per_year === 0).length,
          scholarshipCount: scholarships.length,
          fullRideCount: scholarships.filter(s => s.coverage_type === "full_ride").length,
          programCount: programs.length,
          topFields,
          languages: Array.from(langSet),
          foundationAvailable: unis.filter(u => u.foundation_year_available).length,
          universities: unis.map(u => ({ name: u.university_name, ranking: u.global_ranking, tuition: u.tuition_usd_per_year }))
            .sort((a, b) => (a.ranking ?? 9999) - (b.ranking ?? 9999)),
        };
      })
      .sort((a, b) => b.uniCount - a.uniCount);
  }, [universities]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 bg-card border-border">
          <Globe className="h-4 w-4" /> {l.button}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-accent" /> {l.title}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">{l.subtitle}</p>
        </DialogHeader>

        <ScrollArea className="h-[60vh]">
          <div className="space-y-2 pr-2">
            {profiles.map(cp => {
              const isExpanded = expandedCountry === cp.country;
              return (
                <Card key={cp.country} className="transition-all">
                  <CardContent className="p-0">
                    <button className="w-full p-4 text-left flex items-center gap-3" onClick={() => setExpandedCountry(isExpanded ? null : cp.country)}>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground text-sm">{cp.country}</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Building2 className="h-2.5 w-2.5" />{cp.uniCount} {l.unis}</span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><BookOpen className="h-2.5 w-2.5" />{cp.programCount} {l.programs}</span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Award className="h-2.5 w-2.5" />{cp.scholarshipCount} {l.scholarships}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-bold ${cp.avgTuition === 0 ? "text-green-500" : "text-foreground"}`}>
                          {cp.avgTuition === 0 ? l.free : `$${cp.avgTuition.toLocaleString()}`}
                        </p>
                        <p className="text-[9px] text-muted-foreground">{l.avgTuition}</p>
                      </div>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </button>
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              <div className="p-2 rounded bg-muted/30 text-center">
                                <p className="text-lg font-bold text-foreground">{cp.uniCount}</p>
                                <p className="text-[9px] text-muted-foreground">{l.unis}</p>
                              </div>
                              {/* fullRide stat tile stripped 2026-05-27 */}
                              <div className="p-2 rounded bg-muted/30 text-center">
                                <p className="text-lg font-bold text-green-500">{cp.freeCount}</p>
                                <p className="text-[9px] text-muted-foreground">{l.freeUnis}</p>
                              </div>
                              <div className="p-2 rounded bg-muted/30 text-center">
                                <p className="text-lg font-bold text-foreground">{cp.foundationAvailable}</p>
                                <p className="text-[9px] text-muted-foreground">{l.foundation}</p>
                              </div>
                            </div>

                            {cp.minTuition !== cp.maxTuition && (
                              <div className="text-xs text-muted-foreground">
                                {l.range}: <span className="text-foreground font-medium">${cp.minTuition.toLocaleString()}</span> – <span className="text-foreground font-medium">${cp.maxTuition.toLocaleString()}</span>/yr
                              </div>
                            )}

                            <div>
                              <p className="text-[10px] font-medium text-muted-foreground mb-1">{l.topFields}</p>
                              <div className="flex flex-wrap gap-1">
                                {cp.topFields.map(([field, count]) => (
                                  <Badge key={field} variant="outline" className="text-[9px]">{field} ({count})</Badge>
                                ))}
                              </div>
                            </div>

                            <div>
                              <p className="text-[10px] font-medium text-muted-foreground mb-1">{l.languages}</p>
                              <div className="flex gap-1">
                                {cp.languages.map(lang => (
                                  <Badge key={lang} variant="secondary" className="text-[9px]">{lang}</Badge>
                                ))}
                              </div>
                            </div>

                            <div>
                              <p className="text-[10px] font-medium text-muted-foreground mb-1">{l.topUnis}</p>
                              <div className="space-y-1">
                                {cp.universities.slice(0, 8).map(u => (
                                  <div key={u.name} className="flex items-center justify-between text-xs">
                                    <span className="text-foreground truncate">{u.name}</span>
                                    <span className="text-muted-foreground shrink-0 ml-2">
                                      {u.ranking ? `#${u.ranking}` : ""} {u.tuition != null ? (u.tuition === 0 ? "Free" : `$${u.tuition.toLocaleString()}`) : ""}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
