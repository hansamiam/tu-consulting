import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ExternalLink, ChevronDown, GraduationCap, DollarSign, BookOpen, Shield } from "lucide-react";
import { useState } from "react";
import { UniversityResult } from "./types";

interface UniversityTableProps {
  universities: UniversityResult[];
  language: "en" | "ru";
}

const t = {
  en: {
    university: "University",
    location: "Location",
    tuition: "Tuition/yr",
    ielts: "IELTS",
    scholarships: "Scholarships",
    programs: "Programs",
    foundation: "Foundation",
    noResults: "No universities found",
    noResultsSub: "Try adjusting your search or filters.",
    details: "Details",
    admitRate: "Admit",
    visa: "Visa",
    yes: "Yes",
    no: "No",
    na: "N/A",
    gapYear: "Gap year OK",
  },
  ru: {
    university: "Университет",
    location: "Город",
    tuition: "Стоимость/год",
    ielts: "IELTS",
    scholarships: "Стипендии",
    programs: "Программы",
    foundation: "Подг. год",
    noResults: "Университеты не найдены",
    noResultsSub: "Попробуйте изменить параметры поиска.",
    details: "Подробнее",
    admitRate: "Приём",
    visa: "Виза",
    yes: "Да",
    no: "Нет",
    na: "Н/Д",
    gapYear: "Gap year",
  },
};

const getIeltsRange = (uni: UniversityResult) => {
  const scores = uni.programs
    ?.flatMap((p) => p.admission_requirements?.map((a) => a.ielts_score_min) ?? [])
    .filter((s): s is number => s != null);
  if (!scores || scores.length === 0) return null;
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  return min === max ? `${min}` : `${min}–${max}`;
};

const getAdmitRate = (uni: UniversityResult) => {
  const rates = uni.programs
    ?.flatMap((p) => p.applications?.map((a) => a.acceptance_rate) ?? [])
    .filter((r): r is number => r != null);
  if (!rates || rates.length === 0) return null;
  const avg = Math.round(rates.reduce((a, b) => a + b, 0) / rates.length);
  return `${avg}%`;
};

const getVisaDifficulty = (uni: UniversityResult) => {
  const scores = uni.programs
    ?.flatMap((p) => p.applications?.map((a) => a.visa_difficulty_score) ?? [])
    .filter((s): s is number => s != null);
  if (!scores || scores.length === 0) return null;
  const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const labels = ["Easy", "Moderate", "Hard", "Very Hard", "Extreme"];
  return labels[avg - 1] || `${avg}/5`;
};

const ExpandableRow = ({ uni, language }: { uni: UniversityResult; language: "en" | "ru" }) => {
  const [open, setOpen] = useState(false);
  const l = t[language];
  const ieltsRange = getIeltsRange(uni);
  const admitRate = getAdmitRate(uni);
  const visaDiff = getVisaDifficulty(uni);
  const hasIeltsOptional = uni.programs?.some((p) => p.admission_requirements?.some((a) => !a.ielts_required));

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <TableRow className="cursor-pointer group" onClick={() => setOpen(!open)}>
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
            <span className="text-foreground">${uni.tuition_usd_per_year.toLocaleString()}</span>
          ) : (
            <span className="text-muted-foreground">{l.na}</span>
          )}
        </TableCell>
        <TableCell className="text-sm whitespace-nowrap">
          {ieltsRange ? (
            <span className="text-foreground">{ieltsRange}</span>
          ) : hasIeltsOptional ? (
            <Badge variant="outline" className="text-xs border-accent text-accent">Optional</Badge>
          ) : (
            <span className="text-muted-foreground">{l.na}</span>
          )}
        </TableCell>
        <TableCell className="text-sm whitespace-nowrap">
          {admitRate ?? <span className="text-muted-foreground">{l.na}</span>}
        </TableCell>
        <TableCell className="text-sm whitespace-nowrap">
          {visaDiff ?? <span className="text-muted-foreground">{l.na}</span>}
        </TableCell>
        <TableCell className="text-sm text-center whitespace-nowrap">
          {uni.foundation_year_available ? (
            <Badge variant="outline" className="text-xs border-accent text-accent">{l.yes}</Badge>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          )}
        </TableCell>
        <TableCell className="text-sm whitespace-nowrap">
          {uni.scholarships?.length ? (
            <Badge variant="secondary" className="text-xs">{uni.scholarships.length}</Badge>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>
      </TableRow>

      {open && (
        <TableRow className="bg-muted/30 hover:bg-muted/30">
          <TableCell colSpan={8} className="p-0">
            <CollapsibleContent forceMount>
              <div className="p-4 space-y-4">
                {/* Programs */}
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

                {/* Scholarships */}
                {uni.scholarships?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5" /> {l.scholarships}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {uni.scholarships.map((s) => (
                        <div key={s.scholarship_id} className="bg-card border border-border rounded-lg p-3 text-xs space-y-1">
                          <p className="font-medium text-foreground">{s.scholarship_name}</p>
                          <Badge
                            variant="outline"
                            className={s.coverage_type === "full_ride" ? "border-accent text-accent text-[10px]" : "text-[10px]"}
                          >
                            {s.coverage_type.replace("_", " ")}
                          </Badge>
                          {s.stipend_amount && <p className="text-muted-foreground">${s.stipend_amount.toLocaleString()} stipend</p>}
                          {s.eligibility_requirements && <p className="text-muted-foreground">{s.eligibility_requirements}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Extra info */}
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

export const UniversityTable = ({ universities, language }: UniversityTableProps) => {
  const l = t[language];

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
    <div className="border border-border rounded-xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="min-w-[200px]">{l.university}</TableHead>
            <TableHead>{l.location}</TableHead>
            <TableHead>{l.tuition}</TableHead>
            <TableHead>{l.ielts}</TableHead>
            <TableHead>{l.admitRate}</TableHead>
            <TableHead>{l.visa}</TableHead>
            <TableHead className="text-center">{l.foundation}</TableHead>
            <TableHead>{l.scholarships}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {universities.map((uni) => (
            <ExpandableRow key={uni.university_id} uni={uni} language={language} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
