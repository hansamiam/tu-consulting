// FinalCTA — closing card at the bottom of the strategy report magazine.
// Headline uses the max-scenario total from extract-brief-data's
// CombinedFundingSection to anchor a personalized money number, then
// drives the user to Discover with a single strong CTA. Soft-fails when
// no funding data is available (no headline number — generic CTA).

import { CombinedFundingChart } from "@/components/brief/CombinedFundingChart";
import { ArrowRight } from "lucide-react";
import type { CombinedFundingSection } from "@/types/briefStructured";

const fmtMoney = (v: number) =>
  v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `$${Math.round(v / 1000)}K` : `$${v}`;

interface Props {
  combinedFunding?: CombinedFundingSection | null;
  onOpenDiscover?: () => void;
  href?: string;
  lang: "en" | "ru";
}

export const FinalCTA = ({ combinedFunding, onOpenDiscover, href = "/discover", lang }: Props) => {
  const t = (en: string, ru: string) => (lang === "ru" ? ru : en);
  const maxTotal = combinedFunding?.scenarios?.length
    ? Math.max(...combinedFunding.scenarios.map((s) => s.total_usd))
    : null;

  const headline = maxTotal
    ? t(`${fmtMoney(maxTotal)} in funding waiting for you.`, `${fmtMoney(maxTotal)} в стипендиях ждёт вас.`)
    : t("Your matched scholarships are in Discover.", "Ваши подходящие стипендии — в Discover.");

  const sub = maxTotal
    ? t(
        "That's the high end of what your profile could pull together if you stack your shortlist right.",
        "Это потолок того, что ваш профиль может собрать при правильной комбинации стипендий.",
      )
    : t(
        "Browse the curated catalog filtered to your fit.",
        "Откройте подобранный каталог, отфильтрованный под ваш профиль.",
      );

  return (
    <section className="mt-12 mb-8" data-print-section>
      <div className="rounded-2xl border border-border bg-gradient-to-br from-card to-muted/40 p-6 sm:p-10 space-y-6">
        <div className="space-y-2 text-center sm:text-left">
          <p className="text-[11px] uppercase tracking-[0.22em] text-gold-dark font-semibold">
            {t("Open Discover", "Откройте Discover")}
          </p>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold leading-tight tracking-tight">
            {headline}
          </h2>
          <p className="text-sm text-muted-foreground leading-snug max-w-xl">{sub}</p>
        </div>

        {/* Compact chart — only renders if we have real scenarios. */}
        {combinedFunding && combinedFunding.scenarios && combinedFunding.scenarios.length > 0 && (
          <div className="border-t border-border/60 pt-6">
            <CombinedFundingChart data={combinedFunding} isRu={lang === "ru"} />
          </div>
        )}

        <div className="flex justify-center sm:justify-start">
          <button
            type="button"
            onClick={() => {
              if (onOpenDiscover) onOpenDiscover();
              else window.location.href = href;
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-opacity"
            data-print-hide
          >
            {t("Open Discover", "Перейти в Discover")}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default FinalCTA;
