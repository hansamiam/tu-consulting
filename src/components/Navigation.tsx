import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";

interface NavigationProps {
  language?: "en" | "ru";
}

const Navigation = ({ language = "en" }: NavigationProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const isRussian = language === "ru";
  const basePath = isRussian ? "/ru" : "/";

  const primaryLinks = [
    {
      label: "TopUni AI",
      path: isRussian ? "/topuni-ai/ru" : "/topuni-ai",
    },
    {
      label: "Discover",
      path: isRussian ? "/discover/ru" : "/discover",
    },
    {
      label: "Prep",
      path: "/prep",
    },
    {
      label: isRussian ? "Консалтинг" : "Consulting",
      path: isRussian ? "/offerings/ru" : "/offerings",
    },
  ];

  const secondaryLinks = [
    {
      label: isRussian ? "Почему мы" : "Why Us",
      path: isRussian ? "/why-tu/ru" : "/why-tu",
    },
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

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-0.5">
            {/* Home */}
            <button
              onClick={() => navigate(basePath)}
              className={cn(
                "px-3 py-2 text-sm font-medium rounded-md transition-all duration-200",
                isActive(basePath, true)
                  ? "text-gold bg-gold/10"
                  : "text-primary-foreground/60 hover:text-primary-foreground/80 hover:bg-gold/5"
              )}
            >
              {isRussian ? "Главная" : "Home"}
            </button>

            {/* Divider */}
            <div className="w-px h-5 bg-gold/20 mx-1" />

            {/* Primary product links — bold gold emphasis */}
            {primaryLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className={cn(
                  "px-3 py-2 text-sm font-semibold rounded-md transition-all duration-200",
                  isActive(link.path)
                    ? "text-gold bg-gold/15"
                    : "text-gold/80 hover:text-gold hover:bg-gold/10"
                )}
              >
                {link.label}
              </button>
            ))}

            {/* Divider */}
            <div className="w-px h-5 bg-gold/20 mx-1" />

            {/* Secondary links — subtler style */}
            {secondaryLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className={cn(
                  "px-3 py-2 text-sm font-medium rounded-md transition-all duration-200",
                  isActive(link.path)
                    ? "text-gold bg-gold/10"
                    : "text-primary-foreground/50 hover:text-primary-foreground/80 hover:bg-gold/5"
                )}
              >
                {link.label}
              </button>
            ))}

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

                {/* Primary products */}
                <div>
                  <p className="px-4 text-xs text-gold/50 uppercase tracking-wider font-medium mb-2">
                    {isRussian ? "Платформа" : "Platform"}
                  </p>
                  <div className="flex flex-col gap-1">
                    {primaryLinks.map((link) => (
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

                <div className="pt-4 border-t border-gold/20">
                  <LanguageSwitcher />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;