/**
 * useAdjacentSuggestions — hook that resolves 3 adjacent-tier countries
 * from a primary ISO code and fetches one representative published
 * scholarship per adjacent country from Supabase.
 *
 * Used by WhereYouCanLand (magazine section) and BriefStory Frame 04.
 * On any per-country fetch failure, that slot degrades gracefully to a
 * CTA without sample data.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAdjacentCountries, COUNTRY_NAMES, type CountryISO } from "./adjacent-countries";

export interface AdjacentSample {
  iso: CountryISO;
  /** Localized display name. */
  name: string;
  /** First published scholarship's host_university — may be undefined. */
  sampleSchool?: string;
  /** scholarship_id for a direct /discover link — may be undefined. */
  sampleScholarshipId?: string;
}

/**
 * Resolves adjacent country suggestions for a primary ISO code.
 * Returns [] while loading or when primaryIso is null.
 *
 * @param primaryIso - ISO code of the user's primary destination country.
 * @param lang - display language for country names.
 */
export const useAdjacentSuggestions = (
  primaryIso: CountryISO | null,
  lang: "en" | "ru" = "en",
): AdjacentSample[] => {
  const [samples, setSamples] = useState<AdjacentSample[]>([]);

  useEffect(() => {
    if (!primaryIso) {
      setSamples([]);
      return;
    }
    let cancelled = false;

    (async () => {
      const adjacent = getAdjacentCountries(primaryIso, 3);
      const results: AdjacentSample[] = [];

      for (const iso of adjacent) {
        const name = COUNTRY_NAMES[iso]?.[lang] ?? iso;
        // Use the English name for the DB query — host_country stores English.
        const hostCountryEn = COUNTRY_NAMES[iso]?.en ?? iso;
        try {
          const { data } = await supabase
            .from("scholarships")
            .select("scholarship_id, host_university")
            .eq("host_country", hostCountryEn)
            .eq("is_published", true)
            .limit(1)
            .maybeSingle();
          results.push({
            iso,
            name,
            sampleSchool: data?.host_university ?? undefined,
            sampleScholarshipId: data?.scholarship_id ?? undefined,
          });
        } catch {
          results.push({ iso, name });
        }
      }

      if (!cancelled) setSamples(results);
    })();

    return () => {
      cancelled = true;
    };
  }, [primaryIso, lang]);

  return samples;
};
