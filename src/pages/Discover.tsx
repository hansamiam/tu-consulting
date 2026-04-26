import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Sparkles, Calendar, ExternalLink, Lock, Target, TrendingUp, AlertTriangle,
  CheckCircle2, XCircle, Clock, Award, Compass, Lightbulb, ArrowRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { MatchRing } from "@/components/discover/MatchRing";
import { Sparkle, Zap, Users, BarChart3, Filter } from "lucide-react";

interface Scholarship {
  scholarship_id: string;
  scholarship_name: string;
  provider_name: string | null;
  official_url: string | null;
  host_country: string | null;
  eligible_countries: string[] | null;
  target_degree_level: string[] | null;
  target_fields: string[] | null;
  award_amount_text: string | null;
  estimated_total_value_usd: number | null;
  coverage_type: string;
  min_gpa: number | null;
  gpa_scale: number | null;
  min_ielts: number | null;
  min_toefl: number | null;
  min_sat: number | null;
  citizenship_requirements: string | null;
  application_deadline: string | null;
  deadline_type: string | null;
  required_documents: string[] | null;
  essay_required: boolean | null;
  recommendation_letters_required: number | null;
  interview_required: boolean | null;
  separate_application_required: boolean | null;
  selectivity_level: string | null;
  effort_level: string | null;
  effort_reason: string | null;
  ideal_candidate_profile: string | null;
  common_rejection_reasons: string | null;
  strategy_notes: string | null;
  best_for_tags: string[] | null;
  why_this_fits: string | null;
  how_to_win: string | null;
  what_to_prepare_first: string | null;
  next_step: string | null;
  risk_note: string | null;
}

interface Profile {
  country: string;
  degree: string;
  gpa: string;        // on user's scale
  gpaScale: string;   // 4.0 / 5.0 / 100
  ielts: string;
  sat: string;
  field: string;
  budget: string;     // low / medium / high
}

const DEFAULT_PROFILE: Profile = { country: "", degree: "undergraduate", gpa: "", gpaScale: "4.0", ielts: "", sat: "", field: "", budget: "low" };

interface Scored extends Scholarship {
  match: number;
  eligibility: "eligible" | "likely" | "missing" | "not_eligible";
  priority: "strong_match" | "competitive" | "low_priority";
  reward: "high" | "medium" | "low";
  effort: "low" | "medium" | "high";
  reasons: string[];
}

const normalizeGpa = (gpa: number, scale: number): number => {
  if (!gpa || !scale) return 0;
  if (scale <= 4.5) return gpa / scale * 4.0;
  if (scale <= 5.5) return gpa / scale * 4.0;
  return (gpa / 100) * 4.0; // percentage
};

const score = (s: Scholarship, p: Profile): Scored => {
  const reasons: string[] = [];
  let match = 50;
  let eligibility: Scored["eligibility"] = "likely";

  // Country eligibility
  if (s.eligible_countries && p.country) {
    const list = s.eligible_countries.map(c => c.toLowerCase());
    const allCountries = list.some(c => c.includes("all countries"));
    const matched = allCountries || list.some(c => c.includes(p.country.toLowerCase()));
    if (matched) { match += 15; reasons.push(`Open to ${p.country}`); }
    else { eligibility = "not_eligible"; match -= 40; reasons.push(`Not open to ${p.country}`); }
  }

  // Degree
  if (s.target_degree_level && p.degree) {
    if (s.target_degree_level.includes(p.degree)) { match += 10; reasons.push(`Matches ${p.degree} level`); }
    else { eligibility = "not_eligible"; match -= 25; }
  }

  // GPA
  if (s.min_gpa && p.gpa) {
    const userGpa4 = normalizeGpa(parseFloat(p.gpa), parseFloat(p.gpaScale));
    const reqGpa4 = normalizeGpa(s.min_gpa, s.gpa_scale ?? 4.0);
    if (userGpa4 >= reqGpa4) { match += 15; reasons.push(`GPA above the ${s.min_gpa}/${s.gpa_scale ?? 4.0} threshold`); }
    else if (userGpa4 >= reqGpa4 - 0.3) { match += 5; reasons.push("GPA borderline"); if (eligibility !== "not_eligible") eligibility = "missing"; }
    else { match -= 20; if (eligibility !== "not_eligible") eligibility = "missing"; reasons.push(`Below GPA min (${s.min_gpa})`); }
  }

  // IELTS
  if (s.min_ielts && p.ielts) {
    const u = parseFloat(p.ielts);
    if (u >= s.min_ielts) { match += 8; reasons.push(`IELTS meets ${s.min_ielts}`); }
    else { match -= 10; if (eligibility !== "not_eligible") eligibility = "missing"; reasons.push(`IELTS below ${s.min_ielts}`); }
  }

  // SAT
  if (s.min_sat && p.sat) {
    const u = parseInt(p.sat);
    if (u >= s.min_sat) { match += 8; reasons.push(`SAT meets ${s.min_sat}`); }
    else { match -= 8; if (eligibility !== "not_eligible") eligibility = "missing"; reasons.push(`SAT below ${s.min_sat}`); }
  }

  // Reward (financial)
  const value = s.estimated_total_value_usd ?? 0;
  const reward: Scored["reward"] = value >= 80000 ? "high" : value >= 25000 ? "medium" : "low";
  if (s.coverage_type === "full_ride") match += 12;
  if (p.budget === "low" && reward === "high") { match += 6; reasons.push("High financial value for your budget"); }

  // Effort
  const effort: Scored["effort"] = (s.effort_level as Scored["effort"]) ?? "medium";

  // Deadline urgency
  if (s.application_deadline) {
    const days = Math.ceil((new Date(s.application_deadline).getTime() - Date.now()) / 86400000);
    if (days > 0 && days < 60) { match += 5; reasons.push(`Deadline in ${days} days`); }
    if (days > 0 && days < 14) { match += 3; }
  }

  if (eligibility === "likely" && match >= 70) eligibility = "eligible";

  match = Math.max(0, Math.min(100, Math.round(match)));
  const priority: Scored["priority"] =
    eligibility === "not_eligible" ? "low_priority" :
    match >= 75 ? "strong_match" :
    match >= 55 ? "competitive" : "low_priority";

  return { ...s, match, eligibility, priority, reward, effort, reasons };
};

const PRIORITY_STYLE: Record<Scored["priority"], { label: string; cls: string }> = {
  strong_match: { label: "Strong Match", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
  competitive: { label: "Competitive", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" },
  low_priority: { label: "Low Priority", cls: "bg-muted text-muted-foreground border-border" },
};

const ELIG_STYLE: Record<Scored["eligibility"], { label: string; icon: typeof CheckCircle2; cls: string }> = {
  eligible: { label: "Eligible", icon: CheckCircle2, cls: "text-emerald-600 dark:text-emerald-400" },
  likely: { label: "Likely eligible", icon: CheckCircle2, cls: "text-emerald-600/70 dark:text-emerald-400/70" },
  missing: { label: "Missing requirement", icon: AlertTriangle, cls: "text-amber-600 dark:text-amber-400" },
  not_eligible: { label: "Not eligible", icon: XCircle, cls: "text-destructive" },
};

interface Props { language?: "en" | "ru" }

const Discover = ({ language = "en" }: Props) => {
  const isRu = language === "ru";
  const { user, subscription } = useAuth();
  const isPro = ["pro", "founding"].includes(subscription.tier);

  const [rows, setRows] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [submitted, setSubmitted] = useState(false);
  const [openDetail, setOpenDetail] = useState<Scored | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("scholarships")
        .select("*")
        .eq("verified", true)
        .order("estimated_total_value_usd", { ascending: false });
      if (data) setRows(data as unknown as Scholarship[]);
      setLoading(false);
    })();
  }, []);

  const ranked = useMemo(() => {
    if (!submitted) return rows.map(r => score(r, DEFAULT_PROFILE));
    return rows
      .map(r => score(r, profile))
      .sort((a, b) => {
        const elig = { eligible: 0, likely: 1, missing: 2, not_eligible: 3 };
        if (elig[a.eligibility] !== elig[b.eligibility]) return elig[a.eligibility] - elig[b.eligibility];
        return b.match - a.match;
      });
  }, [rows, profile, submitted]);

  const visible = isPro ? ranked : ranked.slice(0, 3);
  const locked = isPro ? 0 : Math.max(0, ranked.length - 3);

  return (
    <div className="min-h-screen bg-background">
      <Navigation language={language} />

      {/* Hero — editorial AI-product */}
      <section className="relative border-b border-border overflow-hidden">
        <div className="absolute inset-0 bg-hero-soft" aria-hidden />
        <div className="absolute inset-0 bg-dot-grid opacity-50" aria-hidden />
        {/* faint gradient orbs */}
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-accent/8 rounded-full blur-3xl" aria-hidden />
        <div className="absolute -top-20 -left-20 w-[400px] h-[400px] bg-primary/8 rounded-full blur-3xl" aria-hidden />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 pt-16 pb-12 lg:pt-24 lg:pb-16">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-end">
            <div className="lg:col-span-7">
              {/* Live status chip */}
              <div className="inline-flex items-center gap-2 bg-surface border border-border px-3 py-1.5 rounded-full text-xs mb-6 shadow-xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-60" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
                </span>
                <span className="label-mono text-muted-foreground">Engine live</span>
                <span className="text-muted-foreground/50">·</span>
                <span className="text-foreground/80 font-medium">{rows.length} scholarships indexed</span>
              </div>

              <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight">
                {isRu ? "Не список. " : "Not a list. "}
                <span className="text-muted-foreground/40">{isRu ? "Не догадки." : "Not a guess."}</span>
                <br />
                {isRu ? "А " : "A "}
                <span className="text-accent">{isRu ? "ранжированный план" : "ranked plan"}</span>.
              </h1>
              <p className="text-base text-muted-foreground mt-5 max-w-xl leading-relaxed">
                {isRu
                  ? "Расскажи о себе — движок покажет стипендии, которые ты реально можешь выиграть, с матч-скором и точным первым шагом."
                  : "Tell us about you. The engine surfaces scholarships you can actually win — with match scores, eligibility checks, and the exact first step."}
              </p>
            </div>

            {/* Live stats panel */}
            <div className="lg:col-span-5">
              <div className="bg-surface border border-border rounded-xl shadow-md p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="label-mono text-muted-foreground">Coverage snapshot</div>
                  <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-2xl font-bold tabular-nums">{rows.length}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">Scholarships</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold tabular-nums">
                      {new Set(rows.map(r => r.host_country).filter(Boolean)).size}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">Countries</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold tabular-nums text-accent">
                      ${Math.round(rows.reduce((a, r) => a + (r.estimated_total_value_usd || 0), 0) / 1_000_000)}M+
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">Total funding</div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-border/70 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Zap className="h-3 w-3 text-accent" />
                  Updated daily · ranked by your profile
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
        {/* Profile form — command-bar style */}
        <Card className="border-border shadow-sm overflow-hidden">
          <div className="bg-canvas-soft border-b border-border px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-md bg-accent/15 border border-accent/30 flex items-center justify-center">
                <Filter className="h-3 w-3 text-accent" />
              </div>
              <h2 className="font-heading font-semibold text-sm">
                {isRu ? "Твой профиль" : "Profile inputs"}
              </h2>
              <span className="text-[11px] text-muted-foreground hidden sm:inline">
                · {isRu ? "Чем точнее — тем умнее ранжирование" : "The more precise, the smarter the ranking"}
              </span>
            </div>
            {submitted && (
              <span className="label-mono text-success flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                Ranked
              </span>
            )}
          </div>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">{isRu ? "Гражданство" : "Citizenship"}</Label>
                <Input value={profile.country} onChange={e => setProfile(p => ({ ...p, country: e.target.value }))} placeholder="Kazakhstan" />
              </div>
              <div>
                <Label className="text-xs">{isRu ? "Уровень" : "Degree level"}</Label>
                <Select value={profile.degree} onValueChange={v => setProfile(p => ({ ...p, degree: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="undergraduate">Undergraduate</SelectItem>
                    <SelectItem value="master's">Master's</SelectItem>
                    <SelectItem value="PhD">PhD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">GPA</Label>
                <div className="flex gap-2">
                  <Input value={profile.gpa} onChange={e => setProfile(p => ({ ...p, gpa: e.target.value }))} placeholder="3.8" />
                  <Select value={profile.gpaScale} onValueChange={v => setProfile(p => ({ ...p, gpaScale: v }))}>
                    <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4.0">/4.0</SelectItem>
                      <SelectItem value="5.0">/5.0</SelectItem>
                      <SelectItem value="100">/100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs">IELTS</Label>
                <Input value={profile.ielts} onChange={e => setProfile(p => ({ ...p, ielts: e.target.value }))} placeholder="7.0" />
              </div>
              <div>
                <Label className="text-xs">SAT (optional)</Label>
                <Input value={profile.sat} onChange={e => setProfile(p => ({ ...p, sat: e.target.value }))} placeholder="1450" />
              </div>
              <div>
                <Label className="text-xs">{isRu ? "Бюджет" : "Budget reality"}</Label>
                <Select value={profile.budget} onValueChange={v => setProfile(p => ({ ...p, budget: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{isRu ? "Нужно полное финансирование" : "Need full funding"}</SelectItem>
                    <SelectItem value="medium">{isRu ? "Можем покрыть часть" : "Can cover some costs"}</SelectItem>
                    <SelectItem value="high">{isRu ? "Бюджет не критичен" : "Budget is flexible"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2 flex items-end">
                <Button className="w-full" onClick={() => setSubmitted(true)}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {isRu ? "Получить рекомендации" : "Get my ranked recommendations"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {loading ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-72 bg-surface border border-border rounded-xl overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-canvas to-transparent animate-shimmer" style={{ backgroundSize: "200% 100%" }} />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-semibold text-lg">
                {submitted ? (isRu ? "Твои рекомендации" : "Your recommendations") : (isRu ? "Все стипендии" : "All scholarships")}
                <span className="text-muted-foreground text-sm ml-2">({ranked.length})</span>
              </h3>
              {!isPro && submitted && (
                <Badge variant="outline" className="border-gold/40 text-gold">
                  <Lock className="h-3 w-3 mr-1" />{isRu ? "Превью: топ 3" : "Free preview: top 3"}
                </Badge>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              {visible.map(s => {
                const PStyle = PRIORITY_STYLE[s.priority];
                const Elig = ELIG_STYLE[s.eligibility];
                const ElIcon = Elig.icon;
                const days = s.application_deadline ? Math.ceil((new Date(s.application_deadline).getTime() - Date.now()) / 86400000) : null;
                return (
                  <motion.div
                    key={s.scholarship_id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                    whileHover={{ y: -2 }}
                  >
                    <Card className={`relative h-full flex flex-col overflow-hidden bg-surface border-border shadow-sm hover:shadow-lg transition-all duration-300 ${submitted && s.match >= 80 ? "ring-1 ring-accent/30" : ""}`}>
                      {submitted && s.match >= 80 && (
                        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-accent" aria-hidden />
                      )}
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h4 className="font-heading font-semibold text-base leading-snug">{s.scholarship_name}</h4>
                            <p className="text-xs text-muted-foreground mt-0.5">{s.provider_name} · {s.host_country}</p>
                          </div>
                          {submitted && (
                            <div className="shrink-0">
                              <MatchRing value={s.match} size={56} />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {submitted && <Badge variant="outline" className={PStyle.cls}>{PStyle.label}</Badge>}
                          <Badge variant="outline" className={`gap-1 ${Elig.cls}`}><ElIcon className="h-3 w-3" />{Elig.label}</Badge>
                          {s.coverage_type === "full_ride" && <Badge className="bg-gold/15 text-gold border-gold/30 border" variant="outline"><Award className="h-3 w-3 mr-1" />Full ride</Badge>}
                          {days !== null && days > 0 && days < 60 && (
                            <Badge variant="outline" className="border-destructive/30 text-destructive"><Clock className="h-3 w-3 mr-1" />{days}d left</Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col gap-3 text-sm">
                        <div className="text-xs space-y-1.5">
                          <div className="flex items-start gap-2"><Award className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" /><span className="text-foreground/80">{s.award_amount_text}</span></div>
                          {s.application_deadline && (
                            <div className="flex items-start gap-2"><Calendar className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" /><span className="text-foreground/80">{new Date(s.application_deadline).toLocaleDateString(isRu ? "ru-RU" : "en-US", { year: "numeric", month: "short", day: "numeric" })}</span></div>
                          )}
                        </div>

                        {s.why_this_fits && (
                          <div className="bg-accent/5 border border-accent/20 rounded-lg p-3">
                            <p className="text-[11px] uppercase tracking-wide text-accent font-semibold mb-1 flex items-center gap-1"><Lightbulb className="h-3 w-3" />{isRu ? "Почему подходит" : "Why this fits you"}</p>
                            <p className="text-xs text-foreground/85">{s.why_this_fits}</p>
                          </div>
                        )}

                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1"><TrendingUp className="h-3 w-3" />Reward: <strong className="text-foreground">{s.reward}</strong></span>
                          <span className="inline-flex items-center gap-1">Effort: <strong className="text-foreground">{s.effort}</strong></span>
                        </div>

                        <div className="mt-auto flex gap-2 pt-2">
                          <Button size="sm" variant="outline" className="flex-1" onClick={() => setOpenDetail(s)}>
                            {isRu ? "Стратегия" : "How to win"} <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                          {s.official_url && (
                            <Button size="sm" asChild>
                              <a href={s.official_url} target="_blank" rel="noopener noreferrer">
                                {isRu ? "Подать" : "Apply"} <ExternalLink className="h-3 w-3 ml-1" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            {locked > 0 && (
              <div className="relative mt-4 overflow-hidden rounded-2xl border border-border bg-surface shadow-md">
                {/* Blurred preview strip behind */}
                <div className="absolute inset-0 grid grid-cols-3 gap-3 p-4 opacity-30 blur-md pointer-events-none" aria-hidden>
                  {[1,2,3].map(i => (
                    <div key={i} className="h-full bg-canvas border border-border rounded-xl" />
                  ))}
                </div>
                <div className="absolute inset-0 bg-gradient-to-b from-surface/40 via-surface/85 to-surface" aria-hidden />

                <div className="relative px-6 py-10 text-center max-w-xl mx-auto">
                  <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/25 px-3 py-1 rounded-full mb-4">
                    <Lock className="h-3 w-3 text-accent" />
                    <span className="label-mono text-accent">{locked} more ranked</span>
                  </div>
                  <h3 className="font-heading text-2xl font-bold tracking-tight mb-2">
                    {isRu ? "Открой полный план" : "Unlock your full admissions strategy"}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-5">
                    {isRu
                      ? "Полный ранжированный список, стратегии «как победить» и причины отказов."
                      : "Full ranked list, match scores, How-to-win strategies, and rejection-reason analysis."}
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-muted-foreground mb-5">
                    <span className="inline-flex items-center gap-1.5"><Sparkle className="h-3 w-3 text-accent" /> Match scores</span>
                    <span className="text-border">·</span>
                    <span className="inline-flex items-center gap-1.5"><Zap className="h-3 w-3 text-accent" /> Strategy notes</span>
                    <span className="text-border">·</span>
                    <span className="inline-flex items-center gap-1.5"><Users className="h-3 w-3 text-accent" /> Expert review</span>
                  </div>
                  <Button size="lg" variant="gold" asChild className="shadow-md">
                    <Link to="/pricing">{isRu ? "Открыть Founding Pro · $19/мес" : "Unlock Founding Pro · $19/mo"}</Link>
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail dialog — requirements first, strategy gated to Pro */}
      <Dialog open={!!openDetail} onOpenChange={(o) => !o && setOpenDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {openDetail && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{openDetail.scholarship_name}</DialogTitle>
                <p className="text-sm text-muted-foreground">{openDetail.provider_name} · {openDetail.host_country}</p>
              </DialogHeader>
              <div className="space-y-4 mt-3 text-sm">
                {/* Hard requirements — always visible */}
                <section>
                  <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2"><Target className="h-4 w-4 text-accent" />{isRu ? "Требования" : "Requirements"}</h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs bg-muted/30 rounded-lg p-3">
                    {openDetail.min_gpa != null && (
                      <div className="flex justify-between"><span className="text-muted-foreground">GPA</span><span className="font-medium">≥ {openDetail.min_gpa}/{openDetail.gpa_scale ?? 4.0}</span></div>
                    )}
                    {openDetail.min_ielts != null && (
                      <div className="flex justify-between"><span className="text-muted-foreground">IELTS</span><span className="font-medium">≥ {openDetail.min_ielts}</span></div>
                    )}
                    {openDetail.min_toefl != null && (
                      <div className="flex justify-between"><span className="text-muted-foreground">TOEFL</span><span className="font-medium">≥ {openDetail.min_toefl}</span></div>
                    )}
                    {openDetail.min_sat != null && (
                      <div className="flex justify-between"><span className="text-muted-foreground">SAT</span><span className="font-medium">≥ {openDetail.min_sat}</span></div>
                    )}
                    {openDetail.application_deadline && (
                      <div className="flex justify-between"><span className="text-muted-foreground">{isRu ? "Дедлайн" : "Deadline"}</span><span className="font-medium">{new Date(openDetail.application_deadline).toLocaleDateString(isRu ? "ru-RU" : "en-US", { year: "numeric", month: "short", day: "numeric" })}</span></div>
                    )}
                    {openDetail.citizenship_requirements && (
                      <div className="col-span-2 flex justify-between"><span className="text-muted-foreground">{isRu ? "Гражданство" : "Citizenship"}</span><span className="font-medium text-right">{openDetail.citizenship_requirements}</span></div>
                    )}
                  </div>
                </section>

                {/* Required documents */}
                {openDetail.required_documents && openDetail.required_documents.length > 0 && (
                  <section>
                    <h4 className="font-semibold text-foreground mb-1.5">{isRu ? "Документы" : "Required documents"}</h4>
                    <ul className="text-xs text-foreground/80 grid grid-cols-2 gap-x-4 gap-y-1 list-disc list-inside">
                      {openDetail.required_documents.map((d) => <li key={d}>{d}</li>)}
                    </ul>
                  </section>
                )}

                {/* Pro-only: strategy & rejection reasons */}
                {isPro ? (
                  <>
                    {openDetail.how_to_win && (
                      <section className="bg-accent/5 border border-accent/20 rounded-lg p-3">
                        <h4 className="font-semibold text-accent mb-1 flex items-center gap-2"><Lightbulb className="h-4 w-4" />{isRu ? "Как победить" : "How to win this"}</h4>
                        <p className="text-foreground/85">{openDetail.how_to_win}</p>
                      </section>
                    )}
                    {openDetail.strategy_notes && (
                      <section>
                        <h4 className="font-semibold text-foreground mb-1">{isRu ? "Стратегия" : "Strategy notes"}</h4>
                        <p className="text-foreground/85">{openDetail.strategy_notes}</p>
                      </section>
                    )}
                    {openDetail.common_rejection_reasons && (
                      <section>
                        <h4 className="font-semibold text-foreground mb-1 flex items-center gap-2"><XCircle className="h-4 w-4 text-destructive" />{isRu ? "Причины отказов" : "Common rejection reasons"}</h4>
                        <p className="text-foreground/85">{openDetail.common_rejection_reasons}</p>
                      </section>
                    )}
                    {openDetail.risk_note && (
                      <section className="border border-amber-500/30 bg-amber-500/5 rounded-lg p-3">
                        <h4 className="font-semibold text-amber-600 dark:text-amber-400 mb-1 flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{isRu ? "Важно" : "Risk note"}</h4>
                        <p className="text-foreground/85">{openDetail.risk_note}</p>
                      </section>
                    )}
                  </>
                ) : (
                  <div className="border border-gold/30 bg-gold/5 rounded-lg p-4 text-center">
                    <Lock className="h-5 w-5 text-gold mx-auto mb-1.5" />
                    <p className="text-sm text-foreground mb-1">{isRu ? "Стратегия выигрыша и причины отказов" : "How to win this · rejection reasons · strategy notes"}</p>
                    <p className="text-xs text-muted-foreground mb-3">{isRu ? "Открой с Founding Pro · $19/мес" : "Unlock with Founding Pro · $19/mo"}</p>
                    <Button size="sm" variant="gold" asChild><Link to="/pricing">{isRu ? "Открыть" : "Unlock"}</Link></Button>
                  </div>
                )}

                {/* CTA: prep gap */}
                {(openDetail.min_ielts || openDetail.min_sat) && (
                  <div className="border border-border rounded-lg p-3 flex items-start justify-between gap-3 bg-muted/20">
                    <div className="text-xs text-foreground/80">
                      {isRu ? "Нужно поднять балл?" : "Need to hit those scores?"}{" "}
                      <Link to="/prep" className="underline">{isRu ? "Открыть Prep" : "Open Prep"}</Link>
                    </div>
                  </div>
                )}

                {openDetail.official_url && (
                  <Button asChild className="w-full">
                    <a href={openDetail.official_url} target="_blank" rel="noopener noreferrer">
                      {isRu ? "Как подать — официальная страница" : "How to apply — official page"} <ExternalLink className="h-3.5 w-3.5 ml-2" />
                    </a>
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Footer language={language} />
    </div>
  );
};

export default Discover;
