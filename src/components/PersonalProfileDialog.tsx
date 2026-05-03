import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, X } from "lucide-react";
import { usePersonalProfile } from "@/hooks/usePersonalProfile";
import type { PersonalProfile } from "@/lib/personalMatch";

/**
 * PersonalProfileDialog — the 5-question modal that captures the
 * profile every match score depends on.
 *
 * Designed to be answerable in 30 seconds. No transcript upload, no
 * 90-minute call — exactly the friction-reversal we promised on the
 * homepage. Skip any field; partial profiles still produce useful
 * scores (the matching function gives baseline credit when unknown).
 *
 * Bilingual via the `language` prop.
 */

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  language?: "en" | "ru";
  /** Called after the user saves — caller can react (e.g., toast or
   *  navigate). The merged profile is passed back. */
  onSaved?: (profile: PersonalProfile) => void;
}

const COPY = {
  en: {
    title: "Set your profile",
    desc: "30 seconds. We use it only to score scholarships against your fit — never sent anywhere, never shared.",
    levelLabel: "Degree level",
    levelOpts: { bachelor: "Bachelor's", master: "Master's", phd: "PhD", postdoc: "Postdoc" },
    countryLabel: "Your nationality",
    countryPh: "e.g. Kazakhstan",
    targetLabel: "Target study countries",
    targetPh: "e.g. UK, US, Germany — comma separated",
    fieldLabel: "Field of study",
    fieldPh: "e.g. Computer Science",
    gpaLabel: "GPA",
    gpaPh: "3.8",
    gpaScaleLabel: "Scale",
    ieltsLabel: "IELTS overall",
    ieltsPh: "7.0",
    save: "Save & match",
    skip: "Skip for now",
    clear: "Clear my profile",
    privacy: "Stored only on this device. Never sent to a server.",
  },
  ru: {
    title: "Настройте профиль",
    desc: "30 секунд. Мы используем это только для расчёта совпадения стипендий — никуда не отправляем и не передаём.",
    levelLabel: "Уровень обучения",
    levelOpts: { bachelor: "Бакалавр", master: "Магистратура", phd: "PhD", postdoc: "Постдок" },
    countryLabel: "Гражданство",
    countryPh: "напр. Казахстан",
    targetLabel: "Целевые страны обучения",
    targetPh: "напр. UK, US, Германия — через запятую",
    fieldLabel: "Направление",
    fieldPh: "напр. Computer Science",
    gpaLabel: "GPA",
    gpaPh: "3.8",
    gpaScaleLabel: "Шкала",
    ieltsLabel: "IELTS",
    ieltsPh: "7.0",
    save: "Сохранить и подобрать",
    skip: "Пропустить",
    clear: "Очистить профиль",
    privacy: "Хранится только на этом устройстве. На сервер не отправляется.",
  },
} as const;

export function PersonalProfileDialog({ open, onOpenChange, language = "en", onSaved }: Props) {
  const t = COPY[language];
  const { profile, update, clear } = usePersonalProfile();

  // Local form state — flushed to global profile on save.
  const [degreeLevel, setDegreeLevel] = useState<string>("");
  const [nationality, setNationality] = useState("");
  const [targetCountries, setTargetCountries] = useState("");
  const [field, setField] = useState("");
  const [gpa, setGpa] = useState("");
  const [gpaScale, setGpaScale] = useState("4");
  const [ielts, setIelts] = useState("");

  // Hydrate from existing profile every time the dialog opens
  useEffect(() => {
    if (!open) return;
    setDegreeLevel(profile?.degreeLevel ?? "");
    setNationality(profile?.nationality ?? "");
    setTargetCountries(profile?.targetCountries?.join(", ") ?? "");
    setField(profile?.field ?? "");
    setGpa(profile?.gpa != null ? String(profile.gpa) : "");
    setGpaScale(profile?.gpaScale != null ? String(profile.gpaScale) : "4");
    setIelts(profile?.ielts != null ? String(profile.ielts) : "");
  }, [open, profile]);

  const save = () => {
    const merged = update({
      degreeLevel: degreeLevel || null,
      nationality: nationality.trim() || null,
      targetCountries: targetCountries.split(",").map((s) => s.trim()).filter(Boolean),
      field: field.trim() || null,
      gpa: gpa ? Number(gpa) : null,
      gpaScale: gpaScale ? Number(gpaScale) : 4,
      ielts: ielts ? Number(ielts) : null,
    });
    onSaved?.(merged);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-gold-dark" />
            {t.title}
          </DialogTitle>
          <DialogDescription>{t.desc}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 py-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[10px] uppercase tracking-[0.16em] font-semibold">{t.levelLabel}</Label>
              <Select value={degreeLevel} onValueChange={setDegreeLevel}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(t.levelOpts).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-[0.16em] font-semibold">{t.countryLabel}</Label>
              <Input className="mt-1.5" value={nationality} onChange={(e) => setNationality(e.target.value)} placeholder={t.countryPh} />
            </div>
          </div>

          <div>
            <Label className="text-[10px] uppercase tracking-[0.16em] font-semibold">{t.targetLabel}</Label>
            <Input className="mt-1.5" value={targetCountries} onChange={(e) => setTargetCountries(e.target.value)} placeholder={t.targetPh} />
          </div>

          <div>
            <Label className="text-[10px] uppercase tracking-[0.16em] font-semibold">{t.fieldLabel}</Label>
            <Input className="mt-1.5" value={field} onChange={(e) => setField(e.target.value)} placeholder={t.fieldPh} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <Label className="text-[10px] uppercase tracking-[0.16em] font-semibold">{t.gpaLabel}</Label>
              <Input className="mt-1.5" type="number" step="0.01" value={gpa} onChange={(e) => setGpa(e.target.value)} placeholder={t.gpaPh} />
            </div>
            <div className="col-span-1">
              <Label className="text-[10px] uppercase tracking-[0.16em] font-semibold">{t.gpaScaleLabel}</Label>
              <Select value={gpaScale} onValueChange={setGpaScale}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">/4.0</SelectItem>
                  <SelectItem value="5">/5.0</SelectItem>
                  <SelectItem value="10">/10.0</SelectItem>
                  <SelectItem value="100">/100</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-1">
              <Label className="text-[10px] uppercase tracking-[0.16em] font-semibold">{t.ieltsLabel}</Label>
              <Input className="mt-1.5" type="number" step="0.5" value={ielts} onChange={(e) => setIelts(e.target.value)} placeholder={t.ieltsPh} />
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground/70 leading-relaxed">{t.privacy}</p>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          {profile ? (
            <Button variant="ghost" size="sm" onClick={() => { clear(); onOpenChange(false); }} className="text-xs text-muted-foreground gap-1">
              <X className="w-3 h-3" /> {t.clear}
            </Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-muted-foreground">{t.skip}</Button>
            <Button variant="gold" size="sm" onClick={save} className="gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              {t.save}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
