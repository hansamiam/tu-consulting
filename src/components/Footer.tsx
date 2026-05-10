import { Link } from "react-router-dom";

interface FooterProps {
  language: "en" | "ru";
  variant?: "light" | "dark";
}

// Footer surfaces only what's NOT in primary nav (or what doubles as a
// conversion driver). Workspace was removed because it lives in primary
// nav; Pricing now also lives in footer-only since we trimmed it from
// primary nav. Partner-with-us hidden 2026-05-09 — kept the route + page
// for direct visits but pulled the public link surface until the funnel
// is ready to push.
const FOOTER_LINKS_EN = [
  { to: "/team",      label: "Team" },
  { to: "/pricing",   label: "Pricing" },
  { to: "/blog",      label: "Journal" },
];
const FOOTER_LINKS_RU = [
  { to: "/team/ru",      label: "Команда" },
  { to: "/pricing/ru",   label: "Цены" },
  { to: "/blog",         label: "Блог" },
];

// "All funders" link removed from public navigation per user direction
// (2026-05-09) — not essential right now. The /scholarships/funders
// route + ProviderHub code still exist and remain crawlable via
// sitemap.xml so SEO traffic still lands. Restore the link here when
// the funders surface is ready to push to all visitors.

/* Default = "dark". Every page now gets the navy slab the home page
 * uses, so the surface feels uniform. The component renders its own
 * bg-primary block when isDark, so callers don't need to wrap in a
 * navy <footer>. Pass variant="light" only when the footer must read
 * cream (e.g. modal/embed contexts). */
export const Footer = ({ language, variant = "dark" }: FooterProps) => {
  const text = {
    en: {
      legal: "Legal",
      explore: "Explore",
      privacyPolicy: "Privacy Policy",
      publicOffer: "Public Offer",
      refundPolicy: "Refund Policy",
      paymentInfo: "Payment by Card",
      tagline: "AI-driven scholarship & admissions strategy",
      mission: "On a mission to disrupt old-school admissions gatekeeping",
      copyright: `© ${new Date().getFullYear()} TopUni · All rights reserved`,
    },
    ru: {
      legal: "Правовая информация",
      explore: "Разделы",
      privacyPolicy: "Политика конфиденциальности",
      publicOffer: "Публичная оферта",
      refundPolicy: "Правила возврата",
      paymentInfo: "Оплата банковской картой",
      tagline: "AI-стратегия для стипендий и поступлений",
      mission: "Наша миссия — разрушить устаревшее посредничество в поступлении",
      copyright: `© ${new Date().getFullYear()} TopUni · Все права защищены`,
    },
  };

  const t = text[language];
  const langSuffix = language === "ru" ? "/ru" : "";
  const links = language === "ru" ? FOOTER_LINKS_RU : FOOTER_LINKS_EN;

  const isDark = variant === "dark";
  const textColor = isDark ? "text-primary-foreground/55" : "text-muted-foreground";
  const headingColor = isDark ? "text-primary-foreground/70" : "text-foreground";
  const linkColor = isDark ? "text-primary-foreground/80 hover:text-gold-light" : "text-foreground hover:text-gold-dark";
  const accentLink = isDark ? "text-gold hover:text-gold-light" : "text-accent hover:text-accent/80";
  const borderColor = isDark ? "border-gold/20" : "border-border/50";
  const sepColor = isDark ? "text-primary-foreground/25" : "text-muted-foreground/40";

  return (
    <footer className={`${isDark ? "bg-primary" : ""} ${textColor} text-xs sm:text-sm px-4`}>
      {/* Two-column section: tagline + single explore list. Down from
          three columns when we had Product + Company duplicating top-nav
          surfaces. */}
      <div className="max-w-5xl mx-auto py-8 sm:py-10">
        <div className="grid grid-cols-1 sm:grid-cols-[2fr,1fr] gap-8">
          <div className="space-y-3">
            <p className={`${isDark ? "text-primary-foreground" : "text-foreground"} font-heading text-base font-bold tracking-tight`}>
              TopUni
            </p>
            <p className={`${textColor} leading-relaxed text-xs sm:text-sm max-w-md`}>
              {t.tagline}
            </p>
            {/* Mission line — emotional resonance counterweight to the
                product tagline above. The product line names what we
                are; the mission line names what we're against. The two
                together do the "we're the good guys vs old-school
                gatekeepers" framing without overplaying it. */}
            <p className={`${textColor} leading-relaxed text-xs sm:text-sm max-w-md italic opacity-90`}>
              {t.mission}
            </p>
            <p>
              <a
                href="mailto:team@topuniconsulting.com"
                className={`${accentLink} transition-colors text-xs break-all`}
              >
                team@topuniconsulting.com
              </a>
            </p>
          </div>

          <div>
            <h4 className={`${headingColor} font-semibold text-[11px] uppercase tracking-[0.18em] mb-3`}>
              {t.explore}
            </h4>
            <ul className="space-y-1.5 text-xs">
              {links.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className={`${linkColor} transition-colors`}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Legal strip + copyright */}
      <div className={`max-w-5xl mx-auto border-t ${borderColor} pt-4 pb-6`}>
        <div className="flex flex-wrap items-center justify-between gap-3 text-[11px]">
          <p className={textColor}>{t.copyright}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <Link to={`/privacy-policy${langSuffix}`} className={`${accentLink} transition-colors`}>
              {t.privacyPolicy}
            </Link>
            <span className={sepColor}>·</span>
            <Link to={`/public-offer${langSuffix}`} className={`${accentLink} transition-colors`}>
              {t.publicOffer}
            </Link>
            <span className={sepColor}>·</span>
            <Link to={`/refund-policy${langSuffix}`} className={`${accentLink} transition-colors`}>
              {t.refundPolicy}
            </Link>
            <span className={sepColor}>·</span>
            <Link to={`/payment-info${langSuffix}`} className={`${accentLink} transition-colors`}>
              {t.paymentInfo}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
