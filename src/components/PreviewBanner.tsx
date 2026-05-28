import { Eye } from "lucide-react";
import { RESOURCES_VISIBLE } from "@/lib/featureFlags";

/**
 * Renders a small "PREVIEW ONLY" banner at the top of any page that
 * shouldn't be public yet. Hidden when VITE_RESOURCES_VISIBLE=true.
 * Hidden from print so the printable PDF stays clean.
 */
export const PreviewBanner = () => {
  if (RESOURCES_VISIBLE) return null;
  return (
    <div className="bg-amber-100 border-b border-amber-300 text-amber-900 px-4 py-2 print:hidden">
      <div className="max-w-3xl mx-auto flex items-center gap-2 text-xs">
        <Eye className="w-3.5 h-3.5 shrink-0" />
        <span>
          <strong>Preview only.</strong> Not yet public — Navigation link hidden.
          Set <code className="px-1 py-0.5 rounded bg-amber-200/60 text-[11px]">VITE_RESOURCES_VISIBLE=true</code> to release.
        </span>
      </div>
    </div>
  );
};

export default PreviewBanner;
