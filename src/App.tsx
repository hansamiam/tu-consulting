import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import IndexRu from "./pages/IndexRu";
import Team from "./pages/Team";
import TeamRu from "./pages/TeamRu";
import Offerings from "./pages/Offerings";
import OfferingsRu from "./pages/OfferingsRu";
import FAQ from "./pages/FAQ";
import FAQRu from "./pages/FAQRu";
import WhyTU from "./pages/WhyTU";
import WhyTURu from "./pages/WhyTURu";
import Blog from "./pages/Blog";
import BlogRu from "./pages/BlogRu";
import BlogArticle from "./pages/BlogArticle";
import ThankYou from "./pages/ThankYou";
import ThankYouRu from "./pages/ThankYouRu";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import PrivacyPolicyRu from "./pages/PrivacyPolicyRu";
import PublicOffer from "./pages/PublicOffer";
import PublicOfferRu from "./pages/PublicOfferRu";
import RefundPolicy from "./pages/RefundPolicy";
import RefundPolicyRu from "./pages/RefundPolicyRu";
import PaymentInfo from "./pages/PaymentInfo";
import PaymentInfoRu from "./pages/PaymentInfoRu";
import TopUniAI from "./pages/TopUniAI";
import TopUniAIRu from "./pages/TopUniAIRu";
import TopUniAIPartners from "./pages/TopUniAIPartners";
import TopUniAIPartnersRu from "./pages/TopUniAIPartnersRu";
import Scholarships from "./pages/Scholarships";
import Admin from "./pages/Admin";
import FunnelDashboard from "./pages/FunnelDashboard";
import { ErrorBoundary } from "./components/ErrorBoundary";
import Academy from "./pages/Academy";
import CountryGuide from "./pages/CountryGuide";
import NotFound from "./pages/NotFound";
import PaymentCanceled from "./pages/PaymentCanceled";
import PrepLayout from "./components/prep/PrepLayout";
import PrepLanding from "./pages/PrepLanding";
import PrepLandingRu from "./pages/PrepLandingRu";
import PrepDashboard from "./pages/prep/PrepDashboard";
import Diagnostic from "./pages/prep/Diagnostic";
import StudyPlan from "./pages/prep/StudyPlan";
import Practice from "./pages/prep/Practice";
import EssayGrader from "./pages/prep/EssayGrader";
// Prep Focus 4 (Diagnostic, Practice, EssayGrader, StudyPlan) kept live & being polished.
// The other 17 prep tools are archived in src/_archive/prep-v1 behind ComingSoon.
import ComingSoon from "./components/ComingSoon";
import Unsubscribe from "./pages/Unsubscribe";
import Pricing from "./pages/Pricing";
import AuthCallback from "./pages/AuthCallback";
import Account from "./pages/Account";
import { AuthProvider } from "./contexts/AuthContext";
// EarnedTrialBanner archived — single Founding tier, no earned trial mechanic
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
        <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/ru" element={<IndexRu />} />
          <Route path="/team" element={<Team />} />
          <Route path="/team/ru" element={<TeamRu />} />
          <Route path="/offerings" element={<Offerings />} />
          <Route path="/offerings/ru" element={<OfferingsRu />} />
          <Route path="/faq" element={<WhyTU />} />
          <Route path="/faq/ru" element={<WhyTURu />} />
          <Route path="/why-tu" element={<WhyTU />} />
          <Route path="/why-tu/ru" element={<WhyTURu />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/ru" element={<BlogRu />} />
          <Route path="/blog/:id" element={<BlogArticle language="en" />} />
          <Route path="/blog/:id/ru" element={<BlogArticle language="ru" />} />
          <Route path="/thank-you" element={<ThankYou />} />
          <Route path="/thank-you/ru" element={<ThankYouRu />} />
          <Route path="/payment-canceled" element={<PaymentCanceled language="en" />} />
          <Route path="/payment-canceled/ru" element={<PaymentCanceled language="ru" />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/privacy-policy/ru" element={<PrivacyPolicyRu />} />
          <Route path="/public-offer" element={<PublicOffer />} />
          <Route path="/public-offer/ru" element={<PublicOfferRu />} />
          <Route path="/refund-policy" element={<RefundPolicy />} />
          <Route path="/refund-policy/ru" element={<RefundPolicyRu />} />
          <Route path="/payment-info" element={<PaymentInfo />} />
          <Route path="/payment-info/ru" element={<PaymentInfoRu />} />
          <Route path="/topuni-ai" element={<TopUniAI />} />
          <Route path="/topuni-ai/ru" element={<TopUniAIRu />} />
          <Route path="/topuni-ai/partners" element={<TopUniAIPartners />} />
          <Route path="/topuni-ai/partners/ru" element={<TopUniAIPartnersRu />} />
          {/* Discover (universal university DB) replaced by Scholarships finder.
              Old code archived in src/_archive/discover-v1. Redirect for SEO/links. */}
          <Route path="/scholarships" element={<Scholarships language="en" />} />
          <Route path="/scholarships/ru" element={<Scholarships language="ru" />} />
          <Route path="/discover" element={<Scholarships language="en" />} />
          <Route path="/discover/ru" element={<Scholarships language="ru" />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/funnel" element={<FunnelDashboard />} />
          <Route path="/academy" element={<Academy />} />
          <Route path="/blog/guide/:slug" element={<CountryGuide language="en" />} />
          <Route path="/blog/guide/:slug/ru" element={<CountryGuide language="ru" />} />
          <Route path="/prep" element={<PrepLanding />} />
          <Route path="/prep/ru" element={<PrepLandingRu />} />
          <Route path="/prep/dashboard" element={<PrepLayout><PrepDashboard /></PrepLayout>} />
          <Route path="/prep/diagnostic" element={<PrepLayout><Diagnostic /></PrepLayout>} />
          <Route path="/prep/study-plan" element={<PrepLayout><StudyPlan /></PrepLayout>} />
          <Route path="/prep/practice" element={<PrepLayout><Practice /></PrepLayout>} />
          <Route path="/prep/essay-grader" element={<PrepLayout><EssayGrader /></PrepLayout>} />
          {/* "Coming Soon" — archived prep tools, see src/_archive/prep-v1 */}
          <Route path="/prep/tutor" element={<PrepLayout><ComingSoon title="AI Tutor" description="A 1:1 AI tutor that adapts to your weakest skills, lives inside Practice, and explains every wrong answer." featureTag="prep-tutor" /></PrepLayout>} />
          <Route path="/prep/analytics" element={<PrepLayout><ComingSoon title="Analytics" description="Deep skill-level analytics: where you're losing points, your improvement velocity, and your projected score." featureTag="prep-analytics" /></PrepLayout>} />
          <Route path="/prep/mock-exam" element={<PrepLayout><ComingSoon title="Mock Exam" description="Full-length, timed mock exams that mirror the real test format with detailed score breakdowns." featureTag="prep-mock-exam" /></PrepLayout>} />
          <Route path="/prep/achievements" element={<PrepLayout><ComingSoon title="Achievements" description="Earn badges as you hit milestones — XP, streaks, perfect sets, comeback runs." featureTag="prep-achievements" /></PrepLayout>} />
          <Route path="/prep/spaced-review" element={<PrepLayout><ComingSoon title="Spaced Review" description="SM-2 spaced repetition for every concept you miss — never forget what you've learned." featureTag="prep-spaced-review" /></PrepLayout>} />
          <Route path="/prep/skill-radar" element={<PrepLayout><ComingSoon title="Skill Radar" description="A live radar chart of your strengths and gaps across every test domain." featureTag="prep-skill-radar" /></PrepLayout>} />
          <Route path="/prep/ielts-flashcards" element={<PrepLayout><ComingSoon title="IELTS Flashcards" description="High-frequency IELTS vocabulary with example sentences and audio." featureTag="prep-ielts-flashcards" /></PrepLayout>} />
          <Route path="/prep/writing-templates" element={<PrepLayout><ComingSoon title="Writing Templates" description="Battle-tested IELTS Task 1 & 2 templates with sentence-level scaffolds." featureTag="prep-writing-templates" /></PrepLayout>} />
          <Route path="/prep/sat-words" element={<PrepLayout><ComingSoon title="SAT Vocabulary" description="The 1,000 highest-yield SAT words, drilled with spaced repetition." featureTag="prep-sat-words" /></PrepLayout>} />
          <Route path="/prep/formula-sheet" element={<PrepLayout><ComingSoon title="Formula Sheet" description="Every SAT math formula, organized by frequency, with worked examples." featureTag="prep-formula-sheet" /></PrepLayout>} />
          <Route path="/prep/xp-store" element={<PrepLayout><ComingSoon title="XP Store" description="Spend earned XP on real-world rewards — discounts, books, even consult credits." featureTag="prep-xp-store" /></PrepLayout>} />
          <Route path="/prep/challenges" element={<PrepLayout><ComingSoon title="Daily Challenges" description="A new high-stakes mini-challenge every day to keep your streak alive." featureTag="prep-challenges" /></PrepLayout>} />
          <Route path="/prep/leaderboard" element={<PrepLayout><ComingSoon title="Leaderboard" description="Compete with other applicants on weekly XP, accuracy, and streak boards." featureTag="prep-leaderboard" /></PrepLayout>} />
          <Route path="/prep/focus-timer" element={<PrepLayout><ComingSoon title="Focus Timer" description="Pomodoro-style focus sessions tied to your study plan, with streak tracking." featureTag="prep-focus-timer" /></PrepLayout>} />
          <Route path="/prep/mistake-journal" element={<PrepLayout><ComingSoon title="Mistake Journal" description="Auto-collected log of every wrong answer with AI explanations and re-test prompts." featureTag="prep-mistake-journal" /></PrepLayout>} />
          <Route path="/prep/progress-report" element={<PrepLayout><ComingSoon title="Progress Report" description="Weekly emailed report of your prep progress — stats, wins, what to fix next." featureTag="prep-progress-report" /></PrepLayout>} />
          <Route path="/prep/reading-analyzer" element={<PrepLayout><ComingSoon title="Reading Analyzer" description="Paste any passage and get IELTS/SAT-style questions, vocab, and a difficulty score." featureTag="prep-reading-analyzer" /></PrepLayout>} />
          {/* Legacy routes for backward compatibility */}
          <Route path="/why-us" element={<WhyTU />} />
          <Route path="/why-us/ru" element={<WhyTURu />} />
          <Route path="/unsubscribe" element={<Unsubscribe />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/account" element={<Account />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </ErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
