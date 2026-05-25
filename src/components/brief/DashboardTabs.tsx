// Two-tab segmented control: Story / Read. Mobile-first sizing.
// Defaults to "story" on mobile (<md), "read" on desktop.
// Stored in URL hash (#story / #read) so refresh preserves state
// and Sam can share a direct link to either tab.
import { useEffect, useState } from "react";

export type DashboardTab = "story" | "read";

interface Props {
  value: DashboardTab;
  onChange: (v: DashboardTab) => void;
  lang: "en" | "ru";
}

export const DashboardTabs = ({ value, onChange, lang }: Props) => {
  const t = (en: string, ru: string) => (lang === "ru" ? ru : en);
  return (
    <div role="tablist" aria-label="Report view" className="inline-flex rounded-full border border-border/60 bg-card p-0.5">
      {(["story", "read"] as const).map((tab) => {
        const active = value === tab;
        const label = tab === "story" ? t("Story", "История") : t("Read", "Читать");
        return (
          <button
            key={tab}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab)}
            className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-colors ${
              active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
};

export const useDashboardTab = (defaultTab: DashboardTab): [DashboardTab, (v: DashboardTab) => void] => {
  const [tab, setTab] = useState<DashboardTab>(() => {
    const hash = typeof window !== "undefined" ? window.location.hash.slice(1) : "";
    return hash === "story" || hash === "read" ? hash : defaultTab;
  });
  useEffect(() => {
    if (typeof window !== "undefined") window.history.replaceState({}, "", `#${tab}`);
  }, [tab]);
  return [tab, setTab];
};
