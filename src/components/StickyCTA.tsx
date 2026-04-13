import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface StickyCTAProps {
  language?: "en" | "ru";
}

export const StickyCTA = ({ language = "en" }: StickyCTAProps) => {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const isRu = language === "ru";

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 600);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (dismissed) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-0 left-0 right-0 z-40 bg-primary/95 backdrop-blur-sm border-t border-gold/20 py-3 px-4 sm:px-6"
        >
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
            <p className="text-primary-foreground/90 text-sm font-medium hidden sm:block">
              {isRu ? "Готовы начать? Бесплатная консультация →" : "Ready to start? Free consultation →"}
            </p>
            <div className="flex items-center gap-2 sm:gap-3 flex-1 sm:flex-none justify-end">
              <Button
                variant="gold"
                size="sm"
                className="gap-1.5"
                onClick={() => navigate(isRu ? "/offerings/ru" : "/offerings")}
              >
                {isRu ? "Записаться" : "Book Free Call"} <ArrowRight className="h-3.5 w-3.5" />
              </Button>
              <button
                onClick={() => setDismissed(true)}
                className="text-primary-foreground/40 hover:text-primary-foreground/70 transition-colors p-1"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
