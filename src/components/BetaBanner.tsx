import { FlaskConical } from "lucide-react";

interface BetaBannerProps {
  className?: string;
  language?: "en" | "ru";
}

export const BetaBanner = ({ className = "", language = "en" }: BetaBannerProps) => {
  const text = language === "ru"
    ? "Бета — функция активно развивается. Возможны ошибки."
    : "Beta — This feature is under active development. You may encounter bugs.";
  return (
    <div className={`flex items-center justify-center gap-2 py-2 bg-gold/10 border-b border-gold/20 text-xs text-gold font-medium ${className}`}>
      <FlaskConical className="h-3.5 w-3.5" />
      <span>{text}</span>
    </div>
  );
};
