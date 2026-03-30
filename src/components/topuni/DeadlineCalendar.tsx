import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar, Clock, AlertTriangle, CheckCircle2, ArrowRight,
  Bell, Filter,
} from "lucide-react";

interface DeadlineCalendarProps {
  profile: {
    targetCountries: string[];
    timeline: string;
  };
  language: "en" | "ru";
}

interface Deadline {
  university: string;
  program: string;
  country: string;
  date: string;
  type: "application" | "scholarship" | "test" | "visa";
  priority: "high" | "medium" | "low";
  notes: string;
}

const DeadlineCalendar = ({ profile, language }: DeadlineCalendarProps) => {
  const isRu = language === "ru";
  const t = (en: string, ru: string) => isRu ? ru : en;
  const [filterType, setFilterType] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");

  const deadlines = useMemo<Deadline[]>(() => {
    const all: Deadline[] = [
      { university: "MIT", program: "Early Action", country: "United States", date: "2026-11-01", type: "application", priority: "high", notes: "Single-choice early action" },
      { university: "University of Oxford", program: "UCAS Deadline", country: "United Kingdom", date: "2026-10-15", type: "application", priority: "high", notes: "All Oxbridge applications due by Oct 15" },
      { university: "University of Cambridge", program: "UCAS Deadline", country: "United Kingdom", date: "2026-10-15", type: "application", priority: "high", notes: "Submit through UCAS" },
      { university: "University of Toronto", program: "Regular Admission", country: "Canada", date: "2027-01-15", type: "application", priority: "medium", notes: "Earlier is better for scholarship consideration" },
      { university: "ETH Zurich", program: "Bachelor's Application", country: "Switzerland", date: "2027-04-30", type: "application", priority: "medium", notes: "Entrance exam required" },
      { university: "Chevening Scholarship", program: "Full Scholarship", country: "United Kingdom", date: "2026-11-05", type: "scholarship", priority: "high", notes: "3 university choices required" },
      { university: "DAAD Scholarship", program: "Study Scholarship", country: "Germany", date: "2026-10-15", type: "scholarship", priority: "high", notes: "German or English proficiency required" },
      { university: "Fulbright Program", program: "Graduate Study", country: "United States", date: "2026-10-11", type: "scholarship", priority: "high", notes: "Check home country deadline" },
      { university: "Erasmus Mundus", program: "Joint Masters", country: "Europe", date: "2027-01-15", type: "scholarship", priority: "medium", notes: "Apply to specific consortia" },
      { university: "KGSP", program: "Korean Government Scholarship", country: "South Korea", date: "2027-02-28", type: "scholarship", priority: "medium", notes: "Apply through Korean embassy" },
      { university: "Türkiye Burslari", program: "Turkish Government", country: "Turkey", date: "2027-01-20", type: "scholarship", priority: "medium", notes: "Online application system" },
      { university: "IELTS", program: "Academic Test", country: "Global", date: "2026-09-15", type: "test", priority: "high", notes: "Book 6 weeks before target date. Results valid 2 years." },
      { university: "SAT", program: "General Test", country: "Global", date: "2026-10-05", type: "test", priority: "medium", notes: "Register 4 weeks before. Digital format." },
      { university: "US Student Visa", program: "F-1 Visa Application", country: "United States", date: "2027-05-01", type: "visa", priority: "high", notes: "Schedule DS-160 and interview early. Wait times vary." },
      { university: "UK Student Visa", program: "Tier 4 Visa", country: "United Kingdom", date: "2027-06-01", type: "visa", priority: "medium", notes: "CAS required from university. Apply 6 months before." },
      { university: "Schengen Visa", program: "Student Visa", country: "Europe", date: "2027-06-15", type: "visa", priority: "medium", notes: "Varies by country. Start 3 months before travel." },
    ];

    return all
      .filter(d => {
        if (profile.targetCountries.length === 0) return true;
        return profile.targetCountries.some(c => d.country.includes(c)) || d.country === "Global" || d.country === "Europe";
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [profile.targetCountries]);

  const filtered = deadlines.filter(d => {
    if (filterType !== "all" && d.type !== filterType) return false;
    if (filterPriority !== "all" && d.priority !== filterPriority) return false;
    return true;
  });

  const now = new Date();
  const getDaysLeft = (date: string) => {
    const diff = Math.ceil((new Date(date).getTime() - now.getTime()) / 86400000);
    return diff;
  };

  const typeColors = {
    application: "bg-blue-500/10 text-blue-500 border-blue-500/30",
    scholarship: "bg-accent/10 text-accent border-accent/30",
    test: "bg-purple-500/10 text-purple-500 border-purple-500/30",
    visa: "bg-amber-500/10 text-amber-500 border-amber-500/30",
  };

  const typeLabels = {
    application: t("Application", "Заявка"),
    scholarship: t("Scholarship", "Стипендия"),
    test: t("Test", "Тест"),
    visa: t("Visa", "Виза"),
  };

  const priorityIcons = {
    high: <AlertTriangle className="h-3.5 w-3.5 text-destructive" />,
    medium: <Clock className="h-3.5 w-3.5 text-amber-500" />,
    low: <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />,
  };

  // Group by month
  const grouped = filtered.reduce<Record<string, Deadline[]>>((acc, d) => {
    const month = new Date(d.date).toLocaleDateString(isRu ? "ru-RU" : "en-US", { month: "long", year: "numeric" });
    (acc[month] = acc[month] || []).push(d);
    return acc;
  }, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-accent" />
          {t("Deadline Calendar", "Календарь дедлайнов")}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{t("Never miss an important deadline", "Не пропустите важный дедлайн")}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          {(["all", "application", "scholarship", "test", "visa"] as const).map(type => (
            <Button key={type} variant={filterType === type ? "default" : "outline"} size="sm" onClick={() => setFilterType(type)} className={filterType === type ? "bg-accent text-accent-foreground" : ""}>
              {type === "all" ? t("All", "Все") : typeLabels[type]}
            </Button>
          ))}
        </div>

        {Object.entries(grouped).map(([month, items]) => (
          <div key={month} className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground sticky top-0 bg-background/95 py-1">{month}</h3>
            {items.map((d, i) => {
              const daysLeft = getDaysLeft(d.date);
              const urgent = daysLeft <= 30 && daysLeft > 0;
              const passed = daysLeft < 0;
              return (
                <Card key={i} className={`transition-all ${passed ? "opacity-40" : urgent ? "border-destructive/30" : ""}`}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="text-center shrink-0 w-12">
                      <p className="text-lg font-bold text-foreground">{new Date(d.date).getDate()}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(d.date).toLocaleDateString(isRu ? "ru-RU" : "en-US", { month: "short" })}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {priorityIcons[d.priority]}
                        <p className="text-sm font-medium text-foreground truncate">{d.university}</p>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{d.program}</p>
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5">{d.notes}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge variant="outline" className={`text-[10px] ${typeColors[d.type]}`}>{typeLabels[d.type]}</Badge>
                      {!passed && (
                        <span className={`text-xs font-mono ${daysLeft <= 14 ? "text-destructive font-bold" : daysLeft <= 60 ? "text-amber-500" : "text-muted-foreground"}`}>
                          {daysLeft}d {t("left", "ост.")}
                        </span>
                      )}
                      {passed && <span className="text-[10px] text-muted-foreground">{t("Passed", "Прошёл")}</span>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default DeadlineCalendar;
