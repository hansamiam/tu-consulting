// Persistent dossier reader: GET /topuni-ai/r/:reportId(?t=<token>).
//
// Resolves the saved report via the `get-strategy` edge function
// (which does the auth/token check server-side), then renders the
// usual <StrategyDossier /> from the persisted payload.
//
// Email links built by topuni-ai-pathway's queueStrategyEmail land
// here. Anon recipients get `?t=<readToken>`; authed owners get a
// clean URL with no query.
//
// See plan: ~/.claude/plans/back-to-the-wizard-crispy-storm.md

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StrategyDossier } from "@/components/strategy/StrategyDossier";
import type { Language, StrategyReportV2 } from "@/components/strategy/types";
import { t } from "@/components/strategy/types";

interface Props {
  language?: Language;
}

export default function StrategyRead({ language: pageLanguage = "en" }: Props) {
  const { reportId } = useParams<{ reportId: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("t") ?? undefined;

  const [report, setReport] = useState<StrategyReportV2 | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<"not_found" | "server" | null>(null);

  useEffect(() => {
    if (!reportId) {
      setError("not_found");
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data, error: invokeError } = await supabase.functions.invoke(
          "get-strategy",
          { body: { reportId, token } },
        );
        if (cancelled) return;
        if (invokeError) {
          const status = (invokeError as { context?: { status?: number } }).context?.status;
          if (status === 404 || status === 403) setError("not_found");
          else setError("server");
          setLoading(false);
          return;
        }
        const r = (data as { report?: StrategyReportV2 } | null)?.report;
        if (!r) {
          setError("not_found");
        } else {
          setReport(r);
        }
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        console.error("[strategy-read] error:", (e as Error).message);
        setError("server");
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reportId, token]);

  // The dossier's language comes from the saved report itself — its
  // generation language is canonical. The page prop only governs the
  // surrounding shell copy (loading / error states).
  const shellLang = report?.language ?? pageLanguage;

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <Loader2 className="w-7 h-7 text-gold-dark mx-auto mb-4 animate-spin" />
          <p className="text-[14px] leading-[1.5] text-foreground/65 m-0">
            {t(shellLang, "Loading your strategy…", "Загружаем вашу стратегию…")}
          </p>
        </div>
      </main>
    );
  }

  if (error || !report) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <h1 className="font-heading text-[26px] font-bold leading-tight text-foreground m-0 mb-3">
            {t(shellLang, "Strategy not found.", "Стратегия не найдена.")}
          </h1>
          <p className="text-[14px] leading-[1.5] text-foreground/70 m-0">
            {error === "server"
              ? t(
                  shellLang,
                  "Something went wrong on our end. Try refreshing in a moment.",
                  "Что-то пошло не так. Попробуйте обновить страницу.",
                )
              : t(
                  shellLang,
                  "This link may have expired or the token is invalid. Generate a fresh strategy from /topuni-ai.",
                  "Ссылка могла истечь или токен неверный. Сгенерируйте новую стратегию на /topuni-ai.",
                )}
          </p>
        </div>
      </main>
    );
  }

  return <StrategyDossier report={report} />;
}
