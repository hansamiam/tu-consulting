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
import Discover from "./pages/Discover";
import DiscoverRu from "./pages/DiscoverRu";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import PrepLayout from "./components/prep/PrepLayout";
import PrepLanding from "./pages/PrepLanding";
import PrepLandingRu from "./pages/PrepLandingRu";
import PrepDashboard from "./pages/prep/PrepDashboard";
import Diagnostic from "./pages/prep/Diagnostic";
import StudyPlan from "./pages/prep/StudyPlan";
import Practice from "./pages/prep/Practice";
import Tutor from "./pages/prep/Tutor";
import Analytics from "./pages/prep/Analytics";
import MockExam from "./pages/prep/MockExam";
import Achievements from "./pages/prep/Achievements";
import SpacedReview from "./pages/prep/SpacedReview";
import SkillRadar from "./pages/prep/SkillRadar";
import EssayGrader from "./pages/prep/EssayGrader";
import IELTSFlashcards from "./pages/prep/IELTSFlashcards";
import WritingTemplates from "./pages/prep/WritingTemplates";
import SATWordList from "./pages/prep/SATWordList";
import FormulaSheet from "./pages/prep/FormulaSheet";
import XPStore from "./pages/prep/XPStore";
import DailyChallenges from "./pages/prep/DailyChallenges";
import Leaderboard from "./pages/prep/Leaderboard";
import FocusTimer from "./pages/prep/FocusTimer";
import MistakeJournal from "./pages/prep/MistakeJournal";
import ProgressReport from "./pages/prep/ProgressReport";
import ReadingAnalyzer from "./pages/prep/ReadingAnalyzer";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
          <Route path="/discover" element={<Discover />} />
          <Route path="/discover/ru" element={<DiscoverRu />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/prep" element={<PrepLanding />} />
          <Route path="/prep/ru" element={<PrepLandingRu />} />
          <Route path="/prep/dashboard" element={<PrepLayout><PrepDashboard /></PrepLayout>} />
          <Route path="/prep/diagnostic" element={<PrepLayout><Diagnostic /></PrepLayout>} />
          <Route path="/prep/study-plan" element={<PrepLayout><StudyPlan /></PrepLayout>} />
          <Route path="/prep/practice" element={<PrepLayout><Practice /></PrepLayout>} />
          <Route path="/prep/tutor" element={<PrepLayout><Tutor /></PrepLayout>} />
          <Route path="/prep/analytics" element={<PrepLayout><Analytics /></PrepLayout>} />
          <Route path="/prep/mock-exam" element={<PrepLayout><MockExam /></PrepLayout>} />
          <Route path="/prep/achievements" element={<PrepLayout><Achievements /></PrepLayout>} />
          <Route path="/prep/spaced-review" element={<PrepLayout><SpacedReview /></PrepLayout>} />
          <Route path="/prep/skill-radar" element={<PrepLayout><SkillRadar /></PrepLayout>} />
          <Route path="/prep/essay-grader" element={<PrepLayout><EssayGrader /></PrepLayout>} />
          <Route path="/prep/ielts-flashcards" element={<PrepLayout><IELTSFlashcards /></PrepLayout>} />
          <Route path="/prep/writing-templates" element={<PrepLayout><WritingTemplates /></PrepLayout>} />
          <Route path="/prep/sat-words" element={<PrepLayout><SATWordList /></PrepLayout>} />
          <Route path="/prep/formula-sheet" element={<PrepLayout><FormulaSheet /></PrepLayout>} />
          <Route path="/prep/xp-store" element={<PrepLayout><XPStore /></PrepLayout>} />
          <Route path="/prep/challenges" element={<PrepLayout><DailyChallenges /></PrepLayout>} />
          <Route path="/prep/leaderboard" element={<PrepLayout><Leaderboard /></PrepLayout>} />
          <Route path="/prep/focus-timer" element={<PrepLayout><FocusTimer /></PrepLayout>} />
          <Route path="/prep/mistake-journal" element={<PrepLayout><MistakeJournal /></PrepLayout>} />
          <Route path="/prep/progress-report" element={<PrepLayout><ProgressReport /></PrepLayout>} />
          <Route path="/prep/reading-analyzer" element={<PrepLayout><ReadingAnalyzer /></PrepLayout>} />
          {/* Legacy routes for backward compatibility */}
          <Route path="/why-us" element={<WhyTU />} />
          <Route path="/why-us/ru" element={<WhyTURu />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
