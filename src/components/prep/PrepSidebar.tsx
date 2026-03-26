import { useLocation, useNavigate } from "react-router-dom";
import { usePrep } from "@/contexts/PrepContext";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard, ClipboardCheck, Calendar, BookOpen,
  Bot, BarChart3, Flame, Zap, ArrowLeft, Globe, Trophy, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PrepSidebar = () => {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { xp, streak, language, setLanguage } = usePrep();

  const t = (en: string, ru: string) => language === "ru" ? ru : en;

  const items = [
    { title: t("Dashboard", "Панель"), path: "/prep", icon: LayoutDashboard, exact: true },
    { title: t("Diagnostic", "Диагностика"), path: "/prep/diagnostic", icon: ClipboardCheck },
    { title: t("Study Plan", "План"), path: "/prep/study-plan", icon: Calendar },
    { title: t("Practice", "Практика"), path: "/prep/practice", icon: BookOpen },
    { title: t("Mock Exam", "Пробный экзамен"), path: "/prep/mock-exam", icon: FileText },
    { title: t("AI Tutor", "AI Репетитор"), path: "/prep/tutor", icon: Bot },
    { title: t("Analytics", "Аналитика"), path: "/prep/analytics", icon: BarChart3 },
    { title: t("Achievements", "Достижения"), path: "/prep/achievements", icon: Trophy },
  ];

  const isActive = (path: string, exact?: boolean) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent className="bg-card">
        {/* Back to main site */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="h-4 w-4" />
                  {!collapsed && <span>{t("Back to TopUni", "Назад")}</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Gamification stats */}
        {!collapsed && (
          <div className="px-4 py-2 mx-3 rounded-lg bg-accent/10 border border-accent/20">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1 text-accent font-semibold">
                <Zap className="h-3.5 w-3.5" /> {xp} XP
              </span>
              <span className="flex items-center gap-1 text-orange-500 font-semibold">
                <Flame className="h-3.5 w-3.5" /> {streak} {t("day", "дн.")}
              </span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground text-xs uppercase tracking-wider">
            {t("Prep", "Подготовка")}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.path)}
                    className={cn(
                      "transition-colors",
                      isActive(item.path, item.exact)
                        ? "bg-accent/15 text-accent font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {!collapsed && <span>{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Language toggle */}
        <div className="mt-auto p-3">
          <button
            onClick={() => setLanguage(language === "en" ? "ru" : "en")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground w-full px-2 py-1.5 rounded-md hover:bg-muted transition-colors"
          >
            <Globe className="h-4 w-4" />
            {!collapsed && <span>{language === "en" ? "Русский" : "English"}</span>}
          </button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
};

export default PrepSidebar;
