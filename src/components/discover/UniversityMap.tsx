import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, X, ExternalLink, GraduationCap, DollarSign } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { UniversityResult } from "./types";

interface Props {
  universities: UniversityResult[];
  language: "en" | "ru";
}

// Approximate lat/lng → SVG position (equirectangular projection)
const CITY_COORDS: Record<string, [number, number]> = {
  // USA
  "Cambridge, United States": [42.37, -71.11],
  "Stanford, United States": [37.43, -122.17],
  "New York, United States": [40.71, -74.01],
  "Boston, United States": [42.36, -71.06],
  "Chicago, United States": [41.88, -87.63],
  "Los Angeles, United States": [34.05, -118.24],
  "Philadelphia, United States": [39.95, -75.17],
  "New Haven, United States": [41.31, -72.93],
  "Princeton, United States": [40.35, -74.66],
  "Baltimore, United States": [39.30, -76.61],
  "Durham, United States": [35.99, -78.90],
  "Hanover, United States": [43.70, -72.29],
  "Providence, United States": [41.82, -71.41],
  "Atlanta, United States": [33.75, -84.39],
  "Evanston, United States": [42.05, -87.68],
  "Ann Arbor, United States": [42.28, -83.74],
  "Ithaca, United States": [42.44, -76.50],
  // UK
  "London, United Kingdom": [51.51, -0.13],
  "Oxford, United Kingdom": [51.75, -1.25],
  "Cambridge, United Kingdom": [52.21, 0.12],
  "Edinburgh, United Kingdom": [55.95, -3.19],
  "Manchester, United Kingdom": [53.48, -2.24],
  // Canada
  "Toronto, Canada": [43.65, -79.38],
  "Montreal, Canada": [45.50, -73.57],
  "Vancouver, Canada": [49.28, -123.12],
  // Europe
  "Zurich, Switzerland": [47.37, 8.54],
  "Munich, Germany": [48.14, 11.58],
  "Paris, France": [48.86, 2.35],
  "Amsterdam, Netherlands": [52.37, 4.90],
  "Stockholm, Sweden": [59.33, 18.07],
  "Copenhagen, Denmark": [55.68, 12.57],
  "Berlin, Germany": [52.52, 13.41],
  "Milan, Italy": [45.46, 9.19],
  "Prague, Czech Republic": [50.08, 14.44],
  // Asia
  "Tokyo, Japan": [35.68, 139.69],
  "Seoul, South Korea": [37.57, 126.98],
  "Singapore, Singapore": [1.35, 103.82],
  "Hong Kong, Hong Kong": [22.32, 114.17],
  "Beijing, China": [39.90, 116.40],
  "Shanghai, China": [31.23, 121.47],
  "Taipei, Taiwan": [25.03, 121.57],
  // Central Asia
  "Naryn, Kyrgyzstan": [41.43, 76.00],
  "Khorog, Tajikistan": [37.54, 71.53],
  "Tekeli, Kazakhstan": [44.86, 78.76],
  "Bishkek, Kyrgyzstan": [42.87, 74.59],
  "Almaty, Kazakhstan": [43.24, 76.95],
  "Tashkent, Uzbekistan": [41.30, 69.28],
  "Astana, Kazakhstan": [51.13, 71.43],
  // Middle East
  "Dubai, United Arab Emirates": [25.20, 55.27],
  "Abu Dhabi, United Arab Emirates": [24.45, 54.65],
  "Doha, Qatar": [25.29, 51.53],
  // Oceania
  "Melbourne, Australia": [-37.81, 144.96],
  "Sydney, Australia": [-33.87, 151.21],
  // Turkey
  "Istanbul, Turkey": [41.01, 28.98],
  "Ankara, Turkey": [39.93, 32.86],
  // South Asia
  "New Delhi, India": [28.61, 77.21],
  "Mumbai, India": [19.08, 72.88],
};

const latLngToXY = (lat: number, lng: number, width: number, height: number): [number, number] => {
  const x = ((lng + 180) / 360) * width;
  const y = ((90 - lat) / 180) * height;
  return [x, y];
};

export const UniversityMap = ({ universities, language }: Props) => {
  const [selectedUni, setSelectedUni] = useState<UniversityResult | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const WIDTH = 900;
  const HEIGHT = 450;

  const uniPositions = useMemo(() => {
    return universities.map(uni => {
      const key = `${uni.city}, ${uni.country}`;
      const coords = CITY_COORDS[key];
      if (!coords) return null;
      const [x, y] = latLngToXY(coords[0], coords[1], WIDTH, HEIGHT);
      return { uni, x, y };
    }).filter(Boolean) as { uni: UniversityResult; x: number; y: number }[];
  }, [universities]);

  // Group overlapping dots
  const grouped = useMemo(() => {
    const groups: Map<string, { x: number; y: number; unis: UniversityResult[] }> = new Map();
    uniPositions.forEach(({ uni, x, y }) => {
      const key = `${Math.round(x / 8)}_${Math.round(y / 8)}`;
      if (!groups.has(key)) groups.set(key, { x, y, unis: [] });
      groups.get(key)!.unis.push(uni);
    });
    return Array.from(groups.values());
  }, [uniPositions]);

  return (
    <div className="relative bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="text-sm font-heading font-semibold flex items-center gap-2">
          <MapPin className="h-4 w-4 text-accent" />
          University World Map
        </h3>
        <Badge variant="outline" className="text-xs">
          {uniPositions.length} universities mapped
        </Badge>
      </div>

      <div className="relative overflow-x-auto">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full min-w-[600px] h-auto" style={{ background: "hsl(var(--muted) / 0.3)" }}>
          {/* Grid lines */}
          {[...Array(7)].map((_, i) => (
            <line key={`h${i}`} x1={0} y1={(i + 1) * (HEIGHT / 8)} x2={WIDTH} y2={(i + 1) * (HEIGHT / 8)} stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.4" />
          ))}
          {[...Array(11)].map((_, i) => (
            <line key={`v${i}`} x1={(i + 1) * (WIDTH / 12)} y1={0} x2={(i + 1) * (WIDTH / 12)} y2={HEIGHT} stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.4" />
          ))}

          {/* Continent labels */}
          <text x={190} y={100} fill="hsl(var(--muted-foreground))" fontSize="10" opacity="0.3" fontWeight="600">NORTH AMERICA</text>
          <text x={430} y={85} fill="hsl(var(--muted-foreground))" fontSize="10" opacity="0.3" fontWeight="600">EUROPE</text>
          <text x={620} y={120} fill="hsl(var(--muted-foreground))" fontSize="10" opacity="0.3" fontWeight="600">ASIA</text>
          <text x={450} y={250} fill="hsl(var(--muted-foreground))" fontSize="10" opacity="0.3" fontWeight="600">AFRICA</text>
          <text x={680} y={330} fill="hsl(var(--muted-foreground))" fontSize="10" opacity="0.3" fontWeight="600">OCEANIA</text>

          {/* University dots */}
          {grouped.map((group, i) => {
            const isHovered = group.unis.some(u => u.university_id === hoveredId);
            const isSelected = group.unis.some(u => u.university_id === selectedUni?.university_id);
            const size = Math.min(4 + group.unis.length * 1.5, 10);

            return (
              <g key={i}>
                {/* Pulse ring */}
                <circle cx={group.x} cy={group.y} r={size + 4} fill="hsl(var(--accent))" opacity="0.15">
                  <animate attributeName="r" values={`${size + 2};${size + 8};${size + 2}`} dur="3s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.15;0.05;0.15" dur="3s" repeatCount="indefinite" />
                </circle>
                {/* Main dot */}
                <circle
                  cx={group.x} cy={group.y} r={isHovered || isSelected ? size + 2 : size}
                  fill={isSelected ? "hsl(var(--primary))" : "hsl(var(--accent))"}
                  stroke="hsl(var(--background))" strokeWidth="1.5"
                  className="cursor-pointer transition-all duration-200"
                  onMouseEnter={() => setHoveredId(group.unis[0].university_id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => setSelectedUni(group.unis[0])}
                />
                {/* Count label for grouped */}
                {group.unis.length > 1 && (
                  <text x={group.x} y={group.y + 1} textAnchor="middle" dominantBaseline="middle"
                    fill="hsl(var(--background))" fontSize="7" fontWeight="bold"
                    className="pointer-events-none">
                    {group.unis.length}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected university popup */}
      <AnimatePresence>
        {selectedUni && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-4 left-4 right-4 bg-card border border-border rounded-xl p-4 shadow-xl max-w-sm"
          >
            <button onClick={() => setSelectedUni(null)} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
            <div className="space-y-2">
              <h4 className="font-heading font-semibold text-foreground pr-6">{selectedUni.university_name}</h4>
              <p className="text-xs text-muted-foreground">{selectedUni.city}, {selectedUni.country}</p>
              <div className="flex flex-wrap gap-2">
                {selectedUni.tuition_usd_per_year != null && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <DollarSign className="h-3 w-3" />
                    {selectedUni.tuition_usd_per_year === 0 ? "Free" : `$${selectedUni.tuition_usd_per_year.toLocaleString()}/yr`}
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs gap-1">
                  <GraduationCap className="h-3 w-3" />
                  {selectedUni.programs?.length || 0} programs
                </Badge>
                {selectedUni.scholarships?.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {selectedUni.scholarships.length} scholarships
                  </Badge>
                )}
              </div>
              {selectedUni.website_url && (
                <a href={selectedUni.website_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-accent hover:underline mt-1">
                  Visit website <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
