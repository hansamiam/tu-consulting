import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lock, Play, Clock, Users, Star, Eye, BookOpen, Mic, FileText, Video } from "lucide-react";
import { cn } from "@/lib/utils";

export type ContentType = "workshop" | "masterclass" | "guide" | "template" | "recording" | "case-study";

export interface ContentItem {
  id: string;
  title: string;
  description: string;
  type: ContentType;
  duration: string;
  thumbnail?: string;
  instructor: string;
  tags: string[];
  isFree: boolean;
  isNew?: boolean;
  isFeatured?: boolean;
  viewCount: number;
  rating: number;
  date: string;
}

const typeConfig: Record<ContentType, { icon: any; color: string; label: string }> = {
  workshop: { icon: Video, color: "bg-blue-500/20 text-blue-400", label: "Workshop" },
  masterclass: { icon: Star, color: "bg-gold/20 text-gold", label: "Masterclass" },
  guide: { icon: BookOpen, color: "bg-green-500/20 text-green-400", label: "Guide" },
  template: { icon: FileText, color: "bg-purple-500/20 text-purple-400", label: "Template" },
  recording: { icon: Mic, color: "bg-red-500/20 text-red-400", label: "Recording" },
  "case-study": { icon: Eye, color: "bg-cyan-500/20 text-cyan-400", label: "Case Study" },
};

export const ContentCard = ({ item, onOpen }: { item: ContentItem; onOpen: (item: ContentItem) => void }) => {
  const [isHovered, setIsHovered] = useState(false);
  const config = typeConfig[item.type];
  const Icon = config.icon;

  return (
    <Card
      className={cn(
        "group cursor-pointer overflow-hidden border-border/50 bg-card hover:border-gold/40 transition-all duration-300",
        isHovered && "shadow-lg shadow-gold/5 -translate-y-1"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onOpen(item)}
    >
      {/* Thumbnail area */}
      <div className="relative h-44 bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(var(--gold)/0.15),transparent_70%)]" />
        <Icon className="w-12 h-12 text-gold/40 group-hover:text-gold/60 transition-colors" />
        
        {/* Play overlay */}
        <div className={cn(
          "absolute inset-0 bg-primary/40 flex items-center justify-center transition-opacity duration-300",
          isHovered ? "opacity-100" : "opacity-0"
        )}>
          {item.isFree ? (
            <div className="w-14 h-14 rounded-full bg-gold/90 flex items-center justify-center">
              <Play className="w-6 h-6 text-primary ml-0.5" />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-full bg-primary/80 border border-gold/40 flex items-center justify-center">
              <Lock className="w-5 h-5 text-gold" />
            </div>
          )}
        </div>

        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-1.5">
          <Badge className={cn("text-[10px] font-semibold", config.color)}>{config.label}</Badge>
          {item.isNew && <Badge className="bg-green-500/90 text-white text-[10px]">NEW</Badge>}
          {item.isFeatured && <Badge className="bg-gold/90 text-primary text-[10px]">★ Featured</Badge>}
        </div>

        {!item.isFree && (
          <div className="absolute top-3 right-3">
            <Lock className="w-4 h-4 text-gold/60" />
          </div>
        )}

        <div className="absolute bottom-3 right-3 bg-primary/80 text-primary-foreground/80 text-xs px-2 py-0.5 rounded">
          {item.duration}
        </div>
      </div>

      <CardContent className="p-4 space-y-3">
        <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-gold transition-colors">
          {item.title}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" /> {item.viewCount.toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <Star className="w-3 h-3 text-gold" /> {item.rating.toFixed(1)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" /> {item.date}
          </span>
        </div>

        <div className="flex flex-wrap gap-1">
          {item.tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
