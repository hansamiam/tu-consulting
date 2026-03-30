import { useState, useMemo } from "react";
import { usePrep } from "@/contexts/PrepContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Crown, Medal, Zap, Flame, Trophy, Users, TrendingUp,
  Star, Shield, Swords,
} from "lucide-react";
import { motion } from "framer-motion";

// Simulated leaderboard (in production this would come from DB)
const generateLeaderboard = (userXP: number, userStreak: number) => {
  const names = [
    { name: "Aisha K.", avatar: "🧕", country: "🇰🇿" },
    { name: "Dimash T.", avatar: "👨‍🎓", country: "🇰🇿" },
    { name: "Madina S.", avatar: "👩‍💻", country: "🇰🇿" },
    { name: "Arman B.", avatar: "🧑‍🔬", country: "🇰🇿" },
    { name: "Kamila R.", avatar: "👩‍🎓", country: "🇰🇿" },
    { name: "Nursultan M.", avatar: "👨‍💼", country: "🇰🇿" },
    { name: "Dana A.", avatar: "👩‍🏫", country: "🇰🇿" },
    { name: "Yerassyl K.", avatar: "🧑‍💻", country: "🇰🇿" },
    { name: "Aliya N.", avatar: "👩‍⚕️", country: "🇰🇿" },
    { name: "Talgat Z.", avatar: "👨‍🔧", country: "🇰🇿" },
    { name: "Sanzhar P.", avatar: "🧑‍🎨", country: "🇰🇿" },
    { name: "Aigerim D.", avatar: "👩‍🎤", country: "🇺🇿" },
    { name: "Bekzat O.", avatar: "👨‍🚀", country: "🇰🇬" },
    { name: "Zhanna L.", avatar: "👩‍💼", country: "🇹🇯" },
  ];

  const bots = names.map((n, i) => ({
    ...n,
    xp: Math.max(50, Math.round((userXP * (1.3 - i * 0.07)) + (Math.sin(i * 47) * 200))),
    streak: Math.max(0, Math.round(userStreak * (1.1 - i * 0.05) + Math.cos(i * 31) * 3)),
    level: 0,
    isUser: false,
  }));

  bots.forEach(b => { b.level = Math.floor(b.xp / 100) + 1; });

  const all = [
    ...bots,
    { name: t => t("You", "Вы"), avatar: "⭐", country: "🇰🇿", xp: userXP, streak: userStreak, level: Math.floor(userXP / 100) + 1, isUser: true },
  ];

  return all.sort((a, b) => b.xp - a.xp).map((p, i) => ({ ...p, rank: i + 1 }));
};

const rankIcons = [Crown, Medal, Shield];
const rankColors = ["text-amber-500", "text-gray-400", "text-amber-700"];

const Leaderboard = () => {
  const { xp, streak, language, level } = usePrep();
  const [tab, setTab] = useState<"xp" | "streak">("xp");
  const t = (en: string, ru: string) => language === "ru" ? ru : en;

  const leaderboard = useMemo(() => generateLeaderboard(xp, streak), [xp, streak]);

  const sorted = tab === "xp"
    ? [...leaderboard].sort((a, b) => b.xp - a.xp).map((p, i) => ({ ...p, rank: i + 1 }))
    : [...leaderboard].sort((a, b) => b.streak - a.streak).map((p, i) => ({ ...p, rank: i + 1 }));

  const userRank = sorted.find(p => p.isUser)?.rank || 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
          <Trophy className="h-7 w-7 text-accent" />
          {t("Leaderboard", "Рейтинг")}
        </h2>
        <p className="text-muted-foreground text-sm">{t("Compete with fellow learners!", "Соревнуйтесь с другими учениками!")}</p>
      </motion.div>

      {/* Your position */}
      <Card className="border-accent/30 bg-accent/5">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⭐</span>
            <div>
              <p className="font-bold text-foreground">{t("Your Rank", "Ваш ранг")}</p>
              <p className="text-sm text-muted-foreground">{t("Level", "Уровень")} {level} · {xp} XP · {streak} {t("day streak", "дн. серия")}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-accent">#{userRank}</p>
            <p className="text-xs text-muted-foreground">{t(`of ${sorted.length}`, `из ${sorted.length}`)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Tab */}
      <div className="flex gap-2">
        <Button variant={tab === "xp" ? "default" : "outline"} size="sm" onClick={() => setTab("xp")} className={tab === "xp" ? "bg-accent text-accent-foreground" : ""}>
          <Zap className="mr-1 h-3.5 w-3.5" /> {t("By XP", "По XP")}
        </Button>
        <Button variant={tab === "streak" ? "default" : "outline"} size="sm" onClick={() => setTab("streak")} className={tab === "streak" ? "bg-accent text-accent-foreground" : ""}>
          <Flame className="mr-1 h-3.5 w-3.5" /> {t("By Streak", "По серии")}
        </Button>
      </div>

      {/* Table */}
      <div className="space-y-2">
        {sorted.map((player, i) => {
          const RankIcon = i < 3 ? rankIcons[i] : null;
          return (
            <motion.div
              key={`${player.name}-${i}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card className={`transition-all ${player.isUser ? "border-accent/40 bg-accent/5 shadow-md" : "hover:bg-muted/30"}`}>
                <CardContent className="p-3 flex items-center gap-3">
                  {/* Rank */}
                  <div className="w-8 text-center shrink-0">
                    {RankIcon ? (
                      <RankIcon className={`h-5 w-5 mx-auto ${rankColors[i]}`} />
                    ) : (
                      <span className="text-sm font-mono text-muted-foreground">{player.rank}</span>
                    )}
                  </div>
                  {/* Avatar */}
                  <span className="text-xl">{player.avatar}</span>
                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`font-medium text-sm truncate ${player.isUser ? "text-accent font-bold" : "text-foreground"}`}>
                        {typeof player.name === "function" ? player.name(t) : player.name}
                      </p>
                      <span className="text-xs">{player.country}</span>
                      {player.isUser && <Badge className="bg-accent/15 text-accent text-[10px]">{t("YOU", "ВЫ")}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{t("Level", "Ур.")} {player.level}</p>
                  </div>
                  {/* Stats */}
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="flex items-center gap-1 text-sm font-semibold text-accent">
                      <Zap className="h-3.5 w-3.5" /> {player.xp}
                    </span>
                    <span className="flex items-center gap-1 text-sm text-orange-500">
                      <Flame className="h-3.5 w-3.5" /> {player.streak}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <Card className="bg-muted/30">
        <CardContent className="p-4 text-center space-y-1">
          <Users className="h-6 w-6 mx-auto text-muted-foreground/50" />
          <p className="text-xs text-muted-foreground">{t("Leaderboard updates in real-time. Keep practicing to climb the ranks!", "Рейтинг обновляется в реальном времени. Продолжайте учиться!")}</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Leaderboard;
