// ShareDossierButton — share button for the persistent strategy dossier.
//
// Strategy dossiers have a token-gated persistent URL (see StrategyRead +
// the email links built by topuni-ai-pathway.queueStrategyEmail). That URL
// is already shareable as long as the recipient has the ?t=<token> query;
// this button is the one-click affordance.
//
// Share method:
//   • Mobile / Safari with navigator.share → native share sheet
//   • Desktop fallback → write to clipboard + toast confirmation
//
// Render only when shareUrl is set — the live wizard stream renders the
// dossier before the report is persisted, so a "share" button there
// would link to a /topuni-ai page that won't show anyone else the same
// generated content.

import { Share2, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface Props {
  shareUrl: string;
  language?: "en" | "ru";
  /** Reflects in the share-sheet title field where the OS shows it. */
  reportTitle?: string;
}

export const ShareDossierButton = ({ shareUrl, language = "en", reportTitle }: Props) => {
  const ru = language === "ru";
  const [justCopied, setJustCopied] = useState(false);

  async function handleClick() {
    const shareData: ShareData = {
      title: reportTitle ?? (ru ? "Моя стратегия TopUni" : "My TopUni strategy"),
      text: ru
        ? "Посмотри мою персональную стратегию поступления."
        : "Check out my personal admissions strategy.",
      url: shareUrl,
    };

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share(shareData);
        return;
      } catch (e) {
        // User cancelled or share failed — fall through to clipboard.
        if ((e as Error).name !== "AbortError") {
          console.warn("[share-dossier] navigator.share failed", e);
        } else {
          return;
        }
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setJustCopied(true);
      toast.success(ru ? "Ссылка скопирована" : "Link copied to clipboard");
      setTimeout(() => setJustCopied(false), 2400);
    } catch {
      toast.error(ru ? "Не удалось скопировать" : "Couldn't copy — please copy from address bar");
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 text-[11px] sm:text-[12px] font-semibold text-foreground/80 hover:text-foreground bg-foreground/[0.04] hover:bg-foreground/[0.08] border border-foreground/12 rounded-full px-3 py-1.5 transition-colors print:hidden"
      aria-label={ru ? "Поделиться" : "Share strategy"}
    >
      {justCopied ? (
        <>
          <Check className="h-3.5 w-3.5 text-emerald-600" />
          {ru ? "Скопировано" : "Copied"}
        </>
      ) : (
        <>
          <Share2 className="h-3.5 w-3.5" />
          {ru ? "Поделиться" : "Share"}
        </>
      )}
    </button>
  );
};
