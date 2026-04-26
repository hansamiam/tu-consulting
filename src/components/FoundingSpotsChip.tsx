import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  language?: "en" | "ru";
}

/**
 * Live "Founding 100 — X spots left" chip.
 * Reads from public.founding_member_counter (publicly readable).
 */
export const FoundingSpotsChip = ({ className, language = "en" }: Props) => {
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("founding_member_counter")
        .select("cap, claimed_count")
        .eq("id", 1)
        .maybeSingle();
      if (cancelled || !data) return;
      setLeft(Math.max(0, (data.cap ?? 100) - (data.claimed_count ?? 0)));
    })();
    return () => { cancelled = true; };
  }, []);

  if (left === null || left <= 0) return null;

  return (
    <Link
      to="/pricing"
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
        "bg-gold/15 text-gold border border-gold/40 hover:bg-gold/25 transition-colors",
        className
      )}
      aria-label={language === "ru" ? `Осталось ${left} мест Founding` : `${left} Founding spots left`}
    >
      <Crown className="h-3 w-3" />
      <span className="hidden sm:inline">{language === "ru" ? "Founding —" : "Founding ·"}</span>
      <span>{left}/{100}</span>
      <span className="hidden sm:inline">{language === "ru" ? "мест" : "left"}</span>
    </Link>
  );
};
