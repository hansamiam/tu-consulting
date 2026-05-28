// 5-axis readiness pentagon. Axes come from the strategy report;
// values are 1..5 (clamped at 1 minimum so a low score still renders).
// Pure SVG, zero deps.

import type { AxisValue } from "../types";

interface Props {
  axes: AxisValue[];
  size?: number;
  color?: string;
}

export const ReadinessRadar = ({ axes, size = 240, color = "#1A3B66" }: Props) => {
  const center = size / 2;
  const radius = size * 0.32;
  const angle = (i: number) => (i / axes.length) * Math.PI * 2 - Math.PI / 2;
  const point = (i: number, scale: number) => ({
    x: center + Math.cos(angle(i)) * radius * scale,
    y: center + Math.sin(angle(i)) * radius * scale,
  });

  const polygonPoints = axes.map((a, i) => {
    const scale = Math.max(0.15, a.value / 5);
    const p = point(i, scale);
    return `${p.x},${p.y}`;
  }).join(" ");

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-label="Readiness radar"
      role="img"
      className="mx-auto"
    >
      {/* 5 grid rings */}
      {[0.2, 0.4, 0.6, 0.8, 1].map((scale, idx) => (
        <polygon
          key={idx}
          points={axes.map((_, i) => {
            const p = point(i, scale);
            return `${p.x},${p.y}`;
          }).join(" ")}
          fill="none"
          stroke="currentColor"
          strokeOpacity={idx === 4 ? 0.2 : 0.1}
        />
      ))}

      {/* Axis spokes */}
      {axes.map((_, i) => {
        const p = point(i, 1);
        return (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={p.x}
            y2={p.y}
            stroke="currentColor"
            strokeOpacity={0.12}
          />
        );
      })}

      {/* Axis labels — split multi-word names onto two lines */}
      {axes.map((a, i) => {
        const labelPos = point(i, 1.18);
        const parts = a.name.split(" / ").length > 1
          ? a.name.split(" / ")
          : a.name.split(" ");
        const useTwoLine = parts.length > 2 || a.name.length > 18;
        const top = useTwoLine ? parts.slice(0, Math.ceil(parts.length / 2)).join(" ") : a.name;
        const bot = useTwoLine ? parts.slice(Math.ceil(parts.length / 2)).join(" ") : null;
        return (
          <text
            key={i}
            x={labelPos.x}
            y={labelPos.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-[9.5px] fill-current opacity-65 font-bold uppercase tracking-wider"
          >
            <tspan x={labelPos.x} dy={bot ? "-0.4em" : "0"}>{top}</tspan>
            {bot && <tspan x={labelPos.x} dy="1em">{bot}</tspan>}
          </text>
        );
      })}

      {/* User polygon */}
      <polygon
        points={polygonPoints}
        fill={color}
        fillOpacity={0.22}
        stroke={color}
        strokeWidth={1.5}
      />

      {/* Value dots + numeric */}
      {axes.map((a, i) => {
        const scale = Math.max(0.15, a.value / 5);
        const p = point(i, scale);
        return (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={3.5} fill={color} />
          </g>
        );
      })}
    </svg>
  );
};
