/* DiscoverAppBar — slim product-mode top bar that replaces the global
 * Navigation when the user is inside the Discover results phase.
 *
 * Why this exists: shipping the global website ribbon (Discover /
 * Academy / Pricing / Sign-in nav + tagline + logo at site scale)
 * inside Discover makes the page feel like "a section of a website"
 * instead of a product. Linear, Notion, Stripe Dashboard etc. all
 * swap to a slim product bar when you're inside the product so the
 * actual work surface gets the room. This is that bar.
 *
 * Includes the minimum nav users actually need from inside Discover:
 *   · TopUni Discover wordmark (click → home)
 *   · Account avatar / Sign-in (always visible — auth is core flow)
 *   · Compact dropdown to escape to TopUni AI / Academy / Pricing
 *
 * Sticky at the top so filters/cards always know there's chrome
 * above. Background uses a thin border + cream backdrop-blur so
 * scrolled cards underneath read clearly. */
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { ArrowLeft, Crown, User as UserIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthDialog } from "@/components/auth/AuthDialog";
import LanguageSwitcher from "@/components/LanguageSwitcher";

interface Props {
  language?: "en" | "ru";
}

export const DiscoverAppBar = ({ language = "en" }: Props) => {
  const navigate = useNavigate();
  const { user, subscription } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const isRussian = language === "ru";
  const home = isRussian ? "/ru" : "/";

  // Subtle scrolled state — bar gains a soft shadow once cards have
  // scrolled past it. Same pattern Linear's app bar uses.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // 2026-05-10: right-cluster (Workspace + Account) styling locked to
  // exactly match the global Navigation component so the user doesn't
  // experience a shift in button size/placement when crossing between
  // /discover (results phase) and /pipeline, /topuni-ai, etc. The slim
  // product-shell feel is preserved on the LEFT (Home + Discover
  // wordmark + flat h-16 background) — only the right cluster snaps to
  // global-nav parity. ActivityBell + tier badge dropped: bell
  // duplicated workspace state (same reason it was pulled from global
  // nav 2026-05-09); tier badge was a one-off that read as inconsistent
  // chrome — the Crown icon in the Account button already conveys
  // founding tier.

  return (
    <header
      className={`sticky top-0 z-40 backdrop-blur-md transition-all duration-200 ${
        scrolled
          ? "bg-background/90 border-b border-primary/25 shadow-[0_2px_0_0_hsl(var(--primary)/0.12)]"
          : "bg-background/75 border-b border-primary/15"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
        {/* Explicit Home back button — primary affordance for getting
            out of the app shell. The wordmark also links home but
            users don't always realise that; an actual button labelled
            "Home" with a back arrow leaves no doubt. */}
        <Link
          to={home}
          className="inline-flex items-center gap-1.5 shrink-0 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-md hover:bg-foreground/[0.04]"
          title={isRussian ? "На главную" : "Back to main site"}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{isRussian ? "Главная" : "Home"}</span>
        </Link>

        {/* Vertical rule */}
        <span className="hidden sm:block self-stretch w-px bg-border/60 my-3" aria-hidden />

        {/* Discover wordmark — visual identity, not the primary nav.
            The gold-gradient compass icon was retired (felt like
            decoration in a slim product bar that's already crowded with
            functional chrome). The TopUni eyebrow + Discover wordmark
            carry the brand on their own. */}
        <Link
          to={home}
          className="group inline-flex items-center gap-2 shrink-0 hover:opacity-90 transition-opacity"
          aria-label="Discover"
        >
          <div className="leading-tight hidden sm:block">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-dark">TopUni</p>
            <p className="font-heading text-lg sm:text-xl font-bold tracking-tight text-foreground -mt-0.5 leading-none">Discover</p>
          </div>
        </Link>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right cluster — locked to global Navigation parity so the
            Workspace button and Account icon don't shift size/position
            when the user crosses between Discover and other tabs. */}
        {user ? (
          <>
            <button
              onClick={() => navigate(isRussian ? "/pipeline/ru" : "/pipeline")}
              className="ml-1 px-3 py-2 text-sm font-medium rounded-md transition-colors text-foreground hover:text-gold-dark"
            >
              {isRussian ? "Рабочая зона" : "Workspace"}
            </button>
            <button
              onClick={() => navigate(isRussian ? "/account/ru" : "/account")}
              aria-label={isRussian ? "Аккаунт" : "Account"}
              title={isRussian ? "Аккаунт и подписка" : "Account & billing"}
              className="ml-1 inline-flex items-center justify-center h-8 w-8 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
            >
              {subscription.tier === "founding" ? <Crown className="w-3.5 h-3.5" /> : <UserIcon className="w-3.5 h-3.5" />}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setAuthOpen(true)}
              className="ml-1 px-3 py-1.5 text-sm font-medium transition text-muted-foreground hover:text-primary"
            >
              {isRussian ? "Войти" : "Sign in"}
            </button>
            <AuthDialog open={authOpen} onOpenChange={setAuthOpen} language={language} />
          </>
        )}

        <div className="ml-1">
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
};
