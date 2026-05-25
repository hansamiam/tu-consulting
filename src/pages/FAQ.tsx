import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowRight, Mail } from "lucide-react";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";

/* ─── FAQ data — single source for both render + JSON-LD schema ───
   Edit copy here; the schema below regenerates from this array
   automatically. Categories let us section the page visually
   without forcing a tabbed UI. */
const FAQS: { category: string; q: string; a: string }[] = [
  // ── Membership ──────────────────────────────────────────────
  {
    category: "Membership",
    q: "How much is TopUni Membership and what's included?",
    a: "TopUni Membership is $39/month or $360/year (saving $108 vs paying monthly). It includes a personalised AI strategy, the full Discover scholarship database with strategy notes, the Workspace (application pipeline + deadline calendar + essay drafts with AI critique), live monthly workshops with our founders, the recordings library, and direct line to the founder team. Founding-cohort members get a discount via a code at checkout.",
  },
  {
    category: "Membership",
    q: "Is there a free trial?",
    a: "No free trial — but every membership is backed by a 30-day money-back guarantee. If TopUni isn't useful in your first month, you get a full refund, no questions asked. We prefer this to a free trial because it captures real intent and means we don't have to build sign-up friction to gate trial usage.",
  },
  {
    category: "Membership",
    q: "Can I cancel anytime?",
    a: "Yes. Cancel from your account → Manage billing at any time. Cancellation takes effect at the end of your current billing period; you keep access until then. Outside the 30-day money-back window, no partial refunds are issued — but cancellation is one click and there are no long-term contracts.",
  },
  {
    category: "Membership",
    q: "What happens to my saved scholarships, essays, and notes if I cancel?",
    a: "Your saved data stays on your account. Cancellation removes access to membership features (deeper Discover retrieval, monthly workshops, the strategy, etc.) but the scholarships you saved, the essay drafts you wrote, the deadlines you tracked, and the notes you took are all still there if you re-subscribe. We don't believe in vendor-lock-in dressed up as a subscription.",
  },
  {
    category: "Membership",
    q: "Who is TopUni for?",
    a: "International and immigrant students applying to top universities — undergraduate, master's, PhD. We focus on students whose families would otherwise be priced out of $5,000–$15,000 traditional admissions consulting. The product also serves students from immigrant communities applying to US-based scholarships specifically for their heritage (Korean American, Latino/Hispanic, Vietnamese American, etc.). If you're aiming for a top program and want strategy that fits your real profile, you're in the audience.",
  },

  // ── Product ────────────────────────────────────────────────
  {
    category: "Product",
    q: "How is TopUni different from sites like opportunitiesforyouth.org?",
    a: "Aggregator sites show every scholarship to every visitor — no personalisation, no strategy notes, no application support layer. TopUni ranks scholarships against your actual profile (eligibility, GPA, IELTS, target country, demographic), shows you why each one fits, lets you save and track applications in a workspace, drafts and critiques your essays, and emails reminders before each deadline. We're a strategist, not a job board.",
  },
  {
    category: "Product",
    q: "Where does the scholarship database come from?",
    a: "TopUni's catalog is built from verified primary sources (foundation websites, university scholarship offices, government program pages) and secondary aggregators where appropriate. Every row goes through a multi-layer hygiene pipeline (extraction validation, field cleaners, dedup, citizenship-requirement parsing) and a weekly verification cron that re-fetches the source URL and flags broken links. We don't republish editorial content — we build a verified structured catalog.",
  },
  {
    category: "Product",
    q: "Do you write my essays for me?",
    a: "No — and any platform that says it does is helping you submit something you didn't write, which most programs explicitly forbid. TopUni gives you AI-generated starting drafts (three opening angles to pick from), then a reader-perspective critique on your draft when you ask for it. The writing stays yours. The AI is a sparring partner, not a ghostwriter.",
  },
  {
    category: "Product",
    q: "Why don't you show a fit score number on each scholarship?",
    a: "We rank scholarships against your profile — that's the whole product — but we don't quote a /100 number to students. Quoting a probability number on a thin profile is misleading: it either over-claims certainty about a future outcome or reads as gatekeeping when it's low. Instead, we surface scholarships in fit order and give you the specific reasons each one is on the list.",
  },

  // ── Team ───────────────────────────────────────────────────
  {
    category: "Team",
    q: "Who built TopUni?",
    a: "TopUni was founded by alumni of Yale, Cambridge, Harvard, and Tsinghua. The team has been on the other side of the admissions desk — applied, won prestigious scholarships, attended these programs, and works on TopUni now to give other students access to the strategic frameworks that worked. See our Team page for current bios.",
  },
  {
    category: "Team",
    q: "Do I get 1:1 coaching as a member?",
    a: "Membership includes monthly live workshops with the founders, the recordings library, and a direct line to submit questions for upcoming sessions. It does NOT include 1:1 essay reviews or scheduled coaching calls — those are part of a future Elite tier we're building. If you need 1:1 work today, see /offerings.",
  },

  // ── Trust + Privacy ────────────────────────────────────────
  {
    category: "Trust",
    q: "Do you sell or share my data?",
    a: "No. We don't sell user data. We don't share your profile, your essay drafts, or your scholarship saves with anyone — they're yours. Aggregate, fully-anonymised statistics (e.g., 'TopUni members have won $X across Y scholarships') may be displayed publicly with no individual identifying information. See our Privacy Policy for the full statement.",
  },
  {
    category: "Trust",
    q: "How do I know the scholarships are real?",
    a: "Every scholarship has a `verification_status` field. Our weekly cron re-fetches the official source URL and flags rows where the link broke or the content drifted. Rows flagged broken don't show up in Discover. Each detail page links directly to the official application URL — apply through the program's own site, not through TopUni.",
  },
  {
    category: "Trust",
    q: "Can my school or organisation partner with TopUni?",
    a: "Yes. We're building a partner programme for foundations, universities, and program providers who want to actively promote their scholarship to matched students — priority placement, alerts to eligible profiles, reach analytics. Email team@topuniconsulting.com or use the partner page at /submit.",
  },
];

const SITE = "https://topuni.org";

const FAQ = () => {
  const navigate = useNavigate();

  // Inject FAQPage JSON-LD so AI overviews + Google rich results can
  // ingest each Q/A as a structured pair. Re-runs the regex strip on
  // each render in case the FAQS array gains a new entry.
  useEffect(() => {
    document.title = "FAQ — TopUni";
    setMeta(
      "description",
      "Common questions about TopUni Membership: pricing, refund policy, how the database is built, who built it, what's included.",
    );
    setLink("canonical", `${SITE}/faq`);

    const payload = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    };
    injectJsonLd(payload);
  }, []);

  // Group questions by category for the rendered accordion. Schema
  // above stays flat — Google ingests Q/A pairs without category
  // hierarchy.
  const grouped = FAQS.reduce<Record<string, typeof FAQS>>((acc, f) => {
    (acc[f.category] = acc[f.category] || []).push(f);
    return acc;
  }, {});
  const categoryOrder = ["Membership", "Product", "Team", "Trust"];

  return (
    <div className="min-h-screen relative bg-background">
      <div className="relative z-10">
      <Navigation language="en" />

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary via-primary to-primary/95 py-12 sm:py-16">
        <div className="max-w-3xl mx-auto px-5 sm:px-8">
          <p className="text-[11px] uppercase tracking-[0.22em] text-gold font-semibold mb-3">FAQ</p>
          <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-primary-foreground tracking-tight leading-tight mb-3">
            Common questions about TopUni.
          </h1>
          <p className="text-primary-foreground/75 text-sm sm:text-base max-w-xl leading-relaxed">
            What people ask us most. If your question isn't here, email{" "}
            <a href="mailto:team@topuniconsulting.com" className="text-gold-light hover:underline">team@topuniconsulting.com</a>
            {" "}— we read every message.
          </p>
        </div>
      </section>

      {/* Accordion grouped by category */}
      <main className="max-w-3xl mx-auto px-5 sm:px-8 py-12 sm:py-16 space-y-10">
        {categoryOrder.map((cat) => {
          const items = grouped[cat];
          if (!items || items.length === 0) return null;
          return (
            <section key={cat}>
              <p className="text-[11px] uppercase tracking-[0.22em] text-gold-dark font-semibold mb-4">{cat}</p>
              <Accordion type="single" collapsible className="w-full bg-card border border-border rounded-2xl overflow-hidden">
                {items.map((f, i) => (
                  <AccordionItem key={i} value={`${cat}-${i}`} className="border-b border-border/60 last:border-0">
                    <AccordionTrigger className="px-5 py-4 text-left hover:no-underline">
                      <span className="font-heading font-semibold text-foreground text-[15px] leading-snug">
                        {f.q}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="px-5 pb-5 text-[14px] text-muted-foreground leading-relaxed">
                      {f.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          );
        })}

        {/* Closing CTA — neutral framing. No "best shot" or
            motivational poster language; the rest of the page is
            informational, the close should match. */}
        <section className="border border-border rounded-2xl p-6 sm:p-8 bg-canvas-soft/40 text-center">
          <p className="font-heading text-xl font-bold text-foreground tracking-tight mb-2">
            Still deciding?
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed mb-5 max-w-xl mx-auto">
            Try the wizard for free — your strategy is yours regardless of whether you become a member.
          </p>
          <div className="flex flex-wrap gap-2.5 justify-center">
            <Button variant="gold" onClick={() => navigate("/topuni-ai")} className="gap-2">
              Try TopUni AI free <ArrowRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" onClick={() => navigate("/pricing")}>
              See membership pricing
            </Button>
            <Button variant="ghost" asChild className="gap-2">
              <a href="mailto:team@topuniconsulting.com">
                <Mail className="w-4 h-4" />
                Email us
              </a>
            </Button>
          </div>
        </section>
      </main>

      <Footer language="en" />
      </div>
    </div>
  );
};

/* ─── DOM helpers — same shape as ScholarshipDetail / BlogArticle ── */
function setMeta(name: string, content: string, isProperty = false) {
  const sel = isProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`;
  let el = document.head.querySelector<HTMLMetaElement>(sel);
  if (!el) {
    el = document.createElement("meta");
    if (isProperty) el.setAttribute("property", name);
    else el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}
function setLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}
function injectJsonLd(payload: object) {
  const id = "topuni-faq-jsonld";
  document.head.querySelector(`script#${id}`)?.remove();
  const el = document.createElement("script");
  el.id = id;
  el.type = "application/ld+json";
  // Escape script-closing sequences. The FAQ copy is hard-coded
  // here so the practical risk is low, but consistency with the
  // other injectJsonLd helpers means a future copy-paste from a
  // dynamic source can't accidentally regress.
  el.text = JSON.stringify(payload)
    .replace(/<\/script>/gi, "<\\/script>")
    .replace(/<!--/g, "<\\u0021--");
  document.head.appendChild(el);
}

export default FAQ;
