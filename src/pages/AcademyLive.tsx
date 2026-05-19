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
import { Lock, Video, Notebook, Sparkles, CalendarClock, MicOff, VideoOff, MessageSquare, Users, MoreHorizontal, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const PASSWORD = "topuniacademy";
const STORAGE_UNLOCK_KEY = "topuni-academy-live-unlocked";

// 2026-05-19: Live session metadata comes from public.academy_workshops
// (the same table /admin/academy uses to schedule workshops). The
// founder picks the upcoming-soonest published workshop, drops in its
// `join_url`, and the live room surfaces it here automatically — no
// redeploy. We pick the row whose scheduled_for is closest to now and
// within a +/- 4-hour window (session window grace).

interface LiveSession {
  id: string;
  title: string;
  subtitle: string;
  hostsLine: string;
  scheduledLine: string;
  meetingUrl: string;
}

const DEFAULT_HOSTS = "Samuel Han (Yale) · Nurzada Abdivalieva (Cambridge · Tsinghua)";

const formatScheduled = (iso: string | null | undefined): string => {
  if (!iso) return "Drops here on session day — bookmark this page.";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Drops here on session day — bookmark this page.";
  const now = Date.now();
  const diff = d.getTime() - now;
  if (diff < -4 * 3600_000) return "This session has ended. Recording uploads soon.";
  if (diff < 0) return "Live now — join in.";
  const dateLine = d.toLocaleString(undefined, {
    weekday: "long", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", timeZoneName: "short",
  });
  return `Scheduled for ${dateLine}.`;
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

// 2026-05-19: Fake Zoom/Meet-shaped video chrome. Real iframe embed
// isn't an option (Zoom needs the heavy Web SDK + license, Google Meet
// sets X-Frame-Options: DENY), so the live room shows a "video tile"
// surface that mimics a meeting client — dark backdrop, host name
// chips, control bar at the bottom. The actual session opens in a
// new tab when you click "Open live session". The shell is purely
// visual nicety so the page doesn't read as a bare link.
const MeetShell = ({
  url, title, hostsLine, scheduledLine, hasUrl,
}: {
  url: string; title: string; hostsLine: string; scheduledLine: string; hasUrl: boolean;
}) => {
  const hosts = hostsLine.split(/[·,]/).map((h) => h.trim()).filter(Boolean).slice(0, 3);
  return (
    <div className="bg-gradient-to-br from-neutral-900 via-neutral-950 to-black border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Top bar — title + connection state */}
      <div className="flex items-center justify-between px-5 py-3 bg-black/40 border-b border-neutral-800">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="inline-flex h-2 w-2 rounded-full bg-rose-500 animate-pulse" aria-hidden />
          <span className="text-neutral-200 text-[13px] font-medium truncate">{title}</span>
        </div>
        <span className="text-neutral-500 text-[11px] uppercase tracking-[0.18em] font-medium hidden sm:inline">
          {hasUrl ? "Ready to join" : "Waiting"}
        </span>
      </div>

      {/* Video stage — placeholder tiles for each host */}
      <div className="relative aspect-video bg-neutral-900 px-4 sm:px-6 py-4 sm:py-6">
        <div className={`absolute inset-0 grid gap-2 sm:gap-3 p-4 sm:p-6 ${
          hosts.length === 1 ? "grid-cols-1" : hosts.length === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"
        }`}>
          {hosts.length > 0 ? hosts.map((h, i) => {
            const initials = h.split(/\s+/).slice(0, 2).map((p) => p[0] ?? "").join("").toUpperCase();
            return (
              <div
                key={`${h}-${i}`}
                className="relative bg-gradient-to-br from-neutral-800 to-neutral-900 rounded-lg border border-neutral-700/60 overflow-hidden flex items-center justify-center"
              >
                <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-gradient-to-br from-gold/40 to-gold-dark/40 border border-gold/30 flex items-center justify-center">
                  <span className="text-gold text-base sm:text-lg font-bold">{initials || "?"}</span>
                </div>
                <span className="absolute bottom-2 left-2 text-[11px] sm:text-[12px] text-neutral-200 font-medium bg-black/60 px-2 py-0.5 rounded backdrop-blur-sm truncate max-w-[calc(100%-1rem)]">
                  {h.replace(/\s*\([^)]*\)\s*/g, "").trim()}
                </span>
              </div>
            );
          }) : (
            <div className="col-span-full flex items-center justify-center text-neutral-500 text-sm">
              No hosts assigned for this session.
            </div>
          )}
        </div>

        {/* Centre overlay — primary join CTA */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/55 backdrop-blur-[2px]">
          <div className="text-center px-6 max-w-md">
            {hasUrl ? (
              <>
                <p className="text-neutral-200 text-[15px] sm:text-base font-medium mb-4 leading-relaxed">
                  Click to open the live session in a new tab.
                </p>
                <a href={url} target="_blank" rel="noopener noreferrer" className="inline-block">
                  <Button variant="gold" size="lg" className="gap-2 shadow-lg">
                    <Video className="h-4 w-4" />
                    Open live session
                  </Button>
                </a>
                <p className="text-neutral-400 text-[11px] mt-3">
                  Keep this tab open for your notes.
                </p>
              </>
            ) : (
              <>
                <p className="text-neutral-200 text-[15px] sm:text-base font-medium mb-2">
                  No live session scheduled.
                </p>
                <p className="text-neutral-400 text-[12.5px] leading-relaxed">
                  {scheduledLine}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bottom control bar — purely visual, mirrors a Zoom/Meet client */}
      <div className="flex items-center justify-center gap-2 sm:gap-3 px-4 py-3.5 bg-black/50 border-t border-neutral-800">
        <button
          type="button"
          aria-label="Mic (visual only)"
          className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-neutral-300 transition-colors"
          tabIndex={-1}
        >
          <MicOff className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
        </button>
        <button
          type="button"
          aria-label="Camera (visual only)"
          className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-neutral-300 transition-colors"
          tabIndex={-1}
        >
          <VideoOff className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
        </button>
        <button
          type="button"
          aria-label="Participants (visual only)"
          className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-neutral-300 transition-colors"
          tabIndex={-1}
        >
          <Users className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
        </button>
        <button
          type="button"
          aria-label="Chat (visual only)"
          className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-neutral-300 transition-colors"
          tabIndex={-1}
        >
          <MessageSquare className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
        </button>
        <button
          type="button"
          aria-label="More (visual only)"
          className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-neutral-300 transition-colors"
          tabIndex={-1}
        >
          <MoreHorizontal className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
        </button>
        <div className="w-px h-7 bg-neutral-700 mx-1.5 sm:mx-2" />
        <button
          type="button"
          aria-label="Leave (returns to Academy)"
          onClick={() => { window.location.href = "/academy"; }}
          className="h-9 sm:h-10 px-3 sm:px-4 rounded-full bg-rose-600 hover:bg-rose-500 flex items-center justify-center gap-2 text-white text-[12.5px] font-semibold transition-colors"
        >
          <Phone className="h-3.5 w-3.5 rotate-[135deg]" />
          <span className="hidden sm:inline">Leave</span>
        </button>
      </div>
    </div>
  );
};

const LiveRoom = ({ session, loading }: { session: LiveSession | null; loading: boolean }) => {
  const url = session?.meetingUrl?.trim() ?? "";
  const title = session?.title ?? "TopUni Academy · Live Session";
  const subtitle = session?.subtitle ?? "Office hours with the team";
  const hostsLine = session?.hostsLine ?? DEFAULT_HOSTS;
  const scheduledLine = session?.scheduledLine ?? "Drops here on session day — bookmark this page.";

  return (
    <section className="max-w-5xl mx-auto px-4 pt-24 sm:pt-28 pb-16">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center gap-2 bg-gold/15 border border-gold/40 px-3 py-1 rounded-full text-gold-dark text-[11px] uppercase tracking-[0.22em] font-semibold mb-4">
          <Sparkles className="h-3.5 w-3.5" /> {loading ? "Loading session…" : "Live"}
        </div>
        <h1 className="font-heading text-2xl sm:text-4xl font-bold text-foreground tracking-tight leading-[1.05]">
          {title}
        </h1>
        <p className="text-muted-foreground mt-2.5 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
          {subtitle}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.05 }}
      >
        <MeetShell url={url} title={title} hostsLine={hostsLine} scheduledLine={scheduledLine} hasUrl={!!url} />
      </motion.div>

      {/* Session metadata — kept small below the shell */}
      <div className="mt-5 grid sm:grid-cols-2 gap-3 text-[13px]">
        <div className="bg-card border border-border rounded-xl px-4 py-3">
          <p className="text-[10.5px] uppercase tracking-[0.18em] text-gold-dark font-semibold mb-1">
            <CalendarClock className="h-3 w-3 inline mr-1 -mt-0.5" />
            Schedule
          </p>
          <p className="text-foreground/85 leading-relaxed">{scheduledLine}</p>
        </div>
        <div className="bg-card border border-border rounded-xl px-4 py-3">
          <p className="text-[10.5px] uppercase tracking-[0.18em] text-gold-dark font-semibold mb-1">
            Hosts
          </p>
          <p className="text-foreground/85 leading-relaxed">{hostsLine}</p>
        </div>
      </div>

      <div className="mt-6">
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
  const [session, setSession] = useState<LiveSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

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

  // Fetch the upcoming-soonest published workshop. Window: scheduled in
  // the future, OR scheduled in the past but within the last 4 hours
  // (live-during-session grace). Falls back to NULL → empty state.
  useEffect(() => {
    if (!unlocked) return;
    (async () => {
      try {
        const fourHoursAgo = new Date(Date.now() - 4 * 3600_000).toISOString();
        const { data, error } = await supabase
          .from("academy_workshops")
          .select("id, title, summary, join_url, scheduled_for, kind")
          .eq("is_published", true)
          .gte("scheduled_for", fourHoursAgo)
          .order("scheduled_for", { ascending: true })
          .limit(1);
        if (error) throw error;
        const row = (data && data[0]) as undefined | {
          id: string; title: string; summary?: string | null;
          join_url?: string | null; scheduled_for?: string | null; kind: string;
        };
        if (row) {
          setSession({
            id: row.id,
            title: row.title,
            subtitle: row.summary ?? (row.kind === "office_hours" ? "Office hours with the team" : "Live workshop"),
            hostsLine: DEFAULT_HOSTS,
            scheduledLine: formatScheduled(row.scheduled_for ?? null),
            meetingUrl: row.join_url ?? "",
          });
        } else {
          setSession(null);
        }
      } catch (e) {
        console.warn("[academy/live] workshop fetch failed", (e as Error).message);
        setSession(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [unlocked]);

  return (
    <div className="min-h-screen relative bg-background">
      <div className="relative z-10">
        <Navigation language={language} variant="default" />
        {unlocked
          ? <LiveRoom session={session} loading={loading} />
          : <PasswordGate onUnlock={() => setUnlocked(true)} />}
        <Footer language={language} />
      </div>
    </div>
  );
};

export default AcademyLive;
