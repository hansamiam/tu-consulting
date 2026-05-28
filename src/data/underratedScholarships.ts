// "30 Scholarships You Haven't Heard Of" — TopUni's free lead magnet
// listicle from the digital-products catalog plan. Curated list of
// international scholarships that beginner applicants miss because
// they only look at Rhodes / Marshall / Fulbright.
//
// Why this data shape: deadlines, stipends, and exact eligibility
// rules ROT — a printed PDF that says "deadline Jan 31, 2026" is
// stale by April 2026. Instead we surface name + sponsor + level
// + region eligibility + the "why it's underrated" hook + a search
// reference. The reader looks up the current cycle themselves; we
// don't claim to be a real-time database (Discover plays that role).
//
// Maintenance: keep the count at 30 (matches the headline). Cycle
// in / out as programs change — annual review recommended.

export type EduLevel = "UG" | "Masters" | "PhD" | "Postdoc" | "Pro";

/**
 * Competitiveness tier — coarse but real. Helps applicants triage
 * "could I even get this?" before they spend two weeks on the essay.
 *
 * S = Rhodes-tier brutal. <5% acceptance, requires top-1% profile.
 * A = Highly competitive. 5–15% acceptance. Top-5% profile needed.
 * B = Competitive but reachable. 15–35% acceptance. Strong profile + fit.
 * C = Open + underused. 35%+ acceptance for qualified applicants.
 *
 * These are field-estimated (acceptance numbers aren't always public).
 * Treat as triage guidance, not promises.
 */
export type CompetitivenessTier = "S" | "A" | "B" | "C";

export interface UnderratedScholarship {
  /** Display name as the sponsor uses it. */
  name: string;
  /** Sponsor / hosting government / institution. */
  sponsor: string;
  /** Country (or "Multiple") where you'd study. */
  country: string;
  /** Levels covered. Multi-level programs list all that apply. */
  levels: EduLevel[];
  /** Coarse geography of who's eligible. We do NOT promise dates or amounts. */
  eligibility: string;
  /** The why-it's-underrated hook in one short sentence. */
  hook: string;
  /** Field framing if it's not "open to all fields". */
  fieldFocus?: string;
  /** Optional tags for clustering on the page (region, theme). */
  tags?: string[];
  /** Triage tier — see CompetitivenessTier doc. */
  tier?: CompetitivenessTier;
}

/**
 * Tier lookup keyed by scholarship name — kept separate from the
 * main entry array to make tier updates a 1-line diff. The lookup is
 * applied at read time by the page component.
 *
 * Methodology: best-effort triage based on published acceptance
 * rates where available, field consensus where not. Update yearly.
 */
export const TIER_LOOKUP: Record<string, CompetitivenessTier> = {
  // S — Rhodes-tier brutal. <5% acceptance.
  "Knight-Hennessy Scholars": "S",
  "Lester B. Pearson International Scholarship": "S",
  "Karsh International Scholars Program": "S",

  // A — Highly competitive. 5–15%. Top-5% profile.
  "Schwarzman Scholars": "A",
  "Yenching Academy": "A",
  "Chevening Awards": "A",
  "Fulbright Foreign Student Program": "A",
  "Erasmus Mundus Joint Masters": "A",
  "Mastercard Foundation Scholars Program": "A",
  "Vanier Canada Graduate Scholarship": "A",
  "Joint Japan/World Bank Graduate Scholarship": "A",
  "Hubert H. Humphrey Fellowship": "A",

  // B — Competitive but reachable. 15–35%. Strong profile + fit.
  "DAAD EPOS Scholarship": "B",
  "Aga Khan Foundation International Scholarship": "B",
  "Said Foundation Scholarship": "B",
  "KAUST Fellowship": "B",
  "Eiffel Excellence Scholarship": "B",
  "Rotary Peace Fellowship": "B",
  "Bocconi Scholarships for International Students": "B",
  "Joyce Ivy Foundation Summer Scholars": "B",
  "Global Korea Scholarship (KGSP)": "B",

  // C — Open + underused. 35%+ for qualified applicants. Apply more.
  "MEXT Scholarship": "C",
  "Türkiye Bursları": "C",
  "Stipendium Hungaricum": "C",
  "Chinese Government Scholarship (CSC)": "C",
  "OFID Scholarship": "C",
  "Government of Italy Scholarship": "C",
  "Australia Awards": "C",
  "NTU President's Graduate Fellowship": "C",
  "NUS Research Scholarship": "C",
};

/**
 * "If you only have 60 days, apply to these" — prioritization
 * shortcut for paralysed applicants. The 5 picks balance reachability
 * (tier C/B), broad eligibility, and high coverage (full ride vs. just
 * tuition). Treat as a triage suggestion, not a ranked list.
 */
export const SIXTY_DAY_PICKS: string[] = [
  "Türkiye Bursları",
  "Stipendium Hungaricum",
  "MEXT Scholarship",
  "KAUST Fellowship",
  "Erasmus Mundus Joint Masters",
];

/**
 * Application strategy notes per region — the kind of guidance you
 * only get from someone who's been through the process. ChatGPT
 * doesn't know that you can't apply to Fulbright AND Chevening in
 * the same cycle from some countries, or that MEXT has two parallel
 * tracks most people don't realise.
 */
export interface RegionStrategy {
  region: string;
  note: string;
}

export const REGION_STRATEGY: RegionStrategy[] = [
  {
    region: "Asia (China + Japan + Korea + Singapore)",
    note: "MEXT has two application tracks (embassy + direct-uni); apply to BOTH — they don't conflict and the direct-uni track is much less competitive. Schwarzman + Yenching overlap heavily; only do both if your story differentiates. KGSP includes a Korean prep year, so language isn't a gate.",
  },
  {
    region: "Europe (EU + UK)",
    note: "Erasmus Mundus is the highest-leverage application of your life — one form, ~150 programs. Chevening + Eiffel + Italy Govt + Stipendium Hungaricum can all be applied to in the same cycle. Bocconi is integrated with admission. Said Foundation has near-zero applications outside the Levant.",
  },
  {
    region: "United States",
    note: "Fulbright commission rules vary 10× by country — check your commission's website before assuming general FAQs apply. Knight-Hennessy + Schwarzman target opposite signals: Knight wants leadership impact at scale, Schwarzman wants future-China-engagement narrative.",
  },
  {
    region: "Africa + Africa-eligible global",
    note: "Mastercard Foundation across ~20 partner unis is the single biggest funding pipeline. Apply via the partner uni's regular admit, not directly to Mastercard. Aga Khan ISP is open to all (not just Ismaili Muslims) — most people don't know.",
  },
  {
    region: "MENA + South Asia + CIS",
    note: "Türkiye Bursları + Stipendium Hungaricum + Italy Govt have country-specific quotas that are sometimes unfilled — research yours before deciding it's competitive. KAUST in Saudi is full-ride STEM with almost zero apps from outside the region.",
  },
];

export const UNDERRATED_SCHOLARSHIPS: UnderratedScholarship[] = [
  {
    name: "Hubert H. Humphrey Fellowship",
    sponsor: "US Department of State (IIE)",
    country: "United States",
    levels: ["Pro"],
    eligibility: "Mid-career professionals from designated developing countries.",
    hook: "A year of study + professional placement at a US uni — funded, no degree required. Most candidates assume Fulbright is the only US option and miss this entirely.",
    fieldFocus: "Public policy, education, health, agriculture, journalism.",
    tags: ["US", "professional"],
  },
  {
    name: "DAAD EPOS Scholarship",
    sponsor: "DAAD (German Academic Exchange Service)",
    country: "Germany",
    levels: ["Masters"],
    eligibility: "Developing-country professionals with 2+ years experience.",
    hook: "Pays for any of ~60 German master's programs taught in English. The list is hidden inside the DAAD portal three clicks deep — most applicants never find it.",
    tags: ["Europe", "professional"],
  },
  {
    name: "MEXT Scholarship",
    sponsor: "Government of Japan",
    country: "Japan",
    levels: ["UG", "Masters", "PhD"],
    eligibility: "Most non-Japanese citizens; nominated either via embassy or directly by a Japanese uni.",
    hook: "Pays tuition + stipend + return airfare. Two application pathways most people don't realise — embassy track is competitive but direct-uni track is wide open.",
    tags: ["Asia"],
  },
  {
    name: "Türkiye Bursları",
    sponsor: "Republic of Türkiye",
    country: "Türkiye",
    levels: ["UG", "Masters", "PhD"],
    eligibility: "All non-Turkish citizens; some quotas favour Africa, Middle East, CIS.",
    hook: "Full ride + Turkish prep year + housing in Istanbul / Ankara. One application unlocks all Turkish universities. Underused by Western applicants.",
    tags: ["Europe", "MENA"],
  },
  {
    name: "Stipendium Hungaricum",
    sponsor: "Government of Hungary",
    country: "Hungary",
    levels: ["UG", "Masters", "PhD"],
    eligibility: "~70 partner countries — check the annual list.",
    hook: "EU degree, ~€100/mo + tuition + housing + insurance, no service obligation. Budapest is cheap and the visa is real EU residency.",
    tags: ["Europe"],
  },
  {
    name: "Chinese Government Scholarship (CSC)",
    sponsor: "China Scholarship Council",
    country: "China",
    levels: ["UG", "Masters", "PhD"],
    eligibility: "Most non-Chinese citizens; quotas via embassy and direct-uni tracks.",
    hook: "Tuition + housing + monthly stipend up to ¥3,500 for PhDs. Tsinghua, Peking, Fudan all accept this. STEM PhDs at top Chinese unis are funded at world-class levels.",
    tags: ["Asia"],
  },
  {
    name: "Global Korea Scholarship (KGSP)",
    sponsor: "Government of South Korea (NIIED)",
    country: "South Korea",
    levels: ["UG", "Masters", "PhD"],
    eligibility: "Non-Korean citizens; annual country quotas vary widely.",
    hook: "Korean language prep year is included BEFORE the degree starts — so you don't need Korean fluency to apply. Most international scholarships gate on language; this one teaches it.",
    tags: ["Asia"],
  },
  {
    name: "Erasmus Mundus Joint Masters",
    sponsor: "European Commission",
    country: "Multiple (EU)",
    levels: ["Masters"],
    eligibility: "Open globally; partner-country candidates get higher stipend.",
    hook: "Study in 2–4 countries over 2 years, one combined degree. ~€1,400/mo stipend + tuition + travel. There are ~150 programs — most people only find ~10.",
    tags: ["Europe"],
  },
  {
    name: "Schwarzman Scholars",
    sponsor: "Tsinghua University",
    country: "China",
    levels: ["Masters"],
    eligibility: "Under 29; any nationality; any undergrad field.",
    hook: "Full ride for a 1-year master's in global affairs at Tsinghua. Smaller cohort (~150/year) than Rhodes (~100) but ~10× the acceptance rate. The most undervalued elite scholarship in 2026.",
    tags: ["Asia", "elite"],
  },
  {
    name: "Yenching Academy",
    sponsor: "Peking University",
    country: "China",
    levels: ["Masters"],
    eligibility: "Under 25; any nationality; bachelor's by start date.",
    hook: "Full ride for an interdisciplinary master's in China studies at Peking. No Mandarin required to apply. Same prestige tier as Schwarzman, half the applications.",
    tags: ["Asia", "elite"],
  },
  {
    name: "OFID Scholarship",
    sponsor: "OPEC Fund for International Development",
    country: "Multiple",
    levels: ["Masters"],
    eligibility: "Developing-country nationals studying at an accredited uni in any country.",
    hook: "$50,000 toward master's in development-relevant fields. You bring the admit; OFID brings the money. Almost nobody applies — fewer than 100 awards globally.",
    fieldFocus: "Development-relevant fields.",
    tags: ["Africa", "Asia", "LATAM"],
  },
  {
    name: "Joint Japan/World Bank Graduate Scholarship",
    sponsor: "World Bank + Government of Japan",
    country: "Multiple (partner unis)",
    levels: ["Masters"],
    eligibility: "Developing-country citizens with 3+ years experience in dev policy.",
    hook: "Tuition + monthly stipend + travel for a master's in development at a partner uni (Harvard, LSE, Tokyo, etc.). The eligibility filter scares people off; the actual program is wide open.",
    fieldFocus: "Development policy, economics, public health.",
    tags: ["professional"],
  },
  {
    name: "Aga Khan Foundation International Scholarship",
    sponsor: "Aga Khan Foundation",
    country: "Multiple",
    levels: ["Masters", "PhD"],
    eligibility: "Citizens of designated developing countries (broad list including CIS, S. Asia, E. Africa).",
    hook: "50% grant / 50% loan for any postgrad anywhere. Most applicants assume it's only for Ismaili Muslims; it isn't. Open to all.",
    tags: ["Africa", "Asia"],
  },
  {
    name: "Said Foundation Scholarship",
    sponsor: "Said Foundation",
    country: "United Kingdom",
    levels: ["Masters"],
    eligibility: "Citizens of Jordan, Lebanon, Palestine, Syria with UK admit.",
    hook: "Full tuition + stipend + travel for a UK master's — focused on the Levant. Funded by the same philanthropist behind St Antony's. Almost nobody outside the region knows it exists.",
    tags: ["MENA"],
  },
  {
    name: "Chevening Awards",
    sponsor: "UK Foreign, Commonwealth & Development Office",
    country: "United Kingdom",
    levels: ["Masters"],
    eligibility: "2+ years work experience; non-UK citizens; commit to return home for 2 years.",
    hook: "Tuition + stipend + travel for a 1-year UK master's. The 2-year return clause filters out a lot of applicants — work it as a feature, not a bug.",
    tags: ["UK", "professional"],
  },
  {
    name: "Fulbright Foreign Student Program",
    sponsor: "US Department of State",
    country: "United States",
    levels: ["Masters", "PhD"],
    eligibility: "Non-US citizens; country-specific commission rules vary widely.",
    hook: "The flagship US program is structurally easier from some countries than others — Pakistan, Vietnam, Egypt have wide quotas. Check your country's commission BEFORE you apply.",
    tags: ["US"],
  },
  {
    name: "Rotary Peace Fellowship",
    sponsor: "Rotary International",
    country: "Multiple (partner unis)",
    levels: ["Masters", "Pro"],
    eligibility: "Peace/conflict professionals; 3+ years field experience.",
    hook: "Full ride for a peace-studies master's at Duke, Bradford, Tokyo, or Uppsala. Or a 3-month certificate at Chulalongkorn / Makerere. The professional certificate path is wildly underused.",
    fieldFocus: "Peace, conflict, development.",
    tags: ["professional"],
  },
  {
    name: "Mastercard Foundation Scholars Program",
    sponsor: "Mastercard Foundation",
    country: "Multiple",
    levels: ["UG", "Masters"],
    eligibility: "African students (primary focus); some non-African partner unis.",
    hook: "Full ride + leadership programming + community of ~40,000 alumni. Twenty-plus partner unis (UPenn, McGill, EARTH, Sciences Po, AKU). The single biggest financial-aid pipeline for African students.",
    tags: ["Africa"],
  },
  {
    name: "KAUST Fellowship",
    sponsor: "King Abdullah University of Science and Technology",
    country: "Saudi Arabia",
    levels: ["Masters", "PhD"],
    eligibility: "Any nationality; STEM focus.",
    hook: "$30k+ stipend, full tuition, free housing on a Red Sea campus that looks like a sci-fi film. STEM master's and PhDs are essentially free + paid. Massively underused outside MENA.",
    fieldFocus: "Engineering, computer science, biological & environmental sciences.",
    tags: ["MENA"],
  },
  {
    name: "Eiffel Excellence Scholarship",
    sponsor: "Campus France",
    country: "France",
    levels: ["Masters", "PhD"],
    eligibility: "Non-French citizens under 25 (master's) / 30 (PhD).",
    hook: "€1,180/mo + travel + insurance for a master's in France. Nominated by the host uni — you apply to the uni first, the scholarship is a bonus track they pick winners from.",
    tags: ["Europe"],
  },
  {
    name: "Government of Italy Scholarship",
    sponsor: "Italian Ministry of Foreign Affairs",
    country: "Italy",
    levels: ["UG", "Masters", "PhD"],
    eligibility: "Designated-country citizens; broad list (CIS, MENA, LATAM, parts of Asia).",
    hook: "€900/mo + tuition waiver + insurance + Italian language course. Per-country quotas; some are essentially unfilled because nobody applies from there.",
    tags: ["Europe"],
  },
  {
    name: "Vanier Canada Graduate Scholarship",
    sponsor: "Government of Canada",
    country: "Canada",
    levels: ["PhD"],
    eligibility: "Any nationality; nominated by Canadian uni; under 4 years into the PhD.",
    hook: "$50,000 CAD per year for 3 years. Open to international students at any Canadian uni. Applies via the uni, not directly — most international applicants don't know it's open to them.",
    tags: ["North America"],
  },
  {
    name: "Australia Awards",
    sponsor: "Government of Australia (DFAT)",
    country: "Australia",
    levels: ["UG", "Masters"],
    eligibility: "Developing-country citizens (Asia-Pacific, Africa, Middle East priority).",
    hook: "Full tuition + return airfare + monthly stipend + health cover at any Australian uni. Some countries (Pacific Islands, Timor-Leste) have ~20% acceptance rates.",
    tags: ["Oceania"],
  },
  {
    name: "NTU President's Graduate Fellowship",
    sponsor: "Nanyang Technological University",
    country: "Singapore",
    levels: ["PhD"],
    eligibility: "Any nationality; STEM and select humanities.",
    hook: "Full tuition + S$3,500/mo stipend for STEM PhDs at one of Asia's top 3 unis. Application is integrated with the PhD admission — one form, two outcomes.",
    tags: ["Asia"],
  },
  {
    name: "Bocconi Scholarships for International Students",
    sponsor: "Università Bocconi",
    country: "Italy",
    levels: ["Masters"],
    eligibility: "Non-Italian citizens with non-Italian degree; Bocconi MSc / MBA.",
    hook: "Up to full tuition waiver (~€16k/year) for Bocconi MSc programs. Application is integrated — no separate form. Bocconi's MSc Finance is a top-10 European program by FT.",
    fieldFocus: "Business, finance, economics, data science.",
    tags: ["Europe", "business"],
  },
  {
    name: "Lester B. Pearson International Scholarship",
    sponsor: "University of Toronto",
    country: "Canada",
    levels: ["UG"],
    eligibility: "International undergrads nominated by their high school.",
    hook: "Full tuition + books + residence + incidental fees for 4 years at U of T. ~37 awards per year. Nominated by the school — start the conversation in grade 11.",
    tags: ["North America", "undergrad"],
  },
  {
    name: "Karsh International Scholars Program",
    sponsor: "Duke University",
    country: "United States",
    levels: ["UG"],
    eligibility: "Non-US international undergrad applicants to Duke.",
    hook: "Full need-based aid + summer experience funding + advising. ~10–15 named scholars per year selected from Duke's international admit pool. Apply via the regular Duke app; the scholarship picks itself.",
    tags: ["US", "undergrad", "elite"],
  },
  {
    name: "Joyce Ivy Foundation Summer Scholars",
    sponsor: "Joyce Ivy Foundation",
    country: "United States",
    levels: ["UG"],
    eligibility: "High-school women from the Midwest (US).",
    hook: "Funds a summer at Harvard, Yale, Stanford, etc. — the on-ramp Asian-American and rural-Midwest girls miss. Not a degree scholarship but a college-application unlock.",
    tags: ["US", "high school"],
  },
  {
    name: "NUS Research Scholarship",
    sponsor: "National University of Singapore",
    country: "Singapore",
    levels: ["Masters", "PhD"],
    eligibility: "Any nationality; admitted to NUS research master's or PhD.",
    hook: "Tuition + S$2,300/mo (MS) or S$3,200/mo (PhD) stipend. Application is automatic with NUS research-degree admission — there's no separate form to fill out.",
    tags: ["Asia"],
  },
  {
    name: "Knight-Hennessy Scholars",
    sponsor: "Stanford University",
    country: "United States",
    levels: ["Masters", "PhD"],
    eligibility: "Any nationality, any Stanford grad program, under 7 years out of undergrad.",
    hook: "Full ride + leadership program for any Stanford master's, JD, MD, or PhD. ~100 scholars/year. Acceptance rate higher than Stanford's own grad programs in some fields.",
    tags: ["US", "elite"],
  },
];
