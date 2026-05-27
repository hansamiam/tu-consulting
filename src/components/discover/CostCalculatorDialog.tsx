import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calculator, DollarSign, Home, ShoppingBag, GraduationCap, TrendingDown } from "lucide-react";
import { UniversityResult } from "./types";

interface Props {
  universities: UniversityResult[];
  language: "en" | "ru";
}

const t = {
  en: {
    title: "True Cost Calculator",
    subtitle: "See the REAL cost of studying — not just tuition",
    duration: "Study Duration", years: "years",
    results: "Cost Breakdown (sorted by total cost)",
    tuition: "Tuition", housing: "Housing", living: "Living Expenses",
    total: "Total", afterScholarship: "After Scholarship",
    perYear: "/yr", forYears: "for",
    fullRide: "FULL RIDE",
    button: "Cost Calculator",
    cheapest: "Most Affordable",
  },
  ru: {
    title: "Калькулятор реальной стоимости",
    subtitle: "Узнайте РЕАЛЬНУЮ стоимость обучения",
    duration: "Срок обучения", years: "лет",
    results: "Разбивка стоимости (по возрастанию)",
    tuition: "Обучение", housing: "Жильё", living: "Расходы на жизнь",
    total: "Итого", afterScholarship: "После стипендии",
    perYear: "/год", forYears: "за",
    fullRide: "ПОЛНОЕ ПОКРЫТИЕ",
    button: "Калькулятор стоимости",
    cheapest: "Самые доступные",
  },
};

// Rough monthly living cost by cost_of_living_index (scale ~30-100)
const estimateLiving = (index: number | null) => {
  if (index == null) return 800; // default estimate
  if (index < 40) return 400;
  if (index < 55) return 600;
  if (index < 70) return 900;
  if (index < 85) return 1200;
  return 1600;
};

interface CostResult {
  uni: UniversityResult;
  tuitionTotal: number;
  housingTotal: number;
  livingTotal: number;
  grandTotal: number;
  scholarshipSavings: number;
  netCost: number;
  hasFullRide: boolean;
}

export const CostCalculatorDialog = ({ universities, language }: Props) => {
  const l = t[language];
  const [years, setYears] = useState("4");

  const results = useMemo((): CostResult[] => {
    const n = parseInt(years);
    return universities.map(uni => {
      const tuitionYearly = uni.tuition_usd_per_year || 0;
      const tuitionTotal = tuitionYearly * n;

      const insight = uni.university_insights?.[0];
      const housingMonthly = insight?.housing_cost_monthly_usd || estimateLiving(uni.cost_of_living_index) * 0.5;
      const housingTotal = housingMonthly * 12 * n;

      const livingMonthly = estimateLiving(uni.cost_of_living_index);
      const livingTotal = livingMonthly * 12 * n;

      const grandTotal = tuitionTotal + housingTotal + livingTotal;

      const hasFullRide = uni.scholarships?.some(s => s.coverage_type === "full_ride") || false;
      const maxStipend = Math.max(...(uni.scholarships?.map(s => s.stipend_amount || 0) || [0]));
      const scholarshipSavings = hasFullRide ? tuitionTotal + (maxStipend * n) : maxStipend * n;
      const netCost = Math.max(0, grandTotal - scholarshipSavings);

      return { uni, tuitionTotal, housingTotal, livingTotal, grandTotal, scholarshipSavings, netCost, hasFullRide };
    }).sort((a, b) => a.netCost - b.netCost);
  }, [universities, years]);

  const formatK = (v: number) => v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-green-600 text-green-600 hover:bg-green-600 hover:text-white">
          <Calculator className="h-4 w-4" /> {l.button}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-heading flex items-center gap-2">
            <Calculator className="h-5 w-5" /> {l.title}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{l.subtitle}</p>
        </DialogHeader>

        <div className="flex items-center gap-3 mt-3">
          <Label className="text-xs shrink-0">{l.duration}</Label>
          <Select value={years} onValueChange={setYears}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5, 6].map(y => <SelectItem key={y} value={String(y)}>{y} {l.years}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4 space-y-1.5 max-h-[55vh] overflow-y-auto">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{l.results}</p>
          {results.slice(0, 50).map((r, idx) => (
            <div key={r.uni.university_id} className={`rounded-lg border border-border p-3 text-xs ${idx === 0 ? "bg-green-50 dark:bg-green-950/20 border-green-300 dark:border-green-800" : "bg-card"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {idx === 0 && <Badge className="bg-green-600 text-white text-[10px]">{l.cheapest}</Badge>}
                    <p className="font-semibold text-foreground truncate">{r.uni.university_name}</p>
                  </div>
                  <p className="text-muted-foreground mt-0.5">{r.uni.city}, {r.uni.country}</p>
                </div>
                <div className="text-right shrink-0">
                  {/* FULL RIDE badge stripped 2026-05-27; net cost shows
                      $0 (or close to it) when the row has full coverage,
                      so the number itself communicates the same fact. */}
                  <p className="text-lg font-bold text-foreground">{formatK(r.netCost)}</p>
                  <p className="text-muted-foreground text-[10px]">{l.forYears} {years} {l.years}</p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 mt-2 pt-2 border-t border-border">
                <div className="flex items-center gap-1">
                  <GraduationCap className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">{l.tuition}:</span>
                  <span className="font-medium">{formatK(r.tuitionTotal)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Home className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">{l.housing}:</span>
                  <span className="font-medium">{formatK(r.housingTotal)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <ShoppingBag className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">{l.living}:</span>
                  <span className="font-medium">{formatK(r.livingTotal)}</span>
                </div>
                {r.scholarshipSavings > 0 && (
                  <div className="flex items-center gap-1">
                    <TrendingDown className="h-3 w-3 text-green-600" />
                    <span className="text-green-600 font-medium">-{formatK(r.scholarshipSavings)}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
