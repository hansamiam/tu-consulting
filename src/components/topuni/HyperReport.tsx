import { useState } from "react";
import { trackReportGenerated, trackAIInteraction } from "@/utils/analytics";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Crown, FileText, Lock, ArrowRight, BarChart3, Globe, BookOpen, Target, Users, Briefcase } from "lucide-react";
import { PaywallGate } from "@/components/auth/PaywallGate";
import ReactMarkdown from "react-markdown";

interface StudentProfile {
  fullName: string;
  gpa: string;
  ielts: string;
  sat: string;
  targetCountries: string[];
  major: string;
  budget: string;
  scholarshipNeeded: string;
  timeline: string;
  prestige: number;
  scholarship: number;
  careerRoi: number;
  visaAccess: number;
  locationPref: number;
}

interface HyperReportProps {
  profile: StudentProfile;
  language: "en" | "ru";
}

const REPORT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/topuni-ai-pathway`;

const HyperReport = ({ profile, language }: HyperReportProps) => {
  const isRu = language === "ru";
  const t = (en: string, ru: string) => isRu ? ru : en;
  
  const [basicReport, setBasicReport] = useState("");
  const [basicLoading, setBasicLoading] = useState(false);
  const [basicGenerated, setBasicGenerated] = useState(false);
  
  const [premiumReport, setPremiumReport] = useState("");
  const [premiumLoading, setPremiumLoading] = useState(false);
  const [premiumGenerated, setPremiumGenerated] = useState(false);

  const isProfileFilled = profile.fullName && profile.gpa && profile.targetCountries.length > 0;

  const streamSSE = async (url: string, body: any, onDelta: (chunk: string) => void, onDone: () => void) => {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok || !resp.body) {
      const errData = await resp.json().catch(() => ({}));
      onDelta(errData.error || "Something went wrong. Please try again.");
      onDone();
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let streamDone = false;

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });
      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") { streamDone = true; break; }
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }
    onDone();
  };

  const generateBasicReport = async () => {
    setBasicLoading(true);
    setBasicReport("");
    trackReportGenerated("basic");
    let soFar = "";
    await streamSSE(
      REPORT_URL,
      { profile, language, reportGrade: "basic" },
      (chunk) => { soFar += chunk; setBasicReport(soFar); },
      () => { setBasicLoading(false); setBasicGenerated(true); }
    );
  };

  const generatePremiumReport = async () => {
    setPremiumLoading(true);
    setPremiumReport("");
    trackReportGenerated("premium");
    let soFar = "";
    await streamSSE(
      REPORT_URL,
      { profile, language, reportGrade: "premium" },
      (chunk) => { soFar += chunk; setPremiumReport(soFar); },
      () => { setPremiumLoading(false); setPremiumGenerated(true); }
    );
  };

  if (!isProfileFilled) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm">{t("Complete your profile to generate reports.", "Заполните профиль для генерации отчётов.")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Report Tier Selection */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Basic Report */}
        <Card className="border-border hover:border-gold/40 transition-all">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{t("Standard Report", "Стандартный отчёт")}</h3>
                <p className="text-xs text-muted-foreground">{t("Quick overview & recommendations", "Быстрый обзор и рекомендации")}</p>
              </div>
            </div>
            
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              {[
                t("University recommendations (5-8)", "Рекомендации университетов (5-8)"),
                t("Basic fit analysis", "Базовый анализ совместимости"),
                t("Application timeline", "Таймлайн подачи"),
                t("Key requirements summary", "Основные требования"),
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>

            <Button
              variant="default"
              className="w-full"
              onClick={generateBasicReport}
              disabled={basicLoading}
            >
              {basicLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> {t("Generating...", "Генерация...")}</>
              ) : basicGenerated ? (
                <>{t("Regenerate", "Обновить")}</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" /> {t("Generate Standard Report", "Создать стандартный отчёт")}</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Premium Report — Pro/Founding members only */}
        <PaywallGate
          feature="Hyper Intelligence Report"
          description="Deep AI-powered admissions analysis: 15-20 university matches with fit scores, ROI projections, scholarship probability, and personalized essay angles."
          showPreview={false}
        >
          <Card className="border-gold/30 bg-gradient-to-br from-gold/5 to-transparent hover:border-gold/50 transition-all">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gold/15 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{t("Hyper Intelligence Report", "Гиперинтеллект отчёт")}</h3>
                    <Badge className="bg-gold/15 text-gold text-[10px]">PRO</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{t("Deep personalized analysis", "Глубокий персонализированный анализ")}</p>
                </div>
              </div>

              <ul className="space-y-1.5 text-xs text-muted-foreground">
                {[
                  t("15-20 university matches with % fit scores", "15-20 университетов с % совместимости"),
                  t("Career ROI projections per university", "ROI карьеры по университетам"),
                  t("Scholarship probability analysis", "Анализ вероятности стипендий"),
                  t("Visa pathway & post-grad work options", "Визовый путь и работа после учёбы"),
                  t("Personalized essay angle suggestions", "Персонализированные темы эссе"),
                  t("Risk/safety/reach school tiers", "Уровни: безопасный / средний / амбициозный"),
                  t("Monthly budget breakdown by city", "Ежемесячный бюджет по городам"),
                  t("Industry connections & alumni network strength", "Связи индустрии и сила сети выпускников"),
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-gold" />
                    {item}
                  </li>
                ))}
              </ul>

              <Button
                variant="gold"
                className="w-full"
                onClick={generatePremiumReport}
                disabled={premiumLoading}
              >
                {premiumLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> {t("Generating deep analysis...", "Глубокий анализ...")}</>
                ) : premiumGenerated ? (
                  <>{t("Regenerate Premium", "Обновить PRO")}</>
                ) : (
                  <><Crown className="w-4 h-4 mr-2" /> {t("Generate Hyper Report", "Создать гиперотчёт")}</>
                )}
              </Button>
            </CardContent>
          </Card>
        </PaywallGate>
      </div>

      {/* Report Display */}
      {basicReport && (
        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">{t("Standard Report", "Стандартный отчёт")}</h3>
            </div>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown>{basicReport}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}

      {premiumReport && (
        <Card className="border-gold/30 bg-gradient-to-br from-gold/5 to-transparent">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Crown className="w-5 h-5 text-gold" />
              <h3 className="font-semibold">{t("Hyper Intelligence Report", "Гиперинтеллект отчёт")}</h3>
              <Badge className="bg-gold/15 text-gold text-[10px]">PRO</Badge>
            </div>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown>{premiumReport}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default HyperReport;
