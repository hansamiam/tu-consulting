import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Menu, ChevronDown } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

interface NavigationProps {
  language?: "en" | "ru";
}

const Navigation = ({ language = "en" }: NavigationProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const isRussian = language === "ru";
  const basePath = isRussian ? "/ru" : "/";

  const platformLinks = [
    {
      label: isRussian ? "Поиск университетов" : "Discover Universities",
      path: isRussian ? "/discover/ru" : "/discover",
      desc: isRussian ? "500+ университетов мира" : "500+ universities worldwide",
    },
    {
      label: isRussian ? "Подготовка к экзаменам" : "Test Prep",
      path: "/prep",
      desc: isRussian ? "IELTS, SAT, английский" : "IELTS, SAT, English",
    },
    {
      label: "TopUni AI",
      path: isRussian ? "/topuni-ai/ru" : "/topuni-ai",
      desc: isRussian ? "AI-консультант 24/7" : "AI counselor 24/7",
    },
  ];

  const mainLinks = [
    {
      label: isRussian ? "Главная" : "Home",
      path: basePath,
      exact: true,
    },
    {
      label: isRussian ? "Услуги" : "Services",
      path: isRussian ? "/offerings/ru" : "/offerings",
    },
    {
      label: isRussian ? "Команда" : "Team",
      path: isRussian ? "/team/ru" : "/team",
    },
    {
      label: isRussian ? "Почему мы" : "Why Us",
      path: isRussian ? "/why-tu/ru" : "/why-tu",
    },
    {
      label: isRussian ? "Блог" : "Blog",
      path: isRussian ? "/blog/ru" : "/blog",
    },
    {
      label: isRussian ? "Вопросы" : "FAQ",
      path: isRussian ? "/faq/ru" : "/faq",
    },
  ];

  const isActive = (path: string, exact?: boolean) =>
    exact ? location.pathname === path : location.pathname === path;

  const isPlatformActive = platformLinks.some((l) => location.pathname === l.path || location.pathname.startsWith(l.path.replace(/\/ru$/, '')));

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
          <div className="hidden lg:flex items-center gap-1">
            {/* Platform dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  "px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 flex items-center gap-1 outline-none",
                  isPlatformActive
                    ? "text-gold bg-gold/10"
                    : "text-primary-foreground/80 hover:text-gold hover:bg-gold/5"
                )}
              >
                {isRussian ? "Платформа" : "Platform"}
                <ChevronDown className="h-3.5 w-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 bg-card border-border">
                <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">
                  {isRussian ? "Продукты" : "Products"}
                </DropdownMenuLabel>
                {platformLinks.map((link) => (
                  <DropdownMenuItem
                    key={link.path}
                    onClick={() => navigate(link.path)}
                    className="cursor-pointer flex flex-col items-start gap-0.5 py-2.5"
                  >
                    <span className="font-medium text-foreground">{link.label}</span>
                    <span className="text-xs text-muted-foreground">{link.desc}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Main links */}
            {mainLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className={cn(
                  "px-3 py-2 text-sm font-medium rounded-md transition-all duration-200",
                  isActive(link.path, link.exact)
                    ? "text-gold bg-gold/10 border-b-2 border-gold"
                    : "text-primary-foreground/80 hover:text-gold hover:bg-gold/5"
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
                {/* Platform section */}
                <div>
                  <p className="px-4 text-xs text-gold/60 uppercase tracking-wider font-medium mb-2">
                    {isRussian ? "Платформа" : "Platform"}
                  </p>
                  <div className="flex flex-col gap-1">
                    {platformLinks.map((link) => (
                      <button
                        key={link.path}
                        onClick={() => { navigate(link.path); setIsOpen(false); }}
                        className={cn(
                          "px-4 py-3 text-base font-medium rounded-md transition-all duration-200 text-left",
                          isActive(link.path)
                            ? "text-gold bg-gold/10 border-l-4 border-gold"
                            : "text-primary-foreground/80 hover:text-gold hover:bg-gold/5"
                        )}
                      >
                        {link.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Main links */}
                <div className="border-t border-gold/20 pt-4">
                  <div className="flex flex-col gap-1">
                    {mainLinks.map((link) => (
                      <button
                        key={link.path}
                        onClick={() => { navigate(link.path); setIsOpen(false); }}
                        className={cn(
                          "px-4 py-3 text-base font-medium rounded-md transition-all duration-200 text-left",
                          isActive(link.path, link.exact)
                            ? "text-gold bg-gold/10 border-l-4 border-gold"
                            : "text-primary-foreground/80 hover:text-gold hover:bg-gold/5"
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
