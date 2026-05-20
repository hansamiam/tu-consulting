/**
 * AcademyResourceList — member-facing resource library.
 *
 * Renders published rows from public.academy_resources grouped by
 * category. Click → POST to academy-resource-url edge function with
 * the user's JWT; on 200 we open the returned signed URL (or external
 * link) in a new tab. On 403 we surface the membership upsell.
 *
 * The list intentionally renders even for unauthed users + non-members
 * — they see locked rows with a CTA so the value of membership is
 * visible before signup, but the actual download is gated server-side.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { FileText, ExternalLink, Lock, Download, ArrowRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { ENV } from "@/lib/env";

interface ResourceRow {
  id: string;
  title: string;
  description: string | null;
  file_path: string | null;
  external_url: string | null;
  file_size_bytes: number | null;
  mime_type: string | null;
  category: string | null;
  language: "en" | "ru" | string;
  access_tier: "free" | "member" | string;
  sort_order: number;
  created_at: string;
}

interface Props {
  language?: "en" | "ru";
}

const t = (en: string, ru: string, isRu: boolean) => (isRu ? ru : en);

const formatBytes = (n: number | null) => {
  if (!n) return null;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
};

const AcademyResourceList = ({ language = "en" }: Props) => {
  const isRu = language === "ru";
  const { user, subscription } = useAuth();
  const [rows, setRows] = useState<ResourceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("academy_resources" as never)
        .select("id, title, description, file_path, external_url, file_size_bytes, mime_type, category, language, access_tier, sort_order, created_at")
        .eq("is_published", true)
        .eq("language", language)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(200);
      if (!error && data) {
        setRows(data as unknown as ResourceRow[]);
      }
      setLoading(false);
    })();
  }, [language]);

  const isMember = subscription.is_active;

  const openResource = async (row: ResourceRow) => {
    if (!user) {
      toast({
        title: t("Sign in to open", "Войдите, чтобы открыть", isRu),
        description: t("Free account. 30 seconds.", "Бесплатный аккаунт. 30 секунд.", isRu),
      });
      return;
    }
    if (row.access_tier === "member" && !isMember) {
      // Surfaced in-row via lock UI; this is a safety net.
      toast({
        title: t("Members only", "Только для участников", isRu),
        description: t("Open with a TopUni Pro or Founding membership.", "Откройте с подпиской Pro или Founding.", isRu),
      });
      return;
    }

    setBusyId(row.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast({ title: t("Session expired — sign in again.", "Сессия истекла — войдите снова.", isRu), variant: "destructive" });
        return;
      }
      const resp = await fetch(`${ENV.SUPABASE_URL}/functions/v1/academy-resource-url`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ resourceId: row.id }),
      });
      const json = await resp.json();
      if (!resp.ok || !json?.url) {
        throw new Error(json?.error || `HTTP ${resp.status}`);
      }
      window.open(json.url, "_blank", "noopener");
    } catch (e) {
      toast({
        title: t("Couldn't open the resource", "Не удалось открыть ресурс", isRu),
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center text-muted-foreground text-sm py-12">
        {t("Loading resources…", "Загрузка ресурсов…", isRu)}
      </div>
    );
  }

  if (rows.length === 0) {
    // Empty state — the system is wired but no content is published yet.
    // We say so plainly rather than hiding the section entirely.
    return (
      <div className="text-center py-12 px-4">
        <FileText className="h-6 w-6 text-muted-foreground/50 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          {t("Resources are landing soon. Check back this week.", "Ресурсы появятся скоро. Загляните на этой неделе.", isRu)}
        </p>
      </div>
    );
  }

  // Group rows by category preserving order. Resources without a category
  // get an empty group label.
  const grouped = new Map<string, ResourceRow[]>();
  for (const r of rows) {
    const key = (r.category || "").trim() || "_misc";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(r);
  }
  const groups = Array.from(grouped.entries());

  return (
    <div className="space-y-10">
      {groups.map(([cat, items]) => (
        <section key={cat}>
          {cat !== "_misc" && (
            <p className="text-[10.5px] uppercase tracking-[0.22em] text-gold-dark font-semibold mb-4">
              {cat}
            </p>
          )}
          <ul className="divide-y divide-border border-y border-border">
            {items.map((r) => {
              const locked = r.access_tier === "member" && !isMember;
              const bytes = formatBytes(r.file_size_bytes);
              return (
                <li key={r.id} className="py-5 grid grid-cols-[auto_1fr_auto] gap-x-4 sm:gap-x-6 items-start">
                  <div className="pt-1 text-muted-foreground/70">
                    {locked
                      ? <Lock className="h-4 w-4" />
                      : r.external_url
                        ? <ExternalLink className="h-4 w-4" />
                        : <FileText className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-heading font-semibold text-foreground text-[15.5px] sm:text-[16px] tracking-[-0.005em] leading-snug">
                      {r.title}
                    </h3>
                    {r.description && (
                      <p className="text-[13.5px] text-muted-foreground mt-1.5 leading-relaxed max-w-[58ch]">
                        {r.description}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground/80 flex-wrap">
                      {bytes && <span>{bytes}</span>}
                      {r.mime_type && <span>{r.mime_type.split("/").pop()}</span>}
                      {r.external_url && <span className="inline-flex items-center gap-1"><ExternalLink className="h-3 w-3" /> {t("link", "ссылка", isRu)}</span>}
                    </div>
                  </div>
                  <div className="shrink-0">
                    {locked ? (
                      <Button asChild size="sm" variant="gold">
                        <Link to={isRu ? "/pricing/ru" : "/pricing"}>
                          {user
                            ? t("Unlock", "Открыть", isRu)
                            : t("Sign up", "Регистрация", isRu)}
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </Link>
                      </Button>
                    ) : !user ? (
                      <Button asChild size="sm" variant="outline">
                        <Link to={isRu ? "/account/ru" : "/account"}>
                          {t("Sign in", "Войти", isRu)}
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === r.id}
                        onClick={() => openResource(r)}
                      >
                        <Download className="h-3.5 w-3.5 mr-1.5" />
                        {busyId === r.id ? t("Opening…", "Открываем…", isRu) : t("Open", "Открыть", isRu)}
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
};

export default AcademyResourceList;
