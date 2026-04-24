import { useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Calendar, DollarSign, FileText, GraduationCap, Globe,
  CheckCircle2, AlertTriangle, ExternalLink, Plane, Briefcase, Award
} from "lucide-react";
import { getCountryGuide } from "@/data/countryGuides";

interface Props {
  language?: "en" | "ru";
}

const CountryGuide = ({ language = "en" }: Props) => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const isRu = language === "ru";
  const guide = slug ? getCountryGuide(slug) : null;

  useEffect(() => {
    if (!guide) return;
    const name = isRu ? guide.countryRu : guide.country;
    document.title = isRu
      ? `Учёба в ${name} — гайд для студентов из ЦА | Top Uni`
      : `Study in ${name} — Guide for Central Asian Students | Top Uni`;
    const desc = isRu ? guide.taglineRu : guide.tagline;
    let m = document.querySelector('meta[name="description"]');
    if (!m) {
      m = document.createElement("meta");
      m.setAttribute("name", "description");
      document.head.appendChild(m);
    }
    m.setAttribute("content", desc);
  }, [guide, isRu]);

  if (!guide) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navigation language={language} />
        <main className="flex-1 max-w-3xl mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-heading font-semibold mb-3">
            {isRu ? "Гайд не найден" : "Guide not found"}
          </h1>
          <Button onClick={() => navigate(isRu ? "/guides/ru" : "/guides")}>
            {isRu ? "К списку гайдов" : "Back to guides"}
          </Button>
        </main>
        <Footer language={language} />
      </div>
    );
  }

  const indexPath = isRu ? "/blog/ru" : "/blog";

  const Section = ({
    icon: Icon, title, children,
  }: { icon: any; title: string; children: React.ReactNode }) => (
    <section className="py-7 border-t border-border first:border-t-0">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-gold" />
        <h2 className="font-heading text-xl font-semibold text-foreground">{title}</h2>
      </div>
      {children}
    </section>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation language={language} />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-primary text-primary-foreground border-b border-gold/20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
            <Link
              to={indexPath}
              className="inline-flex items-center gap-1 text-xs text-primary-foreground/70 hover:text-gold mb-5"
            >
              <ArrowLeft className="w-3 h-3" />
              {isRu ? "Назад к блогу" : "Back to Blog"}
            </Link>
            <div className="flex items-center gap-4 mb-4">
              <span className="text-5xl">{guide.flag}</span>
              <div>
                <h1 className="font-heading text-3xl sm:text-4xl font-semibold">
                  {isRu ? `Учёба в ${guide.countryRu}` : `Study in ${guide.country}`}
                </h1>
                <p className="text-sm text-primary-foreground/70 mt-1">
                  {isRu ? guide.taglineRu : guide.tagline}
                </p>
              </div>
            </div>
            <p className="text-base text-primary-foreground/85 leading-relaxed max-w-3xl">
              {isRu ? guide.introRu : guide.intro}
            </p>
          </div>
        </section>

        {/* Quick facts strip */}
        <section className="bg-card/40 border-b border-border">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <p className="text-muted-foreground uppercase tracking-wider mb-1">
                {isRu ? "Обучение" : "Tuition"}
              </p>
              <p className="font-medium text-foreground">{guide.tuitionRangeUsd}</p>
            </div>
            <div>
              <p className="text-muted-foreground uppercase tracking-wider mb-1">
                {isRu ? "Жизнь" : "Living"}
              </p>
              <p className="font-medium text-foreground">{guide.livingRangeUsd}</p>
            </div>
            <div>
              <p className="text-muted-foreground uppercase tracking-wider mb-1">
                {isRu ? "Виза" : "Visa"}
              </p>
              <p className="font-medium text-foreground">{guide.visaName}</p>
            </div>
            <div>
              <p className="text-muted-foreground uppercase tracking-wider mb-1">
                {isRu ? "Язык" : "Language"}
              </p>
              <p className="font-medium text-foreground">
                {guide.languageOfInstruction.join(", ")}
              </p>
            </div>
          </div>
        </section>

        {/* Body */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-10">
          <Section icon={Calendar} title={isRu ? "Сроки и приём" : "Intakes & Deadlines"}>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <Card className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  {isRu ? "Приём" : "Intakes"}
                </p>
                <ul className="space-y-1 text-foreground">
                  {(isRu ? guide.intakesRu : guide.intakes).map((i) => (
                    <li key={i}>• {i}</li>
                  ))}
                </ul>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  {isRu ? "Типичные дедлайны" : "Typical deadlines"}
                </p>
                <p className="text-foreground"><strong>{isRu ? "Бакалавриат: " : "Undergrad: "}</strong>{guide.typicalDeadlines.undergrad}</p>
                <p className="text-foreground mt-1"><strong>{isRu ? "Магистратура: " : "Postgrad: "}</strong>{guide.typicalDeadlines.postgrad}</p>
              </Card>
            </div>
          </Section>

          <Section icon={FileText} title={isRu ? "Подача заявки" : "Application Process"}>
            <p className="text-sm text-foreground/85 leading-relaxed mb-4">
              {isRu ? guide.applicationOverviewRu : guide.applicationOverview}
            </p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
              {isRu ? "Тестовые требования" : "Test requirements"}
            </p>
            <div className="space-y-1.5">
              {guide.testRequirements.map((t) => (
                <div key={t.name} className="flex flex-wrap items-baseline gap-x-2 text-sm">
                  <span className="font-medium text-foreground">{t.name}</span>
                  <Badge variant="outline" className="text-xs font-normal">{t.minScore}</Badge>
                  {t.notes && <span className="text-xs text-muted-foreground">— {t.notes}</span>}
                </div>
              ))}
            </div>
          </Section>

          <Section icon={DollarSign} title={isRu ? "Стоимость (USD/год)" : "Costs (USD/year)"}>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">{isRu ? "Статья" : "Item"}</th>
                    <th className="text-right px-4 py-2 font-medium">USD</th>
                  </tr>
                </thead>
                <tbody>
                  {guide.costs.map((c) => (
                    <tr key={c.label} className="border-t border-border">
                      <td className="px-4 py-2.5 text-foreground">{isRu ? c.labelRu : c.label}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-foreground">${c.rangeUsd}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {isRu
                ? "Диапазоны актуальны на момент публикации; уточняйте на сайтах вузов."
                : "Ranges are current at time of publication; verify on university websites."}
            </p>
          </Section>

          <Section icon={Plane} title={isRu ? "Виза: пошагово" : "Visa: Step by Step"}>
            <div className="grid sm:grid-cols-3 gap-3 text-xs mb-4">
              <Card className="p-3">
                <p className="text-muted-foreground uppercase tracking-wider mb-1">{isRu ? "Тип" : "Type"}</p>
                <p className="font-medium text-foreground">{guide.visaName}</p>
              </Card>
              <Card className="p-3">
                <p className="text-muted-foreground uppercase tracking-wider mb-1">{isRu ? "Срок" : "Processing"}</p>
                <p className="font-medium text-foreground">{guide.visaProcessingWeeks}</p>
              </Card>
              <Card className="p-3">
                <p className="text-muted-foreground uppercase tracking-wider mb-1">{isRu ? "Финансы" : "Funds"}</p>
                <p className="font-medium text-foreground">{guide.proofOfFundsUsd}</p>
              </Card>
            </div>
            <ol className="space-y-3">
              {guide.visaSteps.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-gold/15 text-gold text-xs font-semibold flex items-center justify-center mt-0.5">{i + 1}</span>
                  <div>
                    <p className="font-medium text-foreground text-sm">{isRu ? s.stepRu : s.step}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{isRu ? s.detailRu : s.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Section>

          <Section icon={Briefcase} title={isRu ? "Работа во время и после учёбы" : "Work During & After Studies"}>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <Card className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                  {isRu ? "Во время учёбы" : "During studies"}
                </p>
                <p className="text-foreground/85">{isRu ? guide.workRightsRu : guide.workRights}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                  {isRu ? "После выпуска" : "Post-graduation"}
                </p>
                <p className="text-foreground/85">{isRu ? guide.postStudyWorkRu : guide.postStudyWork}</p>
              </Card>
            </div>
          </Section>

          <Section icon={Award} title={isRu ? "Стипендии (открытые для иностранцев)" : "Scholarships (Open to Internationals)"}>
            <div className="space-y-3">
              {guide.scholarships.map((s) => (
                <Card key={s.name} className="p-4">
                  <div className="flex flex-wrap items-baseline gap-x-2 mb-1">
                    <h3 className="font-medium text-foreground">{s.name}</h3>
                    {s.deadline && (
                      <Badge variant="outline" className="text-[10px] font-normal">
                        {isRu ? "Дедлайн: " : "Deadline: "}{s.deadline}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground"><strong>{isRu ? "Покрытие: " : "Coverage: "}</strong>{s.coverage}</p>
                  <p className="text-xs text-muted-foreground mt-0.5"><strong>{isRu ? "Право: " : "Eligibility: "}</strong>{s.eligibility}</p>
                </Card>
              ))}
            </div>
          </Section>

          <Section icon={GraduationCap} title={isRu ? "Честная оценка" : "Honest Assessment"}>
            <div className="grid sm:grid-cols-2 gap-3">
              <Card className="p-4 border-green-500/30 bg-green-500/5">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <h3 className="font-medium text-foreground text-sm">{isRu ? "Плюсы для ЦА" : "Pros for Central Asians"}</h3>
                </div>
                <ul className="space-y-1.5 text-xs text-foreground/85">
                  {(isRu ? guide.prosForCentralAsiansRu : guide.prosForCentralAsians).map((p, i) => (
                    <li key={i}>• {p}</li>
                  ))}
                </ul>
              </Card>
              <Card className="p-4 border-amber-500/30 bg-amber-500/5">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <h3 className="font-medium text-foreground text-sm">{isRu ? "Сложности" : "Challenges"}</h3>
                </div>
                <ul className="space-y-1.5 text-xs text-foreground/85">
                  {(isRu ? guide.challengesRu : guide.challenges).map((c, i) => (
                    <li key={i}>• {c}</li>
                  ))}
                </ul>
              </Card>
            </div>
          </Section>

          <Section icon={Globe} title={isRu ? "Источники" : "Sources"}>
            <ul className="space-y-1.5 text-sm">
              {guide.sources.map((s) => (
                <li key={s.url}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-gold hover:underline underline-offset-2"
                  >
                    {s.label} <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground mt-3">
              {isRu
                ? "Мы регулярно сверяем данные с официальными источниками. Если вы заметили устаревшую информацию — напишите нам."
                : "We regularly cross-check data against official sources. If you spot outdated info, let us know."}
            </p>
          </Section>

          {/* Soft CTA — async-content focused, not a hard sell */}
          <Separator className="my-2" />
          <div className="mt-6 p-5 rounded-lg border border-gold/20 bg-gold/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="font-medium text-foreground">
                {isRu ? `Готовы строить план для ${guide.countryRu}?` : `Ready to build a plan for ${guide.country}?`}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {isRu
                  ? "Используйте наш AI-инструмент для бесплатного первичного анализа вашего профиля."
                  : "Use our AI tool for a free first-pass analysis of your profile."}
              </p>
            </div>
            <Link to={isRu ? "/topuni-ai/ru" : "/topuni-ai"}>
              <Button variant="outline" size="sm" className="border-gold/40 text-gold hover:bg-gold/10">
                {isRu ? "Открыть TopUni AI" : "Open TopUni AI"}
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <Footer language={language} />
    </div>
  );
};

export default CountryGuide;
