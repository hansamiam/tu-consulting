/* ProfileSettingsCard — lean profile card on /account.
 *
 * 2026-05-25 ship-strip: nationality/level/field snapshot fields pulled
 * from this surface. They live in the TopUni AI wizard (the canonical
 * profile-builder) and the data still flows back here via syncProfile
 * — Settings just stops being a second editing surface for them. Display
 * name + Email remain inline-editable here.
 */
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { saveProfile, getStoredProfile } from "@/components/discover/DiscoverProfileGate";
import { Loader2, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";

interface Props { language?: "en" | "ru"; }

interface ProfileRow {
  full_name: string | null;
  email: string | null;
  nationality: string | null;
  field_of_study: string | null;
  major: string | null;
  grade_level: string | null;
  gpa: number | null;
  ielts: number | null;
  toefl: number | null;
  sat: number | null;
  budget: string | null;
  target_countries: string[] | null;
}

type EditField = "name" | "email" | null;

export const ProfileSettingsCard = ({ language = "en" }: Props) => {
  const ru = language === "ru";
  const t = (en: string, ruText: string) => (ru ? ruText : en);
  const { user } = useAuth();

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EditField>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("student_profiles")
        .select("full_name, email, nationality, field_of_study, major, grade_level, gpa, ielts, toefl, sat, budget, target_countries")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setProfile(
        data ?? {
          full_name: null, email: null, nationality: null, field_of_study: null,
          major: null, grade_level: null, gpa: null, ielts: null, toefl: null,
          sat: null, budget: null, target_countries: null,
        },
      );
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  if (!user) return null;

  /** Single sync helper — writes student_profiles AND mirrors into the
   * localStorage draft via saveProfile() so the TopUni AI wizard
   * pre-fills the new value next time the user opens it. */
  const syncProfile = async (updates: Partial<ProfileRow>): Promise<boolean> => {
    if (!user) return false;
    setSaving(true);
    const { error } = await supabase
      .from("student_profiles")
      .upsert({ user_id: user.id, ...updates }, { onConflict: "user_id" });
    if (error) {
      setSaving(false);
      toast.error(t("Couldn't save. Try again.", "Не удалось сохранить. Попробуйте снова."));
      return false;
    }
    const next: ProfileRow = profile
      ? { ...profile, ...updates }
      : {
          full_name: null, email: null, nationality: null, field_of_study: null,
          major: null, grade_level: null, gpa: null, ielts: null, toefl: null,
          sat: null, budget: null, target_countries: null, ...updates,
        };
    setProfile(next);
    // Mirror into the wizard draft so TopUni AI pre-fills with the same
    // values. saveProfile fires "tu:profile" + DB sync internally; this
    // is a localStorage-side complement to the supabase.update above.
    try {
      const stored = getStoredProfile() ?? {};
      saveProfile({
        ...stored,
        fullName: next.full_name ?? undefined,
        email: next.email ?? undefined,
        nationality: next.nationality ?? undefined,
        gradeLevel: next.grade_level ?? undefined,
        major: next.major ?? undefined,
        fieldOfInterest: next.field_of_study ?? undefined,
        gpa: next.gpa != null ? String(next.gpa) : undefined,
        ielts: next.ielts != null ? String(next.ielts) : undefined,
        toefl: next.toefl != null ? String(next.toefl) : undefined,
        sat: next.sat != null ? String(next.sat) : undefined,
        budgetRange: next.budget ?? undefined,
        targetCountries: next.target_countries ?? undefined,
      });
    } catch { /* localStorage may be unavailable — DB write already succeeded */ }
    setSaving(false);
    return true;
  };

  const startEdit = (field: EditField, currentValue: string) => {
    setEditing(field);
    setDraft(currentValue);
  };
  const cancelEdit = () => { setEditing(null); setDraft(""); };

  const saveName = async () => {
    const trimmed = draft.trim();
    if (!trimmed) return cancelEdit();
    if (trimmed === (profile?.full_name ?? "")) return cancelEdit();
    if (await syncProfile({ full_name: trimmed })) {
      cancelEdit();
      toast.success(t("Name updated.", "Имя обновлено."));
    }
  };

  const saveEmail = async () => {
    const trimmed = draft.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error(t("Enter a valid email.", "Введите корректный email."));
      return;
    }
    if (trimmed === (user.email ?? "").toLowerCase()) return cancelEdit();
    setSaving(true);
    const { error: authErr } = await supabase.auth.updateUser({ email: trimmed });
    if (authErr) {
      setSaving(false);
      toast.error(t("Couldn't update email. Try again.", "Не удалось обновить email. Попробуйте снова."));
      return;
    }
    if (await syncProfile({ email: trimmed })) {
      cancelEdit();
      toast.success(t("Email updated.", "Email обновлён."));
    }
  };

  return (
    <Card className="p-5 space-y-5">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-1.5">
          {t("Profile", "Профиль")}
        </p>
        <p className="text-[12px] text-muted-foreground leading-snug">
          {t(
            "Update your profile fields inside TopUni AI — they flow back here automatically.",
            "Изменяйте поля профиля внутри TopUni AI — они автоматически появляются здесь.",
          )}
        </p>
      </div>

      {/* Display name */}
      <InlineField
        label={t("Display name", "Отображаемое имя")}
        value={profile?.full_name}
        loading={loading}
        editing={editing === "name"}
        onEdit={() => startEdit("name", profile?.full_name ?? "")}
        onCancel={cancelEdit}
        onSave={saveName}
        saving={saving}
        emptyLabel={t("Add your name", "Добавьте имя")}
      >
        <Input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") saveName(); else if (e.key === "Escape") cancelEdit(); }}
          maxLength={80}
          className="h-9"
        />
      </InlineField>

      {/* Email */}
      <InlineField
        label={t("Email", "Email")}
        value={user.email}
        loading={loading}
        editing={editing === "email"}
        onEdit={() => startEdit("email", user.email ?? "")}
        onCancel={cancelEdit}
        onSave={saveEmail}
        saving={saving}
        emptyLabel={t("Add email", "Добавьте email")}
      >
        <Input
          autoFocus
          type="email"
          inputMode="email"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") saveEmail(); else if (e.key === "Escape") cancelEdit(); }}
          placeholder="you@example.com"
          className="h-9"
        />
      </InlineField>
    </Card>
  );
};

/** Linear inline-edit row used for Name + Email. Click → swap to input
 * with Save/Cancel; Enter saves, Escape cancels. */
const InlineField = ({
  label, value, loading, editing, onEdit, onCancel, onSave, saving, emptyLabel, children,
}: {
  label: string;
  value: string | null | undefined;
  loading: boolean;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
  emptyLabel: string;
  children: React.ReactNode;
}) => (
  <div>
    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.14em] block mb-1.5">
      {label}
    </label>
    {loading ? (
      <div className="h-9 rounded bg-muted/40 animate-pulse" />
    ) : editing ? (
      <div className="flex items-center gap-2">
        {children}
        <Button size="sm" onClick={onSave} disabled={saving} className="gap-1.5">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} className="gap-1.5">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    ) : (
      <button
        onClick={onEdit}
        className="w-full flex items-center justify-between gap-3 text-left h-9 px-3 rounded-md border border-border/60 bg-card hover:bg-foreground/[0.03] transition-colors"
      >
        <span className={`text-sm truncate ${value ? "text-foreground" : "text-muted-foreground"}`}>
          {value || emptyLabel}
        </span>
        <Pencil className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
      </button>
    )}
  </div>
);
