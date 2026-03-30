import { useState } from "react";
import { usePrep } from "@/contexts/PrepContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, CheckCircle2, BookOpen, Search, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Template {
  id: string;
  title: string;
  type: string;
  structure: string[];
  example: string;
  tips: string[];
}

const task1Templates: Template[] = [
  {
    id: "t1-line", title: "Line Graph", type: "Trend",
    structure: [
      "Introduction: Paraphrase the question + overview statement",
      "Overview: Identify 2-3 key trends (most important patterns)",
      "Body 1: Describe the first major trend with data",
      "Body 2: Describe the second trend with comparisons",
    ],
    example: "The line graph illustrates the changes in [subject] in [place] between [year] and [year]. Overall, it is clear that [main trend 1], while [main trend 2].\n\nIn [start year], [subject] stood at approximately [number]. This figure [rose/fell] steadily over the following [period], reaching [number] by [year]. The most significant change occurred between [year] and [year], when [subject] [increased/decreased] sharply from [X] to [Y].\n\nIn contrast, [second data set] showed a different pattern...",
    tips: ["Always include an overview paragraph", "Use specific data points", "Compare trends where possible", "Use a range of language for increase/decrease"],
  },
  {
    id: "t1-bar", title: "Bar Chart", type: "Comparison",
    structure: [
      "Introduction: Paraphrase + state what the chart shows",
      "Overview: Highlight the most significant comparisons",
      "Body 1: Describe the highest/most notable categories",
      "Body 2: Describe remaining categories with comparisons",
    ],
    example: "The bar chart compares [subject] across [number] different [categories] in [year/place]. Overall, [category A] had the highest [measurement], while [category B] recorded the lowest.\n\nLooking at the data in more detail, [category A] accounted for [X%/amount], which was significantly higher than [category B] at [Y%/amount]. [Category C] and [category D] were relatively similar, at [X] and [Y] respectively.\n\nBy contrast, the remaining categories showed...",
    tips: ["Group similar data together", "Use comparative/superlative forms", "Don't describe every single bar — focus on key comparisons", "Include exact figures"],
  },
  {
    id: "t1-pie", title: "Pie Chart", type: "Proportion",
    structure: [
      "Introduction: State what the pie chart(s) show",
      "Overview: Identify largest/smallest segments",
      "Body 1: Describe the dominant categories",
      "Body 2: Describe minor categories and comparisons",
    ],
    example: "The pie chart(s) [illustrate/show] the proportion of [subject] in [place/year]. It is immediately apparent that [largest segment] made up the largest share, while [smallest] represented the smallest proportion.\n\n[Largest category] accounted for [X%] of the total, which was [twice/three times] as much as [second category] at [Y%]...",
    tips: ["Use proportion language: 'accounted for', 'comprised', 'made up'", "Compare segments to each other", "If multiple pie charts, compare across time/place"],
  },
  {
    id: "t1-table", title: "Table", type: "Data",
    structure: [
      "Introduction: Paraphrase what the table shows",
      "Overview: Identify overall patterns and extremes",
      "Body 1: Describe rows/columns with highest values",
      "Body 2: Describe trends or patterns in remaining data",
    ],
    example: "The table provides information about [subject] in [place] over the period from [year] to [year]. Overall, [main observation], and [secondary observation].\n\nAccording to the data, [highest value item] recorded the highest figure at [X], compared to [lowest] which had only [Y]...",
    tips: ["Don't describe every cell — identify patterns", "Use ranking language", "Group similar data", "Include time-based trends if applicable"],
  },
  {
    id: "t1-process", title: "Process Diagram", type: "Steps",
    structure: [
      "Introduction: Paraphrase what the process shows",
      "Overview: State number of stages and overall nature",
      "Body 1: Describe the first half of the process",
      "Body 2: Describe the second half through to completion",
    ],
    example: "The diagram illustrates the process by which [product/thing] is [produced/made/created]. Overall, there are [X] main stages in the process, beginning with [first stage] and ending with [final stage].\n\nAt the first stage, [raw materials] are [collected/harvested]. Following this, they are [transported/processed] to [location], where they undergo [treatment]...",
    tips: ["Use passive voice throughout", "Use sequencing language: 'firstly', 'subsequently', 'at the next stage'", "Don't add opinions — just describe", "Mention the number of stages in the overview"],
  },
  {
    id: "t1-map", title: "Map Comparison", type: "Changes",
    structure: [
      "Introduction: State what the maps show",
      "Overview: Summarize the most significant changes",
      "Body 1: Describe the northern/western/central area changes",
      "Body 2: Describe remaining area changes",
    ],
    example: "The two maps illustrate the changes that took place in [location] between [year] and [year]. Overall, the area underwent significant development, with [major change 1] and [major change 2].\n\nIn [first year], [description of original layout]. By [second year], this area had been transformed into [new description]...",
    tips: ["Use past tense and passive voice", "Use location language: 'to the north of', 'adjacent to'", "Focus on what changed, not what stayed the same", "Compare before and after systematically"],
  },
];

const task2Structures = [
  {
    type: "Opinion (Agree/Disagree)",
    structure: ["Introduction: Paraphrase + thesis statement (your opinion)", "Body 1: Main reason supporting your view + example", "Body 2: Second reason + example", "Body 3 (optional): Address counterargument", "Conclusion: Restate opinion + summary"],
    connectors: ["In my opinion", "I firmly believe that", "From my perspective", "It is my contention that"],
  },
  {
    type: "Discussion (Both Views)",
    structure: ["Introduction: Paraphrase + state you will discuss both views", "Body 1: Arguments FOR view A", "Body 2: Arguments FOR view B", "Body 3: Your own position", "Conclusion: Summary + final opinion"],
    connectors: ["On the one hand", "Conversely", "While some argue that", "Nevertheless"],
  },
  {
    type: "Problem-Solution",
    structure: ["Introduction: Paraphrase the issue", "Body 1: Describe 2-3 key problems with examples", "Body 2: Propose practical solutions", "Conclusion: Summarize and recommend action"],
    connectors: ["One significant issue is", "This leads to", "A potential solution would be", "This could be addressed by"],
  },
  {
    type: "Advantages-Disadvantages",
    structure: ["Introduction: Paraphrase the topic", "Body 1: Present advantages with examples", "Body 2: Present disadvantages with examples", "Conclusion: State whether advantages outweigh disadvantages"],
    connectors: ["A key benefit is", "However, a notable drawback is", "On balance", "Despite these disadvantages"],
  },
];

const WritingTemplates = () => {
  const { language } = usePrep();
  const t = (en: string, ru: string) => language === "ru" ? ru : en;
  const [copied, setCopied] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const filteredTemplates = task1Templates.filter(t =>
    !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-heading font-bold">{t("IELTS Writing Templates", "Шаблоны IELTS Writing")}</h2>
        <p className="text-muted-foreground">{t("Structured templates for Task 1 & Task 2 with examples", "Структурированные шаблоны для Task 1 и Task 2")}</p>
      </div>

      <Tabs defaultValue="task1">
        <TabsList>
          <TabsTrigger value="task1">Task 1 (Academic)</TabsTrigger>
          <TabsTrigger value="task2">Task 2 (Essay)</TabsTrigger>
        </TabsList>

        <TabsContent value="task1" className="space-y-4 mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input placeholder={t("Search templates...", "Поиск шаблонов...")} value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>

          <div className="grid gap-3">
            {filteredTemplates.map(template => (
              <Card key={template.id} className="hover:border-accent/30 transition-colors">
                <CardHeader className="pb-2 cursor-pointer" onClick={() => setExpandedTemplate(expandedTemplate === template.id ? null : template.id)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{template.title}</CardTitle>
                      <Badge variant="outline" className="text-[10px]">{template.type}</Badge>
                    </div>
                    {expandedTemplate === template.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </CardHeader>

                <AnimatePresence>
                  {expandedTemplate === template.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <CardContent className="space-y-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t("Structure", "Структура")}</p>
                          <ol className="space-y-1.5">
                            {template.structure.map((step, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm">
                                <span className="bg-accent text-accent-foreground rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                                {step}
                              </li>
                            ))}
                          </ol>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("Example", "Пример")}</p>
                            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => copyText(template.example, template.id)}>
                              {copied === template.id ? <><CheckCircle2 className="h-3 w-3" /> {t("Copied", "Скопировано")}</> : <><Copy className="h-3 w-3" /> {t("Copy", "Копировать")}</>}
                            </Button>
                          </div>
                          <div className="bg-muted/50 rounded-lg p-4 text-sm whitespace-pre-wrap leading-relaxed">{template.example}</div>
                        </div>

                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t("Pro Tips", "Советы")}</p>
                          <ul className="space-y-1">
                            {template.tips.map((tip, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                                <span className="text-accent mt-0.5">💡</span> {tip}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </CardContent>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="task2" className="space-y-4 mt-4">
          <div className="grid gap-3">
            {task2Structures.map((s, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{s.type}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ol className="space-y-1.5">
                    {s.structure.map((step, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm">
                        <span className="bg-accent text-accent-foreground rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{j + 1}</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1.5">{t("Key Connectors", "Связующие слова")}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {s.connectors.map((c, j) => (
                        <Badge key={j} variant="outline" className="text-[10px]">{c}</Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WritingTemplates;
