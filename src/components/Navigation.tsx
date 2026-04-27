import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Menu, Sparkles, Crown, User as UserIcon } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthDialog } from "@/components/auth/AuthDialog";

interface NavigationProps {
  language?: "en" | "ru";
}

const Navigation = ({ language = "en" }: NavigationProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const { user, subscription } = useAuth();

  const isRussian = language === "ru";
  const basePath = isRussian ? "/ru" : "/";

  // Academy hidden from main nav until launch — still reachable via /academy direct link.
  const primaryLinks = [
    {
      label: "TopUni AI",
      path: isRussian ? "/topuni-ai/ru" : "/topuni-ai",
    },
    {
      label: isRussian ? "Стипендии" : "Discover",
      path: isRussian ? "/discover/ru" : "/discover",
    },
    {
      label: isRussian ? "Подготовка" : "Prep",
      path: isRussian ? "/prep/ru" : "/prep",
    },
    {
      label: isRussian ? "Академия" : "Academy",
      path: "/academy",
    },
  ];

  const secondaryLinks = [
    {
      label: isRussian ? "Команда" : "Team",
      path: isRussian ? "/team/ru" : "/team",
    },
    {
      label: isRussian ? "Блог" : "Blog",
      path: isRussian ? "/blog/ru" : "/blog",
    },
  ];

  const isActive = (path: string, exact?: boolean) =>
    exact ? location.pathname === path : location.pathname === path;

  return (
    <nav className="bg-primary/95 backdrop-blur-sm border-b border-gold/20 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button
            onClick={() => navigate(basePath)}
            className="text-gold font-heading text-lg sm:text-xl font-semibold hover:text-gold-light transition-colors"
          >
            Top Uni
          </button>

          {/* Desktop Navigation — clean, restrained, single typographic style */}
          <div className="hidden lg:flex items-center gap-1">
            <button
              onClick={() => navigate(basePath)}
              className={cn(
                "px-3 py-2 text-sm font-medium rounded-md transition-colors",
                isActive(basePath, true)
                  ? "text-gold"
                  : "text-primary-foreground/75 hover:text-gold"
              )}
            >
              {isRussian ? "Главная" : "Home"}
            </button>

            {primaryLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className={cn(
                  "px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  isActive(link.path)
                    ? "text-gold"
                    : "text-primary-foreground/75 hover:text-gold"
                )}
              >
                {link.label}
              </button>
            ))}

            {secondaryLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className={cn(
                  "px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  isActive(link.path)
                    ? "text-gold"
                    : "text-primary-foreground/60 hover:text-gold"
                )}
              >
                {link.label}
              </button>
            ))}

            {/* Membership / Account */}
            {user ? (
              <button
                onClick={() => navigate("/account")}
                className={cn(
                  "ml-1 px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-1.5 transition-all",
                  subscription.tier === "founding"
                    ? "bg-gold/15 text-gold border border-gold/40"
                    : subscription.tier === "pro"
                    ? "bg-gold/10 text-gold border border-gold/30"
                    : "text-primary-foreground/70 hover:bg-gold/10 border border-transparent"
                )}
              >
                {subscription.tier === "founding" ? <Crown className="w-3.5 h-3.5" /> : subscription.tier === "pro" ? <Sparkles className="w-3.5 h-3.5" /> : <UserIcon className="w-3.5 h-3.5" />}
                <span className="hidden xl:inline">
                  {subscription.tier === "founding" ? "Founding" : subscription.tier === "pro" ? "Pro" : "Account"}
                </span>
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigate("/pricing")}
                  className="ml-1 px-3 py-1.5 text-sm font-semibold rounded-md text-gold border border-gold/40 hover:bg-gold/15 transition-all"
                >
                  {isRussian ? "Подписка" : "Membership"}
                </button>
                <button
                  onClick={() => setAuthOpen(true)}
                  className="ml-1 px-3 py-1.5 text-sm font-medium text-primary-foreground/70 hover:text-gold transition"
                >
                  Sign in
                </button>
              </>
            )}

            <div className="ml-1">
              <LanguageSwitcher />
            </div>
          </div>

          {/* Mobile Hamburger */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <button className="text-gold p-2">
                <Menu size={24} />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-primary border-gold/20 w-[280px]">
              <div className="flex flex-col gap-6 mt-8">
                {/* Home */}
                <button
                  onClick={() => { navigate(basePath); setIsOpen(false); }}
                  className={cn(
                    "px-4 py-3 text-base font-medium rounded-md transition-all duration-200 text-left",
                    isActive(basePath, true)
                      ? "text-gold bg-gold/10 border-l-4 border-gold"
                      : "text-primary-foreground/70 hover:text-gold hover:bg-gold/5"
                  )}
                >
                  {isRussian ? "Главная" : "Home"}
                </button>

                {/* TopUni AI — standalone */}
                <button
                  onClick={() => { navigate(primaryLinks[0].path); setIsOpen(false); }}
                  className={cn(
                    "px-4 py-3 text-base font-bold rounded-md border transition-all duration-200 text-left",
                    isActive(primaryLinks[0].path)
                      ? "text-gold bg-gold/10 border-gold/60"
                      : "text-gold border-gold/40 hover:bg-gold/15"
                  )}
                >
                  {primaryLinks[0].label}
                </button>

                {/* Other products */}
                <div>
                  <p className="px-4 text-xs text-gold/50 uppercase tracking-wider font-medium mb-2">
                    {isRussian ? "Платформа" : "Platform"}
                  </p>
                  <div className="flex flex-col gap-1">
                    {primaryLinks.slice(1).map((link) => (
                      <button
                        key={link.path}
                        onClick={() => { navigate(link.path); setIsOpen(false); }}
                        className={cn(
                          "px-4 py-3 text-base font-semibold rounded-md transition-all duration-200 text-left",
                          isActive(link.path)
                            ? "text-gold bg-gold/10 border-l-4 border-gold"
                            : "text-gold/70 hover:text-gold hover:bg-gold/5"
                        )}
                      >
                        {link.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Secondary links */}
                <div className="border-t border-gold/20 pt-4">
                  <div className="flex flex-col gap-1">
                    {secondaryLinks.map((link) => (
                      <button
                        key={link.path}
                        onClick={() => { navigate(link.path); setIsOpen(false); }}
                        className={cn(
                          "px-4 py-3 text-base font-medium rounded-md transition-all duration-200 text-left",
                          isActive(link.path)
                            ? "text-gold bg-gold/10 border-l-4 border-gold"
                            : "text-primary-foreground/50 hover:text-primary-foreground/80 hover:bg-gold/5"
                        )}
                      >
                        {link.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-gold/20 flex flex-col gap-2">
                  {user ? (
                    <button
                      onClick={() => { navigate("/account"); setIsOpen(false); }}
                      className="px-4 py-3 text-base font-semibold rounded-md text-gold bg-gold/10 border border-gold/40 text-left flex items-center gap-2"
                    >
                      {subscription.tier === "founding" ? <Crown className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
                      {subscription.tier === "founding" ? "Founding Member" : subscription.tier === "pro" ? "Pro Account" : "My Account"}
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => { navigate("/pricing"); setIsOpen(false); }}
                        className="px-4 py-3 text-base font-semibold rounded-md text-gold border border-gold/40 text-left"
                      >
                        {isRussian ? "Подписка" : "Membership"}
                      </button>
                      <button
                        onClick={() => { setIsOpen(false); setAuthOpen(true); }}
                        className="px-4 py-3 text-base font-medium rounded-md text-primary-foreground/70 hover:text-gold text-left"
                      >
                        Sign in
                      </button>
                    </>
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