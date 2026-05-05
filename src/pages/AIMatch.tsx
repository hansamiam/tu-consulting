/**
 * AIMatch — fast AI scholarship finder at /match (and /match/ru).
 *
 * Lightweight alternative to the full TopUni AI wizard for users who
 * just want to see "what's possible" before committing to a full
 * profile. Single textarea → pgvector semantic match → inline grid of
 * top scholarships with similarity scores → CTA into the wizard.
 *
 * Designed to be the fastest possible first-touch surface: no signup,
 * no form, no scrolling — just paste a sentence and see real
 * scholarships in 2 seconds. Bilingual via the `language` prop.
 */
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, Sparkles, Loader2, Search, Wallet, GraduationCap, Globe, SearchX,
} from "lucide-react";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { ScholarshipCardSkeleton } from "@/components/ScholarshipCard";
import { EmptyState } from "@/components/EmptyState";
import { cleanScholarshipName, cleanProvider } from "@/lib/scholarshipFields";

interface AIMatchProps { language?: "en" | "ru"; }

interface Match {
  scholarship_id: string;
  similarity: number;
  passes_eligibility: boolean;
}

interface ScholarshipLite {
  scholarship_id: string;
  scholarship_name: string;
  provider_name: string | null;
  host_country: string | null;
  coverage_type: string;
  award_amount_text: string | null;
  estimated_total_value_usd: number | null;
  application_deadline: string | null;
  target_degree_level: string[] | null;
  target_fields: string[] | null;
  why_this_fits: string | null;
}

const COPY = {
  en: {
    docTitle: "AI scholarship matcher — find scholarships in seconds | TopUni",
    metaDesc: "Paste a sentence about your studies and TopUni's AI matches you to verified scholarships from our database. Free, no signup.",
    ogTitle: "AI scholarship matcher — TopUni",
    ogDesc: "Paste a sentence about your studies and instantly see matched scholarships. No form, no signup.",
    kicker: "AI scholarship matcher",
    h1a: "Tell us about you.",
    h1b: "Get scholarships in 2 seconds.",
    sub: "Paste a sentence — your field, your level, your dream destinations, your budget. Our AI ranks every scholarship in our database against your situation and shows you the top hits.",
    placeholder: "e.g. PhD in computer science, fully funded, ideally UK or Canada. From Vietnam.",
    submit: "Find my scholarships",
    submitting: "Searching…",
    cmdHint: (n: number) => `⌘ Enter to run · ${n} words`,
    minLength: "Add a bit more detail — field of study, country, or level helps.",
    failed: "Search failed",
    samplesLabel: "Or try one of these",
    samples: [
      "Computer science master's, fully funded, anywhere in Europe.",
      "PhD in public health, ideally Cambridge or Yale, GPA 3.8 from India.",
      "Undergrad business degree in Singapore or Hong Kong, can pay some tuition.",
      "STEM scholarships for women from Africa for a master's abroad.",
    ],
    reading: "Reading our scholarship database for you…",
    matchesOne: "match",
    matchesMany: "matches",
    browseAll: "Browse all scholarships",
    upsellKicker: "Don't browse — strategise",
    upsellH3: "These are the closest matches. Your strategy is personal.",
    upsellSub: "TopUni AI takes your full profile (GPA, scores, target countries, field) and writes you a 90-day action plan: which scholarships to apply to first, what to lead with in each essay, what gaps to close. Free.",
    upsellCta: "Build my strategy",
    upsellFooter: "60 seconds. No credit card.",
    coverage: { full_ride: "Full ride", tuition_only: "Tuition", stipend: "Stipend", other: "Funding" },
    eligibilityUnclear: "eligibility unclear",
    matchPercent: (n: number) => `${n}% match`,
    daysWord: (d: number) => d === 1 ? "1 day" : `${d} days`,
    monthsWord: (m: number) => `${m} months`,
    rolling: "Rolling",
    varies: "Varies",
    closed: "Closed",
    explainer: [
      { title: "Real database",       body: "Verified scholarships from governments, foundations, and universities globally." },
      { title: "Semantic match",      body: "AI reads your situation and ranks every scholarship by relevance — not just keyword search." },
      { title: "Eligibility filtered", body: "Filters by your nationality, GPA, IELTS so you only see what you can actually win." },
    ],
    noMatches: "We don't see a great match for that query yet. Try adding more detail — your level (bachelor / master / PhD), target country, or field — and run again.",
    noMatchesCta: "Or build a full strategy with TopUni AI",
  },
  ru: {
    docTitle: "AI-подбор стипендий — найдите за секунды | TopUni",
    metaDesc: "Опишите ваши планы одним предложением — AI TopUni подберёт проверенные стипендии из нашей базы. Бесплатно, без регистрации.",
    ogTitle: "AI-подбор стипендий — TopUni",
    ogDesc: "Опишите цели одним предложением — мгновенно получите подобранные стипендии. Без форм, без регистрации.",
    kicker: "AI-подбор стипендий",
    h1a: "Расскажите о себе.",
    h1b: "Получите стипендии за 2 секунды.",
    sub: "Опишите одним предложением — направление, уровень, страны мечты, бюджет. Наш AI ранжирует каждую стипендию из базы под вашу ситуацию и показывает лучшие совпадения.",
    placeholder: "напр. PhD по компьютерным наукам, полное финансирование, желательно Великобритания или Канада. Из Вьетнама.",
    submit: "Найти мои стипендии",
    submitting: "Ищем…",
    cmdHint: (n: number) => `⌘ Enter чтобы запустить · ${n} слов`,
    minLength: "Добавьте чуть больше деталей — направление, страна или уровень помогут.",
    failed: "Поиск не удался",
    samplesLabel: "Или попробуйте один из этих",
    samples: [
      "Магистратура по компьютерным наукам, полное финансирование, любая Европа.",
      "PhD по общественному здоровью, желательно Cambridge или Yale, GPA 3.8 из Индии.",
      "Бакалавриат по бизнесу в Сингапуре или Гонконге, могу оплатить часть.",
      "STEM-стипендии для женщин из Африки на магистратуру за рубежом.",
    ],
    reading: "Читаем нашу базу стипендий для вас…",
    matchesOne: "совпадение",
    matchesMany: "совпадений",
    browseAll: "Все стипендии",
    upsellKicker: "Не листайте — стратегия",
    upsellH3: "Это ближайшие совпадения. Ваша стратегия — персональная.",
    upsellSub: "TopUni AI берёт ваш полный профиль (GPA, баллы, целевые страны, направление) и пишет план действий на 90 дней: куда подавать первой очередью, чем выделяться в каждом эссе, какие пробелы закрыть. Бесплатно.",
    upsellCta: "Построить мою стратегию",
    upsellFooter: "60 секунд. Без карты.",
    coverage: { full_ride: "Полное финансирование", tuition_only: "Только обучение", stipend: "Стипендия", other: "Финансирование" },
    eligibilityUnclear: "право на участие неясно",
    matchPercent: (n: number) => `${n}% совпадение`,
    daysWord: (d: number) => {
      const last = d % 10, lastTwo = d % 100;
      if (lastTwo >= 11 && lastTwo <= 14) return `${d} дней`;
      if (last === 1) return `${d} день`;
      if (last >= 2 && last <= 4) return `${d} дня`;
      return `${d} дней`;
    },
    monthsWord: (m: number) => {
      const last = m % 10, lastTwo = m % 100;
      if (lastTwo >= 11 && lastTwo <= 14) return `${m} месяцев`;
      if (last === 1) return `${m} месяц`;
      if (last >= 2 && last <= 4) return `${m} месяца`;
      return `${m} месяцев`;
    },
    rolling: "По мере поступления",
    varies: "Варьируется",
    closed: "Закрыто",
    explainer: [
      { title: "Реальная база",        body: "Проверенные стипендии от правительств, фондов и университетов по всему миру." },
      { title: "Семантический подбор",  body: "AI читает вашу ситуацию и ранжирует каждую стипендию по релевантности — не просто поиск по ключевым словам." },
      { title: "Фильтр по подходимости", body: "Фильтрует по гражданству, GPA, IELTS — чтобы вы видели только то, на что реально можете претендовать." },
    ],
    noMatches: "Пока не видим отличных совпадений по этому запросу. Добавьте больше деталей — уровень (бакалавр / магистр / PhD), целевую страну или направление — и запустите снова.",
    noMatchesCta: "Или постройте полную стратегию с TopUni AI",
  },
} as const;

const AIMatch = ({ language = "en" }: AIMatchProps) => {
  const t = COPY[language];
  const [query, setQuery] = useState("");
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<(ScholarshipLite & { _similarity: number; _eligible: boolean })[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    document.title = t.docTitle;
    setMeta("description", t.metaDesc);
    setMeta("og:title", t.ogTitle, true);
    setMeta("og:description", t.ogDesc, true);
  }, [t.docTitle, t.metaDesc, t.ogTitle, t.ogDesc]);

  const runMatch = async (text?: string) => {
    const q = (text ?? query).trim();
    if (q.length < 10) {
      setError(t.minLength);
      return;
    }
    setError(null);
    setRunning(true);
    setHasSearched(true);
    setResults([]);

    try {
      const { data, error: fnErr } = await supabase.functions.invoke<{
        matches: Match[];
        query_used: string;
      }>("match-scholarships", {
        body: { query: q, limit: 18 },
      });
      if (fnErr) throw new Error(fnErr.message);
      const matches = data?.matches ?? [];
      if (matches.length === 0) {
        setRunning(false);
        return;
      }
      const ids = matches.slice(0, 12).map((m) => m.scholarship_id);
      const { data: rows } = await supabase
        .from("scholarships")
        .select(
          "scholarship_id, scholarship_name, provider_name, host_country, coverage_type, " +
          "award_amount_text, estimated_total_value_usd, application_deadline, " +
          "target_degree_level, target_fields, why_this_fits",
        )
        .in("scholarship_id", ids);
      const byId = new Map<string, ScholarshipLite>(
        ((rows as ScholarshipLite[]) ?? []).map((r) => [r.scholarship_id, r]),
      );
      const merged = matches
        .map((m) => {
          const row = byId.get(m.scholarship_id);
          if (!row) return null;
          return { ...row, _similarity: m.similarity, _eligible: m.passes_eligibility };
        })
        .filter(Boolean) as (ScholarshipLite & { _similarity: number; _eligible: boolean })[];
      setResults(merged.slice(0, 8));
    } catch (e) {
      setError(e instanceof Error ? e.message : t.failed);
    } finally {
      setRunning(false);
    }
  };

  const aiPath = language === "ru" ? "/topuni-ai/ru" : "/topuni-ai";
  const discoverPath = language === "ru" ? "/discover/ru" : "/discover";

  return (
    <div className="min-h-screen bg-background">
      <Navigation language={language} />

      {/* HERO + SEARCH */}
      <section className="bg-gradient-to-br from-primary via-primary to-primary/95 py-12 sm:py-16">
        <div className="max-w-3xl mx-auto px-5 sm:px-8">
          <p className="text-[11px] uppercase tracking-[0.22em] text-gold font-semibold mb-3">{t.kicker}</p>
          <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-primary-foreground tracking-tight leading-tight mb-3">
            {t.h1a}<br />{t.h1b}
          </h1>
          <p className="text-primary-foreground/75 text-base sm:text-lg leading-relaxed mb-6 max-w-xl">{t.sub}</p>

          <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-lg">
            <Textarea
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.placeholder}
              rows={3}
              className="resize-none border-0 bg-transparent text-base focus-visible:ring-0 focus-visible:ring-offset-0 px-1"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  runMatch();
                }
              }}
            />
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-border">
              <span className="text-[11px] text-muted-foreground hidden sm:inline">
                {t.cmdHint(query.split(/\s+/).filter(Boolean).length)}
              </span>
              <Button variant="gold" onClick={() => runMatch()} disabled={running || query.trim().length < 5} className="gap-1.5 ml-auto">
                {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {running ? t.submitting : t.submit}
              </Button>
            </div>
          </div>
          {error && <p className="text-xs text-red-300 mt-3">{error}</p>}

          {!hasSearched && (
            <div className="mt-5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-primary-foreground/60 font-semibold mb-2.5">{t.samplesLabel}</p>
              <div className="flex flex-wrap gap-2">
                {t.samples.map((q) => (
                  <button
                    key={q}
                    onClick={() => { setQuery(q); runMatch(q); }}
                    className="text-xs text-primary-foreground/85 bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors px-3 py-1.5 rounded-full border border-primary-foreground/15"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* RESULTS */}
      <section className="max-w-4xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
        {!hasSearched ? (
          <EmptyExplainer items={t.explainer} />
        ) : running && results.length === 0 ? (
          <>
            <div className="flex items-center justify-center pb-6 gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">{t.reading}</span>
            </div>
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <ScholarshipCardSkeleton key={i} index={i} />)}
            </div>
          </>
        ) : results.length === 0 ? (
          <EmptyState
            icon={<SearchX />}
            title={language === "ru" ? "Не нашли точных совпадений" : "No close matches yet"}
            description={t.noMatches}
            cta={{ label: t.noMatchesCta.replace(/[→]/g, "").trim(), to: aiPath }}
          />
        ) : (
          <>
            <div className="flex items-baseline justify-between gap-3 mb-5">
              <h2 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {results.length} {results.length === 1 ? t.matchesOne : t.matchesMany}
              </h2>
              <Link to={discoverPath} className="text-xs text-muted-foreground hover:text-gold-dark transition-colors hidden sm:inline-flex items-center gap-1">
                {t.browseAll} <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-3">
              {results.map((r) => (
                <ResultCard key={r.scholarship_id} row={r} t={t} />
              ))}
            </div>

            <div className="mt-12 pt-10 border-t border-border">
              <div className="bg-card border border-border rounded-2xl p-7 sm:p-9 text-center">
                <p className="text-[11px] uppercase tracking-[0.22em] text-gold-dark font-semibold mb-3">{t.upsellKicker}</p>
                <h3 className="font-heading text-2xl font-bold tracking-tight text-foreground mb-3 leading-tight">{t.upsellH3}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto mb-6">{t.upsellSub}</p>
                <Button variant="gold" size="lg" asChild className="gap-2">
                  <Link to={aiPath}>
                    {t.upsellCta} <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
                <p className="text-[11px] text-muted-foreground/70 mt-4">{t.upsellFooter}</p>
              </div>
            </div>
          </>
        )}
      </section>

      <Footer language={language} />
    </div>
  );
};

export default AIMatch;

/* ─── Internals ─────────────────────────────────────────────────── */

type T = typeof COPY["en"];

const ResultCard = ({ row: r, t }: { row: ScholarshipLite & { _similarity: number; _eligible: boolean }; t: T }) => {
  const days = r.application_deadline
    ? Math.ceil((new Date(r.application_deadline).getTime() - Date.now()) / 86400_000)
    : null;
  const daysClass =
    days === null ? "text-muted-foreground"
    : days <= 7 ? "text-destructive"
    : days <= 30 ? "text-amber-600 dark:text-amber-500"
    : "text-muted-foreground";
  const daysText =
    days === null ? (r.application_deadline ? t.rolling : t.varies)
    : days <= 0 ? t.closed
    : days <= 30 ? t.daysWord(days)
    : t.monthsWord(Math.ceil(days / 30));
  const valueText =
    r.estimated_total_value_usd && r.estimated_total_value_usd >= 1_000_000
      ? `$${(r.estimated_total_value_usd / 1_000_000).toFixed(1)}M`
      : r.estimated_total_value_usd && r.estimated_total_value_usd >= 1000
        ? `$${Math.round(r.estimated_total_value_usd / 1000)}K`
        : null;
  const coverageLabel = (t.coverage as Record<string, string>)[r.coverage_type] ?? t.coverage.other;

  return (
    <Link
      to={`/scholarships/${r.scholarship_id}`}
      className="group block bg-card border border-border rounded-xl p-4 sm:p-5 hover:border-gold/40 hover:shadow-sm transition-all"
    >
      <div className="flex items-baseline justify-between gap-3 mb-1.5">
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">{r.host_country || "—"}</p>
        <div className="flex items-center gap-3 text-[11px] tabular-nums shrink-0">
          {!r._eligible && <span className="text-amber-600 dark:text-amber-500">{t.eligibilityUnclear}</span>}
          <span className="text-gold-dark font-semibold">{t.matchPercent(Math.round(r._similarity * 100))}</span>
          <span className={`font-semibold ${daysClass}`}>{daysText}</span>
        </div>
      </div>
      <h3 className="font-heading font-semibold text-base sm:text-lg text-foreground tracking-tight leading-snug mb-1 group-hover:text-gold-dark transition-colors">
        {cleanScholarshipName(r.scholarship_name)}
      </h3>
      {(() => {
        const cp = cleanProvider(r.provider_name);
        return cp ? <p className="text-xs text-muted-foreground mb-2.5">{cp}</p> : null;
      })()}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Wallet className="w-3 h-3" />
          {coverageLabel}
          {valueText && ` · ${valueText}`}
        </span>
        {r.target_degree_level && r.target_degree_level.length > 0 && (
          <span className="inline-flex items-center gap-1">
            <GraduationCap className="w-3 h-3" />
            {r.target_degree_level.slice(0, 2).join(", ")}
          </span>
        )}
      </div>
    </Link>
  );
};

const EmptyExplainer = ({ items }: { items: T["explainer"] }) => (
  <div className="grid sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
    {items.map((card, i) => (
      <div key={card.title} className="bg-card border border-border rounded-xl p-4">
        <div className="mb-2.5">
          {i === 0 ? <Search className="w-5 h-5 text-gold-dark" /> :
           i === 1 ? <Sparkles className="w-5 h-5 text-gold-dark" /> :
                     <Globe className="w-5 h-5 text-gold-dark" />}
        </div>
        <p className="font-semibold text-foreground text-sm mb-1.5">{card.title}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{card.body}</p>
      </div>
    ))}
  </div>
);

function setMeta(name: string, content: string, isProperty = false) {
  const sel = isProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`;
  let el = document.querySelector(sel);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(isProperty ? "property" : "name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}
