import ReactMarkdown from "react-markdown";
import { useMemo, type ReactNode } from "react";
import { InlineScholarshipCard, type InlineScholarshipData } from "@/components/InlineScholarshipCard";

/**
 * <EnrichedMarkdown /> — drop-in replacement for ReactMarkdown that
 * detects real scholarship names in **strong** tags and swaps them
 * for an interactive InlineScholarshipCard. The brief stops being a
 * wall of dead text and becomes a launchpad into the rest of the
 * product.
 *
 * Detection rules (in priority order):
 *   1. Exact case-insensitive match of <strong> content vs scholarship_name
 *   2. Strong-content STARTS with a scholarship_name (handles
 *      "**Chevening Scholarships** — full ride…" patterns)
 *   3. Scholarship_name STARTS with the strong content (handles
 *      "**Chevening**" referencing "Chevening Scholarships")
 *   4. Normalized fuzzy: strip "scholarship", "fellowship", "program",
 *      "scholars" suffixes, then exact match
 *
 * Per render, each scholarship is swapped at most once — subsequent
 * mentions render as plain bold so the page doesn't repeat the same
 * card four times.
 *
 * Falls back to plain bold for any name we don't recognize. The LLM
 * sometimes invents scholarship names; we never want to render a
 * broken link.
 */

interface Props {
  /** The markdown to render */
  children: string;
  /** Pool of scholarships available for inline-card detection. */
  scholarships?: InlineScholarshipData[];
}

/** Normalize for fuzzy matching — lowercase, strip common suffixes. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[–—]/g, "-")             // em/en dashes → hyphen
    .replace(/[^\w\s-]/g, "")                    // strip punctuation
    .replace(/\s+/g, " ")
    .trim()
    // strip common terminal nouns so "Chevening" matches "Chevening Scholarships"
    .replace(/\s*(scholarships?|fellowship|program|scholars|award|grant)$/g, "")
    .trim();
}

/** Extract the plain text from a ReactMarkdown children prop (mixed nodes). */
function nodeToText(node: ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeToText).join("");
  if (node && typeof node === "object" && "props" in node) {
    return nodeToText((node as { props: { children: ReactNode } }).props.children);
  }
  return "";
}

export function EnrichedMarkdown({ children, scholarships }: Props) {
  // Pre-compute the lookup table once per scholarships array. Maps both
  // exact name AND normalized name to the scholarship row.
  const lookup = useMemo(() => {
    const exact = new Map<string, InlineScholarshipData>();
    const fuzzy = new Map<string, InlineScholarshipData>();
    for (const s of scholarships ?? []) {
      exact.set(s.scholarship_name.toLowerCase().trim(), s);
      fuzzy.set(normalize(s.scholarship_name), s);
    }
    return { exact, fuzzy, all: scholarships ?? [] };
  }, [scholarships]);

  // Track which scholarships we've already swapped this render. Keys are
  // scholarship_id. After the first swap, we render plain bold for repeats.
  const swappedRef = useMemo(() => new Set<string>(), [children]);

  return (
    <ReactMarkdown
      components={{
        strong: ({ children: kids }) => {
          const text = nodeToText(kids).trim();
          if (!text || lookup.all.length === 0) return <strong>{kids}</strong>;

          // 1. Exact match
          let match = lookup.exact.get(text.toLowerCase());

          // 2. Normalized match
          if (!match) match = lookup.fuzzy.get(normalize(text));

          // 3. Strong-content STARTS with a name (e.g. "Chevening Scholarships — full ride")
          if (!match) {
            const lower = text.toLowerCase();
            for (const s of lookup.all) {
              const name = s.scholarship_name.toLowerCase();
              if (lower.startsWith(name) && (lower.length - name.length < 50)) {
                match = s;
                break;
              }
            }
          }

          // 4. Scholarship name CONTAINS the strong content (e.g. "Chevening" → "Chevening Scholarships")
          if (!match && text.length >= 4) {
            const norm = normalize(text);
            for (const s of lookup.all) {
              const sNorm = normalize(s.scholarship_name);
              if (sNorm.includes(norm) && norm.length / sNorm.length >= 0.4) {
                match = s;
                break;
              }
            }
          }

          if (!match || swappedRef.has(match.scholarship_id)) {
            return <strong>{kids}</strong>;
          }
          swappedRef.add(match.scholarship_id);
          return <InlineScholarshipCard scholarship={match} />;
        },
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
