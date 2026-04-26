import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { BetaBanner } from "@/components/BetaBanner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, GraduationCap, MapPin, Calendar, DollarSign, ExternalLink, Sparkles, ShieldAlert } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

interface ScholarshipRow {
  scholarship_id: string;
  scholarship_name: string;
  coverage_type: string;
  stipend_amount: number | null;
  application_deadline: string | null;
  eligibility_requirements: string | null;
  verified: boolean;
  university_id: string;
  universities?: {
    university_name: string;
    country: string;
    city: string;
    website_url: string | null;
  } | null;
}

const COVERAGE_LABEL: Record<string, { en: string; ru: string; tone: string }> = {
  full_ride: { en: "Full Ride", ru: "Полное покрытие", tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
  full_tuition: { en: "Full Tuition", ru: "Полное обучение", tone: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30" },
  partial: { en: "Partial", ru: "Частичная", tone: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" },
  stipend_only: { en: "Stipend Only", ru: "Только стипендия", tone: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30" },
};

interface Props { language?: "en" | "ru" }

const Scholarships = ({ language = "en" }: Props) => {
  const isRu = language === "ru";
  const [rows, setRows] = useState<ScholarshipRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("all");
  const [coverage, setCoverage] = useState("all");
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const debounced = useDebounce(search, 250);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("scholarships")
        .select(`*, universities ( university_name, country, city, website_url )`)
        .order("application_deadline", { ascending: true, nullsFirst: false });
      if (data) setRows(data as unknown as ScholarshipRow[]);
      setLoading(false);
    })();
  }, []);

  const countries = useMemo(
    () => [...new Set(rows.map((r) => r.universities?.country).filter(Boolean) as string[])].sort(),
    [rows]
  );

  const filtered = useMemo(() => {
    const q = debounced.toLowerCase().trim();
    return rows.filter((r) => {
      if (verifiedOnly && !r.verified) return false;
      if (country !== "all" && r.universities?.country !== country) return false;
      if (coverage !== "all" && r.coverage_type !== coverage) return false;
      if (q) {
        const hay = `${r.scholarship_name} ${r.universities?.university_name ?? ""} ${r.universities?.country ?? ""} ${r.eligibility_requirements ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, debounced, country, coverage, verifiedOnly]);

  const fullyFundedCount = useMemo(() => rows.filter((r) => r.coverage_type === "full_ride").length, [rows]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation language={language} />
      <BetaBanner />

      {/* Hero */}
      <section className="bg-primary py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 bg-gold/10 border border-gold/30 px-3 py-1 rounded-full text-gold text-xs font-medium mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            {isRu ? "Стипендии для иностранных студентов" : "Scholarships for international students"}
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-3xl sm:text-5xl font-heading font-bold text-primary-foreground mb-4">
            {isRu ? <>Найди свою <span className="text-gold">стипендию</span></> : <>Find your <span className="text-gold">scholarship</span></>}
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-primary-foreground/70 text-base sm:text-lg max-w-2xl mx-auto mb-6">
            {isRu
              ? `Курируемая база: ${rows.length} стипендий, из них ${fullyFundedCount} с полным покрытием. Фильтруй по стране и сумме — без воды.`
              : `A hand-curated database of ${rows.length} scholarships — ${fullyFundedCount} fully funded. Filter by country and coverage. No fluff.`}
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
            <Input
              placeholder={isRu ? "Поиск по стране, университету, программе…" : "Search by country, university, program…"}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 h-13 text-base bg-card border-border rounded-xl shadow-lg"
            />
          </motion.div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Accuracy notice */}
        <div className="flex items-start gap-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg text-xs">
          <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-muted-foreground">
            {isRu
              ? "Все суммы и дедлайны — ориентировочные. Всегда проверяй на официальном сайте университета перед подачей."
              : "Amounts and deadlines are indicative. Always confirm on the university's official site before applying."}
          </p>
        </div>

        {/* Filters */}
        <div className="grid sm:grid-cols-4 gap-3">
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger><SelectValue placeholder={isRu ? "Страна" : "Country"} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isRu ? "Все страны" : "All countries"}</SelectItem>
              {countries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={coverage} onValueChange={setCoverage}>
            <SelectTrigger><SelectValue placeholder={isRu ? "Покрытие" : "Coverage"} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isRu ? "Любое" : "Any coverage"}</SelectItem>
              {Object.entries(COVERAGE_LABEL).map(([k, v]) => (
                <SelectItem key={k} value={k}>{isRu ? v.ru : v.en}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant={verifiedOnly ? "default" : "outline"}
            onClick={() => setVerifiedOnly((v) => !v)}
            className="justify-start"
          >
            ✓ {isRu ? "Только проверенные" : "Verified only"}
          </Button>
          <div className="flex items-center justify-end text-sm text-muted-foreground">
            {loading ? (isRu ? "Загрузка…" : "Loading…") : `${filtered.length} ${isRu ? "результатов" : "results"}`}
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-44 bg-card border border-border rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <GraduationCap className="h-10 w-10 text-muted-foreground/40 mx-auto" />
            <h3 className="text-lg font-heading font-semibold">{isRu ? "Ничего не найдено" : "No scholarships match"}</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {isRu ? "Попробуй другие фильтры или сбрось поиск." : "Try different filters or clear the search."}
            </p>
            <Button variant="outline" size="sm" onClick={() => { setSearch(""); setCountry("all"); setCoverage("all"); setVerifiedOnly(false); }}>
              {isRu ? "Сбросить" : "Clear filters"}
            </Button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {filtered.map((r) => {
              const cov = COVERAGE_LABEL[r.coverage_type] ?? { en: r.coverage_type, ru: r.coverage_type, tone: "bg-muted text-muted-foreground border-border" };
              const deadline = r.application_deadline ? new Date(r.application_deadline) : null;
              const daysLeft = deadline ? Math.ceil((deadline.getTime() - Date.now()) / 86400000) : null;
              return (
                <Card key={r.scholarship_id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle className="text-base font-semibold leading-snug">{r.scholarship_name}</CardTitle>
                        {r.universities && (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {r.universities.university_name} · {r.universities.country}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className={`shrink-0 ${cov.tone}`}>{isRu ? cov.ru : cov.en}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {r.stipend_amount != null && (
                        <span className="inline-flex items-center gap-1"><DollarSign className="h-3 w-3" />${Number(r.stipend_amount).toLocaleString()}</span>
                      )}
                      {deadline && (
                        <span className={`inline-flex items-center gap-1 ${daysLeft !== null && daysLeft < 30 && daysLeft >= 0 ? "text-amber-600 dark:text-amber-400 font-medium" : ""}`}>
                          <Calendar className="h-3 w-3" />
                          {deadline.toLocaleDateString(isRu ? "ru-RU" : "en-US", { month: "short", day: "numeric", year: "numeric" })}
                          {daysLeft !== null && daysLeft >= 0 && daysLeft < 60 && <> · {daysLeft}d</>}
                        </span>
                      )}
                      {r.verified && <span className="text-emerald-600 dark:text-emerald-400">✓ {isRu ? "Проверено" : "Verified"}</span>}
                    </div>
                    {r.eligibility_requirements && (
                      <p className="text-xs text-foreground/80 line-clamp-3">{r.eligibility_requirements}</p>
                    )}
                    {r.universities?.website_url && (
                      <a
                        href={r.universities.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        {isRu ? "Сайт университета" : "University website"} <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Upgrade CTA */}
        <div className="mt-10 p-6 bg-gradient-to-br from-primary/10 to-accent/10 border border-gold/30 rounded-2xl text-center">
          <h3 className="text-lg font-heading font-bold text-foreground mb-2">
            {isRu ? "Нужна помощь с подачей на стипендию?" : "Need help winning a scholarship?"}
          </h3>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto mb-4">
            {isRu
              ? "Founding-членство — доступ к шаблонам эссе, стратегиям и групповым звонкам. $9/мес, навсегда."
              : "Founding members get essay templates, application strategy, and monthly group calls. $9/mo, locked in forever."}
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Button asChild variant="default"><Link to="/pricing">{isRu ? "Стать Founding" : "Become a Founding Member"}</Link></Button>
            <Button asChild variant="outline"><Link to={isRu ? "/offerings/ru" : "/offerings"}>{isRu ? "Бесплатный звонок" : "Book a free call"}</Link></Button>
          </div>
        </div>
      </div>

      <Footer language={language} />
    </div>
  );
};

export default Scholarships;
