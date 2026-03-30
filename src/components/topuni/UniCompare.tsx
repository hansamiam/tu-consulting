import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  GitCompare, Plus, X, Search, MapPin, DollarSign, Trophy,
  GraduationCap, Users, Briefcase, Home, Star,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface UniCompareProps {
  profile: {
    targetCountries: string[];
    major: string;
  };
  language: "en" | "ru";
}

interface CompareUni {
  name: string;
  country: string;
  ranking: number;
  tuition: string;
  acceptanceRate: string;
  studentPop: string;
  intlPercent: string;
  postGradEmployment: string;
  avgSalary: string;
  costOfLiving: string;
  campusLife: number; // 1-10
  research: number;
  careerSupport: number;
  scholarshipAvail: string;
  notablePrograms: string[];
}

const uniDatabase: CompareUni[] = [
  { name: "MIT", country: "United States", ranking: 1, tuition: "$57,590/yr", acceptanceRate: "3.9%", studentPop: "11,934", intlPercent: "33%", postGradEmployment: "95%", avgSalary: "$108,000", costOfLiving: "$2,500/mo", campusLife: 9, research: 10, careerSupport: 10, scholarshipAvail: "Need-blind", notablePrograms: ["CS", "Engineering", "Physics", "Economics"] },
  { name: "Stanford University", country: "United States", ranking: 2, tuition: "$56,169/yr", acceptanceRate: "3.7%", studentPop: "17,534", intlPercent: "23%", postGradEmployment: "94%", avgSalary: "$104,000", costOfLiving: "$2,800/mo", campusLife: 10, research: 10, careerSupport: 10, scholarshipAvail: "Need-blind", notablePrograms: ["CS", "Business", "Engineering", "Medicine"] },
  { name: "University of Oxford", country: "United Kingdom", ranking: 3, tuition: "£28,950/yr", acceptanceRate: "17%", studentPop: "26,015", intlPercent: "45%", postGradEmployment: "93%", avgSalary: "£45,000", costOfLiving: "£1,200/mo", campusLife: 9, research: 10, careerSupport: 9, scholarshipAvail: "Merit + need-based", notablePrograms: ["PPE", "Law", "Medicine", "English"] },
  { name: "University of Cambridge", country: "United Kingdom", ranking: 4, tuition: "£24,507/yr", acceptanceRate: "21%", studentPop: "24,450", intlPercent: "38%", postGradEmployment: "92%", avgSalary: "£42,000", costOfLiving: "£1,100/mo", campusLife: 9, research: 10, careerSupport: 9, scholarshipAvail: "Gates Cambridge + others", notablePrograms: ["Natural Sciences", "Engineering", "Mathematics", "Economics"] },
  { name: "ETH Zurich", country: "Switzerland", ranking: 7, tuition: "CHF 1,460/yr", acceptanceRate: "27%", studentPop: "24,500", intlPercent: "40%", postGradEmployment: "96%", avgSalary: "CHF 95,000", costOfLiving: "CHF 1,800/mo", campusLife: 7, research: 10, careerSupport: 8, scholarshipAvail: "Excellence Scholarship", notablePrograms: ["Engineering", "Architecture", "CS", "Physics"] },
  { name: "University of Toronto", country: "Canada", ranking: 18, tuition: "CAD $57,020/yr", acceptanceRate: "43%", studentPop: "97,000", intlPercent: "28%", postGradEmployment: "89%", avgSalary: "CAD $65,000", costOfLiving: "CAD $1,500/mo", campusLife: 8, research: 9, careerSupport: 8, scholarshipAvail: "Lester B. Pearson + merit", notablePrograms: ["Engineering", "CS", "Business", "Life Sciences"] },
  { name: "Seoul National University", country: "South Korea", ranking: 29, tuition: "₩6.5M/yr (~$5,000)", acceptanceRate: "30%", studentPop: "27,000", intlPercent: "12%", postGradEmployment: "88%", avgSalary: "₩45M (~$34,000)", costOfLiving: "$800/mo", campusLife: 8, research: 9, careerSupport: 8, scholarshipAvail: "KGSP + merit", notablePrograms: ["Engineering", "Business", "Medicine", "Korean Studies"] },
  { name: "Peking University", country: "China", ranking: 14, tuition: "¥26,000/yr (~$3,600)", acceptanceRate: "20%", studentPop: "45,000", intlPercent: "15%", postGradEmployment: "91%", avgSalary: "¥250K (~$35,000)", costOfLiving: "$600/mo", campusLife: 8, research: 9, careerSupport: 8, scholarshipAvail: "CSC + university", notablePrograms: ["Economics", "Law", "Chinese Studies", "Sciences"] },
  { name: "Technical University of Munich", country: "Germany", ranking: 30, tuition: "€0 (semester fee ~€150)", acceptanceRate: "40%", studentPop: "50,000", intlPercent: "30%", postGradEmployment: "93%", avgSalary: "€55,000", costOfLiving: "€1,000/mo", campusLife: 7, research: 9, careerSupport: 8, scholarshipAvail: "DAAD + Deutschlandstipendium", notablePrograms: ["Engineering", "CS", "Physics", "Management"] },
  { name: "Nazarbayev University", country: "Kazakhstan", ranking: 350, tuition: "$0 (scholarship)", acceptanceRate: "15%", studentPop: "6,500", intlPercent: "8%", postGradEmployment: "85%", avgSalary: "₸4M (~$8,500)", costOfLiving: "$400/mo", campusLife: 7, research: 7, careerSupport: 7, scholarshipAvail: "Full merit scholarship", notablePrograms: ["Engineering", "Economics", "Medicine", "Education"] },
];

const UniCompare = ({ profile, language }: UniCompareProps) => {
  const isRu = language === "ru";
  const t = (en: string, ru: string) => isRu ? ru : en;
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  const addUni = (name: string) => {
    if (selected.length >= 3 || selected.includes(name)) return;
    setSelected([...selected, name]);
    setSearch("");
  };

  const removeUni = (name: string) => setSelected(selected.filter(n => n !== name));

  const searchResults = search.length > 0
    ? uniDatabase.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) && !selected.includes(u.name))
    : [];

  const selectedUnis = selected.map(name => uniDatabase.find(u => u.name === name)!).filter(Boolean);

  const categories = [
    { label: t("Ranking", "Рейтинг"), key: "ranking", icon: Trophy, format: (v: any) => `#${v}` },
    { label: t("Tuition", "Стоимость"), key: "tuition", icon: DollarSign, format: (v: any) => v },
    { label: t("Acceptance Rate", "Приём"), key: "acceptanceRate", icon: GraduationCap, format: (v: any) => v },
    { label: t("Students", "Студенты"), key: "studentPop", icon: Users, format: (v: any) => v },
    { label: t("International %", "Иностр. %"), key: "intlPercent", icon: MapPin, format: (v: any) => v },
    { label: t("Employment", "Трудоустройство"), key: "postGradEmployment", icon: Briefcase, format: (v: any) => v },
    { label: t("Avg Salary", "Ср. зарплата"), key: "avgSalary", icon: DollarSign, format: (v: any) => v },
    { label: t("Living Cost", "Стоимость жизни"), key: "costOfLiving", icon: Home, format: (v: any) => v },
    { label: t("Scholarship", "Стипендия"), key: "scholarshipAvail", icon: Star, format: (v: any) => v },
  ];

  const barCategories = [
    { label: t("Campus Life", "Жизнь кампуса"), key: "campusLife" },
    { label: t("Research", "Исследования"), key: "research" },
    { label: t("Career Support", "Карьерная поддержка"), key: "careerSupport" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitCompare className="w-5 h-5 text-accent" />
          {t("Compare Universities", "Сравнить университеты")}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{t("Select up to 3 universities to compare side-by-side", "Выберите до 3 университетов для сравнения")}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search & Add */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} className="pl-9 text-sm" placeholder={t("Search universities to compare...", "Поиск университетов...")} />
          {searchResults.length > 0 && (
            <div className="absolute z-10 top-full mt-1 w-full bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {searchResults.map(u => (
                <button key={u.name} onClick={() => addUni(u.name)} className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center justify-between">
                  <span className="text-foreground">{u.name}</span>
                  <Badge variant="outline" className="text-[10px]">{u.country}</Badge>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected chips */}
        <div className="flex gap-2 flex-wrap">
          {selected.map(name => (
            <Badge key={name} className="bg-accent/15 text-accent border-accent/30 gap-1 pr-1">
              {name}
              <button onClick={() => removeUni(name)} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button>
            </Badge>
          ))}
          {selected.length < 3 && (
            <Badge variant="outline" className="text-[10px] text-muted-foreground border-dashed">
              <Plus className="h-3 w-3 mr-1" /> {t(`Add (${3 - selected.length} left)`, `Доб. (ост. ${3 - selected.length})`)}
            </Badge>
          )}
        </div>

        {/* Comparison Table */}
        {selectedUnis.length >= 2 && (
          <div className="space-y-4">
            {/* Text comparisons */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left p-2 text-muted-foreground text-xs font-normal"></th>
                    {selectedUnis.map(u => (
                      <th key={u.name} className="text-center p-2 font-semibold text-foreground text-xs">{u.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {categories.map(cat => (
                    <tr key={cat.key} className="border-t border-border">
                      <td className="p-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <cat.icon className="h-3.5 w-3.5" /> {cat.label}
                      </td>
                      {selectedUnis.map(u => (
                        <td key={u.name} className="p-2 text-center text-xs text-foreground font-medium">
                          {cat.format((u as any)[cat.key])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bar chart comparisons */}
            <div className="space-y-3">
              {barCategories.map(cat => (
                <div key={cat.key} className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">{cat.label}</p>
                  {selectedUnis.map(u => (
                    <div key={u.name} className="flex items-center gap-2">
                      <span className="text-[10px] text-foreground w-20 truncate">{u.name.split(" ")[0]}</span>
                      <Progress value={(u as any)[cat.key] * 10} className="h-2 flex-1" />
                      <span className="text-[10px] text-muted-foreground w-6">{(u as any)[cat.key]}/10</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Notable programs */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">{t("Notable Programs", "Известные программы")}</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {selectedUnis.map(u => (
                  <div key={u.name} className="space-y-1">
                    <p className="text-[10px] font-semibold text-foreground">{u.name}</p>
                    <div className="flex flex-wrap gap-1">
                      {u.notablePrograms.map(p => (
                        <Badge key={p} variant="secondary" className="text-[9px]">{p}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {selectedUnis.length < 2 && (
          <div className="text-center py-8 space-y-2">
            <GitCompare className="h-8 w-8 mx-auto text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">{t("Select at least 2 universities to compare", "Выберите минимум 2 университета")}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UniCompare;
