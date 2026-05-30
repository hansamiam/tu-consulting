// CitizenshipChips — fold-aware renderer for the Citizenship line in
// the expanded scholarship sheet. Some scholarships eligible-countries
// lists run to 60–80 entries and the previous comma-separated string
// dominated the sheet (especially on mobile). This component caps the
// visible list at COLLAPSED_LIMIT and reveals the rest behind a single
// "Show all (N)" button, with a "Show less" toggle back.
//
// "Open to all nationalities" / single-line summary fallthroughs
// continue to render as a plain string — fold only kicks in when
// there's an actual long list.

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  countries: string[] | null;
  summaryFallback: string | null;
  language?: "en" | "ru";
}

const OPEN_TO_ALL_MARKERS = ["any", "all", "open", "worldwide", "international"];
const COLLAPSED_LIMIT = 8;

function localizeName(c: string, lang: "en" | "ru"): string {
  // Keep this component's localization tiny — it's only ever rendering
  // raw eligibility country names. The Discover profile preview owns
  // the bigger lookup (discoverLocalize.ts). Duplicating here would
  // tightly couple two unrelated surfaces.
  if (lang === "en") return c;
  return c; // RU mirror of country names lives in discoverLocalize; we
            // intentionally don't localize here to avoid two sources
            // of truth — admin can curate eligible_countries with the
            // EN canonical name and the UI keeps it consistent.
}

export const CitizenshipChips = ({ countries, summaryFallback, language = "en" }: Props) => {
  const [expanded, setExpanded] = useState(false);
  const ru = language === "ru";

  const list = (countries ?? []).map(c => (c ?? "").trim()).filter(Boolean);
  if (list.length === 1 && OPEN_TO_ALL_MARKERS.includes(list[0].toLowerCase())) {
    return <span className="text-foreground/85">{ru ? "Открыто для всех национальностей" : "Open to all nationalities"}</span>;
  }
  if (list.length === 0) {
    return <span className="text-foreground/85">{summaryFallback || (ru ? "Открыто всем" : "Open")}</span>;
  }

  const showAll = expanded || list.length <= COLLAPSED_LIMIT;
  const visible = showAll ? list : list.slice(0, COLLAPSED_LIMIT);
  const hidden = list.length - COLLAPSED_LIMIT;

  return (
    <span className="text-foreground/85">
      {visible.map(c => localizeName(c, language)).join(", ")}
      {!showAll && (
        <>
          {" "}
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="inline-flex items-center gap-0.5 text-[12px] font-medium text-gold-dark hover:text-foreground underline-offset-2 hover:underline ml-1"
          >
            {ru ? `+${hidden} ещё` : `+${hidden} more`}
            <ChevronDown className="h-3 w-3" />
          </button>
        </>
      )}
      {expanded && list.length > COLLAPSED_LIMIT && (
        <>
          {" "}
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="inline-flex items-center gap-0.5 text-[12px] font-medium text-muted-foreground hover:text-foreground underline-offset-2 hover:underline ml-1"
          >
            {ru ? "Свернуть" : "Show less"}
            <ChevronUp className="h-3 w-3" />
          </button>
        </>
      )}
    </span>
  );
};
