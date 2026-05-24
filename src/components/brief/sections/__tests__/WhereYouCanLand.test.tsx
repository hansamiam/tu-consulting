/**
 * WhereYouCanLand renderer snapshot — locks the v7 buckets path AND
 * the v6 entries fallback path so the next time someone swaps the
 * payload shape (as happened in PR #72, where v7 `buckets[]` rendered
 * blank because the renderer still iterated `entries[]`), this test
 * fails loudly at PR time instead of silently in production.
 *
 * What this asserts:
 *  1. v7 payload with `buckets[]` renders the country name + every
 *     school name across all buckets. If a future regression makes
 *     the renderer ignore `buckets[]`, the country/school text is
 *     missing and the test fails.
 *  2. v6 payload with `entries[]` (cached briefs from before the v7
 *     prompt rolled out) still renders the school name + tier label.
 *     The renderer must keep both code paths working for the ~7-day
 *     cache rollover window.
 *  3. Empty payload (`buckets: []`, `entries: []`) renders without
 *     throwing — the renderer must degrade gracefully when both
 *     shapes are absent, not crash the whole brief.
 */
import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { WhereYouCanLand } from "../WhereYouCanLand";
import type { WhereYouCanLandPayload } from "../../types";

const v7Payload: WhereYouCanLandPayload = {
  kicker: "02 · Where you belong",
  headline: "Three kinds of places that fit how you actually move.",
  lead: "Pulled from your countries, with your file in mind.",
  buckets: [
    {
      country: "Hungary",
      cities: "Budapest, Debrecen",
      schools: [
        {
          name: "Eötvös Loránd University",
          lore: "Strong scholarship pipeline; the place that gets your visa stamped on the first try.",
        },
        {
          name: "Corvinus University",
          lore: "Competitive economics program with a cohort that actually shows up.",
        },
      ],
    },
    {
      country: "Türkiye",
      schools: [
        {
          name: "Boğaziçi University",
          lore: "English-medium, Istanbul-energy, the smarter middle path.",
        },
      ],
    },
  ],
};

const v6Payload: WhereYouCanLandPayload = {
  kicker: "02 · Where you can land",
  headline: "Three schools where you'd actually fit.",
  lead: "Reach, target, safety — based on your file.",
  entries: [
    {
      tier: "target",
      name: "University of Edinburgh",
      country: "United Kingdom",
      whyItFits: "STEM-with-policy combo isn't unusual here, it's the standard.",
    },
    {
      tier: "reach",
      name: "University of Toronto",
      country: "Canada",
    },
  ],
};

describe("WhereYouCanLand", () => {
  it("renders the v7 buckets shape — country + every school name", () => {
    const { getByText, container } = render(<WhereYouCanLand payload={v7Payload} />);

    // Country labels rendered as bucket kickers.
    expect(getByText(/Hungary/i)).toBeInTheDocument();
    expect(getByText(/Türkiye/i)).toBeInTheDocument();

    // City anchors under the first bucket.
    expect(getByText(/Budapest, Debrecen/i)).toBeInTheDocument();

    // Every school name across all buckets must be present —
    // this is the assertion that would have caught the PR #72
    // buckets-vs-entries regression (when the renderer iterated
    // entries[] instead of buckets[], NONE of these would appear).
    expect(getByText(/Eötvös Loránd University/i)).toBeInTheDocument();
    expect(getByText(/Corvinus University/i)).toBeInTheDocument();
    expect(getByText(/Boğaziçi University/i)).toBeInTheDocument();

    // Lore line for at least one school.
    expect(container.textContent).toMatch(/visa stamped/i);

    // Sanity: rendered non-blank output.
    expect(container.textContent?.trim().length ?? 0).toBeGreaterThan(0);
  });

  it("renders the v6 entries fallback for cached briefs", () => {
    const { getByText, container } = render(<WhereYouCanLand payload={v6Payload} />);

    // School names from entries[] surface.
    expect(getByText(/University of Edinburgh/i)).toBeInTheDocument();
    expect(getByText(/University of Toronto/i)).toBeInTheDocument();

    // Tier labels render so cached briefs still read as
    // reach/target/safety. Anchored to exact text so we don't
    // accidentally match substrings elsewhere in the rendered tree.
    expect(getByText(/^Target$/)).toBeInTheDocument();
    expect(getByText(/^Reach$/)).toBeInTheDocument();

    // whyItFits prose for the target school.
    expect(container.textContent).toMatch(/STEM-with-policy/i);
  });

  it("renders without throwing when both buckets[] and entries[] are empty", () => {
    // The renderer must degrade gracefully — empty data should
    // produce zero school cards but not crash the surrounding
    // BriefMagazine. The section header still renders (kicker +
    // headline come from the payload).
    const emptyPayload: WhereYouCanLandPayload = {
      kicker: "02 · Where you can land",
      headline: "No matches yet.",
      buckets: [],
      entries: [],
    };
    const { container } = render(<WhereYouCanLand payload={emptyPayload} />);
    expect(container).toBeTruthy();
    // Headline still surfaces — the section header is always rendered.
    expect(container.textContent).toMatch(/No matches yet/i);
  });
});
