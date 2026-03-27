import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FileText, Loader2, Sparkles, Copy, CheckCircle2, Download } from "lucide-react";
import ReactMarkdown from "react-markdown";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/topuni-chat`;

interface DocumentBuilderProps {
  profile: {
    fullName: string;
    major: string;
    targetCountries: string[];
    gpa: string;
    gradeLevel: string;
    ielts: string;
    sat: string;
  };
  language: "en" | "ru";
}

const DOC_TYPES = [
  { id: "sop", labelEn: "Statement of Purpose", labelRu: "Мотивационное письмо", desc: "Tailored SOP for graduate/undergraduate applications" },
  { id: "lor-request", labelEn: "LOR Request Email", labelRu: "Запрос рекомендации", desc: "Professional email to request a letter of recommendation" },
  { id: "cv", labelEn: "Academic CV", labelRu: "Академическое CV", desc: "Structured CV highlighting academic achievements" },
  { id: "cover-letter", labelEn: "Cover Letter", labelRu: "Сопроводительное письмо", desc: "Application cover letter for specific programs" },
  { id: "scholarship-essay", labelEn: "Scholarship Essay", labelRu: "Эссе на стипендию", desc: "Compelling essay for scholarship applications" },
  { id: "research-proposal", labelEn: "Research Proposal", labelRu: "Исследовательское предложение", desc: "For graduate research program applications" },
];

const DocumentBuilder = ({ profile, language }: DocumentBuilderProps) => {
  const isRu = language === "ru";
  const t = (en: string, ru: string) => (isRu ? ru : en);

  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [universityName, setUniversityName] = useState("");
  const [programName, setProgramName] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateDocument = async () => {
    if (!selectedDoc || loading) return;
    setLoading(true);
    setResult("");
    let soFar = "";

    const docType = DOC_TYPES.find((d) => d.id === selectedDoc);
    const systemPrompt = `You are an expert university admissions document writer with 15+ years of experience. You have helped thousands of students get into top universities worldwide.

Student profile:
- Name: ${profile.fullName}
- Major: ${profile.major || "Undeclared"}
- GPA: ${profile.gpa || "N/A"}
- IELTS: ${profile.ielts || "N/A"}
- SAT: ${profile.sat || "N/A"}
- Target countries: ${profile.targetCountries.join(", ") || "International"}
- Grade level: ${profile.gradeLevel || "N/A"}

Generate a complete, polished, ready-to-submit ${docType?.labelEn} for ${universityName || "a top university"}, ${programName ? `program: ${programName}` : ""}.

Requirements:
- Write in first person (as the student)
- Use specific details from their profile
- Professional tone, authentic voice
- Follow the standard format for this document type
- Include [CUSTOMIZE] markers where the student should add personal details
- Make it compelling and unique — avoid clichés

${additionalContext ? `Additional context from student: ${additionalContext}` : ""}`;

    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate my ${docType?.labelEn}. Make it outstanding.` },
        ],
        language,
      }),
    });

    if (!resp.ok || !resp.body) {
      setResult("Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf("\n")) !== -1) {
        let line = buf.slice(0, idx);
        buf = buf.slice(idx + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (!line.startsWith("data: ")) continue;
        const json = line.slice(6).trim();
        if (json === "[DONE]") { setLoading(false); return; }
        try {
          const c = JSON.parse(json).choices?.[0]?.delta?.content;
          if (c) { soFar += c; setResult(soFar); }
        } catch { break; }
      }
    }
    setLoading(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadAsText = () => {
    const blob = new Blob([result], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedDoc}-${profile.fullName.replace(/\s+/g, "-").toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="w-5 h-5 text-accent" />
          {t("Document Builder", "Конструктор документов")}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {t("Generate polished application documents tailored to your profile and target universities.", "Создайте готовые документы, адаптированные под ваш профиль.")}
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Doc type selection */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {DOC_TYPES.map((doc) => (
            <button
              key={doc.id}
              onClick={() => setSelectedDoc(doc.id)}
              className={`p-3 rounded-lg border-2 transition-all text-left ${
                selectedDoc === doc.id
                  ? "border-accent bg-accent/5"
                  : "border-border hover:border-accent/30"
              }`}
            >
              <p className="text-sm font-semibold text-foreground">{isRu ? doc.labelRu : doc.labelEn}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{doc.desc}</p>
            </button>
          ))}
        </div>

        {selectedDoc && (
          <div className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <Input
                value={universityName}
                onChange={(e) => setUniversityName(e.target.value)}
                placeholder={t("University name", "Название университета")}
                className="text-sm"
              />
              <Input
                value={programName}
                onChange={(e) => setProgramName(e.target.value)}
                placeholder={t("Program name (optional)", "Программа (опционально)")}
                className="text-sm"
              />
            </div>
            <textarea
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              placeholder={t(
                "Additional context: your achievements, experiences, motivations, extracurriculars...",
                "Дополнительный контекст: достижения, опыт, мотивация, внеклассная деятельность..."
              )}
              className="w-full min-h-[80px] p-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
            />
            <Button variant="gold" className="w-full" onClick={generateDocument} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
              {t("Generate Document", "Создать документ")}
            </Button>
          </div>
        )}

        {result && (
          <div className="border border-accent/20 rounded-lg p-4 bg-accent/5">
            <div className="flex items-center justify-between mb-3">
              <Badge className="bg-accent/10 text-accent border-accent/30">
                <FileText className="w-3 h-3 mr-1" /> {DOC_TYPES.find((d) => d.id === selectedDoc)?.labelEn}
              </Badge>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={copyToClipboard}>
                  {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={downloadAsText}>
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="prose prose-sm max-w-none dark:prose-invert [&_h2]:text-foreground [&_h3]:text-foreground [&_p]:text-muted-foreground [&_li]:text-muted-foreground [&_strong]:text-foreground">
              <ReactMarkdown>{result}</ReactMarkdown>
              {loading && <span className="inline-block w-2 h-4 bg-accent animate-pulse ml-1" />}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DocumentBuilder;
