import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Globe2, Plane, FileCheck, Clock, DollarSign, AlertTriangle,
  CheckCircle2, MapPin, Info, ChevronDown, ChevronUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface VisaGuideProps {
  profile: {
    targetCountries: string[];
  };
  language: "en" | "ru";
}

interface VisaInfo {
  country: string;
  flag: string;
  visaType: string;
  processingTime: string;
  cost: string;
  difficulty: "easy" | "moderate" | "hard";
  postStudyWork: string;
  requirements: string[];
  steps: string[];
  tips: string[];
  commonMistakes: string[];
}

const visaDatabase: VisaInfo[] = [
  {
    country: "United States", flag: "🇺🇸", visaType: "F-1 Student Visa",
    processingTime: "3-5 months", cost: "$350 (SEVIS) + $185 (visa fee)",
    difficulty: "hard",
    postStudyWork: "OPT: 12 months (36 months for STEM)",
    requirements: ["I-20 from university", "DS-160 form", "Proof of finances", "SEVIS fee receipt", "Valid passport", "Passport photo"],
    steps: ["Receive I-20 from university", "Pay SEVIS fee ($350)", "Complete DS-160 online", "Schedule visa interview", "Attend interview at US Embassy", "Wait for visa processing"],
    tips: ["Schedule interview ASAP — wait times can be months", "Prepare financial proof covering full program", "Practice common interview questions", "Bring all original documents"],
    commonMistakes: ["Scheduling interview too late", "Insufficient financial documentation", "Not demonstrating ties to home country", "Incomplete DS-160 form"],
  },
  {
    country: "United Kingdom", flag: "🇬🇧", visaType: "Student Visa (Tier 4)",
    processingTime: "3-6 weeks", cost: "£490 + IHS surcharge (£776/year)",
    difficulty: "moderate",
    postStudyWork: "Graduate Route: 2 years (3 for PhD)",
    requirements: ["CAS from university", "Proof of funds", "English proficiency", "TB test (some countries)", "Valid passport"],
    steps: ["Receive CAS from university", "Gather financial evidence", "Complete online application", "Book biometrics appointment", "Attend appointment", "Wait for decision"],
    tips: ["Apply up to 6 months before course start", "Funds must be held for 28 consecutive days", "IHS is mandatory — budget for it", "Graduate Route allows 2 years post-study work"],
    commonMistakes: ["Not holding funds for 28 days", "Missing TB test certificate", "Applying with expired passport", "Wrong financial evidence format"],
  },
  {
    country: "Canada", flag: "🇨🇦", visaType: "Study Permit",
    processingTime: "4-16 weeks", cost: "CAD $150",
    difficulty: "moderate",
    postStudyWork: "PGWP: Up to 3 years",
    requirements: ["Acceptance letter (DLI)", "Proof of funds", "Quebec: CAQ", "Police certificate", "Medical exam", "Valid passport"],
    steps: ["Get acceptance from DLI", "Gather documents", "Apply online via IRCC", "Biometrics collection", "Medical exam if required", "Wait for decision"],
    tips: ["Processing times vary hugely by country", "PGWP is one of the best post-study work permits globally", "Apply as early as possible", "Consider SDS stream for faster processing"],
    commonMistakes: ["Not checking if institution is a DLI", "Underestimating processing time", "Insufficient proof of funds", "Missing police clearance"],
  },
  {
    country: "Germany", flag: "🇩🇪", visaType: "Student Visa (§16b)",
    processingTime: "6-12 weeks", cost: "€75",
    difficulty: "moderate",
    postStudyWork: "18-month job search visa",
    requirements: ["University admission letter", "Blocked account (€11,904/year)", "Health insurance", "Language proficiency", "Valid passport"],
    steps: ["Get admission letter", "Open blocked account", "Arrange health insurance", "Book embassy appointment", "Attend interview", "Wait for visa"],
    tips: ["Blocked account is mandatory — open it early", "Many programs are tuition-free", "Learn basic German even for English programs", "18-month post-study job search visa is generous"],
    commonMistakes: ["Not opening blocked account in time", "Booking embassy appointment too late", "Insufficient health insurance coverage", "Missing apostilled documents"],
  },
  {
    country: "South Korea", flag: "🇰🇷", visaType: "D-2 Student Visa",
    processingTime: "2-4 weeks", cost: "$50-80",
    difficulty: "easy",
    postStudyWork: "D-10 job-seeking visa (6 months)",
    requirements: ["Admission letter", "Financial proof", "Degree certificates", "Health check", "Valid passport"],
    steps: ["Receive admission", "Prepare documents", "Apply at Korean embassy", "Submit biometrics", "Wait for approval"],
    tips: ["One of the faster visa processes", "TOPIK score helps but not always required", "Part-time work allowed after 6 months", "Apply for ARC upon arrival"],
    commonMistakes: ["Not registering for ARC within 90 days", "Forgetting apostille on documents", "Not arranging housing before arrival"],
  },
  {
    country: "Netherlands", flag: "🇳🇱", visaType: "MVV + Residence Permit",
    processingTime: "2-4 weeks (university applies)", cost: "€210",
    difficulty: "easy",
    postStudyWork: "Orientation Year: 1 year",
    requirements: ["Admission letter", "Proof of funds", "Health insurance", "University handles MVV"],
    steps: ["University initiates MVV", "Provide documents to uni", "University submits to IND", "Collect MVV at embassy", "Register in Netherlands"],
    tips: ["University handles most of the process", "One of the easiest EU visa processes", "Orientation year permit is automatic", "Register with municipality within 5 days"],
    commonMistakes: ["Not registering at municipality", "Missing proof of sufficient funds", "Not arranging housing before arrival"],
  },
];

const difficultyConfig = {
  easy: { color: "bg-green-500/10 text-green-500 border-green-500/30", label: "Easy" },
  moderate: { color: "bg-amber-500/10 text-amber-500 border-amber-500/30", label: "Moderate" },
  hard: { color: "bg-destructive/10 text-destructive border-destructive/30", label: "Hard" },
};

const VisaGuide = ({ profile, language }: VisaGuideProps) => {
  const isRu = language === "ru";
  const t = (en: string, ru: string) => isRu ? ru : en;
  const [expandedCountry, setExpandedCountry] = useState<string | null>(null);

  const relevant = useMemo(() => {
    if (profile.targetCountries.length === 0) return visaDatabase;
    const matched = visaDatabase.filter(v => profile.targetCountries.some(c => v.country.includes(c)));
    if (matched.length === 0) return visaDatabase;
    return matched;
  }, [profile.targetCountries]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plane className="w-5 h-5 text-accent" />
          {t("Visa Guide", "Визовый гид")}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{t("Step-by-step visa guidance for your target countries", "Пошаговое руководство по визам для ваших стран")}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {relevant.map((visa) => {
          const expanded = expandedCountry === visa.country;
          const dc = difficultyConfig[visa.difficulty];
          return (
            <Card key={visa.country} className="transition-all hover:shadow-sm">
              <CardContent className="p-0">
                <button className="w-full p-4 flex items-center gap-3 text-left" onClick={() => setExpandedCountry(expanded ? null : visa.country)}>
                  <span className="text-2xl">{visa.flag}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm">{visa.country}</p>
                    <p className="text-xs text-muted-foreground">{visa.visaType}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className={`text-[10px] ${dc.color}`}>{dc.label}</Badge>
                    <Badge variant="outline" className="text-[10px] gap-1"><Clock className="h-2.5 w-2.5" />{visa.processingTime}</Badge>
                    {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </button>
                <AnimatePresence>
                  {expanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          <div className="p-2 rounded bg-muted/50">
                            <p className="text-[10px] text-muted-foreground">{t("Cost", "Стоимость")}</p>
                            <p className="text-sm font-medium text-foreground">{visa.cost}</p>
                          </div>
                          <div className="p-2 rounded bg-muted/50">
                            <p className="text-[10px] text-muted-foreground">{t("Processing", "Обработка")}</p>
                            <p className="text-sm font-medium text-foreground">{visa.processingTime}</p>
                          </div>
                          <div className="p-2 rounded bg-green-500/5 border border-green-500/10 col-span-2 md:col-span-1">
                            <p className="text-[10px] text-green-500">{t("Post-Study Work", "Работа после учёбы")}</p>
                            <p className="text-sm font-medium text-foreground">{visa.postStudyWork}</p>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1"><FileCheck className="h-3.5 w-3.5 text-accent" /> {t("Requirements", "Требования")}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {visa.requirements.map((r, i) => <Badge key={i} variant="secondary" className="text-[10px]">{r}</Badge>)}
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-blue-500" /> {t("Steps", "Шаги")}</p>
                          <ol className="space-y-1.5">
                            {visa.steps.map((s, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                                <span className="w-5 h-5 rounded-full bg-accent/10 text-accent text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                                {s}
                              </li>
                            ))}
                          </ol>
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> {t("Pro Tips", "Советы")}</p>
                          <ul className="space-y-1">
                            {visa.tips.map((tip, i) => <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">• {tip}</li>)}
                          </ul>
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5 text-destructive" /> {t("Common Mistakes", "Частые ошибки")}</p>
                          <ul className="space-y-1">
                            {visa.commonMistakes.map((m, i) => <li key={i} className="text-xs text-destructive/80 flex items-start gap-1.5">✗ {m}</li>)}
                          </ul>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default VisaGuide;
