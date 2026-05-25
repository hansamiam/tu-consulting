/**
 * Map the existing Brief v6/v7 payload into the story-deck shapes.
 * The designer's mockup defines slot-specific fields (funnel, topMatch,
 * countries, essay.pre/closer/body) that the backend doesn't always
 * emit verbatim — most are derivable from existing payload fields,
 * the rest fall back to sensible defaults.
 */
import type {
  BriefSections,
  StudentMeta,
  StoryData,
  CountryRow,
  TopMatch,
  FunnelMeta,
} from "./types";

const FLAG_EMOJI: Record<string, string> = {
  netherlands: "🇳🇱",
  "united kingdom": "🇬🇧",
  uk: "🇬🇧",
  britain: "🇬🇧",
  "united states": "🇺🇸",
  usa: "🇺🇸",
  us: "🇺🇸",
  germany: "🇩🇪",
  france: "🇫🇷",
  italy: "🇮🇹",
  spain: "🇪🇸",
  canada: "🇨🇦",
  australia: "🇦🇺",
  "south korea": "🇰🇷",
  korea: "🇰🇷",
  japan: "🇯🇵",
  china: "🇨🇳",
  hungary: "🇭🇺",
  turkey: "🇹🇷",
  türkiye: "🇹🇷",
  singapore: "🇸🇬",
  ireland: "🇮🇪",
  switzerland: "🇨🇭",
  belgium: "🇧🇪",
  austria: "🇦🇹",
  denmark: "🇩🇰",
  sweden: "🇸🇪",
  norway: "🇳🇴",
  finland: "🇫🇮",
  kazakhstan: "🇰🇿",
  kyrgyzstan: "🇰🇬",
  india: "🇮🇳",
  pakistan: "🇵🇰",
};

const flagFor = (country: string): string => {
  const key = country.toLowerCase().trim();
  return FLAG_EMOJI[key] ?? "🌍";
};

/** Build the cover slide's body sentence from the payload — falls
 *  back to a generic line when the funnel numbers are unknown. */
const buildCoverBody = (funnel?: FunnelMeta): { intro: string; promise: string } => {
  if (funnel && funnel.to > 0) {
    return {
      intro: `We read ${funnel.from} scholarships and matched ${funnel.to} to your profile.`,
      promise:
        "Six cards. Your archetype, where you stand, where you can land, the essay only you can write, what to clear this month, and the one thing to do on Monday.",
    };
  }
  return {
    intro: "Your tailored TopUni strategy is ready.",
    promise:
      "Six cards. Your archetype, where you stand, where you can land, the essay only you can write, what to clear this month, and the one thing to do on Monday.",
  };
};

/** Pick a short brand identifier for the top match. Falls back to the
 *  first uppercase letters of each word in the name (acronym). */
const shortFor = (name: string, max = 6): string => {
  const trimmed = name.trim();
  if (trimmed.length <= max) return trimmed;
  const acronym = trimmed
    .split(/\s+/)
    .filter((w) => /^[A-Z]/.test(w))
    .map((w) => w[0])
    .join("");
  if (acronym.length >= 2 && acronym.length <= max) return acronym;
  return trimmed.slice(0, max);
};

/** Translate a CountryBucket into a CountryRow for slide 04. */
const bucketToRow = (bucket: { country: string; schools: { name: string }[]; cities?: string }): CountryRow => {
  const anchorList = bucket.schools.slice(0, 2).map((s) => s.name);
  return {
    flag: flagFor(bucket.country),
    name: bucket.country,
    count: bucket.schools.length,
    anchors: anchorList.join(" · "),
    // We don't have a tier label in the v7 bucket shape — leave undefined;
    // the slide renders without the note pill.
    note: undefined,
  };
};

export const buildStoryData = (
  sections: BriefSections,
  student: StudentMeta,
  funnelOverride?: FunnelMeta,
  topMatchOverride?: TopMatch,
): StoryData => {
  const arch = sections.archetype;
  const stand = sections.whereYouStand;
  const land = sections.whereYouCanLand;
  const write = sections.whatToWrite;
  const blocking = sections.whatsBlockingYou;
  const month = sections.whatToDoThisMonth;

  // Funnel — prefer the explicit override (when caller has handoff data),
  // else derive country count from buckets / total funding unknown.
  const buckets = land?.buckets ?? [];
  const funnel: FunnelMeta | undefined = funnelOverride ?? (
    buckets.length > 0
      ? {
          from: 0, // unknown without handoff data
          to: buckets.reduce((acc, b) => acc + b.schools.length, 0),
          countries: buckets.length,
          funding: undefined,
        }
      : undefined
  );

  // Top match — prefer the override (handoff has top matches), else
  // first school of first bucket.
  let topMatch: TopMatch | undefined = topMatchOverride;
  if (!topMatch && buckets.length > 0 && buckets[0].schools.length > 0) {
    const firstSchool = buckets[0].schools[0];
    topMatch = {
      short: shortFor(firstSchool.name),
      name: firstSchool.name,
      location: buckets[0].country,
    };
  }

  // Countries
  const countries: CountryRow[] = buckets.map(bucketToRow);

  // Essay slot — slot the v7 essaySeed into pre/closer/body. The seed's
  // closer is the "where the languages disagree." style poetic line;
  // body is the prose paragraph; pre is the lead-in fragment "Your
  // essay starts —". We synthesize pre because v7 doesn't emit it.
  const seed = write?.essaySeed;
  const essay = seed
    ? {
        pre: "Your essay starts —",
        closer: seed.closer ?? seed.title,
        body: seed.body,
      }
    : write?.entries?.[0]
      ? {
          pre: "An angle to try —",
          closer: write.entries[0].title,
          body: write.entries[0].whyItWorks ?? write.entries[0].anchorItWith,
        }
      : undefined;

  // Blocking — keep at most 3 entries (the deck has 3 gap rows).
  const blockEntries = (blocking?.entries ?? []).slice(0, 3).map((e) => ({
    priority: e.priority,
    title: e.title,
    action: e.actionThisMonth ?? e.next60Days ?? "",
  }));
  const block = blockEntries.length > 0
    ? {
        headline: blocking?.headline ?? "Closeable fronts.",
        body: blocking?.lead,
        items: blockEntries,
      }
    : undefined;

  // Monday move
  const move = month?.mondayMove
    ? {
        headline: month.mondayMove.headline,
        sub: undefined as string | undefined,
        body: month.mondayMove.body,
        duration: undefined as string | undefined,
      }
    : undefined;

  return {
    student,
    cover: buildCoverBody(funnel),
    archetype: arch
      ? {
          name: arch.name,
          tagline: arch.tagline,
          body: arch.reason,
          confidence: arch.confidence,
        }
      : undefined,
    stand: stand
      ? {
          headline: stand.headline ?? stand.lead,
          body: stand.body ?? stand.lead,
          pullquote: stand.pullquote,
        }
      : undefined,
    funnel,
    topMatch,
    countries,
    essay,
    block,
    mondayMove: move,
  };
};

/** Format an ISO date as "24 May 2026". */
export const formatDate = (iso?: string): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};
