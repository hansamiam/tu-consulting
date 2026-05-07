import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check, MessageCircle, Twitter, Linkedin, Mail, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";

/**
 * Per-scholarship share modal. Emits one-tap shares to WhatsApp / X /
 * LinkedIn / Email and offers a copy-link fallback. Each scholarship has
 * a unique URL at /scholarships/:id, which is what we share.
 *
 * Friction is the enemy here — buttons are tap targets ≥40px, the link
 * is pre-selected on focus, and the dialog auto-closes after a successful
 * native share.
 */

interface ShareScholarshipModalProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  scholarshipName: string;
  providerName?: string | null;
  scholarshipId: string;
  language?: "en" | "ru";
}

const COPY = {
  en: {
    title: "Share this scholarship",
    desc: "Send it to a friend who's applying. Each share helps someone else fund their degree.",
    whatsapp: "WhatsApp",
    twitter: "X (Twitter)",
    linkedin: "LinkedIn",
    email: "Email",
    nativeShare: "More…",
    copyLink: "Copy link",
    linkCopied: "Link copied",
    shareLabel: "Share link",
    msg: (name: string, url: string) =>
      `Found this scholarship — looks like a fit: ${name}. Details: ${url}`,
    emailSubject: (name: string) => `Scholarship: ${name}`,
    twitterText: (name: string) => `Found a great scholarship: ${name}. Details below 👇`,
  },
  ru: {
    title: "Поделиться стипендией",
    desc: "Отправьте другу, который подаёт заявки. Каждый шер — чья-то возможность.",
    whatsapp: "WhatsApp",
    twitter: "X (Twitter)",
    linkedin: "LinkedIn",
    email: "Email",
    nativeShare: "Ещё…",
    copyLink: "Скопировать ссылку",
    linkCopied: "Ссылка скопирована",
    shareLabel: "Ссылка",
    msg: (name: string, url: string) =>
      `Нашёл стипендию — похоже подходит: ${name}. Детали: ${url}`,
    emailSubject: (name: string) => `Стипендия: ${name}`,
    twitterText: (name: string) => `Нашёл отличную стипендию: ${name}. Детали ниже 👇`,
  },
} as const;

export function ShareScholarshipModal({
  open, onOpenChange, scholarshipName, providerName, scholarshipId, language = "en",
}: ShareScholarshipModalProps) {
  const t = COPY[language];
  const [copied, setCopied] = useState(false);

  // Use the visitor's current origin so the share works in localhost too.
  const url = typeof window !== "undefined"
    ? `${window.location.origin}/scholarships/${scholarshipId}`
    : `https://topuni.org/scholarships/${scholarshipId}`;
  const message = t.msg(scholarshipName, url);

  useEffect(() => { if (!open) setCopied(false); }, [open]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t.linkCopied);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(
        language === "ru"
          ? "Не удалось скопировать. Зажмите ссылку и скопируйте вручную."
          : "Couldn't copy. Long-press the link to copy manually.",
      );
    }
  };

  const tryNativeShare = async () => {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title: scholarshipName,
          text: providerName ? `${scholarshipName} — ${providerName}` : scholarshipName,
          url,
        });
        onOpenChange(false);
      } catch { /* user dismissed */ }
    } else {
      copyLink();
    }
  };

  const buttons: { label: string; icon: React.ReactNode; href: string; bg: string }[] = [
    {
      label: t.whatsapp,
      icon: <MessageCircle className="w-4 h-4" />,
      href: `https://wa.me/?text=${encodeURIComponent(message)}`,
      bg: "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 border-emerald-500/20 dark:text-emerald-300",
    },
    {
      label: t.twitter,
      icon: <Twitter className="w-4 h-4" />,
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(t.twitterText(scholarshipName))}&url=${encodeURIComponent(url)}`,
      bg: "bg-foreground/5 text-foreground hover:bg-foreground/10 border-foreground/10",
    },
    {
      label: t.linkedin,
      icon: <Linkedin className="w-4 h-4" />,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      bg: "bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 border-blue-500/20 dark:text-blue-300",
    },
    {
      label: t.email,
      icon: <Mail className="w-4 h-4" />,
      href: `mailto:?subject=${encodeURIComponent(t.emailSubject(scholarshipName))}&body=${encodeURIComponent(message)}`,
      bg: "bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 border-amber-500/20 dark:text-amber-300",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">{t.title}</DialogTitle>
          <DialogDescription>{t.desc}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Platform buttons grid */}
          <div className="grid grid-cols-2 gap-2">
            {buttons.map((b) => (
              <a
                key={b.label}
                href={b.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setTimeout(() => onOpenChange(false), 250)}
                className={`flex items-center gap-2 px-3 py-3 rounded-lg border text-sm font-medium transition-colors ${b.bg}`}
              >
                {b.icon}
                {b.label}
              </a>
            ))}
          </div>

          {/* Native share + copy link row */}
          <div className="space-y-2 pt-1">
            <label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">{t.shareLabel}</label>
            <div className="flex gap-2">
              <Input
                value={url}
                readOnly
                onFocus={(e) => e.currentTarget.select()}
                className="text-xs font-mono bg-muted/40"
              />
              <Button onClick={copyLink} variant={copied ? "outline" : "gold"} size="sm" className="shrink-0 gap-1.5">
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? t.linkCopied : t.copyLink}
              </Button>
            </div>
            {typeof navigator !== "undefined" && "share" in navigator && (
              <Button onClick={tryNativeShare} variant="ghost" size="sm" className="w-full gap-1.5 text-muted-foreground">
                <LinkIcon className="w-3.5 h-3.5" />
                {t.nativeShare}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
