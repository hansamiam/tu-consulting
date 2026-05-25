import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Award, Crown } from "lucide-react";

/**
 * <ProBriefUnlock /> — the gated dialog that captures the three depth
 * fields used to upgrade a basic brief to a Pro brief.
 *
 * Why gated: the standard /topuni-ai flow is intentionally fast — three
 * steps, two minutes, and you've got a brief. That's the on-ramp. This
 * dialog opens ONLY when the user explicitly asks for a deeper brief
 * by clicking the upgrade card under their basic brief, so the
 * lightweight flow stays lightweight.
 *
 * The three fields:
 *   • Top activity / achievement (220 chars) — the role they held,
 *     what they built, who they led. Anchors essay angles.
 *   • What's your story? (320 chars) — what shaped them. Pulled into
 *     the strategic positioning paragraph + at least one essay angle.
 *   • Specific schools on your list (240 chars) — comma-separated.
 *     The Pro brief shortlist references these by name.
 *
 * On submit, the parent regenerates the brief at `reportGrade=premium`
 * with these fields injected into the LLM prompt context.
 *
 * Bilingual via the `language` prop. The whole point is to feel
 * effortless — every field is optional, all skippable.
 */

export interface ProBriefDepth {
  topActivity: string;
  personalStory: string;
  namedSchools: string;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Initial values (so reopening shows what was previously saved). */
  initial?: ProBriefDepth;
  language?: "en" | "ru";
  /** Called with the captured fields. Parent should regenerate the brief
   *  at premium tier and merge these into the profile. */
  onSubmit: (depth: ProBriefDepth) => void;
}

const COPY = {
  en: {
    title: "Unlock the Pro report",
    desc: "Three more questions. Each answer sharpens the report.",
    activityLabel: "Top activity or achievement",
    activityHelp: "One thing you're proud of — the role you held, what you built, who you led.",
    activityPh: "e.g. Founded the school robotics club, grew it from 3 to 28 members, won regional finals.",
    storyLabel: "What's your story?",
    storyHelp: "What shaped your perspective — an obstacle, a turning point, what drives you. Three sentences max.",
    storyPh: "e.g. Grew up between two countries; spent gap year teaching English in rural classrooms; now want to study public policy to work on education access.",
    schoolsLabel: "Specific schools on your list",
    schoolsHelp: "Comma-separated.",
    schoolsPh: "e.g. Yale, Cambridge, NUS, ETH Zürich",
    submit: "Generate my Pro report",
    skip: "Maybe later",
    badge: "Pro report",
    blurb: "Same engine, deeper context.",
  },
  ru: {
    title: "Открыть Pro-отчёт",
    desc: "Ещё три вопроса. Каждый ответ делает отчёт точнее.",
    activityLabel: "Главная активность или достижение",
    activityHelp: "Одно дело, которым вы гордитесь — какую роль играли, что построили, кого вели.",
    activityPh: "напр. Основал клуб робототехники, вырастил с 3 до 28 человек, выиграл региональный финал.",
    storyLabel: "Какая ваша история?",
    storyHelp: "Что сформировало ваш взгляд — препятствие, поворотная точка, что движет вами. Максимум 3 предложения.",
    storyPh: "напр. Вырос между двумя странами; в gap year преподавал английский в сельских школах; теперь учусь на public policy чтобы работать над доступом к образованию.",
    schoolsLabel: "Конкретные университеты в списке",
    schoolsHelp: "Через запятую.",
    schoolsPh: "напр. Yale, Cambridge, NUS, ETH Zürich",
    submit: "Создать мой Pro-отчёт",
    skip: "Может позже",
    badge: "Pro отчёт",
    blurb: "Тот же движок, глубже контекст.",
  },
} as const;

export function ProBriefUnlock({ open, onOpenChange, initial, language = "en", onSubmit }: Props) {
  const t = COPY[language];
  const [topActivity, setTopActivity] = useState(initial?.topActivity ?? "");
  const [personalStory, setPersonalStory] = useState(initial?.personalStory ?? "");
  const [namedSchools, setNamedSchools] = useState(initial?.namedSchools ?? "");

  // Re-hydrate from initial whenever the dialog opens — so editing later
  // surfaces what was previously saved.
  useEffect(() => {
    if (!open) return;
    setTopActivity(initial?.topActivity ?? "");
    setPersonalStory(initial?.personalStory ?? "");
    setNamedSchools(initial?.namedSchools ?? "");
  }, [open, initial]);

  const submit = () => {
    onSubmit({ topActivity: topActivity.trim(), personalStory: personalStory.trim(), namedSchools: namedSchools.trim() });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-[0.18em] uppercase bg-gradient-to-r from-gold-dark to-gold text-primary">
              <Crown className="w-3 h-3" />
              {t.badge}
            </span>
          </div>
          <DialogTitle className="font-heading text-xl">{t.title}</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">{t.desc}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Top activity */}
          <div>
            <Label className="text-sm font-semibold text-foreground mb-1.5 block">{t.activityLabel}</Label>
            <p className="text-xs text-muted-foreground mb-2 leading-relaxed">{t.activityHelp}</p>
            <textarea
              value={topActivity}
              onChange={(e) => setTopActivity(e.target.value.slice(0, 220))}
              placeholder={t.activityPh}
              rows={2}
              className="w-full text-sm bg-background border border-input rounded-md px-3 py-2 resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <p className="text-[10px] text-muted-foreground/70 mt-1 text-right tabular-nums">{topActivity.length}/220</p>
          </div>

          {/* Personal story */}
          <div>
            <Label className="text-sm font-semibold text-foreground mb-1.5 block">{t.storyLabel}</Label>
            <p className="text-xs text-muted-foreground mb-2 leading-relaxed">{t.storyHelp}</p>
            <textarea
              value={personalStory}
              onChange={(e) => setPersonalStory(e.target.value.slice(0, 320))}
              placeholder={t.storyPh}
              rows={3}
              className="w-full text-sm bg-background border border-input rounded-md px-3 py-2 resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <p className="text-[10px] text-muted-foreground/70 mt-1 text-right tabular-nums">{personalStory.length}/320</p>
          </div>

          {/* Named schools */}
          <div>
            <Label className="text-sm font-semibold text-foreground mb-1.5 block">{t.schoolsLabel}</Label>
            <p className="text-xs text-muted-foreground mb-2 leading-relaxed">{t.schoolsHelp}</p>
            <Input
              value={namedSchools}
              onChange={(e) => setNamedSchools(e.target.value.slice(0, 240))}
              placeholder={t.schoolsPh}
              className="text-sm"
            />
            <p className="text-[10px] text-muted-foreground/70 mt-1 text-right tabular-nums">{namedSchools.length}/240</p>
          </div>

          <p className="text-[11px] text-muted-foreground italic leading-relaxed border-l-2 border-gold/40 pl-3">
            {t.blurb}
          </p>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-muted-foreground">{t.skip}</Button>
          <Button variant="gold" onClick={submit} className="gap-1.5">
            <Award className="w-4 h-4" />
            {t.submit}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
