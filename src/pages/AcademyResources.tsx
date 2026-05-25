// /academy/resources · /academy/resources/ru — deeper members area.
//
// Public /academy was getting cluttered by the inline resource list
// (which renders an empty-state until items publish, reading as
// half-built). Moved here so the landing stays a brochure surface and
// the file/link library lives behind its own URL — exactly what a
// "members area" should look like.
//
// Auth gating is layered: the AcademyResourceList rows themselves show
// a Lock icon + pricing CTA for non-members, and the actual file/url
// fetch is gated server-side by the `academy-resource-url` edge
// function (membership check on the JWT). So a logged-out visitor can
// browse the catalog and see what membership unlocks, but cannot pull
// down any asset.
import { useEffect } from "react";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import AcademyResourceList from "@/components/academy/AcademyResourceList";

interface AcademyResourcesProps { language?: "en" | "ru"; }

const AcademyResources = ({ language = "en" }: AcademyResourcesProps) => {
  const ru = language === "ru";
  const t = (en: string, rText: string) => (ru ? rText : en);
  useEffect(() => {
    const prev = document.title;
    document.title = ru
      ? "Ресурсы · TopUni Академия"
      : "Resources · TopUni Academy";
    return () => { document.title = prev; };
  }, [ru]);

  return (
    <div className="min-h-screen relative bg-background">
      <div className="relative z-10">
        <Navigation language={language} />

        <section className="max-w-3xl mx-auto px-4 pt-16 sm:pt-20 pb-6">
          <p className="text-[10.5px] uppercase tracking-[0.22em] text-gold-dark font-semibold mb-3">
            {t("Members area · Resources", "Зона участников · Ресурсы")}
          </p>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-foreground tracking-tight leading-tight">
            {t("Templates, frameworks, deep dives.", "Шаблоны, фреймворки, разборы.")}
          </h1>
          <p className="text-muted-foreground text-base mt-3 max-w-xl leading-relaxed">
            {t(
              "The working files we use with private clients. Members get the full library; new files added monthly.",
              "Рабочие файлы, которые мы используем с частными клиентами. Полная библиотека открыта участникам; новые файлы появляются ежемесячно.",
            )}
          </p>
        </section>

        <section className="max-w-3xl mx-auto px-4 pb-20">
          <AcademyResourceList language={language} />
        </section>

        <Footer language={language} />
      </div>
    </div>
  );
};

export default AcademyResources;
