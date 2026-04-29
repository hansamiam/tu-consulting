import { useState, useEffect, useRef } from "react";
import { trackPageView } from "@/utils/analytics";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform, useScroll } from "framer-motion";
import Navigation from "@/components/Navigation";
import { BetaBanner } from "@/components/BetaBanner";
import { Footer } from "@/components/Footer";
import TopUniChat from "@/components/TopUniChat";
import TopUniDashboard from "@/components/TopUniDashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowRight, ArrowLeft, Sparkles, GraduationCap, Target, Shield,
  CheckCircle2, Bot, Search, BookOpen, PenTool, ChevronDown,
  Globe2, TrendingUp, Trophy, MapPin,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

type Screen = "landing" | "intake" | "dashboard";

const COUNTRIES = [
  { v: "United States",   f: "🇺🇸" }, { v: "United Kingdom",  f: "🇬🇧" },
  { v: "Canada",          f: "🇨🇦" }, { v: "Germany",         f: "🇩🇪" },
  { v: "South Korea",     f: "🇰🇷" }, { v: "Netherlands",     f: "🇳🇱" },
  { v: "Czech Republic",  f: "🇨🇿" }, { v: "Turkey",          f: "🇹🇷" },
  { v: "Sweden",          f: "🇸🇪" }, { v: "Italy",           f: "🇮🇹" },
  { v: "Poland",          f: "🇵🇱" }, { v: "Hungary",         f: "🇭🇺" },
  { v: "Estonia",         f: "🇪🇪" }, { v: "Malaysia",        f: "🇲🇾" },
  { v: "China",           f: "🇨🇳" },
];

/* ─── Reveal wrapper ─────────────────────────────────────────────────── */
const Reveal = ({ children, delay = 0, className = "", y = 24 }: { children: React.ReactNode; delay?: number; className?: string; y?: number }) => (
  <motion.div
    initial={{ opacity: 0, y }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-80px" }}
    transition={{ delay, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    className={className}
  >
    {children}
  </motion.div>
);

/* ─── Count-up ───────────────────────────────────────────────────────── */
const useCountUp = (target: number, duration = 1400) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min((t - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
};

/* ─── 3D tilt ────────────────────────────────────────────────────────── */
const Tilt = ({ children, className = "", intensity = 4 }: { children: React.ReactNode; className?: string; intensity?: number }) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 24 });
  const sy = useSpring(y, { stiffness: 220, damping: 24 });
  const rotX = useTransform(sy, [-0.5, 0.5], [intensity, -intensity]);
  const rotY = useTransform(sx, [-0.5, 0.5], [-intensity, intensity]);
  const onMove = (e: React.MouseEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    x.set((e.clientX - r.left) / r.width - 0.5);
    y.set((e.clientY - r.top) / r.height - 0.5);
  };
  return (
    <motion.div ref={ref} onMouseMove={onMove} onMouseLeave={() => { x.set(0); y.set(0); }}
      style={{ rotateX: rotX, rotateY: rotY, transformStyle: "preserve-3d", perspective: 1200 }}
      className={className}>
      {children}
    </motion.div>
  );
};

/* ─── Aurora bg ──────────────────────────────────────────────────────── */
const Aurora = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at top, hsl(220 50% 11%) 0%, hsl(222 60% 6%) 100%)" }} />
    <motion.div
      className="absolute -top-[30%] -left-[15%] w-[70vw] h-[70vw] rounded-full blur-[140px] opacity-[0.35]"
      style={{ background: "radial-gradient(circle, hsl(42 90% 55%) 0%, transparent 70%)" }}
      animate={{ x: [0, 50, -20, 0], y: [0, -30, 20, 0] }}
      transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.div
      className="absolute -bottom-[20%] -right-[15%] w-[65vw] h-[65vw] rounded-full blur-[160px] opacity-[0.28]"
      style={{ background: "radial-gradient(circle, hsl(200 80% 50%) 0%, transparent 70%)" }}
      animate={{ x: [0, -40, 20, 0], y: [0, 30, -20, 0] }}
      transition={{ duration: 32, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.div
      className="absolute top-[30%] left-[35%] w-[40vw] h-[40vw] rounded-full blur-[120px] opacity-[0.18]"
      style={{ background: "radial-gradient(circle, hsl(280 70% 60%) 0%, transparent 70%)" }}
      animate={{ x: [0, 30, -30, 0], y: [0, -20, 25, 0] }}
      transition={{ duration: 36, repeat: Infinity, ease: "easeInOut" }}
    />
    <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 0.5px, transparent 0)", backgroundSize: "28px 28px" }} />
    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30" />
  </div>
);

/* ─── Floating orbs (university medals) ──────────────────────────────── */
const FloatingOrbs = () => {
  const orbs = [
    { flag: "🇺🇸", label: "MIT",     x: "8%",  y: "20%", delay: 0,    rot: -6 },
    { flag: "🇬🇧", label: "Oxford",  x: "84%", y: "16%", delay: 0.3,  rot:  5 },
    { flag: "🇯🇵", label: "Tokyo",   x: "6%",  y: "70%", delay: 0.6,  rot:  4 },
    { flag: "🇨🇦", label: "McGill",  x: "86%", y: "66%", delay: 0.9,  rot: -5 },
    { flag: "🇩🇪", label: "TUM",     x: "14%", y: "44%", delay: 1.2,  rot:  8 },
    { flag: "🇰🇷", label: "SNU",     x: "80%", y: "42%", delay: 1.5,  rot: -4 },
  ];
  return (
    <div className="absolute inset-0 pointer-events-none hidden md:block">
      {orbs.map((o, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.6, rotate: o.rot }}
          animate={{ opacity: 0.95, scale: 1, y: [0, -10, 0], rotate: o.rot }}
          transition={{
            opacity: { delay: o.delay, duration: 1 },
            scale:   { delay: o.delay, duration: 1, ease: [0.16, 1, 0.3, 1] },
            rotate:  { delay: o.delay, duration: 1 },
            y:       { duration: 7 + i * 0.6, repeat: Infinity, ease: "easeInOut", delay: o.delay },
          }}
          className="absolute"
          style={{ left: o.x, top: o.y }}
        >
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-white/0 blur-xl" />
            <div className="relative h-16 w-16 rounded-full bg-white/[0.04] backdrop-blur-xl border border-white/10 flex flex-col items-center justify-center shadow-2xl">
              <span className="text-2xl leading-none">{o.flag}</span>
              <span className="text-[9px] font-bold text-white/70 mt-0.5 tracking-wider">{o.label}</span>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

/* ─── Main ───────────────────────────────────────────────────────────── */
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

  const studentsAnimated = useCountUp(2400, 1500);
  const matchedAnimated = useCountUp(8700, 1500);

  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0.4]);
  const heroY = useTransform(scrollY, [0, 300], [0, 60]);

  const isStep1Valid = fullName && email && gradeLevel && gpa;
  const isStep2Valid = targetCountries.length > 0 && major;

  return (
    <div className="min-h-screen relative">
      {screen !== "dashboard" && <Aurora />}

      <div className="relative z-10">
        <Navigation language="en" />
        <BetaBanner />

        <AnimatePresence mode="wait">
          {/* ═══ LANDING ═══ */}
          {screen === "landing" && (
            <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>

              {/* Hero */}
              <section className="relative min-h-[calc(100vh-128px)] flex flex-col items-center justify-center px-6 text-center overflow-hidden pt-12 pb-32">
                <FloatingOrbs />

                <motion.div style={{ opacity: heroOpacity, y: heroY }} className="max-w-4xl mx-auto relative z-10 space-y-10">
                  {/* Status pill */}
                  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.7 }}
                    className="inline-flex items-center gap-2.5 bg-white/[0.04] border border-white/10 backdrop-blur-xl px-4 py-2 rounded-full">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                    </span>
                    <span className="text-white/90 text-xs font-semibold tracking-wide">
                      AI counselor · <span className="text-amber-300">trusted by Central Asia</span>
                    </span>
                  </motion.div>

                  {/* Headline */}
                  <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                    className="font-heading text-[clamp(2.75rem,7.5vw,6rem)] font-bold text-white leading-[1.0] tracking-[-0.035em]">
                    Your path<br />
                    to{" "}
                    <span className="bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 bg-clip-text text-transparent inline-block" style={{ backgroundSize: "200% 100%", animation: "shimmer 7s linear infinite" }}>
                      world-class
                    </span><br />
                    education.
                  </motion.h1>

                  <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32, duration: 0.7 }}
                    className="text-white/60 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed font-light">
                    Tell us your academic profile and goals. We map every option — universities, scholarships, what each one actually requires — and tell you exactly where you have a real shot.
                  </motion.p>

                  {/* CTAs */}
                  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.7 }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                    <Button variant="gold" size="lg" className="text-base px-10 py-7 hover:scale-[1.03] transition-transform gap-2.5 shadow-2xl shadow-amber-500/30 relative overflow-hidden group" onClick={() => setScreen("intake")}>
                      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                      <GraduationCap className="h-5 w-5" />
                      Build my pathway
                      <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                    <Button variant="outline" size="lg" className="text-base px-7 py-7 bg-white/[0.04] border-white/15 text-white hover:bg-white/[0.08] backdrop-blur-md gap-2" onClick={() => setScreen("dashboard")}>
                      <Bot className="h-5 w-5 text-amber-300" />
                      Chat with counselor
                    </Button>
                  </motion.div>

                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6, duration: 0.8 }}
                    className="flex items-center justify-center gap-5 text-xs text-white/30 font-medium tracking-wide">
                    <span>3 minutes</span>
                    <span className="opacity-50">·</span>
                    <span>No account needed</span>
                    <span className="opacity-50">·</span>
                    <span>Free during beta</span>
                  </motion.div>

                  {/* Scroll indicator */}
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: 0.7 }}
                    className="absolute bottom-[-130px] left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/30">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.3em]">Scroll</span>
                    <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
                      <ChevronDown className="h-4 w-4" />
                    </motion.div>
                  </motion.div>
                </motion.div>
              </section>

              {/* Trust strip */}
              <section className="relative bg-gradient-to-b from-transparent via-slate-950/40 to-slate-950/60 backdrop-blur-sm py-16 sm:py-20">
                <div className="max-w-6xl mx-auto px-6 sm:px-8">
                  <Reveal>
                    <p className="text-amber-300/70 text-[11px] font-semibold uppercase tracking-[0.25em] mb-3">By the numbers</p>
                    <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white tracking-[-0.02em] mb-12 max-w-2xl leading-tight">
                      Built for ambitious students from emerging markets.
                    </h2>
                  </Reveal>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-10">
                    {[
                      { icon: GraduationCap, value: studentsAnimated, suffix: "+",  label: "Students helped" },
                      { icon: Globe2,        value: 26,                suffix: "",   label: "Countries" },
                      { icon: TrendingUp,    value: matchedAnimated,   suffix: "",   label: "Matches generated" },
                      { icon: Trophy,        value: 94,                suffix: "%",  label: "Match accuracy" },
                    ].map((s, i) => (
                      <Reveal key={s.label} delay={i * 0.08}>
                        <div className="flex items-start gap-3.5">
                          <s.icon className="h-5 w-5 text-amber-300/70 mt-1 shrink-0" />
                          <div>
                            <div className="text-3xl sm:text-4xl font-bold text-white tabular-nums leading-none tracking-tight">
                              {s.value.toLocaleString()}{s.suffix}
                            </div>
                            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40 mt-2.5">{s.label}</div>
                          </div>
                        </div>
                      </Reveal>
                    ))}
                  </div>
                </div>
              </section>

              {/* Product trio */}
              <section className="relative bg-slate-950/60 py-20 sm:py-28">
                <div className="max-w-6xl mx-auto px-6 sm:px-8">
                  <Reveal className="max-w-2xl mb-14">
                    <p className="text-amber-300/70 text-[11px] font-semibold uppercase tracking-[0.25em] mb-3">The platform</p>
                    <h2 className="font-heading text-3xl sm:text-5xl font-bold text-white tracking-[-0.025em] leading-[1.05]">
                      Three tools.<br />One unstoppable application.
                    </h2>
                  </Reveal>

                  <div className="grid md:grid-cols-3 gap-5">
                    {[
                      {
                        path: "/discover", icon: Search, title: "Discover",
                        kicker: "Database",
                        desc: "Browse 75+ scholarships matched to your profile, with eligibility, deadlines, and strategy notes for each.",
                        accent: "from-emerald-400 to-teal-500",
                        iconColor: "text-emerald-300",
                      },
                      {
                        path: "/prep", icon: PenTool, title: "Prep",
                        kicker: "Practice",
                        desc: "IELTS and SAT diagnostics, adaptive practice, and AI essay scoring — built around your weak areas.",
                        accent: "from-amber-300 to-orange-400",
                        iconColor: "text-amber-300",
                      },
                      {
                        path: "/academy", icon: BookOpen, title: "Academy",
                        kicker: "Learn",
                        desc: "Curated playbooks for every stage — personal statements, recommendation letters, visa interviews.",
                        accent: "from-violet-400 to-fuchsia-400",
                        iconColor: "text-violet-300",
                      },
                    ].map((p, i) => (
                      <Reveal key={p.title} delay={i * 0.1}>
                        <Tilt intensity={3}>
                          <button
                            onClick={() => navigate(p.path)}
                            className="group relative w-full text-left rounded-3xl overflow-hidden bg-white/[0.03] border border-white/10 hover:border-white/25 backdrop-blur-md p-7 sm:p-8 transition-all hover:bg-white/[0.05] h-full"
                          >
                            <div className={`absolute -top-1/2 -right-1/4 w-2/3 h-full rounded-full blur-[100px] opacity-15 bg-gradient-to-br ${p.accent}`} />
                            <div className="relative">
                              <p className="text-white/35 text-[10px] font-semibold uppercase tracking-[0.22em] mb-5">{p.kicker}</p>
                              <p.icon className={`h-7 w-7 ${p.iconColor} mb-5 group-hover:scale-110 transition-transform`} />
                              <h3 className="font-heading font-bold text-2xl text-white mb-2.5 tracking-tight">{p.title}</h3>
                              <p className="text-sm text-white/55 leading-relaxed mb-7">{p.desc}</p>
                              <span className="inline-flex items-center gap-1.5 text-sm text-amber-300 font-semibold group-hover:gap-2.5 transition-all">
                                Open {p.title} <ArrowRight className="h-4 w-4" />
                              </span>
                            </div>
                          </button>
                        </Tilt>
                      </Reveal>
                    ))}
                  </div>

                  <Reveal delay={0.3} className="text-center mt-16">
                    <a href="/topuni-ai/partners" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-amber-300 transition-colors underline-offset-4 hover:underline">
                      For university partners
                      <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                  </Reveal>
                </div>
              </section>

              <Footer language="en" />
              <TopUniChat />
            </motion.div>
          )}

          {/* ═══ INTAKE ═══ */}
          {screen === "intake" && (
            <motion.div key="intake" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}
              className="relative min-h-[calc(100vh-128px)] flex flex-col">
              {/* Progress bar */}
              <div className="pt-7 px-6 flex items-center justify-between max-w-2xl mx-auto w-full relative z-10">
                <button onClick={() => step === 1 ? setScreen("landing") : setStep(s => s - 1)} className="text-white/40 hover:text-white/90 transition-colors p-2 -ml-2">
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="flex gap-2">
                  {[1, 2, 3].map(s => (
                    <div key={s} className="h-1 w-10 rounded-full bg-white/10 overflow-hidden">
                      <motion.div className="h-full bg-gradient-to-r from-amber-300 to-amber-400"
                        initial={false}
                        animate={{ width: s < step ? "100%" : s === step ? "60%" : "0%" }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                      />
                    </div>
                  ))}
                </div>
                <span className="text-white/40 text-xs tabular-nums font-medium tracking-wider">{step} / 3</span>
              </div>

              <AnimatePresence mode="wait">
                {/* Step 1 — Profile */}
                {step === 1 && (
                  <motion.div key="s1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.5 }}
                    className="flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-xl mx-auto w-full relative z-10">
                    <div className="w-full text-center mb-10">
                      <p className="text-amber-300/80 text-xs font-semibold uppercase tracking-[0.25em] mb-5">Step 1 · Profile</p>
                      <h2 className="font-heading text-[clamp(2rem,5vw,3.25rem)] font-bold text-white tracking-[-0.025em] leading-[1.05] mb-4">
                        Tell us about you.
                      </h2>
                      <p className="text-white/50 text-base">Your academic foundation. Takes about a minute.</p>
                    </div>

                    <div className="w-full space-y-5">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">Full name</label>
                          <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your name"
                            className="bg-white/[0.04] border-white/15 text-white placeholder:text-white/25 h-12 text-base backdrop-blur-md focus-visible:border-amber-300/50 focus-visible:bg-white/[0.06] transition-colors" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">Email</label>
                          <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com"
                            className="bg-white/[0.04] border-white/15 text-white placeholder:text-white/25 h-12 text-base backdrop-blur-md focus-visible:border-amber-300/50 focus-visible:bg-white/[0.06] transition-colors" />
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">WhatsApp <span className="text-white/30 normal-case">(optional)</span></label>
                          <Input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="+996 ..."
                            className="bg-white/[0.04] border-white/15 text-white placeholder:text-white/25 h-12 text-base backdrop-blur-md focus-visible:border-amber-300/50 focus-visible:bg-white/[0.06] transition-colors" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">Grade level</label>
                          <Select value={gradeLevel} onValueChange={setGradeLevel}>
                            <SelectTrigger className="bg-white/[0.04] border-white/15 text-white h-12 backdrop-blur-md data-[placeholder]:text-white/25"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              {["9th Grade", "10th Grade", "11th Grade", "12th Grade", "Gap Year", "University Transfer"].map(g => (
                                <SelectItem key={g} value={g}>{g}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">GPA</label>
                          <Input value={gpa} onChange={e => setGpa(e.target.value)} placeholder="e.g. 3.7"
                            className="bg-white/[0.04] border-white/15 text-white placeholder:text-white/25 h-12 text-base backdrop-blur-md focus-visible:border-amber-300/50 focus-visible:bg-white/[0.06] transition-colors" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">IELTS <span className="text-white/30 normal-case">(opt.)</span></label>
                          <Input value={ielts} onChange={e => setIelts(e.target.value)} placeholder="—"
                            className="bg-white/[0.04] border-white/15 text-white placeholder:text-white/25 h-12 text-base backdrop-blur-md focus-visible:border-amber-300/50 focus-visible:bg-white/[0.06] transition-colors" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">SAT <span className="text-white/30 normal-case">(opt.)</span></label>
                          <Input value={sat} onChange={e => setSat(e.target.value)} placeholder="—"
                            className="bg-white/[0.04] border-white/15 text-white placeholder:text-white/25 h-12 text-base backdrop-blur-md focus-visible:border-amber-300/50 focus-visible:bg-white/[0.06] transition-colors" />
                        </div>
                      </div>
                    </div>

                    <Button variant="gold" size="lg" disabled={!isStep1Valid} onClick={() => setStep(2)}
                      className="mt-10 px-12 gap-2 text-base shadow-xl shadow-amber-500/25">
                      Continue <ArrowRight className="h-5 w-5" />
                    </Button>
                  </motion.div>
                )}

                {/* Step 2 — Direction */}
                {step === 2 && (
                  <motion.div key="s2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.5 }}
                    className="flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-2xl mx-auto w-full relative z-10">
                    <div className="w-full text-center mb-10">
                      <p className="text-amber-300/80 text-xs font-semibold uppercase tracking-[0.25em] mb-5">Step 2 · Direction</p>
                      <h2 className="font-heading text-[clamp(2rem,5vw,3.25rem)] font-bold text-white tracking-[-0.025em] leading-[1.05] mb-4">
                        Where, and what?
                      </h2>
                      <p className="text-white/50 text-base">Pick your target countries and intended major.</p>
                    </div>

                    <div className="w-full space-y-7">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45 flex items-center gap-1.5">
                            <MapPin className="h-3 w-3" /> Target countries
                          </label>
                          <span className="text-[11px] text-white/35 tabular-nums">{targetCountries.length} selected</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {COUNTRIES.map((c, i) => (
                            <motion.button
                              key={c.v}
                              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.025 }}
                              onClick={() => toggleCountry(c.v)}
                              className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-sm font-medium border transition-all hover:scale-[1.04] ${
                                targetCountries.includes(c.v)
                                  ? "bg-gradient-to-br from-amber-300 to-amber-400 text-slate-900 border-amber-300 shadow-lg shadow-amber-500/25"
                                  : "bg-white/[0.03] text-white border-white/12 hover:border-white/25 hover:bg-white/[0.07] backdrop-blur-md"
                              }`}
                            >
                              <span>{c.f}</span>{c.v}
                            </motion.button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">Intended major</label>
                        <Input value={major} onChange={e => setMajor(e.target.value)} placeholder="e.g. Computer Science, Economics"
                          className="bg-white/[0.04] border-white/15 text-white placeholder:text-white/25 h-12 text-base backdrop-blur-md focus-visible:border-amber-300/50 focus-visible:bg-white/[0.06]" />
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">Budget</label>
                          <Select value={budget} onValueChange={setBudget}>
                            <SelectTrigger className="bg-white/[0.04] border-white/15 text-white h-12 backdrop-blur-md data-[placeholder]:text-white/25"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              {["Under $5,000/year", "$5,000–$15,000/year", "$15,000–$30,000/year", "$30,000+/year", "Full scholarship needed"].map(b => (
                                <SelectItem key={b} value={b}>{b}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">Need scholarship?</label>
                          <Select value={scholarshipNeeded} onValueChange={setScholarshipNeeded}>
                            <SelectTrigger className="bg-white/[0.04] border-white/15 text-white h-12 backdrop-blur-md data-[placeholder]:text-white/25"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="yes">Yes</SelectItem>
                              <SelectItem value="no">No</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">Timeline</label>
                        <Select value={timeline} onValueChange={setTimeline}>
                          <SelectTrigger className="bg-white/[0.04] border-white/15 text-white h-12 backdrop-blur-md data-[placeholder]:text-white/25"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Fall 2026">Fall 2026</SelectItem>
                            <SelectItem value="Fall 2027">Fall 2027</SelectItem>
                            <SelectItem value="Flexible">Flexible</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Button variant="gold" size="lg" disabled={!isStep2Valid} onClick={() => setStep(3)}
                      className="mt-10 px-12 gap-2 text-base shadow-xl shadow-amber-500/25">
                      Continue <ArrowRight className="h-5 w-5" />
                    </Button>
                  </motion.div>
                )}

                {/* Step 3 — Priorities */}
                {step === 3 && (
                  <motion.div key="s3" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.5 }}
                    className="flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-xl mx-auto w-full relative z-10">
                    <div className="w-full text-center mb-10">
                      <p className="text-amber-300/80 text-xs font-semibold uppercase tracking-[0.25em] mb-5">Step 3 · Priorities</p>
                      <h2 className="font-heading text-[clamp(2rem,5vw,3.25rem)] font-bold text-white tracking-[-0.025em] leading-[1.05] mb-4">
                        What matters most?
                      </h2>
                      <p className="text-white/50 text-base">Drag each slider to weight your priorities.</p>
                    </div>

                    <div className="w-full space-y-4">
                      {[
                        { label: "Prestige",            value: prestige,     set: setPrestige,     icon: GraduationCap, low: "Any school",     high: "Top 50 only"  },
                        { label: "Scholarship",         value: scholarship,  set: setScholarship,  icon: Shield,         low: "Self-fund OK",   high: "Must be free"  },
                        { label: "Career ROI",          value: careerRoi,    set: setCareerRoi,    icon: Target,         low: "Open-ended",     high: "Top 1% jobs"   },
                        { label: "Visa accessibility",  value: visaAccess,   set: setVisaAccess,   icon: CheckCircle2,   low: "Don't mind",     high: "Easy access"   },
                        { label: "Location preference", value: locationPref, set: setLocationPref, icon: MapPin,         low: "Anywhere",       high: "Specific city" },
                      ].map((item, i) => (
                        <motion.div key={item.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                          className="bg-white/[0.03] border border-white/10 backdrop-blur-md rounded-2xl p-5 hover:border-white/20 transition-colors">
                          <div className="flex items-center justify-between mb-3.5">
                            <div className="flex items-center gap-2.5">
                              <item.icon className="h-4 w-4 text-amber-300" />
                              <span className="text-sm font-semibold text-white">{item.label}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {[1, 2, 3, 4, 5].map(n => (
                                <span key={n} className={`h-1.5 w-1.5 rounded-full transition-colors ${n <= item.value[0] ? "bg-amber-300" : "bg-white/15"}`} />
                              ))}
                              <span className="text-xs font-bold text-amber-300 tabular-nums ml-1.5">{item.value[0]}/5</span>
                            </div>
                          </div>
                          <Slider min={1} max={5} step={1} value={item.value} onValueChange={item.set} className="w-full" />
                          <div className="flex justify-between mt-2.5 text-[11px] text-white/40 font-medium">
                            <span>{item.low}</span>
                            <span>{item.high}</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    <Button variant="gold" size="lg" onClick={() => setScreen("dashboard")}
                      className="mt-10 px-12 gap-2 text-base shadow-2xl shadow-amber-500/40">
                      <Sparkles className="h-5 w-5" /> Generate my pathway
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ═══ DASHBOARD ═══ */}
          {screen === "dashboard" && (
            <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
              <TopUniDashboard
                profile={profile}
                language="en"
                onBack={() => setScreen("landing")}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
    </div>
  );
};

export default TopUniAI;
