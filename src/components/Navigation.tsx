import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface NavigationProps {
  language?: "en" | "ru";
}

const Navigation = ({ language = "en" }: NavigationProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  
  const isRussian = language === "ru";
  const basePath = isRussian ? "/ru" : "/";
  
  const links = [
    { 
      label: isRussian ? "Главная" : "Home", 
      path: basePath,
      exact: true 
    },
    { 
      label: isRussian ? "Услуги" : "Services", 
      path: isRussian ? "/offerings/ru" : "/offerings" 
    },
    { 
      label: isRussian ? "Команда" : "Team", 
      path: isRussian ? "/team/ru" : "/team" 
    },
    { 
      label: isRussian ? "Почему мы" : "Why Us", 
      path: isRussian ? "/why-tu/ru" : "/why-tu" 
    },
    { 
      label: isRussian ? "Вопросы" : "FAQ", 
      path: isRussian ? "/faq/ru" : "/faq" 
    },
  ];

  const isActive = (path: string, exact?: boolean) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname === path;
  };

  return (
    <nav className="glass-nav border-b border-white/10 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button 
            onClick={() => navigate(basePath)}
            className="text-gold font-heading text-lg sm:text-xl font-semibold hover:text-gold-light transition-all duration-300 hover:scale-105"
          >
            Top Uni Consulting
          </button>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            <div className="flex items-center gap-1">
              {links.map((link) => (
                <button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 relative group",
                    isActive(link.path, link.exact)
                      ? "text-gold bg-gradient-to-r from-gold/20 to-accent/20 shadow-glow"
                      : "text-primary-foreground/80 hover:text-gold hover:bg-white/5"
                  )}
                >
                  {link.label}
                  <span className={cn(
                    "absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-gold to-accent transform origin-left transition-transform duration-300",
                    isActive(link.path, link.exact) ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                  )} />
                </button>
              ))}
            </div>
            <div className="ml-2">
              <LanguageSwitcher />
            </div>
          </div>

          {/* Mobile Menu */}
          <div className="md:hidden flex items-center gap-2">
            <LanguageSwitcher />
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gold hover:text-gold-light hover:bg-white/5"
                >
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 glass-panel border-l border-white/10">
                <SheetHeader>
                  <SheetTitle className="text-gold font-heading text-xl">Menu</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-2 mt-8">
                  {links.map((link) => (
                    <button
                      key={link.path}
                      onClick={() => {
                        navigate(link.path);
                        setOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-4 py-3 text-base font-medium rounded-lg transition-all duration-300",
                        isActive(link.path, link.exact)
                          ? "text-gold bg-gradient-to-r from-gold/20 to-accent/20 shadow-glow"
                          : "text-primary-foreground/80 hover:text-gold hover:bg-white/5"
                      )}
                    >
                      {link.label}
                    </button>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
