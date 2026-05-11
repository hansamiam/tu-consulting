/* Country landmark watermarks for Discover cards.
 *
 * Each scholarship card carries a silhouette of a recognizable landmark
 * from the host country. These have to read iconic at a glance —
 * "Eiffel = Paris/France", "Maple leaf flag = Canada", "Statue of
 * Liberty = US" — without any explanation. Generic-building shapes
 * fail the test; a building that *could* be in Berlin, Vienna, or
 * Prague is worse than no silhouette at all.
 *
 * Implementation choice: hand-drawn inline SVG. No image fetches, no
 * licensing, no broken-link risk — and silhouettes read cleaner at
 * low opacity than photographic content.
 *
 * Each silhouette uses currentColor so it inherits the band's white
 * text colour. Wrap with opacity at the call site.
 *
 * SVGs use viewBox 0 0 120 60 — wider-than-tall to fit alongside text
 * in the band. Most landmarks anchor right of the band so the country
 * label stays readable on the left. Some flag-icon landmarks (maple
 * leaf, sun-disk) center themselves.
 */

import React from "react";

const wrap = (children: React.ReactNode) => (
  <svg viewBox="0 0 120 60" preserveAspectRatio="xMaxYMid meet" fill="currentColor" className="h-full w-auto" aria-hidden>
    {children}
  </svg>
);

/* ─── Landmarks ──────────────────────────────────────────────────────── */

// Mt Fuji + sun (Japan) — symmetrical snow-capped cone, rising sun
// behind. Snow cap is the giveaway for Fuji vs a generic mountain.
const fuji = wrap(
  <>
    <circle cx="98" cy="20" r="7" />
    {/* Mountain body */}
    <path d="M40 54 L72 12 L104 54 Z" />
    {/* Snow cap — the iconic jagged white tip */}
    <path d="M62 26 L66 32 L70 22 L74 30 L78 24 L82 30 L72 32 Z" fill="#fff" opacity="0.55" />
    {/* Base shadow */}
    <path d="M40 54 L104 54 L100 56 L44 56 Z" opacity="0.4" />
  </>
);

// Eiffel Tower (France) — four legs, two arches, narrow body, antenna
// on top. Re-drawn as a true silhouette outline rather than the
// previous criss-cross paths which read as a Christmas tree at low
// opacity. The dual lower arches + the pointed top are what make it
// unmistakable.
const eiffel = wrap(
  <>
    {/* Outer silhouette — base flares wide, body tapers, antenna spike */}
    <path d="M62 54 L70 38 L72 26 L74 16 L75 8 L76 4 L77 8 L78 16 L80 26 L82 38 L90 54 L84 54 L80 44 L78 38 L76 38 L74 38 L72 38 L72 44 L68 54 Z" />
    {/* Lower arch — the iconic Champ-de-Mars view */}
    <path d="M64 50 Q76 38 88 50 L88 54 L82 54 Q76 46 70 54 L64 54 Z" />
    {/* Mid-platform line */}
    <rect x="71" y="22" width="10" height="1.5" opacity="0.6" />
    <rect x="69" y="34" width="14" height="1.5" opacity="0.6" />
    {/* Antenna */}
    <rect x="75.5" y="0" width="1" height="8" />
  </>
);

// Big Ben (UK) — square clock tower with a clear clock face and the
// pyramidal spire. Roman-numeral hint via a cross on the clock face
// to differentiate from a generic spire.
const bigBen = wrap(
  <>
    {/* Tower base */}
    <rect x="70" y="22" width="20" height="30" />
    {/* Clock-face section — slightly wider than the base */}
    <rect x="67" y="26" width="26" height="14" />
    {/* Clock face */}
    <circle cx="80" cy="33" r="4.5" fill="currentColor" opacity="0.35" />
    <circle cx="80" cy="33" r="3.2" fill="#fff" opacity="0.8" />
    {/* Clock hands — points to 12 + 3 ish */}
    <line x1="80" y1="33" x2="80" y2="30" stroke="currentColor" strokeWidth="0.6" />
    <line x1="80" y1="33" x2="83" y2="33" stroke="currentColor" strokeWidth="0.6" />
    {/* Belfry above the clock */}
    <rect x="71" y="18" width="18" height="6" />
    {/* Pyramidal roof */}
    <polygon points="71,18 89,18 80,8" />
    {/* Spire */}
    <rect x="79.3" y="2" width="1.4" height="6" />
    <circle cx="80" cy="2" r="1" />
    {/* Ground line */}
    <rect x="64" y="51" width="32" height="2" opacity="0.6" />
  </>
);

// Statue of Liberty (US) — full figure: torch arm raised, crown with
// 7 spikes, robe-draped body, pedestal. Dramatically more iconic than
// the previous crown-only crop, which read as a generic obelisk.
const liberty = wrap(
  <>
    {/* Pedestal */}
    <rect x="72" y="48" width="18" height="6" />
    <rect x="74" y="46" width="14" height="2" opacity="0.6" />
    {/* Robe / body */}
    <path d="M76 48 L76 28 L78 24 L82 24 L84 28 L84 48 Z" />
    {/* Head + crown spikes (7 — canonical) */}
    <circle cx="80" cy="20" r="3" />
    <path d="M73 17 L75 11 L76 16 L78 9 L80 16 L82 9 L84 16 L85 11 L87 17" />
    {/* Torch arm — raised high */}
    <path d="M82 24 L88 14 L90 4 L92 4 L92 14 L86 24 Z" />
    {/* Flame */}
    <path d="M89 4 Q91 -2 93 4 Q92 0 91 4 Z" />
    {/* Tablet held in left arm */}
    <rect x="68" y="28" width="6" height="9" opacity="0.85" />
    <line x1="69" y1="30" x2="73" y2="30" stroke="#fff" strokeWidth="0.4" opacity="0.7" />
    <line x1="69" y1="32" x2="73" y2="32" stroke="#fff" strokeWidth="0.4" opacity="0.7" />
    <line x1="69" y1="34" x2="73" y2="34" stroke="#fff" strokeWidth="0.4" opacity="0.7" />
  </>
);

// Brandenburg Gate (Germany) — five-passage colonnade with the
// quadriga (chariot pulled by 4 horses) crowning the attic. The
// quadriga + the wide attic block + the column-spacing rhythm is
// what separates this from any other columned building. Pre-fix
// the horses were tiny abstract dots that read as decoration
// rather than a sculpture; now drawn as silhouetted horse forms
// with a clear chariot wheel and the wreathed Victoria figure.
const brandenburg = wrap(
  <>
    {/* Quadriga — chariot pulled by 4 horses, distinctive Berlin
        silhouette. Horses' legs + chariot wheel give it shape. */}
    {/* Chariot wheel */}
    <circle cx="92" cy="9" r="2.5" fill="none" stroke="currentColor" strokeWidth="0.7" />
    {/* Chariot box */}
    <rect x="88" y="6" width="6" height="3" />
    {/* Victoria figure on chariot — abstract */}
    <rect x="89.5" y="2" width="1.5" height="4" />
    <circle cx="90.3" cy="2" r="0.9" />
    {/* Four horses — abstracted as forward-leaning silhouettes */}
    <path d="M 64 11 L 65 7 L 67 7 L 67 11 L 68 11 L 68 8 L 70 7 L 71 8 L 70 11 Z" />
    <path d="M 70 11 L 71 7 L 73 7 L 73 11 L 74 11 L 74 8 L 76 7 L 77 8 L 76 11 Z" />
    <path d="M 76 11 L 77 7 L 79 7 L 79 11 L 80 11 L 80 8 L 82 7 L 83 8 L 82 11 Z" />
    <path d="M 82 11 L 83 7 L 85 7 L 85 11 L 86 11 L 86 8 L 88 7 L 89 8 L 88 11 Z" />
    {/* Attic block under the quadriga — wide rectangular podium */}
    <rect x="56" y="11" width="48" height="6" />
    {/* Cornice / entablature */}
    <rect x="54" y="17" width="52" height="3" />
    {/* Six Doric columns — even spacing, classical proportions */}
    <rect x="55" y="20" width="4" height="32" />
    <rect x="64" y="20" width="4" height="32" />
    <rect x="73" y="20" width="4" height="32" />
    <rect x="83" y="20" width="4" height="32" />
    <rect x="92" y="20" width="4" height="32" />
    <rect x="101" y="20" width="4" height="32" />
    {/* Capitals on column tops — subtle but reads as Doric */}
    <rect x="54" y="20" width="6" height="1.2" opacity="0.7" />
    <rect x="63" y="20" width="6" height="1.2" opacity="0.7" />
    <rect x="72" y="20" width="6" height="1.2" opacity="0.7" />
    <rect x="82" y="20" width="6" height="1.2" opacity="0.7" />
    <rect x="91" y="20" width="6" height="1.2" opacity="0.7" />
    <rect x="100" y="20" width="6" height="1.2" opacity="0.7" />
    {/* Base / stylobate */}
    <rect x="50" y="52" width="60" height="2" opacity="0.7" />
  </>
);

// Forbidden City pagoda + lantern (China) — three-tier upturned roofs
// with the central lantern that distinguishes it from generic SE-Asia
// pagodas.
const pagoda = wrap(
  <>
    {/* Central spire / lantern on top */}
    <circle cx="80" cy="6" r="2.5" />
    <rect x="79" y="8" width="2" height="4" />
    {/* Top roof — narrowest, pronounced upturned eaves */}
    <path d="M68 16 L92 16 Q90 20 80 12 Q70 20 68 16 Z" />
    {/* Mid roof */}
    <path d="M64 24 L96 24 Q94 28 80 20 Q66 28 64 24 Z" />
    {/* Bottom roof — widest */}
    <path d="M58 34 L102 34 Q100 38 80 30 Q60 38 58 34 Z" />
    {/* Body / entrance */}
    <rect x="72" y="38" width="16" height="14" />
    <rect x="78" y="42" width="4" height="10" fill="#fff" opacity="0.5" />
  </>
);

// Maple leaf (Canada) — canonical 11-point silhouette as it appears
// on the Canadian flag, with the short rectangular stem the flag
// design uses. The 11 outer points: 1 apex + 2 upper shoulder peaks
// + 2 widest "horns" + 2 lower side peaks + 2 inner-near-stem points
// + 2 stem corners. Pre-fix the path's lobe coordinates produced a
// blob that read as "some plant leaf, maybe?" rather than the iconic
// flag silhouette. Re-traced from the canonical Pearson-pennant
// proportions: deep notches between each pair of points, sharp apex,
// short straight stem at the bottom anchor.
const maple = wrap(
  <g transform="translate(80 30)">
    <path d="M 0,-24
             L 2,-13
             L 4,-12
             L 12,-13
             L 11,-7
             L 10,-5
             L 22,-1
             L 17,3
             L 16,5
             L 19,12
             L 11,11
             L 9,12
             L 11,19
             L 4,17
             L 3,18
             L 4,24
             L -4,24
             L -3,18
             L -4,17
             L -11,19
             L -9,12
             L -11,11
             L -19,12
             L -16,5
             L -17,3
             L -22,-1
             L -10,-5
             L -11,-7
             L -12,-13
             L -4,-12
             L -2,-13
             Z" />
  </g>
);

// Sydney Opera House (Australia) — overlapping sail/shell roofs in
// the iconic stepped arrangement. The asymmetric sails are what
// distinguish it from any other concert hall.
const opera = wrap(
  <>
    {/* Harbour line — anchor */}
    <rect x="36" y="52" width="80" height="2" opacity="0.5" />
    {/* Five sail shells, ascending then descending */}
    <path d="M40 52 Q44 32 56 30 Q56 42 60 52 Z" />
    <path d="M54 52 Q58 26 72 24 Q72 38 76 52 Z" />
    <path d="M70 52 Q76 20 90 18 Q90 36 94 52 Z" />
    <path d="M86 52 Q92 24 102 22 Q102 38 106 52 Z" />
    <path d="M100 52 Q104 32 114 30 Q114 42 118 52 Z" />
  </>
);

// Marina Bay Sands (Singapore) — three towers connected by the
// horizontal SkyPark roof. The cantilevered top is what makes it
// instantly identifiable as Singapore.
const marinaBay = wrap(
  <>
    {/* Three towers — tapering inward at the top */}
    <path d="M50 52 L52 22 L60 22 L58 52 Z" />
    <path d="M68 52 L70 18 L78 18 L76 52 Z" />
    <path d="M86 52 L88 22 L96 22 L94 52 Z" />
    {/* SkyPark — cantilevered out beyond the towers, the iconic
        "boat on three pillars" silhouette */}
    <path d="M44 22 L102 22 L104 14 L102 16 L48 16 L46 14 Z" />
    <rect x="44" y="16" width="60" height="6" opacity="0.85" />
    {/* Hint of trees / pool on top */}
    <circle cx="60" cy="13" r="1" opacity="0.6" />
    <circle cx="80" cy="13" r="1" opacity="0.6" />
    <circle cx="92" cy="13" r="1" opacity="0.6" />
  </>
);

// Burj Khalifa (UAE) — the world's tallest, distinctive setbacks.
const burj = wrap(
  <>
    {/* Antenna spire */}
    <rect x="79.5" y="0" width="1" height="6" />
    {/* Tapering body with stepped setbacks — the distinctive triple-lobe */}
    <path d="M75 52 L77 28 L78 12 L80 6 L82 12 L83 28 L85 52 Z" />
    <path d="M71 52 L73 30 L77 30 L75 52 Z" opacity="0.85" />
    <path d="M85 52 L87 30 L83 30 L85 52 Z" opacity="0.85" />
    <path d="M67 52 L69 38 L73 38 L71 52 Z" opacity="0.7" />
    <path d="M89 52 L91 38 L87 38 L89 52 Z" opacity="0.7" />
  </>
);

// Taj Mahal (India) — central onion dome + four minarets + reflecting
// pool hint. Iconic symmetry.
const taj = wrap(
  <>
    {/* Reflecting-pool line */}
    <rect x="50" y="52" width="60" height="2" opacity="0.5" />
    {/* Main building base */}
    <rect x="68" y="38" width="24" height="14" />
    {/* Central onion dome */}
    <path d="M70 38 Q70 22 80 18 Q90 22 90 38 Z" />
    <path d="M78 18 L80 12 L82 18 Z" />
    <circle cx="80" cy="11" r="1" />
    {/* Four minarets — the symmetric corners */}
    <path d="M58 28 L60 26 L62 28 L62 50 L58 50 Z" />
    <path d="M98 28 L100 26 L102 28 L102 50 L98 50 Z" />
    {/* Smaller dome caps on minarets */}
    <circle cx="60" cy="26" r="1.5" />
    <circle cx="100" cy="26" r="1.5" />
    {/* Side mini-domes */}
    <path d="M64 38 Q64 32 68 30 Q68 38 68 38 Z" opacity="0.85" />
    <path d="M96 38 Q96 32 92 30 Q92 38 92 38 Z" opacity="0.85" />
  </>
);

// Pyramids of Giza (Egypt) — three pyramids in the canonical staggered
// arrangement, with the Sphinx hint in the foreground.
const pyramids = wrap(
  <>
    {/* Three pyramids — tallest centered, smaller flanking */}
    <path d="M48 52 L66 22 L84 52 Z" />
    <path d="M70 52 L88 14 L106 52 Z" />
    <path d="M94 52 L106 30 L118 52 Z" opacity="0.85" />
    {/* Sphinx hint — couchant lion silhouette in front */}
    <path d="M40 52 L42 48 L48 46 L52 48 L50 52 Z" opacity="0.7" />
    {/* Sand line */}
    <rect x="36" y="52" width="84" height="2" opacity="0.5" />
  </>
);

// Matterhorn (Switzerland) — sharp asymmetric peak with the
// distinctive bent crown that sets it apart from a generic alpine peak.
const matterhorn = wrap(
  <>
    <path d="M40 54 L70 18 L78 26 L88 12 L100 22 L116 54 Z" />
    {/* Snow streaks on the dark side */}
    <path d="M68 22 L72 26 L70 30 L74 26 L72 32" stroke="#fff" strokeWidth="0.6" fill="none" opacity="0.5" />
    {/* Bent peak — Matterhorn's distinctive lean */}
    <path d="M86 14 L88 12 L92 18" fill="#fff" opacity="0.55" />
  </>
);

// Windmill (Netherlands) — traditional Dutch four-sail mill with
// brick body and balcony. Sails are the unmistakable mark.
const windmill = wrap(
  <>
    {/* Tower body — tapered */}
    <path d="M74 52 L78 22 L86 22 L90 52 Z" />
    {/* Cap */}
    <path d="M76 22 L88 22 L86 18 L78 18 Z" />
    {/* Balcony */}
    <rect x="73" y="38" width="18" height="2" opacity="0.7" />
    {/* Door */}
    <rect x="80" y="44" width="4" height="8" fill="#fff" opacity="0.5" />
    {/* Hub */}
    <circle cx="82" cy="22" r="2" />
    {/* Four sails — spinning angle, narrow + lath texture */}
    <path d="M82 22 L82 4 L86 4 L84 22 Z" />
    <path d="M82 22 L100 22 L100 26 L82 24 Z" />
    <path d="M82 22 L82 40 L78 40 L80 22 Z" />
    <path d="M82 22 L64 22 L64 18 L82 20 Z" />
  </>
);

// Christ the Redeemer (Brazil) — figure with arms outstretched on
// the mountain, viewed from below. The cruciform pose is the icon.
const redeemer = wrap(
  <>
    {/* Mountain base — Corcovado hint */}
    <path d="M58 54 Q80 50 102 54 L102 56 L58 56 Z" opacity="0.5" />
    {/* Pedestal */}
    <rect x="74" y="44" width="12" height="8" />
    {/* Body — robe */}
    <path d="M76 44 L77 28 L83 28 L84 44 Z" />
    {/* Outstretched arms — the iconic cruciform */}
    <rect x="60" y="24" width="40" height="4" />
    {/* Drapery on arms */}
    <path d="M60 28 L60 32 L70 30 L70 28 Z" opacity="0.7" />
    <path d="M100 28 L100 32 L90 30 L90 28 Z" opacity="0.7" />
    {/* Head */}
    <circle cx="80" cy="22" r="2" />
  </>
);

// Hanok (South Korea) — traditional gabled tile roof with the
// distinctive concave curve and ridge ornaments.
const hanok = wrap(
  <>
    {/* Tile roof with deep concave curve — the signature */}
    <path d="M44 30 Q60 14 80 18 Q100 14 116 30 L114 34 Q98 24 80 26 Q62 24 46 34 Z" />
    {/* Ridge ornaments — chimi at the eaves */}
    <circle cx="46" cy="32" r="1.5" />
    <circle cx="114" cy="32" r="1.5" />
    {/* Ridge cap */}
    <rect x="78" y="14" width="4" height="3" />
    {/* Wall */}
    <rect x="58" y="34" width="44" height="18" />
    {/* Wooden door — hanok grid */}
    <rect x="76" y="38" width="8" height="14" fill="#fff" opacity="0.5" />
    <line x1="76" y1="45" x2="84" y2="45" stroke="currentColor" strokeWidth="0.4" opacity="0.7" />
    <line x1="80" y1="38" x2="80" y2="52" stroke="currentColor" strokeWidth="0.4" opacity="0.7" />
  </>
);

// Sagrada Família (Spain) — the four central spires with the
// distinctive lattice/spire texture Gaudí designed.
const sagrada = wrap(
  <>
    {/* Four progressively-taller central towers — the Nativity facade */}
    <path d="M58 52 L60 30 L62 36 L64 28 L66 38 L68 52 Z" />
    <path d="M70 52 L72 18 L74 30 L76 12 L78 30 L80 18 L82 52 Z" />
    <path d="M84 52 L86 18 L88 30 L90 12 L92 30 L94 18 L96 52 Z" />
    <path d="M98 52 L100 30 L102 36 L104 28 L106 38 L108 52 Z" />
    {/* Cross atop the central tallest */}
    <rect x="79.5" y="6" width="1" height="6" />
    <rect x="77.5" y="8" width="5" height="1" />
    {/* Lattice texture hints */}
    <line x1="74" y1="22" x2="76" y2="22" stroke="#fff" strokeWidth="0.4" opacity="0.5" />
    <line x1="86" y1="22" x2="88" y2="22" stroke="#fff" strokeWidth="0.4" opacity="0.5" />
  </>
);

// Colosseum (Italy) — three-tier arched ellipse. The arches at three
// different sizes are what say "Roman amphitheater" specifically.
const colosseum = wrap(
  <>
    {/* Outer ellipse profile */}
    <path d="M40 52 Q40 22 80 20 Q120 22 120 52 Z" />
    {/* Top tier — small arches */}
    <circle cx="56" cy="42" r="3" fill="#fff" opacity="0.5" />
    <circle cx="68" cy="36" r="3" fill="#fff" opacity="0.5" />
    <circle cx="80" cy="34" r="3" fill="#fff" opacity="0.5" />
    <circle cx="92" cy="36" r="3" fill="#fff" opacity="0.5" />
    <circle cx="104" cy="42" r="3" fill="#fff" opacity="0.5" />
    {/* Middle tier — medium arches */}
    <ellipse cx="56" cy="48" rx="2.5" ry="3" fill="#fff" opacity="0.45" />
    <ellipse cx="68" cy="46" rx="2.5" ry="3" fill="#fff" opacity="0.45" />
    <ellipse cx="80" cy="45" rx="2.5" ry="3" fill="#fff" opacity="0.45" />
    <ellipse cx="92" cy="46" rx="2.5" ry="3" fill="#fff" opacity="0.45" />
    <ellipse cx="104" cy="48" rx="2.5" ry="3" fill="#fff" opacity="0.45" />
    {/* Damaged section — characteristic missing wall on the south side */}
    <path d="M44 52 L44 32 Q50 22 54 26 L54 52 Z" opacity="0.5" />
  </>
);

// Saint Basil's Cathedral (Russia) — multi-spired onion-dome cathedral
// with the unmistakable swirl of colours rendered as patterned domes.
const stBasils = wrap(
  <>
    {/* Five domes — central tallest, four flanking */}
    {/* Far left */}
    <path d="M48 52 L48 34 Q54 24 60 34 L60 52 Z" />
    <circle cx="54" cy="28" r="2.5" />
    {/* Mid left */}
    <path d="M62 52 L62 32 Q68 22 74 32 L74 52 Z" />
    <circle cx="68" cy="24" r="2.5" />
    {/* Center — tallest, elaborate */}
    <path d="M76 52 L76 28 Q80 8 84 28 L84 52 Z" />
    <circle cx="80" cy="6" r="2" />
    <rect x="79.5" y="2" width="1" height="4" />
    {/* Mid right */}
    <path d="M86 52 L86 32 Q92 22 98 32 L98 52 Z" />
    <circle cx="92" cy="24" r="2.5" />
    {/* Far right */}
    <path d="M100 52 L100 34 Q106 24 112 34 L112 52 Z" />
    <circle cx="106" cy="28" r="2.5" />
    {/* Crosses on each dome — Orthodox three-bar */}
    <rect x="53.5" y="22" width="1" height="4" />
    <rect x="67.5" y="18" width="1" height="4" />
    <rect x="91.5" y="18" width="1" height="4" />
    <rect x="105.5" y="22" width="1" height="4" />
  </>
);

// Hagia Sophia (Turkey) — central low dome flanked by 4 thin
// minarets at the corners. The four-minaret crown is what
// distinguishes Istanbul's silhouette from Russia's onion-dome
// arrangement. Half-dome buttresses on either side of the main
// dome read as the Byzantine apse / Ottoman extension.
const hagiaSophia = wrap(
  <>
    {/* Four corner minarets — tall thin columns with onion-top caps */}
    <rect x="44" y="14" width="2.5" height="38" />
    <path d="M43 14 L45.25 8 L47.5 14 Z" />
    <rect x="44.6" y="6" width="1.3" height="3" />

    <rect x="56" y="10" width="2.5" height="42" />
    <path d="M55 10 L57.25 4 L59.5 10 Z" />
    <rect x="56.6" y="2" width="1.3" height="3" />

    <rect x="100" y="10" width="2.5" height="42" />
    <path d="M99 10 L101.25 4 L103.5 10 Z" />
    <rect x="100.6" y="2" width="1.3" height="3" />

    <rect x="112" y="14" width="2.5" height="38" />
    <path d="M111 14 L113.25 8 L115.5 14 Z" />
    <rect x="112.6" y="6" width="1.3" height="3" />

    {/* Side half-domes — Byzantine apses flanking the main dome */}
    <path d="M62 52 L62 36 Q66 30 70 32 L70 52 Z" opacity="0.7" />
    <path d="M88 52 L88 32 Q92 30 96 36 L96 52 Z" opacity="0.7" />

    {/* Central main dome — wide low dome on a drum */}
    <rect x="68" y="32" width="24" height="20" />
    <path d="M68 32 Q80 14 92 32 Z" />
    {/* Crescent finial on the central dome (Ottoman addition) */}
    <path d="M79 14 Q79 11 81 11 Q80 12.5 80 14 Z" />
  </>
);

// Wawel Castle (Poland) — Renaissance castle on a hill with
// distinctive cathedral spires + crenellated walls. The cluster
// of asymmetric tower shapes reads as Old Town Krakow, distinct
// from Berlin's Brandenburg quadriga.
const wawelCastle = wrap(
  <>
    {/* Hill base — gentle rise the castle sits on */}
    <path d="M40 52 L48 46 L120 46 L116 52 Z" opacity="0.55" />

    {/* Left flanking tower — square Gothic */}
    <rect x="50" y="24" width="8" height="22" />
    {/* Crenellations on top — 3 merlons */}
    <rect x="50" y="22" width="2" height="2" />
    <rect x="53" y="22" width="2" height="2" />
    <rect x="56" y="22" width="2" height="2" />

    {/* Central Wawel Cathedral — tall central tower + dome */}
    <rect x="62" y="18" width="10" height="28" />
    {/* Dome on cathedral tower (Sigismund Chapel reference) */}
    <path d="M62 18 Q67 8 72 18 Z" />
    {/* Cross on top */}
    <rect x="66.5" y="3" width="1" height="6" />
    <rect x="64.5" y="5" width="5" height="1" />

    {/* Royal Castle main wing — wide rectangular block */}
    <rect x="76" y="28" width="24" height="18" />
    {/* Roof — Renaissance pitched */}
    <path d="M76 28 L88 18 L100 28 Z" />
    {/* Windows row (decorative dots) */}
    <rect x="80" y="34" width="2" height="3" opacity="0.6" />
    <rect x="86" y="34" width="2" height="3" opacity="0.6" />
    <rect x="92" y="34" width="2" height="3" opacity="0.6" />

    {/* Right flanking tower — round Romanesque */}
    <rect x="104" y="26" width="8" height="20" />
    <path d="M104 26 Q108 18 112 26 Z" />
    <circle cx="108" cy="20" r="1" opacity="0.6" />
  </>
);

// Hong Kong skyline (Victoria Harbour) — varied tower heights with
// the distinctive IFC tapered crown.
const hkSkyline = wrap(
  <>
    <rect x="40" y="32" width="6" height="20" />
    <rect x="48" y="22" width="8" height="30" />
    <rect x="58" y="14" width="6" height="38" />
    {/* IFC-style tapered top */}
    <path d="M58 14 L61 8 L64 14 Z" />
    <rect x="66" y="20" width="10" height="32" />
    <rect x="78" y="8" width="6" height="44" />
    <rect x="80" y="0" width="2" height="8" />
    <rect x="86" y="16" width="8" height="36" />
    <rect x="96" y="24" width="6" height="28" />
    <rect x="104" y="20" width="8" height="32" />
    <path d="M104 20 L108 14 L112 20 Z" />
    <rect x="114" y="28" width="4" height="24" />
    {/* Harbour line */}
    <rect x="36" y="52" width="84" height="2" opacity="0.7" />
  </>
);

// Acacia tree + sun (Sub-Saharan Africa) — savanna icon. Wide flat
// canopy is the signature.
const acacia = wrap(
  <>
    {/* Sun */}
    <circle cx="48" cy="20" r="6" opacity="0.7" />
    {/* Acacia canopy — wide flat-topped umbrella */}
    <ellipse cx="86" cy="30" rx="26" ry="8" />
    <ellipse cx="86" cy="26" rx="20" ry="5" opacity="0.85" />
    {/* Trunk + branching */}
    <rect x="84" y="30" width="4" height="20" />
    <path d="M86 36 L78 30 M86 36 L94 30" stroke="currentColor" strokeWidth="1.2" />
    {/* Ground */}
    <rect x="40" y="52" width="80" height="2" opacity="0.6" />
  </>
);

// Yurt (Central Asia — Kazakhstan, Kyrgyzstan, Mongolia, Turkmenistan) —
// dome with shanyrak crown opening + door + tundyk smoke ring.
const yurt = wrap(
  <>
    {/* Domed body — wider base, rounded top */}
    <path d="M50 52 L50 36 Q50 16 80 16 Q110 16 110 36 L110 52 Z" />
    {/* Door — felt panel */}
    <path d="M73 52 L73 38 Q73 34 80 34 Q87 34 87 38 L87 52 Z" fill="#fff" opacity="0.45" />
    {/* Shanyrak — central crown opening, cross of structural ribs */}
    <circle cx="80" cy="16" r="3" fill="#fff" opacity="0.4" />
    <line x1="77" y1="16" x2="83" y2="16" stroke="currentColor" strokeWidth="0.6" />
    <line x1="80" y1="13" x2="80" y2="19" stroke="currentColor" strokeWidth="0.6" />
    {/* Roof ribs radiating from shanyrak */}
    <line x1="80" y1="16" x2="55" y2="35" stroke="#fff" strokeWidth="0.5" opacity="0.4" />
    <line x1="80" y1="16" x2="80" y2="36" stroke="#fff" strokeWidth="0.5" opacity="0.4" />
    <line x1="80" y1="16" x2="105" y2="35" stroke="#fff" strokeWidth="0.5" opacity="0.4" />
  </>
);

// Baiterek Tower (Astana, Kazakhstan) — the symbol of modern Kazakhstan,
// a tall stem with a golden orb cradled in latticed branches. The orb
// at the top is the distinctive mark; pre-fix this slot was a plain
// triangle (Khan Shatyr's cone) which read as "random tent" rather
// than "Kazakhstan".
const baiterek = wrap(
  <>
    {/* Base platform */}
    <rect x="68" y="52" width="24" height="2" opacity="0.7" />
    {/* Tall central stem — slight taper toward the top */}
    <path d="M77 52 L78 24 L82 24 L83 52 Z" />
    {/* Lattice branches that cradle the orb — three pairs of curved arms */}
    <path d="M76 26 Q70 22 68 18" stroke="currentColor" strokeWidth="1" fill="none" />
    <path d="M84 26 Q90 22 92 18" stroke="currentColor" strokeWidth="1" fill="none" />
    <path d="M76 24 Q72 20 70 14" stroke="currentColor" strokeWidth="1" fill="none" />
    <path d="M84 24 Q88 20 90 14" stroke="currentColor" strokeWidth="1" fill="none" />
    <path d="M77 22 Q76 18 76 12" stroke="currentColor" strokeWidth="1" fill="none" />
    <path d="M83 22 Q84 18 84 12" stroke="currentColor" strokeWidth="1" fill="none" />
    {/* The golden orb — Baiterek's iconic sphere */}
    <circle cx="80" cy="16" r="6.5" />
    {/* Subtle highlight on the orb */}
    <circle cx="78" cy="14" r="1.8" fill="#fff" opacity="0.45" />
    {/* Apex spire */}
    <rect x="79.5" y="6" width="1" height="4" />
  </>
);

// Merlion (Singapore) — the country's mythological mascot: lion's head
// on a fish body, perched on a wave base, water arcing from the mouth.
// Pre-fix Singapore was Marina Bay Sands which is iconic but the user
// flagged it should be the Merlion as the more "this is Singapore" signal.
const merlion = wrap(
  <>
    {/* Wave base */}
    <path d="M40 52 Q60 48 80 52 Q100 48 120 52 L120 56 L40 56 Z" opacity="0.45" />
    {/* Pedestal */}
    <rect x="76" y="46" width="10" height="6" opacity="0.7" />
    {/* Fish-body curve flowing into base */}
    <path d="M74 46 Q72 38 76 32 L84 32 Q88 38 86 46 Z" />
    {/* Lion head — rounded with mane */}
    <circle cx="80" cy="26" r="8" />
    {/* Mane outline — irregular ring */}
    <path d="M72 24 Q70 18 74 14 Q72 12 76 12 Q78 8 80 12 Q82 8 84 12 Q88 12 86 14 Q90 18 88 24" fill="currentColor" opacity="0.85" />
    {/* Eye / face highlight */}
    <circle cx="78" cy="25" r="1" fill="#fff" opacity="0.45" />
    {/* Water arc spouting from the mouth */}
    <path d="M86 28 Q96 24 108 30 Q104 26 100 24" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <circle cx="108" cy="30" r="1.2" opacity="0.7" />
    <circle cx="103" cy="26" r="0.9" opacity="0.55" />
  </>
);

// Mosque silhouette — minarets + dome (Indonesia, Malaysia, Pakistan,
// MENA fallback). Crescent on top differentiates from Christian
// cathedrals.
const mosque = wrap(
  <>
    {/* Mosque body */}
    <rect x="56" y="40" width="48" height="12" />
    {/* Central dome */}
    <path d="M68 40 Q80 18 92 40" />
    {/* Crescent moon on top of dome */}
    <path d="M80 14 Q83 14 83 11 Q83 8 80 8 Q82 11 80 14 Z" />
    <rect x="79.5" y="14" width="1" height="3" />
    {/* Left minaret with bulb */}
    <rect x="50" y="22" width="4" height="18" />
    <circle cx="52" cy="20" r="2.5" />
    <rect x="51.5" y="14" width="1" height="4" />
    {/* Right minaret with bulb */}
    <rect x="106" y="22" width="4" height="18" />
    <circle cx="108" cy="20" r="2.5" />
    <rect x="107.5" y="14" width="1" height="4" />
    {/* Door arch */}
    <path d="M76 52 L76 46 Q80 42 84 46 L84 52 Z" fill="#fff" opacity="0.45" />
  </>
);

// Parthenon (Greece) — classical Doric temple atop the Acropolis.
// Pre-fix Greece pointed to Colosseum which is wrong (that's Rome).
// The Parthenon's wide stylobate, 8 columns across, low pediment,
// and subtle "ruined corner" hint distinguish it from any other
// columned building. Drawn slightly damaged on the right (a few
// columns missing) — the actual Parthenon today is half-intact.
const parthenon = wrap(
  <>
    {/* Three-step stylobate (krepidoma) — the wide stepped base */}
    <rect x="46" y="50" width="68" height="2" opacity="0.85" />
    <rect x="48" y="48" width="64" height="2" opacity="0.7" />
    {/* Pediment — wide low triangle */}
    <polygon points="50,22 80,12 110,22" />
    {/* Pediment underline / cornice */}
    <rect x="50" y="22" width="60" height="2" />
    {/* Entablature / architrave */}
    <rect x="49" y="24" width="62" height="3" />
    {/* Eight Doric columns — fluted feel via slight inset on capital */}
    <rect x="51" y="27" width="4" height="21" />
    <rect x="58" y="27" width="4" height="21" />
    <rect x="65" y="27" width="4" height="21" />
    <rect x="72" y="27" width="4" height="21" />
    <rect x="79" y="27" width="4" height="21" />
    {/* Damaged east end — only column stubs remaining (the actual
        2,400-year-old ruin signature) */}
    <rect x="86" y="38" width="4" height="10" opacity="0.7" />
    <rect x="93" y="42" width="4" height="6" opacity="0.55" />
    <rect x="100" y="34" width="4" height="14" opacity="0.7" />
    <rect x="107" y="27" width="4" height="21" />
    {/* Capital indicators on intact columns */}
    <rect x="50" y="27" width="6" height="1" opacity="0.7" />
    <rect x="57" y="27" width="6" height="1" opacity="0.7" />
    <rect x="64" y="27" width="6" height="1" opacity="0.7" />
    <rect x="71" y="27" width="6" height="1" opacity="0.7" />
    <rect x="78" y="27" width="6" height="1" opacity="0.7" />
    <rect x="106" y="27" width="6" height="1" opacity="0.7" />
  </>
);

// Saint Sophia of Kyiv (Ukraine) — Orthodox cathedral with one
// large central dome and two flanking smaller towers, gold-domed.
// Pre-fix Ukraine pointed to St Basil's which is iconically Russian
// and politically tone-deaf — Ukraine has its own millennium-old
// cathedral. Distinguished from St Basil's by its restrained dome
// arrangement (1 large + 2 small, not 5 colourful onions) and
// rectangular bell-tower silhouette.
const saintSophiaKyiv = wrap(
  <>
    {/* Lower body — wide rectangular base */}
    <rect x="58" y="38" width="44" height="14" />
    {/* Central tower with large gold dome */}
    <rect x="74" y="22" width="12" height="16" />
    <path d="M 72 22 Q 80 8 88 22 Z" />
    {/* Cross atop central dome */}
    <rect x="79.5" y="4" width="1" height="6" />
    <rect x="77.5" y="6" width="5" height="1" />
    {/* Left smaller tower + dome */}
    <rect x="62" y="28" width="8" height="10" />
    <path d="M 60 28 Q 66 18 72 28 Z" opacity="0.85" />
    <rect x="65.5" y="14" width="1" height="4" />
    {/* Right smaller tower + dome */}
    <rect x="90" y="28" width="8" height="10" />
    <path d="M 88 28 Q 94 18 100 28 Z" opacity="0.85" />
    <rect x="93.5" y="14" width="1" height="4" />
    {/* Door / entrance arch */}
    <path d="M 76 52 L 76 46 Q 80 42 84 46 L 84 52 Z" fill="#fff" opacity="0.45" />
    {/* Base line */}
    <rect x="54" y="52" width="52" height="2" opacity="0.6" />
  </>
);

// Mayan stepped pyramid (Mexico) — Chichén Itzá / El Castillo, with
// the canonical staircase up the front and the temple structure on
// top. Distinguished from Egyptian pyramids (smooth triangular
// sides) by the stepped tiers and the rectangular temple at the
// summit. Pre-fix Mexico fell to the Egyptian-pyramids silhouette
// which read as "wrong continent."
const mayanPyramid = wrap(
  <>
    {/* Six stepped tiers — the iconic Chichén Itzá profile */}
    <rect x="56" y="46" width="48" height="6" />
    <rect x="58" y="40" width="44" height="6" />
    <rect x="60" y="34" width="40" height="6" />
    <rect x="62" y="28" width="36" height="6" />
    <rect x="64" y="22" width="32" height="6" />
    <rect x="66" y="16" width="28" height="6" />
    {/* Temple structure on top */}
    <rect x="72" y="8" width="16" height="8" />
    {/* Temple roof — flat with corner ornaments */}
    <rect x="70" y="6" width="20" height="2" />
    {/* Central staircase running up the front */}
    <rect x="76" y="14" width="8" height="38" opacity="0.55" />
    {/* Step lines on the staircase */}
    <line x1="76" y1="20" x2="84" y2="20" stroke="#fff" strokeWidth="0.4" opacity="0.6" />
    <line x1="76" y1="26" x2="84" y2="26" stroke="#fff" strokeWidth="0.4" opacity="0.6" />
    <line x1="76" y1="32" x2="84" y2="32" stroke="#fff" strokeWidth="0.4" opacity="0.6" />
    <line x1="76" y1="38" x2="84" y2="38" stroke="#fff" strokeWidth="0.4" opacity="0.6" />
    <line x1="76" y1="44" x2="84" y2="44" stroke="#fff" strokeWidth="0.4" opacity="0.6" />
    {/* Ground line */}
    <rect x="50" y="52" width="60" height="2" opacity="0.6" />
  </>
);

// Caucasus mountains — sharper twin peaks with a small cross atop.
const caucasus = wrap(
  <>
    <path d="M40 52 L60 22 L72 38 L86 18 L102 42 L120 52 Z" />
    <path d="M55 28 L60 22 L65 28" stroke="#fff" strokeWidth="0.5" fill="none" opacity="0.5" />
    <path d="M82 22 L86 18 L90 22" stroke="#fff" strokeWidth="0.5" fill="none" opacity="0.5" />
    {/* Snow caps */}
    <path d="M58 24 L60 22 L62 24 L60 26 Z" fill="#fff" opacity="0.6" />
    <path d="M84 20 L86 18 L88 20 L86 22 Z" fill="#fff" opacity="0.6" />
  </>
);

// Star + Southern Cross (Australia / NZ) — the constellation that
// flies on both Australian and NZ flags. More distinct than reusing
// opera house for both.
const southernCross = wrap(
  <>
    {/* Large central star — Commonwealth star */}
    <g transform="translate(60 30)">
      <polygon points="0,-12 3,-4 12,-4 5,2 8,11 0,5 -8,11 -5,2 -12,-4 -3,-4" opacity="0.9" />
    </g>
    {/* Southern Cross — five stars in the canonical configuration */}
    <circle cx="92" cy="14" r="2.5" /> {/* Gacrux — top */}
    <circle cx="100" cy="28" r="2.5" /> {/* Becrux — right */}
    <circle cx="86" cy="34" r="2" /> {/* Acrux — bottom */}
    <circle cx="78" cy="22" r="1.7" /> {/* Delta */}
    <circle cx="106" cy="40" r="1.4" opacity="0.85" /> {/* Epsilon — small */}
  </>
);

// Silver fern (New Zealand) — distinctive frond shape from the rugby
// jersey + flag debate. Way more iconic than reusing the opera house.
const silverFern = wrap(
  <g transform="translate(80 32)">
    {/* Central stem */}
    <rect x="-0.6" y="-22" width="1.2" height="44" />
    {/* Fronds — alternating left and right, decreasing in size */}
    {[
      [-1, -18, 18, -10],
      [1, -18, -18, -10],
      [-1, -10, 16, -4],
      [1, -10, -16, -4],
      [-1, -2, 14, 2],
      [1, -2, -14, 2],
      [-1, 6, 11, 9],
      [1, 6, -11, 9],
      [-1, 13, 7, 15],
      [1, 13, -7, 15],
    ].map(([cx, cy, ex, ey], i) => (
      <path
        key={i}
        d={`M ${cx} ${cy} Q ${(cx + ex) / 2} ${cy - 1} ${ex} ${ey} Q ${(cx + ex) / 2} ${cy + 2} ${cx} ${cy} Z`}
      />
    ))}
  </g>
);

// Cherry blossom branch (Japan alternative — for breadth, when Fuji
// would feel repetitive).
// Unused now but reserved.

// Worldwide / Global — stylized concentric rings with cardinal markers,
// reads as "global program" without using the basic-globe meridian look.
// Pre-fix Worldwide and 4-5 other "Multi/Global" buckets all fell to a
// generic globe-with-pin which made the international rows look like
// "we don't have data" rather than "this is genuinely global."
const globe = wrap(
  <>
    {/* Outer ring */}
    <circle cx="80" cy="30" r="22" stroke="currentColor" strokeWidth="1.5" fill="none" />
    {/* Inner ring */}
    <circle cx="80" cy="30" r="14" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.7" />
    {/* Innermost dot — center of the world */}
    <circle cx="80" cy="30" r="3" fill="currentColor" />
    {/* Four cardinal-direction tick marks — N, E, S, W — like a compass rose */}
    <rect x="79" y="2" width="2" height="6" />
    <rect x="79" y="52" width="2" height="6" />
    <rect x="102" y="29" width="6" height="2" />
    <rect x="52" y="29" width="6" height="2" />
    {/* Diagonal ticks at NE/NW/SE/SW for richer detail */}
    <circle cx="98" cy="12" r="1.2" opacity="0.6" />
    <circle cx="62" cy="12" r="1.2" opacity="0.6" />
    <circle cx="98" cy="48" r="1.2" opacity="0.6" />
    <circle cx="62" cy="48" r="1.2" opacity="0.6" />
  </>
);

// Stave church (Norway) — distinctive multi-tier wooden cathedral with
// peaked dragon-prow gables and the central spire. The stacked-roof
// silhouette is unmistakably Norwegian (Borgund Stave Church is the
// canonical reference).
const staveChurch = wrap(
  <>
    {/* Ground line */}
    <rect x="50" y="52" width="60" height="2" opacity="0.6" />
    {/* Three stacked pyramidal roofs — base/mid/top, each smaller */}
    <path d="M 56 52 L 80 36 L 104 52 Z" />
    <path d="M 60 36 L 80 22 L 100 36 Z" />
    <path d="M 64 22 L 80 10 L 96 22 Z" />
    {/* Top spire with cross */}
    <rect x="79" y="3" width="2" height="9" />
    <rect x="76" y="5" width="8" height="1.5" />
    {/* Wall segment between base roof and ground */}
    <rect x="68" y="52" width="24" height="0" />
    {/* Subtle door */}
    <rect x="76" y="44" width="8" height="8" fill="#fff" opacity="0.45" />
    {/* Dragon-prow horizontal beams hint */}
    <line x1="50" y1="52" x2="56" y2="52" stroke="currentColor" strokeWidth="0.6" />
    <line x1="104" y1="52" x2="110" y2="52" stroke="currentColor" strokeWidth="0.6" />
  </>
);

// Vasa ship (Sweden) — 17th-century warship, Sweden's iconic
// maritime artifact + national museum centerpiece. Three-masted
// galleon silhouette with characteristic ornate stern.
const vasaShip = wrap(
  <>
    {/* Water line */}
    <path d="M 36 50 Q 60 47 80 50 Q 100 47 124 50 L 124 56 L 36 56 Z" opacity="0.45" />
    {/* Hull — stern at left, bow at right, characteristic curve */}
    <path d="M 46 36 L 50 32 L 110 32 L 116 36 L 112 50 L 50 50 Z" />
    {/* Three masts */}
    <rect x="60" y="6" width="1.5" height="26" />
    <rect x="79" y="2" width="1.5" height="30" />
    <rect x="98" y="6" width="1.5" height="26" />
    {/* Mainsail (centre) — billowing rectangle */}
    <path d="M 66 10 L 94 10 L 94 26 Q 80 30 66 26 Z" opacity="0.85" />
    {/* Foresail */}
    <path d="M 50 14 L 60 14 L 60 24 Q 55 26 50 24 Z" opacity="0.7" />
    {/* Mizzen sail */}
    <path d="M 100 14 L 110 14 L 110 24 Q 105 26 100 24 Z" opacity="0.7" />
    {/* Stern flag */}
    <rect x="46" y="20" width="3" height="6" opacity="0.6" />
    <rect x="49" y="20" width="0.5" height="14" />
  </>
);

// Sauna cabin (Finland) — quintessentially Finnish: low log cabin with
// smoking chimney + lakeside hint. Distinct from Norway's stave church
// (no spire, single low roof) and Sweden's Vasa (no water+ship).
const finnishSauna = wrap(
  <>
    {/* Ground / lakeside hint */}
    <rect x="40" y="52" width="80" height="2" opacity="0.5" />
    <path d="M 40 50 Q 56 49 70 50 L 70 52 L 40 52 Z" opacity="0.35" />
    {/* Cabin walls */}
    <rect x="68" y="36" width="36" height="16" />
    {/* Pitched roof */}
    <path d="M 64 36 L 86 22 L 108 36 Z" />
    {/* Chimney — left of ridge */}
    <rect x="74" y="14" width="4" height="14" />
    {/* Smoke wisp curling up */}
    <path d="M 76 14 Q 70 8 76 4 Q 80 8 76 0" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0.65" />
    {/* Door */}
    <rect x="82" y="42" width="8" height="10" fill="#fff" opacity="0.5" />
    {/* Log courses — horizontal lines on the wall */}
    <line x1="68" y1="40" x2="104" y2="40" stroke="#fff" strokeWidth="0.4" opacity="0.4" />
    <line x1="68" y1="44" x2="104" y2="44" stroke="#fff" strokeWidth="0.4" opacity="0.4" />
    <line x1="68" y1="48" x2="104" y2="48" stroke="#fff" strokeWidth="0.4" opacity="0.4" />
    {/* Small lake-rock detail */}
    <circle cx="48" cy="51" r="1.5" opacity="0.5" />
  </>
);

// Prague astronomical clock + cathedral spire (Czechia) — the Old Town
// Hall clock tower with St Vitus-style spire silhouette. Distinct from
// Brandenburg (no quadriga, single tall tower).
const pragueClock = wrap(
  <>
    {/* Ground line */}
    <rect x="50" y="52" width="60" height="2" opacity="0.6" />
    {/* Tower base */}
    <rect x="72" y="20" width="16" height="32" />
    {/* Wider clock-face section */}
    <rect x="68" y="24" width="24" height="14" />
    {/* Clock face — distinctive double-dial astronomical clock */}
    <circle cx="80" cy="31" r="4.5" fill="currentColor" opacity="0.35" />
    <circle cx="80" cy="31" r="3.5" fill="#fff" opacity="0.85" />
    {/* Clock hands at 10:10 — instantly reads as a clock face */}
    <line x1="80" y1="31" x2="78" y2="29" stroke="currentColor" strokeWidth="0.7" />
    <line x1="80" y1="31" x2="82.5" y2="29" stroke="currentColor" strokeWidth="0.7" />
    {/* Hour pips at 12, 3, 6, 9 */}
    <circle cx="80" cy="28" r="0.4" fill="currentColor" />
    <circle cx="83" cy="31" r="0.4" fill="currentColor" />
    <circle cx="80" cy="34" r="0.4" fill="currentColor" />
    <circle cx="77" cy="31" r="0.4" fill="currentColor" />
    {/* Pyramidal Gothic spire */}
    <path d="M 70 20 L 90 20 L 80 6 Z" />
    {/* Top finial + pole */}
    <rect x="79.3" y="0" width="1.4" height="8" />
    <circle cx="80" cy="2" r="1.2" />
    {/* Decorative gabled wing on the side (the Old Town Hall annex) */}
    <rect x="58" y="38" width="14" height="14" opacity="0.9" />
    <path d="M 56 38 L 65 30 L 74 38 Z" opacity="0.85" />
  </>
);

// Atomium (Belgium) — the 1958 World's Fair sculpture: 9 stainless-steel
// spheres connected as a unit cell of an iron crystal. The single
// most-recognizable Belgian landmark. Distinct from Brandenburg
// (no columns, 9-sphere cluster).
const atomium = wrap(
  <>
    {/* Ground / pedestal line */}
    <rect x="40" y="52" width="80" height="2" opacity="0.6" />
    {/* Connecting bonds — drawn first so spheres render on top */}
    <line x1="80" y1="10" x2="64" y2="22" stroke="currentColor" strokeWidth="1.2" />
    <line x1="80" y1="10" x2="96" y2="22" stroke="currentColor" strokeWidth="1.2" />
    <line x1="80" y1="10" x2="80" y2="30" stroke="currentColor" strokeWidth="1.2" />
    <line x1="64" y1="22" x2="80" y2="30" stroke="currentColor" strokeWidth="1.2" />
    <line x1="96" y1="22" x2="80" y2="30" stroke="currentColor" strokeWidth="1.2" />
    <line x1="64" y1="22" x2="64" y2="42" stroke="currentColor" strokeWidth="1.2" />
    <line x1="96" y1="22" x2="96" y2="42" stroke="currentColor" strokeWidth="1.2" />
    <line x1="80" y1="30" x2="80" y2="48" stroke="currentColor" strokeWidth="1.2" />
    <line x1="64" y1="42" x2="80" y2="48" stroke="currentColor" strokeWidth="1.2" />
    <line x1="96" y1="42" x2="80" y2="48" stroke="currentColor" strokeWidth="1.2" />
    <line x1="64" y1="42" x2="96" y2="42" stroke="currentColor" strokeWidth="1.2" />
    {/* 9 spheres in the iron-crystal unit cell arrangement */}
    {/* Top apex */}
    <circle cx="80" cy="10" r="5" />
    {/* Mid layer — three spheres */}
    <circle cx="64" cy="22" r="5" />
    <circle cx="96" cy="22" r="5" />
    <circle cx="80" cy="30" r="5" />
    {/* Lower layer — three spheres */}
    <circle cx="64" cy="42" r="5" />
    <circle cx="96" cy="42" r="5" />
    <circle cx="80" cy="48" r="5" opacity="0.85" />
    {/* Sphere highlights */}
    <circle cx="78.5" cy="8.5" r="1.4" fill="#fff" opacity="0.5" />
    <circle cx="62.5" cy="20.5" r="1.4" fill="#fff" opacity="0.45" />
    <circle cx="94.5" cy="20.5" r="1.4" fill="#fff" opacity="0.45" />
    <circle cx="78.5" cy="28.5" r="1.4" fill="#fff" opacity="0.45" />
  </>
);

/* ─── Country → landmark dispatch ───────────────────────────────────────
 *
 * Lookup goes via canonicalCountry (alias-aware, tolerates casing /
 * "USA" vs "United States" / etc) so the LLM's noisy host_country
 * values land on the right silhouette instead of falling to globe.
 *
 * Reasonable fallbacks: countries without a specific landmark fall to
 * a regional sibling (e.g. Austria → Brandenburg-style columns,
 * Norway → Matterhorn) so the long tail still feels intentional.
 *
 * A & NZ now have their own flag-derived icons (Southern Cross +
 * Silver Fern) instead of sharing Opera House — the user called out
 * Opera-House-everywhere as too generic.
 */
const COUNTRY_ART: Record<string, React.ReactNode> = {
  // Asia-Pacific
  Japan: fuji, China: pagoda, "Hong Kong": hkSkyline, Taiwan: pagoda,
  Korea: hanok, "South Korea": hanok, "North Korea": hanok,
  Singapore: merlion, Malaysia: mosque, Indonesia: mosque,
  Thailand: pagoda, Vietnam: pagoda, Philippines: pagoda,
  Australia: opera, "New Zealand": silverFern, Brunei: mosque,
  India: taj, "Sri Lanka": taj, Pakistan: mosque, Bangladesh: mosque, Nepal: caucasus,

  // Central Asia
  Kazakhstan: baiterek, Kyrgyzstan: yurt, Uzbekistan: mosque,
  Tajikistan: caucasus, Turkmenistan: yurt, Mongolia: yurt,
  Azerbaijan: caucasus, Armenia: caucasus, Georgia: caucasus,

  // Middle East / North Africa
  UAE: burj, "United Arab Emirates": burj, "Saudi Arabia": burj, Israel: burj,
  Turkey: hagiaSophia, "Türkiye": hagiaSophia, Iran: mosque, Iraq: mosque, Lebanon: mosque, Jordan: mosque,
  Egypt: pyramids, Morocco: mosque, Qatar: burj, Kuwait: burj,

  // Sub-Saharan Africa
  "South Africa": acacia, Kenya: acacia, Ethiopia: acacia,
  Rwanda: acacia, Ghana: acacia, Nigeria: acacia, Tanzania: acacia,
  Uganda: acacia, Senegal: acacia, "Cote d'Ivoire": acacia,

  // Europe — UK & Ireland
  "United Kingdom": bigBen, UK: bigBen, Ireland: bigBen, Scotland: bigBen,

  // Europe — Continental
  France: eiffel, Germany: brandenburg, Austria: brandenburg,
  Switzerland: matterhorn, Netherlands: windmill, Belgium: atomium,
  Italy: colosseum, Spain: sagrada, Portugal: sagrada,
  // Nordic countries each get their distinct national landmark now
  // (was: all four sharing Switzerland's matterhorn — wrong country).
  Sweden: vasaShip, Norway: staveChurch, Finland: finnishSauna,
  Denmark: windmill, Iceland: staveChurch, // Iceland nods to its
  // Norse heritage; alternative would be a geyser.
  Russia: stBasils, Ukraine: saintSophiaKyiv, Poland: wawelCastle,
  // Czechia gets its own iconic Prague clock + Gothic spire —
  // distinct from Germany's Brandenburg quadriga.
  Czechia: pragueClock, "Czech Republic": pragueClock,
  Hungary: brandenburg, Romania: brandenburg, Greece: parthenon,
  Bulgaria: saintSophiaKyiv, Croatia: colosseum, Lithuania: brandenburg,
  Latvia: brandenburg, Slovakia: brandenburg, Estonia: brandenburg,
  EU: eiffel, "European Union": eiffel,

  // North America — Mexico now uses a Mayan stepped pyramid (was
  // falling to the Egyptian-pyramid silhouette which read as
  // "wrong continent" entirely).
  "United States": liberty, USA: liberty, US: liberty,
  Canada: maple, Mexico: mayanPyramid,

  // Latin America — Christ the Redeemer is iconically Brazilian, so
  // it stays for Brazil only. Other LatAm countries fall to a Mayan
  // pyramid (Mexico/Peru) where culturally appropriate, otherwise
  // Sagrada Família as a shared Iberian-heritage proxy.
  Brazil: redeemer, Argentina: sagrada, Chile: sagrada,
  Colombia: sagrada, Peru: mayanPyramid, Cuba: sagrada,
  Uruguay: sagrada, Ecuador: mayanPyramid, Venezuela: sagrada,

  // Default / multi-country
  Global: globe, Multiple: globe, "Multiple countries": globe,
  International: globe, Worldwide: globe,
};

// Retired silhouettes — kept defined in case we revisit the mapping
// (e.g. add Marina Bay Sands as a secondary Singapore variant or bring
// the Southern Cross back if the Opera House feels overused). The void
// references silence "declared but never used" warnings.
void marinaBay; void southernCross;

import { canonicalCountry } from "@/lib/countryAccent";

export const CountryArt = ({ country, className = "" }: { country: string | null | undefined; className?: string }) => {
  if (!country) return <span className={className}>{globe}</span>;
  // Try exact (covers existing keys), then canonicalised form so
  // "U.S.A." / "Türkiye" / "Republic of Korea" all map correctly.
  const exact = COUNTRY_ART[country];
  if (exact) return <span className={className}>{exact}</span>;
  const canon = canonicalCountry(country);
  return <span className={className}>{COUNTRY_ART[canon] || globe}</span>;
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
