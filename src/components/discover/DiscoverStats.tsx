import { useMemo } from "react";
import { Globe, GraduationCap, DollarSign, Award, TrendingUp, Building2 } from "lucide-react";
import { UniversityResult } from "./types";
import { motion } from "framer-motion";

interface Props {
  universities: UniversityResult[];
  language: "en" | "ru";
}

const t = {
  en: {
    universities: "Universities",
    countries: "Countries",
    avgTuition: "Avg Tuition",
    scholarships: "Scholarships",
    programs: "Programs",
    freeUnis: "Free Tuition",
  },
  ru: {
    universities: "Университеты",
    countries: "Страны",
    avgTuition: "Ср. стоимость",
    scholarships: "Стипендии",
    programs: "Программы",
    freeUnis: "Бесплатные",
  },
};

export const DiscoverStats = ({ universities, language }: Props) => {
  const l = t[language];

  const stats = useMemo(() => {
    const countries = new Set(universities.map(u => u.country)).size;
    const tuitions = universities.map(u => u.tuition_usd_per_year).filter((t): t is number => t != null && t > 0);
    const avgTuition = tuitions.length ? Math.round(tuitions.reduce((a, b) => a + b, 0) / tuitions.length) : 0;
    const totalScholarships = universities.reduce((acc, u) => acc + (u.scholarships?.length || 0), 0);
    const totalPrograms = universities.reduce((acc, u) => acc + (u.programs?.length || 0), 0);
    const freeUnis = universities.filter(u => u.tuition_usd_per_year === 0).length;

    return [
      { icon: Building2, label: l.universities, value: universities.length, color: "text-accent" },
      { icon: Globe, label: l.countries, value: countries, color: "text-blue-500" },
      { icon: DollarSign, label: l.avgTuition, value: `$${avgTuition.toLocaleString()}`, color: "text-green-500" },
      { icon: Award, label: l.scholarships, value: totalScholarships, color: "text-amber-500" },
      { icon: GraduationCap, label: l.programs, value: totalPrograms, color: "text-purple-500" },
      { icon: TrendingUp, label: l.freeUnis, value: freeUnis, color: "text-emerald-500" },
    ];
  }, [universities, language]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="bg-card border border-border rounded-xl p-4 text-center hover:border-accent/30 transition-colors"
        >
          <stat.icon className={`h-5 w-5 mx-auto mb-2 ${stat.color}`} />
          <p className="text-xl font-heading font-bold text-foreground">{stat.value}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{stat.label}</p>
        </motion.div>
      ))}
    </div>
  );
};
