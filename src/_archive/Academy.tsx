import { useRef, useState, useMemo } from "react";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { BetaBanner } from "@/components/BetaBanner";
import { AcademyHero } from "@/components/academy/AcademyHero";
import { ContentFilters } from "@/components/academy/ContentFilters";
import { ContentCard, type ContentType } from "@/components/academy/ContentCard";
import { ContentPreviewDialog } from "@/components/academy/ContentPreviewDialog";
import { LearningPaths } from "@/components/academy/LearningPaths";
import { SubscriptionBanner } from "@/components/academy/SubscriptionBanner";
import { CommunityTeaser } from "@/components/academy/CommunityTeaser";
import { ACADEMY_CONTENT } from "@/data/academyContent";
import type { ContentItem } from "@/components/academy/ContentCard";
import { PaywallGate } from "@/components/auth/PaywallGate";

const Academy = () => {
  const [search, setSearch] = useState("");
  const [activeType, setActiveType] = useState<ContentType | "all">("all");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [showFreeOnly, setShowFreeOnly] = useState(false);
  const [previewItem, setPreviewItem] = useState<ContentItem | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleTagToggle = (tag: string) => {
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const filteredContent = useMemo(() => {
    return ACADEMY_CONTENT.filter((item) => {
      if (search && !item.title.toLowerCase().includes(search.toLowerCase()) &&
          !item.description.toLowerCase().includes(search.toLowerCase())) return false;
      if (activeType !== "all" && item.type !== activeType) return false;
      if (showFreeOnly && !item.isFree) return false;
      if (activeTags.length > 0 && !activeTags.some((tag) => item.tags.includes(tag))) return false;
      return true;
    });
  }, [search, activeType, activeTags, showFreeOnly]);

  const freePreviewContent = ACADEMY_CONTENT.filter((c) => c.isFree).slice(0, 3);

  const scrollToContent = () => {
    contentRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <BetaBanner />
      <AcademyHero onExplore={scrollToContent} />

      <div ref={contentRef} className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Free preview — visible to everyone */}
        {freePreviewContent.length > 0 && (
          <section className="py-12">
            <h2 className="text-2xl font-bold text-foreground mb-2">Free Preview</h2>
            <p className="text-sm text-muted-foreground mb-6">A taste of what's inside Academy. Members get the full library.</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {freePreviewContent.map((item) => (
                <ContentCard key={item.id} item={item} onOpen={setPreviewItem} />
              ))}
            </div>
          </section>
        )}

        <SubscriptionBanner />

        {/* Full library — gated */}
        <PaywallGate
          feature="Full Academy Library"
          description="Workshops, masterclasses, the Application Vault with real accepted essays, and weekly new content. Members unlock everything."
        >
          <LearningPaths />

          <section className="py-12">
            <h2 className="text-2xl font-bold text-foreground mb-6">📚 Content Library</h2>
            <ContentFilters
              search={search}
              onSearchChange={setSearch}
              activeType={activeType}
              onTypeChange={setActiveType}
              activeTags={activeTags}
              onTagToggle={handleTagToggle}
              showFreeOnly={showFreeOnly}
              onFreeOnlyToggle={() => setShowFreeOnly(!showFreeOnly)}
            />

            <div className="mt-6">
              {filteredContent.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <p className="text-lg">No content matches your filters</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredContent.map((item) => (
                    <ContentCard key={item.id} item={item} onOpen={setPreviewItem} />
                  ))}
                </div>
              )}
            </div>
          </section>

          <CommunityTeaser />
        </PaywallGate>
      </div>

      <Footer language="en" />

      <ContentPreviewDialog
        item={previewItem}
        open={!!previewItem}
        onClose={() => setPreviewItem(null)}
      />
    </div>
  );
};

export default Academy;
