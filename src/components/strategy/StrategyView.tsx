// Data-fetching wrapper around StrategyDossier. Posts the wizard
// profile to topuni-ai-pathway, renders skeleton during fetch, then
// renders the dossier. Replaces TopUniDashboard for v2.
//
// See plan: ~/.claude/plans/back-to-the-wizard-crispy-storm.md

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { EDGE_FUNCTIONS_URL } from "@/lib/env";
import { supabase } from "@/integrations/supabase/client";
import { StrategyDossier } from "./StrategyDossier";
import type { Language, StrategyApiResponse, StrategyReportV2 } from "./types";
import { t } from "./types";

interface Props {
  // deno-lint-ignore no-explicit-any
  profile: any;
  language: Language;
}

export const StrategyView = ({ profile, language }: Props) => {
  const [report, setReport] = useState<StrategyReportV2 | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    let cancelled = false;

    const run = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const authHeader = session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {};

        const resp = await fetch(`${EDGE_FUNCTIONS_URL}/topuni-ai-pathway`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader },
          body: JSON.stringify({ profile, language }),
        });

        if (!resp.ok) {
          const txt = await resp.text();
          throw new Error(`${resp.status}: ${txt.slice(0, 200)}`);
        }

        const json = (await resp.json()) as StrategyApiResponse;
        if (!cancelled) {
          setReport(json.report);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError((e as Error).message);
          setLoading(false);
        }
      }
    };
    void run();
    return () => { cancelled = true; };
  }, [profile, language]);

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <Loader2 className="w-7 h-7 text-gold-dark mx-auto mb-4 animate-spin" />
          <h2 className="font-heading text-[22px] font-bold leading-tight text-foreground mb-2">
            {t(language, "Generating your strategy…", "Готовим вашу стратегию…")}
          </h2>
          <p className="text-[14px] leading-[1.5] text-foreground/65 m-0">
            {t(
              language,
              "Reading your intake, scoring readiness across 5 axes, and drafting your honest diagnosis.",
              "Анализируем анкету, оцениваем готовность по 5 осям и формулируем честный диагноз.",
            )}
          </p>
        </div>
      </main>
    );
  }

  if (error || !report) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <h2 className="font-heading text-[22px] font-bold leading-tight text-foreground mb-3">
            {t(language, "Something went wrong.", "Что-то пошло не так.")}
          </h2>
          <p className="text-[14px] leading-[1.5] text-foreground/70 m-0 mb-4">
            {t(
              language,
              "We couldn't generate your strategy. Try refreshing in a minute.",
              "Не получилось сгенерировать стратегию. Попробуйте обновить страницу через минуту.",
            )}
          </p>
          {error && (
            <p className="text-[11px] font-mono text-foreground/40 m-0 break-words">
              {error}
            </p>
          )}
        </div>
      </main>
    );
  }

  return <StrategyDossier report={report} />;
};
