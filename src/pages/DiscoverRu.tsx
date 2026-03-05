import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { motion } from "framer-motion";
import { UniversityResult } from "@/components/discover/types";
import { DiscoverFilters } from "@/components/discover/DiscoverFilters";
import { UniversityTable } from "@/components/discover/UniversityTable";

const DiscoverRu = () => {
  const [universities, setUniversities] = useState<UniversityResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");
  const [degreeFilter, setDegreeFilter] = useState("all");
  const [fullyFunded, setFullyFunded] = useState(false);
  const [ieltsOptional, setIeltsOptional] = useState(false);
  const [foundationYear, setFoundationYear] = useState(false);
  const [maxTuition, setMaxTuition] = useState("");
  const [countries, setCountries] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => { fetchUniversities(); }, []);

  const fetchUniversities = async () => {
    setLoading(true);
    const { data: unis, error } = await supabase
      .from("universities")
      .select(`*, programs (*, admission_requirements (*), applications (*)), scholarships (*)`)
      .order("university_name", { ascending: true });

    if (!error && unis) {
      setUniversities(unis as unknown as UniversityResult[]);
      setCountries([...new Set(unis.map((u) => u.country))].sort());
    }
    setLoading(false);
  };

  const filtered = universities.filter((uni) => {
    if (search && !uni.university_name.toLowerCase().includes(search.toLowerCase()) &&
        !uni.country.toLowerCase().includes(search.toLowerCase()) &&
        !uni.city.toLowerCase().includes(search.toLowerCase())) return false;
    if (countryFilter !== "all" && uni.country !== countryFilter) return false;
    if (maxTuition && uni.tuition_usd_per_year && uni.tuition_usd_per_year > Number(maxTuition)) return false;
    if (fullyFunded && !uni.scholarships?.some((s) => s.coverage_type === "full_ride")) return false;
    if (degreeFilter !== "all" && !uni.programs?.some((p) => p.degree_level === degreeFilter)) return false;
    if (ieltsOptional && !uni.programs?.some((p) => p.admission_requirements?.some((a) => !a.ielts_required))) return false;
    if (foundationYear && !uni.foundation_year_available) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navigation language="ru" />
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
            <Input placeholder="Поиск по университету, стране или городу..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-12 h-14 text-base bg-card border-border rounded-xl shadow-lg" />
          </motion.div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <DiscoverFilters
          showFilters={showFilters} setShowFilters={setShowFilters}
          countryFilter={countryFilter} setCountryFilter={setCountryFilter}
          degreeFilter={degreeFilter} setDegreeFilter={setDegreeFilter}
          fullyFunded={fullyFunded} setFullyFunded={setFullyFunded}
          ieltsOptional={ieltsOptional} setIeltsOptional={setIeltsOptional}
          foundationYear={foundationYear} setFoundationYear={setFoundationYear}
          maxTuition={maxTuition} setMaxTuition={setMaxTuition}
          countries={countries} resultCount={filtered.length} language="ru"
        />

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-card border border-border rounded-lg p-4 animate-pulse flex gap-4">
                <div className="h-4 bg-muted rounded w-1/4" />
                <div className="h-4 bg-muted rounded w-1/6" />
                <div className="h-4 bg-muted rounded w-1/8" />
              </div>
            ))}
          </div>
        ) : (
          <UniversityTable universities={filtered} language="ru" />
        )}
      </div>
      <Footer language="ru" />
    </div>
  );
};

export default DiscoverRu;
