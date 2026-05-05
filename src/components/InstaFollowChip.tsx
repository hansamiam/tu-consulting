/**
 * InstaFollowChip — warm "come hang out" Instagram nudge.
 *
 * Designed for high-trust moments where the user just got value and a
 * tiny "follow us" ask reads as a thank-you, not transactional. NOT a
 * marketing banner. Place once per page, never above the fold.
 *
 * Auto-dismisses + remembers via localStorage so a user who taps "got
 * it" doesn't see it again on that surface for 60 days. We don't ask
 * for follow confirmation — pressing the link opens IG; whether they
 * actually follow is between them and Instagram.
 *
 * No ask-for-perk variant — the perk would cheapen the ask. If we
 * want a separate channel-driven offer ("DM us with X for Y"), build
 * a different component that's about the offer, not the follow.
 */
import { useEffect, useState } from "react";
import { Instagram, X } from "lucide-react";

const HANDLE = "@top_uni_consulting";
const URL = "https://www.instagram.com/top_uni_consulting/";

const lsKey = (surface: string) => `topuni-insta-chip-dismissed-${surface}`;

interface Props {
  /** Unique surface label (post-wizard, post-save, etc) — drives the LS dismiss key. */
  surface: string;
  /** Custom lead. Defaults to a neutral "like what we're doing?" line. */
  lead?: string;
  language?: "en" | "ru";
  className?: string;
}

export const InstaFollowChip = ({ surface, lead, language = "en", className = "" }: Props) => {
  const ru = language === "ru";
  const [dismissed, setDismissed] = useState<boolean>(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(lsKey(surface));
      if (!raw) {
        setDismissed(false);
        return;
      }
      const ts = Number.parseInt(raw, 10);
      // 60-day cooldown — if they dismissed, leave them alone for two months.
      if (Number.isFinite(ts) && Date.now() - ts < 60 * 86_400_000) {
        setDismissed(true);
      } else {
        setDismissed(false);
      }
    } catch { setDismissed(false); }
  }, [surface]);

  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(lsKey(surface), Date.now().toString()); } catch { /* ignore */ }
  };

  if (dismissed) return null;

  const text = lead ?? (ru
    ? "Нравится что мы делаем? Заходите в гости →"
    : "Like what we're building? Come hang out →");

  return (
    <div className={`inline-flex items-center gap-2.5 rounded-full bg-card/80 border border-border px-3 py-1.5 text-[12px] ${className}`}>
      <Instagram className="h-3.5 w-3.5 text-gold-dark shrink-0" />
      <span className="text-foreground/75">{text}</span>
      <a
        href={URL}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-foreground hover:text-gold-dark transition-colors"
        onClick={dismiss}
      >
        {HANDLE}
      </a>
      <button
        onClick={dismiss}
        aria-label={ru ? "Скрыть" : "Dismiss"}
        className="text-muted-foreground/60 hover:text-foreground transition-colors -mr-1"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
};
