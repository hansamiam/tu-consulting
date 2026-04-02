import { useState, useMemo, useRef } from "react";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { AcademyHero } from "@/components/academy/AcademyHero";
import { ContentFilters } from "@/components/academy/ContentFilters";
import { ContentCard, type ContentType } from "@/components/academy/ContentCard";
import { ContentPreviewDialog } from "@/components/academy/ContentPreviewDialog";
import { LearningPaths } from "@/components/academy/LearningPaths";
import { SubscriptionBanner } from "@/components/academy/SubscriptionBanner";
import { CommunityTeaser } from "@/components/academy/CommunityTeaser";
import { ACADEMY_CONTENT } from "@/data/academyContent";
import type { ContentItem } from "@/components/academy/ContentCard";

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

  const featuredContent = ACADEMY_CONTENT.filter((c) => c.isFeatured);

  const scrollToContent = () => {
    contentRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <AcademyHero onExplore={scrollToContent} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Featured Section */}
        <section className="py-12">
          <h2 className="text-2xl font-bold text-foreground mb-6">⭐ Featured</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredContent.map((item) => (
              <ContentCard key={item.id} item={item} onOpen={setPreviewItem} />
            ))}
          </div>
        </section>

        {/* Learning Paths */}
        <LearningPaths />

        {/* Full Library */}
        <section ref={contentRef} className="py-12">
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
                <p className="text-sm mt-1">Try adjusting your search or filters</p>
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

        {/* Subscription CTA */}
        <SubscriptionBanner />

        {/* Community Teaser */}
        <CommunityTeaser />
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
