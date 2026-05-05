/**
 * SubmitScholarship — public form at /submit (and /submit/ru).
 *
 * Anyone (anon or signed in) can suggest a scholarship for the database.
 * Lands in scholarship_submissions as 'pending_review'. Admin promotes
 * via the same /admin/queue surface. UNIQUE index on lower(official_url)
 * prevents resubmitting the same link while a previous one is still
 * pending or already approved.
 *
 * Bilingual via the language prop. The DB allows duplicate URLs only
 * after rejection, so a polite duplicate-error message is the expected
 * unhappy path.
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Send, Loader2, ArrowRight, AlertCircle, Sparkles } from "lucide-react";

interface SubmitProps { language?: "en" | "ru"; }

const COPY = {
  en: {
    docTitle: "Submit a scholarship — TopUni",
    metaDesc: "Know a scholarship we should add? Submit it for editorial review.",
    kicker: "Help the community",
    h1: "Submit a scholarship.",
    sub: "Spotted a program we're missing? Tell us. Every approved submission helps thousands of applicants find funding they wouldn't have otherwise.",
    aboutLabel: "About the scholarship",
    nameLabel: "Scholarship name *",
    namePh: "e.g. Schwarzman Scholars",
    providerLabel: "Provider / institution",
    providerPh: "e.g. Tsinghua University",
    countryLabel: "Host country",
    countryPh: "e.g. China",
    urlLabel: "Official URL *",
    urlPh: "https://www.example.org/scholarship",
    coverageLabel: "Coverage type",
    coverageOpts: { full_ride: "Full ride (tuition + living)", partial: "Partial funding", tuition_only: "Tuition only", stipend: "Stipend only", other: "Other" },
    amountLabel: "Award amount (text)",
    amountPh: "e.g. Full tuition + $35,000 stipend",
    deadlineLabel: "Application deadline",
    levelsLabel: "Degree levels",
    levelsPh: "Comma-separated: bachelor, master, phd",
    fieldsLabel: "Fields of study",
    fieldsPh: "Comma-separated: any, computer-science, public-policy",
    notesLabel: "Notes for our editors",
    notesPh: "Anything else we should know — eligibility quirks, application tips, ideal candidate profile.",
    youLabel: "About you (optional)",
    yourNameLabel: "Your name",
    yourNamePh: "How should we credit you?",
    yourEmailLabel: "Your email",
    yourEmailPh: "name@example.com",
    youDesc: "Optional — but if approved we'll email you to say thanks and credit you in the editorial note.",
    submit: "Submit for review",
    submitting: "Submitting…",
    legalNote: "Submitting confirms the URL is correct and the scholarship is real. We verify before publishing.",
    successTitle: "Submitted — thank you.",
    successDesc: (name: string) => `We received "${name}" and added it to the editorial queue. Most submissions are reviewed within 72 hours. If approved, we'll add it to the database and (if you left an email) drop you a thank-you note.`,
    successCtaPrimary: "Submit another",
    successCtaSecondary: "Back to scholarships",
    duplicate: "Looks like that URL is already in our database or pending review. Thanks for thinking of us!",
    failed: "Couldn't submit. Try again, or email team@topuniconsulting.com.",
    requireName: "Scholarship name is required.",
    requireUrl: "Official URL is required.",
    invalidUrl: "Please enter a valid URL (starting with https://).",
  },
  ru: {
    docTitle: "Предложить стипендию — TopUni",
    metaDesc: "Знаете стипендию, которой нет в базе? Предложите её для редакторского обзора.",
    kicker: "Помочь сообществу",
    h1: "Предложить стипендию.",
    sub: "Заметили программу которой у нас нет? Расскажите. Каждое одобренное предложение помогает тысячам найти финансирование, о котором они не знали бы иначе.",
    aboutLabel: "О стипендии",
    nameLabel: "Название стипендии *",
    namePh: "напр. Schwarzman Scholars",
    providerLabel: "Организатор / институция",
    providerPh: "напр. Tsinghua University",
    countryLabel: "Страна",
    countryPh: "напр. Китай",
    urlLabel: "Официальная ссылка *",
    urlPh: "https://www.example.org/scholarship",
    coverageLabel: "Тип покрытия",
    coverageOpts: { full_ride: "Полное (обучение + проживание)", partial: "Частичное", tuition_only: "Только обучение", stipend: "Только стипендия", other: "Другое" },
    amountLabel: "Размер стипендии (текстом)",
    amountPh: "напр. Полное обучение + $35,000 стипендии",
    deadlineLabel: "Дедлайн подачи",
    levelsLabel: "Уровни обучения",
    levelsPh: "Через запятую: bachelor, master, phd",
    fieldsLabel: "Области обучения",
    fieldsPh: "Через запятую: any, computer-science, public-policy",
    notesLabel: "Заметки для редакторов",
    notesPh: "Что ещё стоит знать — особенности отбора, советы по подаче, портрет идеального кандидата.",
    youLabel: "О вас (необязательно)",
    yourNameLabel: "Ваше имя",
    yourNamePh: "Как вас указать?",
    yourEmailLabel: "Ваш email",
    yourEmailPh: "name@example.com",
    youDesc: "Необязательно — но если одобрим, напишем спасибо и упомянем вас в редакторской заметке.",
    submit: "Отправить на ревью",
    submitting: "Отправляем…",
    legalNote: "Отправляя, вы подтверждаете что ссылка верна и стипендия реальна. Мы проверяем перед публикацией.",
    successTitle: "Отправлено — спасибо.",
    successDesc: (name: string) => `Мы получили "${name}" и добавили в редакторскую очередь. Большинство предложений рассматриваются в течение 72 часов. Если одобрим — добавим в базу и (если вы оставили email) напишем благодарность.`,
    successCtaPrimary: "Предложить ещё",
    successCtaSecondary: "К стипендиям",
    duplicate: "Похоже эта ссылка уже в нашей базе или на ревью. Спасибо что подумали о нас!",
    failed: "Не удалось отправить. Попробуйте снова или напишите team@topuniconsulting.com.",
    requireName: "Название стипендии обязательно.",
    requireUrl: "Официальная ссылка обязательна.",
    invalidUrl: "Введите корректную ссылку (начинающуюся с https://).",
  },
} as const;

const SubmitScholarship = ({ language = "en" }: SubmitProps) => {
  const t = COPY[language];
  const navigate = useNavigate();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    scholarship_name: "",
    provider_name: "",
    host_country: "",
    official_url: "",
    coverage_type: "" as "" | "full_ride" | "partial" | "tuition_only" | "stipend" | "other",
    award_amount_text: "",
    application_deadline: "",
    target_degree_level: "",
    target_fields: "",
    notes: "",
    submitter_name: "",
    submitter_email: user?.email ?? "",
  });

  useEffect(() => {
    document.title = t.docTitle;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", t.metaDesc);
  }, [t.docTitle, t.metaDesc]);

  // Hydrate email from auth on mount
  useEffect(() => {
    if (user?.email && !form.submitter_email) {
      setForm((f) => ({ ...f, submitter_email: user.email ?? "" }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  const setF = (k: keyof typeof form) => (v: string) => setForm((s) => ({ ...s, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!form.scholarship_name.trim()) { setError(t.requireName); return; }
    if (!form.official_url.trim()) { setError(t.requireUrl); return; }
    let urlObj: URL;
    try { urlObj = new URL(form.official_url.trim()); }
    catch { setError(t.invalidUrl); return; }
    if (!/^https?:$/.test(urlObj.protocol)) { setError(t.invalidUrl); return; }

    setSubmitting(true);
    const csv = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

    const payload = {
      scholarship_name: form.scholarship_name.trim(),
      provider_name: form.provider_name.trim() || null,
      host_country: form.host_country.trim() || null,
      official_url: urlObj.toString(),
      coverage_type: form.coverage_type || null,
      award_amount_text: form.award_amount_text.trim() || null,
      application_deadline: form.application_deadline || null,
      target_degree_level: form.target_degree_level ? csv(form.target_degree_level) : null,
      target_fields: form.target_fields ? csv(form.target_fields) : null,
      notes: form.notes.trim() || null,
      submitter_name: form.submitter_name.trim() || null,
      submitter_email: form.submitter_email.trim() || null,
      submitted_by: user?.id ?? null,
    };

    const { error: insertErr } = await supabase
      .from("scholarship_submissions")
      .insert(payload);

    setSubmitting(false);
    if (insertErr) {
      // Postgres unique violation = already in queue/approved
      if (insertErr.code === "23505" || /unique|already exists/i.test(insertErr.message)) {
        setError(t.duplicate);
      } else {
        console.error("submit-scholarship", insertErr);
        setError(t.failed);
      }
      return;
    }
    setSuccess(payload.scholarship_name);
  };

  const reset = () => {
    setSuccess(null);
    setError(null);
    setForm({
      scholarship_name: "", provider_name: "", host_country: "", official_url: "",
      coverage_type: "", award_amount_text: "", application_deadline: "",
      target_degree_level: "", target_fields: "", notes: "",
      submitter_name: form.submitter_name, submitter_email: form.submitter_email,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const discoverPath = language === "ru" ? "/discover/ru" : "/discover";

  // ─── Success screen ──────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation language={language} />
        <main className="max-w-2xl mx-auto px-5 sm:px-8 py-16 sm:py-24">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/20 mb-6">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight mb-4">{t.successTitle}</h1>
            <p className="text-muted-foreground leading-relaxed mb-8 max-w-lg mx-auto">{t.successDesc(success)}</p>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <Button variant="gold" onClick={reset} className="gap-2">
                <Sparkles className="w-4 h-4" /> {t.successCtaPrimary}
              </Button>
              <Button variant="outline" onClick={() => navigate(discoverPath)} className="gap-2">
                {t.successCtaSecondary} <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        </main>
        <Footer language={language} />
      </div>
    );
  }

  // ─── Form ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <Navigation language={language} />

      <section className="bg-gradient-to-br from-primary via-primary to-primary/95 py-12 sm:py-16">
        <div className="max-w-2xl mx-auto px-5 sm:px-8">
          <p className="text-[11px] uppercase tracking-[0.22em] text-gold font-semibold mb-3">
            {language === "ru" ? "Сотрудничество" : "Partner with us"}
          </p>
          <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-primary-foreground tracking-tight leading-tight mb-3">{t.h1}</h1>
          <p className="text-primary-foreground/80 text-base sm:text-lg leading-relaxed max-w-xl">{t.sub}</p>
        </div>
      </section>

      {/* Partner-tier ask — surfaces the future-revenue path alongside
          the free submission flow. Foundations / universities / program
          providers who want to ACTIVELY promote their scholarship to
          matched students contact us directly via the email link. The
          /submit form below stays the canonical free-submission path
          for community contributors. */}
      <section className="max-w-2xl mx-auto px-5 sm:px-8 pt-8">
        <div className="rounded-2xl border border-gold/30 bg-gold/[0.05] p-5 sm:p-6">
          <p className="text-[10px] uppercase tracking-[0.22em] text-gold-dark font-semibold mb-2">
            {language === "ru" ? "Для организаций" : "For program providers"}
          </p>
          <p className="text-[15px] text-foreground/85 leading-relaxed mb-4">
            {language === "ru"
              ? "Представляете фонд, университет или образовательную программу и хотите активно продвигать стипендию подходящим студентам? Мы строим программу платного партнёрства — приоритетное размещение, персональные алерты для подходящих профилей, аналитика по охвату."
              : "Represent a foundation, university, or program and want to actively promote your scholarship to matched students? We're building a paid partnership programme — priority placement, alerts to eligible profiles, reach analytics."}
          </p>
          <a
            href="mailto:team@topuniconsulting.com?subject=TopUni%20partnership%20interest"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-gold-dark hover:underline underline-offset-4"
          >
            {language === "ru" ? "Написать нам" : "Email us"}
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>
        <p className="text-[12px] text-muted-foreground leading-relaxed mt-4 text-center">
          {language === "ru"
            ? "Не представляете организацию? Просто хотите подсказать программу — заполните форму ниже. Бесплатно, всё проходит редакторскую проверку."
            : "Not from a program? Just spotted a scholarship we're missing — fill the form below. Free, every submission gets editorial review."}
        </p>
      </section>

      <main className="max-w-2xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
          {/* About the scholarship */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-gold-dark border-gold/30">1</Badge>
              <h2 className="font-heading font-semibold tracking-tight">{t.aboutLabel}</h2>
            </div>

            <div>
              <Label>{t.nameLabel}</Label>
              <Input className="mt-1.5" required value={form.scholarship_name} onChange={(e) => setF("scholarship_name")(e.target.value)} placeholder={t.namePh} />
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>{t.providerLabel}</Label>
                <Input className="mt-1.5" value={form.provider_name} onChange={(e) => setF("provider_name")(e.target.value)} placeholder={t.providerPh} />
              </div>
              <div>
                <Label>{t.countryLabel}</Label>
                <Input className="mt-1.5" value={form.host_country} onChange={(e) => setF("host_country")(e.target.value)} placeholder={t.countryPh} />
              </div>
            </div>

            <div>
              <Label>{t.urlLabel}</Label>
              <Input className="mt-1.5" type="url" required value={form.official_url} onChange={(e) => setF("official_url")(e.target.value)} placeholder={t.urlPh} />
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>{t.coverageLabel}</Label>
                <Select value={form.coverage_type} onValueChange={(v) => setF("coverage_type")(v)}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(t.coverageOpts).map(([k, label]) => (
                      <SelectItem key={k} value={k}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t.deadlineLabel}</Label>
                <Input className="mt-1.5" type="date" value={form.application_deadline} onChange={(e) => setF("application_deadline")(e.target.value)} />
              </div>
            </div>

            <div>
              <Label>{t.amountLabel}</Label>
              <Input className="mt-1.5" value={form.award_amount_text} onChange={(e) => setF("award_amount_text")(e.target.value)} placeholder={t.amountPh} />
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>{t.levelsLabel}</Label>
                <Input className="mt-1.5" value={form.target_degree_level} onChange={(e) => setF("target_degree_level")(e.target.value)} placeholder={t.levelsPh} />
              </div>
              <div>
                <Label>{t.fieldsLabel}</Label>
                <Input className="mt-1.5" value={form.target_fields} onChange={(e) => setF("target_fields")(e.target.value)} placeholder={t.fieldsPh} />
              </div>
            </div>

            <div>
              <Label>{t.notesLabel}</Label>
              <Textarea className="mt-1.5 resize-none" rows={3} value={form.notes} onChange={(e) => setF("notes")(e.target.value)} placeholder={t.notesPh} />
            </div>
          </Card>

          {/* About you */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-gold-dark border-gold/30">2</Badge>
              <h2 className="font-heading font-semibold tracking-tight">{t.youLabel}</h2>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">{t.youDesc}</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>{t.yourNameLabel}</Label>
                <Input className="mt-1.5" value={form.submitter_name} onChange={(e) => setF("submitter_name")(e.target.value)} placeholder={t.yourNamePh} />
              </div>
              <div>
                <Label>{t.yourEmailLabel}</Label>
                <Input className="mt-1.5" type="email" value={form.submitter_email} onChange={(e) => setF("submitter_email")(e.target.value)} placeholder={t.yourEmailPh} />
              </div>
            </div>
          </Card>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-[11px] text-muted-foreground max-w-xs">{t.legalNote}</p>
            <Button type="submit" variant="gold" disabled={submitting} className="gap-1.5">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {submitting ? t.submitting : t.submit}
            </Button>
          </div>
        </motion.form>
      </main>

      <Footer language={language} />
    </div>
  );
};

export default SubmitScholarship;
