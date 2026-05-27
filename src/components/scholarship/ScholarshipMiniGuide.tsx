import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { isAdminUser } from "@/lib/adminMode";
import { useEditMode } from "@/contexts/EditModeContext";
import { toast } from "@/hooks/use-toast";
import { countryFlag } from "@/lib/country-chips";
import { accentForCountry } from "@/lib/countryAccent";

/**
 * <ScholarshipMiniGuide /> — the "Top Uni Insights" block at the bottom
 * of the Discover right-panel pull-up. Hand-written 3-bullet summary,
 * sourced from public.scholarship_mini_guides.top_insights (TEXT[3]).
 *
 * Render states:
 *   1. PAYWALL DOWN + bullets present → render the 3 numbered bullets
 *   2. PAYWALL UP + free user        → "Become a member to unlock..."
 *   3. No bullets uploaded yet       → "More notes coming soon." + a
 *                                       graphic link to a related verified
 *                                       scholarship that does have bullets
 *   4. ADMIN + edit mode             → 3 editable textareas, save writes
 *                                       to top_insights + audit row
 *
 * The legacy multi-section guide (who_fits / how_to_win / what_to_prepare
 * / typical_admit / watch_out in `content` JSONB) ran too long for this
 * surface — kept in the database for a future longer-form page, but no
 * longer rendered here.
 */

// TEMP 2026-05-27: paywall disabled — anyone can see Top Uni Insights.
// Flip to `false` to restore the members-only gate when the founding-20
// launch flips. Mirrors the same flag in ScholarshipArchetypeInsight.
const PUBLIC_INSIGHTS_TEMP = true;

interface Props {
  scholarshipId: string;
  language?: "en" | "ru";
  hostCountry?: string | null;
}

interface RelatedScholarship {
  scholarship_id: string;
  scholarship_name: string;
  provider_name: string | null;
  host_country: string | null;
}

export const ScholarshipMiniGuide = ({ scholarshipId, language = "en", hostCountry = null }: Props) => {
  const [bullets, setBullets] = useState<string[] | null>(null);
  const [related, setRelated] = useState<RelatedScholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user, subscription } = useAuth();
  const { isEditing } = useEditMode();
  const isMember = !!subscription && (
    subscription.is_active ||
    subscription.is_founding_member ||
    isAdminUser(user)
  );
  const canRead = PUBLIC_INSIGHTS_TEMP || isMember;
  const adminEditing = isAdminUser(user) && isEditing;
  const t = (en: string, ru: string) => (language === "ru" ? ru : en);

  useEffect(() => {
    if (!scholarshipId) return;
    let cancelled = false;
    setLoading(true);
    setRelated([]);
    (async () => {
      const { data, error } = await supabase
        .from("scholarship_mini_guides")
        .select("top_insights")
        .eq("scholarship_id", scholarshipId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.warn("[top-uni-insights] fetch error", { scholarshipId, error });
        setBullets(null);
      } else {
        const row = data as { top_insights?: string[] | null } | null;
        const list = Array.isArray(row?.top_insights) ? row!.top_insights! : null;
        setBullets(list && list.length > 0 ? list : null);
        if (!list || list.length === 0) {
          const picks = await findRelatedScholarships(scholarshipId, hostCountry, 1);
          if (!cancelled) setRelated(picks);
        }
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [scholarshipId, hostCountry]);

  // Admin save: upsert top_insights array on mini_guides + write audit row.
  // Mirrors useScholarshipEdit's two-write pattern (update then audit; audit
  // failure is soft-logged, not reverted — same as saveMiniGuideField).
  const saveBullets = async (next: string[], before: string[] | null): Promise<boolean> => {
    if (!user) return false;
    setSaving(true);
    const cleaned = next.map(s => (s || "").trim()).filter(Boolean);
    if (cleaned.length !== 3) {
      toast({
        title: "Top Uni Insights need exactly 3 bullets",
        description: `You have ${cleaned.length} non-empty rows.`,
        variant: "destructive",
      });
      setSaving(false);
      return false;
    }
    const emptyContent = {
      schema_version: 1,
      who_fits: "",
      how_to_win: [],
      watch_out: [],
      what_to_prepare: [],
      typical_admit: "",
    };
    const { error: upErr } = await supabase
      .from("scholarship_mini_guides")
      .upsert(
        {
          scholarship_id: scholarshipId,
          content: emptyContent as never,
          top_insights: cleaned,
          source: "hand_curated_admin",
        },
        { onConflict: "scholarship_id" }
      );
    if (upErr) {
      setSaving(false);
      toast({ title: "Save failed", description: upErr.message, variant: "destructive" });
      return false;
    }
    const { error: auditErr } = await supabase.from("scholarship_edits").insert({
      scholarship_id: scholarshipId,
      editor_user_id: user.id,
      editor_email: user.email ?? "unknown",
      field_name: "mini_guide.top_insights",
      value_before: (before ?? []) as never,
      value_after: cleaned as never,
    });
    if (auditErr) console.warn("[admin-edit] top_insights audit failed (save persisted)", auditErr);
    setBullets(cleaned);
    setSaving(false);
    toast({ title: "Saved" });
    return true;
  };

  if (loading) return null;
  if (!canRead) return <PaywallCard t={t} />;
  if (adminEditing) {
    return (
      <EditableBullets
        t={t}
        initial={bullets ?? ["", "", ""]}
        saving={saving}
        onSave={(next) => saveBullets(next, bullets)}
      />
    );
  }
  if (!bullets) return <ComingSoonCard t={t} related={related} language={language} />;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="not-prose mb-8 max-w-2xl"
    >
      <SectionEyebrow t={t} />
      <ol className="space-y-4 m-0 pl-0 list-none">
        {bullets.slice(0, 3).map((b, i) => (
          <li key={i} className="grid grid-cols-[28px_1fr] gap-3.5 items-start">
            <span className="font-heading text-[20px] font-bold text-brand-navy tabular-nums leading-[1.25]">
              {i + 1}.
            </span>
            <p className="text-[15px] leading-[1.55] text-foreground/90 m-0">
              {b}
            </p>
          </li>
        ))}
      </ol>
    </motion.section>
  );
};

/* Premium magazine-section eyebrow. Three layers:
 *  - a small solid gold "marker" square that anchors the eye
 *  - the label itself: chunky letters with generous tracking
 *  - a thick gold underline below — short, like a section divider,
 *    not a wispy line that flanks the text
 * Reads more like an editorial title block than a sub-label. */
const SectionEyebrow = ({ t, attached = false }: { t: (en: string, ru: string) => string; attached?: boolean }) => (
  <div className={attached ? "mb-2" : "mb-5"}>
    <div className="inline-flex items-center gap-2.5">
      <span className="h-2.5 w-2.5 rounded-[2px] bg-gold-dark" aria-hidden />
      <p className="text-[14px] sm:text-[15px] uppercase tracking-[0.32em] font-black text-gold-dark m-0 leading-none">
        {t("Top Uni Insights", "Заметки Top Uni")}
      </p>
    </div>
    <span className="block h-[3px] w-14 bg-gold rounded-full mt-2.5" aria-hidden />
  </div>
);

const EditableBullets = ({
  t,
  initial,
  saving,
  onSave,
}: {
  t: (en: string, ru: string) => string;
  initial: string[];
  saving: boolean;
  onSave: (next: string[]) => Promise<boolean>;
}) => {
  const padded = [...initial];
  while (padded.length < 3) padded.push("");
  const [drafts, setDrafts] = useState<string[]>(padded.slice(0, 3));

  const setAt = (i: number, v: string) => {
    const next = [...drafts];
    next[i] = v;
    setDrafts(next);
  };

  return (
    <section className="not-prose mb-8 max-w-2xl">
      <SectionEyebrow t={t} />
      <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-foreground/55 m-0 mb-3">
        Admin · edit the 3 bullets, then save
      </p>
      <ol className="space-y-3 m-0 pl-0 list-none">
        {drafts.map((b, i) => (
          <li key={i} className="grid grid-cols-[28px_1fr] gap-3.5 items-start">
            <span className="font-heading text-[20px] font-bold text-brand-navy tabular-nums leading-[1.25]">
              {i + 1}.
            </span>
            <textarea
              value={b}
              onChange={(e) => setAt(i, e.target.value)}
              placeholder={`Bullet ${i + 1}…`}
              rows={2}
              className="w-full rounded-md border border-foreground/20 bg-background px-2.5 py-1.5 text-[14px] leading-[1.55] resize-y focus:outline-none focus:ring-1 focus:ring-gold/40"
            />
          </li>
        ))}
      </ol>
      <div className="mt-4">
        <Button size="sm" variant="default" onClick={() => onSave(drafts)} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </section>
  );
};

const ComingSoonCard = ({
  t,
  related,
  language,
}: {
  t: (en: string, ru: string) => string;
  related: RelatedScholarship[];
  language: "en" | "ru";
}) => {
  // Single suggestion — the user found two too noisy.
  const pick = related[0];
  return (
    <section className="not-prose mb-8 max-w-2xl">
      <SectionEyebrow t={t} attached />
      {/* No bordered box — the headline reads as the section's direct
          value (a magazine subhead under the eyebrow), not as content
          inside a separate placeholder block. */}
      <p className="font-heading text-[22px] sm:text-[24px] leading-[1.3] font-bold tracking-[-0.01em] text-foreground/90 m-0 mb-7">
        {t("More notes coming soon.", "Скоро будут новые заметки.")}
      </p>
      {pick && (
        <div>
          <p className="text-[13px] text-foreground/65 italic m-0 mb-3">
            {t(
              "in the meantime, browse more scholarships",
              "а пока — посмотрите другие стипендии"
            )}
          </p>
          <Link
            to={`/scholarships/${pick.scholarship_id}${language === "ru" ? "/ru" : ""}`}
            className="group block rounded-xl border border-gold/35 bg-gradient-to-br from-gold/[0.06] via-card to-card hover:border-gold/60 hover:from-gold/[0.12] transition-all overflow-hidden"
          >
            <div className="flex items-stretch min-w-0">
              <div
                className={`shrink-0 w-16 sm:w-20 flex items-center justify-center bg-gradient-to-br ${accentForCountry(pick.host_country || "") || "from-gold/20 to-gold/5"}`}
              >
                <span className="text-2xl sm:text-[28px] leading-none drop-shadow-sm">
                  {countryFlag(pick.host_country || "") || "🎓"}
                </span>
              </div>
              <div className="flex items-center gap-3 min-w-0 flex-1 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-heading text-[14.5px] font-bold text-foreground leading-tight m-0 line-clamp-2">
                    {pick.scholarship_name}
                  </p>
                  <p className="text-[12px] text-foreground/60 m-0 mt-0.5 truncate">
                    {[pick.provider_name, pick.host_country].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-gold-dark shrink-0 transition-transform group-hover:translate-x-0.5" />
              </div>
            </div>
          </Link>
        </div>
      )}
    </section>
  );
};

const PaywallCard = ({ t }: { t: (en: string, ru: string) => string }) => (
  <section className="not-prose mb-8">
    <div className="rounded-2xl border-2 border-dashed border-gold/45 bg-gradient-to-br from-gold/[0.06] via-card to-card p-6 sm:p-7">
      <div className="flex items-start gap-4 sm:gap-5">
        <div className="shrink-0 w-12 h-12 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center">
          <Lock className="w-5 h-5 text-gold-dark" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-gold-dark m-0 mb-2">
            {t("Members only", "Только для участников")}
          </p>
          <h4 className="font-heading text-[20px] sm:text-[22px] font-bold leading-tight tracking-tight text-foreground m-0 mb-4">
            {t(
              "Become a member to unlock Top Uni Insights.",
              "Станьте участником, чтобы открыть заметки Top Uni."
            )}
          </h4>
          <Button variant="gold" asChild className="gap-1.5">
            <Link to="/pricing">
              {t("Become a member", "Стать участником")}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  </section>
);

async function findRelatedScholarships(
  excludeId: string,
  hostCountry: string | null,
  desiredCount: number,
): Promise<RelatedScholarship[]> {
  type Row = {
    scholarship_id: string;
    scholarships: {
      scholarship_name: string;
      provider_name: string | null;
      host_country: string | null;
      verified: boolean | null;
    } | null;
  };
  const baseSelect = "scholarship_id, scholarships!inner(scholarship_name, provider_name, host_country, verified)";
  const seen = new Set<string>([excludeId]);
  const out: RelatedScholarship[] = [];
  const push = (rows: Row[] | null | undefined) => {
    for (const r of rows ?? []) {
      if (out.length >= desiredCount) return;
      if (seen.has(r.scholarship_id) || !r.scholarships) continue;
      seen.add(r.scholarship_id);
      out.push({
        scholarship_id: r.scholarship_id,
        scholarship_name: r.scholarships.scholarship_name,
        provider_name: r.scholarships.provider_name,
        host_country: r.scholarships.host_country,
      });
    }
  };

  // Same host country first — most relevant signal we have without
  // pulling the matcher pipeline.
  if (hostCountry) {
    const { data } = await supabase
      .from("scholarship_mini_guides")
      .select(baseSelect)
      .not("top_insights", "is", null)
      .neq("scholarship_id", excludeId)
      .eq("scholarships.verified", true)
      .eq("scholarships.host_country", hostCountry)
      .limit(desiredCount);
    push(data as unknown as Row[] | null);
  }

  // Top up with any verified-with-insights row if we didn't fill.
  if (out.length < desiredCount) {
    const { data } = await supabase
      .from("scholarship_mini_guides")
      .select(baseSelect)
      .not("top_insights", "is", null)
      .neq("scholarship_id", excludeId)
      .eq("scholarships.verified", true)
      .limit(desiredCount * 2);
    push(data as unknown as Row[] | null);
  }

  return out;
}
