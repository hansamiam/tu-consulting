import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navigation from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ArrowLeft, Sparkles, Download, Phone, GraduationCap, Target, Shield, CheckCircle2 } from "lucide-react";

type Screen = "landing" | "intake" | "results";

const COUNTRIES = ["United States", "United Kingdom", "Canada", "Germany", "South Korea", "China", "Netherlands", "Czech Republic", "Turkey", "Malaysia"];

const UNIVERSITY_DATA: Record<string, { stretch: string[]; target: string[]; safety: string[] }> = {
  "United States": { stretch: ["Stanford University", "MIT", "Columbia University"], target: ["University of Michigan", "Boston University", "Purdue University"], safety: ["Arizona State University", "University of Oregon", "SUNY Buffalo"] },
  "United Kingdom": { stretch: ["University of Oxford", "Imperial College London", "UCL"], target: ["University of Edinburgh", "University of Manchester", "King's College London"], safety: ["University of Leeds", "University of Exeter", "Queen Mary University"] },
  "Canada": { stretch: ["University of Toronto", "McGill University", "UBC"], target: ["University of Alberta", "Western University", "Queen's University"], safety: ["University of Manitoba", "Carleton University", "Brock University"] },
  "Germany": { stretch: ["TU Munich", "LMU Munich", "Heidelberg University"], target: ["RWTH Aachen", "University of Freiburg", "TU Berlin"], safety: ["University of Cologne", "University of Stuttgart", "University of Bremen"] },
  "South Korea": { stretch: ["Seoul National University", "KAIST", "Yonsei University"], target: ["Korea University", "Hanyang University", "Sogang University"], safety: ["Kyung Hee University", "Inha University", "Chung-Ang University"] },
  "China": { stretch: ["Tsinghua University", "Peking University", "Fudan University"], target: ["Zhejiang University", "Shanghai Jiao Tong University", "Nanjing University"], safety: ["Wuhan University", "Sun Yat-sen University", "Xiamen University"] },
  "Netherlands": { stretch: ["University of Amsterdam", "Delft University", "Leiden University"], target: ["Utrecht University", "Erasmus University", "University of Groningen"], safety: ["Tilburg University", "Maastricht University", "VU Amsterdam"] },
  "Czech Republic": { stretch: ["Charles University", "Czech Technical University", "Masaryk University"], target: ["Brno University of Technology", "Palacký University", "University of Pardubice"], safety: ["University of Ostrava", "Mendel University", "Silesian University"] },
  "Turkey": { stretch: ["Koç University", "Sabancı University", "Bilkent University"], target: ["Boğaziçi University", "METU", "Istanbul Technical University"], safety: ["Ankara University", "Hacettepe University", "Ege University"] },
  "Malaysia": { stretch: ["University of Malaya", "Universiti Kebangsaan Malaysia", "Universiti Putra Malaysia"], target: ["Universiti Sains Malaysia", "UTM", "Taylor's University"], safety: ["UCSI University", "Sunway University", "Multimedia University"] },
};

const TopUniAI = () => {
  const [screen, setScreen] = useState<Screen>("landing");
  const [step, setStep] = useState(1);

  // Step 1
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [gpa, setGpa] = useState("");
  const [ielts, setIelts] = useState("");
  const [sat, setSat] = useState("");

  // Step 2
  const [targetCountries, setTargetCountries] = useState<string[]>([]);
  const [major, setMajor] = useState("");
  const [budget, setBudget] = useState("");
  const [scholarshipNeeded, setScholarshipNeeded] = useState("");
  const [timeline, setTimeline] = useState("");

  // Step 3
  const [prestige, setPrestige] = useState([3]);
  const [scholarship, setScholarship] = useState([3]);
  const [careerRoi, setCareerRoi] = useState([3]);
  const [visaAccess, setVisaAccess] = useState([3]);
  const [locationPref, setLocationPref] = useState([3]);

  const toggleCountry = (country: string) => {
    setTargetCountries(prev =>
      prev.includes(country) ? prev.filter(c => c !== country) : [...prev, country]
    );
  };

  const primaryCountry = targetCountries[0] || "United States";
  const unis = UNIVERSITY_DATA[primaryCountry] || UNIVERSITY_DATA["United States"];

  const generateSummary = () => {
    const countryList = targetCountries.length > 0 ? targetCountries.join(", ") : "your selected regions";
    const scholarshipText = scholarshipNeeded === "yes" ? "A scholarship-focused strategy is recommended." : "Your budget allows for a broader range of institutions.";
    return `Based on your academic profile (GPA: ${gpa || "N/A"}${ielts ? `, IELTS: ${ielts}` : ""}${sat ? `, SAT: ${sat}` : ""}) and preferences, you are competitive for mid-tier to high-ranking institutions in ${countryList}. ${scholarshipText} We recommend a balanced application strategy across reach, target, and safety tiers.`;
  };

  const ieltsTarget = ielts ? (parseFloat(ielts) < 7 ? "7.0+" : "7.5+") : "7.0+";

  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.4 },
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation language="en" />

      {/* Coming Soon Banner */}
      <div className="bg-primary text-primary-foreground text-center py-2 text-sm font-medium tracking-wide">
        <Sparkles className="inline-block w-4 h-4 mr-2 text-accent" />
        Launching Soon — Early Access Prototype
        <Sparkles className="inline-block w-4 h-4 ml-2 text-accent" />
      </div>

      <AnimatePresence mode="wait">
        {screen === "landing" && (
          <motion.div key="landing" {...fadeIn} className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
            <div className="max-w-2xl mx-auto space-y-8">
              <div className="space-y-2">
                <h1 className="text-5xl md:text-6xl font-heading font-bold text-foreground tracking-tight">
                  TopUni <span className="text-accent">AI</span>
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground max-w-lg mx-auto leading-relaxed">
                  Intelligent pathway planning for ambitious students.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button variant="gold" size="lg" className="text-base px-8" onClick={() => setScreen("intake")}>
                  Start Your Plan <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
              <a href="/topuni-ai/partners" className="text-sm text-muted-foreground hover:text-accent transition-colors underline underline-offset-4 cursor-pointer inline-block">
                For University Partners →
              </a>
            </div>
          </motion.div>
        )}

        {screen === "intake" && (
          <motion.div key="intake" {...fadeIn} className="max-w-2xl mx-auto px-4 py-12">
            {/* Progress */}
            <div className="flex items-center justify-center gap-2 mb-10">
              {[1, 2, 3].map(s => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${s <= step ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}>
                    {s}
                  </div>
                  {s < 3 && <div className={`w-12 h-0.5 ${s < step ? "bg-accent" : "bg-muted"}`} />}
                </div>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div key="step1" {...fadeIn} className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-heading font-bold text-foreground">Academic Profile</h2>
                    <p className="text-muted-foreground text-sm mt-1">Tell us about your academic background.</p>
                  </div>
                  <div className="grid gap-5">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Full Name *</Label><Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Enter your full name" /></div>
                      <div className="space-y-2"><Label>Email *</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" /></div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>WhatsApp</Label><Input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="+996..." /></div>
                      <div className="space-y-2">
                        <Label>Current Grade Level *</Label>
                        <Select value={gradeLevel} onValueChange={setGradeLevel}>
                          <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                          <SelectContent>
                            {["9th Grade", "10th Grade", "11th Grade", "12th Grade", "Gap Year", "University Transfer"].map(g => (
                              <SelectItem key={g} value={g}>{g}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-3 gap-4">
                      <div className="space-y-2"><Label>GPA *</Label><Input value={gpa} onChange={e => setGpa(e.target.value)} placeholder="e.g. 3.7" /></div>
                      <div className="space-y-2"><Label>IELTS Score</Label><Input value={ielts} onChange={e => setIelts(e.target.value)} placeholder="Optional" /></div>
                      <div className="space-y-2"><Label>SAT Score</Label><Input value={sat} onChange={e => setSat(e.target.value)} placeholder="Optional" /></div>
                    </div>
                  </div>
                  <div className="flex justify-end pt-4">
                    <Button variant="gold" onClick={() => setStep(2)}>Next <ArrowRight className="ml-2 w-4 h-4" /></Button>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="step2" {...fadeIn} className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-heading font-bold text-foreground">Preferences</h2>
                    <p className="text-muted-foreground text-sm mt-1">Where and what do you want to study?</p>
                  </div>
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label>Target Countries *</Label>
                      <div className="flex flex-wrap gap-2">
                        {COUNTRIES.map(c => (
                          <button key={c} onClick={() => toggleCountry(c)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${targetCountries.includes(c) ? "bg-accent text-accent-foreground border-accent" : "bg-background text-muted-foreground border-border hover:border-accent/50"}`}>
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2"><Label>Intended Major *</Label><Input value={major} onChange={e => setMajor(e.target.value)} placeholder="e.g. Computer Science, Economics" /></div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Budget Range</Label>
                        <Select value={budget} onValueChange={setBudget}>
                          <SelectTrigger><SelectValue placeholder="Select budget" /></SelectTrigger>
                          <SelectContent>
                            {["Under $5,000/year", "$5,000–$15,000/year", "$15,000–$30,000/year", "$30,000+/year", "Full scholarship needed"].map(b => (
                              <SelectItem key={b} value={b}>{b}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Scholarship Needed?</Label>
                        <Select value={scholarshipNeeded} onValueChange={setScholarshipNeeded}>
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="yes">Yes</SelectItem>
                            <SelectItem value="no">No</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Timeline</Label>
                      <Select value={timeline} onValueChange={setTimeline}>
                        <SelectTrigger><SelectValue placeholder="Select timeline" /></SelectTrigger>
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
                    <Button variant="gold" onClick={() => setStep(3)}>Next <ArrowRight className="ml-2 w-4 h-4" /></Button>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div key="step3" {...fadeIn} className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-heading font-bold text-foreground">Your Goals</h2>
                    <p className="text-muted-foreground text-sm mt-1">Rank what matters most to you (1 = low, 5 = high).</p>
                  </div>
                  <div className="space-y-6">
                    {[
                      { label: "Prestige", value: prestige, set: setPrestige, icon: <GraduationCap className="w-4 h-4" /> },
                      { label: "Scholarship", value: scholarship, set: setScholarship, icon: <Shield className="w-4 h-4" /> },
                      { label: "Career ROI", value: careerRoi, set: setCareerRoi, icon: <Target className="w-4 h-4" /> },
                      { label: "Visa Accessibility", value: visaAccess, set: setVisaAccess, icon: <CheckCircle2 className="w-4 h-4" /> },
                      { label: "Location Preference", value: locationPref, set: setLocationPref, icon: <ArrowRight className="w-4 h-4" /> },
                    ].map(item => (
                      <div key={item.label} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="flex items-center gap-2">{item.icon} {item.label}</Label>
                          <span className="text-sm font-semibold text-accent">{item.value[0]}/5</span>
                        </div>
                        <Slider min={1} max={5} step={1} value={item.value} onValueChange={item.set} className="w-full" />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between pt-4">
                    <Button variant="outline" onClick={() => setStep(2)}><ArrowLeft className="mr-2 w-4 h-4" /> Back</Button>
                    <Button variant="gold" size="lg" onClick={() => setScreen("results")}>
                      <Sparkles className="mr-2 w-5 h-5" /> Generate My Pathway
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {screen === "results" && (
          <motion.div key="results" {...fadeIn} className="max-w-3xl mx-auto px-4 py-12 space-y-10">
            <div className="text-center space-y-2">
              <Badge className="bg-accent/10 text-accent border-accent/30 mb-4">AI-Generated Pathway</Badge>
              <h1 className="text-3xl md:text-4xl font-heading font-bold text-foreground">Your Recommended Pathway</h1>
            </div>

            {/* Strategy Summary */}
            <Card className="border-accent/20 bg-accent/5">
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-accent" /> Strategy Summary</CardTitle></CardHeader>
              <CardContent><p className="text-muted-foreground leading-relaxed">{generateSummary()}</p></CardContent>
            </Card>

            {/* University Tiers */}
            <div className="space-y-4">
              <h2 className="text-xl font-heading font-bold text-foreground">Suggested University Tiers</h2>
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { tier: "Stretch Schools", list: unis.stretch, color: "border-destructive/30 bg-destructive/5" },
                  { tier: "Target Schools", list: unis.target, color: "border-accent/30 bg-accent/5" },
                  { tier: "Safety Schools", list: unis.safety, color: "border-green-500/30 bg-green-500/5" },
                ].map(t => (
                  <Card key={t.tier} className={t.color}>
                    <CardHeader className="pb-3"><CardTitle className="text-base">{t.tier}</CardTitle></CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {t.list.map(u => (
                          <li key={u} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <GraduationCap className="w-4 h-4 mt-0.5 text-accent shrink-0" />{u}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Next Actions */}
            <Card>
              <CardHeader><CardTitle className="text-lg">Next Actions</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {[
                    `Improve IELTS to ${ieltsTarget} band`,
                    "Prepare application essays with professional guidance",
                    "Shortlist 8 programs across tiers",
                    "Book a 1-on-1 strategy session with our team",
                  ].map((a, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 text-accent shrink-0" />{a}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button variant="gold" size="lg" onClick={() => window.open("https://wa.me/996555123456", "_blank")}>
                <Phone className="mr-2 w-5 h-5" /> Book Strategy Call
              </Button>
              <Button variant="outline" size="lg">
                <Download className="mr-2 w-5 h-5" /> Download My Report (PDF)
              </Button>
            </div>
            <div className="text-center">
              <button onClick={() => { setScreen("landing"); setStep(1); }} className="text-sm text-muted-foreground hover:text-accent underline underline-offset-4">
                ← Start Over
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer language="en" />
    </div>
  );
};

export default TopUniAI;
