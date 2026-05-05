import { Link } from "react-router-dom";

interface FooterProps {
  language: "en" | "ru";
  variant?: "light" | "dark";
}

// Round-19 footer cleanup: consolidated to one short column. Names
// match the top-nav exactly so visitors don't read two different
// labels for the same surface (no more "AI strategy brief" vs
// "TopUni AI", no more "Discover scholarships" vs "Discover"). We
// don't repeat surfaces that are already in the top nav (TopUni AI,
// Discover, Academy) — top nav is the navigation primary; the
// footer is for surfaces NOT in top nav, plus Pricing because
// it's the conversion driver and worth two entry points.
//
// Refer-a-friend retired from footer — virality lives where it
// belongs (Workspace header, Discover sidebar engagement-gated chip,
// post-brief moment). Footer link was anti-pattern: people who
// scroll to footers aren't in the share-with-friends headspace.
//
// Submit-a-scholarship → "Partner with us": dual ask of free
// submissions + future paid-promotion / featured-listing
// partnerships. Same /submit route for now; page copy expands.
const FOOTER_LINKS_EN = [
  { to: "/pipeline",  label: "Workspace" },
  { to: "/team",      label: "Team" },
  { to: "/pricing",   label: "Pricing" },
  { to: "/blog",      label: "Journal" },
  { to: "/submit",    label: "Partner with us" },
];
const FOOTER_LINKS_RU = [
  { to: "/pipeline/ru",  label: "Рабочая зона" },
  { to: "/team/ru",      label: "Команда" },
  { to: "/pricing/ru",   label: "Цены" },
  { to: "/blog/ru",      label: "Журнал" },
  { to: "/submit/ru",    label: "Сотрудничество" },
];

/* Default to "light" because most pages render the footer directly on
 * the cream page background. Pages that want a navy slab (Index +
 * IndexRu) wrap the Footer in a `<footer className="bg-primary">` block
 * AND pass variant="dark" explicitly. */
export const Footer = ({ language, variant = "light" }: FooterProps) => {
  const text = {
    en: {
      legal: "Legal",
      explore: "Explore",
      privacyPolicy: "Privacy Policy",
      publicOffer: "Public Offer",
      refundPolicy: "Refund Policy",
      paymentInfo: "Payment by Card",
      tagline: "AI-driven admissions strategy, alumni-led, built to be accessible. Plan your education, your funding, and your career — without the traditional consulting price tag.",
      copyright: `© ${new Date().getFullYear()} TopUni · All rights reserved`,
    },
    ru: {
      legal: "Правовая информация",
      explore: "Разделы",
      privacyPolicy: "Политика конфиденциальности",
      publicOffer: "Публичная оферта",
      refundPolicy: "Правила возврата",
      paymentInfo: "Оплата банковской картой",
      tagline: "AI-стратегия поступления — выпускники Yale, Cambridge, Harvard и data-driven подход. Доступно. Образование, финансирование, карьера — без цен традиционного консалтинга.",
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
    <footer className={`${textColor} text-xs sm:text-sm px-4`}>
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
