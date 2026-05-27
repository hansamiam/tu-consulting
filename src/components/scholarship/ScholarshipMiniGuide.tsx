import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEditMode } from "@/contexts/EditModeContext";
import { useAuth } from "@/contexts/AuthContext";
import { isAdminUser } from "@/lib/adminMode";
import { InlineEdit } from "@/components/admin/InlineEdit";
import { useScholarshipEdit } from "@/components/admin/useScholarshipEdit";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

/**
 * <ScholarshipMiniGuide /> — pre-generated static guide for one scholarship,
 * read from public.scholarship_mini_guides. Generic to the scholarship
 * (NOT per-profile) — replaces the live scholarship-deep-dive call.
 *
 * 2026-05-27: when an admin is in edit mode, each block becomes inline-
 * editable (textarea per line, add/remove rows for the list fields).
 * Saves write back to scholarship_mini_guides.content via read-modify-write.
 */

export interface MiniGuideContent {
  schema_version: number;
  who_fits: string;
  how_to_win: string[];
  watch_out: string[];
  what_to_prepare: string[];
  typical_admit: string;
}

interface Props {
  scholarshipId: string;
  language?: "en" | "ru";
}

export const ScholarshipMiniGuide = ({ scholarshipId, language = "en" }: Props) => {
  const [content, setContent] = useState<MiniGuideContent | null>(null);
  const [loading, setLoading] = useState(true);
  const { isEditing } = useEditMode();
  const { user } = useAuth();
  const { saving, saveMiniGuideField } = useScholarshipEdit(scholarshipId);
  const adminEditing = isAdminUser(user) && isEditing;

  const t = useMemo(() => (en: string, ru: string) => (language === "ru" ? ru : en), [language]);

  useEffect(() => {
    if (!scholarshipId) {
      console.log("[mini-guide] no-scholarship-id");
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("scholarship_mini_guides")
        .select("content")
        .eq("scholarship_id", scholarshipId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.warn("[mini-guide] fetch error", { scholarshipId, error });
        setContent(null);
      } else if (data?.content) {
        setContent(data.content as MiniGuideContent);
      } else {
        console.log("[mini-guide] no-row-found", { scholarshipId });
        setContent(null);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [scholarshipId]);

  const saveField = async <K extends keyof MiniGuideContent>(
    key: K,
    valueBefore: MiniGuideContent[K],
    valueAfter: MiniGuideContent[K]
  ): Promise<boolean> => {
    if (!content) return false;
    const next = { ...content, [key]: valueAfter } as MiniGuideContent;
    const ok = await saveMiniGuideField(scholarshipId, String(key), valueBefore, valueAfter, next as unknown as Record<string, unknown>);
    if (ok) setContent(next);
    return ok;
  };

  if (loading) return null;

  // 2026-05-27: when no mini-guide row exists for this scholarship, show a
  // "Top Uni notes coming soon" placeholder rather than vanishing the section.
  if (!content) {
    return (
      <section className="not-prose mb-8 max-w-2xl">
        <p className="m-0 mb-2 text-[12px] uppercase tracking-[0.08em] font-semibold text-foreground/55">
          {t("How this scholarship plays", "Как работает эта стипендия")}
        </p>
        <div className="rounded-2xl border border-dashed border-foreground/15 bg-foreground/[0.02] px-5 py-6">
          <p className="font-heading text-[15px] leading-[1.55] text-foreground/70 m-0">
            {t(
              "Top Uni notes coming soon. We're writing the strategy read for this scholarship — back with it shortly.",
              "Заметки Top Uni скоро появятся. Мы готовим стратегический разбор этой стипендии — вернёмся с ним совсем скоро."
            )}
          </p>
          {adminEditing && (
            <div className="mt-3">
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  const seed: MiniGuideContent = {
                    schema_version: 1,
                    who_fits: "",
                    how_to_win: [],
                    watch_out: [],
                    what_to_prepare: [],
                    typical_admit: "",
                  };
                  const { error } = await supabase
                    .from("scholarship_mini_guides")
                    .insert({ scholarship_id: scholarshipId, content: seed as never });
                  if (error) {
                    toast({ title: "Could not create mini-guide", description: error.message, variant: "destructive" });
                    return;
                  }
                  setContent(seed);
                  toast({ title: "Mini-guide created — fill in the sections" });
                }}
              >
                Admin: start a mini-guide
              </Button>
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="not-prose mb-8 max-w-2xl"
    >
      <p className="m-0 mb-2 text-[12px] uppercase tracking-[0.08em] font-semibold text-foreground/55">
        {t("How this scholarship plays", "Как работает эта стипендия")}
      </p>
      <h3 className="font-heading text-[22px] sm:text-[26px] font-bold tracking-[-0.02em] leading-[1.15] text-foreground m-0 mb-6 text-balance">
        <InlineEdit
          field="who_fits"
          variant="textarea"
          value={content.who_fits}
          onSave={(next) => saveField("who_fits", content.who_fits, (next as string) ?? "")}
          saving={saving}
          label="Who fits (display headline)"
        >
          {content.who_fits || (adminEditing ? <em className="text-foreground/40">empty</em> : null)}
        </InlineEdit>
      </h3>

      <ListBlock
        title={t("How to win it", "Как выиграть")}
        items={content.how_to_win}
        editing={adminEditing}
        saving={saving}
        field="how_to_win"
        renderItem={(pt, i) => (
          <li
            key={i}
            className="grid grid-cols-[20px_1fr] gap-3 text-[15px] leading-[1.6] text-foreground/85"
          >
            <span className="font-heading font-semibold text-foreground/45 tabular-nums">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span>{pt}</span>
          </li>
        )}
        ordered
        onSave={(nextItems) => saveField("how_to_win", content.how_to_win, nextItems)}
      />

      <ListBlock
        title={t("What to prepare", "Что подготовить")}
        items={content.what_to_prepare}
        editing={adminEditing}
        saving={saving}
        field="what_to_prepare"
        renderItem={(pt, i) => (
          <li
            key={i}
            className="grid grid-cols-[20px_1fr] gap-3 text-[15px] leading-[1.6] text-foreground/85"
          >
            <span className="font-heading text-foreground/45 leading-[1.6]">·</span>
            <span>{pt}</span>
          </li>
        )}
        onSave={(nextItems) => saveField("what_to_prepare", content.what_to_prepare, nextItems)}
      />

      <Block title={t("Typical winner", "Кто обычно выигрывает")}>
        <p className="text-[15px] leading-[1.6] text-foreground/85 m-0">
          <InlineEdit
            field="typical_admit"
            variant="textarea"
            value={content.typical_admit}
            onSave={(next) => saveField("typical_admit", content.typical_admit, (next as string) ?? "")}
            saving={saving}
            label="Typical winner"
          >
            {content.typical_admit || (adminEditing ? <em className="text-foreground/40">empty</em> : null)}
          </InlineEdit>
        </p>
      </Block>

      {(content.watch_out.length > 0 || adminEditing) && (
        <ListBlock
          title={t("Watch out", "Будьте осторожны")}
          items={content.watch_out}
          editing={adminEditing}
          saving={saving}
          field="watch_out"
          renderItem={(a, i) => (
            <li
              key={i}
              className="grid grid-cols-[20px_1fr] gap-3 text-[15px] leading-[1.6] text-foreground/85"
            >
              <span className="text-rose-700/80 leading-[1.6]">!</span>
              <span>{a}</span>
            </li>
          )}
          onSave={(nextItems) => saveField("watch_out", content.watch_out, nextItems)}
        />
      )}
    </motion.section>
  );
};

const Block = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mt-7 pt-6 border-t border-border/50">
    <p className="m-0 mb-3 text-[12px] uppercase tracking-[0.08em] font-semibold text-foreground/55">
      {title}
    </p>
    {children}
  </div>
);

const ListBlock = ({
  title,
  items,
  editing,
  saving,
  field,
  renderItem,
  ordered,
  onSave,
}: {
  title: string;
  items: string[];
  editing: boolean;
  saving: boolean;
  field: string;
  renderItem: (item: string, i: number) => React.ReactNode;
  ordered?: boolean;
  onSave: (next: string[]) => Promise<boolean>;
}) => {
  const [draftIdx, setDraftIdx] = useState<number | null>(null);
  const [draftText, setDraftText] = useState("");

  const Wrap = ordered ? "ol" : "ul";

  const saveAt = async (i: number, next: string) => {
    const copy = [...items];
    copy[i] = next;
    const ok = await onSave(copy);
    if (ok) setDraftIdx(null);
  };

  const removeAt = async (i: number) => {
    const copy = items.filter((_, idx) => idx !== i);
    await onSave(copy);
  };

  const addNew = async () => {
    const v = draftText.trim();
    if (!v) return;
    const copy = [...items, v];
    const ok = await onSave(copy);
    if (ok) {
      setDraftText("");
      setDraftIdx(null);
    }
  };

  return (
    <Block title={title}>
      <Wrap className="space-y-2.5 m-0 pl-0 list-none">
        {items.map((pt, i) =>
          editing ? (
            <li key={i} className="grid grid-cols-[20px_1fr_auto] gap-3 items-start text-[15px] leading-[1.6]">
              <span className="font-heading text-foreground/45 leading-[1.6]">{ordered ? String(i + 1).padStart(2, "0") : "·"}</span>
              <InlineEdit
                field={`${field}[${i}]`}
                variant="textarea"
                value={pt}
                onSave={(next) => saveAt(i, ((next as string) ?? "").trim())}
                saving={saving}
              >
                <span>{pt}</span>
              </InlineEdit>
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="text-foreground/40 hover:text-rose-600 p-1"
                aria-label="Remove item"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ) : (
            renderItem(pt, i)
          )
        )}
      </Wrap>
      {editing && (
        <div className="mt-3 flex items-center gap-2">
          <input
            type="text"
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addNew(); } }}
            placeholder="Add a new item…"
            className="flex-1 rounded-sm border border-foreground/15 bg-background px-2 py-1 text-[14px] font-sans"
          />
          <Button type="button" size="sm" variant="outline" onClick={addNew} disabled={saving || !draftText.trim()} className="gap-1 h-7">
            <Plus className="size-3" /> Add
          </Button>
        </div>
      )}
    </Block>
  );
};
