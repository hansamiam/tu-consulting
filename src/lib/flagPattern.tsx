/* FlagPattern — low-opacity, single-colour flag-shape watermark per country.
 *
 * Replaces the old CampusPattern (which tiled gothic arches + columns
 * across every card identically). The user pointed out that with a
 * neutral palette, two cards from countries with similar deep-blue
 * accents look identical — they need a per-country differentiator that
 * isn't bright colour. Flag archetypes (horizontal stripes / vertical
 * stripes / cross / star / sun / diagonal / triangle / chevron) carry
 * recognisable national identity even rendered as monochrome silhouettes
 * at low opacity.
 *
 * Pure SVG, no external assets, currentColor for stroke/fill so the
 * caller controls hue (typically white at opacity 0.18).
 *
 * Per-country dispatch goes through flagArchetypeFor() in countryAccent.ts.
 */

import { flagArchetypeFor, type FlagArchetype } from "@/lib/countryAccent";

const W = 800;
const H = 200;

const horizontal = (
  <g>
    {/* Three horizontal bands fit cleanly inside the H=200 viewbox.
        Earlier the third band y=160 + height=50 = 210 clipped past
        the viewBox. */}
    <rect x="0" y="10"  width={W} height="50" />
    <rect x="0" y="75"  width={W} height="50" opacity="0.55" />
    <rect x="0" y="140" width={W} height="50" />
  </g>
);

const vertical = (
  <g>
    <rect x="0"   y="0" width="240" height={H} />
    <rect x="280" y="0" width="240" height={H} opacity="0.55" />
    <rect x="560" y="0" width="240" height={H} />
  </g>
);

const cross = (
  <g>
    <rect x="0"   y="80"  width={W} height="40" />
    <rect x="280" y="0"   width="40" height={H} />
  </g>
);

const stripes = (
  <g>
    {Array.from({ length: 6 }).map((_, i) => (
      <rect key={i} x="0" y={i * 36} width={W} height="18" opacity={i % 2 ? 0.6 : 1} />
    ))}
  </g>
);

const sun = (
  <g>
    <circle cx={W / 2} cy={H / 2} r="60" />
    {/* faint outer ring for distinction from "star" */}
    <circle cx={W / 2} cy={H / 2} r="92" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.5" />
  </g>
);

const star = (
  <g transform={`translate(${W / 2}, ${H / 2})`}>
    <polygon points="0,-70 21,-22 72,-22 31,9 47,60 0,30 -47,60 -31,9 -72,-22 -21,-22" />
  </g>
);

const diagonal = (
  <g>
    <polygon points={`0,0 ${W},0 ${W},${H}`} />
    <polygon points={`0,0 ${W},${H} 0,${H}`} opacity="0.55" />
  </g>
);

const triangle = (
  <g>
    <polygon points={`0,0 240,${H / 2} 0,${H}`} />
    <rect x="240" y="0"   width={W - 240} height={H / 2} opacity="0.45" />
    <rect x="240" y={H / 2} width={W - 240} height={H / 2} opacity="0.65" />
  </g>
);

const chevron = (
  <g>
    {[0, 1, 2, 3, 4].map((i) => (
      <polygon
        key={i}
        points={`${i * 160},0 ${i * 160 + 80},${H / 2} ${i * 160},${H} ${i * 160 + 60},${H / 2}`}
        opacity={0.55 + (i % 2) * 0.25}
      />
    ))}
  </g>
);

const PATTERNS: Record<FlagArchetype, React.ReactNode> = {
  horizontal, vertical, cross, stripes, sun, star, diagonal, triangle, chevron,
};

interface Props {
  country: string | null | undefined;
  className?: string;
  /** Override opacity (default 0.18 — subtle watermark). */
  opacity?: number;
}

export const FlagPattern = ({ country, className = "", opacity = 0.18 }: Props) => {
  const archetype = flagArchetypeFor(country);
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      // Card bands are wider than they are tall (~6:1) but the viewBox
      // is 4:1. With 'slice', the top + bottom of horizontal-stripe
      // patterns get clipped so users only see one band of the three.
      // 'none' stretches the SVG to fill the container — patterns
      // distort vertically but stay fully visible, which matters more
      // at low opacity than geometric purity.
      preserveAspectRatio="none"
      className={`pointer-events-none ${className}`}
      aria-hidden
      style={{ opacity }}
    >
      <g fill="currentColor">{PATTERNS[archetype]}</g>
    </svg>
  );
};
