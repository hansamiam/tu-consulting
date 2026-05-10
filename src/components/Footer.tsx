import { Link } from "react-router-dom";
import { Instagram } from "lucide-react";

interface FooterProps {
  language: "en" | "ru";
  variant?: "light" | "dark";
}

const INSTAGRAM_URL = "https://www.instagram.com/top_uni_consulting/";
const INSTAGRAM_HANDLE = "@top_uni_consulting";

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
    // Centered single-column layout — mirrors the home page footer's
    // restraint. Pre-fix the footer was a 2-column grid (left cluster
    // + right "Explore" list) which read fine on home where it was
    // wrapped by the Instagram-icon hero block, but on every other
    // page it stacked left-aligned and felt off-balance vs the
    // centered home version. One layout, centered, used everywhere.
    // Mission line cut 2026-05-10 — was added in the prior pass but
    // user opted to remove it for restraint.
    <footer className={`${isDark ? "bg-primary" : ""} ${textColor} text-xs sm:text-sm px-4`}>
      <div className="max-w-3xl mx-auto py-8 sm:py-10 text-center space-y-4">
        <p className={`${isDark ? "text-primary-foreground" : "text-foreground"} font-heading text-base font-bold tracking-tight`}>
          TopUni
        </p>
        {/* Tagline — bumped from text-xs/sm to text-sm/base + a touch
            more weight so the line reads cleanly in the navy band.
            Pre-fix the muted/55 opacity at xs sat low against the
            navy bg and felt squinty. */}
        <p className={`${isDark ? "text-primary-foreground/80" : "text-foreground/75"} leading-relaxed text-sm sm:text-[15px] font-medium max-w-md mx-auto`}>
          {t.tagline}
        </p>
        {/* Instagram follow chip — surfaced site-wide 2026-05-10. Pre-fix
            this lived only on the home page wrapped around the Footer
            component, so every other page lost the social signal entirely.
            Placed between tagline and links so it reads as a personal
            "follow us" affordance rather than tucked away in legal chrome.
            Gold pill on dark backgrounds, gold-on-cream on light. Hover
            adds a subtle lift via brighter gold + Instagram icon translate. */}
        <div className="flex items-center justify-center pt-1">
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Follow us on Instagram"
            className={`group inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all duration-300 ${
              isDark
                ? "border-gold/30 bg-gold/[0.06] text-gold hover:border-gold/55 hover:bg-gold/[0.10] hover:text-gold-light"
                : "border-gold/40 bg-gold/[0.04] text-gold-dark hover:border-gold/60 hover:bg-gold/[0.10] hover:text-foreground"
            }`}
          >
            <Instagram className="h-3.5 w-3.5 transition-transform duration-300 group-hover:scale-110" strokeWidth={1.8} />
            <span className="tracking-wide">{INSTAGRAM_HANDLE}</span>
          </a>
        </div>
        <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs">
          {links.map((l) => (
            <li key={l.to}>
              <Link to={l.to} className={`${linkColor} transition-colors`}>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <p>
          <a
            href="mailto:team@topuniconsulting.com"
            className={`${accentLink} transition-colors text-xs break-all`}
          >
            team@topuniconsulting.com
          </a>
        </p>
      </div>

      {/* Legal strip + copyright — also centered. */}
      <div className={`max-w-3xl mx-auto border-t ${borderColor} pt-4 pb-6`}>
        <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[11px]">
          <p className={textColor}>{t.copyright}</p>
          <span className={`${sepColor} hidden sm:inline`}>·</span>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5">
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
