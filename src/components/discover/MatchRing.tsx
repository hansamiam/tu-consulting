import { motion } from "framer-motion";

interface Props {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
}

const tierColor = (v: number) => {
  if (v >= 80) return "hsl(var(--accent))";
  if (v >= 60) return "hsl(var(--primary))";
  if (v >= 40) return "hsl(var(--muted-foreground))";
  return "hsl(var(--muted-foreground) / 0.5)";
};

export const MatchRing = ({ value, size = 56, strokeWidth = 4, showLabel = true }: Props) => {
  const v = Math.max(0, Math.min(100, value));
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const dash = (v / 100) * c;
  const color = tierColor(v);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - dash }}
          transition={{ duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] }}
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-base font-bold leading-none tabular-nums" style={{ color }}>{v}</span>
          {size >= 64 && <span className="text-[8px] uppercase tracking-wider text-muted-foreground mt-0.5">match</span>}
        </div>
      )}
    </div>
  );
};
