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
import { Play, Sparkles, Video as VideoIcon, Volume2, Settings } from "lucide-react";
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
        <Navigation language={language} variant="overlay" overlaySentinelId="lesson-hero-end" />

        {/* HERO — short navy band so the page reads as a destination, not
            a leaked admin tool. Mirrors Academy.tsx's hero treatment but
            tighter (we want the video + slides above the fold on laptop
            screens, not pushed below a tall hero). */}
        <section className="relative -mt-16 bg-gradient-to-br from-primary via-primary to-primary/90 pt-28 sm:pt-32 pb-12 sm:pb-14 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(var(--gold)/0.10),_transparent_60%)]" />
          <div className="relative max-w-4xl mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 bg-gold/15 border border-gold/40 px-3 py-1 rounded-full text-gold text-[11px] uppercase tracking-[0.22em] font-semibold mb-5"
            >
              <Sparkles className="h-3.5 w-3.5" /> {t("Free lesson", "Бесплатный урок")}
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="text-3xl sm:text-5xl font-heading font-bold text-primary-foreground leading-[1.05] tracking-tight"
            >
              {t(
                "How to get in abroad and win a grant in 2026",
                "Как поступить заграницу и получить грант в 2026",
              )}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-primary-foreground/75 text-sm sm:text-base max-w-2xl mx-auto mt-4 leading-relaxed"
            >
              {t(
                "Watch the lesson on the left. Scroll the deck on the right. The strategy that actually works in 2026 — what the platform is, why the old way burns a year, and how to apply without it.",
                "Слушайте урок слева. Прокручивайте слайды справа. Какая стратегия работает в 2026, что за платформа, почему старый путь сжигает год и как поступить без этого.",
              )}
            </motion.p>
          </div>
          <div id="lesson-hero-end" aria-hidden className="h-px w-full" />
        </section>

        {/* MAIN — video LEFT (sticky on lg+), scrolling deck RIGHT.
            The 12-column grid lets the video take 5/12 and the deck 7/12,
            so the slides have visual primacy (they're what the viewer
            spends most time on) while the video stays comfortably
            readable beside them. */}
        <section className="max-w-7xl mx-auto px-4 pt-10 sm:pt-14 pb-12">
          <div className="grid gap-6 sm:gap-8 lg:grid-cols-12 lg:items-start">
            <div className="lg:col-span-5 lg:sticky lg:top-24 lg:self-start">
              <VideoPane videoId={videoId} tCommon={t} ru={ru} />
            </div>
            <div className="lg:col-span-7">
              <ScrollDeck lang={slideLang} onLangChange={setSlideLang} tCommon={t} />
            </div>
          </div>
        </section>

        {/* HAND-OFF CTA — soft funnel into the rest of TopUni. We don't
            gate the lesson behind a signup (the IG visitor is cold and
            would bounce); instead, every visitor gets the lesson AND a
            single forward step at the bottom. */}
        <section className="max-w-3xl mx-auto px-4 pb-16 sm:pb-20">
          <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 text-center">
            <p className="font-heading text-[11px] uppercase tracking-[0.22em] text-gold-dark font-semibold mb-3">
              {t("Next step", "Следующий шаг")}
            </p>
            <h2 className="font-heading text-xl sm:text-2xl font-bold text-foreground tracking-tight leading-tight">
              {t(
                "The platform Nurzada talks about is TopUni.",
                "Та самая платформа, о которой говорит Нурзада — это TopUni.",
              )}
            </h2>
            <p className="text-muted-foreground text-sm sm:text-[15px] leading-relaxed mt-3 max-w-xl mx-auto">
              {t(
                "Tell us your profile in 60 seconds. You get a personalised list of universities and scholarships you can actually win this cycle — and a one-shot AI brief on how to position yourself.",
                "Расскажите о своём профиле за 60 секунд. Получите персональный список вузов и стипендий, которые реально выиграть в этом цикле — и AI-разбор того, как себя позиционировать.",
              )}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
              <Link to={ru ? "/topuni-ai/ru" : "/topuni-ai"}>
                <Button variant="gold" size="lg" className="w-full sm:w-auto">
                  {t("Build my strategy", "Построить мою стратегию")}
                </Button>
              </Link>
              <Link to={ru ? "/discover/ru" : "/discover"}>
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  {t("Browse scholarships", "Посмотреть стипендии")}
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Bottom ramp into the navy footer — matches Academy.tsx. */}
        <div
          className="h-12 sm:h-16"
          style={{
            backgroundImage: `linear-gradient(180deg,
              transparent 0%,
              hsl(var(--primary) / 0.10) 50%,
              hsl(var(--primary)) 100%)`,
          }}
          aria-hidden="true"
        />

        <Footer language={language} />
      </div>
    </div>
  );
};

// ───────────────────────────────────────────────────────────────────────
// ScrollDeck — vertical scroll of all slides as one continuous column.
// Live counter pill ("12 / 30") tracks the most-visible slide via
// IntersectionObserver. No prev/next, no carousel — scroll IS the nav.
// ───────────────────────────────────────────────────────────────────────

interface ScrollDeckProps {
  lang: SlideLang;
  onLangChange: (l: SlideLang) => void;
  tCommon: (en: string, ru: string) => string;
}

const ScrollDeck = ({ lang, onLangChange, tCommon }: ScrollDeckProps) => {
  const deck = DECKS[lang];
  const hasSlides = deck.count > 0;
  const [activeSlide, setActiveSlide] = useState<number>(1);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Reset visible-slide state whenever the deck changes language.
  useEffect(() => { setActiveSlide(1); }, [lang]);

  // Watch each slide's visibility — the slide with the largest visible
  // area becomes "active" and feeds the counter pill. rootMargin pulls
  // the trigger zone up by 30% so the counter switches just before a
  // slide reaches centre-screen rather than only after it passes it.
  useEffect(() => {
    if (!hasSlides) return;
    const refs = slideRefs.current.filter(Boolean) as HTMLDivElement[];
    if (refs.length === 0) return;
    const visibilityByIdx = new Map<number, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const idx = Number((e.target as HTMLElement).dataset.slide);
          if (!Number.isFinite(idx)) continue;
          visibilityByIdx.set(idx, e.isIntersecting ? e.intersectionRatio : 0);
        }
        let bestIdx = 1, bestRatio = -1;
        for (const [idx, ratio] of visibilityByIdx) {
          if (ratio > bestRatio) { bestRatio = ratio; bestIdx = idx; }
        }
        if (bestRatio > 0) setActiveSlide(bestIdx);
      },
      { rootMargin: "-30% 0px -30% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    for (const el of refs) observer.observe(el);
    return () => observer.disconnect();
  }, [hasSlides, lang, deck.count]);

  return (
    <div className="relative">
      {/* Floating toolbar — sticks to the top of the deck column on lg+
          so the counter + lang switcher are always within reach as the
          viewer scrolls. Glass effect so it floats over slides without
          obscuring them. */}
      <div className="sticky top-20 z-20 mb-4 flex items-center justify-between gap-3 px-3 sm:px-4 py-2.5 rounded-full bg-card/85 backdrop-blur-md border border-border shadow-sm">
        <div className="flex items-center gap-1.5">
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
        {hasSlides && (
          <div className="flex items-center gap-2">
            <span className="font-mono text-[12px] tabular-nums text-foreground/80 font-semibold">
              {activeSlide}
              <span className="text-muted-foreground/60 mx-1">/</span>
              {deck.count}
            </span>
          </div>
        )}
      </div>

      {/* Slide column — all 30 slides stacked vertically. Each slide
          gets a soft shadow + rounded corners; a vertical gap between
          slides acts as natural section breaks. Browser-native lazy
          loading keeps the initial paint quick (only the first 2-3
          images are decoded immediately).
          We avoid framer-motion's `whileInView` here because it doesn't
          gracefully handle programmatic scroll jumps — opacity gets
          stuck mid-transition if a slide is scrolled into view before
          framer's observer attaches. Plain visible slides + the scroll
          motion itself carry the polish. */}
      {hasSlides ? (
        <div className="flex flex-col gap-4 sm:gap-5">
          {Array.from({ length: deck.count }, (_, i) => i + 1).map((n) => (
            <div
              key={`${lang}-${n}`}
              ref={(el) => { slideRefs.current[n - 1] = el; }}
              data-slide={n}
              className="relative rounded-xl overflow-hidden shadow-md ring-1 ring-border bg-neutral-900"
            >
              <img
                src={slideUrl(lang, n)}
                alt={tCommon(`Slide ${n} of ${deck.count}`, `Слайд ${n} из ${deck.count}`)}
                className="block w-full h-auto"
                loading={n <= 2 ? "eager" : "lazy"}
                decoding="async"
                draggable={false}
              />
              {/* Subtle slide-number marker bottom-right — adds polish
                  without being distracting. Hidden under sm to keep
                  mobile clean. */}
              <span className="hidden sm:inline-block absolute bottom-3 right-3 font-mono text-[10.5px] tabular-nums bg-black/55 text-white/85 px-2 py-0.5 rounded-full backdrop-blur-sm">
                {n} / {deck.count}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl bg-card border border-border p-10 text-center text-muted-foreground text-sm">
          {tCommon(
            "English slides coming soon. Switch to RU to view the deck.",
            "Английские слайды скоро. Переключитесь на RU.",
          )}
        </div>
      )}
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
      <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 border-b border-border bg-background/60">
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
        <p className="text-neutral-100 text-base font-semibold mb-2 leading-tight">
          {tCommon("Video drops soon", "Видео скоро появится")}
        </p>
        <p className="text-neutral-400 text-[12.5px] leading-relaxed">
          {tCommon(
            "Filming wraps this week. Save this page — the lesson loads here automatically the moment it goes live.",
            "Съёмки идут сейчас. Сохраните страницу — урок появится здесь автоматически как только выйдет.",
          )}
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
