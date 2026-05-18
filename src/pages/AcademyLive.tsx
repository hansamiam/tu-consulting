/**
 * /academy/live — Live workshop / office-hours watching page.
 *
 * Behavior:
 *   1. Password gate. Single field, expects "topuniacademy" (will swap
 *      to a member-auth check once Academy doors are open). On submit
 *      we store a sessionStorage flag so refreshing keeps you in.
 *   2. After unlock: shows session metadata + a big "Join the live
 *      session" CTA opening the meeting URL in a new tab, plus a
 *      persistent notes pane that auto-saves to localStorage keyed
 *      by session id.
 *
 * Why not a real auth gate yet? User direction was "kinda like just a
 * screen pop up and watching platform nothing too fancy" — a single
 * shared-password MVP gets the live workshops shippable tonight.
 * Member-account gate replaces this in v2 once /academy enrollment
 * is live.
 *
 * Meeting URL: read from VITE_ACADEMY_LIVE_URL build-time env. If
 * unset, surfaces a "no live session scheduled" empty state so we
 * never ship a broken Join button. Admin updates the env var to
 * point at the next Zoom / Google Meet link before each session.
 */
import { useEffect, useState } from "react";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { Lock, Video, ExternalLink, Notebook, Sparkles, CalendarClock } from "lucide-react";
import { ENV } from "@/lib/env";

const PASSWORD = "topuniacademy";
const STORAGE_UNLOCK_KEY = "topuni-academy-live-unlocked";

const SESSION = {
  title: "TopUni Academy · Live Session",
  // Hosts + agenda are session-specific. For now read from env vars so
  // they can be flipped without a redeploy; fall back to safe defaults.
  subtitle: (ENV as Record<string, string>).VITE_ACADEMY_LIVE_TITLE
    ?? "Office hours with the alumni team",
  hostsLine: (ENV as Record<string, string>).VITE_ACADEMY_LIVE_HOSTS
    ?? "Samuel Han (Yale) · Nurzada Abdivalieva (Cambridge · Tsinghua)",
  scheduledLine: (ENV as Record<string, string>).VITE_ACADEMY_LIVE_SCHEDULE
    ?? "Drops here on session day — bookmark this page.",
  meetingUrl: (ENV as Record<string, string>).VITE_ACADEMY_LIVE_URL ?? "",
};

const NotesPane = () => {
  const storageKey = "topuni-academy-live-notes";
  const [notes, setNotes] = useState<string>("");
  // Hydrate from localStorage on first render
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setNotes(saved);
    } catch { /* private mode */ }
  }, []);
  // Auto-save (debounced via simple effect — every keystroke writes,
  // but writes are cheap on a single key)
  useEffect(() => {
    try { localStorage.setItem(storageKey, notes); } catch { /* private mode */ }
  }, [notes]);
  return (
    <div className="bg-card border border-border rounded-2xl p-5 sm:p-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Notebook className="h-4 w-4 text-gold-dark" />
          <h3 className="font-heading font-semibold text-foreground">Your notes</h3>
        </div>
        <span className="text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground font-medium">
          Auto-saved
        </span>
      </div>
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Write thoughts, action items, questions for the Q&A…"
        className="min-h-[260px] resize-y bg-background/40 border-border/70 focus-visible:ring-gold/40"
      />
      <p className="text-xs text-muted-foreground mt-2.5">
        Saved on this device only. Copy out anything you want to keep before clearing browser data.
      </p>
    </div>
  );
};

const PasswordGate = ({ onUnlock }: { onUnlock: () => void }) => {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim().toLowerCase() === PASSWORD) {
      try { sessionStorage.setItem(STORAGE_UNLOCK_KEY, "1"); } catch { /* private mode */ }
      onUnlock();
    } else {
      setError("That's not the right password.");
    }
  };
  return (
    <div className="max-w-md mx-auto px-4 pt-24 sm:pt-32 pb-16">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-card border border-border rounded-2xl p-7 sm:p-8 shadow-xl"
      >
        <div className="w-12 h-12 rounded-full bg-gold/15 border border-gold/40 flex items-center justify-center mx-auto mb-5">
          <Lock className="h-5 w-5 text-gold-dark" />
        </div>
        <h1 className="font-heading text-2xl sm:text-[26px] font-bold text-foreground text-center tracking-tight leading-tight">
          Academy live session
        </h1>
        <p className="text-muted-foreground text-sm text-center mt-2 leading-relaxed">
          Member-only space. Enter the session password to join the live workshop and follow along.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3 mt-6">
          <div className="space-y-1.5">
            <Label htmlFor="academyPw" className="text-xs font-medium text-foreground">
              Session password
            </Label>
            <Input
              id="academyPw"
              type="password"
              value={value}
              onChange={(e) => { setValue(e.target.value); setError(null); }}
              autoComplete="off"
              autoFocus
              className="bg-background/40"
            />
            {error && <p className="text-xs text-rose-500 mt-1">{error}</p>}
          </div>
          <Button type="submit" variant="gold" size="lg" className="w-full">
            Enter live session
          </Button>
        </form>
        <p className="text-[11px] text-muted-foreground text-center mt-5">
          Not a member yet?{" "}
          <a href="/academy" className="text-gold-dark font-semibold hover:underline">
            See what Academy includes
          </a>
        </p>
      </motion.div>
    </div>
  );
};

const LiveRoom = () => {
  const url = SESSION.meetingUrl?.trim();
  return (
    <section className="max-w-5xl mx-auto px-4 pt-24 sm:pt-28 pb-16">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center mb-10"
      >
        <div className="inline-flex items-center gap-2 bg-gold/15 border border-gold/40 px-3 py-1 rounded-full text-gold-dark text-[11px] uppercase tracking-[0.22em] font-semibold mb-5">
          <Sparkles className="h-3.5 w-3.5" /> Live
        </div>
        <h1 className="font-heading text-3xl sm:text-5xl font-bold text-foreground tracking-tight leading-[1.05]">
          {SESSION.title}
        </h1>
        <p className="text-muted-foreground mt-3 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
          {SESSION.subtitle}
        </p>
      </motion.div>

      <div className="grid md:grid-cols-[1.4fr,1fr] gap-5 md:gap-6">
        {/* Join card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="bg-gradient-to-br from-primary via-primary to-primary/90 border border-primary/50 rounded-2xl p-6 sm:p-7 text-primary-foreground"
        >
          <div className="flex items-center gap-2 mb-4">
            <Video className="h-4 w-4 text-gold" />
            <span className="text-[11px] uppercase tracking-[0.22em] text-gold font-semibold">
              Join the room
            </span>
          </div>
          {url ? (
            <>
              <p className="font-heading text-primary-foreground text-[15px] leading-relaxed mb-5">
                Open the live session in a new tab. The link opens directly in Zoom or Google Meet — keep this tab open for your notes.
              </p>
              <a href={url} target="_blank" rel="noopener noreferrer" className="inline-block">
                <Button variant="gold" size="lg" className="gap-2">
                  Open live session
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </a>
              <p className="text-primary-foreground/60 text-[12px] mt-4">
                Trouble joining? Refresh, or paste the link manually:{" "}
                <span className="break-all underline decoration-dotted">{url}</span>
              </p>
            </>
          ) : (
            <>
              <p className="font-heading text-primary-foreground text-[15px] leading-relaxed mb-3">
                No live session is scheduled right now.
              </p>
              <p className="text-primary-foreground/70 text-[13px] leading-relaxed">
                {SESSION.scheduledLine}
              </p>
            </>
          )}
        </motion.div>

        {/* Hosts + schedule */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-card border border-border rounded-2xl p-5 sm:p-6"
        >
          <div className="flex items-center gap-2 mb-3">
            <CalendarClock className="h-4 w-4 text-gold-dark" />
            <span className="text-[11px] uppercase tracking-[0.22em] text-gold-dark font-semibold">
              Today's session
            </span>
          </div>
          <p className="font-heading text-foreground text-[15px] leading-snug mb-3">
            Hosts: <span className="font-medium">{SESSION.hostsLine}</span>
          </p>
          <p className="text-muted-foreground text-[13.5px] leading-relaxed">
            {SESSION.scheduledLine}
          </p>
        </motion.div>
      </div>

      <div className="mt-6 sm:mt-8">
        <NotesPane />
      </div>

      <div className="mt-8 text-center">
        <a href="/academy" className="text-[12.5px] text-muted-foreground hover:text-foreground font-medium underline decoration-dotted">
          ← Back to Academy
        </a>
      </div>
    </section>
  );
};

interface AcademyLiveProps { language?: "en" | "ru"; }

const AcademyLive = ({ language = "en" }: AcademyLiveProps) => {
  const [unlocked, setUnlocked] = useState<boolean>(false);
  useEffect(() => {
    try {
      if (sessionStorage.getItem(STORAGE_UNLOCK_KEY) === "1") setUnlocked(true);
    } catch { /* private mode */ }
    const prev = document.title;
    document.title = language === "ru"
      ? "Прямая сессия — TopUni Academy"
      : "Live session — TopUni Academy";
    return () => { document.title = prev; };
  }, [language]);
  return (
    <div className="min-h-screen relative bg-background">
      <div className="relative z-10">
        <Navigation language={language} variant="default" />
        {unlocked ? <LiveRoom /> : <PasswordGate onUnlock={() => setUnlocked(true)} />}
        <Footer language={language} />
      </div>
    </div>
  );
};

export default AcademyLive;
