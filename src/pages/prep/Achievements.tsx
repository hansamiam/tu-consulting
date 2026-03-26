import { usePrep } from "@/contexts/PrepContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";

const Achievements = () => {
  const { language, achievements, unlockedAchievements, xp, level, xpToNextLevel } = usePrep();
  const t = (en: string, ru: string) => language === "ru" ? ru : en;

  const unlocked = achievements.filter(a => unlockedAchievements.includes(a.id));
  const locked = achievements.filter(a => !unlockedAchievements.includes(a.id));

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-heading font-bold">🏆 {t("Achievements", "Достижения")}</h2>
        <p className="text-muted-foreground">{t(`${unlocked.length}/${achievements.length} unlocked`, `${unlocked.length}/${achievements.length} разблокировано`)}</p>
      </div>

      {/* Level card */}
      <Card className="border-accent/30 bg-gradient-to-r from-accent/5 to-transparent">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="text-3xl font-bold text-accent">{t("Lvl", "Ур.")} {level}</div>
              <div className="text-sm text-muted-foreground">{xp} XP {t("total", "всего")}</div>
            </div>
            <Badge variant="outline" className="text-accent border-accent">{xpToNextLevel} XP {t("to next level", "до уровня")}</Badge>
          </div>
          <Progress value={((100 - xpToNextLevel) / 100) * 100} className="h-3" />
        </CardContent>
      </Card>

      {/* Unlocked */}
      {unlocked.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-accent uppercase tracking-wider">{t("Unlocked", "Разблокированные")}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {unlocked.map((a, i) => (
              <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="border-accent/30 bg-accent/5">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="text-3xl">{a.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground">{language === "ru" ? a.nameRu : a.name}</p>
                      <p className="text-xs text-muted-foreground">{language === "ru" ? a.descriptionRu : a.description}</p>
                    </div>
                    <Badge className="bg-accent text-accent-foreground text-xs shrink-0">+{a.xpReward} XP</Badge>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Locked */}
      {locked.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">{t("Locked", "Заблокированные")}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {locked.map(a => (
              <Card key={a.id} className="border-border opacity-60">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="text-3xl grayscale">🔒</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-muted-foreground">{language === "ru" ? a.nameRu : a.name}</p>
                    <p className="text-xs text-muted-foreground">{language === "ru" ? a.descriptionRu : a.description}</p>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">+{a.xpReward} XP</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Achievements;
