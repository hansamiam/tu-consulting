import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";

export interface DiagnosticResult {
  examType: "ielts" | "sat";
  section: string;
  score: number;
  maxScore: number;
  date: string;
}

export interface PracticeSession {
  id: string;
  module: string;
  score: number;
  maxScore: number;
  xpEarned: number;
  date: string;
  duration: number;
  difficulty?: number;
  subSkills?: Record<string, { correct: number; total: number }>;
}

export interface Achievement {
  id: string;
  name: string;
  nameRu: string;
  description: string;
  descriptionRu: string;
  icon: string;
  condition: (state: PrepState) => boolean;
  xpReward: number;
}

export interface SkillProfile {
  [section: string]: {
    level: number; // 0-100
    subSkills: Record<string, number>; // 0-100 per sub-skill
    totalAttempts: number;
    totalCorrect: number;
  };
}

export interface MockExamResult {
  id: string;
  exam: "ielts" | "sat";
  date: string;
  sections: { section: string; score: number; maxScore: number }[];
  totalScore: number;
  totalMax: number;
  estimatedBand?: string;
  duration: number; // seconds
}

export interface PrepState {
  xp: number;
  streak: number;
  lastPracticeDate: string | null;
  targetExam: "ielts" | "sat" | "both" | null;
  targetScore: number | null;
  examDate: string | null;
  diagnosticResults: DiagnosticResult[];
  practiceSessions: PracticeSession[];
  mockExamResults: MockExamResult[];
  unlockedAchievements: string[];
  skillProfile: SkillProfile;
  language: "en" | "ru";
  completedToday: boolean;
  totalStudyMinutes: number;
  essaysSubmitted: number;
}

interface PrepContextType extends PrepState {
  addXP: (amount: number) => void;
  updateStreak: () => void;
  setTargetExam: (exam: "ielts" | "sat" | "both") => void;
  setTargetScore: (score: number) => void;
  setExamDate: (date: string) => void;
  addDiagnosticResult: (result: DiagnosticResult) => void;
  addPracticeSession: (session: Omit<PracticeSession, "id">) => void;
  addMockExamResult: (result: Omit<MockExamResult, "id">) => void;
  updateSkillProfile: (section: string, subSkill: string, correct: boolean) => void;
  incrementEssays: () => void;
  addStudyMinutes: (mins: number) => void;
  setLanguage: (lang: "en" | "ru") => void;
  resetProgress: () => void;
  achievements: Achievement[];
  level: number;
  xpToNextLevel: number;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ACHIEVEMENTS DEFINITIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const achievementDefs: Achievement[] = [
  { id: "first-diagnostic", name: "First Assessment", nameRu: "Первый тест", description: "Complete your first diagnostic test", descriptionRu: "Пройдите первый диагностический тест", icon: "🎯", condition: (s) => s.diagnosticResults.length >= 1, xpReward: 50 },
  { id: "first-practice", name: "Getting Started", nameRu: "Начало пути", description: "Complete your first practice session", descriptionRu: "Завершите первую практику", icon: "🚀", condition: (s) => s.practiceSessions.length >= 1, xpReward: 25 },
  { id: "streak-3", name: "On Fire", nameRu: "В ударе", description: "Maintain a 3-day streak", descriptionRu: "3 дня подряд", icon: "🔥", condition: (s) => s.streak >= 3, xpReward: 50 },
  { id: "streak-7", name: "Week Warrior", nameRu: "Недельный воин", description: "Maintain a 7-day streak", descriptionRu: "7 дней подряд", icon: "⚔️", condition: (s) => s.streak >= 7, xpReward: 150 },
  { id: "streak-30", name: "Monthly Master", nameRu: "Месячный мастер", description: "Maintain a 30-day streak", descriptionRu: "30 дней подряд", icon: "👑", condition: (s) => s.streak >= 30, xpReward: 500 },
  { id: "xp-500", name: "Rising Star", nameRu: "Восходящая звезда", description: "Earn 500 XP", descriptionRu: "Наберите 500 XP", icon: "⭐", condition: (s) => s.xp >= 500, xpReward: 50 },
  { id: "xp-2000", name: "Scholar", nameRu: "Учёный", description: "Earn 2000 XP", descriptionRu: "Наберите 2000 XP", icon: "🎓", condition: (s) => s.xp >= 2000, xpReward: 200 },
  { id: "xp-5000", name: "Grandmaster", nameRu: "Грандмастер", description: "Earn 5000 XP", descriptionRu: "Наберите 5000 XP", icon: "💎", condition: (s) => s.xp >= 5000, xpReward: 500 },
  { id: "sessions-10", name: "Dedicated", nameRu: "Преданный", description: "Complete 10 practice sessions", descriptionRu: "10 практик", icon: "📚", condition: (s) => s.practiceSessions.length >= 10, xpReward: 75 },
  { id: "sessions-50", name: "Unstoppable", nameRu: "Неудержимый", description: "Complete 50 practice sessions", descriptionRu: "50 практик", icon: "💪", condition: (s) => s.practiceSessions.length >= 50, xpReward: 300 },
  { id: "perfect-score", name: "Perfectionist", nameRu: "Перфекционист", description: "Get 100% on any practice module", descriptionRu: "100% в любом модуле", icon: "💯", condition: (s) => s.practiceSessions.some(p => p.score === p.maxScore && p.maxScore > 0), xpReward: 100 },
  { id: "mock-exam-1", name: "Test Taker", nameRu: "Сдающий экзамен", description: "Complete your first mock exam", descriptionRu: "Первый пробный экзамен", icon: "📝", condition: (s) => s.mockExamResults.length >= 1, xpReward: 100 },
  { id: "mock-exam-5", name: "Exam Veteran", nameRu: "Ветеран экзаменов", description: "Complete 5 mock exams", descriptionRu: "5 пробных экзаменов", icon: "🏆", condition: (s) => s.mockExamResults.length >= 5, xpReward: 300 },
  { id: "essay-5", name: "Wordsmith", nameRu: "Мастер слова", description: "Submit 5 essays", descriptionRu: "Отправьте 5 эссе", icon: "✍️", condition: (s) => s.essaysSubmitted >= 5, xpReward: 100 },
  { id: "study-hours-10", name: "Time Invested", nameRu: "Вложенное время", description: "Study for 10 hours total", descriptionRu: "10 часов учёбы", icon: "⏰", condition: (s) => s.totalStudyMinutes >= 600, xpReward: 200 },
  { id: "all-sections", name: "Well-Rounded", nameRu: "Всесторонний", description: "Practice in all 7 sections", descriptionRu: "Практика во всех 7 разделах", icon: "🌟", condition: (s) => { const sections = new Set(s.practiceSessions.map(p => p.module)); return sections.size >= 7; }, xpReward: 150 },
];

const defaultState: PrepState = {
  xp: 0, streak: 0, lastPracticeDate: null,
  targetExam: null, targetScore: null, examDate: null,
  diagnosticResults: [], practiceSessions: [],
  mockExamResults: [], unlockedAchievements: [],
  skillProfile: {},
  language: "en", completedToday: false,
  totalStudyMinutes: 0, essaysSubmitted: 0,
};

const PrepContext = createContext<PrepContextType | null>(null);

export const usePrep = () => {
  const ctx = useContext(PrepContext);
  if (!ctx) throw new Error("usePrep must be used within PrepProvider");
  return ctx;
};

export const PrepProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<PrepState>(() => {
    try {
      const saved = localStorage.getItem("topuni-prep");
      return saved ? { ...defaultState, ...JSON.parse(saved) } : defaultState;
    } catch { return defaultState; }
  });

  useEffect(() => {
    localStorage.setItem("topuni-prep", JSON.stringify(state));
  }, [state]);

  // Check streak on mount
  useEffect(() => {
    const today = new Date().toDateString();
    if (state.lastPracticeDate) {
      const lastDate = new Date(state.lastPracticeDate);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (lastDate.toDateString() !== today && lastDate.toDateString() !== yesterday.toDateString()) {
        setState(s => ({ ...s, streak: 0 }));
      }
    }
    setState(s => ({ ...s, completedToday: s.lastPracticeDate === today }));
  }, []);

  // Check achievements whenever state changes
  useEffect(() => {
    const newUnlocks = achievementDefs
      .filter(a => !state.unlockedAchievements.includes(a.id) && a.condition(state))
      .map(a => a.id);

    if (newUnlocks.length > 0) {
      const bonusXP = achievementDefs
        .filter(a => newUnlocks.includes(a.id))
        .reduce((sum, a) => sum + a.xpReward, 0);

      setState(s => ({
        ...s,
        unlockedAchievements: [...s.unlockedAchievements, ...newUnlocks],
        xp: s.xp + bonusXP,
      }));
    }
  }, [state.diagnosticResults.length, state.practiceSessions.length, state.streak, state.xp, state.mockExamResults.length, state.essaysSubmitted, state.totalStudyMinutes]);

  const addXP = useCallback((amount: number) => {
    setState(s => ({ ...s, xp: s.xp + amount }));
  }, []);

  const updateStreak = useCallback(() => {
    const today = new Date().toDateString();
    setState(s => {
      if (s.lastPracticeDate === today) return s;
      const lastDate = s.lastPracticeDate ? new Date(s.lastPracticeDate) : null;
      const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
      const isConsecutive = lastDate && lastDate.toDateString() === yesterday.toDateString();
      return { ...s, streak: isConsecutive ? s.streak + 1 : 1, lastPracticeDate: today, completedToday: true };
    });
  }, []);

  const addDiagnosticResult = useCallback((result: DiagnosticResult) => {
    setState(s => ({ ...s, diagnosticResults: [...s.diagnosticResults, result] }));
  }, []);

  const addPracticeSession = useCallback((session: Omit<PracticeSession, "id">) => {
    const full = { ...session, id: crypto.randomUUID() };
    setState(s => ({ ...s, practiceSessions: [...s.practiceSessions, full] }));
  }, []);

  const addMockExamResult = useCallback((result: Omit<MockExamResult, "id">) => {
    const full = { ...result, id: crypto.randomUUID() };
    setState(s => ({ ...s, mockExamResults: [...s.mockExamResults, full] }));
  }, []);

  const updateSkillProfile = useCallback((section: string, subSkill: string, correct: boolean) => {
    setState(s => {
      const profile = { ...s.skillProfile };
      if (!profile[section]) {
        profile[section] = { level: 50, subSkills: {}, totalAttempts: 0, totalCorrect: 0 };
      }
      const sec = { ...profile[section] };
      sec.totalAttempts++;
      if (correct) sec.totalCorrect++;
      sec.level = Math.round((sec.totalCorrect / sec.totalAttempts) * 100);

      const subSkills = { ...sec.subSkills };
      if (!subSkills[subSkill]) subSkills[subSkill] = 50;
      // Moving average toward correct/incorrect
      subSkills[subSkill] = Math.round(subSkills[subSkill] * 0.8 + (correct ? 100 : 0) * 0.2);
      sec.subSkills = subSkills;
      profile[section] = sec;

      return { ...s, skillProfile: profile };
    });
  }, []);

  const incrementEssays = useCallback(() => {
    setState(s => ({ ...s, essaysSubmitted: s.essaysSubmitted + 1 }));
  }, []);

  const addStudyMinutes = useCallback((mins: number) => {
    setState(s => ({ ...s, totalStudyMinutes: s.totalStudyMinutes + mins }));
  }, []);

  const level = useMemo(() => Math.floor(state.xp / 100) + 1, [state.xp]);
  const xpToNextLevel = useMemo(() => 100 - (state.xp % 100), [state.xp]);

  const value: PrepContextType = {
    ...state,
    addXP, updateStreak, addDiagnosticResult, addPracticeSession,
    addMockExamResult, updateSkillProfile, incrementEssays, addStudyMinutes,
    setTargetExam: (exam) => setState(s => ({ ...s, targetExam: exam })),
    setTargetScore: (score) => setState(s => ({ ...s, targetScore: score })),
    setExamDate: (date) => setState(s => ({ ...s, examDate: date })),
    setLanguage: (lang) => setState(s => ({ ...s, language: lang })),
    resetProgress: () => setState(defaultState),
    achievements: achievementDefs,
    level,
    xpToNextLevel,
  };

  return <PrepContext.Provider value={value}>{children}</PrepContext.Provider>;
};
