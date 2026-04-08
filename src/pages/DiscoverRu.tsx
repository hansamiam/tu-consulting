import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { BetaBanner } from "@/components/BetaBanner";
import { Footer } from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Scale, ShieldAlert } from "lucide-react";
import { WatchlistDrawer } from "@/components/discover/Watchlist";
import { motion } from "framer-motion";
import { UniversityResult } from "@/components/discover/types";
import { DiscoverFilters } from "@/components/discover/DiscoverFilters";
import { UniversityTable } from "@/components/discover/UniversityTable";
import { CompareDrawer } from "@/components/discover/CompareDrawer";
import { CanIGetInDialog } from "@/components/discover/CanIGetInDialog";
import { CostCalculatorDialog } from "@/components/discover/CostCalculatorDialog";
import { DiscoverProfileGate, getStoredProfile, DiscoverProfile, LockedOverlay } from "@/components/discover/DiscoverProfileGate";
import { SmartRecommendations } from "@/components/discover/SmartRecommendations";
import { DiscoverStats } from "@/components/discover/DiscoverStats";
import { ScholarshipSpotlight } from "@/components/discover/ScholarshipSpotlight";
import { ExportButton } from "@/components/discover/ExportButton";
import { ApplicationTimeline } from "@/components/discover/ApplicationTimeline";
import { TuitionHeatmap } from "@/components/discover/TuitionHeatmap";
import { QuickFacts } from "@/components/discover/QuickFacts";
import { ProgramFinderDialog } from "@/components/discover/ProgramFinderDialog";
import { CountryProfileDialog } from "@/components/discover/CountryProfileDialog";
import { UniversityWorldMap } from "@/components/discover/UniversityWorldMap";
import { FieldAnalytics } from "@/components/discover/FieldAnalytics";
import { BetaGate } from "@/components/discover/BetaGate";

const DiscoverRu = () => {
  const [universities, setUniversities] = useState<UniversityResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");
  const [degreeFilter, setDegreeFilter] = useState("all");
  const [fieldFilter, setFieldFilter] = useState("all");
  const [fullyFunded, setFullyFunded] = useState(false);
  const [ieltsOptional, setIeltsOptional] = useState(false);
  const [foundationYear, setFoundationYear] = useState(false);
  const [maxTuition, setMaxTuition] = useState("");
  const [countries, setCountries] = useState<string[]>([]);
  const [fields, setFields] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
  const [compareOpen, setCompareOpen] = useState(false);
  const [gapYearOnly, setGapYearOnly] = useState(false);
  const [rankingFilter, setRankingFilter] = useState("all");
  const [languageFilter, setLanguageFilter] = useState("all");
  const [profile, setProfile] = useState<DiscoverProfile | null>(getStoredProfile());
  const [showProfileGate, setShowProfileGate] = useState(!getStoredProfile());

  const isLocked = !profile;

  useEffect(() => { fetchUniversities(); }, []);

  const fetchUniversities = async () => {
    setLoading(true);
    const { data: unis, error } = await supabase
      .from("universities")
      .select(`*, programs (*, admission_requirements (*), applications (*)), scholarships (*), university_contacts (*), university_insights (*)`)
      .order("university_name", { ascending: true });

    if (!error && unis) {
      setUniversities(unis as unknown as UniversityResult[]);
      setCountries([...new Set(unis.map((u) => u.country))].sort());
      const allFields = unis.flatMap((u: any) => u.programs?.map((p: any) => p.field_of_study) || []);
      setFields([...new Set(allFields)].sort());
    }
    setLoading(false);
  };

  const filtered = universities.filter((uni) => {
    const q = search.toLowerCase();
    if (q && !uni.university_name.toLowerCase().includes(q) &&
        !uni.country.toLowerCase().includes(q) &&
        !uni.city.toLowerCase().includes(q) &&
        !uni.programs?.some(p => p.program_name.toLowerCase().includes(q) || p.field_of_study.toLowerCase().includes(q))) return false;
    if (countryFilter !== "all" && uni.country !== countryFilter) return false;
    if (maxTuition && uni.tuition_usd_per_year && uni.tuition_usd_per_year > Number(maxTuition)) return false;
    if (fullyFunded && !uni.scholarships?.some((s) => s.coverage_type === "full_ride")) return false;
    if (degreeFilter !== "all" && !uni.programs?.some((p) => p.degree_level === degreeFilter)) return false;
    if (fieldFilter !== "all" && !uni.programs?.some((p) => p.field_of_study === fieldFilter)) return false;
    if (ieltsOptional && !uni.programs?.some((p) => p.admission_requirements?.some((a) => !a.ielts_required))) return false;
    if (foundationYear && !uni.foundation_year_available) return false;
    if (gapYearOnly && !uni.gap_year_accepted) return false;
    if (rankingFilter !== "all" && (!uni.global_ranking || uni.global_ranking > Number(rankingFilter))) return false;
    if (languageFilter !== "all" && uni.language_of_instruction !== languageFilter) return false;
    return true;
  });

  const toggleCompare = (id: string) => {
    setCompareIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 4) next.add(id);
      return next;
    });
  };

  const compareUnis = universities.filter(u => compareIds.has(u.university_id));

  return (
    <div className="min-h-screen bg-background">
      <Navigation language="ru" />
      <BetaBanner />

      <DiscoverProfileGate
        open={showProfileGate}
        onComplete={(p) => { setProfile(p); setShowProfileGate(false); }}
        language="ru"
      />

      {/* Hero */}
      <section className="bg-primary py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-3xl sm:text-5xl font-heading font-bold text-primary-foreground mb-4">
            TopUni <span className="text-gold">Discover</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-primary-foreground/70 text-lg max-w-2xl mx-auto mb-8">
            Ищите и сравнивайте университеты по всему миру. Фильтруйте по стипендиям, стоимости обучения и требованиям.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="max-w-2xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
            <Input placeholder="Поиск по университету, стране, городу или программе..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-12 h-14 text-base bg-card border-border rounded-xl shadow-lg" />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex items-center justify-center gap-3 mt-5 flex-wrap">
            <LockedOverlay isLocked={isLocked}>
              <div className="flex gap-3">
                <CanIGetInDialog universities={filtered} language="ru" />
                <CostCalculatorDialog universities={filtered} language="ru" />
              </div>
            </LockedOverlay>
            <WatchlistDrawer universities={universities} language="ru" />
            <ExportButton universities={filtered} language="ru" />
            <ProgramFinderDialog universities={filtered} language="ru" />
            <CountryProfileDialog universities={filtered} language="ru" />
          </motion.div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Data Accuracy Notice */}
        <div className="flex items-start gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl text-sm">
          <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-foreground">Точность данных</p>
            <p className="text-muted-foreground text-xs mt-1">
              Названия университетов, страны и сайты проверены. Стоимость обучения, суммы стипендий и вступительные требования, отмеченные ⚠️, являются приблизительными и ожидают ручной проверки.
              Всегда уточняйте детали на официальном сайте университета перед принятием решений.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <DiscoverFilters
              showFilters={showFilters} setShowFilters={setShowFilters}
              countryFilter={countryFilter} setCountryFilter={setCountryFilter}
              degreeFilter={degreeFilter} setDegreeFilter={setDegreeFilter}
              fieldFilter={fieldFilter} setFieldFilter={setFieldFilter}
              fullyFunded={fullyFunded} setFullyFunded={setFullyFunded}
              ieltsOptional={ieltsOptional} setIeltsOptional={setIeltsOptional}
              foundationYear={foundationYear} setFoundationYear={setFoundationYear}
              maxTuition={maxTuition} setMaxTuition={setMaxTuition}
              gapYearOnly={gapYearOnly} setGapYearOnly={setGapYearOnly}
              rankingFilter={rankingFilter} setRankingFilter={setRankingFilter}
              languageFilter={languageFilter} setLanguageFilter={setLanguageFilter}
              countries={countries} fields={fields} resultCount={filtered.length} language="ru"
            />
          </div>
        </div>

        {compareIds.size > 0 && (
          <div className="flex items-center gap-3 p-3 bg-accent/10 border border-accent/30 rounded-lg">
            <Scale className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium">{compareIds.size} выбрано</span>
            <Button size="sm" variant="default" className="ml-auto gap-1.5" onClick={() => setCompareOpen(true)} disabled={compareIds.size < 2}>
              Сравнить
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setCompareIds(new Set())}>Сбросить</Button>
          </div>
        )}

        {/* University Table */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-card border border-border rounded-lg p-4 animate-pulse flex gap-4">
                <div className="h-4 bg-muted rounded w-1/4" />
                <div className="h-4 bg-muted rounded w-1/6" />
                <div className="h-4 bg-muted rounded w-1/8" />
                <div className="h-4 bg-muted rounded w-1/8" />
              </div>
            ))}
          </div>
        ) : (
          <UniversityTable universities={filtered} language="ru" compareIds={compareIds} onToggleCompare={toggleCompare} />
        )}

        {/* Smart Recommendations */}
        {profile && (
          <SmartRecommendations universities={universities} profile={profile} language="ru" />
        )}

        {/* Scholarship Spotlight */}
        {!loading && <ScholarshipSpotlight universities={filtered} language="ru" />}

        {/* Beta Features */}
        {!loading && (
          <BetaGate>
            <div className="space-y-6">
              <DiscoverStats universities={filtered} language="ru" />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <QuickFacts universities={filtered} language="ru" />
                <ApplicationTimeline universities={filtered} language="ru" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TuitionHeatmap universities={filtered} language="ru" />
                <FieldAnalytics universities={filtered} language="ru" />
              </div>

              <UniversityWorldMap universities={filtered} language="ru" />
            </div>
          </BetaGate>
        )}
      </div>

      <CompareDrawer open={compareOpen} onClose={() => setCompareOpen(false)} universities={compareUnis} onRemove={(id) => toggleCompare(id)} language="ru" />
      <Footer language="ru" />
    </div>
  );
};

export default DiscoverRu;
