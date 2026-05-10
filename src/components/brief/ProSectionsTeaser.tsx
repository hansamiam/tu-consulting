import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Layers, RotateCcw, BarChart3, Lock, ArrowRight, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProComparisonModal } from "@/components/ProComparisonModal";
import { track } from "@/lib/analytics";

/* ProSectionsTeaser — final block of the BASIC-tier brief. Three cards
 * showing what Pro upgrades — DEPTH and INTERACTIVITY across the same
 * five-section frame, not extra padding sections.
 *
 * 2026-05-10 rebuild: previously advertised Career ROI / Visa / Monthly
 * Budget as Pro-only sections. Those sections were retired (they
 * diluted the report) so this teaser had to swap to the actual Pro
 * differentiators: deeper shortlist, section regen, structured funding
 * chart. Each card opens the ProComparisonModal with its gateId so
 * funnel attribution still maps cleanly.
 */

interface Props {
  isRu: boolean;
  /** Fires gate_seen telemetry only when the strip first scrolls into view. */
}

const t = (en: string, ru: string, isRu: boolean) => (isRu ? ru : en);

const SECTIONS = [
  {
    gateId: "brief-shortlist-depth",
    icon: Layers,
    titleEn: "Wider, deeper shortlist",
    titleRu: "Шире и глубже шорт-лист",
    descEn: "Pro brief expands the curated shortlist from 6-8 universities to 15-20, each with admission thresholds, named programs, and a real career anchor — not generic salary tables.",
    descRu: "В Pro шорт-лист расширяется с 6-8 до 15-20 университетов — с порогами поступления, конкретными программами и реальным карьерным якорем для каждого.",
    rowsEn: [
      "15-20 universities · 3 buckets",
      "Admission thresholds per program",
      "One concrete career anchor per top fit",
      "Specific reason this student fits",
    ],
    rowsRu: [
      "15-20 университетов · 3 группы",
      "Пороги поступления по программам",
      "Карьерный якорь для топ-совпадений",
      "Конкретная причина, почему подходит",
    ],
  },
  {
    gateId: "brief-pro-regen",
    icon: RotateCcw,
    titleEn: "Regenerate any section",
    titleRu: "Перегенерировать любую секцию",
    descEn: "Don't like the essay angles? Re-run that section. Want a sharper read on positioning? Re-run that one. Pro lets you iterate per-section instead of regenerating the whole brief.",
    descRu: "Не нравятся эссе-ракурсы? Перегенерируйте только эту секцию. Хотите острее позиционирование? Только её. Pro позволяет итерировать по секциям, а не весь отчёт целиком.",
    rowsEn: [
      "Re-run positioning",
      "Re-run shortlist",
      "Re-run essay angles",
      "Re-run honest gaps",
    ],
    rowsRu: [
      "Перегенерировать позиционирование",
      "Перегенерировать шорт-лист",
      "Перегенерировать эссе-ракурсы",
      "Перегенерировать пробелы",
    ],
  },
  {
    gateId: "brief-pro-structured-charts",
    icon: BarChart3,
    titleEn: "Funding scenario stack",
    titleRu: "Стек сценариев финансирования",
    descEn: "Pro extracts the funding pathway into a visual stack — plausible scholarship combinations, total funding per scenario, and how each one closes the gap to your target program cost.",
    descRu: "Pro превращает финансирование в визуальный стек — комбинации стипендий, общая сумма для каждого сценария и как каждый закрывает разрыв до стоимости программы.",
    rowsEn: [
      "2-3 plausible stacks",
      "Total funding per scenario",
      "Component scholarships",
      "Coverage map vs program cost",
    ],
    rowsRu: [
      "2-3 правдоподобных стека",
      "Общая сумма по каждому",
      "Компоненты стека",
      "Покрытие vs стоимость",
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
            {t("What Pro upgrades", "Что улучшает Pro", isRu)}
          </h2>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-xl">
            {t(
              "Same five sections. Three real upgrades: a wider shortlist, per-section regen if a read misses, and the funding pathway as a visual scenario stack instead of prose.",
              "Те же пять секций. Три реальных апгрейда: шире шорт-лист, перегенерация по секциям если читается мимо, и финансирование в виде визуального стека сценариев вместо текста.",
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
