import { useState } from "react";
import { usePrep } from "@/contexts/PrepContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Zap, Lock, Unlock, Gift, Coffee, BookOpen, Headphones, 
  Star, Crown, Sparkles, ShoppingBag, CheckCircle2, Ticket,
  GraduationCap, Globe2, Palette,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface StoreItem {
  id: string;
  name: string;
  nameRu: string;
  description: string;
  descriptionRu: string;
  xpCost: number;
  icon: React.ElementType;
  category: "perks" | "tools" | "rewards" | "cosmetics";
  rarity: "common" | "rare" | "epic" | "legendary";
  oneTime?: boolean;
}

const storeItems: StoreItem[] = [
  // PERKS - real-world partner discounts & benefits
  { id: "coffee-discount", name: "☕ Local Café 10% Off", nameRu: "☕ Скидка 10% в кафе", description: "Redeem at partner cafés in Astana & Almaty. Show your QR code!", descriptionRu: "Покажите QR-код в кафе-партнёрах Астаны и Алматы", xpCost: 200, icon: Coffee, category: "perks", rarity: "common" },
  { id: "bookstore-voucher", name: "📚 Bookstore $5 Voucher", nameRu: "📚 Книжный $5", description: "Digital voucher for Meloman / Marwin bookstores", descriptionRu: "Цифровой ваучер для Меломан / Марвин", xpCost: 500, icon: BookOpen, category: "perks", rarity: "rare" },
  { id: "headphones-raffle", name: "🎧 Headphones Raffle Entry", nameRu: "🎧 Розыгрыш наушников", description: "Enter monthly raffle for premium headphones", descriptionRu: "Участие в ежемесячном розыгрыше наушников", xpCost: 300, icon: Headphones, category: "perks", rarity: "rare" },
  { id: "consultation-discount", name: "🎓 15% Off TopUni Consultation", nameRu: "🎓 Скидка 15% на консультацию", description: "Discount on any TopUni consulting package", descriptionRu: "Скидка на любой пакет TopUni", xpCost: 1000, icon: GraduationCap, category: "perks", rarity: "epic" },
  { id: "coworking-pass", name: "🏢 Coworking Day Pass", nameRu: "🏢 Коворкинг на день", description: "Free day at partner coworking spaces", descriptionRu: "Бесплатный день в коворкинге-партнёре", xpCost: 750, icon: Globe2, category: "perks", rarity: "epic" },
  { id: "premium-essay-review", name: "✨ Expert Essay Review", nameRu: "✨ Проверка эссе экспертом", description: "One free essay review by a TopUni IELTS specialist", descriptionRu: "Бесплатная проверка эссе специалистом TopUni", xpCost: 2000, icon: Star, category: "perks", rarity: "legendary" },

  // TOOLS - unlock premium prep features
  { id: "unlock-advanced-analytics", name: "Advanced Analytics", nameRu: "Расширенная аналитика", description: "Unlock time-per-question heatmaps & prediction trends", descriptionRu: "Тепловая карта времени и прогнозы", xpCost: 150, icon: Sparkles, category: "tools", rarity: "common", oneTime: true },
  { id: "unlock-ai-tutor-pro", name: "AI Tutor Pro Mode", nameRu: "AI Репетитор Pro", description: "Unlock Socratic deep-dive & custom lesson generation", descriptionRu: "Сократический метод и генерация уроков", xpCost: 400, icon: Crown, category: "tools", rarity: "rare", oneTime: true },
  { id: "unlock-mock-unlimited", name: "Unlimited Mock Exams", nameRu: "Безлимитные пробные", description: "Remove the 3/week mock exam limit", descriptionRu: "Убрать ограничение 3 пробных/неделю", xpCost: 800, icon: Unlock, category: "tools", rarity: "epic", oneTime: true },
  { id: "unlock-score-predictor", name: "Score Predictor AI", nameRu: "AI Предсказатель баллов", description: "ML-based exam score prediction with confidence intervals", descriptionRu: "ML-прогноз баллов с доверительным интервалом", xpCost: 1500, icon: Star, category: "tools", rarity: "legendary", oneTime: true },

  // COSMETICS
  { id: "theme-neon", name: "Neon Theme", nameRu: "Неоновая тема", description: "Unlock a cyberpunk neon dashboard theme", descriptionRu: "Киберпанк неоновая тема", xpCost: 300, icon: Palette, category: "cosmetics", rarity: "rare", oneTime: true },
  { id: "badge-og", name: "OG Learner Badge", nameRu: "Значок OG", description: "Exclusive profile badge for early adopters", descriptionRu: "Эксклюзивный значок для ранних пользователей", xpCost: 100, icon: Ticket, category: "cosmetics", rarity: "common", oneTime: true },
];

const rarityColors: Record<string, string> = {
  common: "border-muted-foreground/30 bg-muted/30",
  rare: "border-blue-500/30 bg-blue-500/5",
  epic: "border-purple-500/30 bg-purple-500/5",
  legendary: "border-amber-500/30 bg-amber-500/5 shadow-lg shadow-amber-500/10",
};

const rarityBadge: Record<string, string> = {
  common: "bg-muted text-muted-foreground",
  rare: "bg-blue-500/15 text-blue-500 border-blue-500/30",
  epic: "bg-purple-500/15 text-purple-500 border-purple-500/30",
  legendary: "bg-amber-500/15 text-amber-500 border-amber-500/30",
};

const categoryLabels = {
  perks: { en: "🎁 Partner Perks & Discounts", ru: "🎁 Скидки партнёров" },
  tools: { en: "🔓 Unlock Premium Tools", ru: "🔓 Премиум инструменты" },
  cosmetics: { en: "🎨 Cosmetics & Badges", ru: "🎨 Косметика и значки" },
  rewards: { en: "🏆 Rewards", ru: "🏆 Награды" },
};

const XPStore = () => {
  const { xp, language, redeemedItems, redeemItem } = usePrep();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [purchasing, setPurchasing] = useState<string | null>(null);

  const t = (en: string, ru: string) => language === "ru" ? ru : en;

  const categories = ["all", "perks", "tools", "cosmetics"] as const;

  const filteredItems = selectedCategory === "all"
    ? storeItems
    : storeItems.filter(i => i.category === selectedCategory);

  const handlePurchase = (item: StoreItem) => {
    if (xp < item.xpCost) {
      toast.error(t("Not enough XP!", "Недостаточно XP!"));
      return;
    }
    if (item.oneTime && redeemedItems.includes(item.id)) {
      toast.info(t("Already unlocked!", "Уже разблокировано!"));
      return;
    }
    setPurchasing(item.id);
    setTimeout(() => {
      redeemItem(item.id, item.xpCost);
      setPurchasing(null);
      toast.success(
        t(`🎉 ${item.name} redeemed!`, `🎉 ${item.nameRu} получено!`),
        { description: t("Check your profile for the reward.", "Проверьте профиль для получения.") }
      );
    }, 800);
  };

  const grouped = filteredItems.reduce<Record<string, StoreItem[]>>((acc, item) => {
    (acc[item.category] = acc[item.category] || []).push(item);
    return acc;
  }, {});

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <ShoppingBag className="h-7 w-7 text-accent" />
            {t("XP Store", "Магазин XP")}
          </h2>
          <p className="text-muted-foreground text-sm">{t("Spend your hard-earned XP on real rewards", "Тратьте заработанные XP на реальные награды")}</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent/10 border border-accent/20">
          <Zap className="h-5 w-5 text-accent" />
          <span className="text-xl font-bold text-accent">{xp}</span>
          <span className="text-sm text-muted-foreground">XP</span>
        </div>
      </motion.div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map(cat => (
          <Button
            key={cat}
            variant={selectedCategory === cat ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(cat)}
            className={selectedCategory === cat ? "bg-accent text-accent-foreground" : ""}
          >
            {cat === "all" ? t("All", "Все") : categoryLabels[cat as keyof typeof categoryLabels][language === "ru" ? "ru" : "en"]}
          </Button>
        ))}
      </div>

      {/* Items */}
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category} className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground">
            {categoryLabels[category as keyof typeof categoryLabels]?.[language === "ru" ? "ru" : "en"]}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {items.map((item, i) => {
                const owned = item.oneTime && redeemedItems.includes(item.id);
                const canAfford = xp >= item.xpCost;
                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className={`${rarityColors[item.rarity]} transition-all hover:scale-[1.02] ${owned ? "opacity-60" : ""}`}>
                      <CardContent className="p-5 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-background/80">
                              <item.icon className="h-6 w-6 text-foreground" />
                            </div>
                            <div>
                              <p className="font-semibold text-foreground text-sm">
                                {language === "ru" ? item.nameRu : item.name}
                              </p>
                              <Badge variant="outline" className={`text-[10px] mt-1 ${rarityBadge[item.rarity]}`}>
                                {item.rarity.toUpperCase()}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {language === "ru" ? item.descriptionRu : item.description}
                        </p>
                        <div className="flex items-center justify-between pt-1">
                          <span className="flex items-center gap-1 text-sm font-bold text-accent">
                            <Zap className="h-3.5 w-3.5" /> {item.xpCost}
                          </span>
                          {owned ? (
                            <Badge className="bg-green-500/15 text-green-500 border-green-500/30 gap-1">
                              <CheckCircle2 className="h-3 w-3" /> {t("Owned", "Есть")}
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              disabled={!canAfford || purchasing === item.id}
                              onClick={() => handlePurchase(item)}
                              className={canAfford ? "bg-accent text-accent-foreground hover:bg-accent/90" : ""}
                              variant={canAfford ? "default" : "outline"}
                            >
                              {purchasing === item.id ? (
                                <span className="animate-spin">⏳</span>
                              ) : canAfford ? (
                                <>{t("Redeem", "Получить")} <Gift className="ml-1 h-3 w-3" /></>
                              ) : (
                                <><Lock className="mr-1 h-3 w-3" /> {t("Need", "Нужно")} {item.xpCost - xp} XP</>
                              )}
                            </Button>
                          )}
                        </div>
                        {!owned && !canAfford && (
                          <Progress value={(xp / item.xpCost) * 100} className="h-1.5" />
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      ))}

      {/* Coming soon */}
      <Card className="border-dashed border-2 border-muted-foreground/20">
        <CardContent className="p-8 text-center space-y-2">
          <Gift className="h-10 w-10 mx-auto text-muted-foreground/50" />
          <p className="font-semibold text-muted-foreground">{t("More rewards coming soon!", "Больше наград скоро!")}</p>
          <p className="text-xs text-muted-foreground/70">{t("We're partnering with local businesses in Astana, Almaty, and beyond. Your XP = real value.", "Мы сотрудничаем с бизнесами в Астане, Алматы и далее. XP = реальная ценность.")}</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default XPStore;
