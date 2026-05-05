import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Menu, Sparkles, Crown, User as UserIcon } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { ActivityBell } from "@/components/ActivityBell";

interface NavigationProps {
  language?: "en" | "ru";
  /** "overlay" lets the page background show through the nav while at the top of the page,
   *  then fades to the normal opaque cream nav once the user scrolls. Used on the homepage
   *  so the navy gradient at the top of the hero extends through the nav strip. */
  variant?: "default" | "overlay";
}

const Navigation = ({ language = "en", variant = "default" }: NavigationProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, subscription } = useAuth();

  useEffect(() => {
    if (variant !== "overlay") return;
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [variant]);

  const isOverlay = variant === "overlay" && !scrolled;
  const isRussian = language === "ru";
  const basePath = isRussian ? "/ru" : "/";

  // Tighter IA: 4 product surfaces + Pricing always visible (drives conversion).
  // Team/Blog moved to Footer where they belong — they're not what visitors
  // come here for. The "Platform" group label is gone; everything reads as
  // one cohesive product surface.
  const navItems = [
    { label: "TopUni AI",                                     path: isRussian ? "/topuni-ai/ru" : "/topuni-ai" },
    { label: isRussian ? "Стипендии"  : "Discover",           path: isRussian ? "/discover/ru"  : "/discover"  },
    { label: isRussian ? "Академия"   : "Academy",            path: "/academy" },
    { label: isRussian ? "Цены"       : "Pricing",            path: isRussian ? "/pricing/ru" : "/pricing" },
  ];

  const isActive = (path: string, exact?: boolean) =>
    exact ? location.pathname === path : location.pathname === path;

  // Tier-aware account label — the Russian half was missing in 3 places before.
  const tierLabel =
    subscription.tier === "founding" ? (isRussian ? "Основатель" : "Founding") :
    subscription.tier === "pro"      ? (isRussian ? "Pro"        : "Pro")      :
                                       (isRussian ? "Аккаунт"    : "Account");
  const tierLabelMobile =
    subscription.tier === "founding" ? (isRussian ? "Основатель"   : "Founding Member") :
    subscription.tier === "pro"      ? (isRussian ? "Pro аккаунт"  : "Pro Account")     :
                                       (isRussian ? "Мой аккаунт"  : "My Account");

  const linkBase = "px-3 py-2 text-sm font-medium rounded-md transition-colors";
  const linkIdle = isOverlay
    ? "text-primary-foreground/80 hover:text-primary-foreground"
    : "text-muted-foreground hover:text-primary";
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
          {/* Logo — gold in overlay mode for brand presence on the navy band */}
          <button
            onClick={() => navigate(basePath)}
            className={cn(
              "font-heading text-lg sm:text-xl font-semibold transition-colors",
              isOverlay
                ? "text-gold-light hover:text-gold"
                : "text-primary hover:text-gold-dark"
            )}
          >
            Top Uni
          </button>

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

            {/* Activity bell — surfaces unread saved-search hits,
                tracked deadlines, lifecycle reopens. Auto-hides for
                anon users (nothing to surface). */}
            <ActivityBell language={language} variant={isOverlay ? "overlay" : "default"} />

            {/* Membership / Account */}
            {user ? (
              <button
                onClick={() => navigate("/account")}
                className={cn(
                  "ml-1 px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-1.5 transition-all",
                  subscription.tier === "founding"
                    ? (isOverlay ? "bg-gold/20 text-gold-light border border-gold/45" : "bg-gold/15 text-gold-dark border border-gold/35")
                    : subscription.tier === "pro"
                    ? (isOverlay ? "bg-gold/15 text-gold-light border border-gold/35" : "bg-gold/10 text-gold-dark border border-gold/25")
                    : (isOverlay ? "text-primary-foreground/80 hover:text-primary-foreground border border-transparent" : "text-muted-foreground hover:bg-secondary hover:text-primary border border-transparent")
                )}
              >
                {subscription.tier === "founding" ? <Crown className="w-3.5 h-3.5" /> : subscription.tier === "pro" ? <Sparkles className="w-3.5 h-3.5" /> : <UserIcon className="w-3.5 h-3.5" />}
                <span className="hidden xl:inline">{tierLabel}</span>
              </button>
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
                  {user ? (
                    <button
                      onClick={() => { navigate("/account"); setIsOpen(false); }}
                      className="px-4 py-3 text-base font-semibold rounded-md text-gold-dark bg-gold/10 border border-gold/35 text-left flex items-center gap-2"
                    >
                      {subscription.tier === "founding" ? <Crown className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
                      {tierLabelMobile}
                    </button>
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
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </nav>
  );
};

export default Navigation;
