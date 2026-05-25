// Destinations strip — shows user's matched countries as flag+count tiles.
// Future: replace with an actual SVG world map. For v1, a clean tile strip
// reads better than a hard-to-build mini-map and ships today.

interface DestinationBucket {
  country: string;        // e.g. "Germany"
  countryISO?: string;    // e.g. "DEU"
  schools: { name: string; lore?: string }[];
}

interface Props {
  buckets: DestinationBucket[];
}

const ISO_TO_FLAG: Record<string, string> = {
  DEU: "🇩🇪", NLD: "🇳🇱", GBR: "🇬🇧", USA: "🇺🇸", CAN: "🇨🇦", AUS: "🇦🇺",
  IRL: "🇮🇪", TUR: "🇹🇷", HUN: "🇭🇺", POL: "🇵🇱", CZE: "🇨🇿", AUT: "🇦🇹",
  CHE: "🇨🇭", FRA: "🇫🇷", ITA: "🇮🇹", ESP: "🇪🇸", SWE: "🇸🇪", NOR: "🇳🇴",
  DNK: "🇩🇰", FIN: "🇫🇮", SGP: "🇸🇬", JPN: "🇯🇵", KOR: "🇰🇷", NZL: "🇳🇿", BEL: "🇧🇪", PRT: "🇵🇹",
};

const NAME_TO_ISO: Record<string, string> = {
  "Germany": "DEU", "Netherlands": "NLD", "United Kingdom": "GBR", "UK": "GBR",
  "United States": "USA", "USA": "USA", "Canada": "CAN", "Australia": "AUS",
  "Ireland": "IRL", "Türkiye": "TUR", "Turkey": "TUR", "Hungary": "HUN",
  "Poland": "POL", "Czechia": "CZE", "Austria": "AUT", "Switzerland": "CHE",
  "France": "FRA", "Italy": "ITA", "Spain": "ESP", "Sweden": "SWE",
  "Norway": "NOR", "Denmark": "DNK", "Finland": "FIN", "Singapore": "SGP",
  "Japan": "JPN", "South Korea": "KOR", "Korea": "KOR",
};

export const DestinationsMap = ({ buckets }: Props) => {
  if (!buckets || buckets.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 my-4">
      {buckets.map((b) => {
        const iso = b.countryISO ?? NAME_TO_ISO[b.country];
        const flag = iso ? ISO_TO_FLAG[iso] : null;
        return (
          <div key={b.country} className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-3 py-1.5">
            {flag && <span className="text-base leading-none" aria-hidden>{flag}</span>}
            <span className="text-[12px] font-semibold text-foreground/90">{b.country}</span>
            <span className="text-[11px] text-muted-foreground tabular-nums">· {b.schools.length}</span>
          </div>
        );
      })}
    </div>
  );
};

export type { DestinationBucket };
