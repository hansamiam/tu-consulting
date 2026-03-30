import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2 } from "lucide-react";
import { UniversityResult } from "./types";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  universities: UniversityResult[];
  language: "en" | "ru";
}

interface TimelineEntry {
  date: string;
  universityName: string;
  programName: string;
  type: "deadline" | "scholarship";
  daysLeft: number;
}

const t = {
  en: {
    title: "Upcoming Deadlines",
    subtitle: "Application and scholarship deadlines from filtered universities",
    daysLeft: "days left",
    passed: "Passed",
    urgent: "Urgent",
    deadline: "Application",
    scholarship: "Scholarship",
    showAll: "Show all",
    showLess: "Show less",
    noDeadlines: "No upcoming deadlines found",
  },
  ru: {
    title: "Ближайшие дедлайны",
    subtitle: "Дедлайны заявок и стипендий из отфильтрованных университетов",
    daysLeft: "дней ост.",
    passed: "Прошёл",
    urgent: "Срочно",
    deadline: "Заявка",
    scholarship: "Стипендия",
    showAll: "Показать все",
    showLess: "Свернуть",
    noDeadlines: "Дедлайны не найдены",
  },
};

export const ApplicationTimeline = ({ universities, language }: Props) => {
  const l = t[language];
  const [expanded, setExpanded] = useState(false);
  const now = new Date();

  const entries = useMemo((): TimelineEntry[] => {
    const all: TimelineEntry[] = [];
    universities.forEach(uni => {
      uni.programs?.forEach(p => {
        p.admission_requirements?.forEach(req => {
          if (req.application_deadline) {
            const daysLeft = Math.ceil((new Date(req.application_deadline).getTime() - now.getTime()) / 86400000);
            all.push({
              date: req.application_deadline,
              universityName: uni.university_name,
              programName: p.program_name,
              type: "deadline",
              daysLeft,
            });
          }
        });
      });
      uni.scholarships?.forEach(s => {
        if (s.application_deadline) {
          const daysLeft = Math.ceil((new Date(s.application_deadline).getTime() - now.getTime()) / 86400000);
          all.push({
            date: s.application_deadline,
            universityName: uni.university_name,
            programName: s.scholarship_name,
            type: "scholarship",
            daysLeft,
          });
        }
      });
    });

    return all
      .filter(e => e.daysLeft > -30)
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [universities]);

  const visible = expanded ? entries : entries.slice(0, 6);

  if (entries.length === 0) return null;

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-accent" />
          {l.title}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{l.subtitle}</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {visible.map((entry, i) => {
          const urgent = entry.daysLeft > 0 && entry.daysLeft <= 30;
          const passed = entry.daysLeft < 0;
          return (
            <motion.div
              key={`${entry.universityName}-${entry.programName}-${entry.date}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                passed ? "opacity-40 border-border" :
                urgent ? "border-destructive/30 bg-destructive/5" :
                "border-border hover:border-accent/30"
              }`}
            >
              <div className="text-center shrink-0 w-10">
                <p className="text-sm font-bold text-foreground">{new Date(entry.date).getDate()}</p>
                <p className="text-[9px] text-muted-foreground">{new Date(entry.date).toLocaleDateString(language === "ru" ? "ru-RU" : "en-US", { month: "short" })}</p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{entry.universityName}</p>
                <p className="text-[10px] text-muted-foreground truncate">{entry.programName}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Badge variant="outline" className={`text-[9px] ${entry.type === "scholarship" ? "border-accent/30 text-accent" : "border-blue-500/30 text-blue-500"}`}>
                  {entry.type === "scholarship" ? l.scholarship : l.deadline}
                </Badge>
                {!passed && (
                  <span className={`text-[10px] font-mono ${
                    entry.daysLeft <= 14 ? "text-destructive font-bold" :
                    entry.daysLeft <= 60 ? "text-amber-500" :
                    "text-muted-foreground"
                  }`}>
                    {entry.daysLeft}d
                  </span>
                )}
                {passed && <span className="text-[10px] text-muted-foreground">{l.passed}</span>}
              </div>
            </motion.div>
          );
        })}

        {entries.length > 6 && (
          <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setExpanded(!expanded)}>
            {expanded ? l.showLess : `${l.showAll} (${entries.length})`}
            {expanded ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
