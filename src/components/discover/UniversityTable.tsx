import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ExternalLink, ChevronDown, ChevronUp, GraduationCap, BookOpen, Shield, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useState, useMemo } from "react";
import { UniversityResult } from "./types";

interface UniversityTableProps {
  universities: UniversityResult[];
  language: "en" | "ru";
}

const labels = {
  en: {
    university: "University", location: "Location", tuition: "Tuition/yr",
    ielts: "IELTS", scholarships: "Scholarships", programs: "Programs",
    foundation: "Foundation", noResults: "No universities found",
    noResultsSub: "Try adjusting your search or filters.", admitRate: "Admit Rate",
    visa: "Visa", yes: "Yes", no: "No", na: "N/A", gapYear: "Gap year OK",
    showing: "Showing", of: "of", perPage: "per page",
  },
  ru: {
    university: "Университет", location: "Город", tuition: "Стоимость/год",
    ielts: "IELTS", scholarships: "Стипендии", programs: "Программы",
    foundation: "Подг. год", noResults: "Университеты не найдены",
    noResultsSub: "Попробуйте изменить параметры поиска.", admitRate: "Приём",
    visa: "Виза", yes: "Да", no: "Нет", na: "Н/Д", gapYear: "Gap year",
    showing: "Показано", of: "из", perPage: "на стр.",
  },
};

type SortKey = "name" | "country" | "tuition" | "ielts" | "admit" | "visa" | "scholarships";
type SortDir = "asc" | "desc";

const getIeltsRange = (uni: UniversityResult) => {
  const scores = uni.programs
    ?.flatMap((p) => p.admission_requirements?.map((a) => a.ielts_score_min) ?? [])
    .filter((s): s is number => s != null);
  if (!scores || scores.length === 0) return null;
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  return { min, max, display: min === max ? `${min}` : `${min}–${max}` };
};

const getAdmitRate = (uni: UniversityResult) => {
  const rates = uni.programs
    ?.flatMap((p) => p.applications?.map((a) => a.acceptance_rate) ?? [])
    .filter((r): r is number => r != null);
  if (!rates || rates.length === 0) return null;
  return Math.round(rates.reduce((a, b) => a + b, 0) / rates.length);
};

const getVisaDifficulty = (uni: UniversityResult) => {
  const scores = uni.programs
    ?.flatMap((p) => p.applications?.map((a) => a.visa_difficulty_score) ?? [])
    .filter((s): s is number => s != null);
  if (!scores || scores.length === 0) return null;
  const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const en = ["Easy", "Moderate", "Hard", "Very Hard", "Extreme"];
  return { value: avg, label: en[avg - 1] || `${avg}/5` };
};

const ExpandableRow = ({ uni, language }: { uni: UniversityResult; language: "en" | "ru" }) => {
  const [open, setOpen] = useState(false);
  const l = labels[language];
  const ielts = getIeltsRange(uni);
  const admit = getAdmitRate(uni);
  const visa = getVisaDifficulty(uni);
  const hasIeltsOptional = uni.programs?.some((p) => p.admission_requirements?.some((a) => !a.ielts_required));

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <TableRow className="cursor-pointer group hover:bg-muted/30" onClick={() => setOpen(!open)}>
        <TableCell className="font-medium">
          <div className="flex items-center gap-2">
            <CollapsibleTrigger asChild>
              <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <div>
              <span className="text-sm font-semibold text-foreground">{uni.university_name}</span>
              {uni.website_url && (
                <a href={uni.website_url} target="_blank" rel="noopener noreferrer" className="ml-1.5 inline-block" onClick={(e) => e.stopPropagation()}>
                  <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-accent inline" />
                </a>
              )}
            </div>
          </div>
        </TableCell>
        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{uni.city}, {uni.country}</TableCell>
        <TableCell className="text-sm whitespace-nowrap">
          {uni.tuition_usd_per_year != null ? (
            <span className={uni.tuition_usd_per_year === 0 ? "text-green-600 font-semibold" : "text-foreground"}>
              {uni.tuition_usd_per_year === 0 ? "Free" : `$${uni.tuition_usd_per_year.toLocaleString()}`}
            </span>
          ) : <span className="text-muted-foreground">{l.na}</span>}
        </TableCell>
        <TableCell className="text-sm whitespace-nowrap">
          {ielts ? <span className="text-foreground">{ielts.display}</span>
            : hasIeltsOptional ? <Badge variant="outline" className="text-xs border-accent text-accent">Optional</Badge>
            : <span className="text-muted-foreground">{l.na}</span>}
        </TableCell>
        <TableCell className="text-sm whitespace-nowrap">
          {admit != null ? (
            <span className={admit < 15 ? "text-destructive font-medium" : admit < 40 ? "text-accent" : "text-green-600"}>
              {admit}%
            </span>
          ) : <span className="text-muted-foreground">{l.na}</span>}
        </TableCell>
        <TableCell className="text-sm whitespace-nowrap">
          {visa ? (
            <Badge variant="outline" className={`text-xs ${
              visa.value <= 1 ? "border-green-500 text-green-600" :
              visa.value <= 2 ? "border-accent text-accent" :
              "border-destructive text-destructive"
            }`}>{visa.label}</Badge>
          ) : <span className="text-muted-foreground">{l.na}</span>}
        </TableCell>
        <TableCell className="text-sm text-center whitespace-nowrap">
          {uni.foundation_year_available ? (
            <Badge variant="outline" className="text-xs border-accent text-accent">{l.yes}</Badge>
          ) : <span className="text-muted-foreground text-xs">—</span>}
        </TableCell>
        <TableCell className="text-sm whitespace-nowrap">
          {uni.scholarships?.length ? (
            <Badge variant="secondary" className="text-xs">{uni.scholarships.length}</Badge>
          ) : <span className="text-muted-foreground">—</span>}
        </TableCell>
      </TableRow>

      {open && (
        <TableRow className="bg-muted/30 hover:bg-muted/30">
          <TableCell colSpan={8} className="p-0">
            <CollapsibleContent forceMount>
              <div className="p-4 space-y-4">
                {uni.programs?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5" /> {l.programs} ({uni.programs.length})
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {uni.programs.map((p) => {
                        const req = p.admission_requirements?.[0];
                        return (
                          <div key={p.program_id} className="bg-card border border-border rounded-lg p-3 text-xs space-y-1">
                            <p className="font-medium text-foreground">{p.program_name}</p>
                            <div className="flex flex-wrap gap-1.5">
                              <Badge variant="outline" className="text-[10px] capitalize">{p.degree_level}</Badge>
                              {p.duration_years && <Badge variant="outline" className="text-[10px]">{p.duration_years}yr</Badge>}
                              <Badge variant="outline" className="text-[10px]">{p.field_of_study}</Badge>
                            </div>
                            {req && (
                              <div className="text-muted-foreground pt-1 space-y-0.5">
                                {req.ielts_score_min && <p>IELTS: {req.ielts_score_min}+</p>}
                                {req.sat_score_min && <p>SAT: {req.sat_score_min}+</p>}
                                {req.gpa_min && <p>GPA: {req.gpa_min}+</p>}
                                {req.application_deadline && <p>Deadline: {req.application_deadline}</p>}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {uni.scholarships?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5" /> {l.scholarships}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {uni.scholarships.map((s) => (
                        <div key={s.scholarship_id} className="bg-card border border-border rounded-lg p-3 text-xs space-y-1">
                          <p className="font-medium text-foreground">{s.scholarship_name}</p>
                          <Badge variant="outline" className={s.coverage_type === "full_ride" ? "border-accent text-accent text-[10px]" : "text-[10px]"}>
                            {s.coverage_type.replace("_", " ")}
                          </Badge>
                          {s.stipend_amount && <p className="text-muted-foreground">${s.stipend_amount.toLocaleString()} stipend</p>}
                          {s.eligibility_requirements && <p className="text-muted-foreground">{s.eligibility_requirements}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {uni.language_of_instruction && <span>🗣 {uni.language_of_instruction}</span>}
                  {uni.cost_of_living_index && <span>💰 Cost of living index: {uni.cost_of_living_index}</span>}
                  {uni.gap_year_accepted && <span>📅 {l.gapYear}</span>}
                </div>
              </div>
            </CollapsibleContent>
          </TableCell>
        </TableRow>
      )}
    </Collapsible>
  );
};

const PAGE_SIZES = [25, 50, 100];

export const UniversityTable = ({ universities, language }: UniversityTableProps) => {
  const l = labels[language];
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(0);
  };

  const sorted = useMemo(() => {
    const arr = [...universities];
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      switch (sortKey) {
        case "name": return dir * a.university_name.localeCompare(b.university_name);
        case "country": return dir * (`${a.country}${a.city}`).localeCompare(`${b.country}${b.city}`);
        case "tuition": return dir * ((a.tuition_usd_per_year ?? 999999) - (b.tuition_usd_per_year ?? 999999));
        case "ielts": {
          const ai = getIeltsRange(a)?.min ?? 99;
          const bi = getIeltsRange(b)?.min ?? 99;
          return dir * (ai - bi);
        }
        case "admit": {
          const aa = getAdmitRate(a) ?? 999;
          const ba = getAdmitRate(b) ?? 999;
          return dir * (aa - ba);
        }
        case "visa": {
          const av = getVisaDifficulty(a)?.value ?? 99;
          const bv = getVisaDifficulty(b)?.value ?? 99;
          return dir * (av - bv);
        }
        case "scholarships": return dir * ((a.scholarships?.length ?? 0) - (b.scholarships?.length ?? 0));
        default: return 0;
      }
    });
    return arr;
  }, [universities, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paginated = sorted.slice(page * pageSize, (page + 1) * pageSize);

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronDown className="h-3 w-3 text-muted-foreground/40 ml-1 inline" />;
    return sortDir === "asc"
      ? <ChevronUp className="h-3 w-3 text-accent ml-1 inline" />
      : <ChevronDown className="h-3 w-3 text-accent ml-1 inline" />;
  };

  const SortableHead = ({ col, children, className }: { col: SortKey; children: React.ReactNode; className?: string }) => (
    <TableHead className={`cursor-pointer select-none hover:text-foreground transition-colors ${className || ""}`} onClick={() => handleSort(col)}>
      {children}<SortIcon col={col} />
    </TableHead>
  );

  if (universities.length === 0) {
    return (
      <div className="text-center py-20">
        <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-heading font-semibold text-foreground mb-2">{l.noResults}</h3>
        <p className="text-muted-foreground text-sm">{l.noResultsSub}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Pagination top */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {l.showing} <strong className="text-foreground">{page * pageSize + 1}–{Math.min((page + 1) * pageSize, sorted.length)}</strong> {l.of} <strong className="text-foreground">{sorted.length}</strong>
        </span>
        <div className="flex items-center gap-2">
          {PAGE_SIZES.map(size => (
            <button
              key={size}
              onClick={() => { setPageSize(size); setPage(0); }}
              className={`px-2 py-1 rounded text-xs transition-colors ${pageSize === size ? "bg-accent text-accent-foreground" : "hover:bg-muted"}`}
            >
              {size}
            </button>
          ))}
          <span className="text-xs">{l.perPage}</span>
        </div>
      </div>

      <div className="border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <SortableHead col="name" className="min-w-[200px]">{l.university}</SortableHead>
                <SortableHead col="country">{l.location}</SortableHead>
                <SortableHead col="tuition">{l.tuition}</SortableHead>
                <SortableHead col="ielts">{l.ielts}</SortableHead>
                <SortableHead col="admit">{l.admitRate}</SortableHead>
                <SortableHead col="visa">{l.visa}</SortableHead>
                <TableHead className="text-center">{l.foundation}</TableHead>
                <SortableHead col="scholarships">{l.scholarships}</SortableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((uni) => (
                <ExpandableRow key={uni.university_id} uni={uni} language={language} />
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination bottom */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 0} onClick={() => setPage(0)}>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            let pageNum: number;
            if (totalPages <= 7) pageNum = i;
            else if (page < 3) pageNum = i;
            else if (page > totalPages - 4) pageNum = totalPages - 7 + i;
            else pageNum = page - 3 + i;
            return (
              <Button
                key={pageNum}
                variant={page === pageNum ? "default" : "outline"}
                size="icon"
                className="h-8 w-8 text-xs"
                onClick={() => setPage(pageNum)}
              >
                {pageNum + 1}
              </Button>
            );
          })}
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === totalPages - 1} onClick={() => setPage(p => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === totalPages - 1} onClick={() => setPage(totalPages - 1)}>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
