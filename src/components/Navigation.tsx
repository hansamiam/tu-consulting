import { Link, useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Menu, Crown, User as UserIcon, Settings } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthDialog } from "@/components/auth/AuthDialog";
// ActivityBell removed from nav 2026-05-09 — it duplicated workspace
// state. The bell-feed lives inside /pipeline as ActivityFeedSection
// (same hooks, surfaced where users manage their commitments).

interface NavigationProps {
  language?: "en" | "ru";
  /** "overlay" lets the page background show through the nav while at the top of the page,
   *  then fades to the normal opaque cream nav once the user scrolls. Used on the homepage
   *  so the navy gradient at the top of the hero extends through the nav strip. */
  variant?: "default" | "overlay";
  /** Pixels of scroll before the overlay transitions to opaque. Default 80
   *  works for short heroes. Used as a fallback when overlaySentinelId is
   *  not provided (or the sentinel can't be found). The sentinel-based
   *  approach below is preferred — heroes vary widely in height between
   *  mobile and desktop, and a fixed scrollY threshold either flips too
   *  early (light nav text on cream content) or too late (cream nav over
   *  the navy hero band). */
  overlayThreshold?: number;
  /** DOM id of a sentinel element placed at the bottom of the hero
   *  region. When provided, Navigation uses IntersectionObserver to
   *  switch to opaque mode the moment the sentinel scrolls above the
   *  nav. Adapts automatically to viewport-driven hero height changes,
   *  which the scrollY threshold can't do. */
  overlaySentinelId?: string;
}

const Navigation = ({ language = "en", variant = "default", overlayThreshold = 80, overlaySentinelId }: NavigationProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, subscription } = useAuth();

  useEffect(() => {
    if (variant !== "overlay") return;

    // Sentinel-based path: watch a DOM element placed at the bottom
    // of the hero region. Switch to opaque the moment the sentinel
    // crosses above the nav (rootMargin shifted by the nav height
    // so the transition lines up with the visible boundary, not the
    // viewport top). This is viewport-shape-agnostic: a hero that's
    // 280px tall on mobile and 440px on desktop transitions at the
    // right moment on both, no per-page threshold tuning needed.
    if (overlaySentinelId) {
      const el = document.getElementById(overlaySentinelId);
      if (el && typeof IntersectionObserver !== "undefined") {
        // Nav is h-16 (64px). The "above-the-nav" line is exactly
        // where the cream nav slab ends visually, so the transition
        // hits when the sentinel slides under that line.
        const obs = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              // boundingClientRect.top < 64 means the sentinel has
              // scrolled above the bottom of the nav — flip to
              // opaque cream. Going back up: sentinel re-enters
              // below the nav line, flip back to overlay.
              setScrolled(entry.boundingClientRect.top < 64);
            }
          },
          { rootMargin: "-64px 0px 0px 0px", threshold: 0 },
        );
        obs.observe(el);
        return () => obs.disconnect();
      }
    }

    // ScrollY-threshold fallback for pages without a sentinel.
    const onScroll = () => setScrolled(window.scrollY > overlayThreshold);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [variant, overlayThreshold, overlaySentinelId]);

  const isOverlay = variant === "overlay" && !scrolled;
  const isRussian = language === "ru";
  const basePath = isRussian ? "/ru" : "/";

  // Round-34 IA: Workspace and Sign-in occupy the SAME nav slot
  // (mutually exclusive — anon sees Sign-in, authed sees Workspace).
  // The product surfaces (TopUni AI / Discover / Academy) stay
  // together in the middle; the personal entry lives at the right
  // edge so the eye learns "right side = me". Earlier IA put
  // Workspace inside the navItems array, which made it shift
  // position based on auth state and visually compete with the
  // Sign-in button when both could appear.
  // /resources is admin-only — distribute lead magnets via direct
  // links (IG/newsletter/outreach), not a public nav tab. PR #215
  // re-added the link by mirroring the old LF pattern; restored the
  // admin-only policy here.
  const navItems = [
    { label: "TopUni AI",                                     path: isRussian ? "/topuni-ai/ru" : "/topuni-ai" },
    { label: isRussian ? "Подбор"       : "Discover",          path: isRussian ? "/discover/ru" : "/discover" },
    { label: isRussian ? "Академия"    : "Academy",           path: isRussian ? "/academy/ru" : "/academy" },
  ];

  const isActive = (path: string, exact?: boolean) =>
    exact ? location.pathname === path : location.pathname === path;

  // Tier label for mobile nav membership indicator (round 31). Desktop
  // chip retired — Workspace itself is the user dashboard, no need for
  // a separate account button to show the tier.
  const tierLabelMobile =
    subscription.tier === "founding" ? (isRussian ? "Ранний доступ" : "Early access") :
    subscription.tier === "pro"      ? (isRussian ? "Участник"     : "Member")      :
                                       (isRussian ? "Мой аккаунт"   : "Free");

  const linkBase = "px-3 py-2 text-sm font-medium rounded-md transition-colors";
  // 2026-05-10: bumped non-overlay link colour from text-muted-foreground
  // to text-foreground/85 — user flagged Academy nav links as
  // "barely visible" on the cream surface. Muted-foreground at 60%
  // alpha was washing out against a cream/canvas-soft nav bg. The
  // active state still uses gold-dark for clear hierarchy.
  const linkIdle = isOverlay
    ? "text-primary-foreground/85 hover:text-primary-foreground"
    : "text-foreground/85 hover:text-gold-dark";
  const linkActive = isOverlay ? "text-gold-light" : "text-gold-dark";

  return (
    <nav className={cn(
      "sticky top-0 z-50 transition-[background-color,border-color,box-shadow] duration-500 border-b",
      isOverlay
        ? "bg-transparent border-transparent shadow-none"
        : "bg-surface/92 backdrop-blur-md border-border shadow-xs"
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo — gold in overlay mode for brand presence on the navy band.
              Real <Link> (not a styled button) so the user gets right-click
              "open in new tab", middle-click, copy-link, and proper href
              semantics for screen readers. */}
          <Link
            to={basePath}
            aria-label="TopUni — home"
            className={cn(
              "font-heading text-lg sm:text-xl font-bold tracking-tight transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50",
              isOverlay
                ? "text-gold-light hover:text-gold"
                : "text-primary hover:text-gold-dark"
            )}
          >
            TopUni
          </Link>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-1">
            {navItems.map((link) => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className={cn(linkBase, isActive(link.path) ? linkActive : linkIdle)}
              >
                {link.label}
              </button>
            ))}

            {/* 2026-05-25: desktop Workspace nav button retired with the
                Workspace unpublish. (PR #118's Edit silently no-op'd; this
                is the actual removal.) Signed-in users see only the
                account-icon affordance in the right-edge slot. */}
            {user ? (
              <>
                {/* Account icon — separate from Workspace so the user
                    has a clear, smaller affordance for billing /
                    settings / sign-out without it competing with the
                    main work entry. Round 96: split out per user
                    request "Account separate smaller icon". */}
                <button
                  onClick={() => navigate(isRussian ? "/account/ru" : "/account")}
                  aria-label={isRussian ? "Аккаунт" : "Account"}
                  title={isRussian ? "Аккаунт и подписка" : "Account & billing"}
                  className={cn(
                    "ml-1 inline-flex items-center justify-center h-8 w-8 rounded-full border transition-colors",
                    isOverlay
                      ? "border-primary-foreground/20 text-primary-foreground/80 hover:text-gold-light hover:border-primary-foreground/40"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                  )}
                >
                  {subscription.tier === "founding" ? <Crown className="w-3.5 h-3.5" /> : <UserIcon className="w-3.5 h-3.5" />}
                </button>
              </>
            ) : (
              <button
                onClick={() => setAuthOpen(true)}
                className={cn(
                  "ml-1 px-3 py-1.5 text-sm font-medium transition",
                  isOverlay ? "text-primary-foreground/80 hover:text-primary-foreground" : "text-muted-foreground hover:text-primary"
                )}
              >
                {isRussian ? "Войти" : "Sign in"}
              </button>
            )}

            <div className="ml-1">
              <LanguageSwitcher />
            </div>
          </div>

          {/* Mobile hamburger */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <button className={cn("p-2 transition-colors", isOverlay ? "text-primary-foreground" : "text-primary")}>
                <Menu size={24} />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-surface border-border w-[280px]">
              <div className="flex flex-col gap-3 mt-8">
                {/* Home */}
                <button
                  onClick={() => { navigate(basePath); setIsOpen(false); }}
                  className={cn(
                    "px-4 py-3 text-base font-medium rounded-md transition-all duration-200 text-left",
                    isActive(basePath, true)
                      ? "text-gold-dark bg-gold/10 border-l-4 border-gold"
                      : "text-muted-foreground hover:text-primary hover:bg-secondary"
                  )}
                >
                  {isRussian ? "Главная" : "Home"}
                </button>

                {/* TopUni AI as the standalone hero CTA — gold-outlined */}
                <button
                  onClick={() => { navigate(navItems[0].path); setIsOpen(false); }}
                  className={cn(
                    "px-4 py-3 text-base font-bold rounded-md border transition-all duration-200 text-left",
                    isActive(navItems[0].path)
                      ? "text-gold-dark bg-gold/10 border-gold/60"
                      : "text-primary border-gold/35 hover:bg-gold/10"
                  )}
                >
                  {navItems[0].label}
                </button>

                {/* Remaining items — flat list, no group label */}
                <div className="flex flex-col gap-1">
                  {navItems.slice(1).map((link) => (
                    <button
                      key={link.path}
                      onClick={() => { navigate(link.path); setIsOpen(false); }}
                      className={cn(
                        "px-4 py-3 text-base font-medium rounded-md transition-all duration-200 text-left",
                        isActive(link.path)
                          ? "text-gold-dark bg-gold/10 border-l-4 border-gold"
                          : "text-muted-foreground hover:text-primary hover:bg-secondary"
                      )}
                    >
                      {link.label}
                    </button>
                  ))}
                </div>

                <div className="pt-4 border-t border-border flex flex-col gap-2">
                  {/* 2026-05-25: mobile Workspace button retired with the
                      desktop one. Signed-in users see only the Account
                      affordance in the mobile drawer. */}
                  {user ? (
                    <>
                      <button
                        onClick={() => { navigate(isRussian ? "/account/ru" : "/account"); setIsOpen(false); }}
                        className="px-4 py-2.5 text-sm font-medium rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary text-left flex items-center gap-2"
                      >
                        <Settings className="w-4 h-4" />
                        {isRussian ? "Аккаунт" : "Account"}
                      </button>
                      <p className="px-4 text-[10px] uppercase tracking-[0.18em] font-semibold text-muted-foreground">
                        {tierLabelMobile}
                      </p>
                    </>
                  ) : (
                    <button
                      onClick={() => { setIsOpen(false); setAuthOpen(true); }}
                      className="px-4 py-3 text-base font-medium rounded-md text-muted-foreground hover:text-primary text-left"
                    >
                      {isRussian ? "Войти" : "Sign in"}
                    </button>
                  )}
                  <LanguageSwitcher />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} language={language} />
    </nav>
  );
};

export default Navigation;
