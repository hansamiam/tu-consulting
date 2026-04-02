import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Filter, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContentType } from "./ContentCard";

const CONTENT_TYPES: { value: ContentType | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "workshop", label: "Workshops" },
  { value: "masterclass", label: "Masterclasses" },
  { value: "recording", label: "Recordings" },
  { value: "guide", label: "Guides" },
  { value: "template", label: "Templates" },
  { value: "case-study", label: "Case Studies" },
];

const TOPIC_TAGS = [
  "IELTS", "SAT", "SOP Writing", "Scholarships", "Visa", "Interview",
  "UK", "USA", "Canada", "Europe", "Application Strategy", "Essays",
];

interface ContentFiltersProps {
  search: string;
  onSearchChange: (val: string) => void;
  activeType: ContentType | "all";
  onTypeChange: (val: ContentType | "all") => void;
  activeTags: string[];
  onTagToggle: (tag: string) => void;
  showFreeOnly: boolean;
  onFreeOnlyToggle: () => void;
}

export const ContentFilters = ({
  search, onSearchChange,
  activeType, onTypeChange,
  activeTags, onTagToggle,
  showFreeOnly, onFreeOnlyToggle,
}: ContentFiltersProps) => {
  return (
    <div className="space-y-4">
      {/* Search + Free toggle */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search workshops, guides, templates..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 bg-card border-border"
          />
        </div>
        <Button
          variant={showFreeOnly ? "gold" : "outline"}
          size="sm"
          onClick={onFreeOnlyToggle}
          className="whitespace-nowrap"
        >
          {showFreeOnly ? "Showing Free" : "Free Content"}
        </Button>
      </div>

      {/* Type filter */}
      <div className="flex flex-wrap gap-2">
        {CONTENT_TYPES.map((type) => (
          <Button
            key={type.value}
            variant="ghost"
            size="sm"
            onClick={() => onTypeChange(type.value)}
            className={cn(
              "text-xs rounded-full border transition-all",
              activeType === type.value
                ? "bg-gold/15 text-gold border-gold/40"
                : "text-muted-foreground border-border hover:border-gold/30"
            )}
          >
            {type.label}
          </Button>
        ))}
      </div>

      {/* Topic tags */}
      <div className="flex flex-wrap gap-1.5">
        {TOPIC_TAGS.map((tag) => (
          <Badge
            key={tag}
            variant="outline"
            className={cn(
              "cursor-pointer text-[10px] transition-all",
              activeTags.includes(tag)
                ? "bg-gold/15 text-gold border-gold/40"
                : "text-muted-foreground hover:border-gold/30"
            )}
            onClick={() => onTagToggle(tag)}
          >
            {tag}
          </Badge>
        ))}
      </div>
    </div>
  );
};
