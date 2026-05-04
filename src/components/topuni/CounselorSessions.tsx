/**
 * CounselorSessions
 *
 * Disclosure that lists the authed user's past counselor sessions.
 * Click a session → load its messages back into the chat. Click "New
 * chat" → null the session_id so the next message creates a fresh
 * one. Auth-only — anon users see nothing (their chat lives in
 * localStorage, no history table).
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronDown, ChevronRight, Plus, Loader2, MessageSquare, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type SessionRow = {
  session_id: string;
  title: string | null;
  language: string;
  last_message_at: string;
  message_count: number;
};

type Msg = { role: "user" | "assistant"; content: string };

interface Props {
  isRu?: boolean;
  /** The currently loaded session, or null for a brand-new chat. */
  activeSessionId: string | null;
  /** Switch into a session: parent loads its messages + sets active. */
  onLoadSession: (sessionId: string, messages: Msg[]) => void;
  /** Start a brand-new chat (parent clears messages + nulls activeSessionId). */
  onNewSession: () => void;
  /** External flag the parent sets when the active session updates so we refetch. */
  refreshKey?: unknown;
}

export function CounselorSessions({ isRu = false, activeSessionId, onLoadSession, onNewSession, refreshKey }: Props) {
  const { user } = useAuth();
  const t = (en: string, ru: string) => (isRu ? ru : en);

  const [open, setOpen] = useState(false);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSessionId, setLoadingSessionId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setSessions([]);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("counselor_sessions")
      .select("session_id, title, language, last_message_at, message_count")
      .eq("user_id", user.id)
      .eq("archived", false)
      .gt("message_count", 0)
      .order("last_message_at", { ascending: false })
      .limit(20);
    setSessions((data as SessionRow[]) ?? []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { refresh(); }, [refresh, refreshKey]);

  const loadSession = async (sessionId: string) => {
    if (!user || sessionId === activeSessionId) return;
    setLoadingSessionId(sessionId);
    const { data } = await supabase
      .from("counselor_messages")
      .select("role, content")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });
    setLoadingSessionId(null);
    if (!data) return;
    const msgs: Msg[] = data.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
    onLoadSession(sessionId, msgs);
  };

  const archiveSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    if (!confirm(t("Delete this conversation?", "Удалить этот диалог?"))) return;
    await supabase
      .from("counselor_sessions")
      .update({ archived: true })
      .eq("session_id", sessionId);
    setSessions((prev) => prev.filter((s) => s.session_id !== sessionId));
    if (sessionId === activeSessionId) onNewSession();
  };

  if (!user) return null;

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-2">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1 text-[11px] uppercase tracking-[0.14em] text-foreground font-semibold hover:text-gold-dark transition-colors"
        >
          {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          {t("Past chats", "Прошлые диалоги")}
          {sessions.length > 0 && (
            <span className="text-[10px] text-muted-foreground tabular-nums ml-1">
              ({sessions.length})
            </span>
          )}
        </button>
        <button
          onClick={onNewSession}
          title={t("Start a new chat", "Начать новый диалог")}
          className="text-[10px] uppercase tracking-[0.14em] font-semibold text-muted-foreground hover:text-gold-dark transition-colors flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> {t("New", "Новый")}
        </button>
      </div>

      {open && (
        <div className="space-y-1">
          {loading && sessions.length === 0 ? (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground py-2 px-2">
              <Loader2 className="w-3 h-3 animate-spin" /> {t("Loading…", "Загрузка…")}
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-[11px] text-muted-foreground/80 leading-relaxed px-2 py-1">
              {t(
                "Your past conversations will appear here once you start chatting.",
                "Ваши прошлые диалоги появятся здесь, когда начнёте общаться.",
              )}
            </p>
          ) : (
            sessions.map((s) => {
              const isActive = s.session_id === activeSessionId;
              const isLoading = s.session_id === loadingSessionId;
              return (
                <button
                  key={s.session_id}
                  onClick={() => loadSession(s.session_id)}
                  disabled={isLoading}
                  className={`group w-full text-left rounded px-2 py-1.5 transition-colors disabled:opacity-50 ${
                    isActive
                      ? "bg-gold/10 border border-gold/30"
                      : "hover:bg-muted/60 border border-transparent"
                  }`}
                >
                  <div className="flex items-start gap-1.5">
                    <MessageSquare className={`w-3 h-3 mt-0.5 shrink-0 ${isActive ? "text-gold-dark" : "text-muted-foreground"}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium leading-snug truncate ${isActive ? "text-foreground" : "text-foreground/80"}`}>
                        {s.title || t("Untitled chat", "Без названия")}
                      </p>
                      <p className="text-[10px] text-muted-foreground tabular-nums mt-0.5">
                        {formatDistanceToNow(new Date(s.last_message_at), { addSuffix: true })}
                        {" · "}
                        {s.message_count} {t("messages", "сообщ.")}
                      </p>
                    </div>
                    {isLoading ? (
                      <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                    ) : (
                      <button
                        onClick={(e) => archiveSession(s.session_id, e)}
                        title={t("Delete", "Удалить")}
                        className="opacity-60 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-0.5"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
