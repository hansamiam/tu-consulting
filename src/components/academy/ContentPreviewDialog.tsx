import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Play, Clock, Users, Star, BookOpen, Share2, Heart, ArrowRight } from "lucide-react";
import type { ContentItem } from "./ContentCard";

interface ContentPreviewDialogProps {
  item: ContentItem | null;
  open: boolean;
  onClose: () => void;
}

export const ContentPreviewDialog = ({ item, open, onClose }: ContentPreviewDialogProps) => {
  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-gold/15 text-gold text-[10px]">{item.type}</Badge>
            {item.isFree ? (
              <Badge className="bg-green-500/15 text-green-600 text-[10px]">FREE</Badge>
            ) : (
              <Badge className="bg-primary/10 text-primary text-[10px]">PRO</Badge>
            )}
          </div>
          <DialogTitle className="text-xl">{item.title}</DialogTitle>
          <DialogDescription>{item.description}</DialogDescription>
        </DialogHeader>

        {/* Preview area */}
        <div className="relative h-56 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center my-4">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(var(--gold)/0.1),transparent_70%)]" />
          {item.isFree ? (
            <Button variant="gold" size="lg" className="gap-2">
              <Play className="w-5 h-5" /> Play Now
            </Button>
          ) : (
            <div className="text-center space-y-3">
              <Lock className="w-10 h-10 text-gold/50 mx-auto" />
              <p className="text-sm text-primary-foreground/60">Unlock with Academy Pro</p>
              <Button variant="gold" size="sm">
                Get Access <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-4 gap-3 text-center">
          {[
            { icon: Clock, label: item.duration },
            { icon: Users, label: `${item.viewCount.toLocaleString()} views` },
            { icon: Star, label: `${item.rating}/5.0` },
            { icon: BookOpen, label: item.instructor },
          ].map((meta) => (
            <div key={meta.label} className="bg-muted rounded-lg p-3">
              <meta.icon className="w-4 h-4 mx-auto mb-1 text-gold" />
              <p className="text-[11px] text-muted-foreground">{meta.label}</p>
            </div>
          ))}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {item.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <Button variant="outline" size="sm" className="flex-1 gap-1">
            <Heart className="w-3 h-3" /> Save
          </Button>
          <Button variant="outline" size="sm" className="flex-1 gap-1">
            <Share2 className="w-3 h-3" /> Share
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
