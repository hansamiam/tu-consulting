import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Search, GraduationCap, DollarSign, Globe, Trophy, ExternalLink, Filter, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface UniversityResult {
  university_id: string;
  university_name: string;
  country: string;
  city: string;
  global_ranking: number | null;
  tuition_usd_per_year: number | null;
  cost_of_living_index: number | null;
  language_of_instruction: string | null;
  website_url: string | null;
  programs: {
    program_id: string;
    program_name: string;
    degree_level: string;
    field_of_study: string;
    duration_years: number | null;
    admission_requirements: {
      ielts_required: boolean | null;
      ielts_score_min: number | null;
      sat_required: boolean | null;
      sat_score_min: number | null;
      gpa_min: number | null;
      application_deadline: string | null;
    }[];
  }[];
  scholarships: {
    scholarship_id: string;
    scholarship_name: string;
    coverage_type: string;
    stipend_amount: number | null;
    eligibility_requirements: string | null;
    application_deadline: string | null;
  }[];
}

const Discover = () => {
  const [universities, setUniversities] = useState<UniversityResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");
  const [degreeFilter, setDegreeFilter] = useState("all");
  const [fullyFunded, setFullyFunded] = useState(false);
  const [ieltsOptional, setIeltsOptional] = useState(false);
  const [maxTuition, setMaxTuition] = useState("");
  const [countries, setCountries] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchUniversities();
  }, []);

  const fetchUniversities = async () => {
    setLoading(true);
    const { data: unis, error } = await supabase
      .from("universities")
      .select(`
        *,
        programs (
          *,
          admission_requirements (*)
        ),
        scholarships (*)
      `)
      .order("global_ranking", { ascending: true, nullsFirst: false });

    if (!error && unis) {
      setUniversities(unis as unknown as UniversityResult[]);
      const uniqueCountries = [...new Set(unis.map((u) => u.country))].sort();
      setCountries(uniqueCountries);
    }
    setLoading(false);
  };

  const filtered = universities.filter((uni) => {
    if (search && !uni.university_name.toLowerCase().includes(search.toLowerCase()) &&
        !uni.country.toLowerCase().includes(search.toLowerCase()) &&
        !uni.city.toLowerCase().includes(search.toLowerCase())) return false;
    if (countryFilter !== "all" && uni.country !== countryFilter) return false;
    if (maxTuition && uni.tuition_usd_per_year && uni.tuition_usd_per_year > Number(maxTuition)) return false;
    if (fullyFunded && !uni.scholarships?.some((s) => s.coverage_type === "full ride")) return false;
    if (degreeFilter !== "all" && !uni.programs?.some((p) => p.degree_level === degreeFilter)) return false;
    if (ieltsOptional && !uni.programs?.some((p) => p.admission_requirements?.some((a) => !a.ielts_required))) return false;
    return true;
  });

  const activeFilterCount = [countryFilter !== "all", degreeFilter !== "all", fullyFunded, ieltsOptional, !!maxTuition].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-background">
      <Navigation language="en" />

      {/* Hero */}
      <section className="bg-primary py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl sm:text-5xl font-heading font-bold text-primary-foreground mb-4"
          >
            TopUni <span className="text-gold">Discover</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-primary-foreground/70 text-lg max-w-2xl mx-auto mb-8"
          >
            Search and compare universities worldwide. Filter by scholarships, tuition, test requirements, and more.
          </motion.p>

          {/* Search bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-2xl mx-auto relative"
          >
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
            <Input
              placeholder="Search by university, country, or city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 h-14 text-base bg-card border-border rounded-xl shadow-lg"
            />
          </motion.div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Filter toggle for mobile */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-muted-foreground text-sm">
            {filtered.length} {filtered.length === 1 ? "university" : "universities"} found
          </p>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-sm font-medium text-accent hover:text-accent/80 transition-colors"
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="bg-accent text-accent-foreground h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full">
                {activeFilterCount}
              </Badge>
            )}
          </button>
        </div>

        {/* Filters */}
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
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Country</Label>
                  <Select value={countryFilter} onValueChange={setCountryFilter}>
                    <SelectTrigger><SelectValue placeholder="All countries" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All countries</SelectItem>
                      {countries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Degree Level</Label>
                  <Select value={degreeFilter} onValueChange={setDegreeFilter}>
                    <SelectTrigger><SelectValue placeholder="All levels" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All levels</SelectItem>
                      <SelectItem value="bachelor">Bachelor</SelectItem>
                      <SelectItem value="master">Master</SelectItem>
                      <SelectItem value="phd">PhD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Max Tuition (USD/year)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 20000"
                    value={maxTuition}
                    onChange={(e) => setMaxTuition(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={fullyFunded} onCheckedChange={setFullyFunded} id="fully-funded" />
                  <Label htmlFor="fully-funded" className="text-sm cursor-pointer">Fully funded only</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={ieltsOptional} onCheckedChange={setIeltsOptional} id="ielts-optional" />
                  <Label htmlFor="ielts-optional" className="text-sm cursor-pointer">IELTS optional</Label>
                </div>
                {activeFilterCount > 0 && (
                  <div className="flex items-center">
                    <button
                      onClick={() => {
                        setCountryFilter("all");
                        setDegreeFilter("all");
                        setFullyFunded(false);
                        setIeltsOptional(false);
                        setMaxTuition("");
                      }}
                      className="text-sm text-destructive hover:underline flex items-center gap-1"
                    >
                      <X className="h-3 w-3" /> Clear all
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-6 animate-pulse">
                <div className="h-6 bg-muted rounded w-3/4 mb-3" />
                <div className="h-4 bg-muted rounded w-1/2 mb-2" />
                <div className="h-4 bg-muted rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-heading font-semibold text-foreground mb-2">No universities found</h3>
            <p className="text-muted-foreground text-sm">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filtered.map((uni, i) => (
              <motion.div
                key={uni.university_id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="border-border hover:shadow-lg transition-shadow h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-lg font-heading leading-tight">{uni.university_name}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          <Globe className="inline h-3.5 w-3.5 mr-1" />
                          {uni.city}, {uni.country}
                        </p>
                      </div>
                      {uni.global_ranking && (
                        <Badge variant="outline" className="border-accent text-accent shrink-0">
                          <Trophy className="h-3 w-3 mr-1" />#{uni.global_ranking}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Key stats */}
                    <div className="flex flex-wrap gap-2 text-xs">
                      {uni.tuition_usd_per_year != null && (
                        <Badge variant="secondary">
                          <DollarSign className="h-3 w-3 mr-0.5" />
                          ${uni.tuition_usd_per_year.toLocaleString()}/yr
                        </Badge>
                      )}
                      {uni.language_of_instruction && (
                        <Badge variant="secondary">{uni.language_of_instruction}</Badge>
                      )}
                    </div>

                    {/* Programs */}
                    {uni.programs?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1.5">Programs ({uni.programs.length})</p>
                        <div className="flex flex-wrap gap-1.5">
                          {uni.programs.slice(0, 4).map((p) => (
                            <Badge key={p.program_id} variant="outline" className="text-xs font-normal">
                              {p.program_name}
                              <span className="ml-1 text-muted-foreground capitalize">· {p.degree_level}</span>
                            </Badge>
                          ))}
                          {uni.programs.length > 4 && (
                            <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                              +{uni.programs.length - 4} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Scholarships */}
                    {uni.scholarships?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1.5">Scholarships</p>
                        <div className="flex flex-wrap gap-1.5">
                          {uni.scholarships.map((s) => (
                            <Badge
                              key={s.scholarship_id}
                              className={
                                s.coverage_type === "full ride"
                                  ? "bg-accent/15 text-accent border-accent/30 text-xs"
                                  : "bg-secondary text-secondary-foreground text-xs"
                              }
                              variant="outline"
                            >
                              {s.scholarship_name}
                              <span className="ml-1 capitalize text-muted-foreground">· {s.coverage_type}</span>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Link */}
                    {uni.website_url && (
                      <a
                        href={uni.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-accent hover:underline mt-2"
                      >
                        Visit website <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <Footer language="en" />
    </div>
  );
};

export default Discover;
