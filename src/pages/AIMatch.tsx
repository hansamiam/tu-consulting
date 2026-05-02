/**
 * AIMatch — fast AI scholarship finder at /match.
 *
 * Lightweight alternative to the full TopUni AI wizard for users who
 * just want to see "what's possible" before committing to a full
 * profile. Single textarea → pgvector semantic match → inline grid of
 * top 6 scholarships with similarity scores → CTA into the wizard.
 *
 * Designed to be the fastest possible first-touch surface: no signup,
 * no form, no scrolling — just paste a sentence and see real
 * scholarships in 2 seconds.
 */
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight, Sparkles, Loader2, Search, Wallet, Calendar, GraduationCap, Globe,
} from "lucide-react";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

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

const SAMPLE_QUERIES = [
  "Computer science master's, fully funded, anywhere in Europe.",
  "PhD in public health, ideally Cambridge or Yale, GPA 3.8 from India.",
  "Undergrad business degree in Singapore or Hong Kong, can pay some tuition.",
  "STEM scholarships for women from Africa for a master's abroad.",
];

const AIMatch = () => {
  const [query, setQuery] = useState("");
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<(ScholarshipLite & { _similarity: number; _eligible: boolean })[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  /* SEO meta */
  useEffect(() => {
    document.title = "AI scholarship matcher — find scholarships in seconds | TopUni";
    setMeta(
      "description",
      "Paste a sentence about your studies and TopUni's AI matches you to ~190+ verified scholarships from our database. Free, no signup.",
    );
    setMeta("og:title", "AI scholarship matcher — TopUni", true);
    setMeta(
      "og:description",
      "Paste a sentence about your studies and instantly see matched scholarships. No form, no signup.",
      true,
    );
  }, []);

  const runMatch = async (text?: string) => {
    const q = (text ?? query).trim();
    if (q.length < 10) {
      setError("Add a bit more detail — field of study, country, or level helps.");
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
      // Hydrate 6-12 rows (we over-fetch then filter for eligibility tilt)
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
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* HERO + SEARCH ─────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-primary via-primary to-primary/95 py-12 sm:py-16">
        <div className="max-w-3xl mx-auto px-5 sm:px-8">
          <p className="text-[11px] uppercase tracking-[0.22em] text-gold font-semibold mb-3">
            AI scholarship matcher
          </p>
          <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-primary-foreground tracking-tight leading-tight mb-3">
            Tell us about you.<br />Get scholarships in 2 seconds.
          </h1>
          <p className="text-primary-foreground/75 text-base sm:text-lg leading-relaxed mb-6 max-w-xl">
            Paste a sentence — your field, your level, your dream destinations, your budget. Our AI ranks every
            scholarship in our database against your situation and shows you the top hits.
          </p>

          <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-lg">
            <Textarea
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. PhD in computer science, fully funded, ideally UK or Canada. From Vietnam."
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
                ⌘ Enter to run · {query.split(/\s+/).filter(Boolean).length} words
              </span>
              <Button
                variant="gold"
                onClick={() => runMatch()}
                disabled={running || query.trim().length < 5}
                className="gap-1.5 ml-auto"
              >
                {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {running ? "Searching…" : "Find my scholarships"}
              </Button>
            </div>
          </div>
          {error && <p className="text-xs text-red-300 mt-3">{error}</p>}

          {/* Sample queries — quick-pick row, only before first search */}
          {!hasSearched && (
            <div className="mt-5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-primary-foreground/60 font-semibold mb-2.5">
                Or try one of these
              </p>
              <div className="flex flex-wrap gap-2">
                {SAMPLE_QUERIES.map((q) => (
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

      {/* RESULTS ─────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
        {!hasSearched ? (
          <EmptyExplainer />
        ) : running && results.length === 0 ? (
          <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Reading our scholarship database for you…</span>
          </div>
        ) : results.length === 0 ? (
          <NoMatches />
        ) : (
          <>
            <div className="flex items-baseline justify-between gap-3 mb-5">
              <h2 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {results.length} {results.length === 1 ? "match" : "matches"}
              </h2>
              <Link
                to="/discover"
                className="text-xs text-muted-foreground hover:text-gold-dark transition-colors hidden sm:inline-flex items-center gap-1"
              >
                Browse all scholarships <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-3">
              {results.map((r) => (
                <ResultCard key={r.scholarship_id} row={r} />
              ))}
            </div>

            <div className="mt-12 pt-10 border-t border-border">
              <div className="bg-card border border-border rounded-2xl p-7 sm:p-9 text-center">
                <p className="text-[11px] uppercase tracking-[0.22em] text-gold-dark font-semibold mb-3">
                  Don't browse — strategise
                </p>
                <h3 className="font-heading text-2xl font-bold tracking-tight text-foreground mb-3 leading-tight">
                  These are the closest matches. Your strategy is personal.
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto mb-6">
                  TopUni AI takes your full profile (GPA, scores, target countries, field) and writes you a 90-day
                  action plan: which scholarships to apply to first, what to lead with in each essay, what gaps to
                  close. Free.
                </p>
                <Button variant="gold" size="lg" asChild className="gap-2">
                  <Link to="/topuni-ai">
                    Build my strategy <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
                <p className="text-[11px] text-muted-foreground/70 mt-4">60 seconds. No credit card.</p>
              </div>
            </div>
          </>
        )}
      </section>

      <Footer language="en" />
    </div>
  );
};

export default AIMatch;

/* ─── Internals ─────────────────────────────────────────────────── */

const ResultCard = ({ row: r }: { row: ScholarshipLite & { _similarity: number; _eligible: boolean } }) => {
  const days = r.application_deadline
    ? Math.ceil((new Date(r.application_deadline).getTime() - Date.now()) / 86400_000)
    : null;
  const daysClass =
    days === null ? "text-muted-foreground"
    : days <= 7 ? "text-destructive"
    : days <= 30 ? "text-amber-600 dark:text-amber-500"
    : "text-muted-foreground";
  const daysText =
    days === null ? r.application_deadline ? "Rolling" : "Varies"
    : days <= 0 ? "Closed"
    : days === 1 ? "1 day"
    : days <= 30 ? `${days} days`
    : `${Math.ceil(days / 30)} months`;
  const valueText =
    r.estimated_total_value_usd && r.estimated_total_value_usd >= 1_000_000
      ? `$${(r.estimated_total_value_usd / 1_000_000).toFixed(1)}M`
      : r.estimated_total_value_usd && r.estimated_total_value_usd >= 1000
        ? `$${Math.round(r.estimated_total_value_usd / 1000)}K`
        : null;

  return (
    <Link
      to={`/scholarships/${r.scholarship_id}`}
      className="group block bg-card border border-border rounded-xl p-4 sm:p-5 hover:border-gold/40 hover:shadow-sm transition-all"
    >
      <div className="flex items-baseline justify-between gap-3 mb-1.5">
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
          {r.host_country || "—"}
        </p>
        <div className="flex items-center gap-3 text-[11px] tabular-nums shrink-0">
          {!r._eligible && <span className="text-amber-600 dark:text-amber-500">eligibility unclear</span>}
          <span className="text-gold-dark font-semibold">{Math.round(r._similarity * 100)}% match</span>
          <span className={`font-semibold ${daysClass}`}>{daysText}</span>
        </div>
      </div>
      <h3 className="font-heading font-semibold text-base sm:text-lg text-foreground tracking-tight leading-snug mb-1 group-hover:text-gold-dark transition-colors">
        {r.scholarship_name}
      </h3>
      {r.provider_name && (
        <p className="text-xs text-muted-foreground mb-2.5">{r.provider_name}</p>
      )}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Wallet className="w-3 h-3" />
          {r.coverage_type === "full_ride" ? "Full ride" : r.coverage_type === "tuition_only" ? "Tuition" : "Stipend"}
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

const EmptyExplainer = () => (
  <div className="grid sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
    {[
      { icon: <Search className="w-5 h-5 text-gold-dark" />, title: "Real database", body: "~190 verified scholarships from governments, foundations, and universities globally." },
      { icon: <Sparkles className="w-5 h-5 text-gold-dark" />, title: "Semantic match", body: "AI reads your situation and ranks every scholarship by relevance — not just keyword search." },
      { icon: <Globe className="w-5 h-5 text-gold-dark" />, title: "Eligibility filtered", body: "Filters by your nationality, GPA, IELTS so you only see what you can actually win." },
    ].map((card) => (
      <div key={card.title} className="bg-card border border-border rounded-xl p-4">
        <div className="mb-2.5">{card.icon}</div>
        <p className="font-semibold text-foreground text-sm mb-1.5">{card.title}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{card.body}</p>
      </div>
    ))}
  </div>
);

const NoMatches = () => (
  <div className="text-center py-16">
    <p className="text-sm text-muted-foreground leading-relaxed mb-5 max-w-sm mx-auto">
      We don't see a great match for that query yet. Try adding more detail — your level (bachelor / master / PhD),
      target country, or field — and run again.
    </p>
    <Button variant="outline" asChild>
      <Link to="/topuni-ai">
        Or build a full strategy with TopUni AI <ArrowRight className="ml-2 w-4 h-4" />
      </Link>
    </Button>
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
