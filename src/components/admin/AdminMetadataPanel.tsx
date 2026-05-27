import { useEditMode } from "@/contexts/EditModeContext";
import { useAuth } from "@/contexts/AuthContext";
import { isAdminUser } from "@/lib/adminMode";
import { InlineEdit } from "./InlineEdit";
import { useScholarshipEdit } from "./useScholarshipEdit";
import { CoverImageEditor } from "./CoverImageEditor";
import { DeleteScholarshipButton } from "./DeleteScholarshipButton";

/**
 * Structured-field editor surfaced ONLY when an admin has flipped on
 * edit mode. Lives at the top of the scholarship detail page, above
 * the magazine layout.
 *
 * Why it's separate from inline edits: chip arrays, enums, dates, and
 * URLs don't have a single "click the text" affordance in the editorial
 * layout — they're rendered through icons, badges, helpers. Threading
 * InlineEdit into each of those would be 30+ touchpoints and several
 * special-cases. A clearly-labelled metadata table is the right surface
 * for the non-prose fields. Prose (title, eligibility, how-to-win, etc.)
 * stays inline-editable in place.
 */

interface ScholarshipFields {
  scholarship_id: string;
  provider_name: string | null;
  host_country: string | null;
  official_url: string | null;
  coverage_type: string;
  award_amount_text: string | null;
  application_deadline: string | null;
  target_degree_level: string[] | null;
  target_fields: string[] | null;
  target_demographics: string[] | null;
  eligible_countries: string[] | null;
  citizenship_requirements: string | null;
  cover_image_url?: string | null;
  is_published?: boolean | null;
}

interface Props {
  scholarship: ScholarshipFields;
  onSaved: (patch: Partial<ScholarshipFields>) => void;
  onDeleted?: () => void;
  scholarshipName?: string;
}

const COVERAGE_OPTIONS = [
  { value: "full_ride", label: "Full ride" },
  { value: "full_tuition", label: "Full tuition" },
  { value: "tuition_only", label: "Tuition only" },
  { value: "stipend", label: "Stipend" },
  { value: "stipend_only", label: "Stipend only" },
  { value: "partial", label: "Partial" },
  { value: "unknown", label: "Unknown" },
];

export const AdminMetadataPanel = ({ scholarship, onSaved, onDeleted, scholarshipName }: Props) => {
  const { user } = useAuth();
  const { isEditing } = useEditMode();
  const { saving, saveScholarshipField } = useScholarshipEdit(scholarship.scholarship_id);

  if (!isAdminUser(user) || !isEditing) return null;

  const make = <K extends keyof ScholarshipFields>(field: K) =>
    async (next: string | string[] | null): Promise<boolean> => {
      const before = scholarship[field] as unknown;
      const ok = await saveScholarshipField(field as string, before, next);
      if (ok) onSaved({ [field]: next } as Partial<ScholarshipFields>);
      return ok;
    };

  return (
    <section className="max-w-[860px] mx-auto px-5 sm:px-8 pt-6">
      <div className="rounded-lg border-2 border-amber-400/60 bg-amber-50/50 dark:bg-amber-900/10 px-5 py-4">
        <p className="text-[11px] uppercase tracking-[0.22em] font-semibold text-amber-700 dark:text-amber-400 mb-3">
          Admin · structured fields
        </p>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4 text-[14px]">
          <Row label="Provider">
            <InlineEdit field="provider_name" variant="text" value={scholarship.provider_name} onSave={make("provider_name")} saving={saving}>
              <span>{scholarship.provider_name ?? <em className="text-foreground/40">empty</em>}</span>
            </InlineEdit>
          </Row>
          <Row label="Host country">
            <InlineEdit field="host_country" variant="text" value={scholarship.host_country} onSave={make("host_country")} saving={saving}>
              <span>{scholarship.host_country ?? <em className="text-foreground/40">empty</em>}</span>
            </InlineEdit>
          </Row>
          <Row label="Official URL">
            <InlineEdit field="official_url" variant="text" value={scholarship.official_url} onSave={make("official_url")} saving={saving}>
              <span className="break-all">{scholarship.official_url ?? <em className="text-foreground/40">empty</em>}</span>
            </InlineEdit>
          </Row>
          <Row label="Coverage type">
            <InlineEdit field="coverage_type" variant="enum" value={scholarship.coverage_type} enumOptions={COVERAGE_OPTIONS} onSave={make("coverage_type")} saving={saving}>
              <span>{scholarship.coverage_type ?? <em className="text-foreground/40">empty</em>}</span>
            </InlineEdit>
          </Row>
          <Row label="Award amount">
            <InlineEdit field="award_amount_text" variant="text" value={scholarship.award_amount_text} onSave={make("award_amount_text")} saving={saving}>
              <span>{scholarship.award_amount_text ?? <em className="text-foreground/40">empty</em>}</span>
            </InlineEdit>
          </Row>
          <Row label="Application deadline">
            <InlineEdit field="application_deadline" variant="date" value={scholarship.application_deadline} onSave={make("application_deadline")} saving={saving}>
              <span>{scholarship.application_deadline ?? <em className="text-foreground/40">no deadline set</em>}</span>
            </InlineEdit>
          </Row>
          <Row label="Eligible countries" full>
            <InlineEdit field="eligible_countries" variant="chip-array" value={scholarship.eligible_countries} onSave={make("eligible_countries")} saving={saving}>
              <span className="flex flex-wrap gap-1">
                {(scholarship.eligible_countries ?? []).length === 0 ? (
                  <em className="text-foreground/40">none — implies any (matcher reads as open)</em>
                ) : (
                  (scholarship.eligible_countries ?? []).map((c) => (
                    <span key={c} className="inline-flex rounded-sm bg-foreground/5 px-1.5 py-0.5 text-[12px]">{c}</span>
                  ))
                )}
              </span>
            </InlineEdit>
          </Row>
          <Row label="Citizenship rule (prose)" full>
            <InlineEdit field="citizenship_requirements" variant="textarea" value={scholarship.citizenship_requirements} onSave={make("citizenship_requirements")} saving={saving}>
              <span className="whitespace-pre-line">{scholarship.citizenship_requirements ?? <em className="text-foreground/40">empty</em>}</span>
            </InlineEdit>
          </Row>
          <Row label="Target degree levels" full>
            <InlineEdit field="target_degree_level" variant="chip-array" value={scholarship.target_degree_level} onSave={make("target_degree_level")} saving={saving}>
              <span className="flex flex-wrap gap-1">
                {(scholarship.target_degree_level ?? []).map((d) => (
                  <span key={d} className="inline-flex rounded-sm bg-foreground/5 px-1.5 py-0.5 text-[12px]">{d}</span>
                ))}
                {(scholarship.target_degree_level ?? []).length === 0 && <em className="text-foreground/40">none</em>}
              </span>
            </InlineEdit>
          </Row>
          <Row label="Target fields of study" full>
            <InlineEdit field="target_fields" variant="chip-array" value={scholarship.target_fields} onSave={make("target_fields")} saving={saving}>
              <span className="flex flex-wrap gap-1">
                {(scholarship.target_fields ?? []).map((d) => (
                  <span key={d} className="inline-flex rounded-sm bg-foreground/5 px-1.5 py-0.5 text-[12px]">{d}</span>
                ))}
                {(scholarship.target_fields ?? []).length === 0 && <em className="text-foreground/40">any</em>}
              </span>
            </InlineEdit>
          </Row>
          <Row label="Target demographics" full>
            <InlineEdit field="target_demographics" variant="chip-array" value={scholarship.target_demographics} onSave={make("target_demographics")} saving={saving}>
              <span className="flex flex-wrap gap-1">
                {(scholarship.target_demographics ?? []).map((d) => (
                  <span key={d} className="inline-flex rounded-sm bg-foreground/5 px-1.5 py-0.5 text-[12px]">{d}</span>
                ))}
                {(scholarship.target_demographics ?? []).length === 0 && <em className="text-foreground/40">none</em>}
              </span>
            </InlineEdit>
          </Row>
        </div>

        <div className="mt-5 pt-5 border-t border-amber-400/40">
          <p className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-foreground/55 mb-2">Cover image</p>
          <CoverImageEditor
            scholarshipId={scholarship.scholarship_id}
            currentUrl={scholarship.cover_image_url ?? null}
            onSaved={(next) => onSaved({ cover_image_url: next })}
          />
        </div>

        <div className="mt-5 pt-5 border-t border-amber-400/40 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-[11px] text-foreground/60 max-w-md">
            Inline-edit prose (title, eligibility, how-to-win, etc.) directly in the article below by clicking the highlighted text. Changes here are saved per field with full audit log.
          </p>
          {onDeleted && (
            <DeleteScholarshipButton
              scholarshipId={scholarship.scholarship_id}
              scholarshipName={scholarshipName ?? "this scholarship"}
              onDeleted={onDeleted}
            />
          )}
        </div>
      </div>
    </section>
  );
};

const Row = ({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) => (
  <div className={full ? "sm:col-span-2" : undefined}>
    <p className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-foreground/55 mb-1">{label}</p>
    <div className="text-foreground/90">{children}</div>
  </div>
);
