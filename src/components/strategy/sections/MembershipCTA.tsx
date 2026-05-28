import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Eyebrow } from "../primitives";
import type { Language } from "../types";
import { t } from "../types";

interface Props {
  language: Language;
}

/* CTA copy rotation pool. Single CTA visible at a time — we pick one
 * variant per mount. Variants are deliberately distinct in entry angle
 * so the same student sees a slightly different framing on a return
 * visit. Eligible for A/B-test instrumentation later; not now. */
interface CtaCopy {
  eyebrow: { en: string; ru: string };
  headline: { en: string; ru: string };
  body: { en: string; ru: string };
}

const CTA_POOL: CtaCopy[] = [
  {
    eyebrow: { en: "This is only the beginning", ru: "Это только начало" },
    headline: {
      en: "Your snapshot is the diagnosis. The cohort is the plan.",
      ru: "Ваш отчёт — это диагноз. Cohort — это план.",
    },
    body: {
      en: "Inside the cohort we build your actual list, line up deadlines, and cut the scholarships that don't fit your profile.",
      ru: "В cohort мы собираем ваш реальный список, расставляем дедлайны и отсекаем стипендии, которые не подходят вашему профилю.",
    },
  },
  {
    eyebrow: { en: "Want help turning this into a real plan?", ru: "Хотите превратить это в реальный план?" },
    headline: {
      en: "Join the Top Uni Scholarship Cohort.",
      ru: "Присоединяйтесь к Top Uni Scholarship Cohort.",
    },
    body: {
      en: "Monthly strategy workshop, office hours with our team, Discover database access, application templates, and curated scholarship opportunities.",
      ru: "Ежемесячные стратегические воркшопы, office hours с командой, доступ к Discover, шаблоны заявок и подобранные стипендии.",
    },
  },
  {
    eyebrow: { en: "Don't apply blind", ru: "Не подавайте вслепую" },
    headline: {
      en: "Stop guessing which scholarships you actually have a shot at.",
      ru: "Хватит гадать, где у вас реально есть шанс.",
    },
    body: {
      en: "Members get monthly strategy workshops, office hours, the Discover database, and feedback on the application materials before they're submitted.",
      ru: "Участники получают ежемесячные стратегические воркшопы, office hours, доступ к Discover и фидбек на материалы до подачи.",
    },
  },
];

export const MembershipCTA = ({ language }: Props) => {
  const [foundingLeft, setFoundingLeft] = useState<number | null>(null);
  const [foundingCap, setFoundingCap] = useState<number>(50);

  useEffect(() => {
    supabase.from("founding_member_counter")
      .select("claimed_count, cap")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setFoundingLeft(Math.max(0, (data.cap as number) - (data.claimed_count as number)));
          setFoundingCap(data.cap as number);
        }
      });
  }, []);

  // Pick one variant per mount. Stable for the lifetime of this render
  // but rotates on refresh / return-visit.
  const copy = useMemo(() => CTA_POOL[Math.floor(Math.random() * CTA_POOL.length)], []);

  const stillOpen = foundingLeft != null && foundingLeft > 0;
  const priceLine = stillOpen
    ? t(language,
        `$20 / month for the first ${foundingCap}. Regular price $40 / month.`,
        `$20 в месяц для первых ${foundingCap} участников. Обычная цена — $40 в месяц.`)
    : t(language, "$40 / month.", "$40 в месяц.");

  const ctaLabel = stillOpen
    ? t(language, "Claim Founding Price", "Получить цену founding")
    : t(language, "Join Founding Cohort", "Вступить в Founding Cohort");

  const seeIncludedLabel = t(language, "View what's included", "Что входит");

  return (
    <section className="mt-2 mb-4 pt-6 border-t border-border">
      <div className="rounded-3xl border border-gold/40 bg-gold/[0.05] p-6 sm:p-8">
        <div className="mb-2">
          <Eyebrow>{copy.eyebrow[language]}</Eyebrow>
        </div>
        <h2 className="font-heading text-[20px] sm:text-[24px] font-bold leading-[1.2] tracking-tight text-foreground m-0 mb-3">
          {copy.headline[language]}
        </h2>
        <p className="text-[14.5px] leading-[1.55] text-foreground/75 m-0 mb-3">
          {copy.body[language]}
        </p>
        <p className="text-[13px] leading-[1.5] text-foreground m-0 mb-3">
          <span className="font-bold">{priceLine}</span>
        </p>
        {stillOpen && (
          <p className="text-[12.5px] text-gold-dark font-bold m-0 mb-5 uppercase tracking-wider">
            {language === "ru"
              ? `Осталось ${foundingLeft} из ${foundingCap} мест в founding cohort.`
              : `${foundingLeft} of ${foundingCap} founding spots left.`}
          </p>
        )}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
          <Button variant="gold" asChild className="gap-1.5">
            <Link to={language === "ru" ? "/pricing/ru#founding-20" : "/pricing#founding-20"}>
              {ctaLabel}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
          <Button variant="ghost" asChild className="gap-1.5">
            <Link to={language === "ru" ? "/academy/ru" : "/academy"}>
              {seeIncludedLabel}
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};
