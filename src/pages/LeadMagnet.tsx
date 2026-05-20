/**
 * /lesson · /lesson/ru — Lead magnet landing.
 *
 * Funnel destination from Instagram bio/stories. Visitor lands here from
 * an IG link, watches the explainer video (left, pinned) while scrolling
 * vertically through the slide deck (right). Soft hand-off to TopUni
 * Discover / Academy at the bottom.
 *
 * Layout pattern — sticky video + scrolling deck:
 *   On lg+ the video pane is `position: sticky` to viewport top, so it
 *   stays pinned while the 30 slides flow past it on the right. No
 *   prev/next chevrons, no carousel state — the viewer's scroll position
 *   IS the navigation. On mobile both panes stack normally (sticky
 *   abandoned because a 16:9 video pinned at the top of a 375 px screen
 *   eats half the viewport and breaks the scroll-to-read motion).
 *
 * Slide rendering: 30 pre-rendered JPGs under
 *   /public/lead-magnet/<deck>/slide-NN.jpg
 * Pre-rendered because (a) the original .pdf is 24 MB and pdf.js choked
 * on the mobile paint, (b) the Canva-style typography flattens cleaner
 * as raster, (c) zero JS dependency for the viewer.
 *
 * Live slide counter: an IntersectionObserver tracks which slide is
 * most-visible and updates a sticky "12 / 30" pill. The scroll position
 * is the source of truth, not a useState counter.
 *
 * Video: optional `VITE_LEAD_MAGNET_VIDEO_URL` build-time env var. While
 * unset, the left pane shows a styled "coming soon" placeholder so the
 * page is shippable before filming wraps. Accepts a full YouTube URL or
 * a bare video ID.
 *
 * Slide-language toggle: lives inside the deck pane. Only RU exists
 * today; EN button surfaces a "coming soon" state and flips on
 * automatically once /public/lead-magnet/kak-v-2026-en/ is populated.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Play, Video as VideoIcon, Volume2, Settings, ChevronUp, ChevronDown, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

// Deck registry — flip a count from 0 to N once EN slides are exported
// into /public/lead-magnet/kak-v-2026-en/ and the toggle goes live. We
// type `count` widely as `number` so the EN === 0 branch stays valid
// type-checked even before EN slides are added.
type SlideLang = "en" | "ru";
const DECKS: Record<SlideLang, { base: string; count: number }> = {
  ru: { base: "/lead-magnet/kak-v-2026-ru", count: 30 },
  en: { base: "/lead-magnet/kak-v-2026-en", count: 0 },
};

const padSlide = (n: number) => String(n).padStart(2, "0");
const slideUrl = (lang: SlideLang, n: number) =>
  `${DECKS[lang].base}/slide-${padSlide(n)}.jpg`;

// Extract a YouTube video ID from any common URL shape (watch?v=, youtu.be/,
// /embed/, /shorts/) or pass through if already a bare 11-char ID.
const youtubeIdFrom = (raw: string | undefined): string | null => {
  const v = raw?.trim();
  if (!v) return null;
  if (/^[A-Za-z0-9_-]{11}$/.test(v)) return v;
  const m =
    v.match(/[?&]v=([A-Za-z0-9_-]{11})/) ||
    v.match(/youtu\.be\/([A-Za-z0-9_-]{11})/) ||
    v.match(/\/embed\/([A-Za-z0-9_-]{11})/) ||
    v.match(/\/shorts\/([A-Za-z0-9_-]{11})/);
  return m?.[1] ?? null;
};

interface LeadMagnetProps { language?: "en" | "ru"; }

const LeadMagnet = ({ language = "en" }: LeadMagnetProps) => {
  const ru = language === "ru";
  const t = (en: string, rText: string) => (ru ? rText : en);

  // Slide language defaults to whichever deck exists. RU has slides
  // today, EN doesn't — visiting /lesson (EN chrome) still shows the
  // RU deck until EN slides are uploaded.
  const initialSlideLang: SlideLang =
    DECKS[language].count > 0 ? language : DECKS.ru.count > 0 ? "ru" : "en";
  const [slideLang, setSlideLang] = useState<SlideLang>(initialSlideLang);

  useEffect(() => {
    const prev = document.title;
    document.title = ru
      ? "Как поступить в 2026 и получить грант — TopUni"
      : "How to get into university abroad in 2026 — TopUni";
    return () => { document.title = prev; };
  }, [ru]);

  const videoId = useMemo(
    () => youtubeIdFrom(import.meta.env.VITE_LEAD_MAGNET_VIDEO_URL as string | undefined),
    [],
  );

  return (
    <div className="min-h-screen relative bg-background">
      <div className="relative z-10">
        {/* Cream nav on cream page — no overlay variant. The slides
            below carry the color; a navy hero would clash with them. */}
        <Navigation language={language} variant="default" />

        {/* HERO retired 2026-05-20: navy band + "Free lesson" badge +
            verbose subtitle dropped per user direction. Slides are
            colorful and visually distinct on their own; the page needs
            a clean cream background so they pop. Single simple title
            line above the panes. */}
        <section className="max-w-3xl mx-auto px-4 pt-14 sm:pt-20 pb-6 sm:pb-8 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="font-heading text-[28px] sm:text-5xl font-bold text-foreground tracking-[-0.02em] leading-[1.08] text-balance"
          >
            {t(
              "How to go abroad on a grant in 2026",
              "Как поступить за рубеж на грант в 2026",
            )}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
            className="text-foreground/65 text-[14.5px] sm:text-[16px] mt-3 sm:mt-4 leading-relaxed max-w-xl mx-auto"
          >
            {t(
              "A free lesson by Nurzada Abdivalieva — Cambridge · Tsinghua.",
              "Бесплатный урок от Нурзады Абдивалиевой — Кембридж · Цинхуа.",
            )}
          </motion.p>
        </section>

        {/* MAIN — video LEFT, deck RIGHT, equal halves on lg+, stacked
            on mobile. Both panes share the same chrome and the same
            16:9 aspect — the deck pane shows ONE slide at a time via an
            internal scroll-snap container, not the entire scroll the
            old vertical stack used to produce. */}
        <section className="max-w-6xl mx-auto px-4 pt-10 sm:pt-14 pb-12">
          <div className="grid gap-5 sm:gap-6 lg:grid-cols-2 lg:items-start">
            <VideoPane videoId={videoId} tCommon={t} ru={ru} />
            <ContainedDeck lang={slideLang} onLangChange={setSlideLang} tCommon={t} />
          </div>
        </section>

        {/* Hand-off CTA — single line, two buttons. The IG visitor knows
            what they came for; no value-prop block needed. */}
        <section className="max-w-3xl mx-auto px-4 pb-16 sm:pb-20">
          <div className="bg-card border border-border rounded-2xl p-6 sm:p-7 text-center">
            <p className="font-heading text-[11px] uppercase tracking-[0.22em] text-gold-dark font-semibold mb-2.5">
              {t("Next step", "Следующий шаг")}
            </p>
            <p className="font-heading text-foreground text-lg sm:text-xl font-bold tracking-tight leading-snug">
              {t(
                "Tell us your profile in 60 seconds.",
                "Расскажите о профиле за 60 секунд.",
              )}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-5">
              <Link to={ru ? "/topuni-ai/ru" : "/topuni-ai"}>
                <Button variant="gold" size="lg" className="w-full sm:w-auto">
                  {t("Build my strategy", "Построить стратегию")}
                </Button>
              </Link>
              <Link to={ru ? "/discover/ru" : "/discover"}>
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  {t("Browse scholarships", "К стипендиям")}
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Bottom ramp dropped 2026-05-20 — the no-navy direction on
            this page means we no longer need the gradient bridge into a
            navy footer. Footer flipped to variant="light" so it reads
            as a quiet legal/links strip on cream rather than slamming
            into the colorful slides with a navy block underneath. */}

        <Footer language={language} variant="light" />
      </div>
    </div>
  );
};

// ───────────────────────────────────────────────────────────────────────
// ContainedDeck — 2026-05-20 redesign. Same chrome + same 16:9 aspect
// as VideoPane, so the two panes sit side-by-side balanced. The slide
// area is a single 16:9 viewport with internal scroll-snap so exactly
// ONE slide is visible at a time — scroll-wheel (or touch swipe) inside
// the pane snaps to the next slide; the outer page does NOT need to
// scroll to reveal more slides (the old behaviour the user hated).
//
// Active-slide tracking: a scroll listener watches scrollTop / clientHeight
// to compute the most-visible index. IntersectionObserver is overkill for
// snap containers — the scroll position directly indexes the slide.
// ───────────────────────────────────────────────────────────────────────

interface ContainedDeckProps {
  lang: SlideLang;
  onLangChange: (l: SlideLang) => void;
  tCommon: (en: string, ru: string) => string;
}

const ContainedDeck = ({ lang, onLangChange, tCommon }: ContainedDeckProps) => {
  const deck = DECKS[lang];
  const hasSlides = deck.count > 0;
  const [activeSlide, setActiveSlide] = useState<number>(1);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Reset to slide 1 on language flip.
  useEffect(() => {
    setActiveSlide(1);
    scrollRef.current?.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [lang]);

  // Scroll-position → active slide index. scrollTop divided by slide
  // height (which equals the container's clientHeight in a 1-slide-at-a-
  // time snap layout) plus rounding gives the index reliably across
  // browsers without an IntersectionObserver dance.
  useEffect(() => {
    if (!hasSlides) return;
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const h = el.clientHeight || 1;
      const idx = Math.round(el.scrollTop / h) + 1;
      setActiveSlide(Math.min(Math.max(idx, 1), deck.count));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [hasSlides, deck.count]);

  const scrollToSlide = (n: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const target = Math.min(Math.max(n, 1), deck.count) - 1;
    el.scrollTo({ top: target * el.clientHeight, behavior: "smooth" });
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg flex flex-col">
      {/* Header bar — fixed h-11 to MATCH VideoPane exactly. Drops the
          Sparkles icon + slide counter per user direction; just the
          label on the left + language pills on the right. */}
      <div className="flex items-center justify-between h-11 px-3 sm:px-4 border-b border-border bg-background/60">
        <div className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-gold-dark" />
          <p className="text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
            {tCommon("Slides", "Слайды")}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <LangPill
            active={lang === "ru"}
            disabled={DECKS.ru.count === 0}
            onClick={() => onLangChange("ru")}
            label="RU"
          />
          <LangPill
            active={lang === "en"}
            disabled={DECKS.en.count === 0}
            onClick={() => onLangChange("en")}
            label="EN"
            comingSoon={DECKS.en.count === 0}
          />
        </div>
      </div>

      {/* 16:9 viewport — same aspect as the video iframe so both panes
          end up the same size on screen. Slide scroller fills the
          viewport via absolute positioning. */}
      <div className="relative aspect-video bg-neutral-900">
        {hasSlides ? (
          <>
            <div
              ref={scrollRef}
              className="absolute inset-0 overflow-y-auto snap-y snap-mandatory scrollbar-hide"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
            >
              {Array.from({ length: deck.count }, (_, i) => i + 1).map((n) => (
                <div
                  key={`${lang}-${n}`}
                  data-slide={n}
                  className="snap-start h-full w-full shrink-0 flex items-center justify-center bg-neutral-900"
                >
                  <img
                    src={slideUrl(lang, n)}
                    alt={tCommon(`Slide ${n} of ${deck.count}`, `Слайд ${n} из ${deck.count}`)}
                    className="block max-h-full max-w-full object-contain"
                    loading={n <= 2 ? "eager" : "lazy"}
                    decoding="async"
                    draggable={false}
                  />
                </div>
              ))}
            </div>

            {/* Prev / next nav buttons. Sit half-transparent on the
                right edge — desktop hover reveals fully, mobile keeps
                them visible for swipe-free advance. */}
            <div className="absolute inset-y-0 right-2 sm:right-3 flex flex-col items-center justify-center gap-2 pointer-events-none">
              <button
                type="button"
                aria-label={tCommon("Previous slide", "Предыдущий слайд")}
                onClick={() => scrollToSlide(activeSlide - 1)}
                disabled={activeSlide <= 1}
                className="pointer-events-auto h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-black/45 hover:bg-black/65 text-white/85 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed backdrop-blur-sm flex items-center justify-center transition-colors"
              >
                <ChevronUp className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
              </button>
              <button
                type="button"
                aria-label={tCommon("Next slide", "Следующий слайд")}
                onClick={() => scrollToSlide(activeSlide + 1)}
                disabled={activeSlide >= deck.count}
                className="pointer-events-auto h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-black/45 hover:bg-black/65 text-white/85 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed backdrop-blur-sm flex items-center justify-center transition-colors"
              >
                <ChevronDown className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
              </button>
            </div>

          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-neutral-400 text-sm px-6 text-center">
            {tCommon(
              "English slides coming soon. Switch to RU to view the deck.",
              "Английские слайды скоро. Переключитесь на RU.",
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const LangPill = ({
  active, disabled, onClick, label, comingSoon,
}: {
  active: boolean; disabled?: boolean; onClick: () => void; label: string; comingSoon?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={comingSoon ? "Coming soon" : undefined}
    className={`h-7 px-3 rounded-full text-[10.5px] font-bold uppercase tracking-wider transition-colors ${
      active
        ? "bg-gold text-primary"
        : disabled
          ? "bg-muted/40 text-muted-foreground/60 cursor-not-allowed"
          : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
    }`}
  >
    {label}
    {comingSoon && (
      <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-current opacity-60" aria-hidden />
    )}
  </button>
);

// ───────────────────────────────────────────────────────────────────────
// Video pane — YouTube iframe when env var is set, branded placeholder
// otherwise. 16:9 aspect ratio. Sticky behaviour is applied by the
// parent container, not here.
// ───────────────────────────────────────────────────────────────────────

interface VideoPaneProps {
  videoId: string | null;
  tCommon: (en: string, ru: string) => string;
  ru: boolean;
}

const VideoPane = ({ videoId, tCommon, ru }: VideoPaneProps) => {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg">
      {/* Fixed h-11 so this matches ContainedDeck's header exactly —
          previously py-2.5 with mixed-height child elements made the
          two panes a few px off from each other. */}
      <div className="flex items-center justify-between h-11 px-3 sm:px-4 border-b border-border bg-background/60">
        <div className="flex items-center gap-2">
          <VideoIcon className="h-3.5 w-3.5 text-gold-dark" />
          <p className="text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
            {tCommon("Lesson", "Урок")}
          </p>
        </div>
        <span className="text-[10.5px] uppercase tracking-[0.18em] font-semibold text-gold-dark">
          {videoId ? tCommon("Watch", "Смотреть") : tCommon("Coming soon", "Скоро")}
        </span>
      </div>

      <div className="relative bg-neutral-900 aspect-video">
        {videoId ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1${ru ? "&hl=ru" : ""}`}
            title={tCommon("Lesson video", "Видео урока")}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
          />
        ) : (
          <VideoPlaceholder tCommon={tCommon} />
        )}
      </div>
    </div>
  );
};

// Mock player chrome so the video pane reads as "video coming" not
// "broken page". Visual nicety only — no controls actually wire up.
const VideoPlaceholder = ({ tCommon }: { tCommon: (en: string, ru: string) => string }) => (
  <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-neutral-950 to-black flex flex-col">
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center px-6 max-w-sm">
        <div className="mx-auto h-16 w-16 rounded-full bg-gold/15 border border-gold/40 flex items-center justify-center mb-4">
          <Play className="h-6 w-6 text-gold fill-gold ml-1" />
        </div>
        <p className="text-neutral-100 text-base font-semibold leading-tight">
          {tCommon("Video coming soon", "Видео скоро")}
        </p>
      </div>
    </div>
    <div className="flex items-center gap-3 px-4 py-2.5 bg-black/55 border-t border-neutral-800">
      <div className="h-7 w-7 rounded-full bg-white/10 flex items-center justify-center">
        <Play className="h-3 w-3 text-white/60 fill-white/60 ml-0.5" />
      </div>
      <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full w-0 bg-gold" />
      </div>
      <span className="text-[10.5px] text-white/40 font-mono tabular-nums">--:-- / --:--</span>
      <Volume2 className="h-3.5 w-3.5 text-white/40" />
      <Settings className="h-3.5 w-3.5 text-white/40" />
    </div>
  </div>
);

export default LeadMagnet;
