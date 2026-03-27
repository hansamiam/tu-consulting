import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle, Calendar, ArrowRight } from "lucide-react";
import { UniversityResult } from "./types";

interface Props {
  universities: UniversityResult[];
  language: "en" | "ru";
}

interface DeadlineItem {
  universityName: string;
  programName: string;
  deadline: string;
  daysLeft: number;
  scholarshipDeadline?: boolean;
  scholarshipName?: string;
}

export const DeadlineTracker = ({ universities, language }: Props) => {
  const deadlines = useMemo(() => {
    const items: DeadlineItem[] = [];
    const now = new Date();

    universities.forEach(uni => {
      // Program deadlines
      uni.programs?.forEach(p => {
        p.admission_requirements?.forEach(req => {
          if (req.application_deadline) {
            const date = new Date(req.application_deadline);
            const daysLeft = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            if (daysLeft > -30) {
              items.push({
                universityName: uni.university_name,
                programName: p.program_name,
                deadline: req.application_deadline,
                daysLeft,
              });
            }
          }
        });
      });

      // Scholarship deadlines
      uni.scholarships?.forEach(s => {
        if (s.application_deadline) {
          const date = new Date(s.application_deadline);
          const daysLeft = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (daysLeft > -30) {
            items.push({
              universityName: uni.university_name,
              programName: "",
              deadline: s.application_deadline,
              daysLeft,
              scholarshipDeadline: true,
              scholarshipName: s.scholarship_name,
            });
          }
        }
      });
    });

    return items.sort((a, b) => a.daysLeft - b.daysLeft);
  }, [universities]);

  const upcoming = deadlines.filter(d => d.daysLeft >= 0);
  const urgent = upcoming.filter(d => d.daysLeft <= 30);

  if (deadlines.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="text-sm font-heading font-semibold flex items-center gap-2">
          <Clock className="h-4 w-4 text-accent" />
          Application Deadline Tracker
        </h3>
        <div className="flex gap-2">
          {urgent.length > 0 && (
            <Badge variant="destructive" className="text-xs gap-1">
              <AlertTriangle className="h-3 w-3" /> {urgent.length} urgent
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">
            {upcoming.length} upcoming
          </Badge>
        </div>
      </div>

      <div className="max-h-[300px] overflow-y-auto divide-y divide-border">
        {upcoming.slice(0, 20).map((d, i) => (
          <div key={i} className={`flex items-center gap-3 px-4 py-3 text-xs ${d.daysLeft <= 7 ? "bg-destructive/5" : d.daysLeft <= 30 ? "bg-accent/5" : ""}`}>
            <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
              d.daysLeft <= 7 ? "bg-destructive/10 text-destructive" :
              d.daysLeft <= 30 ? "bg-accent/10 text-accent" :
              "bg-muted text-muted-foreground"
            }`}>
              {d.scholarshipDeadline ? "🎓" : <Calendar className="h-4 w-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground truncate">{d.universityName}</p>
              <p className="text-muted-foreground truncate">
                {d.scholarshipDeadline ? `💰 ${d.scholarshipName}` : d.programName}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-muted-foreground">{new Date(d.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
              <p className={`font-bold ${
                d.daysLeft <= 7 ? "text-destructive" :
                d.daysLeft <= 30 ? "text-accent" :
                "text-foreground"
              }`}>
                {d.daysLeft === 0 ? "TODAY" : d.daysLeft === 1 ? "Tomorrow" : `${d.daysLeft}d left`}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
