/* ProfileSettingsCard — lean profile card on /account.
 *
 * 2026-05-10 rework: drops the "Edit in TopUni AI" detour. Every core
 * identity field (display name, email, nationality, level, intended
 * field) is now inline-editable here. Saves write to BOTH the
 * student_profiles table AND the localStorage draft via saveProfile(),
 * so a change on /account auto-syncs into the TopUni AI wizard
 * pre-fills (the wizard reads from the same getStoredProfile cache).
 *
 * Profile snapshot was previously a 4-cell grid (Nationality / Level /
 * Field / Targets). Targets dropped — the broader Discover filter
 * geography is the right place to express location preference, and
 * the 4-cell layout felt cramped. Three cells now, equal-width.
 */
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { saveProfile, getStoredProfile } from "@/components/discover/DiscoverProfileGate";
import { Loader2, Pencil, Check, X, GraduationCap, Globe, Award } from "lucide-react";
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

type EditField = "name" | "email" | "nationality" | "level" | "field" | null;

const GRADE_LEVELS_EN = [
  "High school junior",
  "High school senior",
  "Gap year",
  "Undergraduate freshman",
  "Undergraduate sophomore",
  "Undergraduate junior",
  "Undergraduate senior",
  "Bachelor's graduate",
  "Master's student",
  "Master's graduate",
  "PhD candidate",
];

const GRADE_LEVELS_RU = [
  "10 класс",
  "11 класс",
  "Год после школы",
  "1 курс бакалавриата",
  "2 курс бакалавриата",
  "3 курс бакалавриата",
  "4 курс бакалавриата",
  "Выпускник бакалавриата",
  "Магистратура",
  "Выпускник магистратуры",
  "Аспирантура",
];

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

  const saveNationality = async () => {
    const trimmed = draft.trim();
    if (trimmed === (profile?.nationality ?? "")) return cancelEdit();
    if (await syncProfile({ nationality: trimmed || null })) {
      cancelEdit();
      toast.success(t("Nationality updated.", "Гражданство обновлено."));
    }
  };

  const saveLevel = async () => {
    if (draft === (profile?.grade_level ?? "")) return cancelEdit();
    if (await syncProfile({ grade_level: draft || null })) {
      cancelEdit();
      toast.success(t("Level updated.", "Уровень обновлён."));
    }
  };

  const saveField = async () => {
    const trimmed = draft.trim();
    if (trimmed === (profile?.field_of_study ?? profile?.major ?? "")) return cancelEdit();
    // Write to BOTH columns — student_profiles has a legacy `major`
    // and a newer `field_of_study`; downstream consumers read either
    // depending on age. Keeping them aligned avoids stale matchups.
    if (await syncProfile({ field_of_study: trimmed || null, major: trimmed || null })) {
      cancelEdit();
      toast.success(t("Field updated.", "Направление обновлено."));
    }
  };

  const fieldLabel = profile?.field_of_study || profile?.major || null;
  const levels = ru ? GRADE_LEVELS_RU : GRADE_LEVELS_EN;

  return (
    <Card className="p-5 space-y-5">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-1.5">
          {t("Profile", "Профиль")}
        </p>
        <p className="text-[12px] text-muted-foreground leading-snug">
          {t(
            "Edits here sync to TopUni AI automatically. Drives ranking, briefs, and saved-search alerts.",
            "Изменения здесь автоматически передаются в TopUni AI. Определяет рейтинг, брифы и оповещения.",
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

      {/* Profile snapshot — three core identity fields, each inline-editable */}
      <div>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.14em] mb-2">
          {t("Your profile", "Ваш профиль")}
        </p>
        {loading ? (
          <div className="space-y-1.5">
            <div className="h-7 rounded bg-muted/40 animate-pulse w-3/4" />
            <div className="h-7 rounded bg-muted/40 animate-pulse w-1/2" />
            <div className="h-7 rounded bg-muted/40 animate-pulse w-2/3" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[12px]">
            {/* Nationality */}
            <SnapshotField
              icon={<Globe className="h-3 w-3 text-gold-dark" />}
              label={t("Nationality", "Гражданство")}
              value={profile?.nationality}
              editing={editing === "nationality"}
              onEdit={() => startEdit("nationality", profile?.nationality ?? "")}
              onCancel={cancelEdit}
              onSave={saveNationality}
              saving={saving}
            >
              <Input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveNationality(); else if (e.key === "Escape") cancelEdit(); }}
                placeholder={t("e.g. Kazakhstan", "напр. Казахстан")}
                className="h-7 text-[12px]"
              />
            </SnapshotField>

            {/* Level — uses Select with the same options as the wizard */}
            <SnapshotField
              icon={<GraduationCap className="h-3 w-3 text-gold-dark" />}
              label={t("Level", "Уровень")}
              value={profile?.grade_level}
              editing={editing === "level"}
              onEdit={() => startEdit("level", profile?.grade_level ?? "")}
              onCancel={cancelEdit}
              onSave={saveLevel}
              saving={saving}
            >
              <Select value={draft} onValueChange={setDraft}>
                <SelectTrigger className="h-7 text-[12px]"><SelectValue placeholder={t("Select", "Выберите")} /></SelectTrigger>
                <SelectContent>
                  {levels.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </SnapshotField>

            {/* Field */}
            <SnapshotField
              icon={<Award className="h-3 w-3 text-gold-dark" />}
              label={t("Field", "Направление")}
              value={fieldLabel}
              editing={editing === "field"}
              onEdit={() => startEdit("field", fieldLabel ?? "")}
              onCancel={cancelEdit}
              onSave={saveField}
              saving={saving}
            >
              <Input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveField(); else if (e.key === "Escape") cancelEdit(); }}
                placeholder={t("e.g. Computer Science", "напр. Информатика")}
                className="h-7 text-[12px]"
              />
            </SnapshotField>
          </div>
        )}
      </div>
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

/** Compact inline-edit cell used in the 3-field profile grid. Same
 * affordance as InlineField but tighter — labels above, value below,
 * pencil hint on hover. */
const SnapshotField = ({
  icon, label, value, editing, onEdit, onCancel, onSave, saving, children,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
  children: React.ReactNode;
}) => (
  <div className="rounded-md border border-border/50 bg-card px-2.5 py-1.5">
    <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5">
      {icon}
      <span className="text-[10px] uppercase tracking-[0.12em] font-semibold">{label}</span>
    </div>
    {editing ? (
      <div className="flex items-center gap-1 mt-0.5">
        <div className="flex-1 min-w-0">{children}</div>
        <Button size="sm" variant="ghost" onClick={onSave} disabled={saving} className="h-6 w-6 p-0 shrink-0">
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} className="h-6 w-6 p-0 shrink-0">
          <X className="h-3 w-3" />
        </Button>
      </div>
    ) : (
      <button
        onClick={onEdit}
        className="group/snap w-full text-left flex items-center justify-between gap-1.5"
      >
        <p className={`text-[12px] leading-tight truncate ${value ? "text-foreground/85" : "text-muted-foreground/60 italic"}`}>
          {value || "—"}
        </p>
        <Pencil className="h-3 w-3 text-muted-foreground/50 opacity-0 group-hover/snap:opacity-100 transition-opacity shrink-0" />
      </button>
    )}
  </div>
);
