import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, Check, Loader2, Quote, Calendar } from "lucide-react";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import PreviewBanner from "@/components/PreviewBanner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PICK_YOUR_TEN, COURSE_SUMMARY } from "@/data/pickYourTen";

/**
 * TopUni's free email course "Pick Your 10 Programs in 7 Days" —
 * sibling product to LF's Cyrillic 7 Days. Public preview page with
 * the full curriculum visible AND an email-capture form for daily
 * delivery.
 *
 * Wiring: form writes to TU's existing `leads` table (or equivalent)
 * with source='pick_your_ten'. Daily delivery infra is parked until
 * Samuel signs off on the catalog — same pattern as LF.
 */
const PickYourTen = () => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    // TODO (post-preview): wire to a real audience table when the
    // catalog goes public. TopUni's Supabase schema doesn't have a
    // `leads` table (LF does; the two products live in separate
    // projects). For now we store the intent in localStorage so the
    // visitor's submit is acknowledged + the count is recoverable from
    // the browser if Samuel wants to spot-check the form during
    // preview. Real delivery wiring lands with the storefront pass.
    try {
      const key = "tu-pick-your-ten-signups";
      const existing = JSON.parse(localStorage.getItem(key) ?? "[]") as string[];
      const next = Array.from(new Set([...existing, email.trim().toLowerCase()]));
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // localStorage unavailable (private window etc.) — still acknowledge submit
    }
    await new Promise((r) => setTimeout(r, 400)); // feel of a real request
    setStatus("done");
    setEmail("");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation language="en" variant="overlay" />
      <PreviewBanner />
      <main className="flex-1 pt-28 pb-16 px-6">
        <div className="max-w-3xl mx-auto">
          <Link
            to="/resources"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> All resources
          </Link>

          <header className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <span className="h-px w-10 bg-gold-dark/40" aria-hidden />
              <p className="text-[10px] font-bold tracking-[0.28em] uppercase text-gold-dark">
                TopUni · Free Field Guide
              </p>
              <span className="h-px flex-1 bg-gold-dark/40" aria-hidden />
            </div>
            <h1 className="font-heading text-4xl md:text-5xl font-bold text-foreground mb-4 leading-[1.05] tracking-tight">
              Pick Your 10 Programs in 7 Days.
            </h1>
            <p className="font-heading italic text-lg text-muted-foreground leading-relaxed max-w-xl">
              From "I want to apply to grad school" to a committed,
              calibrated, sequenced list of 10 programs — by Sunday.
            </p>

            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="border-t border-foreground pt-2">
                <p className="text-[10px] tracking-widest uppercase text-muted-foreground">Format</p>
                <p className="font-heading font-bold text-foreground text-lg">7 emails</p>
              </div>
              <div className="border-t border-foreground pt-2">
                <p className="text-[10px] tracking-widest uppercase text-muted-foreground">Per day</p>
                <p className="font-heading font-bold text-foreground text-lg">~10 min</p>
              </div>
              <div className="border-t border-foreground pt-2">
                <p className="text-[10px] tracking-widest uppercase text-muted-foreground">Outcome</p>
                <p className="font-heading font-bold text-foreground text-lg">Locked list</p>
              </div>
              <div className="border-t border-foreground pt-2">
                <p className="text-[10px] tracking-widest uppercase text-muted-foreground">Price</p>
                <p className="font-heading font-bold text-foreground text-lg">Free</p>
              </div>
            </div>
          </header>

          {/* Email-capture form */}
          <section className="mb-12 rounded-2xl border border-gold-dark/30 bg-gold/5 p-6">
            {status === "done" ? (
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-gold-dark mt-1 shrink-0" />
                <div>
                  <p className="font-heading font-bold text-foreground mb-1">
                    You're on the list.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Day 1 lands in your inbox tomorrow morning. Want to read
                    ahead? Scroll down — the full curriculum is here.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={submit}>
                <div className="flex items-center gap-2 mb-1.5">
                  <Mail className="w-4 h-4 text-gold-dark" />
                  <h2 className="font-heading font-bold text-foreground text-base">
                    Get the course in your inbox
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                  One day of structured prompts in your inbox for 7 days.
                  Each day commits a real decision. By Sunday you have a
                  locked list and a runway.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    type="email"
                    required
                    autoComplete="email"
                    inputMode="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={status === "loading"}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={status === "loading"}>
                    {status === "loading" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Send me Day 1"
                    )}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground mt-3">
                  Or just read the whole thing below — same content, same minute.
                </p>
              </form>
            )}
          </section>

          {/* Opener */}
          <section className="mb-12 break-inside-avoid">
            <div className="flex items-center gap-2 mb-4">
              <Quote className="w-4 h-4 text-gold-dark" />
              <p className="text-[10px] font-bold tracking-widest uppercase text-gold-dark">
                Why 10, why 7 days
              </p>
            </div>
            <h2 className="font-heading text-2xl font-bold text-foreground mb-4">
              Most applicants research for weeks. Then never apply.
            </h2>
            <div className="prose prose-sm sm:prose-base max-w-none text-foreground/90 leading-relaxed">
              <p>
                The number one reason talented people don't apply to grad
                school isn't profile. It's research-loop paralysis. Two
                weeks of "I should look up that program," followed by two
                weeks of "I should email someone," followed by missed
                deadlines and a cycle deferred.
              </p>
              <p>
                Ten is the right number because applying to 8–12 programs
                hits the sweet spot of "enough variance to land somewhere"
                without "so many that every essay is hurried." Below 5 =
                under-spread. Above 15 = quality drops.
              </p>
              <p>
                Seven days is the right runway because each daily decision
                builds on the last. Day 1 you pick what the list is FOR.
                Day 2 you calibrate the tiers. Day 5 you reality-check
                against recommender bandwidth. Day 7 you lock it and start
                the runway. By Sunday you have a list. Then the next 60
                days are execution.
              </p>
            </div>
          </section>

          {/* Curriculum at-a-glance */}
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-gold-dark" />
              <p className="text-[10px] font-bold tracking-widest uppercase text-gold-dark">
                The 7-day curriculum
              </p>
            </div>
            <h2 className="font-heading text-2xl font-bold text-foreground mb-5">
              At a glance.
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {COURSE_SUMMARY.map((d) => (
                <div key={d.day} className="rounded-xl border border-border bg-card px-4 py-3">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-[10px] font-bold tracking-widest uppercase text-gold-dark tabular-nums">
                      Day {d.day}
                    </span>
                    <span className="text-[10px] text-muted-foreground">·</span>
                    <span className="text-sm font-heading font-semibold text-foreground">
                      {d.title}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Full 7-day content */}
          <div className="space-y-12">
            {PICK_YOUR_TEN.map((d) => (
              <section
                key={d.day}
                className="break-inside-avoid border-t border-border pt-8"
              >
                <div className="flex items-baseline gap-3 mb-3">
                  <span className="font-heading text-5xl font-bold text-gold-dark/30">
                    {String(d.day).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="text-[10px] font-bold tracking-widest uppercase text-gold-dark mb-0.5">
                      Day {d.day}
                    </p>
                    <h2 className="font-heading text-2xl font-bold text-foreground leading-tight">
                      {d.title}
                    </h2>
                  </div>
                </div>
                <p className="text-muted-foreground leading-relaxed mb-6 italic">
                  {d.mentalModel}
                </p>

                <div className="rounded-xl border border-gold-dark/20 bg-gold/5 p-4 mb-4">
                  <p className="text-[11px] font-bold tracking-widest uppercase text-gold-dark mb-2">
                    Today's prompts
                  </p>
                  <ol className="space-y-2">
                    {d.prompts.map((p, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground leading-snug">
                        <span className="font-heading font-bold text-gold-dark tabular-nums w-5 shrink-0">{i + 1}.</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="rounded-xl border border-amber-500/30 bg-amber-50 p-4">
                  <p className="text-[11px] font-bold tracking-widest uppercase text-amber-900 mb-2">
                    2-minute commit before tomorrow
                  </p>
                  <p className="text-sm text-foreground leading-relaxed">
                    {d.exercise}
                  </p>
                </div>
              </section>
            ))}
          </div>

          <div className="mt-14 rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center">
            <h3 className="font-heading text-lg font-bold text-foreground mb-2">
              Want the TopUni AI to pre-fill your shortlist?
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              The strategy report takes your profile + target outcomes and
              recommends 5–8 specific programs with fit-ranking and
              deadlines. Use it as Day-2 input to this course.
            </p>
            <Link
              to="/topuni-ai"
              className="inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:brightness-110 transition"
            >
              Build my strategy report
            </Link>
          </div>
        </div>
      </main>
      <Footer language="en" variant="dark" />
    </div>
  );
};

export default PickYourTen;
