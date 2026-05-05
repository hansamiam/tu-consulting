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
import { Compass, ArrowLeft, Crown, User as UserIcon, ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthDialog } from "@/components/auth/AuthDialog";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

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

  const tierLabel = subscription.tier === "founding" ? "Founding" : subscription.tier === "pro" ? "Pro" : "Account";
  const TierIcon = subscription.tier === "founding" ? Crown : UserIcon;

  return (
    <header
      className={`sticky top-0 z-40 backdrop-blur-md transition-all duration-200 ${
        scrolled
          ? "bg-background/85 border-b border-border shadow-[0_1px_0_0_hsl(var(--border)/0.4)]"
          : "bg-background/70 border-b border-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8 h-14 flex items-center gap-3">
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

        {/* Discover wordmark — visual identity, not the primary nav. */}
        <Link
          to={home}
          className="group inline-flex items-center gap-2 shrink-0 hover:opacity-90 transition-opacity"
          aria-label="Discover"
        >
          <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-gradient-to-br from-gold-dark to-gold text-primary shadow-sm ring-1 ring-gold/40">
            <Compass className="h-3.5 w-3.5" />
          </span>
          <div className="leading-tight hidden sm:block">
            <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-gold-dark">TopUni</p>
            <p className="font-heading text-[15px] font-bold tracking-tight text-foreground -mt-0.5">Discover</p>
          </div>
        </Link>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Hop to other products dropdown — gives users an escape from
            inside Discover without the full website ribbon. */}
        <DropdownMenu>
          <DropdownMenuTrigger className="hidden sm:inline-flex items-center gap-1 text-xs font-medium text-foreground/65 hover:text-foreground px-2 py-1.5 rounded-md transition-colors">
            {isRussian ? "Другие продукты" : "Other products"}
            <ChevronDown className="h-3 w-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => navigate(isRussian ? "/topuni-ai/ru" : "/topuni-ai")} className="text-sm">
              TopUni AI <span className="text-[10px] text-muted-foreground ml-auto">free intake</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/pipeline")} className="text-sm">
              Pipeline
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/academy")} className="text-sm">
              Academy
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate(isRussian ? "/pricing/ru" : "/pricing")} className="text-sm">
              Pricing
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(home)} className="text-sm">
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
              {isRussian ? "На главную" : "Back to home"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <LanguageSwitcher />

        {/* Account / Sign-in */}
        {user ? (
          <button
            onClick={() => navigate("/account")}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-semibold text-gold-dark bg-gold/10 border border-gold/30 hover:bg-gold/15 transition-colors"
          >
            <TierIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{tierLabel}</span>
          </button>
        ) : (
          <>
            <button
              onClick={() => setAuthOpen(true)}
              className="inline-flex items-center h-8 px-3 rounded-md text-xs font-semibold text-foreground hover:bg-foreground/[0.05] transition-colors"
            >
              {isRussian ? "Войти" : "Sign in"}
            </button>
            <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
          </>
        )}
      </div>
    </header>
  );
};
