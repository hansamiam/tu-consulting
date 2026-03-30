import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Award, DollarSign, Calendar, ShieldCheck, ShieldAlert } from "lucide-react";
import { UniversityResult } from "./types";
import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  universities: UniversityResult[];
  language: "en" | "ru";
}

interface SpotlightScholarship {
  uniName: string;
  uniId: string;
  scholarship: UniversityResult["scholarships"][0];
}

const t = {
  en: {
    title: "Scholarship Spotlight",
    subtitle: "Top funding opportunities across universities",
    fullRide: "Full Ride",
    stipend: "stipend",
    deadline: "Deadline",
    eligibility: "Eligibility",
    at: "at",
  },
  ru: {
    title: "Лучшие стипендии",
    subtitle: "Топ возможности финансирования",
    fullRide: "Полное покрытие",
    stipend: "стипендия",
    deadline: "Дедлайн",
    eligibility: "Требования",
    at: "в",
  },
};

export const ScholarshipSpotlight = ({ universities, language }: Props) => {
  const l = t[language];

  const topScholarships = useMemo((): SpotlightScholarship[] => {
    const all: SpotlightScholarship[] = [];
    universities.forEach(uni => {
      uni.scholarships?.forEach(s => {
        all.push({ uniName: uni.university_name, uniId: uni.university_id, scholarship: s });
      });
    });

    return all
      .sort((a, b) => {
        if (a.scholarship.coverage_type === "full_ride" && b.scholarship.coverage_type !== "full_ride") return -1;
        if (b.scholarship.coverage_type === "full_ride" && a.scholarship.coverage_type !== "full_ride") return 1;
        return (b.scholarship.stipend_amount || 0) - (a.scholarship.stipend_amount || 0);
      })
      .slice(0, 6);
  }, [universities]);

  if (topScholarships.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-amber-500/5 via-accent/5 to-amber-500/5 border border-amber-500/20 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 p-4 border-b border-amber-500/20">
        <Award className="h-4 w-4 text-amber-500" />
        <div>
          <h3 className="text-sm font-heading font-semibold">{l.title}</h3>
          <p className="text-xs text-muted-foreground">{l.subtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
        {topScholarships.map((item, i) => (
          <motion.div
            key={item.scholarship.scholarship_id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-card border border-border rounded-lg p-4 space-y-2 hover:border-amber-500/40 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-sm text-foreground leading-tight">{item.scholarship.scholarship_name}</p>
              {item.scholarship.coverage_type === "full_ride" && (
                <Badge className="bg-amber-500 text-white text-[10px] shrink-0">{l.fullRide}</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{l.at} {item.uniName}</p>
            <div className="flex flex-wrap gap-1.5">
              {item.scholarship.stipend_amount && (
                <Badge variant="outline" className="text-[10px] gap-1">
                  <DollarSign className="h-2.5 w-2.5" />
                  ${item.scholarship.stipend_amount.toLocaleString()} {l.stipend}
                </Badge>
              )}
              <Badge variant="outline" className="text-[10px] capitalize">
                {item.scholarship.coverage_type.replace("_", " ")}
              </Badge>
            </div>
            {item.scholarship.eligibility_requirements && (
              <p className="text-[11px] text-muted-foreground line-clamp-2">
                {item.scholarship.eligibility_requirements}
              </p>
            )}
            {item.scholarship.application_deadline && (
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> {l.deadline}: {item.scholarship.application_deadline}
              </p>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};
