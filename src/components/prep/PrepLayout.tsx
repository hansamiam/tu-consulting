import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { PrepProvider, usePrep } from "@/contexts/PrepContext";
import PrepSidebar from "./PrepSidebar";
import { Flame, Zap } from "lucide-react";

const PrepHeader = () => {
  const { xp, streak, language } = usePrep();
  const t = (en: string, ru: string) => language === "ru" ? ru : en;

  return (
    <header className="h-14 flex items-center justify-between border-b border-border px-4 bg-card">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
        <h1 className="font-heading text-lg font-bold text-foreground">
          TopUni <span className="text-accent">Prep</span>
        </h1>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <span className="flex items-center gap-1 text-accent font-semibold">
          <Zap className="h-4 w-4" /> {xp} XP
        </span>
        <span className="flex items-center gap-1 text-orange-500 font-semibold">
          <Flame className="h-4 w-4" /> {streak} {t("day streak", "дн. подряд")}
        </span>
      </div>
    </header>
  );
};

const PrepLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <PrepProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <PrepSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <PrepHeader />
            <main className="flex-1 overflow-auto p-6">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </PrepProvider>
  );
};

export default PrepLayout;
