/**
 * Thin adapter that mounts DestinationsMap from the magazine dispatcher
 * without forcing edits to WhereYouCanLand.tsx (Stream E owns that file).
 * The viz renders ABOVE WhereYouCanLand in BriefMagazine.
 */
import { DestinationsMap, type DestinationBucket } from "@/components/brief/DestinationsMap";
import type { CountryBucket } from "@/components/brief/types";

interface Props {
  buckets: CountryBucket[];
}

export const WhereYouCanLandViz = ({ buckets }: Props) => {
  // CountryBucket and DestinationBucket are structurally compatible
  // (both: { country, schools: { name, lore? }[] }) — pass through.
  const destinations: DestinationBucket[] = buckets.map((b) => ({
    country: b.country,
    schools: b.schools ?? [],
  }));
  return <DestinationsMap buckets={destinations} />;
};
