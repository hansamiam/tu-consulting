/**
 * Nationality bucket — coarse 5-way regional split used as a B1
 * deep-dive cache key. The "How to win this scholarship" insight
 * varies regionally (visa realism, language exemptions, application
 * conventions) but is NOT individually unique per student. Caching
 * by bucket means the first member from each bucket pays generation
 * latency once and every subsequent member from that bucket gets
 * instant rendering.
 *
 * Buckets are intentionally coarse — finer-grained slicing wastes
 * the cache. The 'all' bucket is reserved for B2 rows (profile-
 * personalized, not bucket-keyed) so the same table can hold both
 * card types under a non-null PK column.
 *
 * This module is purely for cache partitioning. When the CIS bucket
 * is needed for editorial-rules cultural-context (e.g. pre-med ban,
 * first-to-leave-home framing), use `resolveCulturalContext` from
 * editorial-rules.ts separately.
 */

export type NationalityBucket =
  | "central_asia"
  | "mena"
  | "se_asia"
  | "us_latam"
  | "other"
  | "all";

const CENTRAL_ASIA = new Set([
  "KZ", "KG", "UZ", "TJ", "TM", "RU", "BY", "UA", "AM", "AZ", "GE",
]);

const MENA = new Set([
  "AE", "BH", "EG", "IL", "IQ", "IR", "JO", "KW", "LB",
  "OM", "PS", "QA", "SA", "SY", "TR", "YE",
  "DZ", "LY", "MA", "TN", "SD",
]);

const SE_ASIA = new Set([
  "BN", "ID", "KH", "LA", "MM", "MY", "PH", "SG", "TH", "TL", "VN",
]);

const US_LATAM = new Set([
  "US", "CA",
  "AR", "BO", "BR", "CL", "CO", "CR", "CU", "DO", "EC", "GT",
  "HN", "MX", "NI", "PA", "PE", "PY", "SV", "UY", "VE",
]);

// Free-text nationality intake → ISO-2. Extend cautiously; matching is
// lower-cased substring-free, so add unambiguous mappings only.
const NAME_TO_ISO: Record<string, string> = {
  kazakhstan: "KZ", kazakh: "KZ",
  kyrgyzstan: "KG", kyrgyz: "KG",
  uzbekistan: "UZ", uzbek: "UZ",
  tajikistan: "TJ",
  turkmenistan: "TM",
  russia: "RU", russian: "RU",
  belarus: "BY", belarusian: "BY",
  ukraine: "UA", ukrainian: "UA",
  armenia: "AM",
  azerbaijan: "AZ",
  georgia: "GE",
};

export function bucketFor(nationality?: string | null): NationalityBucket {
  if (!nationality) return "other";
  const trimmed = nationality.trim();
  if (!trimmed) return "other";

  const iso = trimmed.toUpperCase().slice(0, 2);
  if (CENTRAL_ASIA.has(iso)) return "central_asia";
  if (MENA.has(iso)) return "mena";
  if (SE_ASIA.has(iso)) return "se_asia";
  if (US_LATAM.has(iso)) return "us_latam";

  const lower = trimmed.toLowerCase();
  const mapped = NAME_TO_ISO[lower];
  if (mapped) return bucketFor(mapped);

  return "other";
}
