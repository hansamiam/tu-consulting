import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { X, DollarSign, GraduationCap, Plane, Briefcase, Home, Users, Shield, Star } from "lucide-react";
import { UniversityResult } from "./types";

interface CompareDrawerProps {
  open: boolean;
  onClose: () => void;
  universities: UniversityResult[];
  onRemove: (id: string) => void;
  language: "en" | "ru";
}

const getAvgAdmitRate = (uni: UniversityResult) => {
  const rates = uni.programs?.flatMap(p => p.applications?.map(a => a.acceptance_rate) ?? []).filter((r): r is number => r != null);
  return rates?.length ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length) : null;
};

const getMinIelts = (uni: UniversityResult) => {
  const scores = uni.programs?.flatMap(p => p.admission_requirements?.map(a => a.ielts_score_min) ?? []).filter((s): s is number => s != null);
  return scores?.length ? Math.min(...scores) : null;
};

const getAvgVisa = (uni: UniversityResult) => {
  const scores = uni.programs?.flatMap(p => p.applications?.map(a => a.visa_difficulty_score) ?? []).filter((s): s is number => s != null);
  return scores?.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
};

const t = {
  en: {
    title: "Compare Universities",
    tuition: "Tuition/yr", ielts: "Min IELTS", admitRate: "Avg Admit Rate",
    visa: "Visa Difficulty", programs: "Programs", scholarships: "Scholarships",
    employment: "Employment Rate", salary: "Avg Starting Salary", housing: "Housing/mo",
    intlStudents: "Int'l Students", safety: "Campus Safety", satisfaction: "Satisfaction",
    postGrad: "Post-Grad Visa", language: "Language", costOfLiving: "Cost of Living Index",
    foundation: "Foundation Year", gapYear: "Gap Year", clubs: "Student Clubs",
    na: "N/A", free: "Free", yes: "Yes", no: "No",
    remove: "Remove",
  },
  ru: {
    title: "Сравнение университетов",
    tuition: "Стоимость/год", ielts: "Мин. IELTS", admitRate: "Ср. приём",
    visa: "Сложность визы", programs: "Программы", scholarships: "Стипендии",
    employment: "Трудоустройство", salary: "Ср. зарплата", housing: "Жильё/мес",
    intlStudents: "Иностр. студенты", safety: "Безопасность", satisfaction: "Удовлетворённость",
    postGrad: "Виза после учёбы", language: "Язык", costOfLiving: "Стоимость жизни",
    foundation: "Подг. год", gapYear: "Gap year", clubs: "Клубы",
    na: "Н/Д", free: "Бесплатно", yes: "Да", no: "Нет",
    remove: "Убрать",
  },
};

type RowDef = { label: string; render: (uni: UniversityResult) => React.ReactNode };

export const CompareDrawer = ({ open, onClose, universities, onRemove, language }: CompareDrawerProps) => {
  const l = t[language];

  const rows: RowDef[] = [
    { label: l.tuition, render: (u) => u.tuition_usd_per_year != null ? (u.tuition_usd_per_year === 0 ? <span className="text-green-600 font-bold">{l.free}</span> : <span className="font-semibold">${u.tuition_usd_per_year.toLocaleString()}</span>) : l.na },
    { label: l.ielts, render: (u) => { const s = getMinIelts(u); return s != null ? <span className="font-semibold">{s}+</span> : l.na; } },
    { label: l.admitRate, render: (u) => { const r = getAvgAdmitRate(u); return r != null ? <span className={`font-semibold ${r < 15 ? "text-destructive" : r < 40 ? "text-accent" : "text-green-600"}`}>{r}%</span> : l.na; } },
    { label: l.visa, render: (u) => { const v = getAvgVisa(u); const labels = ["Easy", "Moderate", "Hard", "Very Hard", "Extreme"]; return v != null ? <Badge variant="outline" className={`text-xs ${v <= 2 ? "border-green-500 text-green-600" : "border-destructive text-destructive"}`}>{labels[v - 1]}</Badge> : l.na; } },
    { label: l.programs, render: (u) => <span className="font-semibold">{u.programs?.length || 0}</span> },
    { label: l.scholarships, render: (u) => { const full = u.scholarships?.filter(s => s.coverage_type === "full_ride").length || 0; return <span className="font-semibold">{u.scholarships?.length || 0} {full > 0 && <span className="text-accent">({full} full)</span>}</span>; } },
    { label: l.employment, render: (u) => { const i = u.university_insights?.[0]; return i?.employment_rate_6months != null ? <div className="space-y-1"><span className={`font-semibold ${i.employment_rate_6months > 85 ? "text-green-600" : ""}`}>{i.employment_rate_6months}%</span><Progress value={i.employment_rate_6months} className="h-1" /></div> : l.na; } },
    { label: l.salary, render: (u) => { const i = u.university_insights?.[0]; return i?.average_starting_salary_usd ? <span className="font-semibold">${i.average_starting_salary_usd.toLocaleString()}</span> : l.na; } },
    { label: l.housing, render: (u) => { const i = u.university_insights?.[0]; return i?.housing_cost_monthly_usd ? <span className="font-semibold">${i.housing_cost_monthly_usd.toLocaleString()}</span> : l.na; } },
    { label: l.intlStudents, render: (u) => { const i = u.university_insights?.[0]; return i?.international_student_percent != null ? <span className="font-semibold">{i.international_student_percent}%</span> : l.na; } },
    { label: l.safety, render: (u) => { const i = u.university_insights?.[0]; return i?.campus_safety_score != null ? <div className="space-y-1"><span className="font-semibold">{i.campus_safety_score}/5</span><Progress value={(i.campus_safety_score / 5) * 100} className="h-1" /></div> : l.na; } },
    { label: l.satisfaction, render: (u) => { const i = u.university_insights?.[0]; return i?.student_satisfaction_score != null ? <div className="space-y-1"><span className="font-semibold">{i.student_satisfaction_score}/5</span><Progress value={(i.student_satisfaction_score / 5) * 100} className="h-1" /></div> : l.na; } },
    { label: l.postGrad, render: (u) => { const i = u.university_insights?.[0]; return i?.post_grad_work_visa ? <span className="text-xs leading-tight">{i.post_grad_work_visa}</span> : l.na; } },
    { label: l.language, render: (u) => u.language_of_instruction || l.na },
    { label: l.costOfLiving, render: (u) => u.cost_of_living_index != null ? <span className="font-semibold">{u.cost_of_living_index}</span> : l.na },
    { label: l.foundation, render: (u) => u.foundation_year_available ? <Badge variant="outline" className="text-xs border-accent text-accent">{l.yes}</Badge> : <span className="text-muted-foreground">{l.no}</span> },
    { label: l.clubs, render: (u) => { const i = u.university_insights?.[0]; return i?.student_clubs_count ? <span className="font-semibold">{i.student_clubs_count}+</span> : l.na; } },
  ];

  return (
    <Sheet open={open} onOpenChange={() => onClose()}>
      <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-lg font-heading">{l.title}</SheetTitle>
        </SheetHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-3 text-xs text-muted-foreground font-medium w-[160px] sticky left-0 bg-background z-10"></th>
                {universities.map(u => (
                  <th key={u.university_id} className="py-3 px-4 min-w-[200px]">
                    <div className="text-left space-y-1">
                      <p className="font-semibold text-foreground text-sm">{u.university_name}</p>
                      <p className="text-xs text-muted-foreground font-normal">{u.city}, {u.country}</p>
                      <Button variant="ghost" size="sm" className="h-6 text-xs text-destructive hover:text-destructive px-2 -ml-2" onClick={() => onRemove(u.university_id)}>
                        <X className="h-3 w-3 mr-1" /> {l.remove}
                      </Button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? "bg-muted/30" : ""}>
                  <td className="py-2.5 px-3 text-xs font-medium text-muted-foreground sticky left-0 bg-inherit z-10">{row.label}</td>
                  {universities.map(u => (
                    <td key={u.university_id} className="py-2.5 px-4">{row.render(u)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SheetContent>
    </Sheet>
  );
};
