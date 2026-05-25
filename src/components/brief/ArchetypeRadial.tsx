// 5-axis radial chart for the archetype card. Pure SVG.
// Axes (fixed; values come from the archetype detector / hardcoded lookup):
//   quant ↔ qualitative
//   individual ↔ collaborative
//   deep-domain ↔ broad-horizon
//   builder ↔ researcher
//   leader ↔ contributor
// Renders a regular pentagon with axis labels + a filled polygon
// showing the user's position. Pure SVG, zero deps.

interface AxisValue { name: string; value: number; /* -1..1 */ }

interface Props {
  axes: AxisValue[];
  archetypeColor?: string;
  size?: number;
}

export const ArchetypeRadial = ({ axes, archetypeColor = "#1A3B66", size = 220 }: Props) => {
  const center = size / 2;
  const radius = size * 0.34;
  const angle = (i: number) => (i / axes.length) * Math.PI * 2 - Math.PI / 2;
  const point = (i: number, scale: number) => ({
    x: center + Math.cos(angle(i)) * radius * scale,
    y: center + Math.sin(angle(i)) * radius * scale,
  });
  const polygonPoints = axes.map((a, i) => {
    const scale = Math.max(0.1, (a.value + 1) / 2);  // normalize -1..1 → 0..1, floor at 10% so a 0-axis still renders
    const p = point(i, scale);
    return `${p.x},${p.y}`;
  }).join(" ");

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden role="img">
      {/* Pentagon grid — 3 rings */}
      {[0.33, 0.66, 1].map((scale, idx) => (
        <polygon
          key={idx}
          points={axes.map((_, i) => { const p = point(i, scale); return `${p.x},${p.y}`; }).join(" ")}
          fill="none" stroke="currentColor" strokeOpacity="0.15"
        />
      ))}
      {/* Axis spokes */}
      {axes.map((_, i) => {
        const p = point(i, 1);
        return <line key={i} x1={center} y1={center} x2={p.x} y2={p.y} stroke="currentColor" strokeOpacity="0.1" />;
      })}
      {/* Axis labels */}
      {axes.map((a, i) => {
        const labelPos = point(i, 1.22);
        return (
          <text
            key={i}
            x={labelPos.x}
            y={labelPos.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-[9px] fill-current opacity-60 font-semibold uppercase tracking-wider"
          >
            {a.name}
          </text>
        );
      })}
      {/* User polygon */}
      <polygon
        points={polygonPoints}
        fill={archetypeColor}
        fillOpacity="0.22"
        stroke={archetypeColor}
        strokeWidth="1.5"
      />
      {/* User value dots */}
      {axes.map((a, i) => {
        const scale = Math.max(0.1, (a.value + 1) / 2);
        const p = point(i, scale);
        return <circle key={i} cx={p.x} cy={p.y} r={3} fill={archetypeColor} />;
      })}
    </svg>
  );
};

// Default axis lookup per archetype ID. Used by callers that have an
// archetype but no axis data. Sam can tune these values as archetypes
// evolve; this is editorial calibration, not a hot path.
export const ARCHETYPE_AXES: Record<string, AxisValue[]> = {
  "quant-builder":      [{name:"QUANT",value:0.9},{name:"INDIVIDUAL",value:0.3},{name:"DEEP",value:0.7},{name:"BUILDER",value:0.8},{name:"CONTRIBUTOR",value:-0.2}],
  "bridge-domain-kid":  [{name:"BROAD",value:0.5},{name:"COLLABORATIVE",value:0.6},{name:"DEEP",value:0.2},{name:"BUILDER",value:0.3},{name:"LEADER",value:0.4}],
  "quiet-builder":      [{name:"QUANT",value:0.6},{name:"INDIVIDUAL",value:0.7},{name:"DEEP",value:0.8},{name:"BUILDER",value:0.9},{name:"CONTRIBUTOR",value:-0.1}],
  "operator":           [{name:"BROAD",value:0.4},{name:"COLLABORATIVE",value:0.5},{name:"BROAD-HORIZON",value:0.6},{name:"BUILDER",value:0.6},{name:"LEADER",value:0.7}],
  "default":            [{name:"QUANT",value:0},{name:"COLLABORATIVE",value:0},{name:"DEEP",value:0},{name:"BUILDER",value:0},{name:"LEADER",value:0}],
};
