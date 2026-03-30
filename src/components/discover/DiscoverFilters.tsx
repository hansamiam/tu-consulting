import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Filter, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface DiscoverFiltersProps {
  showFilters: boolean;
  setShowFilters: (v: boolean) => void;
  countryFilter: string;
  setCountryFilter: (v: string) => void;
  degreeFilter: string;
  setDegreeFilter: (v: string) => void;
  fieldFilter: string;
  setFieldFilter: (v: string) => void;
  fullyFunded: boolean;
  setFullyFunded: (v: boolean) => void;
  ieltsOptional: boolean;
  setIeltsOptional: (v: boolean) => void;
  foundationYear: boolean;
  setFoundationYear: (v: boolean) => void;
  maxTuition: string;
  setMaxTuition: (v: string) => void;
  gapYearOnly?: boolean;
  setGapYearOnly?: (v: boolean) => void;
  rankingFilter?: string;
  setRankingFilter?: (v: string) => void;
  languageFilter?: string;
  setLanguageFilter?: (v: string) => void;
  countries: string[];
  fields: string[];
  resultCount: number;
  language: "en" | "ru";
}

const t = {
  en: {
    found: "universities found",
    filters: "Filters",
    country: "Country",
    allCountries: "All countries",
    degree: "Degree Level",
    allLevels: "All levels",
    bachelor: "Bachelor",
    master: "Master",
    phd: "PhD",
    field: "Field of Study",
    allFields: "All fields",
    maxTuition: "Max Tuition (USD/year)",
    fullyFunded: "Fully funded only",
    ieltsOptional: "IELTS optional",
    foundationYear: "Foundation year available",
    gapYear: "Gap year accepted",
    ranking: "Max Ranking",
    allRankings: "Any ranking",
    top50: "Top 50",
    top100: "Top 100",
    top200: "Top 200",
    top500: "Top 500",
    instructionLang: "Language",
    allLangs: "Any language",
    clear: "Clear all",
  },
  ru: {
    found: "университетов найдено",
    filters: "Фильтры",
    country: "Страна",
    allCountries: "Все страны",
    degree: "Уровень",
    allLevels: "Все уровни",
    bachelor: "Бакалавриат",
    master: "Магистратура",
    phd: "PhD",
    field: "Направление",
    allFields: "Все направления",
    maxTuition: "Макс. стоимость (USD/год)",
    fullyFunded: "Только полное финансирование",
    ieltsOptional: "IELTS не обязателен",
    foundationYear: "Подготовительный год",
    gapYear: "Gap year принимается",
    ranking: "Макс. рейтинг",
    allRankings: "Любой рейтинг",
    top50: "Топ 50",
    top100: "Топ 100",
    top200: "Топ 200",
    top500: "Топ 500",
    instructionLang: "Язык",
    allLangs: "Любой язык",
    clear: "Сбросить",
  },
};

export const DiscoverFilters = ({
  showFilters, setShowFilters,
  countryFilter, setCountryFilter,
  degreeFilter, setDegreeFilter,
  fieldFilter, setFieldFilter,
  fullyFunded, setFullyFunded,
  ieltsOptional, setIeltsOptional,
  foundationYear, setFoundationYear,
  maxTuition, setMaxTuition,
  gapYearOnly, setGapYearOnly,
  rankingFilter, setRankingFilter,
  languageFilter, setLanguageFilter,
  countries, fields, resultCount, language,
}: DiscoverFiltersProps) => {
  const l = t[language];
  const activeFilterCount = [countryFilter !== "all", degreeFilter !== "all", fieldFilter !== "all", fullyFunded, ieltsOptional, foundationYear, !!maxTuition, gapYearOnly, rankingFilter && rankingFilter !== "all", languageFilter && languageFilter !== "all"].filter(Boolean).length;

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-muted-foreground text-sm">
          {resultCount} {l.found}
        </p>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 text-sm font-medium text-accent hover:text-accent/80 transition-colors"
        >
          <Filter className="h-4 w-4" />
          {l.filters}
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="bg-accent text-accent-foreground h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full">
              {activeFilterCount}
            </Badge>
          )}
        </button>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="bg-card border border-border rounded-xl p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">{l.country}</Label>
                <Select value={countryFilter} onValueChange={setCountryFilter}>
                  <SelectTrigger><SelectValue placeholder={l.allCountries} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{l.allCountries}</SelectItem>
                    {countries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">{l.degree}</Label>
                <Select value={degreeFilter} onValueChange={setDegreeFilter}>
                  <SelectTrigger><SelectValue placeholder={l.allLevels} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{l.allLevels}</SelectItem>
                    <SelectItem value="bachelor">{l.bachelor}</SelectItem>
                    <SelectItem value="master">{l.master}</SelectItem>
                    <SelectItem value="phd">{l.phd}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">{l.field}</Label>
                <Select value={fieldFilter} onValueChange={setFieldFilter}>
                  <SelectTrigger><SelectValue placeholder={l.allFields} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{l.allFields}</SelectItem>
                    {fields.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">{l.maxTuition}</Label>
                <Input type="number" placeholder="e.g. 20000" value={maxTuition} onChange={(e) => setMaxTuition(e.target.value)} />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={fullyFunded} onCheckedChange={setFullyFunded} id="fully-funded" />
                <Label htmlFor="fully-funded" className="text-sm cursor-pointer">{l.fullyFunded}</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={ieltsOptional} onCheckedChange={setIeltsOptional} id="ielts-optional" />
                <Label htmlFor="ielts-optional" className="text-sm cursor-pointer">{l.ieltsOptional}</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={foundationYear} onCheckedChange={setFoundationYear} id="foundation-year" />
                <Label htmlFor="foundation-year" className="text-sm cursor-pointer">{l.foundationYear}</Label>
              </div>
              {setGapYearOnly && (
                <div className="flex items-center gap-3">
                  <Switch checked={gapYearOnly || false} onCheckedChange={setGapYearOnly} id="gap-year" />
                  <Label htmlFor="gap-year" className="text-sm cursor-pointer">{l.gapYear}</Label>
                </div>
              )}
              {setRankingFilter && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">{l.ranking}</Label>
                  <Select value={rankingFilter || "all"} onValueChange={setRankingFilter}>
                    <SelectTrigger><SelectValue placeholder={l.allRankings} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{l.allRankings}</SelectItem>
                      <SelectItem value="50">{l.top50}</SelectItem>
                      <SelectItem value="100">{l.top100}</SelectItem>
                      <SelectItem value="200">{l.top200}</SelectItem>
                      <SelectItem value="500">{l.top500}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              {activeFilterCount > 0 && (
                <div className="flex items-center">
                  <button
                    onClick={() => {
                      setCountryFilter("all"); setDegreeFilter("all"); setFieldFilter("all");
                      setFullyFunded(false); setIeltsOptional(false);
                      setFoundationYear(false); setMaxTuition("");
                      setGapYearOnly?.(false); setRankingFilter?.("all");
                      setLanguageFilter?.("all");
                    }}
                    className="text-sm text-destructive hover:underline flex items-center gap-1"
                  >
                    <X className="h-3 w-3" /> {l.clear}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
