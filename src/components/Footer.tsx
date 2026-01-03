import { Link } from "react-router-dom";

interface FooterProps {
  language: "en" | "ru";
  variant?: "light" | "dark";
}

export const Footer = ({ language, variant = "dark" }: FooterProps) => {
  const text = {
    en: {
      legal: "Legal",
      privacyPolicy: "Privacy Policy",
      publicOffer: "Public Offer",
      refundPolicy: "Refund Policy",
      paymentInfo: "Payment by Card",
      tagline: "Central Asia's leading admissions consulting firm",
      copyright: "© 2025 Top Uni Consulting | All Rights Reserved",
    },
    ru: {
      legal: "Правовая информация",
      privacyPolicy: "Политика конфиденциальности",
      publicOffer: "Публичная оферта",
      refundPolicy: "Правила возврата",
      paymentInfo: "Оплата банковской картой",
      tagline: "Ведущая консалтинговая компания Центральной Азии по поступлению",
      copyright: "© 2025 Top Uni Consulting | Все права защищены",
    },
  };

  const t = text[language];
  const langSuffix = language === "ru" ? "/ru" : "";

  const isDark = variant === "dark";
  const textColor = isDark ? "text-primary-foreground/50" : "text-muted-foreground";
  const headingColor = isDark ? "text-primary-foreground/70" : "text-foreground";
  const linkColor = isDark ? "text-gold hover:text-gold-light" : "text-accent hover:text-accent/80";
  const borderColor = isDark ? "border-gold/20" : "border-border/50";

  return (
    <footer className={`${textColor} text-xs sm:text-sm space-y-4 px-4`}>
      <p>
        <a 
          href="mailto:team@topuniconsulting.com" 
          className={`${linkColor} transition-colors duration-300 break-all`}
        >
          team@topuniconsulting.com
        </a>
      </p>
      
      {/* Legal Links Section */}
      <div className={`border-t ${borderColor} pt-4`}>
        <h4 className={`${headingColor} font-semibold text-xs uppercase tracking-wide mb-3`}>
          {t.legal}
        </h4>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs">
          <Link 
            to={`/privacy-policy${langSuffix}`} 
            className={`${linkColor} transition-colors duration-300`}
          >
            {t.privacyPolicy}
          </Link>
          <span className={isDark ? "text-primary-foreground/30" : "text-muted-foreground/50"}>|</span>
          <Link 
            to={`/public-offer${langSuffix}`} 
            className={`${linkColor} transition-colors duration-300`}
          >
            {t.publicOffer}
          </Link>
          <span className={isDark ? "text-primary-foreground/30" : "text-muted-foreground/50"}>|</span>
          <Link 
            to={`/refund-policy${langSuffix}`} 
            className={`${linkColor} transition-colors duration-300`}
          >
            {t.refundPolicy}
          </Link>
          <span className={isDark ? "text-primary-foreground/30" : "text-muted-foreground/50"}>|</span>
          <Link 
            to={`/payment-info${langSuffix}`} 
            className={`${linkColor} transition-colors duration-300`}
          >
            {t.paymentInfo}
          </Link>
        </div>
      </div>

      <div className={`border-t ${borderColor} pt-3 space-y-2`}>
        <p className={isDark ? "text-primary-foreground/60 text-xs sm:text-sm" : "text-foreground/70 text-xs sm:text-sm"}>
          {t.tagline}
        </p>
        <p className={`${textColor} text-xs`}>{t.copyright}</p>
      </div>
    </footer>
  );
};
