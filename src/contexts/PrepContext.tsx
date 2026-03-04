import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

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
  language: "en" | "ru";
  completedToday: boolean;
}

interface PrepContextType extends PrepState {
  addXP: (amount: number) => void;
  updateStreak: () => void;
  setTargetExam: (exam: "ielts" | "sat" | "both") => void;
  setTargetScore: (score: number) => void;
  setExamDate: (date: string) => void;
  addDiagnosticResult: (result: DiagnosticResult) => void;
  addPracticeSession: (session: Omit<PracticeSession, "id">) => void;
  setLanguage: (lang: "en" | "ru") => void;
  resetProgress: () => void;
}

const defaultState: PrepState = {
  xp: 0, streak: 0, lastPracticeDate: null,
  targetExam: null, targetScore: null, examDate: null,
  diagnosticResults: [], practiceSessions: [],
  language: "en", completedToday: false,
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

  const value: PrepContextType = {
    ...state,
    addXP, updateStreak, addDiagnosticResult, addPracticeSession,
    setTargetExam: (exam) => setState(s => ({ ...s, targetExam: exam })),
    setTargetScore: (score) => setState(s => ({ ...s, targetScore: score })),
    setExamDate: (date) => setState(s => ({ ...s, examDate: date })),
    setLanguage: (lang) => setState(s => ({ ...s, language: lang })),
    resetProgress: () => setState(defaultState),
  };

  return <PrepContext.Provider value={value}>{children}</PrepContext.Provider>;
};
