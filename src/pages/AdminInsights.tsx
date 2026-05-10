/**
 * AdminInsights — founder analytics for the TopUni platform.
 *
 * Surfaces the actual numbers behind everything that's been built:
 * users / briefs / tracked apps / docs / referrals / nudges. Lets the
 * founder spot-check funnel health without poking at SQL or the
 * dashboard.
 *
 * Auth-gated to admin role (same has_role check as the existing /admin
 * page). All queries run as the authenticated user; RLS applies, so
 * any non-admin who navigates here sees a 403-style empty state.
 */
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Users,
  Inbox,
  FileText,
  Award,
  Bot,
  Mail,
  Crown,
  Activity,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Counts {
  users: number;
  studentProfiles: number;
  trackerActiveRows: number;
  trackerSubmitted: number;
  documentsTotal: number;
  documentsReady: number;
  briefsTotal: number;
  briefsPremium: number;
  sharedBriefs: number;
  sharedBriefsViewSum: number;
  counselorSessions: number;
  counselorMessages: number;
  scholarshipsTotal: number;
  scholarshipsHandCurated: number;
  scholarshipsManus: number;
  embeddingsDone: number;
  nudgesSent: number;
  referralCodes: number;
  referralSignups: number;
  referralPremium: number;
  premiumSubscribers: number;
}

interface TopRow { name: string; count: number }

const AdminInsights = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [topScholarships, setTopScholarships] = useState<TopRow[]>([]);
  const [recentBriefs, setRecentBriefs] = useState<{ slug: string; profile_first_name: string | null; created_at: string; view_count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshedAt, setRefreshedAt] = useState<number | null>(null);

  /* Admin gate */
  useEffect(() => {
    if (authLoading) return;
    if (!user) { setIsAdmin(false); return; }
    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!data);
    })();
  }, [user, authLoading]);

  const refresh = async () => {
    if (!user || !isAdmin) return;
    setLoading(true);

    /* Fan out — parallel count queries. Each `head: true, count: exact`
       avoids fetching rows; we just want the count. */
    const c = (q: ReturnType<typeof supabase.from>) => q.select("*", { count: "exact", head: true });

    const [
      authUsersR,           // auth.users count via the public.profiles mirror if it exists
      studentProfilesR,
      trackerActiveR,
      trackerSubmittedR,
      docsTotalR,
      docsReadyR,
      briefsTotalR,
      briefsPremiumR,
      sharedBriefsR,
      sessionsR,
      messagesR,
      scholarshipsTotalR,
      scholarshipsHandR,
      scholarshipsManusR,
      embeddingsDoneR,
      nudgesSentR,
      referralCodesR,
      referralSignupsR,
      referralPremiumR,
      premiumSubsR,
    ] = await Promise.all([
      c(supabase.from("profiles")),
      c(supabase.from("student_profiles")),
      supabase.from("application_tracker").select("*", { count: "exact", head: true })
        .eq("hidden", false).not("status", "is", null),
      supabase.from("application_tracker").select("*", { count: "exact", head: true })
        .eq("status", "submitted"),
      c(supabase.from("student_documents")),
      supabase.from("student_documents").select("*", { count: "exact", head: true }).eq("parse_status", "ready"),
      c(supabase.from("pathway_reports")),
      supabase.from("pathway_reports").select("*", { count: "exact", head: true }).eq("report_grade", "premium"),
      supabase.from("shared_briefs").select("*", { count: "exact", head: true }).eq("is_public", true),
      c(supabase.from("counselor_sessions")),
      c(supabase.from("counselor_messages")),
      c(supabase.from("scholarships")),
      supabase.from("scholarships").select("*", { count: "exact", head: true }).eq("data_source", "hand_curated"),
      supabase.from("scholarships").select("*", { count: "exact", head: true }).eq("data_source", "manus_ai_2026_05_03"),
      supabase.from("scholarships").select("*", { count: "exact", head: true }).not("embedding", "is", null),
      supabase.from("nudge_log").select("*", { count: "exact", head: true }).eq("email_status", "sent"),
      c(supabase.from("referral_codes")),
      c(supabase.from("referrals")),
      supabase.from("referrals").select("*", { count: "exact", head: true }).not("became_premium_at", "is", null),
      supabase.from("subscriptions").select("*", { count: "exact", head: true }).in("tier", ["pro", "founding"]),
    ]);

    // Sum view_count of public shared briefs separately (no aggregate API)
    const { data: viewSumRows } = await supabase
      .from("shared_briefs")
      .select("view_count")
      .eq("is_public", true);
    const sharedBriefsViewSum = (viewSumRows ?? []).reduce((s, r) => s + (r.view_count ?? 0), 0);

    setCounts({
      users: authUsersR.count ?? 0,
      studentProfiles: studentProfilesR.count ?? 0,
      trackerActiveRows: trackerActiveR.count ?? 0,
      trackerSubmitted: trackerSubmittedR.count ?? 0,
      documentsTotal: docsTotalR.count ?? 0,
      documentsReady: docsReadyR.count ?? 0,
      briefsTotal: briefsTotalR.count ?? 0,
      briefsPremium: briefsPremiumR.count ?? 0,
      sharedBriefs: sharedBriefsR.count ?? 0,
      sharedBriefsViewSum,
      counselorSessions: sessionsR.count ?? 0,
      counselorMessages: messagesR.count ?? 0,
      scholarshipsTotal: scholarshipsTotalR.count ?? 0,
      scholarshipsHandCurated: scholarshipsHandR.count ?? 0,
      scholarshipsManus: scholarshipsManusR.count ?? 0,
      embeddingsDone: embeddingsDoneR.count ?? 0,
      nudgesSent: nudgesSentR.count ?? 0,
      referralCodes: referralCodesR.count ?? 0,
      referralSignups: referralSignupsR.count ?? 0,
      referralPremium: referralPremiumR.count ?? 0,
      premiumSubscribers: premiumSubsR.count ?? 0,
    });

    /* Top tracked scholarships — RPC-less, do it in JS for now */
    const { data: trackerRows } = await supabase
      .from("application_tracker")
      .select("scholarship_id");
    const tally = new Map<string, number>();
    for (const r of trackerRows ?? []) tally.set(r.scholarship_id, (tally.get(r.scholarship_id) ?? 0) + 1);
    const topIds = [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    if (topIds.length > 0) {
      const { data: rows } = await supabase
        .from("scholarships")
        .select("scholarship_id, scholarship_name")
        .in("scholarship_id", topIds.map(([id]) => id));
      const nameById = new Map((rows ?? []).map((r) => [r.scholarship_id, r.scholarship_name]));
      setTopScholarships(topIds.map(([id, count]) => ({ name: nameById.get(id) ?? id, count })));
    } else {
      setTopScholarships([]);
    }

    /* Recent shared briefs */
    const { data: briefs } = await supabase
      .from("shared_briefs")
      .select("slug, profile_first_name, created_at, view_count")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(5);
    setRecentBriefs((briefs as typeof recentBriefs) ?? []);

    setRefreshedAt(Date.now());
    setLoading(false);
  };

  useEffect(() => { if (isAdmin) refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [isAdmin]);

  /* Render gates */
  if (authLoading || isAdmin === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-md mx-auto px-6 pt-20 pb-32 text-center">
          <ShieldAlert className="w-8 h-8 text-muted-foreground/50 mx-auto mb-3" />
          <h1 className="font-heading text-2xl font-bold mb-3">Admin only</h1>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            This page is for the TopUni team. Reach out at team@topuniconsulting.com if you think you should have access.
          </p>
          <Button variant="outline" asChild><Link to="/">Back to TopUni</Link></Button>
        </div>
        <Footer language="en" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <section className="bg-gradient-to-br from-primary via-primary to-primary/95 py-10 sm:py-14">
        <div className="max-w-5xl mx-auto px-5 sm:px-8">
          <Link to="/admin" className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-primary-foreground/70 hover:text-gold-light transition-colors mb-3">
            <ArrowLeft className="w-3.5 h-3.5" /> Admin
          </Link>
          <p className="text-[11px] uppercase tracking-[0.22em] text-gold font-semibold mb-2">Insights</p>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-primary-foreground tracking-tight leading-tight">
            TopUni — by the numbers.
          </h1>
        </div>
      </section>

      <main className="max-w-5xl mx-auto px-5 sm:px-8 py-8 sm:py-12 space-y-8">
        {/* Refresh + last-updated */}
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {refreshedAt ? `Refreshed ${formatDistanceToNow(new Date(refreshedAt), { addSuffix: true })}` : "—"}
          </p>
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading} className="gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        {!counts ? (
          <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> <span className="text-sm">Loading numbers…</span>
          </div>
        ) : (
          <>
            {/* USERS + ENGAGEMENT */}
            <Section title="Users + engagement" icon={<Users className="w-3.5 h-3.5" />}>
              <Tile label="Profiles built"          value={counts.studentProfiles} />
              <Tile label="Auth profiles"           value={counts.users} sub="seeded by Supabase" />
              <Tile label="Premium subscribers"     value={counts.premiumSubscribers} tone="gold" />
              <Tile label="Counselor sessions"      value={counts.counselorSessions} sub={`${counts.counselorMessages} messages`} />
            </Section>

            {/* PIPELINE */}
            <Section title="Application pipeline" icon={<Inbox className="w-3.5 h-3.5" />}>
              <Tile label="Active tracked apps"     value={counts.trackerActiveRows} />
              <Tile label="Submitted"               value={counts.trackerSubmitted} tone="success" />
              <Tile label="Docs uploaded"           value={counts.documentsTotal} sub={`${counts.documentsReady} parsed`} />
            </Section>

            {/* AI SURFACES */}
            <Section title="AI usage" icon={<Bot className="w-3.5 h-3.5" />}>
              <Tile label="Briefs generated"        value={counts.briefsTotal} sub={`${counts.briefsPremium} premium`} />
              <Tile label="Shared brief views"      value={counts.sharedBriefsViewSum} sub={`${counts.sharedBriefs} unique briefs`} />
              <Tile label="Embeddings ready"        value={counts.embeddingsDone} sub={`of ${counts.scholarshipsTotal} scholarships`} tone={counts.embeddingsDone === 0 ? "warn" : "neutral"} />
            </Section>

            {/* GROWTH LOOPS */}
            <Section title="Growth loops" icon={<Award className="w-3.5 h-3.5" />}>
              <Tile label="Referral codes"          value={counts.referralCodes} />
              <Tile label="Referral signups"        value={counts.referralSignups} />
              <Tile label="Premium conversions"     value={counts.referralPremium} tone="gold" />
              <Tile label="Weekly nudges sent"      value={counts.nudgesSent} />
            </Section>

            {/* CATALOG */}
            <Section title="Scholarship catalog" icon={<Activity className="w-3.5 h-3.5" />}>
              <Tile label="Total scholarships"      value={counts.scholarshipsTotal} />
              <Tile label="Hand-curated"            value={counts.scholarshipsHandCurated} tone="success" />
              <Tile label="From Manus AI"           value={counts.scholarshipsManus} sub="external research" />
            </Section>

            {/* TOP TRACKED SCHOLARSHIPS */}
            <Card className="p-5">
              <h2 className="font-heading text-base font-semibold tracking-tight mb-4">
                Most-tracked scholarships
              </h2>
              {topScholarships.length === 0 ? (
                <p className="text-xs text-muted-foreground">No tracking activity yet.</p>
              ) : (
                <ol className="space-y-1.5">
                  {topScholarships.map((s, i) => (
                    <li key={s.name} className="flex items-center gap-3 text-sm">
                      <span className="text-[10px] font-semibold tabular-nums text-muted-foreground w-4 text-right">{i + 1}.</span>
                      <span className="flex-1 truncate text-foreground">{s.name}</span>
                      <span className="text-xs tabular-nums text-muted-foreground">{s.count} {s.count === 1 ? "saver" : "savers"}</span>
                    </li>
                  ))}
                </ol>
              )}
            </Card>

            {/* RECENT SHARED BRIEFS */}
            <Card className="p-5">
              <h2 className="font-heading text-base font-semibold tracking-tight mb-4">
                Recent shared briefs
              </h2>
              {recentBriefs.length === 0 ? (
                <p className="text-xs text-muted-foreground">No shares yet.</p>
              ) : (
                <ul className="space-y-2">
                  {recentBriefs.map((b) => (
                    <li key={b.slug} className="flex items-center gap-3 text-sm">
                      <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <Link to={`/brief/${b.slug}`} className="flex-1 truncate text-foreground hover:text-gold-dark transition-colors">
                        {b.profile_first_name ?? "Anon"} · {b.slug}
                      </Link>
                      <span className="text-[11px] text-muted-foreground tabular-nums">
                        {b.view_count} views · {formatDistanceToNow(new Date(b.created_at), { addSuffix: true })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <div className="text-center">
              <Button variant="ghost" asChild className="gap-1.5">
                <Link to="/admin/funnel">
                  Open the older funnel dashboard <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </Button>
            </div>
          </>
        )}
      </main>

      <Footer language="en" />
    </div>
  );
};

export default AdminInsights;

/* ─── Internals ─────────────────────────────────────────────────── */

const Section = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
  <div>
    <h2 className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-3">
      {icon} {title}
    </h2>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{children}</div>
  </div>
);

const Tile = ({ label, value, sub, tone = "neutral" }: {
  label: string;
  value: number;
  sub?: string;
  tone?: "neutral" | "warn" | "success" | "gold";
}) => {
  const valueClass =
    tone === "gold" ? "text-gold-dark"
    : tone === "warn" ? "text-amber-700 dark:text-amber-500"
    : tone === "success" ? "text-emerald-600"
    : "text-foreground";
  return (
    <Card className="p-4">
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-1.5">{label}</p>
      <p className={`font-heading font-bold text-2xl sm:text-3xl tabular-nums tracking-tight leading-none ${valueClass}`}>
        {value.toLocaleString()}
      </p>
      {sub && <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug">{sub}</p>}
    </Card>
  );
};
