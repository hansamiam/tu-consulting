/* Country landmark watermarks for Discover cards.
 *
 * Each scholarship card carries a subtle silhouette of a recognizable
 * landmark from the host country, watermarked into the gradient band.
 * Triggers imagination ("Eiffel for France, Mt Fuji for Japan") without
 * the visual chaos of full hero photos.
 *
 * Implementation choice: hand-drawn inline SVG. No image fetches, no
 * licensing, no broken-link risk — and silhouettes read cleaner at
 * low opacity than photographic content.
 *
 * Each silhouette uses currentColor so it inherits the band's white
 * text colour. Wrap with opacity at the call site.
 *
 * Coverage tier:
 *   · 22 hand-drawn landmarks for top scholarship-host countries
 *   · Generic globe-marker for the long tail
 *
 * SVGs use viewBox 0 0 120 60 — wider-than-tall to fit alongside text
 * in the band. Anchor right of the band so the country label stays
 * readable on the left.
 */

import React from "react";

const wrap = (children: React.ReactNode) => (
  <svg viewBox="0 0 120 60" preserveAspectRatio="xMaxYMid meet" fill="currentColor" className="h-full w-auto" aria-hidden>
    {children}
  </svg>
);

/* ─── Landmarks ──────────────────────────────────────────────────────── */

// Mt Fuji + sun (Japan)
const fuji = wrap(
  <>
    <circle cx="92" cy="18" r="6" />
    <path d="M40 52 L72 12 L104 52 Z" />
    <path d="M62 26 L66 32 L70 22 L74 30 L78 24 L82 30 L72 32 Z" fill="#fff" opacity="0.5" />
  </>
);

// Eiffel Tower (France)
const eiffel = wrap(
  <path d="M75 6 L82 6 L82 14 L84 22 L88 36 L94 52 L84 52 L82 42 L75 42 L75 36 L82 36 L82 28 L78 28 L78 22 L74 22 L74 14 L75 14 Z M68 6 L75 6 L75 14 L74 14 L74 22 L70 22 L70 28 L74 28 L74 36 L68 36 L68 42 L75 42 L73 52 L63 52 L69 36 L73 22 L75 14 L68 14 Z" />
);

// Big Ben — wider rectangular tower with stepped top, clock face,
// and a clearly distinguishable spire. Earlier version was reading
// as an upward arrow because the spire was too dominant relative
// to the body.
const bigBen = wrap(
  <>
    {/* Tower base — wider, taller, recognizably a building */}
    <rect x="70" y="20" width="20" height="32" />
    {/* Stepped clock-face section */}
    <rect x="68" y="24" width="24" height="14" />
    {/* Clock face circle */}
    <circle cx="80" cy="31" r="3.5" fill="currentColor" opacity="0.35" />
    <circle cx="80" cy="31" r="2" fill="#fff" opacity="0.55" />
    {/* Belfry cap */}
    <rect x="72" y="14" width="16" height="6" />
    {/* Pyramidal roof */}
    <polygon points="72,14 88,14 80,4" />
    {/* Tiny spire on top */}
    <rect x="79" y="0" width="2" height="4" />
    {/* Ground line */}
    <rect x="64" y="50" width="32" height="2" fill="currentColor" opacity="0.6" />
  </>
);

// Statue of Liberty crown (US — east coast iconic)
const liberty = wrap(
  <>
    <path d="M75 52 L75 32 L66 32 L80 6 L94 32 L85 32 L85 52 Z" />
    <path d="M70 26 L80 12 L90 26" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.6" />
    <circle cx="80" cy="22" r="1.5" />
  </>
);

// Brandenburg Gate columns (Germany)
const brandenburg = wrap(
  <>
    <rect x="52" y="14" width="56" height="6" />
    <rect x="55" y="20" width="4" height="32" />
    <rect x="64" y="20" width="4" height="32" />
    <rect x="73" y="20" width="4" height="32" />
    <rect x="82" y="20" width="4" height="32" />
    <rect x="91" y="20" width="4" height="32" />
    <rect x="100" y="20" width="4" height="32" />
    <rect x="64" y="6" width="32" height="8" />
  </>
);

// Pagoda (China — multi-roof)
const pagoda = wrap(
  <>
    <path d="M62 16 L98 16 L94 22 L66 22 Z" />
    <path d="M64 26 L96 26 L92 32 L68 32 Z" />
    <path d="M66 36 L94 36 L90 42 L70 42 Z" />
    <rect x="76" y="42" width="8" height="10" />
    <rect x="78" y="6" width="4" height="10" />
    <circle cx="80" cy="6" r="2" />
  </>
);

// Maple leaf (Canada) — recognizable 11-point silhouette of the
// flag's central icon. Earlier version read as an 8-pointed star
// because the points were too symmetrical and not pinched at the
// stem. This version follows the canonical maple-leaf outline:
// pointed tip up, lobes left/right at 30°/60°/120°, stem at the
// bottom.
const maple = wrap(
  <g transform="translate(80 30)">
    <path d="M 0,-22
             L 3,-12
             L 11,-15
             L 9,-7
             L 19,-4
             L 12,2
             L 16,8
             L 7,7
             L 9,15
             L 2,11
             L 0,22
             L -2,11
             L -9,15
             L -7,7
             L -16,8
             L -12,2
             L -19,-4
             L -9,-7
             L -11,-15
             L -3,-12
             Z" />
    {/* Stem */}
    <rect x="-1" y="18" width="2" height="6" />
  </g>
);

// Sydney Opera House (Australia)
const opera = wrap(
  <>
    <path d="M40 52 Q44 22 60 26 Q56 38 60 52 Z" />
    <path d="M56 52 Q60 26 76 30 Q72 40 76 52 Z" />
    <path d="M72 52 Q76 30 92 34 Q88 42 92 52 Z" />
    <path d="M88 52 Q92 34 108 38 Q104 44 108 52 Z" />
  </>
);

// Marina Bay Sands triple-tower (Singapore)
const marinaBay = wrap(
  <>
    <rect x="50" y="22" width="10" height="30" />
    <rect x="68" y="18" width="10" height="34" />
    <rect x="86" y="22" width="10" height="30" />
    <path d="M44 22 L102 22 L98 16 L48 16 Z" />
  </>
);

// Burj Khalifa tall spike (UAE)
const burj = wrap(
  <>
    <path d="M76 52 L78 18 L80 4 L82 18 L84 52 Z" />
    <path d="M72 52 L74 28 L86 28 L88 52 Z" opacity="0.85" />
    <path d="M68 52 L70 36 L90 36 L92 52 Z" opacity="0.7" />
  </>
);

// Taj Mahal (India)
const taj = wrap(
  <>
    <rect x="68" y="36" width="24" height="16" />
    <path d="M72 36 Q80 18 88 36 Z" />
    <path d="M62 30 L62 52" stroke="currentColor" strokeWidth="2" />
    <path d="M98 30 L98 52" stroke="currentColor" strokeWidth="2" />
    <circle cx="80" cy="20" r="2" />
  </>
);

// Pyramids (Egypt)
const pyramids = wrap(
  <>
    <path d="M50 52 L72 18 L94 52 Z" />
    <path d="M82 52 L100 26 L118 52 Z" opacity="0.7" />
  </>
);

// Matterhorn (Switzerland)
const matterhorn = wrap(
  <>
    <path d="M40 52 L72 8 L86 28 L100 18 L116 52 Z" />
    <path d="M68 14 L72 16 L70 22 L75 18 L73 26 L78 22 L75 28" fill="#fff" opacity="0.45" />
  </>
);

// Windmill (Netherlands)
const windmill = wrap(
  <>
    <path d="M76 52 L80 22 L84 22 L88 52 Z" />
    <circle cx="82" cy="22" r="2" />
    <path d="M82 22 L82 4 L86 6 L82 22" />
    <path d="M82 22 L100 22 L98 26 L82 22" />
    <path d="M82 22 L82 40 L78 38 L82 22" />
    <path d="M82 22 L64 22 L66 18 L82 22" />
  </>
);

// Christ the Redeemer (Brazil)
const redeemer = wrap(
  <>
    <path d="M76 52 L76 32 L70 32 L70 26 L76 26 L76 16 Q80 14 84 16 L84 26 L90 26 L90 32 L84 32 L84 52 Z" />
    <circle cx="80" cy="12" r="2" />
  </>
);

// Hanok (Korea — traditional roof curve)
const hanok = wrap(
  <>
    <path d="M44 32 Q60 12 80 18 Q100 12 116 32 L114 36 Q98 26 80 28 Q62 26 46 36 Z" />
    <rect x="58" y="36" width="44" height="16" />
    <rect x="76" y="40" width="8" height="12" fill="#fff" opacity="0.45" />
  </>
);

// Sagrada-style spires (Spain)
const sagrada = wrap(
  <>
    <path d="M58 52 L60 30 L62 36 L64 28 L66 38 L68 52 Z" />
    <path d="M70 52 L72 18 L74 30 L76 12 L78 30 L80 18 L82 52 Z" />
    <path d="M84 52 L86 24 L88 32 L90 18 L92 32 L94 24 L96 52 Z" />
    <path d="M98 52 L100 30 L102 36 L104 32 L106 38 L108 52 Z" />
  </>
);

// Colosseum arches (Italy)
const colosseum = wrap(
  <>
    <path d="M40 52 Q40 26 80 24 Q120 26 120 52 Z" />
    <circle cx="56" cy="42" r="4" fill="#fff" opacity="0.5" />
    <circle cx="68" cy="38" r="4" fill="#fff" opacity="0.5" />
    <circle cx="80" cy="36" r="4" fill="#fff" opacity="0.5" />
    <circle cx="92" cy="38" r="4" fill="#fff" opacity="0.5" />
    <circle cx="104" cy="42" r="4" fill="#fff" opacity="0.5" />
  </>
);

// Saint Basil's onion domes (Russia)
const stBasils = wrap(
  <>
    <path d="M50 52 L50 36 Q56 26 62 36 L62 52 Z" />
    <path d="M64 52 L64 30 Q72 14 80 30 L80 52 Z" />
    <path d="M82 52 L82 36 Q88 26 94 36 L94 52 Z" />
    <path d="M96 52 L96 30 Q104 18 112 30 L112 52 Z" />
    <circle cx="56" cy="22" r="2" />
    <circle cx="72" cy="10" r="2" />
    <circle cx="88" cy="22" r="2" />
    <circle cx="104" cy="14" r="2" />
  </>
);

// Hong Kong skyline
const hkSkyline = wrap(
  <>
    <rect x="40" y="32" width="6" height="20" />
    <rect x="48" y="22" width="8" height="30" />
    <rect x="58" y="14" width="6" height="38" />
    <rect x="66" y="20" width="10" height="32" />
    <rect x="78" y="8" width="6" height="44" />
    <path d="M81 8 L81 0" stroke="currentColor" strokeWidth="1" />
    <rect x="86" y="16" width="8" height="36" />
    <rect x="96" y="24" width="6" height="28" />
    <rect x="104" y="20" width="8" height="32" />
    <rect x="114" y="28" width="4" height="24" />
  </>
);

// Lion silhouette (Africa generic — can substitute for SA, Kenya, Ethiopia, etc.)
const acacia = wrap(
  <>
    {/* acacia tree silhouette + sunset oval — distinctively African savanna */}
    <ellipse cx="80" cy="28" rx="32" ry="8" />
    <rect x="78" y="28" width="4" height="24" />
    <path d="M70 38 L74 52 M86 38 L90 52" stroke="currentColor" strokeWidth="2" />
  </>
);

// Generic globe with pin (default fallback)
const globe = wrap(
  <>
    <circle cx="80" cy="30" r="20" stroke="currentColor" strokeWidth="2" fill="none" />
    <ellipse cx="80" cy="30" rx="20" ry="8" stroke="currentColor" strokeWidth="1" fill="none" />
    <line x1="60" y1="30" x2="100" y2="30" stroke="currentColor" strokeWidth="1" />
    <line x1="80" y1="10" x2="80" y2="50" stroke="currentColor" strokeWidth="1" />
    <circle cx="86" cy="20" r="2.5" fill="currentColor" />
  </>
);

/* ─── Country → landmark dispatch ───────────────────────────────────────
 *
 * Reasonable fallbacks: countries without a specific landmark fall to
 * a regional sibling (e.g. Austria → Brandenburg-style columns,
 * Norway → Matterhorn) so the long tail still feels intentional.
 */
const COUNTRY_ART: Record<string, React.ReactNode> = {
  // Asia-Pacific
  Japan: fuji, China: pagoda, "Hong Kong": hkSkyline, Taiwan: pagoda,
  Korea: hanok, "South Korea": hanok,
  Singapore: marinaBay, Malaysia: marinaBay, Indonesia: pagoda,
  Thailand: pagoda, Vietnam: pagoda, Philippines: marinaBay,
  Australia: opera, "New Zealand": opera, Brunei: marinaBay,
  India: taj, "Sri Lanka": taj, Pakistan: taj, Bangladesh: taj,

  // Middle East / North Africa
  UAE: burj, "Saudi Arabia": burj, Israel: burj, Turkey: stBasils,
  Egypt: pyramids, Iran: stBasils, Qatar: burj,

  // Africa
  "South Africa": acacia, Kenya: acacia, Ethiopia: acacia,
  Rwanda: acacia, Ghana: acacia, Nigeria: acacia, Tanzania: acacia,

  // Europe — UK & Ireland
  "United Kingdom": bigBen, UK: bigBen, Ireland: bigBen, Scotland: bigBen,

  // Europe — Continental
  France: eiffel, Germany: brandenburg, Austria: brandenburg,
  Switzerland: matterhorn, Netherlands: windmill, Belgium: brandenburg,
  Italy: colosseum, Spain: sagrada, Portugal: sagrada,
  Sweden: matterhorn, Norway: matterhorn, Finland: matterhorn,
  Denmark: windmill, Iceland: matterhorn,
  Russia: stBasils, Poland: brandenburg, Czechia: brandenburg,
  Hungary: brandenburg, Romania: brandenburg, Greece: colosseum,
  Bulgaria: stBasils, Croatia: colosseum, Lithuania: brandenburg,
  Latvia: brandenburg, Slovakia: brandenburg, Estonia: brandenburg,
  EU: brandenburg,

  // North America
  "United States": liberty, USA: liberty, US: liberty,
  Canada: maple, Mexico: pyramids,

  // Latin America
  Brazil: redeemer, Argentina: redeemer, Chile: redeemer,
  Colombia: redeemer, Peru: pyramids, Cuba: redeemer,
  Uruguay: redeemer, Ecuador: redeemer,

  // Default / multi-country
  Global: globe, Multiple: globe, International: globe,
};

export const CountryArt = ({ country, className = "" }: { country: string | null | undefined; className?: string }) => {
  const art = (country && COUNTRY_ART[country]) || globe;
  return <span className={className}>{art}</span>;
};

/* CampusPattern — a tiling SVG of gothic-arch windows + classical columns
 * + a low silhouette of a campus quad. Layered into the card band between
 * the gradient and the country landmark so each card whispers
 * "imagine yourself walking these courtyards" without per-program
 * photography. Stroke uses currentColor; render with text-white/X for
 * the right luminance against the band. */
export const CampusPattern = ({ className = "", patternId = "campus-pattern" }: { className?: string; patternId?: string }) => (
  <svg
    viewBox="0 0 600 60"
    preserveAspectRatio="xMidYMid slice"
    className={className}
    aria-hidden
  >
    <defs>
      <pattern id={patternId} x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
        {/* Gothic arch window — pointed top + cross-mullion */}
        <path
          d="M10 50 L10 25 Q10 12 20 12 Q30 12 30 25 L30 50 Z"
          fill="none" stroke="currentColor" strokeWidth="0.8"
        />
        <line x1="20" y1="14" x2="20" y2="50" stroke="currentColor" strokeWidth="0.5" />
        <line x1="10" y1="32" x2="30" y2="32" stroke="currentColor" strokeWidth="0.5" />
        {/* Classical column / pilaster between arches */}
        <line x1="40" y1="12" x2="40" y2="50" stroke="currentColor" strokeWidth="0.7" />
        <rect x="38" y="46" width="4" height="3" fill="currentColor" opacity="0.5" />
        <rect x="38" y="13" width="4" height="2" fill="currentColor" opacity="0.5" />
        {/* Tiny finial / spire above */}
        <path d="M50 12 L52 6 L54 12 Z" fill="currentColor" opacity="0.6" />
        <line x1="52" y1="12" x2="52" y2="50" stroke="currentColor" strokeWidth="0.4" />
      </pattern>
    </defs>
    <rect x="0" y="0" width="600" height="60" fill={`url(#${patternId})`} />
  </svg>
);
