import { useState, useEffect, useRef, useCallback } from "react";
import { usePrep } from "@/contexts/PrepContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Timer, Play, Pause, RotateCcw, Zap, Coffee,
  Brain, CheckCircle2, Volume2, VolumeX, Settings,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

type TimerMode = "focus" | "short-break" | "long-break";

const PRESETS = {
  classic: { focus: 25, short: 5, long: 15, label: "Classic 25/5" },
  intense: { focus: 50, short: 10, long: 20, label: "Intense 50/10" },
  sprint: { focus: 15, short: 3, long: 10, label: "Sprint 15/3" },
};

const FocusTimer = () => {
  const { language, addXP, addStudyMinutes, updateStreak } = usePrep();
  const t = (en: string, ru: string) => language === "ru" ? ru : en;

  const [preset, setPreset] = useState<keyof typeof PRESETS>("classic");
  const [mode, setMode] = useState<TimerMode>("focus");
  const [timeLeft, setTimeLeft] = useState(PRESETS.classic.focus * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [totalFocusToday, setTotalFocusToday] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const config = PRESETS[preset];

  const getDuration = useCallback((m: TimerMode) => {
    if (m === "focus") return config.focus * 60;
    if (m === "short-break") return config.short * 60;
    return config.long * 60;
  }, [config]);

  useEffect(() => {
    if (!isRunning) return;
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          handleTimerComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, mode]);

  const handleTimerComplete = () => {
    setIsRunning(false);
    if (mode === "focus") {
      const mins = config.focus;
      const xpEarned = Math.round(mins * 2);
      setSessionsCompleted(prev => prev + 1);
      setTotalFocusToday(prev => prev + mins);
      addXP(xpEarned);
      addStudyMinutes(mins);
      updateStreak();
      toast.success(t(`🎯 Focus session complete! +${xpEarned} XP`, `🎯 Сессия завершена! +${xpEarned} XP`));
      
      // Auto-switch to break
      const nextMode = (sessionsCompleted + 1) % 4 === 0 ? "long-break" : "short-break";
      setMode(nextMode);
      setTimeLeft(getDuration(nextMode));
    } else {
      toast.info(t("Break over! Ready for another focus session?", "Перерыв окончен! Готовы к новой сессии?"));
      setMode("focus");
      setTimeLeft(getDuration("focus"));
    }
  };

  const toggleTimer = () => setIsRunning(!isRunning);
  
  const resetTimer = () => {
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTimeLeft(getDuration(mode));
  };

  const switchMode = (newMode: TimerMode) => {
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setMode(newMode);
    setTimeLeft(getDuration(newMode));
  };

  const changePreset = (p: keyof typeof PRESETS) => {
    setPreset(p);
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setMode("focus");
    setTimeLeft(PRESETS[p].focus * 60);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const totalDuration = getDuration(mode);
  const progressPercent = ((totalDuration - timeLeft) / totalDuration) * 100;

  const modeColors = {
    focus: "text-accent",
    "short-break": "text-green-500",
    "long-break": "text-blue-500",
  };

  const modeBg = {
    focus: "from-accent/5 to-transparent",
    "short-break": "from-green-500/5 to-transparent",
    "long-break": "from-blue-500/5 to-transparent",
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
          <Timer className="h-7 w-7 text-accent" />
          {t("Focus Timer", "Таймер фокуса")}
        </h2>
        <p className="text-muted-foreground text-sm">{t("Pomodoro-powered study sessions. Earn XP for every completed focus block.", "Помодоро-сессии. Зарабатывайте XP за каждый блок фокуса.")}</p>
      </motion.div>

      {/* Preset selector */}
      <div className="flex gap-2">
        {Object.entries(PRESETS).map(([key, val]) => (
          <Button
            key={key}
            variant={preset === key ? "default" : "outline"}
            size="sm"
            onClick={() => changePreset(key as keyof typeof PRESETS)}
            className={preset === key ? "bg-accent text-accent-foreground" : ""}
          >
            {val.label}
          </Button>
        ))}
      </div>

      {/* Timer Display */}
      <Card className={`bg-gradient-to-br ${modeBg[mode]} border-2 ${mode === "focus" ? "border-accent/20" : mode === "short-break" ? "border-green-500/20" : "border-blue-500/20"}`}>
        <CardContent className="p-8 text-center space-y-6">
          {/* Mode tabs */}
          <div className="flex justify-center gap-2">
            {(["focus", "short-break", "long-break"] as TimerMode[]).map(m => (
              <Button
                key={m}
                variant={mode === m ? "default" : "ghost"}
                size="sm"
                onClick={() => switchMode(m)}
                className={mode === m ? "bg-accent text-accent-foreground" : ""}
              >
                {m === "focus" ? (
                  <><Brain className="mr-1 h-3.5 w-3.5" /> {t("Focus", "Фокус")}</>
                ) : m === "short-break" ? (
                  <><Coffee className="mr-1 h-3.5 w-3.5" /> {t("Short Break", "Короткий")}</>
                ) : (
                  <><Coffee className="mr-1 h-3.5 w-3.5" /> {t("Long Break", "Длинный")}</>
                )}
              </Button>
            ))}
          </div>

          {/* Clock */}
          <motion.div
            key={`${mode}-${timeLeft}`}
            className="relative"
          >
            <div className={`text-8xl font-mono font-bold ${modeColors[mode]} tabular-nums`}>
              {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
            </div>
            {mode === "focus" && (
              <p className="text-sm text-muted-foreground mt-2">
                +{Math.round(config.focus * 2)} XP {t("when complete", "по завершении")}
              </p>
            )}
          </motion.div>

          {/* Progress */}
          <Progress value={progressPercent} className="h-2 max-w-xs mx-auto" />

          {/* Controls */}
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" size="icon" onClick={resetTimer}>
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              onClick={toggleTimer}
              className={`px-8 ${isRunning ? "bg-destructive hover:bg-destructive/90" : "bg-accent hover:bg-accent/90"} text-accent-foreground`}
            >
              {isRunning ? <><Pause className="mr-2 h-5 w-5" /> {t("Pause", "Пауза")}</> : <><Play className="mr-2 h-5 w-5" /> {t("Start", "Старт")}</>}
            </Button>
            <Button variant="outline" size="icon" onClick={() => setSoundOn(!soundOn)}>
              {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Today's Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="h-5 w-5 mx-auto text-green-500 mb-1" />
            <p className="text-2xl font-bold text-foreground">{sessionsCompleted}</p>
            <p className="text-xs text-muted-foreground">{t("Sessions", "Сессий")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Timer className="h-5 w-5 mx-auto text-blue-500 mb-1" />
            <p className="text-2xl font-bold text-foreground">{totalFocusToday}m</p>
            <p className="text-xs text-muted-foreground">{t("Focus Today", "Фокус сегодня")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Zap className="h-5 w-5 mx-auto text-accent mb-1" />
            <p className="text-2xl font-bold text-foreground">+{sessionsCompleted * Math.round(config.focus * 2)}</p>
            <p className="text-xs text-muted-foreground">{t("XP Earned", "XP заработано")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tips */}
      <Card className="bg-muted/30">
        <CardContent className="p-4 space-y-2">
          <p className="text-sm font-medium text-foreground">{t("💡 Pomodoro Tips", "💡 Советы Помодоро")}</p>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• {t("Every 4 focus sessions, take a long break", "Каждые 4 сессии — длинный перерыв")}</li>
            <li>• {t("During focus: no phone, no social media", "Во время фокуса: без телефона и соцсетей")}</li>
            <li>• {t("During breaks: stretch, hydrate, look away from screen", "На перерыве: потянитесь, попейте воды")}</li>
            <li>• {t("XP multiplied by your streak bonus!", "XP умножается на бонус серии!")}</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default FocusTimer;
