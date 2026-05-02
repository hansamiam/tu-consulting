import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

/**
 * Reusable empty / error / no-results state. One component, four flavors:
 *  - "empty"   — nothing here yet (default)
 *  - "search"  — no results matched the filters
 *  - "error"   — something went wrong
 *  - "loading" — paired with skeletons; usually you want skeletons themselves
 *
 * Includes a CTA so the user is never stuck. Used across Discover / Pipeline
 * / Calendar / search results / admin queue / etc.
 */
interface EmptyStateProps {
  /** Lucide icon (or any SVG) to render in the gold-tinted bubble. */
  icon: React.ReactNode;
  /** Big heading. Plain text. */
  title: string;
  /** Friendly explainer below the heading. Plain text. */
  description?: string;
  /** Primary CTA — internal route or external href. */
  cta?: {
    label: string;
    /** Internal route — uses react-router Link. */
    to?: string;
    /** External / programmatic action. */
    onClick?: () => void;
  };
  /** Secondary "Or…" CTA, optional. */
  secondaryCta?: { label: string; to?: string; onClick?: () => void };
  /** Visual tone. Default empty. Error tints destructive. */
  tone?: "empty" | "error";
  /** Compact mode — tighter padding, smaller icon. Use inside cards. */
  compact?: boolean;
}

export function EmptyState({ icon, title, description, cta, secondaryCta, tone = "empty", compact }: EmptyStateProps) {
  const isError = tone === "error";
  const bubbleClass = isError
    ? "bg-destructive/10 text-destructive ring-destructive/20"
    : "bg-gold/10 text-gold-dark ring-gold/20";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={`text-center mx-auto ${compact ? "py-8 max-w-sm" : "py-16 max-w-md"}`}
    >
      <div className={`inline-flex items-center justify-center rounded-2xl ring-1 ${bubbleClass} ${compact ? "w-12 h-12 mb-3" : "w-16 h-16 mb-5"}`}>
        <div className={compact ? "[&_svg]:w-5 [&_svg]:h-5" : "[&_svg]:w-7 [&_svg]:h-7"}>{icon}</div>
      </div>
      <h3 className={`font-heading font-bold tracking-tight text-foreground ${compact ? "text-base mb-1.5" : "text-xl mb-2"}`}>
        {title}
      </h3>
      {description && (
        <p className={`text-muted-foreground leading-relaxed mx-auto ${compact ? "text-xs max-w-xs mb-4" : "text-sm max-w-sm mb-6"}`}>
          {description}
        </p>
      )}
      {(cta || secondaryCta) && (
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {cta && (cta.to
            ? <Button asChild variant="gold" size={compact ? "sm" : "default"}><Link to={cta.to}>{cta.label}</Link></Button>
            : <Button onClick={cta.onClick} variant="gold" size={compact ? "sm" : "default"}>{cta.label}</Button>
          )}
          {secondaryCta && (secondaryCta.to
            ? <Button asChild variant="ghost" size={compact ? "sm" : "default"}><Link to={secondaryCta.to}>{secondaryCta.label}</Link></Button>
            : <Button onClick={secondaryCta.onClick} variant="ghost" size={compact ? "sm" : "default"}>{secondaryCta.label}</Button>
          )}
        </div>
      )}
    </motion.div>
  );
}
