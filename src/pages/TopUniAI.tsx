import { useState, useEffect } from "react";
import { trackPageView } from "@/utils/analytics";
import { motion, AnimatePresence } from "framer-motion";
import Navigation from "@/components/Navigation";
import { BetaBanner } from "@/components/BetaBanner";
import { Footer } from "@/components/Footer";
import topuniBg from "@/assets/topuni-bg.jpg";
import TopUniChat from "@/components/TopUniChat";
import TopUniDashboard from "@/components/TopUniDashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowRight, ArrowLeft, Sparkles, GraduationCap, Target, Shield,
  CheckCircle2, Search, BookOpen, ListChecks, Map, Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

type Screen = "landing" | "intake" | "dashboard";

const COUNTRIES = ["United States", "United Kingdom", "Canada", "Germany", "South Korea", "China", "Netherlands", "Czech Republic", "Turkey", "Malaysia", "Hungary", "Italy", "Poland", "Sweden", "Estonia"];

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 22 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-50px" },
  transition: { delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
});

const TopUniAI = () => {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>("landing");
  const [step, setStep] = useState(1);

  useEffect(() => { trackPageView("/topuni-ai"); }, []);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [gpa, setGpa] = useState("");
  const [ielts, setIelts] = useState("");
  const [sat, setSat] = useState("");
  const [targetCountries, setTargetCountries] = useState<string[]>([]);
  const [major, setMajor] = useState("");
  const [budget, setBudget] = useState("");
  const [scholarshipNeeded, setScholarshipNeeded] = useState("");
  const [timeline, setTimeline] = useState("");
  const [prestige, setPrestige] = useState([3]);
  const [scholarship, setScholarship] = useState([3]);
  const [careerRoi, setCareerRoi] = useState([3]);
  const [visaAccess, setVisaAccess] = useState([3]);
  const [locationPref, setLocationPref] = useState([3]);

  const toggleCountry = (country: string) => {
    setTargetCountries(prev => prev.includes(country) ? prev.filter(c => c !== country) : [...prev, country]);
  };

  const profile = {
    fullName, email, whatsapp, gradeLevel, gpa, ielts, sat,
    targetCountries, major, budget, scholarshipNeeded, timeline,
    prestige: prestige[0], scholarship: scholarship[0],
    careerRoi: careerRoi[0], visaAccess: visaAccess[0], locationPref: locationPref[0],
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Faint blurred backdrop — TopUniAI's existing visual signature */}
      <div
        className="fixed inset-0 z-0 opacity-[0.12] pointer-events-none"
        style={{ backgroundImage: `url(${topuniBg})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(3px)' }}
      />

      <div className="relative z-10">
        <Navigation language="en" />
        <BetaBanner />

        <AnimatePresence mode="wait">
          {/* ═══ LANDING ═══ */}
          {screen === "landing" && (
            <motion.div
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* HERO — strategy plan positioning */}
              <section className="relative pt-16 pb-20 sm:pt-24 sm:pb-28 overflow-hidden">
                {/* Soft navy hint at the top so the page has bookend presence */}
                <div className="absolute inset-x-0 top-0 h-48 pointer-events-none"
                  style={{ backgroundImage: "linear-gradient(180deg, hsl(var(--primary) / 0.07) 0%, transparent 100%)" }} />

                <div className="max-w-3xl mx-auto px-5 sm:px-8 text-center relative">
                  <motion.p {...fadeUp(0.05)} className="text-[11px] uppercase tracking-[0.24em] text-gold-dark font-medium mb-5">
                    TopUni AI · Free
                  </motion.p>

                  <motion.h1 {...fadeUp(0.12)} className="font-heading text-[clamp(2.5rem,6.5vw,4.5rem)] font-bold leading-[1.04] tracking-[-0.025em] text-foreground mb-6">
                    Your <span className="text-gold-dark">admissions strategy.</span><br />
                    In two minutes.
                  </motion.h1>

                  <motion.p {...fadeUp(0.22)} className="text-lg sm:text-xl text-foreground/75 leading-[1.6] max-w-xl mx-auto mb-10 font-light">
                    Tell us your scores, goals, and constraints. Our AI returns a tailored plan: where to apply, how to fund it, and what to do next.
                  </motion.p>

                  <motion.div {...fadeUp(0.32)} className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
                    <Button variant="gold" size="lg" className="text-base px-8 py-6 gap-2" onClick={() => setScreen("intake")}>
                      <Sparkles className="w-5 h-5" /> Start my plan <ArrowRight className="w-5 h-5" />
                    </Button>
                  </motion.div>

                  <motion.p {...fadeUp(0.4)} className="text-xs text-muted-foreground tracking-wide">
                    2 minutes · No account needed · Free during beta
                  </motion.p>
                </div>
              </section>

              {/* WHAT YOU'LL GET — three outcomes the strategy plan delivers */}
              <section className="py-16 sm:py-20 border-t border-border/60">
                <div className="max-w-5xl mx-auto px-5 sm:px-8">
                  <motion.div {...fadeUp()} className="text-center mb-12">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-gold-dark font-medium mb-4">Your plan delivers</p>
                    <h2 className="font-heading text-3xl sm:text-4xl font-semibold tracking-tight text-foreground leading-[1.15]">
                      Three concrete outputs.
                    </h2>
                  </motion.div>

                  <div className="grid sm:grid-cols-3 gap-px bg-border/60 border border-border/60 rounded-2xl overflow-hidden">
                    {[
                      {
                        icon: ListChecks,
                        kicker: "01 · Target list",
                        title: "A balanced shortlist",
                        body: "Reach, match, and safety schools across your target countries — ranked by your fit and funding need.",
                      },
                      {
                        icon: Map,
                        kicker: "02 · Funding pathway",
                        title: "Where the money is",
                        body: "Scholarships and need-based aid you can realistically win, with deadlines and effort tagged.",
                      },
                      {
                        icon: Zap,
                        kicker: "03 · Action plan",
                        title: "What to do this month",
                        body: "Tests to take, essays to draft, recommenders to ask — sequenced backwards from your earliest deadline.",
                      },
                    ].map((item, i) => (
                      <motion.div
                        key={item.kicker}
                        {...fadeUp(0.08 * i)}
                        className="bg-card p-7 flex flex-col"
                      >
                        <item.icon className="w-5 h-5 text-gold-dark mb-5" />
                        <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-medium mb-2">{item.kicker}</p>
                        <h3 className="font-heading font-semibold text-lg text-foreground mb-2 leading-tight">{item.title}</h3>
                        <p className="text-sm text-muted-foreground leading-[1.65]">{item.body}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </section>

              {/* THE FLOW — strategy → discover → academy */}
              <section className="py-16 sm:py-20">
                <div className="max-w-5xl mx-auto px-5 sm:px-8">
                  <motion.div {...fadeUp()} className="max-w-2xl mb-12">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-gold-dark font-medium mb-4">From plan to admission</p>
                    <h2 className="font-heading text-3xl sm:text-4xl font-semibold tracking-tight text-foreground leading-[1.15]">
                      One plan. Two products to execute it.
                    </h2>
                    <p className="text-muted-foreground mt-4 text-base leading-relaxed">
                      Once your strategy is generated, your scholarships are waiting in Discover and your application playbook lives in Academy.
                    </p>
                  </motion.div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <motion.button
                      {...fadeUp(0.1)}
                      onClick={() => navigate("/discover")}
                      className="group text-left p-7 rounded-2xl border border-border/70 bg-card hover:border-gold/30 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center justify-between mb-5">
                        <div className="h-10 w-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center">
                          <Search className="w-5 h-5 text-gold-dark" />
                        </div>
                        <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-medium">Step 02</span>
                      </div>
                      <h3 className="font-heading font-bold text-xl text-foreground mb-2 tracking-tight">Discover</h3>
                      <p className="text-sm text-muted-foreground leading-[1.65] mb-5">
                        Every scholarship in our database, ranked against your profile. See exactly where you have a real shot.
                      </p>
                      <span className="text-sm font-semibold text-foreground group-hover:text-gold-dark transition-colors flex items-center gap-1.5">
                        See your matches <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </motion.button>

                    <motion.button
                      {...fadeUp(0.18)}
                      onClick={() => navigate("/academy")}
                      className="group text-left p-7 rounded-2xl border border-border/70 bg-card hover:border-gold/30 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center justify-between mb-5">
                        <div className="h-10 w-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center">
                          <BookOpen className="w-5 h-5 text-gold-dark" />
                        </div>
                        <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-medium">Step 03</span>
                      </div>
                      <h3 className="font-heading font-bold text-xl text-foreground mb-2 tracking-tight">Academy</h3>
                      <p className="text-sm text-muted-foreground leading-[1.65] mb-5">
                        Live workshops with our founders and a recorded library — execute your plan with people who've done it.
                      </p>
                      <span className="text-sm font-semibold text-foreground group-hover:text-gold-dark transition-colors flex items-center gap-1.5">
                        Preview Academy <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </motion.button>
                  </div>

                  <motion.div {...fadeUp(0.3)} className="text-center mt-12">
                    <a
                      href="/topuni-ai/partners"
                      className="text-sm text-muted-foreground hover:text-gold-dark transition-colors underline-offset-4 hover:underline"
                    >
                      For university partners →
                    </a>
                  </motion.div>
                </div>
              </section>
            </motion.div>
          )}

          {/* ═══ INTAKE ═══ */}
          {screen === "intake" && (
            <motion.div
              key="intake"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="max-w-2xl mx-auto px-5 sm:px-8 pt-12 pb-20"
            >
              {/* Progress */}
              <div className="flex items-center justify-center gap-2 mb-12">
                {[1, 2, 3].map(s => (
                  <div key={s} className="flex items-center gap-2">
                    <div className={`h-1.5 w-12 rounded-full overflow-hidden bg-border/60`}>
                      <motion.div
                        className="h-full bg-gold-dark"
                        initial={false}
                        animate={{ width: s < step ? "100%" : s === step ? "60%" : "0%" }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                ))}
                <span className="text-xs text-muted-foreground tabular-nums tracking-wider font-medium ml-3">{step} / 3</span>
              </div>

              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.35 }}
                    className="space-y-7"
                  >
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.22em] text-gold-dark font-medium mb-3">Step 01 · Profile</p>
                      <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground tracking-tight leading-tight">
                        Tell us about you.
                      </h2>
                      <p className="text-muted-foreground mt-2 text-sm">Your academic foundation. About a minute.</p>
                    </div>
                    <div className="grid gap-5">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs uppercase tracking-wider font-medium">Full name *</Label>
                          <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your name" className="h-11 bg-card" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs uppercase tracking-wider font-medium">Email *</Label>
                          <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" className="h-11 bg-card" />
                        </div>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs uppercase tracking-wider font-medium">WhatsApp</Label>
                          <Input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="+996..." className="h-11 bg-card" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs uppercase tracking-wider font-medium">Grade level *</Label>
                          <Select value={gradeLevel} onValueChange={setGradeLevel}>
                            <SelectTrigger className="h-11 bg-card"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              {["9th Grade", "10th Grade", "11th Grade", "12th Grade", "Gap Year", "University Transfer"].map(g => (
                                <SelectItem key={g} value={g}>{g}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs uppercase tracking-wider font-medium">GPA *</Label>
                          <Input value={gpa} onChange={e => setGpa(e.target.value)} placeholder="e.g. 3.7" className="h-11 bg-card" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs uppercase tracking-wider font-medium">IELTS</Label>
                          <Input value={ielts} onChange={e => setIelts(e.target.value)} placeholder="Optional" className="h-11 bg-card" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs uppercase tracking-wider font-medium">SAT</Label>
                          <Input value={sat} onChange={e => setSat(e.target.value)} placeholder="Optional" className="h-11 bg-card" />
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between pt-4">
                      <Button variant="outline" onClick={() => setScreen("landing")}><ArrowLeft className="mr-2 w-4 h-4" /> Back</Button>
                      <Button variant="gold" onClick={() => setStep(2)}>Continue <ArrowRight className="ml-2 w-4 h-4" /></Button>
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.35 }}
                    className="space-y-7"
                  >
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.22em] text-gold-dark font-medium mb-3">Step 02 · Direction</p>
                      <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground tracking-tight leading-tight">
                        Where, and what?
                      </h2>
                      <p className="text-muted-foreground mt-2 text-sm">Your target geographies and field.</p>
                    </div>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wider font-medium">Target countries *</Label>
                        <div className="flex flex-wrap gap-2">
                          {COUNTRIES.map(c => (
                            <button
                              key={c}
                              onClick={() => toggleCountry(c)}
                              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                                targetCountries.includes(c)
                                  ? "bg-gold-dark text-primary-foreground border-gold-dark"
                                  : "bg-card text-foreground/75 border-border hover:border-gold/40"
                              }`}
                            >
                              {c}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs uppercase tracking-wider font-medium">Intended major *</Label>
                        <Input value={major} onChange={e => setMajor(e.target.value)} placeholder="e.g. Computer Science, Economics" className="h-11 bg-card" />
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs uppercase tracking-wider font-medium">Budget</Label>
                          <Select value={budget} onValueChange={setBudget}>
                            <SelectTrigger className="h-11 bg-card"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              {["Under $5,000/year", "$5,000–$15,000/year", "$15,000–$30,000/year", "$30,000+/year", "Full scholarship needed"].map(b => (
                                <SelectItem key={b} value={b}>{b}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs uppercase tracking-wider font-medium">Need scholarship?</Label>
                          <Select value={scholarshipNeeded} onValueChange={setScholarshipNeeded}>
                            <SelectTrigger className="h-11 bg-card"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="yes">Yes</SelectItem>
                              <SelectItem value="no">No</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs uppercase tracking-wider font-medium">Timeline</Label>
                        <Select value={timeline} onValueChange={setTimeline}>
                          <SelectTrigger className="h-11 bg-card"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Fall 2026">Fall 2026</SelectItem>
                            <SelectItem value="Fall 2027">Fall 2027</SelectItem>
                            <SelectItem value="Flexible">Flexible</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-between pt-4">
                      <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="mr-2 w-4 h-4" /> Back</Button>
                      <Button variant="gold" onClick={() => setStep(3)}>Continue <ArrowRight className="ml-2 w-4 h-4" /></Button>
                    </div>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.35 }}
                    className="space-y-7"
                  >
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.22em] text-gold-dark font-medium mb-3">Step 03 · Priorities</p>
                      <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground tracking-tight leading-tight">
                        What matters most?
                      </h2>
                      <p className="text-muted-foreground mt-2 text-sm">Weight each on a 1-5 scale.</p>
                    </div>
                    <div className="space-y-5">
                      {[
                        { label: "Prestige", value: prestige, set: setPrestige, icon: GraduationCap, low: "Any school", high: "Top 50 only" },
                        { label: "Scholarship need", value: scholarship, set: setScholarship, icon: Shield, low: "Self-fund OK", high: "Must be free" },
                        { label: "Career ROI", value: careerRoi, set: setCareerRoi, icon: Target, low: "Open-ended", high: "Top 1% jobs" },
                        { label: "Visa accessibility", value: visaAccess, set: setVisaAccess, icon: CheckCircle2, low: "Don't mind", high: "Easy access" },
                        { label: "Location preference", value: locationPref, set: setLocationPref, icon: ArrowRight, low: "Anywhere", high: "Specific city" },
                      ].map(item => (
                        <div key={item.label} className="bg-card border border-border/70 rounded-xl p-5">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2.5">
                              <item.icon className="w-4 h-4 text-gold-dark" />
                              <span className="text-sm font-semibold text-foreground">{item.label}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {[1, 2, 3, 4, 5].map(n => (
                                <span key={n} className={`h-1.5 w-1.5 rounded-full transition-colors ${n <= item.value[0] ? "bg-gold-dark" : "bg-border"}`} />
                              ))}
                              <span className="text-xs font-bold text-gold-dark tabular-nums ml-1.5">{item.value[0]}/5</span>
                            </div>
                          </div>
                          <Slider min={1} max={5} step={1} value={item.value} onValueChange={item.set} className="w-full" />
                          <div className="flex justify-between mt-2 text-[11px] text-muted-foreground font-medium">
                            <span>{item.low}</span>
                            <span>{item.high}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between pt-4">
                      <Button variant="outline" onClick={() => setStep(2)}><ArrowLeft className="mr-2 w-4 h-4" /> Back</Button>
                      <Button variant="gold" size="lg" onClick={() => setScreen("dashboard")}>
                        <Sparkles className="mr-2 w-5 h-5" /> Generate my plan
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ═══ DASHBOARD ═══ */}
          {screen === "dashboard" && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <TopUniDashboard
                profile={profile}
                language="en"
                onBack={() => setScreen("landing")}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {screen !== "dashboard" && <Footer language="en" />}
        {screen === "landing" && <TopUniChat />}
      </div>
    </div>
  );
};

export default TopUniAI;
