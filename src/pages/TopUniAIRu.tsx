import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navigation from "@/components/Navigation";
import { BetaBanner } from "@/components/BetaBanner";
import { TopUniAIEntrance } from "@/components/topuni/TopUniAIEntrance";
import { Footer } from "@/components/Footer";
import topuniBg from "@/assets/topuni-bg.jpg";
import TopUniDashboard from "@/components/TopUniDashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, ArrowLeft, Award, GraduationCap, Target, Shield, CheckCircle2, Bot, Search, PenTool, BookOpen, Crown, Lock, ChevronDown, ChevronUp } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { saveProfile } from "@/components/discover/DiscoverProfileGate";
import { projectToDiscoverProfile } from "@/lib/topuniIntakeProjection";

// 'landing' retired round 10 — page opens directly into intake.
type Screen = "intake" | "dashboard" | "chat-only";

const COUNTRIES_RU = [
  "США", "Великобритания", "Канада", "Австралия",
  "Германия", "Франция", "Нидерланды", "Швейцария", "Ирландия",
  "Швеция", "Норвегия", "Дания", "Италия", "Испания", "Бельгия",
  "Сингапур", "Южная Корея", "Япония", "Гонконг", "Китай",
  "Новая Зеландия", "ОАЭ",
  "Чехия", "Венгрия", "Польша", "Эстония",
  "Турция", "Малайзия",
];
const COUNTRY_MAP: Record<string, string> = {
  "США": "United States", "Великобритания": "United Kingdom", "Канада": "Canada", "Австралия": "Australia",
  "Германия": "Germany", "Франция": "France", "Нидерланды": "Netherlands", "Швейцария": "Switzerland", "Ирландия": "Ireland",
  "Швеция": "Sweden", "Норвегия": "Norway", "Дания": "Denmark", "Италия": "Italy", "Испания": "Spain", "Бельгия": "Belgium",
  "Сингапур": "Singapore", "Южная Корея": "South Korea", "Япония": "Japan", "Гонконг": "Hong Kong", "Китай": "China",
  "Новая Зеландия": "New Zealand", "ОАЭ": "United Arab Emirates",
  "Чехия": "Czech Republic", "Венгрия": "Hungary", "Польша": "Poland", "Эстония": "Estonia",
  "Турция": "Turkey", "Малайзия": "Malaysia",
};
// Reverse map: EN canonical → RU display label. Used when hub-context
// arrives carrying EN country names (from SharedBrief / ScholarshipsByFilter)
// so we can prefill the RU button selection — otherwise the user sees a
// blank country list with the data sitting silently in EN form.
const COUNTRY_MAP_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(COUNTRY_MAP).map(([ru, en]) => [en, ru]),
);

const TopUniAIRu = () => {
  const navigate = useNavigate();
  // Landing retired round 10 — opens directly into intake. Mirror EN.
  const [screen, setScreen] = useState<Screen>("intake");
  const [step, setStep] = useState(1);
  // Direction-aware step transition — mirrors the EN page so going
  // forward slides the next step in from the right and going back
  // slides the previous step in from the left. Without this, "Back"
  // felt jumpy because every step entered with the same animation
  // regardless of direction.
  const [stepDir, setStepDir] = useState<1 | -1>(1);
  const goToStep = (next: number) => {
    setStepDir(next > step ? 1 : -1);
    setStep(next);
  };
  const stepEnter = { x: stepDir * 24, opacity: 0 };
  const stepExit = { x: -stepDir * 24, opacity: 0 };
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [nationality, setNationality] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [gpa, setGpa] = useState("");
  const [ielts, setIelts] = useState("");
  const [toefl, setToefl] = useState("");
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

  // Pro depth fields — mirror the EN page's upsell axis. Free flow
  // stays a quick 3-step wizard; Pro members open the disclosure on
  // step 3 and add three richer prompts that the brief weaves into
  // positioning + at least one essay angle's anchor.
  const [topActivity, setTopActivity] = useState("");
  const [personalStory, setPersonalStory] = useState("");
  const [namedSchools, setNamedSchools] = useState("");
  const [depthOpen, setDepthOpen] = useState(false);
  const { subscription } = useAuth();
  const isPro = subscription.is_active || subscription.is_founding_member;

  const toggleCountry = (country: string) => {
    setTargetCountries(prev => prev.includes(country) ? prev.filter(c => c !== country) : [...prev, country]);
  };

  /* Drain a topuni-hub-context payload set by an upstream hub (a
   * Russian SharedBrief recipient, a country/field/theme hub page,
   * or a scholarship detail handoff). The EN /topuni-ai page already
   * does this via a parallel block; the RU page was silently
   * dropping every prefill before round 60.
   *
   * Country prefills arrive in EN canonical form ("Germany") — we
   * reverse-map them to the RU display label ("Германия") so the
   * button-row selection actually highlights what the user expects. */
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("topuni-hub-context");
      if (!raw) return;
      sessionStorage.removeItem("topuni-hub-context");
      const payload = JSON.parse(raw) as {
        kind?: "country" | "field" | "theme" | "scholarship" | "shared-brief";
        country?: string;
        countries?: string[];
        field?: string;
        gradeLevel?: string;
        theme?: string;
        label?: string;
        ts?: number;
      };
      if (typeof payload?.ts === "number" && Date.now() - payload.ts > 5 * 60_000) return;
      const toRu = (en: string): string => COUNTRY_MAP_REVERSE[en] || en;
      if (payload.kind === "country" && payload.country) {
        const ruName = toRu(payload.country);
        setTargetCountries(prev => (prev.includes(ruName) ? prev : [...prev, ruName]));
      } else if (payload.kind === "field" && payload.field) {
        setMajor(prev => prev || payload.field!);
      } else if (payload.kind === "shared-brief") {
        if (Array.isArray(payload.countries) && payload.countries.length > 0) {
          setTargetCountries(prev => {
            const merged = [...prev];
            for (const c of payload.countries!) {
              const ruName = toRu(c);
              if (!merged.includes(ruName)) merged.push(ruName);
            }
            return merged;
          });
        }
        if (payload.field) setMajor(prev => prev || payload.field!);
        if (payload.gradeLevel) setGradeLevel(prev => prev || payload.gradeLevel!);
      } else if (payload.kind === "theme" && payload.theme) {
        if (payload.theme === "full-funding") {
          setBudget("Нужна полная стипендия");
          setScholarship([5]);
        } else if (payload.theme === "closing-soon") {
          setTimeline("Осень 2026");
        } else if (payload.theme === "high-value") {
          setScholarship(prev => (prev[0] >= 4 ? prev : [4]));
        }
      } else if (payload.kind === "scholarship" && payload.country) {
        const ruName = toRu(payload.country);
        setTargetCountries(prev => (prev.includes(ruName) ? prev : [...prev, ruName]));
      }
    } catch { /* ignore */ }
  }, []);

  const mappedCountries = targetCountries.map(c => COUNTRY_MAP[c] || c);

  const profile = {
    fullName, email, whatsapp, nationality, gradeLevel, gpa, ielts, toefl, sat,
    targetCountries: mappedCountries, major, budget, scholarshipNeeded, timeline,
    prestige: prestige[0], scholarship: scholarship[0],
    careerRoi: careerRoi[0], visaAccess: visaAccess[0], locationPref: locationPref[0],
    // Pro depth fields — empty for free users; populated when a Pro
    // member opens the depth disclosure on step 3.
    topActivity, personalStory, namedSchools,
  };

  // Step transitions are direction-aware (see stepEnter/stepExit
   // above). The remaining fadeIn helper is for the chat-only and
   // dashboard screen-level fades — those don't have a "previous"
   // sibling to slide against, so a vertical drop-in still reads
   // right. Step branches build their motion props from
   // stepEnter / stepExit directly.
  const fadeIn = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -20 }, transition: { duration: 0.4 } };
  const stepFade = { initial: stepEnter, animate: { opacity: 1, x: 0 }, exit: stepExit, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } };

  return (
    <div className="min-h-screen bg-background relative">
      <div className="fixed inset-0 z-0 opacity-20" style={{ backgroundImage: `url(${topuniBg})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(2px)' }} />
      <TopUniAIEntrance language="ru" />
      <div className="relative z-10">
        <Navigation language="ru" />
        <BetaBanner language="ru" />

        <AnimatePresence mode="wait">

          {screen === "chat-only" && (
            <motion.div key="chat-only" {...fadeIn} className="max-w-3xl mx-auto px-4 py-8">
              <TopUniDashboard
                profile={{ ...profile, fullName: fullName || "Студент" }}
                language="ru"
                onBack={() => navigate("/ru")}
              />
            </motion.div>
          )}

          {screen === "intake" && (
            <motion.div key="intake" {...fadeIn} className="max-w-2xl mx-auto px-4 py-12">
              {/* Progress — three pills with named-step labels (Russian).
                  Mirror of the EN layout (numeric dots replaced with
                  the same labelled-pill pattern so the two pages feel
                  the same shape). */}
              <div className="flex items-start justify-center gap-3 mb-10">
                {[
                  { n: 1, label: "Профиль" },
                  { n: 2, label: "Цели" },
                  { n: 3, label: "Приоритеты" },
                ].map(s => {
                  const isActive = s.n === step;
                  const isDone = s.n < step;
                  return (
                    <div key={s.n} className="flex flex-col items-center gap-1.5 min-w-0">
                      <div className="h-1.5 w-14 sm:w-16 rounded-full overflow-hidden bg-border/60">
                        <motion.div
                          className="h-full bg-gold-dark"
                          initial={false}
                          animate={{ width: isDone ? "100%" : isActive ? "60%" : "0%" }}
                          transition={{ duration: 0.4, ease: "easeOut" }}
                        />
                      </div>
                      <span className={`text-[10px] uppercase tracking-[0.18em] font-semibold transition-colors ${
                        isActive ? "text-gold-dark" : isDone ? "text-foreground/70" : "text-muted-foreground/60"
                      }`}>
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div key="s1" {...stepFade} className="space-y-6">
                    <div><h2 className="text-2xl font-heading font-bold text-foreground">Академический профиль</h2><p className="text-muted-foreground text-sm mt-1">Расскажите о вашей академической подготовке.</p></div>
                    <div className="grid gap-5">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>ФИО *</Label><Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Ваше полное имя" /></div>
                        <div className="space-y-2"><Label>Email *</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" /></div>
                      </div>
                      <div className="space-y-2"><Label>Гражданство *</Label><Input value={nationality} onChange={e => setNationality(e.target.value)} placeholder="Любая страна (Казахстан, Россия, …)" /></div>
                      <div className="space-y-2">
                        <Label>Текущий этап *</Label>
                        <Select value={gradeLevel} onValueChange={setGradeLevel}><SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
                          <SelectContent>{[
                            "Старшая школа",
                            "Gap Year",
                            "Бакалавриат",
                            "Магистратура",
                            "PhD",
                            "Работаю",
                          ].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>GPA *</Label><Input value={gpa} onChange={e => setGpa(e.target.value)} placeholder="напр. 3.7" /></div>
                        <div className="space-y-2"><Label>IELTS</Label><Input value={ielts} onChange={e => setIelts(e.target.value)} placeholder="Необязательно" /></div>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>TOEFL</Label><Input value={toefl} onChange={e => setToefl(e.target.value)} placeholder="Необязательно" /></div>
                        <div className="space-y-2"><Label>SAT</Label><Input value={sat} onChange={e => setSat(e.target.value)} placeholder="Необязательно" /></div>
                      </div>
                    </div>
                    <div className="flex justify-end pt-4">
                      <Button
                        variant="gold"
                        onClick={() => goToStep(2)}
                        disabled={!fullName.trim() || !email.trim() || !nationality.trim() || !gradeLevel || !gpa.trim()}
                      >
                        Далее <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                )}
                {step === 2 && (
                  <motion.div key="s2" {...stepFade} className="space-y-6">
                    <div><h2 className="text-2xl font-heading font-bold text-foreground">Предпочтения</h2><p className="text-muted-foreground text-sm mt-1">Где и что вы хотите изучать?</p></div>
                    <div className="space-y-5">
                      <div className="space-y-2"><Label>Целевые страны *</Label>
                        <div className="flex flex-wrap gap-2">{COUNTRIES_RU.map(c => <button key={c} onClick={() => toggleCountry(c)} className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${targetCountries.includes(c) ? "bg-accent text-accent-foreground border-accent" : "bg-background text-muted-foreground border-border hover:border-accent/50"}`}>{c}</button>)}</div>
                      </div>
                      <div className="space-y-2"><Label>Специальность *</Label><Input value={major} onChange={e => setMajor(e.target.value)} placeholder="напр. Информатика, Экономика" /></div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Бюджет</Label>
                          <Select value={budget} onValueChange={setBudget}><SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
                            <SelectContent>{["До $5,000/год", "$5,000–$15,000/год", "$15,000–$30,000/год", "$30,000+/год", "Нужна полная стипендия"].map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2"><Label>Нужна стипендия?</Label>
                          <Select value={scholarshipNeeded} onValueChange={setScholarshipNeeded}><SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
                            <SelectContent><SelectItem value="yes">Да</SelectItem><SelectItem value="no">Нет</SelectItem></SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2"><Label>Сроки</Label>
                        <Select value={timeline} onValueChange={setTimeline}><SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
                          <SelectContent><SelectItem value="Осень 2026">Осень 2026</SelectItem><SelectItem value="Осень 2027">Осень 2027</SelectItem><SelectItem value="Гибко">Гибко</SelectItem></SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-between pt-4">
                      <Button variant="outline" onClick={() => goToStep(1)}><ArrowLeft className="mr-2 w-4 h-4" /> Назад</Button>
                      <Button
                        variant="gold"
                        onClick={() => goToStep(3)}
                        disabled={targetCountries.length === 0 || !major.trim()}
                      >
                        Далее <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                )}
                {step === 3 && (
                  <motion.div key="s3" {...stepFade} className="space-y-6">
                    <div><h2 className="text-2xl font-heading font-bold text-foreground">Ваши цели</h2><p className="text-muted-foreground text-sm mt-1">Оцените важность каждого фактора (1 = низкая, 5 = высокая).</p></div>
                    <div className="space-y-6">
                      {[
                        { label: "Престиж", value: prestige, set: setPrestige, icon: <GraduationCap className="w-4 h-4" /> },
                        { label: "Стипендия", value: scholarship, set: setScholarship, icon: <Shield className="w-4 h-4" /> },
                        { label: "Доступность визы", value: visaAccess, set: setVisaAccess, icon: <CheckCircle2 className="w-4 h-4" /> },
                      ].map(item => (
                        <div key={item.label} className="space-y-2">
                          <div className="flex items-center justify-between"><Label className="flex items-center gap-2">{item.icon} {item.label}</Label><span className="text-sm font-semibold text-accent">{item.value[0]}/5</span></div>
                          <Slider min={1} max={5} step={1} value={item.value} onValueChange={item.set} className="w-full" />
                        </div>
                      ))}
                    </div>

                    {/* ─── Pro depth disclosure (RU mirror of EN) ──
                        Free flow stays a 3-step wizard. Pro members
                        open the disclosure and add three richer
                        prompts — top achievement, personal story,
                        named schools — that the brief weaves into
                        positioning + at least one essay angle. */}
                    <div className="bg-card border border-border/70 rounded-xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => { if (isPro) setDepthOpen(o => !o); }}
                        className={`w-full flex items-center justify-between gap-3 px-5 py-3.5 text-left transition-colors ${
                          isPro ? "hover:bg-muted/30" : "cursor-default"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {isPro
                            ? <Crown className="w-4 h-4 text-gold-dark shrink-0" />
                            : <Lock className="w-4 h-4 text-muted-foreground shrink-0" />}
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground leading-tight">
                              {isPro ? "Углубить" : "Углубить · Pro"}
                            </p>
                            <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                              {isPro
                                ? "Три развёрнутых вопроса — отчёт впишет ответы в позиционирование и эссе-ракурсы."
                                : "Pro-члены добавляют три развёрнутых ответа — отчёт читается как написанный лично."}
                            </p>
                          </div>
                        </div>
                        {isPro ? (
                          depthOpen
                            ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                            : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                        ) : (
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => { e.stopPropagation(); navigate("/pricing/ru"); }}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); navigate("/pricing/ru"); } }}
                            className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-dark hover:text-foreground transition-colors shrink-0 inline-flex items-center gap-1 cursor-pointer"
                          >
                            Открыть <ArrowRight className="w-3 h-3" />
                          </span>
                        )}
                      </button>
                      {isPro && depthOpen && (
                        <div className="px-5 pb-5 pt-1 space-y-4 border-t border-border/60 bg-muted/10">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground/80">
                              Главное достижение
                            </Label>
                            <Input
                              value={topActivity}
                              onChange={(e) => setTopActivity(e.target.value)}
                              placeholder="напр. Создал клуб робототехники, 1-е место на национальных"
                              className="h-11"
                            />
                            <p className="text-[10px] text-muted-foreground">
                              Имя активности. Отчёт привяжет к ней хотя бы один эссе-ракурс.
                            </p>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground/80">
                              Ваша история
                            </Label>
                            <Textarea
                              value={personalStory}
                              onChange={(e) => setPersonalStory(e.target.value)}
                              placeholder="2-4 предложения вашими словами. Что вас сюда привело? Откуда вы? Какой момент стал переломным?"
                              rows={4}
                              className="resize-none"
                            />
                            <p className="text-[10px] text-muted-foreground">
                              Используется дословно в позиционировании когда ложится чисто. Пропустите если хотите чтобы AI выводил сам.
                            </p>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground/80">
                              Конкретные университеты в вашем списке
                            </Label>
                            <Input
                              value={namedSchools}
                              onChange={(e) => setNamedSchools(e.target.value)}
                              placeholder="напр. Stanford, ETH Zurich, NUS"
                              className="h-11"
                            />
                            <p className="text-[10px] text-muted-foreground">
                              Через запятую. Шорт-лист явно покажет их если они есть в базе.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between pt-4">
                      <Button variant="outline" onClick={() => goToStep(2)}><ArrowLeft className="mr-2 w-4 h-4" /> Назад</Button>
                      <Button
                        variant="gold"
                        size="lg"
                        onClick={() => {
                          // Seed Discover with the same profile so the
                          // Russian user never has to re-answer the
                          // wizard inside /discover/ru. saveProfile also
                          // fires the cross-device sync to
                          // student_profiles. This was the EN-only path
                          // until round 53 — RU users were silently
                          // skipping it before.
                          try {
                            saveProfile(projectToDiscoverProfile({
                              fullName, email, nationality, gradeLevel,
                              gpa, ielts, toefl, sat,
                              major: major.trim(),
                              budget,
                              targetCountries: mappedCountries,
                            }));
                          } catch { /* localStorage may be unavailable; brief still renders */ }
                          // Mirror EN: hand off Pro-depth answers from
                          // the Step 3 disclosure to the dashboard's
                          // proDepth store so the brief generator
                          // actually reads them.
                          if (isPro && (topActivity.trim() || personalStory.trim() || namedSchools.trim())) {
                            try {
                              localStorage.setItem(
                                "topuni-pro-depth-v1",
                                JSON.stringify({
                                  topActivity: topActivity.trim(),
                                  personalStory: personalStory.trim(),
                                  namedSchools: namedSchools.trim(),
                                }),
                              );
                            } catch { /* ignore */ }
                          }
                          setScreen("dashboard");
                        }}
                      >
                        <Award className="mr-2 w-5 h-5" /> Создать мой путь
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {screen === "dashboard" && (
            <motion.div key="dashboard" {...fadeIn}>
              <TopUniDashboard profile={profile} language="ru" onBack={() => navigate("/discover/ru")} />
            </motion.div>
          )}
        </AnimatePresence>

        {screen !== "dashboard" && screen !== "chat-only" && <Footer language="ru" />}
      </div>
    </div>
  );
};

export default TopUniAIRu;
