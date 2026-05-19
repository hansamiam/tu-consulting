/**
 * Scholarship landing-page SEO overrides.
 *
 * Hand-crafted title / meta-description / H1 / intro for the highest-value
 * filter pages. Keys mirror the URL prefix so the file maps 1:1 onto routes:
 *
 *   "by-country/<slug>"  → /scholarships/by-country/<slug>
 *   "by-field/<slug>"    → /scholarships/by-field/<slug>
 *   "theme/<slug>"       → /scholarships/theme/<slug>
 *
 * `ScholarshipsByFilter.tsx` looks up the active route's key here and uses
 * the override values when present. When no override exists, the page falls
 * back to its procedurally-generated meta. Source dossier:
 * docs/scholarship_seo_metadata_2026-05.md.
 */

export interface ScholarshipPageSeoEntry {
  title: string;
  metaDescription: string;
  h1: string;
  intro: string;
}

export const scholarshipPageSeo: Record<string, ScholarshipPageSeoEntry> = {
  "by-country/united-kingdom": {
    title: "UK Scholarships for International Students | Top Uni 2026-2027",
    metaDescription: "Find fully-funded UK scholarships for international students — Chevening, Commonwealth, university awards. Match your profile in minutes with Top Uni AI.",
    h1: "Scholarships in the UK for international students",
    intro: "Every year UK universities and the British government fund thousands of international students through Chevening, Commonwealth, GREAT, and university-specific awards — and most applicants from Central Asia never apply because the rules look opaque. Top Uni indexes verified UK scholarships for international students with live deadlines, eligibility, and award size, so you see what you actually qualify for. Built by a Yale, Cambridge and Harvard team for students applying out of Almaty, Bishkek, and the wider region.",
  },
  "by-country/united-states": {
    title: "US Scholarships for International Students | Top Uni 2026-2027",
    metaDescription: "Verified US scholarships for international students — full-ride, need-based, and merit awards at top American universities. Build your strategy free with Top Uni.",
    h1: "Scholarships in the United States for international students",
    intro: "American universities run some of the most generous need-based aid in the world — Harvard, Yale, MIT, and dozens more meet 100% of demonstrated need for international applicants — but the application game is brutal. Top Uni surfaces every US scholarship for international students with eligibility, deadline, and average award, then ranks them against your GPA, SAT, and target majors. Our team has been through Yale, Harvard, and Cambridge admissions and now helps students from Kazakhstan, Kyrgyzstan, and Central Asia run that gauntlet without paying $20K to a New York consultant.",
  },
  "by-country/canada": {
    title: "Canada Scholarships for International Students | Top Uni 2026-2027",
    metaDescription: "Compare Canada scholarships for international students — Vanier, Trudeau, and university awards. Eligibility, deadlines, and a free AI strategy plan.",
    h1: "Scholarships in Canada for international students",
    intro: "Canada has quietly become the top study-abroad destination for Central Asian students — affordable relative to the US, post-graduation work permits, and a clear immigration path. Top Uni tracks every Canada scholarship for international students from the Vanier and Trudeau federal awards down to entrance scholarships at UofT, McGill, UBC, and Waterloo. Our AI ranks each one against your profile so you can stop guessing which Canadian universities will actually fund you.",
  },
  "by-country/germany": {
    title: "Germany Scholarships for International Students | Top Uni 2026-2027",
    metaDescription: "Fully-funded Germany scholarships for international students — DAAD, Erasmus+, and university awards. Many programs in English with no tuition.",
    h1: "Scholarships in Germany for international students",
    intro: "German public universities charge zero tuition for almost every international student, but living costs of around 11,900 EUR per year still need a plan — that is where Germany scholarships for international students come in. Top Uni indexes DAAD, Deutschlandstipendium, Erasmus+, and university-funded awards, with English-taught masters programs flagged so you do not waste time on German-only options. Built by a team from Yale, Cambridge, and Harvard who have helped students from Almaty and Bishkek land at TUM, Heidelberg, and RWTH Aachen.",
  },
  "by-country/south-korea": {
    title: "South Korea Scholarships for International Students | Top Uni 2026-2027",
    metaDescription: "Find South Korea scholarships for international students — Global Korea Scholarship (GKS), KAIST, SNU. Fully-funded undergrad and masters tracks.",
    h1: "Scholarships in South Korea for international students",
    intro: "The Global Korea Scholarship (GKS) funds tuition, living stipend, airfare, and a year of Korean language training for hundreds of international students every year — and Central Asian applicants are systematically underrepresented in the pool. Top Uni tracks GKS plus KAIST, SNU, Yonsei, and POSTECH awards, with deadlines and eligibility surfaced clearly so you do not miss the spring application window. Whether you are aiming for an undergrad or fully-funded masters in South Korea, the AI ranks each program against your profile.",
  },
  "by-country/turkey": {
    title: "Turkiye Scholarships for International Students | Top Uni 2026-2027",
    metaDescription: "Turkiye Burslari and university awards for international students — fully-funded undergrad, masters, and PhD programs in Istanbul, Ankara, Izmir.",
    h1: "Scholarships in Turkiye for international students",
    intro: "Turkiye Burslari is one of the largest fully-funded scholarship programs in the world — it covers tuition, monthly stipend, accommodation, health insurance, flights, and a year of Turkish prep — and it is openly aimed at students from Central Asia and the post-Soviet region. Top Uni indexes Turkiye Burslari alongside Bilkent, Koc, Sabanci, and METU university awards so you can compare the scholarship landscape across Istanbul, Ankara, and Izmir. Application windows close in February — start the brief now.",
  },
  "by-field/computer-science": {
    title: "Computer Science Scholarships Abroad | Top Uni 2026-2027",
    metaDescription: "Top computer science scholarships for international students — full-ride and partial CS awards at MIT, ETH, NUS, KAIST. Free AI strategy plan.",
    h1: "Computer science scholarships for international students",
    intro: "Computer science is the most over-applied and the most over-funded major in international admissions — top CS programs at MIT, Stanford, ETH Zurich, NUS, KAIST, and TUM all run dedicated funding for strong international applicants. Top Uni indexes verified computer science scholarships abroad — including AI/ML-specialist awards and women-in-tech programs — and ranks each against your GPA, math olympiad record, and project portfolio. Built by a Yale, Cambridge, and Harvard team that knows how CS admissions actually weights Central Asian applicants.",
  },
  "by-field/business": {
    title: "Business & MBA Scholarships Abroad | Top Uni 2026-2027",
    metaDescription: "Compare business scholarships for international students — undergrad business and MBA awards at LBS, INSEAD, HEC, Wharton, Booth. Free AI plan.",
    h1: "Business scholarships for international students",
    intro: "Business school is expensive — a top-15 MBA runs $200K all-in — but every brand-name program from Wharton to INSEAD to LBS funds international students through merit fellowships, country-specific awards, and need-based grants. Top Uni indexes business scholarships abroad across both undergrad business and MBA tracks, with eligibility and award size pulled from official sources. The AI then ranks every program against your GMAT, GPA, and work experience so you stop applying to fellowships you will not win.",
  },
  "by-field/medicine": {
    title: "Medicine Scholarships for International Students | Top Uni 2026-2027",
    metaDescription: "Find medicine and pre-med scholarships abroad — MBBS, MD, and biomedical awards for international students. Eligibility, deadlines, AI-matched.",
    h1: "Medicine scholarships for international students",
    intro: "Funded medicine programs for international students are rare but real — Hungarian and Czech medical universities, Turkiye Burslari MD tracks, and select MBBS programs in China and Malaysia all run scholarships for international applicants. Top Uni indexes medicine scholarships abroad with country-by-country licensure notes so you do not finish a degree you cannot practice with back home. For students aiming at US MD or UK medicine, the AI also surfaces the (small) set of pre-med pathways that fund international undergrads.",
  },
  "theme/full-funding": {
    title: "Fully-Funded Scholarships for International Students | Top Uni 2026-2027",
    metaDescription: "Browse fully-funded scholarships for international students — tuition, living costs, and flights covered. Verified programs, deadlines, AI-matched.",
    h1: "Fully-funded scholarships for international students",
    intro: "Fully-funded means tuition, living stipend, health insurance, and usually flights — the full ride, not just a tuition discount. Top Uni indexes verified fully-funded scholarships for international students across every major destination: Chevening, Fulbright, DAAD, GKS, Turkiye Burslari, MEXT, university full-rides, and dozens more. The AI ranks each program against your profile so the list you see is the list you can actually win from Almaty or Bishkek.",
  },
  "theme/for-kazakhstan-students": {
    title: "Scholarships for Kazakhstan Students Abroad | Top Uni 2026-2027",
    metaDescription: "Verified scholarships for Kazakhstan students applying to universities abroad — Chevening, Fulbright, DAAD, MEXT, and more. Free AI strategy plan from an Almaty-based team.",
    h1: "Scholarships for Kazakhstan students applying abroad",
    intro: "Every year Kazakh students win Chevening, Fulbright, DAAD, MEXT, GKS, and dozens of university-funded awards — but most KZ applicants never see the full list because eligibility rules are spread across hundreds of program sites in three languages. Top Uni indexes scholarships for Kazakhstan students with verified eligibility, current deadlines, and award amounts in one place. Built by a Yale, Cambridge, and Harvard team with roots in Almaty, so the matching understands the KZ context — Bolashak alumni networks, NIS / KTL backgrounds, and the realities of applying out of a CIS country.",
  },
  "theme/for-kyrgyzstan-students": {
    title: "Scholarships for Kyrgyzstan Students Abroad | Top Uni 2026-2027",
    metaDescription: "Verified scholarships for Kyrgyzstan students applying abroad — Chevening, Fulbright (KG deadline 5 June 2026), DAAD, MEXT, and more. Free AI strategy plan from a Bishkek-rooted team.",
    h1: "Scholarships for Kyrgyzstan students applying abroad",
    intro: "Kyrgyz students win Fulbright, Chevening, DAAD, MEXT, Erasmus Mundus, and university-specific awards every year — but the full list is fragmented across embassy pages, foundation sites, and university aid offices. Top Uni indexes scholarships for Kyrgyzstan students with verified eligibility, current deadlines (Fulbright KG closes 5 June 2026), and award amounts in one searchable place. The team is Yale, Cambridge, and Harvard alumni with home ties to Bishkek, so the matching understands the Kyrgyz applicant context — language, school background, and what selection committees in London or Tokyo actually weigh.",
  },
};
