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
  Pencil, LogOut,
} from "lucide-react";
import { motion } from "framer-motion";
import { Link, Navigate } from "react-router-dom";
import { getStoredProfile, type DiscoverProfile } from "@/components/discover/DiscoverProfileGate";

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

const DiscoverApp = ({ language = "en" }: Props) => {
  const isRu = language === "ru";
  const { user, subscription } = useAuth();
  const isPro = ["pro", "founding"].includes(subscription.tier);

  const stored = getStoredProfile();

  // Pre-seed ranking profile from stored lead-capture data
  const seedFromLead = (lead: DiscoverProfile | null): Profile => ({
    ...DEFAULT_PROFILE,
    country: lead?.nationality || "",
    degree: lead?.targetDegree === "phd" ? "PhD" : lead?.targetDegree === "master" ? "master's" : "undergraduate",
    gpa: lead?.gpa || "",
    ielts: lead?.ieltsScore || "",
    field: lead?.fieldOfInterest || "",
    budget: lead?.budgetRange?.startsWith("0") || lead?.budgetRange?.startsWith("5000-") ? "low" : "medium",
  });

  const [rows, setRows] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile>(() => seedFromLead(stored));
  const [submitted, setSubmitted] = useState(true);
  const [openDetail, setOpenDetail] = useState<Scored | null>(null);

  // Hard wall: if no profile captured, send back to landing
  if (!stored) {
    return <Navigate to={isRu ? "/discover/ru" : "/discover"} replace />;
  }

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

  const handleResetProfile = () => {
    localStorage.removeItem("topuni_discover_profile");
    window.location.href = isRu ? "/discover/ru" : "/discover";
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation language={language} />

      {/* Editorial app header */}
      <section className="border-b border-border bg-canvas-soft/60">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="label-mono text-accent mb-2">
              {isRu ? "База / 2026 цикл" : "Database / 2026 cycle"}
            </p>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight leading-none">
              {isRu ? "Стипендии" : "Scholarships"}
              <span className="text-muted-foreground font-light italic ml-2">
                {isRu ? "для тебя" : "for you"}
              </span>
            </h1>
          </div>

          {/* Proper user pill — replaces awkward "d · Kazakh" text */}
          <div className="flex items-center gap-2 self-start sm:self-end">
            <div className="flex items-center gap-2.5 bg-card border border-border rounded-full pl-1.5 pr-3 py-1.5 shadow-xs">
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[11px] font-semibold text-primary-foreground">
                {(stored.fullName || "?").trim().charAt(0).toUpperCase()}
              </div>
              <div className="text-xs leading-tight">
                <div className="font-medium text-foreground truncate max-w-[120px]">{stored.fullName}</div>
                <div className="text-muted-foreground">{stored.nationality}</div>
              </div>
              <button
                onClick={handleResetProfile}
                className="ml-1 p-1 rounded-full hover:bg-muted transition-colors"
                title={isRu ? "Сменить профиль" : "Edit profile"}
              >
                <Pencil className="h-3 w-3 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <div id="discover-tools" className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
        <div className="grid lg:grid-cols-12 gap-10">
          {/* LEFT — Sticky profile rail */}
          <aside className="lg:col-span-4 xl:col-span-3">
            <div className="lg:sticky lg:top-24 space-y-5">
              <div>
                <p className="label-mono text-muted-foreground mb-2">{isRu ? "Профиль" : "Your profile"}</p>
                <h2 className="font-heading font-semibold text-xl text-foreground leading-tight">
                  {isRu ? "Точные данные —" : "Sharper inputs,"}
                  <span className="block italic font-light text-muted-foreground">
                    {isRu ? "точнее ранжирование." : "sharper ranking."}
                  </span>
                </h2>
              </div>

              <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-xs">
                <div>
                  <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    {isRu ? "Гражданство" : "Citizenship"}
                  </Label>
                  <Input
                    className="mt-1.5 bg-background"
                    value={profile.country}
                    onChange={e => setProfile(p => ({ ...p, country: e.target.value }))}
                    placeholder="Kazakhstan"
                  />
                </div>

                <div>
                  <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    {isRu ? "Уровень" : "Degree level"}
                  </Label>
                  <Select value={profile.degree} onValueChange={v => setProfile(p => ({ ...p, degree: v }))}>
                    <SelectTrigger className="mt-1.5 bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="undergraduate">Undergraduate</SelectItem>
                      <SelectItem value="master's">Master's</SelectItem>
                      <SelectItem value="PhD">PhD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">GPA</Label>
                  <div className="flex gap-2 mt-1.5">
                    <Input
                      className="bg-background"
                      value={profile.gpa}
                      onChange={e => setProfile(p => ({ ...p, gpa: e.target.value }))}
                      placeholder="3.8"
                    />
                    <Select value={profile.gpaScale} onValueChange={v => setProfile(p => ({ ...p, gpaScale: v }))}>
                      <SelectTrigger className="w-24 bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="4.0">/4.0</SelectItem>
                        <SelectItem value="5.0">/5.0</SelectItem>
                        <SelectItem value="100">/100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">IELTS</Label>
                    <Input
                      className="mt-1.5 bg-background"
                      value={profile.ielts}
                      onChange={e => setProfile(p => ({ ...p, ielts: e.target.value }))}
                      placeholder="7.0"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">SAT</Label>
                    <Input
                      className="mt-1.5 bg-background"
                      value={profile.sat}
                      onChange={e => setProfile(p => ({ ...p, sat: e.target.value }))}
                      placeholder="1450"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    {isRu ? "Бюджет" : "Budget reality"}
                  </Label>
                  <Select value={profile.budget} onValueChange={v => setProfile(p => ({ ...p, budget: v }))}>
                    <SelectTrigger className="mt-1.5 bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{isRu ? "Нужно полное финансирование" : "Need full funding"}</SelectItem>
                      <SelectItem value="medium">{isRu ? "Можем покрыть часть" : "Can cover some costs"}</SelectItem>
                      <SelectItem value="high">{isRu ? "Бюджет не критичен" : "Budget is flexible"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  className="w-full bg-foreground text-background hover:bg-foreground/90 rounded-full h-11 mt-1"
                  onClick={() => setSubmitted(true)}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {isRu ? "Пересчитать матчи" : "Re-rank matches"}
                </Button>
              </div>
            </div>
          </aside>

          {/* RIGHT — Results column */}
          <main className="lg:col-span-8 xl:col-span-9 space-y-8">
            {!submitted ? (
              <div className="border border-dashed border-border rounded-2xl p-12 text-center bg-canvas-soft/40 space-y-4">
                <Compass className="h-10 w-10 text-accent mx-auto" />
                <h3 className="text-2xl font-heading font-bold tracking-tight">
                  {isRu ? "Заполни профиль слева" : "Fill the profile on the left"}
                </h3>
                <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                  {isRu
                    ? `${rows.length} верифицированных стипендий ждут.`
                    : `${rows.length} verified scholarships waiting to be ranked against you.`}
                </p>
              </div>
            ) : loading ? (
              <div className="grid sm:grid-cols-2 gap-5">
                {[1,2,3,4].map(i => <div key={i} className="h-72 bg-card border border-border rounded-2xl animate-pulse" />)}
              </div>
            ) : (
              <>
                {/* Results header — editorial */}
                <div className="flex items-end justify-between gap-4 pb-4 border-b border-border">
                  <div>
                    <p className="label-mono text-muted-foreground mb-1">
                      {isRu ? "Результаты" : "Ranked results"}
                    </p>
                    <h2 className="font-heading text-2xl font-bold tracking-tight">
                      {ranked.length}{" "}
                      <span className="text-muted-foreground font-light italic">
                        {isRu ? "стипендий найдено" : "matches found"}
                      </span>
                    </h2>
                  </div>
                  {!isPro && (
                    <Badge variant="outline" className="border-gold/40 text-gold-dark bg-gold/5 self-start">
                      <Lock className="h-3 w-3 mr-1" />{isRu ? "Превью: топ 3" : "Preview · top 3"}
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
                      <motion.div key={s.scholarship_id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <Card className="h-full hover:border-accent/40 hover:shadow-md transition-all flex flex-col rounded-2xl border-border bg-card">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="label-mono text-muted-foreground mb-1.5">{s.host_country || "—"}</p>
                                <h4 className="font-heading font-semibold text-base leading-snug tracking-tight">{s.scholarship_name}</h4>
                                <p className="text-xs text-muted-foreground mt-1">{s.provider_name}</p>
                              </div>
                              <div className="text-right shrink-0 border-l border-border pl-3">
                                <div className="text-3xl font-heading font-bold text-foreground leading-none tabular-nums">{s.match}</div>
                                <div className="label-mono text-muted-foreground mt-1">match</div>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              <Badge variant="outline" className={PStyle.cls}>{PStyle.label}</Badge>
                              <Badge variant="outline" className={`gap-1 ${Elig.cls}`}><ElIcon className="h-3 w-3" />{Elig.label}</Badge>
                              {s.coverage_type === "full_ride" && <Badge className="bg-gold/15 text-gold-dark border-gold/30 border" variant="outline"><Award className="h-3 w-3 mr-1" />Full ride</Badge>}
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
                              <div className="bg-accent/5 border border-accent/20 rounded-xl p-3">
                                <p className="label-mono text-accent mb-1 flex items-center gap-1"><Lightbulb className="h-3 w-3" />{isRu ? "Почему подходит" : "Why this fits"}</p>
                                <p className="text-xs text-foreground/85 leading-relaxed">{s.why_this_fits}</p>
                              </div>
                            )}

                            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                              <span className="inline-flex items-center gap-1"><TrendingUp className="h-3 w-3" />Reward: <strong className="text-foreground">{s.reward}</strong></span>
                              <span className="inline-flex items-center gap-1">Effort: <strong className="text-foreground">{s.effort}</strong></span>
                            </div>

                            <div className="mt-auto flex gap-2 pt-2">
                              <Button size="sm" variant="outline" className="flex-1 rounded-full" onClick={() => setOpenDetail(s)}>
                                {isRu ? "Стратегия" : "Application notes"} <ArrowRight className="h-3 w-3 ml-1" />
                              </Button>
                              {s.official_url && (
                                <Button size="sm" asChild className="rounded-full bg-foreground text-background hover:bg-foreground/90">
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
                  <div className="mt-2 p-8 bg-canvas-soft border border-gold/30 rounded-2xl text-center space-y-3">
                    <Lock className="h-8 w-8 text-gold mx-auto" />
                    <h3 className="text-xl font-heading font-bold tracking-tight">
                      {isRu ? `+${locked} стипендий` : `+${locked} more scholarships`}
                      <span className="text-muted-foreground font-light italic ml-2">
                        {isRu ? "в твоём списке" : "in your ranked list"}
                      </span>
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                      {isRu
                        ? "Pro открывает полный список с матч-скорами, стратегиями подачи и причинами отказов."
                        : "Pro unlocks the full ranked list with strategy notes, rejection patterns, and the rest of the database."}
                    </p>
                    <div className="flex gap-3 justify-center flex-wrap pt-1">
                      <Button asChild className="rounded-full bg-foreground text-background hover:bg-foreground/90">
                        <Link to="/pricing">{isRu ? "Открыть Pro" : "Unlock full access"}</Link>
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
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
                        <h4 className="font-semibold text-accent mb-1 flex items-center gap-2"><Lightbulb className="h-4 w-4" />{isRu ? "Как подать сильную заявку" : "Application approach"}</h4>
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
                    <p className="text-sm text-foreground mb-1">{isRu ? "Стратегия подачи и причины отказов" : "Application notes · common rejections · strategy"}</p>
                    <p className="text-xs text-muted-foreground mb-3">{isRu ? "Открой с Pro" : "Unlock with Pro"}</p>
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

export default DiscoverApp;
