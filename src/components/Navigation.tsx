import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Menu, X } from "lucide-react";
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
      label: isRussian ? "Блог" : "Blog", 
      path: isRussian ? "/blog/ru" : "/blog" 
    },
    { 
      label: isRussian ? "Вопросы" : "FAQ", 
      path: isRussian ? "/faq/ru" : "/faq" 
    },
    { 
      label: "TopUni AI", 
      path: isRussian ? "/topuni-ai/ru" : "/topuni-ai" 
    },
    { 
      label: isRussian ? "Поиск" : "Discover", 
      path: isRussian ? "/discover/ru" : "/discover" 
    },
  ];

  const isActive = (path: string, exact?: boolean) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname === path;
  };

  return (
    <nav className="bg-primary/95 backdrop-blur-sm border-b border-gold/20 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button 
            onClick={() => navigate(basePath)}
            className="text-gold font-heading text-lg sm:text-xl font-semibold hover:text-gold-light transition-colors"
          >
            Top Uni Consulting
          </button>
          
          {/* Desktop Navigation Links + Language */}
          <div className="hidden md:flex items-center gap-2">
            <div className="flex items-center gap-1 sm:gap-2">
              {links.map((link) => (
                <button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  className={cn(
                    "px-3 sm:px-4 py-2 text-sm sm:text-base font-medium rounded-md transition-all duration-200",
                    isActive(link.path, link.exact)
                      ? "text-gold bg-gold/10 border-b-2 border-gold"
                      : "text-primary-foreground/80 hover:text-gold hover:bg-gold/5"
                  )}
                >
                  {link.label}
                </button>
              ))}
            </div>
            <div className="ml-1">
              <LanguageSwitcher />
            </div>
          </div>

          {/* Mobile Hamburger Menu */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="md:hidden">
              <button className="text-gold p-2">
                <Menu size={24} />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-primary border-gold/20 w-[280px]">
              <div className="flex flex-col gap-6 mt-8">
                {/* Mobile Navigation Links */}
                <div className="flex flex-col gap-2">
                  {links.map((link) => (
                    <button
                      key={link.path}
                      onClick={() => {
                        navigate(link.path);
                        setIsOpen(false);
                      }}
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
                
                {/* Language Switcher */}
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
