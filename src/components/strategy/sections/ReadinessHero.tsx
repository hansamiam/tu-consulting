// v7 — Headline only. Readiness Score moved up into the Masthead's
// top-right (per Samuel: "not after the bolded stuff"). The headline
// is the next thing the eye lands on.
//
// Type weight + size dropped: was 21px bold, now 18px medium. Lets
// the prose read like a magazine intro, not a SaaS hero.

import type { Language } from "../types";
import { t } from "../types";

interface Props {
  headline: string;
  language: Language;
}

export const ReadinessHero = ({ headline, language }: Props) => {
  return (
    <section className="mb-4">
      <h1 className="font-heading text-[17px] sm:text-[19px] font-semibold leading-[1.4] tracking-tight text-foreground m-0">
        {headline || t(language, "Your strategy is ready.", "Ваша стратегия готова.")}
      </h1>
    </section>
  );
};
