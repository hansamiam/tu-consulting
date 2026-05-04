import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Briefcase, Plane, Wallet, Lock, ArrowRight, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProComparisonModal } from "@/components/ProComparisonModal";
import { track } from "@/lib/analytics";

/* ProSectionsTeaser — final block of the BASIC-tier brief. Three cards
 * showing the sections that Pro adds (Career ROI, Visa pathway, Monthly
 * budget), each with a structural preview and a Pro upgrade hook.
 *
 * Why this exists: before, basic-tier users finished the brief at "Final
 * word" with no visibility into what Pro would add. They didn't know
 * Career ROI, Visa, or Budget sections existed — so we couldn't even
 * fire gate_seen on those features. Pure conversion miss.
 *
 * Each card has its own gateId so the funnel can split which Pro section
 * the user clicked. Click opens the ProComparisonModal in-place.
 */

interface Props {
  isRu: boolean;
  /** Fires gate_seen telemetry only when the strip first scrolls into view. */
}

const t = (en: string, ru: string, isRu: boolean) => (isRu ? ru : en);

const SECTIONS = [
  {
    gateId: "brief-pro-section-career-roi",
    icon: Briefcase,
    titleEn: "Career ROI breakdown",
    titleRu: "Карьерный ROI",
    descEn: "Salary ranges, employment rates, notable employers, and 5–10 year alumni trajectories — for your top 3 universities.",
    descRu: "Диапазон зарплат, процент трудоустройства, заметные работодатели и траектория выпускников — для топ-3 университетов.",
    rowsEn: [
      "Starting salary range · field-specific",
      "6-month employment rate",
      "Notable employer pipeline",
      "5–10 yr trajectory",
    ],
    rowsRu: [
      "Стартовая зарплата · по направлению",
      "Трудоустройство за 6 мес",
      "Топ-работодатели",
      "Траектория 5–10 лет",
    ],
  },
  {
    gateId: "brief-pro-section-visa",
    icon: Plane,
    titleEn: "Visa & post-graduation pathway",
    titleRu: "Виза и после выпуска",
    descEn: "Per-country student-visa difficulty for your nationality, post-study work timelines, and PR pathway.",
    descRu: "Сложность студенческой визы для вашей национальности, пост-учебная виза и путь к PR.",
    rowsEn: [
      "Student visa · difficulty for your nationality",
      "Post-study work · duration",
      "Path to permanent residency",
      "Realistic challenges",
    ],
    rowsRu: [
      "Студенческая виза · сложность",
      "Пост-учебная виза · срок",
      "Путь к ВНЖ",
      "Реальные сложности",
    ],
  },
  {
    gateId: "brief-pro-section-monthly-budget",
    icon: Wallet,
    titleEn: "Monthly budget breakdown",
    titleRu: "Месячный бюджет",
    descEn: "Realistic rent, food, transport, and insurance estimates for your top 3 cities — and how scholarship coverage maps onto them.",
    descRu: "Реальные оценки аренды, еды, транспорта и страховки для топ-3 городов — как стипендия покрывает расходы.",
    rowsEn: [
      "Rent · transport · food",
      "Insurance · books · leisure",
      "Part-time work options",
      "Coverage map vs total cost",
    ],
    rowsRu: [
      "Аренда · транспорт · еда",
      "Страховка · книги · досуг",
      "Подработка",
      "Покрытие vs общая стоимость",
    ],
  },
];

export function ProSectionsTeaser({ isRu }: Props) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const seenRef = useRef(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeGateId, setActiveGateId] = useState<string | undefined>(undefined);

  // Fire gate_seen once when the strip first enters the viewport. Mirrors
  // the PremiumGate IntersectionObserver pattern so funnel attribution
  // is consistent across surfaces.
  useEffect(() => {
    if (!wrapperRef.current || seenRef.current) return;
    const el = wrapperRef.current;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !seenRef.current) {
          seenRef.current = true;
          void track("gate_seen", { gate_id: "brief-pro-sections-teaser" });
          obs.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const openModal = (gateId: string) => {
    void track("gate_upgrade_clicked", { gate_id: gateId });
    setActiveGateId(gateId);
    setModalOpen(true);
  };

  return (
    <div ref={wrapperRef} className="not-prose my-12 print:hidden">
      <div className="flex items-baseline justify-between gap-3 mb-5 flex-wrap">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-[0.18em] uppercase bg-gradient-to-r from-gold-dark to-gold text-primary mb-2">
            <Crown className="w-3 h-3" />
            {t("Pro adds", "Pro даёт", isRu)}
          </div>
          <h2 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-tight">
            {t("Three sections you don't have yet", "Три раздела, которых у вас ещё нет", isRu)}
          </h2>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-xl">
            {t(
              "Career ROI, visa pathway, and monthly budget — sections that turn a strategy report into a financial decision document. Pro members see all three written specifically for them.",
              "Карьерный ROI, виза и месячный бюджет — разделы, которые превращают стратегию в документ для финансового решения. У Pro-членов все три написаны лично под них.",
              isRu,
            )}
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        {SECTIONS.map((s) => (
          <motion.button
            key={s.gateId}
            type="button"
            onClick={() => openModal(s.gateId)}
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="group relative text-left bg-card border border-border rounded-xl p-5 overflow-hidden hover:border-gold/40 hover:shadow-sm transition-all"
          >
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gold-dark/40 group-hover:bg-gold-dark transition-colors" />
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="h-9 w-9 rounded-lg bg-gold/10 text-gold-dark flex items-center justify-center">
                <s.icon className="w-4 h-4" />
              </div>
              <Lock className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-gold-dark transition-colors" />
            </div>
            <h3 className="font-heading font-semibold text-[15px] text-foreground tracking-tight leading-snug mb-2">
              {isRu ? s.titleRu : s.titleEn}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
              {isRu ? s.descRu : s.descEn}
            </p>

            {/* Structural preview — actual labels but rendered as muted skeleton
                rows so the user sees the FORMAT they'd get with Pro without us
                fabricating numbers. Hover lifts the gold rule for affordance. */}
            <ul className="space-y-1.5 mb-4">
              {(isRu ? s.rowsRu : s.rowsEn).map((row, i) => (
                <li key={i} className="flex items-center gap-2 text-[11px] text-muted-foreground/70">
                  <span className="h-1 w-1 rounded-full bg-muted-foreground/40 shrink-0" />
                  <span className="truncate">{row}</span>
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-dark group-hover:translate-x-0.5 transition-transform">
              {t("See what you'd get", "Что получите", isRu)}
              <ArrowRight className="w-3 h-3" />
            </div>
          </motion.button>
        ))}
      </div>

      {/* One quiet bottom CTA so users who don't click an individual card
          still have a path. Same modal, no gateId-specific row highlight. */}
      <div className="mt-6 flex items-center justify-center">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => openModal("brief-pro-sections-teaser")}
        >
          {t("Compare Free vs Pro side-by-side", "Сравнить Free и Pro", isRu)}
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>

      <ProComparisonModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        gateId={activeGateId}
      />
    </div>
  );
}
