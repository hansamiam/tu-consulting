import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "../primitives";
import type { Language } from "../types";
import { t } from "../types";

interface Props {
  language: Language;
}

/* CTA copy rotation pool. Single CTA visible at a time — we pick one
 * variant per mount. Variants stay deliberately offer-AGNOSTIC for
 * now: per `feedback_founding_20_dead.md` the founding-20 framing is
 * killed and the replacement membership tier is TBD. These variants
 * route to /pricing (where the new offer will eventually live) and
 * speak to outcome ("turn this into a real plan") rather than to a
 * specific price or seat count. Update once Samuel locks the new
 * offer — see `feedback_founding_20_dead.md`. */
interface CtaCopy {
  eyebrow: { en: string; ru: string };
  headline: { en: string; ru: string };
  body: { en: string; ru: string };
}

const CTA_POOL: CtaCopy[] = [
  {
    eyebrow: { en: "This is only the beginning", ru: "Это только начало" },
    headline: {
      en: "Your snapshot is the diagnosis. The plan is the next step.",
      ru: "Ваш отчёт — это диагноз. Дальше нужен план.",
    },
    body: {
      en: "Top Uni helps international students build their actual application list, line up deadlines, and cut the scholarships that don't fit their profile.",
      ru: "Top Uni помогает international-студентам собирать реальный список заявок, расставлять дедлайны и отсекать стипендии, которые не подходят профилю.",
    },
  },
  {
    eyebrow: { en: "Don't apply blind", ru: "Не подавайте вслепую" },
    headline: {
      en: "Stop guessing which scholarships you actually have a shot at.",
      ru: "Хватит гадать, где у вас реально есть шанс.",
    },
    body: {
      en: "We work with students applying abroad on scholarships — not the Crimson elite track. Strategy workshops, office hours, and curated scholarship opportunities.",
      ru: "Мы работаем со студентами, которые поступают за рубеж со стипендией — это не Crimson elite track. Воркшопы по стратегии, office hours, подобранные стипендии.",
    },
  },
  {
    eyebrow: { en: "Diagnosis isn't a plan", ru: "Диагноз — это ещё не план" },
    headline: {
      en: "Want help turning this into your actual application plan?",
      ru: "Хотите превратить это в свой реальный план поступления?",
    },
    body: {
      en: "Top Uni works with students from countries the elite-track playbook ignores. We help you find the lanes you can actually win.",
      ru: "Top Uni работает со студентами из стран, которые elite-track playbook игнорирует. Мы помогаем найти дорожки, на которых вы реально можете выиграть.",
    },
  },
];

export const MembershipCTA = ({ language }: Props) => {
  // Pick one variant per mount. Stable for the lifetime of this render
  // but rotates on refresh / return-visit.
  const copy = useMemo(() => CTA_POOL[Math.floor(Math.random() * CTA_POOL.length)], []);

  const ctaLabel = t(language, "See what we offer", "Что мы предлагаем");
  const secondaryLabel = t(language, "Browse the Academy", "Перейти в Академию");

  return (
    <section className="mt-2 mb-4 pt-6 border-t border-border">
      <div className="rounded-3xl border border-gold/40 bg-gold/[0.05] p-6 sm:p-8">
        <div className="mb-2">
          <Eyebrow>{copy.eyebrow[language]}</Eyebrow>
        </div>
        <h2 className="font-heading text-[20px] sm:text-[24px] font-bold leading-[1.2] tracking-tight text-foreground m-0 mb-3">
          {copy.headline[language]}
        </h2>
        <p className="text-[14.5px] leading-[1.55] text-foreground/75 m-0 mb-5">
          {copy.body[language]}
        </p>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
          <Button variant="gold" asChild className="gap-1.5">
            <Link to={language === "ru" ? "/pricing/ru" : "/pricing"}>
              {ctaLabel}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
          <Button variant="ghost" asChild className="gap-1.5">
            <Link to={language === "ru" ? "/academy/ru" : "/academy"}>
              {secondaryLabel}
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};
