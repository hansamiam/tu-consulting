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
// nav. Pricing pulled 2026-05-27 per Sam — the page stays reachable for
// the Become-a-member CTAs but is no longer publicly advertised in the
// footer surface. Partner-with-us hidden 2026-05-09 — kept the route +
// page for direct visits but pulled the public link surface until the
// funnel is ready to push.
const FOOTER_LINKS_EN = [
  { to: "/team",      label: "Team" },
  { to: "/blog",      label: "Journal" },
];
const FOOTER_LINKS_RU = [
  { to: "/team/ru",      label: "Команда" },
  { to: "/blog/ru",      label: "Блог" },
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
 * cream (e.g. modal/embed contexts).
 *
 * NAVY TOKEN NOTE (Stream F audit 2026-05-25):
 *   bg-primary is the canonical brand-navy reference (--primary: 210 58% 22%).
 *   This is intentionally different from --navy-deep (210 74% 13%) used in essay
 *   frames. The bg-brand-navy Tailwind token maps to --primary for consistency. */
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
    // Two-section split layout (reverted 2026-05-10 from the brief
    // centered-single-column experiment per user preference). Left
    // cluster: brand wordmark + tagline + Instagram follow chip +
    // contact email. Right cluster: "Explore" link list. Below: full-
    // width legal strip + copyright. Reads like a proper site footer
    // with weight on both ends rather than a centered "thank you for
    // visiting" plate.
    <footer className={`${isDark ? "bg-primary" : ""} ${textColor} text-xs sm:text-sm px-4`}>
      <div className="max-w-3xl mx-auto py-10 sm:py-12">
        <div className="grid sm:grid-cols-[1fr,auto] gap-6 sm:gap-10 items-start">
          {/* Left cluster — brand identity + voice + social/contact */}
          <div className="space-y-4">
            <p className={`${isDark ? "text-primary-foreground" : "text-foreground"} font-heading text-base font-bold tracking-tight`}>
              TopUni
            </p>
            <p className={`${isDark ? "text-primary-foreground/80" : "text-foreground/75"} leading-relaxed text-sm sm:text-[15px] font-medium max-w-md`}>
              {t.tagline}
            </p>
            {/* Instagram chip — balanced treatment (round 3). Round 1
                was a thin-border tinted bg ("hard to see"), round 2 was
                gold-filled ("too sticking out"). This sits in between:
                visible gold border + a tinted gold bg + a stronger icon
                stroke, but no full gold-fill or shadow. Reads as an
                intentional CTA without dominating the cluster. */}
            <div className="pt-0.5">
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow us on Instagram"
                className={`group inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold tracking-wide transition-all duration-300 ${
                  isDark
                    ? "border-gold/55 bg-gold/[0.10] text-gold hover:bg-gold/[0.18] hover:border-gold/75 hover:text-gold-light"
                    : "border-gold-dark/55 bg-gold/[0.08] text-gold-dark hover:bg-gold/[0.16] hover:border-gold-dark hover:text-foreground"
                }`}
              >
                <Instagram className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" strokeWidth={2} />
                <span>{INSTAGRAM_HANDLE}</span>
              </a>
            </div>
          </div>

          {/* Right cluster — Explore list */}
          <div className="space-y-3">
            <p className={`${headingColor} text-[10px] uppercase tracking-[0.22em] font-bold`}>
              {t.explore}
            </p>
            <ul className="flex flex-col gap-2 text-xs">
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
      <div className={`max-w-3xl mx-auto border-t ${borderColor} pt-4 pb-6`}>
        <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center sm:justify-between gap-x-3 gap-y-2 text-[11px]">
          <p className={textColor}>{t.copyright}</p>
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
