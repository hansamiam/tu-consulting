import { useState, useRef, useEffect, ReactNode, KeyboardEvent } from "react";
import { Check, X, Plus, Pencil } from "lucide-react";
import { useEditMode } from "@/contexts/EditModeContext";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * Click-to-edit wrapper for one scalar (or one array) field. Three responsibilities:
 *   1. Render the read-only `children` when edit mode is off, or the user is not admin.
 *      Passthrough — visually identical to the original.
 *   2. Render a dotted underline + edit affordance when edit mode is on.
 *   3. On click, swap the read-only render for an input/textarea/select/chip editor.
 *      Save commits via `onSave(next)`; Cancel restores the prior value.
 *
 * Save / cancel use Enter / Esc respectively for text inputs. For textareas,
 * Cmd/Ctrl+Enter saves so newlines stay typeable.
 *
 * The hosting page owns the value (so reloads / network reverts work correctly);
 * this component is uncontrolled within an edit session and reports back via onSave.
 */

type Variant = "text" | "textarea" | "date" | "enum" | "chip-array";

interface BaseProps {
  field: string;
  variant: Variant;
  children: ReactNode;
  onSave: (next: string | string[] | null) => Promise<boolean>;
  saving?: boolean;
  /** Optional small label shown above the editor input. Useful when `children` is
   *  a styled value with no field label. */
  label?: string;
}

interface ScalarProps extends BaseProps {
  variant: "text" | "textarea" | "date";
  value: string | null;
}

interface EnumProps extends BaseProps {
  variant: "enum";
  value: string | null;
  enumOptions: { value: string; label: string }[];
}

interface ChipArrayProps extends BaseProps {
  variant: "chip-array";
  value: string[] | null;
}

type Props = ScalarProps | EnumProps | ChipArrayProps;

export const InlineEdit = (props: Props) => {
  const { isEditing: pageEditing } = useEditMode();
  const [editingThis, setEditingThis] = useState(false);

  if (!pageEditing) return <>{props.children}</>;

  if (!editingThis) {
    return (
      <span
        role="button"
        tabIndex={0}
        onClick={() => setEditingThis(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setEditingThis(true);
          }
        }}
        className="group/edit inline-block cursor-pointer rounded-sm bg-amber-100/40 ring-1 ring-amber-400/60 hover:bg-amber-100/80 hover:ring-amber-500 transition-colors px-1 -mx-1 relative"
        title={`Click to edit ${props.field}`}
      >
        {props.children}
        <Pencil className="absolute -top-2 -right-2 size-3 text-amber-700 opacity-0 group-hover/edit:opacity-100 bg-amber-100 rounded-full p-0.5 box-content" />
      </span>
    );
  }

  return (
    <Editor
      {...props}
      onClose={(committed) => {
        setEditingThis(false);
        if (committed) {/* parent already re-rendered with new value */}
      }}
    />
  );
};

interface EditorProps {
  onClose: (committed: boolean) => void;
}

const Editor = (props: Props & EditorProps) => {
  const { variant, field, label, onSave, onClose, saving } = props;
  const initial = props.value;

  if (variant === "chip-array") {
    return <ChipArrayEditor field={field} label={label} initial={initial as string[] | null} onSave={onSave} onClose={onClose} saving={saving} />;
  }
  if (variant === "enum") {
    return <EnumEditor field={field} label={label} initial={initial as string | null} enumOptions={(props as EnumProps).enumOptions} onSave={onSave} onClose={onClose} saving={saving} />;
  }
  return <ScalarEditor variant={variant} field={field} label={label} initial={initial as string | null} onSave={onSave} onClose={onClose} saving={saving} />;
};

const ScalarEditor = ({
  variant,
  field,
  label,
  initial,
  onSave,
  onClose,
  saving,
}: {
  variant: "text" | "textarea" | "date";
  field: string;
  label?: string;
  initial: string | null;
  onSave: (next: string | null) => Promise<boolean>;
  onClose: (committed: boolean) => void;
  saving?: boolean;
}) => {
  const [draft, setDraft] = useState(initial ?? "");
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => {
    ref.current?.focus();
    if (ref.current && "select" in ref.current) (ref.current as HTMLInputElement).select?.();
  }, []);

  const commit = async () => {
    const next = draft.trim() === "" ? null : draft;
    if (next === initial) {
      onClose(false);
      return;
    }
    const ok = await onSave(next);
    if (ok) onClose(true);
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === "Escape") { e.preventDefault(); onClose(false); return; }
    if (variant === "textarea") {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); commit(); }
    } else {
      if (e.key === "Enter") { e.preventDefault(); commit(); }
    }
  };

  return (
    <span className="inline-flex flex-col gap-1.5 align-baseline w-full max-w-2xl">
      {label && <span className="text-[11px] uppercase tracking-[0.08em] text-foreground/55">{label} · {field}</span>}
      {variant === "textarea" ? (
        <Textarea
          ref={ref as React.RefObject<HTMLTextAreaElement>}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          rows={Math.min(8, Math.max(3, (draft.match(/\n/g) || []).length + 2))}
          className="font-sans text-[15px]"
        />
      ) : (
        <Input
          ref={ref as React.RefObject<HTMLInputElement>}
          type={variant === "date" ? "date" : "text"}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          className="font-sans"
        />
      )}
      <EditorActions
        saving={saving}
        onSave={commit}
        onCancel={() => onClose(false)}
        hint={variant === "textarea" ? "⌘↩ to save, Esc to cancel" : "↩ to save, Esc to cancel"}
      />
    </span>
  );
};

const EnumEditor = ({
  field,
  label,
  initial,
  enumOptions,
  onSave,
  onClose,
  saving,
}: {
  field: string;
  label?: string;
  initial: string | null;
  enumOptions: { value: string; label: string }[];
  onSave: (next: string | null) => Promise<boolean>;
  onClose: (committed: boolean) => void;
  saving?: boolean;
}) => {
  const [draft, setDraft] = useState(initial ?? "");

  const commit = async () => {
    const next = draft === "" ? null : draft;
    if (next === initial) { onClose(false); return; }
    const ok = await onSave(next);
    if (ok) onClose(true);
  };

  return (
    <span className="inline-flex flex-col gap-1.5 align-baseline">
      {label && <span className="text-[11px] uppercase tracking-[0.08em] text-foreground/55">{label} · {field}</span>}
      <Select value={draft} onValueChange={setDraft}>
        <SelectTrigger className="w-[220px]">
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent>
          {enumOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <EditorActions saving={saving} onSave={commit} onCancel={() => onClose(false)} />
    </span>
  );
};

const ChipArrayEditor = ({
  field,
  label,
  initial,
  onSave,
  onClose,
  saving,
}: {
  field: string;
  label?: string;
  initial: string[] | null;
  onSave: (next: string[] | null) => Promise<boolean>;
  onClose: (committed: boolean) => void;
  saving?: boolean;
}) => {
  const [chips, setChips] = useState<string[]>(initial ?? []);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const add = () => {
    const v = draft.trim();
    if (!v) return;
    if (chips.includes(v)) { setDraft(""); return; }
    setChips([...chips, v]);
    setDraft("");
  };

  const remove = (i: number) => setChips(chips.filter((_, idx) => idx !== i));

  const commit = async () => {
    const next = chips.length === 0 ? null : chips;
    // Shallow array equality
    const same = (initial?.length ?? 0) === (next?.length ?? 0) && (next ?? []).every((v, i) => v === initial?.[i]);
    if (same) { onClose(false); return; }
    const ok = await onSave(next);
    if (ok) onClose(true);
  };

  return (
    <span className="inline-flex flex-col gap-2 align-baseline w-full max-w-2xl">
      {label && <span className="text-[11px] uppercase tracking-[0.08em] text-foreground/55">{label} · {field}</span>}
      <div className="flex flex-wrap gap-1.5">
        {chips.map((c, i) => (
          <Badge key={`${c}-${i}`} variant="secondary" className="gap-1 pl-2 pr-1 py-0.5">
            <span>{c}</span>
            <button
              type="button"
              onClick={() => remove(i)}
              className="rounded-full hover:bg-foreground/10 p-0.5"
              aria-label={`Remove ${c}`}
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-1.5">
        <Input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); add(); }
            else if (e.key === "Escape") { e.preventDefault(); onClose(false); }
            else if (e.key === "Backspace" && draft === "" && chips.length > 0) {
              setChips(chips.slice(0, -1));
            }
          }}
          placeholder="Type and press Enter…"
          className="font-sans flex-1"
        />
        <Button type="button" size="sm" variant="outline" onClick={add} className="gap-1">
          <Plus className="size-3" /> Add
        </Button>
      </div>
      <EditorActions saving={saving} onSave={commit} onCancel={() => onClose(false)} hint="Enter to add a chip · Backspace on empty input removes last" />
    </span>
  );
};

const EditorActions = ({
  saving,
  onSave,
  onCancel,
  hint,
}: {
  saving?: boolean;
  onSave: () => void;
  onCancel: () => void;
  hint?: string;
}) => (
  <div className="flex items-center gap-2">
    <Button type="button" size="sm" onClick={onSave} disabled={saving} className="gap-1 h-7">
      <Check className="size-3" /> {saving ? "Saving…" : "Save"}
    </Button>
    <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={saving} className="gap-1 h-7">
      <X className="size-3" /> Cancel
    </Button>
    {hint && <span className="text-[11px] text-foreground/45">{hint}</span>}
  </div>
);
