import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  ExternalLink, ChevronDown, ChevronUp, GraduationCap, BookOpen, Shield,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Mail, Phone, Linkedin, MessageCircle, Send, Clock, User, Building2,
  Briefcase, DollarSign, Star, Users, Home, FlaskConical, Lightbulb,
  AlertTriangle, Plane, TrendingUp, Heart
} from "lucide-react";
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
    contacts: "Contacts", insights: "Insights & Stats", applicationTips: "Application Tips",
  },
  ru: {
    university: "Университет", location: "Город", tuition: "Стоимость/год",
    ielts: "IELTS", scholarships: "Стипендии", programs: "Программы",
    foundation: "Подг. год", noResults: "Университеты не найдены",
    noResultsSub: "Попробуйте изменить параметры поиска.", admitRate: "Приём",
    visa: "Виза", yes: "Да", no: "Нет", na: "Н/Д", gapYear: "Gap year",
    showing: "Показано", of: "из", perPage: "на стр.",
    contacts: "Контакты", insights: "Данные и статистика", applicationTips: "Советы по поступлению",
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

const ScoreBar = ({ value, max = 5, label, color = "accent" }: { value: number; max?: number; label: string; color?: string }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground">{value}/{max}</span>
    </div>
    <Progress value={(value / max) * 100} className="h-1.5" />
  </div>
);

const ContactCard = ({ contact }: { contact: UniversityResult["university_contacts"][0] }) => (
  <div className="bg-card border border-border rounded-lg p-4 space-y-3">
    <div className="flex items-start gap-3">
      <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
        <User className="h-5 w-5 text-accent" />
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-sm text-foreground">{contact.contact_name}</p>
        <p className="text-xs text-muted-foreground">{contact.contact_title}</p>
        <Badge variant="outline" className="text-[10px] mt-1 capitalize">
          {contact.contact_type?.replace(/_/g, " ")}
        </Badge>
      </div>
    </div>
    <div className="space-y-1.5 text-xs">
      {contact.email && (
        <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-accent hover:underline">
          <Mail className="h-3.5 w-3.5" /> {contact.email}
        </a>
      )}
      {contact.phone && (
        <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <Phone className="h-3.5 w-3.5" /> {contact.phone}
        </a>
      )}
      {contact.linkedin_url && (
        <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-500 hover:underline">
          <Linkedin className="h-3.5 w-3.5" /> LinkedIn Profile
        </a>
      )}
      {contact.whatsapp && (
        <a href={`https://wa.me/${contact.whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-green-600 hover:underline">
          <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
        </a>
      )}
      {contact.telegram && (
        <a href={`https://t.me/${contact.telegram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-400 hover:underline">
          <Send className="h-3.5 w-3.5" /> Telegram
        </a>
      )}
    </div>
    <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground pt-1 border-t border-border">
      {contact.office_hours && (
        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {contact.office_hours}</span>
      )}
      {contact.response_time && (
        <span className="flex items-center gap-1">⚡ Responds: {contact.response_time}</span>
      )}
    </div>
  </div>
);

const ExpandableRow = ({ uni, language }: { uni: UniversityResult; language: "en" | "ru" }) => {
  const [open, setOpen] = useState(false);
  const l = labels[language];
  const ielts = getIeltsRange(uni);
  const admit = getAdmitRate(uni);
  const visa = getVisaDifficulty(uni);
  const hasIeltsOptional = uni.programs?.some((p) => p.admission_requirements?.some((a) => !a.ielts_required));
  const insight = uni.university_insights?.[0];
  const contacts = uni.university_contacts || [];
  const hasContacts = contacts.length > 0;
  const hasInsight = !!insight;

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
              {hasContacts && <Mail className="h-3 w-3 text-accent ml-1.5 inline" />}
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
        <TableRow className="bg-muted/20 hover:bg-muted/20">
          <TableCell colSpan={8} className="p-0">
            <CollapsibleContent forceMount>
              <div className="p-4">
                <Tabs defaultValue="programs" className="w-full">
                  <TabsList className="mb-4 bg-muted/50">
                    <TabsTrigger value="programs" className="text-xs gap-1.5">
                      <BookOpen className="h-3.5 w-3.5" /> {l.programs} ({uni.programs?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="scholarships" className="text-xs gap-1.5">
                      <Shield className="h-3.5 w-3.5" /> {l.scholarships} ({uni.scholarships?.length || 0})
                    </TabsTrigger>
                    {hasContacts && (
                      <TabsTrigger value="contacts" className="text-xs gap-1.5">
                        <Building2 className="h-3.5 w-3.5" /> {l.contacts} ({contacts.length})
                      </TabsTrigger>
                    )}
                    {hasInsight && (
                      <TabsTrigger value="insights" className="text-xs gap-1.5">
                        <TrendingUp className="h-3.5 w-3.5" /> {l.insights}
                      </TabsTrigger>
                    )}
                    {hasInsight && (insight?.application_tips || insight?.common_mistakes) && (
                      <TabsTrigger value="tips" className="text-xs gap-1.5">
                        <Lightbulb className="h-3.5 w-3.5" /> {l.applicationTips}
                      </TabsTrigger>
                    )}
                  </TabsList>

                  {/* Programs Tab */}
                  <TabsContent value="programs">
                    {uni.programs?.length > 0 ? (
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
                    ) : (
                      <p className="text-sm text-muted-foreground">No programs listed yet.</p>
                    )}
                  </TabsContent>

                  {/* Scholarships Tab */}
                  <TabsContent value="scholarships">
                    {uni.scholarships?.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {uni.scholarships.map((s) => (
                          <div key={s.scholarship_id} className="bg-card border border-border rounded-lg p-3 text-xs space-y-1">
                            <p className="font-medium text-foreground">{s.scholarship_name}</p>
                            <Badge variant="outline" className={s.coverage_type === "full_ride" ? "border-accent text-accent text-[10px]" : "text-[10px]"}>
                              {s.coverage_type.replace("_", " ")}
                            </Badge>
                            {s.stipend_amount && <p className="text-muted-foreground">${s.stipend_amount.toLocaleString()} stipend</p>}
                            {s.eligibility_requirements && <p className="text-muted-foreground">{s.eligibility_requirements}</p>}
                            {s.application_deadline && <p className="text-muted-foreground">Deadline: {s.application_deadline}</p>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No scholarships listed yet.</p>
                    )}
                  </TabsContent>

                  {/* Contacts Tab */}
                  {hasContacts && (
                    <TabsContent value="contacts">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {contacts.map((c) => (
                          <ContactCard key={c.contact_id} contact={c} />
                        ))}
                      </div>
                    </TabsContent>
                  )}

                  {/* Insights Tab */}
                  {hasInsight && (
                    <TabsContent value="insights">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Career Outcomes */}
                        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <Briefcase className="h-3.5 w-3.5" /> Career Outcomes
                          </h4>
                          {insight.employment_rate_6months != null && (
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Employment (6 months)</span>
                                <span className={`font-bold ${insight.employment_rate_6months > 85 ? "text-green-600" : "text-foreground"}`}>
                                  {insight.employment_rate_6months}%
                                </span>
                              </div>
                              <Progress value={insight.employment_rate_6months} className="h-1.5" />
                            </div>
                          )}
                          {insight.average_starting_salary_usd != null && (
                            <div className="flex items-center gap-2 text-xs">
                              <DollarSign className="h-3.5 w-3.5 text-green-600" />
                              <span className="text-muted-foreground">Avg. Starting Salary:</span>
                              <span className="font-semibold text-foreground">${insight.average_starting_salary_usd.toLocaleString()}</span>
                            </div>
                          )}
                          {insight.industry_partnerships && (
                            <div className="text-xs">
                              <span className="text-muted-foreground">Industry Partners: </span>
                              <span className="text-foreground">{insight.industry_partnerships}</span>
                            </div>
                          )}
                          {insight.internship_opportunities && (
                            <div className="text-xs">
                              <span className="text-muted-foreground">Internships: </span>
                              <span className="text-foreground">{insight.internship_opportunities}</span>
                            </div>
                          )}
                        </div>

                        {/* Student Life */}
                        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <Heart className="h-3.5 w-3.5" /> Student Life
                          </h4>
                          {insight.student_satisfaction_score != null && (
                            <ScoreBar value={insight.student_satisfaction_score} label="Student Satisfaction" />
                          )}
                          {insight.campus_safety_score != null && (
                            <ScoreBar value={insight.campus_safety_score} label="Campus Safety" />
                          )}
                          {insight.international_student_percent != null && (
                            <div className="flex items-center gap-2 text-xs">
                              <Users className="h-3.5 w-3.5 text-accent" />
                              <span className="text-muted-foreground">International Students:</span>
                              <span className="font-semibold text-foreground">{insight.international_student_percent}%</span>
                            </div>
                          )}
                          {insight.student_clubs_count != null && (
                            <div className="flex items-center gap-2 text-xs">
                              <Star className="h-3.5 w-3.5 text-accent" />
                              <span className="text-muted-foreground">Student Clubs:</span>
                              <span className="font-semibold text-foreground">{insight.student_clubs_count}+</span>
                            </div>
                          )}
                          {insight.housing_cost_monthly_usd != null && (
                            <div className="flex items-center gap-2 text-xs">
                              <Home className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-muted-foreground">Housing:</span>
                              <span className="font-semibold text-foreground">${insight.housing_cost_monthly_usd}/mo</span>
                            </div>
                          )}
                        </div>

                        {/* Academic & Alumni */}
                        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <GraduationCap className="h-3.5 w-3.5" /> Academic & Alumni
                          </h4>
                          {insight.research_output_score != null && (
                            <ScoreBar value={insight.research_output_score} label="Research Output" />
                          )}
                          {insight.alumni_network_strength && (
                            <div className="flex items-center gap-2 text-xs">
                              <Users className="h-3.5 w-3.5 text-accent" />
                              <span className="text-muted-foreground">Alumni Network:</span>
                              <Badge variant="outline" className="text-[10px]">{insight.alumni_network_strength}</Badge>
                            </div>
                          )}
                          {insight.notable_alumni && (
                            <div className="text-xs">
                              <span className="text-muted-foreground">Notable Alumni: </span>
                              <span className="text-foreground">{insight.notable_alumni}</span>
                            </div>
                          )}
                          {insight.post_grad_work_visa && (
                            <div className="text-xs mt-2 p-2 bg-muted/50 rounded">
                              <span className="flex items-center gap-1 text-muted-foreground font-medium mb-1">
                                <Plane className="h-3 w-3" /> Post-Grad Work Visa
                              </span>
                              <span className="text-foreground">{insight.post_grad_work_visa}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </TabsContent>
                  )}

                  {/* Application Tips Tab */}
                  {hasInsight && (insight?.application_tips || insight?.common_mistakes) && (
                    <TabsContent value="tips">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {insight.application_tips && (
                          <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4 space-y-2">
                            <h4 className="text-sm font-semibold text-green-700 dark:text-green-400 flex items-center gap-2">
                              <Lightbulb className="h-4 w-4" /> Pro Tips
                            </h4>
                            <p className="text-xs text-green-800 dark:text-green-300 leading-relaxed">{insight.application_tips}</p>
                          </div>
                        )}
                        {insight.common_mistakes && (
                          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-4 space-y-2">
                            <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4" /> Common Mistakes to Avoid
                            </h4>
                            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">{insight.common_mistakes}</p>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  )}
                </Tabs>

                {/* Quick info bar */}
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-4 pt-3 border-t border-border">
                  {uni.language_of_instruction && <span>🗣 {uni.language_of_instruction}</span>}
                  {uni.cost_of_living_index && <span>💰 Cost of living index: {uni.cost_of_living_index}</span>}
                  {uni.gap_year_accepted && <span>📅 {l.gapYear}</span>}
                  {hasContacts && <span className="text-accent font-medium">📧 {contacts.length} contact{contacts.length > 1 ? "s" : ""} available</span>}
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
      {/* Stats bar */}
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

      {/* Pagination */}
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
