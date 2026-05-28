import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Language } from "../types";
import { t } from "../types";

interface Props {
  language: Language;
}

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

  const headline = t(
    language,
    "Join the Top Uni Scholarship Cohort.",
    "Присоединяйтесь к Top Uni Scholarship Cohort.",
  );
  const subline = t(
    language,
    "Monthly strategy workshops, office hours, Discover database access, application templates, and curated scholarship opportunities — for students applying abroad with scholarships.",
    "Ежемесячные стратегические воркшопы, office hours, доступ к Discover, шаблоны заявок и подобранные стипендии — для студентов, поступающих за рубеж со стипендией.",
  );
  const priceLine = t(language, "$40 / month.", "$40 в месяц.");
  const ctaLabel = t(language, "Join Founding Cohort", "Вступить в Founding Cohort");
  const seeIncludedLabel = t(language, "View what's included", "Что входит");

  return (
    <section className="mt-2 mb-4 pt-6 border-t border-border">
      <div className="rounded-3xl border border-gold/40 bg-gold/[0.05] p-6 sm:p-8">
        <h2 className="font-heading text-[20px] sm:text-[24px] font-bold leading-[1.2] tracking-tight text-foreground m-0 mb-2">
          {headline}
        </h2>
        <p className="text-[14.5px] leading-[1.55] text-foreground/75 m-0 mb-3">
          {subline}{" "}
          <span className="font-bold text-foreground">{priceLine}</span>
        </p>
        {foundingLeft != null && foundingLeft > 0 && (
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
