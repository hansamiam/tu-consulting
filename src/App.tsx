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
import DiscoverApp from "./pages/DiscoverApp";
import SharedBrief from "./pages/SharedBrief";
import Pipeline from "./pages/Pipeline";
import ScholarshipsByFilter from "./pages/ScholarshipsByFilter";
import ScholarshipDetail from "./pages/ScholarshipDetail";
import EssayCritique from "./pages/EssayCritique";
import AIMatch from "./pages/AIMatch";
import Calendar from "./pages/Calendar";
import Admin from "./pages/Admin";
import FunnelDashboard from "./pages/FunnelDashboard";
import { ErrorBoundary } from "./components/ErrorBoundary";
import Academy from "./pages/Academy";
import CountryGuide from "./pages/CountryGuide";
import NotFound from "./pages/NotFound";
import PaymentCanceled from "./pages/PaymentCanceled";
// Prep is spun off into its own product — entire feature archived in src/_archive/prep-v2
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
          {/* Discover = scholarship decision engine. /scholarships kept as alias. */}
          <Route path="/discover" element={<Discover language="en" />} />
          <Route path="/discover/ru" element={<Discover language="ru" />} />
          <Route path="/discover/app" element={<DiscoverApp language="en" />} />
          <Route path="/discover/ru/app" element={<DiscoverApp language="ru" />} />
          <Route path="/scholarships" element={<Discover language="en" />} />
          <Route path="/scholarships/ru" element={<Discover language="ru" />} />
          {/* Public shareable AI strategy brief — viral / SEO surface */}
          <Route path="/brief/:slug" element={<SharedBrief />} />
          {/* Application mission-control — kanban of saved scholarships */}
          <Route path="/pipeline"     element={<Pipeline language="en" />} />
          <Route path="/pipeline/ru"  element={<Pipeline language="ru" />} />
          {/* Deadline calendar — paired with pipeline for time-based view */}
          <Route path="/calendar"     element={<Calendar language="en" />} />
          <Route path="/calendar/ru"  element={<Calendar language="ru" />} />
          {/* Programmatic SEO landing pages — country / field / theme */}
          <Route path="/scholarships/by-country/:country" element={<ScholarshipsByFilter mode="country" />} />
          <Route path="/scholarships/by-field/:field"     element={<ScholarshipsByFilter mode="field" />} />
          <Route path="/scholarships/theme/:theme"        element={<ScholarshipsByFilter mode="theme" />} />
          {/* Per-scholarship detail page — also indexable, ~190 SEO surfaces */}
          <Route path="/scholarships/:id"                 element={<ScholarshipDetail />} />
          {/* Essay critique — premium-gated reader-perspective AI feedback */}
          <Route path="/essay"                            element={<EssayCritique />} />
          {/* Fast AI scholarship matcher — type a sentence, get matches */}
          <Route path="/match"                            element={<AIMatch />} />

          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/funnel" element={<FunnelDashboard />} />
          <Route path="/academy" element={<Academy />} />
          <Route path="/blog/guide/:slug" element={<CountryGuide language="en" />} />
          <Route path="/blog/guide/:slug/ru" element={<CountryGuide language="ru" />} />
          {/* /prep/* routes removed — Prep is spinning off as its own product */}
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
