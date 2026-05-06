import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Heart, Trash2, ExternalLink, DollarSign, GraduationCap } from "lucide-react";
import { UniversityResult } from "./types";
import { useTrackMilestone } from "@/hooks/use-track-milestone";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const WATCHLIST_KEY = "topuni_watchlist";
const SAVED_3_PROMPT_KEY = "tu_saved3_prompt_shown";

export const getWatchlist = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(WATCHLIST_KEY) || "[]");
  } catch {
    return [];
  }
};

export const toggleWatchlist = (id: string): string[] => {
  const list = getWatchlist();
  const idx = list.indexOf(id);
  if (idx >= 0) list.splice(idx, 1);
  else list.push(id);
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list));
  return list;
};

export const isInWatchlist = (id: string): boolean => getWatchlist().includes(id);

interface WatchlistButtonProps {
  universityId: string;
  onToggle?: () => void;
}

export const WatchlistButton = ({ universityId, onToggle }: WatchlistButtonProps) => {
  const [saved, setSaved] = useState(false);
  const { track } = useTrackMilestone();
  const { subscription } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setSaved(isInWatchlist(universityId));
  }, [universityId]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Derive saved state from the post-toggle list so React + localStorage
    // can never drift (cross-tab edits, double-fire on rapid click, etc.).
    // The previous \`setSaved(s => !s)\` was a parallel toggle that didn't
    // verify against the source of truth.
    const list = toggleWatchlist(universityId);
    const isNowSaved = list.includes(universityId);
    setSaved(isNowSaved);
    onToggle?.();

    // The "saved-3" milestone should fire on the SAVE that crosses the
    // 3rd item — not on an UNSAVE that drops back to 3 from 4. Gate on
    // both isNowSaved (we just added) AND list.length === 3 so the
    // upgrade prompt doesn't pop while the user is removing items.
    if (isNowSaved && list.length === 3) {
      track("saved_3_universities", { count: list.length });
      if (!subscription.is_active && !localStorage.getItem(SAVED_3_PROMPT_KEY)) {
        localStorage.setItem(SAVED_3_PROMPT_KEY, "1");
        toast("You've saved 3 universities", {
          description: "Unlock the full admissions strategy with TopUni Membership.",
          action: { label: "See plans", onClick: () => navigate("/pricing") },
          duration: 9000,
        });
      }
    }
  };

  return (
    <button onClick={handleToggle} className="shrink-0 p-1 rounded-md hover:bg-muted transition-colors" title={saved ? "Remove from watchlist" : "Add to watchlist"}>
      <Heart className={`h-3.5 w-3.5 transition-colors ${saved ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
    </button>
  );
};

interface WatchlistDrawerProps {
  universities: UniversityResult[];
  language: "en" | "ru";
}

export const WatchlistDrawer = ({ universities, language }: WatchlistDrawerProps) => {
  const [watchlistIds, setWatchlistIds] = useState<string[]>(getWatchlist());

  const refreshList = () => setWatchlistIds(getWatchlist());

  useEffect(() => {
    const interval = setInterval(refreshList, 1000);
    return () => clearInterval(interval);
  }, []);

  const watchlistUnis = universities.filter(u => watchlistIds.includes(u.university_id));

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 relative">
          <Heart className={`h-4 w-4 ${watchlistIds.length > 0 ? "fill-red-500 text-red-500" : ""}`} />
          My Watchlist
          {watchlistIds.length > 0 && (
            <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-[10px] rounded-full absolute -top-1.5 -right-1.5">
              {watchlistIds.length}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[450px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500 fill-red-500" /> My Watchlist
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-3">
          {watchlistUnis.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Heart className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No universities saved yet</p>
              <p className="text-xs mt-1">Click the heart icon on any university to add it here</p>
            </div>
          ) : (
            watchlistUnis.map(uni => (
              <div key={uni.university_id} className="bg-muted/30 border border-border rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{uni.university_name}</p>
                    <p className="text-xs text-muted-foreground">{uni.city}, {uni.country}</p>
                  </div>
                  <button
                    onClick={() => { toggleWatchlist(uni.university_id); refreshList(); }}
                    className="text-destructive hover:bg-destructive/10 p-1.5 rounded-md"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {uni.tuition_usd_per_year != null && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <DollarSign className="h-3 w-3" />
                      {uni.tuition_usd_per_year === 0 ? "Free" : `$${uni.tuition_usd_per_year.toLocaleString()}/yr`}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs gap-1">
                    <GraduationCap className="h-3 w-3" />
                    {uni.programs?.length || 0} programs
                  </Badge>
                  {uni.scholarships?.some(s => s.coverage_type === "full_ride") && (
                    <Badge className="text-xs bg-accent text-accent-foreground">Full Ride</Badge>
                  )}
                </div>
                {uni.website_url && (
                  <a href={uni.website_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-accent hover:underline">
                    Visit website <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
