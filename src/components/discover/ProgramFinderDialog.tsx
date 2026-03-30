import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, BookOpen, GraduationCap, Clock, DollarSign, MapPin, ExternalLink, Filter } from "lucide-react";
import { UniversityResult } from "./types";

interface Props {
  universities: UniversityResult[];
  language: "en" | "ru";
}

interface ProgramMatch {
  uniName: string;
  uniCountry: string;
  uniCity: string;
  tuition: number | null;
  programName: string;
  degreeLevel: string;
  fieldOfStudy: string;
  duration: number | null;
  ieltsMin: number | null;
  gpaMin: number | null;
  satMin: number | null;
  deadline: string | null;
  acceptanceRate: number | null;
  portalUrl: string | null;
  websiteUrl: string | null;
}

const t = {
  en: {
    button: "Program Finder",
    title: "Program Finder",
    subtitle: "Search across all programs from all universities",
    searchPlaceholder: "Search by program name or field...",
    field: "Field",
    allFields: "All fields",
    degree: "Degree",
    allDegrees: "All levels",
    results: "programs found",
    at: "at",
    duration: "Duration",
    years: "yrs",
    deadline: "Deadline",
    apply: "Apply",
    noResults: "No programs match your criteria",
  },
  ru: {
    button: "Поиск программ",
    title: "Поиск программ",
    subtitle: "Поиск по всем программам всех университетов",
    searchPlaceholder: "Поиск по названию или направлению...",
    field: "Направление",
    allFields: "Все направления",
    degree: "Уровень",
    allDegrees: "Все уровни",
    results: "программ найдено",
    at: "в",
    duration: "Длительность",
    years: "лет",
    deadline: "Дедлайн",
    apply: "Подать",
    noResults: "Программы не найдены",
  },
};

export const ProgramFinderDialog = ({ universities, language }: Props) => {
  const l = t[language];
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [fieldFilter, setFieldFilter] = useState("all");
  const [degreeFilter, setDegreeFilter] = useState("all");

  const allPrograms = useMemo((): ProgramMatch[] => {
    const progs: ProgramMatch[] = [];
    universities.forEach(uni => {
      uni.programs?.forEach(p => {
        const req = p.admission_requirements?.[0];
        const app = p.applications?.[0];
        progs.push({
          uniName: uni.university_name,
          uniCountry: uni.country,
          uniCity: uni.city,
          tuition: uni.tuition_usd_per_year,
          programName: p.program_name,
          degreeLevel: p.degree_level,
          fieldOfStudy: p.field_of_study,
          duration: p.duration_years,
          ieltsMin: req?.ielts_score_min ?? null,
          gpaMin: req?.gpa_min ?? null,
          satMin: req?.sat_score_min ?? null,
          deadline: req?.application_deadline ?? null,
          acceptanceRate: app?.acceptance_rate ?? null,
          portalUrl: app?.portal_url ?? null,
          websiteUrl: uni.website_url,
        });
      });
    });
    return progs;
  }, [universities]);

  const fields = useMemo(() => [...new Set(allPrograms.map(p => p.fieldOfStudy))].sort(), [allPrograms]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allPrograms.filter(p => {
      if (q && !p.programName.toLowerCase().includes(q) && !p.fieldOfStudy.toLowerCase().includes(q) && !p.uniName.toLowerCase().includes(q)) return false;
      if (fieldFilter !== "all" && p.fieldOfStudy !== fieldFilter) return false;
      if (degreeFilter !== "all" && p.degreeLevel !== degreeFilter) return false;
      return true;
    });
  }, [allPrograms, search, fieldFilter, degreeFilter]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 bg-card border-border">
          <BookOpen className="h-4 w-4" /> {l.button}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-accent" /> {l.title}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">{l.subtitle}</p>
        </DialogHeader>

        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={l.searchPlaceholder} className="pl-9 text-sm" />
          </div>
          <Select value={fieldFilter} onValueChange={setFieldFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder={l.allFields} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{l.allFields}</SelectItem>
              {fields.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={degreeFilter} onValueChange={setDegreeFilter}>
            <SelectTrigger className="w-32"><SelectValue placeholder={l.allDegrees} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{l.allDegrees}</SelectItem>
              <SelectItem value="bachelor">Bachelor</SelectItem>
              <SelectItem value="master">Master</SelectItem>
              <SelectItem value="phd">PhD</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <p className="text-xs text-muted-foreground">{filtered.length} {l.results}</p>

        <ScrollArea className="h-[50vh]">
          <div className="space-y-2 pr-2">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">{l.noResults}</div>
            ) : filtered.slice(0, 100).map((p, i) => (
              <div key={`${p.uniName}-${p.programName}-${i}`} className="border border-border rounded-lg p-3 hover:border-accent/30 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-foreground">{p.programName}</p>
                    <p className="text-xs text-muted-foreground">{l.at} {p.uniName} — {p.uniCity}, {p.uniCountry}</p>
                  </div>
                  {p.portalUrl && (
                    <a href={p.portalUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline flex items-center gap-1 shrink-0">
                      {l.apply} <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <Badge variant="outline" className="text-[10px] capitalize">{p.degreeLevel}</Badge>
                  <Badge variant="outline" className="text-[10px]">{p.fieldOfStudy}</Badge>
                  {p.duration && <Badge variant="outline" className="text-[10px] gap-0.5"><Clock className="h-2.5 w-2.5" />{p.duration} {l.years}</Badge>}
                  {p.tuition != null && (
                    <Badge variant="outline" className={`text-[10px] gap-0.5 ${p.tuition === 0 ? "border-green-500/30 text-green-500" : ""}`}>
                      <DollarSign className="h-2.5 w-2.5" />{p.tuition === 0 ? "Free" : `$${p.tuition.toLocaleString()}/yr`}
                    </Badge>
                  )}
                  {p.ieltsMin && <Badge variant="outline" className="text-[10px]">IELTS {p.ieltsMin}+</Badge>}
                  {p.gpaMin && <Badge variant="outline" className="text-[10px]">GPA {p.gpaMin}+</Badge>}
                  {p.acceptanceRate && <Badge variant="outline" className="text-[10px]">{p.acceptanceRate}% accept</Badge>}
                  {p.deadline && <Badge variant="outline" className="text-[10px] gap-0.5">📅 {p.deadline}</Badge>}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
