/* ProfileSettingsCard — lean profile card on /account.
 *
 * Customers usually expect to see and edit a small set of essentials on
 * an account page: their display name, the email they signed up with,
 * and a quick read of the profile fields that drive recommendations
 * (nationality / level / field / target countries) with a one-click
 * route to the wizard for deeper edits. Keeping this card minimal —
 * the wizard owns the full profile flow, this is just the
 * "what-do-you-have-on-file" surface plus the one inline-editable
 * field (display name) that doesn't need the wizard. */
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Pencil, Check, X, GraduationCap, Globe, Sparkles, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface Props { language?: "en" | "ru"; }

interface ProfileRow {
  full_name: string | null;
  nationality: string | null;
  field_of_study: string | null;
  major: string | null;
  grade_level: string | null;
  target_countries: string[] | null;
}

export const ProfileSettingsCard = ({ language = "en" }: Props) => {
  const ru = language === "ru";
  const t = (en: string, ruText: string) => (ru ? ruText : en);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("student_profiles")
        .select("full_name, nationality, field_of_study, major, grade_level, target_countries")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setProfile(data ?? { full_name: null, nationality: null, field_of_study: null, major: null, grade_level: null, target_countries: null });
      setDraftName(data?.full_name ?? "");
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  if (!user) return null;

  const saveName = async () => {
    const trimmed = draftName.trim();
    if (!trimmed) {
      setDraftName(profile?.full_name ?? "");
      setEditingName(false);
      return;
    }
    if (trimmed === (profile?.full_name ?? "")) {
      setEditingName(false);
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("student_profiles")
      .upsert({ user_id: user.id, full_name: trimmed }, { onConflict: "user_id" });
    setSaving(false);
    if (error) {
      toast.error(t("Couldn't save your name. Try again.", "Не удалось сохранить имя. Попробуйте снова."));
      return;
    }
    setProfile((p) => p ? { ...p, full_name: trimmed } : { full_name: trimmed, nationality: null, field_of_study: null, major: null, grade_level: null, target_countries: null });
    setEditingName(false);
    toast.success(t("Name updated.", "Имя обновлено."));
  };

  const cancelEdit = () => {
    setDraftName(profile?.full_name ?? "");
    setEditingName(false);
  };

  const wizardPath = ru ? "/topuni-ai/ru" : "/topuni-ai";
  const fieldLabel = profile?.field_of_study || profile?.major || null;
  const targets = (profile?.target_countries ?? []).filter(Boolean);

  return (
    <Card className="p-5 space-y-5">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-1.5">
          {t("Profile", "Профиль")}
        </p>
        <p className="text-[12px] text-muted-foreground leading-snug">
          {t(
            "What we have on file. Drives ranking, briefs, and saved-search alerts.",
            "Что у нас сохранено. Определяет рейтинг, брифы и оповещения по сохранённым поискам.",
          )}
        </p>
      </div>

      {/* Display name — inline-editable. The wizard collects the full
          name on signup; this stays as a quick edit so users don't
          have to re-do the whole flow just to change "Sam" to
          "Samuel". */}
      <div>
        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.14em] block mb-1.5">
          {t("Display name", "Отображаемое имя")}
        </label>
        {loading ? (
          <div className="h-9 rounded bg-muted/40 animate-pulse" />
        ) : editingName ? (
          <div className="flex items-center gap-2">
            <Input
              autoFocus
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveName();
                else if (e.key === "Escape") cancelEdit();
              }}
              placeholder={t("Your name", "Ваше имя")}
              maxLength={80}
              className="h-9"
            />
            <Button size="sm" onClick={saveName} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              {t("Save", "Сохранить")}
            </Button>
            <Button size="sm" variant="ghost" onClick={cancelEdit} className="gap-1.5">
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <button
            onClick={() => setEditingName(true)}
            className="w-full flex items-center justify-between gap-3 text-left h-9 px-3 rounded-md border border-border/60 bg-card hover:bg-foreground/[0.03] transition-colors"
          >
            <span className={`text-sm ${profile?.full_name ? "text-foreground" : "text-muted-foreground"}`}>
              {profile?.full_name ?? t("Add your name", "Добавьте имя")}
            </span>
            <Pencil className="h-3.5 w-3.5 text-muted-foreground/70" />
          </button>
        )}
      </div>

      {/* Email — read-only. Changing it requires the auth flow (verify
          new + sign out of old sessions); not worth a custom UI here.
          Users who need to change email can sign out and re-sign-up,
          or contact support if they need data migration. */}
      <div>
        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.14em] block mb-1.5">
          {t("Email", "Email")}
        </label>
        <p className="text-sm text-foreground/85 truncate">{user.email}</p>
      </div>

      {/* Profile snapshot — what the wizard collected last. Shows the
          recommendation-driving fields; "Edit in TopUni AI" routes back
          to the wizard for deeper edits. We don't try to inline-edit
          these because each touches the recommender (nationality
          changes ranking weights; field changes embedding queries) and
          the wizard already has the right input shape + validation. */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.14em]">
            {t("Recommender inputs", "Параметры рекомендаций")}
          </p>
          <button
            onClick={() => navigate(wizardPath)}
            className="text-[11px] text-gold-dark hover:text-foreground transition-colors inline-flex items-center gap-1 font-medium"
          >
            <Sparkles className="h-3 w-3" />
            {t("Edit in TopUni AI", "Изменить в TopUni AI")}
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        {loading ? (
          <div className="space-y-1.5">
            <div className="h-7 rounded bg-muted/40 animate-pulse w-3/4" />
            <div className="h-7 rounded bg-muted/40 animate-pulse w-1/2" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 text-[12px]">
            <SnapshotRow icon={<Globe className="h-3 w-3 text-gold-dark" />} label={t("Nationality", "Гражданство")} value={profile?.nationality} />
            <SnapshotRow icon={<GraduationCap className="h-3 w-3 text-gold-dark" />} label={t("Level", "Уровень")} value={profile?.grade_level} />
            <SnapshotRow icon={<Sparkles className="h-3 w-3 text-gold-dark" />} label={t("Field", "Направление")} value={fieldLabel} />
            <SnapshotRow icon={<Globe className="h-3 w-3 text-gold-dark" />} label={t("Targets", "Страны")} value={targets.length > 0 ? targets.slice(0, 3).join(", ") + (targets.length > 3 ? ` +${targets.length - 3}` : "") : null} />
          </div>
        )}
      </div>
    </Card>
  );
};

const SnapshotRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null | undefined }) => (
  <div className="rounded-md border border-border/50 bg-card px-2.5 py-1.5">
    <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5">
      {icon}
      <span className="text-[10px] uppercase tracking-[0.12em] font-semibold">{label}</span>
    </div>
    <p className={`text-[12px] leading-tight truncate ${value ? "text-foreground/85" : "text-muted-foreground/60 italic"}`}>
      {value || "—"}
    </p>
  </div>
);
