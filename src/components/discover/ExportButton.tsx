import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { UniversityResult } from "./types";
import { useToast } from "@/hooks/use-toast";

interface Props {
  universities: UniversityResult[];
  language: "en" | "ru";
}

const t = {
  en: { export: "Export CSV", exported: "Exported", desc: "universities exported to CSV" },
  ru: { export: "Экспорт CSV", exported: "Экспортировано", desc: "университетов экспортировано в CSV" },
};

export const ExportButton = ({ universities, language }: Props) => {
  const l = t[language];
  const { toast } = useToast();

  const handleExport = () => {
    const headers = [
      "University", "Country", "City", "Ranking", "Tuition (USD/yr)",
      "Language", "Foundation Year", "Gap Year", "Programs Count",
      "Scholarships Count",
    ];

    const rows = universities.map(u => [
      `"${u.university_name}"`,
      u.country,
      u.city,
      (u as { global_ranking?: number | string }).global_ranking || "",
      u.tuition_usd_per_year ?? "",
      u.language_of_instruction || "",
      u.foundation_year_available ? "Yes" : "No",
      u.gap_year_accepted ? "Yes" : "No",
      u.programs?.length || 0,
      u.scholarships?.length || 0,
    ]);

    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "topuni-discover-export.csv";
    link.click();
    URL.revokeObjectURL(url);

    toast({ title: l.exported, description: `${universities.length} ${l.desc}` });
  };

  return (
    <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
      <Download className="h-4 w-4" />
      {l.export}
    </Button>
  );
};
