import { Link } from "react-router-dom";

interface FooterProps {
  language: "en" | "ru";
  variant?: "light" | "dark";
}

const PRODUCT_LINKS_EN = [
  { to: "/topuni-ai",  label: "AI strategy brief" },
  { to: "/discover",   label: "Discover scholarships" },
  { to: "/pipeline",   label: "Application pipeline" },
  { to: "/calendar",   label: "Deadline calendar" },
  { to: "/essay",      label: "Essay critique" },
  { to: "/match",      label: "AI matcher" },
];
const PRODUCT_LINKS_RU = [
  { to: "/topuni-ai/ru", label: "AI стратегия" },
  { to: "/discover/ru",  label: "Стипендии" },
  { to: "/pipeline/ru",  label: "Воронка заявок" },
  { to: "/calendar/ru",  label: "Календарь дедлайнов" },
  { to: "/essay/ru",     label: "AI критика эссе" },
  { to: "/match/ru",     label: "AI подбор стипендий" },
];

const COMPANY_LINKS_EN = [
  { to: "/team",     label: "Team" },
  { to: "/why-tu",   label: "Why TopUni" },
  { to: "/pricing",  label: "Pricing" },
  { to: "/academy",  label: "Academy" },
  { to: "/blog",     label: "Journal" },
  { to: "/refer",    label: "Refer a friend" },
  { to: "/submit",   label: "Submit a scholarship" },
];
// Mirror EN exactly so Russian users see every surface. Where we don't yet
// have a /ru variant, the link still works (page renders English).
const COMPANY_LINKS_RU = [
  { to: "/team/ru",     label: "Команда" },
  { to: "/why-tu/ru",   label: "Почему TopUni" },
  { to: "/pricing/ru",  label: "Цены" },
  { to: "/academy",     label: "Академия" },
  { to: "/blog/ru",     label: "Журнал" },
  { to: "/refer/ru",    label: "Пригласить друга" },
  { to: "/submit/ru",   label: "Предложить стипендию" },
];

/* Default to "light" because most pages render the footer directly on
 * the cream page background. Pages that want a navy slab (Index +
 * IndexRu) wrap the Footer in a `<footer className="bg-primary">` block
 * AND pass variant="dark" explicitly. */
export const Footer = ({ language, variant = "light" }: FooterProps) => {
  const text = {
    en: {
      legal: "Legal",
      product: "Product",
      company: "Company",
      privacyPolicy: "Privacy Policy",
      publicOffer: "Public Offer",
      refundPolicy: "Refund Policy",
      paymentInfo: "Payment by Card",
      tagline: "AI-driven admissions strategy for ambitious students applying internationally.",
      copyright: `© ${new Date().getFullYear()} TopUni · All rights reserved`,
    },
    ru: {
      legal: "Правовая информация",
      product: "Продукт",
      company: "Компания",
      privacyPolicy: "Политика конфиденциальности",
      publicOffer: "Публичная оферта",
      refundPolicy: "Правила возврата",
      paymentInfo: "Оплата банковской картой",
      tagline: "AI-стратегия поступления для амбициозных студентов мира.",
      copyright: `© ${new Date().getFullYear()} TopUni · Все права защищены`,
    },
  };

  const t = text[language];
  const langSuffix = language === "ru" ? "/ru" : "";
  const productLinks = language === "ru" ? PRODUCT_LINKS_RU : PRODUCT_LINKS_EN;
  const companyLinks = language === "ru" ? COMPANY_LINKS_RU : COMPANY_LINKS_EN;

  const isDark = variant === "dark";
  const textColor = isDark ? "text-primary-foreground/55" : "text-muted-foreground";
  const headingColor = isDark ? "text-primary-foreground/70" : "text-foreground";
  const linkColor = isDark ? "text-primary-foreground/80 hover:text-gold-light" : "text-foreground hover:text-gold-dark";
  const accentLink = isDark ? "text-gold hover:text-gold-light" : "text-accent hover:text-accent/80";
  const borderColor = isDark ? "border-gold/20" : "border-border/50";
  const sepColor = isDark ? "text-primary-foreground/25" : "text-muted-foreground/40";

  return (
    <footer className={`${textColor} text-xs sm:text-sm px-4`}>
      {/* Three-column section: tagline + product + company */}
      <div className="max-w-5xl mx-auto py-8 sm:py-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          <div className="space-y-3">
            <p className={`${isDark ? "text-primary-foreground" : "text-foreground"} font-heading text-base font-bold tracking-tight`}>
              TopUni
            </p>
            <p className={`${textColor} leading-relaxed text-xs sm:text-sm`}>
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
              {t.product}
            </h4>
            <ul className="space-y-1.5 text-xs">
              {productLinks.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className={`${linkColor} transition-colors`}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className={`${headingColor} font-semibold text-[11px] uppercase tracking-[0.18em] mb-3`}>
              {t.company}
            </h4>
            <ul className="space-y-1.5 text-xs">
              {companyLinks.map((l) => (
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
